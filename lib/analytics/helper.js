'use strict';

var fs = require("fs");
var async = require("async");
var utils = require("../../utils/utils.js");
var uuid = require('uuid');
var colls = {
	analytics: 'analytics',
	environment: 'environment'
};
var soajs = require('soajs');
var analytics = require("../../utils/analytics/analytics.js");

var lib = {
	"setEsCluster": function (req, res, config, envRecord, settings, model, cb) {
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
					lib.listEnvironments(req, config, model, function (err, envs) {
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
			if (!es_analytics_db || !es_analytics_cluster_name || !es_analytics_cluster){
				async.parallel([function(miniCb){
					settings.elasticsearch = {};
					model.saveEntry(req.soajs, {
						collection: colls.analytics,
						record: settings
					}, miniCb);
				}, function(miniCb){
					if(es_analytics_db){
						delete envRecord.dbs.databases[es_analytics_db];
					}
					if(es_analytics_cluster_name){
						delete envRecord.dbs.clusters[es_analytics_cluster_name];
					}
					model.saveEntry(req.soajs, {
						collection: colls.environment,
						record: envRecord
					}, miniCb);
				}], function(error){
					if(error){
						req.soajs.log.error(error);
					}
					return cb(null, null);
				});
			}
			else{
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
						model.saveEntry(req.soajs, comboE, call);
					},
					"updateSettings": function (call) {
						model.saveEntry(req.soajs, comboS, call);
					}
				}, function (err, res) {
					if (err) {
						return cb(err);
					}
					else {
						return cb(null, {
							esDbName: es_analytics_db,
							esClusterName: es_analytics_cluster,
							esCluster: es_analytics_cluster
						});
					}
				});
			}
		});
	},
	
	"listEnvironments": function (req, config, model, cb) {
		var opts = {};
		opts.collection = colls.environment;
		model.findEntries(req.soajs, opts, cb);
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
	}
};

module.exports = lib;