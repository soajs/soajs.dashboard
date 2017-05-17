'use strict';
var fs = require('fs');
var async = require('async');
var deployer = require("soajs").drivers;

var utils = require('../../utils/utils.js');

var colName = 'cd';
var ciColName = 'ci';
var servicesColName = 'services';
var envColName = 'environment';

function checkIfError(req, mainCb, data, cb) {
    if (data.error) {
        if (typeof (data.error) === 'object' && (data.error.message || data.error.msg)) {
            req.soajs.log.error(data.error);
        }

        return mainCb({"code": data.code, "msg": data.config.errors[data.code]});
    } else {
        if (cb) return cb();
    }
}


var BL = {

    model: null,

    /**
     * Function that gets CD config
     * @param  {Object}             config
     * @param  {Request Object}     req
     * @param  {Function}           cb
     *
     */
    getConfig: function (config, req, cb) {
        var opts = { collection: colName };
        BL.model.findEntry(req.soajs, opts, function (error, record) {
            checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
               return cb(null, record || {});
            });
        });
    },

    /**
     * Function that saves CD config
     * @param  {Object}             config
     * @param  {Request Object}     req
     * @param  {Function}           cb
     *
     */
    saveConfig: function (config, req, cb) {
        var opts = {
            collection: colName,
            conditions: {},
            fields: req.soajs.inputmaskData.config,
            options: { upsert: true }
        };
        BL.model.updateEntry(req.soajs, opts, function (error) {
            checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
                return cb(null, true);
            });
        });
    },

    /**
     * Function that triggers CD deploy operation
     * @param  {Object}             config
     * @param  {Request Object}     req
     * @param  {Function}           cb
     *
     */
    cdDeploy: function (config, req, cb) {

        //verify that the deploy_token is valid
        verifyDeployToken(function () {
            //get CD recipe
            BL.getConfig(config, req, function (error, record) {
                checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
                    // get all environments
                    getEnvs(function (error, envs) {
                        //NOTE: the only error returned by this function is from the drivers, which are handled by utils.checkErrorReturn
                        utils.checkErrorReturn(req, cb, {config: config, error: error}, function () {
                            // check if cd should be triggered based on available input
                            checkConfig(record, envs, function (error, servicesList) {
                                // no error to be handled here
                                // redeploy services
                                processCD(servicesList, function (error) {
                                    checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
                                        return cb(null, true);
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

        function verifyDeployToken(cb) {
            var opts = {
                collection: ciColName
            };
            BL.model.findEntries(req.soajs, opts, function (error, records) {
                checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
                    checkIfError(req, cb, {config: config, error: !records || records.length === 0, code: 955}, function () {
                        var ciConfig = records[0];
                        checkIfError(req, cb, {
                            config: config,
                            error: ciConfig.gitToken !== req.soajs.inputmaskData.deploy_token,
                            code: 956
                        }, cb);
                    });
                });
            });
        }

        function getEnvs(cb) {
            var opts = {
                collection: envColName,
                conditions: {}
            };
            BL.model.findEntries(req.soajs, opts, function (error, envs) {
                checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
                    // get all services deployed in each environment
                    async.map(envs, function (oneEnv, callback) {
                        var options = utils.buildDeployerOptions(oneEnv, req.soajs, BL);
                        options.params = { env: oneEnv.code.toLowerCase() };
                        deployer.listServices(options, function (error, services) {
                            if (error) return callback(error);

                            //map repo name and branch of each service and return an updated array with the values
                            async.map(services, function (oneService, callback) {
                                var repo = '', branch = '';
                                oneService.env.forEach(function (oneEnv) {
                                    if (oneEnv.indexOf('SOAJS_GIT_REPO') !== -1) oneService.repo = oneEnv.split('=')[1];
                                    else if (oneEnv.indexOf('SOAJS_GIT_BRANCH') !== -1) oneService.branch = oneEnv.split('=')[1];
                                });

                                return callback(null, oneService);
                            }, function (error, mappedServices) {
                                //filter services, only return those who match the repo and branch provided by the api request
                                async.filter(mappedServices, function (oneService, callback) {
                                    return callback(null, ((oneService.repo === req.soajs.inputmaskData.repo) && (oneService.branch === req.soajs.inputmaskData.branch)));
                                }, function (error, repoServices) {
                                    return callback(null, { record: oneEnv, services: repoServices });
                                });
                            });
                        });
                    }, cb);
                });
            });
        }


        function checkConfig(record, envs, cb) {
            if (!record) return cb(); // no CD config found
            async.concat(envs, function (oneEnv, callback) {
                var cdEnvConfig = record[oneEnv.record.code.toUpperCase()];
                if (!cdEnvConfig) return callback(null, []); // no CD config found for environment
                if (!oneEnv.services || oneEnv.services.length === 0) return callback(null, []); // no services matching repo/branch were found in this environment

                async.map(oneEnv.services, function (oneService, callback) {
                    var serviceCD = {
                        id: oneService.id,
                        mode: ((oneService.labels && oneService.labels['soajs.service.mode'] ? oneService.labels['soajs.service.mode'] : 'deployment')), //NOTE: only required for kubernetes driver
                        repo: oneService.repo,
                        branch: cdEnvConfig.branch,
                        strategy: cdEnvConfig.strategy,
                        envRecord: oneEnv.record
                    };

                    if (cdEnvConfig[oneService.repo]) {
                        if (cdEnvConfig[oneService].branch) serviceCD.branch = cdEnvConfig[oneService].branch;
                        if (cdEnvConfig[oneService].strategy) serviceCD.strategy = cdEnvConfig[oneService].strategy;
                    }

                    return callback(null, serviceCD);
                }, callback);
            }, cb);
        }

        function processCD(servicesList, cb) {
            async.each(servicesList, function (oneService, callback) {
                if (oneService.strategy === 'update') {
                    var options = utils.buildDeployerOptions(oneService.envRecord, req.soajs, BL);
                    options.params = {
						id: oneService.id,
						mode: oneService.mode,
						action: 'redeploy'
					};
                    return deployer.redeployService(options, callback);
                }
                else if (oneService.strategy === 'notify') {
                    req.soajs.log.info('NOTIFY: Received CD trigger for ' + oneService.repo);
                    return callback();
                }
            }, cb);
        }
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
