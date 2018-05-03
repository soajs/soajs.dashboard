'use strict';

var fs = require("fs");
var utils = require("../../../utils/utils.js");
var async = require("async");
var request = require("request");
var infraColname = 'infra';

function checkIfError(soajs, mainCb, data, cb) {
	utils.checkErrorReturn(soajs, mainCb, data, cb);
}

var BL = {
	model: null,

	/**
	 * List all deployed services from cluster, SOAJS content + custom deployments/services
	 *
	 * @param {Object} Config
	 * @param {Object} SOAJS
	 * @param {Callback Function} cbMain
	 */
	"listServices": function (config, soajs, deployer, cbMain) {
		utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env.toUpperCase(), function (error, envRecord) {
			checkIfError(soajs, cbMain, {
				config: config,
				error: error || !envRecord,
				code: 600
			}, function () {
				checkIfError(soajs, cbMain, {
					config: config,
					error: !envRecord.deployer.type || !envRecord.deployer.selected || envRecord.deployer.type === 'manual',
					code: 743
				}, function () {
					var options = utils.buildDeployerOptions(envRecord, soajs, BL);
					checkIfError(soajs, cbMain, {config: config, error: !options, code: 825}, function () {
						//NOTE: listing soajs content by env
						options.params = {env: soajs.inputmaskData.env.toLowerCase()};
						deployer.execute({
							'type': 'container',
							'driver': options.strategy
						}, 'listServices', options, (error, services) => {
							checkIfError(soajs, cbMain, {config: config, error: error}, function () {
								//NOTE: listing custom content
								options.params = {custom: true};
								deployer.execute({
									'type': 'container',
									'driver': options.strategy
								}, 'listServices', options, (error, customServices) => {
									checkIfError(soajs, cbMain, {config: config, error: error}, function () {
										if (!services) services = [];
										if (customServices && customServices.length > 0) {
											services = services.concat(customServices);
										}
										var blackList = config.HA.blacklist;
										if (soajs.servicesConfig.dashboard && soajs.servicesConfig.dashboard.HA && soajs.servicesConfig.dashboard.HA.blacklist) {
											blackList = soajs.servicesConfig.dashboard.HA.blacklist;
										}
										services.forEach(function (oneService) {
											if (oneService.env) {
												for (var e = 0; e < oneService.env.length; e++) {
													var envName = oneService.env[e].split("=")[0];
													if (blackList.indexOf(envName.toLowerCase()) !== -1) {
														oneService.env[e] = envName + "=******************";
													}
												}
											}
										});

										return cbMain(null, services);
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
	 * Scale a deployed service (SOAJS content or custom)
	 *
	 * @param {Object} Config
	 * @param {Object} SOAJS
	 * @param {Callback Function} cbMain
	 */
	"scaleService": function (config, soajs, deployer, cbMain) {
		utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env.toUpperCase(), function (error, envRecord) {
			checkIfError(soajs, cbMain, {
				config: config,
				error: error || !envRecord,
				code: 600
			}, function () {
				checkIfError(soajs, cbMain, {
					config: config,
					error: !envRecord.deployer.type || !envRecord.deployer.selected || envRecord.deployer.type === 'manual',
					code: 743
				}, function () {

					var options = utils.buildDeployerOptions(envRecord, soajs, BL);
					options.params = {
						id: soajs.inputmaskData.serviceId,
						scale: soajs.inputmaskData.scale
					};
					deployer.execute({
						'type': 'container',
						'driver': options.strategy
					}, 'scaleService', options, (error) => {
						checkIfError(soajs, cbMain, {config: config, error: error}, function () {
							return cbMain(null, true);
						});
					});
				});
			});
		});
	},

	/**
	 * Delete a deployed service (SOAJS content or custom)
	 * @param  {Object}   config
	 * @param  {Object}   req
	 * @param  {Object}   deployer
	 * @param  {Function} cbMain
	 */
	"deleteService": function (config, req, deployer, cbMain) {
		var options;
		utils.getEnvironment(req.soajs, BL.model, req.soajs.inputmaskData.env.toUpperCase(), function (error, envRecord) {
			checkIfError(req.soajs, cbMain, {
				config: config,
				error: error || !envRecord,
				code: 600
			}, function () {
				if (req.soajs.inputmaskData.technology && req.soajs.inputmaskData.technology === 'vm') {
					checkIfError(req.soajs, cbMain, {
						config: config,
						error: !req.soajs.inputmaskData.infraAccountId || !req.soajs.inputmaskData.location
						|| !req.soajs.inputmaskData.serviceId,
						code: 840
					}, function () {
						checkIfError(req.soajs, cbMain, {
							config: config,
							error: !envRecord.deployer.type || !envRecord.deployer.selected,
							code: 743
						}, function () {
							options = utils.buildDeployerOptions(envRecord, req.soajs, BL, {technology: req.soajs.inputmaskData.technology});
							req.soajs.inputmaskData.id = req.soajs.inputmaskData.infraAccountId;
							BL.model.validateId(req.soajs, function (err) {
								checkIfError(req.soajs, cbMain, {config: config, error: err, code: 490}, function () {
									let opts = {
										collection: infraColname,
										conditions: {
											_id: req.soajs.inputmaskData.id
										}
									};
									BL.model.findEntry(req.soajs, opts, function (err, infraRecord) {
										checkIfError(req.soajs, cbMain, {
											config: config,
											error: err,
											code: 600
										}, function () {
											checkIfError(req.soajs, cbMain, {
												config: config,
												error: !infraRecord,
												code: 490
											}, function () {
												options.params = {
													location: req.soajs.inputmaskData.location,
													vmName: req.soajs.inputmaskData.serviceId
												};
												options.infra = {
													api: infraRecord.api
												};
												function deleteVm(){
													deployer.execute({
														type: "infra",
														name: infraRecord.name,
														technology: "vm"
													}, 'deleteVM', options, (error) => {
														if (error){
															req.soajs.log.error(error);
														}
														else {
															req.soajs.log.info("Vm successfully deleted!");
														}
													});
												}
												deleteVm();
												req.soajs.log.info("Preparing to delete VM.");
												return cbMain(null, true);
											});
										});
									});
								});
							});
						});
					});
				}
				else {
					checkIfError(req.soajs, cbMain, {
						config: config,
						error: !envRecord.deployer.type || !envRecord.deployer.selected || envRecord.deployer.type === 'manual',
						code: 743
					}, function () {
						checkIfError(req.soajs, cbMain, {
							config: config,
							error: !req.soajs.inputmaskData.mode,
							code: 743
						}, function () {
							options = utils.buildDeployerOptions(envRecord, req.soajs, BL);
							options.params = {
								id: req.soajs.inputmaskData.serviceId,
								mode: req.soajs.inputmaskData.mode //NOTE: required for kubernetes driver only
							};

							deployer.execute({
								'type': 'container',
								'driver': options.strategy
							}, 'inspectService', options, (error, deployedServiceDetails) => {
								checkIfError(req.soajs, cbMain, {config: config, error: error}, function () {
									deployer.execute({
										'type': 'container',
										'driver': options.strategy
									}, 'deleteService', options, (error) => {
										checkIfError(req.soajs, cbMain, {config: config, error: error}, function () {
											checkWithInfra(options, envRecord, deployedServiceDetails);
										});
									});
								});
							});
						});
					});
				}
			});
		});

		function checkWithInfra(options, envRecord, deployedServiceDetails) {
			BL.model.findEntry(req.soajs, {
				collection: 'infra',
				conditions: {
					"deployments.environments": {$in: [envRecord.code.toUpperCase()]}
				}
			}, (error, infraRecord) => {
				checkIfError(req.soajs, cbMain, {config: config, error: error}, function () {
					let infraStack, info, index;
					for (let i = 0; i < infraRecord.deployments.length; i++) {
						let oneStack = infraRecord.deployments[i];
						if (oneStack.environments.indexOf(envRecord.code.toUpperCase()) !== -1) {
							infraStack = oneStack;
							index = i;
							break;
						}
					}

					if (!infraStack) {
						return cbMain(null, true);
					}
					let environments = [];
					if (infraStack.environments) {
						infraStack.environments.forEach((oneEnv) => {
							environments.push({code: oneEnv.toUpperCase()});
						});
					}
					info = [infraStack, environments, index];

					//if there is a loadbalancer for this service make a call to drivers to delete it
					if (infraStack.loadBalancers && infraStack.loadBalancers[envRecord.code.toUpperCase()]
						&& infraStack.loadBalancers[envRecord.code.toUpperCase()][deployedServiceDetails.service.labels['soajs.service.name']]
						&& infraStack.loadBalancers[envRecord.code.toUpperCase()][deployedServiceDetails.service.labels['soajs.service.name']].name) {
						options.params = {
							envCode: envRecord.code.toLowerCase(),
							info: info,
							infra: infraRecord,
							name: deployedServiceDetails.service.labels['soajs.service.name'],
							ElbName: infraStack.loadBalancers[envRecord.code.toUpperCase()][deployedServiceDetails.service.labels['soajs.service.name']].name
						};
						options.infra = infraRecord;
						options.infra.stack = infraStack;

						deployer.execute({
							'type': 'infra',
							'driver': infraRecord.name,
							'technology': 'cluster'
						}, 'deleteExternalLB', options, (error) => {
							checkIfError(req.soajs, cbMain, {config: config, error: error}, function () {
								delete infraRecord.stack;
								BL.model.saveEntry(req.soajs, { collection: 'infra', record: infraRecord }, (error) => {
									checkIfError(req.soajs, cbMain, {config: config, error: error}, function () {
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
		}
	},

	/**
	 * Check if resource is deployed
	 * @param  {Object}   config
	 * @param  {Object}   soajs
	 * @param  {Object}   deployer
	 * @param  {Function} cb
	 *
	 */
	"checkResource": function (config, soajs, deployer, cb) {
		utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env.toUpperCase(), function (error, envRecord) {
			checkIfError(soajs, cb, {
				config: config,
				error: error || !envRecord,
				code: 600
			}, function () {
				checkIfError(soajs, cb, {
					config: config,
					error: !envRecord.deployer.type || !envRecord.deployer.selected || envRecord.deployer.type === 'manual',
					code: 743
				}, function () {

					var options = utils.buildDeployerOptions(envRecord, soajs, BL);
					checkIfError(soajs, cb, {config: config, error: !options, code: 600}, function () {
						deployer.execute({
							'type': 'container',
							'driver': options.strategy
						}, 'listKubeServices', options, (error, services) => {
							checkIfError(soajs, cb, {config: config, error: error}, function () {
								async.detect(services, function (oneService, callback) {
									return callback(null, oneService && oneService.metadata && oneService.metadata.name === soajs.inputmaskData.resource && oneService.metadata.namespace === soajs.inputmaskData.namespace);
								}, function (error, service) {
									//no error to be handled
									return cb(null, {
										deployed: (service && Object.keys(service).length > 0) ? true : false
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
	 * List all deployed virtual machines by account
	 *
	 * @param  {Object}   config
	 * @param  {Object}   soajs
	 * @param  {Object}   deployer
	 * @param  {Function} cbMain
	 */
	"listVMs": function (config, soajs, deployer, cbMain) {
		utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env.toUpperCase(), function (error, envRecord) {
			checkIfError(soajs, cbMain, {
				config: config,
				error: error || !envRecord,
				code: 600
			}, function () {
				checkIfError(soajs, cbMain, {
					config: config,
					error: !envRecord.deployer.type || !envRecord.deployer.selected,
					code: 743
				}, function () {
					let opts = {
						collection: infraColname,
						conditions: {
							"technologies": { $in: ["vm"] }
						}
					};
					BL.model.findEntries(soajs, opts, function (err, infraRecords) {
						checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, function () {
							let result = {};
							let options = utils.buildDeployerOptions(envRecord, soajs, BL, {technology: 'vm'});
							function callList(oneInfra, cb) {
								options.infra = {
									api: oneInfra.api
								};
								deployer.execute({
									type: "infra",
									name: oneInfra.name,
									technology: "vm"
								}, 'listVMs', options, (error, vms) => {
									checkIfError(soajs, cb, {config: config, error: error}, function () {
										if(!result[oneInfra.name]){
											result[oneInfra.name] = {
												list: [],
												label: oneInfra.label
											};
										}
										result[oneInfra.name].list = result[oneInfra.name].list.concat(vms);
										return cb(null, true);
									});
								});
							}
							async.eachSeries(infraRecords, callList, function (err) {
								checkIfError(soajs, cbMain, {config: config, error: err}, function () {
									return cbMain(null, result);
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
