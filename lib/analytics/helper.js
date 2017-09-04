'use strict';

const fs = require("fs");
const async = require("async");
const utils = require("../../utils/utils.js");
const uuid = require('uuid');
const colls = {
	analytics: 'analytics',
	environment: 'environment',
	resources: 'resources'
};
const soajs = require('soajs');
const analytics = require("../../utils/analytics/analytics.js");

const lib = {
	"setEsCluster": (req, res, config, soajsRegistry, settings, model, cb) => {
		let uid = uuid.v4();
		let es_env, es_analytics_db, es_analytics_cluster_name, es_analytics_cluster;
		
		async.series({
			"checkSettings": (mCb) => {
				if (settings && settings.elasticsearch && settings.elasticsearch.db_name && settings.elasticsearch.db_name !== '') {
					es_analytics_db = settings.elasticsearch.db_name;
					
					//get cluster from environment using db name
					lib.listEnvironments(req, config, model, (err, envs) => {
						if (err) {
							return mCb(err);
						}
						if (envs && envs.length > 0) {
							for (let i = 0; i < envs.length; i++) {
								if (envs[i].dbs && envs[i].dbs.databases && envs[i].dbs.databases[es_analytics_db]) {
									es_analytics_cluster_name = envs[i].dbs.databases[es_analytics_db].cluster;
									es_env = envs[i];
									break;
								}
							}
						}
						return mCb();
					});
					
				}
				//if no db name provided create one
				else {
					es_analytics_db = "es_analytics_db_" + uid;
					es_analytics_cluster_name = "es_analytics_cluster_" + uid;
					return mCb();
				}
			},
			"getClusterInfo": (mCb) => {
				let removeOptions;
				if(es_env){
					//new style registry
					if(soajsRegistry.resources){
						for(let resourceName in soajsRegistry.resources.cluster){
							let tmpCluster = soajsRegistry.resources[resourceName];
							if(tmpCluster.locked && tmpCluster.shared && tmpCluster.category === 'elasticsearch' && tmpCluster.name === es_analytics_cluster_name){
								es_analytics_cluster = tmpCluster;
							}
						}
					}
					else{
						es_analytics_cluster = es_env.dbs.clusters[es_analytics_cluster_name];
						removeOptions = {_id: es_env._id, name: es_analytics_cluster_name};
					}
				}
				else {
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
					if (soajsRegistry.deployer.selected.split('.')[1] === "kubernetes") {
						//added support for namespace and perService
						let namespace = soajsRegistry.deployer.container["kubernetes"][soajsRegistry.deployer.selected.split('.')[2]].namespace.default;
						if (soajsRegistry.deployer.container["kubernetes"][soajsRegistry.deployer.selected.split('.')[2]].namespace.perService) {
							namespace += '-soajs-analytics-elasticsearch-service';
						}
						es_analytics_cluster.servers[0].host += '-service.' + namespace;
					}
				}
				
				if(removeOptions && Object.keys(es_analytics_cluster_name).length > 0){
					async.series({
						"removeOld": (eCb) =>{
							lib.removeESClustersFromEnvRecord(req, removeOptions, model, eCb);
						},
						"pushNew": (eCb) =>{
							lib.saveESClustersInResources(req, {
								category: es_analytics_cluster_name,
								config: es_analytics_cluster
							}, model, eCb);
						}
					}, mCb);
				}
				else{
					lib.saveESClustersInResources(req, {
						category: es_analytics_cluster_name,
						config: es_analytics_cluster
					}, model, mCb);
				}
			},
			"buildAnalyticsConfiguration": (mCb) => {
				if (!es_analytics_db || !es_analytics_cluster_name || !es_analytics_cluster) {
					async.parallel([
						(miniCb) =>{
							settings.elasticsearch = {};
							model.saveEntry(req.soajs, {
								collection: colls.analytics,
								record: settings
							}, miniCb);
						},
						(miniCb) => {
							if(!es_env){
								return miniCb();
							}
							
							if (es_analytics_db) {
								delete es_env.dbs.databases[es_analytics_db];
							}
							
							model.updateEntry(req.soajs, {
								collection: colls.environment,
								conditions: {_id: es_env._id},
								fields: {
									$set: {
										dbs: es_env.dbs
									}
								}
							}, miniCb);
						}
					], (error) => {
						if (error) {
							req.soajs.log.error(error);
						}
						return mCb(null, null);
					});
				}
				else {
					let opts = {};
					opts.collection = colls.analytics;
					if (!settings || settings === {}) {
						settings = {};
						settings._type = "settings";
						settings.env = {};
						settings.env[req.soajs.inputmaskData.env.toLowerCase()] = false;
						settings.elasticsearch = {
							"db_name": es_analytics_db
						}
					}
					if (settings.elasticsearch) {
						settings.elasticsearch.db_name = es_analytics_db;
					}
					opts.record = settings;
					model.saveEntry(req.soajs, opts, mCb);
				}
				
			}
		}, (error) => {
			return cb(error, {
				esDbName: es_analytics_db,
				esClusterName: es_analytics_cluster_name,
				esCluster: es_analytics_cluster
			});
		});
	},
	
	/**
	 * Save ES Cluster Resource
	 * @param {Object} req
	 * @param {Object} options
	 * @param {Object} model
	 * @param {Function} cb
	 */
	"saveESClustersInResources": (req, options, model, cb) => {
		let opts = {};
		opts.collection = colls.resources;
		opts.record = {
			"type": "cluster",
			"shared": true,
			"locked": true,
			"created": process.env.SOAJS_ENV.toUpperCase(),
			"name": options.category,
			"category": "elasticsearch",
			"config": options.config
		};
		model.saveEntry(req.soajs, opts, cb);
	},
	
	/**
	 * Remove ES Cluster from Env Record
	 * @param {Object} req
	 * @param {Object} options
	 * @param {Object} model
	 * @param {Function} cb
	 */
	"removeESClustersFromEnvRecord": (req, options, model, cb) => {
		let opts = {};
		opts.collection = colls.environment;
		opts.conditions = {
			_id: options._id
		};
		
		let unset = {};
		unset["dbs.clusters." + options.name] = {};
		
		opts.fields = {
			"$unset":unset
		};
		model.updateEntry(req.soajs, opts, cb);
	},
	
	/**
	 * List Environments
	 * @param req
	 * @param config
	 * @param model
	 * @param cb
	 */
	"listEnvironments": (req, config, model, cb) => {
		let opts = {};
		opts.collection = colls.environment;
		opts.fields = {"dbs": 1};
		model.findEntries(req.soajs, opts, cb);
	},
	
	/**
	 * settings object and env record, check if analytics is active in any environment
	 * @param settings
	 * @param currentEnv
	 * @returns {boolean}
	 */
	"getActivatedEnv": (settings, currentEnv) => {
		let activated = false;
		if (settings && settings.env) {
			let environments = Object.keys(settings.env);
			environments.forEach((oneEnv) => {
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