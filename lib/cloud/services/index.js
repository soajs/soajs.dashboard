'use strict';

var fs = require("fs");
var utils = require("../../../utils/utils.js");
var async = require("async");
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
										
										BL.model.findEntry(soajs, {
											collection: "infra",
											conditions: { "deployments.environments": {"$in": [ soajs.inputmaskData.env.toUpperCase() ] } }
										}, (error, infraProvider) => {
											checkIfError(soajs, cbMain, {config: config, error: error}, function () {
												
												let detectedDeployment;
												infraProvider.deployments.forEach((oneDeployment) => {
													if(oneDeployment.environments.indexOf(soajs.inputmaskData.env.toUpperCase()) !== -1){
														detectedDeployment = oneDeployment;
													}
												});
												services.forEach(function (oneService) {
													if (oneService.env) {
														for (var e = 0; e < oneService.env.length; e++) {
															var envName = oneService.env[e].split("=")[0];
															if (blackList.indexOf(envName.toLowerCase()) !== -1) {
																oneService.env[e] = envName + "=******************";
															}
														}
														
														if(detectedDeployment && oneService.labels && oneService.labels['soajs.service.type'] === 'server' && oneService.labels['soajs.service.subtype'] === 'nginx'){
															if (detectedDeployment.loadBalancers && detectedDeployment.loadBalancers[soajs.inputmaskData.env.toUpperCase()] && detectedDeployment.loadBalancers[soajs.inputmaskData.env.toUpperCase()][oneService.labels['soajs.service.name']]) {
																oneService.ip = detectedDeployment.loadBalancers[soajs.inputmaskData.env.toUpperCase()][oneService.labels['soajs.service.name']].DNSName;
																//fix the ports
																if(oneService.ports && oneService.servicePortType === 'loadBalancer'){
																	oneService.ports.forEach((onePort) => {
																		detectedDeployment.loadBalancers[soajs.inputmaskData.env.toUpperCase()][oneService.labels['soajs.service.name']].ports.forEach((lbPorts) => {
																			if(lbPorts.published === onePort.published){
																				onePort.published = lbPorts.target
																			}
																		});
																	});
																}
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
		
		async.auto({
			"getEnvironment": (mCb) => {
				utils.getEnvironment(req.soajs, BL.model, req.soajs.inputmaskData.env.toUpperCase(), (error, envRecord) => {
					checkIfError(req.soajs, mCb, { config: config, error: error || !envRecord, code: 600 }, () => {
						return mCb(null, envRecord);
					});
				});
			},
			"getInfra": ["getEnvironment", (info, mCb) => {
				//if infra id provided, use it
				//else pull based on env code
				if(req.soajs.inputmaskData.infraId){
					req.soajs.inputmaskData.id = req.soajs.inputmaskData.infraId;
					BL.model.validateId(req.soajs, (err) => {
						checkIfError(req.soajs, mCb, {config: config, error: err, code: 490}, () => {
							let opts = {
								collection: infraColname,
								conditions: {
									_id: req.soajs.inputmaskData.id
								}
							};
							BL.model.findEntry(req.soajs, opts, function (err, infraRecord) {
								checkIfError(req.soajs, mCb, { config: config, error: err, code: 600 }, () => {
									checkIfError(req.soajs, mCb, { config: config, error: !infraRecord, code: 600 }, () => {
										return mCb(null, infraRecord);
									});
								});
							});
						});
					});
				}
				else{
					let opts = {
						collection: infraColname,
						conditions: {
							"deployments.environments": { "$in": [ info.getEnvironment.code.toUpperCase() ] }
						}
					};
					BL.model.findEntry(req.soajs, opts, function (err, infraRecord) {
						checkIfError(req.soajs, mCb, { config: config, error: err, code: 600 }, () => {
							checkIfError(req.soajs, mCb, { config: config, error: !infraRecord, code: 600 }, () => {
								return mCb(null, infraRecord);
							});
						});
					});
				}
			}],
			"callDeployer": ["getEnvironment", "getInfra", (info, mCb) => {
				let options = utils.buildDeployerOptions(info.getEnvironment, req.soajs, BL);
				options.infra = info.getInfra;
				//need to supply the stack if infra has more than drivers
				options.infra.stack = utils.getDeploymentFromInfra(options.infra, info.getEnvironment.code)[0];
				options.params = {
					id: req.soajs.inputmaskData.serviceId,
					mode: req.soajs.inputmaskData.mode
				};
				
				let technology = req.soajs.inputmaskData.technology || options.strategy;
				deployer.execute({ 'type': 'infra', 'driver': info.getInfra.name, 'technology': technology }, 'deleteService', options, (error) => {
					if(error){
						req.soajs.log.error(error);
					}
					else{
						//once service is deleted, if options.infra contains a stack entry
						if(options.infra.stack){
							delete options.infra.stack;
							BL.model.saveEntry(req.soajs, { collection: 'infra', record: options.infra }, (error) => {
								if(error){ req.soajs.log.error(error); }
							});
						}
					}
				});
				return mCb();
			}]
		}, (error) => {
			checkIfError(req.soajs, cbMain, { config: config, error: error, code: (error) ? error.code : 600 }, () => {
				return cbMain(null, true);
			});
		});
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
