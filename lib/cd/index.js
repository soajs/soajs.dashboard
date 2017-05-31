'use strict';
var fs = require('fs');
var async = require('async');
var request = require("request");

var utils = require('../../utils/utils.js');

var colName = 'cicd';
var envColName = 'environment';

function checkIfError (req, mainCb, data, cb) {
	if (data.error) {
		if (typeof (data.error) === 'object' && (data.error.message || data.error.msg)) {
			req.soajs.log.error(data.error);
		}
		
		return mainCb({ "code": data.code, "msg": data.config.errors[ data.code ] });
	} else {
		if (cb) return cb();
	}
}

var BL = {
	
	model: null,
	
	/**
	 * Function that gets CD config
	 * @param  {Object}             config
	 * @param  {Request Object}     req
	 * @param  {Function}           cb
	 *
	 */
	getConfig: function (config, req, helpers, cb) {
		var opts = { collection: colName, conditions: { "type": "cd" } };
		BL.model.findEntry(req.soajs, opts, function (error, record) {
			checkIfError(req, cb, { config: config, error: error, code: 600 }, function () {
				return cb(null, record || {});
			});
		});
	},
	
	/**
	 * Function that saves CD config
	 * @param  {Object}             config
	 * @param  {Request Object}     req
	 * @param  {Function}           cb
	 *
	 */
	saveConfig: function (config, req, helpers, cb) {
		req.soajs.inputmaskData.config.type = "cd";
		var opts = {
			collection: colName,
			conditions: {
				"type": "cd"
			},
			fields: req.soajs.inputmaskData.config,
			options: { upsert: true }
		};
		BL.model.updateEntry(req.soajs, opts, function (error) {
			checkIfError(req, cb, { config: config, error: error, code: 600 }, function () {
				return cb(null, true);
			});
		});
	},
	
	/**
	 * Function that triggers CD deploy operation
	 * @param  {Object}             config
	 * @param  {Request Object}     req
	 * @param  {Function}           cb
	 *
	 */
	cdDeploy: function (config, req, deployer, helpers, cb) {
		//verify that the deploy_token is valid
		verifyDeployToken(function () {
			//get CD recipe
			BL.getConfig(config, req, helpers, function (error, record) {
				checkIfError(req, cb, { config: config, error: error, code: 600 }, function () {
					// get all environments
					getEnvs(function (error, envs) {
						//NOTE: the only error returned by this function is from the drivers, which are handled by utils.checkErrorReturn
						utils.checkErrorReturn(req, cb, { config: config, error: error }, function () {
							// check if cd should be triggered based on available input
							checkConfig(record, envs, function (error, servicesList) {
								// no error to be handled here
								// redeploy services
								processCD(servicesList, function (error) {
									checkIfError(req, cb, { config: config, error: error, code: 600 }, function () {
										return cb(null, true);
									});
								});
							});
						});
					});
				});
			});
		});
		
		function verifyDeployToken (fcb) {
			var opts = {
				collection: colName,
				conditions: {
					"type": "ci"
				}
			};
			BL.model.findEntries(req.soajs, opts, function (error, records) {
				checkIfError(req, cb, { config: config, error: error, code: 600 }, function () {
					checkIfError(req, cb, {
						config: config,
						error: !records || records.length === 0,
						code: 955
					}, function () {
						var ciConfig = records[ 0 ];
						checkIfError(req, cb, {
							config: config,
							error: ciConfig.settings.gitToken !== req.soajs.inputmaskData.deploy_token,
							code: 956
						}, fcb);
					});
				});
			});
		}
		
		function getEnvs (fcb) {
			var opts = {
				collection: envColName,
				conditions: {}
			};
			BL.model.findEntries(req.soajs, opts, function (error, envs) {
				checkIfError(req, cb, { config: config, error: error, code: 600 }, function () {
					// get all services deployed in each environment
					helpers.getEnvsServices(envs, req, deployer, BL, fcb);
				});
			});
		}
		
		function checkConfig (record, envs, cb) {
			if (!record) return cb(); // no CD config found

			helpers.checkRecordConfig(req, envs, record, cb);
		}
		
		function processCD (servicesList, cb) {
			async.each(servicesList, function (oneService, callback) {
				helpers.processOneService(req, BL, oneService, deployer, callback);
			}, cb);
		}
	},
	
	/**
	 * Function that gets Update Notification Ledger
	 * @param  {Object}             config
	 * @param  {Request Object}     req
	 * @param  {Function}           cb
	 */
	getUpdates: function (config, req, deployer, helpers, cb) {
		/**
		 * get all catalogs
		 * @param cb
		 */
		function getCatalogs (cb) {
			let opts = {
				collection: "catalogs",
				conditions: {}
			};
			BL.model.findEntries(req.soajs, opts, cb);
		}
		
		/**
		 * get all deployed services in this environment
		 * @param cb
		 */
		function getServices (cb) {
			helpers.getServices(config, req, deployer, cb);
		}
		
		/**
		 * get the latest soajs images
		 * @param cb
		 */
		function getLatestSOAJSImageInfo (cb) {
			helpers.getLatestSOAJSImageInfo(config, cb);
		}
		
		var updateList = [];
		async.parallel({
			'catalogs': getCatalogs,
			'services': getServices,
			"soajsImages": getLatestSOAJSImageInfo
		}, function (error, response) {
			checkIfError(req, cb, { config: config, error: error, code: 600 }, function () {
				/**
				 * compare entries
				 */
				async.each(response.services, function (oneService, cb) {
					helpers.doesServiceHaveUpdates(req, config, updateList, oneService, response.catalogs, response.soajsImages, cb);
				}, function () {
					return cb(null, updateList);
				});
			});
		});
	},
	
	/**
	 * Lists the ledgers of a specific environment
	 * @param config
	 * @param req
	 * @param cb
	 */
	getLedger: function (config, req, helpers, cb) {
		let opts = {
			"collection": "ledger",
			"conditions": { "env": req.soajs.inputmaskData.env.toLowerCase() },
			"options": {
				"sort": { "ts": -1 },
				"skip": req.soajs.inputmaskData.start,
				"limit": 200
			}
		};
		BL.model.findEntries(req.soajs, opts, cb);
	},
	
	/**
	 * Marks the ledger record(s) as read
	 * @param config
	 * @param req
	 * @param cb
	 */
	markRead (config, req, helpers, cb) {
		let opts = {
			"collection": "ledger",
			"fields": {
				"$set": {
					"read": true
				}
			}
		};
		//if an ID is given
		if (req.soajs.inputmaskData.data.id) {
			req.soajs.inputmaskData.id = req.soajs.inputmaskData.data.id;
			BL.model.validateId(req.soajs, (err) => {
				if (err)
					return cb(err);
				
				opts.conditions = { "_id": req.soajs.inputmaskData.id };
				opts.options = { "upsert": true };
				
				BL.model.updateEntry(req.soajs, opts, (error, res) => {
					if (error)
						return cb(error);
					else {
						return cb(null, res);
					}
				});
			});
		}
		else if (req.soajs.inputmaskData.data.all) {
			opts.conditions = {};
			opts.options = { "upsert": false, "safe": true, "multi": true };
			BL.model.updateEntry(req.soajs, opts, (error, res) => {
				if (error)
					return cb(error);
				else {
					return cb(null, res);
				}
			});
		}
	},
	
	/**
	 * function that takes action based on ledger notification
	 * @param config
	 * @param req
	 * @param cb
	 */
	cdAction: function (config, registry, req, deployer, helpers, cb) {
		function callDeployer (opName, cb) {
			helpers.callDeployer(config, req, registry, deployer, opName, cb);
		}
		
		/**
		 * update the ledger entry and trigger service redeploy operation
		 */
		if (req.soajs.inputmaskData.data.id) {
			req.soajs.inputmaskData.id = req.soajs.inputmaskData.data.id;
			BL.model.validateId(req.soajs, (err) => {
				if (err)
					return cb(err);
				
				let opts = {
					"collection": "ledger",
					"conditions": { "_id": req.soajs.inputmaskData.id }
				};
				BL.model.findEntry(req.soajs, opts, (error, record) => {
					if (error)
						return cb(error);
					
					
					opts = {
						"collection": "ledger",
						"conditions": {
							"serviceId": record.serviceId,
							"env": record.env,
							"repo": record.repo,
							"branch": record.branch
						},
						"fields": {
							"$set": {
								"manual": true,
								"oldTs": record.ts,
								"ts": new Date().getTime()
							}
						},
						"options": { "upsert": true, "multi": true }
					};
					BL.model.updateEntry(req.soajs, opts, (error) => {
						if (error)
							return cb(error);
						
						delete record.oldTs;
						delete record._id;
						opts = {
							"collection": "ledger",
							"record": record
						};
						BL.model.insertEntry(req.soajs, opts, (error) => {
							if (error)
								return cb(error);
							
							req.soajs.inputmaskData.action = "redeploy";
							req.soajs.inputmaskData.env = record.env;
							req.soajs.inputmaskData.mode = record.mode;
							req.soajs.inputmaskData.serviceId = record.serviceId;
							callDeployer('redeployService', cb);
						});
					});
				});
			});
		}
		else {
			//add new catalog entry and rebuild the service
			let opts = {
				"collection": "ledger",
				"record": {
					"serviceId": req.soajs.inputmaskData.data.serviceId,
					"serviceName": req.soajs.inputmaskData.data.serviceName,
					"mode": req.soajs.inputmaskData.data.mode,
					"env": req.soajs.inputmaskData.data.env.toLowerCase(),
					"ts": new Date().getTime(),
					"rebuild": true
				}
			};
			if (req.soajs.inputmaskData.data.serviceVersion) {
				opts.record[ "serviceVersion" ] = req.soajs.inputmaskData.data.serviceVersion;
			}
			BL.model.insertEntry(req.soajs, opts, (error) => {
				if (error)
					return cb(error);
				
				req.soajs.inputmaskData.action = "rebuild";
				req.soajs.inputmaskData.env = req.soajs.inputmaskData.data.env.toLowerCase();
				req.soajs.inputmaskData.mode = req.soajs.inputmaskData.data.mode;
				req.soajs.inputmaskData.serviceId = req.soajs.inputmaskData.data.serviceId;
				callDeployer('redeployService', cb);
			});
		}
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
		function requireModel (filePath, cb) {
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
