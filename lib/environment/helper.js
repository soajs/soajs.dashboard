"use strict";
var async = require("async");
var shortid = require('shortid');

var environmentHelper = {
	
	getDefaultRegistryServicesConfig : function(envDBRecord){
		let config = {
			"services": {
				"controller": {
					"maxPoolSize": 100,
					"authorization": true,
					"requestTimeout": 30,
					"requestTimeoutRenewal": 0
				},
				"config": {
					"awareness": {
						"cacheTTL": 3600000,
						"healthCheckInterval": 5000,
						"autoRelaodRegistry": 3600000,
						"maxLogCount": 5,
						"autoRegisterService": true
					},
					"agent": {
						"topologyDir": "/opt/soajs/"
					},
					"key": {
						"algorithm": "aes256",
						"password": "soajs beaver"
					},
					"logger": {
						"src": true,
						"level": "debug",
						"formatter": {
							"levelInString": true,
							"outputMode": "long"
						}
					},
					"cors": {
						"enabled": true,
						"origin": "*",
						"credentials": "true",
						"methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
						"headers": "key,soajsauth,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization",
						"maxage": 1728000
					},
					"oauth": {
						"grants": ["password", "refresh_token"],
						"debug": false,
						"accessTokenLifetime": 7200,
						"refreshTokenLifetime": 1209600
					},
					"ports": {
						"controller": 4000,
						"maintenanceInc": 1000,
						"randomInc": 100
					},
					"cookie": {
						"secret": "soajs beaver"
					},
					"session": {
						"name": "soajsID",
						"secret": "soajs beaver",
						"cookie": {
							"path": "/",
							"httpOnly": true,
							"secure": false,
							"maxAge": null
						},
						"resave": false,
						"saveUninitialized": false,
						"rolling": false,
						"unset": "keep"
					}
				}
			},
			"deployer": {
				"manual": {
					"nodes": ""
				},
				"container": {
					"docker": {
						"local": {
							"socketPath": "/var/run/docker.sock"
						},
						"remote": {
							"apiProtocol": "",
							"apiPort": 2376,
							"nodes": "",
							"auth": {
								"token": ""
							}
						}
					},
					"kubernetes": {
						"local": {
							"nodes": "",
							"namespace": {
								"default": "soajs",
								"perService": false
							},
							"auth": {
								"token": ""
							}
						},
						"remote": {
							"nodes": "",
							"namespace": {
								"default": "soajs",
								"perService": false
							},
							"auth": {
								"token": ""
							}
						}
					}
				}
			},
		};
		
		if(envDBRecord){
			config.deployer = envDBRecord.deployer;
		}
		
		return config;
	},

	generateRandomString: function(){
		shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_');
		return shortid.generate();
	},

	prepareEnvRecord : function(config, data, envDbRecord){
		data.code = data.code.toUpperCase();
		var record = {
			"code": data.code,
			"description": data.description,
			"sensitive": data.sensitive || false,
			"domain": data.domain || "",
			"profile": config.profileLocation + "profile.js",
			"sitePrefix": data.sitePrefix || "site",
			"apiPrefix": data.apiPrefix || "api",
			"dbs": {
				"config": {
					"prefix": ""
				},
				"databases": {}
			},
			"deployer": {
				"manual":{
					"nodes": ""
				},
				"container":{
					"docker" : {
						"local" : {
							"socketPath" : "/var/run/docker.sock"
						},
						"remote" : {
							"apiProtocol": "https",
							"apiPort": 2376,
							"auth": {
								"token": ""
							},
							"nodes" : ""
						}
					},
					"kubernetes" : {
						"local" : {
							"nodes": "",
							"namespace" : {
								"default": "soajs",
								"perService": false
							},
							"auth" : {
								"token" : ""
							}
						},
						"remote" : {
							"nodes": "",
							"namespace" : {
								"default": "soajs",
								"perService": false
							},
							"auth" : {
								"token" : ""
							}
						}
					}
				}
			}
		};

		//deployer
		if(!data.deploy || Object.keys(data.deploy).length === 0 ||(data.deploy && data.deploy.selectedDriver === "manual")){
			record.deployer.type = "manual";
			if(data.deploy) {
				if(data.deploy.previousEnvironment){
					record.deployer.manual.nodes = envDbRecord.deploy.deployment.manual.nodes;
				}
				else if(data.deploy.deployment && data.deploy.deployment.manual && data.deploy.deployment.manual.nodes) {
					record.deployer.manual.nodes = data.deploy.deployment.manual.nodes;
				}
			}
			record.protocol = 'http';
			record.port = 80;
		}
		else{
			record.deployer.type = "container";

			if(data.deploy.selectedDriver === 'docker'){
				if(data.deploy && data.deploy.previousEnvironment){
					record.deployer.selected = envDbRecord.deployer.selected;
					record.deployer.container = envDbRecord.deployer.container;
				}
				else {
					record.deployer.selected = "container.docker.remote";
					record.deployer.container.docker.remote = {
						apiPort: data.deploy.deployment.docker.apiPort,
						nodes: data.deploy.deployment.docker.nodes
					};
					
					if(data.deploy.deployment.docker.apiProtocol){
						record.deployer.container.docker.remote.apiProtocol= data.deploy.deployment.docker.apiProtocol;
					}
					
					if(data.deploy.deployment.docker.token){
						record.deployer.container.docker.remote.auth = {
							token: data.deploy.deployment.docker.token
						};
					}
				}
			}
			if(data.deploy.selectedDriver === 'kubernetes'){
				if(data.deploy && data.deploy.previousEnvironment){
					record.deployer.selected = envDbRecord.deployer.selected;
					record.deployer.container = envDbRecord.deployer.container;
				}
				else{
					record.deployer.selected = "container.kubernetes.remote";
					record.deployer.container.kubernetes.remote = {
						nodes: data.deploy.deployment.kubernetes.nodes,
						apiPort: data.deploy.deployment.kubernetes.port,
						namespace: {
							"default" : data.deploy.deployment.kubernetes.NS,
							"perService" : data.deploy.deployment.kubernetes.perService
						},
						auth:{
							token: data.deploy.deployment.kubernetes.token
						}
					};
				}
			}

		}
		return record;
	},

	listCerts: function (soajs, model, cb) {
		var opts = {};
		opts.collection = "fs.files";
		opts.conditions = {};
		model.findEntries(soajs, opts, cb);
	},
	
	deleteCerts: function (certsArr, req, model, envCode) {
		envCode = envCode.toUpperCase();
		
		let opts = {};
		async.each(certsArr, function (cert, cb) {
			if(!cert || !cert.metadata || !cert.metadata.env || !cert.metadata.env[envCode]){
				return cb();
			}
			if (cert.metadata.env[envCode].length === 1 && Object.keys(cert.metadata.env).length === 1) { //only 1 available env and driver
				opts.collection = "fs.files";
				opts.conditions = { _id: cert._id };
				model.removeEntry(req.soajs, opts, cb);
			} else if (cert.metadata.env[envCode].length === 1 && Object.keys(cert.metadata.env).length > 1) { //other env are available but only 1 driver in selected env
				delete cert.metadata.env[envCode];
				opts.collection = "fs.files";
				opts.record = cert;
				model.saveEntry(req.soajs, opts, cb);
			} else if (cert.metadata.env[envCode].length > 1) { //several drivers exist in env
				for (let i = 0; i < cert.metadata.env[envCode].length; i++) {
					if (cert.metadata.env[envCode][i] === req.soajs.inputmaskData.driver) {
						cert.metadata.env[envCode].splice(i, 1);
						break;
					}
				}
				opts.collection = "fs.files";
				opts.record = cert;
				model.saveEntry(req.soajs, opts, cb);
			}
		}, (error)=>{
			if(error){
				req.soajs.log.error(error);
			}
		});
	},
};

module.exports = environmentHelper;
