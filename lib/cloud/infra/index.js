'use strict';
const fs = require("fs");
const async = require("async");
const hash = require('object-hash');
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
					//authenticate api info by calling deployer
					let options = {
						soajs: soajs,
						env: process.env.SOAJS_ENV.toLowerCase(),
						model: BL.model
					};
					options.infra = oneInfra;
					deployer.execute({
						'type': 'infra',
						'driver': oneInfra.name,
						'technology': 'cluster'
					}, 'getRegions', options, (error, regions) => {
						checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
							oneInfra.regions = regions.regions;
							return mCb();
						});
					});
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
					else if (hash(oneProvider.api) !== hash(soajs.inputmaskData.api)) {
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
						deployer.execute({
							'type': 'infra',
							'driver': soajs.inputmaskData.name,
							'technology': 'cluster'
						}, 'authenticate', options, (error) => {
							checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
								
								//insert provider record
								let opts = {
									collection: colName,
									record: {
										api: soajs.inputmaskData.api,
										name: soajs.inputmaskData.name,
										label: soajs.inputmaskData.label
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
			checkIfError(soajs, cbMain, {config: config, error: err, code: 490}, function () {
				
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
						deployer.execute({
							'type': 'infra',
							'driver': record.name,
							'technology': 'cluster'
						}, 'authenticate', options, (error) => {
							checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
								//update provider
								record.api = soajs.inputmaskData.api;
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
			checkIfError(soajs, cbMain, {config: config, error: err, code: 490}, function () {
				
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
					options: {
						envCode: soajs.inputmaskData.previousEnvironment.toUpperCase()
					}
				};
				utils.getEnvironment(soajs, opts2, (error, previousEnvRecord) => {
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
				options.infra.stack = info[0];
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
					}
					
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
								ip: response.ip
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
