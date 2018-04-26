'use strict';

var fs = require("fs");
var utils = require("../../../utils/utils.js");

function checkIfError(soajs, mainCb, data, cb) {
	utils.checkErrorReturn(soajs, mainCb, data, cb);
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
	"listNodes": function (config, soajs, deployer, cbMain) {
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
						deployer.execute({'type': 'container', 'driver': options.strategy}, 'listNodes', options, (error, nodes) => {
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
		});
	},

	/**
	 * Add a new node to the cluster, only applicable in case of swarm deployment
	 *
	 * @param {Object} config
	 * @param {Object} SOAJS
	 * @param {Callback} cbMain
	 */
	"addNode": function (config, soajs, deployer, cbMain) {
		function addNodeToSwarm(cb) {
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
							options.params = {
								host: soajs.inputmaskData.host,
								port: soajs.inputmaskData.port,
								role: soajs.inputmaskData.role
							};
							
							deployer.execute({'type': 'container', 'driver': options.strategy}, 'addNode', options, (error) => {
								checkIfError(soajs, cbMain, {config: config, error: error}, function () {
									return cb();
								});
							});
						});
					});
				});
			});
		}

		addNodeToSwarm(function () {
			return cbMain(null, true);
		});
	},

	/**
	 * Remove a node from a cluster
	 *
	 * @param {Object} config
	 * @param {Object} SOAJS
	 * @param {Callback} cbMain
	 */
	"removeNode": function (config, soajs, deployer, cbMain) {
		function removeNodeFromSwarm(cb) {
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
							id: soajs.inputmaskData.nodeId
						};
						
						deployer.execute({'type': 'container', 'driver': options.strategy}, 'removeNode', options, (error) => {
							checkIfError(soajs, cbMain, {config: config, error: error}, cb);
						});
					});
				});
			});
		}

		removeNodeFromSwarm(function () {
			return cbMain(null, true);
		});
	},

	/**
	 * Update the role or availability of a node (role updates only applicable for swarm deployment)
	 *
	 * @param {Object} config
	 * @param {Object} SOAJS
	 * @param {Callback} cbMain
	 */
	"updateNode": function (config, soajs, deployer, cbMain) {
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
					options.params = {};
					options.params.id = soajs.inputmaskData.nodeId;
					options.params[soajs.inputmaskData.type] = soajs.inputmaskData.value;
					
					deployer.execute({'type': 'container', 'driver': options.strategy}, 'updateNode', options, (error) => {
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
