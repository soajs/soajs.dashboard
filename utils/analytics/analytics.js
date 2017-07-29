"use strict";
var fs = require("fs");
var async = require('async');
var soajs = require('soajs');
var colls = {
	analytics: 'analytics',
	environment: 'environment'
};
var uuid = require('uuid');
var filebeatIndex = require("./indexes/filebeat-index");
var metricbeatIndex = require("./indexes/metricbeat-index");

var lib = {
	
	"insertMongoData": function (soajs, config, model, cb) {
		var comboFind = {};
		comboFind.collection = colls.analytics;
		comboFind.conditions = {
			"_type": "settings"
		};
		
		model.findEntry(soajs, comboFind, function (error, response) {
			if (error) {
				return cb(error);
			}
			function importData(call) {
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
						if (records) {
							model.insertEntry(soajs, comboInsert, call);
						}
						else {
							throw call(null, true);
						}
					});
				});
			}
			
			if (response && response.mongoImported) {
				return cb(null, true);
			}
			else {
				var records = [];
				var dataFolder = __dirname + "/data/";
				importData(function (err) {
					if (err) {
						return cb(err);
					}
					else {
						var combo = {
							"collection": colls.analytics,
							"conditions": {
								"_type": "settings"
							},
							"fields": {
								"$set": {
									"mongoImported": true
								}
							},
							"options": {
								"safe": true,
								"multi": false,
								"upsert": false
							}
						};
						model.updateEntry(soajs, combo, cb);
					}
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
				"memoryLimit": loadContent.deployConfig.memoryLimit,
				"replication": {
					"mode": loadContent.deployConfig.replication.mode,
					"replicas": loadContent.deployConfig.replication.replicas
				},
				"containerDir": loadContent.deployConfig.workDir,
				"restartPolicy": {
					"condition": loadContent.deployConfig.restartPolicy.condition,
					"maxAttempts": loadContent.deployConfig.restartPolicy.maxAttempts
				},
				"network": loadContent.deployConfig.network,
				"ports": loadContent.deployConfig.ports || []
			};
			
			if (loadContent.command && loadContent.command.cmd) {
				serviceParams.command = loadContent.command.cmd;
			}
			if (loadContent.command && loadContent.command.args) {
				serviceParams.args = loadContent.command.args;
			}
			//if deployment is kubernetes
			var esNameSpace = '';
			var logNameSpace = '';
			if (env.deployer.selected.split(".")[1] === "kubernetes") {
				//"soajs.service.mode": "deployment"
				if (serviceParams.labels["soajs.service.mode"] === "replicated") {
					serviceParams.labels["soajs.service.mode"] = "deployment";
				}
				else {
					serviceParams.labels["soajs.service.mode"] = "daemonset";
				}
				if (serviceParams.memoryLimit) {
					delete serviceParams.memoryLimit;
				}
				if (serviceParams.replication.mode === "replicated") {
					serviceParams.replication.mode = "deployment";
				}
				else if (serviceParams.replication.mode === "global") {
					serviceParams.replication.mode = "daemonset";
				}
				esNameSpace = '-service.' + env.deployer.container["kubernetes"][env.deployer.selected.split('.')[2]].namespace.default;
				logNameSpace = '-service.' + env.deployer.container["kubernetes"][env.deployer.selected.split('.')[2]].namespace.default;
				
				if (env.deployer.container["kubernetes"][env.deployer.selected.split('.')[2]].namespace.perService) {
					esNameSpace += '-soajs-analytics-elasticsearch-service';
					logNameSpace += '-' + env.code.toLowerCase() + '-logstash-service';
				}
				//change published port name
				if (service === "elastic") {
					serviceParams.ports[0].published = 30920;
				}
			}
			if (loadContent.deployConfig.volume) {
				if (env.deployer.selected.split(".")[1] === "kubernetes") {
					serviceParams.voluming = {
						"volumes": [],
						"volumeMounts": []
					};
					loadContent.deployConfig.volume.forEach(function (oneVolume) {
						serviceParams.voluming.volumes.push({
							"name": oneVolume.Source,
							"hostPath": {
								"path": oneVolume.Target
							}
						});
						serviceParams.voluming.volumeMounts.push({
							"name": oneVolume.Source,
							"mountPath": oneVolume.Target
						});
					})
				}
				else if (env.deployer.selected.split(".")[1] === "docker") {
					if (service === "metricbeat") {
						loadContent.deployConfig.volume[0].Source = loadContent.deployConfig.volume[0].Target;
					}
					serviceParams.voluming = {
						"volumes": loadContent.deployConfig.volume
					};
				}
			}
			if (loadContent.deployConfig.annotations) {
				serviceParams.annotations = loadContent.deployConfig.annotations;
			}
			serviceParams = JSON.stringify(serviceParams);
			//add namespace
			if (service === "logstash" || service === "metricbeat" || service === "kibana") {
				serviceParams = serviceParams.replace(/%esNameSpace%/g, esNameSpace);
			}
			if (service === "filebeat") {
				serviceParams = serviceParams.replace(/%logNameSpace%/g, logNameSpace);
			}
			serviceParams = serviceParams.replace(/%env%/g, env.code.toLowerCase());
			serviceParams = JSON.parse(serviceParams);
			
			return cb(null, serviceParams);
			
		});
	},
	
	"deployElastic": function (soajs, env, deployer, utils, model, purge, cb) {
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
				//purge data since elasticsearch is not deployed
				soajs.log.debug("Elasticsearch is already deployed...");
				purge = true;
				return cb(null, true)
			}
			else {
				lib.getAnalyticsContent("elastic", env, function (err, content) {
					var options = utils.buildDeployerOptions(env, soajs, model);
					options.params = content;
					if (process.env.SOAJS_TEST_ANALYTICS === 'test') {
						return call(null, true);
					}
					
					deployer.deployService(options, function(error, response){
						if(error){
							soajs.log.error(error);
							settings.elasticsearch = {};
							combo.record = settings;
						}
						else{
							settings.elasticsearch.status = "deployed";
							combo.record = settings;
						}
						model.saveEntry(soajs, combo, function(mongoError){
							if(mongoError){ return cb(mongoError); }
							return cb(error, true);
						});
					});
					//
					// async.parallel({
					// 	"deploy": function (call) {
					// 		if (!(process.env.SOAJS_TEST_ANALYTICS === 'test')) {
					// 			deployer.deployService(options, call)
					// 		}
					// 		else {
					// 			return call(null, true);
					// 		}
					// 	},
					// 	"update": function (call) {
					// 		//Todo fix this
					// 		settings.elasticsearch.status = "deployed";
					// 		combo.record = settings;
					// 		model.saveEntry(soajs, combo, call);
					// 	}
					// }, cb);
				});
			}
			
		});
	},
	
	"pingElastic": function (soajs, env, esDbInfo, esClient, model, tracker, cb) {
		if (process.env.SOAJS_TEST_ANALYTICS === 'test') {
			return cb(null, true);
		}
		esClient.ping(function (error) {
			if (error) {
				soajs.log.error(error);
				tracker[env.code.toLowerCase()].counterPing++;
				soajs.log.debug("No ES Cluster found, trying again:", tracker[env.code.toLowerCase()].counterPing, "/", 10);
				if (tracker[env.code.toLowerCase()].counterPing >= 10) { // wait 5 min
					soajs.log.error("Elasticsearch wasn't deployed... exiting");
					
					async.parallel([
						function(miniCb){
							var combo = {};
							combo.collection = colls.analytics;
							combo.conditions = {
								"_type": "settings"
							};
							combo.fields = {
								$set:{
									elasticsearch : {}
								}
							};
							
							combo.options = {
								upsert: false,
								safe: true,
								multi: false
							};
							model.updateEntry(soajs, combo, miniCb);
						},
						function(miniCb){
							if(esDbInfo.db){
								delete env.dbs.databases[esDbInfo.db];
							}
							if(esDbInfo.cluster){
								delete env.dbs.clusters[esDbInfo.cluster];
							}
							model.saveEntry(soajs, {
								collection: colls.environment,
								record: env
							}, miniCb);
						}
					], function(err){
						if(err){
							soajs.log.error(err);
						}
						return cb(error);
					});
				}
				else{
					setTimeout(function () {
						lib.pingElastic(soajs, env, esDbInfo, esClient, model, tracker, cb);
					}, 2000);
				}
			}
			else {
				lib.infoElastic(soajs, env, esDbInfo, esClient, model, tracker, cb)
			}
		});
	},
	
	"infoElastic": function (soajs, env, esDbInfo, esClient, model, tracker, cb) {
		esClient.db.info(function (error) {
			if (error) {
				soajs.log.error(error);
				tracker[env.code.toLowerCase()].counterInfo++;
				soajs.log.debug("ES cluster found but not ready, Trying again:", tracker[env.code.toLowerCase()].counterInfo, "/", 15);
				if (tracker[env.code.toLowerCase()].counterInfo >= 15) { // wait 5 min
					soajs.log.error("Elasticsearch wasn't deployed correctly ... exiting");
					
					async.parallel([
						function(miniCb){
							var combo = {};
							combo.collection = colls.analytics;
							combo.conditions = {
								"_type": "settings"
							};
							combo.fields = {
								$set:{
									elasticsearch : {}
								}
							};
							
							combo.options = {
								upsert: false,
								safe: true,
								multi: false
							};
							model.updateEntry(soajs, combo, miniCb);
						},
						function(miniCb){
							if(esDbInfo.db){
								delete env.dbs.databases[esDbInfo.db];
							}
							if(esDbInfo.cluster){
								delete env.dbs.clusters[esDbInfo.cluster];
							}
							model.saveEntry(soajs, {
								collection: colls.environment,
								record: env
							}, miniCb);
						}
					], function(err){
						if(err){
							soajs.log.error(err);
						}
						return cb(error);
					});
				}
				else{
					setTimeout(function () {
						lib.infoElastic(soajs, env, esDbInfo, esClient, model, tracker, cb);
					}, 3000);
				}
			}
			else {
				return cb(null, true);
			}
		});
	},
	
	"checkElasticSearch": function (soajs, env, esDbInfo, esClient, model, tracker, cb) {
		lib.pingElastic(soajs, env, esDbInfo, esClient, model, tracker, cb);
		//add version to settings record
	},
	"setMapping": function (soajs, env, model, esClient, purge, cb) {
		lib.purgeElastic(soajs, esClient, purge, function (err){
			if (err) {
				return cb(err);
			}
			soajs.log.debug("Adding Mapping and templates");
			async.series({
				"mapping": function (callback) {
					lib.putMapping(soajs, model, esClient, callback);
				},
				"template": function (callback) {
					lib.putTemplate(soajs, model, esClient, callback);
				}
			}, cb);
		});
		
	},
	"purgeElastic": function (soajs, esClient, purge, cb) {
		if (!purge){
			//purge not reguired
			return cb(null, true);
		}
		soajs.log.debug("Purging data...");
		esClient.db.indices.delete({index: 'filebeat-*'}, function (filebeatError) {
			if (filebeatError) {
				return cb(filebeatError);
			}
			esClient.db.indices.delete({index: 'metricbeat-*'}, function (metricbeatError) {
				return cb(metricbeatError, true);
			});
		});
	},
	"putTemplate": function (soajs, model, esClient, cb) {
		var combo = {
			collection: colls.analytics,
			conditions: {_type: 'template'}
		};
		model.findEntries(soajs, combo, function (error, templates) {
			if (error) return cb(error);
			async.each(templates, function (oneTemplate, callback) {
				if (oneTemplate._json.dynamic_templates && oneTemplate._json.dynamic_templates["system-process-cgroup-cpuacct-percpu"]) {
					oneTemplate._json.dynamic_templates["system.process.cgroup.cpuacct.percpu"] = oneTemplate._json.dynamic_templates["system-process-cgroup-cpuacct-percpu"];
					delete oneTemplate._json.dynamic_templates["system-process-cgroup-cpuacct-percpu"];
				}
				oneTemplate._json.settings["index.mapping.total_fields.limit"] = oneTemplate._json.settings["index-mapping-total_fields-limit"];
				oneTemplate._json.settings["index.refresh_interval"] = oneTemplate._json.settings["index-refresh_interval"];
				delete oneTemplate._json.settings["index-refresh_interval"];
				delete oneTemplate._json.settings["index-mapping-total_fields-limit"];
				var options = {
					'name': oneTemplate._name,
					'body': oneTemplate._json
				};
				if (!(process.env.SOAJS_TEST_ANALYTICS === 'test')) {
					esClient.db.indices.putTemplate(options, function (error) {
						return callback(error, true);
					});
				}
				else {
					return callback(null, true);
				}
			}, cb);
		});
	},
	
	"putMapping": function (soajs, model, esClient, cb) {
		//todo change this
		var combo = {
			collection: colls.analytics,
			conditions: {_type: 'mapping'}
		};
		model.findEntries(soajs, combo, function (error, mappings) {
			if (error) return cb(error);
			var mapping = {
				index: '.kibana',
				body: mappings._json
			};
			if (!(process.env.SOAJS_TEST_ANALYTICS === 'test')) {
				esClient.db.indices.exists({index: '.kibana'}, function (error, result) {
					if (error || !result) {
						esClient.db.indices.create(mapping, function (err) {
							return cb(err, true);
						});
					}
					else {
						return cb(null, true);
					}
				});
			}
			else {
				return cb(null, true);
			}
		});
	},
	
	"addVisualizations": function (soajs, deployer, esClient, utils, env, model, cb) {
		soajs.log.debug("Adding Kibana Visualizations");
		var BL = {
			model: model
		};
		var options = utils.buildDeployerOptions(env, soajs, BL);
		if (!(process.env.SOAJS_TEST_ANALYTICS === 'test')) {
			deployer.listServices(options, function (err, servicesList) {
				lib.configureKibana(soajs, servicesList, esClient, env, model, cb);
				
			});
		}
		else {
			return cb(null, true);
		}
	},
	
	"esBulk": function (esClient, array, cb) {
		esClient.bulk(array, function (error, response) {
			if (error) {
				return cb(error)
			}
			return cb(error, response);
		});
	},
	
	"configureKibana": function (soajs, servicesList, esClient, env, model, cb) {
		var analyticsArray = [];
		var serviceEnv = env.code.toLowerCase();
		async.parallel({
				"filebeat": function (pCallback) {
					async.each(servicesList, function (oneService, callback) {
						var serviceType;
						var serviceName, taskName;
						serviceEnv = serviceEnv.replace(/[\/*?"<>|,.-]/g, "_");
						if (oneService) {
							if (oneService.labels) {
								if (oneService.labels["soajs.service.repo.name"]) {
									serviceName = oneService.labels["soajs.service.repo.name"].replace(/[\/*?"<>|,.-]/g, "_");
								}
								if (oneService.labels["soajs.service.group"] === "soajs-core-services") {
									serviceType = (oneService.labels["soajs.service.repo.name"] === 'controller') ? 'controller' : 'service';
								}
								else if (oneService.labels["soajs.service.group"] === "nginx") {
									serviceType = 'nginx';
									serviceName = 'nginx';
								}
								else {
									return callback(null, true);
								}
								
								if (oneService.tasks.length > 0) {
									async.forEachOf(oneService.tasks, function (oneTask, key, call) {
										if (oneTask.status && oneTask.status.state && oneTask.status.state === "running") {
											taskName = oneTask.name;
											taskName = taskName.replace(/[\/*?"<>|,.-]/g, "_");
											if (key == 0) {
												//filebeat-service-environment-*
												
												analyticsArray.push(
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
															timeFieldName: '@timestamp',
															fields: filebeatIndex.fields,
															fieldFormatMap: filebeatIndex.fieldFormatMap
														}
													]
												);
											}
											
											var options = {
													
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
												}
											;
											var combo = {
												conditions: options,
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
															serviceIndex = serviceIndex + serviceEnv + "-" + "*";
														}
														else if (oneRecord._injector === "env") {
															serviceIndex = "*-" + serviceEnv + "-" + "*";
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
													oneRecord = oneRecord.replace(/%env%/g, serviceEnv);
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
													analyticsArray.push([recordIndex, oneRecord._source]);
												});
												return call(null, true);
											});
										}
										else {
											return call(null, true);
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
					}, pCallback);
				},
				"metricbeat": function (pCallback) {
					analyticsArray.push(
						[
							{
								index: {
									_index: '.kibana',
									_type: 'index-pattern',
									_id: 'metricbeat-*'
								}
							},
							{
								title: 'metricbeat-*',
								timeFieldName: '@timestamp',
								fields: metricbeatIndex.fields,
								fieldFormatMap: metricbeatIndex.fieldFormatMap
							}
						]
					);
					analyticsArray.push(
						[
							{
								index: {
									_index: '.kibana',
									_type: 'index-pattern',
									_id: 'filebeat-*-' + serviceEnv + "-*"
								}
							},
							{
								title: 'filebeat-*-' + serviceEnv + "-*",
								timeFieldName: '@timestamp',
								fields: filebeatIndex.fields,
								fieldFormatMap: filebeatIndex.fieldFormatMap
							}
						]
					);
					var combo = {
						"collection": colls.analytics,
						"conditions": {
							"_shipper": "metricbeat"
						}
					};
					model.findEntries(soajs, combo, function (error, records) {
						if (error) {
							return pCallback(error);
						}
						if (records && records.length > 0) {
							records.forEach(function (onRecord) {
								onRecord = JSON.stringify(onRecord);
								onRecord = onRecord.replace(/%env%/g, serviceEnv);
								onRecord = JSON.parse(onRecord);
								var recordIndex = {
									index: {
										_index: '.kibana',
										_type: onRecord._type,
										_id: onRecord.id
									}
								};
								analyticsArray.push([recordIndex, onRecord._source]);
							});
							
						}
						return pCallback(null, true);
					});
				}
			},
			function (err) {
				if (err) {
					return cb(err);
				}
				if (analyticsArray.length !== 0 && !(process.env.SOAJS_TEST_ANALYTICS === 'test')) {
					async.eachSeries(analyticsArray, function (oneEsEntry, miniCb){
						lib.esBulk(esClient, oneEsEntry, function(error, response){
							if(error){
								soajs.log.error(error);
							}
							return miniCb(error, response);
						});
					}, cb);
				}
				else {
					return cb(null, true);
				}
			}
		);
	},
	
	"deployKibana": function (soajs, env, deployer, utils, model, cb) {
		soajs.log.debug("Checking Kibana");
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
				soajs.log.debug("Kibana found..");
				return cb(null, true);
			}
			else {
				soajs.log.debug("Deploying Kibana..");
				lib.getAnalyticsContent("kibana", env, function (err, content) {
					var options = utils.buildDeployerOptions(env, soajs, model);
					options.params = content;
					async.parallel({
						"deploy": function (call) {
							if (!(process.env.SOAJS_TEST_ANALYTICS === 'test')) {
								deployer.deployService(options, call)
							}
							else {
								return call(null, true);
							}
						},
						"update": function (call) {
							settings.kibana = {
								"status": "deployed"
							};
							combo.record = settings;
							model.saveEntry(soajs, combo, call);
						}
					}, cb);
				});
			}
			
		});
	},
	
	"deployLogstash": function (soajs, env, deployer, utils, model, cb) {
		soajs.log.debug("Checking Logstash..");
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
				soajs.log.debug("Logstash found..");
				return cb(null, true);
			}
			else {
				lib.getAnalyticsContent("logstash", env, function (err, content) {
					soajs.log.debug("Deploying Logstash..");
					var options = utils.buildDeployerOptions(env, soajs, model);
					options.params = content;
					async.parallel({
						"deploy": function (call) {
							if (!(process.env.SOAJS_TEST_ANALYTICS === 'test')) {
								deployer.deployService(options, call)
							}
							else {
								return call(null, true);
							}
						},
						"update": function (call) {
							if (!settings.logstash) {
								settings.logstash = {};
							}
							settings.logstash[env.code.toLowerCase()] = {
								"status": "deployed"
							};
							combo.record = settings;
							model.saveEntry(soajs, combo, call);
						}
					}, cb);
				});
			}
			
		});
	},
	
	"deployFilebeat": function (soajs, env, deployer, utils, model, cb) {
		soajs.log.debug("Checking Filebeat..");
		var combo = {};
		combo.collection = colls.analytics;
		combo.conditions = {
			"_type": "settings"
		};
		model.findEntry(soajs, combo, function (error, settings) {
			if (error) {
				return cb(error);
			}
			if (settings && settings.filebeat && settings.filebeat[env.code.toLowerCase()] && settings.filebeat[env.code.toLowerCase()].status === "deployed") {
				soajs.log.debug("Filebeat found..");
				return cb(null, true);
			}
			else {
				lib.getAnalyticsContent("filebeat", env, function (err, content) {
					soajs.log.debug("Deploying Filebeat..");
					var options = utils.buildDeployerOptions(env, soajs, model);
					options.params = content;
					async.parallel({
						"deploy": function (call) {
							if (!(process.env.SOAJS_TEST_ANALYTICS === 'test')) {
								deployer.deployService(options, call)
							}
							else {
								return call(null, true);
							}
						},
						"update": function (call) {
							if (!settings.filebeat) {
								settings.filebeat = {};
							}
							settings.filebeat[env.code.toLowerCase()] = {
								"status": "deployed"
							};
							combo.record = settings;
							model.saveEntry(soajs, combo, call);
						}
					}, cb);
				});
			}
			
		});
	},
	
	"deployMetricbeat": function (soajs, env, deployer, utils, model, cb) {
		soajs.log.debug("Checking Metricbeat..");
		var combo = {};
		combo.collection = colls.analytics;
		combo.conditions = {
			"_type": "settings"
		};
		model.findEntry(soajs, combo, function (error, settings) {
			if (error) {
				return cb(error);
			}
			if (settings && settings.metricbeat && settings.metricbeat && settings.metricbeat.status === "deployed") {
				soajs.log.debug("Metricbeat found..");
				return cb(null, true);
			}
			else {
				lib.getAnalyticsContent("metricbeat", env, function (err, content) {
					soajs.log.debug("Deploying Metricbeat..");
					var options = utils.buildDeployerOptions(env, soajs, model);
					options.params = content;
					async.parallel({
						"deploy": function (call) {
							if (!(process.env.SOAJS_TEST_ANALYTICS === 'test')) {
								deployer.deployService(options, call);
							}
							else {
								return call(null, true);
							}
						},
						"update": function (call) {
							if (!settings.metricbeat) {
								settings.metricbeat = {};
							}
							settings.metricbeat = {
								"status": "deployed"
							};
							combo.record = settings;
							model.saveEntry(soajs, combo, call);
						}
					}, cb);
				});
			}
			
		});
	},
	
	"checkAvailability": function (soajs, env, deployer, utils, model, tracker, cb) {
		soajs.log.debug("Finalizing...");
		var BL = {
			model: model
		};
		var options = utils.buildDeployerOptions(env, soajs, BL);
		var flk = ["kibana", "logstash", env.code.toLowerCase() + '-' + "filebeat", "soajs-metricbeat"];
		if (!(process.env.SOAJS_TEST_ANALYTICS === 'test')) {
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
				if (failed.length !== 0) {
					tracker[env.code.toLowerCase()].counterAvailability++;
					if (tracker[env.code.toLowerCase()].counterAvailability > 150) {
						soajs.log.error(failed.join(" , ") + "were/was not deployed... exiting");
						return cb(new Error(failed.join(" , ") + "were/was not deployed... exiting"));
					}
					else {
						setTimeout(function () {
							return lib.checkAvailability(soajs, env, deployer, utils, model, tracker, cb);
						}, 1000);
					}
				}
				else {
					return cb(null, true)
				}
			});
		}
		else {
			return cb(null, true);
		}
		
	},
	
	"setDefaultIndex": function (soajs, env, esClient, model, tracker, cb) {
		soajs.log.debug("Checking Kibana...");
		var index = {
			index: ".kibana",
			type: 'config',
			body: {
				doc: {"defaultIndex": "metricbeat-*"}
			}
		};
		var condition = {
			index: ".kibana",
			type: 'config'
		};
		var combo = {
			collection: colls.analytics,
			conditions: {"_type": "settings"}
		};
		if (!(process.env.SOAJS_TEST_ANALYTICS === 'test')) {
			esClient.db.search(condition, function (err, res) {
				if (err) {
					return cb(err);
				}
				if (res && res.hits && res.hits.hits && res.hits.hits.length > 0) {
					model.findEntry(soajs, combo, function (err, result) {
						if (err) {
							return cb(err);
						}
						index.id = res.hits.hits[0]._id;
						async.parallel({
							"updateES": function (call) {
								esClient.db.update(index, call);
							},
							"updateSettings": function (call) {
								var criteria = {
									"$set": {
										"kibana": {
											"version": index.id,
											"status": "deployed",
											"port": "32601"
										}
									}
								};
								result.env[env.code.toLowerCase()] = true;
								criteria["$set"].env = result.env;
								var options = {
									"safe": true,
									"multi": false,
									"upsert": false
								};
								combo.fields = criteria;
								combo.options = options;
								soajs.log.debug("Analytics Deployed successfully!");
								model.updateEntry(soajs, combo, call);
							}
						}, cb)
					});
				}
				else {
					tracker[env.code.toLowerCase()].counterKibana++;
					if (tracker[env.code.toLowerCase()].counterKibana > 200) {
						soajs.log.error("Kibana wasn't deployed... exiting");
						return cb(new Error("Kibana wasn't deployed... exiting"));
					}
					else {
						setTimeout(function () {
							lib.setDefaultIndex(soajs, env, esClient, model, tracker, cb);
						}, 5000);
					}
				}
			});
		}
		else {
			return cb(null, true);
		}
	}
};

var analyticsDriver = function (opts) {
	var _self = this;
	_self.config = opts;
	_self.config.purge = false;
	_self.operations = [];
};

analyticsDriver.prototype.run = function () {
	var _self = this;
	_self.operations.push(async.apply(lib.insertMongoData, _self.config.soajs, _self.config.config, _self.config.model));
	_self.operations.push(async.apply(lib.deployElastic, _self.config.soajs, _self.config.envRecord, _self.config.deployer, _self.config.utils, _self.config.model, _self.config.purge));
	_self.operations.push(async.apply(lib.checkElasticSearch, _self.config.soajs, _self.config.envRecord, _self.config.esDbInfo, _self.config.esCluster, _self.config.model, _self.config.tracker));
	_self.operations.push(async.apply(lib.setMapping, _self.config.soajs, _self.config.envRecord, _self.config.model, _self.config.esCluster, _self.config.purge));
	_self.operations.push(async.apply(lib.addVisualizations, _self.config.soajs, _self.config.deployer, _self.config.esCluster, _self.config.utils, _self.config.envRecord, _self.config.model));
	_self.operations.push(async.apply(lib.deployKibana, _self.config.soajs, _self.config.envRecord, _self.config.deployer, _self.config.utils, _self.config.model));
	_self.operations.push(async.apply(lib.deployLogstash, _self.config.soajs, _self.config.envRecord, _self.config.deployer, _self.config.utils, _self.config.model));
	_self.operations.push(async.apply(lib.deployFilebeat, _self.config.soajs, _self.config.envRecord, _self.config.deployer, _self.config.utils, _self.config.model));
	_self.operations.push(async.apply(lib.deployMetricbeat, _self.config.soajs, _self.config.envRecord, _self.config.deployer, _self.config.utils, _self.config.model));
	_self.operations.push(async.apply(lib.checkAvailability, _self.config.soajs, _self.config.envRecord, _self.config.deployer, _self.config.utils, _self.config.model, _self.config.tracker));
	_self.operations.push(async.apply(lib.setDefaultIndex, _self.config.soajs, _self.config.envRecord, _self.config.esCluster, _self.config.model, _self.config.tracker));
	analyticsDriver.deploy.call(_self);
};

analyticsDriver.deploy = function () {
	var _self = this;
	_self.config.tracker[_self.config.envRecord.code.toLowerCase()].counterPing = 0;
	_self.config.tracker[_self.config.envRecord.code.toLowerCase()].counterInfo = 0;
	_self.config.tracker[_self.config.envRecord.code.toLowerCase()].counterAvailability = 0;
	_self.config.tracker[_self.config.envRecord.code.toLowerCase()].counterKibana = 0;
	async.series(_self.operations, function (err) {
		if (err) {
			//clean tracker
			_self.config.tracker[_self.config.envRecord.code.toLowerCase()] = {
				"info": {
					"status": "failed",
					"date": new Date().getTime()
				}
			};
			console.log(err);
		}
		else {
			//close es connection
			_self.config.esCluster.close();
		}
	});
};

module.exports = analyticsDriver;