"use strict";

const customReg = {
	validate: function (req, context, lib, async, BL, modelName, callback) {
		
		if (!context.template.content.custom_registry || !context.template.content.custom_registry.data || !Array.isArray(context.template.content.custom_registry.data) || context.template.content.custom_registry.data.length === 0) {
			//this deployment entry is not found in the template content
			context.errors.push({code: 172, msg: `The template does not support deploying custom registries`});
			return callback();
		}
		
		if(!context.opts.inputs || !Array.isArray(context.opts.inputs) || context.template.content.custom_registry.data.length !== context.opts.inputs.length){
			context.errors.push({code: 172, msg: `Mismatch between the number of inputs provided and the template entries in custom registries!`});
			return callback();
		}
		
		let entries = [];
		context.template.content.custom_registry.data.forEach((oneEntry) => {
			if (oneEntry.name){
				entries.push(oneEntry.name);
			}
		});
		
		//there is nothing to do
		if (entries.length === 0) {
			return callback();
		}
		
		let schema = context.config.schema.post["/customRegistry/add"].customRegEntry.validation;
		let myValidator = new req.soajs.validator.Validator();
		async.mapSeries(entries, (oneEntry, fCb) => {
			
			let dataImfv;
			context.opts.inputs.forEach((entryImfv) => {
				if (entryImfv.name === oneEntry) {
					dataImfv = entryImfv;
				}
			});
			
			//not sure if need
			if (!dataImfv || typeof dataImfv !== 'object') {
				context.errors.push({
					code: 172,
					msg: `Invalid or no inputs provided for custom registry ${oneEntry}`
				});
			}
			else {
				req.soajs.log.debug("Validating Custom Registry", oneEntry);
				let status = myValidator.validate(dataImfv, schema);
				if (!status.valid) {
					status.errors.forEach(function (err) {
						context.errors.push({code: 173, msg: err.stack});
					});
				}
			}
			
			return fCb();
		}, callback);
	},
	
	deploy: function (req, context, lib, async, BL, modelName, callback) {
		//check if previously completed
		if (context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status) {
			if (context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.done) {
				req.soajs.log.debug(`Custom Registry Entries have been previously created`);
				return callback(null, true);
			}
		}
		
		req.soajs.log.debug(`Checking Custom Registry Entries ...`);
		lib.initBLModel(BL.customRegistry.module, modelName, (error, customRegistry) => {
			lib.checkReturnError(req, callback, {error: error, code: 600}, () => {
				req.soajs.inputmaskData = {
					env: context.environmentRecord.code
				};
				
				let entries = [];
				context.template.content.custom_registry.data.forEach((oneEntry) => {
					if(oneEntry.name){
						entries.push(oneEntry.name);
					}
				});
				
				//there is nothing to do
				if (entries.length === 0) {
					req.soajs.log.debug("No Custom Registries to create.");
					return callback();
				}
				
				let finalData = [];
				req.soajs.log.debug("Creating Custom Registries ...");
				async.eachSeries(entries, (oneEntry, fCb) => {
					
					//check if this entry was previously processed
					if (context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status) {
						if (context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.data) {
							context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.data.forEach((oneData) => {
								if (oneData.name === oneEntry) {
									req.soajs.log.debug("found Custom Registry", oneEntry);
									finalData.push({"name": oneEntry});
									return fCb();
								}
							});
						}
					}
					
					req.soajs.log.debug("Creating new Custom Registry", oneEntry);
					context.opts.inputs.forEach((entryImfv) => {
						if (entryImfv.name === oneEntry) {
							req.soajs.inputmaskData.customRegEntry = entryImfv;
						}
					});
					
					//process entry
					customRegistry.add(context.config, req, {}, (error, data) => {
						lib.checkReturnError(req, fCb, {error: error, code: (error && error.code) ? error.code: 600 }, () => {
							finalData.push({"name": oneEntry});
							return fCb();
						});
					});
				}, (error) => {
					req.soajs.log.debug("Custom Registries Deployment completed");
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
	
	rollback: function (req, context, lib, async, BL, modelName, callback) {
		//check if previously completed
		if (context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status) {
			if (context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.done) {
				req.soajs.log.debug(`Rolling back Custom Registry Entries ...`);
				lib.initBLModel(BL.customRegistry.module, modelName, (error, customRegistry) => {
					lib.checkReturnError(req, callback, {error: error, code: 600}, () => {
						let data = context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.data;
						async.each(data, (oneData, mCb) => {
							req.soajs.inputmaskData = {
								env: context.environmentRecord.code,
								name: oneData.name
							};
							customRegistry.delete(context.config, req, {}, (error) => {
								if (error) {
									req.soajs.log.error(error);
								}
								return mCb(null, true);
							});
						}, () => {
							return callback(null, true);
						});
						
					});
				});
			}
		}
		else {
			return callback(null, true);
		}
	}
};

module.exports = customReg;