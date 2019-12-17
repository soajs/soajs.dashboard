'use strict';
const fs = require("fs");
const async = require("async");
const shortid = require('shortid');
let vmModule = require("../vm/index.js");
const utils = require("../../../utils/utils.js");
const soajsUtils = require("soajs.core.libs").utils;
const soajsLib = require("soajs.core.libs");
shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_');
let dbModel = "mongo";
const colls = {
	env: 'environment',
	git: 'git_accounts',
	services: 'services',
	daemons: 'daemons',
	staticContent: 'staticContent',
	catalog: 'catalogs',
	cicd: 'cicd',
	infra: 'infra',
	resources: 'resources'
};

const helpers = require("./helper.js");

let BL = {
	model: null,

	/**
	 *
	 * @param {Object} soajs
	 * @param {Function} mainCb
	 * @param {Object} data
	 * @param {Function} cb
	 */
	checkIfError: (soajs, mainCb, data, cb) => {
		// if (data.error) {
		// 	soajs.log.error(data.error);
		// }
		utils.checkErrorReturn(soajs, mainCb, data, cb);
	},
	/**
	 *
	 * @param {Object} config
	 * @param {Object} req
	 * @param {Object} deployer
	 * @param {Function} cbMain
	 */
	"deployService": (config, req, deployer, cbMain) => {
		let soajs = req.soajs;
		let options = {};
		soajs.log.info('deployService start');
		let deployment, vms;
		if (soajs.inputmaskData.deployConfig && soajs.inputmaskData.deployConfig.type === 'vm') {
			deployment = "vm";
			vms = soajs.inputmaskData.vms ? soajs.inputmaskData.vms : [];
		}
		else {
			deployment = "container";
		}
		async.auto({
			getEnvInfo: (fCb) => {
				soajs.log.info('get environment record for', soajs.inputmaskData.env);
				utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env.toUpperCase(), (error, envRecord) => {
					BL.checkIfError(soajs, fCb, {config: config, error: error || !envRecord, code: 600}, () => {
						options = utils.buildDeployerOptions(envRecord, soajs, BL, {technology: deployment});
						options.params = {
							data: {
								variables: {}
							}
						};

						options.params.data.variables['$SOAJS_NX_DOMAIN'] = envRecord.domain;
						options.params.data.variables['$SOAJS_NX_SITE_DOMAIN'] = envRecord.sitePrefix + "." + envRecord.domain;
						options.params.data.variables['$SOAJS_NX_API_DOMAIN'] = envRecord.apiPrefix + "." + envRecord.domain;
						if (envRecord.code === 'PORTAL') {
							options.params.data.variables['$SOAJS_NX_PORTAL_DOMAIN'] = envRecord.portalPrefix + "." + envRecord.domain;
						}
						
						if(deployment === 'vm'){
							if(!envRecord.restriction){
								return fCb(new Error("This environment does not support Creating virtual machine Clusters"));
							}
							soajs.inputmaskData.infraId = Object.keys(envRecord.restriction)[0];
							
							if(!soajs.inputmaskData.infraId){
								return fCb(new Error("This environment is not associated to any cloud provider and therefore does not support Creating virtual machine Clusters"));
							}
							if(soajs.inputmaskData.deployConfig && soajs.inputmaskData.deployConfig.infra) {
								soajs.inputmaskData.deployConfig.infra = soajs.inputmaskData.infraId;
							}
						}
						
						return fCb(null, envRecord);
					});
				});
			},

			getCatalogAndInfra: ['getEnvInfo', (info, fCb) => {
				soajs.log.debug('get Catalog AndInfra');
				async.auto({
					// if action was rebuild get needed information from inspect service and fill inputmaskData with needed input
					// else move forward
					inspectService: (callback) => {
						if (soajs.inputmaskData.action !== 'rebuild' || deployment === "vm") {
							return callback();
						}

						let originalOptions = JSON.parse(JSON.stringify(options.params));
						soajs.log.info('inspecting service');
						options.params = {
							id: soajs.inputmaskData.serviceId,
							mode: soajs.inputmaskData.mode || null,
							excludeTasks: true
						};

						deployer.execute({
							'type': 'container',
							'driver': options.strategy
						}, 'inspectService', options, (error, record) => {
							options.params = originalOptions;
							BL.checkIfError(soajs, callback, {config: config, error: error}, () => {
								BL.checkIfError(soajs, callback, {
									config: config,
									error: !record.service || !record.service.labels || !record.service.labels['soajs.catalog.id'],
									code: 954
								}, () => {
									helpers.computeInspectService(soajs, record, callback);
								});
							});
						});
					},

					//wait until inspectService service and then get catalog recipe
					getCatalogRecipe: ['inspectService', (result, callback) => {
						soajs.log.debug('get Catalog Recipe');
						BL.model.validateCustomId(soajs, soajs.inputmaskData.recipe, (error, recipeId) => {
							BL.checkIfError(soajs, callback, {
								config: config,
								error: error || !recipeId,
								code: 701
							}, () => {
								let opts = {
									collection: colls.catalog,
									conditions: {
										_id: recipeId
									}
								};
								soajs.log.info(opts);
								BL.model.findEntry(soajs, opts, (error, catalogRecord) => {
									BL.checkIfError(soajs, callback, {config: config, error: error, code: 600}, () => {
										BL.checkIfError(soajs, callback, {
											config: config,
											error: !catalogRecord,
											code: 950
										}, () => {
											if (catalogRecord.recipe && catalogRecord.recipe.deployOptions) {
												if (catalogRecord.recipe.deployOptions.readinessProbe) {
													if (typeof catalogRecord.recipe.deployOptions.readinessProbe !== 'object' || Object.keys(catalogRecord.recipe.deployOptions.readinessProbe).length === 0) {
														catalogRecord.recipe.deployOptions.readinessProbe = null;
													}
												}
												if (catalogRecord.recipe.deployOptions.livenessProbe) {
													if (catalogRecord.recipe && catalogRecord.recipe.deployOptions && catalogRecord.recipe.deployOptions.livenessProbe) {
														if (typeof catalogRecord.recipe.deployOptions.livenessProbe !== 'object' || Object.keys(catalogRecord.recipe.deployOptions.livenessProbe).length === 0) {
															catalogRecord.recipe.deployOptions.livenessProbe = null;
														}
													}
												}
											}
											return callback(null, catalogRecord);
										});
									});
								});
							});
						});
					}],

					//wait until inspectService service and then get infra record
					getInfraRecord: ['inspectService', (result, callback) => {
						soajs.log.debug('get Infra Record');
						helpers.getInfraRecord(soajs, config, BL, callback);
					}]
				}, (err, result) => {
					if (err) {
						soajs.log.error(err);
						return fCb(err);
					}
					//fill options with needed information
					options.params.catalog = result.getCatalogRecipe;
					options.infra = result.getInfraRecord;
					options.params.inputmaskData = soajs.inputmaskData;
					return fCb(null, result);
				});
			}],

			getDashboardExtKey: ['getCatalogAndInfra', (result, fCb) => {
				soajs.log.debug('get Dashboard ExtKey');
				helpers.getDefaultUIExtKey(soajs, config, BL, (err, result)=>{
					console.log(result)
					if (result) {
						options.params.data.variables['$SOAJS_EXTKEY'] = result;
					}
					return fCb(null, result);
				});
			}],
			
			getCDRecord: ['getDashboardExtKey', 'getEnvInfo', (result, fCb) => {
				soajs.log.debug('get cd record');
				if (deployment === "vm" || soajs.inputmaskData.action !== 'rebuild') {
					return fCb();
				}
				let recordType;
				if (soajs.inputmaskData.custom){
					if (soajs.inputmaskData.custom.type === 'service') {
						recordType = 'cd';
					}
					if (soajs.inputmaskData.custom.resourceId) {
						recordType = 'resource';
					}
				}
				
				if (recordType) {
					let cond = {
						collection: colls.cicd,
						conditions: {
							type: recordType
						}
					};
					
					BL.model.findEntry(soajs, cond, function (error, ciCdRecord) {
						BL.checkIfError(soajs, fCb, {
							config: config,
							error: error,
							code: 600
						}, () => {
							if (!ciCdRecord) {
								return fCb();
							}
							let env = soajs.inputmaskData.env;
							if (soajs.inputmaskData.custom) {
								let name = soajs.inputmaskData.custom.name;
								if (soajs.inputmaskData.custom.version){
									let version = 'v' + soajs.inputmaskData.custom.version;
									if (ciCdRecord && ciCdRecord[env]
										&& ciCdRecord[env][name]
										&& ciCdRecord[env][name][version]
										&& ciCdRecord[env][name][version].options
										&& ciCdRecord[env][name][version].options.custom) {
										if (ciCdRecord[env][name][version].options.custom.exposeServicePort
											&& ciCdRecord[env][name][version].options.custom.exposeServicePortValue) {
											soajs.inputmaskData.custom.exposeServicePort = ciCdRecord[env][name][version].options.custom.exposeServicePort;
											soajs.inputmaskData.custom.exposeServicePortValue = ciCdRecord[env][name][version].options.custom.exposeServicePortValue;
										}
									}
								}
								else {
									//we have to override the custom data coming from the ui with the one from ci
									if (ciCdRecord && ciCdRecord[env]
										&& ciCdRecord[env][name]
										&& ciCdRecord[env][name].options
										&& ciCdRecord[env][name].options.custom) {
										soajs.inputmaskData.custom = ciCdRecord[env][name].options.custom;
									}
								}
							}
							return fCb();
						});
					});
				} else {
					return fCb();
				}
			}],
			
			getGitAndServiceDaemonInfo: ['getCDRecord', (result, fCb) => {
				soajs.log.debug('get GitAnd ServiceDaemonInfo');
				async.parallel({
					//get git info for service
					getGitInfo: (callback) => {
						helpers.getGitInfo(soajs, options, config, BL, callback);
					},
					// service and daemon information
					getServiceDaemonInfo: (callback) => {
						helpers.getServiceDaemonInfo(soajs, options, result, config, BL, callback);
					}
				}, fCb);
			}],
			
			// gather all ports from all sources (service-daemon, custom ports, and recipe)
			portComputing: ['getGitAndServiceDaemonInfo', (result, fCb) => {
				soajs.log.debug('port Computing');
				if (deployment === "vm") {
					return fCb();
				}
				helpers.portComputing(soajs, options, result, fCb);
			}],
			
			// gather all ports from all sources (service-daemon, custom ports, and recipe)
			computeReadinessProbe: ['portComputing', (result, fCb) => {
				soajs.log.debug('compute readiness probe');
				if (deployment === "vm") {
					return fCb();
				}
				helpers.computeReadinessProbe(soajs, options, result, fCb);
			}],
		}, (err, deployServiceFSMResult) => {
			BL.checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, () => {

				let cloostroAction;
				options.params.inputmaskData = soajs.inputmaskData;
				options.params.action = soajs.inputmaskData.action || "deploy";
				cloostroAction = options.params.action;
				let technology = soajs.inputmaskData.technology || options.strategy;
				options.infra.info = utils.getDeploymentFromInfra(options.infra, options.env);
				if (options.infra.info) {
					options.infra.stack = options.infra.info[0];
				}
				delete options.soajs.inputmaskData;
				delete options.model;
				
				//if controller remove the version
				if(options.params.inputmaskData && options.params.inputmaskData.custom && options.params.inputmaskData.custom.name === 'controller'){
					options.params.inputmaskData.custom.version = 1;
					if(technology === 'docker'){
						delete options.params.inputmaskData.custom.version;
					}
				}
				//update environment record
				//update infra record
				//update CiCD record
				//update ledger record

				helpers.registerCiCd(soajs, options, config, BL, (error) => {
					BL.checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, () => {

						let optionsCopy = JSON.parse(JSON.stringify(options.params));
						if (deployment === "vm") {
							
							//these values now come from the environment record restriction
							if(deployServiceFSMResult.getEnvInfo.restriction && deployServiceFSMResult.getEnvInfo.restriction[options.params.inputmaskData.infraId]){
								options.params.inputmaskData.region = Object.keys(deployServiceFSMResult.getEnvInfo.restriction[options.params.inputmaskData.infraId])[0];
								options.params.inputmaskData.group = deployServiceFSMResult.getEnvInfo.restriction[options.params.inputmaskData.infraId][options.params.inputmaskData.region].group;
							}
							
							let cloneIMFV = soajsUtils.cloneObj(options.params.inputmaskData);
							soajs.inputmaskData = options.params.inputmaskData;
							soajs.inputmaskData = {
								infra: options.infra,
								group: options.params.inputmaskData.group || null,
								region: options.params.inputmaskData.region || null,
								catalog: options.params.catalog,
								securityGroups: options.params.inputmaskData.securityGroups || []
							};
							//compute env variables
							soajs.inputmaskData.catalog.recipe.buildOptions.cmd.deploy.env = helpers.buildAvailableVariables(options);
							soajs.inputmaskData.catalog.recipe.buildOptions.cmd.deploy.env = helpers.computeCatalogEnvVars(config, options, soajs.inputmaskData.catalog.recipe.buildOptions.cmd.deploy.env);
							if (vms && vms.length > 0) {
								vmModule.init(dbModel, function (error, model) {
									BL.checkIfError(soajs, cbMain, {
										config: config,
										error: error ,
										code: 407
									}, () => {
										options.vms = vms;
										helpers.updateVmPortsAndDeployResource(deployer, model, options, soajs, config, function(error, result) {
											let status, statusMsg;
											if(error){
												status = 'error';
												statusMsg = error.message;
											}
											else{
												status = 'ready';
											}
											
											let cond = {
												collection: colls.cicd,
												conditions: {
													type: 'resource'
												}
											};
											
											BL.model.findEntry(soajs, cond, function (err, ciCdRecord) {
												if(err){
													soajs.log.error(err);
												}
												else if (ciCdRecord) {
													let env = cloneIMFV.env.toUpperCase();
													let name = cloneIMFV.custom.name;
													if (ciCdRecord && ciCdRecord[env] && ciCdRecord[env][name]) {
														if (ciCdRecord[env][name]) {
															ciCdRecord[env][name].status = status;
															if(statusMsg){
																ciCdRecord[env][name].statusMsg = statusMsg;
															}
															else{
																delete ciCdRecord[env][name].statusMsg;
															}
														}
													}
													let opts = {
														"collection": colls.cicd,
														"record": ciCdRecord
													};
													
													BL.model.saveEntry(soajs, opts, function (err) {
														if(err){
															soajs.log.error(err);
														}
														else{
															soajs.log.debug(`Updating CICD configuration to ${status} for ${name} in ${env}`);
														}
														if(cloneIMFV.wizard){
															return cbMain(error, true);
														}
													});
												}
											});
										});
										
										if(!cloneIMFV.wizard){
											return cbMain(null, true);
										}
									});
								});
							}
							else {
								return cbMain(null, true);
							}
						}
						else {
							async.auto({
								"triggerDeploy": (mCb) => {
									soajs.log.info("Preparing to deploy service!");
									//todo: bug fix in which action is being triggered
									switch (cloostroAction) {
										case 'deploy':
											cloostroAction = 'deployService';
											break;
										case 'redeploy':
										case 'rebuild':
											cloostroAction = 'redeployService';
											break;
									}
									
									deployer.execute({
										'type': 'infra',
										'driver': options.infra.name,
										'technology': technology
									}, cloostroAction, options, mCb);
								},
								"postDeployment": ["triggerDeploy", (info, mCb) => {
									let record = info.triggerDeploy;
									async.parallel({
										updateEnv: (callback) => {
											if (!options.soajs.registry.port || !options.soajs.registry.protocol) {
												return callback();
											}

											let opts = {
												collection: colls.env,
												conditions: {code: options.env.toUpperCase()},
												fields: {
													$set: {
														"port": options.soajs.registry.port,
														"protocol": options.soajs.registry.protocol
													}
												},
												options: {
													safe: true,
													multi: false,
													upsert: false
												}
											};
											soajs.log.debug("Updating Registry of: ", options.env);

											BL.model.updateEntry(soajs, opts, callback);
										},
										updateInfra: (callback) => {
											let infra = options.infra;
											delete infra.stack;
											delete infra.info;
											let opts = {
												collection: colls.infra,
												record: infra
											};
											soajs.log.debug("Updating Infra Record of: ", options.infra.label);
											BL.model.saveEntry(soajs, opts, callback);
										},
										updateCiCD: (callback) => {
											let recordType;
											if (record.service.labels['soajs.service.type'] === 'service' || record.service.labels['soajs.service.type'] === 'daemon' || record.service.labels['soajs.service.type'] === 'other') {
												recordType = 'cd';
											}
											else if (record.service.labels['soajs.resource.id']) {
												recordType = 'resource';
											}

											if (recordType) {
												let cond = {
													collection: colls.cicd,
													conditions: {
														type: recordType
													}
												};

												BL.model.findEntry(soajs, cond, function (error, ciCdRecord) {
													BL.checkIfError(soajs, mCb, {
														config: config,
														error: error,
														code: 600
													}, () => {
														//todo if ciCdRecord not found create it and cater for it for both types (cd, resource)
														if (!ciCdRecord) {
															return callback();
														}
														//todo need to update this
														let env = options.env.toUpperCase();

														let name = optionsCopy.inputmaskData.custom.name;
														let version =  soajsLib.version.sanitize('v' + optionsCopy.inputmaskData.custom.version);
														if (ciCdRecord && ciCdRecord[env] && ciCdRecord[env][name]) {
															if (ciCdRecord[env][name][version]) {
																if(record.service.labels['soajs.service.type'] === 'daemon'){
																	let daemonGroup = record.service.labels['soajs.daemon.group'];
																	if(ciCdRecord[env][name] && ciCdRecord[env][name][version] && ciCdRecord[env][name][version][daemonGroup]){
																		ciCdRecord[env][name][version][daemonGroup].status = 'ready';
																		delete ciCdRecord[env][name][version][daemonGroup].statusMsg;
																	}
																}
																else{
																	ciCdRecord[env][name][version].status = 'ready';
																	delete ciCdRecord[env][name][version].statusMsg;
																}
															}
															else {
																ciCdRecord[env][name].status = 'ready';
																delete ciCdRecord[env][name].statusMsg;
															}
														}
														let opts = {
															"collection": colls.cicd,
															"record": ciCdRecord
														};
														BL.model.saveEntry(soajs, opts, function (out1, out2) {
															soajs.log.debug("Updating CICD configuration to ready for", record.service.name);
															callback();
														});
													});
												});
											}
											else {
												return callback();
											}
										}
									}, mCb);
								}]
							}, (error, response) => {
								BL.checkIfError(soajs, cbMain, {config: config, error: error}, () => {
									soajs.log.info("Service Deployed Successfully!");
									return cbMain(null, response.triggerDeploy);
								});
							});
						}
					});
				});
			});
		});
	},

	/**
	 * Redeploy a service (does not update config, only simulates a deployment restart)
	 *
	 * @param {Object} config
	 * @param {Object} req
	 * @param {Object} deployer
	 * @param {Function} cbMain
	 */
	"redeployService": (config, req, deployer, cbMain) => {
		let soajs = req.soajs;
		if (soajs.inputmaskData.action === 'redeploy') {
			let options;
			async.auto({
				getEnvInfo: (fCb) => {
					soajs.log.info('get environment record');
					utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env.toUpperCase(), (error, envRecord) => {
						BL.checkIfError(soajs, fCb, {config: config, error: error || !envRecord, code: 600}, () => {
							options = utils.buildDeployerOptions(envRecord, soajs, BL, null);
							options.params = {
								data: {
									variables: {}
								}
							};
							return fCb(null, envRecord);
						});
					});
				},
				//wait until inspectService service and then get infra record
				getInfraRecord: (fCb) => {
					helpers.getInfraRecord(soajs, config, BL, fCb);
				}
			}, (error, result) => {
				BL.checkIfError(soajs, cbMain, {
					config: config,
					error: error,
					code: (error && error.code) ? error.code : 600
				}, () => {
					options.params = {
						action: 'redeploy'
					};
					options.params.inputmaskData = soajs.inputmaskData;
					options.infra = result.getInfraRecord;
					options.infra.stack = utils.getDeploymentFromInfra(options.infra, options.env);
					if (options.infra.stack) {
						options.infra.stack = options.infra.stack[0];
					}

					deployer.execute({
						'type': 'infra',
						'driver': result.getInfraRecord.name,
						'technology': options.strategy,
					}, 'redeployService', options, (error) => {
						BL.checkIfError(soajs, cbMain, {config: config, error: error}, () => {
							return cbMain(null, true);
						});
					});
				});
			});
		}
		else if (soajs.inputmaskData.action === 'rebuild') {
			BL.deployService(config, req, deployer, (error, serviceInfo) => {
				BL.checkIfError(soajs, cbMain, {config: config, error: error}, () => {
					return cbMain(null, serviceInfo);
				});
			});
		}
	},

	/**
	 * Deploy a plugin such as heapster using templates
	 * This api can be later updated to allow sending plugin templates as input, thus allowing the user to deploy anything
	 * @param  {Object}   config
	 * @param  {Object}   soajs
	 * @param  {Object}   deployer
	 * @param  {Function} cb
	 *
	 */
	"deployPlugin": (config, soajs, deployer, cb) => {
		utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env.toUpperCase(), (error, envRecord) => {
			BL.checkIfError(soajs, cb, {
				config: config,
				error: error || !envRecord,
				code: 600
			}, function () {
				BL.checkIfError(soajs, cb, {
					config: config,
					error: !envRecord.deployer.type || !envRecord.deployer.selected || envRecord.deployer.type === 'manual',
					code: 743
				}, () => {
					var options = utils.buildDeployerOptions(envRecord, soajs, BL);
					BL.checkIfError(soajs, cb, {config: config, error: !options, code: 600}, () => {
						options.params = {
							action: 'post',
							resource: soajs.inputmaskData.plugin
						};
						deployer.execute({
							'type': 'container',
							'driver': options.strategy
						}, 'manageResources', options, (error) => {
							BL.checkIfError(soajs, cb, {config: config, error: error}, () => {
								return cb(null, true);
							});
						});
					});
				});
			});
		});
	}
};

module.exports = {
	"init": function (modelName, cb) {
		var modelPath;

		if (!modelName) {
			return cb(new Error("No Model Requested!"));
		}

		modelPath = __dirname + "/../../../models/" + modelName + ".js";
		return requireModel(modelPath, cb);

		/**
		 * checks if model file exists, requires it and returns it.
		 * @param filePath
		 * @param cb
		 */
		function requireModel(filePath, cb) {
			//check if file exist. if not return error
			fs.exists(filePath, function (exists) {
				if (!exists) {
					return cb(new Error("Requested Model Not Found!"));
				}

				BL.model = require(filePath);
				return cb(null, BL);
			});
		}
	}
};
