"use strict";
var assert = require("assert");
var fs = require("fs");
var request = require("request");

var helper = require("../../../helper.js");
var ci;
var coreModules = require ("soajs.core.modules");
var core = coreModules.core;
var async = require('async');
let template = require('./schema/template.js');
const ciIndex = helper.requireModule('./lib/templates/drivers/ci.js');

let mongoStub = {
    model :{
        checkForMongo: function (soajs) {
        return true;
    },
        validateId: function (soajs, cb) {
            return cb(null, soajs.inputmaskData.id);
        },
        findEntries: function (soajs, opts, cb) {
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
            post :{
                "/ci/recipe" :{
                    "provider": {
                        "source": ['body.provider'],
                        "required": true,
                        "validation": {
                            "type": "string"
                        }
                    },
                    "recipe": {
                        "source": ['body.recipe'],
                        "required": true,
                        "validation": {
                            "type": "string"
                        }
                    },
                    "name": {
                        "source": ['body.name'],
                        "required": true,
                        "validation": {
                            "type": "string"
                        }
                    }
                }
            }
        }
    },
    template : template,
    errors : [],
    dbData : {},
};

let ciModel = {
        addRecipe: function (context, opts, cb) {
            return cb(null, true);
        }
};

const lib = {
    initBLModel: function (module, cb) {
       return cb(null, ciModel);
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


describe("Testing ci", function () {

    it("Success - check ci recipe -- valid template", function (done) {
        ciIndex.check(req, context, lib, async, mongoStub, function (result, error) {
            done();
        });
    });

    it("Fail - check ci recipe -- Same name", function (done) {
        mongoStub.model.countEntries = function (soajs, opts, cb){
            return cb(null, 1);
        };
        ciIndex.check(req, context, lib, async, mongoStub, function (result, error) {
            done();
        });
    });

    it ("Success - save ci recipe", function (done) {
        ciIndex.save(req, context, lib, async, mongoStub, function (result, error) {
            done();
        });
    });

    it ("Success - merge ci recipe", function (done) {
        req.soajs.inputmaskData = {
            correction : {
                ci : [{"old": "Java Recipe", "new" : "Test Recipe", "provider" : "travis"}]
            }
        };
        ciIndex.merge(req, context, lib, async, mongoStub, function (result, error) {
            done();
        });
    });

    it ("Success - export ci recipe", function (done) {
        req.soajs.inputmaskData = {
            ci : ["123qwe"]
        };
        ciIndex.export(req, context, lib, async, mongoStub, function (result, error) {
            done();
        });
    });

    it("Fail - check ci recipe -- invalid template", function (done) {
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

        ciIndex.check(req, context, lib, async, mongoStub, function (result, error) {
            done();
        });
    });

    it("Success - Check - no ci recipe", function (done) {
        context.template.content.recipes = {};
        ciIndex.check(req, context, lib, async, mongoStub, function (result, error) {
            done();
        });
    });

    it("Success -  Save - no ci recipe", function (done) {
        ciIndex.save(req, context, lib, async, mongoStub, function (result, error) {
            done();
        });
    });

    it("Success - Merge -  no ci recipe", function (done) {
        ciIndex.merge(req, context, lib, async, mongoStub, function (result, error) {
            done();
        });
    });

    it("Success - Export -  no ci recipe", function (done) {
        req.soajs.inputmaskData = {};
        ciIndex.export(req, context, lib, async, mongoStub, function (result, error) {
            done();
        });
    });
});
