"use strict";
const deployer = require("soajs.core.drivers");

const secrets = {
	validate: function(req, context, lib, async, BL, modelName, callback){
		
		if (!context.template.content.secrets || !context.template.content.secrets.data || !Array.isArray(context.template.content.secrets.data) || context.template.content.secrets.data.length === 0) {
			//this deployment entry is not found in the template content
			context.errors.push({code: 172, msg: `The template does not support deploying secrets`});
			return callback();
		}
		
		if(!context.opts.inputs|| !Array.isArray(context.opts.inputs) || context.template.content.secrets.data.length !== context.opts.inputs.length){
			context.errors.push({code: 172, msg: `Mismatch between the number of inputs provided and the template entries in secrets!`});
			return callback();
		}
		
		let imfv = context.config.schema.post["/secrets/add"];
		let schema = {
			"type": "object",
			"required": true,
			"properties":{
				name: imfv.name.validation,
				data: imfv.data.validation
			}
		};

		if(context.environmentRecord
			&& context.environmentRecord.deployer
			&& context.environmentRecord.deployer.selected &&
			context.environmentRecord.deployer.selected.indexOf("kubernetes") !== -1){
			schema.properties.type = imfv.type.validation;
			schema.properties.namespace = imfv.namespace.validation;
		}

		let entries =[];
		context.template.content.secrets.data.forEach((oneEntry) => {
			if (oneEntry.name) {
				entries.push(oneEntry.name);
			}
		});

		//there is nothing to do
		if (entries.length === 0) {
			return callback();
		}

		let myValidator = new req.soajs.validator.Validator();
		async.mapSeries(entries, (oneEntry, fCb) => {
			let dataImfv;
			context.opts.inputs.forEach((entryImfv) =>{
				if(entryImfv.name === oneEntry){
					dataImfv = entryImfv;
				}
			});
			
			if(!dataImfv || typeof dataImfv !== 'object'){
				context.errors.push({code: 172, msg: `Invalid or no inputs provided for secret ${oneEntry}`});
			}
			else{
				req.soajs.log.debug("Validating Secret", oneEntry);
				let status = myValidator.validate(dataImfv, schema);
				if (!status.valid) {
					status.errors.forEach(function (err) {
						context.errors.push({code: 173, msg: `Secret ${oneEntry}: ` + err.stack});
					});
				}
			}
			
			return fCb();
		}, callback);
	},
	
	deploy: function(req, context, lib, async, BL, modelName, callback){
		//check if previously completed
		if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status){
			if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.done){
				req.soajs.log.debug(`Secrets Entries have been previously created`);
				return callback(null, true);
			}
		}
		
		req.soajs.log.debug(`Checking Secrets Entries ...`);
		lib.initBLModel(BL.cloud.secrets.module, modelName, (error, secretsModule) => {
			lib.checkReturnError(req, callback, {error: error, code: 600}, () => {
				
				let entries =[];
				context.template.content.secrets.data.forEach((oneEntry) => {
					entries.push(oneEntry.name);
				});
				
				//there is nothing to do
				if(entries.length === 0){
					req.soajs.log.debug("No Secrets to create.");
					return callback();
				}
				
				let finalData = [];
				req.soajs.log.debug("Creating Secrets ...");
				async.eachSeries(entries, (oneEntry, fCb) => {
					
					//check if this entry was previously processed
					if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status){
						if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.data){
							if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.data.name === oneEntry){
								req.soajs.log.debug("found Secret", oneEntry);
								finalData.push(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.data);
								return fCb();
							}
						}
					}
					
					req.soajs.log.debug("Creating new Secret", oneEntry);
					
					let dataImfv;
					context.opts.inputs.forEach((entryImfv) =>{
						if(entryImfv.name === oneEntry){
							dataImfv = entryImfv;
						}
					});
					
					//process entry
					req.soajs.inputmaskData = {
						env: context.environmentRecord.code,
						name: oneEntry,
						namespace: dataImfv.namespace || null,
						type: dataImfv.type || null,
						data: dataImfv.data || ''
					};
					
					secretsModule.add(context.config, req.soajs, deployer, (error) =>{
						lib.checkReturnError(req, fCb, {error: error, code: (error && error.code) ? error.code: 600}, () => {
							finalData.push({"name": oneEntry, "namespace": req.soajs.inputmaskData.namespace});
							return fCb();
						});
					});
				}, (error) => {
					req.soajs.log.debug("Secrets Deployment completed");
					//generate final response and update template
					lib.checkReturnError(req, callback, {error: error, code: (error && error.code) ? error.code: 600}, () => {
						context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status = {
							"done": true,
							"data": finalData
						};
						return callback(null, true);
					});
				});
			});
		});
	},
	
	rollback: function(req, context, lib, async, BL, modelName, callback){
		//check if previously completed
		if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status) {
			if (context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.done) {
				req.soajs.log.debug(`Rolling back Secrets ...`);
				
				lib.initBLModel(BL.cloud.secrets.module, modelName, (error, secretsModule) => {
					lib.checkReturnError(req, callback, {error: error, code: 600}, () => {
						
						let data = context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.data;
						async.each(data, (oneData, mCb) =>{
							req.soajs.inputmaskData = {
								env: context.environmentRecord.code,
								name: oneData.name,
								namespace: oneData.namespace || null,
							};
							secretsModule.delete(context.config, req.soajs, deployer, (error) =>{
								if(error){
									req.soajs.log.error(error);
								}
								return mCb(null, true);
							});
						}, () =>{
							return callback(null, true);
						});
					});
				});
			}
			else {
				return callback(null, true);
			}
		}
		else {
			return callback(null, true);
		}
	}
};

module.exports = secrets;
