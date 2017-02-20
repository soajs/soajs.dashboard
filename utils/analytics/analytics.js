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
			if (error){
				return cb(error);
			}
			if (response && response.mongoImported){
				return cb (null, true);
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
							records = records.concat(require(dataFolder + item))
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
				//check es service
				//check container
				deployer.listServices(options, function (error, services) {
					//console.log(services)
					services.forEach(function (oneService) {
						if (oneService.name === 'elasticsearch'){
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
	
	"checkElasticSearch": function (soajs, env, settings, cb){
		console.log(JSON.stringify(env, null, 2))
		console.log(JSON.stringify(settings, null, 2))
		
		return cb(null, true)
	},
	
	"setMapping": function (cb) {
		return cb(null, true)
	},
	
	"getServices": function (cb) {
		return cb(null, true)
	},
	
	"addVisualizations": function (cb) {
		return cb(null, true)
	},
	
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
	_self.operations.push(async.apply(lib.insertMongoData, _self.config.soajs, _self.config.config, _self.config.model));
	_self.operations.push(async.apply(lib.deployElastic, _self.config.soajs, _self.config.envRecord, _self.config.deployer, _self.config.utils, _self.config.model, _self.config.settings));
	_self.operations.push(async.apply(lib.checkElasticSearch, _self.config.soajs, _self.config.envRecord, _self.config.settings));
	_self.operations.push(async.apply(lib.setMapping));
	_self.operations.push(async.apply(lib.getServices));
	_self.operations.push(async.apply(lib.addVisualizations));
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