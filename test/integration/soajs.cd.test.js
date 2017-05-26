"use strict";
var assert = require('assert');
var request = require("request");
var shell = require("shelljs");
var helper = require("../helper.js");

var Mongo = require("soajs.core.modules").mongo;
var dbConfig = require("./db.config.test.js");
var dashboardConfig = dbConfig();
dashboardConfig.name = "core_provision";
var mongo = new Mongo(dashboardConfig);

var extKey = 'aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac';
var access_token;

function executeMyRequest (params, apiPath, method, cb) {
	requester(apiPath, method, params, function (error, body) {
		assert.ifError(error);
		assert.ok(body);
		return cb(body);
	});
	
	function requester (apiName, method, params, cb) {
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
					options.headers[ h ] = params.headers[ h ];
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
		request[ method ](options, function (error, response, body) {
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

function getService (options, cb) {
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
			if (services[ i ].labels[ 'soajs.service.name' ] === options.serviceName) {
				service = services[ i ];
				break;
			}
		}
		
		return cb(service);
	});
}

function deleteService (options, cb) {
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
		console.log("* Setting CD functionality");
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
				}, { multi: true }, function (error) {
					assert.ifError(error);
					done();
				});
			});
		});
		
	});
	
	before("Perform cleanup of any previous services deployed", function (done) {
		console.log('Deleting previous deployments ...');
		shell.exec('docker service rm $(docker service ls -q) && docker rm -f $(docker ps -qa)');
		setTimeout(function(){
			done();
		}, 1500);
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
				"AdvertiseAddr": "127.0.0.1:2377",
				"ForceNewCluster": true
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
	
	after(function (done) {
		mongo.closeDb();
		done();
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
						memoryLimit: 209715200,
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
		
		it("configuring cd for this env", function(done){
			done();
		});
		
		it("mimic call for cd/deploy of urac in dev", function(done){
			done();
		});
		
		it("get ledger", function(done){
			done();
		});
		
		it("get updates", function(done){
			done();
		});
		
		
		it.skip("clean up service", function(done){
			getService({ env: 'dev', serviceName: 'controller' }, function (service) {
				deleteService({
					env: 'DEV',
					id: service.id,
					mode: service.labels[ 'soajs.service.mode' ]
				}, function (body) {
					assert.ok(body.result);
					assert.ok(body.data);
					done();
				});
			});
		});
		
	});
});
