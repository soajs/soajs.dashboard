"use strict";
const request = require("request");

function invokeAndCheck3rdPartyCall(req, context, oneStep, counter, callback) {
	generateAndRunRequest(req, context, oneStep, function (error, response) {
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
			if (!status.valid) {
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
						invokeAndCheck3rdPartyCall(req, context, oneStep, counter, callback);
					}, oneStep.recursive.delay);
				}
			}
			else{
				return callback(finalError);
			}
		}
	});
}

function  generateAndRunRequest(req, context, oneEntry, cb) {
	let command = oneEntry.command;
	if (!command || !command.routeName || !command.method || !command.data) {
		return cb(new Error("Invalid or Missing information to redirect to 3rd party systems!"));
	}
	
	req.soajs.awareness.getHost('controller', function (host) {
		let opts = {
			"uri": 'http://' + host + ':' + req.soajs.registry.services.controller.port + command.routeName,
			"headers": {
				'Content-Type': 'application/json',
				'accept': 'application/json',
				'connection': 'keep-alive',
				'key': req.headers.key,
				'soajsauth': req.headers.soajsauth
			},
			"qs": {
				"access_token": req.query.access_token
			},
			"json": true
		};
		
		if (command.data) {
			opts.body = command.data;
		}
		
		if (command.params && Object.keys(command.params).length > 0) {
			opts.qs = Object.assign(opts.qs, command.params);
		}
		
		opts.qs.soajs_project = context.template.soajs_project ? context.template.soajs_project : null;
		request[command.method](opts, (error, response, body) => {
			if (error) {
				return cb(error);
			}
			
			return !body.result ? cb(new Error(body.errors.details[0].message)) : cb(null, body.data);
		});
	});
}

const infra = {
	validate: function (req, context, lib, async, BL, modelName, callback) {
		
		let schema = {
			"type": "object",
			"required": false,
			"properties":{
				"recursive" : {
					"required": false,
					"type": "object",
					"properties":{
						"max" : {"type": "number", "required": true, "min": 1},
						"delay" : {"type": "number", "required": true, "min": 1}
					}
				},
				"check" : {
					"required": true,
					"type": "object"
				},
				"command": {
					"required": true,
					"type": "object",
					"properties":{
						"method": {"type": "string", "required": true, "enum": ['get','post','put','del','delete']},
						"routeName": {"type": "string", "required": true },
						"params": { "type": "object", "required": false },
						"data": {
							"type": "object",
							"required": true,
							"properties":{
								"name": {"type": "string", "required": true },
								"type": {"type": "string", "required": true },
								"command": {"type": "string", "required": true },
								"project": {"type": "string", "required": true },
								"options": {"type": "object", "required": true }
							}
						}
					}
				}
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
		
		req.soajs.log.debug("Deploying new Infra ...");
		async.mapSeries(remoteStack, (oneStep, mCb) => {
			if (!oneStep) {
				return mCb();
			}
			invokeAndCheck3rdPartyCall(req, context, oneStep, 0, mCb);
		}, (error, finalResponse) => {
			lib.checkReturnError(req, callback, {error: error, code: 600}, () => {
				req.soajs.log.debug("Infra Deployment completed");
				context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status = {
					done: true,
					data: finalResponse
				};
				
				return callback(null, true);
			});
		});
	},
	
	rollback: function(req, context, lib, async, BL, modelName, callback){
		//check if previously completed
		if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status){
			if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.done){
				if (context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.rollback) {
					req.soajs.log.debug(`Rolling back Infra deployment`);
					
					let remoteStack = [];
					if (Array.isArray(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.rollback)) {
						remoteStack = context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.rollback;
					}
					else{
						remoteStack.push(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.rollback);
					}
					
					if (remoteStack.length === 0) {
						req.soajs.log.debug("No Infra rollback to run.");
						return callback();
					}
					
					async.mapSeries(remoteStack, (oneStep, mCb) => {
						if (!oneStep) {
							return mCb();
						}
						invokeAndCheck3rdPartyCall(req, context, oneStep, 0, mCb);
					}, (error) => {
						lib.checkReturnError(req, callback, {error: error, code: 600}, () => {
							req.soajs.log.debug("Infra Rollback completed");
							return callback(null, true);
						});
					});
				}
				else{
					return callback(null, true);
				}
			}
			else{
				return callback(null, true);
			}
		}
		else{
			return callback(null, true);
		}
	}
};

module.exports = infra;