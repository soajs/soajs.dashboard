"use strict";
const assert = require("assert");
const helper = require("../../../helper.js");
const helpers = helper.requireModule('./lib/git/helper.js');
const analytics = helper.requireModule('./utils/analytics/analytics.js');
const config = helper.requireModule('./config.js');
const servicesList = require("./fixtures/serviceList.json");
const util = require ("soajs.core.libs").utils;


describe("testing analytics.js", function () {

	const esClient = {
		ping: function (cb) {
			cb(null);
		},
		bulk: function(array, cb){
			cb(null,true);
		},
		close: function(){
		
		},
		db : {
			update : function (obj, cb) {
				cb(null,true);
			},
			info : function (cb) {
				cb(null);
			},
			search: function(obj, cb){
				cb(null, {
					hits:{
						hits:[
							{
								_id:"5.2"
							}
						]
					}
				});
			},
			indices :{
				delete : function (obj, cb) {
					cb(null,true);
				},
				putTemplate: function(obj, cb){
					cb(null,true);
				},
				exists : function(obj, cb){
					cb(null, true);
				},
				create : function(obj, cb){
					cb(null, true);
				}
			}
			
		}
		
	};
	
	const tracker = {
		"DASHBOARD": {
			"info": {
				"status": "ready",
				"ts": new Date().getTime()
			}
		}
	};
	
	const settings = {
		"_type": "settings",
		"_name": "Analytics Settings",
		"env": {
			"dev": true
		},
		"mongoImported": false,
		"elasticsearch": {},
		"logstash": {},
		"filebeat": {}
	};
	
	const mongoStub = {
		findEntries: function (soajs, opts, cb) {
			let res = [];
			if(opts.collection === "analytics"){
				if(opts.conditions._type === "template"){
					res =  require("./fixtures/template.json")
				}else{
					res = require("./fixtures/visualizations.json")
				}
			}
			cb(null, res);
		},
		findEntry: function (soajs, opts, cb) {
			cb(null, {
				"_type": "settings",
				"_name": "Analytics Settings",
				"env": {
					"dev": true
				},
				"mongoImported": true,
				"elasticsearch": {},
				"logstash": {},
				"filebeat": {}
			});
		},
		removeEntry: function (soajs, opts, cb) {
			cb(null, true);
		},
		saveEntry: function (soajs, opts, cb) {
			cb(null, true);
		},
		insertEntry: function (soajs, opts, cb) {
			cb(null, true);
		},
		updateEntry: function (soajs, opts, cb) {
			cb(null, true);
		}
	};
	
	var envRecord = {
		_id: '',
		code: 'DASHBOARD',
		deployer: {
			"type": "container",
			"selected": "container.docker.local",
			"container": {
				"docker": {
					"local": {
						"socketPath": "/var/run/docker.sock"
					},
					"remote": {
						"nodes": ""
					}
				},
				"kubernetes": {
					"local": {
						"nginxDeployType": "",
						"namespace": {},
						"auth": {
							"token": ""
						}
					},
					"remote": {
						"nginxDeployType": "",
						"namespace": {},
						"auth": {
							"token": ""
						}
					}
				}
			}
		},
		services: {
			config: {
				ports: {
					maintenanceInc: 5
				}
			}
		}
	};
	
	const req = {
		soajs: {
			registry: {
				coreDB: {
					provision: {}
				},
				code: "DASHBOARD",
				serviceConfig: {
					ports: {
						maintenanceInc: 1000,
						controller:4000
					}
				}
			},
			log: {
				debug: function (data) {
				
				},
				error: function (data) {
				
				},
				info: function (data) {
				
				}
			},
			inputmaskData: {},
			tenant: {}
		}
	};
	
	const options = helpers.buildDeployerOptions(envRecord, req.soajs, mongoStub);

	let opts = {
		envCode: "DASHBOARD",
		envRecord: envRecord,
		tracker: tracker,
		analyticsSettings: settings,
		soajs: req.soajs,
		model: mongoStub,
		config: config,
		esDbInfo: {
			db: "esTestDB",
			cluster: "esTestCluster"
		},
		esClient: esClient,
		purge: true
	};
	
	opts.deployerOptions = options;
	
	let  envRecordClone = util.cloneObj(envRecord);
	envRecordClone.deployer.selected = "container.kubernetes.local";
	
	it("Insert Mongo Data", function (done) {
		analytics.lib.insertMongoData(opts, function (error, res) {
			assert.ok(res);
			done();
		});
	});
	
	it("Get Analytics Content for filebeat", function (done) {
		analytics.lib.getAnalyticsContent("filebeat",envRecordClone, function (error, res) {
			assert.ok(res);
			done();
		});
	});
	
	it("Get Analytics Content for logstash", function (done) {
		analytics.lib.getAnalyticsContent("logstash",envRecordClone, function (error, res) {
			assert.ok(res);
			done();
		});
	});
	
	it("Get Analytics Content for elastic", function (done) {
		analytics.lib.getAnalyticsContent("elastic",envRecordClone, function (error, res) {
			assert.ok(res);
			done();
		});
	});
	
	it("Deploy ElasticSearch", function (done) {
		analytics.lib.deployElastic(opts, function (error, res) {
			assert.ok(res);
			done();
		});
	});
	
	it("ping ElasticSearch", function (done) {
		analytics.lib.pingElastic(opts, function (error, res) {
			assert.ok(res);
			done();
		});
	});
	
	it("remove ESCluster From Resources", function (done) {
		analytics.lib.removeESClusterFromResources(opts.soajs,"esCluster",mongoStub, function (error, res) {
			assert.ok(res);
			done();
		});
	});
	
	it("info ElasticSearch", function (done) {
		analytics.lib.infoElastic(opts, function (error, res) {
			assert.ok(res);
			done();
		});
	});
	
	it("set Mapping", function (done) {
		analytics.lib.setMapping(opts, function (error, res) {
			assert.ok(res);
			done();
		});
	});
	
	it("set Default Index", function (done) {
		analytics.lib.setDefaultIndex(opts, function (error, res) {
			assert.ok(res);
			done();
		});
	});
	
	it("add Visualizations", function (done) {
		analytics.lib.addVisualizations(opts, function (error, res) {
			assert.ok(res);
			done();
		});
	});
	
	it("es Bulk", function (done) {
		analytics.lib.esBulk(esClient,[], function (error, res) {
			assert.ok(res);
			done();
		});
	});
	
	it("configure Kibana", function (done) {
		analytics.lib.configureKibana(opts, servicesList, function (error, res) {
			assert.ok(res);
			done();
		});
	});
	
	it("deploy kibana", function (done) {
		analytics.lib.deployKibana(opts, function (error, res) {
			assert.ok(res);
			done();
		});
	});
	
	it("deploy logstash", function (done) {
		analytics.lib.deployLogstash(opts, function (error, res) {
			assert.ok(res);
			done();
		});
	});
	
	it("deploy filebeat", function (done) {
		analytics.lib.deployFilebeat(opts, function (error, res) {
			assert.ok(res);
			done();
		});
	});
	
	it("deploy Metricbeat", function (done) {
		analytics.lib.deployMetricbeat(opts, function (error, res) {
			assert.ok(res);
			done();
		});
	});
	
	it("check Availability", function (done) {
		analytics.lib.checkAvailability(opts, function (error, res) {
			assert.ok(error);
			done();
		});
	});
	
});