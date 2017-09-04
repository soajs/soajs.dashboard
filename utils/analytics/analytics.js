"use strict";
const fs = require("fs");
const async = require('async');
const coreDrivers = require("soajs").drivers;

const colls = {
	analytics: 'analytics',
	environment: 'environment',
	resources: 'resources'
};
const uuid = require('uuid');
const filebeatIndex = require("./indexes/filebeat-index");
const metricbeatIndex = require("./indexes/metricbeat-index");

const lib = {
	
	/**
	 * Load templates and fill the analytics db
	 * @param context
	 * @param cb
	 */
	"insertMongoData": function (context, cb) {
		let soajs = context.soajs;
		let model = context.model;
		let settings = context.analyticsSettings;
		
		function importData(call) {
			let records = [];
			let dataFolder = __dirname + "/data/";
			
			fs.readdir(dataFolder, (err, items) => {
				async.forEachOf(items, (item, key, callback) => {
					if (key === 0) {
						records = require(dataFolder + items[key]);
					}
					else {
						let arrayData = require(dataFolder + item);
						if (Array.isArray(arrayData) && arrayData.length > 0) {
							records = records.concat(arrayData)
						}
					}
					callback();
				}, () => {
					let comboInsert = {};
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
		
		if (settings && settings.mongoImported) {
			return cb(null, true);
		}
		else {
			importData((err) => {
				if (err) {
					return cb(err);
				}
				else {
					settings.mongoImported = true;
					let combo = {
						"collection": colls.analytics,
						"record": settings
					};
					model.saveEntry(soajs, combo, cb);
				}
			});
		}
	},
	
	/**
	 * Create and fill the recipe of the ELK component to be deployed
	 * @param service
	 * @param env
	 * @param cb
	 */
	"getAnalyticsContent": function (service, env, cb) {
		let path = __dirname + "/services/elk/";
		fs.exists(path, (exists) => {
			if (!exists) {
				return cb('Folder [' + path + '] does not exist');
			}
			
			let loadContent;
			try {
				loadContent = require(path + service);
			}
			catch (e) {
				return cb(e);
			}
			
			let serviceParams = {
				"env": loadContent.env,
				"name": loadContent.name,
				"image": loadContent.deployConfig.image,
				"variables": loadContent.variables || [],
				"labels": loadContent.labels,
				//"memoryLimit": loadContent.deployConfig.memoryLimit,
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
			let esNameSpace = '';
			let logNameSpace = '';
			if (env.deployer.selected.split(".")[1] === "kubernetes") {
				if (serviceParams.replication.mode === "replicated") {
					serviceParams.replication.mode = "deployment";
					serviceParams.labels["soajs.service.mode"] = "deployment";
				}
				else if (serviceParams.replication.mode === "global") {
					serviceParams.replication.mode = "daemonset";
					serviceParams.labels["soajs.service.mode"] = "daemonset";
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
							"name": oneVolume.Source.replace(/_/g, "-"),
							"hostPath": {
								"path": oneVolume.Target
							}
						});
						serviceParams.voluming.volumeMounts.push({
							"name": oneVolume.Source.replace(/_/g, "-"),
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
	
	/**
	 * check if ElasticSearch is deployed for ELK else deploy it
	 * @param context
	 * @param cb
	 */
	"deployElastic": function (context, cb) {
		let soajs = context.soajs;
		let env = context.envRecord;
		let model = context.model;
		let config = context;
		
		let settings = context.analyticsSettings;
		if (settings && settings.elasticsearch && settings.elasticsearch.status === "deployed") {
			//purge data since elasticsearch is not deployed
			soajs.log.debug("Elasticsearch is already deployed...");
			return cb(null, true)
		}
		else {
			lib.getAnalyticsContent("elastic", env, (err, content) => {
				let options = context.deployerOptions;
				options.params = content;
				if (process.env.SOAJS_TEST_ANALYTICS === 'test') {
					return cb(null, true);
				}
				
				coreDrivers.deployService(options, (error) => {
					if (error) {
						soajs.log.error(error);
						settings.elasticsearch = {};
					}
					else {
						config.purge = true;
						settings.elasticsearch.status = "deployed";
					}
					model.saveEntry(soajs, {
						collection: colls.analytics,
						record: settings
					}, (mongoError) => {
						if (mongoError) {
							return cb(mongoError);
						}
						return cb(error, true);
					});
				});
			});
		}
	},
	
	/**
	 * Check if Elastic Search is up and running
	 * @param context
	 * @param cb
	 */
	"pingElastic": function (context, cb) {
		let soajs = context.soajs;
		let env = context.envRecord;
		let esDbInfo = context.esDbInfo;
		let model = context.model;
		let tracker = context.tracker;
		let esClient = context.esCluster;
		let settings = context.analyticsSettings;
		
		if (process.env.SOAJS_TEST_ANALYTICS === 'test') {
			return cb(null, true);
		}
		esClient.ping((error) => {
			if (error) {
				// soajs.log.error(error);
				tracker[env.code.toLowerCase()].counterPing++;
				soajs.log.debug("No ES Cluster found, trying again:", tracker[env.code.toLowerCase()].counterPing, "/", 10);
				if (tracker[env.code.toLowerCase()].counterPing >= 10) { // wait 5 min
					soajs.log.error("Elasticsearch wasn't deployed... exiting");
					
					async.parallel([
						function (miniCb) {
							settings.elasticsearch = {};
							
							model.saveEntry(soajs, {
								collection : colls.analytics,
								record: settings
							}, miniCb);
						},
						function (miniCb) {
							//env is not the requested environment, it's the registry
							//clean up all environments of this db entry and its cluster
							model.findEntries(soajs, {collection: colls.environment}, (error, environmentRecords) => {
								if (error) {
									return miniCb(error);
								}
								
								async.each(environmentRecords, (oneEnv, vCb) => {
									delete oneEnv.dbs.databases[esDbInfo.db];
									
									if (oneEnv.dbs.clusters) {
										delete oneEnv.dbs.clusters[esDbInfo.cluster];
									}
									model.saveEntry(soajs, {
										collection: colls.environment,
										record: oneEnv
									}, vCb);
								}, (error) => {
									if (error) {
										return miniCb(error);
									}
									
									if (env.resources) {
										lib.removeESClustersFromEnvRecord(soajs, esDbInfo.cluster, model, miniCb);
									}
									else {
										return miniCb();
									}
								});
							});
						}
					], (err) => {
						if (err) {
							soajs.log.error(err);
						}
						return cb(error);
					});
				}
				else {
					setTimeout(() => {
						lib.pingElastic(context, cb);
					}, 2000);
				}
			}
			else {
				lib.infoElastic(context, cb)
			}
		});
	},
	
	/**
	 * Function that removes and ES cluster from resources collection.
	 * @param soajs
	 * @param name
	 * @param model
	 * @param cb
	 */
	"removeESClusterFromResources": function (soajs, name, model, cb) {
		model.removeEntry(soajs, {
			collection: colls.resources,
			conditions: {
				locked: true,
				shared: true,
				category: "elasticsearch",
				"name": name
			}
		}, cb);
	},
	
	/**
	 * check if elastic search was deployed correctly and if ready to receive data
	 * @param context
	 * @param cb
	 */
	"infoElastic": function (context, cb) {
		let soajs = context.soajs;
		let env = context.envRecord;
		let esDbInfo = context.esDbInfo;
		let esClient = context.esCluster;
		let model = context.model;
		let tracker = context.tracker;
		let settings = context.analyticsSettings;
		
		esClient.db.info((error) => {
			if (error) {
				// soajs.log.error(error);
				tracker[env.code.toLowerCase()].counterInfo++;
				soajs.log.debug("ES cluster found but not ready, Trying again:", tracker[env.code.toLowerCase()].counterInfo, "/", 15);
				if (tracker[env.code.toLowerCase()].counterInfo >= 15) { // wait 5 min
					soajs.log.error("Elasticsearch wasn't deployed correctly ... exiting");
					
					async.parallel([
						function (miniCb) {
							settings.elasticsearch = {};
							
							model.saveEntry(soajs, {
								collection : colls.analytics,
								record: settings
							}, miniCb);
						},
						function (miniCb) {
							//env is not the requested environment, it's the registry
							//clean up all environments of this db entry and its cluster
							model.findEntries(soajs, {collection: colls.environment}, (error, environmentRecords) => {
								if (error) {
									return miniCb(error);
								}
								
								async.each(environmentRecords, (oneEnv, vCb) => {
									delete oneEnv.dbs.databases[esDbInfo.db];
									
									if (oneEnv.dbs.clusters) {
										delete oneEnv.dbs.clusters[esDbInfo.cluster];
									}
									model.saveEntry(soajs, {
										collection: colls.environment,
										record: oneEnv
									}, vCb);
								}, (error) => {
									if (error) {
										return miniCb(error);
									}
									
									if (env.resources) {
										lib.removeESClustersFromEnvRecord(soajs, esDbInfo.cluster, model, miniCb);
									}
									else {
										return miniCb();
									}
								});
							});
						}
					], (err) => {
						if (err) {
							soajs.log.error(err);
						}
						return cb(error);
					});
				}
				else {
					setTimeout(() => {
						lib.infoElastic(context, cb);
					}, 3000);
				}
			}
			else {
				return cb(null, true);
			}
		});
	},
	
	/**
	 * check if Elastic search is deployed, ready and can accept data
	 * @param context
	 * @param cb
	 */
	"checkElasticSearch": function (context, cb) {
		lib.pingElastic(context, cb);
		//add version to settings record
	},
	
	/**
	 * purge all previous ELK configuration and create new mapping and templates
	 * @param context
	 * @param cb
	 */
	"setMapping": function (context, cb) {
		let soajs = context.soajs;
		
		lib.purgeElastic(context, (err) => {
			if (err) {
				return cb(err);
			}
			soajs.log.debug("Adding Mapping and templates");
			async.series({
				"mapping": (callback) => {
					lib.putMapping(context, callback);
				},
				"template": (callback) => {
					lib.putTemplate(context, callback);
				}
			}, cb);
		});
		
	},
	
	/**
	 * purge all previous indexes for filebeat and metricbeat
	 * @param context
	 * @param cb
	 */
	"purgeElastic": function (context, cb) {
		let soajs = context.soajs;
		let esClient = context.esCluster;
		let config = context;
		
		if (!config.purge) {
			//purge not reguired
			return cb(null, true);
		}
		soajs.log.debug("Purging data...");
		esClient.db.indices.delete({index: 'filebeat-*'}, (filebeatError) => {
			if (filebeatError) {
				return cb(filebeatError);
			}
			esClient.db.indices.delete({index: 'metricbeat-*'}, (metricbeatError) => {
				return cb(metricbeatError, true);
			});
		});
	},
	
	/**
	 * Create templates for all the ES indexes
	 * @param context
	 * @param cb
	 */
	"putTemplate": function (context, cb) {
		let soajs = context.soajs;
		let esClient = context.esCluster;
		let model = context.model;
		
		let combo = {
			collection: colls.analytics,
			conditions: {_type: 'template'}
		};
		model.findEntries(soajs, combo, (error, templates) => {
			if (error) return cb(error);
			async.each(templates, (oneTemplate, callback) => {
				if (oneTemplate._json.dynamic_templates && oneTemplate._json.dynamic_templates["system-process-cgroup-cpuacct-percpu"]) {
					oneTemplate._json.dynamic_templates["system.process.cgroup.cpuacct.percpu"] = oneTemplate._json.dynamic_templates["system-process-cgroup-cpuacct-percpu"];
					delete oneTemplate._json.dynamic_templates["system-process-cgroup-cpuacct-percpu"];
				}
				oneTemplate._json.settings["index.mapping.total_fields.limit"] = oneTemplate._json.settings["index-mapping-total_fields-limit"];
				oneTemplate._json.settings["index.refresh_interval"] = oneTemplate._json.settings["index-refresh_interval"];
				delete oneTemplate._json.settings["index-refresh_interval"];
				delete oneTemplate._json.settings["index-mapping-total_fields-limit"];
				let options = {
					'name': oneTemplate._name,
					'body': oneTemplate._json
				};
				if (!(process.env.SOAJS_TEST_ANALYTICS === 'test')) {
					esClient.db.indices.putTemplate(options, (error) => {
						return callback(error, true);
					});
				}
				else {
					return callback(null, true);
				}
			}, cb);
		});
	},
	
	/**
	 * Create new indexes with their mapping
	 * @param context
	 * @param cb
	 */
	"putMapping": function (context, cb) {
		let soajs = context.soajs;
		let esClient = context.esCluster;
		let model = context.model;
		
		//todo change this
		let combo = {
			collection: colls.analytics,
			conditions: {_type: 'mapping'}
		};
		model.findEntries(soajs, combo, (error, mappings) => {
			if (error) return cb(error);
			let mapping = {
				index: '.kibana',
				body: mappings._json
			};
			if (!(process.env.SOAJS_TEST_ANALYTICS === 'test')) {
				esClient.db.indices.exists({index: '.kibana'}, (error, result) => {
					if (error || !result) {
						esClient.db.indices.create(mapping, (err) => {
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
	
	/**
	 * Create new visualizations in Kibana
	 * @param context
	 * @param cb
	 */
	"addVisualizations": function (context, cb) {
		let soajs = context.soajs;
		let model = context.model;
		
		soajs.log.debug("Adding Kibana Visualizations");
		let BL = {
			model: model
		};
		let options = context.deployerOptions;
		if (!(process.env.SOAJS_TEST_ANALYTICS === 'test')) {
			coreDrivers.listServices(options, (err, servicesList) => {
				lib.configureKibana(context, servicesList, cb);
			});
		}
		else {
			return cb(null, true);
		}
	},
	
	/**
	 * Function that run ElasticSearch Bulk operations
	 * @param esClient
	 * @param array
	 * @param cb
	 */
	"esBulk": function (esClient, array, cb) {
		esClient.bulk(array, cb);
	},
	
	/**
	 * Configure Kibana and its visualizations
	 * @param context
	 * @param cb
	 */
	"configureKibana": function (context, servicesList, cb) {
		let soajs = context.soajs;
		let esClient = context.esClient;
		let env = context.envRecord;
		let model = context.model;
		
		var analyticsArray = [];
		var serviceEnv = env.code.toLowerCase();
		async.parallel({
				"filebeat": (pCallback) => {
					async.each(servicesList, (oneService, callback) => {
						let serviceType;
						let serviceName, taskName;
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
									async.forEachOf(oneService.tasks, (oneTask, key, call) => {
										if (oneTask.status && oneTask.status.state && oneTask.status.state === "running") {
											taskName = oneTask.name;
											taskName = taskName.replace(/[\/*?"<>|,.-]/g, "_");
											if (key === 0) {
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
															timeFieldName: '@timestamp',
															fields: filebeatIndex.fields,
															fieldFormatMap: filebeatIndex.fieldFormatMap
														}
													]
												);
											}
											
											let options = {
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
											};
											let combo = {
												conditions: options,
												collection: colls.analytics
											};
											model.findEntries(soajs, combo, (error, records) => {
												if (error) {
													return call(error);
												}
												
												records.forEach((oneRecord) => {
													let serviceIndex;
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
													
													let injector;
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
													let recordIndex = {
														index: {
															_index: '.kibana',
															_type: oneRecord._type,
															_id: oneRecord.id
														}
													};
													analyticsArray = analyticsArray.concat([recordIndex, oneRecord._source]);
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
				"metricbeat": (pCallback) => {
					analyticsArray = analyticsArray.concat(
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
					analyticsArray = analyticsArray.concat(
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
					let combo = {
						"collection": colls.analytics,
						"conditions": {
							"_shipper": "metricbeat"
						}
					};
					model.findEntries(soajs, combo, (error, records) => {
						if (error) {
							return pCallback(error);
						}
						if (records && records.length > 0) {
							records.forEach((onRecord) => {
								onRecord = JSON.stringify(onRecord);
								onRecord = onRecord.replace(/%env%/g, serviceEnv);
								onRecord = JSON.parse(onRecord);
								let recordIndex = {
									index: {
										_index: '.kibana',
										_type: onRecord._type,
										_id: onRecord.id
									}
								};
								analyticsArray = analyticsArray.concat([recordIndex, onRecord._source]);
							});
							
						}
						return pCallback(null, true);
					});
				}
			},
			(err) => {
				if (err) {
					return cb(err);
				}
				if (analyticsArray.length !== 0 && !(process.env.SOAJS_TEST_ANALYTICS === 'test')) {
					lib.esBulk(esClient, analyticsArray, (error, response) => {
						if (error) {
							soajs.log.error(error);
						}
						return cb(error, response);
					});
				}
				else {
					return cb(null, true);
				}
			}
		);
	},
	
	/**
	 * Deploy Kibana service and pods
	 * @param context
	 * @param cb
	 */
	"deployKibana": function (context, cb) {
		let soajs = context.soajs;
		let env = context.envRecord;
		let model = context.model;
		let settings = context.analyticsSettings;
		
		soajs.log.debug("Checking Kibana");
		if (settings && settings.kibana && settings.kibana.status === "deployed") {
			soajs.log.debug("Kibana found..");
			return cb(null, true);
		}
		else {
			soajs.log.debug("Deploying Kibana..");
			lib.getAnalyticsContent("kibana", env, (err, content) => {
				let options = context.deployerOptions;
				options.params = content;
				async.parallel({
					"deploy": (call) => {
						if (!(process.env.SOAJS_TEST_ANALYTICS === 'test')) {
							coreDrivers.deployService(options, call)
						}
						else {
							return call(null, true);
						}
					},
					"update": (call) => {
						settings.kibana = {
							"status": "deployed"
						};
						
						model.saveEntry(soajs, {
							collection: colls.analytics,
							record: settings
						}, call);
					}
				}, cb);
			});
		}
	},
	
	/**
	 * Deploy Logstash service and pods
	 * @param context
	 * @param cb
	 */
	"deployLogstash": function (context, cb) {
		let soajs = context.soajs;
		let env = context.envRecord;
		let model = context.model;
		let settings = context.analyticsSettings;
		
		soajs.log.debug("Checking Logstash..");
		if (settings && settings.logstash && settings.logstash[env.code.toLowerCase()] && settings.logstash[env.code.toLowerCase()].status === "deployed") {
			soajs.log.debug("Logstash found..");
			return cb(null, true);
		}
		else {
			lib.getAnalyticsContent("logstash", env, (err, content) => {
				soajs.log.debug("Deploying Logstash..");
				let options = context.deployerOptions;
				options.params = content;
				async.parallel({
					"deploy": (call) => {
						if (!(process.env.SOAJS_TEST_ANALYTICS === 'test')) {
							coreDrivers.deployService(options, call)
						}
						else {
							return call(null, true);
						}
					},
					"update": (call) => {
						if (!settings.logstash) {
							settings.logstash = {};
						}
						settings.logstash[env.code.toLowerCase()] = {
							"status": "deployed"
						};
						
						model.saveEntry(soajs, {
							collection: colls.analytics,
							record:settings
						}, call);
					}
				}, cb);
			});
		}
	},
	
	/**
	 * Deploy Filebeat service and pods
	 * @param context
	 * @param cb
	 */
	"deployFilebeat": function (context, cb) {
		let soajs = context.soajs;
		let env = context.envRecord;
		let model = context.model;
		let settings = context.analyticsSettings;
		
		soajs.log.debug("Checking Filebeat..");
		if (settings && settings.filebeat && settings.filebeat[env.code.toLowerCase()] && settings.filebeat[env.code.toLowerCase()].status === "deployed") {
			soajs.log.debug("Filebeat found..");
			return cb(null, true);
		}
		else {
			lib.getAnalyticsContent("filebeat", env, (err, content) => {
				soajs.log.debug("Deploying Filebeat..");
				let options = context.deployerOptions;
				options.params = content;
				async.parallel({
					"deploy": (call) => {
						if (!(process.env.SOAJS_TEST_ANALYTICS === 'test')) {
							coreDrivers.deployService(options, call)
						}
						else {
							return call(null, true);
						}
					},
					"update": (call) => {
						if (!settings.filebeat) {
							settings.filebeat = {};
						}
						settings.filebeat[env.code.toLowerCase()] = {
							"status": "deployed"
						};
						
						model.saveEntry(soajs, {
							collection: colls.analytics,
							record:settings
						}, call);
					}
				}, cb);
			});
		}
	},
	
	/**
	 * Deploy Metricbeat service and pods
	 * @param context
	 * @param cb
	 */
	"deployMetricbeat": function (context, cb) {
		let soajs = context.soajs;
		let env = context.envRecord;
		let model = context.model;
		let settings = context.analyticsSettings;
		
		soajs.log.debug("Checking Metricbeat..");
		if (settings && settings.metricbeat && settings.metricbeat && settings.metricbeat.status === "deployed") {
			soajs.log.debug("Metricbeat found..");
			return cb(null, true);
		}
		else {
			lib.getAnalyticsContent("metricbeat", env, (err, content) => {
				soajs.log.debug("Deploying Metricbeat..");
				let options = context.deployerOptions;
				options.params = content;
				async.parallel({
					"deploy": (call) => {
						if (!(process.env.SOAJS_TEST_ANALYTICS === 'test')) {
							coreDrivers.deployService(options, call);
						}
						else {
							return call(null, true);
						}
					},
					"update": (call) => {
						if (!settings.metricbeat) {
							settings.metricbeat = {};
						}
						settings.metricbeat = {
							"status": "deployed"
						};
						
						model.saveEntry(soajs, {
							collection: colls.analytics,
							record: settings
						}, call);
					}
				}, cb);
			});
		}
	},
	
	/**
	 * Check if all analytics have been deployed and are running and ready
	 * @param context
	 * @param cb
	 */
	"checkAvailability": function (context, cb) {
		let soajs = context.soajs;
		let env = context.envRecord;
		let model = context.model;
		let tracker = context.tracker;
		
		soajs.log.debug("Finalizing...");
		let BL = {
			model: model
		};
		let options = context.deployerOptions;
		let flk = ["kibana", "logstash", env.code.toLowerCase() + '-' + "filebeat", "soajs-metricbeat"];
		if (!(process.env.SOAJS_TEST_ANALYTICS === 'test')) {
			coreDrivers.listServices(options, (err, servicesList) => {
				let failed = [];
				servicesList.forEach((oneService) => {
					if (flk.indexOf(oneService.name) == !-1) {
						let status = false;
						oneService.tasks.forEach((oneTask) => {
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
						setTimeout(() => {
							return lib.checkAvailability(context, cb);
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
	
	/**
	 * Update settings after everything has been deployed and is running and ready
	 * @param context
	 * @param cb
	 */
	"setDefaultIndex": function (context, cb) {
		let soajs = context.soajs;
		let env = context.envRecord;
		let esClient = context.esClient;
		let model = context.model;
		let tracker = context.tracker;
		
		
		soajs.log.debug("Checking Kibana...");
		let index = {
			index: ".kibana",
			type: 'config',
			body: {
				doc: {"defaultIndex": "metricbeat-*"}
			}
		};
		let condition = {
			index: ".kibana",
			type: 'config'
		};
		let combo = {
			collection: colls.analytics,
			conditions: {"_type": "settings"}
		};
		if (!(process.env.SOAJS_TEST_ANALYTICS === 'test')) {
			esClient.db.search(condition, (err, res) => {
				if (err) {
					return cb(err);
				}
				if (res && res.hits && res.hits.hits && res.hits.hits.length > 0) {
					model.findEntry(soajs, combo, (err, result) => {
						if (err) {
							return cb(err);
						}
						index.id = res.hits.hits[0]._id;
						async.parallel({
							"updateES": (call) => {
								esClient.db.update(index, call);
							},
							"updateSettings": (call) => {
								let criteria = {
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
								let options = {
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
						setTimeout(() => {
							lib.setDefaultIndex(context, cb);
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

let analyticsDriver = (opts) => {
	let _self = this;
	_self.config = opts;
	_self.config.purge = false;
	_self.operations = [];
};

analyticsDriver.prototype.run = () => {
	let _self = this;
	_self.config.envRecord.code = _self.config.envCode;
	let workFlowMethods = ['insertMongoData', 'deployElastic', 'checkElasticSearch', 'setMapping', 'addVisualizations', 'deployKibana', 'deployLogstash', 'deployFilebeat', 'deployMetricbeat', 'checkAvailability', 'setDefaultIndex'];
	async.eachSeries(workFlowMethods, (methodName, cb) => {
		_self.operations.push(async.apply(lib[methodName], _self.config));
		return cb();
	}, () => {
		analyticsDriver.deploy.call(_self);
	});
};

analyticsDriver.deploy = () => {
	let _self = this;
	let envCode = _self.config.envCode.toLowerCase();
	_self.config.tracker[envCode].counterPing = 0;
	_self.config.tracker[envCode].counterInfo = 0;
	_self.config.tracker[envCode].counterAvailability = 0;
	_self.config.tracker[envCode].counterKibana = 0;
	async.series(_self.operations, (err) => {
		if (err) {
			//clean tracker
			_self.config.tracker[envCode] = {
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
