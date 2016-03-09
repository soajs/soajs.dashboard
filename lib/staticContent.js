'use strict';
var colName = 'staticContent';

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
        if (typeof (data.error) === 'object' && data.error.message) {
            req.soajs.log.error(data.error);
        }

        return res.jsonp(req.soajs.buildResponse({"code": data.code, "msg": data.config.errors[data.code]}));
    } else {
        if (cb) return cb();
    }
}

module.exports = {

    "list": function (config, mongo, req, res) {
        var criteria = ((req.soajs.inputmaskData.staticContentNames) && (req.soajs.inputmaskData.staticContentNames.length > 0)) ? {'name': {'$in': req.soajs.inputmaskData.staticContentNames}} : {};
        mongo.find(colName, criteria, function (error, records) {
            checkIfError(req, res, {config: config, error: error, code: 742}, function () {
                return res.jsonp(req.soajs.buildResponse(null, records));
            });
        });
    },

    'add': function (config, mongo, req, res) {
        var newRecord = {
            name: req.soajs.inputmaskData.name,
            type: req.soajs.inputmaskData.type,
            owner: req.soajs.inputmaskData.owner,
            repo: req.soajs.inputmaskData.repo,
            branch: req.soajs.inputmaskData.branch,
            main: req.soajs.inputmaskData.main
        };
        if (req.soajs.inputmaskData.token) {
            newRecord.token = req.soajs.inputmaskData.token;
        }
        mongo.insert(colName, newRecord, function (error, result) {
            checkIfError(req, res, {config: config, error: error || !result, code: 743}, function () {
                return res.jsonp(req.soajs.buildResponse(null, true));
            });
        });
    },

    'update': function (config, mongo, req, res) {
        validateId(mongo, req, function (error) {
            checkIfError(req, res, {config: config, error: error, code: 701}, function () {
                var criteria = {'_id': req.soajs.inputmaskData.id};
                var update = {
                    '$set': {
                        name: req.soajs.inputmaskData.name,
                        type: req.soajs.inputmaskData.type,
                        owner: req.soajs.inputmaskData.owner,
                        repo: req.soajs.inputmaskData.repo,
                        branch: req.soajs.inputmaskData.branch,
                        main: req.soajs.inputmaskData.main
                    }
                };
                if (req.soajs.inputmaskData.token) {
                    update['$set'].token = req.soajs.inputmaskData.token;
                }
                mongo.update(colName, criteria, update, {'upsert': false, 'safe': true}, function (error, result) {
                    checkIfError(req, res, {config: config, error: error || !result, code: 744}, function () {
                        return res.jsonp(req.soajs.buildResponse(null, true));
                    });
                });
            });
        });
    },

    'delete': function (config, mongo, req, res) {
        validateId(mongo, req, function (error) {
            checkIfError(req, res, {config: config, error: error, code: 701}, function () {
                var criteria = {'_id': req.soajs.inputmaskData.id};
                mongo.remove(colName, criteria, function (error) {
                    checkIfError(req, res, {config: config, error: error, code: 745}, function () {
                        return res.jsonp(req.soajs.buildResponse(null, true));
                    });
                });
            });
        });
    }
};