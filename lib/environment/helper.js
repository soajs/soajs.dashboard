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
			}
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

	prepareEnvRecord : function(config, data, envDbRecord, prefix, infraProvider){
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
					"prefix": prefix
				},
				"databases": {
				
				},
				"session" : {
					"cluster" : "dash_cluster",
					"name" : "core_session",
					"store" : {
					
					},
					"collection" : "sessions",
					"stringify" : false,
					"expireAfter" : 1209600000
				}
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
		let valid = false;
		if(data.deploy.selectedDriver === "manual"){
			record.deployer.type = "manual";
			record.deployer.selected = "manual";
			record.deployer.manual.nodes = "127.0.0.1";
			record.protocol = 'http';
			record.port = 80;
			valid = true;
		}
		else if(data.deploy.selectedDriver === 'container' && infraProvider && infraProvider.name === 'local'){
			record.deployer.type = "container";
			if(data.deploy && data.deploy.previousEnvironment){
				record.deployer.selected = envDbRecord.deployer.selected;
				record.deployer.container = envDbRecord.deployer.container;
				valid = true;
			}
			else {
				let technology = data.deploy.technology;
				if(technology === 'docker'){
					record.deployer.selected = "container.docker.remote";
					record.deployer.container.docker.remote = {
						apiPort: infraProvider.api.port,
						nodes: infraProvider.api.ipaddress,
						apiProtocol: infraProvider.api.protocol,
						auth:{
							token: infraProvider.api.token
						}
					};
					valid = true;
				}
				if(technology === 'kubernetes'){
					record.deployer.selected = "container.kubernetes.remote";
					record.deployer.container.kubernetes.remote = {
						nodes: infraProvider.api.ipaddress,
						apiPort: infraProvider.api.port,
						namespace: infraProvider.api.namespace,
						auth:{
							token: infraProvider.api.token
						}
					};
					valid = true;
				}
			}
		}
		else if(data.deploy.selectedDriver === 'singleInfra' && infraProvider && infraProvider.name !== 'local'){
			//todo: add the lock of infra restriction to the environment here ....
			let technology = data.deploy.technology;
			record.deployer.selected = (technology === 'docker') ? "container.docker.remote" : "container.kubernetes.remote";
			valid = true;
		}
		
		return (valid) ? record : null;
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
	}
};

module.exports = environmentHelper;
