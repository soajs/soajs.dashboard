"use strict";
const deployer = require("soajs.core.drivers");
const soajsLib = require("soajs.core.libs");

const repos = {
	
	validate: function(req, context, lib, async, BL, modelName, callback){
		let repoSection = context.opts.section[context.opts.section.length -1];
		if (!context.template.content.deployments
			|| !context.template.content.deployments.repo
			|| !context.template.content.deployments.repo[repoSection]) {
			//this deployment entry is not found in the template content
			context.errors.push({
				code: 172,
				msg: `The template does not support deploying repositories for ${repoSection}`
			});
			return callback();
		}
		
		if (!context.template.content.deployments.repo[repoSection].limit) {
			context.template.content.deployments.repo[repoSection].limit = 1;
		}
		
		if (!context.opts.inputs || !Array.isArray(context.opts.inputs) || context.opts.inputs.length !== context.template.content.deployments.repo[repoSection].limit) {
			context.errors.push({
				code: 172,
				msg: `Mismatch between the number of inputs provided and the template entries in repos ${repoSection}!`
			});
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
		context.opts.inputs.forEach((entryImfv) =>{
			if(entryImfv.name === repoSection){
				dataImfv = entryImfv;
			}
		});
		
		if(!dataImfv || typeof dataImfv !== 'object'){
			context.errors.push({code: 172, msg: `Invalid or not all inputs provided for repo ${repoSection}`});
		}
		else{
			req.soajs.log.debug("Validating Repo Inputs ", repoSection);
			
			let status = myValidator.validate(dataImfv.options, schema);
			if (!status.valid) {
				status.errors.forEach(function (err) {
					context.errors.push({code: 173, msg: `Repository ${repoSection}: ` + err.stack});
				});
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
		context.opts.inputs.forEach((entryImfv) =>{
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
		
		if(context.template.soajs_project){
			data.soajs_project = context.template.soajs_project;
		}
		
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
		else if(['service','daemon'].indexOf(dataImfv.type) !== -1){
			let vers = 1;
			if(dataImfv.options && dataImfv.options.custom && dataImfv.options.custom.version){
				vers = dataImfv.options.custom.version;
			}
			cdPost.version = {
				deploy: true,
				options: data,
				v: 'v' + vers
			};
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
							data.custom.version = parseFloat(data.custom.version);
						}
						req.soajs.inputmaskData = soajsLib.utils.cloneObj(data);
						deploymentModule.deployService(context.config, req, deployer, (error, out) => {
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
			lib.checkReturnError(req, callback, {error: error, code: (error && error.code) ? error.code: 600}, () => {
				context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status = {
					"done": true,
					"data": [{ "id": serviceDeploymentId, "mode": data.deployConfig.replication.mode }]
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
							
							if(context.template.soajs_project){
								req.soajs.inputmaskData.soajs_project = context.template.soajs_project;
							}
							servicesModule.deleteService(context.config, req, deployer, (error) => {
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
		else{
			return callback(null, true);
		}
	}
};

module.exports = repos;