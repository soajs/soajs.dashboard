'use strict';

var fs = require("fs");
var deployer = require("soajs.core.drivers");
var utils = require("../../utils/utils.js");

var BL = {
	model: null,
	
	/**
	 * List all deployed services from cluster, SOAJS content + custom deployments/services
	 *
	 * @param {Object} options
	 * @param {Response Object} res
	 */
	"listServices": function (config, soajs, res, cbMain) {
		utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (error, envRecord) {
			utils.checkErrorReturn(soajs, cbMain, {config: config, error: error || !envRecord, code: 402}, function () {
				var options = utils.buildDeployerOptions(envRecord, soajs, BL);
				utils.checkErrorReturn(soajs, cbMain, {config: config, error: !options, code: 825}, function () {
					//NOTE: listing soajs content by env
					options.params = {env: soajs.inputmaskData.env};
					deployer.listServices(options, function (error, services) {
						utils.checkErrorReturn(soajs, cbMain, {config: config, error: error}, function () {
							//NOTE: listing custom content
							options.params = {custom: true};
							deployer.listServices(options, function (error, customServices) {
								utils.checkErrorReturn(soajs, cbMain, {config: config, error: error}, function () {
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
	},
	
	/**
	 * Scale a deployed service (SOAJS content or custom)
	 *
	 * @param {Object} options
	 * @param {Response Object} res
	 */
	"scaleService": function (config, soajs, res, cbMain) {
		utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (error, envRecord) {
			utils.checkErrorReturn(soajs, cbMain, {config: config, error: error, code: 402}, function () {
				var options = utils.buildDeployerOptions(envRecord, soajs, BL);
				options.params = {
					id: soajs.inputmaskData.serviceId,
					scale: soajs.inputmaskData.scale
				};
				deployer.scaleService(options, function (error) {
					utils.checkErrorReturn(soajs, cbMain, {config: config, error: error}, function () {
						return cbMain(null, true);
					});
				});
			});
		});
	},
	
	/**
	 * Delete a deployed service (SOAJS content or custom)
	 *
	 * @param {Object} options
	 * @param {Response Object} res
	 */
	"deleteService": function (config, soajs, res, cbMain) {
		utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (error, envRecord) {
			utils.checkErrorReturn(soajs, cbMain, {config: config, error: error || !envRecord, code: 402}, function () {
				var options = utils.buildDeployerOptions(envRecord, soajs, BL);
				options.params = {
					id: soajs.inputmaskData.serviceId,
					mode: soajs.inputmaskData.mode //NOTE: required for kubernetes driver only
				};
				deployer.deleteService(options, function (error) {
					utils.checkErrorReturn(soajs, cbMain, {config: config, error: error}, function () {
						return cbMain(null, true);
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
