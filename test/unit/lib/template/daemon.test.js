"use strict";
var assert = require("assert");
var fs = require("fs");
var request = require("request");

var helper = require("../../../helper.js");
var coreModules = require ("soajs.core.modules");
var core = coreModules.core;
var async = require('async');
let template = require('./schema/template.js');
const daemonIndex = helper.requireModule('./lib/templates/drivers/daemon.js');

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
                "_id": '5aba44f1ad30ac676a02d650',
                "provider": "travis",
                "type": "recipe",
                "name": "My Custom Recipe",
                "recipe": "sudo something",
                "sha": "1234"
            };
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
                return cb(null, ciRecord)
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
let req = {
    soajs : {}
};
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

let daemonModel = {
    addGroupConfig: function (context, req, res, cb) {
        return cb(null, true);
    }
};

const lib = {
    initBLModel: function (module, cb) {
        return cb(null, daemonModel);
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

describe("Testing daemon", function () {

    it("Success - check daemonGroup -- invalid template", function (done) {
        daemonIndex.check(req, context, lib, async, mongoStub, function (result, error) {
            done();
        });
    });

    it("Success - check daemonGroup -- valid template", function (done) {
        req.soajs.validator = {
            Validator: function () {
                return {
                    validate: function () {
                        return {
                            valid : true
                        }
                    }
                };
            }
        };
        daemonIndex.check(req, context, lib, async, mongoStub, function (result, error) {
            done();
        });
    });

    it("Fail - check daemonGroup -- Same name", function (done) {
        mongoStub.model.countEntries = function (soajs, opts, cb){
            return cb(null, 1);
        };
        daemonIndex.check(req, context, lib, async, mongoStub, function (result, error) {
            done();
        });
    });

    it ("Success - daemonGroup", function (done) {
        req.soajs.inputmaskData = {
            correction : {
                daemon : [{"old": "test", "new" : "test2"}]
            }
        };
        daemonIndex.merge(req, context, lib, async, mongoStub, function (result, error) {
            done();
        });
    });

    it ("Success - save daemonGroup", function (done) {
        context.template.content.daemonGroups.data = [
            {
                "groupName" : "test",
                "daemon": "helloDaemon",
                "timeZone" :111,
                "cronTime" : 111,
                "cronTimeDate" : 1111,
                "status": 1,
                "processing" : "parallel",
                "interval": 1800000,
                "order": ["test"],
                "solo" : false,
                "jobs": {
                    "hello": {
                        "type": "global",
                        "serviceConfig": {
                            "mike": "test"
                        },
                        "tenantExtKeys": []
                    }
                }
            }
        ];
        daemonIndex.save(req, context, lib, async, mongoStub, function (result, error) {
            done();
        });
    });

});
