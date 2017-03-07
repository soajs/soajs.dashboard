"use strict";
var fs = require("fs");
var async = require('async');
var soajs = require('soajs');
var colls = {
	analytics: 'analytics'
};
var uuid = require('uuid');
var kibanaSettings = require('./services/elk/kibana');
var lib = {
	"insertMongoData": function (soajs, config, model, cb) {
		var comboFind = {}
		comboFind.collection = colls.analytics;
		comboFind.conditions = {
			"_type": "settings"
		};
		model.findEntry(soajs, comboFind, function (error, response) {
			if (error) {
				return cb(error);
			}
			if (response && response.mongoImported) {
				return cb(null, true);
			}
			else {
				var records = [];
				var dataFolder = __dirname + "/data/";
				fs.readdir(dataFolder, function (err, items) {
					async.forEachOf(items, function (item, key, callback) {
						if (key === 0) {
							records = require(dataFolder + items[key]);
						}
						else {
							var arrayData = require(dataFolder + item);
							if (Array.isArray(arrayData) && arrayData.length > 0) {
								records = records.concat(arrayData)
							}
						}
						callback();
					}, function () {
						var comboInsert = {};
						comboInsert.collection = colls.analytics;
						comboInsert.record = records;
						if (records){
							model.insertEntry(soajs, comboInsert, cb);
						}
						else {
							throw new Error("No Elastic db name found!"); //todo check this
						}
					});
				});
			}
		})
	},
	
	"getAnalyticsContent": function (service, env, cb) {
		var path = __dirname + "/services/elk/";
		fs.exists(path, function (exists) {
			if (!exists) {
				return cb('Folder [' + path + '] does not exist');
			}
			var loadContent;
			try {
				loadContent = require(path + service);
			}
			catch (e) {
				return cb(e);
			}
			var serviceParams = {
				"env": loadContent.env,
				"name": loadContent.name,
				"image": loadContent.deployConfig.image,
				"variables": loadContent.variables || [],
				"labels": loadContent.labels,
				"cmd": loadContent.command.cmd.concat(loadContent.command.args),
				"memoryLimit": loadContent.deployConfig.memoryLimit,
				"replication": {
					"mode": loadContent.deployConfig.replication.mode,
					"replicas": ((loadContent.deployConfig.replication.mode === 'replicated') ? loadContent.deployConfig.replication.replicas : null)
				},
				"containerDir": loadContent.deployConfig.workDir,
				"restartPolicy": {
					"condition": loadContent.deployConfig.restartPolicy.condition,
					"maxAttempts": loadContent.deployConfig.restartPolicy.maxAttempts
				},
				"network": loadContent.deployConfig.network,
				"ports": loadContent.deployConfig.ports || []
			};
			
			if (loadContent.deployConfig.volume && Object.keys(loadContent.deployConfig.volume).length > 0) {
				serviceParams.volume = {
					"type": loadContent.deployConfig.volume.type,
					"readOnly": loadContent.deployConfig.volume.readOnly || false,
					"source": loadContent.deployConfig.volume.source,
					"target": loadContent.deployConfig.volume.target
				};
			}
			if (service === 'filebeat') {
				serviceParams = JSON.stringify(serviceParams);
				serviceParams = serviceParams.replace(/%env%/g, env.code.toLowerCase());
				serviceParams = JSON.parse(serviceParams);
			}
			
			
			return cb(null, serviceParams);
			
		});
	},
	
	"deployElastic": function (soajs, env, deployer, utils, model, cb) {
		console.log("deployElastic")
		var combo = {};
		combo.collection = colls.analytics;
		combo.conditions = {
			"_type": "settings"
		};
		model.findEntry(soajs, combo, function (error, settings) {
			if (error) {
				return cb(error);
			}
			if (settings && settings.elasticsearch && settings.elasticsearch.status === "deployed") {
				return cb(null, true)
			}
			else {
				lib.getAnalyticsContent("elastic", env, function (err, content) {
					var options = utils.buildDeployerOptions(env, soajs, model);
					options.params = content;
					async.parallel({
						"deploy": function (call) {
							deployer.deployService(options, call)
						},
						"update": function (call) {
							combo.fields = {
								"$set": {
									"elasticsearch": {
										"cluster_config": {
											"es_clusters": env.dbs.clusters.es_clusters
										},
										"status": "deployed",
										"db_name": "esClient"
									}
								}
							};
							var options = {
								"safe": true,
								"multi": false,
								"upsert": true
							};
							combo.options = options;
							
							model.updateEntry(soajs, combo, call);
						}
					}, cb);
				});
			}
			
		});
	},
	
	"pingElastic": function (esClient, cb) {
		console.log("pingElastic")
		esClient.ping(function (error) {
			if (error) {
				setTimeout(function () {
					lib.pingElastic(esClient, cb);
				}, 2000);
			}
			else {
				lib.infoElastic(esClient, cb)
			}
		});
	},
	
	"infoElastic": function (esClient, cb) {
		console.log("infoElastic")
		esClient.db.info(function (error) {
			if (error) {
				setTimeout(function () {
					lib.infoElastic(esClient, cb);
				}, 3000);
			}
			else {
				return cb(null, true);
			}
		});
	},
	
	"checkElasticSearch": function (esClient, cb) {
		console.log("checkElasticSearch")
		lib.pingElastic(esClient, cb);
	},
	
	"setMapping": function (soajs, env, model, esClient, cb) {
		console.log("setMapping")
		async.parallel({
			"template": function (callback) {
				lib.putTemplate(soajs, model, esClient, callback);
			},
			"mapping": function (callback) {
				lib.putMapping(soajs, model, esClient, callback);
			}
			
		}, function (err) {
			if (err) return cb(err);
			
			return cb(null, true);
		});
	},
	
	"putTemplate": function (soajs, model, esClient, cb) {
		console.log("putTemplate")
		var combo = {
			collection: colls.analytics,
			conditions: {_type: 'template'}
		};
		model.findEntries(soajs, combo, function (error, mappings) {
			if (error) return cb(error);
			async.each(mappings, function (oneMapping, callback) {
				var options = {
					'name': oneMapping._name,
					'body': oneMapping._json
				};
				esClient.db.indices.putTemplate(options, function (error) {
					return callback(error, true);
				});
			}, cb);
		});
	},
	
	"putMapping": function (soajs, model, esClient, cb) {
		//todo change this
		console.log("putMapping")
		var combo = {
			collection: colls.analytics,
			conditions: {_type: 'mapping'}
		};
		model.findEntries(soajs, combo, function (error, mappings) {
			if (error) return cb(error);
			
				esClient.db.indices.existsType(combo, function (error, result) {
					if (error || !result) {
						esClient.db.indices.create(combo, cb);
					}
					else {
						return cb(null, true);
					}
				});
		});
	},
	
	"addVisualizations": function (soajs, deployer, esClient, utils, env, model, cb) {
		console.log("addVisualizations")
		var BL = {
			model: model
		};
		var options = utils.buildDeployerOptions(env, soajs, BL);
		deployer.listServices(options, function (err, servicesList) {
			console.log(JSON.stringify(servicesList, null, 2))
			console.log("addVisualizations")
			lib.configureKibana(soajs, servicesList, esClient, env, model, cb);
			
		});
	},
	
	"esBulk": function (esClient, array, cb) {
		console.log("esBulk")
		esClient.bulk(array, function (error, response) {
			if (error) {
				return cb(error)
			}
			return cb(error, response);
		});
	},
	
	"configureKibana": function (soajs, servicesList, esClient, env, model, cb) {
		async.each(servicesList, function (oneService, callback) {
			var serviceType;
			var serviceEnv = env.code.toLowerCase(), //todo check this Lowecase or Uppercase
				serviceName, taskName;
			serviceEnv.replace(/[\/*?"<>|,.-]/g, "_");
			if (oneService) {
				if (oneService.labels && oneService.labels["soajs.service.group"] && oneService.labels["soajs.service.name"]) {
					serviceName = oneService.labels["soajs.service.name"];
					if (oneService.labels["soajs.service.group"] === "soajs-core-services") {
						serviceType = (oneService.labels["soajs.service.name"] === 'controller') ? 'controller' : 'service';
					}
					else if (oneService.labels["soajs.service.group"] === "nginx") {
						serviceType = 'nginx';
					}
					else {
						return callback(null, true);
					}
					if (oneService.tasks.length > 0) {
						async.forEachOf(oneService.tasks, function (oneTask, key, call) {
							if (oneTask.state && oneTask.state === "complete") {
								taskName = oneTask.name;
								taskName.replace(/[\/*?"<>|,.-]/g, "_");
								var analyticsArray = [];
								
								analyticsArray = analyticsArray.concat(
									[
										{
											index: {
												_index: '.kibana',
												_type: 'index-pattern',
												_id: 'filebeat-' + serviceName + "-" + serviceEnv + "-" +taskName + "-" + "*"
											}
										},
										{
											title: 'filebeat-' + serviceName + "-" + serviceEnv + "-" +taskName + "-" + "*",
											timeFieldName: '@timestamp'
										}
									]
								);
								
								analyticsArray = analyticsArray.concat(
									[
										{
											index: {
												_index: '.kibana',
												_type: 'index-pattern',
												_id: 'topbeat-' + serviceName + "-" + serviceEnv + "-" +taskName + "-" + "*"
											}
										},
										{
											title: 'topbeat-' + serviceName + "-" + serviceEnv + "-" +taskName + "-" + "*",
											timeFieldName: '@timestamp'
										}
									]
								);
								
								analyticsArray = analyticsArray.concat(
									[
										{
											index: {
												_index: '.kibana',
												_type: 'index-pattern',
												_id: '*-' + serviceName + "-" + serviceEnv + "-" +taskName + "-" + "*"
											}
										},
										{
											title: '*-' + serviceName + "-" + serviceEnv + "-" +taskName + "-" + "*",
											timeFieldName: '@timestamp'
										}
									]
								);
								
								if (key == 0) {
									//filebeat-service-environment-*
									
									analyticsArray = analyticsArray.concat(
										[
											{
												index: {
													_index: '.kibana',
													_type: 'index-pattern',
													_id: 'filebeat-' + serviceName + "-" + serviceEnv + "-" + "*"
												}
											},
											{
												title: 'filebeat-' + serviceName + "-" + serviceEnv + "-" + "*",
												timeFieldName: '@timestamp'
											}
										]
									);
									
									analyticsArray = analyticsArray.concat(
										[
											{
												index: {
													_index: '.kibana',
													_type: 'index-pattern',
													_id: 'topbeat-' + serviceName + "-" + serviceEnv + "-" + "*"
												}
											},
											{
												title: 'topbeat-' + serviceName + "-" + serviceEnv + "-" + "*",
												timeFieldName: '@timestamp'
											}
										]
									);
									
									analyticsArray = analyticsArray.concat(
										[
											{
												index: {
													_index: '.kibana',
													_type: 'index-pattern',
													_id: '*-' + serviceName + "-" + serviceEnv + "-" + "*"
												}
											},
											{
												title: '*-' + serviceName + "-" + serviceEnv + "-" + "*",
												timeFieldName: '@timestamp'
											}
										]
									);
									
									//filebeat-service-environment-*
									
									
									analyticsArray = analyticsArray.concat(
										[
											{
												index: {
													_index: '.kibana',
													_type: 'index-pattern',
													_id: 'filebeat-' + serviceName + '-' + "*"
												}
											},
											{
												title: 'filebeat-' + serviceName + '-' + "*",
												timeFieldName: '@timestamp'
											}
										]
									);
									
									
									analyticsArray = analyticsArray.concat(
										[
											{
												index: {
													_index: '.kibana',
													_type: 'index-pattern',
													_id: 'topbeat-' + serviceName + "-" + "*"
												}
											},
											{
												title: 'topbeat-' + serviceName + "-" + "*",
												timeFieldName: '@timestamp'
											}
										]
									);
									
									
									analyticsArray = analyticsArray.concat(
										[
											{
												index: {
													_index: '.kibana',
													_type: 'index-pattern',
													_id: '*-' + serviceName + "-" + "*"
												}
											},
											{
												title: '*-' + serviceName + "-" + "*",
												timeFieldName: '@timestamp'
											}
										]
									);
								}
								
								var options = {
									"$or": [
										{
											"$and": [
												{
													"_type": {
														"$in": ["dashboard", "visualization", "search"]
													}
												},
												{
													"_service": serviceType
												}
											]
											
										},
										{
											"_shipper": "topbeat"
										}
									]
								};
								var combo = {
									condition: options,
									collection: colls.analytics
								};
								model.findEntries(soajs, combo, function (error, records) {
									if (error) {
										return call(error);
									}
									records.forEach(function (oneRecord) {
										var serviceIndex;
										if (oneRecord._type === "visualization" || oneRecord._type === "search") {
											serviceIndex = serviceName + "-";
											if (oneRecord._injector === "service") {
												serviceIndex = serviceIndex + "*";
											}
											else if (oneRecord._injector === "env") {
												serviceIndex = serviceIndex + serviceEnv + "-" + "*";
											}
											else if (oneRecord._injector === "taskname") {
												serviceIndex = serviceIndex + serviceEnv + "-" + taskName + "-" + "*";
											}
										}
										
										var injector;
										if (oneRecord._injector === 'service') {
											injector = serviceName + "-" + serviceEnv;
										}
										else if (oneRecord._injector === 'taskname') {
											injector = taskName;
										}
										else if (oneRecord._injector === 'env') {
											injector = serviceEnv;
										}
										oneRecord = JSON.stringify(oneRecord);
										if (serviceIndex) {
											oneRecord = oneRecord.replace(/%serviceIndex%/g, serviceIndex);
										}
										if (injector) {
											oneRecord = oneRecord.replace(/%injector%/g, injector);
										}
										oneRecord = JSON.parse(oneRecord);
										var recordIndex = {
											index: {
												_index: '.kibana',
												_type: oneRecord._type,
												_id: oneRecord.id
											}
										};
										
										analyticsArray = analyticsArray.concat([recordIndex, oneRecord._source]);
									});
								});
								
								if (analyticsArray.length !== 0) {
									esClient.checkIndex('.kibana', function (error, response) {
										if (error) {
											return call(error);
										}
										if (response) {
											lib.esBulk(esClient, analyticsArray, call);
										}
										else {
											esClient.createIndex('.kibana', function (error) {
												if (error) {
													return cb(error);
												}
												lib.esBulk(esClient, analyticsArray, call);
											})
										}
									});
								}
								
								else {
									return call(null, true);
								}
							}
							else {
								call();
							}
						}, callback);
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
		}, cb);
		
	},
	
	"deployKibana": function (soajs, env, deployer, utils, model, cb) {
		console.log("deployKibana")
		var combo = {};
		combo.collection = colls.analytics;
		combo.conditions = {
			"_type": "settings"
		};
		model.findEntry(soajs, combo, function (error, settings) {
			if (error) {
				return cb(error);
			}
			if (settings && settings.kibana && settings.kibana.status === "deployed") {
				return cb(null, true)
			}
			else {
				lib.getAnalyticsContent("kibana", env, function (err, content) {
					var options = utils.buildDeployerOptions(env, soajs, model);
					options.params = content;
					async.parallel({
						"deploy": function (call) {
							deployer.deployService(options, call)
						},
						"update": function (call) {
							combo.fields = {
								"$set": {
									"kibana": {
										"status": "deployed",
										"port": kibanaSettings.deployConfig.ports[0].published, //todo fill
										"version": kibanaSettings.version //todo fill
									}
								}
							};
							var options = {
								"safe": true,
								"multi": false,
								"upsert": true
							};
							combo.options = options;
							model.updateEntry(soajs, combo, call);
						}
					}, cb);
				});
			}
			
		});
	},
	
	"deployLogstash": function (soajs, env, deployer, utils, model, cb) {
		console.log("deployLogstash")
		var combo = {};
		combo.collection = colls.analytics;
		combo.conditions = {
			"_type": "settings"
		};
		model.findEntry(soajs, combo, function (error, settings) {
			if (error) {
				return cb(error);
			}
			if (settings && settings.logstash && settings.logstash.status === "deployed") {
				return cb(null, true)
			}
			else {
				lib.getAnalyticsContent("logstash", env, function (err, content) {
					var options = utils.buildDeployerOptions(env, soajs, model);
					options.params = content;
					async.parallel({
						"deploy": function (call) {
							deployer.deployService(options, call)
						},
						"update": function (call) {
							combo.fields = {
								"$set": {
									"logstash": {
										"status": "deployed"
									}
								}
							};
							var options = {
								"safe": true,
								"multi": false,
								"upsert": true
							};
							combo.options = options;
							model.updateEntry(soajs, combo, call);
						}
					}, cb);
				});
			}
			
		});
	},
	
	"deployFilebeat": function (soajs, env, deployer, utils, model, cb) {
		console.log("deployFilebeat")
		var combo = {};
		combo.collection = colls.analytics;
		combo.conditions = {
			"_type": "settings"
		};
		model.findEntry(soajs, combo, function (error, settings) {
			if (error) {
				return cb(error);
			}
			if (settings && settings.logstash && settings.logstash[env.code.toLowerCase()] && settings.logstash[env.code.toLowerCase()].status === "deployed") {
				return cb(null, true)
			}
			else {
				lib.getAnalyticsContent("filebeat", env, function (err, content) {
					var options = utils.buildDeployerOptions(env, soajs, model);
					options.params = content;
					async.parallel({
						"deploy": function (call) {
							deployer.deployService(options, call)
						},
						"update": function (call) {
							combo.fields = {
								"$set": {
									"filebeat": {}
								}
							};
							combo.fields["$set"].filebeat[env.code.toLowerCase()] = {
								"status": "deployed"
							};
							var options = {
								"safe": true,
								"multi": false,
								"upsert": true
							};
							combo.options = options;
							model.updateEntry(soajs, combo, call);
						}
					}, cb);
				});
			}
			
		});
	},
	
	"checkAvailability": function (soajs, env, deployer, utils, model, cb) {
		console.log("checkAvailability")
		var BL = {
			model: model
		};
		var options = utils.buildDeployerOptions(env, soajs, BL);
		var flk = ["kibana", "logstash", env.code.toLowerCase() + '-' + "filebeat"]
		deployer.listServices(options, function (err, servicesList) {
			var failed = [];
			servicesList.forEach(function (oneService) {
				if (flk.indexOf(oneService.name) == !-1) {
					var status = false;
					oneService.tasks.forEach(function (oneTask) {
						if (oneTask.status.state === "running") {
							status = true;
						}
					});
					if (!status) {
						failed.push(oneService.name)
					}
				}
			});
			console.log("failed: ", failed);
			if (failed.length !== 0) {
				setTimeout(function () {
					console.log("checking Availability... ")
					return lib.checkAvailability(soajs, deployer, utils, env, model, cb);
				}, 1000);
			}
			else {
				return cb(null, true)
			}
		});
	},
	
	"UpdateSettings": function (soajs, env, model, cb) {
		console.log("putSettings")
		//todo check this
		var condition = {
			"$and": [
				{
					"_type": "settings"
				}
			]
		};
		var criteria = {"$set": {"_env.dashboard": true}};
		
		var options = {
			"safe": true,
			"multi": false,
			"upsert": true
		};
		var combo = {
			collection: colls.analytics,
			conditions: condition,
			options: options,
			fields: criteria
		};
		
		model.updateEntry(soajs, combo, function (error, body) {
			if (error) {
				return cb(error);
			}
			return cb(null, body)
		});
	},
};


var analyticsDriver = function (opts) {
	var _self = this;
	_self.config = opts;
	_self.operations = [];
};

analyticsDriver.prototype.run = function () {
	var _self = this;
	
	_self.operations.push(async.apply(lib.insertMongoData, _self.config.soajs, _self.config.config, _self.config.model));
	_self.operations.push(async.apply(lib.deployElastic, _self.config.soajs, _self.config.envRecord, _self.config.deployer, _self.config.utils, _self.config.model));
	_self.operations.push(async.apply(lib.checkElasticSearch, _self.config.esCluster));
	_self.operations.push(async.apply(lib.setMapping, _self.config.soajs, _self.config.envRecord, _self.config.model, _self.config.esCluster));
	_self.operations.push(async.apply(lib.addVisualizations, _self.config.soajs, _self.config.deployer, _self.config.esCluster, _self.config.utils, _self.config.envRecord, _self.config.model));
	_self.operations.push(async.apply(lib.deployKibana, _self.config.soajs, _self.config.envRecord, _self.config.deployer, _self.config.utils, _self.config.model));
	_self.operations.push(async.apply(lib.deployLogstash, _self.config.soajs, _self.config.envRecord, _self.config.deployer, _self.config.utils, _self.config.model));
	_self.operations.push(async.apply(lib.deployFilebeat, _self.config.soajs, _self.config.envRecord, _self.config.deployer, _self.config.utils, _self.config.model));
	_self.operations.push(async.apply(lib.checkAvailability, _self.config.soajs, _self.config.envRecord, _self.config.deployer, _self.config.utils, _self.config.model));
	_self.operations.push(async.apply(lib.UpdateSettings, _self.config.soajs, _self.config.envRecord, _self.config.model));
	analyticsDriver.deploy.call(_self);
};

analyticsDriver.deploy = function () {
	var _self = this;
	async.series(_self.operations, function (err, result) {
		console.log("5alasna ???");
	});
};

module.exports = analyticsDriver;