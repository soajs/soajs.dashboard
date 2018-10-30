'use strict';
var fs = require("fs");
var async = require("async");
var request = require("request");

const utils = require("../../utils/utils.js");
const exec = require("child_process").exec;

function checkReturnError(soajs, mainCb, data, cb) {
	utils.checkErrorReturn(soajs, mainCb, data, cb);
}

var BL = {
	model: null,
	
	"list": function (config, soajs, cbMain) {
		let opts = {
			collection: 'environment',
			conditions: {code: soajs.inputmaskData.env.toUpperCase()}
		};
		BL.model.findEntry(soajs, opts, function (err, envRecord) {
			checkReturnError(soajs, cbMain, {config: config, error: err || !envRecord, code: 600}, function () {
				
				opts = {
					collection: 'hosts',
					conditions: {
						"env": envRecord.code.toLowerCase()
					}
				};
				BL.model.findEntries(soajs, opts, function (err, hosts) {
					checkReturnError(soajs, cbMain, {config: config, error: err, code: 600}, function () {
						return cbMain(null, {
							'hosts': hosts,
							'deployer': envRecord.deployer,
							'profile': envRecord.profile
						});
					});
				});
			});
		});
	},
	
	/*
	 * This function will return all the environments where a service is deployed.
	 * it takes the service name and renders an object having the following form :
	 * "env_code: apiPrefix.domain"
	 * @ param serviceName
	 * @ param getHostEnv
	 * @ param response
	 */
	"listHostEnv": function (config, soajs, deployer, helpers, cbMain) {
		
		let opts = {
			"collection": "environment",
			"conditions": {
				"$or": [
					{
						"sensitive": {"$exists": false}
					},
					{
						"sensitive": false
					}
				]
			}
		};
		BL.model.findEntries(soajs, opts, (error, environments) => {
			checkReturnError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
				let manualEnvironments = [];
				let cloudEnvironments = [];
				let response = {};
				async.each(environments, (oneEnvironment, mCb) => {
					if(oneEnvironment.deployer.type === 'manual'){
						manualEnvironments.push(oneEnvironment);
					}
					else{
						cloudEnvironments.push(oneEnvironment);
					}
					return mCb();
				}, () =>{
					async.parallel({
						"fetchManual":  (mCb) => {
							let opts = {
								collection: 'hosts',
								conditions: {
									'name': soajs.inputmaskData.service
								},
								fields: 'env'
							};
							if (soajs.inputmaskData.version) {
								opts.conditions.version = soajs.inputmaskData.version;
							}
							
							BL.model.distinctEntries(soajs, opts, function (error, envs) {
								checkReturnError(soajs, mCb, {config: config, error: error, code: 600}, function () {
									async.each(manualEnvironments, (oneEnv, vCb) => {
										if(envs.indexOf(oneEnv.code.toLowerCase()) !== -1){
											response[oneEnv.code.toLowerCase()] = {};
											if (oneEnv.domain === '') {
												response[oneEnv.code.toLowerCase()]['domain'] = oneEnv.deployer.manual.nodes;
											}
											else {
												response[oneEnv.code.toLowerCase()]['domain'] = oneEnv.apiPrefix + "." + oneEnv.domain;
											}
											response[oneEnv.code.toLowerCase()]['domain'] += oneEnv.port ? ":" + oneEnv.port : ":80";
										}
										return vCb(null, true);
									}, mCb);
								});
							});
						},
						"fetchCloud":  (mCb) => {
							//get all infras to check their deployments entries
							BL.model.findEntries(soajs, {
								collection: "infra",
								conditions: { "deployments": {"$not" : {"$size": 0}} } //get infra that have at least one deployment
							}, (error, infraProviders) => {
								checkReturnError(soajs, mCb, {config: config, error: error}, function () {
									async.eachSeries(cloudEnvironments, (oneEnv, vCb) => {
										
										let detectedDeployment, detectedInfra;
										//get deployment from infra based on environment code
										async.eachSeries(infraProviders, (oneInfra, infCb) => {
											oneInfra.deployments.forEach((oneDeployment) => {
												if (oneDeployment.environments.indexOf(oneEnv.code.toUpperCase()) !== -1) {
													detectedDeployment = oneDeployment;
													detectedInfra = oneInfra;
												}
											});
											return infCb();
										}, () => {
											if(!detectedInfra){ return vCb(); }
											
											let options = helpers.buildDeployerOptions(oneEnv, soajs, BL.model);
											options.infra = detectedInfra;
											options.infra.stack = detectedDeployment;
											checkReturnError(soajs, vCb, {config: config, error: !options, code: 825}, function () {
												options.params = {
													env: oneEnv.code.toLowerCase()
												};
												let port;
												soajs.log.debug(`looking for service ${soajs.inputmaskData.service} in ${options.infra.label}`);
												deployer.execute({ 'type': 'infra', 'driver': detectedInfra.name, 'technology': options.strategy }, 'listServices', options, (error, services) => {
													if(error){
														soajs.log.error(error);
														return vCb();
													}
													else if(!services){
														return vCb();
													}
													else{
														//check if service is deployed and prepare the response
														services.forEach((oneService) => {
															if (soajs.inputmaskData.service === oneService.labels["soajs.service.name"]) {
																if (!response[oneEnv.code.toLowerCase()]) {
																	response[oneEnv.code.toLowerCase()] = {};
																}
																if (oneEnv.domain === '') {
																	let deployerInfo = oneEnv.deployer.selected.split(".");
																	if (oneEnv.deployer[deployerInfo[0]][deployerInfo[1]][deployerInfo[2]]) {
																		if (oneEnv.deployer[deployerInfo[0]][deployerInfo[1]][deployerInfo[2]].nodes && oneEnv.deployer[deployerInfo[0]][deployerInfo[1]][deployerInfo[2]].nodes !== '') {
																			response[oneEnv.code.toLowerCase()]['domain'] = oneEnv.deployer[deployerInfo[0]][deployerInfo[1]][deployerInfo[2]].nodes;
																		}
																	}
																}
																else {
																	response[oneEnv.code.toLowerCase()]['domain'] = oneEnv.apiPrefix + "." + oneEnv.domain;
																}
															}
														});
														
														//service is not deployed in this environment
														if(!response[oneEnv.code.toLowerCase()]){
															return vCb();
														}
														
														//calculate the port to use if any
														async.each(services, (oneService, sCb) => {
															//check if service ports are exposed
															if (oneService.labels["soajs.service.name"] === soajs.inputmaskData.service) {
																oneService.ports.forEach(function (onePort) {
																	if (onePort.published) {
																		port = onePort.published;
																		response[oneEnv.code.toLowerCase()].servicePortExposed = true;
																	}
																});
															}
															
															//if no ports, check for controller
															if(!port && oneService.labels['soajs.service.name'] === 'controller' && oneService.labels['soajs.env.code'] === oneEnv.code.toLowerCase()) {
																oneService.ports.forEach(function (onePort) {
																	if (!port && onePort.published) {
																		port = onePort.published;
																	}
																});
															}
															
															//if no ports, check for nginx
															if(!port && oneService.labels['soajs.service.group'] === 'soajs-nginx' && oneService.labels['soajs.env.code'] === oneEnv.code.toLowerCase()) {
																oneService.ports.forEach(function (onePort) {
																	if (!port && onePort.published) {
																		port = onePort.published;
																	}
																});
															}
															return sCb();
														}, () => {
															
															//didn't find any port, use environment port if set
															if (!port && oneEnv.port) {
																port = oneEnv.port;
															}
															
															if(response[oneEnv.code.toLowerCase()] && port){
																response[oneEnv.code.toLowerCase()]['domain'] += ":" + port;
															}
															return vCb();
														});
													}
												});
											});
										});
									}, (error) =>{
										checkReturnError(soajs, mCb, {config: config, error: error, code: 600}, mCb);
									});
								});
							});
						}
					}, (error, info) => {
						checkReturnError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
							//grab the list of tenant that have ext key in requested env and return tenant code, package nad key as part of response
							helpers.getTenants(soajs, response, BL.model, function (error) {
								checkReturnError(soajs, cbMain, { config: config, error: error }, function () {
									return cbMain(null, response);
								});
							});
						});
					});
				})
			});
		});
	},
	
	/**
	 * retrieve the awareness of the controller in this environment
	 * @param config
	 * @param soajs
	 * @param cbMain
	 */
	"awareness": function (config, soajs, cbMain) {
		let opts = {
			collection: 'environment',
			conditions: {code: soajs.inputmaskData.env.toUpperCase()}
		};
		BL.model.findEntry(soajs, opts, function (err, envRecord) {
			checkReturnError(soajs, cbMain, {config: config, error: err || !envRecord, code: 600}, function () {
				opts = {
					collection: "controllers",
					conditions: {
						"env": envRecord.code.toLowerCase()
					}
				};
				BL.model.findEntries(soajs, opts, function (err, controllers) {
					checkReturnError(soajs, cbMain, {config: config, error: err, code: 600}, function () {
						return cbMain(null, controllers);
					});
				});
			});
		});
	},
	
	/**
	 * Perform a maintenance operation on a deployed SOAJS service
	 *
	 * @param {Object} config
	 * @param {Object} soajs
	 * @param {Function} cbMain
	 */
	"maintenance": function (config, soajs, cbMain) {
		async.auto({
			"validateRequest": (mCb) => {
				
				let allowedOperations;
				
				if(soajs.inputmaskData.serviceName === 'controller'){
					allowedOperations = ["heartbeat", "reloadRegistry", "loadProvision", "awarenessStat"];
				}
				else if(soajs.inputmaskData.serviceName === 'oauth'){
					allowedOperations = ["heartbeat", "reloadRegistry", "loadProvision"];
				}
				else if(soajs.inputmaskData.serviceType === 'daemon'){
					allowedOperations = ["heartbeat", "reloadRegistry", "loadProvision", 'daemonStats', 'reloadDaemonConf'];
				}
				else{
					allowedOperations = ["heartbeat", "reloadRegistry"];
				}
				
				if(allowedOperations.indexOf(soajs.inputmaskData.operation) === -1){
					return mCb({code: 602, message: config.errors[602]});
				}
				
				return mCb(null, true);
			},
			//check for environment and that the deployer is manual
			"getEnvironment": ["validateRequest", (info, mCb) =>{
				utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env.toUpperCase(), (error, envRecord) => {
					checkReturnError(soajs, mCb, { config: config, error: error || !envRecord, code: 600 }, () => {
						checkReturnError(soajs, mCb, { config: config, error: (envRecord.deployer.type !== 'manual'), code: 600 }, () => {
							return mCb(null, envRecord);
						});
					});
				});
			}],
			//get the service host
			"getServiceHost": ["getEnvironment", (info, mCb) => {
				let serviceName = soajs.inputmaskData.serviceName;
				
				let opts = {
					collection: 'hosts',
					conditions: {
						name: serviceName,
						env: soajs.inputmaskData.env.toLowerCase(),
						version: soajs.inputmaskData.serviceVersion
					}
				};
				BL.model.findEntry(soajs, opts, (error, hostRecord) => {
					checkReturnError(soajs, mCb, { config: config, error: error || !hostRecord, code: 600 }, () => {
						return mCb(null, hostRecord);
					});
				});
			}],
			//execute maintenance operation
			"executeMaintenanceOperation": ["getServiceHost", (info, mCb) =>{
				
				let maintenanceInc = info.getEnvironment.services.config.ports.maintenanceInc;
				let port = info.getServiceHost.port + maintenanceInc;
				
				let requestOptions = {
					uri: "http://" + info.getServiceHost.ip + ":" + port + "/" + soajs.inputmaskData.operation,
					json: true
				};
				
				if(soajs.inputmaskData.operation === 'awarenessStat' && info.getServiceHost.name === 'controller'){
					requestOptions.uri += "?update=true";
				}
				
				request(requestOptions, (error, response, body) => {
					checkReturnError(soajs, mCb, { config: config, error: error, code: 600 }, () => {
						return mCb(null, body.data);
					});
				});
			}]
		}, (error, results) => {
			checkReturnError(soajs, cbMain, { config: config, error: error, code: (error && error.code) ? error.code : 600 }, function () {
				return cbMain(null, results.executeMaintenanceOperation);
			});
		});
	},
	
	/**
	 * Start a service in a manual environment
	 * @param config
	 * @param soajs
	 * @param cbMain
	 */
	"start": function(config, soajs, cbMain){
		async.auto({
			//check for environment and that the deployer is manual
			"getEnvironment": (mCb) =>{
				utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env.toUpperCase(), (error, envRecord) => {
					checkReturnError(soajs, mCb, { config: config, error: error || !envRecord, code: 600 }, () => {
						checkReturnError(soajs, mCb, { config: config, error: (envRecord.deployer.type !== 'manual'), code: 600 }, () => {
							return mCb(null, envRecord);
						});
					});
				});
			},
			//get the service host
			"getServiceHost": ["getEnvironment", (info, mCb) => {
				let serviceName = soajs.inputmaskData.serviceName;
				
				let opts = {
					collection: 'hosts',
					conditions: {
						name: serviceName,
						env: soajs.inputmaskData.env.toLowerCase(),
						version: soajs.inputmaskData.serviceVersion
					}
				};
				BL.model.findEntry(soajs, opts, (error, hostRecord) => {
					checkReturnError(soajs, mCb, { config: config, error: error, code: 600 }, () => {
						checkReturnError(soajs, mCb, { config: config, error: hostRecord, code: 522 }, () => {
							return mCb(null, hostRecord);
						});
					});
				});
			}]
		}, (error, results) => {
			checkReturnError(soajs, cbMain, { config: config, error: error, code: (error && error.code) ? error.code : 600 }, function () {
				let serviceName = soajs.inputmaskData.serviceName;
				
				async.auto({
					"startService": (mCb) => {
						soajs.inputmaskData.serviceName = soajs.inputmaskData.serviceName.toLowerCase();
						if(soajs.inputmaskData.serviceName === 'controller'){
							soajs.inputmaskData.serviceName = 'gateway';
						}
						
						soajs.log.debug(`Executing: soajs service start ${soajs.inputmaskData.serviceName} --env=${soajs.inputmaskData.env.toLowerCase()}`);
						exec(`soajs service start ${soajs.inputmaskData.serviceName} --env=${soajs.inputmaskData.env.toLowerCase()}`, (error, response) => {
							checkReturnError(soajs, mCb, { config: config, error: error, code: 600 }, () => {
								setTimeout(() => {
									return mCb(null, true);
								}, 2000);
							});
						});
					},
					//get the service host
					"getServiceHost": ["startService", (info, mCb) => {
						let opts = {
							collection: 'hosts',
							conditions: {
								name: serviceName,
								env: soajs.inputmaskData.env.toLowerCase(),
								version: soajs.inputmaskData.serviceVersion
							}
						};
						BL.model.findEntry(soajs, opts, (error, hostRecord) => {
							checkReturnError(soajs, mCb, { config: config, error: error, code: 600 }, () => {
								return mCb(null, hostRecord);
							});
						});
					}],
					"updateControllerRegistry": ["getServiceHost", (info, mCb) => {
						let maintenanceInc = results.getEnvironment.services.config.ports.maintenanceInc;
						let port = results.getEnvironment.services.config.ports.controller + maintenanceInc;
						let requestOptions = {
							uri: "http://" + info.getServiceHost.ip + ":" + port + "/reloadRegistry",
							json: true
						};
						
						soajs.log.debug("Updating Controller Registry:", requestOptions.uri);
						request(requestOptions, (error, response, body) => {
							checkReturnError(soajs, mCb, { config: config, error: error, code: 600 }, () => {
								return mCb(null, true);
							});
						});
					}]
				}, (error) => {
					checkReturnError(soajs, cbMain, { config: config, error: error, code: (error && error.code) ? error.code : 600 }, function () {
						setTimeout(() => {
							return cbMain(null, true);
						}, 100);
					});
				});
			});
		});
	},
	
	/**
	 * Stop a service in a manual environment
	 * @param config
	 * @param soajs
	 * @param cbMain
	 */
	"stop": function(config, soajs, cbMain){
		async.auto({
			//check for environment and that the deployer is manual
			"getEnvironment": (mCb) =>{
				utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env.toUpperCase(), (error, envRecord) => {
					checkReturnError(soajs, mCb, { config: config, error: error || !envRecord, code: 600 }, () => {
						checkReturnError(soajs, mCb, { config: config, error: (envRecord.deployer.type !== 'manual'), code: 600 }, () => {
							return mCb(null, envRecord);
						});
					});
				});
			},
			//get the service host
			"getServiceHost": ["getEnvironment", (info, mCb) => {
				let serviceName = soajs.inputmaskData.serviceName;
				
				let opts = {
					collection: 'hosts',
					conditions: {
						name: serviceName,
						env: soajs.inputmaskData.env.toLowerCase(),
						version: soajs.inputmaskData.serviceVersion
					}
				};
				BL.model.findEntry(soajs, opts, (error, hostRecord) => {
					checkReturnError(soajs, mCb, { config: config, error: error, code: 600 }, () => {
						checkReturnError(soajs, mCb, { config: config, error: !hostRecord, code: 523 }, () => {
							return mCb(null, hostRecord);
						});
					});
				});
			}]
		}, (error, results) => {
			checkReturnError(soajs, cbMain, { config: config, error: error, code: (error && error.code) ? error.code : 600 }, function () {
				let serviceName = soajs.inputmaskData.serviceName;
				
				async.auto({
					"stopService": (mCb) => {
						soajs.inputmaskData.serviceName = soajs.inputmaskData.serviceName.toLowerCase();
						if(soajs.inputmaskData.serviceName === 'controller'){
							soajs.inputmaskData.serviceName = 'gateway';
						}
						
						soajs.log.debug(`Executing: soajs service stop ${soajs.inputmaskData.serviceName} --env=${soajs.inputmaskData.env.toLowerCase()}`);
						exec(`soajs service stop ${soajs.inputmaskData.serviceName} --env=${soajs.inputmaskData.env.toLowerCase()}`, (error, response) => {
							checkReturnError(soajs, mCb, { config: config, error: error, code: 600 }, mCb);
						});
					},
					"updateHostsCollection": ["stopService", (info, mCb) => {
						let opts = {
							collection: 'hosts',
							conditions: {
								name: serviceName,
								env: soajs.inputmaskData.env.toLowerCase(),
								version: soajs.inputmaskData.serviceVersion
							}
						};
						BL.model.removeEntry(soajs, opts, (error) => {
							checkReturnError(soajs, mCb, { config: config, error: error, code: 600 }, mCb);
						});
					}],
					"updateControllerRegistry": ["updateHostsCollection", (info, mCb) => {
						let maintenanceInc = results.getEnvironment.services.config.ports.maintenanceInc;
						let port = results.getEnvironment.services.config.ports.controller + maintenanceInc;
						
						let requestOptions = {
							uri: "http://" + results.getServiceHost.ip + ":" + port + "/reloadRegistry",
							json: true
						};
						
						soajs.log.debug("Updating Controller Registry:", requestOptions.uri);
						request(requestOptions, (error, response, body) => {
							checkReturnError(soajs, mCb, { config: config, error: error, code: 600 }, () => {
								return mCb(null, true);
							});
						});
					}]
				}, (error) => {
					checkReturnError(soajs, cbMain, { config: config, error: error, code: (error && error.code) ? error.code : 600 }, function () {
						setTimeout(() => {
							return cbMain(null, true);
						}, 100);
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
		
		modelPath = __dirname + "/../../models/" + modelName + ".js";
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
