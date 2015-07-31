"use strict";
var fs = require('fs');
var assert = require('assert');
var request = require("request");
var helper = require("../helper.js");
var mkdirp = require("mkdirp");
var rimraf = require('rimraf');

var soajs = require('soajs');
var Mongo = soajs.mongo;
var dbConfig = require("./db.config.test.js");
var dashboardConfig = dbConfig();
dashboardConfig.name = "core_provision";
var mongo = new Mongo(dashboardConfig);

var errorCodes = helper.requireModule('./config').errors;
var testUploadFilesDir = __dirname + "/../uploads/";

var extKey = 'aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac';

function executeMyRequest(params, apiPath, method, cb) {
    requester(apiPath, method, params, function (error, body) {
        assert.ifError(error);
        assert.ok(body);
        return cb(body);
    });

    function requester(apiName, method, params, cb) {
        var options = {
            uri: 'http://localhost:4000/dashboard/' + apiName,
            headers: {
                key: extKey
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

        if (params.formData) {
            options.formData = params.formData;
        }
        request[method](options, function (error, response, body) {
            assert.ifError(error);
            assert.ok(body);
            return cb(null, body);
        });
    }
}

describe("Upload Service Tests", function () {
    var soajsauth;
    before(function (done) {
        var options = {
            uri: 'http://localhost:4001/login',
            headers: {
                'Content-Type': 'application/json',
                key: extKey
            },
            body: {
                "username": "user1",
                "password": "123456"
            },
            json: true
        };
        request.post(options, function (error, response, body) {
            assert.ifError(error);
            assert.ok(body);
            soajsauth = body.soajsauth;

            fs.exists(process.env.SOAJS_ENV_WORKDIR + "soajs/uploads", function (exists) {
                if (exists) {
                    rimraf(process.env.SOAJS_ENV_WORKDIR + "soajs", function (error) {
                        assert.ifError(error);
                        done();
                    })
                }
                else {
                    done();
                }
            });
        });
    });

    it("fail - no upload folder exists", function (done) {
        var params = {
            headers: {
                'soajsauth': soajsauth
            },
            "formData": {
                "my_file": fs.createReadStream(testUploadFilesDir + "valid.tar")
            }
        };
        executeMyRequest(params, "services/upload", "post", function (body) {
            assert.ok(!body.result);
            assert.deepEqual(body.errors.details[0],
                {"code": 620, "message": errorCodes[620] + __dirname + "/soajs"});
            done();
        });
    });

    it("fail - uploaded file is not a zip file", function (done) {
        mkdirp(process.env.SOAJS_ENV_WORKDIR + "soajs/uploads", function (error) {
            assert.ifError(error);
            var params = {
                headers: {
                    soajsauth: soajsauth
                },
                "formData": {
                    my_file: fs.createReadStream(testUploadFilesDir + "valid.tar")
                }
            };
            executeMyRequest(params, "services/upload", "post", function (body) {
                assert.ok(!body.result);
                assert.deepEqual(body.errors.details[0], {"code": 616, "message": errorCodes[616]});
                done();
            });
        });
    });

    it("fail - missing config.js", function (done) {
        var params = {
            headers: {
                soajsauth: soajsauth
            },
            "formData": {
                my_file: fs.createReadStream(testUploadFilesDir + "missing-config.zip")
            }
        };
        executeMyRequest(params, "services/upload", "post", function (body) {
            assert.ok(!body.result);
            assert.equal(body.errors.details[0].code, 617);
            done();
        });
    });

    it("fail - invalid config.js", function (done) {
        var params = {
            headers: {
                soajsauth: soajsauth
            },
            "formData": {
                my_file: fs.createReadStream(testUploadFilesDir + "invalid-config.zip")
            }
        };
        executeMyRequest(params, "services/upload", "post", function (body) {
            assert.ok(!body.result);
            assert.equal(body.errors.details[0].code, 617);
            done();
        });
    });

    it("fail - missing package.json", function (done) {
        var params = {
            headers: {
                soajsauth: soajsauth
            },
            "formData": {
                my_file: fs.createReadStream(testUploadFilesDir + "missing-package.zip")
            }
        };
        executeMyRequest(params, "services/upload", "post", function (body) {
            assert.ok(!body.result);
            assert.equal(body.errors.details[0].code, 617);
            done();
        });
    });

    it("fail - invalid package.json", function (done) {
        var params = {
            headers: {
                soajsauth: soajsauth
            },
            "formData": {
                my_file: fs.createReadStream(testUploadFilesDir + "invalid-package.zip")
            }
        };
        executeMyRequest(params, "services/upload", "post", function (body) {
            assert.ok(!body.result);
            assert.equal(body.errors.details[0].code, 617);
            done();
        });
    });

    it("fail - upload dir is a file", function (done) {
        rimraf(process.env.SOAJS_ENV_WORKDIR + "soajs", function (error) {
            assert.ifError(error);

            mkdirp(process.env.SOAJS_ENV_WORKDIR + "soajs/tenants/test/services", function (error) {
                assert.ifError(error);
                fs.writeFileSync(process.env.SOAJS_ENV_WORKDIR + "soajs/tenants/test/services/mike-srv", "data data data");

                mkdirp(process.env.SOAJS_ENV_WORKDIR + "soajs/uploads", function (error) {
                    assert.ifError(error);

                    var params = {
                        headers: {
                            soajsauth: soajsauth
                        },
                        "formData": {
                            my_file: fs.createReadStream(testUploadFilesDir + "valid.zip")
                        }
                    };
                    executeMyRequest(params, "services/upload", "post", function (body) {
                        assert.ok(!body.result);
                        assert.equal(body.errors.details[0].code, 616);
                        done();
                    });
                });
            });
        });
    });

    it("fail - custom service name matches existing service", function (done) {
        rimraf(process.env.SOAJS_ENV_WORKDIR + "soajs", function (error) {
            assert.ifError(error);

            mkdirp(process.env.SOAJS_ENV_WORKDIR + "soajs/uploads", function (error) {
                assert.ifError(error);

                var params = {
                    headers: {
                        soajsauth: soajsauth
                    },
                    "formData": {
                        my_file: fs.createReadStream(testUploadFilesDir + "invalid-name.zip")
                    }
                };
                executeMyRequest(params, "services/upload", "post", function (body) {
                    assert.ok(!body.result);
                    assert.equal(body.errors.details[0].code, 617);
                    done();
                });
            });
        });
    });

    it("success - service uploaded", function (done) {
        var params = {
            headers: {
                soajsauth: soajsauth
            },
            "formData": {
                my_file: fs.createReadStream(testUploadFilesDir + "valid.zip")
            }
        };
        executeMyRequest(params, "services/upload", "post", function (body) {
            console.log(JSON.stringify(body));
            assert.ok(body.result);
            assert.ok(body.data);
            rimraf(process.env.SOAJS_ENV_WORKDIR + "soajs", function (error) {
                assert.ifError(error);
                done();
            });
        });
    });
});