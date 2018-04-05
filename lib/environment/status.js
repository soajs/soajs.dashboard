"use strict";
const async = require("async");

let predefinedSchemaSteps = require("./predefinedSteps");

let cachedEnvironmentStatus = {};

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
					predefinedSchemaSteps[predefinedStepFunction].validate(req, {
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
		
		//transform the __dot__ -> .
		for(let stage in template.deploy){
			for (let group in template.deploy[stage]){
				for(let section in template.deploy[stage][group]){
					if(section.indexOf("__dot__") !== -1) {
						let newSection = section.replace(/__dot__/g, ".");
						template.deploy[stage][group][newSection] = JSON.parse(JSON.stringify(template.deploy[stage][group][section]));
						delete template.deploy[stage][group][section];
					}
				}
			}
		}
		
		schemaOptions.forEach((stage) => {
			let groups = ['pre','steps','post'];
			groups.forEach((oneGroup) => {
				if(template.deploy[stage][oneGroup]){
					for(let stepPath in template.deploy[stage][oneGroup]){
						let opts = {
							'stage': stage,
							'group': oneGroup,
							'stepPath': stepPath,
							'section': (stepPath.indexOf(".") !== -1) ? stepPath.split(".") : stepPath
						};
						
						//this is the only case where the user provided inputs
						if(template.deploy[stage][oneGroup][stepPath].imfv){
							opts['inputs'] = template.deploy[stage][oneGroup][stepPath].imfv;
							injectStackStep(opts);
						}
						else if(template.deploy[stage][oneGroup][stepPath]){
							if(!template.deploy[stage][oneGroup][stepPath].imfv && !template.deploy[stage][oneGroup][stepPath].ui){
								errors.push({code: 172, msg: `Missing Input Data for: ${stage} / ${oneGroup} / ${stepPath}`});
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
		
		let project = (process.env.SOAJS_SAAS && req.soajs.inputmaskData.soajs_project) ? req.soajs.inputmaskData.soajs_project : 'local';
		
		//check the cache before proceeding
		if(req.soajs.inputmaskData.resume){
			//check if environment resume deployment has already been triggered to avoid repeated calls
			if(cachedEnvironmentStatus[project] && cachedEnvironmentStatus[project][environmentRecord.code.toUpperCase()]){
				req.soajs.log.debug("Detected recurring attempt to resume environment deployment of:", environmentRecord.code.toUpperCase(), "in project:", project);
				return cbMain(null, true);
			}
			else{
				if(!cachedEnvironmentStatus[project]){
					cachedEnvironmentStatus[project] = {};
				}
				cachedEnvironmentStatus[project][environmentRecord.code.toUpperCase()] = {};
			}
		}
		
		//function used throughout the stack to update the status of the environment being deployed
		function updateTemplate(fCb) {
			req.soajs.log.debug("updating template status...");
			
			//transform the . -> __dot__
			for(let stage in template.deploy){
				for (let group in template.deploy[stage]){
					for(let section in template.deploy[stage][group]){
						if(section.indexOf(".") !== -1) {
							let newSection = section.replace(/\./g, "__dot__");
							template.deploy[stage][group][newSection] = JSON.parse(JSON.stringify(template.deploy[stage][group][section]));
							delete template.deploy[stage][group][section];
						}
					}
				}
			}
			BL.model.saveEntry(req.soajs, {collection: 'templates', record: template}, fCb);
		}
		
		function updateEnvironment(){
			delete environmentRecord.pending;
			BL.model.saveEntry(req.soajs, {
				collection: 'environment',
				record: environmentRecord
			}, (error) => {
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
					predefinedSchemaSteps[predefinedStepFunction].deploy(req, {
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
		
		//transform the __dot__ -> .
		for(let stage in template.deploy){
			for (let group in template.deploy[stage]){
				for(let section in template.deploy[stage][group]){
					if(section.indexOf("__dot__") !== -1) {
						let newSection = section.replace(/__dot__/g, ".");
						template.deploy[stage][group][newSection] = JSON.parse(JSON.stringify(template.deploy[stage][group][section]));
						delete template.deploy[stage][group][section];
					}
				}
			}
		}
		
		schemaOptions.forEach((stage) => {
			let groups = ['pre','steps','post'];
			
			groups.forEach((oneGroup) => {
				if(template.deploy[stage][oneGroup]){
					for(let stepPath in template.deploy[stage][oneGroup]){
						let opts = {
							'stage': stage,
							'group': oneGroup,
							'stepPath': stepPath,
							'section': (stepPath.indexOf(".") !== -1) ? stepPath.split(".") : stepPath
						};
						//case of ui read only, loop in array and generate an inputs object then call utils
						if(template.deploy[stage][oneGroup][stepPath].ui && template.deploy[stage][oneGroup][stepPath].ui.readOnly){
							let dataArray = returnObjectPathFromString("content." + stepPath, template)['data'];
							let inputs = {};
							dataArray.forEach((oneDataEntry) => {
								inputs[oneDataEntry.name] = oneDataEntry;
							});
							opts['inputs'] = inputs;
						}
						//inputs equals what the user posted
						else if(template.deploy[stage][oneGroup][stepPath].imfv){
							opts['inputs'] = template.deploy[stage][oneGroup][stepPath].imfv;
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
			let timeoutValue = (process.env.SOAJS_DEPLOY_TEST) ? 10 : 1000;
			setTimeout(() => {
				async.series(oneStep, bCb);
			}, timeoutValue);
		}, (error) => {
			if (error) {
				/**
				 * Error happened, store error and trigger rollback
				 */
				req.soajs.log.error(`Error Deploying Environment ${environmentRecord.code}, check Deployment Status for Information.`);
				delete template.resume;
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
				delete template.resume;
				delete template.error;
				updateTemplate((error) => {
					if (error) {
						req.soajs.log.error(error);
					}
					
					delete environmentRecord.error;
					delete environmentRecord.pending;
					
					//clean up cache
					if(cachedEnvironmentStatus && cachedEnvironmentStatus[project] && cachedEnvironmentStatus[project][environmentRecord.code.toUpperCase()]){
						delete cachedEnvironmentStatus[project][environmentRecord.code.toUpperCase()];
						if(Object.keys(cachedEnvironmentStatus[project]).length === 0){
							delete cachedEnvironmentStatus[project];
						}
					}
					
					/**
					 * Deployment of environment has completed
					 */
					req.soajs.log.debug(`Environment ${environmentRecord.code} has been deployed.`);
					updateEnvironment();
				});
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
		if (Object.hasOwnProperty.call(req.soajs.inputmaskData, 'rollback') && req.soajs.inputmaskData.rollback) {
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
			
			//transform the __dot__ -> .
			for(let stage in template.deploy){
				for (let group in template.deploy[stage]){
					for(let section in template.deploy[stage][group]){
						if(section.indexOf("__dot__") !== -1) {
							let newSection = section.replace(/__dot__/g, ".");
							template.deploy[stage][group][newSection] = JSON.parse(JSON.stringify(template.deploy[stage][group][section]));
							delete template.deploy[stage][group][section];
						}
					}
				}
			}
			
			schemaOptions.forEach((stage) => {
				let groups = ['pre', 'steps', 'post'];
				
				groups.forEach((oneGroup) => {
					if (template.deploy[stage][oneGroup]) {
						for (let stepPath in template.deploy[stage][oneGroup]) {
							max++;
							if (template.deploy[stage][oneGroup][stepPath].status) {
								current++;
								response[stepPath] = template.deploy[stage][oneGroup][stepPath].status;
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
					predefinedSchemaSteps[predefinedStepFunction].rollback(req, {
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
		
		//transform the __dot__ -> .
		for(let stage in template.deploy){
			for (let group in template.deploy[stage]){
				for(let section in template.deploy[stage][group]){
					if(section.indexOf("__dot__") !== -1) {
						let newSection = section.replace(/__dot__/g, ".");
						template.deploy[stage][group][newSection] = JSON.parse(JSON.stringify(template.deploy[stage][group][section]));
						delete template.deploy[stage][group][section];
					}
				}
			}
		}
		
		schemaOptions.forEach((stage) => {
			let groups = ['post','steps','pre'];
			
			groups.forEach((oneGroup) => {
				if(template.deploy[stage][oneGroup]){
					
					//reverse the group step order
					let stepsInGroup = Object.keys(template.deploy[stage][oneGroup]);
					stepsInGroup = stepsInGroup.reverse();
					stepsInGroup.forEach((stepPath) => {
						
						let opts = {
							'stage': stage,
							'group': oneGroup,
							'stepPath': stepPath,
							'section': (stepPath.indexOf(".") !== -1) ? stepPath.split(".") : stepPath
						};
						if(template.deploy[stage][oneGroup][stepPath].status) {
							injectStackStep(opts);
						}
					});
				}
			});
		});
		
		//process rollback steps
		async.eachSeries(stack, (oneStackStep, vCb) => {
			let timeoutValue = (process.env.SOAJS_DEPLOY_TEST) ? 10 : 1000;
			setTimeout(() => {
				async.series(oneStackStep, vCb);
			}, timeoutValue);
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