'use strict';
const fs = require("fs");
const async = require("async");
const coreDrivers = require("soajs").drivers;
const utils = require("../../utils/utils.js");
const uuid = require('uuid');
const colls = {
	analytics: 'analytics',
	environment: 'environment'
};
const soajs = require('soajs');
let analytics = require("../../utils/analytics/analytics.js");
let tracker = {};

const lib = require("./helper.js");

const BL = {
	model: null,
	
	"getSettings": (config, req, res, cbMain) => {
		/**
		 * get analytics content
		 *
		 * @param {Object} config
		 * @param {Object} req
		 * @param {Object} res
		 * @returns {Object} data
		 */
		
		let combo = {};
		combo.collection = colls.analytics;
		combo.conditions = {
			"_type": "settings"
		};
		let date = new Date().getTime();
		BL.model.findEntry(req.soajs, combo, (error, response) => {
			utils.checkErrorReturn(req.soajs, cbMain, {config: config, error: error, code: 600}, () => {
				let env = req.soajs.inputmaskData.env.toLowerCase();
				let data = {};
				// return tracker ready
				let activated = false;
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
	
	"activateAnalytics": (config, req, res, cbMain) => {
		/**
		 * activateAnalytics
		 *
		 * @param {Object} config
		 * @param {Object} req
		 * @param {Object} res
		 * @returns {Object}
		 */
		let combo = {};
		combo.collection = colls.analytics;
		combo.conditions = {
			"_type": "settings"
		};
		let date = new Date().getTime();
		BL.model.findEntry(req.soajs, combo, (error, settings) => {
			utils.checkErrorReturn(req.soajs, cbMain, {config: config, error: error, code: 600}, () => {
				let env = req.soajs.inputmaskData.env;
				
				let data = {};
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
					lib.setEsCluster(req, res, config, req.soajs.registry, settings, BL.model, (err, esCluster) => {
						utils.checkErrorReturn(req.soajs, cbMain, {config: config, error: err, code: 600}, () => {
							if (!esCluster) {
								//reset track of env
								tracker[env] = {
									"info": {
										"status": "failed",
										"ts": date
									}
								};
								return cbMain({"code": 960, "msg": config.errors[960]});
							}
							
							let esClient = new soajs.es(esCluster.esCluster);
							let opts = {
								envCode: env,
								envRecord: req.soajs.registry,
								tracker: tracker,
								analyticsSettings: settings,
								soajs: req.soajs,
								model: BL.model,
								deployerOptions: utils.buildDeployerOptions(env, soajs, BL),
								config: config,
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
	},
	
	"deactivateAnalytics": (config, req, res, cbMain) => {
		/**
		 * deactivateAnalytics
		 *
		 * @param {Object} config
		 * @param {Object} req
		 * @param {Object} res
		 * @returns {Object}
		 */
		let env = req.soajs.inputmaskData.env.toLowerCase();
		let combo = {};
		combo.collection = colls.analytics;
		combo.conditions = {
			"_type": "settings"
		};
		//get analytics mongo record (settings)
		BL.model.findEntry(req.soajs, combo, (error, settings) => {
			utils.checkErrorReturn(req.soajs, cbMain, {config: config, error: error, code: 600}, () => {
				let envRecord = req.soajs.registry;
				envRecord.code = env.toUpperCase();
				
				//list services
				let options = utils.buildDeployerOptions(envRecord, req.soajs, BL);
				coreDrivers.listServices(options, (error, services) => {
					utils.checkErrorReturn(req.soajs, cbMain, {config: config, error: error}, () => {
						if (!services) services = [];
						
						//loop over services
						//delete kibana, logstash, filebeat, and metric beat
						let activated = lib.getActivatedEnv(settings, env);
						async.eachSeries(services, (oneService, callback) => {
							//add check if another environment have analytics activated
							//if activated do not remove kibana or metricbeat
							if (oneService.labels["soajs.service.type"] === "elk" && oneService.labels["soajs.service.name"] !== "soajs-analytics-elasticsearch") {
								if (activated && ((oneService.labels["soajs.service.name"] === "soajs-metricbeat") || oneService.labels["soajs.service.name"] === "kibana")) {
									return callback(null, true);
								}
								else if (oneService.labels["soajs.env.code"] === env || oneService.labels["soajs.service.name"] === "kibana" || oneService.labels["soajs.service.name"] === "soajs-metricbeat") {
									options.params = {
										id: oneService.id,
										mode: oneService.labels["soajs.service.mode"] //NOTE: required for kubernetes driver only
									};
									if (!(process.env.SOAJS_TEST_ANALYTICS === 'test')) {
										coreDrivers.deleteService(options, callback);
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
						}, (error) => {
							utils.checkErrorReturn(req.soajs, cbMain, { config: config, error: error }, () => {
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
								let comboS = {};
								comboS.collection = colls.analytics;
								comboS.record = settings;
								BL.model.saveEntry(req.soajs, comboS, (error) => {
									utils.checkErrorReturn(req.soajs, cbMain, { config: config, error: error, code: 600 }, () => {
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
	}
};

module.exports = {
	"init": (modelName, cb) => {
		let modelPath;
		
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
			fs.exists(filePath, (exists) => {
				if (!exists) {
					return cb(new Error("Requested Model Not Found!"));
				}
				
				BL.model = require(filePath);
				return cb(null, BL);
			});
		}
	}
};
