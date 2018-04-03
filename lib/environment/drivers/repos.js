"use strict";
const deployer = require("soajs").drivers;

const repos = {
	
	validate: function(req, context, lib, async, BL, modelName, callback){
		let repoSection = context.opts.section[context.opts.section.length -1];
		if (!context.template.content.deployments || !context.template.content.deployments.repo || !context.template.content.deployments.repo[repoSection]) {
			//this deployment entry is not found in the template content
			context.errors.push({code: 172, msg: `The template does not support deploying repositories for ${repoSection}`});
			return callback();
		}
		
		let imfv = context.config.schema.post["/cloud/services/soajs/deploy"];
		let schema = {
			"type": "object",
			"required": true,
			"properties":{
				recipe: imfv.recipe.validation,
				gitSource: imfv.gitSource.validation,
				deployConfig: imfv.deployConfig.validation,
				autoScale: imfv.autoScale.validation,
				custom: imfv.custom.validation,
			}
		};
		
		let myValidator = new req.soajs.validator.Validator();
		let dataImfv;
		if(!context.opts.input || !Array.isArray(context.opts.input) || context.opts.input.length === 0){
			context.errors.push({code: 172, msg: `Invalid or not all inputs provided for repo ${repoSection}`});
		}
		else{
			context.opts.input.forEach((entryImfv) =>{
				if(entryImfv.name === repoSection){
					dataImfv = entryImfv;
				}
			});
			
			if(!dataImfv || typeof dataImfv !== 'object'){
				context.errors.push({code: 172, msg: `Invalid or not all inputs provided for repo ${repoSection}`});
			}
			else{
				req.soajs.log.debug("Validating Repo Inputs ", repoSection);
				let status = myValidator.validate(dataImfv, schema);
				if (!status.valid) {
					status.errors.forEach(function (err) {
						context.errors.push({code: 173, msg: err.stack});
					});
				}
			}
		}
		
		return callback();
	},
	
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
		let dataImfv;
		context.opts.input.forEach((entryImfv) =>{
			if(entryImfv.name === serviceName){
				dataImfv = entryImfv;
			}
		});
		
		let data = {
			"deployConfig": dataImfv.options.deployConfig,
			"autoScale": dataImfv.options.autoScale,
			"gitSource": dataImfv.options.gitSource,
			"custom": dataImfv.options.custom,
			"recipe": dataImfv.options.recipe,
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
		else if(dataImfv.version){
			cdPost.version = {
				deploy: true,
				options: data,
				v: 'v' + dataImfv.version
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
						if(dataImfv.version){
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
					"data": { "id": serviceDeploymentId, "mode": data.deployConfig.replication.mode }
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
								mode: oneData.mode
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