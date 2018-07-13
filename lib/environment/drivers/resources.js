"use strict";
const deployer = require("soajs.core.drivers");

const repos = {

	validate: function(req, context, lib, async, BL, modelName, callback){
		let resourceSection = context.opts.section[context.opts.section.length - 1];
		if (!context.template.content.deployments
			|| !context.template.content.deployments.resources
			|| !context.template.content.deployments.resources[resourceSection]) {
			//this deployment entry is not found in the template content
			context.errors.push({
				code: 172,
				msg: `The template does not support deploying resources for ${resourceSection}`
			});
			return callback();
		}
		if (!context.template.content.deployments.resources[resourceSection].limit) {
			context.template.content.deployments.resources[resourceSection].limit = 1;
		}

		if (!context.opts.inputs || !Array.isArray(context.opts.inputs) || context.opts.inputs.length !== context.template.content.deployments.resources[resourceSection].limit) {
			context.errors.push({
				code: 172,
				msg: `Mismatch between the number of inputs provided and the template entries in resources ${resourceSection}!`
			});
			return callback();
		}

		let myValidator = new req.soajs.validator.Validator();
		let dataImfv;
		context.opts.inputs.forEach((entryImfv) =>{
			if(entryImfv.name === resourceSection){
				dataImfv = entryImfv;
			}
		});

		if(!dataImfv || typeof dataImfv !== 'object'){
			context.errors.push({code: 172, msg: `Invalid or not all inputs provided for resource ${resourceSection}`});
			return callback();
		}

		async.series({
			"validateResource": (mCb) => {
				let schema = context.config.schema.post["/resources"].resource.validation;
				req.soajs.log.debug("Validating Resource db inputs ", resourceSection);
				let dbData = {
					"name": dataImfv.name,
					"type": dataImfv.type,
					"category": dataImfv.category,
					"locked": dataImfv.locked,
					"plugged": dataImfv.plugged,
					"shared": dataImfv.shared,
					"config": dataImfv.config || null
				};
				if(dataImfv.sharedEnv){
					dbData["sharedEnv"] = dataImfv.sharedEnv;
				}

				let status = myValidator.validate(dbData, schema);
				if (!status.valid) {
					status.errors.forEach(function (err) {
						context.errors.push({code: 173, msg: `Resource ${resourceSection}: ` + err.stack});
					});
				}
				return mCb();
			},
			"validateCD": (mCb) =>{
				let cdData = dataImfv.deploy;
				if(cdData){
					let schema = context.config.schema.put["/resources/config/update"].config.validation;
					req.soajs.log.debug("Validating CD inputs ", resourceSection);

					let status = myValidator.validate(cdData, schema);
					if (!status.valid) {
						status.errors.forEach(function (err) {
							context.errors.push({code: 173, msg: `Resource ${resourceSection}: ` + err.stack});
						});
					}
				}
				return mCb();
			},
			"validateDeploy": (mCb) => {
				if(dataImfv.deploy){
					let imfv = context.config.schema.post["/cloud/services/soajs/deploy"];
					let schema = {
						"type": "object",
						"required": true,
						"properties":{
							recipe: imfv.recipe.validation,
							deployConfig: imfv.deployConfig.validation,
							autoScale: imfv.autoScale.validation,
							custom: imfv.custom.validation,
						}
					};

					req.soajs.log.debug("Validating deploy inputs ", resourceSection);
					let cdData = dataImfv.deploy.options;
					let status = myValidator.validate(cdData, schema);
					if (!status.valid) {
						status.errors.forEach(function (err) {
							context.errors.push({code: 173, msg: `Resource ${resourceSection}: ` + err.stack});
						});
					}
				}
				return mCb();
			}
		}, callback);
	},

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
		let dataImfv = {};
		context.opts.inputs.forEach((entryImfv) =>{
			if(entryImfv.name === resourceName){
				dataImfv = entryImfv;
			}
		});

		let data = {
			"env": context.environmentRecord.code.toUpperCase(),
			"resource": {
				"name": dataImfv.name,
				"type": dataImfv.type,
				"category": dataImfv.category,
				"locked": dataImfv.locked,
				"plugged": dataImfv.plugged,
				"shared": dataImfv.shared,
				"config": dataImfv.config || null
			}
		};

		if(dataImfv.sharedEnv){
			data.resource["sharedEnv"] = dataImfv.sharedEnv;
		}

		let resourceDB;
		let serviceDeploymentId;
        async.series({
                "addResource": function (mCb) {
                    req.soajs.log.debug("Adding Resource " + resourceName + " in Database under environment " + data.env);
                    lib.initBLModel(BL.resources.module, modelName, (error, cdModule) => {
                        lib.initBLModel(BL.cloud.services.module, modelName, function (serviceBL) {
                            delete data.resource["_id"];
                            req.soajs.inputmaskData = data;
                            req.soajs.inputmaskData.id = 'new';
                            req.soajs.inputmaskData.deployType = 'save';
                            if (dataImfv.deploy && Object.keys(dataImfv.deploy).length > 0) {
                                req.soajs.inputmaskData["resourceName"] = dataImfv.name;
                                req.soajs.inputmaskData["config"] = {
                                    "deploy": true,
                                    "options": dataImfv.deploy.options
                                };
                                req.soajs.inputmaskData["deployConfig"] = dataImfv.deploy.options.deployConfig;
                                req.soajs.inputmaskData["custom"] = dataImfv.deploy.options.custom;
                                req.soajs.inputmaskData["recipe"] = dataImfv.deploy.options.recipe;
                                req.soajs.inputmaskData.deployType = 'saveAndDeploy';
                            }
							if (dataImfv.deployOptions && dataImfv.deployOptions.vms){
								req.soajs.inputmaskData.vms = dataImfv.deployOptions.vms;
							}
                            if (context.template.soajs_project) {
                                req.soajs.inputmaskData.soajs_project = context.template.soajs_project;
                            }

                            cdModule.addEditResource(context.config, req, {}, serviceBL, function (error, result) {
                                lib.checkReturnError(req, mCb, {error: error, code: 600}, () => {
                                    if (result) {
                                        resourceDB = result["id"];
                                        serviceDeploymentId = result["depId"];
                                    }
                                    return mCb(null, true);
                                });
                            });
                        });
                    });
                },
            },
            (error) => {
                req.soajs.log.debug(`Resource ${resourceName} Deployment completed`);
                //generate final response and update template
                lib.checkReturnError(req, callback, {error: error, code: (error && error.code) ? error.code: 600}, () => {
                    context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status = {
                        "done": true,
                        "data": { "db": resourceDB }
                    };
                    if(serviceDeploymentId){
                        context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.data["id"] = serviceDeploymentId;
                        context.template.deploy[context.opts.stage][context.opts.group][context.opts.stepPath].status.data["mode"] = dataImfv.deploy.options.deployConfig.replication.mode;
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

				lib.initBLModel(BL.cloud.services.module, modelName, (error, servicesModule) => {
					lib.checkReturnError(req, callback, {error: error, code: 600}, () => {
						async.series({
							"removingDB": function(mCb){
								if(!data || !data.db){
									return mCb();
								}

								lib.initBLModel(BL.resources.module, modelName, (error, cdModule) => {
									lib.checkReturnError(req, mCb, {error: error, code: 600}, () => {
										req.soajs.inputmaskData = {
											env: context.environmentRecord.code,
											id: data.db
										};
										cdModule.deleteResource(context.config, req, null, servicesModule, (error, response) =>{
											lib.checkReturnError(req, mCb, {error: error, code: (error && error.code) ? error.code: 600}, () => {
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
								if(!data || !data.id){
									return mCb();
								}

								req.soajs.inputmaskData = {
									env: context.environmentRecord.code,
									serviceId: data.id,
									mode: data.mode
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
							}
						}, () =>{
							return callback(null, true);
						});
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
};

module.exports = repos;
