'use strict';
var async = require("async");
var utils = require("../../../utils/utils.js");
 var fs = require('fs');

function checkIfError(soajs, mainCb, data, cb) {
	utils.checkErrorReturn(soajs, mainCb, data, cb);
}

var BL = {
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

					var options = utils.buildDeployerOptions(envRecord, soajs, BL);
					if(!options.params){
						options.params = {};
					}

                    if (soajs.inputmaskData.namespace) {
                        options.params.namespace = soajs.inputmaskData.namespace;
                    }
					deployer.execute({'type': 'container', 'driver': options.strategy}, 'listSecrets', options, (error, secrets) => {
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
					var options = utils.buildDeployerOptions(envRecord, soajs, BL);
					options.params = {
						name: soajs.inputmaskData.name.toLowerCase(),
						data: {}
					};
					options.params.data[soajs.inputmaskData.name] =  soajs.inputmaskData.data;

					if (soajs.inputmaskData.type){
						options.params.type = soajs.inputmaskData.type;
					}

                    if (soajs.inputmaskData.namespace) {
                        options.params.namespace = soajs.inputmaskData.namespace;
                    }
					deployer.execute({'type': 'container', 'driver': options.strategy}, 'createSecret', options, (error) => {
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

					var options = utils.buildDeployerOptions(envRecord, soajs, BL);
					options.params = {
						name: soajs.inputmaskData.name,
					};

                    if (soajs.inputmaskData.namespace) {
                        options.params.namespace = soajs.inputmaskData.namespace;
                    }
					deployer.execute({'type': 'container', 'driver': options.strategy}, 'deleteSecret', options, (error) => {
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

					var options = utils.buildDeployerOptions(envRecord, soajs, BL);
					options.params = {
						name: soajs.inputmaskData.name,
					};

                    if (soajs.inputmaskData.namespace) {
                        options.params.namespace = soajs.inputmaskData.namespace;
                    }
					deployer.execute({'type': 'container', 'driver': options.strategy}, 'getSecret', options, (error) => {
						checkIfError(soajs, cbMain, {config: config, error: error}, function () {
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
