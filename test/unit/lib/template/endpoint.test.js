"use strict";
var assert = require("assert");
var fs = require("fs");
var request = require("request");

var helper = require("../../../helper.js");
var coreModules = require ("soajs.core.modules");
var core = coreModules.core;
var async = require('async');
let template = require('./schema/template.js');
const endpointIndex = helper.requireModule('./lib/templates/drivers/endpoint.js');

let mongoStub = {
    model :{
        checkForMongo: function (soajs) {
            return true;
        },
        validateId: function (soajs, cb) {
            return cb(null, soajs.inputmaskData.id);
        },
        findEntries: function (soajs, opts, cb) {
            if (opts.collection === 'services') {
                let services = [
                    {
                        name : "test2",
                        port : 1112,
                    }
                ];
                cb(null, services);
            }
            else {
                if (opts.collection === 'api_builder_endpoints') {
                    let endpoint = [{
                        "serviceName" : "test",
                        "servicePort" : 1111,
                        "models": {
                            "path": "setInEndpoint",
                            "name": "soap"
                        },
                        "defaultAuthentication": "testSoapResource",
                        "authentications": [
                            {
                                "name": "None",
                                "category": "N/A"
                            },
                            {
                                "name": "testSoapResource",
                                "category": "soapbasicauth",
                                "isDefault": true
                            }
                        ],
                    }];
                    cb (null, endpoint)
                }
                if(opts.collection === 'resources') {
                    let resources = [{
                        "name": "test",
                        "type": "test",
                        "category" : "test"
                    }];
                    return cb(null, resources)
                }
            }
        },
        findEntry: function (soajs, opts, cb) {
            if (opts.collection === 'services') {
                let originalServiceRecord = {
                    name: 'test',
                    src: {
                        repo: 'test',
                        owner: 'test'
                    }
                };
                cb(null, originalServiceRecord);
            } else {
                cb(); // todo if needed
            }

        },
        updateEntry: function (soajs, opts, cb) {
            cb(null, true);
        },
        removeEntry: function (soajs, opts, cb) {
            cb(null, true);
        },
        saveEntry: function (soajs, opts, cb) {
            cb(null, true);
        },
        initConnection: function (soajs) {
            return true;
        },
        closeConnection: function (soajs) {
            return true;
        },
        validateCustomId: function (soajs) {
            return true;
        },
        countEntries: function (soajs, opts, cb) {
            return cb(null, true);
        },
        find: function (soajs, opts, cb) {
            return cb(null, [{
                "_id": '5aba44f1ad30ac676a02d650',
                "provider": "travis",
                "type": "recipe",
                "name": "My Custom Recipe",
                "recipe": "sudo something",
                "locked" : true,
                "sha": "1234"
            }])
        },
        getDb: function (data) {
            return {
                ObjectId: function () {
                    return ['123qwe'];
                }
            }
        }},

};
let req = {};
let context = {
    config : {
        schema : {
            post :{
                "/apiBuilder/add": {
                    "mainType": {
                        "source": ['query.mainType', 'body.mainType'],
                        "required": true,
                        "validation": {
                            "type": "string",
                            "enum": ["endpoints", "services"]
                        }
                    },
                    "serviceName": {
                        "source": ['query.serviceName', 'body.serviceName'],
                        "required": true,
                        "validation": {"type": "string"}
                    },
                    "serviceGroup": {
                        "source": ['query.serviceGroup', 'body.serviceGroup'],
                        "required": true,
                        "validation": {"type": "string"}
                    },
                    "servicePort": {
                        "source": ['query.servicePort', 'body.servicePort'],
                        "required": true,
                        "validation": {"type": "number", "minimum": 1}
                    },
                    "serviceVersion": {
                        "source": ['query.serviceVersion', 'body.serviceVersion'],
                        "required": true,
                        "validation": {"type": "number", "minimum": 1}
                    },
                    "requestTimeout": {
                        "source": ['query.requestTimeout', 'body.requestTimeout'],
                        "required": true,
                        "validation": {"type": "number", "minimum": 1}
                    },
                    "requestTimeoutRenewal": {
                        "source": ['query.requestTimeoutRenewal', 'body.requestTimeoutRenewal'],
                        "required": true,
                        "validation": {"type": "number", "minimum": 1}
                    },
                    "defaultAuthentication": {
                        "source": ['query.defaultAuthentication', 'body.defaultAuthentication'],
                        "required": false,
                        "validation": {"type": "string"}
                    },
                    "epType": {
                        "source": ['query.epType', 'body.epType'],
                        "required": false,
                        "validation": {
                            "type": "string",
                            "enum": ["soap", "rest"]
                        }
                    },
                    "oauth": {
                        "source": ['query.oauth', 'body.oauth'],
                        "required": false,
                        "default": false,
                        "validation": {"type": "boolean"}
                    },
                    "extKeyRequired": {
                        "source": ['query.extKeyRequired', 'body.extKeyRequired'],
                        "required": false,
                        "default": false,
                        "validation": {"type": "boolean"}
                    },
                    "swaggerInput": {
                        "source": ['query.swaggerInput', 'body.swaggerInput'],
                        "required": false,
                        "validation": {"type": "string"}
                    },
                    "authentications": {
                        "source": ['query.authentications', 'body.authentications'],
                        "required": false,
                        "validation": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "name": {
                                        "type": "string",
                                        "required": true
                                    },
                                    "category": {
                                        "type": "string",
                                        "required": true
                                    }
                                }
                            }
                        }
                    },
                    "prerequisites": {
                        "source": ['body.prerequisites'],
                        "required": false,
                        "validation": {
                            "type": "object",
                            "additionalProperties": false,
                            "properties": {
                                "cpu": {"type": "string"},
                                "memory": {"type": "string"}
                            }
                        }
                    },
                    "schemas": {
                        "source": ['body.schemas'],
                        "required": false,
                       // "validation": serviceSchema.contract
                    }
                },
            }
        },
        HA : {
            blacklist : ["dummy data for test"]
        }
    },
    template : template,
    errors : [],
    dbData : {},
};

let endpointModel = {
    add: function (context,req, opts, cb) {
        return cb(null, {"_id" : 123123123});
    },
    publish : function (context,req, opts, cb) {
        return cb (null, true)
    }
};

const lib = {
    initBLModel: function (module, cb) {
        return cb(null, endpointModel);
    },
    checkReturnError: function (req, mainCb, data, cb) {
        if (data.error) {
            if (typeof (data.error) === 'object') {
                req.soajs.log.error(data.error);
            }
            return mainCb({"code": data.code, "msg": data.config.errors[data.code]});
        } else {
            if (cb) {
                return cb();
            }
        }
    }
};

req.soajs = {};
req.soajs.validator = core.validator;


describe("Testing endpointIndex", function () {

    it("Success - check endpoint -- valid template", function (done) {
        req.soajs.validator = {
            Validator: function () {
                return {
                    validate: function () {
                        return {
                            valid : true,
                        }
                    }
                };
            }
        };
        endpointIndex.check(req, context, lib, async, mongoStub, function (result, error) {
            done();
        });
    });

    it ("Success - save endpointIndex recipe", function (done) {
        endpointIndex.save(req, context, lib, async, mongoStub, function (result, error) {
            done();
        });
    });

    it ("Success - merge endpointIndex recipe", function (done) {
        req.soajs.inputmaskData = {
            correction : {
                endpoints : [{"old": "test", "new" : "Test Recipe", "port" : 2222}]
            }
        };
        endpointIndex.merge(req, context, lib, async, mongoStub, function (result, error) {
            done();
        });
    });

    it ("Success - export endpointIndex recipe", function (done) {
        req.soajs.inputmaskData = {
            endpoints : ["123qwe"]
        };

        endpointIndex.export(req, context, lib, async, mongoStub, function (result, error) {
            done();
        });
    });

    it("Fail - check endpoint -- invalid template", function (done) {
        req.soajs.validator = {
            Validator: function () {
                return {
                    validate: function () {
                        return {
                            errors: ["this is an error for test"]
                        }
                    }
                };
            }
        };

        endpointIndex.check(req, context, lib, async, mongoStub, function (result, error) {
            done();
        });
    });

});
