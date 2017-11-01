'use strict';

var fs = require("fs");
var utils = require("../../../utils/utils.js");

function checkIfError(soajs, mainCb, data, cb) {
	data.model = BL.model;
	utils.checkErrorReturn(soajs, mainCb, data, cb);
}

var BL = {
	model: null,

	/**
	 * Get logs of a container
	 *
	 * @param {Object} config
	 * @param {Object} SOAJS
	 * @param {Callback} cbMain
	 */
	"streamLogs": function (config, soajs, deployer, cbMain) {
		utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (error, envRecord) {
			checkIfError(soajs, cbMain, {
				config: config,
				error: error || !envRecord,
				code: 402
			}, function () {
				var options = utils.buildDeployerOptions(envRecord, soajs, BL);
				checkIfError(soajs, cbMain, { config: config, error: !options, code: 600 }, function () {
					options.params = {
						id: soajs.inputmaskData.serviceId,
						taskId: soajs.inputmaskData.taskId
					};
					deployer.getContainerLogs(options, function(error, logs) {
						checkIfError(soajs, cbMain, { config: config, error: error }, function () {
							return cbMain(null, logs);
						});
					});
				});
			});
		});
	},

	/**
	 * Perform a maintenance operation on a deployed SOAJS service
	 *
	 * @param {Object} config
	 * @param {Object} SOAJS
	 * @param {Callback} cbMain
	 */
	"maintenance": function (config, soajs, deployer, cbMain) {
		utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (error, envRecord) {
			checkIfError(soajs, cbMain, {
				config: config,
				error: error || !envRecord,
				code: 402
			}, function () {
				var dbCollection = '';
				if (soajs.inputmaskData.type === 'service') dbCollection = 'services';
				else if (soajs.inputmaskData.type === 'daemon') dbCollection = 'daemons';
				var opts = {
					collection: dbCollection,
					conditions: {
						name: soajs.inputmaskData.serviceName
					}
				};
				BL.model.findEntry(soajs, opts, function (error, record) {
					checkIfError(soajs, cbMain, { config: config, error: error, code: 600 }, function () {
						checkIfError(soajs, cbMain, {
							config: config,
							error: !record,
							code: 795
						}, function () {
							var options = utils.buildDeployerOptions(envRecord, soajs, BL);
							options.params = {
								toEnv: soajs.inputmaskData.env,
								id: soajs.inputmaskData.serviceId,
								network: config.network,
								maintenancePort: record.port + envRecord.services.config.ports.maintenanceInc,
								operation: soajs.inputmaskData.operation
							};
							deployer.maintenance(options, function (error, result) {
								checkIfError(soajs, cbMain, { config: config, error: error }, function () {
									return cbMain(null, result);
								});
							});
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
		function requireModel (filePath, cb) {
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
