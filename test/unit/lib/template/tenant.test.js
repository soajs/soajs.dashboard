"use strict";
var assert = require("assert");
var fs = require("fs");
var request = require("request");

var helper = require("../../../helper.js");
var coreModules = require ("soajs.core.modules");
var core = coreModules.core;
var async = require('async');
let template = require('./schema/template.js');
const tenantIndex = helper.requireModule('./lib/templates/drivers/tenant.js');

let mongoStub = {
    model :{
        checkForMongo: function (soajs) {
            return true;
        },
        validateId: function (soajs, cb) {
            return cb(null, soajs.inputmaskData.id);
        },
        findEntries: function (soajs, opts, cb) {
            let ciRecord = {
                "_id":'5aba44f1ad30ac676a02d650',
                "provider": "travis",
                "type": "recipe",
                "name": "My Custom Recipe",
                "recipe": "sudo something",
                "sha": "1234"
            };
            if (opts.collection === 'products') {
                ciRecord = [
                    {
                        "_id": '5aba44bfad30ac676a02d5ee',
                        "code": "DSBRD",
                        "name": "test product updated",
                        "description": "this is a dummy updated description",
                        "packages": [
                            {
                                "code": "TPROD_BASIC",
                                "name": "basic package 2",
                                "description": "this is a dummy updated description",
                                "acl": {},
                                "_TTL": 86400000
                            }
                        ]
                    },
                    {
                        "_id": '5aba44bfad30ac676a02d5ee',
                        "code": "TPROD1",
                        "name": "test 1  product updated",
                        "description": "this is a dummy updated description",
                        "packages": [
                            {
                                "code": "TPROD_BASIC1",
                                "name": "basic package 2",
                                "description": "this is a dummy updated description",
                                "acl": {},
                                "_TTL": 86400000
                            }
                        ]
                    },
                    {
                        "_id": '5aba44bfad30ac676a02d5ee',
                        "code": "DSBRD",
                        "name": "test 1  product updated",
                        "description": "this is a dummy updated description",
                        "packages": [
                            {
                                "code": "DSBRD_USER",
                                "name": "basic package 2",
                                "description": "this is a dummy updated description",
                                "acl": {},
                                "_TTL": 86400000
                            }
                        ]
                    }]
            }
            if (opts.collection === 'environment') {
                let environments = [
                    {
                        "code": "DASHBOARD"
                    }, {
                        "code": "DEV"
                    }
                ];
                cb(null, environments);
            } else {
                return cb(null, ciRecord);
                // todo if needed
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
            post :{}
        }
    },
    template : template,
    errors : [],
    dbData : {},
};

let prodModel = {
    addRecipe: function (context, opts, cb) {
        return cb(null, true);
    }
};

const lib = {
    initBLModel: function (module, cb) {
        return cb(null, prodModel);
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


describe("Testing productization", function () {

    it("Success - check tenant -- valid template", function (done) {
        tenantIndex.check(req, context, lib, async, mongoStub, function (result, error) {
            done();
        });
    });

    it("Success - Check tenant", function (done) {
        let newTemplate = JSON.parse(JSON.stringify(template));
        newTemplate.content['productization'].data = [
            {
                "code": "DSBRD",
                "name": "Portal Product",
                "description": "Portal Product Description",
                "packages": [
                    {
                        "code": "DSBRD_USER",
                        "name": "Basic Package",
                        "description": "Basic Package Description",
                        "TTL": 6 * 36000 * 1000,
                        "acl": {
                            "oauth": {},
                            "urac": {},
                            "daas": {}
                        }
                    }
                ]
            },
            {
                "code": "DSBRD1",
                "name": "Portal Product",
                "description": "Portal Product Description",
                "packages": [
                    {
                        "code": "DSBRD_USER",
                        "name": "Basic Package",
                        "description": "Basic Package Description",
                        "TTL": 6 * 36000 * 1000,
                        "acl": {
                            "oauth": {},
                            "urac": {},
                            "daas": {}
                        }
                    }
                ]
            },
        ];
        context.template = newTemplate;
        tenantIndex.check(req, context, lib, async, mongoStub, function (result, error) {
            done();
        });
    });

    it("Success - Check tenant - no tenant record", function (done) {
        let newTemplate = JSON.parse(JSON.stringify(template));
        newTemplate.content['productization'].data = [];
        tenantIndex.check(req, context, lib, async, mongoStub, function (result, error) {
            done();
        });
    });

    it("Success - Check tenant - no result", function (done) {
        let newTemplate = JSON.parse(JSON.stringify(template));
        newTemplate.content['productization'].data = [];
        tenantIndex.check(req, context, lib, async, mongoStub, function (result, error) {
            done();
        });
    });
});
