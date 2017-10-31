'use strict';

var fs = require("fs");
var utils = require("../../../utils/utils.js");

var BL = {
	model: null,

	/**
	 * Get Services metrics
	 *
	 * @param {Object} config
	 * @param {Object} SOAJS
	 * @param {Callback} cbMain
	 */
	"getServicesMetrics": function (config, soajs, deployer, cbMain) {
		utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (error, envRecord) {
			utils.checkErrorReturn(soajs, cbMain, {
				config: config,
				error: error || !envRecord,
				code: 402
			}, function () {
				var options = utils.buildDeployerOptions(envRecord, soajs, BL);
				utils.checkErrorReturn(soajs, cbMain, { config: config, error: !options, code: 600 }, function () {
					deployer.getServicesMetrics(options, cbMain);
				});
			});
		});
	},
	
	/**
	 * Get Nodes metrics
	 *
	 * @param {Object} config
	 * @param {Object} SOAJS
	 * @param {Callback} cbMain
	 */
	"getNodesMetrics": function (config, soajs, deployer, cbMain) {
		utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (error, envRecord) {
			utils.checkErrorReturn(soajs, cbMain, {
				config: config,
				error: error || !envRecord,
				code: 402
			}, function () {
				var options = utils.buildDeployerOptions(envRecord, soajs, BL);
				utils.checkErrorReturn(soajs, cbMain, { config: config, error: !options, code: 600 }, function () {
					deployer.getNodesMetrics(options, cbMain);
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
