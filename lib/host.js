'use strict';
var fs = require("fs");
var async = require("async");
var request = require("request");

var deployer = require("soajs.core.drivers");
var data = require("../models/host.js");

function checkIfError(soajs, res, data, cb) {
    if (data.error) {
        if (typeof (data.error) === 'object' && (data.error.message || data.error.msg)) {
            soajs.log.error(data.error);
        }

        return res.jsonp(soajs.buildResponse({"code": data.code, "msg": data.config.errors[data.code]}));
    } else {
        if (cb) return cb();
    }
}

function reloadControllerRegistry(soajs, envRecord, cb) { //TODO: remove, replace with a driver call
    data.getHosts(soajs, BL.model, envRecord.code, 'controller', function (error, ctrlRecords) {
        if (error || !ctrlRecords) {
            soajs.log.error('Unable to get controller records for ' + envRecord.code + ' environment');
            soajs.log.warn('Reload registry for controllers failed');
            return cb();
        }

        var ctrlMaintenancePort = envRecord.services.config.ports.controller + envRecord.services.config.ports.maintenanceInc;
        async.each(ctrlRecords, function (oneCtrl, callback) {
            var maintenanceURL = 'http://' + oneCtrl.ip + ':' + ctrlMaintenancePort + '/reloadRegistry';
            request.get(maintenanceURL, function (error, response, body) {
                try {
                    body = JSON.parse(body);
                    if (error || !body.result) {
                        soajs.log.error('Failed to reload registry for controller with IP: ' + oneCtrl.ip);
                        soajs.log.error(error || body);
                    }
                    else {
                        soajs.log.debug('Reloaded registry for controller with IP: ' + oneCtrl.ip);
                    }

                    return callback();
                }
                catch (e) {
                    soajs.log.error('Failed to reload registry for controller with IP: ' + oneCtrl.ip);
                    soajs.log.error(e);

                    return callback();
                }
            });
        }, cb);
    });
}

function buildDeployerOptions(envRecord, soajs) {
	var options = {};
	var envDeployer = envRecord.deployer;
	
	if (!envDeployer) return null;
	if (Object.keys(envDeployer).length === 0) return null;
	if (!envDeployer.type || !envDeployer.selected) return null;
	if (envDeployer.type === 'manual') return null;
	
	var selected = envDeployer.selected.split('.');
	
	options.strategy = selected[1];
	options.driver = selected[1] + '.' + selected[2];
	options.env = envRecord.code.toLowerCase();
	
	for (var i = 0; i < selected.length; i++) {
		envDeployer = envDeployer[selected[i]];
	}
	
	options.deployerConfig = envDeployer;
	options.soajs = { registry: soajs.registry };
	options.model = BL.model;
	
	//temporary///////
	if (options.strategy === 'docker') options.strategy = 'swarm';
	//////////////////
	
	return options;
}

var BL = {
    model: null,

    "list": function (config, soajs, res) {
        data.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (err, envRecord) {
            checkIfError(soajs, res, {config: config, error: err || !envRecord, code: 600}, function () {

                data.getHosts(soajs, BL.model, envRecord.code, null, function (err, hosts) {
                    checkIfError(soajs, res, {config: config, error: err, code: 600}, function () {

                        return res.jsonp(soajs.buildResponse(null, {
                            'hosts': hosts,
                            'deployer': envRecord.deployer,
                            'profile': envRecord.profile
                        }));
                    });
                });
            });
        });
    },
	
	/*
	 * This function will return all the environments where a service is deployed.
	 * it takes the service name and renders an object having the following form :
	 * "env_code: apiPrefix.domain"
	 * @ param serviceName
	 * @ param getHostEnv
	 * @ param response
	 */
	"listHostEnv": function (config, soajs, res) {
		if(process.env.SOAJS_DEPLOY_HA){
			var output = {};
			BL.model.findEntries(soajs, {"collection": "environment"}, function(error, environments){
				checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
					if(!environments || environments.length === 0){
						return res.jsonp(soajs.buildResponse(null, output));
					}
					
					async.each(environments, function(oneEnv, mCb){
						var options = buildDeployerOptions(oneEnv, soajs);
						checkIfError(soajs, res, {config: config, error: !options, code: 825}, function () {
							options.params = {
								env: oneEnv.code.toLowerCase()
							};
							deployer.listServices(options, function (error, services) {
								checkIfError(soajs, res, {config: config, error: error}, function () {
									
									//loop in services and see if you find the one you want only
									for(var i =0; i < services.length; i++){
										var oneService = services[i];
										if(soajs.inputmaskData.service === oneService.labels["soajs.service.name"]){
											if(soajs.inputmaskData.version){
												if(soajs.inputmaskData.version === oneService.labels["soajs.service.version"]){
													output[oneEnv.code.toLowerCase()] = oneEnv.apiPrefix + "." + oneEnv.domain;
													break;
												}
												else{
													output[oneEnv.code.toLowerCase()] = oneEnv.apiPrefix + "." + oneEnv.domain;
													break;
												}
											}
											else{
												output[oneEnv.code.toLowerCase()] = oneEnv.apiPrefix + "." + oneEnv.domain;
												break;
											}
										}
									}
									
									return mCb(null, true);
								});
							});
						});
					}, function(error){
						checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
							return res.jsonp(soajs.buildResponse(null, output));
						});
					});
				});
			});
		}
		else{
			data.getHostEnv(soajs, BL.model, function (error, envs) {
				checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
					checkIfError(soajs, res, {config: config, error: envs.length === 0, code: 621}, function () {
						
						async.map(envs, function (oneEnv, callback) {
							return callback(null, oneEnv.toUpperCase());
						}, function (error, envsList) {
							data.getEnvInfo(soajs, BL.model, {envList: envsList}, function (error, result) {
								checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
									var response = {};
									result.forEach(function(oneEnvRec){
										response[oneEnvRec.code.toLowerCase()] = oneEnvRec.apiPrefix + "." + oneEnvRec.domain;
									});
									return res.jsonp(soajs.buildResponse(null, response));
								});
							});
						});
					});
				});
			});
		}
	},

    "maintenanceOperation": function (config, soajs, res) {
        soajs.inputmaskData.env = soajs.inputmaskData.env.toLowerCase();
        checkIfError(soajs, res, {
            config: config,
            error: soajs.inputmaskData.operation === 'awarenessStat' && soajs.inputmaskData.serviceName !== 'controller',
            code: 602
        }, function () {
            checkIfError(soajs, res, {
                config: config,
                error: soajs.inputmaskData.operation === 'loadProvision' && soajs.inputmaskData.serviceName === 'controller',
                code: 602
            }, function () {
                //check that the given service has the given port in services collection
                if (soajs.inputmaskData.serviceName === 'controller') {
                    checkServiceHost();
                }
                else {
                    data.getService(soajs, BL.model, {
                        'name': soajs.inputmaskData.serviceName,
                        'port': soajs.inputmaskData.servicePort
                    }, function (error, record) {
                        checkIfError(soajs, res, {config: config, error: error, code: 603}, function () {
                            if (!record) {
                                data.getDaemon(soajs, BL.model, {
                                    'name': soajs.inputmaskData.serviceName,
                                    'port': soajs.inputmaskData.servicePort
                                }, function (error, record) {
                                    checkIfError(soajs, res, {config: config, error: error, code: 603}, function () {
                                        checkIfError(soajs, res, {config: config, error: !record, code: 604}, function () {
                                            checkServiceHost();
                                        });
                                    });
                                });
                            }
                            else {
                                //check that the given service has the given host in hosts collection
                                checkServiceHost();
                            }
                        });
                    });
                }
            });
        });

        function checkServiceHost() {
            data.getOneHost(soajs, BL.model, soajs.inputmaskData.env, soajs.inputmaskData.serviceName, soajs.inputmaskData.serviceHost, soajs.inputmaskData.hostname, function (error, record) {
                checkIfError(soajs, res, {config: config, error: error, code: 603}, function () {
                    checkIfError(soajs, res, {config: config, error: !record, code: 605}, function () {
                        //perform maintenance operation
                        doMaintenance(record);
                    });
                });
            });
        }

        function doMaintenance(oneHost) {
            data.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (err, envRecord) {
                checkIfError(soajs, res, {config: config, error: err || !envRecord, code: 600}, function () {
                    if (!envRecord.deployer) {
                        soajs.log.error('Missing deployer obj');
                    }

                    soajs.inputmaskData.servicePort = soajs.inputmaskData.servicePort + 1000;
                    var maintenanceURL = "http://" + oneHost.ip + ":" + soajs.inputmaskData.servicePort;
                    maintenanceURL += "/" + soajs.inputmaskData.operation;
                    request.get(maintenanceURL, function (error, response, body) {
                        checkIfError(soajs, res, {config: config, error: error, code: 603}, function () {
                            return res.jsonp(soajs.buildResponse(null, JSON.parse(body)));
                        });
                    });
                });
            });
        }
    }
};

module.exports = {
    "init": function (modelName, cb) {
        var modelPath;

        if (!modelName) {
            return cb(new Error("No Model Requested!"));
        }

        modelPath = __dirname + "/../models/" + modelName + ".js";
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
