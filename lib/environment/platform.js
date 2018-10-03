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
const config = require("../../config.js");
const async = require("async");
const utils = require("../../utils/utils.js");
const helper = require("./helper.js");
const soajsUtils = require("soajs").utils;

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
				
				//if pending no need to check for certs and namespace, container infra is not yet ready yet.
				//return the config object to show progress on frontend wizard.
				if(envRecord.deployer.pending){
					return cbMain(null, envRecord.deployer);
				}
				
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
						if(envRecord.deployer && envRecord.deployer.selected && envRecord.deployer.selected.indexOf('container.kubernetes') === -1){
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
						let output = envRecord.deployer;
						if(envRecord.restriction){
							output.restriction = envRecord.restriction;
						}
						return cbMain(null, output);
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
							utils.checkErrorReturn(req.soajs, cbMain, {config: config, error: error}, () =>{
								let opts = {
									collection: 'environment',
									conditions : {
										code: envRecord.code
									},
									fields: {
										$set: {
											"deployer.container.kubernetes.remote.namespace": {
												default: req.soajs.inputmaskData.config.namespace.default,
												perService: req.soajs.inputmaskData.config.namespace.perService
											}
										}
									},
									options: {
										safe: true,
										multi: false,
										upsert: false
									}
								};
								BL.model.updateEntry(req.soajs, opts, (error) => {
									utils.checkErrorReturn(req.soajs, cbMain, {config: config, error: error}, cb);
								});
							});
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
				BL.model.findEntry(req.soajs, opts, function (error, data) {
					if(error){
						return mCb(error, true);
					}
					if(data){
						return mCb(null, data);
					} else {
						return mCb(new Error("Environment not found"));
					}
				});
			},
			
			"getProvider": (mCb) => {
				let opts = {
					collection: "infra",
					conditions: {
						_id: BL.model.validateCustomId(req.soajs, req.soajs.inputmaskData.data.selectedInfraProvider._id)
					}
				};
				BL.model.findEntry(req.soajs, opts, function (error, data) {
					if(error){
						return mCb(error, true);
					}
					if(!data){
						return mCb(new Error("Technlogy/Cloud Provider not found!"));
					}
					
					data.deploy = req.soajs.inputmaskData.data.selectedInfraProvider.deploy;
					req.soajs.inputmaskData.data.selectedInfraProvider = data;
					return mCb(null, true);
				});
			},

			//check if environment is using container deployment abd return error if yes
			"validateDeployerConfig": ["getEnvironment", "getProvider", (info, mCb) => {
				let error;
				if(info.getEnvironment.deployer.type === 'container'){
					error = new Error("This Environment already has a container technology attached to it!");
				}
				return mCb(error, true);
			}],
			"loadDeploymentDriver": ['getEnvironment', "getProvider", 'validateDeployerConfig', (info, mCb) => {

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
				if(req.soajs.inputmaskData.data.deployment && req.soajs.inputmaskData.data.deployment.previousEnvironment){
					step1.options = {
						"previousEnvironment": req.soajs.inputmaskData.data.deployment.previousEnvironment
					};
					step2.options.previousEnvironment = req.soajs.inputmaskData.data.deployment.previousEnvironment;
				}

				let context = {
					BL: BL,
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
						if(req.soajs.inputmaskData.data.deployment && req.soajs.inputmaskData.data.deployment.previousEnvironment){
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
						let revert = false, deploymentError;
						infraDriverModule.deploy(req, context, lib, async, BL, "mongo", (error) => {
							if(error) {
								req.soajs.log.error(error);
								revert = true;
								deploymentError = error;
							}

							//remove pending from deployer configuration
							//set deployer config and add pending --> true
							// delete info.getEnvironment.deployer.pending;

							let opts = {
								collection: "environment",
								conditions: {
									code: info.getEnvironment.code
								}
							};

							BL.model.findEntry(req.soajs, opts, (error, envRecord) => {
								if(error){
									req.soajs.log.error(error);
									//close DB Connection
									BL.model.closeConnection(req.soajs);
								}
								else{
									if(revert){
										envRecord.deployer.type = 'manual';
										envRecord.deployer.selected = 'manual';
										if(deploymentError){
											envRecord.deployer.error = {
												code: deploymentError.code,
												msg: deploymentError.msg
											};
										}
									}
									else{
										delete envRecord.deployer.error;
									}
									delete envRecord.deployer.pending;
									BL.model.saveEntry(req.soajs, {
										collection: 'environment',
										record: envRecord
									}, (error) => {
										if(error) {
											req.soajs.log.error(error);
										}
										//close DB Connection
										BL.model.closeConnection(req.soajs);
									});
								}
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
				BL.model.findEntry(req.soajs, opts, function(error, data){
					if(error){
						return mCb(error);
					}
					if(data){
						return mCb(null, data);
					} else {
						return mCb(new Error("Environment not found"));
					}
				});
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

								let infraModule = require(__dirname + "/../cloud/infra/cluster.js");
								models.infraModule = infraModule;
								return mCb(null, models);
							});
						});

					});
				});
			},
			"getDeployedComponents": ["getEnvironment", "loadBLModules", (info, mCb) => {
				//use the servicesModule & secretsModule to
				let context = {services: [], secrets: []};
				//list secrets --> via info.loadBLModules.secretsModule.list
				if(info.getEnvironment.deployer.selected.indexOf("container.kubernetes") !== -1){
					//you need the namespace here ....
					let deployerInfo = info.getEnvironment.deployer.selected.split(".");
					let namespace = info.getEnvironment.deployer[deployerInfo[0]][deployerInfo[1]][deployerInfo[2]].namespace.default;
					req.soajs.inputmaskData.namespace = namespace;
				}
				//list services --> via info.loadBLModules.servicesModule.listServices
				info.loadBLModules.servicesModule.listServices(config, req.soajs, deployer, (error, services) => {
					checkReturnError(req, mCb, { config: config, error: error, code: (error && error.code) ? error.code : 600 }, () => {
						context.services = services || [];
						info.loadBLModules.secretsModule.list(config, req.soajs, deployer, (error, secrets) => {
							checkReturnError(req, mCb, { config: config, error: error, code: (error && error.code) ? error.code : 600 }, () => {
								context.secrets = secrets || [];
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
						let imfvClone = soajsUtils.cloneObj(req.soajs.inputmaskData);
						async.series({
							//async.eachSeries ( services ) --> delete service via response.loadBLModules.servicesModule.deleteService
							"deleteServices": (vCb) => {
								async.eachSeries(response.getDeployedComponents.services, (oneService, sCb) => {
									req.soajs.inputmaskData = soajsUtils.cloneObj(imfvClone);
									req.soajs.inputmaskData.technology = deployerInfo[1];
									req.soajs.inputmaskData.serviceId = oneService.id;
									req.soajs.inputmaskData.name = oneService.name;
									if(req.soajs.inputmaskData.namespace !== oneService.namespace){
										return sCb();
									}
									req.soajs.inputmaskData.mode = oneService.labels['soajs.service.mode'];
									req.soajs.inputmaskData.group = oneService.labels['soajs.service.group'];
									response.loadBLModules.servicesModule.deleteService(config, req, deployer, sCb);
								}, vCb);
							},
							//async.eachSeries ( secrets ) --> delete secret via response.loadBLModules.secretsModule.delete
							"deleteSecrets": (vCb) => {
								req.soajs.inputmaskData = soajsUtils.cloneObj(imfvClone);
								async.eachSeries(response.getDeployedComponents.secrets, (oneSecret, sCb) => {
									req.soajs.inputmaskData.name = oneSecret.name;
									response.loadBLModules.secretsModule.delete(config, req.soajs, deployer, sCb);
								}, vCb);
							}
						}, (error) => {
							//if error, log it
							if(error){ req.soajs.log.error(error); }
							req.soajs.inputmaskData = imfvClone;
							//update the env deployer settings and the infra record
							async.series({
								"updateEnvDeployerSettings": (mCb) => {
									let envRecord = response.getEnvironment;
									envRecord.deployer.type = "manual";
									envRecord.deployer.selected = "manual";

									if(!envRecord.deployer.manual){
										envRecord.deployer.manual = {};
									}

									if(!envRecord.deployer.manual.nodes){
										envRecord.deployer.manual.nodes = {};
									}
									if(envRecord.deployer.manual.nodes === ''){
										envRecord.deployer.manual.nodes = "127.0.0.1";
									}
									
									let emptyEnvSchema = helper.getDefaultRegistryServicesConfig(null);
									envRecord.deployer.container = emptyEnvSchema.deployer.container;
									
									let opts = {
										collection: "environment",
										record: envRecord
									};
									BL.model.saveEntry(req.soajs, opts, mCb);
								},

								//update infra record, remove the env from the deployment.
								"updateInfraRecord": (mCb) => {
									req.soajs.inputmaskData.envCode = req.soajs.inputmaskData.env;
									response.loadBLModules.infraModule.removeEnvFromDeployment(config, req, req.soajs, BL, deployer, mCb);
								}
							}, mCb);
						});
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