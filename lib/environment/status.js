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
		"rollback": function (req, context, fCb) {
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
		"rollback": function (req, context, fCb) {
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
		"rollback": function (req, context, fCb) {
			req.soajs.log.debug("Removing Controller ...");
			statusRollback.removeController(req, context, (error) => {
				if (error) {
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
		"rollback": function (req, context, fCb) {
			req.soajs.log.debug("Removing Urac ...");
			statusRollback.removeUrac(req, context, (error) => {
				if (error) {
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
		"rollback": function (req, context, fCb) {
			req.soajs.log.debug("Removing oAuth ...");
			statusRollback.removeOauth(req, context, (error) => {
				if (error) {
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
				//force port extraction and storing
				statusUtils.getAPIInfo(context.template, context.template.nginx, 'apiPrefix');
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
		"rollback": function (req, context, fCb) {
			async.parallel({
				"nginx": function (vCb) {
					req.soajs.log.debug("Removing Nginx ...");
					statusRollback.removeNginx(req, context, vCb);
				},
				"recipe": function (vCb) {
					req.soajs.log.debug("Removing Nginx Recipe ...");
					statusRollback.removeCatalog(req, context, vCb);
				}
			}, (error) => {
				if (error) {
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
			if (!context.template.user) {
				context.template.user = {count: 0};
			}
			statusUtils.createUserAndGroup(req, context, fCb);
		},
		"post": function (req, context, fCb) {
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
			BL.model.saveEntry(req.soajs, {collection: 'templates', record: template}, fCb);
		}
		
		//check for uploaded certificates and insert them before request ends
		req.soajs.log.debug("checking for certificates...");
		statusUtils.uploadCertificates(req, {BL, config, environmentRecord, template}, (error) => {
			if (error) return cbMain(error);
			
			/**
			 * get the schema this environment has used, extract its steps and compute how to run them, then run them
			 */
			BL.model.findEntry(req.soajs, {
				collection: 'templates',
				conditions: {type: "_" + template.type}
			}, (error, schema) => {
				if (error) return cbMain(error);
				
				if (!schema) {
					return cbMain(new Error("Failed loading template for: " + environmentRecord.code));
				}
				
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
						"pre": function (fCb) {
							predefinedSchemaSteps[schemaStepName].pre(req, {
								BL,
								environmentRecord,
								template,
								config
							}, fCb);
						},
						"post": updateTemplate
					};
					stack.push(oneStep);
				});
				
				/**
				 * Check for any external injected steps
				 */
				for (let section in template) {
					if (template[section].wf && template[section].wf.deploy) {
						let injectedStep = {
							"pre": function (fCb) {
								statusUtils.redirectTo3rdPartyDeploy(req, {
									BL,
									environmentRecord,
									template,
									config
								}, section, fCb);
							},
							"update": updateTemplate
						};
						
						if (template[section].position) {
							stack.splice(template[section].position - 1, 0, injectedStep);
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
					}, 1000);
				}, (error) => {
					if (error) {
						/**
						 * Error happened, store error and trigger rollback
						 */
						req.soajs.log.error("Error Deploying Environment, check Deployment Status for Infomration.");
						template.error = error.message;
						
						updateTemplate((error) => {
							if (error) {
								req.soajs.log.error(error);
							}
							
							BL.model.updateEntry(req.soajs, {
								collection: 'environment',
								fields: {
									$unset: {pending: ''},
									$set: {error: template.error.message}
								},
								conditions: {code: environmentRecord.code},
								options: {multi: false, safe: true, upsert: false}
							}, (error) => {
								if (error) {
									req.soajs.log.error(error);
								}
							});
						});
					}
					else {
						/**
						 * Deployment of environment has completed
						 */
						req.soajs.log.debug("Environment " + environmentRecord.code + " has been deployed.");
						BL.model.updateEntry(req.soajs, {
							collection: 'environment',
							fields: {
								$unset: {pending: '', error: ''}
							},
							conditions: {code: environmentRecord.code},
							options: {multi: false, safe: true, upsert: false}
						}, (error) => {
							if (error) {
								req.soajs.log.error(error);
							}
						});
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
			BL.model.updateEntry(req.soajs, {
				collection: 'templates',
				fields: {$set: template},
				conditions: {code: environmentRecord.code}
			}, fCb);
		}
		
		/**
		 * get the schema this environment has used, extract its steps and check the status of each of its steps
		 */
		BL.model.findEntry(req.soajs, {
			collection: 'templates',
			conditions: {type: "_" + template.type}
		}, (error, schema) => {
			if (error) return cbMain(error);
			
			if (!schema) {
				return cbMain(new Error("Failed loading template for: " + environmentRecord.code));
			}
			
			let response = {
				overall: false
			};
			let stack = [];
			stack.push({
				"createEnvironment": function (fCb) {
					response.createEnvironment = {
						"done": true,
						"id": environmentRecord._id.toString()
					};
					return fCb();
				}
			});
			
			if (template.deploy && template.deploy.certificates) {
				stack.push({
					certificates: function (fCb) {
						response.certificates = {
							done: true,
							id: environmentRecord.code.toString()
						};
						return fCb();
					}
				});
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
			
			//if input has rollback
			if (req.soajs.inputmaskData.rollback) {
				statusChecker.rollbackDeployment(req, {BL, config, environmentRecord, template, schemaOptions}, cbMain);
			}
			else {
				schemaOptions.forEach((schemaStepName) => {
					//if step is completed then it has an _id
					if (template[schemaStepName]) {
						let oneStep = {};
						oneStep[schemaStepName] = function (fCb) {
								response[schemaStepName] = JSON.parse(JSON.stringify(predefinedSchemaSteps[schemaStepName].status));
								if (template[schemaStepName]._id) {
									response[schemaStepName].done = true;
									response[schemaStepName].id = template[schemaStepName]._id;
									if (template[schemaStepName].exception) {
										response[schemaStepName].exception = template[schemaStepName].exception;
									}
									return fCb();
								}
								//step is not completed but has a post function that needs execution
								else if (Object.hasOwnProperty.call(predefinedSchemaSteps[schemaStepName], 'post')) {
									predefinedSchemaSteps[schemaStepName].post(req, {
										BL,
										config,
										environmentRecord,
										template
									}, () => {
										if (template[schemaStepName] && template[schemaStepName]._id) {
											response[schemaStepName].done = true;
											response[schemaStepName].id = template[schemaStepName]._id;
											if (template[schemaStepName].exception) {
												response[schemaStepName].exception = template[schemaStepName].exception;
											}
										}
										return fCb();
									});
								}
								else {
									return fCb();
								}
							};
						oneStep.update = updateTemplate;
						stack.push(oneStep);
					}
				});
				
				/**
				 * Check for any external injected steps
				 */
				for (let section in template) {
					if (template[section].wf && template[section].wf.status) {
						response[section] = {done: false, id: null};
						let injectedStep = {};
						injectedStep[section] = function (fCb) {
							statusUtils.redirectTo3rdPartyStatus(req, {
								BL,
								environmentRecord,
								template,
								config
							}, section, (error, data) => {
								if (error) {
									req.soajs.log.error(error);
								}
								else {
									if (data) {
										response[section] = {
											done: true,
											id: template[section]._id
										};
										if(template[section].info){
											response[section].info = template[section].info;
										}
									}
								}
								return fCb();
							});
						};
						injectedStep.update = updateTemplate;
						
						if (template[section].position) {
							stack.splice(template[section].position - 1, 0, injectedStep);
						}
						else {
							stack.push(injectedStep);
						}
					}
				}
				
				async.eachSeries(stack, (oneStackStep, vCb) => {
					async.series(oneStackStep, vCb);
				}, (error, overallResponse) => {
					if (error) {
						template.error = error;
						response.overall = false;
						response.error = template.error;
						
						BL.model.updateEntry(req.soajs, {
							collection: 'environment',
							fields: {
								$unset: {pending: ''},
								$set: {error: error.message}
							},
							conditions: {code: environmentRecord.code},
							options: {multi: false, safe: true, upsert: false}
						}, (error) => {
							if (error) {
								req.soajs.log.error(error);
							}
							return cbMain(null, response);
						});
					}
					else {
						//formulate response for frontend
						if (template.error) {
							response.overall = false;
							response.error = template.error;
						}
						
						let overallProgress = true;
						stack.forEach((oneEntry) => {
							for(let stepName in oneEntry){
								if(stepName !== 'update'){
									if (!response[stepName] || !response[stepName].done) {
										overallProgress = false;
									}
								}
							}
						});
						
						if(overallResponse){
							delete response.error;
						}
						
						response.overall = overallProgress;
						if (response.overall) {
							BL.model.updateEntry(req.soajs, {
								collection: 'environment',
								fields: {
									$unset: {pending: '', error: ''}
								},
								conditions: {code: environmentRecord.code},
								options: {multi: false, safe: true, upsert: false}
							}, (error) => {
								if (error) {
									req.soajs.log.error(error);
								}
								return cbMain(null, response);
							});
						}
						else {
							return cbMain(null, response);
						}
					}
				});
			}
			
		});
	},
	
	/**
	 * run rollback on environment deployment
	 * @param req
	 * @param context
	 */
	"rollbackDeployment": function (req, context, cbMain) {
		req.soajs.inputmaskData = req.soajs.inputmaskData || {};
		let upToStep;
		if (typeof(req.soajs.inputmaskData.rollback) === 'number') {
			upToStep = req.soajs.inputmaskData.rollback;
		}
		
		//function used throughout the stack to update the status of the environment being deployed
		function updateTemplate(fCb) {
			req.soajs.log.debug("updating template...");
			context.BL.model.updateEntry(req.soajs, {
				collection: 'templates',
				fields: {$set: context.template},
				conditions: {code: context.environmentRecord.code}
			}, fCb);
		}
		
		// pushing mandatory step
		let stack = [
			{
				//certs
				"pre": function (fCb) {
					if (!context.template.deploy.certificates) {
						return fCb();
					}
					req.soajs.log.debug("Removing Certificates...");
					statusRollback.removeCertificates(req, context, (error) => {
						if (error) {
							return fCb(error);
						}
						
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
		for (let section in context.template) {
			if (context.template[section].wf && context.template[section].wf.rollback) {
				let injectedStep = {
					"pre": function (fCb) {
						statusRollback.redirectTo3rdParty(req, context, section, fCb);
					},
					"update": updateTemplate
				};
				
				if (context.template[section].position) {
					stack.splice(context.template[section].position - 1, 0, injectedStep);
				}
				else {
					stack.push(injectedStep);
				}
			}
		}
		
		/**
		 * populate the rollback stack and run it
		 */
		if (upToStep) {
			stack.slice(upToStep);
			console.log(stack);
			process.exit();
		}
		
		for (let i = context.schemaOptions.length - 1; i >= 0; i--) {
			if (context.template[context.schemaOptions[i]] && Object.hasOwnProperty.call(predefinedSchemaSteps[context.schemaOptions[i]], 'rollback')) {
				let oneStep = {
					"pre": function (fCb) {
						predefinedSchemaSteps[context.schemaOptions[i]].rollback(req, context, fCb);
					},
					"update": updateTemplate
				};
				stack.push(oneStep);
			}
		}
		
		//process rollback steps
		async.eachSeries(stack, (oneStackStep, vCb) => {
			setTimeout(() => {
				async.series(oneStackStep, vCb);
			}, 1000);
		}, (error) => {
			if (error) {
				context.BL.model.updateEntry(req.soajs, {
					collection: 'environment',
					fields: {
						$unset: {pending: ''},
						$set: {error: error.message}
					},
					conditions: {code: context.environmentRecord.code},
					options: {multi: false, safe: true, upsert: false}
				}, cbMain);
			}
			else {
				req.soajs.log.info("Rollback Deploy Environment" + context.template.gi.code.toUpperCase() + " completed.");
				context.BL.model.updateEntry(req.soajs, {
					collection: 'environment',
					fields: {
						$unset: {pending: '', error: ''}
					},
					conditions: {code: context.environmentRecord.code},
					options: {multi: false, safe: true, upsert: false}
				}, cbMain);
			}
		});
	}
};

module.exports = statusChecker;