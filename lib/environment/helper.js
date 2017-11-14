"use strict";
var async = require("async");
var shortid = require('shortid');

var environmentHelper = {

	getDefaultRegistryServicesConfig : function(dashboardEnvRecord, data){
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
				"container": {
					"docker": {
						"local": {
							"socketPath": "/var/run/docker.sock"
						}
					},
					"kubernetes": {
						"local": {
							"nginxDeployType": "",
							"namespace": {},
							"auth": {
								"token": ""
							}
						}
					}
				}
			},
		};
		
		if(dashboardEnvRecord && data.deploy.selectedDriver === 'kubernetes' && !data.deploy.deployment.kubernetes.kubernetesremote) {
			config.deployer.container.kubernetes.local = dashboardEnvRecord.deployer.container.kubernetes.local;
		}
		
		return config;
	},
	
	generateRandomString: function(){
		shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_');
		return shortid.generate();
	},

	prepareEnvRecord : function(config, data, dashboardEnvRecord){
		data.code = data.code.toUpperCase();
		var record = {
			"code": data.code,
			"description": data.description,
			"sensitive": data.sensitive || false,
			"domain": data.domain,
			"profile": config.profileLocation + "profile.js",
			"sitePrefix": data.sitePrefix || "site",
			"apiPrefix": data.apiPrefix || "api",
			"dbs": {
				"config": {
					"prefix": ""
				},
				"session": {},
				"databases": {}
			},
			"deployer": {
				"container":{
					"docker" : {
						"local" : {
							"socketPath" : "/var/run/docker.sock"
						},
						"remote" : {
							"nodes" : ""
						}
					},
					"kubernetes" : {
						"local" : {
							"nginxDeployType" : "",
							"namespace" : {

							},
							"auth" : {
								"token" : ""
							}
						},
						"remote" : {
							"nginxDeployType" : "",
							"namespace" : {

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
		if(!data.deploy || (data.deploy && data.deploy.selectedDriver === "manual")){
			record.deployer.type = "manual";
			record.protocol = 'http';
			record.port = 80;
		}
		else{
			record.deployer.type = "container";

			if(data.deploy.selectedDriver === 'docker'){
				if(data.deploy.deployment.docker.dockerremote){
					record.deployer.selected = "container.docker.remote";
					record.deployer.container.docker.remote = {
						externalPort: data.deploy.deployment.docker.externalPort,
						internalPort: data.deploy.deployment.docker.internalPort,
						network: data.deploy.deployment.docker.network
					};
				}
				else{
					record.deployer.selected = "container.docker.local";
					record.deployer.container.docker.local = dashboardEnvRecord.deployer.container.docker.local;
				}
			}
			if(data.deploy.selectedDriver === 'kubernetes'){
				if(data.deploy.deployment.kubernetes.kubernetesremote){
					record.deployer.selected = "container.kubernetes.remote";
					record.deployer.container.kubernetes.remote = {
						apiPort: data.deploy.deployment.kubernetes.port,
						nginxDeployType: data.deploy.deployment.kubernetes.nginxDeployType,
						namespace: {
							"default" : data.deploy.deployment.kubernetes.NS,
							"perService" : data.deploy.deployment.kubernetes.perService
						},
						auth:{
							token: data.deploy.deployment.kubernetes.token
						}
					};
				}
				else{
					record.deployer.selected = "container.kubernetes.local";
					record.deployer.container.kubernetes.local = dashboardEnvRecord.deployer.container.kubernetes.local;
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

	deleteCerts: function (certsArr, req, counter, model, cb) {
		var envCode = req.soajs.inputmaskData.env;
		var opts = {};
		async.each(certsArr, function (cert, cb) {
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
				for (var i = 0; i < cert.metadata.env[envCode].length; i++) {
					if (cert.metadata.env[envCode][i] === req.soajs.inputmaskData.driverName) {
						cert.metadata.env[envCode].splice(i, 1);
						break;
					}
				}
				opts.collection = "fs.files";
				opts.record = cert;
				model.saveEntry(req.soajs, opts, cb);
			}
		}, cb);
	},

	saveUpdatedCerts: function (soajs, certs, model, cb) {
		async.each(certs, function (cert, callback) {
			var opts = {};
			opts.collection = "fs.files";
			opts.record = cert;
			model.saveEntry(soajs, opts, callback)
		}, cb);
	}
};

module.exports = environmentHelper;
