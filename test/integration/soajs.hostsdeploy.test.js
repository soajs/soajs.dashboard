"use strict";
var assert = require('assert');
var request = require("request");
var helper = require("../helper.js");
var fs = require('fs');
var shell = require('shelljs');

var Mongo = require("soajs.core.modules").mongo;
var dbConfig = require("./db.config.test.js");
var dashboardConfig = dbConfig();
dashboardConfig.name = "core_provision";
var mongo = new Mongo(dashboardConfig);

var errorCodes = helper.requireModule('./config').errors;
var extKey = 'aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac';

var access_token;


function configureCD(config, cb) {
    var options = {
        qs: {
            access_token: access_token
        },
        form: {
            "config": config
        }
    };

    executeMyRequest(options, "cd/", "post", function (body) {
        return cb(body);
    });
}

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

        if (params.timeout) {
            options.timeout = params.timeout;
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
            //maintenance tests have a timeout set to avoid travis errors
            //if timeout is exceeded, return cb() without checking for error since this is expected behavior
            if (error && error.code && error.code === 'ESOCKETTIMEDOUT') {
                return cb(null, 'ESOCKETTIMEDOUT');
            }

            assert.ifError(error);
            assert.ok(body);
            return cb(null, body);
        });
    }
}

function getService(options, cb) {
    var params = {
        qs: {
            access_token: access_token,
            env: options.env
        }
    };
    executeMyRequest(params, "cloud/services/list", "get", function (body) {
        assert.ifError(body.errors);
        if (!options.serviceName) return cb(body);

        var services = body.data, service = {};
        for (var i = 0; i < services.length; i++) {
            if (services[i].labels['soajs.service.name'] === options.serviceName) {
                service = services[i];
                break;
            }
        }

        return cb(service);
    });
}

function deleteService(options, cb) {
    var params = {
        "qs": {
            access_token: access_token,
            env: options.env,
            serviceId: options.id,
            mode: options.mode
        }
    };
    return executeMyRequest(params, "cloud/services/delete", 'delete', cb);
}

describe("testing hosts deployment", function () {
	var soajsauth, containerInfo;
	var Authorization;

	before(function (done) {
		process.env.SOAJS_ENV_WORKDIR = process.env.APP_DIR_FOR_CODE_COVERAGE;
		console.log("***************************************************************");
		console.log("* Setting SOAJS_ENV_WORKDIR for test mode as: ", process.env.APP_DIR_FOR_CODE_COVERAGE);
		console.log("***************************************************************");

        var options1 = {
            uri: 'http://localhost:4000/oauth/authorization',
            headers: {
                'Content-Type': 'application/json',
                'key': extKey
            },
            json: true
        };

        request.get(options1, function (error, response, body) {
            assert.ifError(error);
            assert.ok(body);
            Authorization = body.data;

            var options = {
                uri: 'http://localhost:4000/oauth/token',
                headers: {
                    'Content-Type': 'application/json',
                    key: extKey,
                    Authorization: Authorization
                },
                body: {
                    "username": "user1",
                    "password": "123456",
                    "grant_type": "password"
                },
                json: true
            };
            request.post(options, function (error, response, body) {
                assert.ifError(error);
                assert.ok(body);
                access_token = body.access_token;

                var validDeployerRecord = {
                    "type": "container",
                    "selected": "container.docker.local",
                    "container": {
                        "docker": {
                            "local": {},
                            "remote": {}
                        }
                    }
                };

                mongo.update("environment", {}, {
                    "$set": {
                        "deployer": validDeployerRecord,
                        "profile": __dirname + "/../profiles/profile.js"
                    }
                }, {multi: true}, function (error) {
                    assert.ifError(error);
                    done();
                });
            });
        });

	});

    before(function (done) {
        mongo.insert("git_accounts", [{
            "label": "soajsTestAccount",
            "owner": "soajsTestAccount",
            "provider": "github",
            "domain": "github.com",
            "type": "personal",
            "access": "public",
            "repos": [
                {
                    "name": "soajsTestAccount/custom-configuration",
                    "type": "config",
                    "serviceName": null,
                    "configBranch": "master",
                    "configSHA": "e61063e026d4b904bf254b176d9f2c0034b62cbf"
                },
                {
                    "name": "soajsTestAccount/customCode",
                    "type": "custom",
                    "configBranch": "master",
                    "configSHA": null
                },
                {
                    "name": "soajsTestAccount/testMulti",
                    "type": "multi",
                    "configBranch": "master",
                    "configSHA": [
                        {
                            "contentType": "service",
                            "contentName": "sample2",
                            "path": "/ex1/config.js",
                            "sha": "451c36643c6a36c84e856b4d5f653e4939851ded"
                        },
                        {
                            "contentType": "service",
                            "contentName": "jsconftesttwo",
                            "path": "/ex2/config.js",
                            "sha": "38a95b91139b3aab7d81313594a283555114b2c7"
                        },
                        {
                            "contentType": "service",
                            "contentName": "jsconftest",
                            "path": "/ex4/ex4-1/config.js",
                            "sha": "c2d1a6cbe4c304f3363b466c2c873f7a80ab5064"
                        }
                    ]
                }
            ]
        }], (error) => {
            assert.ifError(error);
            done();
        });
    });

    before('create dashboard environment record', function (done) {
        var dashEnv = {
            "code": "DASHBOARD",
            "domain": "soajs.org",
            "locked": true,
            "port": 80,
            "profile": "/opt/soajs/FILES/profiles/profile.js",
            "deployer": {
                "type": "container",
                "selected": "container.docker.local",
                "container": {
                    "docker": {
                        "local": {},
                        "remote": {}
                    }
                }
            },
            "description": "this is the Dashboard environment",
            "dbs": {
                "clusters": {
                    "dash_cluster": {
                        "servers": [
                            {
                                "host": "127.0.0.1",
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
        var updateField = {
            "$set": dashEnv
        };
        mongo.update("environment", {"code": "DASHBOARD"}, updateField, {
            "upsert": true,
            "multi": false
        }, function (error) {
            assert.ifError(error);
            done();
        });
    });

	before('Activate swarm mode for local docker engine and create overlay network', function (done) {
		var params = {
			method: 'POST',
			uri: 'http://unix:/var/run/docker.sock:/swarm/init',
			json: true,
			headers: {
				Host: '127.0.0.1'
			},
			body: {
				"ListenAddr": "0.0.0.0:2377",
				"AdvertiseAddr": "127.0.0.1:2377"
			}
		};

        request(params, function (error, response, nodeId) {
            assert.ifError(error);

            params = {
                method: 'POST',
                uri: 'http://unix:/var/run/docker.sock:/networks/create',
                json: true,
                headers: {
                    Host: '127.0.0.1'
                },
                body: {
                    "Name": 'soajsnet',
                    "Driver": 'overlay',
                    "Internal": false,
                    "CheckDuplicate": false,
                    "EnableIPv6": false,
                    "IPAM": {
                        "Driver": 'default'
                    }
                }
            };

			request(params, function (error, response, body) {
				assert.ifError(error);
				done();
			});
		});
	});

	before("Perform cleanup of any previous services deployed", function (done) {
		console.log('Deleting previous deployments ...');
		shell.exec('docker service rm $(docker service ls -q) && docker rm -f $(docker ps -qa)');
		done();
	});

	after(function (done) {
		mongo.closeDb();
		done();
	});

	beforeEach(function (done) {
		setTimeout(function () {
			done();
		}, 700);
	});

	describe("testing controller deployment", function () {

        it("success - deploy 1 controller service and delete it afterwards", function (done) {
            var params = {
                qs: {
                    access_token: access_token
                },
                form: {
                    env: 'dev',
                    custom: {
                        type: 'service',
                        name: 'controller'
                    },
                    gitSource: {
                        owner: 'soajs',
                        repo: 'soajs.controller',
                        branch: 'develop',
                        commit: '67a61db0955803cddf94672b0192be28f47cf280'
                    },
                    recipe: '59034e43c69a1b962fc62213', // todo
                    deployConfig: {
                       
                        replication: {
                            mode: 'replicated',
                            replicas: 1
                        }
                    }
                }
            };
            executeMyRequest(params, "cloud/services/soajs/deploy", "post", function (body) {
                assert.ok(body.result);
                assert.ok(body.data);

                getService({env: 'dev', serviceName: 'controller'}, function (service) {
                    deleteService({
                        env: 'DEV',
                        id: service.id,
                        mode: service.labels['soajs.service.mode']
                    }, function (body) {
                        assert.ok(body.result);
                        assert.ok(body.data);
                        done();
                    });
                });
            });
        });

        it("success - deploy 1 controller and use the main file specified in src", function (done) {
            mongo.update("services", {name: 'controller'}, {'$set': {'src.main': '/index.js'}}, function (error) {
                assert.ifError(error);

                var params = {
                    qs: {
                        access_token: access_token
                    },
                    form: {
                        env: 'dev',
                        custom: {
                            type: 'service',
                            name: 'controller'
                        },
                        recipe: '59034e43c69a1b962fc62213', // todo
                        gitSource: {
                            owner: 'soajs',
                            repo: 'soajs.controller',
                            branch: 'develop',
                            commit: '67a61db0955803cddf94672b0192be28f47cf280'
                        },
                        deployConfig: {
                           
                            replication: {
                                mode: 'replicated',
                                replicas: 1
                            }
                        }
                    }
                };
                executeMyRequest(params, "cloud/services/soajs/deploy", "post", function (body) {
                    assert.ok(body.result);
                    assert.ok(body.data);

                    done();
                });
            });
        });

        it("success - deploy 1 nginx service with static content", function (done) {
            var params = {
                qs: {
                    access_token: access_token
                },
                "form": {
                    env: 'dev',
                    custom: {
                        type: 'nginx',
                        name: 'nginx'
                    },
                    recipe: '59034e43c69a1b962fc62212', // todo
                    deployConfig: {
                       
                        replication: {
                            mode: 'replicated',
                            replicas: 1
                        }
                    }
                }
            };

            executeMyRequest(params, "cloud/services/soajs/deploy", "post", function (body) {
                assert.ok(body.result);
                assert.ok(body.data);
                done();
            });
        });

	});

	describe("testing service deployment", function () {

        it("success - deploy 1 core service, global mode", function (done) {
            var params = {
                qs: {
                    access_token: access_token
                },
                "form": {
                    env: 'dev',
                    custom: {
                        type: 'service',
                        name: 'urac',
                        sourceCode: {
                            configuration: {
                                "repo": "soajsTestAccount/custom-configuration",
                                "branch": "master",
                                "commit": "e61063e026d4b904bf254b176d9f2c0034b62cbf",
                                "owner": "soajsTestAccount"
                            }
                        }
                    },
                    recipe: '59034e43c69a1b962fc62213',
                    gitSource: {
                        owner: 'soajs',
                        repo: 'soajs.urac',
                        branch: 'develop',
                        commit: '67a61db0955803cddf94672b0192be28f47cf280'
                    },
                    deployConfig: {
                        useLocalSOAJS: true,
                       
                        imagePrefix: 'soajsorg',
                        replication: {
                            mode: 'global'
                        }
                    }
                }
            };
            executeMyRequest(params, "cloud/services/soajs/deploy", "post", function (body) {

                assert.ok(body.result);
                assert.ok(body.data);

                getService({env: 'dev', serviceName: 'urac'}, function (service) {
                    deleteService({
                        env: 'DEV',
                        id: service.id,
                        mode: service.labels['soajs.service.mode']
                    }, function (body) {
                        assert.ok(body.result);
                        assert.ok(body.data);

                        done();
                    });
                });
            });
        });

        it("fail - trying to deploy to an environment that is configured to be deployed manually", function (done) {
            mongo.update('environment', {code: 'PROD'}, {$set: {'deployer.type': 'manual'}}, function (error) {
                assert.ifError(error);

                var params = {
                    qs: {
                        access_token: access_token
                    },
                    "form": {
                        env: 'prod',
                        custom: {
                            type: 'service',
                            name: 'controller',
                        },
                        recipe: '59034e43c69a1b962fc62213',
                        gitSource: {
                            owner: 'soajs',
                            repo: 'soajs.controller',
                            branch: 'develop',
                            commit: '67a61db0955803cddf94672b0192be28f47cf280'
                        },
                        deployConfig: {
                           
                            replication: {
                                mode: 'replicated',
                                replicas: 1
                            }
                        }
                    }
                };
                executeMyRequest(params, "cloud/services/soajs/deploy", "post", function (body) {
                    assert.ok(body.errors);
                    done();
                });
            });
        });

	});

	describe("testing daemon deployment", function () {
		
		before(function (done) {
			
			let record = {
				type : 'daemon',
				subtype : 'soajs'
			};
			
			mongo.update('catalogs', {name: 'daemonCatalog'}, {'$set': record}, function (error) {
				done();
			});
		});
		
		it("success - deploy 1 daemon", function (done) {
			var params = {
				qs: {
					access_token: access_token
				},
				"form": {
					env: 'dev',
					custom: {
						type: 'daemon',
						name: 'helloDaemon',
						daemonGroup: 'group1'
					},
					recipe: '59034e43c69a1b962fc62210',
					variables: [
						'TEST=true'
					],
					gitSource: {
						owner: 'soajs',
						repo: 'soajs.prx', //dummy value, does not need to be accurate
						branch: 'develop',
						commit: '67a61db0955803cddf94672b0192be28f47cf280'
					},
					deployConfig: {
						replication: {
							mode: 'replicated',
							replicas: 1
						}
					}
				}
			};
			executeMyRequest(params, "cloud/services/soajs/deploy", "post", function (body) {
				if (!(body.result) && (!body.data)){
					console.log(body)
				}
				assert.ok(body.result);
				assert.ok(body.data);

				setTimeout(function () {
					getService({env: 'dev', serviceName: 'helloDaemon-group1'}, function (service) {
						deleteService({
							env: 'DEV',
							id: service.id,
							mode: service.labels['soajs.service.mode']
						}, function (body) {
							assert.ok(body.result);
							assert.ok(body.data);
							setTimeout(function () {
								done();
							},1000);
						});
					});
				},2000);
            });
        });

        it("success - deploy 1 daemon that contians cmd info in its src", function (done) {
            var cmdArray = ['sleep 36000'];
            mongo.update('daemons', {name: 'helloDaemon'}, {'$set': {'src.cmd': cmdArray}}, function (error) {
                assert.ifError(error);

                var params = {
                    qs: {
                        access_token: access_token
                    },
                    "form": {
                        env: 'dev',
                        custom: {
                            type: 'daemon',
                            name: 'helloDaemon',
                            daemonGroup: 'group1'
                        },
                        recipe: '59034e43c69a1b962fc62210',
                        variables: [
                            'TEST=true'
                        ],
                        gitSource: {
                            owner: 'soajs',
                            repo: 'soajs.prx', //dummy value, does not need to be accurate
                            branch: 'develop',
                            commit: '67a61db0955803cddf94672b0192be28f47cf280'
                        },
                        deployConfig: {
                            replication: {
                                mode: 'replicated',
                                replicas: 1
                            }
                        }
                    }
                };
                executeMyRequest(params, "cloud/services/soajs/deploy", "post", function (body) {
                	if (!(body.result) && (!body.data)){
		                console.log(body)
	                }
                    assert.ok(body.result);
                    assert.ok(body.data);
                    getService({env: 'dev', serviceName: 'helloDaemon-group1'}, function (service) {
                        deleteService({
                            env: 'DEV',
                            id: service.id,
                            mode: service.labels['soajs.service.mode']
                        }, function (body) {
                            assert.ok(body.result);
                            assert.ok(body.data);

                            done();
                        });
                    });
                });
            });
        });

        it("fail - missing required params", function (done) {
            var params = {
                qs: {
                    access_token: access_token
                },
                "form": {
                    env: 'dev',
                    custom: {
                        type: 'daemon',
                        name: 'helloDaemon',
                        daemonGroup: 'group1'
                    },
                    recipe: '59034e43c69a1b962fc62210',
                    variables: [
                        'TEST=true'
                    ],
                    gitSource: {
                        owner: 'soajs',
                        repo: 'soajs.prx', //dummy value, does not need to be accurate
                        branch: 'develop',
                        commit: '67a61db0955803cddf94672b0192be28f47cf280'
                    }
                }
            };
            executeMyRequest(params, "cloud/services/soajs/deploy", "post", function (body) {
                assert.ok(body.errors);
                assert.deepEqual(body.errors.details[0], {
                    "code": 172,
                    "message": "Missing required field: deployConfig"
                });
                done();
            });
        });

	});

	describe("testing redeploy service", function () {
		var nginxDeployment, ctrlDeployment;
		before("list services and get static content record", function (done) {

            var params = {
                qs: {
                    access_token: access_token,
                    env: 'dev'
                }
            };

            executeMyRequest(params, "cloud/services/list", "get", function (body) {
                assert.ok(body.result);
                assert.ok(body.data);

                for (var i = 0; i < body.data.length; i++) {
                    if (body.data[i].labels['soajs.service.name'] === 'controller') {
                        ctrlDeployment = body.data[i];
                    }
                    else if (body.data[i].labels['soajs.service.name'] === 'nginx') {
                        nginxDeployment = body.data[i];
                    }
                }

                done();
            });
        });

        it("success - will redeploy controller service", function (done) {
            var params = {
                qs: {
                    access_token: access_token
                },
                form: {
                    env: 'dev',
                    serviceId: ctrlDeployment.id,
                    mode: ctrlDeployment.labels['soajs.service.mode'],
                    action: 'redeploy'
                }
            };

            executeMyRequest(params, "cloud/services/redeploy", "put", function (body) {
	            assert.ok(body.result);
                assert.ok(body.data);
                done();
            });
        });

        it("success - will rebuild service", function (done) {
            var params = {
                qs: {
                    access_token: access_token
                },
                form: {
                    env: 'dev',
                    serviceId: ctrlDeployment.id,
                    mode: ctrlDeployment.labels['soajs.service.mode'],
                    action: 'rebuild'
                }
            };

            executeMyRequest(params, "cloud/services/redeploy", "put", function (body) {
                assert.ok(body);
                done();
            });
        });

        it("success - will redeploy nginx", function (done) {
            var params = {
                qs: {
                    access_token: access_token
                },
                form: {
                    env: 'dev',
                    serviceId: nginxDeployment.id,
                    mode: nginxDeployment.labels['soajs.service.mode'],
                    action: 'redeploy'
                }
            };


            executeMyRequest(params, "cloud/services/redeploy", "put", function (body) {
                assert.ok(body.result);
                assert.ok(body.data);
                done();
            });
        });

	});

	describe("delete deployed services", function () {
		it("fail - missing required params", function (done) {
			deleteService({ env: 'DEV' }, function (body) {
				assert.ok(body.errors);
				assert.deepEqual(body.errors.details[0], {
					"code": 172,
					"message": "Missing required field: serviceId"
				});
				done();
			});
		});

		it("fail - service not found", function (done) {
			deleteService({ env: 'DEV', id: '123123123', mode: 'replicated' }, function (body) {
				assert.ok(body);
				done();
			});
		});
	});

	describe("testing get service logs", function () {
		it("success - getting service logs", function (done) {
			var params = {
				qs: {
					access_token: access_token,
					env: 'dev'
				}
			};
			executeMyRequest(params, "cloud/services/list", "get", function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				//only one service exist
				var taskId;
				for (var i = 0; i < body.data.length; i++) {
					if (body.data[i].labels['soajs.service.name'] === 'nginx') {
						taskId = ((body.data[i].tasks[0]) ? body.data[i].tasks[0].id : '');
					}
				}

                params = {
                    "qs": {
                        access_token: access_token,
                        "env": "dev",
                        "taskId": taskId,
                        "serviceId": ""
                    }
                };
                executeMyRequest(params, "cloud/services/instances/logs", "get", function (body) {
                    // assert.ok(body.result);
                    // assert.ok(body.data);
                    done();
                });
            });
        });

        after("delete nginx service", function (done) {
            getService({env: 'dev', serviceName: 'nginx'}, function (service) {
                deleteService({
                    env: 'DEV',
                    id: service.id,
                    mode: service.labels['soajs.service.mode']
                }, function (body) {
                    assert.ok(body.result);
                    assert.ok(body.data);

					done();
				});
			});
		});
	});

	describe("testing autoscale deployed services", function() {
		//functionality is tested in unit tests
		//autoscaling is only for kubernetes deployments, dashboard test cases do not run kubernetes

        it("set autoscaler", function (done) {
            var params = {
                qs: {
                    env: 'dashboard'
                },
                form: {
                    action: 'update',
                    autoscaler: {
                        replicas: {
                            min: 1,
                            max: 2
                        },
                        metrics: {
                            cpu: {
                                percent: 90
                            }
                        }
                    },
                    services: [
                        {id: 'srv1', type: 'deployment'}
                    ]
                }
            };

            executeMyRequest(params, "cloud/services/autoscale", "put", function (body) {
                done();
            });
        });

        it("update environment autoscaling", function (done) {
            var params = {
                qs: {
                    env: 'dashboard'
                },
                form: {
                    action: 'update',
                    autoscale: {
                        replicas: {
                            min: 1,
                            max: 2
                        },
                        metrics: {
                            cpu: {
                                percent: 90
                            }
                        }
                    }
                }
            };

            executeMyRequest(params, "cloud/services/autoscale/config", "put", function (body) {
                done();
            });
        });

        it("fail - check resource", function (done) {
            var params = {
                qs: {
                    env: 'dev',
                    resource: 'heapster',
                    namespace: 'kube-system'
                }
            };

            executeMyRequest(params, "cloud/resource", "get", function (body) {
                assert.ok(body);
                done();
            });
        });

        it("fail - scale service", function (done) {
            var params = {
                // qs: {
                // 	env: 'dev',
                // 	resource: 'heapster',
                // 	namespace: 'kube-system',
                // 	scale: 2
                // }
                form: {
                    env: 'dev',
                    serviceId: 'heapster',
                    scale: 2
                }
            };

            executeMyRequest(params, "cloud/services/scale", "put", function (body) {
                assert.ok(body);
                done();
            });
        });

	});

	describe.skip("metrics tests", function () { // todo:

        describe("get service metrics", function () {
            it("success - get service metrics", function (done) {
                var params = {
                    qs: {
                        "env": "DEV"
                    }
                };
                executeMyRequest(params, 'cloud/metrics/services', 'get', function (body) {
                    assert.ok(body.data);
                    done();
                });
            });
        });
        describe("fail - get node metrics", function () {
            it("success - get nodes metrics nodes", function (done) {
                var params = {
                    qs: {
                        "env": "DEV"
                    }
                };
                executeMyRequest(params, 'cloud/metrics/nodes', 'get', function (body) {
                    assert.ok(body);
                    done();
                });
            });
        });

	});

	describe("testing plugin deployment", function () {

        it("fail - deploying heapster", function (done) {
            var params = {
                form: {
                    env: 'dev',
                    plugin: "heapster"
                }
            };
            executeMyRequest(params, "cloud/plugins/deploy", "post", function (body) {
                assert.ok(body);
                done();
            });
        });

	});

	describe("testing service maintence deployment", function () {

        it("fail - deploying heapster", function (done) {
            var params = {
                form: {
                    env: 'dev',
                    serviceId: "heapster",
                    serviceName: "heapster",
                    type: "type",
                    operation: "heartbeat"
                }
            };
            executeMyRequest(params, "cloud/services/maintenance", "post", function (body) {
                assert.ok(body);
                done();
            });
        });

	});

	describe("testing namespace list services ", function () {

        it("fail - list namespaces", function (done) {
            var params = {
                qs: {
                    env: 'dev'
                }
            };
            executeMyRequest(params, "cloud/namespaces/list", "get", function (body) {
                assert.ok(body);
                done();
            });
        });

        it("fail - delete namespaces", function (done) {
            var params = {
                qs: {
                    env: 'dev',
                    namespaceId: "soajs"
                }
            };
            executeMyRequest(params, "cloud/namespaces/delete", "delete", function (body) {
                assert.ok(body);
                done();
            });
        });

	});
});
