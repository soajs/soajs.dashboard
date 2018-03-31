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
			let finalError = new Error(errors);
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
	if (!command || !command.routeName || !command.method) {
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
		
		let project = context.template.soajs_project ? template.soajs_project : null;
		opts.qs.soajs_project = project;
		
		request[command.method](opts, (error, response, body) => {
			if (error) {
				return cb(error);
			}
			
			return !body.result ? cb(new Error(body.errors.details[0].message)) : cb(null, body.data);
		});
	});
}

const infra = {
	deploy: function(req, context, lib, async, BL, modelName, callback){
		
		//check if previously completed
		if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status){
			if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.done){
				req.soajs.log.debug(`Infra deployment have been previously created`);
				return callback(null, true);
			}
		}
		
		req.soajs.log.debug(`Checking Deploy Infra ...`);
		if (context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].deploy) {
			
			let remoteStack = [];
			if (Array.isArray(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].deploy)) {
				remoteStack = context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].deploy;
			}
			else{
				remoteStack.push(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].deploy);
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
		}
		else {
			return callback(null, true);
		}
	},
	
	rollback: function(req, context, lib, async, BL, modelName, callback){
		//check if previously completed
		if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status){
			if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.done){
				if (context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].rollback) {
					req.soajs.log.debug(`Rolling back Infra deployment`);
					
					let remoteStack = [];
					if (Array.isArray(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].rollback)) {
						remoteStack = context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].rollback;
					}
					else{
						remoteStack.push(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].rollback);
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
		}
		else{
			return callback(null, true);
		}
	}
};

module.exports = infra;