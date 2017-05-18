'use strict';

var fs = require('fs');
var path = require('path');
var EasyZip = require('easy-zip').EasyZip;
var utils = require('soajs').utils;

var colName = 'ci';
var ciDriver = require('../../utils/drivers/ci/index.js');

function checkIfError(req, mainCb, data, cb) {
	if (data.error) {
		if (typeof (data.error) === 'object' && (data.error.message || data.error.msg)) {
			req.soajs.log.error(data.error);
		}

		return mainCb({"code": data.code, "msg": data.config.errors[data.code]});
	} else {
		if (cb) return cb();
	}
}


var BL = {

	model: null,

	/**
	 * Function that gets CI config and list of repository available via CI drivers
	 * @param  {Object}             config
	 * @param  {Request Object}     req
	 * @param  {Function}           cb
	 *
	 */
	getConfig: function (config, req, cb) {
		var opts = {collection: colName};
		BL.model.findEntry(req.soajs, opts, function (error, record) {
			checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
				var response = {settings: {}, list: []};
				if (!record) {
					return cb(null, response);
				}

				//only one CI config entry can be found in the db
				response.settings = utils.cloneObj(record);
				if (!response.settings.ciToken || response.settings.ciToken === '') {
					response.settings.log = req.soajs.log;
					ciDriver.generateToken(response.settings, function (error, authToken) {
						checkIfError(req, cb, {config: config, error: error, code: 969}, function () {

							//save the auth token in db,
							record.settings.ciToken = authToken;
							BL.model.saveEntry(req.soajs, {"collection": colName, "record": record}, function (error) {
								checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
									listCiRepos(response);
								});
							});
						});
					});
				}
				else {
					listCiRepos(response);
				}
			});
		});

		function listCiRepos(response) {
			//call the list
			ciDriver.listRepos(response.settings, function (error, ciResponse) {
				checkIfError(req, cb, {config: config, error: error, code: 969}, function () {
					response.list = ciResponse; //TODO: integrate with CI drivers
					delete response.settings.log;

					//construct all env variables

					//loop in list, for each entry trigger settings:general api

					var opts = {
						collection: 'environment',
						conditions: {'code': process.env.SOAJS_ENV.toUpperCase()},
						fields: {
							'domain': 1,
							'apiPrefix': 1
						}
					};
					BL.model.findEntry(req.soajs, opts, function (error, reg) {
						checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
							response.api = {
								domain: reg.apiPrefix + "." + reg.domain,
								url: "/cd/deploy"
							};
							return cb(null, response);

						});
					});
				});
			});
		}
	},

	/**
	 * Function that saves CI config
	 * @param  {Object}             config
	 * @param  {Request Object}     req
	 * @param  {Function}           cb
	 *
	 */
	saveConfig: function (config, req, cb) {
		var opts = {
			collection: colName,
			conditions: {},
			fields: req.soajs.inputmaskData.config,
			options: {upsert: true}
		};
		BL.model.updateEntry(req.soajs, opts, function (error) {
			checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
				return cb(null, true);
			});
		});
	},

	/**
	 * Function that deletes CI config from data store
	 * @param  {Object}             config
	 * @param  {Request Object}     req
	 * @param  {Function}           cb
	 *
	 */
	deleteConfig: function (config, req, cb) {
		var opts = {collection: colName, conditions: {}};
		BL.model.removeEntry(req.soajs, opts, function (error) {
			checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
				return cb(null, true);
			});
		});
	},

	/**
	 * Function that streams CI recipe
	 * @param  {Object}             config
	 * @param  {Request Object}     req
	 * @param  {Function}           cb
	 *
	 */
	downloadRecipe: function (config, req, res, cb) {
		var opts = {collection: colName};
		BL.model.findEntries(req.soajs, opts, function (error, records) {
			checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
				checkIfError(req, cb, {
					config: config,
					error: !records || records.length === 0,
					code: 955
				}, function () {
					var driver = records[0].driver, recipe = records[0].recipe;
					var ciTmpl = path.join(config.templates.path, 'ci/');
					var scriptPath = path.join(ciTmpl, 'cd.sh');

					var zip = new EasyZip();
					var files = [
						{source: scriptPath, target: 'cd.sh'}
					];
					zip.batchAdd(files, function () {
						zip.file('.' + driver + '.yml', recipe);
						zip.writeToResponse(res, 'ci.zip');
					});
				});
			});
		});
	},

	/**
	 * Function that turns On/Off Repo CI
	 * @param  {Object}             config
	 * @param  {Request Object}     req
	 * @param  {Function}           cb
	 *
	 */
	toggleRepoStatus: function(config, req, cb){
		var opts = {collection: colName};
		BL.model.findEntry(req.soajs, opts, function (error, record) {
			checkIfError(req, cb, {config: config, error: error, code: 600}, function () {

				var options = record;
				options.hook = {
					id: req.soajs.inputmaskData.id,
					active: req.soajs.inputmaskData.enable,
				};
				options.log = req.soajs.log;
				ciDriver.setHook(options, function (error) {
					checkIfError(req, cb, {config: config, error: error, code: 969}, function () {
						return cb(null, true);
					});
				});

			});
		});
	}

};

module.exports = {
	"init": function (modelName, cb) {
		var modelPath;

		if (!modelName) {
			return cb(new Error("No Model Requested!"));
		}
		modelPath = __dirname + "/../../models/" + modelName + ".js";
		return requireModel(modelPath, cb);
		/**
		 * checks if model file exists, requires it and returns it.
		 * @param filePath
		 * @param cb
		 */
		function requireModel(filePath, cb) {
			//check if file exist. if not return error
			fs.exists(filePath, function (exists) {
				if (!exists) {
					return cb(new Error("Requested Model Not Found!"));
				}

				BL.model = require(filePath);
				return cb(null, BL);
			});
		}
	}
};
