"use strict";
const sinon = require('sinon');
var assert = require("assert");
const formidable = require('formidable');
var helper = require("../../../helper.js");
var status = helper.requireModule('./lib/templates/helper.js');
var async = require('async');
let template = require('./schema/newTemplate.js');

function stubStatusUtils(error) {
    sinon
        .stub(status, 'ci')
        .yields(error, true);

    sinon
        .stub(status, 'cd')
        .yields(error, true);
    sinon
        .stub(status, 'daemon')
        .yields(error, true);
    sinon
        .stub(status, 'endpoint')
        .yields(error, true);
    sinon
        .stub(status, 'productization')
        .yields(error, true);
    sinon
        .stub(status, 'tenant')
        .yields(error, true);
    sinon
        .stub(status, 'repos')
        .yields(error, true);
    sinon
        .stub(status, 'resources')
        .yields(error, true);
}

const lib = {
    initBLModel: function (module, cb) {
        return cb(null, repoModel);
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
let context = {
    config : {
        schema : {
            post :{
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
                    "validation": {"type": "string"}
                }
            }
        }
    },
    template : template,
    errors : [],
    dbData : {
        ci :["testing"]
    },
};

var environment;

var req = {
    soajs: {
        registry: {
            coreDB: {
                provision: {
                    name: 'core_provision',
                    prefix: '',
                    servers: [
                        {host: '127.0.0.1', port: 27017}
                    ],
                    credentials: null,
                    streaming: {
                        batchSize: 10000,
                        colName: {
                            batchSize: 10000
                        }
                    },
                    URLParam: {
                        maxPoolSize: 2, bufferMaxEntries: 0
                    },
                    registryLocation: {
                        l1: 'coreDB',
                        l2: 'provision',
                        env: 'dev'
                    },
                    timeConnected: 1491861560912
                }
            }
        },
        log: {
            debug: function (data) {

            },
            error: function (data) {

            },
            info: function (data) {

            }
        },
        inputmaskData: {},
        validator: {
            Validator: function () {
                return {
                    validate: function (boolean) {
                        if (boolean) {
                            //valid
                            return {
                                errors: []
                            };
                        }
                        else {
                            //invalid
                            return {
                                errors: [{error: 'msg'}]
                            };
                        }
                    }
                };
            }
        }
    }
};

var config = {
    "errors": {}
};

var mongoStub = {
    checkForMongo: function (soajs) {
        return true;
    },
    validateId: function (soajs, cb) {
        return cb(null, soajs.inputmaskData.id);
    },
    findEntry: function (soajs, opts, cb) {
        if (opts.collection === 'templates') {
            cb(null, template)
        }
        cb(null, {
            metadata: {}
        });
    },
    findEntries: function (soajs, opts, cb) {

        cb(null, [{
            "_id":'5512867be603d7e01ab1688d',
            "locked": true,
            "code": "DSBRD",
            "name": "Main Product",
            "description": "this is the main dashboard product.",
            "packages": [
                {
                    "code": "DSBRD_DEFLT",
                    "name": "Main package",
                    "locked": true,
                    "description": "this is the main dashboard product package.",
                    "acl": {
                        "urac": {},
                        "agent": {
                            "access": true
                        },
                        "oauth": {},
                        "dashboard": {
                            "access": true
                        }
                    },
                    "_TTL": 86400000
                },
                {
                    "code": "DSBRD_OWNER",
                    "name": "Dashboard Owner Package",
                    "description": "This package provides full access to manage the dashboard and urac features.",
                    "locked": true,
                    "acl": {
                        "urac": {
                            "access": false,
                            "apis": {}
                        },
                        "dashboard": {
                            "access": [
                                "owner"
                            ],
                            "apis": {}
                        }
                    }
                }
            ]
        }]);
    },

    countEntries: function (soajs, opts, cb) {
        cb(null, 0);
    },
    getDb: function (data) {
        return {
            ObjectId: function () {
                return data;
            }
        }
    },
    removeEntry: function (soajs, opts, cb) {
        cb(null, true);
    },
    insertEntry: function (soajs, opts, cb) {
        cb(null, [{
            _id: 1,
            code: "code"
        }]);
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
    switchConnection: function (soajs) {
    }
};

let test = {
    model : mongoStub
};

describe("testing helper.js", function () {


    describe("testing helper", function () {

        it("Success checkMandatory ", function (done) {
            req.soajs.validator = {
                validate: function () {
                    return {
                        valid: true,
                    }
                }
            };

            status.checkMandatoryTemplateSchema(req, test, lib, context, req.soajs.validator, 40000, function (result, error) {
                done();
            });
      });

        it("Fail checkMandatory ", function (done) {
            req.soajs.validator = {
                validate: function () {
                    return {
                        errors: ['errrorrrr'],
                    }
                }
            };

            status.checkMandatoryTemplateSchema(req, test, lib, context, req.soajs.validator, 40000, function (result, error) {
                done();
            });
      });

        it("Success populateTemplate ", function (done) {
            req.soajs.validator = {
                validate: function () {
                    return {
                        errors: ['errrorrrr'],
                    }
                }
            };
            let newTemplate = JSON.parse(JSON.stringify(template));
            newTemplate.content = [];
            let newContext = {};
            newContext.template = newTemplate;
            newContext.dbData = {
                ci :["testing"],
                deployment : ["testing"],
                endpoints : ["testing"],
                resources :{
                    "test" : "test"
                }
            };
            status.populateTemplate(newContext);
            done ();
        });

        it("Success checkDuplicate ", function (done) {
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
            stubStatusUtils();
            context.template.content.recipes = {
                "ci": [
                    {
                        "name": "Java Recipe",
                        "provider": "travis",
                        "type": "recipe",
                        "locked": true,
                        "recipe": "language: java\nsudo: false\ninstall: true\njdk: oraclejdk8\nafter_success:\n    - 'node ./soajs.cd.js'\n"
                    }
                ],
                "deployment": [
                    {
                        "name": "DAAS Service Recipe1",
                        "recipe": {
                            "deployOptions": {},
                            "buildOptions": {}
                        },
                        "type": "service",
                        "subtype": "soajs",
                        "technology": "kubernetes",
                        "description": "This is the service catalog recipe used to deploy the core services in the dashboard environment."
                    }
                ]
            }
            status.checkDuplicate(req, test, context, lib, function (result, error) {
                sinon.restore(status);
                done();
            });
        });

        it("Success fetchDataFromDB ", function (done) {
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
            req.soajs.inputmaskData.ci = ["test"];
            req.soajs.inputmaskData.deployment = ["test"];
            req.soajs.inputmaskData.endpoints = ['test'];
            stubStatusUtils();
            status.fetchDataFromDB(req, test, context, lib, function (result, error) {
                sinon.restore(status);
                done();
            });
        });

        it("Success saveContent ", function (done) {
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

            stubStatusUtils();
            status.saveContent(req, test, context, lib, function (result, error) {
                sinon.restore(status);
                done();
            });
        });

        it("Success generateDeploymentTemplate ", function (done) {
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

            stubStatusUtils();
            status.generateDeploymentTemplate(req, config, test, context, lib, function (result, error) {
                sinon.restore(status);
                done();
            });
        });

        it("Success cleanUp ", function (done) {
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

            stubStatusUtils();
            status.mergeToTemplate(req, config ,test, context, lib, function (result, error) {
                sinon.restore(status);
            });

            status.cleanUp(req.soajs, 'test',  function (result, error) {
                sinon.restore(status);
                done();
            });
        });

        it("Success ci calling ", function (done) {
            let newTemplate = JSON.parse(JSON.stringify(template));
            newTemplate.content = [];
            let newContext ={
                template : newTemplate,
                config :{
                    schema :{
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
                }
            };

            status.ci("check",req, newContext, test,  lib, function (result, error) {
                done();
            });
        });

        it("Success cd calling ", function (done) {
            let newTemplate = JSON.parse(JSON.stringify(template));
            newTemplate.content = [];
            let newContext ={
                template : newTemplate,
                config :{
                    schema :{
                        post :{
                            "/catalog/recipes/add" :{
                                "catalog" : {
                                    "validation": {
                                        "type": "object",
                                        "required": true,
                                        "additionalProperties": false,
                                        "properties": {
                                            "name": {"type": "string", "required": true},
                                            "locked": {"type": "boolean", "required": false},
                                            "active": {"type": "boolean", "required": false},
                                            "type": {"type": "string", "required": true},
                                            "subtype": {"type": "string", "required": false},
                                            "description": {"type": "string", "required": true},
                                            "recipe": {
                                                "type": "object",
                                                "required": true,
                                                "additionalProperties": false,
                                                "properties": {
                                                    "deployOptions": {
                                                        "type": "object",
                                                        "required": true,
                                                        "properties": {
                                                            "namespace": {
                                                                "type": "string",
                                                                "required": false
                                                            },
                                                            "image": {
                                                                "type": "object",
                                                                "required": false,
                                                                "properties": {
                                                                    "prefix": {"type": "string", "required": false},
                                                                    "name": {"type": "string", "required": true},
                                                                    "tag": {"type": "string", "required": true},
                                                                    "pullPolicy": {"type": "string", "required": false}
                                                                }
                                                            },

                                                            "readinessProbe": {
                                                                "type": "object",
                                                                "required": false
                                                                //NOTE: removed validation for readinessProbe to allow free schema
                                                            },
                                                            "ports": {
                                                                "type": "array",
                                                                "required": false,
                                                                "items": {
                                                                    "type": "object",
                                                                    "additionalProperties": false,
                                                                    "properties": {
                                                                        "name": {"type": "string", "required": true},
                                                                        "isPublished": {"type": "boolean", "required": false},
                                                                        "port": {"type": "number", "required": false},
                                                                        "target": {"type": "number", "required": true},
                                                                        "published": {"type": "number", "required": false},
                                                                        "preserveClientIP": {"type": "boolean", "required": false}
                                                                    }
                                                                }
                                                            },
                                                            "voluming": {
                                                                "type": "array",
                                                                "required": false,
                                                                "items": {
                                                                    "docker": {
                                                                        "type": "object",
                                                                        "required": true,
                                                                        "properties": {
                                                                            "volume": {
                                                                                "type": "object",
                                                                                "required": true,
                                                                                "validation": {
                                                                                    "type": "object"
                                                                                }
                                                                            }
                                                                        }
                                                                    },
                                                                    "kubernetes": {
                                                                        "type": "object",
                                                                        "required": true,
                                                                        "properties": {
                                                                            "volume": {
                                                                                "type": "object",
                                                                                "required": true,
                                                                                "validation": {
                                                                                    "type": "object"
                                                                                }
                                                                            },
                                                                            "volumeMount": {
                                                                                "type": "object",
                                                                                "required": true,
                                                                                "validation": {
                                                                                    "type": "object"
                                                                                }
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            },
                                                            "labels": {
                                                                "type": "object",
                                                                "required": false
                                                            },
                                                            "serviceAccount": {
                                                                "type": "object",
                                                                "required": false
                                                            },
                                                            "certificates":{
                                                                "type": "string",
                                                                "required": true,
                                                                "enum": ["none","optional","required"]
                                                            }
                                                        }
                                                    },
                                                    "buildOptions": {
                                                        "type": "object",
                                                        "required": false,
                                                        "additionalProperties": false,
                                                        "properties": {
                                                            "settings": {
                                                                "type": "object",
                                                                "required": false,
                                                                "properties": {
                                                                    "accelerateDeployment": {"type": "boolean", "required": false}
                                                                }
                                                            },
                                                            "env": {
                                                                "type": "object",
                                                                "required": false,
                                                                "additionalProperties": {
                                                                    "type": "object",
                                                                    "properties": {
                                                                        "type": {
                                                                            "type": "string",
                                                                            "required": true,
                                                                            "enum": ["static", "userInput", "computed"]
                                                                        },
                                                                        "label": {"type": "string", "required": false},
                                                                        "fieldMsg": {"type": "string", "required": false},
                                                                        "default": {"type": "string", "required": false}
                                                                    }
                                                                }
                                                            },
                                                            "cmd": {
                                                                "type": "object",
                                                                "required": false,
                                                                "additionalProperties": false,
                                                                "properties": {
                                                                    "deploy": {
                                                                        "type": "object",
                                                                        "required": true,
                                                                        "additionalProperties": false,
                                                                        "properties": {
                                                                            "command": {"type": "array", "required": true},
                                                                            "args": {"type": "array", "required": true}
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            },

                        }
                    }
                }
            };

            status.cd("check",req, newContext, test,  lib, function (result, error) {
                done();
            });
        });

        it("Success daemon calling ", function (done) {
            let newTemplate = JSON.parse(JSON.stringify(template));
            newTemplate.content = [];
            let newContext ={
                config : {
                    schema : {
                        post :{}
                    }
                },
                template : newTemplate,
                errors : [],
                dbData : {},
            };

            status.daemon("check",req ,newContext, test,  lib, function (result, error) {
                done();
            });
        });

        it("Success endpoint endpoint ", function (done) {
            let newTemplate = JSON.parse(JSON.stringify(template));
            newTemplate.content = [];
            let newContext ={
                template : newTemplate,
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
            };

            status.endpoint("check",req, newContext, test,  lib, function (result, error) {
                done();
            });
        });

        it("Success productization calling ", function (done) {
            let newTemplate = JSON.parse(JSON.stringify(template));
            newTemplate.content = [];
            let newContext ={
                template : newTemplate,
                config :{
                    schema :{
                        post :{}
                    }
                }
            };

            status.productization("check",req, newContext, test,  lib, function (result, error) {
                done();
            });
        });

        it("Success repos calling ", function (done) {
            let newTemplate = JSON.parse(JSON.stringify(template));
            newTemplate.content = [];
            let newContext ={
                template : newTemplate,
                config :{
                    schema :{
                        post :{}
                    }
                }
            };

            status.repos("check",req, newContext, test,  lib, function (result, error) {
                done();
            });
        });

        it("Success resources calling ", function (done) {
            let newTemplate = JSON.parse(JSON.stringify(template));
            newTemplate.content = [];
            let newContext ={
                template : newTemplate,
                config :{
                    schema :{
                        post :{}
                    }
                }
            };

            status.resources("check",req, newContext, test,  lib, function (result, error) {
                done();
            });
        });

        it("Success tenant calling ", function (done) {
            let newTemplate = JSON.parse(JSON.stringify(template));
            newTemplate.content = [];
            let newContext ={
                template : newTemplate,
                config :{
                    schema :{
                        post :{}
                    }
                }
            };

            status.tenant("check",req, newContext, test,  lib, function (result, error) {
                done();
            });
        });
    });
});
