'use strict';
var colName = "daemons";
var grpConfCol = "daemon_grpconf";

module.exports = {

    "list": function (config, mongo, req, res) {
        var criteria = ((req.soajs.inputmaskData.daemonNames) && (req.soajs.inputmaskData.daemonNames.length > 0)) ? {'name': {$in: req.soajs.inputmaskData.daemonNames}} : {};
        mongo.find(colName, criteria, function (error, records) {
            if (error) {
                req.soajs.log.error (error);
                return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]}));
            }
            return res.jsonp(req.soajs.buildResponse(null, records));
        });
    },

    "add": function (config, mongo, req, res) {
        var criteria = {
            'name': req.soajs.inputmaskData.name,
            'port': req.soajs.inputmaskData.port
        };
        mongo.count(colName, criteria, function (error, count) {
            if (error) {
                req.soajs.log.error (error);
                return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]}));
            }

            if (count > 0) {
                //return daemon already exists error
            }

            mongo.insert(colName, criteria, function (error, result) {
                if (error || !result) {
                    req.soajs.log.error (error);
                    return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]}));
                }

                return res.jsonp (req.soajs.buildResponse(null, true));
            });
        });
    },

    "update": function (config, mongo, req, res) {
        try {
            req.soajs.inputmaskData.id = mongo.ObjectId(req.soajs.inputmaskData.id);
        } catch (e) {
            req.soajs.log.error(e);
        }
        var criteria = {'_id': req.soajs.inputmaskData.id};
        var update = {
            '$set': {
                'name': req.soajs.inputmaskData.name,
                'port': req.soajs.inputmaskData.port
            }
        };
        mongo.update(colName, criteria, update, function (error, result) {
            if (error || !result) {
                req.soajs.log.error (error);
                return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]}));
            }

            return res.jsonp (req.soajs.buildResponse(null, true));
        });
    },

    "delete": function (config, mongo, req, res) {
        try {
            req.soajs.inputmaskData.id = mongo.ObjectId(req.soajs.inputmaskData.id);
        } catch (e) {
            req.soajs.log.error(e);
        }

        var criteria = {'_id': req.soajs.inputmaskData.id};
        mongo.remove(colName, criteria, function (error) {
            if (error) {
                req.soajs.log.error (error);
                return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]}));
            }
            return res.jsonp(req.soajs.buildResponse(null, true));
        });
    },

    "listGroupConfig": function (config, mongo, req, res) {
        var criteria = ((req.soajs.inputmaskData.grpConfNames) && (req.soajs.inputmaskData.grpConfNames.length > 0)) ? {'name': {$in: req.soajs.inputmaskData.grpConfNames}} : {};
        mongo.find(grpConfCol, criteria, function (error, records) {
            if (error) {
                req.soajs.log.error (error);
                return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]}));
            }
            return res.jsonp(req.soajs.buildResponse(null, records));
        });
    },

    "addGroupConfig": function (config, mongo, req, res) {
        var criteria = {
            'daemonConfigGroup': req.soajs.inputmaskData.groupName,
            'interval': req.soajs.inputmaskData.interval,
            'execution': req.soajs.inputmaskData.execution
            //'jobs': req.soajs.inputmaskData.jobs
        };
        mongo.count (grpConfCol, {'_id': req.soajs.inputmaskData.id}, function (error, count) {
            if (error) {
                req.soajs.log.error (error);
                return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]}));
            }

            if (count > 0) {
                //return error group already exists
            }

            mongo.insert (grpConfCol, criteria, function (error, result) {
                if (error) {
                    req.soajs.log.error (error);
                    return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]}));
                }

                return res.jsonp(req.soajs.buildResponse(null, true));
            });
        });
    },

    "updateGroupConfig": function (config, mongo, req, res) {
        try {
            req.soajs.inputmaskData.id = mongo.ObjectId(req.soajs.inputmaskData.id);
        } catch (e) {
            req.soajs.log.error(e);
        }
        var criteria = {'_id': req.soajs.inputmaskData.id};
        var update = {
            '$set': {
                'daemonConfigGroup': req.soajs.inputmaskData.groupName,
                'interval': req.soajs.inputmaskData.interval,
                'execution': req.soajs.inputmaskData.execution
            }
        };
        mongo.update(colName, criteria, update, function (error, result) {
            if (error || !result) {
                req.soajs.log.error (error);
                return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]}));
            }

            return res.jsonp (req.soajs.buildResponse(null, true));
        });
    },

    "deleteGroupConfig": function (config, mongo, req, res) {
        try {
            req.soajs.inputmaskData.id = mongo.ObjectId(req.soajs.inputmaskData.id);
        } catch (e) {
            req.soajs.log.error(e);
        }
        var criteria = {'_id': req.soajs.inputmaskData.id};
        mongo.remove(grpConfCol, criteria, function (error) {
            if (error) {
                req.soajs.log.error (error);
                return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]}));
            }
            return res.jsonp(req.soajs.buildResponse(null, true));
        });
    }
};