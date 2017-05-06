'use strict';

var fs = require("fs");
var async = require("async");
//todo:
//change back when drivers are updated!!!!
//var deployer = require("soajs").drivers;

var deployer = require("soajs.core.drivers");
var utils = require("../utils/utils.js");
var uuid = require('uuid');
var colls = {
	analytics: 'analytics',
	environment: 'environment',
};
var soajs = require('soajs');
var filebeatIndex = require("../utils/analytics/indexes/filebeat-index");
var allIndex = require("../utils/analytics/indexes/all-index");
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
					if (envRecord.deployer.container["kubernetes"][envRecord.deployer.selected.split('.')[2]].namespace.perService){
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
			if (settings.elasticsearch) {
				settings.elasticsearch.db_name = es_analytics_db;
			}
			comboS.record = settings;
			
			if (!settings || settings === {}) {
				settings.env = {};
				settings.env[envRecord.code.toLowerCase()] = false;
				settings.elasticsearch = {
					"db_name": es_analytics_db
				}
			}
			async.parallel({
				"updateEnv": function (call) {
					BL.model.saveEntry(req.soajs, comboE, call);
				},
				"updateSettings": function (call) {
					BL.model.saveEntry(req.soajs, comboS, call);
				}
			}, function (err) {
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
						data.tracker = tracker[env];
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
						console.log(1)
						if (settings && settings.env && settings.env[env]) {
							console.log(2)
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
							console.log(3)
							data.tracker = tracker[env] || {};
							data[env] = false;
							return res.jsonp(req.soajs.buildResponse(null, data));
						}
						else {
							console.log(4)
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
											"code": 512,
											"msg": config.errors[512]
										}));
									}
									console.log(15)
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
	
	// "refreshAnalyticsEnv": function (config, req, res) {
	// 	/**
	// 	 * refreshAnalyticsEnv
	// 	 *
	// 	 * @param {Object} config
	// 	 * @param {Object} req
	// 	 * @param {Object} res
	// 	 * @returns {Object}
	// 	 */
	// 	var combo = {};
	// 	combo.collection = colls.analytics;
	// 	combo.conditions = {
	// 		"_type": "settings"
	// 	};
	// 	var date = new Date().getTime();
	// 	BL.model.findEntry(req.soajs, combo, function (error, settings) {
	// 		utils.checkIfError(req.soajs, res, {config: config, error: error, code: 600}, function () {
	// 			var env = req.soajs.inputmaskData.env;
	// 			utils.getEnvironment(req.soajs, BL.model, env, function (error, envRecord) {
	// 				utils.checkIfError(req.soajs, res, {
	// 					config: config,
	// 					error: error || !envRecord,
	// 					code: 600
	// 				}, function () {
	// 					var data = {};
	// 					if (settings && settings.env && settings.env[env]) {
	// 						tracker[env] = {
	// 							"info": {
	// 								"status": "ready",
	// 								"ts": date
	// 							}
	// 						};
	// 						data[env] = true;
	// 						data.tracker = tracker[env];
	// 						return res.jsonp(req.soajs.buildResponse(null, data));
	// 					}
	// 					else if (tracker[env] && tracker[env].info && tracker[env].info.status && tracker[env].info.status === "started") {
	// 						data.tracker = tracker[env] || {};
	// 						data[env] = false;
	// 						return res.jsonp(req.soajs.buildResponse(null, data));
	// 					}
	// 					else {
	// 						tracker[env] = {
	// 							"info": {
	// 								"status": "started",
	// 								"ts": date
	// 							}
	// 						};
	// 						lib.setEsCluster(req, res, config, envRecord, settings, function (err, esCluster) {
	// 							utils.checkIfError(req.soajs, res, {
	// 								config: config,
	// 								error: err,
	// 								code: 600 //check this
	// 							}, function () {
	// 								if (!esCluster) {
	// 									return res.jsonp(req.soajs.buildResponse({
	// 										"code": 600,
	// 										"msg": config.errors[600]
	// 									}));
	// 								}
	//
	// 								var esClient = new soajs.es(esCluster);
	// 								var condition = {
	// 									index: ".kibana",
	// 									body: {
	// 										"query": {
	// 											"term": {
	// 												"env": envRecord.code.toLowerCase()
	// 											}
	// 										}
	// 									}
	// 								};
	// 								esClient.driver.deleteByQuery(condition, function (err, res) {
	// 									utils.checkIfError(req.soajs, res, {
	// 										config: config,
	// 										error: err,
	// 										code: 600 //check this
	// 									}, function () {
	// 										if (!esCluster) {
	// 											return res.jsonp(req.soajs.buildResponse({
	// 												"code": 600,
	// 												"msg": config.errors[600]
	// 											}));
	// 										}
	//
	// 										var options = utils.buildDeployerOptions(env, soajs, BL.model);
	// 										deployer.listServices(options, function (err, servicesList) {
	// 											utils.checkIfError(req.soajs, res, {
	// 												config: config,
	// 												error: err,
	// 												code: 512 //check this
	// 											}, function () {
	// 												if (!esCluster) {
	// 													return res.jsonp(req.soajs.buildResponse({
	// 														"code": 512,
	// 														"msg": config.errors[512]
	// 													}));
	// 												}
	// 												async.each(servicesList, function (oneService, callback) {
	// 													var serviceType;
	// 													var serviceEnv = env.code.toLowerCase(),
	// 														serviceName, taskName;
	// 													serviceEnv = serviceEnv.replace(/[\/*?"<>|,.-]/g, "_");
	// 													if (oneService) {
	// 														if (oneService.labels) {
	// 															if (oneService.labels["soajs.service.repo.name"]) {
	// 																serviceName = oneService.labels["soajs.service.repo.name"].replace(/[\/*?"<>|,.-]/g, "_");
	// 															}
	// 															if (oneService.labels["soajs.service.group"] === "soajs-core-services") {
	// 																serviceType = (oneService.labels["soajs.service.repo.name"] === 'controller') ? 'controller' : 'service';
	// 															}
	// 															else if (oneService.labels["soajs.service.group"] === "nginx") {
	// 																serviceType = 'nginx';
	// 																serviceName = 'nginx';
	// 															}
	// 															else {
	// 																return callback(null, true);
	// 															}
	// 															if (oneService.tasks.length > 0) {
	// 																return callback(null, true);
	// 																// async.forEachOf(oneService.tasks, function (oneTask, key, call) {
	// 																// 	if (oneTask.status && oneTask.status.state && oneTask.status.state === "running") {
	// 																// 		taskName = oneTask.name;
	// 																// 		taskName = taskName.replace(/[\/*?"<>|,.-]/g, "_");
	// 																// 		var analyticsArray = [];
	// 																// 		analyticsArray = analyticsArray.concat(
	// 																// 			[
	// 																// 				{
	// 																// 					index: {
	// 																// 						_index: '.kibana',
	// 																// 						_type: 'index-pattern',
	// 																// 						_id: 'filebeat-' + serviceName + "-" + serviceEnv + "-" + taskName + "-" + "*"
	// 																// 					}
	// 																// 				},
	// 																// 				{
	// 																// 					title: 'filebeat-' + serviceName + "-" + serviceEnv + "-" + taskName + "-" + "*",
	// 																// 					timeFieldName: '@timestamp',
	// 																// 					fields: filebeatIndex.fields,
	// 																// 					fieldFormatMap: filebeatIndex.fieldFormatMap,
	// 																// 					env: serviceEnv
	// 																// 				}
	// 																// 			]
	// 																// 		);
	// 																//
	// 																// 		analyticsArray = analyticsArray.concat(
	// 																// 			[
	// 																// 				{
	// 																// 					index: {
	// 																// 						_index: '.kibana',
	// 																// 						_type: 'index-pattern',
	// 																// 						_id: 'topbeat-' + serviceName + "-" + serviceEnv + "-" + taskName + "-" + "*"
	// 																// 					}
	// 																// 				},
	// 																// 				{
	// 																// 					title: 'topbeat-' + serviceName + "-" + serviceEnv + "-" + taskName + "-" + "*",
	// 																// 					timeFieldName: '@timestamp',
	// 																// 					fields: topbeatIndex.fields,
	// 																// 					fieldFormatMap: topbeatIndex.fieldFormatMap,
	// 																// 					env: serviceEnv
	// 																// 				}
	// 																// 			]
	// 																// 		);
	// 																//
	// 																// 		analyticsArray = analyticsArray.concat(
	// 																// 			[
	// 																// 				{
	// 																// 					index: {
	// 																// 						_index: '.kibana',
	// 																// 						_type: 'index-pattern',
	// 																// 						_id: '*-' + serviceName + "-" + serviceEnv + "-" + taskName + "-" + "*"
	// 																// 					}
	// 																// 				},
	// 																// 				{
	// 																// 					title: '*-' + serviceName + "-" + serviceEnv + "-" + taskName + "-" + "*",
	// 																// 					timeFieldName: '@timestamp',
	// 																// 					fields: allIndex.fields,
	// 																// 					fieldFormatMap: allIndex.fieldFormatMap,
	// 																// 					env: serviceEnv
	// 																// 				}
	// 																// 			]
	// 																// 		);
	// 																//
	// 																// 		if (key == 0) {
	// 																// 			//filebeat-service-environment-*
	// 																//
	// 																// 			analyticsArray = analyticsArray.concat(
	// 																// 				[
	// 																// 					{
	// 																// 						index: {
	// 																// 							_index: '.kibana',
	// 																// 							_type: 'index-pattern',
	// 																// 							_id: 'filebeat-' + serviceName + "-" + serviceEnv + "-" + "*"
	// 																// 						}
	// 																// 					},
	// 																// 					{
	// 																// 						title: 'filebeat-' + serviceName + "-" + serviceEnv + "-" + "*",
	// 																// 						timeFieldName: '@timestamp',
	// 																// 						fields: filebeatIndex.fields,
	// 																// 						fieldFormatMap: filebeatIndex.fieldFormatMap,
	// 																// 						env: serviceEnv
	// 																// 					}
	// 																// 				]
	// 																// 			);
	// 																//
	// 																// 			analyticsArray = analyticsArray.concat(
	// 																// 				[
	// 																// 					{
	// 																// 						index: {
	// 																// 							_index: '.kibana',
	// 																// 							_type: 'index-pattern',
	// 																// 							_id: 'topbeat-' + serviceName + "-" + serviceEnv + "-" + "*"
	// 																// 						}
	// 																// 					},
	// 																// 					{
	// 																// 						title: 'topbeat-' + serviceName + "-" + serviceEnv + "-" + "*",
	// 																// 						timeFieldName: '@timestamp',
	// 																// 						fields: topbeatIndex.fields,
	// 																// 						fieldFormatMap: topbeatIndex.fieldFormatMap,
	// 																// 						env: serviceEnv
	// 																// 					}
	// 																// 				]
	// 																// 			);
	// 																//
	// 																// 			analyticsArray = analyticsArray.concat(
	// 																// 				[
	// 																// 					{
	// 																// 						index: {
	// 																// 							_index: '.kibana',
	// 																// 							_type: 'index-pattern',
	// 																// 							_id: '*-' + serviceName + "-" + serviceEnv + "-" + "*"
	// 																// 						}
	// 																// 					},
	// 																// 					{
	// 																// 						title: '*-' + serviceName + "-" + serviceEnv + "-" + "*",
	// 																// 						timeFieldName: '@timestamp',
	// 																// 						fields: allIndex.fields,
	// 																// 						fieldFormatMap: allIndex.fieldFormatMap,
	// 																// 						env: serviceEnv
	// 																// 					}
	// 																// 				]
	// 																// 			);
	// 																//
	// 																// 			//filebeat-service-environment-*
	// 																//
	// 																//
	// 																// 			analyticsArray = analyticsArray.concat(
	// 																// 				[
	// 																// 					{
	// 																// 						index: {
	// 																// 							_index: '.kibana',
	// 																// 							_type: 'index-pattern',
	// 																// 							_id: 'filebeat-' + serviceName + '-' + "*"
	// 																// 						}
	// 																// 					},
	// 																// 					{
	// 																// 						title: 'filebeat-' + serviceName + '-' + "*",
	// 																// 						timeFieldName: '@timestamp',
	// 																// 						fields: filebeatIndex.fields,
	// 																// 						fieldFormatMap: filebeatIndex.fieldFormatMap,
	// 																// 						env: serviceEnv
	// 																// 					}
	// 																// 				]
	// 																// 			);
	// 																//
	// 																//
	// 																// 			analyticsArray = analyticsArray.concat(
	// 																// 				[
	// 																// 					{
	// 																// 						index: {
	// 																// 							_index: '.kibana',
	// 																// 							_type: 'index-pattern',
	// 																// 							_id: 'topbeat-' + serviceName + "-" + "*"
	// 																// 						}
	// 																// 					},
	// 																// 					{
	// 																// 						title: 'topbeat-' + serviceName + "-" + "*",
	// 																// 						timeFieldName: '@timestamp',
	// 																// 						fields: topbeatIndex.fields,
	// 																// 						fieldFormatMap: topbeatIndex.fieldFormatMap,
	// 																// 						env: serviceEnv
	// 																// 					}
	// 																// 				]
	// 																// 			);
	// 																//
	// 																//
	// 																// 			analyticsArray = analyticsArray.concat(
	// 																// 				[
	// 																// 					{
	// 																// 						index: {
	// 																// 							_index: '.kibana',
	// 																// 							_type: 'index-pattern',
	// 																// 							_id: '*-' + serviceName + "-" + "*"
	// 																// 						}
	// 																// 					},
	// 																// 					{
	// 																// 						title: '*-' + serviceName + "-" + "*",
	// 																// 						timeFieldName: '@timestamp',
	// 																// 						fields: allIndex.fields,
	// 																// 						fieldFormatMap: allIndex.fieldFormatMap,
	// 																// 						env: serviceEnv
	// 																// 					}
	// 																// 				]
	// 																// 			);
	// 																// 		}
	// 																//
	// 																// 		var options = {
	// 																// 			"$or": [
	// 																// 				{
	// 																// 					"$and": [
	// 																// 						{
	// 																// 							"_type": {
	// 																// 								"$in": ["dashboard", "visualization", "search"]
	// 																// 							}
	// 																// 						},
	// 																// 						{
	// 																// 							"_service": serviceType
	// 																// 						}
	// 																// 					]
	// 																//
	// 																// 				},
	// 																// 				{
	// 																// 					"_shipper": "topbeat"
	// 																// 				}
	// 																// 			]
	// 																// 		};
	// 																// 		var combo = {
	// 																// 			conditions: options,
	// 																// 			collection: colls.analytics
	// 																// 		};
	// 																// 		BL.model.findEntries(soajs, combo, function (error, records) {
	// 																// 			if (error) {
	// 																// 				return call(error);
	// 																// 			}
	// 																// 			records.forEach(function (oneRecord) {
	// 																// 				var serviceIndex;
	// 																// 				if (oneRecord._type === "visualization" || oneRecord._type === "search") {
	// 																// 					serviceIndex = serviceName + "-";
	// 																// 					if (oneRecord._injector === "service") {
	// 																// 						serviceIndex = serviceIndex + serviceEnv + "-" + "*";
	// 																// 					}
	// 																// 					else if (oneRecord._injector === "env") {
	// 																// 						serviceIndex = "*-" + serviceEnv + "-" + "*";
	// 																// 					}
	// 																// 					else if (oneRecord._injector === "taskname") {
	// 																// 						serviceIndex = serviceIndex + serviceEnv + "-" + taskName + "-" + "*";
	// 																// 					}
	// 																// 				}
	// 																//
	// 																// 				var injector;
	// 																// 				if (oneRecord._injector === 'service') {
	// 																// 					injector = serviceName + "-" + serviceEnv;
	// 																// 				}
	// 																// 				else if (oneRecord._injector === 'taskname') {
	// 																// 					injector = taskName;
	// 																// 				}
	// 																// 				else if (oneRecord._injector === 'env') {
	// 																// 					injector = serviceEnv;
	// 																// 				}
	// 																// 				oneRecord = JSON.stringify(oneRecord);
	// 																// 				oneRecord = oneRecord.replace(/%env%/g, serviceEnv);
	// 																// 				if (serviceIndex) {
	// 																// 					oneRecord = oneRecord.replace(/%serviceIndex%/g, serviceIndex);
	// 																// 				}
	// 																// 				if (injector) {
	// 																// 					oneRecord = oneRecord.replace(/%injector%/g, injector);
	// 																// 				}
	// 																// 				oneRecord = JSON.parse(oneRecord);
	// 																// 				var recordIndex = {
	// 																// 					index: {
	// 																// 						_index: '.kibana',
	// 																// 						_type: oneRecord._type,
	// 																// 						_id: oneRecord.id
	// 																// 					}
	// 																// 				};
	// 																// 				analyticsArray = analyticsArray.concat([recordIndex, oneRecord._source]);
	// 																// 			});
	// 																// 			if (analyticsArray.length !== 0) {
	// 																// 				lib.esBulk(esClient, analyticsArray, call);
	// 																// 			}
	// 																// 			else {
	// 																// 				return call(null, true);
	// 																// 			}
	// 																// 		});
	// 																// 	}
	// 																// 	else {
	// 																// 		call();
	// 																// 	}
	// 																// }, callback);
	// 															}
	// 															else {
	// 																return callback(null, true);
	// 															}
	// 														}
	// 														else {
	// 															return callback(null, true);
	// 														}
	// 													}
	// 													else {
	// 														return callback(null, true);
	// 													}
	// 												}, function (err, response) {
	// 													utils.checkIfError(req.soajs, res, {
	// 														config: config,
	// 														error: err,
	// 														code: 600 //check this
	// 													}, function () {
	// 														if (!esCluster) {
	// 															return res.jsonp(req.soajs.buildResponse({
	// 																"code": 600,
	// 																"msg": config.errors[600]
	// 															}));
	// 														}
	// 													});
	// 												});
	// 											});
	// 										});
	// 									});
	// 								});
	// 							});
	// 						});
	// 					}
	// 				});
	// 			});
	// 		});
	// 	});
	//
	// },
	
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
						options.params = {env: env};
						deployer.listServices(options, function (error, services) {
							utils.checkIfError(req.soajs, res, {config: config, error: error}, function () {
								options.params = {custom: true};
								deployer.listServices(options, function (error, customServices) {
									utils.checkIfError(req.soajs, res, {config: config, error: error}, function () {
										if (!services) services = [];
										if (customServices && customServices.length > 0) {
											services = services.concat(customServices);
										}
										//loop ove services
										//delete kibana, logstash, filebeat, and metric beat
										
										async.eachSeries(services, function (oneService, callback) {
											if (oneService.labels["soajs.service.type"] === "elk"
												&& oneService.labels["soajs.env.code"] === env
												&& oneService.labels["soajs.service.name"] !== "soajs-analytics-elasticsearch"
												&& oneService.labels["soajs.service.name"] !== "kibana") {
												options.params = {
													id: oneService.id,
													mode: oneService.labels["soajs.service.mode"] //NOTE: required for kubernetes driver only
												};
												deployer.deleteService(options, callback);
											}
											else {
												return callback(null, true);
											}
										}, function (error) {
											utils.checkIfError(req.soajs, res, {
												config: config,
												error: error
											}, function () {
												//update mongo record
												if (settings.env[env]) {
													settings.env[env] = false;
												}
												if (settings.logstash[env]) {
													delete settings.logstash[env];
												}
												if (settings.filebeat[env]) {
													delete settings.filebeat[env];
												}
												if (settings.metricbeat[env]) {
													delete settings.metricbeat[env];
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
														return res.jsonp(req.soajs.buildResponse(null, true));
													});
												});
											});
										});
									});
								});
							});
						});
						
						
						//append record in mongo
						
					});
				});
			})
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
