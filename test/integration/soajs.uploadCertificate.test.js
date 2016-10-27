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

var soajsauth;

describe("Docker Certificates tests", function () {

    before("remove test certificates if exist", function (done) {
        mongo.remove ("fs.files", {"filename": /test_cert/}, function (error, result) {
            assert.ifError(error);
            assert.ok(result);
            done();
        });
    });

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

    describe ("upload certificate tests", function () {

        it("success - will upload docker certificate", function (done) {
            var params = {
                qs: {
                    filename: 'test_cert.pem',
                    envCode: 'DEV',
                    platform: 'docker',
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

        it("fail - docker certificate already exists", function (done) {
            var params = {
                qs: {
                    filename: 'test_cert.pem',
                    envCode: 'DEV',
                    platform: 'docker',
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

        it("fail - missing params: driver", function (done) {
            var params = {
                qs: {
                    filename: 'test_cert.pem',
                    envCode: 'DEV',
                    platform: 'docker'
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

        it("fail - missing params: envCode", function (done) {
            var params = {
                qs: {
                    filename: 'test_cert.pem',
                    driver: 'dockermachine - local',
                    platform: 'docker'
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


        it("mongo test - verify docker certificate exists in mongo", function (done) {
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
                        "platform": "docker",
                        "env": {
                            "DEV": ["docker.dockermachine - local"] //temp value, dockermachine drivers are depricated. Proper values will be set soon
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
                certRecord.metadata.env['DASHBOARD'] = ['dockermachine - local', 'dockermachine - cloud'];
                mongo.save("fs.files", certRecord, function (error, result) {
                    assert.ifError(error);
                    assert.ok(result);
                    done();
                });
            })
        });

        it("success = will remove docker certificate (metadata includes serveral drivers and several environments)", function (done) {
            var params = {
                qs: {
                    id: certId,
                    env: 'DASHBOARD',
                    driverName: 'dockermachine - cloud'
                }
            };
            executeMyRequest(params, 'environment/platforms/cert/delete', 'get', function (body) {
                assert.ok(body.result);
                assert.ok(body.data);
                done();
            });
        });

        it("success - will remove docker certificate (metadata includes one driver but several environments)", function (done) {
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

        it("success - will remove docker certificate (metadata includes one driver for one environment)", function (done) {
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

        it("fail - docker certificate does not exist", function (done) {
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
        before("add two docker certificates and get their ids from mongo", function (done) {
            var params = {
                qs: {
                    filename: 'test_cert.pem',
                    envCode: 'DEV',
                    platform: 'docker',
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
                        platform: 'docker',
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

        it("success - will choose existing docker certificates for dockermachine - local", function (done) {
            var params = {
                qs: {
                    env: 'STG',
                    platform: 'docker',
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

        it("success - will choose existing docker certificates for dockermachine - cloud - rackspace", function (done) {
            var params = {
                qs: {
                    env: 'STG',
                    platform: 'docker',
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
                    env: 'STG',
                    platform: 'docker'
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
                    platform: 'docker',
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
                    platform: 'docker',
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

        it("mongo test - verify the docker certificates exist and include the right drivers and environments in their metadata", function (done) {
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
                                "platform": "docker",
                                "env": {
                                    "DEV": [
                                        "docker.dockermachine - local"
                                    ],
                                    "STG": [
                                        "docker.dockermachine - local",
                                        "docker.dockermachine - cloud - rackspace"
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
                                "platform": "docker",
                                "env": {
                                    "DEV": [
                                        "docker.dockermachine - local"
                                    ],
                                    "STG": [
                                        "docker.dockermachine - local",
                                        "docker.dockermachine - cloud - rackspace"
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

    after("clean directory and mongo collection", function (done) {
        mongo.remove("fs.files", {}, function (error) {
            assert.ifError(error);
            done();
        });
    });
});

describe("Nginx Certificates tests", function () {

    before("remove test certificates if exist", function (done) {
        mongo.remove ("fs.files", {"filename": /test_cert/}, function (error, result) {
            assert.ifError(error);
            assert.ok(result);
            done();
        });
    });

    describe("upload nginx certificates tests", function () {
        it("success - will upload nginx certificate", function (done) {
            var params = {
                qs: {
                    filename: 'test_cert.pem',
                    envCode: 'DEV',
                    platform: 'nginx',
                    label: 'certificate'
                },
                formData: {
                    file: fs.createReadStream(testUploadFilesDir + 'test_cert.pem')
                }
            };

            executeMyRequest(params, 'environment/nginx/cert/upload', 'post', function (body) {
                assert.ok(body.result);
                assert.ok(body.data);
                done();
            });
        });

        it("fail - nginx certificate already exists", function (done) {
            var params = {
                qs: {
                    filename: 'test_cert.pem',
                    envCode: 'DEV',
                    platform: 'nginx',
                    label: 'certificate'
                },
                formData: {
                    file: fs.createReadStream(testUploadFilesDir + 'test_cert.pem')
                }
            };

            executeMyRequest(params, 'environment/nginx/cert/upload', 'post', function (body) {
                assert.ok(body.errors);
                assert.deepEqual(body.errors.details[0], {'code': 731, 'message': errorCodes[731]});
                done();
            });
        });

        it("fail - missing params", function (done) {
            var params = {
                qs: {
                    filename: 'test_cert.pem',
                    envCode: 'DEV',
                    platform: 'nginx'
                },
                formData: {
                    file: fs.createReadStream(testUploadFilesDir + 'test_cert.pem')
                }
            };

            executeMyRequest(params, 'environment/nginx/cert/upload', 'post', function (body) {
                assert.ok(body.errors);
                assert.deepEqual(body.errors.details[0], {'code': 739, 'message': errorCodes[739]});
                done();
            });
        });

        it("mongo test - verify nginx certificate exists in mongo", function (done) {
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
                        "platform": "nginx",
                        "label": "certificate",
                        "env": ["DEV"]
                    },
                    "md5":"d8d70241e72d605ca44657aefbf38aed"
                });
                done();
            });
        });
    });

    describe("list nginx certificates tests", function () {
        it ("success - will list nginx certificates", function (done) {
            executeMyRequest({}, 'environment/nginx/cert/list', 'get', function (body) {
                assert.ok(body.result);
                delete body.data[0]._id;
                delete body.data[0].uploadDate;
                assert.deepEqual(body.data, [{
                    "filename":"test_cert.pem",
                    "contentType":"binary/octet-stream",
                    "length":27,
                    "chunkSize":261120,
                    "aliases":null,
                    "metadata": {
                        "platform": "nginx",
                        "label": "certificate",
                        "env": ["DEV"]
                    },
                    "md5":"d8d70241e72d605ca44657aefbf38aed"
                }]);
                done();
            });
        });
    });

    describe("remove nginx certificates tests", function () {
        var certId;
        before ("get test certificate id and update it to include several environments in its metadata", function (done) {
            mongo.findOne("fs.files", {"filename": "test_cert.pem"}, function (error, certRecord) {
                assert.ifError(error);
                assert.ok(certRecord);
                certId = certRecord._id.toString();
                certRecord.metadata.env.push("DASHBOARD");
                mongo.save("fs.files", certRecord, function (error, result) {
                    assert.ifError(error);
                    assert.ok(result);
                    done();
                });
            })
        });

        it("success - will remove nginx certificate (metadata includes several environments)", function (done) {
            var params = {
                qs: {
                    id: certId,
                    env: 'DASHBOARD'
                }
            };
            executeMyRequest(params, 'environment/nginx/cert/delete', 'get', function (body) {
                assert.ok(body.result);
                assert.ok(body.data);
                done();
            });
        });

        it("success - will remove nginx certificate (metadata includes one environment)", function (done) {
            var params = {
                qs: {
                    id: certId,
                    env: 'DEV'
                }
            };
            executeMyRequest(params, 'environment/nginx/cert/delete', 'get', function (body) {
                assert.ok(body.result);
                assert.ok(body.data);
                done();
            });
        });

        it("fail - missing required params", function (done) {
            var params = {
                qs: {
                    id: certId
                }
            };
            executeMyRequest(params, 'environment/nginx/cert/delete', 'get', function (body) {
                assert.ok(body.errors);
                assert.deepEqual(body.errors.details[0], {'code': 172, 'message': 'Missing required field: env'});
                done();
            });
        });

        it("fail - nginx certificate does not exist", function (done) {
            var params = {
                qs: {
                    id: certId,
                    env: 'DEV'
                }
            };
            executeMyRequest(params, 'environment/nginx/cert/delete', 'get', function (body) {
                assert.ok(body.errors);
                assert.deepEqual(body.errors.details[0], {'code': 730,'message': errorCodes[730]});
                done();
            });
        });

        it("fail - invalid certificate id provided", function (done) {
            var params = {
                qs: {
                    id: "123:::321",
                    env: 'DEV'
                }
            };
            executeMyRequest(params, 'environment/nginx/cert/delete', 'get', function (body) {
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

    describe("choose existing nginx certificates tests", function () {
        var testCerts = [];
        before("add two nginx certificates and get their ids from mongo", function (done) {
            var params = {
                qs: {
                    filename: 'test_cert.pem',
                    envCode: 'DEV',
                    platform: 'nginx',
                    label: 'certificate'
                },
                formData: {
                    file: fs.createReadStream(testUploadFilesDir + 'test_cert.pem')
                }
            };

            executeMyRequest(params, 'environment/nginx/cert/upload', 'post', function (body) {
                assert.ok(body.result);
                assert.ok(body.data);

                params = {
                    qs: {
                        filename: 'test_cert_2.pem',
                        envCode: 'DEV',
                        platform: 'nginx',
                        label: 'privateKey'
                    },
                    formData: {
                        file: fs.createReadStream(testUploadFilesDir + 'test_cert_2.pem')
                    }
                };

                executeMyRequest(params, 'environment/nginx/cert/upload', 'post', function (body) {
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

        it("success - will choose existing nginx certificates for STG environment", function (done) {
            var params = {
                qs: {
                    env: 'STG'
                },
                form: {
                    certIds: testCerts
                }
            };
            executeMyRequest(params, 'environment/nginx/cert/choose', 'post', function (body) {
                assert.ok(body.result);
                assert.ok(body.data);
                done();
            });
        });

        it("fail - missing required params", function (done) {
            var params = {
                form: {
                    certIds: testCerts
                }
            };
            executeMyRequest(params, 'environment/nginx/cert/choose', 'post', function (body) {
                assert.ok(body.errors);
                assert.deepEqual(body.errors.details[0], {'code': 172, 'message': 'Missing required field: env'});
                done();
            });
        });

        it("fail - invalid certificate id provided", function (done) {
            var params = {
                qs: {
                    env: 'STG'
                },
                form: {
                    certIds: ['1234567890']
                }
            };
            executeMyRequest(params, 'environment/nginx/cert/choose', 'post', function (body) {
                assert.ok(body.errors);
                assert.deepEqual(body.errors.details[0], {'code': 701, 'message': errorCodes[701]});
                done();
            });
        });

        it("fail - one or more certificates do not exist", function (done) {
            var params = {
                qs: {
                    env: 'STG'
                },
                form: {
                    certIds: [testCerts[0], '123456789012345678901234']
                }
            };
            executeMyRequest(params, 'environment/nginx/cert/choose', 'post', function (body) {
                assert.ok(body.errors);
                assert.deepEqual(body.errors.details[0], {'code': 730, 'message': errorCodes[730]});
                done();
            });
        });

        it("mongo test - verify the docker certificates exist and include the right drivers and environments in their metadata", function (done) {
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
                                "platform": "nginx",
                                "label": "certificate",
                                "env": ["DEV", "STG"]
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
                                "platform": "nginx",
                                "label": "privateKey",
                                "env": ["DEV", "STG"]
                            },
                            "md5": "c321bfbda5799c5ccf748b3183b0a2a7"
                        }
                    ]
                );

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
