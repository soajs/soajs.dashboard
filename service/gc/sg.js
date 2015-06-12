"use strict";
var soajs = require('soajs');
var utils = require('soajs/lib/utils');
var Mongo = soajs.mongo;
var middleWare = require("./middleware.js");
var genericModel = require("./model.js");
var dataMw;

var dataHandler = function(config) {
	this.config = config;

	//construct the service configuration and options
	var serviceConfig = {
		"config": utils.cloneObj(config.genericService.config)
	};
	for(var option in config.genericService.options) {
		if(config.genericService.options.hasOwnProperty(option)) {
			serviceConfig[option] = config.genericService.options[option];
		}
	}
	//create a new service instance
	this.service = new soajs.server.service(serviceConfig);

	//construct the middleware configuration
	var mwConfig = {
		"serviceName": config.genericService.config.serviceName,
		"errors": config.genericService.errors,
		"db": config.soajsService.db,
		"mw": {}
	};
	for(var apiRoute in config.soajsService.apis) {
		if(config.soajsService.apis.hasOwnProperty(apiRoute)) {
			var api = config.soajsService.apis[apiRoute];
			mwConfig.mw[api.type] = api.mw;

			if(!mwConfig.mw[api.type].code) {
				throw new Error("Please provide a default code value for api [" + apiRoute + "] that matches the list of codes errors in genericService.config.errors");
			}

			if(mwConfig.mw[api.type].model) {
				mwConfig.mw[api.type].model = genericModel[mwConfig.mw[api.type].model];
				if(typeof(mwConfig.mw[api.type].model) !== 'function') {
					throw new Error("Please provide a model entry for api [" + apiRoute + "] and make sure it is a function that returns a callback");
				}
			}
		}
	}
	//middleware instance created and ready
	try {
		dataMw = new middleWare(mwConfig);
	}
	catch(e) {
		throw new Error(e);
	}

	//building service routes
	this.serviceAPIRoutes = {};
	for(var apiRoutePath in config.soajsService.apis) {
		if(config.soajsService.apis.hasOwnProperty(apiRoutePath) && config.soajsService.apis[apiRoutePath].workflow) {
			var oneApi = config.soajsService.apis[apiRoutePath];
			var workflow = {};
			var steps = ['initialize', 'preExec', 'exec', 'postExec', 'response'];

			for(var workflowStep in oneApi.workflow) {
				if(oneApi.workflow.hasOwnProperty(workflowStep)) {
					if(oneApi.workflow[workflowStep]) {
						var code = oneApi.workflow[workflowStep];
						if(code.indexOf("next();") === -1) {
							code += "\n\tnext();";
						}
						oneApi.workflow[workflowStep] = new Function("req", "res", "next", code);
						workflow[workflowStep] = oneApi.workflow[workflowStep];
					}
				}
			}

			steps.forEach(function(oneStep) {
				var step = dataMw[oneApi.type][oneStep];
				if(step && !workflow[oneStep]) {
					workflow[oneStep] = step;
				}
			});

			var wf =[];
			for(var registeredWFStep in workflow){
				var i = steps.indexOf(registeredWFStep);
				wf[i] = workflow[registeredWFStep];
			}
			for(var count = wf.length-1; count >=0; count--){
				if(!wf[count]){
					wf.splice(count,1);
				}
			}
			this.serviceAPIRoutes[apiRoutePath] = {
				'method': oneApi.method,
				'wf': wf
			};
		}
	}
};

dataHandler.prototype.buildService = function(cb) {
	var self = this;
	var config = utils.cloneObj(self.config);

	//initialize the service
	this.service.init(function() {

		self.service.get("/schema", function(req, res) {
			res.json(req.soajs.buildResponse(null, config));
		});

		//generate the service apis
		for(var oneAPI in self.serviceAPIRoutes) {
			if(self.serviceAPIRoutes.hasOwnProperty(oneAPI)) {
				self.service[self.serviceAPIRoutes[oneAPI].method](oneAPI, self.serviceAPIRoutes[oneAPI].wf);
			}
		}
		//remove unneeded object after apis generation
		delete self.serviceAPIRoutes;
		delete self.config;
		//check if there is a callback that needs to be returned
		if(cb && typeof(cb) === 'function') {
			self.service.start(cb);
		}
		else {
			self.service.start();
		}
	});
};

module.exports = dataHandler;