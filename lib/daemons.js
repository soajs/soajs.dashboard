'use strict';
var colName = "daemons";
var grpConfCol = "daemon_grpconf";

var async = require("async");
var fs = require('fs');

function validateId(soajs, cb) {
    BL.model.validateId(soajs, cb);
}

function checkIfError(req, res, data, cb) {
    if (data.error) {
        if (typeof (data.error) === 'object' && (data.error.message || data.error.msg)) {
            req.soajs.log.error(data.error);
        }

        return res.jsonp(req.soajs.buildResponse({"code": data.code, "msg": data.config.errors[data.code]}));
    } else {
        if (cb) return cb();
    }
}

function searchForJob (jobName, jobs, cb) {
    for (var job in jobs) {
        if (job === jobName) {
            return cb (null, job);
        }
    }
    return cb("Job not found");
}

var BL = {
    model : null,
    
    "list": function (config, req, res) {
        var opts = {};
        opts.collection = colName;
        opts.conditions = ((req.soajs.inputmaskData.daemonNames) && (req.soajs.inputmaskData.daemonNames.length > 0)) ? {'name': {$in: req.soajs.inputmaskData.daemonNames}} : {};
        BL.model.findEntries(req.soajs, opts, function (error, records) {
            var data = {config: config, error: error, code: 718};
            checkIfError(req, res, data, function () {
                if (req.soajs.inputmaskData.getGroupConfigs) {
                    async.each (records, function (daemonRecord, cb) {
                        opts = {};
                        opts.collection = grpConfCol;
                        opts.conditions = {'daemon': daemonRecord.name};
                        opts.fields = {"daemonConfigGroup": 1, "_id": 0};
                        BL.model.findEntries(req.soajs, opts, function (error, grpConfs) {
                            daemonRecord.grpConf = grpConfs;
                            cb (error, daemonRecord);
                        });
                    }, function (error, result) {
                        checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                            return res.jsonp(req.soajs.buildResponse(null, records));
                        });
                    });
                } else {
                    return res.jsonp(req.soajs.buildResponse(null, records));
                }
            });
        });
    },

    "listGroupConfig": function (config, req, res) {
        var opts = {};
        opts.collection = grpConfCol;
        opts.conditions = ((req.soajs.inputmaskData.grpConfNames) && (req.soajs.inputmaskData.grpConfNames.length > 0)) ? {'name': {$in: req.soajs.inputmaskData.grpConfNames}} : {};
        BL.model.findEntries(req.soajs, opts, function (error, records) {
            var data = {config: config, error: error, code: 719};
            checkIfError(req, res, data, function () {
                return res.jsonp(req.soajs.buildResponse(null, records));
            });
        });
    },

    "addGroupConfig": function (config, req, res) {
        var opts = {};
        var criteria = {
            'daemonConfigGroup': req.soajs.inputmaskData.groupName,
            'daemon': req.soajs.inputmaskData.daemon,
            'interval': req.soajs.inputmaskData.interval,
            'status': req.soajs.inputmaskData.status,
            'processing': req.soajs.inputmaskData.processing,
            'jobs': req.soajs.inputmaskData.jobs,
            'order': req.soajs.inputmaskData.order,
            'solo': req.soajs.inputmaskData.solo
        };
        opts.collection = grpConfCol;
        opts.conditions = {"daemonConfigGroup": req.soajs.inputmaskData.groupName, "daemon": req.soajs.inputmaskData.daemon};
        BL.model.countEntries(req.soajs, opts, function (error, count) {
            var data = {config: config, error: error, code: 717};
            checkIfError(req, res, data, function () {
                checkIfError(req, res, {config: config, error: count > 0, code: 714}, function () {
                    opts = {};
                    opts.collection = grpConfCol;
                    opts.record = criteria;
                    BL.model.insertEntry(req.soajs, opts, function (error, result) {
                        data = {config: config, error: error || !result, code: 717};
                        checkIfError(req, res, data, function () {
                            return res.jsonp(req.soajs.buildResponse(null, true));
                        });
                    });
                });
            });
        });
    },

    "updateGroupConfig": function (config, req, res) {
        var opts = {};
        validateId(req.soajs, function (error) {
            var data = {config: config, error: error, code: 701};
            checkIfError(req, res, data, function () {
                var criteria = {'_id': req.soajs.inputmaskData.id};
                var update = {
                    '$set': {
                        'daemonConfigGroup': req.soajs.inputmaskData.groupName,
                        'daemon': req.soajs.inputmaskData.daemon,
                        'interval': req.soajs.inputmaskData.interval,
                        'status': req.soajs.inputmaskData.status,
                        'processing': req.soajs.inputmaskData.processing,
                        'jobs': req.soajs.inputmaskData.jobs,
                        'order': req.soajs.inputmaskData.order,
                        'solo': req.soajs.inputmaskData.solo
                    }
                };
                opts.collection = grpConfCol;
                opts.conditions = criteria;
                opts.fields = update;
                BL.model.updateEntry(req.soajs, opts, function (error, result) {
                    data = {config: config, error: error || !result, code: 715};
                    checkIfError(req, res, data, function () {
                        return res.jsonp (req.soajs.buildResponse(null, true));
                    });
                });
            });
        });
    },

    "deleteGroupConfig": function (config, req, res) {
        var opts = {};
        validateId(req.soajs, function (error) {
            var data = {config: config, error: error, code: 701};
            checkIfError(req, res, data, function () {
                opts.collection = grpConfCol;
                opts.conditions = {'_id': req.soajs.inputmaskData.id};
                BL.model.removeEntry(req.soajs, opts, function (error, result) {
                    data = {config: config, error: error || !result, code: 716};
                    checkIfError(req, res, data, function () {
                        return res.jsonp(req.soajs.buildResponse(null, true));
                    });
                });
            });
        });
    },

    "updateServiceConfig": function  (config, req, res) {
        var opts = {};
        validateId(req.soajs, function (error) {
            var data = {config: config, error: error, code: 701};
            checkIfError(req, res, data, function () {
                opts.collection = grpConfCol;
                opts.conditions = {_id: req.soajs.inputmaskData.id};
                BL.model.findEntry(req.soajs, opts, function (error, group) {
                    data = {config: config, error: error || !group, code: 725};
                    checkIfError(req, res, data, function () {
                        searchForJob(req.soajs.inputmaskData.jobName, group.jobs, function (error, job) {
                            data = {config: config, error: error || !job, code: 724};
                            checkIfError(req, res, data, function () {
                                group.jobs[job].serviceConfig[req.soajs.inputmaskData.env] = req.soajs.inputmaskData.config;
                                if (Object.keys(group.jobs[job].serviceConfig[req.soajs.inputmaskData.env]).length === 0) {
                                    delete group.jobs[job].serviceConfig[req.soajs.inputmaskData.env];
                                }
                                opts = {};
                                opts.collection = grpConfCol;
                                opts.record = group;
                                BL.model.saveEntry(req.soajs, opts, function (error) {
                                    data = {config: config, error: error, code: 720};
                                    checkIfError(req, res, data, function () {
                                        return res.jsonp(req.soajs.buildResponse(null, true));
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    },

    "listServiceConfig": function (config, req, res) {
        var opts = {};
        validateId(req.soajs, function (error) {
            var data = {config: config, error: error, code: 701};
            checkIfError(req, res, data, function () {
                opts.collection = grpConfCol;
                opts.conditions = {_id: req.soajs.inputmaskData.id};
                BL.model.findEntry(req.soajs, opts, function (error, group) {
                    data = {config: config, error: error || !group, code: 725};
                    checkIfError(req, res, data, function () {
                        searchForJob(req.soajs.inputmaskData.jobName, group.jobs, function (error, job) {
                            data = {config: config, error: error || !job, code: 724};
                            checkIfError(req, res, data, function () {
                                return res.jsonp(req.soajs.buildResponse(null, group.jobs[job].serviceConfig));
                            });
                        });
                    });
                })
            });
        });
    },

    "updateTenantExtKeys": function (config, req, res) {
        var opts = {};
        validateId(req.soajs, function (error) {
            var data = {config: config, error: error, code: 701};
            checkIfError(req, res, data, function () {
                opts.collection = grpConfCol;
                opts.conditions = {_id: req.soajs.inputmaskData.id};
                BL.model.findEntry(req.soajs, opts, function (error, group) {
                    data = {config: config, error: error || !group, code: 725};
                    checkIfError(req, res, data, function () {
                        searchForJob(req.soajs.inputmaskData.jobName, group.jobs, function (error, job) {
                            data = {config: config, error: error || !job, code: 724};
                            checkIfError(req, res, data, function () {
                                group.jobs[job].tenantExtKeys = req.soajs.inputmaskData.tenantExtKeys;
                                group.jobs[job].tenantsInfo = req.soajs.inputmaskData.tenantsInfo;
                                opts = {};
                                opts.collection = grpConfCol;
                                opts.record = group;
                                BL.model.saveEntry(req.soajs, opts, function (error) {
                                    data = {config: config, error: error, code: 722};
                                    checkIfError(req, res, data, function () {
                                        return res.jsonp(req.soajs.buildResponse(null, true));
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    },

    "listTenantExtKeys": function (config, req, res) {
        var opts = {};
        validateId(req.soajs, function (error) {
            var data = {config: config, error: error, code: 701};
            checkIfError(req, res, data, function () {
                opts.collection = grpConfCol;
                opts.conditions = {_id: req.soajs.inputmaskData.id};
                BL.model.findEntry(req.soajs, opts, function (error, group) {
                    data = {config: config, error: error || !group, code: 725};
                    checkIfError(req, res, data, function () {
                        searchForJob(req.soajs.inputmaskData.jobName, group.jobs, function (error, job) {
                            data = {config: config, error: error || !job, code: 724};
                            checkIfError(req, res, data, function () {
                                return res.jsonp(req.soajs.buildResponse(null, group.jobs[job].tenantsInfo));
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