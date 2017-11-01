"use strict";
var async = require("async");
var shortid = require('shortid');

var environmentHelper = {
	
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
			"sitePrefix": data.sitePrefix,
			"apiPrefix": data.apiPrefix,
			"dbs": {
				"config": {
					"prefix": ""
				},
				"session": {
					cluster: "",
					tenantSpecific: false,
					name: "core_session",
					store: {},
					collection: "sessions",
					stringify: false,
					expireAfter: 1209600000,
				},
				"databases": {}
			},
			"deployer": {}
		};
		
		//deployer
		if(data.deploy.selectedDriver === "manual"){
			record.deployer.type = "manual";
		}
		else{
			record.deployer.type = "container";
			
			if(data.deploy.selectedDriver === 'docker'){
				record.deployer.container = {
					docker: {}
				};
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
				record.deployer.container = {
					kubernetes: {}
				};
				
				if(data.deploy.deployment.kubernetes.kubernetesremote){
					record.deployer.selected = "container.kuberentes.remote";
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
					record.deployer.selected = "container.kuberentes.local";
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