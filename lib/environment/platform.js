/*
 *  **********************************************************************************
 *   (C) Copyright Herrontech (www.herrontech.com)
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   Contributors:
 *   - Mike Hajj [mikehajj]
 *  **********************************************************************************
 */

"use Strict";
const colName = "environment";

const async = require("async");
const utils = require("../../utils/utils.js");

function checkReturnError(req, mainCb, data, cb) {
	if (data.error) {
		if (typeof (data.error) === 'object') {
			req.soajs.log.error(data.error);
		}
		if (!data.config) {
			data.config = config;
		}
		let msg = data.error.msg || data.error.message;
		if(!msg){
			msg = data.config.errors[data.code];
		}
		return mainCb({"code": data.code, "msg": msg});
	} else {
		if (cb) {
			return cb();
		}
	}
}

function initBLModel(BLModule, modelName, cb) {
	BLModule.init(modelName, cb);
}

const platforms = {
	
	"listPlatforms": function (config, req, res, BL, envHelper, deployer, cbMain) {
		req.soajs.inputmaskData.env = req.soajs.inputmaskData.env.toUpperCase();
		let opts = {};
		opts.collection = colName;
		opts.conditions = {'code': req.soajs.inputmaskData.env};
		BL.model.findEntry(req.soajs, opts, function (error, envRecord) {
			checkReturnError(req, cbMain, { config: config, error: error || !envRecord, code: 402 }, () => {
				
				async.auto({
					"getCerts": (mCb) => {
						envHelper.listCerts(req.soajs, BL.model, (error, certs) => {
							checkReturnError(req, mCb, {
									config: config,
									error: error,
									code: 732
								}, () => {
								envRecord.deployer.certs = certs;
								return mCb();
							});
						});
					},
					"checkNameSpace": (mCb) => {
						if(envRecord.deployer.selected.indexOf('container.kubernetes') === -1){
							return mCb();
						}
						
						let deployerInfo = envRecord.deployer.selected.split(".");
						let options = utils.buildDeployerOptions(envRecord, req.soajs, BL);
						deployer.execute({
							'type': 'container',
							'driver': options.strategy
						}, 'listNameSpaces', options, (error, namespaces) => {
							utils.checkErrorReturn(req.soajs, mCb, {config: config, error: error}, () => {
								let found = false;
								namespaces.forEach((oneNameSpace) => {
									if(oneNameSpace.name === envRecord.deployer.container.kubernetes[deployerInfo[2]].namespace.default){
										found = true;
									}
								});
								if(found){
									return mCb(null, true);
								}
								
								//update the environment recod and return the response
								envRecord.deployer.container.kubernetes[deployerInfo[2]].namespace.default = null;
								BL.model.saveEntry(req.soajs, { collection: colName, record: envRecord }, mCb);
							});
						});
					}
				}, (error) => {
					utils.checkErrorReturn(req.soajs, cbMain, {config: config, error: error}, () => {
						return cbMain(null, envRecord.deployer);
					});
				});
			});
		});
	},
	
	"updateDeployerConfig": function (config, req, BL, deployer, cbMain) {
		
		utils.getEnvironment(req.soajs, BL.model, req.soajs.inputmaskData.env.toUpperCase(), function (error, envRecord) {
			checkReturnError(req, cbMain, {
				config: config,
				error: error || !envRecord,
				code: 600
			}, function () {
				checkReturnError(req, cbMain, {
					config: config,
					error: !envRecord.deployer.type || !envRecord.deployer.selected || envRecord.deployer.type === 'manual',
					code: 743
				}, function () {
					var currentPlatform = ((envRecord.deployer && envRecord.deployer.selected) ? envRecord.deployer.selected.split('.')[1] : '');
					checkIfNamespaceHasServices(envRecord, currentPlatform, function () {
						return cbMain(null, true);
					});
				});
			});
		});
		
		function checkIfNamespaceHasServices(envRecord, currentPlatform, cb) {
			if (currentPlatform !== 'kubernetes') {
				return cb(null);
			}
			
			if (!Object.hasOwnProperty.call(req.soajs.inputmaskData.config, 'namespace')) {
				return cb(null);
			}
			
			//cannot change kubernetes namespace
			let options = utils.buildDeployerOptions(envRecord, req.soajs, BL);
			options.params = {env: req.soajs.inputmaskData.env.toUpperCase()};
			deployer.execute({
				'type': 'container',
				'driver': options.strategy
			}, 'listServices', options, (error, services) => {
				utils.checkErrorReturn(req.soajs, cbMain, {config: config, error: error}, function () {
					checkReturnError(req, cbMain, {config: config, error: services.length > 0, code: 907}, () => {
						//namespace has been modified, create it then return cb
						options.deployerConfig.namespace = {
							default: req.soajs.inputmaskData.config.namespace.default,
							perService: req.soajs.inputmaskData.config.namespace.perService
						};
						deployer.execute({
							'type': 'container',
							'driver': options.strategy
						}, 'createNameSpace', options, (error) => {
							if (error && error.code == 672) {
								return cb();
							}
							utils.checkErrorReturn(req.soajs, cbMain, {config: config, error: error}, cb);
						});
					});
				});
			});
		}
	},
	
	"attachContainer": function (config, req, BL, deployer, cbMain) {
		/*
			auto:
				get environment
				load infra driver
				trigger validate
				
				parallel:
					trigger deploy
					return api response
		 */
		async.auto({
			"getEnvironment": (mCb) => {
				let opts = {
					collection: "environment",
					conditions: {
						code: req.soajs.inputmaskData.env.toUpperCase()
					}
				};
				BL.model.findEntry(req.soajs, opts, mCb);
			},
			
			//check if environment is using container deployment abd return error if yes
			"validateDeployerConfig": ["getEnvironment", (info, mCb) => {
				let error;
				if(info.getEnvironment.deployer.type === 'container'){
					error = new Error("This Environment already has a container technology attached to it!");
				}
				return mCb(error, true);
			}],
			"loadDeploymentDriver": ['getEnvironment', 'validateDeployerConfig', (info, mCb) => {
				
				let lib = {
					"initBLModel": initBLModel,
					"checkReturnError": checkReturnError
				};
				
				let infraDriverModule = require(__dirname + "/drivers/infra.js");
				
				let step1 = {
					"type": "infra",
					"command": "deployCluster",
					"name": req.soajs.inputmaskData.data.selectedInfraProvider.name,
					"options": req.soajs.inputmaskData.data.selectedInfraProvider.deploy
				};
				let step2 = {
					"type": "infra",
					"name": req.soajs.inputmaskData.data.selectedInfraProvider.name,
					"command": "getDeployClusterStatus",
					"options": {
						"envCode": req.soajs.inputmaskData.env.toUpperCase()
					}
				};
				
				//check if previous environment was provided as data input
				if(req.soajs.inputmaskData.data.deployment.previousEnvironment){
					step1.options = {
						"previousEnvironment": req.soajs.inputmaskData.data.deployment.previousEnvironment
					};
					step2.options.previousEnvironment = req.soajs.inputmaskData.data.deployment.previousEnvironment;
				}
				
				let context = {
					errors: [],
					infraProvider: req.soajs.inputmaskData.data.selectedInfraProvider,
					environmentRecord: info.getEnvironment,
					opts: {
						inputs: [step1, step2],
						stepPath: 'infra.cluster.deploy',
						stage: 'deployments',
						group: 'pre',
					},
					template: {
						deploy: {
							deployments: {
								pre: {
									"infra.cluster.deploy":{
										"imfv": [step1, step2]
									}
								}
							}
						}
					}
				};
				
				async.series({
					"validate": (aCb) => {
						infraDriverModule.validate(req, context, lib, async, BL, "mongo", () => {
							if(context.errors && context.errors.length > 0){
								return aCb(context.errors);
							}
							else return aCb();
						});
					},
					"setPending": (aCb) => {
						//by pass if previous was provided
						if(req.soajs.inputmaskData.data.deployment.previousEnvironment){
							return aCb(null, true);
						}
						
						//set deployer config and add pending --> true
						info.getEnvironment.deployer.pending = true;
						info.getEnvironment.deployer.type = 'container';
						info.getEnvironment.deployer.selected = 'container.' + req.soajs.inputmaskData.data.selectedInfraProvider.deploy.technology + '.remote';
						
						let opts = {
							collection: "environment",
							record: info.getEnvironment
						};
						BL.model.saveEntry(req.soajs, opts, aCb);
					},
					"Deploy": (aCb) => {
						BL.cloud = {
							infra:{
								module: require('../cloud/infra/index.js')
							}
						};
						infraDriverModule.deploy(req, context, lib, async, BL, "mongo", (error) => {
							if(error) {
								req.soajs.log.error(error);
								
							}
							
							//remove pending from deployer configuration
							//set deployer config and add pending --> true
							delete info.getEnvironment.deployer.pending;
							
							let opts = {
								collection: "environment",
								record: info.getEnvironment
							};
							BL.model.findEntry(req.soajs, opts, (error) => {
								if(error){
									req.soajs.log.error(error);
								}
								//close DB Connection
								BL.model.closeConnection(req.soajs);
							});
						});
						
						//do not wait for cb to come back
						return aCb();
					}
				}, mCb);
			}]
		}, (error) => {
			checkReturnError(req, cbMain, { config: config, error: error, code: (error && error.code) ? error.code: 600 }, () => {
				return cbMain(null, true);
			});
		});
	},
	
	"detachContainer": function (config, req, BL, deployer, cbMain) {
		/*
			auto:
				parallel:
					list services by calling module and suppling env code
					list secrets by calling module and suppling env code
			
				parallel:
					trigger delete all services
					trigger delete all secrets
					
					update environment deployer config to manual
						if no manual.nodes value, set it to 127.0.0.1
						
					return api response
		 */
		async.auto({
			"getEnvironment": (mCb) => {
				let opts = {
					collection: "environment",
					conditions: {
						code: req.soajs.inputmaskData.env.toUpperCase()
					}
				};
				BL.model.findEntry(req.soajs, opts, mCb);
			},
			"loadBLModules": (mCb) => {
				let models = {};
				//init and inject:
				// servicesModule ( list , delete )
				// secretsModule ( list , delete )
				// infraModule ( list , delete )
				initBLModel(require(__dirname + "/../cloud/services/index.js"), 'mongo', (error, serviceModule) => {
					checkReturnError(req, mCb, { config: config, error: error, code: (error && error.code) ? error.code : 600 }, () => {
						models.servicesModule = serviceModule;
						
						initBLModel(require(__dirname + "/../cloud/secrets/index.js"), 'mongo', (error, secretsModule) => {
							checkReturnError(req, mCb, { config: config, error: error, code: (error && error.code) ? error.code : 600 }, () => {
								models.secretsModule = secretsModule;
								
								initBLModel(require(__dirname + "/../cloud/infra/cluster.js"), 'mongo', (error, infraModule) => {
									checkReturnError(req, mCb, { config: config, error: error, code: (error && error.code) ? error.code : 600 }, () => {
										models.infraModule = infraModule;
										return mCb(null, models);
									});
								});
								
							});
						});
						
					});
				});
			},
			"getDeployedComponents": ["getEnvironment", "loadBLModules", (info, mCb) => {
				//use the servicesModule & secretsModule to
				let context = {services: [], secrets: []};
				
				//list services --> via info.loadBLModules.servicesModule.listServices
				info.loadBLModules.servicesModule.listServices(config, req.soajs, deployer, (error, services) => {
					checkReturnError(req, mCb, { config: config, error: error, code: (error && error.code) ? error.code : 600 }, () => {
						context.services = services;
						
						//list secrets --> via info.loadBLModules.secretsModule.list
						if(info.getEnvironment.deployer.selected.indexOf("container.kubernetes") !== -1){
							//you need the namespace here ....
							let deployerInfo = info.getEnvironment.deployer.selected.split(".");
							let namespace = info.getEnvironment.deployer[deployerInfo[0]][deployerInfo[1]][deployerInfo[2]].namespace.default;
							req.soajs.inputmaskData.namespace = namespace;
						}
						info.loadBLModules.secretsModule.list(config, req.soajs, deployer, (error, secrets) => {
							checkReturnError(req, mCb, { config: config, error: error, code: (error && error.code) ? error.code : 600 }, () => {
								context.secrets = secrets;
								return mCb(null, context);
							});
						});
					});
				});
			}]
		}, (error, response) => {
			checkReturnError(req, cbMain, { config: config, error: error, code: (error && error.code) ? error.code: 600 }, () => {
				
				async.auto({
					"removedDeployedComponents": (mCb) => {
						
						//you need the namespace here ....
						let deployerInfo = response.getEnvironment.deployer.selected.split(".");
						if(response.getEnvironment.deployer.selected.indexOf("container.kubernetes") !== -1){
							let namespace = response.getEnvironment.deployer[deployerInfo[0]][deployerInfo[1]][deployerInfo[2]].namespace.default;
							req.soajs.inputmaskData.namespace = namespace;
						}
						
						async.series({
							//async.eachSeries ( services ) --> delete service via response.loadBLModules.servicesModule.deleteService
							"deleteServices": (vCb) => {
								async.eachSeries(response.getDeployedComponents.services, (oneService, sCb) => {
									req.soajs.inputmaskData.technology = deployerInfo[1];
									req.soajs.inputmaskData.serviceId = oneService.id;
									req.soajs.inputmaskData.mode = oneService.labels['soajs.service.mode'];
									req.soajs.inputmaskData.group = oneService.labels['soajs.service.group'];
									response.loadBLModules.servicesModule.deleteService(config, req, deployer, sCb);
								}, vCb);
							},
							//async.eachSeries ( secrets ) --> delete secret via response.loadBLModules.secretsModule.delete
							"deleteSecrets": (vCb) => {
								async.eachSeries(response.getDeployedComponents.secrets, (oneSecret, sCb) => {
									req.soajs.inputmaskData.name = oneSecret.name;
									response.loadBLModules.secretsModule.delete(config, req.soajs, deployer, sCb);
								}, vCb);
							}
						}, (error) => {
							//if error, log it
							if(error){ req.soajs.log.error(error); }
							
							//close DB Connection
							BL.model.closeConnection(req.soajs);
						});
						
						//do not wait for async to finish, return the cb and execute in the background
						return mCb(null, true);
					},
					
					"updateEnvDeployerSettings": (mCb) => {
						let envRecord = response.getEnvironment;
						envRecord.deployer.type = "manual";
						envRecord.deployer.selected = "manual";
						
						if(!envRecord.deployer.manual.nodes){
							envRecord.deployer.manual.nodes = {};
						}
						if(envRecord.deployer.manual.nodes === ''){
							envRecord.deployer.manual.nodes = "127.0.0.1";
						}
						
						let opts = {
							collection: "environment",
							record: envRecord
						};
						BL.model.saveEntry(req.soajs, opts, mCb);
					},
					
					//update cicd type : resources, remove the associated entries
					"updateCiCd": (mCb) => {
						BL.model.findEntry(req.soajs, {
							collection: 'cicd',
							conditions: { type: 'resource' }
						}, (error, cicdRecord) => {
							checkReturnError(req, mCb, { config: config, error: error, code: 600 }, () => {
								if(!cicdRecord[req.soajs.inputmaskData.env.toUpperCase()]){
									return mCb(null, true);
								}
								
								response.getDeployedComponents.services.forEach((oneService) => {
									let serviceName = oneService.labels['soajs.service.name'];
									delete cicdRecord[req.soajs.inputmaskData.env.toUpperCase()][serviceName];
								});
								
								BL.model.saveEntry(req.soajs, { collection: 'cicd', record: cicdRecord }, mCb);
							});
						});
					},
					
					//update infra record, remove the env from the deployment.
					"updateInfraRecord": (mCb) => {
						req.soajs.inputmaskData.envCode = req.soajs.inputmaskData.env;
						response.loadBLModules.infraModule.removeEnvFromDeployment(config, req, req.soajs, BL, deployer, mCb);
					}
				}, (error) => {
					checkReturnError(req, cbMain, { config: config, error: error, code: (error && error.code) ? error.code: 600 }, () => {
						return cbMain(null, true);
					});
				});
				
			});
		});
	}
};

module.exports = platforms;