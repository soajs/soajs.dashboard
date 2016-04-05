"use strict";
var assert = require('assert');
var request = require("request");
var helper = require("../helper.js");
var fs = require('fs');

var soajs = require('soajs');
var Mongo = soajs.mongo;
var dbConfig = require("./db.config.test.js");
var dashboardConfig = dbConfig();
dashboardConfig.name = "core_provision";
var mongo = new Mongo(dashboardConfig);

var errorCodes = helper.requireModule('./config').errors;

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

var server;
var dockerMock = require('docker-mock');

describe("testing hosts deployment", function () {
    var soajsauth, containerInfo;
    before(function (done) {
	    process.env.SOAJS_ENV_WORKDIR = process.env.APP_DIR_FOR_CODE_COVERAGE;
	    console.log("***************************************************************");
	    console.log("*");
	    console.log("* Setting SOAJS_ENV_WORKDIR for test mode as: ", process.env.APP_DIR_FOR_CODE_COVERAGE);
	    console.log("*");
	    console.log("***************************************************************");
        mongo.remove('docker', {}, function (error) {
            assert.ifError(error);
            server = dockerMock.listen(5354);

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

                var validDeployerRecord = {
                    "type": "container",
                    "selected": "container.dockermachine.local",
                    "container": {
                        "dockermachine": {
                            "local": {
                                "host": "localhost",
                                "port": 5354,
                                "config": {
                                    "HostConfig": {
                                        "NetworkMode": "soajsnet"
                                    },
                                    "MachineName": "soajs-dev"
                                }
                            },
                            "cloud": {
                                "rackspace": {
                                    "host": "docker.rackspace.com",
                                    "port": 2376
                                    //additional info goes here like instances, credentials or keys ....
                                }
                            }
                        },
                        "docker": {
                            "socket": {
                                "socketPath": "/var/run/docker.sock"
                            }
                        }
                    }
                };
                mongo.update("environment", {"code": "DEV"}, {
                    "$set": {
                        "deployer": validDeployerRecord,
                        "profile": __dirname + "/../profiles/single.js"
                    }
                }, function (error) {
                    assert.ifError(error);
                    //upload a fake certificate to fs.files
                    var testUploadFilesDir = __dirname + "/../uploads/";
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
            });
        });
    });

    after(function (done) {
        server.close(done);
    });

    describe("testing controller deployment", function () {
        it("success - deploy 2 controller", function (done) {
            var params = {
                headers: {
                    soajsauth: soajsauth
                },
                "form": {
                    "number": 2,
                    "envCode": "DEV",
                    "variables": [
                        "TEST_VAR=mocha"
                    ]
                }
            };
            executeMyRequest(params, "hosts/deployController", "post", function (body) {
                assert.ok(body.result);
                assert.ok(body.data);
                done();
            });
        });
    });

    describe("testing service deployment", function () {
        it("success - deploy 1 core service", function (done) {
            var params = {
                headers: {
                    soajsauth: soajsauth
                },
                "form": {
                    "name": "urac",
                    "envCode": "DEV",
                    "variables": [
                        "TEST_VAR=mocha"
                    ]
                }
            };
            executeMyRequest(params, "hosts/deployService", "post", function (body) {
                assert.ok(body.result);
                assert.ok(body.data);
                mongo.findOne("docker", {"hostname": /urac_[a-z0-9]+_dev/}, function (error, oneContainerRecord) {
                    assert.ifError(error);
                    assert.ok(oneContainerRecord);
                    containerInfo = oneContainerRecord;
                    done();
                });
            });
        });

        it("success - deploy 1 gc service", function (done) {
            mongo.findOne('gc', {}, function (error, gcRecord) {
                assert.ifError(error);
                assert.ok(gcRecord);

                var params = {
                    headers: {
                        soajsauth: soajsauth
                    },
                    "form": {
                        "gcName": gcRecord.name,
                        "gcVersion": gcRecord.v,
                        "envCode": "DEV",
                        "variables": [
                            "TEST_VAR=mocha"
                        ]
                    }
                };
                executeMyRequest(params, "hosts/deployService", "post", function (body) {
                    assert.ok(body.result);
                    assert.ok(body.data);
                    done();
                });
            });
        });

        it("fail - trying to deploy to an environment that is configured to be deployed manually", function (done) {
            var params = {
                headers: {
                    soajsauth: soajsauth
                },
                "form": {
                    "name": "urac",
                    "envCode": "STG",
                    "variables": [
                        "TEST_VAR=mocha"
                    ]
                }
            };
            executeMyRequest(params, "hosts/deployService", "post", function (body) {
                assert.ok(body.errors);
                assert.deepEqual(body.errors.details[0], {'code': 618, 'message': errorCodes[618]});
                done();
            });
        });

        it("fail - trying to deploy without certificates", function (done) {
            mongo.update("environment", {"code": "STG"}, {"$set": {"deployer.type": "container"}}, function (error, result) {
                assert.ifError(error);
                assert.ok(result);

                var params = {
                    headers: {
                        soajsauth: soajsauth
                    },
                    "form": {
                        "name": "mike-srv",
                        "envCode": "STG",
                        "variables": [
                            "TEST_VAR=mocha"
                        ]
                    }
                };
                executeMyRequest(params, "hosts/deployService", "post", function (body) {
                    assert.ok(body.errors);
                    assert.deepEqual(body.errors.details[0], {'code': 615, 'message': errorCodes[615]});
                    done();
                });
            });
        });
    });

    describe("testing daemon deployment", function () {
        var gcRecord;
        before("add a gc daemon", function (done) {
            mongo.findOne('gc', {}, function (error, gcr) {
                assert.ifError(error);
                assert.ok(gcr);

                gcRecord = gcr;
                var daemonGcRecord = {
                    name: gcRecord.name,
                    gcId: gcRecord._id.toString(),
                    gcV: gcRecord.v,
                    port: 1111,
                    jobs: {}
                };
                mongo.insert("daemons", daemonGcRecord, function (error, result) {
                    assert.ifError(error);
                    assert.ok(result);
                    done();
                });
            });
        });

        it("success - deploy 1 daemon", function (done) {
            var params = {
                headers: {
                    soajsauth: soajsauth
                },
                "form": {
                    "name": "helloDaemon",
                    "grpConfName": "group1",
                    "envCode": "DEV",
                    "variables": [
                        "TEST_VAR=mocha"
                    ]
                }
            };
            executeMyRequest(params, "hosts/deployDaemon", "post", function (body) {
                assert.ok(body.result);
                assert.ok(body.data);
                mongo.findOne("docker", {"hostname": /helloDaemon_[a-z0-9]+_dev/}, function (error, oneContainerRecord) {
                    assert.ifError(error);
                    assert.ok(oneContainerRecord);
                    done();
                });
            });
        });

        it("success - deploy 1 gc daemon", function (done) {
            var params = {
                headers: {
                    soajsauth: soajsauth
                },
                "form": {
                    "gcName": gcRecord.name,
                    "gcVersion": gcRecord.v,
                    "grpConfName": "group1",
                    "envCode": "DEV",
                    "variables": [
                        "TEST_VAR=mocha"
                    ]
                }
            };
            executeMyRequest(params, "hosts/deployDaemon", "post", function (body) {
                assert.ok(body.result);
                assert.ok(body.data);
                done();
            });
        });

        it("fail - missing required params", function (done) {
            var params = {
                headers: {
                    soajsauth: soajsauth
                },
                "form": {
                    "envCode": "DEV",
                    "variables": [
                        "TEST_VAR=mocha"
                    ]
                }
            };
            executeMyRequest(params, "hosts/deployDaemon", "post", function (body) {
                assert.ok(body.errors);
                assert.deepEqual(body.errors.details[0], {"code": 172, "message": "Missing required field: grpConfName"});
                done();
            });
        });

    });

    describe("testing get service logs", function () {
        it("success - list services", function (done) {
            var params = {
                headers: {
                    soajsauth: soajsauth
                },
                "qs": {
                    "env": "DEV"
                }
            };
            executeMyRequest(params, "hosts/list", "get", function (body) {
                assert.ok(body.result);
                assert.ok(body.data);
                done();
            });
        });

        it("success - getting service logs", function (done) {
            var params = {
                headers: {
                    soajsauth: soajsauth
                },
                "form": {
                    "serviceName": "urac",
                    "servicePort": 4001,
                    "hostname": containerInfo.hostname,
                    "operation": "hostLogs",
                    "env": "DEV"
                }
            };
            executeMyRequest(params, "hosts/maintenanceOperation", "post", function (body) {
                assert.ok(body.result);
                assert.ok(body.data);
                done();
            });
        });
    });

    describe("testing service delete", function () {
        it("success - remove service", function (done) {
            mongo.findOne('hosts', {"hostname": containerInfo.hostname}, function (error, oneHost) {
                assert.ifError(error);
                assert.ok(oneHost);
                var params = {
                    headers: {
                        soajsauth: soajsauth
                    },
                    "qs": {
                        "name": "urac",
                        "hostname": containerInfo.hostname,
                        "ip": oneHost.ip,
                        "env": "DEV"
                    }
                };
                executeMyRequest(params, "hosts/delete", "get", function (body) {
                    console.log(JSON.stringify(body));
                    assert.ok(body.result);
                    assert.ok(body.data);
                    done();
                });
            });
        });
    });

    describe("testing controller delete", function () {
        var controllers = [];
        before(function (done) {
            mongo.find("hosts", {"name": "controller", "env": "dev"}, function (error, controllerHosts) {
                assert.ifError(error);
                assert.ok(controllerHosts);
                controllers = controllerHosts;
                done();
            });
        });

        it("success - remove controller1", function (done) {
            var params = {
                headers: {
                    soajsauth: soajsauth
                },
                "qs": {
                    "name": "controller",
                    "hostname": controllers[0].hostname,
                    "ip": controllers[0].ip,
                    "env": "DEV"
                }
            };
            executeMyRequest(params, "hosts/delete", "get", function (body) {
                console.log(JSON.stringify(body));
                assert.ok(body.result);
                assert.ok(body.data);
                done();
            });
        });

        it("success - remove controller2", function (done) {
            var params = {
                headers: {
                    soajsauth: soajsauth
                },
                "qs": {
                    "name": "controller",
                    "hostname": controllers[1].hostname,
                    "ip": controllers[1].ip,
                    "env": "DEV"
                }
            };
            executeMyRequest(params, "hosts/delete", "get", function (body) {
                console.log(JSON.stringify(body));
                assert.ok(body.result);
                assert.ok(body.data);
                done();
            });
        });
    });
});