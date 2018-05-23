'use strict';
var fs = require('fs');
var async = require('async');
var request = require("request");
var utils = require('../../utils/utils.js');

var colName = 'cicd';
var envColName = 'environment';
var servicesColName = 'services';
var daemonsColName = 'daemons';
var daemonsGrpConfColName = 'daemon_grpconf';
var gitAccountsColName = 'git_accounts';

function checkIfError(soajs, mainCb, data, cb) {
	utils.checkErrorReturn(soajs, mainCb, data, cb);
}

var BL = {

	model: null,

	/**
	 * Function that gets CD config
	 * @param  {Object}     config
	 * @param  {Object}     req
	 * @param  {Object}     helpers
	 * @param  {Function}   cb
	 *
	 */
	getConfig: function (config, req, helpers, cb) {
		var opts = { collection: colName, conditions: { "type": "cd" } };
		BL.model.findEntry(req.soajs, opts, function (error, record) {
			checkIfError(req.soajs, cb, { config: config, error: error, code: 600 }, function () {
				async.mapValues(record, function (oneRecordEntry, key, callback) {
					if (['_id', 'type'].indexOf(key) !== -1 || typeof(oneRecordEntry) !== 'object') {
						return callback(null, oneRecordEntry);
					}

					return utils.normalizeKeyValues(oneRecordEntry, config.tokens.dotToken, config.tokens.dotValue, callback);
				}, function (error, updatedRecords) {
					if(!process.env.SOAJS_SAAS && updatedRecords[process.env.SOAJS_ENV.toUpperCase()]){
						delete updatedRecords[process.env.SOAJS_ENV.toUpperCase()];
					}
					return cb(null, updatedRecords || {});
				});
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
		var opts = { collection: colName, conditions: { "type": "cd" } };
		BL.model.findEntry(req.soajs, opts, function (error, record) {
			checkIfError(req.soajs, cb, { config: config, error: error, code: 600 }, function () {

				//normalize service name, replace "." with __dot__
				if (req.soajs.inputmaskData.config.serviceName) {
					var regex = new RegExp(config.tokens.dotRegexString, 'g');
					if (req.soajs.inputmaskData.config.serviceName.match(regex)) {
						req.soajs.inputmaskData.config.serviceName = req.soajs.inputmaskData.config.serviceName.replace(regex, config.tokens.dotToken);
					}
				}

				if (!record) {
					record = { type: 'cd' };
				}

				if (!record[req.soajs.inputmaskData.config.env.toUpperCase()]) {
					record[req.soajs.inputmaskData.config.env.toUpperCase()] = {};
				}

				if (!record[req.soajs.inputmaskData.config.env.toUpperCase()][req.soajs.inputmaskData.config.serviceName]) {
					record[req.soajs.inputmaskData.config.env.toUpperCase()][req.soajs.inputmaskData.config.serviceName] = {};
				}

				if(req.soajs.inputmaskData.config.default){
					record[req.soajs.inputmaskData.config.env.toUpperCase()][req.soajs.inputmaskData.config.serviceName] = req.soajs.inputmaskData.config.default;
					record[req.soajs.inputmaskData.config.env.toUpperCase()][req.soajs.inputmaskData.config.serviceName].type = 'custom';
				}
				else if(req.soajs.inputmaskData.config.version && req.soajs.inputmaskData.config.version.options && req.soajs.inputmaskData.config.version.options.custom && req.soajs.inputmaskData.config.version.options.custom.type === 'daemon'){
					var version = req.soajs.inputmaskData.config.version.v;
					delete req.soajs.inputmaskData.config.version.v;

					var groupName = req.soajs.inputmaskData.config.version.options.custom.daemonGroup;
					record[req.soajs.inputmaskData.config.env.toUpperCase()][req.soajs.inputmaskData.config.serviceName].type = 'daemon';

					if(!record[req.soajs.inputmaskData.config.env.toUpperCase()][req.soajs.inputmaskData.config.serviceName][version]){
						record[req.soajs.inputmaskData.config.env.toUpperCase()][req.soajs.inputmaskData.config.serviceName][version] = {};
					}
					record[req.soajs.inputmaskData.config.env.toUpperCase()][req.soajs.inputmaskData.config.serviceName][version][groupName] = req.soajs.inputmaskData.config.version;
				}
				else if (req.soajs.inputmaskData.config.version) {
					var version = req.soajs.inputmaskData.config.version.v;
					delete req.soajs.inputmaskData.config.version.v;
					record[req.soajs.inputmaskData.config.env.toUpperCase()][req.soajs.inputmaskData.config.serviceName][version] = req.soajs.inputmaskData.config.version;
					record[req.soajs.inputmaskData.config.env.toUpperCase()][req.soajs.inputmaskData.config.serviceName].type = 'service';
				}

				if(!process.env.SOAJS_SAAS && record[process.env.SOAJS_ENV.toUpperCase()]){
					delete record[process.env.SOAJS_ENV.toUpperCase()];
				}

				opts = {
					collection: colName,
					record: record
				};
				BL.model.saveEntry(req.soajs, opts, function(error){
					checkIfError(req.soajs, cb, { config: config, error: error, code: 600 }, function () {
						return cb(null, true);
					});
				});
			});
		});
	},

	/**
	 * Function that pauses/unpauses the CD in an environment
	 * @param config
	 * @param req
	 * @param helpers
	 * @param cb
	 */
	pauseCD: function(config, req, helpers, cb){
		var opts = { collection: colName, conditions: { "type": "cd" } };
		BL.model.findEntry(req.soajs, opts, function (error, record) {
			checkIfError(req.soajs, cb, { config: config, error: error, code: 600 }, function () {

				if(!record[req.soajs.inputmaskData.config.env.toUpperCase()]){
					record[req.soajs.inputmaskData.config.env.toUpperCase()] = {};
				}
				record[req.soajs.inputmaskData.config.env.toUpperCase()].pause = req.soajs.inputmaskData.config.pause;

				if(record[process.env.SOAJS_ENV.toUpperCase()]){
					delete record[process.env.SOAJS_ENV.toUpperCase()];
				}

				opts = {
					collection: colName,
					record: record
				};
				BL.model.saveEntry(req.soajs, opts, function(error){
					checkIfError(req.soajs, cb, { config: config, error: error, code: 600 }, function () {
						return cb(null, true);
					});
				});
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
				checkIfError(req.soajs, cb, { config: config, error: error, code: 600 }, function () {
					// get all environments
					getEnvs(function (error, envs) {
						//NOTE: the only error returned by this function is from the drivers, which are handled by checkIfError
						checkIfError(req.soajs, cb, { config: config, error: error }, function () {
							// check if cd should be triggered based on available input
							checkConfig(record, envs, function (error, servicesList) {
								// no error to be handled here
								getUndeployedServices(servicesList, record, { envs: envs }, function (error, undeployedServices) {
									// no error to be handled here
									servicesList = servicesList.concat(undeployedServices);
									// perform CD operations on services
									processCD(record, servicesList, function (error) {
										checkIfError(req.soajs, cb, { config: config, error: error, code: 600 }, function () {
											return cb(null, true);
										});
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
				collection: gitAccountsColName,
				conditions: {
					'repos.name': req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo
				}
			};
			BL.model.findEntry(req.soajs, opts, function (error, record) {
				checkIfError(req.soajs, cb, { config: config, error: error, code: 600 }, function() {
					checkIfError(req.soajs, cb, { config: config, error: !record, code: 955 }, function() {
						opts = {
							collection: colName,
							conditions: {
								"type": "account",
								"provider": req.soajs.inputmaskData.ciProvider,
								"owner": record.owner
							}
						};
						BL.model.findEntry(req.soajs, opts, function (error, record) {
							checkIfError(req.soajs, cb, { config: config, error: error, code: 600 }, function () {
								checkIfError(req.soajs, cb, { config: config, error: !record, code: 955 }, function () {
									checkIfError(req.soajs, cb, {
										config: config,
										error: record.gitToken !== req.soajs.inputmaskData.deploy_token,
										code: 956
									}, fcb);
								});
							});
						});
					});
				});
			});
		}

		function getEnvs (fcb) {
			var opts = {
				collection: envColName,
				conditions: {
					"code": {"$ne": process.env.SOAJS_ENV.toUpperCase()},
					"deployer.type": "container"
				}
			};
			BL.model.findEntries(req.soajs, opts, function (error, envs) {
				checkIfError(req.soajs, cb, { config: config, error: error, code: 600 }, function () {
					// get all services deployed in each environment
					helpers.getEnvsServices(envs, req, deployer, BL, fcb);
				});
			});
		}

		function checkConfig (record, envs, cb) {
			if (!record) return cb(); // no CD config found

			helpers.checkRecordConfig(req, envs, record, cb);
		}

		function getUndeployedServices(deployedServices, cdRecord, options, fcb) {
			delete cdRecord._id;
			delete cdRecord.type;

			//update service/repo names to restore any dots replaced with tokens
			for (var envKey in cdRecord) {
				for (var serviceKey in cdRecord[envKey]) {
					var newKey = serviceKey.replace(/__dot__/g, '.');
					cdRecord[envKey][newKey] = cdRecord[envKey][serviceKey];
				}
			}

			//update CD record to include environment record for each environment entry
			//this is useful later on to call environment deployer and deploy the new service
			async.mapValues(cdRecord, function (oneCDEnvConfig, envCode, callback) {
				async.detect(options.envs, function (oneEnvRecord, callback) {
					return callback(null, (oneEnvRecord.record.code.toLowerCase() === envCode.toLowerCase()));
				}, function (error, matchingEnvRecord) {
					return callback(null, { envConfig: oneCDEnvConfig, envRecord: (matchingEnvRecord && matchingEnvRecord.record) || {} });
				});
			}, function (error, cdRecordWithEnvRecords) {

				var opts = {
					collection: servicesColName,
					conditions: {
						'src.owner': req.soajs.inputmaskData.owner,
						'src.repo': req.soajs.inputmaskData.repo
					}
				};

				if (req.soajs.inputmaskData.services && Array.isArray(req.soajs.inputmaskData.services) && req.soajs.inputmaskData.services.length > 0) {
					opts.conditions.name = { $in: [] };
					req.soajs.inputmaskData.services.forEach(function(oneServiceEntry) {
						opts.conditions.name.$in.push(oneServiceEntry.serviceName);
					});
				}

				BL.model.findEntries(req.soajs, opts, function (error, services) {
					checkIfError(req.soajs, cb, { config: config, error: error, code: 600 }, function () {
						services.forEach(function(oneService) {
							oneService.type = 'service';
						});

						opts.collection = daemonsColName;
						BL.model.findEntries(req.soajs, opts, function (error, daemons) {
							checkIfError(req.soajs, cb, { config: config, error: error, code: 600 }, function () {
								daemons.forEach(function (oneDaemon) {
									oneDaemon.type = 'daemon';
								});

								var allServices = services.concat(daemons);
								//services were found in collections, process records
								if (allServices.length > 0) {
									async.concat(allServices, function (oneEntry, callback) {
										oneEntry.serviceName = oneEntry.name; //normalizing record key for service name
										oneEntry.serviceVersion = '';
										//get service version from the data provided by the cd script call
										if(req.soajs.inputmaskData.services) {
											for (var i = 0; i < req.soajs.inputmaskData.services.length; i++) {
												var oneService = req.soajs.inputmaskData.services[i];
												if((oneEntry.serviceName === oneService.serviceName) && oneService.serviceVersion) {
													oneEntry.serviceVersion = oneService.serviceVersion;
													break;
												}
											}
										}

										if (oneEntry.type === 'daemon') {
											var grpConfOpts = {
												collection: daemonsGrpConfColName,
												conditions: {
													daemon: oneEntry.serviceName
												}
											};
											BL.model.findEntries(req.soajs, grpConfOpts, function (error, grpConfs) {
												if(error) return callback(error);

												//clone daemon entry into several entries each with a group config
												var daemonsPerGroup = [];
												grpConfs.forEach(function(oneGroup) {
													var daemonEntry = JSON.parse(JSON.stringify(oneEntry));
													daemonEntry.group = oneGroup.daemonConfigGroup;
													daemonsPerGroup.push(daemonEntry);
												});

												return callback(null, daemonsPerGroup);
											});
										}
										else {
											return callback(null, [ oneEntry ]);
										}
									}, function (error, allServices) {
										checkIfError(req.soajs, cb, { config: config, error: error, code: 600 }, function () {
											return helpers.processUndeployedServices(req, deployedServices, allServices, cdRecordWithEnvRecords, fcb);
										});
									});
								}
								//no records were found for repo, custom repo detected
								else {
									allServices = [
										{
											custom: true,
											repoName: req.soajs.inputmaskData.repo
										}
									];

									return helpers.processUndeployedServices(req, deployedServices, allServices, cdRecordWithEnvRecords, fcb);
								}
							});
						});
					});
				});
			});
		}

		function processCD (record, servicesList, cb) {
			var options = { config: config };
			async.eachSeries(servicesList, function (oneService, callback) {
				helpers.processOneService(req, BL, oneService, deployer, options, record, callback);
			}, cb);
		}
	},

	/**
	 * Function that gets Update Notification Ledger
	 * @param  {Object}             config
	 * @param  {Request Object}     req
	 * @param  {Function}           cb
	 */
	getUpdates: function (config, req, deployer, helpers, cloudServicesBL, cb) {
		/**
		 * get all catalogs
		 * @param cbk
		 */
		function getCatalogs (cbk) {
			let opts = {
				collection: "catalogs",
				conditions: {}
			};
			BL.model.findEntries(req.soajs, opts, cbk);
		}

		/**
		 * get all deployed services in this environment
		 * @param cbk
		 */
		function getServices (cbk) {
			helpers.getServices(config, req, deployer, cloudServicesBL, cbk);
		}

		/**
		 * get the latest soajs images
		 * @param cbk
		 */
		function getLatestSOAJSImageInfo (cbk) {
			helpers.getLatestSOAJSImageInfo(config, cbk);
		}

		var updateList = [];
		async.parallel({
			'catalogs': getCatalogs,
			'services': getServices,
			"soajsImages": getLatestSOAJSImageInfo
		}, function (error, response) {
			checkIfError(req.soajs, cb, { config: config, error: error, code: 600 }, function () {
				/**
				 * compare entries
				 */
				async.each(response.services, function (oneService, cback) {
					helpers.doesServiceHaveUpdates(req, config, updateList, oneService, response.catalogs, response.soajsImages, cback);
				}, function (error) {
					checkIfError(req.soajs, cb, { config: config, error: error, code: 600 }, function () {
						return cb(null, updateList);
					});
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
			"conditions": { "env": req.soajs.inputmaskData.env.toLowerCase(), $or: [{logs : false}, {logs : {$exists: false}}] },
			"options": {
				"sort": { "ts": -1 },
				"skip": req.soajs.inputmaskData.start,
				"limit": 200
			}
		};
		
		if(req.soajs.inputmaskData.logs){
			delete opts.conditions.$or;
			opts.conditions.logs = req.soajs.inputmaskData.logs;
		}
		
		async.auto({
			"getOverallCount": (mCb) =>{
				let condition = JSON.parse(JSON.stringify(opts.conditions));
				BL.model.countEntries(req.soajs, { collection: opts.collection, 'conditions': condition }, mCb);
			},
			"getUnreadCount": (mCb) => {
				let condition = JSON.parse(JSON.stringify(opts.conditions));
				condition.read = false;
				BL.model.countEntries(req.soajs, { collection: opts.collection, 'conditions': condition }, mCb);
			},
			"getLogs": (mCb) => {
				BL.model.findEntries(req.soajs, opts, mCb)
			}
		}, (error, result) => {
			checkIfError(req.soajs, cb, { config: config, error: error, code: 600 }, function () {
				return cb(null, {logs: result.getLogs, count: result.getOverallCount, unread: result.getUnreadCount});
			});
		});
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
			BL.model.validateId(req.soajs, (error) => {
				checkIfError(req.soajs, cb, { config: config, error: error, code: 701 }, function () {
					opts.conditions = { "_id": req.soajs.inputmaskData.id, $or: [{logs : false}, {logs : {$exists: false}}] };
					opts.options = { "upsert": true };
					
					if(req.soajs.inputmaskData.data.logs){
						delete opts.conditions.$or;
						delete opts.options;
						opts.conditions.logs = req.soajs.inputmaskData.data.logs;
					}
					
					BL.model.updateEntry(req.soajs, opts, (error, res) => {
						checkIfError(req.soajs, cb, { config: config, error: error, code: 600 }, function () {
							return cb(null, res);
						});
					});
				});
			});
		}
		else if (req.soajs.inputmaskData.data.all) {
			opts.conditions = {$or: [{logs : false}, {logs : {$exists: false}}]};
			
			if(req.soajs.inputmaskData.data.logs){
				delete opts.conditions.$or;
				opts.conditions.logs = req.soajs.inputmaskData.data.logs;
			}
			
			opts.options = { "upsert": false, "safe": true, "multi": true };
			BL.model.updateEntry(req.soajs, opts, (error, res) => {
				checkIfError(req.soajs, cb, { config: config, error: error, code: 600 }, function () {
					return cb(null, res);
				});
			});
		}
	},

	/**
	 * function that takes action based on ledger notification
	 * @param config
	 * @param req
	 * @param cb
	 */
	cdAction: function (config, req, deployer, helpers, cb) {
		function callDeployer (opName, cb) {
			helpers.callDeployer(config, req, deployer, opName, cb);
		}

		/**
		 * update the ledger entry and trigger service redeploy operation
		 */
		if (req.soajs.inputmaskData.data.id) {
			req.soajs.inputmaskData.id = req.soajs.inputmaskData.data.id;
			BL.model.validateId(req.soajs, (error) => {
				checkIfError(req.soajs, cb, { config: config, error: error, code: 701 }, function () {
					let opts = {
						"collection": "ledger",
						"conditions": { "_id": req.soajs.inputmaskData.id }
					};
					BL.model.findEntry(req.soajs, opts, (error, record) => {
						checkIfError(req.soajs, cb, { config: config, error: error, code: 600 }, function () {
							opts = {
								"collection": "ledger",
								"conditions": {
									"serviceId": record.serviceId,
									"env": record.env,
									"repo": record.repo,
									"branch": record.branch,
									"actionTaken": { $exists: 0 }
								},
								"fields": {
									"$set": {
										"manual": true,
										"actionTaken": req.soajs.inputmaskData.data.action, //NOTE: needed field to differentiate between rebuild and deploy actions
										"oldTs": record.ts,
										"ts": new Date().getTime()
									}
								},
								"options": { "upsert": true, "multi": true }
							};

							//in case of daemon, add daemon group to conditions to avoid updating other group entries of the same daemon
							if(record.daemonGroup) {
								opts.conditions.daemonGroup = record.daemonGroup;
							}

							BL.model.updateEntry(req.soajs, opts, (error, response) => {
								checkIfError(req.soajs, cb, { config: config, error: error, code: 600 }, function () {
									delete record.oldTs;
									delete record._id;
									delete record.serviceIsDeployed;
									//mark notification as handled to avoid future updates from updating it
									record.actionTaken = 'handled';

									opts = {
										"collection": "ledger",
										"record": record
									};
									BL.model.insertEntry(req.soajs, opts, (error) => {
										checkIfError(req.soajs, cb, { config: config, error: error, code: 600 }, function () {
											//service is not yet deployed, deploy it
											if (req.soajs.inputmaskData.data.action === 'deploy') {
												req.soajs.inputmaskData = req.soajs.inputmaskData.deployOptions;
												callDeployer('deployService', cb);
											}
											//service is deployed, redeploy it
											else {
												req.soajs.inputmaskData.action = "redeploy";
												req.soajs.inputmaskData.env = record.env;
												req.soajs.inputmaskData.mode = record.mode;
												req.soajs.inputmaskData.serviceId = record.serviceId;
												callDeployer('redeployService', cb);
											}
										});
									});
								});
							});
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
					"actionTaken": req.soajs.inputmaskData.data.action,
					"rebuild": true
				}
			};
			if (req.soajs.inputmaskData.data.serviceVersion) {
				opts.record[ "serviceVersion" ] = req.soajs.inputmaskData.data.serviceVersion;
			}
			BL.model.insertEntry(req.soajs, opts, (error) => {
				checkIfError(req.soajs, cb, { config: config, error: error, code: 600 }, function () {
					req.soajs.inputmaskData.action = "rebuild";
					req.soajs.inputmaskData.env = req.soajs.inputmaskData.data.env.toLowerCase();
					req.soajs.inputmaskData.mode = req.soajs.inputmaskData.data.mode;
					req.soajs.inputmaskData.serviceId = req.soajs.inputmaskData.data.serviceId;
					callDeployer('redeployService', cb);
				});
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
