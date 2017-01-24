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
