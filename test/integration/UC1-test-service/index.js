"use strict";

const assert = require('assert');
const helper = require("../../helper.js");
let request = require("request");
let shell = require('shelljs');
let controller;
let sampleData = require("soajs.mongodb.data/modules/dashboard");

let testServer = require('../test-service-mock.js');

let testServers = null;

describe("Integration for Usecase 1 to test head, patch and other http methods", function () {
    let extKey = "aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac";

    it("do import", function (done) {
        shell.pushd(sampleData.dir);
        shell.exec("chmod +x " + sampleData.shell, function (code) {
            assert.equal(code, 0);
            shell.exec(sampleData.shell, function (code) {
                assert.equal(code, 0);
                shell.popd();
                done();
            });
        });
    });

    it('running controller', (done) => {
        controller = require("soajs.controller");
        setTimeout(function () {
            testServer.startServer({s: {port: 4010}, m: {port: 5010}, name: "test"}, function (servers) {
                testServers = servers;
            });
            setTimeout(function () {
                done();
            }, 5000);
        }, 1000);
    });

    function executeMyRequest(params, apiPath, method, cb) {
        requester(apiPath, method, params, function (error, body) {
            assert.ifError(error);
            assert.ok(body);
            return cb(body);
        });

        function requester(apiName, method, params, cb) {
            let options = {
                uri: 'http://localhost:4000/test/' + apiName,
                headers: {
                    'Content-Type': 'application/json',
                },
                json: true
            };

            if (params.headers) {
                for (var h in params.headers) {
                    if (params.headers.hasOwnProperty(h)) {
                        options.headers[h] = params.headers[h];
                    }
                }
            }

            if (params.form) {
                options.body = params.form;
            }

            if (params.qs) {
                options.qs = params.qs;
            }

            request[method](options, function (error, response, body) {
                assert.ifError(error);
                assert.ok(body);
                return cb(null, body);
            });
        }
    }

    it("SometEST", function (done) {
        let options = {
            uri: 'http://127.0.0.1:4000/test/testGet',
            headers: {
                'Content-Type': 'application/json',
            }
        };
        helper.requester("get", options, (error, response) => {
            console.log(JSON.stringify(response), 'body');
            done();
        });
    });

    it("post test", function (done) {
        let options = {
            uri: 'http://127.0.0.1:4000/test/testPost',
            headers: {
                'Content-Type': 'application/json',
            }
        };
        helper.requester("post", options, (error, response) => {
            console.log(JSON.stringify(response), 'body');
            done();
        });
    });

    it("put test", function (done) {
        let options = {
            uri: 'http://127.0.0.1:4000/test/testPut',
            headers: {
                'Content-Type': 'application/json',
            }
        };
        helper.requester("put", options, (error, response) => {
            console.log(JSON.stringify(response), 'body');
            done();
        });
    });

    it("delete test", function (done) {
        let options = {
            uri: 'http://127.0.0.1:4000/test/testDelete',
            headers: {
                'Content-Type': 'application/json',
            }
        };
        helper.requester("delete", options, (error, response) => {
            console.log(JSON.stringify(response), 'body');
            done();
        });
    });

    it("head test", function (done) {
        let options = {
            uri: 'http://127.0.0.1:4000/test/testHead',
            headers: {
                'Content-Type': 'application/json',
            }
        };
        helper.requester("head", options, (error, response) => {
            console.log(JSON.stringify(response), 'body');
            done();
        });
    });

    it("patch test", function (done) {
        let options = {
            uri: 'http://127.0.0.1:4000/test/testPatch',
            headers: {
                'Content-Type': 'application/json',
            }
        };
        helper.requester("patch", options, (error, response) => {
            console.log(JSON.stringify(response), 'body');
            done();
        });
    });

    it("other test", function (done) {
        let options = {
            uri: 'http://127.0.0.1:4000/test/testOther',
            headers: {
                'Content-Type': 'application/json',
            }
        };
        helper.requester("options", options, (error, response) => {
            console.log(JSON.stringify(response), 'body');
            done();
        });
    });
});

