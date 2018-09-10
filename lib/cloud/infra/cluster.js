'use strict';
const async = require("async");

const utils = require("../../../utils/utils.js");
const helper = require("./helper.js");

function checkIfError(soajs, mainCb, data, cb) {
	utils.checkErrorReturn(soajs, mainCb, data, cb);
}

function initBLModel(BLModule, modelName, cb) {
	BLModule.init(modelName, cb);
}

const clustersModule = {

	"deployCluster": function (config, req, soajs, BL, deployer, cbMain) {
		soajs.inputmaskData.bypassInfoCheck = true;
		helper.getCommonData(config, soajs, BL, cbMain, (InfraRecord, environmentRecord, info) => {
			if (soajs.inputmaskData.previousEnvironment) {
				soajs.log.debug("Cloning deployment configuration from:", soajs.inputmaskData.previousEnvironment.toUpperCase());
				let opts2 = {
					collection: 'environment',
					conditions: {
						code: soajs.inputmaskData.previousEnvironment.toUpperCase()
					}
				};
				BL.model.findEntry(soajs, opts2, (error, previousEnvRecord) => {
					checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
						environmentRecord.deployer = previousEnvRecord.deployer;
						updateAndFinalize(InfraRecord, environmentRecord, info);
					});
				});
			}
			else {

				//check on refresh, return what is already created
				BL.model.findEntry(soajs, {
					collection: "infra",
					conditions: {"deployments.environments": {"$in": [soajs.inputmaskData.envCode.toUpperCase()]}}
				}, (error, infraProvider) => {
					checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
						if (infraProvider && infraProvider.deployments) {
							infraProvider.deployments.forEach((oneDeployment) => {
								if (oneDeployment.environments.indexOf(soajs.inputmaskData.envCode.toUpperCase()) !== -1) {
									return cbMain(null, {
										"id": oneDeployment.id,
										"name": oneDeployment.name
									});
								}
							});
						}
						else {
							doDeploy(InfraRecord, environmentRecord, info);
						}
					});
				});
			}
		});

		function doDeploy(InfraRecord, environmentRecord, info) {
			let dashboardDomainInfo = {
				domain: soajs.registry.domain,
				protocol: soajs.registry.protocol,
				apiPrefix: soajs.registry.apiPrefix
			};

			if (process.env.SOAJS_SAAS) {
				if(soajs.registry.custom){
					soajs.customRegistry = soajs.registry.custom;
				}
				if (soajs.registry.custom && soajs.registry.custom.ciConfig && soajs.registry.custom.ciConfig.value) {
					dashboardDomainInfo = {
						domain: soajs.registry.custom.ciConfig.value.domain + ":" + soajs.registry.custom.ciConfig.value.port,
						protocol: soajs.registry.custom.ciConfig.value.protocol,
						apiPrefix: soajs.registry.custom.ciConfig.value.apiPrefix
					};
				}
			}

			//call deployer
			let options = utils.buildDeployerOptions(environmentRecord, soajs, BL);
			options.infra = InfraRecord;
			options.infra.stack = {};
			options.params = soajs.inputmaskData;
			options.params.headers = {
				key: soajs.headers.key
			};
			options.params.soajs_project = soajs.inputmaskData.soajs_project || 'local';

			options.params.protocol = dashboardDomainInfo.protocol;
			options.params.domain = dashboardDomainInfo.domain;
			options.params.apiPrefix = dashboardDomainInfo.apiPrefix;

			options.params.resource = {
				driver: soajs.inputmaskData.resourceDriver
			};

			options.params.technology = options.strategy;

			async.auto({
				"getInfraCodeTemplate": (mCb) => {
					if(!InfraRecord.templates){
						return mCb(null, null);
					}
					if (InfraRecord.templates.indexOf("local") !== -1) {
						BL.model.findEntry(soajs, {
							collection: 'templates',
							conditions: {
								"type": "_infra",
								"infra": InfraRecord._id.toString(),
								"name": soajs.inputmaskData.infraCodeTemplate
							}
						}, (error, template) => {
							checkIfError(soajs, mCb, {config: config, error: error, code: 600}, () => {
								//todo: add validation on local template inputs here ....
								if(template && template.inputs && typeof(template.inputs) === 'string') {
									try {
										template.inputs = JSON.parse(template.inputs);
									}
									catch(e) {
										soajs.log.error('Unable to parse input for template ' + template.name);
										soajs.log.error(e);
										return checkIfError(soajs, mCb, {config: config, error: e, code: 498}, () => {});
									}
								}
								options.params.template = template;
								return mCb(null, template);
							});
						});
					}
					else{
						//get files from infra provider and search for complimentary file (if any)
						deployer.execute({
							'type': 'infra',
							'driver': InfraRecord.name,
							'technology': 'cluster'
						}, 'getFiles', options, (error, files) => {
							checkIfError(soajs, mCb, {config: config, error: error, code: 600}, () => {
								let fileId;
								//loop over files and the complimentary file (if any) to be compressed together with the template file
								files.forEach(oneFile => {
									if (oneFile.type === 'inputsAndDisplay' && oneFile.template === soajs.inputmaskData.infraCodeTemplate) {
										fileId = oneFile.id;
									}
								});

								options.params.id = fileId;
								deployer.execute({
									'type': 'infra',
									'driver': InfraRecord.name,
									'technology': 'cluster'
								}, 'downloadFile', options, (error, response) => {
									checkIfError(soajs, mCb, {config: config, error: error, code: 600}, () => {
										let template = response.content;
										try{
											template = JSON.parse(template);
										}
										catch(e){
											return mCb(e);
										}
										
										if(template && template.inputs && typeof(template.inputs) === 'string') {
											try {
												template.inputs = JSON.parse(template.inputs);
											}
											catch(e) {
												soajs.log.error('Unable to parse input for template ' + template.name);
												soajs.log.error(e);
												return checkIfError(soajs, mCb, {config: config, error: e, code: 498}, () => {});
											}
										}
										
										return mCb(null, template);
									});
								});
							});
						});
					}
				},
				"validateinfraCodeTemplate": ["getInfraCodeTemplate", (info, mCb) => {
					if(!info.getInfraCodeTemplate || !info.getInfraCodeTemplate.imfv){
						return mCb();
					}

					let imfv;
					try{
						imfv = (typeof info.getInfraCodeTemplate.imfv === 'string') ? JSON.parse(info.getInfraCodeTemplate.imfv) : info.getInfraCodeTemplate.imfv;
					}
					catch(e){
						soajs.log.error(e);
						return mCb();
					}

					if(Object.keys(imfv).length === 0){
						return mCb();
					}

					let myValidator = new soajs.validator.Validator();
					let status = myValidator.validate(options.soajs.inputmaskData, imfv);
					// soajs.log.debug(status);
					if (!status.valid) {
						let errors = [];
						status.errors.forEach(function (err) {
							errors.push(err.stack);
						});
						return mCb({code: 173, msg: errors.join(" - ")});
					}
					else return mCb(null, true);
				}],
			}, (error) => {
				checkIfError(soajs, cbMain, {config: config, error: error, code: (error && error.code) ? error.code : 600}, function () {
					deployer.execute({
						'type': 'infra',
						'driver': InfraRecord.name,
						'technology': 'cluster'
					}, 'deployCluster', options, (error, oneDeployment) => {
						checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
							updateAndFinalize(InfraRecord, environmentRecord, info, oneDeployment);
						});
					});
				});
			});
		}

		function updateAndFinalize(infraRecord, environmentRecord, info, oneDeployment) {
			async.parallel({
				"updateInfra": (mCb) => {
					let uniqueEnvs;
					if (soajs.inputmaskData.previousEnvironment) {
						if (!infraRecord.deployments[info[2]].environments){
							infraRecord.deployments[info[2]].environments = [];
						}
						if(infraRecord.deployments[info[2]].environments.indexOf(soajs.inputmaskData.envCode.toUpperCase()) === -1){
							infraRecord.deployments[info[2]].environments.push(soajs.inputmaskData.envCode.toUpperCase());
						}
						uniqueEnvs = infraRecord.deployments[info[2]].environments.filter((item, pos) => { return infraRecord.deployments[info[2]].environments.indexOf(item)== pos; });
						infraRecord.deployments[info[2]].environments = uniqueEnvs;
					}
					else {
						if (!oneDeployment.environments){
							oneDeployment.environments = [];
						}
						uniqueEnvs = oneDeployment.environments.filter((item, pos) => { return oneDeployment.environments.indexOf(item)== pos; });
						oneDeployment.environments = uniqueEnvs;

						infraRecord.deployments.push(oneDeployment);
						info = [oneDeployment, oneDeployment.environments, 0];
					}

					BL.model.updateEntry(soajs, {
						collection: "infra",
						conditions: {
							_id: infraRecord._id
						},
						fields: {
							$set: {
								deployments: infraRecord.deployments
							}
						}
					}, (error) => {
						checkIfError(soajs, mCb, {config: config, error: error, code: 600}, mCb);
					});
				},
				"updateEnvironment": (mCb) => {
					BL.model.updateEntry(soajs, {
						collection: "environment",
						conditions: {
							code: environmentRecord.code
						},
						fields: {
							$set: {
								"port": environmentRecord.port,
								"protocol": environmentRecord.protocol,
								"deployer": environmentRecord.deployer
							}
						}
					}, (error) => {
						checkIfError(soajs, mCb, {config: config, error: error, code: 600}, mCb);
					});
				}
			}, (error) => {
				checkIfError(soajs, cbMain, {config: config, error: error, code: (error && error.code) ? error.code : 600}, () => {
					return cbMain(null, {
						"id": info[0].id,
						"name": info[0].name
					});
				});
			});
		}
	},

	"getDeployClusterStatus": function (config, req, soajs, BL, deployer, cbMain) {
		helper.getCommonData(config, soajs, BL, cbMain, (InfraRecord, environmentRecord, info) => {
			let stack = info[0];
			if (soajs.inputmaskData.previousEnvironment) {
				soajs.log.debug("Getting Previous Environment Record:", soajs.inputmaskData.envCode.toUpperCase());
				soajs.inputmaskData.envCode = soajs.inputmaskData.previousEnvironment;
				BL.model.findEntry(soajs, {
					collection: "environment",
					conditions: {"code": soajs.inputmaskData.envCode.toUpperCase()}
				}, (error, environmentRecord) => {
					checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
						let ipAddress;
						let driverInfo = environmentRecord.deployer.selected.split(".");
						ipAddress = environmentRecord.deployer[driverInfo[0]][driverInfo[1]][driverInfo[2]].nodes;

						return cbMain(null, {
							"id": stack.id,
							"ip": ipAddress
						});
					});
				});
			}
			else {
				let options = utils.buildDeployerOptions(environmentRecord, soajs, BL);

				if(process.env.SOAJS_SAAS && soajs.customRegistry){
					if(!soajs.registry.custom){
						soajs.registry.custom = {};
					}
					for(let i in soajs.customRegistry){
						soajs.registry.custom[i] = soajs.customRegistry[i];
					}
				}

				let dashboardDomainInfo = {
					domain: soajs.registry.domain,
					protocol: soajs.registry.protocol,
					apiPrefix: soajs.registry.apiPrefix
				};

				//call deployer
				options.infra = InfraRecord;
				options.infra.stack = stack;
				options.params = {};
				options.params.headers = {
					key: soajs.headers.key
				};
				options.params.soajs_project = soajs.inputmaskData.soajs_project || 'local';

				options.params.protocol = dashboardDomainInfo.protocol;
				options.params.domain = dashboardDomainInfo.domain;
				options.params.apiPrefix = dashboardDomainInfo.apiPrefix;

				options.params.resource = {
					driver: soajs.inputmaskData.resourceDriver
				};

				deployer.execute({
					'type': 'infra',
					'driver': InfraRecord.name,
					'technology': 'cluster'
				}, 'getDeployClusterStatus', options, (error, response) => {
					checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
						if (!response) {
							return cbMain(null, {
								id: stack.id,
								ip: false
							});
						}
						async.parallel({
							"deployDaemonset": (mCb) => {
								if (process.env.SOAJS_SAAS && InfraRecord.name === 'google' && options.strategy === 'kubernetes') {
									if(soajs.registry.custom && soajs.registry.custom.ciConfig && soajs.registry.custom.ciConfig.value){
										dashboardDomainInfo = {
											domain: soajs.registry.custom.ciConfig.value.domain + ":" + soajs.registry.custom.ciConfig.value.port,
											protocol: soajs.registry.custom.ciConfig.value.protocol,
											apiPrefix: soajs.registry.custom.ciConfig.value.apiPrefix
										};

										options.params.protocol = dashboardDomainInfo.protocol;
										options.params.domain = dashboardDomainInfo.domain;
										options.params.apiPrefix = dashboardDomainInfo.apiPrefix;
									}
									async.auto({
										"getCatalogRecipe": (vCb) => {
											BL.model.findEntry(options.soajs, {
												collection: "catalogs",
												conditions: {
													"name": "Machine Public IP White Lister - Kubernetes",
													"type": "system",
													"subtype": "other",
													"locked": true
												}
											}, vCb);
										},
										"getResource": (vCb) => {
											BL.model.findEntry(options.soajs, {
												collection: 'resources',
												conditions: {
													"name": "ip-resolver",
													"type": "system",
													"category": "other",
													"locked": true,
													"plugged": false,
													"shared": true,
													"created": "DASHBOARD",
													"author": "owner"
												}
											}, vCb);
										},
										"deployDaemonset": ["getCatalogRecipe", "getResource", (info, vCb) => {
											initBLModel(require("../deploy/index.js"), "mongo", (error, deploymentModule) => {
												checkIfError(soajs, cbMain, {
													config: config,
													error: error,
													code: 600
												}, () => {
													soajs.inputmaskData = {
														"env": environmentRecord.code.toUpperCase(),
														"custom": {
															"name": "ip-resolver",
															"type": "resource",
															"env": {
																"HT_PROJECT_KEY": options.params.headers.key,
																"HT_PROJECT_NAME": options.params.soajs_project,
																"HT_DRIVER_NAME": options.params.resource.driver,
																"HT_API_DOMAIN": options.params.protocol + "://" + options.params.apiPrefix + "." + options.params.domain + "/bridge"
															}
														},
														"deployConfig": {
															"memoryLimit": 209715200,
															"cpuLimit": "100m",
															"replication": {
																"mode": "daemonset"
															}
														},
														"recipe": info.getCatalogRecipe._id.toString()
													};
													
													soajs.inputmaskData.soajs_project = options.params.soajs_project;
													
													//soajs project
													checkIfError(soajs, vCb, {
														config: config,
														error: !info.getResource || !info.getResource._id,
														code: 508
													}, ()=>{
														soajs.inputmaskData.custom["resourceId"]= info.getResource._id.toString();
														soajs.log.debug("Deploying Whitelisting daemon to domain:", soajs.inputmaskData.custom.env.HT_API_DOMAIN);
														deploymentModule.deployService(config, req, deployer, (error) => {
															checkIfError(soajs, vCb, {
																config: config,
																error: error,
																code: 600
															}, vCb);
														});
													});
												});
											});
										}]
									}, (error) => {
										if (error) {
											soajs.log.error(error);
										}
										return mCb();
									});
								}
								else {
									return mCb();
								}
							},
							"updateInfra": (mCb) => {
								InfraRecord.deployments[info[2]] = stack;
								BL.model.updateEntry(soajs, {
									collection: "infra",
									conditions: {
										_id: InfraRecord._id
									},
									fields: {
										$set: {
											deployments: InfraRecord.deployments
										}
									}
								}, (error) => {
									checkIfError(soajs, mCb, {config: config, error: error, code: 600}, mCb);
								});
							},
							"updateEnvironment": (mCb) => {
								//need to clean the environment record before saving it
								BL.model.updateEntry(soajs, {
									collection: "environment",
									conditions: {
										code: environmentRecord.code
									},
									fields: {
										$set: {
											"port": environmentRecord.port,
											"protocol": environmentRecord.protocol,
											"deployer": environmentRecord.deployer
										}
									}
								}, (error) => {
									checkIfError(soajs, mCb, {config: config, error: error, code: 600}, mCb);
								});
							}
						}, (error) => {
							checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, () => {
								return cbMain(null, {
									id: stack.id,
									ip: response
								});
							});
						});
					});
				});
			}
		});
	},

	"getDNSInfo": function (config, req, soajs, BL, deployer, cbMain) {
		helper.getCommonData(config, soajs, BL, cbMain, (InfraRecord, environmentRecord, info) => {

			let stack = info[0];

			let options = utils.buildDeployerOptions(environmentRecord, soajs, BL);
			options.infra = InfraRecord;
			options.infra.stack = stack;
			soajs.log.debug("Invoking Get DNS Info...");
			deployer.execute({
				'type': 'infra',
				'driver': InfraRecord.name,
				'technology': 'cluster'
			}, 'getDNSInfo', options, (error, response) => {
				checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
					return cbMain(null, response);
				});
			});
		});
	},

	"scaleCluster": function (config, soajs, BL, deployer, cbMain) {
		helper.getCommonData(config, soajs, BL, cbMain, (InfraRecord, environmentRecord, info) => {

			let stack = info[0];
			let options = utils.buildDeployerOptions(environmentRecord, soajs, BL);
			options.infra = InfraRecord;
			options.infra.stack = stack;
			options.params = {
				number: soajs.inputmaskData.number
			};

			deployer.execute({
				'type': 'infra',
				'driver': InfraRecord.name,
				'technology': 'cluster'
			}, 'scaleCluster', options, (error, response) => {
				checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
					return cbMain(null, response);
				});
			});
		});
	},

	"getCluster": function (config, soajs, BL, deployer, cbMain) {
		helper.getCommonData(config, soajs, BL, cbMain, (InfraRecord, environmentRecord, info) => {

			let stack = info[0];
			let options = utils.buildDeployerOptions(environmentRecord, soajs, BL);
			options.infra = InfraRecord;
			options.infra.stack = stack;
			options.params = {
				env: info[1]
			};

			deployer.execute({
				'type': 'infra',
				'driver': InfraRecord.name,
				'technology': 'cluster'
			}, 'getCluster', options, (error, response) => {
				checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
					return cbMain(null, response);
				});
			});
		});
	},

	"updateCluster": function (config, soajs, BL, deployer, cbMain) {
		helper.getCommonData(config, soajs, BL, cbMain, (InfraRecord, environmentRecord, info) => {

			let stack = info[0];
			let options = utils.buildDeployerOptions(environmentRecord, soajs, BL);
			options.infra = InfraRecord;
			options.infra.stack = stack;
			options.params = {};
			deployer.execute({
				'type': 'infra',
				'driver': InfraRecord.name,
				'technology': 'cluster'
			}, 'updateCluster', options, (error, response) => {
				checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
					return cbMain(null, response);
				});
			});
		});
	},

	/**
	 * remove environment from deployment. if deployment has no more environments, remove deployment.
	 * @param config
	 * @param req
	 * @param soajs
	 * @param BL
	 * @param deployer
	 * @param cbMain
	 */
	"removeEnvFromDeployment": function (config, req, soajs, BL, deployer, cbMain) {
		BL.model.findEntry(soajs, {
			collection: "infra",
			conditions: {"deployments.environments": {"$in": [soajs.inputmaskData.envCode]}}
		}, (error, infraProvider) => {
			checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
				checkIfError(soajs, cbMain, {config: config, error: !infraProvider, code: 600}, function () {
					let deleteDeployment;
					let deleteInfra;
					infraProvider.deployments.forEach((oneDeployment) => {
						if (oneDeployment.environments && Array.isArray(oneDeployment.environments) && oneDeployment.environments.length > 0) {
							for (let i = oneDeployment.environments.length - 1; i >= 0; i--) {
								if (oneDeployment.environments[i] === soajs.inputmaskData.envCode.toUpperCase()) {
									oneDeployment.environments.splice(i, 1);
								}

								if (oneDeployment.environments.length === 0) {
									deleteDeployment = oneDeployment;
									deleteInfra = infraProvider;
								}
							}
						}
					});

					BL.model.saveEntry(soajs, {collection: "infra", record: infraProvider}, (error) => {
						checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
							if (deleteDeployment) {
								//call driver and trigger delete deployment
								let options = {
									soajs: soajs,
									env: process.env.SOAJS_ENV.toLowerCase(),
									model: BL.model
								};
								options.infra = infraProvider;
								options.infra.stack = deleteDeployment;
								soajs.log.debug("Removing Cluster from Provider");
								deployer.execute({
									'type': 'infra',
									'driver': infraProvider.name,
									'technology': 'cluster'
								}, 'deleteCluster', options, (error) => {
									checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {

										//remove deployment from record

										for (let depIndex = infraProvider.deployments.length - 1; depIndex >= 0; depIndex--) {
											if (infraProvider.deployments[depIndex].id === deleteDeployment.id) {
												infraProvider.deployments.splice(depIndex, 1);
											}
										}
										delete infraProvider.stack;
										BL.model.saveEntry(soajs, {
											collection: "infra",
											record: infraProvider
										}, (error) => {
											checkIfError(soajs, cbMain, {
												config: config,
												error: error,
												code: 600
											}, function () {
												return cbMain(null, true);
											});
										});
									});
								});
							}
							else {
								return cbMain(null, true);
							}
						});
					});
				});
			});
		});
	}
};

module.exports = clustersModule;
