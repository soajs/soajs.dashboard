'use strict';
var fs = require("fs");
var async = require("async");
var request = require("request");
var hostModel = require("../../models/host.js");

function checkReturnError(soajs, mainCb, data, cb) {
	if (data.error) {
		if (typeof (data.error) === 'object' && (data.error.message || data.error.msg)) {
			soajs.log.error(data.error);
		}

		return mainCb({ "code": data.code, "msg": data.config.errors[data.code] });
	} else {
		if (cb) return cb();
	}
}

var BL = {
	model: null,

	"list": function (config, soajs, cbMain) {
		hostModel.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (err, envRecord) {
			checkReturnError(soajs, cbMain, { config: config, error: err || !envRecord, code: 600 }, function () {
				hostModel.getHosts(soajs, BL.model, envRecord.code, null, function (err, hosts) {
					checkReturnError(soajs, cbMain, { config: config, error: err, code: 600 }, function () {

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
		if (process.env.SOAJS_DEPLOY_HA) {
			BL.listHAhostEnv(config, soajs, deployer, helpers, cbMain);
		}
		else {
			hostModel.getHostEnv(soajs, BL.model, function (error, envs) {
				checkReturnError(soajs, cbMain, { config: config, error: error, code: 600 }, function () {
					checkReturnError(soajs, cbMain, {
						config: config,
						error: envs.length === 0,
						code: 621
					}, function () {
						async.map(envs, function (oneEnv, callback) {
							var opts = {
								"collection": "environment",
								"conditions": {
									"code": oneEnv.toUpperCase(),
									"$or": [
										{
											"sensitive": { "$exists": false }
										},
										{
											"sensitive": false
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

							hostModel.getEnvInfo(soajs, BL.model, { envList: envsList }, function (error, result) {
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
										response[oneEnvRec.code.toLowerCase()]['domain'] = oneEnvRec.apiPrefix + "." + oneEnvRec.domain;
									});
									//grab the list of tenant that have ext key in requested env and return tenant code, package nad key as part of response
									helpers.getTenants(soajs, response, BL.model, function (error) {
										checkReturnError(soajs, cbMain, { config: config, error: error }, function () {
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
	},

	"listHAhostEnv": function (config, soajs, deployer, helpers, cbMain) {
		var output = {};

		//fetch the non sensitive environments only
		var opts = {
			"collection": "environment",
			"conditions": {
				"$or": [
					{
						"sensitive": { "$exists": false }
					},
					{
						"sensitive": false
					},
					{
						"sensitive": null
					}
				]
			}
		};
		BL.model.findEntries(soajs, opts, function (error, environments) {
			checkReturnError(soajs, cbMain, { config: config, error: error, code: 600 }, function () {
				if (!environments || environments.length === 0) {
					return cbMain(null, output);
				}

				async.each(environments, function (oneEnv, mCb) {
					var options = helpers.buildDeployerOptions(oneEnv, soajs, BL.model);
					checkReturnError(soajs, cbMain, { config: config, error: !options, code: 825 }, function () {
						options.params = {
							env: oneEnv.code.toLowerCase()
						};
						deployer.listServices(options, function (error, services) {
							checkReturnError(soajs, cbMain, { config: config, error: error }, function () {
								//loop in services and see if you find the one you want only
								for (var i = 0; i < services.length; i++) {
									var oneService = services[i];
									if (soajs.inputmaskData.service === oneService.labels["soajs.service.name"]) {
										if (!output[oneEnv.code.toLowerCase()]) {
											output[oneEnv.code.toLowerCase()] = {};
										}
										output[oneEnv.code.toLowerCase()]['domain'] = oneEnv.apiPrefix + "." + oneEnv.domain;
										break;
									}
								}

								services.forEach(function (oneService) {
									if (output[oneEnv.code.toLowerCase()] && oneService.labels['soajs.service.group'] === 'soajs-nginx' && oneService.labels['soajs.env.code'] === oneEnv.code.toLowerCase()) {
										//todo: map domain to inner property
										oneService.ports.forEach(function (onePort) {
											if (parseInt(onePort.target) === 80) {
												output[oneEnv.code.toLowerCase()]['domain'] += ":" + onePort.published;
											}
										});
									}
								});
								return mCb(null, true);
							});
						});
					});
				}, function (error) {
					checkReturnError(soajs, cbMain, { config: config, error: error, code: 600 }, function () {
						//grab the list of tenant that have ext key in requested env and return tenant code, package nad key as part of response
						helpers.getTenants(soajs, output, BL.model, function (error) {
							checkReturnError(soajs, cbMain, { config: config, error: error }, function () {
								return cbMain(null, output);
							});
						});
					});
				});
			});
		});
	},

	"maintenanceOperation": function (config, soajs, cbMain) {
		soajs.inputmaskData.env = soajs.inputmaskData.env.toLowerCase();
		checkReturnError(soajs, cbMain, {
			config: config,
			error: soajs.inputmaskData.operation === 'awarenessStat' && soajs.inputmaskData.serviceName !== 'controller',
			code: 602
		}, function () {
			//check that the given service has the given port in services collection
			if (soajs.inputmaskData.serviceName === 'controller') {
				checkServiceHost();
			}
			else {
				hostModel.getService(soajs, BL.model, {
					'name': soajs.inputmaskData.serviceName,
					'port': soajs.inputmaskData.servicePort
				}, function (error, record) {
					checkReturnError(soajs, cbMain, { config: config, error: error, code: 603 }, function () {
						if (!record) {
							hostModel.getDaemon(soajs, BL.model, {
								'name': soajs.inputmaskData.serviceName,
								'port': soajs.inputmaskData.servicePort
							}, function (error, record) {
								checkReturnError(soajs, cbMain, {
									config: config,
									error: error,
									code: 603
								}, function () {
									checkReturnError(soajs, cbMain, {
										config: config,
										error: !record,
										code: 604
									}, function () {
										checkServiceHost();
									});
								});
							});
						}
						else {
							//check that the given service has the given host in hosts collection
							checkServiceHost();
						}
					});
				});
			}
		});

		function checkServiceHost() {
			hostModel.getOneHost(soajs, BL.model, soajs.inputmaskData.env, soajs.inputmaskData.serviceName, soajs.inputmaskData.serviceHost, soajs.inputmaskData.hostname, function (error, record) {
				checkReturnError(soajs, cbMain, { config: config, error: error, code: 603 }, function () {
					checkReturnError(soajs, cbMain, { config: config, error: !record, code: 605 }, function () {
						//perform maintenance operation
						doMaintenance(record);
					});
				});
			});
		}

		function doMaintenance(oneHost) {
			hostModel.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (err, envRecord) {
				checkReturnError(soajs, cbMain, { config: config, error: err || !envRecord, code: 600 }, function () {
					if (!envRecord.deployer) {
						soajs.log.error('Missing deployer obj');
					}

					soajs.inputmaskData.servicePort = soajs.inputmaskData.servicePort + 1000;
					var maintenanceURL = "http://" + oneHost.ip + ":" + soajs.inputmaskData.servicePort;
					maintenanceURL += "/" + soajs.inputmaskData.operation;
					request.get(maintenanceURL, function (error, response, body) {
						checkReturnError(soajs, cbMain, { config: config, error: error, code: 603 }, function () {
							return cbMain(null, JSON.parse(body));
						});
					});
				});
			});
		}
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
