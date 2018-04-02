"use strict";
const async = require("async");
const statusUtils = require("./statusUtils");

let predefinedSchemaSteps = {
	custom_registry: {
		validate: function(req, context, fCb){
			statusUtils.custom_registry(req, context, 'validate', fCb);
		},
		deploy: function(req, context, fCb){
			statusUtils.custom_registry(req, context, 'deploy', fCb);
		},
		rollback: function (req, context, fCb) {
			statusUtils.custom_registry(req, context, 'rollback', fCb);
		}
	},
	products: {
		deploy: function(req, context, fCb){
			statusUtils.products(req, context, 'deploy', fCb);
		},
		rollback: function (req, context, fCb) {
			statusUtils.products(req, context, 'rollback', fCb);
		}
	},
	tenants: {
		deploy: function(req, context, fCb){
			statusUtils.tenants(req, context, 'deploy', fCb);
		},
		rollback: function (req, context, fCb) {
			statusUtils.tenants(req, context, 'rollback', fCb);
		}
	},
	secrets: {
		validate: function(req, context, fCb){
			statusUtils.secrets(req, context, 'validate', fCb);
		},
		deploy: function(req, context, fCb){
			statusUtils.secrets(req, context, 'deploy', fCb);
		},
		rollback: function (req, context, fCb) {
			statusUtils.secrets(req, context, 'rollback', fCb);
		}
	},
	repos: {
		validate: function(req, context, fCb){
			statusUtils.repos(req, context, 'validate', fCb);
		},
		deploy: function(req, context, fCb){
			statusUtils.repos(req, context, 'deploy', fCb);
		},
		rollback: function (req, context, fCb) {
			statusUtils.repos(req, context, 'rollback', fCb);
		}
	},
	resources: {
		validate: function(req, context, fCb){
			statusUtils.resources(req, context, 'validate', fCb);
		},
		deploy: function(req, context, fCb){
			statusUtils.resources(req, context, 'deploy', fCb);
		},
		rollback: function (req, context, fCb) {
			statusUtils.resources(req, context, 'rollback', fCb);
		}
	},
	thirdPartStep:{
		validate: function(req, context, fCb){
			statusUtils.thirdPartStep(req, context, 'validate', fCb);
		},
		deploy: function(req, context, fCb){
			statusUtils.thirdPartStep(req, context, 'deploy', fCb);
		},
		rollback: function (req, context, fCb) {
			statusUtils.thirdPartStep(req, context, 'rollback', fCb);
		}
	}
};

const statusChecker = {
	
	/**
	 * Validate that the template arriving from inputmaskData sections have the needed input schema so that parsing won't break in later steps
	 * @param req
	 * @param BL
	 * @param config
	 * @param cbMain
	 */
	"validateDeploymentInputs": function(req, BL, config, environmentRecord, template, cbMain){
		let errors = [];
		let stack = [];
		
		function injectStackStep(opts){
			
			let contentSection = opts.section;
			let subSection;
			if(Array.isArray(contentSection)){
				subSection = contentSection[1];
				contentSection = contentSection[0];
			}
			
			let predefinedStepFunction;
			//check if template has a content entry for level 0 of this section
			if(template.content[contentSection]){
				//works for both sections with sub or sections with main only
				predefinedStepFunction = subSection || contentSection;
			}
			//no content entry at level 0, this is a third party call
			else{
				predefinedStepFunction = "thirdPartStep";
			}
			
			let oneStep = {
				"pre": function (fCb) {
					predefinedSchemaSteps[predefinedStepFunction].validate(req.soajs, {
						BL,
						environmentRecord,
						template,
						opts,
						config,
						errors
					}, fCb);
				}
			};
			stack.push(oneStep);
		}
		
		let schemaOptions = Object.keys(template.deploy);
		schemaOptions.forEach((stage) => {
			let groups = ['pre','steps','post'];
			
			groups.forEach((oneGroup) => {
				if(schemaOptions[stage][oneGroup]){
					for(let stepPath in schemaOptions[stage][oneGroup]){
						let opts = {
							'stage': stage,
							'group': oneGroup,
							'stepPath': stepPath,
							'section': (stepPath.indexOf(".") !== -1) ? stepPath.split(".") : stepPath
						};
						
						//this is the only case where the user provided inputs
						if(schemaOptions[stage][oneGroup][stepPath].imfv){
							opts['inputs'] = schemaOptions[stage][oneGroup][stepPath].imfv;
							injectStackStep(opts);
						}
						else if(schemaOptions[stage][oneGroup][stepPath]){
							if(!schemaOptions[stage][oneGroup][stepPath].imfv){
								errors.push(new Error("Missing Input Data for:", stage, oneGroup, stepPath));
							}
						}
					}
				}
			});
		});
		
		//check if errors before processing stack
		if(errors.length > 0){
			return cbMain(errors);
		}
		else{
			/**
			 * Execute Stack Steps
			 */
			async.eachSeries(stack, (oneStep, bCb) => { async.series(oneStep, bCb); }, () => {
				if(errors.length > 0){
					return cbMain(errors);
				}
				return cbMain(null, true);
			});
		}
	},
	
	/**
	 * deploy an environment based on template schema steps
	 * @param req
	 * @param BL
	 * @param config
	 * @param environmentRecord
	 * @param template
	 * @param cbMain
	 */
	"resumeDeployment": function (req, BL, config, environmentRecord, template, cbMain) {
		
		//function used throughout the stack to update the status of the environment being deployed
		function updateTemplate(fCb) {
			req.soajs.log.debug("updating template status...");
			BL.model.saveEntry(req.soajs, {collection: 'templates', record: template}, fCb);
		}
		
		function updateEnvironment(){
			delete environmentRecord.pending;
			BL.model.save('environment', environmentRecord, (error) => {
				if (error) {
					req.soajs.log.error(error);
				}
				//close db
				BL.model.closeConnection(req.soajs);
			});
		}
		
		function returnObjectPathFromString(stringPath, mainObj){
			
			function index(obj,i) {return obj[i]}
			
			return stringPath.split('.').reduce(index, mainObj);
		}
		
		function injectStackStep(opts){
			
			let contentSection = opts.section;
			let subSection;
			if(Array.isArray(contentSection)){
				subSection = contentSection[1];
				contentSection = contentSection[0];
			}
			
			let predefinedStepFunction;
			//check if template has a content entry for level 0 of this section
			if(template.content[contentSection]){
				//works for both sections with sub or sections with main only
				predefinedStepFunction = subSection || contentSection;
			}
			//no content entry at level 0, this is a third party call
			else{
				predefinedStepFunction = "thirdPartStep";
			}
			
			let oneStep = {
				"pre": function (fCb) {
					predefinedSchemaSteps[predefinedStepFunction].deploy(req.soajs, {
						BL,
						environmentRecord,
						template,
						opts,
						config
					}, fCb);
				},
				"post": updateTemplate
			};
			stack.push(oneStep);
		}
		
		//register mandatory predefined step
		let stack = [];
		
		/**
		 * fetch and apply predefined deployment steps based on schema
		 * @type {Array}
		 */
		let schemaOptions = Object.keys(template.deploy);
		schemaOptions.forEach((stage) => {
			let groups = ['pre','steps','post'];
			
			groups.forEach((oneGroup) => {
				if(schemaOptions[stage][oneGroup]){
					for(let stepPath in schemaOptions[stage][oneGroup]){
						let opts = {
							'stage': stage,
							'group': oneGroup,
							'stepPath': stepPath,
							'section': (stepPath.indexOf(".") !== -1) ? stepPath.split(".") : stepPath
						};
						//case of ui read only, loop in array and generate an inputs object then call utils
						if(schemaOptions[stage][oneGroup][stepPath].ui && schemaOptions[stage][oneGroup][stepPath].ui.readOnly){
							let dataArray = returnObjectPathFromString("content." + stepPath)['data'];
							let inputs = {};
							dataArray.forEach((oneDataEntry) => {
								inputs[oneDataEntry.name] = oneDataEntry;
							});
							opts['inputs'] = inputs;
						}
						//inputs equals what the user posted
						else if(schemaOptions[stage][oneGroup][stepPath].imfv){
							opts['inputs'] = schemaOptions[stage][oneGroup][stepPath].imfv;
						}
						
						if(opts['inputs']){
							injectStackStep(opts);
						}
					}
				}
			});
		});
		
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
				req.soajs.log.error(`Error Deploying Environment ${environmentRecord.code}, check Deployment Status for Information.`);
				
				template.error = error.msg || error.message;
				updateTemplate((error) => {
					if (error) {
						req.soajs.log.error(error);
					}
					
					environmentRecord.error = template.error;
					updateEnvironment();
				});
			}
			else {
				/**
				 * Deployment of environment has completed
				 */
				req.soajs.log.debug(`Environment ${environmentRecord.code} has been deployed.`);
				updateEnvironment();
			}
		});
		
		/**
		 * Do not wait for Async to finish, return callback, async will deploy environment in the background
		 */
		return cbMain(null, true);
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
		let rollbackGo = false;
		if (Object.hasOwnProperty.call(req.soajs.inputmaskData, 'rollback')) {
			rollbackGo = true;
		}
		
		//if input has rollback
		if (rollbackGo) {
			statusChecker.rollbackDeployment(req, BL, config, environmentRecord, template, cbMain);
		}
		else {
			req.soajs.log.debug("Loading Template:", environmentRecord.code);
			let response = {
				completed: false,
				overall: 0
			};
			let max = 0;
			let current = 0;
			response.createEnvironment = {
				"done": true,
				"id": environmentRecord._id.toString()
			};
			
			let schemaOptions = Object.keys(template.deploy);
			schemaOptions.forEach((stage) => {
				let groups = ['pre', 'steps', 'post'];
				
				groups.forEach((oneGroup) => {
					if (schemaOptions[stage][oneGroup]) {
						for (let stepPath in schemaOptions[stage][oneGroup]) {
							max++;
							if (schemaOptions[stage][oneGroup][stepPath].status) {
								current++;
								if(schemaOptions[stage][oneGroup][stepPath].status.rollback){
									delete schemaOptions[stage][oneGroup][stepPath].status.rollback;
								}
								response[stepPath] = schemaOptions[stage][oneGroup][stepPath].status;
							}
						}
					}
				});
			});
			
			response.overall = current / max;
			return cbMain(null, response);
			
		}
	},
	
	/**
	 * run rollback on environment deployment
	 * @param req
	 * @param BL
	 * @param config
	 * @param environmentRecord
	 * @param template
	 * @param cbMain
	 */
	"rollbackDeployment": function (req, BL, config, environmentRecord, template, cbMain) {
		//function used throughout the stack to update the status of the environment being deployed
		function removeTemplate() {
			req.soajs.log.debug(`Removing template of ${environmentRecord.code} ...`);
			BL.model.removeEntry(req.soajs, {collection: 'templates', conditions: {'_id': template._id} }, cbMain);
		}
		
		function injectStackStep(opts){
			
			let contentSection = opts.section;
			let subSection;
			if(Array.isArray(contentSection)){
				subSection = contentSection[1];
				contentSection = contentSection[0];
			}
			
			let predefinedStepFunction;
			//check if template has a content entry for level 0 of this section
			if(template.content[contentSection]){
				//works for both sections with sub or sections with main only
				predefinedStepFunction = subSection || contentSection;
			}
			//no content entry at level 0, this is a third party call
			else{
				predefinedStepFunction = "thirdPartStep";
			}
			
			let oneStep = {
				"pre": function (fCb) {
					predefinedSchemaSteps[predefinedStepFunction].rollback(req.soajs, {
						BL,
						environmentRecord,
						template,
						opts,
						config
					}, fCb);
				}
			};
			stack.push(oneStep);
		}
		
		let stack = [];
		let schemaOptions = Object.keys(template.deploy);
		schemaOptions.forEach((stage) => {
			let groups = ['post','steps','pre'];
			
			groups.forEach((oneGroup) => {
				if(schemaOptions[stage][oneGroup]){
					
					//reverse the group step order
					let stepsInGroup = Object.keys(schemaOptions[stage][oneGroup]);
					stepsInGroup = stepsInGroup.reverse();
					stepsInGroup.forEach((stepPath) => {
						
						let opts = {
							'stage': stage,
							'group': oneGroup,
							'stepPath': stepPath,
							'section': (stepPath.indexOf(".") !== -1) ? stepPath.split(".") : stepPath
						};
						if(schemaOptions[stage][oneGroup][stepPath].status) {
							injectStackStep(opts);
						}
					});
				}
			});
		});
		
		//process rollback steps
		async.eachSeries(stack, (oneStackStep, vCb) => {
			setTimeout(() => {
				async.series(oneStackStep, vCb);
			}, 1000);
		}, (error) => {
			if (error) {
				req.soajs.log.error(error);
			}
			req.soajs.log.info(`Rollback Deploy Environment ${environmentRecord.code} completed.`);
			removeTemplate();
		});
	}
};

module.exports = statusChecker;