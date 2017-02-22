"use strict";
var fs = require("fs");
var async = require('async');
var colls = {
	analytics: 'analytics'
};

var lib = {
	"insertMongoData": function (soajs, config, mongo, cb) {
		var comboFind = {}
		comboFind.collection = colls.analytics;
		comboFind.conditions = {
			"_type": "settings"
		};
		mongo.findEntry(soajs, comboFind, function (error, response) {
			if (error) {
				return cb(error);
			}
			if (response && response.mongoImported) {
				return cb(null, true);
			}
			else {
				var records = [];
				var dataFolder = "./data/";
				fs.readdir(dataFolder, function (err, items) {
					async.forEachOf(items, function (item, key, callback) {
						if (key === 0) {
							records = require(dataFolder + items[key]);
						}
						else {
							var array = require(dataFolder + item);
							if (Array.isArray(array) && array.length > 0) {
								records = records.concat(array)
							}
							
						}
						callback();
					}, function () {
						var comboInsert = {};
						comboInsert.collection = colls.analytics;
						comboInsert.record = records;
						mongo.insertEntry(soajs, comboInsert, cb);
					});
				});
			}
		})
	},
	
	"getAnalyticsContent": function (service, type, env, cb) {
		var path = __dirname + "./services/elk/" + service + '/';
		fs.exists(path, function (exists) {
			if (!exists) {
				return cb('Folder [' + path + '] does not exist');
			}
			fs.readdir(path, function (error, content) {
				if (error) return cb(error);
				
				var regex = new RegExp('[a-zA-Z0-9]*\.' + type, 'g');
				var loadContent;
				
				if (content.match(regex)) {
					try {
						loadContent = require(path + content);
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
					if (content === 'filebeat.js') {
						serviceParams = JSON.stringify(serviceParams);
						serviceParams = serviceParams.replace(/%env%/g, env.toLowerCase());
						serviceParams = JSON.parse(serviceParams);
					}
				}
				
				return cb(null, serviceParams);
			});
		});
	},
	
	"deployElastic": function (soajs, env, deployer, utils, model, settings, cb) {
		if (settings && settings.elasticsearch && settings.elasticsearch.status === "deployed") {
			return cb(null, true)
		}
		else {
			utils.getEnvironment(soajs, model, env.code, function (error, envRecord) {
				var options = utils.buildDeployerOptions(envRecord, soajs, model);
				deployer.listServices(options, function (error, services) {
					services.forEach(function (oneService) {
						if (oneService.name === 'elasticsearch') {
							console.log(JSON.stringify(oneService, null, 2))
						}
					});
					return cb(null, true)
				});
			})
		}
		
		
		// lib.getAnalyticsContent("elasticsearch", "js", env, function (err, content) {
		// 	if (err) {
		// 		return cb(err)
		// 	}
		// 	utils.getEnvironment(soajs, model, env, function (err, envRecord) {
		// 		if (err) {
		// 			return cb(err)
		// 		}
		// 		var options = utils.buildDeployerOptions(envRecord, soajs, model);
		// 		options.params = content;
		// 		deployer.deployService(options, function (err) {
		// 			if (err) {
		// 				return cb(err)
		// 			}
		// 			//ping
		// 			//info
		// 			return cb(null, true);
		// 		});
		// 	});
		// });
	},
	"pingElastic": function (esClient, cb) {
		esClient.ping(function (error) {
			if (error) {
				lib.printProgress('Waiting for elasticsearch container to become created...');
				setTimeout(function () {
					lib.pingElastic(cb);
				}, 2000);
			}
			else {
				lib.infoElastic(function (err) {
					return cb(err, true);
				})
			}
		});
	},
	
	"infoElastic": function (esClient, cb) {
		esClient.db.info(function (error) {
			if (error) {
				lib.printProgress('Checking elastic availability...');
				setTimeout(function () {
					lib.infoElastic(cb);
				}, 3000);
			}
			else {
				return cb(null, true);
			}
		});
	},
	"checkElasticSearch": function (esClient, cb) {
		lib.pingElastic(esClient, cb);
	},
	
	"setMapping": function (env, model, esClient, cb) {
		async.parallel({
			"template": function (callback) {
				lib.putTemplate(model, esClient, callback);
			},
			"settings": function (callback) {
				lib.putSettings(esClient, callback);
			},
			"mapping": function (callback) {
				lib.putMapping(env, model, callback);
			}
			
		}, function (err) {
			if (err) return cb(err);
			
			return cb(null, true);
		});
	},
	
	"putTemplate": function (model, esClient, cb) {
		var combo = {
			collection: colls.analytics,
			conditions: {_type: 'mapping'}
		};
		model.findEntries(combo, function (error, mappings) {
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
	
	"putMapping": function (esClient, cb) {
		var mapping = {
			index: '.kibana',
			type: 'dashboard',
			body: {
				"dashboard": {
					"properties": {
						"title": {"type": "string"},
						"hits": {"type": "integer"},
						"description": {"type": "string"},
						"panelsJSON": {
							"properties": {
								"type": {"type": "string"},
								"optionsJSON": {"type": "string"},
								"uiStateJSON": {"type": "string"},
								"version": {"type": "integer"},
								"timeRestore": {"type": "boolean"},
								"timeTo": {"type": "string"},
								"timeFrom": {"type": "string"},
								"kibanaSavedObjectMeta": {
									"properties": {
										"searchSourceJSON": {
											"type": "string"
										}
									}
								}
							}
						}
					}
				}
			}
		};
		var options = {
			index: '.kibana',
			type: 'dashboard'
		};
		
		esClient.db.indices.existsType(options, function (error, result) {
			if (error || !result) {
				esClient.db.indices.create(mapping, function (error) {
					return cb(error, true);
				});
			}
			else {
				return cb(null, true);
			}
		});
		
		
	},
	
	"putSettings": function (env, model, cb) {
		//todo check this
		var condition = {
			"$and": [
				{
					"_type": "settings"
				}
			]
		};
		var criteria = {"$set": {"_env.dashboard": true}};
		
		criteria["$set"]._cluster = model.dbs.es_clusters;
		
		var options = {
			"safe": true,
			"multi": false,
			"upsert": true
		};
		var combo = {
			collection: colls.analytics,
			conditions: condition,
			options: options
		};
		
		model.updateEntry(combo, function (error, body) {
			if (error) {
				return cb(error);
			}
			return cb(null, body)
		});
	},
	
	"addVisualizations": function (soajs, deployer, esClient, utils, env, model, cb) {
		var BL= {
			model: model
		};
		var options = utils.buildDeployerOptions(env, soajs, BL);
		deployer.listServices(options, function (err, servicesList) {
			console.log(JSON.stringify(servicesList, null, 2))
			lib.configureKibana(servicesList, cb);
			return cb(null, true)
		});
		
	},
	
	// "configureKibana" : function (servicesList, serviceOptions, cb) {
	// 	var dockerServiceName = serviceOptions.Name;
	// 	var serviceGroup, serviceName, serviceEnv, serviceType;
	//
	// 	if (serviceOptions.Labels) {
	// 		serviceGroup = serviceOptions.Labels['soajs.service.group'];
	// 		serviceName = serviceOptions.Labels['soajs.service.repo.name'];
	// 		serviceEnv = serviceOptions.Labels['soajs.env.code'];
	// 	}
	// 	if (serviceGroup === 'soajs-core-services') {
	// 		serviceType = (serviceName === 'controller') ? 'controller' : 'service';
	// 	}
	// 	else if (serviceGroup === 'nginx') {
	// 		serviceType = 'nginx';
	// 		serviceName = 'nginx';
	// 	}
	// 	else {
	// 		return cb(null, true);
	// 	}
	// 	var replicaCount = serviceOptions.Mode.Replicated.Replicas;
	// 	utilLog.log('Fetching analytics for ' + serviceName);
	// 	lib.getServiceNames(dockerServiceName, deployer, replicaCount, function (error, serviceIPs) {
	// 		if (error) return cb(error);
	// 		var options = {
	// 			"$or": [
	// 				{
	// 					"$and": [
	// 						{
	// 							"_type": {
	// 								"$in": ["dashboard", "visualization", "search"]
	// 							}
	// 						},
	// 						{
	// 							"_service": serviceType
	// 						}
	// 					]
	//
	// 				},
	// 				{
	// 					"_shipper": "topbeat"
	// 				}
	// 			]
	// 		};
	// 		var analyticsArray = [];
	// 		serviceEnv.replace(/[\/*?"<>|,.-]/g, "_");
	// 		//insert index-patterns to kibana
	// 		serviceIPs.forEach(function (task_Name, key) {
	// 			task_Name.name = task_Name.name.replace(/[\/*?"<>|,.-]/g, "_");
	//
	// 			//filebeat-service-environment-taskname-*
	//
	// 			analyticsArray = analyticsArray.concat(
	// 				[
	// 					{
	// 						index: {
	// 							_index: '.kibana',
	// 							_type: 'index-pattern',
	// 							_id: 'filebeat-' + serviceName + "-" + serviceEnv + "-" + task_Name.name + "-" + "*"
	// 						}
	// 					},
	// 					{
	// 						title: 'filebeat-' + serviceName + "-" + serviceEnv + "-" + task_Name.name + "-" + "*",
	// 						timeFieldName: '@timestamp'
	// 					}
	// 				]
	// 			);
	//
	// 			analyticsArray = analyticsArray.concat(
	// 				[
	// 					{
	// 						index: {
	// 							_index: '.kibana',
	// 							_type: 'index-pattern',
	// 							_id: 'topbeat-' + serviceName + "-" + serviceEnv + "-" + task_Name.name + "-" + "*"
	// 						}
	// 					},
	// 					{
	// 						title: 'topbeat-' + serviceName + "-" + serviceEnv + "-" + task_Name.name + "-" + "*",
	// 						timeFieldName: '@timestamp'
	// 					}
	// 				]
	// 			);
	//
	// 			analyticsArray = analyticsArray.concat(
	// 				[
	// 					{
	// 						index: {
	// 							_index: '.kibana',
	// 							_type: 'index-pattern',
	// 							_id: '*-' + serviceName + "-" + serviceEnv + "-" + task_Name.name + "-" + "*"
	// 						}
	// 					},
	// 					{
	// 						title: '*-' + serviceName + "-" + serviceEnv + "-" + task_Name.name + "-" + "*",
	// 						timeFieldName: '@timestamp'
	// 					}
	// 				]
	// 			);
	//
	// 			if (key == 0) {
	// 				//filebeat-service-environment-*
	//
	// 				analyticsArray = analyticsArray.concat(
	// 					[
	// 						{
	// 							index: {
	// 								_index: '.kibana',
	// 								_type: 'index-pattern',
	// 								_id: 'filebeat-' + serviceName + "-" + serviceEnv + "-" + "*"
	// 							}
	// 						},
	// 						{
	// 							title: 'filebeat-' + serviceName + "-" + serviceEnv + "-" + "*",
	// 							timeFieldName: '@timestamp'
	// 						}
	// 					]
	// 				);
	//
	// 				analyticsArray = analyticsArray.concat(
	// 					[
	// 						{
	// 							index: {
	// 								_index: '.kibana',
	// 								_type: 'index-pattern',
	// 								_id: 'topbeat-' + serviceName + "-" + serviceEnv + "-" + "*"
	// 							}
	// 						},
	// 						{
	// 							title: 'topbeat-' + serviceName + "-" + serviceEnv + "-" + "*",
	// 							timeFieldName: '@timestamp'
	// 						}
	// 					]
	// 				);
	//
	// 				analyticsArray = analyticsArray.concat(
	// 					[
	// 						{
	// 							index: {
	// 								_index: '.kibana',
	// 								_type: 'index-pattern',
	// 								_id: '*-' + serviceName + "-" + serviceEnv + "-" + "*"
	// 							}
	// 						},
	// 						{
	// 							title: '*-' + serviceName + "-" + serviceEnv + "-" + "*",
	// 							timeFieldName: '@timestamp'
	// 						}
	// 					]
	// 				);
	//
	// 				//filebeat-service-environment-*
	//
	//
	// 				analyticsArray = analyticsArray.concat(
	// 					[
	// 						{
	// 							index: {
	// 								_index: '.kibana',
	// 								_type: 'index-pattern',
	// 								_id: 'filebeat-' + serviceName + '-' + "*"
	// 							}
	// 						},
	// 						{
	// 							title: 'filebeat-' + serviceName + '-' + "*",
	// 							timeFieldName: '@timestamp'
	// 						}
	// 					]
	// 				);
	//
	//
	// 				analyticsArray = analyticsArray.concat(
	// 					[
	// 						{
	// 							index: {
	// 								_index: '.kibana',
	// 								_type: 'index-pattern',
	// 								_id: 'topbeat-' + serviceName + "-" + "*"
	// 							}
	// 						},
	// 						{
	// 							title: 'topbeat-' + serviceName + "-" + "*",
	// 							timeFieldName: '@timestamp'
	// 						}
	// 					]
	// 				);
	//
	//
	// 				analyticsArray = analyticsArray.concat(
	// 					[
	// 						{
	// 							index: {
	// 								_index: '.kibana',
	// 								_type: 'index-pattern',
	// 								_id: '*-' + serviceName + "-" + "*"
	// 							}
	// 						},
	// 						{
	// 							title: '*-' + serviceName + "-" + "*",
	// 							timeFieldName: '@timestamp'
	// 						}
	// 					]
	// 				);
	// 			}
	// 		});
	//
	// 		//insert visualization, search and dashboard records per service to kibana
	// 		mongo.find(analyticsCollection, options, function (error, records) {
	// 			if (error) {
	// 				return cb(error);
	// 			}
	// 			records.forEach(function (oneRecord) {
	// 				if (Array.isArray(serviceIPs) && serviceIPs.length > 0) {
	// 					serviceIPs.forEach(function (task_Name) {
	// 						task_Name.name = task_Name.name.replace(/[\/*?"<>|,.-]/g, "_");
	// 						var serviceIndex;
	// 						if (oneRecord._type === "visualization" || oneRecord._type === "search") {
	// 							serviceIndex = serviceName + "-";
	// 							if (oneRecord._injector === "service") {
	// 								serviceIndex = serviceIndex + "*";
	// 							}
	// 							else if (oneRecord._injector === "env") {
	// 								serviceIndex = serviceIndex + serviceEnv + "-" + "*";
	// 							}
	// 							else if (oneRecord._injector === "taskname") {
	// 								serviceIndex = serviceIndex + serviceEnv + "-" + task_Name.name + "-" + "*";
	// 							}
	// 						}
	//
	// 						var injector;
	// 						if (oneRecord._injector === 'service'){
	// 							injector = serviceName + "-" + serviceEnv;
	// 						}
	// 						else if (oneRecord._injector === 'taskname'){
	// 							injector = task_Name.name;
	// 						}
	// 						else if (oneRecord._injector === 'env'){
	// 							injector = serviceEnv;
	// 						}
	// 						oneRecord = JSON.stringify(oneRecord);
	// 						if (serviceIndex) {
	// 							oneRecord = oneRecord.replace(/%serviceIndex%/g, serviceIndex);
	// 						}
	// 						if (injector){
	// 							oneRecord = oneRecord.replace(/%injector%/g, injector);
	// 						}
	// 						oneRecord = JSON.parse(oneRecord);
	// 						var recordIndex = {
	// 							index: {
	// 								_index: '.kibana',
	// 								_type: oneRecord._type,
	// 								_id: oneRecord.id
	// 							}
	// 						};
	//
	// 						analyticsArray = analyticsArray.concat([recordIndex, oneRecord._source]);
	// 					});
	// 				}
	// 			});
	//
	// 			function esBulk(array, cb) {
	// 				esClient.bulk(array, function (error, response) {
	// 					if (error) {
	// 						return cb(error)
	// 					}
	// 					return cb(error, response);
	// 				});
	// 			}
	//
	// 			if (analyticsArray.length !== 0) {
	// 				esClient.checkIndex('.kibana', function (error, response) {
	// 					if (error) {
	// 						return cb(error);
	// 					}
	// 					if (response) {
	// 						esBulk(analyticsArray, cb);
	// 					}
	// 					else {
	// 						esClient.createIndex('.kibana', function (error) {
	// 							if (error) {
	// 								return cb(error);
	// 							}
	// 							esBulk(analyticsArray, cb);
	// 						})
	// 					}
	// 				});
	// 			}
	// 			else {
	// 				return cb(null, true);
	// 			}
	// 		});
	// 	});
	// },
	
	"deployKibana": function (cb) {
		return cb(null, true)
	},
	
	"deployLogstash": function (cb) {
		return cb(null, true)
	},
	
	"deployFilebeat": function (cb) {
		return cb(null, true)
	},
	
	"updateSettings": function (cb) {
		return cb(null, true)
	},
};


var analyticsDriver = function (opts) {
	var _self = this;
	_self.config = opts;
	_self.operations = [];
};

analyticsDriver.prototype.run = function () {
	var _self = this;
	var esClient = new _self.config.soajs.es(_self.config.envRecord.dbs.clusters.es_clusters);
	//_self.operations.push(async.apply(lib.insertMongoData, _self.config.soajs, _self.config.config, _self.config.model));
	//_self.operations.push(async.apply(lib.deployElastic, _self.config.soajs, _self.config.envRecord, _self.config.deployer, _self.config.utils, _self.config.model, _self.config.settings));
	//_self.operations.push(async.apply(lib.checkElasticSearch, esClient));
	//_self.operations.push(async.apply(lib.setMapping, _self.config.envRecord, _self.config.model, esClient));
	//_self.operations.push(async.apply(lib.addVisualizations, _self.config.soajs, _self.config.deployer, _self.config.utils, _self.config.envRecord, _self.config.model));
	_self.operations.push(async.apply(lib.deployKibana));
	_self.operations.push(async.apply(lib.deployLogstash));
	_self.operations.push(async.apply(lib.deployFilebeat));
	_self.operations.push(async.apply(lib.updateSettings));
	
	analyticsDriver.deploy.call(_self);
	
};

analyticsDriver.deploy = function () {
	var _self = this;
	async.series(_self.operations, function (err, result) {
		
	});
};

module.exports = analyticsDriver;