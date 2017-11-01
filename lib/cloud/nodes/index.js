'use strict';

var fs = require("fs");
var utils = require("../../../utils/utils.js");

function checkIfError(req, mainCb, data, cb) {
	data.model = BL.model;
	utils.checkErrorReturn(req.soajs, mainCb, data, cb);
}

var BL = {
	model: null,

	/**
	 * List all cluster nodes from cluster
	 *
	 * @param {Object} config
	 * @param {Object} SOAJS
	 * @param {Callback} cbMain
	 */
	"listNodes": function (config, soajs, registry, deployer, cbMain) {
		utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (error, envRecord) {
			checkIfError(soajs, cbMain, {config: config, error: error || !envRecord, code: 402}, function () {
				var options = utils.buildDeployerOptions(registry, soajs, BL);
				checkIfError(soajs, cbMain, {config: config, error: !options, code: 825}, function () {
					deployer.listNodes(options, function (error, nodes) {
						checkIfError(soajs, cbMain, {config: config, error: error}, function () {

							var opts = {
								collection: 'nodes'
							};
							BL.model.findEntry(soajs, opts, function(error, nodesInfo){
								checkIfError(soajs, cbMain, {config: config, error: error}, function () {
									if(nodesInfo && Object.keys(nodesInfo).length > 0){
										nodes.forEach(function(oneNode){
											oneNode.labels = {
												provider: nodesInfo[oneNode.id]
											};
										});
									}
									return cbMain(null, nodes);
								});
							});
						});
					});
				});
			});
		});
	},

	/**
	 * Add a new node to the cluster, only applicable in case of swarm deployment
	 *
	 * @param {Object} config
	 * @param {Object} SOAJS
	 * @param {Callback} cbMain
	 */
	"addNode": function (config, soajs, registry, deployer, cbMain) {
		function getEnv(cb) {
			utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (error, envRecord) {
				checkIfError(soajs, cbMain, {
					config: config,
					error: error || !envRecord,
					code: 402
				}, function () {
					return cb(envRecord);
				});
			});
		}

		function addNodeToSwarm(envRecord, cb) {
			var options = utils.buildDeployerOptions(registry, soajs, BL);
			checkIfError(soajs, cbMain, {config: config, error: !options, code: 825}, function () {
				options.params = {
					host: soajs.inputmaskData.host,
					port: soajs.inputmaskData.port,
					role: soajs.inputmaskData.role
				};

				deployer.addNode(options, function (error) {
					checkIfError(soajs, cbMain, {config: config, error: error}, function () {
						return cb();
					});
				});
			});
		}

		checkIfError(soajs, cbMain, {
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
	 * @param {Object} config
	 * @param {Object} SOAJS
	 * @param {Callback} cbMain
	 */
	"removeNode": function (config, soajs, registry, deployer, cbMain) {
		function getEnvRecord(cb) {
			utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (error, envRecord) {
				checkIfError(soajs, cbMain, {
					config: config,
					error: error || !envRecord,
					code: 402
				}, function () {
					return cb(envRecord);
				});
			});
		}

		function removeNodeFromSwarm(envRecord, cb) {
			var options = utils.buildDeployerOptions(registry, soajs, BL);
			options.params = {
				id: soajs.inputmaskData.nodeId
			};

			deployer.removeNode(options, function (error) {
				checkIfError(soajs, cbMain, {config: config, error: error}, cb);
			});
		}

		checkIfError(soajs, cbMain, {
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
	 * @param {Object} config
	 * @param {Object} SOAJS
	 * @param {Callback} cbMain
	 */
	"updateNode": function (config, soajs, registry, deployer, cbMain) {
		checkIfError(soajs, cbMain, {
			config: config,
			error: soajs.inputmaskData.env.toLowerCase() !== 'dashboard',
			code: 818
		}, function () {
			utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (error, envRecord) {
				checkIfError(soajs, cbMain, {
					config: config,
					error: error || !envRecord,
					code: 402
				}, function () {
					var options = utils.buildDeployerOptions(registry, soajs, BL);
					options.params = {};
					options.params.id = soajs.inputmaskData.nodeId;
					options.params[soajs.inputmaskData.type] = soajs.inputmaskData.value;

					deployer.updateNode(options, function (error) {
						checkIfError(soajs, cbMain, {config: config, error: error}, function () {
							return cbMain(null, true);
						});
					});
				});
			});
		});
	},

	/**
	 * Add / Update the node tag and specify which provider hosts it.
	 * @param {Object} config
	 * @param {Object} soajs
	 * @param {Callback} cbMain
	 */
	"tagNode": function(config, soajs, cbMain){
		BL.model.findEntry(soajs, {
			collection: 'nodes',
			conditions: {}
		}, function(error, tagRecord){
			checkIfError(soajs, cbMain, {config: config, error: error}, function () {
				tagRecord = (tagRecord) ? tagRecord : {};
				tagRecord[soajs.inputmaskData.id] = soajs.inputmaskData.tag;

				BL.model.saveEntry(soajs, {
					collection: 'nodes',
					record:tagRecord
				}, function(error){
					checkIfError(soajs, cbMain, {config: config, error: error}, function () {
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
