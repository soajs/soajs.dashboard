"use strict";
var async = require("async");
var statusUtils = require("./statusUtils");
var statusRollback = require("./statusRollback");

var predefinedSchemaSteps = {
	productize: {
		//productize
		"pre": function (req, context, fCb) {
			req.soajs.log.debug("Creating Product and Tenant ...");
			statusUtils.productize(req, context, fCb);
		},
		"rollback": function(req, context, fCb){
			req.soajs.log.debug("Removing Products and Tenants ...");
			statusRollback.removeProduct(req, context, () => {
				delete context.template.productize._id;
				delete context.template.productize.tenant;
				delete context.template.productize.extKey;
				return fCb();
			});
		},
		"status": {
			"done": false,
			"id": null
		}
	},
	cluster: {
		//cluster
		"pre": function (req, context, fCb) {
			req.soajs.log.debug("checking/creating Mongo Server...");
			statusUtils.handleClusters(req, context, fCb);
		},
		"rollback": function(req, context, fCb){
			async.series({
				"cluster": function (vCb) {
					req.soajs.log.debug("Removing Cluster...");
					statusRollback.removeCluster(req, context, vCb);
				}
			}, () => {
				delete context.template.cluster.serviceId;
				delete context.template.cluster._id;
				return fCb();
			});
		},
		"status": {
			"done": false,
			"id": null
		}
	},
	controller: {
		//cluster
		"pre": function (req, context, fCb) {
			req.soajs.log.debug("Deploying Controller ...");
			statusUtils.deployController(req, context, fCb);
		},
		"rollback": function(req, context, fCb){
			req.soajs.log.debug("Removing Controller ...");
			statusRollback.removeController(req, context, (error) => {
				if(error){
					req.soajs.log.error(error);
				}
				delete context.template.controller._id;
				return fCb();
			});
		},
		"status": {
			"done": false,
			"id": null
		}
	},
	urac: {
		//cluster
		"pre": function (req, context, fCb) {
			req.soajs.log.debug("Deploying Urac ...");
			statusUtils.deployUrac(req, context, fCb);
		},
		"rollback": function(req, context, fCb){
			req.soajs.log.debug("Removing Urac ...");
			statusRollback.removeUrac(req, context, (error) => {
				if(error){
					req.soajs.log.error(error);
				}
				delete context.template.urac._id;
				return fCb();
			});
		},
		"status": {
			"done": false,
			"id": null
		}
	},
	oauth: {
		//cluster
		"pre": function (req, context, fCb) {
			req.soajs.log.debug("Deploying oAuth ...");
			statusUtils.deployOauth(req, context, fCb);
		},
		"rollback": function(req, context, fCb){
			req.soajs.log.debug("Removing oAuth ...");
			statusRollback.removeOauth(req, context, (error) => {
				if(error){
					req.soajs.log.error(error);
				}
				delete context.template.oauth._id;
				return fCb();
			});
		},
		"status": {
			"done": false,
			"id": null
		}
	},
	nginx: {
		//nginx
		"pre": function (req, context, fCb) {
			req.soajs.log.debug("deploying nginx...");
			if (context.template.nginx.catalog) {
				context.template.nginx.recipe = context.template.nginx.catalog;
				delete context.template.nginx.catalog;
				statusUtils.deployNginx(req, context, fCb);
			}
			else {
				statusUtils.createNginxRecipe(req, context, (error) => {
					if (error) return fCb(error);
					
					statusUtils.deployNginx(req, context, fCb);
				});
			}
		},
		"rollback": function(req, context, fCb){
			async.parallel({
				"nginx": function(vCb){
					req.soajs.log.debug("Removing Nginx ...");
					statusRollback.removeNginx(req, context, vCb);
				},
				"recipe": function(vCb){
					req.soajs.log.debug("Removing Nginx Recipe ...");
					statusRollback.removeCatalog(req, context, vCb);
				}
			}, (error) => {
				if(error){
					req.soajs.log.error(error);
				}
				
				delete context.template.nginx._id;
				delete context.template.nginx.recipe;
				return fCb();
			});
		},
		"status": {
			"done": false,
			"id": null
		}
	},
	user: {
		//portal user
		"pre": function (req, context, fCb) {
			req.soajs.log.debug("creating user...");
			statusUtils.createUserAndGroup(req, context, fCb);
		},
		"post": function(req, context, fCb){
			statusUtils.createUserAndGroup(req, context, fCb);
		},
		"status": {
			"done": false,
			"id": null
		}
	}
};

var statusChecker = {
	/**
	 * deploy an environment based on template schema steps
	 * @param req
	 * @param BL
	 * @param config
	 * @param environmentRecord
	 * @param template
	 * @param cbMain
	 */
	"startDeployment": function (req, BL, config, environmentRecord, template, cbMain) {
		req.soajs.log.debug("Loading Template of type:", template.type);
		
		//function used throughout the stack to update the status of the environment being deployed
		function updateTemplate(fCb) {
			req.soajs.log.debug("updating template...");
			BL.model.updateEntry(req.soajs, {collection: 'templates', fields: {$set: template}, conditions: {code: environmentRecord.code} }, fCb);
		}
		
		//check for uploaded certificates and insert them before request ends
		req.soajs.log.debug("checking for certificates...");
		statusUtils.uploadCertificates(req, {BL, config, environmentRecord, template}, (error) => {
			if(error) return cbMain(error);
			
			/**
			 * get the schema this environment has used, extract its steps and compute how to run them, then run them
			 */
			BL.model.findEntry(req.soajs, {collection: 'templates', conditions: {type: "_" + template.type} }, (error, schema) =>{
				if(error) return cbMain(error);
				
				req.soajs.inputmaskData = req.soajs.inputmaskData || {};
				//register mandatory predefined step
				let stack = [
					{
						// update template
						"post": updateTemplate
					}
				];
				
				/**
				 * fetch and apply predefined deployment steps based on schema
				 * @type {Array}
				 */
				delete schema._id;
				delete schema.type;
				delete schema.gi;
				delete schema.deploy;
				let schemaOptions = Object.keys(schema);
				schemaOptions.forEach((schemaStepName) => {
					let oneStep = {
						"pre": function(fCb){
							predefinedSchemaSteps[schemaStepName].pre(req, {BL, environmentRecord, template, config}, fCb);
						},
						"post": updateTemplate
					};
					stack.push(oneStep);
				});
				
				/**
				 * Check for any external injected steps
				 */
				for(let section in template){
					if(template[section].wf){
						let injectedStep = {
							"pre": function(fCb){
								statusUtils.redirectTo3rdParty(req, {BL, environmentRecord, template, config}, section, fCb);
							}
						};
						
						if(template[section].wf.position){
							stack.splice(template[section].wf.position, 0, injectedStep);
						}
						else {
							stack.push(injectedStep);
						}
					}
				}
				
				/**
				 * Execute Stack Steps
				 */
				async.eachSeries(stack, (oneStep, bCb) => {
					setTimeout(() => {
						async.series(oneStep, bCb);
					}, 2000);
				}, (error) => {
					if (error) {
						/**
						 * Error happened, store error and trigger rollback
						 */
						req.soajs.log.error("Error Deploying Environment, check Deployment Status for Infomration.");
						template.error = error;
						updateTemplate((error) => {
							if (error) {
								req.soajs.log.error(error);
							}
							statusChecker.rollbackDeployment(req, {BL, config, environmentRecord, template, schemaOptions});
						});
					}
					else{
						/**
						 * Deployment of environment has completed
						 */
						req.soajs.log.debug("Environment " + environmentRecord.code + " has been deployed.");
					}
				});
				
				/**
				 * Do not wait for Async to finish, return callback, async will deploy environment in the background
				 */
				return cbMain(null, true);
			});
		});
	},
	
	/**
	 * check the progress of the environment deployment
	 * @param req
	 * @param BL
	 * @param config
	 * @param environmentRecord
	 * @param template
	 * @param cbMain
	 */
	"checkProgress": function (req, BL, config, environmentRecord, template, cbMain) {
		req.soajs.log.debug("Loading Template of type:", template.type);
		
		//function used throughout the stack to update the status of the environment being deployed
		function updateTemplate(fCb) {
			req.soajs.log.debug("updating template...");
			BL.model.updateEntry(req.soajs, {collection: 'templates', fields: {$set: template}, conditions: {code: environmentRecord.code} }, fCb);
		}
		
		/**
		 * get the schema this environment has used, extract its steps and check the status of each of its steps
		 */
		BL.model.findEntry(req.soajs, {collection: 'templates', conditions: {type: "_" + template.type} }, (error, schema) => {
			if (error) return cbMain(error);
			
			let stack = {
				"createEnvironment": {
					"done": true,
					"id": environmentRecord._id.toString()
				}
			};
			
			if (template.deploy && template.deploy.certificates) {
				stack.certificates = {};
				stack.certificates.done = true;
				stack.certificates.id = environmentRecord.code.toString();
			}
			
			/**
			 * fetch and apply predefined deployment steps based on schema
			 * @type {Array}
			 */
			delete schema._id;
			delete schema.type;
			delete schema.gi;
			delete schema.deploy;
			let schemaOptions = Object.keys(schema);
			schemaOptions.forEach((schemaStepName) => {
				//if step is completed then it has an _id
				stack[schemaStepName] = predefinedSchemaSteps[schemaStepName].status;
				if (template[schemaStepName] && template[schemaStepName]._id) {
					stack[schemaStepName].done = true;
					stack[schemaStepName].id = template[schemaStepName]._id;
				}
				//step is not completed but has a post function that needs execution
				else if(Object.hasOwnProperty.call(predefinedSchemaSteps[schemaStepName], 'post')){
					predefinedSchemaSteps[schemaStepName].post(req, {}, () => {
						updateTemplate((error) => {
							if(error) {
								req.soajs.log.error(error);
							}
						});
					});
				}
			});
			
			//formulate response for frontend
			if (template.error) {
				stack.overall = false;
				stack.error = template.error;
				return cbMain(null, stack);
			}
			
			let overallProgress = true;
			for (let stepName in stack) {
				if (!stack[stepName].done) {
					overallProgress = false;
				}
			}
			stack.overall = overallProgress;
			if(stack.overall){
				BL.model.updateEntry(req.soajs, {collection: 'environment', fields: {$unset: {pending: ''}}, conditions: {code: environmentRecord.code}, options: {multi: false, safe: true, upsert:false} }, (error) => {
					if(error){
						req.soajs.log.error(error);
					}
					return cbMain(null, stack);
				});
			}
			else{
				return cbMain(null, stack);
			}
		});
	},
	
	/**
	 * run rollback on environment deployment
	 * @param req
	 * @param context
	 */
	"rollbackDeployment": function(req, context){
		req.soajs.inputmaskData = req.soajs.inputmaskData || {};
		
		//function used throughout the stack to update the status of the environment being deployed
		function updateTemplate(fCb) {
			req.soajs.log.debug("updating template...");
			context.BL.model.updateEntry(req.soajs, {collection: 'templates', fields: {$set: context.template}, conditions: {code: context.environmentRecord.code} }, fCb);
		}
		
		// pushing mandatory step
		let stack = [
			{
				//certs
				"pre": function (fCb) {
					if(!context.template.deploy.certificates){
						return fCb();
					}
					req.soajs.log.debug("Removing Certificates...");
					statusRollback.removeCertificates(req, context, () => {
						delete context.template.deploy.certificates;
						return fCb();
					});
				},
				//update
				"u5": updateTemplate
			}
		];
		
		/**
		 * Check for any external injected steps
		 */
		for(let section in context.template){
			if(context.template[section].wf && context.template[section].wf.rollback){
				let injectedStep = {
					"pre": function(fCb){
						statusRollback.redirectTo3rdParty(req, context, section, fCb);
					},
					"update": updateTemplate
				};
				
				if(context.template[section].wf.position){
					stack.splice(context.template[section].wf.position, 0, injectedStep);
				}
				else {
					stack.push(injectedStep);
				}
			}
		}
		
		/**
		 * populate the rollback stack and run it
		 */
		for(let i = context.schemaOptions.length -1; i >=0; i--){
			let oneStep = {
				"pre": function(fCb){
					predefinedSchemaSteps[context.schemaOptions[i]].rollback(req, context, fCb);
				},
				"update": updateTemplate
			};
			stack.push(oneStep);
		}
		
		//process rollback steps
		async.eachSeries(stack, (oneStackStep, vCb) => {
			setTimeout(() => {
				async.series(oneStackStep, vCb);
			}, 2000);
		}, () => {
			req.soajs.log.info("Rollback Deploy Environment" + context.template.gi.code.toUpperCase() + " completed.");
		});
	}
};

module.exports = statusChecker;