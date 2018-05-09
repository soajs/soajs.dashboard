'use strict';
var fs = require("fs");
var async = require("async");
const utils = require("../../utils/utils.js");

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
								conditions: { "$where": "this.deployments.length >= 1" } //get infra that have at least one deployment
							}, (error, infraProviders) => {
								checkReturnError(soajs, mCb, {config: config, error: error}, function () {
									let detectedDeployment;
									async.eachSeries(cloudEnvironments, (oneEnv, vCb) => {
										
										//get deployment from infra based on environment code
										infraProviders.forEach((oneInfra) => {
											oneInfra.deployments.forEach((oneDeployment) => {
												if (oneDeployment.environments.indexOf(oneEnv.code.toUpperCase()) !== -1 && oneDeployment.loadBalancers && oneDeployment.loadBalancers[oneEnv.code.toUpperCase()]) {
													detectedDeployment = oneDeployment;
												}
											});
										});
										
										let options = helpers.buildDeployerOptions(oneEnv, soajs, BL.model);
										checkReturnError(soajs, vCb, {config: config, error: !options, code: 825}, function () {
											options.params = {
												env: oneEnv.code.toLowerCase()
											};
											let port;
											
											deployer.execute({ 'type': 'container', 'driver': options.strategy }, 'listServices', options, (error, services) => {
												checkReturnError(soajs, vCb, {config: config, error: error}, function () {
													
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
														//check infra for loadbalancer settings and update the service ports regardless of which service was found
														if(detectedDeployment){
															oneService.ports.forEach(function (onePort) {
																detectedDeployment.loadBalancers[oneEnv.code.toUpperCase()][oneService.labels['soajs.service.name']].ports.forEach((lbPorts) => {
																	if (lbPorts.published === onePort.published) {
																		onePort.published = lbPorts.target
																	}
																});
															});
														}
														
														//check if service ports are exposed
														if (oneService.labels["soajs.service.name"] === soajs.inputmaskData.service) {
															oneService.ports.forEach(function (onePort) {
																if (onePort.published) {
																	port = onePort.published;
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
														
														//didn't find any port, use environment port if set
														if (!port && oneEnv.port) {
															port = oneEnv.port;
														}
														return sCb();
													}, () => {
														if(response[oneEnv.code.toLowerCase()] && port){
															response[oneEnv.code.toLowerCase()]['domain'] += ":" + port;
														}
														return vCb();
													});
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
