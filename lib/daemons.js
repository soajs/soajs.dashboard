'use strict';
var colName = "daemons";
var grpConfCol = "daemon_grpconf";

function validateId(mongo, req, cb) {
    try {
        req.soajs.inputmaskData.id = mongo.ObjectId(req.soajs.inputmaskData.id);
        return cb(null);
    } catch (e) {
        return cb(e);
    }
}

function checkIfError(req, res, data, cb) {
    if (data.error) {
        req.soajs.log.error(data.error);
        return res.jsonp(req.soajs.buildResponse({"code": data.code, "msg": data.config.errors[data.code]}));
    } else {
        return cb();
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

module.exports = {

    "list": function (config, mongo, req, res) {
        var criteria = ((req.soajs.inputmaskData.daemonNames) && (req.soajs.inputmaskData.daemonNames.length > 0)) ? {'name': {$in: req.soajs.inputmaskData.daemonNames}} : {};
        mongo.find(colName, criteria, function (error, records) {
            var data = {config: config, error: error, code: 718};
            checkIfError(req, res, data, function () {
                return res.jsonp(req.soajs.buildResponse(null, records));
            });
        });
    },

    "add": function (config, mongo, req, res) {
        var criteria = {
            'name': req.soajs.inputmaskData.name,
            'port': req.soajs.inputmaskData.port,
            'jobs': req.soajs.inputmaskData.jobs
        };
        mongo.count(colName, {$or: [{"name": req.soajs.inputmaskData.name}, {"port": req.soajs.inputmaskData.port}]}, function (error, count) {
            var data = {config: config, error: error, code: 713};
            checkIfError(req, res, data, function () {
                if (count > 0) {
                    return res.jsonp(req.soajs.buildResponse({"code": 710, "msg": config.errors[710]}));
                } else {
                    mongo.insert(colName, criteria, function (error) {
                        data = {config: config, error: error, code: 713};
                        checkIfError(req, res, data, function () {
                            return res.jsonp (req.soajs.buildResponse(null, true));
                        });
                    });
                }
            });
        });
    },

    "update": function (config, mongo, req, res) {
        validateId(mongo, req, function (error) {
            var data = {config: config, error: error, code: 711};
            checkIfError(req, res, data, function () {
                var criteria = {'_id': req.soajs.inputmaskData.id};
                var update = {
                    '$set': {
                        'name': req.soajs.inputmaskData.name,
                        'port': req.soajs.inputmaskData.port,
                        'jobs': req.soajs.inputmaskData.jobs
                    }
                };
                mongo.update(colName, criteria, update, function (error) {
                    data = {config: config, error: error, code: 711};
                    checkIfError(req, res, data, function () {
                        return res.jsonp (req.soajs.buildResponse(null, true));
                    });
                });
            });
        });
    },

    "delete": function (config, mongo, req, res) {
        validateId(mongo, req, function (error) {
            var data = {config: config, error: error, code: 712};
            checkIfError(req, res, data, function () {
                var criteria = {'_id': req.soajs.inputmaskData.id};
                mongo.remove(colName, criteria, function (error) {
                    data = {config: config, error: error, code: 712};
                    checkIfError(req, res, data, function () {
                        return res.jsonp(req.soajs.buildResponse(null, true));
                    });
                });
            });
        });
    },

    "listGroupConfig": function (config, mongo, req, res) {
        var criteria = ((req.soajs.inputmaskData.grpConfNames) && (req.soajs.inputmaskData.grpConfNames.length > 0)) ? {'name': {$in: req.soajs.inputmaskData.grpConfNames}} : {};
        mongo.find(grpConfCol, criteria, function (error, records) {
            var data = {config: config, error: error, code: 719};
            checkIfError(req, res, data, function () {
                return res.jsonp(req.soajs.buildResponse(null, records));
            });
        });
    },

    "addGroupConfig": function (config, mongo, req, res) {
        var criteria = {
            'daemonConfigGroup': req.soajs.inputmaskData.groupName,
            'daemon': req.soajs.inputmaskData.daemon,
            'interval': req.soajs.inputmaskData.interval,
            'status': req.soajs.inputmaskData.status,
            'processing': req.soajs.inputmaskData.processing,
            'jobs': req.soajs.inputmaskData.jobs,
            'order': req.soajs.inputmaskData.order
        };
        mongo.count (grpConfCol, {$or: [{"daemonConfigGroup": req.soajs.inputmaskData.groupName}, {"daemon": req.soajs.inputmaskData.daemon}]}, function (error, count) {
            var data = {config: config, error: error, code: 717};
            checkIfError(req, res, data, function () {
                if (count > 0) {
                    return res.jsonp(req.soajs.buildResponse({"code": 714, "msg": config.errors[714]}));
                } else {
                    mongo.insert (grpConfCol, criteria, function (error) {
                        data = {config: config, error: error, code: 717};
                        checkIfError(req, res, data, function () {
                            return res.jsonp(req.soajs.buildResponse(null, true));
                        });
                    });
                }
            });
        });
    },

    "updateGroupConfig": function (config, mongo, req, res) {
        validateId(mongo, req, function (error) {
            var data = {config: config, error: error, code: 715};
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
                        'order': req.soajs.inputmaskData.order
                    }
                };
                mongo.update(grpConfCol, criteria, update, function (error) {
                    data = {config: config, error: error, code: 715};
                    checkIfError(req, res, data, function () {
                        return res.jsonp (req.soajs.buildResponse(null, true));
                    });
                });
            });
        });
    },

    "deleteGroupConfig": function (config, mongo, req, res) {
        validateId(mongo, req, function (error) {
            var data = {config: config, error: error, code: 716};
            checkIfError(req, res, data, function () {
                var criteria = {'_id': req.soajs.inputmaskData.id};
                mongo.remove(grpConfCol, criteria, function (error) {
                    data = {config: config, error: error, code: 716};
                    checkIfError(req, res, data, function () {
                        return res.jsonp(req.soajs.buildResponse(null, true));
                    });
                });
            });
        });
    },

    "updateServiceConfig": function  (config, mongo, req, res) {
        validateId(mongo, req, function (error) {
            var data = {config: config, error: error, code: 720};
            checkIfError(req, res, data, function () {
                mongo.findOne(grpConfCol, {_id: req.soajs.inputmaskData.id}, function (error, group) {
                    data = {config: config, error: error || !group, code: 725};
                    checkIfError(req, res, data, function () {
                        searchForJob(req.soajs.inputmaskData.jobName, group.jobs, function (error, job) {
                            data = {config: config, error: error, code: 724};
                            checkIfError(req, res, data, function () {
                                group.jobs[job].serviceConfig[req.soajs.inputmaskData.env] = req.soajs.inputmaskData.config;
                                if (Object.keys(group.jobs[job].serviceConfig[req.soajs.inputmaskData.env]).length === 0) {
                                    delete group.jobs[job].serviceConfig[req.soajs.inputmaskData.env];
                                }

                                mongo.save(grpConfCol, group, function (error) {
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

    "listServiceConfig": function (config, mongo, req, res) {
        validateId(mongo, req, function (error) {
            var data = {config: config, error: error, code: 721};
            checkIfError(req, res, data, function () {
                mongo.findOne(grpConfCol, {_id: req.soajs.inputmaskData.id}, function (error, group) {
                    data = {config: config, error: error || !group, code: 725};
                    checkIfError(req, res, data, function () {
                        searchForJob(req.soajs.inputmaskData.jobName, group.jobs, function (error, job) {
                            data = {config: config, error: error, code: 724};
                            checkIfError(req, res, data, function () {
                                return res.jsonp(req.soajs.buildResponse(null, group.jobs[job].serviceConfig));
                            });
                        });
                    });
                })
            });
        });
    },

    "updateTenantExtKeys": function (config, mongo, req, res) {
        validateId(mongo, req, function (error) {
            var data = {config: config, error: error, code: 722};
            checkIfError(req, res, data, function () {
                mongo.findOne(grpConfCol, {_id: req.soajs.inputmaskData.id}, function (error, group) {
                    data = {config: config, error: error || !group, code: 725};
                    checkIfError(req, res, data, function () {
                        searchForJob(req.soajs.inputmaskData.jobName, group.jobs, function (error, job) {
                            data = {config: config, error: error, code: 724};
                            checkIfError(req, res, data, function () {
                                group.jobs[job].tenantExtKeys = req.soajs.inputmaskData.tenantExtKeys;
                                group.jobs[job].tenantsInfo = req.soajs.inputmaskData.tenantsInfo;

                                mongo.save(grpConfCol, group, function (error) {
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

    "listTenantExtKeys": function (config, mongo, req, res) {
        validateId(mongo, req, function (error) {
            var data = {config: config, error: error, code: 723};
            checkIfError(req, res, data, function () {
                mongo.findOne(grpConfCol, {_id: req.soajs.inputmaskData.id}, function (error, group) {
                    data = {config: config, error: error || !group, code: 725};
                    checkIfError(req, res, data, function () {
                        searchForJob(req.soajs.inputmaskData.jobName, group.jobs, function (error, job) {
                            data = {config: config, error: error, code: 724};
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