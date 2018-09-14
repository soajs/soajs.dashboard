"use strict";
const sinon = require('sinon');
var assert = require("assert");
var helper = require("../../../helper.js");
var helperIndex = helper.requireModule('./lib/environment/helper.js');
var status = helper.requireModule('./lib/environment/status.js');

var config = {
    "errors": {}
};
let model = {
    'findEntries' : (soajs, opts, cb) => {
        return cb(null, true)
    },
    'removeEntry' : (soajs, opts, cb) => {
        return cb(null, true)
    },
    'saveEntry' : (soajs, opts, cb) => {
        return cb(null, true)
    }
};
let req = {
    soajs : {
        inputmaskData : {
            driver : "object2"
        },
        log : {
            error : (err) => {
                console.log( err ); // ToDelete #2del
            }
        }
    }
};

describe("testing lib/environment/helper.js", function () {

    describe("testing getDefaultRegistryServicesConfig", function () {

        it("No envDBRecord", function (done) {
            let envDBRecord = {
                "deployer" : 'test'
            };
           let output = helperIndex.getDefaultRegistryServicesConfig(envDBRecord);
           assert.ok(output.services);
            done();
        });

        it("envDBRecord", function (done) {
            let output = helperIndex.getDefaultRegistryServicesConfig();
            assert.ok(output.services);
            done();
        });
    });

    describe("testing prepareEnvRecord", function () {

        it("Success -- !data.deploy", function (done) {
            let data = {
                code : 'dev'
            };
            let output = helperIndex.prepareEnvRecord(config, data, {}, {});
            assert.ok(output.code);
            done();
        });

        it("Success -- data.deploy.selectedDriver = manual", function (done) {
            let data = {
                code : 'dev',
                deploy : {
                    selectedDriver : 'manual',
                    previousEnvironment : 'dashboard'
                }
            };

            let envDbRecord = {
                deploy : {
                    deployment : {
                        manual : {
                            nodes : "test"
                        }
                    }
                }
            };
            let output = helperIndex.prepareEnvRecord(config, data, envDbRecord, {});
            assert.ok(output.code);
            done();
        });

        it("Success -- data.deploy.selectedDriver = manual and no previous environment", function (done) {
            let data = {
                code : 'dev',
                deploy : {
                    selectedDriver : 'manual',
                    deployment : {
                        manual : {
                            nodes : 'test'
                        }
                    }
                }
            };

            let output = helperIndex.prepareEnvRecord(config, data, {}, {});
            assert.ok(output.code);
            done();
        });

        it("Success -- if infraProvider local docker", function (done) {
            let data = {
                code : 'dev',
                deploy : {
                    selectedDriver : 'test',
                    technology : 'docker'
                }
            };

            let infraProvider = {
                name : "local",
                api : {}
            };
            let output = helperIndex.prepareEnvRecord(config, data, {}, infraProvider);
            assert.ok(output.code);
            done();
        });

        it("Success -- if infraProvider local kubernetes", function (done) {
            let data = {
                code : 'dev',
                deploy : {
                    selectedDriver : 'test',
                    technology : 'kubernetes'
                }
            };

            let infraProvider = {
                name : "local",
                api : {}
            };
            let output = helperIndex.prepareEnvRecord(config, data, {}, infraProvider);
            assert.ok(output.code);
            done();
        });

        it("Success -- if infraProvider local kubernetes", function (done) {
            let data = {
                code : 'dev',
                deploy : {
                    selectedDriver : 'test',
                    technology : 'kubernetes'
                }
            };

            let infraProvider = {
                name : "remote",
                api : {}
            };
            let output = helperIndex.prepareEnvRecord(config, data, {}, infraProvider);
            assert.ok(output.code);
            done();
        });
    });

    describe("testing listCerts", function () {

        it("testing listCerts", function (done) {
            helperIndex.listCerts({}, model, function(){
                done();
            });
        });
    });

    describe("testing generateRandomString", function () {

        it("testing generateRandomString", function (done) {
            helperIndex.generateRandomString();
            done();
        });
    });

    describe("testing deleteCerts", function () {

        it("testing deleteCerts no certs", function (done) {
            let certs = [{
                "noMetadata" : []
            }];
            helperIndex.deleteCerts(certs, req, model, "dev");
            done();
        });

        it("testing deleteCerts certs -- only 1 available env and driver", function (done) {
            let certs = [{
                metadata : {
                    env : {
                        DEV : ['test'],
                    }
                }
            }];
            helperIndex.deleteCerts(certs, req, model, "dev");
            done();
        });

        it("testing deleteCerts certs -- other env are available but only 1 driver in selected env", function (done) {
            let certs = [{
                metadata : {
                    env : {
                        DEV : ['test'],
                        TEST : []
                    }
                }
            }];
            helperIndex.deleteCerts(certs, req, model, "dev");
            done();
        });

        it("testing deleteCerts certs --  several drivers", function (done) {
            let certs = [{
                metadata : {
                    env : {
                        DEV : ['object1', 'object2']
                    }
                }
            }];
            helperIndex.deleteCerts(certs, req, model, "dev");
            done();
        });

        it("testing deleteCerts certs --  error", function (done) {
            let certs = [{
                metadata : {
                    env : {
                        DEV : ['object1', 'object2']
                    }
                }
            }];
            model = {
                'saveEntry' : (soajs, opts, cb) => {
                    return cb("errror", null)
                }
            };
            helperIndex.deleteCerts(certs, req, model, "dev");
            done();
        });
    });
});
