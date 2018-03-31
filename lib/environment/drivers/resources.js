"use strict";
const deployer = require("soajs").drivers;

const repos = {
	deploy: function(req, context, lib, async, BL, modelName, callback){
		let resourceName = context.opts.section[context.opts.section.length -1];
		
		//check if previously completed
		if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status){
			if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.done){
				req.soajs.log.debug(`Resource ${resourceName} been previously created`);
				return callback(null, true);
			}
		}
		
		req.soajs.log.debug(`Deploying Resource ${resourceName} ...`);
		
		let data = {
			"env": context.environmentRecord.code.toUpperCase(),
			"resource": {
				"name": context.opts.inputs.name,
				"type": context.opts.inputs.type,
				"category": context.opts.inputs.category,
				"locked": context.opts.inputs.locked,
				"plugged": context.opts.inputs.plugged,
				"shared": context.opts.inputs.shared,
				"config": context.opts.inputs.config || null
			}
		};
		
		if(context.opts.inputs.sharedEnv){
			data.resource["sharedEnv"] = context.opts.inputs.sharedEnv;
		}
		
		let resourceDB;
		let serviceDeploymentId;
		async.series({
			"createResource": function(mCb){
				req.soajs.log.debug("Adding Resource " + resourceName + " in Database under environment " + data.env );
				lib.initBLModel(BL.resources.module, modelName, (error, cdModule) => {
					lib.checkReturnError(req, mCb, {error: error, code: 600}, () => {
						req.soajs.inputmaskData = data;
						cdModule.addResource(context.config, req, null, (error, response) =>{
							lib.checkReturnError(req, mCb, {error: error, code: error.code}, () => {
								resourceDB = response._id;
								return mCb(null, true);
							});
						});
					});
				});
			},
			"registerCD": function (mCb) {
				if(context.opts.inputs.deploy && Object.keys(context.opts.inputs.deploy).length > 0){
					req.soajs.log.debug("Registering CD entry for resource " + resourceName + " in environment " + data.env );
					lib.initBLModel(BL.resources.module, modelName, (error, cdModule) => {
						lib.checkReturnError(req, mCb, {error: error, code: 600}, () => {
							req.soajs.inputmaskData = {
								"env": context.environmentRecord.code.toUpperCase(),
								"resourceName": context.opts.inputs.name,
								"config": {
									"deploy": true,
									"options": context.opts.inputs.deploy
								}
							};
							cdModule.setConfig(context.config, req, null, mCb);
						});
					});
				}
				else{
					return mCb(null, true);
				}
			},
			"deployService": function (mCb) {
				if(context.opts.inputs.deploy && Object.keys(context.opts.inputs.deploy).length > 0){
					req.soajs.log.debug("Deploying resource " + resourceName + " in environment " + data.env);
					lib.initBLModel(BL.cloud.deploy.module, modelName, (error, deploymentModule) => {
						lib.checkReturnError(req, mCb, {error: error, code: 600}, () => {
							req.soajs.inputmaskData = {
								"deployConfig": context.opts.inputs.options.deployConfig,
								"custom": context.opts.inputs.options.custom,
								"recipe": context.opts.inputs.options.recipe,
								"env": context.environmentRecord.code.toUpperCase()
							};
							
							//link the db id entry to the deployment
							req.soajs.inputmaskData.custom.resourceId = resourceDB;
							
							deploymentModule.deployService(context.config, req.soajs, deployer, (error, out) => {
								lib.checkReturnError(req, mCb, {error: error, code: 600}, () => {
									if(out && out.service){
										serviceDeploymentId = out.service.id;
									}
									return mCb(null, true);
								});
							});
						});
					});
				}
				else{
					return mCb(null, true);
				}
			}
		}, (error) => {
			req.soajs.log.debug(`Resource ${resourceName} Deployment completed`);
			//generate final response and update template
			lib.checkReturnError(req, callback, {error: error, code: error.code}, () => {
				context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status = {
					"done": true,
					"data": { "db": resourceDB}
				};
				if(serviceDeploymentId){
					context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.data["id"] = serviceDeploymentId;
				}
				return callback(null, true);
			});
		});
	},
	
	rollback: function(req, context, lib, async, BL, modelName, callback){
		//check if previously completed
		if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status){
			if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.done){
				req.soajs.log.debug(`Rolling back Deployed Resources ...`);
				
				let data = context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.data;
				async.series({
					"removingDB": function(mCb){
						if(!data.db){
							return mCb();
						}
						
						lib.initBLModel(BL.cloud.resources.module, modelName, (error, cdModule) => {
							lib.checkReturnError(req, mCb, {error: error, code: 600}, () => {
								req.soajs.inputmaskData = {
									env: context.environmentRecord.code,
									id: data.db
								};
								cdModule.deleteResource(context.config, req, null, (error, response) =>{
									lib.checkReturnError(req, mCb, {error: error, code: error.code}, () => {
										if(error){
											req.soajs.log.error(error);
										}
										return mCb(null, true);
									});
								});
							});
						});
					},
					"removingDeployment": function(mCb){
						if(!data.id){
							return mCb();
						}
						
						lib.initBLModel(BL.cloud.services.module, modelName, (error, servicesModule) => {
							lib.checkReturnError(req, mCb, {error: error, code: 600}, () => {
								req.soajs.inputmaskData = {
									env: context.environmentRecord.code,
									serviceId: data.id,
									mode: context.opts.inputs.options.deployConfig.replication.mode
								};
								
								servicesModule.deleteService(context.config, req.soajs, deployer, (error) => {
									if(error){
										req.soajs.log.error(error);
									}
									return mCb(null, true);
								});
							});
						});
					}
				}, () =>{
					return callback(null, true);
				});
			}
		}
		else{
			return callback(null, true);
		}
	}
};

module.exports = repos;