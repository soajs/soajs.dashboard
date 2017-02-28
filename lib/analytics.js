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
		var es_analytics_db, es_analytics_cluster_name, es_analytics_cluster;
		//get db name from settings if it exists
		if (settings.elasticsearch && settings.elasticsearch.db_name && settings.elasticsearch.db_name !== '') {
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
			es_analytics_db = "es_analytics_db_" + uuid.v4();
			es_analytics_cluster_name = "es_analytics_cluster_" + uuid.v4();
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
		BL.model.saveEntry(req.soajs, comboE, function (err, res) {
			if (err){
				cb(err);
			}
			else {
				cb (null, es_analytics_cluster);
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
				var env = req.soajs.inputmaskData.env;
				var data = {};
				// return tracker ready of analytics
				if (response._env && response._env[env]) {
					if (!(tracker[env] && tracker[env].info && tracker[env].info.status)) {
						tracker[env] = {
							"info": {
								"status": "ready",
								"ts": date
							}
						};
						data[env] = true;
					}
				}
				else {
					data.tracker = tracker[env];
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
			utils.checkIfError(req.soajs, res, {config: config, error: error || !settings, code: 600}, function () {
				var env = req.soajs.inputmaskData.env;
				utils.getEnvironment(req.soajs, BL.model, env, function (error, envRecord) {
					utils.checkIfError(req.soajs, res, {
						config: config,
						error: error || !settings,
						code: 600
					}, function () {
						if (settings) {
							// if (response._env && response._env[env]) {
							// 	tracker[env] = {
							// 		"info": {
							// 			"status": "ready",
							// 			"ts": date
							// 		}
							// 	};
							// 	console.log("2")
							// 	return res.jsonp(req.soajs.buildResponse(null, tracker[env]));
							// }
							// else if (tracker[env] && tracker[env].info && tracker[env].info.status && tracker[env].info.status === "started") {
							// 	console.log("3")
							// 	return res.jsonp(req.soajs.buildResponse(null, tracker[env]));
							// }
							// else {
							tracker[env] = {
								"info": {
									"status": "started",
									"ts": date
								}
							};
							lib.setEsCluster(req, res, config, envRecord, settings, function (err, esCluster) {
								console.log(err, "err")
								console.log(esCluster, "esCluster")
								utils.checkIfError(req.soajs, res, {
									config: config,
									error: err,
									code: 600 //check this
								}, function () {
									if (!esCluster) {
										res.jsonp(req.soajs.buildResponse({"code": 512, "msg": config.errors[512]}));
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
				//}
			});
		});
		
		// function getAnalyticsContent(group, type, env, cb) {
		// 	var path = __dirname + "/../utils/analytics/services/" + group + '/';
		// 	fs.exists(path, function (exists) {
		// 		if (!exists) {
		// 			return cb('Folder [' + path + '] does not exist');
		// 		}
		// 		fs.readdir(path, function (error, content) {
		// 			if (error) return cb(error);
		//
		// 			var regex = new RegExp('[a-zA-Z0-9]*\.' + type, 'g');
		// 			var loadContent, allContent = [];
		// 			content.forEach(function (oneContent) {
		// 				if (oneContent.match(regex)) {
		// 					try {
		// 						loadContent = require(path + oneContent);
		// 					}
		// 					catch (e) {
		// 						return cb(e);
		// 					}
		// 					var serviceParams = {
		// 						"env": loadContent.env,
		// 						"name": loadContent.name,
		// 						"image": loadContent.deployConfig.image,
		// 						"variables": loadContent.variables || [],
		// 						"labels": loadContent.labels,
		// 						"cmd": loadContent.command.cmd.concat(loadContent.command.args),
		// 						"memoryLimit": loadContent.deployConfig.memoryLimit,
		// 						"replication": {
		// 							"mode": loadContent.deployConfig.replication.mode,
		// 							"replicas": ((loadContent.deployConfig.replication.mode === 'replicated') ? loadContent.deployConfig.replication.replicas : null)
		// 						},
		// 						"containerDir": loadContent.deployConfig.workDir,
		// 						"restartPolicy": {
		// 							"condition": loadContent.deployConfig.restartPolicy.condition,
		// 							"maxAttempts": loadContent.deployConfig.restartPolicy.maxAttempts
		// 						},
		// 						"network": loadContent.deployConfig.network,
		// 						"ports": loadContent.deployConfig.ports || []
		// 					};
		//
		// 					if (loadContent.deployConfig.volume && Object.keys(loadContent.deployConfig.volume).length > 0) {
		// 						serviceParams.volume = {
		// 							"type": loadContent.deployConfig.volume.type,
		// 							"readOnly": loadContent.deployConfig.volume.readOnly || false,
		// 							"source": loadContent.deployConfig.volume.source,
		// 							"target": loadContent.deployConfig.volume.target
		// 						};
		// 					}
		// 					if (oneContent === 'filebeat.js') {
		// 						serviceParams = JSON.stringify(serviceParams);
		// 						serviceParams = serviceParams.replace(/%env%/g, env.toLowerCase());
		// 						serviceParams = JSON.parse(serviceParams);
		// 					}
		// 					allContent.push(serviceParams);
		// 				}
		// 			});
		// 			return cb(null, allContent);
		// 		});
		// 	});
		// }
		//
		// var opts = {};
		// opts.collection = colls.analytics;
		// opts.conditions = {
		// 	"_type": "settings"
		// };
		// var group = "elk";
		// var env = soajs.inputmaskData.env;
		// BL.model.findEntry(soajs, opts, function (error, response) {
		// 	utils.checkIfError(soajs, res, {config: config, error: error || !response, code: 600}, function () {
		// 		if (response && response._env) {
		// 			utils.checkIfError(soajs, res, {config: config, error: response._env[env], code: 622}, function () {
		// 				var envs = Object.keys(response._env);
		// 				envs.forEach(function (oneEnv) {
		// 					if (response._env[oneEnv]) {
		// 						group = "filebeat";
		// 					}
		// 				});
		// 			});
		// 		}
		// 		getAnalyticsContent(group, "js", env, function (error, content) {
		// 			utils.checkIfError(soajs, res, {config: config, error: error, code: 623}, function () {
		// 				utils.getEnvironment(soajs, BL.model, env, function (error, envRecord) {
		// 					utils.checkIfError(soajs, res, {
		// 						config: config,
		// 						error: error || !envRecord,
		// 						code: (!envRecord) ? 446 : 600
		// 					}, function () {
		// 						var options = utils.buildDeployerOptions(envRecord, soajs, BL.model);
		// 						async.eachSeries(content, function (oneContent, callback) {
		// 							options.params = oneContent;
		// 							deployer.deployService(options, callback);
		// 						}, function (error) {
		// 							utils.checkIfError(soajs, res, {
		// 								config: config,
		// 								error: error,
		// 								code: 624
		// 							}, function () {
		// 								//todo update _settings record in analytics collection
		// 								return res.jsonp(soajs.buildResponse(null, true));
		// 							});
		// 						});
		// 					});
		// 				});
		// 			});
		// 		});
		// 	});
		// });
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
