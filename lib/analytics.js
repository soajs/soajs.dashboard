'use strict';

var fs = require("fs");
var async = require("async");
var deployer = require("soajs.core.drivers");
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
		if (settings && settings.elasticsearch && settings.elasticsearch.db_name && settings.elasticsearch.db_name !== '') {
			es_analytics_db = settings.elasticsearch.db_name;
			//get cluster from environment using db name
			if (envRecord.dbs && envRecord.dbs.databases && envRecord.dbs.databases[es_analytics_db] && envRecord.dbs.databases[es_analytics_db].cluster) {
				es_analytics_cluster_name = envRecord.dbs.databases[es_analytics_db].cluster;
				es_analytics_cluster = envRecord.dbs.clusters[es_analytics_cluster_name];
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
								es_analytics_cluster = envRecord.dbs.clusters[es_analytics_cluster_name];
							}
						}
					}
					return es_analytics_cluster ? cb(null, es_analytics_cluster) : cb(null, null);
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
						//"host": "soajs-analytics-elasticsearch", //todo check this
						"host": "elasticsearch", //todo check this
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
					"number_of_replicas": 1
				}
			}
		}
		
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
		comboS.conditions = {
			"_type": "settings"
		};
		comboS.fields = {
			"$set": {
				"elasticsearch": {
					"db_name": es_analytics_db
				}
			}
		};
		comboS.options = {
			"safe": true,
			"multi": false,
			"upsert": true
		};
		if (!settings || settings === {}) {
			comboS.fields["$set"].env = {};
			comboS.fields["$set"].env[envRecord.code.toLowerCase()] = false;
		}
		async.parallel({
			"updateEnv": function (call) {
				BL.model.saveEntry(req.soajs, comboE, call);
			},
			"updateSettings": function (call) {
				BL.model.updateEntry(req.soajs, comboS, call);
			}
		}, function (err) {
			if (err) {
				return cb(err);
			}
			else {
				return cb(null, es_analytics_cluster)
			}
		});
	},
	"listEnvironments": function (req, config, cb) {
		var opts = {};
		opts.collection = colls.environment;
		BL.model.findEntries(req.soajs, opts, cb);
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
		 * @param {Function} cb
		 * @returns {Object} data
		 */
		
		var combo = {};
		combo.collection = colls.analytics;
		combo.conditions = {
			"_type": "settings"
		};
		
		var date = new Date().getTime();
		BL.model.findEntry(req.soajs, combo, function (error, response) {
			utils.checkIfError(req.soajs, res, {config: config, error: error || !response, code: 600}, function () {
				var env = req.soajs.inputmaskData.env.toLowerCase();
				var data = {};
				// return tracker ready of analytics
				if (response.env && response.env[env]) {
					if (!(tracker[env] && tracker[env].info && tracker[env].info.status)) {
						tracker[env] = {
							"info": {
								"status": "ready",
								"ts": date
							}
						};
						data[env] = true;
					}
					else {
						data.tracker = tracker[env];
						data[env] = true;
					}
				}
				else {
					data.tracker = tracker[env] || {};
					data[env] = false;
				}
				if (response.kibana) {
					data.kibana = response.kibana;
				}
				if (response.elasticsearch) {
					data.elasticsearch = response.elasticsearch;
				}
				return res.jsonp(req.soajs.buildResponse(null, data));
				
			});
		});
		//todo add info to environment
	},
	
	"activateAnalytics": function (config, req, res) {
		/**
		 * activateAnalytics
		 *
		 * @param {Object} config
		 * @param {Object} req
		 * @param {Object} res
		 * @param {Function} cb
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
										res.jsonp(req.soajs.buildResponse({
											"code": 512,
											"msg": config.errors[512]
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
