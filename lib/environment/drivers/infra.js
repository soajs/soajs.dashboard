"use strict";
const deployer = require("soajs").drivers;

function invokeAndCheck3rdPartyCall(req, context, infraModule, oneStep, counter, callback) {
	generateAndRunRequest(req, context, infraModule, oneStep, function (error, response) {
		if (error) {
			return callback(error);
		}
		
		let valid = true;
		let errors = [];
		
		if (!response) {
			valid = false;
		}
		else if(oneStep.check){
			req.soajs.log.debug("comparing 3rd party response with check rules:", response, oneStep.check);
			let myValidator = new req.soajs.validator.Validator();
			let status = myValidator.validate(response, oneStep.check);
			if (status.errors && status.errors.length > 0) {
				valid = false;
				status.errors.forEach(function (err) {
					errors.push(err.stack);
				});
			}
		}
		
		if (valid) {
			return callback(null, response);
		}
		else {
			let finalError = new Error(JSON.stringify(errors));
			if(oneStep.recursive){
				if(oneStep.recursive.max === counter){
					return callback(finalError);
				}
				else{
					counter++;
					setTimeout(() => {
						invokeAndCheck3rdPartyCall(req, context, infraModule, oneStep, counter, callback);
					}, oneStep.recursive.delay);
				}
			}
			else{
				return callback(finalError);
			}
		}
	});
}

function  generateAndRunRequest(req, context, infraModule, oneEntry, cb) {
	let command = oneEntry.command;
	if (!command) {
		return cb(new Error("Invalid or Missing information to invoke infra driver"));
	}
	
	switch(oneEntry.command){
		case 'deployCluster':
			oneEntry.check = {
				"type": "object",
				"properties": {
					id: {
						type: "string",
						required: true
					}
				}
			};
			break;
		case 'getDeployClusterStatus':
			oneEntry.recursive = {
				"max" : 10,
				"delay": 2 * 60 * 1000
			};
			oneEntry.check = {
				"type": "object",
				"properties": {
					"id": {
						"type": "string",
						"required": true
					},
					"ip": {
						"type": "string",
						"required": true
					}
				}
			};
			break;
		case 'getDNSInfo':
			oneEntry.recursive = {
				"max" : 10,
				"delay": 60 * 1000
			};
			oneEntry.check = {
				"type": "object",
				"properties": {
					"id": {
						"type": "string",
						"required": true
					},
					"dns": {
						"type": "object",
						"required": true
					}
				}
			};
			break;
		case 'deployVM':
			oneEntry.check = {
				"type": "object",
				"properties": {
					name: {
						type: "string",
						required: true
					},
					infraId: {
						type: "string",
						required: true
					}
				}
			};
			break;
		case 'getDeployVMStatus':
			oneEntry.recursive = {
				"max" : 10,
				"delay": 2 * 60 * 1000
			};
			oneEntry.check = {
				"type": "object",
				"properties": {
					name: {
						type: "string",
						required: true
					},
					infraId: {
						type: "string",
						required: true
					},
					template: {
						type: "string",
						required: true
					},
					inputs: {
						type: "object",
						required: true
					}
				}
			};
			break;
	}
	
	req.soajs.inputmaskData = oneEntry.options || {};
	req.soajs.inputmaskData.id = context.infraProvider._id.toString(); //infraProviderId
	req.soajs.inputmaskData.driver = context.infraProvider.name; //infraProviderName
	req.soajs.inputmaskData.envCode = context.environmentRecord.code; //infraProviderName
	req.soajs.inputmaskData.resourceDriver = "atlas";
	
	if(oneEntry.options && oneEntry.options.previousEnvironment){
		req.soajs.inputmaskData.previousEnvironment = oneEntry.options.previousEnvironment;
	}
	
	if(context.template.soajs_project){
		req.soajs.inputmaskData.soajs_project = context.template.soajs_project;
	}
	req.soajs.headers = req.headers;
	infraModule[oneEntry.command](context.config, req, req.soajs, deployer, cb);
}

const infra = {
	validate: function (req, context, lib, async, BL, modelName, callback) {
		let schema = {
			"type": "object",
			"required": false,
			"properties":{
				"name": {"type": "string", "required": true },
				"type": {"type": "string", "required": true },
				"command": {"type": "string", "required": true },
				"options": {"type": "object", "required": false }
			}
		};
		
		let myValidator = new req.soajs.validator.Validator();
		async.mapSeries(context.opts.inputs, (oneInfraInput, fCb) => {
			req.soajs.log.debug("Validating One Infra Entry", context.opts.stepPath);
			let status = myValidator.validate(oneInfraInput, schema);
			if (!status.valid) {
				status.errors.forEach(function (err) {
					context.errors.push({code: 173, msg: `Infra Entry ${context.opts.stepPath}: ` + err.stack});
				});
			}
			
			return fCb();
		}, callback);
	},
	
	deploy: function(req, context, lib, async, BL, modelName, callback){
		
		//check if previously completed
		if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status){
			if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.done){
				req.soajs.log.debug(`Infra deployment have been previously created`);
				return callback(null, true);
			}
		}
		
		req.soajs.log.debug(`Checking Deploy Infra ...`);
		let remoteStack = [];
		if (Array.isArray(context.opts.inputs)) {
			remoteStack = context.opts.inputs;
		}
		else{
			remoteStack.push(context.opts.inputs);
		}
		
		if (remoteStack.length === 0) {
			req.soajs.log.debug("No Infra deployment to create.");
			return callback();
		}
		
		lib.initBLModel(BL.cloud.infra.module, modelName, (error, infraModule) => {
			lib.checkReturnError(req, callback, {error: error, code: 600}, () => {
				req.soajs.log.debug("Deploying new Infra ...");
				async.mapSeries(remoteStack, (oneStep, mCb) => {
					if (!oneStep) {
						return mCb();
					}
					invokeAndCheck3rdPartyCall(req, context, infraModule, oneStep, 0, mCb);
				}, (error, finalResponse) => {
					lib.checkReturnError(req, callback, {error: error, code: 600}, () => {
						req.soajs.log.debug("Infra Deployment completed");
						if(!context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status) {
							context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status = {};
						}
						context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.done = true;
						context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.data = finalResponse;
						return callback(null, true);
					});
				});
			});
		});
	},
	
	rollback: function(req, context, lib, async, BL, modelName, callback){
		//check if previously completed
		if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status){
			req.soajs.log.debug(`Rolling back Infra deployment`);
			
			let infraInfo = context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].imfv[0];
			let rollbackEntry = {
				"type": "infra",
				"name": infraInfo.name,
				"command": "removeEnvFromDeployment",
				"options": infraInfo.options
			};
			
			let remoteStack = [];
			if (Array.isArray(rollbackEntry)) {
				remoteStack = rollbackEntry;
			}
			else{
				remoteStack.push(rollbackEntry);
			}
			
			if (remoteStack.length === 0) {
				req.soajs.log.debug("No Infra rollback to run.");
				return callback();
			}
			
			lib.initBLModel(BL.cloud.infra.module, modelName, (error, infraModule) => {
				lib.checkReturnError(req, callback, {error: error, code: 600}, () => {
					async.mapSeries(remoteStack, (oneStep, mCb) => {
						if (!oneStep) {
							return mCb();
						}
						invokeAndCheck3rdPartyCall(req, context, infraModule, oneStep, 0, mCb);
					}, (error) => {
						lib.checkReturnError(req, callback, {error: error, code: 600}, () => {
							req.soajs.log.debug("Infra Rollback completed");
							return callback(null, true);
						});
					});
				});
			});
		}
		else{
			return callback(null, true);
		}
	}
};

module.exports = infra;