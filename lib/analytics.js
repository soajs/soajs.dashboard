'use strict';

var fs = require("fs");
var async = require("async");
var deployer = require("soajs").drivers;
var utils = require("../utils/utils.js");
var uuid = require('uuid');
var colls = {
	analytics: 'analytics',
	environment: 'environment',
};
var soajs = require('soajs');
var analytics = require("../utils/analytics/analytics.js");

var tracker = {};

var lib = {
	"setEsCluster": function (req, res, config, envRecord, settings, cb) {
		var uid = uuid.v4();
		var es_analytics_db, es_analytics_cluster_name, es_analytics_cluster;
		//get db name from settings if it exists
		function getCluster(call) {
			if (settings && settings.elasticsearch && settings.elasticsearch.db_name && settings.elasticsearch.db_name !== '') {
				es_analytics_db = settings.elasticsearch.db_name;
				//get cluster from environment using db name
				if (envRecord.dbs && envRecord.dbs.databases && envRecord.dbs.databases[es_analytics_db] && envRecord.dbs.databases[es_analytics_db].cluster) {
					es_analytics_cluster_name = envRecord.dbs.databases[es_analytics_db].cluster;
					es_analytics_cluster = envRecord.dbs.clusters[es_analytics_cluster_name];
					return call();
				}
				// if db name does not exist in env record check other environment
				else {
					lib.listEnvironments(req, config, function (err, envs) {
						if (err) {
							return cb(err);
						}
						if (envs && envs.length !== 0) {
							for (var i = 0; i < envs.length; i++) {
								if (envs[i].dbs && envs[i].dbs.databases && envs[i].dbs.databases[es_analytics_db]) {
									es_analytics_cluster_name = envs[i].dbs.databases[es_analytics_db].cluster;
									es_analytics_cluster = envs[i].dbs.clusters[es_analytics_cluster_name];
								}
							}
						}
						return call();
					});
				}
				
			}
			//if no db name provided create one
			else {
				es_analytics_db = "es_analytics_db_" + uid;
				es_analytics_cluster_name = "es_analytics_cluster_" + uid;
				es_analytics_cluster = {
					"servers": [
						{
							"host": "soajs-analytics-elasticsearch",
							"port": 9200
						}
					],
					"credentials": {
						"username": "",
						"password": ""
					},
					"URLParam": {
						"protocol": "http"
					},
					"extraParam": {
						"requestTimeout": 30000,
						"keepAlive": true,
						"maxSockets": 30,
						"number_of_shards": 5,
						"number_of_replicas": 1,
						"apiVersion": "5.x"
					}
				};
				if (envRecord.deployer.selected.split('.')[1] === "kubernetes") {
					//added support for namespace and perService
					var namespace = envRecord.deployer.container["kubernetes"][envRecord.deployer.selected.split('.')[2]].namespace.default;
					if (envRecord.deployer.container["kubernetes"][envRecord.deployer.selected.split('.')[2]].namespace.perService) {
						namespace += '-soajs-analytics-elasticsearch-service';
					}
					es_analytics_cluster.servers[0].host += '.-service' + namespace;
				}
				return call();
			}
		}
		
		getCluster(function () {
			envRecord.dbs.databases[es_analytics_db] = {
				'cluster': es_analytics_cluster_name,
				'tenantSpecific': false
			};
			envRecord.dbs.clusters[es_analytics_cluster_name] = es_analytics_cluster;
			var comboE = {};
			comboE.collection = colls.environment;
			comboE.record = envRecord;
			
			var comboS = {};
			comboS.collection = colls.analytics;
			if (!settings || settings === {}) {
				settings = {};
				settings._type = "settings";
				settings.env = {};
				settings.env[envRecord.code.toLowerCase()] = false;
				settings.elasticsearch = {
					"db_name": es_analytics_db
				}
			}
			if (settings.elasticsearch) {
				settings.elasticsearch.db_name = es_analytics_db;
			}
			comboS.record = settings;
			async.parallel({
				"updateEnv": function (call) {
					BL.model.saveEntry(req.soajs, comboE, call);
				},
				"updateSettings": function (call) {
					BL.model.saveEntry(req.soajs, comboS, call);
				}
			}, function (err, res) {
				if (err) {
					return cb(err);
				}
				else {
					return cb(null, es_analytics_cluster)
				}
			});
		});
	},
	
	"listEnvironments": function (req, config, cb) {
		var opts = {};
		opts.collection = colls.environment;
		BL.model.findEntries(req.soajs, opts, cb);
	},
	//settings object and env record
	//check if analytics is active in any environment
	"getActivatedEnv": function (settings, currentEnv) {
		var activated = false;
		if (settings && settings.env) {
			var environments = Object.keys(settings.env);
			environments.forEach(function (oneEnv) {
				if (oneEnv !== currentEnv) {
					if (settings.env[oneEnv]) {
						activated = true;
					}
				}
			});
		}
		return activated;
	},
	
	"deleteIndexes": function (activated, esClient, esCb) {
		var params = {
			index: '_all'
		};
		if (!activated && !(process.env.SOAJS_TEST_ANALYTICS === 'test')) {
			if (!esClient){
				return esCb(true);
			}
			esClient.db.indices.delete(params, esCb);
		}
		else {
			return esCb(null, true);
		}
	}
};

var BL = {
	model: null,
	
	"getSettings": function (config, req, res) {
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
			utils.checkIfError(req.soajs, res, {config: config, error: error, code: 600}, function () {
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
				return res.jsonp(req.soajs.buildResponse(null, data));
			});
		});
	},
	
	"activateAnalytics": function (config, req, res) {
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
			utils.checkIfError(req.soajs, res, {config: config, error: error, code: 600}, function () {
				var env = req.soajs.inputmaskData.env;
				utils.getEnvironment(req.soajs, BL.model, env, function (error, envRecord) {
					utils.checkIfError(req.soajs, res, {
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
							return res.jsonp(req.soajs.buildResponse(null, data));
						}
						else if (tracker[env] && tracker[env].info && tracker[env].info.status && tracker[env].info.status === "started") {
							data.tracker = tracker[env] || {};
							data[env] = false;
							return res.jsonp(req.soajs.buildResponse(null, data));
						}
						else {
							tracker[env] = {
								"info": {
									"status": "started",
									"ts": date
								}
							};
							lib.setEsCluster(req, res, config, envRecord, settings, function (err, esCluster) {
								utils.checkIfError(req.soajs, res, {
									config: config,
									error: err,
									code: 600 //check this
								}, function () {
									if (!esCluster) {
										return res.jsonp(req.soajs.buildResponse({
											"code": 960,
											"msg": config.errors[960]
										}));
									}
									var esClient = new soajs.es(esCluster);
									var opts = {
										tracker: tracker,
										envRecord: envRecord,
										soajs: req.soajs,
										model: BL.model,
										deployer: deployer,
										config: config,
										utils: utils,
										esCluster: esClient
									};
									tracker.myAnalytics = new analytics(opts);
									tracker.myAnalytics.run();
									return res.jsonp(req.soajs.buildResponse(null, tracker[env]));
								});
							});
						}
					});
				});
			});
		});
	},
	
	"deactivateAnalytics": function (config, req, res) {
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
			utils.checkIfError(req.soajs, res, {config: config, error: error, code: 600}, function () {
				utils.getEnvironment(req.soajs, BL.model, env, function (error, envRecord) {
					utils.checkIfError(req.soajs, res, {
						config: config,
						error: error || !envRecord,
						code: 402
					}, function () {
						//list services
						var options = utils.buildDeployerOptions(envRecord, req.soajs, BL);
						deployer.listServices(options, function (error, services) {
							utils.checkIfError(req.soajs, res, {config: config, error: error}, function () {
								if (!services) services = [];
								//loop over services
								//delete kibana, logstash, filebeat, and metric beat
								var es_analytics_cluster_name, es_analytics_cluster, es_analytics_db, esClient;
								var activated = lib.getActivatedEnv(settings, env);
								if (settings && settings.elasticsearch && settings.elasticsearch.db_name) {
									es_analytics_db = settings.elasticsearch.db_name;
									if (envRecord.dbs && envRecord.dbs.databases && envRecord.dbs.databases[es_analytics_db] && envRecord.dbs.databases[es_analytics_db].cluster) {
										es_analytics_cluster_name = envRecord.dbs.databases[es_analytics_db].cluster;
										es_analytics_cluster = envRecord.dbs.clusters[es_analytics_cluster_name];
									}
									if (es_analytics_cluster) {
										esClient = new soajs.es(es_analytics_cluster);
									}
								}
								lib.deleteIndexes(activated, esClient, function (err) {
									if (err) {
										return res.jsonp(req.soajs.buildResponse({
											"code": 960,
											"msg": config.errors[960]
										}));
									}
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
										utils.checkIfError(req.soajs, res, {
												config: config,
												error: error
											},
											function () {
												//update mongo record
												if (!settings) {
													tracker = {};
													return res.jsonp(req.soajs.buildResponse(null, true));
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
													utils.checkIfError(req.soajs, res, {
														config: config,
														error: error,
														code: 600
													}, function () {
														//reset tracker
														tracker = {};
														return res.jsonp(req.soajs.buildResponse(null, true));
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
		});
	}
};

module.exports = {
	"init": function (modelName, cb) {
		var modelPath;
		
		if (!modelName) {
			return cb(new Error("No Model Requested!"));
		}
		
		modelPath = __dirname + "/../models/" + modelName + ".js";
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
