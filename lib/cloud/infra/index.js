'use strict';
const fs = require("fs");
const async = require("async");
const hash = require('object-hash');
const formidable = require('formidable');

const utils = require("../../../utils/utils.js");
const helper = require("./helper.js");
let colName = "infra";

function checkIfError(soajs, mainCb, data, cb) {
	utils.checkErrorReturn(soajs, mainCb, data, cb);
}

function validateId(soajs, cb) {
	BL.model.validateId(soajs, cb);
}

function initBLModel(BLModule, modelName, cb) {
	BLModule.init(modelName, cb);
}

var BL = {
	model: null,
	
	/**
	 * List Infra Providers
	 *
	 * @param {Object} config
	 * @param {Object} SOAJS
	 * @param {Drivers} Deployer
	 * @param {Callback} cbMain
	 */
	"list": function (config, soajs, deployer, cbMain) {
		let opts = {
			collection: colName
		};
		BL.model.findEntries(soajs, opts, function (err, records) {
			checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, function () {
				
				//todo: call the drivers to get the regions for each provider before returning the response
				async.each(records, (oneInfra, mCb) => {
					
					let options = {
						soajs: soajs,
						env: process.env.SOAJS_ENV.toLowerCase(),
						model: BL.model
					};
					options.infra = oneInfra;
					
					async.series({
						"getRegions": (vCb) => {
							//get resion api info by calling deployer
							deployer.execute({
								'type': 'infra',
								'driver': oneInfra.name,
								'technology': 'cluster'
							}, 'getRegions', options, (error, regions) => {
								checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
									oneInfra.regions = regions.regions;
									oneInfra.templatesTypes = oneInfra.templates;
									oneInfra.templates = [];
									return vCb();
								});
							});
						},
						"getLocalTemplates": (vCb) =>{
							if(!oneInfra.templatesTypes || oneInfra.templatesTypes.indexOf('local') === -1){
								return vCb();
							}
							
							let opts = {
								collection: "templates",
								conditions: {
									"type": "_infra",
									"infra": oneInfra._id.toString()
								}
							};
							BL.model.findEntries(soajs, opts, function (error, records) {
								checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
									oneInfra.templates = records;
									return vCb();
								});
							});
						},
						"getRemoteTemplates": (vCb) => {
							if(!oneInfra.templatesTypes || oneInfra.templatesTypes.indexOf('external') === -1){
								return vCb();
							}
							
							//get resion api info by calling deployer
							deployer.execute({
								'type': 'infra',
								'driver': oneInfra.name,
								'technology': 'cluster'
							}, 'getFiles', options, (error, templates) => {
								checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
									if(!oneInfra.templates) {
										oneInfra.templates = [];
									}
									templates.forEach((oneTemplate) => {
										
										oneInfra.templates.push({
											_id: oneTemplate.id,
											name: oneTemplate.name,
											description: oneTemplate.description,
											location: "external"
										});
									});
									return vCb();
								});
							});
						}
					}, mCb);
				}, (error) => {
					checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
						return cbMain(null, records);
					});
				});
			});
		});
	},
	
	/**
	 * Connect new infra provider
	 * @param config
	 * @param soajs
	 * @param deployer
	 * @param cbMain
	 */
	"activate": function (config, soajs, deployer, cbMain) {
		
		//check if this provider already exists
		BL.list(config, soajs, deployer, (error, infraProviders) => {
			checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
				async.each(infraProviders, (oneProvider, mCb) => {
					if (oneProvider.label === soajs.inputmaskData.label) {
						return mCb(new Error("Another Provider with the same name exists!"));
					}
					else if (hash(oneProvider.api) === hash(soajs.inputmaskData.api)) {
						return mCb(new Error("Another Provider with the same configuration exists!"));
					}
					else{
						return mCb();
					}
				}, (error) => {
					checkIfError(soajs, cbMain, {config: config, error: error, code: 173}, function () {
						//authenticate api info by calling deployer
						let options = {
							soajs: soajs,
							env: process.env.SOAJS_ENV.toLowerCase(),
							model: BL.model
						};
						options.infra = {
							api: soajs.inputmaskData.api
						};
						let driverName = soajs.inputmaskData.name;
						if(['docker','kubernetes'].indexOf(driverName) !== -1){
							driverName = 'local';
							options.infra.stack = {
								technology: soajs.inputmaskData.name
							};
						}
						
						deployer.execute({
							'type': 'infra',
							'driver': driverName,
							'technology': 'cluster'
						}, 'authenticate', options, (error) => {
							checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
								
								deployer.execute({
									'type': 'infra',
									'driver': driverName,
									'technology': 'cluster'
								}, 'getExtras', options, (error, extras) => {
									checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
										
										//insert provider record
										let opts = {
											collection: colName,
											record: {
												api: options.infra.api,
												name: driverName,
												technologies: extras.technologies,
												templates : extras.templates,
												label: soajs.inputmaskData.label,
												deployments: []
											}
										};
										BL.model.insertEntry(soajs, opts, function (err, records) {
											checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, function () {
												return cbMain(null, records);
											});
										});
									});
								});
							});
						});
					});
				});
			});
		});
	},
	
	/**
	 * Modify infra provider connection
	 * @param config
	 * @param soajs
	 * @param deployer
	 * @param cbMain
	 */
	"modify": function (config, soajs, deployer, cbMain) {
		//check id if valid
		validateId(soajs, function (err) {
			checkIfError(soajs, cbMain, { config: config, error: err, code: 490 }, function () {
				
				//get record
				let opts = {
					collection: colName,
					conditions: {
						_id: soajs.inputmaskData.id
					}
				};
				BL.model.findEntry(soajs, opts, function (err, record) {
					checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, function () {
						
						//authenticate api info by calling deployer
						let options = {
							soajs: soajs,
							env: process.env.SOAJS_ENV.toLowerCase(),
							model: BL.model
						};
						options.infra = {
							api: soajs.inputmaskData.api
						};
						
						let driverName = record.name;
						if(['docker','kubernetes'].indexOf(driverName) !== -1){
							driverName = 'local';
							options.infra.stack = {
								technology: record.name
							};
						}
						
						deployer.execute({
							'type': 'infra',
							'driver': driverName,
							'technology': 'cluster'
						}, 'authenticate', options, (error) => {
							checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
								
								deployer.execute({
									'type': 'infra',
									'driver': driverName,
									'technology': 'cluster'
								}, 'getExtras', options, (error, extras) => {
									checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
										//update provider
										record.api = options.infra.api;
										record.technologies = extras.technologies;
										record.templates = extras.templates;
										
										let opts = {
											collection: colName,
											conditions: {
												_id: soajs.inputmaskData.id
											},
											record: record
										};
										BL.model.saveEntry(soajs, opts, function (err) {
											checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, function () {
												return cbMain(null, true);
											});
										});
									});
								});
							});
						});
					});
				});
			});
		});
	},
	
	/**
	 * Deactivate infra provider
	 * @param config
	 * @param soajs
	 * @param deployer
	 * @param cbMain
	 */
	"deactivate": function (config, soajs, deployer, cbMain) {
		//validate id
		validateId(soajs, function (err) {
			checkIfError(soajs, cbMain, {config: config, error: err, code: 490}, function () {
				
				//get provider record
				let opts = {
					collection: colName,
					conditions: {
						_id: soajs.inputmaskData.id
					}
				};
				BL.model.findEntry(soajs, opts, function (err, record) {
					checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, function () {
						
						//check that deployments is empty
						checkIfError(soajs, cbMain, {
							config: config,
							error: (record.deployments.length > 0),
							code: 491
						}, function () {
							
							//remove provider record
							let opts = {
								collection: colName,
								conditions: {
									_id: soajs.inputmaskData.id
								}
							};
							BL.model.removeEntry(soajs, opts, function (err) {
								checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, function () {
									return cbMain(null, true);
								});
							});
						});
					});
				});
			});
		});
	},
	
	/**
	 * remove deployment from infra provider
	 * @param config
	 * @param soajs
	 * @param deployer
	 * @param cbMain
	 */
	"removeDeployment": function (config, soajs, deployer, cbMain) {
		//validate id
		validateId(soajs, function (err) {
			checkIfError(soajs, cbMain, { config: config, error: err, code: 490 }, function () {
				
				//get provider record
				let opts = {
					collection: colName,
					conditions: {
						_id: soajs.inputmaskData.id
					}
				};
				BL.model.findEntry(soajs, opts, function (err, InfraRecord) {
					checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, function () {
						
						//get deployment record
						let deploymentDetails;
						for (let i = InfraRecord.deployments.length - 1; i >= 0; i--) {
							if (InfraRecord.deployments[i].id === soajs.inputmaskData.deploymentId) {
								deploymentDetails = InfraRecord.deployments[i];
							}
						}
						
						//call driver and trigger delete deployment
						let options = {
							soajs: soajs,
							env: process.env.SOAJS_ENV.toLowerCase(),
							model: BL.model
						};
						options.infra = InfraRecord;
						options.infra.stack = deploymentDetails;
						deployer.execute({
							'type': 'infra',
							'driver': InfraRecord.name,
							'technology': 'cluster'
						}, 'deleteCluster', options, (error) => {
							checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
								
								//remove deployment from record and update provider
								for (let i = InfraRecord.deployments.length - 1; i >= 0; i--) {
									if (InfraRecord.deployments[i].id === soajs.inputmaskData.deploymentId) {
										InfraRecord.deployments.spice(i, 1);
									}
								}
								let opts = {
									collection: colName,
									record: InfraRecord
								};
								BL.model.saveEntry(soajs, opts, function (err) {
									checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, function () {
										return cbMain(null, true);
									});
								});
							});
						});
					});
				});
			});
		});
	},
	
	"deployCluster": function (config, soajs, deployer, cbMain) {
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
				//call deployer
				let options = utils.buildDeployerOptions(environmentRecord, soajs, BL);
				options.infra = InfraRecord;
				options.infra.stack = {};
				options.params = soajs.inputmaskData;
				options.params.headers = {
					key: soajs.headers.key
				};
				options.params.soajs_project = soajs.inputmaskData.soajs_project || 'local';
				
				options.params.protocol = soajs.registry.protocol;
				options.params.domain = soajs.registry.domain;
				options.params.apiPrefix = soajs.registry.apiPrefix;
				
				options.params.resource = {
					driver: soajs.inputmaskData.resourceDriver
				};
				
				options.params.technology = options.strategy;
				
				deployer.execute({
					'type': 'infra',
					'driver': InfraRecord.name,
					'technology': 'cluster'
				}, 'deployCluster', options, (error, oneDeployment) => {
					checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
						updateAndFinalize(InfraRecord, environmentRecord, info, oneDeployment);
					});
				});
			}
		});
		
		function updateAndFinalize(infraRecord, environmentRecord, info, oneDeployment) {
			async.parallel({
				"updateInfra": (mCb) => {
					if (soajs.inputmaskData.previousEnvironment) {
						infraRecord.deployments[info[2]].environments.push(soajs.inputmaskData.envCode.toUpperCase());
					}
					else {
						infraRecord.deployments.push(oneDeployment);
						info = [oneDeployment, oneDeployment.environments, 0];
					}
					delete infraRecord.stack;
					BL.model.saveEntry(soajs, {
						collection: "infra",
						record: infraRecord
					}, (error) => {
						checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, mCb);
					});
				},
				"updateEnvironment": (mCb) => {
					BL.model.saveEntry(soajs, {
						collection: "environment",
						record: environmentRecord
					}, (error) => {
						checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, mCb);
					});
				}
			}, () => {
				return cbMain(null, {
					"id": info[0].id,
					"name": info[0].name
				});
			});
		}
	},
	
	"getDeployClusterStatus": function (config, soajs, deployer, cbMain) {
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
				//call deployer
				let options = utils.buildDeployerOptions(environmentRecord, soajs, BL);
				options.infra = InfraRecord;
				options.infra.stack = stack;
				options.params = {};
				options.params.headers = {
					key: soajs.headers.key
				};
				options.params.soajs_project = soajs.inputmaskData.soajs_project || 'local';
				
				options.params.protocol = soajs.registry.protocol;
				options.params.domain = soajs.registry.domain;
				options.params.apiPrefix = soajs.registry.apiPrefix;
				
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
								if (InfraRecord.name === 'google' && options.strategy === 'kubernetes') {
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
											BL.model.findEntry({
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
											initBLModel(require("../cloud/deploy/index.js"), "mongo", (error, deploymentModule) => {
												checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, () => {
													soajs.inputmaskData = {
														"env": info[1][0].code.toUpperCase(),
														"custom": {
															"resourceId": info.getResource._id.toString(),
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
													
													deploymentModule.deployService(config, req, soajs, deployer, (error) => {
														checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, vCb);
													});
												});
											});
										}]
									}, (error)=> {
										if(error){
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
								delete InfraRecord.stack;
								BL.model.saveEntry(soajs, {
									collection: "infra",
									record: InfraRecord
								}, (error) => {
									checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, mCb);
								});
							},
							"updateEnvironment": (mCb) => {
								BL.model.saveEntry(soajs, {
									collection: "environment",
									record: environmentRecord
								}, (error) => {
									checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, mCb);
								});
							}
						}, () => {
							return cbMain(null, {
								id: stack.id,
								ip: response
							});
						});
					});
				});
			}
		});
	},
	
	"getDNSInfo": function (config, soajs, deployer, cbMain) {
		
		helper.getCommonData(config, soajs, BL, cbMain, (InfraRecord, environmentRecord, info) => {
			
			let stack = info[0];
			
			let options = utils.buildDeployerOptions(environmentRecord, soajs, BL);
			options.infra = InfraRecord;
			options.infra.stack = stack;
			
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
	
	"getRegions": function (config, soajs, deployer, cbMain) {
		
		helper.getCommonData(config, soajs, BL, cbMain, (InfraRecord, environmentRecord, info) => {
			
			let stack = info[0];
			let options = utils.buildDeployerOptions(environmentRecord, soajs, BL);
			options.infra = InfraRecord;
			options.infra.stack = stack;
			
			deployer.execute({
				'type': 'infra',
				'driver': InfraRecord.name,
				'technology': 'cluster'
			}, 'getRegions', options, (error, response) => {
				checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
					return cbMain(null, response);
				});
			});
		});
	},
	
	"scaleCluster": function (config, soajs, deployer, cbMain) {
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
	
	"getCluster": function (config, soajs, deployer, cbMain) {
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
	
	"updateCluster": function (config, soajs, deployer, cbMain) {
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
	
	"publishPorts": function (config, soajs, deployer, cbMain) {
		helper.getCommonData(config, soajs, BL, cbMain, (InfraRecord, environmentRecord, info) => {
			
			let stack = info[0];
			let options = utils.buildDeployerOptions(environmentRecord, soajs, BL);
			options.infra = InfraRecord;
			options.infra.stack = stack;
			options.params = {
				info: info,
				name: soajs.inputmaskData.name,
				ports: soajs.inputmaskData.ports,
				envCode: soajs.inputmaskData.envCode,
				soajs_project: soajs.inputmaskData.soajs_project || 'local'
			};
			
			deployer.execute({
				'type': 'infra',
				'driver': InfraRecord.name,
				'technology': 'cluster'
			}, 'publishPorts', options, (error, response) => {
				checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
					BL.model.saveEntry(soajs, {
						collection: "infra",
						record: InfraRecord
					}, (error) => {
						checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, () => {
							return cbMain(null, true);
						});
					});
				});
			});
		});
	},
	
	"removeEnvFromDeployment": function(config, soajs, deployer, cbMain){
		BL.model.findEntry(soajs, {
			collection: "infra",
			conditions: { "deployments.environments": {"$in": [ soajs.inputmaskData.envCode ] } }
		}, (error, infraProvider) => {
			checkIfError(soajs, cbMain, { config: config, error: error, code: 600 }, function () {
				checkIfError(soajs, cbMain, { config: config, error: !infraProvider, code: 600 }, function () {
					let deleteDeployment;
					let deleteInfra;
					infraProvider.deployments.forEach((oneDeployment) => {
						if(oneDeployment.environments && Array.isArray(oneDeployment.environments) && oneDeployment.environments.length > 0){
							for(let i = oneDeployment.environments.length -1; i >= 0; i--){
								if(oneDeployment.environments[i] === soajs.inputmaskData.envCode.toUpperCase()){
									oneDeployment.environments.splice(i, 1);
								}
								
								if(oneDeployment.environments.length === 0){
									deleteDeployment = oneDeployment;
									deleteInfra = infraProvider;
								}
							}
						}
					});
					BL.model.saveEntry(soajs, { collection: "infra", record: infraProvider }, (error) => {
						checkIfError(soajs, cbMain, { config: config, error: error, code: 600 }, function () {
							if (deleteDeployment) {
								//call driver and trigger delete deployment
								let options = {
									soajs: soajs,
									env: process.env.SOAJS_ENV.toLowerCase(),
									model: BL.model
								};
								options.infra = infraProvider;
								options.infra.stack = deleteDeployment;
								deployer.execute({
									'type': 'infra',
									'driver': infraProvider.name,
									'technology': 'cluster'
								}, 'deleteCluster', options, (error) => {
									checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
										return cbMain(null, true);
									});
								});
							}
							else{
								return cbMain(null, true);
							}
						});
					});
				});
			});
		});
	},
	
	/**
	 * removes an infra as code template from the database
	 * @param config
	 * @param soajs
	 * @param cbMain
	 */
	"removeTemplate": function (config, soajs, deployer, cbMain) {
		//validate id
		validateId(soajs, function (err) {
			checkIfError(soajs, cbMain, { config: config, error: err, code: 490 }, function () {
				
				//get provider record
				let opts = {
					collection: colName,
					conditions: {
						_id: soajs.inputmaskData.id
					}
				};
				BL.model.findEntry(soajs, opts, function (err, InfraRecord) {
					checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, function () {
						
						try{
							let options = {
								collection: "templates",
								conditions: {
									"type": "_infra",
									"_id": new BL.model.getDb(soajs).ObjectId(soajs.inputmaskData.templateId),
									"infra": InfraRecord._id.toString()
								}
							};
							
							//only works with local templates
							BL.model.removeEntry(soajs, options, function (err) {
								checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, function () {
									return cbMain(null, true);
								});
							});
						}
						catch(e){
							if(e.message === 'Argument passed in must be a single String of 12 bytes or a string of 24 hex characters'){
								let options = {
									soajs: soajs,
									env: process.env.SOAJS_ENV.toLowerCase(),
									model: BL.model
								};
								options.infra = InfraRecord;
								
								options.params = {
									id: soajs.inputmaskData.templateId
								};
								
								//get resion api info by calling deployer
								deployer.execute({
									'type': 'infra',
									'driver': InfraRecord.name,
									'technology': 'cluster'
								}, 'deleteFile', options, (error) => {
									checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
										return cbMain(null, true);
									});
								});
							}
							else{
								return cbMain({code: 173, msg: e.message });
							}
						}
					});
				});
			});
		});
	},
	
	/**
	 * stores a new infra as code template locally in the database for the given infra provider
	 * @param config
	 * @param soajs
	 * @param cbMain
	 */
	"addTemplate": function (config, soajs, cbMain) {
		//validate id
		validateId(soajs, function (err) {
			checkIfError(soajs, cbMain, { config: config, error: err, code: 490 }, function () {
				
				//get provider record
				let opts = {
					collection: colName,
					conditions: {
						_id: soajs.inputmaskData.id
					}
				};
				BL.model.findEntry(soajs, opts, function (err, InfraRecord) {
					checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, function () {
						checkIfError(soajs, cbMain, {config: config, error: InfraRecord.templates.indexOf('local') === -1, code: 492}, function () {
							
							let options = {
								collection: "templates",
								record: {
									"type": "_infra",
									"infra": InfraRecord._id.toString(),
									"location": "local",
									"deletable": true,
									"name": soajs.inputmaskData.template.name,
									"description": soajs.inputmaskData.template.description,
									"content": soajs.inputmaskData.template.content
								}
							};
							
							BL.model.insertEntry(soajs, options, function (err) {
								checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, function () {
									return cbMain(null, true);
								});
							});
						});
					});
				});
			});
		});
	},
	
	/**
	 * update an infra as code template that is stored locally
	 * @param config
	 * @param soajs
	 * @param cbMain
	 */
	"updateTemplate": function (config, soajs, cbMain) {
		//validate id
		validateId(soajs, function (err) {
			checkIfError(soajs, cbMain, { config: config, error: err, code: 490 }, function () {
				
				//get provider record
				let opts = {
					collection: 'templates',
					conditions: {
						type: '_infra',
						infra: { $exists: true},
						_id: soajs.inputmaskData.id
					}
				};
				BL.model.findEntry(soajs, opts, function (err, templateRecord) {
					checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, function () {
						checkIfError(soajs, cbMain, {config: config, error: templateRecord.location !== 'local', code: 493}, function () {
							
							templateRecord.name = soajs.inputmaskData.template.name;
							templateRecord.description = soajs.inputmaskData.template.description;
							templateRecord.content = soajs.inputmaskData.template.content;
							
							let options = {
								collection: 'templates',
								record: templateRecord
							};
							BL.model.saveEntry(soajs, options, function (err) {
								checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, function () {
									return cbMain(null, true);
								});
							});
						});
					});
				});
			});
		});
	},
	
	/**
	 * Uploads a template to the remote infra provider CDN
	 * @param config
	 * @param soajs
	 * @param deployer
	 * @param cbMain
	 */
	"uploadTemplate": function (config, req, soajs, deployer, cbMain) {
		let form = new formidable.IncomingForm();
		form.encoding = 'utf-8';
		form.keepExtensions = true;
		
		//validate id
		req.soajs.inputmaskData = { id: req.query.id };
		validateId(soajs, function (err) {
			checkIfError(soajs, cbMain, { config: config, error: err, code: 490 }, function () {
				
				//get provider record
				let opts = {
					collection: colName,
					conditions: {
						_id: soajs.inputmaskData.id
					}
				};
				BL.model.findEntry(soajs, opts, function (err, InfraRecord) {
					checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, function () {
						checkIfError(soajs, cbMain, {config: config, error: InfraRecord.templates.indexOf('external') === -1, code: 494}, function () {
							
							let options = {
								soajs: soajs,
								env: process.env.SOAJS_ENV.toLowerCase(),
								model: BL.model
							};
							options.infra = InfraRecord;
							
							
							try{
								form.onPart = function (part, fileSize) {
									if(!part){
										return cbMain({code: 172, msg: "No Uploaded File Detected in request !"});
									}
									
									if (!part.filename) return form.handlePart(part);
									
									let tempfilepath = __dirname + "/" + part.filename + "-" + new Date().getTime();
									let writeStream = fs.createWriteStream(tempfilepath);
									
									part.pipe(writeStream);
									
									writeStream.on('error', function (error) {
										return cb({code: 600, msg: error.toString()});
									});
									
									//once file is written, unzip it and parse it
									writeStream.on('close', function () {
										
										let readFileStream = fs.createReadStream(tempfilepath);
										let stat = fs.statSync(tempfilepath);
										
										options.params = {
											name: req.query.name || part.filename,
											description: req.query.description || '',
											contenttype: part.mime,
											size: stat.size,
											stream: readFileStream,
										};
										
										deployer.execute({
											'type': 'infra',
											'driver': InfraRecord.name,
											'technology': 'cluster'
										}, 'uploadFile', options, (error) => {
											checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
												fs.unlinkSync(tempfilepath);
												return cbMain(null, true);
											});
										});
									});
									
								};
								form.parse(req);
							}
							catch(e){
								return cbMain({code: 173, msg: e.toString() });
							}
						});
					});
				});
			});
		});
	},
	
	/**
	 * Downloads a template from the remote infra provider CDN
	 * @param config
	 * @param soajs
	 * @param deployer
	 * @param res
	 * @param cbMain
	 */
	"downloadTemplate": function (config, soajs, deployer, res, cbMain) {
		
		//validate id
		validateId(soajs, function (err) {
			checkIfError(soajs, cbMain, { config: config, error: err, code: 490 }, function () {
				
				//get provider record
				let opts = {
					collection: colName,
					conditions: {
						_id: soajs.inputmaskData.id
					}
				};
				BL.model.findEntry(soajs, opts, function (err, InfraRecord) {
					checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, function () {
						checkIfError(soajs, cbMain, {config: config, error: InfraRecord.templates.indexOf('external') === -1, code: 494}, function () {
							
							let options = {
								soajs: soajs,
								env: process.env.SOAJS_ENV.toLowerCase(),
								model: BL.model
							};
							options.infra = InfraRecord;
							options.params = {
								id: soajs.inputmaskData.templateId
							};
							
							deployer.execute({
								'type': 'infra',
								'driver': InfraRecord.name,
								'technology': 'cluster'
							}, 'downloadFile', options, (error, response) => {
								checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
									
									//set the headers and send the file in the response
									res.writeHead(200, {
										'Content-Type': response.info.contenttype,
										'Content-Length': response.info.size,
										'FileName': soajs.inputmaskData.templateId
									});
									
									if (process.env.SOAJS_DEPLOY_TEST) {
										return cbMain();
									} else {
										BL.model.closeConnection(soajs);
										response.stream.pipe(res);
									}
								});
							});
							
						});
					});
				});
			});
		});
	},
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
