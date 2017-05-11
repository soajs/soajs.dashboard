'use strict';

var fs = require("fs");
var deployer = require("soajs").drivers;
var utils = require("../../utils/utils.js");

var BL = {
	model: null,
	
	/**
	 * List all cluster nodes from cluster
	 *
	 * @param {Object} options
	 * @param {Response Object} res
	 */
	"listNodes": function (config, soajs, res, cbMain) {
		utils.getEnvironment(soajs, BL.model, process.env.SOAJS_ENV || 'dashboard', function (error, envRecord) {
			utils.checkErrorReturn(soajs, cbMain, {config: config, error: error || !envRecord, code: 402}, function () {
				var options = utils.buildDeployerOptions(envRecord, soajs, BL);
				utils.checkErrorReturn(soajs, cbMain, {config: config, error: !options, code: 825}, function () {
					deployer.listNodes(options, function (error, nodes) {
						utils.checkErrorReturn(soajs, cbMain, {config: config, error: error}, function () {
							return cbMain(null, nodes);
						});
					});
				});
			});
		});
	},
	
	/**
	 * Add a new node to the cluster, only applicable in case of swarm deployment
	 *
	 * @param {Object} options
	 * @param {Response Object} res
	 */
	"addNode": function (config, soajs, res, cbMain) {
		function getEnv(cb) {
			utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (error, envRecord) {
				utils.checkErrorReturn(soajs, cbMain, {
					config: config,
					error: error || !envRecord,
					code: 402
				}, function () {
					return cb(envRecord);
				});
			});
		}
		
		function addNodeToSwarm(envRecord, cb) {
			var options = utils.buildDeployerOptions(envRecord, soajs, BL);
			utils.checkErrorReturn(soajs, cbMain, {config: config, error: !options, code: 825}, function () {
				options.params = {
					host: soajs.inputmaskData.host,
					port: soajs.inputmaskData.port,
					role: soajs.inputmaskData.role
				};
				
				deployer.addNode(options, function (error) {
					utils.checkErrorReturn(soajs, cbMain, {config: config, error: error}, function () {
						return cb();
					});
				});
			});
		}
		
		utils.checkErrorReturn(soajs, cbMain, {
			config: config,
			error: soajs.inputmaskData.env.toLowerCase() !== 'dashboard',
			code: 818
		}, function () {
			getEnv(function (envRecord) {
				addNodeToSwarm(envRecord, function () {
					return cbMain(null, true);
				});
			});
		});
	},
	
	/**
	 * Remove a node from a cluster
	 *
	 * @param {Object} options
	 * @param {Response Object} res
	 */
	"removeNode": function (config, soajs, res, cbMain) {
		function getEnvRecord(cb) {
			utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (error, envRecord) {
				utils.checkErrorReturn(soajs, cbMain, {
					config: config,
					error: error || !envRecord,
					code: 402
				}, function () {
					return cb(envRecord);
				});
			});
		}
		
		function removeNodeFromSwarm(envRecord, cb) {
			var options = utils.buildDeployerOptions(envRecord, soajs, BL);
			options.params = {
				id: soajs.inputmaskData.nodeId
			};
			
			deployer.removeNode(options, function (error) {
				utils.checkErrorReturn(soajs, cbMain, {config: config, error: error}, cb);
			});
		}
		
		utils.checkErrorReturn(soajs, cbMain, {
			config: config,
			error: soajs.inputmaskData.env.toLowerCase() !== 'dashboard',
			code: 818
		}, function () {
			getEnvRecord(function (envRecord) {
				removeNodeFromSwarm(envRecord, function () {
					return cbMain(null, true);
				});
			});
		});
	},
	
	/**
	 * Update the role or availability of a node (role updates only applicable for swarm deployment)
	 *
	 * @param {Object} options
	 * @param {Response Object} res
	 */
	"updateNode": function (config, soajs, res, cbMain) {
		utils.checkErrorReturn(soajs, cbMain, {
			config: config,
			error: soajs.inputmaskData.env.toLowerCase() !== 'dashboard',
			code: 818
		}, function () {
			utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (error, envRecord) {
				utils.checkErrorReturn(soajs, cbMain, {
					config: config,
					error: error || !envRecord,
					code: 402
				}, function () {
					var options = utils.buildDeployerOptions(envRecord, soajs, BL);
					options.params = {};
					options.params.id = soajs.inputmaskData.nodeId;
					options.params[soajs.inputmaskData.type] = soajs.inputmaskData.value;
					
					deployer.updateNode(options, function (error) {
						utils.checkErrorReturn(soajs, cbMain, {config: config, error: error}, function () {
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
