'use strict';

var fs = require("fs");
var async = require("async");
var deployer = require("soajs").drivers;
var utils = require("../../utils/utils.js");
var uuid = require('uuid');
var colls = {
	analytics: 'analytics',
	environment: 'environment'
};
var soajs = require('soajs');
var analytics = require("../../utils/analytics/analytics.js");
var tracker = {};

var lib = require("./helper.js");

var BL = {
	model: null,
	
	"getSettings": function (config, req, res, cbMain) {
		/**
		 * get analytics content
		 *
		 * @param {Object} config
		 * @param {Object} req
		 * @param {Object} res
		 * @returns {Object} data
		 */
		
		var combo = {};
		combo.collection = colls.analytics;
		combo.conditions = {
			"_type": "settings"
		};
		var date = new Date().getTime();
		BL.model.findEntry(req.soajs, combo, function (error, response) {
			utils.checkErrorReturn(req.soajs, cbMain, { config: config, error: error, code: 600 }, function () {
				var env = req.soajs.inputmaskData.env.toLowerCase();
				var data = {};
				// return tracker ready
				var activated = false;
				if (response && response.env) {
					activated = lib.getActivatedEnv(response, env);
				}
				if (response && response.env && response.env[env]) {
					if (!(tracker[env] && tracker[env].info && tracker[env].info.status)) {
						tracker[env] = {
							"info": {
								"status": "ready",
								"ts": date
							}
						};
						data[env] = true;
						data.tracker = tracker[env];
						data.activated = activated;
					}
					else {
						data.tracker = tracker[env];
						data[env] = true;
						data.activated = activated;
					}
				}
				else {
					data.tracker = tracker[env] || {};
					data[env] = false;
					data.activated = activated;
					
				}
				if (response) {
					if (response.kibana) {
						data.kibana = response.kibana;
					}
					if (response.elasticsearch) {
						data.elasticsearch = response.elasticsearch;
					}
				}
				return cbMain(null, data);
			});
		});
	},
	
	"activateAnalytics": function (config, req, res, cbMain) {
		/**
		 * activateAnalytics
		 *
		 * @param {Object} config
		 * @param {Object} req
		 * @param {Object} res
		 * @returns {Object}
		 */
		var combo = {};
		combo.collection = colls.analytics;
		combo.conditions = {
			"_type": "settings"
		};
		var date = new Date().getTime();
		BL.model.findEntry(req.soajs, combo, function (error, settings) {
			utils.checkErrorReturn(req.soajs, cbMain, { config: config, error: error, code: 600 }, function () {
				var env = req.soajs.inputmaskData.env;
				utils.getEnvironment(req.soajs, BL.model, env, function (error, envRecord) {
					utils.checkErrorReturn(req.soajs, cbMain, {
						config: config,
						error: error || !envRecord,
						code: 600
					}, function () {
						var data = {};
						if (settings && settings.env && settings.env[env]) {
							tracker[env] = {
								"info": {
									"status": "ready",
									"ts": date
								}
							};
							data[env] = true;
							data.tracker = tracker[env];
							return cbMain(null, data);
						}
						else if (tracker[env] && tracker[env].info && tracker[env].info.status && tracker[env].info.status === "started") {
							data.tracker = tracker[env] || {};
							data[env] = false;
							return cbMain(null, data);
						}
						else {
							tracker[env] = {
								"info": {
									"status": "started",
									"ts": date
								}
							};
							lib.setEsCluster(req, res, config, envRecord, settings, BL.model, function (err, esCluster) {
								utils.checkErrorReturn(req.soajs, cbMain, {
									config: config,
									error: err,
									code: 600 //check this
								}, function () {
									if (!esCluster) {
										//reset track of env
										tracker[env] = {
											"info": {
												"status": "failed",
												"ts": date
											}
										};
										return cbMain({ "code": 960, "msg": config.errors[960]});
									}
									var esClient = new soajs.es(esCluster.cluster);
									var opts = {
										tracker: tracker,
										envRecord: envRecord,
										soajs: req.soajs,
										model: BL.model,
										deployer: deployer,
										config: config,
										utils: utils,
										esDbInfo: {
											db: esCluster.esDbName,
											cluster: esCluster.esClusterName
										},
										esCluster: esClient
									};
									tracker.myAnalytics = new analytics(opts);
									tracker.myAnalytics.run();
									return cbMain(null, tracker[env]);
								});
							});
						}
					});
				});
			});
		});
	},
	
	"deactivateAnalytics": function (config, req, res, cbMain) {
		/**
		 * deactivateAnalytics
		 *
		 * @param {Object} config
		 * @param {Object} req
		 * @param {Object} res
		 * @returns {Object}
		 */
		var env = req.soajs.inputmaskData.env.toLowerCase();
		var combo = {};
		combo.collection = colls.analytics;
		combo.conditions = {
			"_type": "settings"
		};
		//get analytics mongo record (settings)
		BL.model.findEntry(req.soajs, combo, function (error, settings) {
			utils.checkErrorReturn(req.soajs, cbMain, { config: config, error: error, code: 600 }, function () {
				utils.getEnvironment(req.soajs, BL.model, env, function (error, envRecord) {
					utils.checkErrorReturn(req.soajs, cbMain, {
						config: config,
						error: error || !envRecord,
						code: 402
					}, function () {
						//list services
						var options = utils.buildDeployerOptions(envRecord, req.soajs, BL);
						deployer.listServices(options, function (error, services) {
							utils.checkErrorReturn(req.soajs, cbMain, { config: config, error: error }, function () {
								if (!services) services = [];
								//loop over services
								//delete kibana, logstash, filebeat, and metric beat
								var activated = lib.getActivatedEnv(settings, env);
								async.eachSeries(services, function (oneService, callback) {
									//add check if another environment have analytics activated
									//if activated do not remove kibana or metricbeat
									if (oneService.labels["soajs.service.type"] === "elk"
										&& oneService.labels["soajs.service.name"] !== "soajs-analytics-elasticsearch") {
										if (activated && ((oneService.labels["soajs.service.name"] === "soajs-metricbeat") ||
											oneService.labels["soajs.service.name"] === "kibana")) {
											return callback(null, true);
										}
										else if (oneService.labels["soajs.env.code"] === env || oneService.labels["soajs.service.name"] === "kibana" || oneService.labels["soajs.service.name"] === "soajs-metricbeat") {
											options.params = {
												id: oneService.id,
												mode: oneService.labels["soajs.service.mode"] //NOTE: required for kubernetes driver only
											};
											if (!(process.env.SOAJS_TEST_ANALYTICS === 'test')) {
												deployer.deleteService(options, callback);
											}
											else {
												return callback(null, true);
											}
										}
										else {
											return callback(null, true);
										}
									}
									else {
										return callback(null, true);
									}
								}, function (error) {
									utils.checkErrorReturn(req.soajs, cbMain, {
										config: config,
										error: error
									}, function () {
										//update mongo record
										if (!settings) {
											tracker = {};
											return cbMain(null, true);
										}
										
										if (settings.env && settings.env[env]) {
											settings.env[env] = false;
										}
										
										if (settings.logstash && settings.logstash[env]) {
											delete settings.logstash[env];
										}
										
										if (settings.filebeat && settings.filebeat[env]) {
											delete settings.filebeat[env];
										}
										
										if (settings.metricbeat && !activated) {
											delete settings.metricbeat;
										}
										if (settings.kibana && !activated) {
											delete settings.kibana;
										}
										
										//save
										var comboS = {};
										comboS.collection = colls.analytics;
										comboS.record = settings;
										BL.model.saveEntry(req.soajs, comboS, function (error) {
											utils.checkErrorReturn(req.soajs, cbMain, {
												config: config,
												error: error,
												code: 600
											}, function () {
												//reset tracker
												tracker = {};
												return cbMain(null, true);
											});
										});
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
