"use strict";
const deployer = require("soajs").drivers;

const repos = {
	deploy: function(req, context, lib, async, BL, modelName, callback){
		let serviceName = context.opts.section[context.opts.section.length -1];
		
		//check if previously completed
		if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status){
			if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.done){
				req.soajs.log.debug(`Repository has ${serviceName} been previously created`);
				return callback(null, true);
			}
		}
		
		req.soajs.log.debug(`Deploying Repository ${serviceName} ...`);
				
		let data = {
			"deployConfig": context.opts.inputs.options.deployConfig,
			"gitSource": context.opts.inputs.options.gitSource,
			"custom": context.opts.inputs.options.custom,
			"recipe": context.opts.inputs.options.recipe,
			"env": context.environmentRecord.code.toUpperCase()
		};
		
		let cdPost = {
			serviceName: serviceName,
			env: data.env
		};
		
		if (serviceName === 'controller') {
			cdPost.default = {
				deploy: true,
				options: data
			};
		}
		else if(context.opts.inputs.version){
			cdPost.version = {
				deploy: true,
				options: data,
				v: 'v' + context.opts.inputs.version
			};
			//todo: still need to check for daemons
		}
		else{
			cdPost.default = {
				deploy: true,
				options: data
			};
		}
		
		let serviceDeploymentId;
		async.series({
			"registerCD": function (mCb) {
				req.soajs.log.debug("Registering CD entry for service " + serviceName + " in environment " + data.env );
				lib.initBLModel(BL.cd.module, modelName, (error, cdModule) => {
					lib.checkReturnError(req, mCb, {error: error, code: 600}, () => {
						req.soajs.inputmaskData = {config: cdPost};
						cdModule.saveConfig(context.config, req, null, mCb);
					});
				});
			},
			"deployService": function (mCb) {
				req.soajs.log.debug("Deploying service " + serviceName + " in environment " + data.env);
				lib.initBLModel(BL.cloud.deploy.module, modelName, (error, deploymentModule) => {
					lib.checkReturnError(req, mCb, {error: error, code: 600}, () => {
						if(context.opts.inputs.version){
							data.custom.version = parseInt(data.custom.version);
						}
						req.soajs.inputmaskData = data;
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
		}, (error) => {
			req.soajs.log.debug(`Repository ${serviceName} Deployment completed`);
			//generate final response and update template
			lib.checkReturnError(req, callback, {error: error, code: error.code}, () => {
				context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status = {
					"done": true,
					"data": { "id": serviceDeploymentId }
				};
				return callback(null, true);
			});
		});
	},
	
	rollback: function(req, context, lib, async, BL, modelName, callback){
		//check if previously completed
		if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status){
			if(context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.done){
				req.soajs.log.debug(`Rolling back Deployed Repositories ...`);
				lib.initBLModel(BL.cloud.services.module, modelName, (error, servicesModule) => {
					lib.checkReturnError(req, callback, {error: error, code: 600}, () => {
						let data = context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.data;
						async.each(data, (oneData, mCb) =>{
							
							req.soajs.inputmaskData = {
								env: context.environmentRecord.code,
								serviceId: oneData.id,
								mode: context.opts.inputs.options.deployConfig.replication.mode
							};
							
							servicesModule.deleteService(context.config, req.soajs, deployer, (error) => {
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

module.exports = repos;