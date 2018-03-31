"use strict";
const deployer = require("soajs").drivers;

const secrets = {
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
				
				req.soajs.log.debug("Creating Secrets ...");
				async.mapSeries(entries, (oneEntry, fCb) => {
					
					//check if this entry was previously processed
					if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status){
						if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.data){
							if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.data.name === oneEntry){
								req.soajs.log.debug("found Secret", oneEntry);
								return fCb({"name": oneEntry});
							}
						}
					}
					
					req.soajs.log.debug("Creating new Secret", oneEntry);
					//process entry
					req.soajs.inputmaskData = {
						env: context.environmentRecord.code,
						name: oneEntry,
						namespace: context.opts.input[oneEntry].namespace || null,
						type: context.opts.input[oneEntry].type || null,
						data: context.opts.input[oneEntry].data || ''
					};
					
					secretsModule.add(context.config, req.soajs, deployer, (error) =>{
						lib.checkReturnError(req, fCb, {error: error, code: error.code}, () => {
							return fCb({"name": oneEntry});
						});
					});
				}, (error, finalResponse) => {
					req.soajs.log.debug("Secrets Deployment completed");
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
								namespace: context.opts.input[oneData.name].namespace || null,
							};
							
							secretsModule.delete(context.config, req, {}, (error) =>{
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

module.exports = secrets;