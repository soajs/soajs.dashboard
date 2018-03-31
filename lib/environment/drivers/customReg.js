"use strict";

const customReg = {
	deploy: function(req, context, lib, async, BL, modelName, callback){
		//check if previously completed
		if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status){
			if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.done){
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
				
				let entries =[];
				context.template.content.custom_registry.data.forEach((oneEntry) => {
					entries.push(oneEntry.name);
				});
				
				//there is nothing to do
				if(entries.length === 0){
					req.soajs.log.debug("No Custom Registries to create.");
					return callback();
				}
				
				req.soajs.log.debug("Creating Custom Registries ...");
				async.mapSeries(entries, (oneEntry, fCb) => {
					
					//check if this entry was previously processed
					if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status){
						if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.data){
							context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.data.forEach((oneData) =>{
								if(oneData.name === oneEntry){
									req.soajs.log.debug("found Custom Registry", oneEntry);
									return fCb({"name": oneEntry});
								}
							});
						}
					}
					
					req.soajs.log.debug("Creating new Custom Registry", oneEntry);
					//process entry
					req.soajs.inputmaskData.customRegEntry = context.opts.input[oneEntry].imfv;
					customRegistry.add(context.config, req, {}, (error, data) =>{
						lib.checkReturnError(req, fCb, {error: error, code: error.code}, () => {
							return fCb({"name": oneEntry});
						});
					});
				}, (error, finalResponse) => {
					req.soajs.log.debug("Custom Registries Deployment completed");
					//generate final response and update template
					lib.checkReturnError(req, callback, {error: error, code: error.code}, () => {
						context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status = {
							"done": true,
							"data": finalResponse
						};
						return callback(null, true);
					});
				});
			});
		});
	},
	
	rollback: function(req, context, lib, async, BL, modelName, callback){
		//check if previously completed
		if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status){
			if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.done){
				req.soajs.log.debug(`Rolling back Custom Registry Entries ...`);
				lib.initBLModel(BL.customRegistry.module, modelName, (error, customRegistry) => {
					lib.checkReturnError(req, callback, {error: error, code: 600}, () => {
						let data = context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.data;
						async.each(data, (oneData, mCb) =>{
							req.soajs.inputmaskData = {
								env: context.environmentRecord.code,
								name: oneData.name
							};
							customRegistry.delete(context.config, req, {}, (error) =>{
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
		}
		else{
			return callback(null, true);
		}
	}
};

module.exports = customReg;