'use strict';
const utils = require("../../../utils/utils.js");
const fs = require('fs');

function checkIfError(soajs, mainCb, data, cb) {
	utils.checkErrorReturn(soajs, mainCb, data, cb);
}

let BL = {
	model: null,

	"list": function (config, soajs, deployer, cbMain) {
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

					let options = utils.buildDeployerOptions(envRecord, soajs, BL);
					if(!options.params){
						options.params = {};
					}

                    if (soajs.inputmaskData.namespace) {
                        options.params.namespace = soajs.inputmaskData.namespace;
                    }
					deployer.execute({'type': 'container', 'driver': options.strategy}, 'listPVCs', options, (error, secrets) => {
						checkIfError(soajs, cbMain, {config: config, error: error}, function () {
							return cbMain(null, secrets);
						});
					});
				});
			});
		});
	},

	"add": function (config, soajs, deployer, cbMain) {
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
					let options = utils.buildDeployerOptions(envRecord, soajs, BL);
					if(!options.params){
						options.params = {};
					}
					options.params.name = soajs.inputmaskData.name.toLowerCase();
					options.params.accessModes = soajs.inputmaskData.accessModes;
					options.params.storage = soajs.inputmaskData.storage;
					
                    if (soajs.inputmaskData.namespace) {
                        options.params.namespace = soajs.inputmaskData.namespace;
                    }
					deployer.execute({'type': 'container', 'driver': options.strategy}, 'createPVC', options, (error) => {
						checkIfError(soajs, cbMain, {config: config, error: error}, function () {
							return cbMain(null, true);
						});
					});
				});
			});
		});
	},

	"delete": function (config, soajs, deployer, cbMain) {
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

					let options = utils.buildDeployerOptions(envRecord, soajs, BL);
					if(!options.params){
						options.params = {};
					}
					options.params.name = soajs.inputmaskData.name.toLowerCase();
					
                    if (soajs.inputmaskData.namespace) {
                        options.params.namespace = soajs.inputmaskData.namespace;
                    }
					deployer.execute({'type': 'container', 'driver': options.strategy}, 'deletePVC', options, (error) => {
						checkIfError(soajs, cbMain, {config: config, error: error}, function () {
							return cbMain(null, true);
						});
					});
				});
			});
		});
	},

	"get": function (config, soajs, deployer, cbMain) {
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

					let options = utils.buildDeployerOptions(envRecord, soajs, BL);
					if(!options.params){
						options.params = {};
					}
					options.params.name = soajs.inputmaskData.name.toLowerCase();
					
                    if (soajs.inputmaskData.namespace) {
                        options.params.namespace = soajs.inputmaskData.namespace;
                    }
					deployer.execute({'type': 'container', 'driver': options.strategy}, 'getPVC', options, (error, response) => {
						checkIfError(soajs, cbMain, {config: config, error: error}, function () {
							return cbMain(null, response);
						});
					});
				});
			});
		});
	}
};

module.exports = {
	"init": function (modelName, cb) {
		let modelPath;

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
