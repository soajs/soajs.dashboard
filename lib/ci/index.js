'use strict';

var fs = require('fs');
var path = require('path');
var yamljs = require("yamljs");
var EasyZip = require('easy-zip').EasyZip;
var utils = require('soajs').utils;
var async = require('async');

var colName = 'cicd';

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

function buildEnvVarsList(gitToken, model, config, req, cb){
	var opts = {
		collection: 'environment',
		conditions: {'code': process.env.SOAJS_ENV.toUpperCase()},
		fields: {
			'domain': 1,
			'apiPrefix': 1
		}
	};
	model.findEntry(req.soajs, opts, function (error, reg) {
		checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
			var response = {
				'SOAJS_CD_AUTH_KEY': req.soajs.tenant.key.eKey,
				'SOAJS_CD_DEPLOY_TOKEN':  gitToken,
				'SOAJS_CD_DASHBOARD_DOMAIN': reg.apiPrefix + "." + reg.domain,
				'SOAJS_CD_API_ROUTE': '/cd/deploy',
				'SOAJS_CD_DASHBOARD_PORT': '' + req.soajs.inputmaskData.port,
				'SOAJS_CD_DASHBOARD_PROTOCOL': req.protocol
			};
			return cb(response);

		});
	});
}

/**
 * Function that cleans user-provided environment variables from any SOAJS computed variables
 * @param  {Object} vars
 * @return {Object}
 */
function cleanEnvVarsList(vars) {
	if (vars && Object.keys(vars).length > 0) {
		delete vars['SOAJS_CD_AUTH_KEY'];
		delete vars['SOAJS_CD_DEPLOY_TOKEN'];
		delete vars['SOAJS_CD_DASHBOARD_DOMAIN'];
		delete vars['SOAJS_CD_API_ROUTE'];
		delete vars['SOAJS_CD_DASHBOARD_PORT'];
		delete vars['SOAJS_CD_DASHBOARD_PROTOCOL'];
	}

	return vars;
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
	getConfig: function (config, req, ciDriver, cb) {
		var opts = {collection: colName, conditions: {"type": "ci"}};
		BL.model.findEntry(req.soajs, opts, function (error, record) {
			checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
				var response = {settings: {}, list: []};
				if (!record) {
					return cb(null, response);
				}

				//only one CI config entry can be found in the db
				response.settings = utils.cloneObj(record);
				response.settings.log = req.soajs.log;

				if (response.settings && response.settings.settings && response.settings.settings.ciToken && response.settings.settings.ciToken !== '') {
					listCiRepos(response);
				}
				else {
					ciDriver.generateToken(response.settings, function (error, authToken) {
						checkIfError(req, cb, {config: config, error: error, code: 969}, function () {

							//save the auth token in db,
							record.settings.ciToken = authToken;
							response.settings.settings.ciToken = authToken;
							BL.model.saveEntry(req.soajs, {"collection": colName, "record": record}, function (error) {
								checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
									listCiRepos(response);
								});
							});
						});
					});
				}
			});
		});

		function listCiRepos(response) {
			buildEnvVarsList(response.settings.settings.gitToken, BL.model, config, req, function(variables){
				//call the list
				var options = response.settings;
				options.variables = variables;
				ciDriver.listRepos(options, function (error, ciResponse) {
					checkIfError(req, cb, {config: config, error: error, code: 969}, function () {
						response.list = ciResponse; //TODO: integrate with CI drivers
						delete response.settings.log;

						response.variables = variables;
						return cb(null, response);
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
	saveConfig: function (config, req, ciDriver, cb) {
		req.soajs.inputmaskData.config.type = "ci";
		var opts = {
			collection: colName,
			conditions: {
				"type": "ci"
			},
			fields: req.soajs.inputmaskData.config,
			options: {upsert: true}
		};
		
		if(req.soajs.inputmaskData.config.recipe && req.soajs.inputmaskData.config.recipe.trim() !==''){
			var jsonYaml = yamljs.parse(req.soajs.inputmaskData.config.recipe);
			if (!jsonYaml.after_success) {
				jsonYaml.after_success = [];
			}
			if(jsonYaml.after_success.indexOf("node ./cd.js") === -1){
				jsonYaml.after_success.push("node ./cd.js");
			}
			req.soajs.inputmaskData.config.recipe = yamljs.stringify(jsonYaml, 4, 4);
		}
		doSave();
		
		function doSave(){
			BL.model.updateEntry(req.soajs, opts, function (error) {
				checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
					return cb(null, true);
				});
			});
		}
	},

	/**
	 * Function that deletes CI config from data store
	 * @param  {Object}             config
	 * @param  {Request Object}     req
	 * @param  {Function}           cb
	 *
	 */
	deleteConfig: function (config, req, ciDriver, cb) {
		var opts = {collection: colName, conditions: {"type": "ci"}};
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
	downloadRecipe: function (config, req, res, ciDriver, cb) {
		var opts = {collection: colName, conditions: {"type": "ci"}};
		BL.model.findEntry(req.soajs, opts, function (error, record) {
			checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
				checkIfError(req, cb, {
					config: config,
					error: !record,
					code: 955
				}, function () {
					var driver = record.driver, recipe = record.recipe;
					var ciTmpl = path.join(config.templates.path, 'ci/');
					var scriptPath = path.join(ciTmpl, 'cd.js');

					var zip = new EasyZip();
					var files = [
						{source: scriptPath, target: 'cd.js'}
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
	toggleRepoStatus: function(config, req, ciDriver, cb){
		var opts = {collection: colName, conditions: {"type": "ci"}};
		BL.model.findEntry(req.soajs, opts, function (error, record) {
			checkIfError(req, cb, {config: config, error: error, code: 600}, function () {

				var options = record;
				options.hook = {
					id: req.soajs.inputmaskData.id,
					active: req.soajs.inputmaskData.enable
				};
				options.log = req.soajs.log;
				ciDriver.setHook(options, function (error) {
					checkIfError(req, cb, {config: config, error: error, code: 969}, function () {
						return cb(null, true);
					});
				});

			});
		});
	},

	/**
	 * Function that get the available environment variables and settings for one repository
	 * @param  {Object}   config
	 * @param  {Request Object}   req
	 * @param  {Function} cb
	 *
	 */
	getRepoSettings: function (config, req, ciDriver, cb) {
		var opts = { collection: colName, conditions: {"type": "ci"} };
		BL.model.findEntry(req.soajs, opts, function (error, record) {
			checkIfError(req, cb, {config: config, error: error, code: 600}, function () {

				var options = record;
				options.log = req.soajs.log;
				options.params = {
					repoId: req.soajs.inputmaskData.id
				};
				ciDriver.listEnvVars(options, function (error, vars) {
					checkIfError(req, cb, {config: config, error: error, code: ((error) ? error.code : null)}, function () {
						ciDriver.listSettings(options, function (error, settings) {
							checkIfError(req, cb, {config: config, error: error, code: ((error) ? error.code : null)}, function () {
								return cb(null, { envs: vars, settings: settings });
							});
						});
					});
				});
			});
		});
	},

	/**
	 * Function that updates the environment variables and settings of one repository
	 * @param  {Object}   config
	 * @param  {Request Object}   req
	 * @param  {Function} cb
	 *
	 */
	updateRepoSettings: function (config, req, ciDriver, cb) {
		var opts = { collection: colName, conditions: {"type": "ci"} };
		BL.model.findEntry(req.soajs, opts, function (error, record) {
			checkIfError(req, cb, {config: config, error: error, code: 600}, function () {

				var options = record;
				options.log = req.soajs.log;
				options.params = {
					repoId: req.soajs.inputmaskData.id,
					settings: req.soajs.inputmaskData.settings,
					variables: cleanEnvVarsList(req.soajs.inputmaskData.variables)
				};

				buildEnvVarsList(options.settings.gitRecord, BL.model, config, req, function (soajsVars) {
					options.params.variables = Object.assign(options.params.variables, soajsVars);
					ciDriver.updateSettings(options, function (error) {
						checkIfError(req, cb, { config: config, error: error, code: ((error) ? error.code : null)}, function () {
							ciDriver.ensureRepoVars(options, function (error) {
								checkIfError(req, cb, { config: config, error: error, code: ((error) ? error.code : null)}, function () {
									return cb(null, true);
								});
							});
						});
					});
				});
			});
		});
	},

	/**
	 * Function that syncs all CI repositories
	 * @param  {Object}   config
	 * @param  {Request Object}   req
	 * @param  {Function} cb
	 *
	 */
	syncRepos: function (config, req, ciDriver, cb) {
		var opts = { collection: colName, conditions: {"type": "ci"} };
		BL.model.findEntry(req.soajs, opts, function (error, record) {
			checkIfError(req, cb, {config: config, error: error, code: 600}, function () {

				var options = record;
				options.log = req.soajs.log;
				//list all repos
				ciDriver.listRepos(options, function (error, repos) {
					checkIfError(req, cb, {config: config, error: error, code: ((error) ? error.code : null)}, function () {
                        if(process.env.SOAJS_DEPLOY_TEST){
                            repos.length = 1;
                        }
                        //filter active repos
						async.filter(repos, function (oneRepo, callback) {
							return callback(null, oneRepo.active);
						}, function (error, activeRepos) {
							//build SOAJS computed variables
							buildEnvVarsList(options.settings.gitRecord, BL.model, config, req, function (soajsVars) {
								//update all active repos
								async.each(activeRepos, function (oneRepo, callback) {
									var updateOptions = utils.cloneObj(record);
									updateOptions.log = req.soajs.log;
									updateOptions.params = {
										repoId: oneRepo.id,
										variables: soajsVars
									};
									return ciDriver.ensureRepoVars(updateOptions, callback);
								}, function (error) {
									checkIfError(req, cb, {config: config, error: error, code: ((error) ? error.code : null)}, function () {
										return cb(null, true);
									});
								});
							});
						});
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
