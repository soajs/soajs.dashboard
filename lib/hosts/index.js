'use strict';
var fs = require("fs");
var async = require("async");
var request = require("request");
var hostModel = require("../../models/host.js");
const utils = require("../../utils/utils.js");

function checkReturnError(soajs, mainCb, data, cb) {
	utils.checkErrorReturn(soajs, mainCb, data, cb);
}

var BL = {
	model: null,
	
	"list": function (config, soajs, cbMain) {
		hostModel.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (err, envRecord) {
			checkReturnError(soajs, cbMain, {config: config, error: err || !envRecord, code: 600}, function () {
				hostModel.getHosts(soajs, BL.model, envRecord.code, function (err, hosts) {
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
		BL.listHAhostEnv(config, soajs, deployer, helpers, (error, response) => {
			if (error) {
				return cb(error);
			}
			else if (response) {
				return cbMain(null, response);
			}
			else {
				hostModel.getHostEnv(soajs, BL.model, function (error, envs) {
					checkReturnError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
						checkReturnError(soajs, cbMain, {
							config: config,
							error: envs.length === 0,
							code: 621
						}, function () {
							async.map(envs, function (oneEnv, callback) {
								var opts = {
									"collection": "environment",
									"conditions": {
										"$and": [
											{
												"deployer.type": "manual"
											},
											{
												"$or": [
													{
														"sensitive": {"$exists": false}
													},
													{
														"sensitive": false
													}
												]
											}
										]
									}
								};
								BL.model.findEntry(soajs, opts, function (error, environment) {
									if (error) {
										return callback(error);
									}
									if (environment) {
										return callback(null, oneEnv.toUpperCase());
									}
									
									return callback(null, null);
								});
							}, function (error, envsList) {
								
								for (var i = envsList.length - 1; i >= 0; i--) {
									if (!envsList[i]) {
										envsList.splice(i, 1);
									}
								}
								
								hostModel.getEnvInfo(soajs, BL.model, {envList: envsList}, function (error, result) {
									checkReturnError(soajs, cbMain, {
										config: config,
										error: error,
										code: 600
									}, function () {
										var response = {};
										result.forEach(function (oneEnvRec) {
											if (!response[oneEnvRec.code.toLowerCase()]) {
												response[oneEnvRec.code.toLowerCase()] = {};
											}
											if (oneEnvRec.domain === '') {
												output[oneEnvRec.code.toLowerCase()]['domain'] = oneEnvRec.deployer.manual.nodes;
											}
											else {
												response[oneEnvRec.code.toLowerCase()]['domain'] = oneEnvRec.apiPrefix + "." + oneEnvRec.domain;
											}
										});
										//grab the list of tenant that have ext key in requested env and return tenant code, package nad key as part of response
										helpers.getTenants(soajs, response, BL.model, function (error) {
											checkReturnError(soajs, cbMain, {
												config: config,
												error: error
											}, function () {
												return cbMain(null, response);
											});
										});
									});
								});
							});
						});
					});
				});
			}
		});
	},
	
	"listHAhostEnv": function (config, soajs, deployer, helpers, cbMain) {
		var output = {};
		
		//fetch the non sensitive environments only
		var opts = {
			"collection": "environment",
			"conditions": {
				"$and": [
					{
						"deployer.type": "container"
					},
					{
						"$or": [
							{
								"sensitive": {"$exists": false}
							},
							{
								"sensitive": false
							},
							{
								"sensitive": null
							}
						]
					}
				]
			}
		};
		BL.model.findEntries(soajs, opts, function (error, environments) {
			checkReturnError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
				if (!environments || environments.length === 0) {
					return cbMain(null, output);
				}
				
				async.eachSeries(environments, function (oneEnv, mCb) {
					//NOTE: need to get registry for environment, deployer depends on registry not environment record
					//NOTE: can't get registries without listing environments, no other way to get the list of available registries
					var options = helpers.buildDeployerOptions(oneEnv, soajs, BL.model);
					checkReturnError(soajs, cbMain, {config: config, error: !options, code: 825}, function () {
						options.params = {
							env: oneEnv.code.toLowerCase()
						};
						let port;
						
						deployer.execute({
							'type': 'container',
							'driver': options.strategy
						}, 'listServices', options, (error, services) => {
							checkReturnError(soajs, cbMain, {config: config, error: error}, function () {
								
								BL.model.findEntry(soajs, {
									collection: "infra",
									conditions: { "deployments.environments": {"$in": [ oneEnv.code.toUpperCase() ] } }
								}, (error, infraProvider) => {
									checkReturnError(soajs, cbMain, {config: config, error: error}, function () {
										
										let detectedDeployment;
										infraProvider.deployments.forEach((oneDeployment) => {
											if (oneDeployment.environments.indexOf(oneEnv.code.toUpperCase()) !== -1) {
												detectedDeployment = oneDeployment;
											}
										});
										
										//loop in services and see if you find the one you want only
										for (var i = 0; i < services.length; i++) {
											var oneService = services[i];
											if (soajs.inputmaskData.service === oneService.labels["soajs.service.name"]) {
												if (!output[oneEnv.code.toLowerCase()]) {
													output[oneEnv.code.toLowerCase()] = {};
												}
												
												oneService.ports.forEach(function (onePort) {
													if (onePort.published) {
														port = onePort.published;
													}
												});
												
												if (oneEnv.domain === '') {
													let deployerInfo = oneEnv.deployer.selected.split(".");
													if (deployerInfo[1] === 'docker' && deployerInfo[2] === 'local') {
														output[oneEnv.code.toLowerCase()]['domain'] = "localhost";
													}
													else {
														if (oneEnv.deployer[deployerInfo[0]][deployerInfo[1]][deployerInfo[2]]) {
															if (oneEnv.deployer[deployerInfo[0]][deployerInfo[1]][deployerInfo[2]].nodes && oneEnv.deployer[deployerInfo[0]][deployerInfo[1]][deployerInfo[2]].nodes !== '') {
																output[oneEnv.code.toLowerCase()]['domain'] = oneEnv.nodes;
															}
														}
													}
												}
												else {
													output[oneEnv.code.toLowerCase()]['domain'] = oneEnv.apiPrefix + "." + oneEnv.domain;
												}
												break;
											}
										}
										
										if (!port) {
											services.forEach(function (oneService) {
												if (output[oneEnv.code.toLowerCase()] && oneService.labels['soajs.service.name'] === 'controller' && oneService.labels['soajs.env.code'] === oneEnv.code.toLowerCase()) {
													//todo: map domain to inner property
													oneService.ports.forEach(function (onePort) {
														if (onePort.published) {
															port = onePort.published;
														}
													});
												}
											});
											
											if (!port) {
												if (process.env.SOAJS_SAAS && oneEnv.deployer && oneEnv.deployer.selected === 'container.kubernetes.remote') {
													if (oneEnv.deployer.container && oneEnv.deployer.container.kubernetes && oneEnv.deployer.container.kubernetes.remote && oneEnv.deployer.container.kubernetes.remote.nginxDeployType === 'LoadBalancer') {
														port = oneEnv.port;
													}
												}
												else {
													services.forEach(function (oneService) {
														if (output[oneEnv.code.toLowerCase()] && oneService.labels['soajs.service.group'] === 'soajs-nginx' && oneService.labels['soajs.env.code'] === oneEnv.code.toLowerCase()) {
															if(detectedDeployment){
																oneService.ports.forEach(function (onePort) {
																	detectedDeployment.loadBalancers[oneEnv.code.toUpperCase()][oneService.labels['soajs.service.name']].ports.forEach((lbPorts) => {
																		if(lbPorts.published === onePort.published){
																			onePort.published = lbPorts.target
																		}
																	});
																});
															}
															//todo: map domain to inner property
															oneService.ports.forEach(function (onePort) {
																if (!port && onePort.published) {
																	port = onePort.published;
																}
															});
														}
													});
												}
											}
										}
										
										if(!port && oneEnv.port){
											port = oneEnv.port;
										}
										
										if (output[oneEnv.code.toLowerCase()]) {
											output[oneEnv.code.toLowerCase()]['domain'] += ":" + port;
										}
										return mCb(null, true);
									});
								});
							});
						});
					});
				}, function (error) {
					checkReturnError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
						//grab the list of tenant that have ext key in requested env and return tenant code, package nad key as part of response
						helpers.getTenants(soajs, output, BL.model, function (error) {
							checkReturnError(soajs, cbMain, {config: config, error: error}, function () {
								return cbMain(null, output);
							});
						});
					});
				});
			});
		});
	},
	
	"awareness": function (config, soajs, cbMain) {
		hostModel.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (err, envRecord) {
			checkReturnError(soajs, cbMain, {config: config, error: err || !envRecord, code: 600}, function () {
				hostModel.getControllers(soajs, BL.model, envRecord.code, function (err, controllers) {
					checkReturnError(soajs, cbMain, {config: config, error: err, code: 600}, function () {
						return cbMain(null, controllers);
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
