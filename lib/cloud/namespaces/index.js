'use strict';
var fs = require("fs");
var utils = require("../../../utils/utils.js");

function checkIfError(soajs, mainCb, data, cb) {
	utils.checkErrorReturn(soajs, mainCb, data, cb);
}

var BL = {
    model: null,

    /**
	 * List available namespaces
	 *
     * @param {Object} config
     * @param {Object} SOAJS
     * @param {Callback} cbMain
	 */
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
						var deployerCheck = ((envRecord.deployer.type === 'container') && (envRecord.deployer.selected.split('.')[1] === 'kubernetes'));
						checkIfError(soajs, cbMain, {config: config, error: !deployerCheck, code: 909}, function () {
						var options = utils.buildDeployerOptions(envRecord, soajs, BL);
						deployer.execute({'type': 'container', 'driver': options.strategy}, 'listNameSpaces', options, (error, namespaces) => {
							checkIfError(soajs, cbMain, {config: config, error: error}, function () {
								return cbMain(null, namespaces);
							});
						});
					});
				});
			});
		});
    },

    /**
	 * Delete a namespace
	 *
     * @param {Object} config
     * @param {Object} SOAJS
     * @param {Callback} cbMain
	 */
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
						var deployerCheck = ((envRecord.deployer.type === 'container') && (envRecord.deployer.selected.split('.')[1] === 'kubernetes'));
						checkIfError(soajs, cbMain, {config: config, error: !deployerCheck, code: 909}, function () {
						var options = utils.buildDeployerOptions(envRecord, soajs, BL);
						options.params = {
							id: soajs.inputmaskData.namespaceId
						};
						deployer.execute({'type': 'container', 'driver': options.strategy}, 'deleteNameSpace', options, (error) => {
							checkIfError(soajs, cbMain, {config: config, error: error}, function () {
								return cbMain(null, true);
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
