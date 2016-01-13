"use strict";
var collectionName = "gc";
var objecthash = require("object-hash");

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

function mapPostedConfig(config) {
    var commonFields = config.genericService.config.schema.commonFields;
    for (var i in commonFields) {
        if (Object.hasOwnProperty.call(commonFields, i)) {
            if (Object.hasOwnProperty.call(commonFields[i], 'req')) {
                commonFields[i].required = commonFields[i].req;
                delete commonFields[i].req;
            }
        }
    }

    ['add', 'update'].forEach(function (formType) {
        var formConfig = config.soajsUI.form[formType];

        for (var j = 0; j < formConfig.length; j++) {
            for (var field in formConfig[j]) {
                if (Object.hasOwnProperty.call(formConfig[j], field)) {
                    if (field === 'req') {
                        formConfig[j].required = formConfig[j]['req'];
                        delete formConfig[j]['req'];
                    }

                    if (field === '_type') {
                        formConfig[j].type = formConfig[j]['_type'];
                        delete formConfig[j]['_type'];
                    }
                }
            }
        }
    });
}

function compareIMFV(oldIMFV, newIMFV) {
    if (Object.keys(oldIMFV).length !== Object.keys(newIMFV).length) {
        return true;
    }
    for (var input in newIMFV) {
        if (oldIMFV[input]) {
            var hash1 = objecthash(oldIMFV[input]);
            var hash2 = objecthash(newIMFV[input]);
            if (hash1 !== hash2) {
                return true;
            }
        }
    }
    return false;
}

function compareAPISFields(oldAPIs, newAPIs) {
    for (var route in newAPIs) {
        if (Object.hasOwnProperty.call(newAPIs, route)) {
            if (route === 'commonFields') {
                continue;
            }
            var oldFields = oldAPIs[route].commonFields;
            var newFields = newAPIs[route].commonFields;

            if (oldAPIs[route]) {
                //compare fields
                if (oldFields && newFields) {
                    if (oldFields.length !== newFields.length || !oldFields.every(function (u, i) {
                            return u === newFields[i];
                        })) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

function compareAPIs(oldAPIs, newAPIs) {
    for (var route in newAPIs) {
        if (oldAPIs[route]) {
            if ((oldAPIs[route].type !== newAPIs[route].type) || (oldAPIs[route].method !== newAPIs[route].method)) {
                return true;
            }

            if (Object.keys(oldAPIs[route].workflow).length !== Object.keys(newAPIs[route].workflow).length) {
                return true;
            }
            else {
                for (var wfStep in newAPIs[route].workflow) {
                    if (Object.hasOwnProperty.call(newAPIs[route].workflow, wfStep)) {
                        var hash1 = objecthash(oldAPIs[route].workflow[wfStep]);
                        var hash2 = objecthash(newAPIs[route].workflow[wfStep]);
                        if (hash1 !== hash2) {
                            return true;
                        }
                    }
                }
            }
        }
    }
    return false;
}

function compareUI(oldUI, newUI) {
    var columnHash1, columnHash2;

    if (oldUI.list.columns.length !== newUI.list.columns.length) {
        return true;
    }
    for (var column = 0; column < newUI.list.columns.length; column++) {
        columnHash1 = objecthash(newUI.list.columns[column]);
        columnHash2 = objecthash(oldUI.list.columns[column]);
        if (columnHash1 !== columnHash2) {
            return true;
        }
    }

    if (oldUI.form.add.length !== newUI.form.add.length) {
        return true;
    }
    for (var field = 0; field < newUI.form.add.length; field++) {
        columnHash1 = objecthash(newUI.form.add[field]);
        columnHash2 = objecthash(oldUI.form.add[field]);
        if (columnHash1 !== columnHash2) {
            return true;
        }
    }

    if (oldUI.form.update.length !== newUI.form.update.length) {
        return true;
    }
    field = 0;
    for (field; field < newUI.form.update.length; field++) {
        columnHash1 = objecthash(newUI.form.update[field]);
        columnHash2 = objecthash(oldUI.form.update[field]);
        if (columnHash1 !== columnHash2) {
            return true;
        }
    }
    return false;
}

function extractAPIsList(schema) {
    var excluded = ['commonFields'];
    var apiList = [];
    for (var route in schema) {
        if (Object.hasOwnProperty.call(schema, route)) {
            if (excluded.indexOf(route) !== -1) {
                continue;
            }

            var oneApi = {
                'l': schema[route]._apiInfo.l,
                'v': route
            };

            if (schema[route]._apiInfo.group) {
                oneApi.group = schema[route]._apiInfo.group;
            }

            if (schema[route]._apiInfo.groupMain) {
                oneApi.groupMain = schema[route]._apiInfo.groupMain;
            }

            apiList.push(oneApi);
        }
    }
    return apiList;
}

function checkIfGCisAService(config, mongo, condition, GCDBRecord, version, req, cb) {
    mongo.findOne('services', condition, function (error, oneRecord) {
        if (error) {
            //return cb({'code': 600, 'msg': config.errors['600']});
            return cb(600);
        }

        if (oneRecord) {
            //return cb({'code': 704, 'msg': config.errors['704']});
            return cb(704);
        }

        var serviceGCDoc = {
            '$set': {
                'port': req.soajs.inputmaskData.config.genericService.config.servicePort,
                'extKeyRequired': req.soajs.inputmaskData.config.genericService.config.extKeyRequired,
                "awareness": req.soajs.inputmaskData.config.genericService.config.awareness || false,
                "requestTimeout": req.soajs.inputmaskData.config.genericService.config.requestTimeout,
                "requestTimeoutRenewal": req.soajs.inputmaskData.config.genericService.config.requestTimeoutRenewal,
                "gcV": version,
                "apis": extractAPIsList(req.soajs.inputmaskData.config.genericService.config.schema)
            }
        };
        mongo.update('services', {
            'name': req.soajs.inputmaskData.config.genericService.config.serviceName,
            'gcId': GCDBRecord._id.toString()
        }, serviceGCDoc, {'upsert': true}, function (error) {
            if (error) {
                //return cb({'code': 600, 'msg': config.errors['600']});
                return cb(600);
            }
            return cb(null, true);
        });
    });
}

module.exports = {

    "list": function (config, mongo, req, res) {

        var fields = {
            "id": 1,
            "name": 1,
            "ts": 1,
            "author": 1,
            "modified": 1,
            "v": 1,
            "genericService.config.servicePort": 1
        };
        if (req.soajs.inputmaskData.port) {
            fields['genericService.config.servicePort'] = 1;
        }

        mongo.find(collectionName, {$query: {}, $orderby: {"ts": -1, "v": -1}}, fields, function (error, response) {
            checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                return res.jsonp(req.soajs.buildResponse(null, response));
            });
        });
    },

    "get": function (config, mongo, req, res) {
        validateId(mongo, req, function (error) {
            checkIfError(req, res, {config: config, error: error, code: 701}, function () {
                var condition = {"_id": req.soajs.inputmaskData.id};
                var suffix = "";
                if (req.soajs.inputmaskData.version && req.soajs.inputmaskData.version !== '') {
                    condition = {
                        'refId': req.soajs.inputmaskData.id,
                        'v': req.soajs.inputmaskData.version
                    };
                    suffix = "_versioning";
                }
                mongo.findOne(collectionName + suffix, condition, function (error, response) {
                    checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                        checkIfError(req, res, {config: config, error: !response, code: 702}, function () {
                            return res.jsonp(req.soajs.buildResponse(null, response));
                        });
                    });
                });
            });
        });
    },

    "revisions": function (config, mongo, req, res) {
        var fields = {"refId": 1, "name": 1, "author": 1, "modified": 1, "v": 1};
        mongo.find(collectionName + "_versioning", {
            $query: {},
            $orderby: {'v': -1}
        }, fields, function (error, response) {
            checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                return res.jsonp(req.soajs.buildResponse(null, response));
            });
        });
    },

    "add": function (config, mongo, req, res) {

        //loop through req.soajs.inputmaskData.config and transform "req" to "required"
        mapPostedConfig(req.soajs.inputmaskData.config);
        req.soajs.inputmaskData.name = req.soajs.inputmaskData.name.toLowerCase().trim().replace(/\s+/g, '_');

        var record = {
            'name': req.soajs.inputmaskData.name,
            'author': req.soajs.session.getUrac().username,
            'genericService': req.soajs.inputmaskData.config.genericService,
            'soajsService': req.soajs.inputmaskData.config.soajsService,
            'soajsUI': req.soajs.inputmaskData.config.soajsUI
        };

        mongo.findOne(collectionName, {'name': record.name}, function (error, response) {
            checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                checkIfError(req, res, {config: config, error: response, code: 700}, function () {
                    mongo.insert(collectionName, record, true, function (error, dbRecord) {
                        checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                            checkIfGCisAService(config, mongo, {
                                $or: [
                                    {'port': req.soajs.inputmaskData.config.genericService.config.servicePort},
                                    {'name': req.soajs.inputmaskData.config.genericService.config.serviceName}
                                ]
                            }, dbRecord[0], 1, req, function (error) {
                                if (error) {
                                    mongo.remove(collectionName, {'name': record.name}, function(err){
                                        req.soajs.log.error(err);
                                        return res.jsonp(req.soajs.buildResponse({'code': error, 'msg': config.errors[error]}));
                                    });
                                }
                                else{
                                    return res.jsonp(req.soajs.buildResponse(null, true));
                                }
                            });
                        });
                    });
                });
            });
        });
    },

    "update": function (config, mongo, req, res) {
        validateId(mongo, req, function (error) {
            checkIfError(req, res, {config: config, error: error, code: 701}, function () {
                //loop through req.soajs.inputmaskData.config and transform "req" to "required"
                mapPostedConfig(req.soajs.inputmaskData.config);

                mongo.findOne(collectionName, {'_id': req.soajs.inputmaskData.id}, function (error, oldServiceConfig) {
                    checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                        checkIfError(req, res, {config: config, error: !oldServiceConfig, code: 702}, function () {
                            //check if the IMFV configuration have changed
                            var oldIMFV = oldServiceConfig.genericService.config.schema.commonFields;
                            var newIMFV = req.soajs.inputmaskData.config.genericService.config.schema.commonFields;
                            var newVersion = compareIMFV(oldIMFV, newIMFV);
                            var gcV = oldServiceConfig.v;
                            if (!newVersion) {
                                //check if apis inputs have changed
                                var oldAPIFields = oldServiceConfig.genericService.config.schema;
                                var newAPIFields = req.soajs.inputmaskData.config.genericService.config.schema;
                                newVersion = compareAPISFields(oldAPIFields, newAPIFields);
                                if (!newVersion) {
                                    //check if apis workflow have changed
                                    var oldAPIWF = oldServiceConfig.soajsService.apis;
                                    var newAPIWF = req.soajs.inputmaskData.config.soajsService.apis;
                                    newVersion = compareAPIs(oldAPIWF, newAPIWF);
                                    if (!newVersion) {
                                        //check if ui is different
                                        var oldAPIUI = oldServiceConfig.soajsUI;
                                        var newAPIUI = req.soajs.inputmaskData.config.soajsUI;
                                        newVersion = compareUI(oldAPIUI, newAPIUI);
                                    }
                                }
                            }

                            if(newVersion){
                                gcV++;
                            }

                            checkIfGCisAService(config, mongo, {
                                '$and': [
                                    {
                                        '$or': [
                                            {'port': req.soajs.inputmaskData.config.genericService.config.servicePort},
                                            {'name': req.soajs.inputmaskData.config.genericService.config.serviceName}
                                        ]
                                    },
                                    {
                                        'gcId': {'$ne': req.soajs.inputmaskData.id.toString() }
                                    }
                                ]
                            }, oldServiceConfig, gcV, req, function (error) {
                                checkIfError(req, res, {config: config, error: error, code: error}, function () {
                                    var updateArgs = [
                                        collectionName,
                                        {'_id': req.soajs.inputmaskData.id},
                                        {
                                            '$set': {
                                                'genericService': req.soajs.inputmaskData.config.genericService,
                                                'soajsService': req.soajs.inputmaskData.config.soajsService,
                                                'soajsUI': req.soajs.inputmaskData.config.soajsUI,
                                                'modified': new Date().getTime()
                                            }
                                        },
                                        function (error) {
                                            checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                                                return res.jsonp(req.soajs.buildResponse(null, true));
                                            });
                                        }
                                    ];

                                    if (newVersion) {
                                        mongo.update(updateArgs[0], updateArgs[1], updateArgs[2], true, updateArgs[3]);
                                    }
                                    else {
                                        mongo.update(updateArgs[0], updateArgs[1], updateArgs[2], updateArgs[3]);
                                    }
                                });
                            });
                        });
                    });
                });
            });
        });
    }
};