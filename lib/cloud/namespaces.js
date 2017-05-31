'use strict';
var fs = require("fs");
var utils = require("../../utils/utils.js");

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
        utils.getEnvironment(soajs, BL.model, process.env.SOAJS_ENV || 'DEV', function (error, envRecord) {
            utils.checkErrorReturn(soajs, cbMain, {config: config, error: error, code: 600}, function () {
                utils.checkErrorReturn(soajs, cbMain, {config: config, error: !envRecord, code: 402}, function () {
                    var deployerCheck = ((envRecord.deployer.type === 'container') && (envRecord.deployer.selected.split('.')[1] === 'kubernetes'));
                    utils.checkErrorReturn(soajs, cbMain, {config: config, error: !deployerCheck, code: 909}, function () {
                        var options = utils.buildDeployerOptions(envRecord, soajs, BL);
                        deployer.listNameSpaces(options, function (error, namespaces) {
                            utils.checkErrorReturn(soajs, cbMain, {config: config, error: error}, function () {
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
        utils.getEnvironment(soajs, BL.model, process.env.SOAJS_ENV || 'DEV', function (error, envRecord) {
            utils.checkErrorReturn(soajs, cbMain, {config: config, error: error, code: 600}, function () {
                utils.checkErrorReturn(soajs, cbMain, {config: config, error: !envRecord, code: 402}, function () {
                    var deployerCheck = ((envRecord.deployer.type === 'container') && (envRecord.deployer.selected.split('.')[1] === 'kubernetes'));
                    utils.checkErrorReturn(soajs, cbMain, {config: config, error: !deployerCheck, code: 909}, function () {
                        var options = utils.buildDeployerOptions(envRecord, soajs, BL);
                        options.params = {
                            id: soajs.inputmaskData.namespaceId
                        };
                        deployer.deleteNameSpace(options, function (error) {
                            utils.checkErrorReturn(soajs, cbMain, {config: config, error: error}, function () {
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
