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
	    console.log("* Setting SOAJS_ENV_WORKDIR for test mode as: ", process.env.APP_DIR_FOR_CODE_COVERAGE);
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
                        "profile": __dirname + "/../profiles/profile.js"
                    }
                }, function (error) {
                    assert.ifError(error);
                    validDeployerRecord.container.dockermachine.local.config.MachineName = "soajs-stg";
                    mongo.update("environment", {"code": "STG"}, {"$set": {"deployer": validDeployerRecord, "profile": __dirname + "/../profiles/profile.js"}}, function (error) {
                        assert.ifError(error);

                        validDeployerRecord.container.dockermachine.local.config.MachineName = "soajs-prod";
                        validDeployerRecord.type = 'manual';

                        mongo.update("environment", {"code": "PROD"}, {"$set": {"deployer": validDeployerRecord, "profile": __dirname + "/../profiles/profile.js"}}, function (error) {
                            assert.ifError(error);

                            //upload a fake certificate to fs.files
                            var testUploadFilesDir = __dirname + "/../uploads/";
                            var params = {
                                qs: {
                                    filename: 'test_cert.pem',
                                    envCode: 'DEV',
                                    type: 'docker',
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
        });
    });

    after(function (done) {
        server.close(done);
    });

    after(function (done) {
        mongo.closeDb();
        done();
    });

    describe("testing controller deployment", function () {
        before('create dashboard environment record', function (done) {
            var dashEnv = {
                "code": "DASHBOARD",
                "domain": "soajs.org",
                "locked": true,
                "port": 80,
                "profile": "/opt/soajs/FILES/profiles/profile.js",
                "deployer": {
                    "type": "container",
                    "selected": "container.dockermachine.local",
                    "container": {
                        "dockermachine": {
                            "local": {
                                "host": "192.168.99.107",
                                "port": 2376,
                                "config": {
                                    "HostConfig": {
                                        "NetworkMode": "soajsnet"
                                    },
                                    "MachineName": "soajs-dash"
                                }
                            },
                            "cloud": {
                                "rackspace": {
                                    "host": "docker.rackspace.com",
                                    "port": 2376
                                }
                            }
                        },
                        "docker": {
                            "socket": {
                                "socketPath": "/var/run/docker.sock"
                            }
                        }
                    }
                },
                "description": "this is the Dashboard environment",
                "dbs": {
                    "clusters": {
                        "dash_cluster": {
                            "servers": [
                                {
                                    "host": "192.168.99.107",
                                    "port": 27017
                                }
                            ],
                            "credentials": null,
                            "URLParam": {
                                "connectTimeoutMS": 0,
                                "socketTimeoutMS": 0,
                                "maxPoolSize": 5,
                                "wtimeoutMS": 0,
                                "slaveOk": true
                            },
                            "extraParam": {
                                "db": {
                                    "native_parser": true
                                },
                                "server": {
                                    "auto_reconnect": true
                                }
                            }
                        }
                    },
                    "config": {
                        "prefix": "",
                        "session": {
                            "cluster": "dash_cluster",
                            "name": "core_session",
                            "store": {},
                            "collection": "sessions",
                            "stringify": false,
                            "expireAfter": 1209600000
                        }
                    },
                    "databases": {
                        "urac": {
                            "cluster": "dash_cluster",
                            "tenantSpecific": true
                        }
                    }
                },
                "services": {
                    "controller": {
                        "maxPoolSize": 100,
                        "authorization": true,
                        "requestTimeout": 30,
                        "requestTimeoutRenewal": 0
                    },
                    "config": {
                        "awareness": {
                            "healthCheckInterval": 5000,
                            "autoRelaodRegistry": 3600000,
                            "maxLogCount": 5,
                            "autoRegisterService": true
                        },
                        "agent": {
                            "topologyDir": "/opt/soajs/"
                        },
                        "key": {
                            "algorithm": "aes256",
                            "password": "soajs key lal massa"
                        },
	                    "logger": {
		                    "level": "fatal",
		                    "formatter": {
			                    "outputMode": "short"
		                    }
	                    },
                        "cors": {
                            "enabled": true,
                            "origin": "*",
                            "credentials": "true",
                            "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
                            "headers": "key,soajsauth,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type",
                            "maxage": 1728000
                        },
                        "oauth": {
                            "grants": [
                                "password",
                                "refresh_token"
                            ],
                            "debug": false
                        },
                        "ports": {
                            "controller": 4000,
                            "maintenanceInc": 1000,
                            "randomInc": 100
                        },
                        "cookie": {
                            "secret": "this is a secret sentence"
                        },
                        "session": {
                            "name": "soajsID",
                            "secret": "this is antoine hage app server",
                            "cookie": {
                                "path": "/",
                                "httpOnly": true,
                                "secure": false,
                                "maxAge": null
                            },
                            "resave": false,
                            "saveUninitialized": false,
                            "rolling": false,
                            "unset": "keep"
                        }
                    }
                }
            };
            mongo.insert("environment", dashEnv, function (error) {
                assert.ifError(error);
                done();
            });
        });

        before('add static content record', function (done) {
            var scRecord = {
                "name": "Custom UI Test",
                "dashUI": true,
                "src": {
                "provider": "github",
                    "owner": "soajs",
                    "repo": "soajs.dashboard" //dummy data
                }
            };
            mongo.insert("staticContent", scRecord, function (error) {
                assert.ifError(error);
                done();
            });
        });

        it("success - deploy 1 controller", function (done) {
            var params = {
                headers: {
                    soajsauth: soajsauth
                },
                "form": {
                    "number": 2,
                    "envCode": "DEV",
                    "owner": "soajs",
                    "repo": "soajs.controller",
                    "branch": "develop",
                    "commit": "67a61db0955803cddf94672b0192be28f47cf280",
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

	    it("success - deploy 1 controller and use the main file specified in src", function (done) {
		    mongo.update("services", {name: 'controller'}, {'$set': {'src.main': '/index.js'}}, function (error) {
			    assert.ifError(error);

			    var params = {
				    headers: {
					    soajsauth: soajsauth
				    },
				    "form": {
					    "number": 1,
					    "envCode": "DEV",
					    "owner": "soajs",
					    "repo": "soajs.controller",
					    "branch": "develop",
					    "commit": "67a61db0955803cddf94672b0192be28f47cf280",
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

        it("success - deploy 1 controller with static content", function (done) {
            mongo.findOne("staticContent", {name: "Custom UI Test"}, function (error, record) {
                assert.ifError(error);

                var params = {
                    headers: {
                        soajsauth: soajsauth
                    },
                    "form": {
                        "number": 1,
                        "envCode": "DEV",
                        "owner": "soajs",
                        "repo": "soajs.controller",
                        "branch": "develop",
                        "commit": "67a61db0955803cddf94672b0192be28f47cf280",
                        "variables": [
                            "TEST_VAR=mocha"
                        ]
                    }
                };
                executeMyRequest(params, "hosts/deployController", "post", function (body) {
                    assert.ok(body.result);
                    assert.ok(body.data);

	                var params2 = {
		                headers: {
			                soajsauth: soajsauth
		                },
		                "form":{
			                "envCode": "DEV",
			                "nginxConfig": {
				                "customUIId": record._id.toString(),
				                "branch": "develop",
				                "commit": "ac23581e16511e32e6569af56a878c943e2725bc"
			                }
		                }
	                };

	                executeMyRequest(params2, "hosts/deployNginx", "post", function(body){
		                assert.ok(body.result);
		                assert.ok(body.data);
                        done();
	                });
                });
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
                    "owner": "soajs",
                    "repo": "soajs.oauth",
                    "branch": "develop",
                    "commit": "9947fa88c7cea09a8cf744baa0ffeb3893cdd03d",
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

        it("success - deploy 1 core service and use main file specified in src", function (done) {
            mongo.update('services', {name: 'urac'}, {'$set': {'src.main': '/index.js'}}, function (error) {
                assert.ifError(error);

                var params = {
                    headers: {
                        soajsauth: soajsauth
                    },
                    "form": {
                        "name": "urac",
                        "envCode": "DEV",
                        "owner": "soajs",
                        "repo": "soajs.urac",
                        "branch": "develop",
                        "commit": "9947fa88c7cea09a8cf744baa0ffeb3893cdd03d",
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
        });

        it("success - deploy 1 core service that contains cmd values in src", function (done) {
            var cmdArray = ['ls -l', 'pwd'];
            mongo.update('services', {name: 'urac'}, {'$set': {'src.cmd': cmdArray}}, function (error) {
                assert.ifError(error);

                var params = {
                    headers: {
                        soajsauth: soajsauth
                    },
                    "form": {
                        "name": "urac",
                        "envCode": "DEV",
                        "owner": "soajs",
                        "repo": "soajs.urac",
                        "branch": "develop",
                        "commit": "9947fa88c7cea09a8cf744baa0ffeb3893cdd03d",
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
                        "owner": "soajs",
                        "repo": "soajs.gcs",
                        "branch": "develop",
                        "commit": "2f69289334e76f896d08bc7a71ac757aa55cb20f",
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
                    "envCode": "PROD",
                    "owner": "soajs",
                    "repo": "soajs.urac",
                    "branch": "develop",
                    "commit": "67a61db0955803cddf94672b0192be28f47cf280",
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
                        "name": "urac",
                        "envCode": "STG",
                        "owner": "soajs",
                        "repo": "soajs.urac",
                        "branch": "develop",
                        "commit": "67a61db0955803cddf94672b0192be28f47cf280",
                        "variables": [
                            "TEST_VAR=mocha"
                        ]
                    }
                };
                executeMyRequest(params, "hosts/deployService", "post", function (body) {
                    assert.ok(body.errors);
                    assert.deepEqual(body.errors.details[0], {'code': 741, 'message': errorCodes[741]});
                    done();
                });
            });
        });
    });

    describe("testing daemon deployment", function () {
        var gcRecord;
        it("success - deploy 1 daemon", function (done) {
            var params = {
                headers: {
                    soajsauth: soajsauth
                },
                "form": {
                    "name": "helloDaemon",
                    "grpConfName": "group1",
                    "envCode": "DEV",
                    "owner": "soajs",
                    "repo": "soajs.dashboard", //dummy value, does not need to be accurate
                    "branch": "develop",
                    "commit": "b59545bb699205306fbc3f83464a1c38d8373470",
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

        it("success - deploy 1 daemon and use main file specified in src", function (done) {
            mongo.update('daemons', {name: 'helloDaemon'}, {'$set': {'src.main': '/index.js'}}, function (error) {
                assert.ifError(error);

                var params = {
                    headers: {
                        soajsauth: soajsauth
                    },
                    "form": {
                        "name": "helloDaemon",
                        "grpConfName": "group1",
                        "envCode": "DEV",
                        "owner": "soajs",
                        "repo": "soajs.dashboard", //dummy value, does not need to be accurate
                        "branch": "develop",
                        "commit": "b59545bb699205306fbc3f83464a1c38d8373470",
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
        });

        it("success - deploy 1 daemon that contians cmd info in its src", function (done) {
            var cmdArray = ['ls -l', 'pwd'];
            mongo.update('daemons', {name: 'helloDaemon'}, {'$set': {'src.cmd': cmdArray}}, function (error) {
                assert.ifError(error);

                var params = {
                    headers: {
                        soajsauth: soajsauth
                    },
                    "form": {
                        "name": "helloDaemon",
                        "grpConfName": "group1",
                        "envCode": "DEV",
                        "owner": "soajs",
                        "repo": "soajs.dashboard", //dummy value, does not need to be accurate
                        "branch": "develop",
                        "commit": "b59545bb699205306fbc3f83464a1c38d8373470",
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
        });

        it("fail - missing required params", function (done) {
            var params = {
                headers: {
                    soajsauth: soajsauth
                },
                "form": {
                    "envCode": "DEV",
                    "owner": "soajs",
                    "repo": "soajs.daemons",
                    "branch": "develop",
                    "commit": "b59545bb699205306fbc3f83464a1c38d8373470",
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
                controllerHosts.forEach(function (oneCtrl) {
                    if (oneCtrl.hostname) {
                        controllers.push(oneCtrl);
                    }
                });
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
                assert.ok(body.result);
                assert.ok(body.data);
                done();
            });
        });
    });

    describe("testing zombie containers", function () {
        var serviceName = "gc_myservice";
        var hostname, cid;
        var env = "dev";

        before("get service container info", function (done) {
            mongo.findOne("hosts", {name: serviceName}, function (error, hostRecord) {
                assert.ifError(error);
                hostname = hostRecord.hostname;

                mongo.findOne("docker", {hostname: hostRecord.hostname}, function (error, record) {
                    assert.ifError(error);
                    assert.ok(record);
                    cid = record.cid;
                    done();
                });
            });
        });

        describe("list zombie containers tests", function () {
            it ("success - no zombie containers are available", function (done) {
                var params = {
                    qs: {
                        env: env
                    }
                };
                executeMyRequest(params, 'hosts/container/zombie/list', 'get', function (body) {
                    assert.ok(body.result);
                    assert.ok(body.data);
                    assert.equal(body.data.length, 0);
                    done();
                });
            });

            it("success - will identify 1 zombie container", function (done) {
                mongo.remove("hosts", {hostname: hostname}, function (error, result) {
                    assert.ifError(error);

                    var params = {
                        qs: {
                            env: env
                        }
                    };

                    executeMyRequest(params, 'hosts/container/zombie/list', 'get', function (body) {
                        assert.ok(body.result);
                        assert.ok(body.data);
                        assert.equal(body.data.length, 1);
                        assert.equal(body.data[0].hostname, hostname);
                        done();
                    });
                });
            });

            it("fail - missing required params", function (done) {
                executeMyRequest({}, 'hosts/container/zombie/list', 'get', function (body) {
                    assert.ok(body.errors);
                    assert.deepEqual(body.errors.details[0], {'code': 172, 'message': 'Missing required field: env'});
                    done();
                });
            });
        });

        describe("zombie container logs tests", function () {
            it("success - will get zombie container logs", function (done) {
                var params = {
                    qs: {
                        env: env,
                        cid: cid
                    }
                };

                executeMyRequest(params, 'hosts/container/logs', 'get', function (body) {
                    assert.ok(body.result);
                    assert.ok(body.data);
                    done();
                });
            });

            it("fail - missing required params", function (done) {
                var params = {
                    qs: {
                        env: env
                    }
                };

                executeMyRequest(params, 'hosts/container/logs', 'get', function (body) {
                    assert.ok(body.errors);
                    assert.deepEqual(body.errors.details[0], {'code': 172, 'message': 'Missing required field: cid'});
                    done();
                });
            });
        });

        describe("delete zombie containers tests", function () {
            it("fail - missing required params", function (done) {
                var params = {
                    qs: {
                        env: env
                    }
                };

                executeMyRequest(params, 'hosts/container/zombie/delete', 'get', function (body) {
                    assert.ok(body.errors);
                    assert.deepEqual(body.errors.details[0], {'code': 172, 'message': 'Missing required field: cid'});
                    done();
                });
            });

            it("success - will delete zombie container", function (done) {
                var params = {
                    qs: {
                        env: env,
                        cid: cid
                    }
                };

                executeMyRequest(params, 'hosts/container/zombie/delete', 'get', function (body) {
                    assert.ok(body.result);
                    assert.ok(body.data);

                    mongo.count("docker", {hostname: hostname}, function (error, count) {
                        assert.ifError(error);
                        assert.equal(count, 0);

                        done();
                    });
                });
            });
        });
    });

    describe("testing nginx containers", function () {
        var nginxDockerRecord = {
            "env": "dev",
            "cid": "da42c756def695471acb1e1391746f1b9d82e5f925e41b3d02b0759b1a257b87",
            "hostname": "nginx_dev",
            "type": "nginx",
            "running": true,
            "deployer": {
                "host": "192.168.99.103",
                "port": 2376,
                "config": {
                    "HostConfig": {
                        "NetworkMode": "soajsnet"
                    },
                    "MachineName": "soajs-dev"
                },
                "driver": {
                    "type": "container",
                    "driver": "docker"
                },
                "selectedDriver": "dockermachine - local",
                "envCode": "dev"
            },
            "info": {}
        };

        before("clean docker collection and inject nginx records in docker collection", function (done) {
            mongo.remove("docker", {type: 'nginx'}, function (error) {
                assert.ifError(error);

                mongo.insert("docker", nginxDockerRecord, function (error) {
                    assert.ifError(error);
                    done();
                });
            });
        });

        describe("list nginx hosts", function () {

            it("success - will list nginx hosts", function (done) {
                var params = {
                    qs: {
                        env: nginxDockerRecord.env
                    }
                };
                executeMyRequest(params, 'hosts/nginx/list', 'get', function (body) {
                    assert.ok(body.result);
                    assert.ok(body.data);
                    assert.equal(body.data.length, 1);
                    done();
                });
            });

            it("fail - missing required params", function (done) {
                executeMyRequest({}, 'hosts/nginx/list', 'get', function (body) {
                    assert.ok(body.errors);
                    assert.deepEqual(body.errors.details[0], {'code': 172, 'message': 'Missing required field: env'});
                    done();
                });
            });

            it("mongo check", function (done) {
                mongo.count("docker", {type: 'nginx'}, function (error, count) {
                    assert.ifError(error);
                    assert.equal(count, 1);
                    done();
                });
            });
        });

        describe("delete nginx hosts", function () {
            it("success - will delete nginx container", function (done) {
                mongo.findOne("docker", {type: 'nginx'}, function (error, record) {
                    assert.ifError(error);

                    var params = {
                        qs: {
                            env: record.env,
                            cid: record.cid
                        }
                    };
                    executeMyRequest(params, 'hosts/container/delete', 'get', function (body) {
                        assert.ok(body.result);
                        assert.ok(body.data);
                        done();
                    });
                });
            });

            it("mongo check", function (done) {
                mongo.count("docker", {type: 'nginx'}, function (error, count) {
                    assert.ifError(error);
                    assert.equal(count, 0);
                    done();
                });
            });
        });
    });
});
