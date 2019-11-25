"use strict";

const assert = require('assert');
const request = require("request");
const util = require("soajs.core.libs").utils;
const helper = require("../helper.js");
let dashboard;

const config = helper.requireModule('./config');
const errorCodes = config.errors;

const Mongo = require("soajs.core.modules").mongo;
const dbConfig = require("./db.config.test.js");

let dashboardConfig = dbConfig();
dashboardConfig.name = "demo_core_provision";
const mongo = new Mongo(dashboardConfig);

const extKey = 'aa39b5490c4a4ed0e56d7ec1232a428f7ad78ebb7347db3fc9875cb10c2bce39bbf8aabacf9e00420afb580b15698c04ce10d659d1972ebc53e76b6bbae0c113bee1e23062800bc830e4c329ca913fefebd1f1222295cf2eb5486224044b4d0c';
let qaEnvRecord;

function executeMyRequest(params, apiPath, method, cb) {
	requester(apiPath, method, params, function (error, body) {
		assert.ifError(error);
		assert.ok(body);
		return cb(body);
	});
	
	function requester(apiName, method, params, cb) {
		let options = {
			uri: 'http://localhost:4000/dashboard/' + apiName,
			headers: {
				'Content-Type': 'application/json',
				key: extKey
			},
			json: true
		};
		
		if (params.headers) {
			for (let h in params.headers) {
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

describe("DASHBOARD Saas Integration Tests:", function () {
	let envId;
	let qaID;
	before(function (done) {
		process.env.SOAJS_SAAS = "true";
		done();
	});
	
	after(function (done) {
		delete process.env.SOAJS_SAAS;
		mongo.closeDb();
		done();
	});
	
	describe("environment tests", function () {
		let validEnvRecord = {
			"code": "DEV",
			"domain": "api.myDomain.com",
			"apiPrefix": "api",
			"sitePrefix": "site",
			"sensitive": true,
			"profile": "single",
			"deployer": {
				"type": "manual",
				"selected": "manual",
				"container": {
					"docker": {
						"local": {
							"socketPath": "/var/run/docker.sock"
						},
						"remote": {
							"nodes": []
						}
					},
					"kubernetes": {
						"local": {},
						"remote": {
							"nodes": []
						}
					}
				}
			},
			"description": 'this is a dummy description',
			"dbs": {
				"clusters": {
					"cluster1": {
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
						"cluster": "cluster1",
						"name": "core_session",
						"store": {},
						"collection": "sessions",
						"stringify": false,
						"expireAfter": 1209600000
					}
				},
				"databases": {
					"urac": {
						"cluster": "cluster1",
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
						"cacheTTL": 36000,
						"healthCheckInterval": 5000,
						"autoRelaodRegistry": 300000,
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
						"accessTokenLifetime": 36000,
						"refreshTokenLifetime": 36000,
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
						"proxy": 'undefined',
						"rolling": false,
						"unset": 'keep',
						"cookie": {
							"path": "/",
							"httpOnly": true,
							"secure": false,
							"domain": "soajs.com",
							"maxAge": null
						},
						"resave": false,
						"saveUninitialized": false
					}
				}
			}
		};
		qaEnvRecord = {
			"code": "QA",
			"description": "this is the QA environment",
			"domain": "api.QA.com",
			"deployer": {
				"type": "container",
				"selected": "container.kubernetes.local",
				"container": {
					"docker": {
						"local": {
							"socketPath": "/var/run/docker.sock"
						},
						"remote": {
							"nodes": []
						}
					},
					"kubernetes": {
						"local": {},
						"remote": {
							"nodes": []
						}
					}
				}
			},
			"dbs": {
				"clusters": {
					"cluster1": {
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
						"cluster": "cluster1",
						"name": "core_session",
						"store": {},
						"collection": "sessions",
						"stringify": false,
						"expireAfter": 1209600000
					}
				},
				"databases": {
					"urac": {
						"cluster": "cluster1",
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
						"healthCheckInterval": 500,
						"autoRelaodRegistry": 300000,
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
						"src": true,
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
						"accessTokenLifetime": 7200,
						"refreshTokenLifetime": 1209600,
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
						"rolling": false,
						"unset": "keep",
						"cookie": {
							"path": "/",
							"httpOnly": true,
							"secure": false,
							"domain": "soajs.com",
							"maxAge": null
						},
						"resave": false,
						"saveUninitialized": false
					}
				}
			}
		};
		before(function (done) {
			mongo.remove('environment', {}, function (error) {
				assert.ifError(error);
				
				mongo.insert('environment', validEnvRecord, function (error) {
					assert.ifError(error);
					mongo.insert('environment', qaEnvRecord, function (error) {
						assert.ifError(error);
						done();
					});
				});
			});
		});
		
		describe("add environment tests", function () {
			it("success - will add TEST environment - SaaS", function (done) {
				let data2 = util.cloneObj(validEnvRecord);
				data2.code = 'TEST';
				data2.services.config.session.proxy = "true";
				data2.templateId = "5acf46c4af4cd3a45f21e2ea";
				delete data2.profile;
				delete data2.deployer;
				delete data2.dbs;
				delete data2.services;
				delete data2._id;
				let params = {
					form: {
						template: {
							gi: {
								code: "TEST",
								deploy: {}
							},
							nginx: {
								http: 30080,
								https: 30443
							},
							deploy: {
								// selectedDriver: 'docker'
							}
						},
						data: data2
					},
					qs: {
						"soajs_project": "demo"
					}
				};
				executeMyRequest(params, 'environment/add', 'post', function (body) {
					done();
				});
			});
			
			it('mongo test', function (done) {
				mongo.findOne('environment', {'code': 'DEV'}, function (error, envRecord) {
					assert.ifError(error);
					envId = envRecord._id.toString();
					delete envRecord._id;
					delete envRecord.profile;
					
					let tester = util.cloneObj(validEnvRecord);
					delete tester.profile;
					delete tester._id;
					assert.deepEqual(envRecord, tester);
					mongo.findOne('environment', {'code': 'QA'}, function (error, qaRecord) {
						assert.ifError(error);
						qaID = qaRecord._id.toString();
						delete qaRecord._id;
						delete qaRecord.profile;
						assert.ok(qaRecord);
						done();
					});
				});
			});
		});
		
	});
	
});
