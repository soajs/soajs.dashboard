"use strict";
var fs = require('fs');
var assert = require('assert');
var request = require("request");
var helper = require("../helper.js");
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

describe("Certificates tests", function () {
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
            done();
        });
    });

    before("remove test certificates if exist", function (done) {
        mongo.remove ("fs.files", {"filename": /test_cert/}, function (error, result) {
            assert.ifError(error);
            assert.ok(result);
            done();
        });
    });

    describe ("upload certificate tests", function () {

        it("success - will upload certificate", function (done) {
            var params = {
                qs: {
                    filename: 'test_cert.pem',
                    envCode: 'DEV',
                    driver: 'dockermachine - local'
                },
                formData: {
                    file: fs.createReadStream(testUploadFilesDir + 'test_cert.pem')
                }
            };

            executeMyRequest(params, 'environment/platforms/cert/upload', 'post', function (body) {
                assert.ok(body.result);
                assert.ok(body.data);
                done();
            });
        });

        it("fail - certificate already exists", function (done) {
            var params = {
                qs: {
                    filename: 'test_cert.pem',
                    envCode: 'DEV',
                    driver: 'dockermachine - local'
                },
                formData: {
                    file: fs.createReadStream(testUploadFilesDir + 'test_cert.pem')
                }
            };

            executeMyRequest(params, 'environment/platforms/cert/upload', 'post', function (body) {
                assert.ok(body.errors);
                assert.deepEqual(body.errors.details[0], {'code': 731, 'message': errorCodes[731]});
                done();
            });
        });

        it("fail - missing params", function (done) {
            var params = {
                qs: {
                    filename: 'test_cert.pem',
                    driver: 'dockermachine - local'
                },
                formData: {
                    file: fs.createReadStream(testUploadFilesDir + 'test_cert.pem')
                }
            };

            executeMyRequest(params, 'environment/platforms/cert/upload', 'post', function (body) {
                assert.ok(body.errors);
                assert.deepEqual(body.errors.details[0], {'code': 739, 'message': errorCodes[739]});
                done();
            });
        });

        it("mongo test - verify certificate exists in mongo", function (done) {
            mongo.findOne("fs.files", {"filename": "test_cert.pem"}, function (error, certRecord) {
                assert.ifError(error);
                assert.ok(certRecord);
                delete certRecord._id;
                delete certRecord.uploadDate;
                assert.deepEqual(certRecord, {
                    "filename":"test_cert.pem",
                    "contentType":"binary/octet-stream",
                    "length":27,
                    "chunkSize":261120,
                    "aliases":null,
                    "metadata": {
                        "env": {
                            "DEV": ["dockermachine - local"]
                        }
                    },
                    "md5":"d8d70241e72d605ca44657aefbf38aed"
                });
                done();
            });
        });
    });

    describe("remove certificate tests", function () {
        var certId;
        before ("get test certificate id and update it to include several environments in its metadata", function (done) {
            mongo.findOne("fs.files", {"filename": "test_cert.pem"}, function (error, certRecord) {
                assert.ifError(error);
                assert.ok(certRecord);
                certId = certRecord._id.toString();
                certRecord.metadata.env['DASHBOARD'] = ['dockermachine - local'];
                mongo.save("fs.files", certRecord, function (error, result) {
                    assert.ifError(error);
                    assert.ok(result);
                    done();
                });
            })
        });

        it("success - will remove certificate (metadata includes one certificate but several environments)", function (done) {
            var params = {
                qs: {
                    id: certId,
                    env: 'DASHBOARD',
                    driverName: 'dockermachine - local'
                }
            };
            executeMyRequest(params, 'environment/platforms/cert/delete', 'get', function (body) {
                assert.ok(body.result);
                assert.ok(body.data);
                done();
            });
        });

        it("success - will remove certificate (metadata includes one certificate for one environment)", function (done) {
            var params = {
                qs: {
                    id: certId,
                    env: 'DEV',
                    driverName: 'dockermachine - local'
                }
            };
            executeMyRequest(params, 'environment/platforms/cert/delete', 'get', function (body) {
                assert.ok(body.result);
                assert.ok(body.data);
                done();
            });
        });

        it("fail - missing required params", function (done) {
            var params = {
                qs: {
                    id: certId,
                    driverName: 'dockermachine - local'
                }
            };
            executeMyRequest(params, 'environment/platforms/cert/delete', 'get', function (body) {
                assert.ok(body.errors);
                assert.deepEqual(body.errors.details[0], {'code': 172, 'message': 'Missing required field: env'});
                done();
            });
        });

        it("fail - certificate does not exist", function (done) {
            var params = {
                qs: {
                    id: certId,
                    env: 'DEV',
                    driverName: 'dockermachine - local'
                }
            };
            executeMyRequest(params, 'environment/platforms/cert/delete', 'get', function (body) {
                assert.ok(body.errors);
                assert.deepEqual(body.errors.details[0], {'code': 730,'message': errorCodes[730]});
                done();
            });
        });

        it("fail - invalid certificate id provided", function (done) {
            var params = {
                qs: {
                    id: "123:::321",
                    env: 'DEV',
                    driverName: 'dockermachine - local'
                }
            };
            executeMyRequest(params, 'environment/platforms/cert/delete', 'get', function (body) {
                assert.ok(body.errors);
                assert.deepEqual(body.errors.details[0], {'code': 701, 'message': errorCodes[701]});
                done();
            });
        });

        it("mongo test - verify certificate has been deleted from mongo", function (done) {
            mongo.findOne("fs.files", {"filename": "test_cert.pem"}, function (error, certRecord) {
                assert.ifError(error);
                assert.equal(certRecord, null);
                done();
            });
        });
    });

    describe("choose existing certificates tests", function () {
        var testCerts = [];
        before("add two certificates and get their ids from mongo", function (done) {
            var params = {
                qs: {
                    filename: 'test_cert.pem',
                    envCode: 'DEV',
                    driver: 'dockermachine - local'
                },
                formData: {
                    file: fs.createReadStream(testUploadFilesDir + 'test_cert.pem')
                }
            };

            executeMyRequest(params, 'environment/platforms/cert/upload', 'post', function (body) {
                assert.ok(body.result);
                assert.ok(body.data);

                params = {
                    qs: {
                        filename: 'test_cert_2.pem',
                        envCode: 'DEV',
                        driver: 'dockermachine - local'
                    },
                    formData: {
                        file: fs.createReadStream(testUploadFilesDir + 'test_cert_2.pem')
                    }
                };

                executeMyRequest(params, 'environment/platforms/cert/upload', 'post', function (body) {
                    assert.ok(body.result);
                    assert.ok(body.data);

                    mongo.find("fs.files", {"filename": /test_cert/}, {"_id": 1}, function (error, testCertsIds){
                        assert.ifError(error);
                        assert.ok(testCertsIds);
                        assert.ok(testCertsIds.length > 0);
                        testCertsIds.forEach (function (oneCert) {
                            testCerts.push(oneCert._id.toString());
                        });
                        done();
                    });
                });
            });
        });

        it("success - will choose existing certificates for dockermachine - local", function (done) {
            var params = {
                qs: {
                    env: 'STG',
                    driverName: 'dockermachine - local'
                },
                form: {
                    certIds: testCerts
                }
            };
            executeMyRequest(params, 'environment/platforms/cert/choose', 'post', function (body) {
                assert.ok(body.result);
                assert.ok(body.data);
                done();
            });
        });

        it("success - will choose existing certificates for dockermachine - cloud - rackspace", function (done) {
            var params = {
                qs: {
                    env: 'STG',
                    driverName: 'dockermachine - cloud - rackspace'
                },
                form: {
                    certIds: testCerts
                }
            };
            executeMyRequest(params, 'environment/platforms/cert/choose', 'post', function (body) {
                assert.ok(body.result);
                assert.ok(body.data);
                done();
            });
        });

        it("fail - missing required params", function (done) {
            var params = {
                qs: {
                    env: 'STG'
                },
                form: {
                    certIds: testCerts
                }
            };
            executeMyRequest(params, 'environment/platforms/cert/choose', 'post', function (body) {
                assert.ok(body.errors);
                assert.deepEqual(body.errors.details[0], {'code': 172, 'message': 'Missing required field: driverName'});
                done();
            });
        });

        it("fail - invalid certificate id provided", function (done) {
            var params = {
                qs: {
                    env: 'STG',
                    driverName: 'dockermachine - local'
                },
                form: {
                    certIds: ['1234567890']
                }
            };
            executeMyRequest(params, 'environment/platforms/cert/choose', 'post', function (body) {
                assert.ok(body.errors);
                assert.deepEqual(body.errors.details[0], {'code': 701, 'message': errorCodes[701]});
                done();
            });
        });

        it("fail - one or more certificates do not exist", function (done) {
            var params = {
                qs: {
                    env: 'STG',
                    driverName: 'dockermachine - local'
                },
                form: {
                    certIds: [testCerts[0], '123456789012345678901234']
                }
            };
            executeMyRequest(params, 'environment/platforms/cert/choose', 'post', function (body) {
                assert.ok(body.errors);
                assert.deepEqual(body.errors.details[0], {'code': 730, 'message': errorCodes[730]});
                done();
            });
        });

        it("mongo test - verify the certificates exist and include the right drivers and environments in their metadata", function (done) {
            mongo.find("fs.files", {"filename": /test_cert/}, function (error, certs) {
                assert.ifError(error);
                assert.ok(certs);
                assert.ok(certs.length > 0);
                certs.forEach (function (oneCert) {
                    delete oneCert._id;
                    delete oneCert.uploadDate;
                });
                assert.deepEqual(certs, [
                        {
                            "filename": "test_cert.pem",
                            "contentType": "binary/octet-stream",
                            "length": 27,
                            "chunkSize": 261120,
                            "aliases": null,
                            "metadata": {
                                "env": {
                                    "DEV": [
                                        "dockermachine - local"
                                    ],
                                    "STG": [
                                        "dockermachine - local",
                                        "dockermachine - cloud - rackspace"
                                    ]
                                }
                            },
                            "md5": "d8d70241e72d605ca44657aefbf38aed"
                        },
                        {
                            "filename": "test_cert_2.pem",
                            "contentType": "binary/octet-stream",
                            "length": 33,
                            "chunkSize": 261120,
                            "aliases": null,
                            "metadata": {
                                "env": {
                                    "DEV": [
                                        "dockermachine - local"
                                    ],
                                    "STG": [
                                        "dockermachine - local",
                                        "dockermachine - cloud - rackspace"
                                    ]
                                }
                            },
                            "md5": "c321bfbda5799c5ccf748b3183b0a2a7"
                        }
                    ]
                );

                done();
            });
        });

    });

    describe("delete certificates when a driver gets deleted", function () {

        it("success - will delete certificates when driver gets deleted from dev environment", function (done) {
            var params = {
                qs: {
                    env: 'STG',
                    driverName: 'dockermachine - cloud - rackspace'
                }
            };

            executeMyRequest(params, "environment/platforms/driver/delete", 'get', function (body) {
	            assert.ok(body.result);
                assert.ok(body.data);
                done();
            });
        });

    });

    after("clean directory and mongo collection", function (done) {
        mongo.remove("fs.files", {}, function (error) {
            assert.ifError(error);
            done();
        });
    });
});