"use strict";
var assert = require('assert');
var request = require("request");
var util = require("soajs.core.libs").utils;
var helper = require("../helper.js");
var dashboard;

var config = helper.requireModule('./config');
var errorCodes = config.errors;

var Mongo = require("soajs.core.modules").mongo;
var dbConfig = require("./db.config.test.js");

var dashboardConfig = dbConfig();
dashboardConfig.name = "core_provision";
var mongo = new Mongo(dashboardConfig);

var uracConfig = dbConfig();
uracConfig.name = 'test_urac';
var uracMongo = new Mongo(uracConfig);

var AuthValue;
var extKey = 'aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac';
// /tenant/application/acl/get
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
				'Content-Type': 'application/json',
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

		request[method](options, function (error, response, body) {
			assert.ifError(error);
			assert.ok(body);
			return cb(null, body);
		});
	}
}

describe("DASHBOARD UNIT Tests:", function () {
	var expDateValue = new Date().toISOString();
	var envId;

	after(function (done) {
		mongo.closeDb();
		done();
	});

	it("get Main Auhtorization token", function (done) {
		var options = {
			uri: 'http://localhost:4000/oauth/authorization',
			headers: {
				'Content-Type': 'application/json',
				'key': extKey
			},
			json: true
		};

		request.get(options, function (error, response, body) {
			assert.ifError(error);
			assert.ok(body);
			assert.ok(body.data);
			AuthValue = body.data;
			done();
		});
	});

	describe("environment tests", function () {
		var validEnvRecord = {
			"code": "DEV",
			"domain": "api.myDomain.com",
			"apiPrefix": "api",
			"sitePrefix": "site",
			"profile": "single",
			"deployer": {
				"type": "manual",
				"selected": "container.docker.local",
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

		var validCluster = {
			"URLParam": {
				"connectTimeoutMS": 0,
				"socketTimeoutMS": 0,
				"maxPoolSize": 5,
				"wtimeoutMS": 0,
				"slaveOk": true
			},
			"servers": [
				{
					"host": "127.0.0.1",
					"port": 27017
				}
			],
			"extraParam": {
				"db": {
					"native_parser": true
				},
				"server": {
					"auto_reconnect": true
				}
			}
		};

		before(function (done) {
			mongo.remove('environment', {}, function (error) {
				assert.ifError(error);

				mongo.insert('environment', validEnvRecord, function (error) {
					assert.ifError(error);

					done();
				});
			});
		});

		describe("add environment tests", function () {
			it("success - will add environment", function (done) {
				var data2 = util.cloneObj(validEnvRecord);
				data2.code = 'STG';
				data2.services.config.session.proxy = "true";
				var params = {
					form: data2
				};
				executeMyRequest(params, 'environment/add', 'post', function (body) {
					assert.ok(body.data);
					done();
				});
			});
			
			it("success - will add environment", function (done) {
				var data2 = util.cloneObj(validEnvRecord);
				data2.code = 'PROD';
				data2.services.config.session.proxy = "false";
				var params = {
					form: data2
				};
				executeMyRequest(params, 'environment/add', 'post', function (body) {
					assert.ok(body.data);
					done();
				});
			});
			
			it('fail - missing params', function (done) {
				var params = {
					form: {
						"code": "DEV",
						"description": 'this is a dummy description'
					}
				};
				executeMyRequest(params, 'environment/add', 'post', function (body) {
					assert.deepEqual(body.errors.details[0], {
						"code": 172,
						"message": "Missing required field: domain, services"
					});
					done();
				});
			});
			
			it('fail - environment exists', function (done) {
				var params = {
					form: validEnvRecord
				};
				executeMyRequest(params, 'environment/add', 'post', function (body) {
					assert.deepEqual(body.errors.details[0], {"code": 403, "message": errorCodes[403]});
					
					done();
				});
			});
			
			it('mongo test', function (done) {
				mongo.findOne('environment', {'code': 'DEV'}, function (error, envRecord) {
					assert.ifError(error);
					envId = envRecord._id.toString();
					delete envRecord._id;
					delete envRecord.profile;
					
					var tester = util.cloneObj(validEnvRecord);
					delete tester.profile;
					delete tester._id;
					assert.deepEqual(envRecord, tester);
					done();
				});
			});
		});
		
		describe("update environment tests", function () {
			it("success - will update environment", function (done) {
				var data2 = util.cloneObj(validEnvRecord);
				data2.services.config.session.proxy = "true";
				var params = {
					qs: {"id": envId},
					form: {
						"domain": "api.myDomain.com",
						"profile": data2.profile,
						"port": data2.port,
						"description": 'this is a dummy updated description',
						"services": data2.services
					}
				};
				executeMyRequest(params, 'environment/update', 'put', function (body) {
					assert.ok(body.data);
					done();
				});
			});
			
			it("success - will update environment", function (done) {
				var data2 = util.cloneObj(validEnvRecord);
				data2.services.config.session.proxy = "false";
				var params = {
					qs: {"id": envId},
					form: {
						"domain": "api.myDomain.com",
						"profile": data2.profile,
						"port": data2.port,
						"description": 'this is a dummy updated description',
						"services": data2.services
					}
				};
				executeMyRequest(params, 'environment/update', 'put', function (body) {
					assert.ok(body.data);
					done();
				});
			});
			
			it("success - will update environment", function (done) {
				var params = {
					qs: {"id": envId},
					form: {
						"domain": "api.myDomain.com",
						"profile": validEnvRecord.profile,
						"description": 'this is a dummy updated description',
						"services": validEnvRecord.services
					}
				};
				executeMyRequest(params, 'environment/update', 'put', function (body) {
					assert.ok(body.data);
					done();
				});

			});
			
			it('fail - missing params', function (done) {
				var params = {
					qs: {"id": envId},
					form: {
						"description": 'this is a dummy description'
					}
				};
				executeMyRequest(params, 'environment/update', 'put', function (body) {
					assert.deepEqual(body.errors.details[0], {
						"code": 172,
						"message": "Missing required field: domain, services"
					});
					done();
				});
			});
			
			it('fail - invalid environment id provided', function (done) {
				var params = {
					qs: {"id": "aaaabbbbccc"},
					form: {
						"domain": validEnvRecord.profile,
						"profile": validEnvRecord.profile,
						"description": 'this is a dummy description',
						"services": validEnvRecord.services
					}
				};
				executeMyRequest(params, 'environment/update', 'put', function (body) {
					assert.deepEqual(body.errors.details[0], {"code": 405, "message": errorCodes[405]});
					done();
				});
			});
			
			it('mongo test', function (done) {
				mongo.findOne('environment', {'code': 'DEV'}, function (error, envRecord) {
					assert.ifError(error);
					envId = envRecord._id.toString();
					delete envRecord._id;
					delete envRecord.profile;
					var tester = util.cloneObj(validEnvRecord);
					tester.dbs = {clusters: {}, config: {}, databases: {}};
					tester.description = "this is a dummy updated description";
					delete tester.services.config.session.proxy;
					delete tester.profile;
					assert.deepEqual(envRecord.services, tester.services);
					done();
				});
				
			});
		});
		
		describe("delete environment tests", function () {
			it('fail - missing params', function (done) {
				var params = {
					qs: {}
				};
				executeMyRequest(params, 'environment/delete', 'delete', function (body) {
					assert.deepEqual(body.errors.details[0], {"code": 172, "message": "Missing required field: id"});
					done();
				});
			});
			
			it('fail - invalid environment id provided', function (done) {
				var params = {
					qs: {'id': 'aaaabbcdddd'}
				};
				executeMyRequest(params, 'environment/delete', 'delete', function (body) {
					assert.deepEqual(body.errors.details[0], {"code": 405, "message": errorCodes[405]});
					done();
				});
			});
			
			it("fail - cannot delete environment that has running hosts", function (done) {
				var params = {
					qs: {'id': envId}
				};
				executeMyRequest(params, 'environment/delete', 'delete', function (body) {
					assert.ok(body.errors);
					assert.deepEqual(body.errors.details[0], {"code": 906, "message": errorCodes[906]});
					done();
				});
			});
			
			it("success - will delete environment", function (done) {
				mongo.findOne('environment', {code: 'STG'}, function (error, stgRecord) {
					assert.ifError(error);
					assert.ok(stgRecord);
					
					var params = {
						qs: {'id': stgRecord._id.toString()}
					};
					executeMyRequest(params, 'environment/delete', 'delete', function (body) {
						assert.ok(body.data);
						done();
					});
				});
			});

			it('mongo test', function (done) {
				mongo.find('environment', {}, {}, function (error, records) {
					assert.ifError(error);
					assert.ok(records);
					assert.equal(records.length, 2);
					done();
				});
			});
		});
		
		describe("list environment tests", function () {
			it("success - will get empty list", function (done) {
				executeMyRequest({}, 'environment/list', 'get', function (body) {
					assert.ok(body.data);
					assert.equal(body.data.length, 2);
					done();
				});
			});
			it("success - will manually add environment", function (done) {
				delete validEnvRecord._id;
				validEnvRecord.code = 'STG';
				mongo.insert('environment', validEnvRecord, function (error) {
					assert.ifError(error);
					done();
				});
			});
			it("success - will list environment", function (done) {
				executeMyRequest({}, 'environment/list', 'get', function (body) {
					assert.ok(body.data);
					assert.equal(body.data.length, 3);
					
					body.data.forEach(function (oneEnv) {
						if (oneEnv.code === 'STG') {
							delete oneEnv._id;
							delete oneEnv.profile;
							var tester = util.cloneObj(validEnvRecord);
							// tester.dbs = {clusters: {}, config: {}, databases: {}};
							// delete tester.services.config.session.proxy;
							delete tester.profile;
							delete tester._id;
							assert.deepEqual(oneEnv, tester);
						}
					});
					done();
				});
			});
		});

		describe("environment clusters", function () {
			describe("add environment clusters", function () {
				it("success - will add new cluster", function (done) {
					var params = {
						qs: {
							env: "dev",
							"name": "cluster2"
						},
						form: {
							'cluster': validCluster
						}
					};
					executeMyRequest(params, 'environment/clusters/add', 'post', function (body) {
						assert.ok(body.data);
						done();
					});
				});

				it('fail - missing parameters', function (done) {
					var params = {
						qs: {
							'env': 'dev',
							'name': 'cluster2'
						},
						form: {
							//"cluster": {}
						}
					};
					executeMyRequest(params, 'environment/clusters/add', 'post', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 172,
							"message": "Missing required field: cluster"
						});

						done();
					});
				});

				it('fail - cluster exists', function (done) {
					var params = {
						qs: {
							env: "dev",
							"name": "cluster1"
						},
						form: {
							'cluster': validCluster
						}
					};
					executeMyRequest(params, 'environment/clusters/add', 'post', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 504,
							"message": "Environment cluster already exists"
						});
						done();
					});
				});

				it('mongo - testing db', function (done) {
					mongo.findOne('environment', {'code': 'DEV'}, function (error, envRecord) {
						assert.ifError(error);
						assert.deepEqual(envRecord.dbs.clusters['cluster2'], validCluster);
						done();
					});
				});
			});

			describe("update environment clusters", function () {
				it("success - will update cluster", function (done) {
					var params = {
						qs: {
							env: "dev",
							"name": "cluster1"
						},
						form: {
							'cluster': validCluster
						}
					};
					executeMyRequest(params, 'environment/clusters/update', 'put', function (body) {
						assert.ok(body.data);
						done();
					});
				});

				it('fail - missing parameters', function (done) {
					var params = {
						qs: {
							'env': 'dev',
							'name': 'cluster1'
						},
						form: {
							//"cluster": {}
						}
					};
					executeMyRequest(params, 'environment/clusters/update', 'put', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 172,
							"message": "Missing required field: cluster"
						});

						done();
					});
				});

				it('fail - cluster does not exists', function (done) {
					var params = {
						qs: {
							env: "dev",
							"name": "cluster3"
						},
						form: {
							'cluster': validCluster
						}
					};
					executeMyRequest(params, 'environment/clusters/update', 'put', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 502,
							"message": "Invalid cluster name provided"
						});
						done();
					});
				});

				it('mongo - testing db', function (done) {
					mongo.findOne('environment', {'code': 'DEV'}, function (error, envRecord) {
						assert.ifError(error);
						assert.deepEqual(envRecord.dbs.clusters['cluster1'], validCluster);
						done();
					});
				});
			});

			describe("delete environment clusters", function () {
				it('fail - missing params', function (done) {
					var params = {
						qs: {
							'env': 'dev'
						}
					};
					executeMyRequest(params, 'environment/clusters/delete', 'delete', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 172,
							"message": "Missing required field: name"
						});
						done();
					});
				});

				it('fail - invalid environment id provided', function (done) {
					var params = {
						qs: {
							'env': 'dev',
							'name': 'invalid'
						}
					};
					executeMyRequest(params, 'environment/clusters/delete', 'delete', function (body) {
						assert.deepEqual(body.errors.details[0], {"code": 508, "message": errorCodes[508]});
						done();
					});
				});

				it("success - will delete environment", function (done) {
					var params = {
						qs: {
							'env': 'dev',
							'name': 'cluster1'
						}
					};
					executeMyRequest(params, 'environment/clusters/delete', 'delete', function (body) {
						assert.ok(body.data);
						done();
					});
				});
			});

			describe("list environment clusters", function () {
				it('success - returns one cluster', function (done) {
					var params = {
						qs: {'env': 'dev'}
					};
					executeMyRequest(params, 'environment/clusters/list', 'get', function (body) {
						assert.ok(body.data);
						assert.equal(Object.keys(body.data).length, 1);
						done();
					});
				});

				it('success - adds new cluster', function (done) {
					var params = {
						qs: {
							env: "dev",
							"name": "cluster1"
						},
						form: {
							'cluster': validCluster
						}
					};
					executeMyRequest(params, 'environment/clusters/add', 'post', function (body) {
						assert.ok(body.data);
						done();
					});
				});

				it('success - returns two entries in the list', function (done) {
					var params = {
						qs: {'env': 'dev'}
					};
					executeMyRequest(params, 'environment/clusters/list', 'get', function (body) {
						assert.ok(body.data);
						assert.equal(Object.keys(body.data).length, 2);
						done();
					});
				});
			});
		});

		describe("environment db", function () {

			describe("add environment db", function () {
				it("success - will add a db", function (done) {
					var params = {
						qs: {
							env: "dev"
						},
						form: {
							'name': 'urac_2',
							'tenantSpecific': true,
							'cluster': 'cluster1'
						}
					};
					executeMyRequest(params, 'environment/dbs/add', 'post', function (body) {
						assert.ok(body.data);
						done();
					});
				});

				it('success - will add session db', function (done) {
					var params = {
						qs: {
							env: "dev"
						},
						form: {
							'name': 'session_test',
							'cluster': 'cluster1',
							'sessionInfo': {
								"cluster": "cluster1",
								"dbName": "core_session",
								'store': {},
								"collection": "sessions",
								'stringify': false,
								'expireAfter': 1000 * 60 * 60 * 24 * 14 // 2 weeks
							}
						}
					};
					executeMyRequest(params, 'environment/dbs/add', 'post', function (body) {
						assert.ok(body.data);
						done();
					});
				});

				it("success - wil add a db and set tenantSpecific to false by default", function (done) {
					var params = {
						qs: {
							env: "dev"
						},
						form: {
							'name': 'testDb',
							'cluster': 'cluster1'
						}
					};
					executeMyRequest(params, 'environment/dbs/add', 'post', function (body) {
						assert.ok(body.data);

						mongo.findOne("environment", {'code': 'DEV'}, function (error, envRecord) {
							assert.ifError(error);
							assert.ok(envRecord);
							assert.ok(envRecord.dbs.databases['testDb']);
							assert.equal(envRecord.dbs.databases['testDb'].tenantSpecific, false);

							//clean db record, remove testDb
							delete envRecord.dbs.databases['testDb'];
							mongo.save("environment", envRecord, function (error, result) {
								assert.ifError(error);
								assert.ok(result);
								done();
							});
						});
					});
				});

				it('fail - missing params', function (done) {
					var params = {
						qs: {
							env: "dev"
						},
						form: {
							'cluster': 'cluster1'
						}
					};
					executeMyRequest(params, 'environment/dbs/add', 'post', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 172,
							"message": "Missing required field: name"
						});
						done();
					});
				});

				it('fail - invalid cluster provided', function (done) {
					var params = {
						qs: {
							env: "dev"
						},
						form: {
							'name': 'urac',
							'tenantSpecific': true,
							'cluster': 'invalid'
						}
					};
					executeMyRequest(params, 'environment/dbs/add', 'post', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 502,
							"message": "Invalid cluster name provided"
						});
						done();
					});
				});

				it('fail - invalid session params', function (done) {
					var params = {
						qs: {
							env: "dev"
						},
						form: {
							'name': 'session',
							'cluster': 'cluster1'
						}
					};
					executeMyRequest(params, 'environment/dbs/add', 'post', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 507,
							"message": "Invalid db Information provided for session database"
						});
						done();
					});
				});

				it('fail - database already exist', function (done) {
					var params = {
						qs: {
							env: "dev"
						},
						form: {
							'name': 'urac',
							'tenantSpecific': true,
							'cluster': 'cluster1'
						}
					};
					executeMyRequest(params, 'environment/dbs/add', 'post', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 509,
							"message": "environment database already exist"
						});
						done();
					});
				});

				it('fail - session already exist', function (done) {
					var params = {
						qs: {
							env: "dev"
						},
						form: {
							'name': 'session',
							'cluster': 'cluster1',
							'sessionInfo': {
								"cluster": "cluster1",
								"dbName": "core_session",
								'store': {},
								"collection": "sessions",
								'stringify': false,
								'expireAfter': 1000 * 60 * 60 * 24 * 14 // 2 weeks
							}
						}
					};
					executeMyRequest(params, 'environment/dbs/add', 'post', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 510,
							"message": "environment session database already exist"
						});
						done();
					});
				});

				it('mongo - testing database content', function (done) {
					mongo.find('environment', {'code': 'DEV'}, {}, function (error, records) {
						assert.ifError(error);
						assert.ok(records);
						assert.ok(records[0].dbs.databases.urac);
						assert.ok(records[0].dbs.config.session);
						done();
					});
				});
			});

			describe("update environment db", function () {
				it("success - will update a db and set tenantSpecific to false by default", function (done) {
					var params = {
						qs: {
							env: "dev"
						},
						form: {
							'name': 'urac',
							'cluster': 'cluster1'
						}
					};
					executeMyRequest(params, 'environment/dbs/update', 'put', function (body) {
						assert.ok(body.data);
						done();
					});
				});

				it("success - will update a db", function (done) {
					var params = {
						qs: {
							env: "dev"
						},
						form: {
							'name': 'urac',
							'tenantSpecific': true,
							'cluster': 'cluster1'
						}
					};
					executeMyRequest(params, 'environment/dbs/update', 'put', function (body) {
						assert.ok(body.data);
						done();
					});
				});

				it('success - will update session db', function (done) {
					var params = {
						qs: {
							env: "dev"
						},
						form: {
							'name': 'session',
							'cluster': 'cluster1',
							'sessionInfo': {
								"cluster": "cluster1",
								"dbName": "core_session",
								'store': {},
								"collection": "sessions",
								'stringify': false,
								'expireAfter': 1000 * 60 * 60 * 24 * 14 // 2 weeks
							}
						}
					};
					executeMyRequest(params, 'environment/dbs/update', 'put', function (body) {
						assert.ok(body.data);
						done();
					});
				});

				it('fail - missing params', function (done) {
					var params = {
						qs: {
							env: "dev"
						},
						form: {
							'cluster': 'cluster1'
						}
					};
					executeMyRequest(params, 'environment/dbs/update', 'put', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 172,
							"message": "Missing required field: name"
						});
						done();
					});
				});

				it('fail - invalid cluster provided', function (done) {
					var params = {
						qs: {
							env: "dev"
						},
						form: {
							'name': 'urac',
							'tenantSpecific': true,
							'cluster': 'invalid'
						}
					};
					executeMyRequest(params, 'environment/dbs/update', 'put', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 502,
							"message": "Invalid cluster name provided"
						});
						done();
					});
				});

				it('fail - invalid session params', function (done) {
					var params = {
						qs: {
							env: "dev"
						},
						form: {
							'name': 'session',
							'cluster': 'cluster1'
						}
					};
					executeMyRequest(params, 'environment/dbs/update', 'put', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 507,
							"message": "Invalid db Information provided for session database"
						});
						done();
					});
				});

				it('fail - database does not exist', function (done) {
					var params = {
						qs: {
							env: "dev"
						},
						form: {
							'name': 'invalid',
							'tenantSpecific': true,
							'cluster': 'cluster1'
						}
					};
					executeMyRequest(params, 'environment/dbs/update', 'put', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 512,
							"message": "environment database does not exist"
						});
						done();
					});
				});

				it('fail - session does not exist', function (done) {
					var params = {
						qs: {
							env: "dev"
						},
						form: {
							'name': 'session',
							'cluster': 'cluster1',
							'sessionInfo': {
								"cluster": "cluster1",
								"dbName": "core_session",
								'store': {},
								"collection": "sessions",
								'stringify': false,
								'expireAfter': 1000 * 60 * 60 * 24 * 14 // 2 weeks
							}
						}
					};
					var tmp = {};
					mongo.findOne('environment', {'code': 'DEV'}, function (error, record) {
						assert.ifError(error);
						tmp = util.cloneObj(record.dbs.config.session);
						delete record.dbs.config.session;

						mongo.save('environment', record, function (error) {
							assert.ifError(error);
							executeMyRequest(params, 'environment/dbs/update', 'put', function (body) {
								assert.deepEqual(body.errors.details[0], {
									"code": 511,
									"message": "environment session database does not exist"
								});

								record.dbs.config.session = tmp;
								mongo.save('environment', record, function (error) {
									assert.ifError(error);
									done();
								});
							});
						});
					});
				});

				it('mongo - testing database content', function (done) {
					mongo.find('environment', {'code': 'DEV'}, {}, function (error, records) {
						assert.ifError(error);
						assert.ok(records);
						assert.ok(records[0].dbs.databases.urac);
						assert.ok(records[0].dbs.config.session);
						done();
					});
				});
			});

			describe("delete environment db", function () {
				it('fail - missing params', function (done) {
					var params = {
						qs: {
							env: "dev"
						}
					};
					executeMyRequest(params, 'environment/dbs/delete', 'delete', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 172,
							"message": "Missing required field: name"
						});
						done();
					});
				});

				it('fail - invalid database name', function (done) {
					var params = {
						qs: {
							"env": "dev",
							"name": "invalid"
						}
					};
					executeMyRequest(params, 'environment/dbs/delete', 'delete', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 512,
							"message": "environment database does not exist"
						});
						done();
					});
				});

				it('fail - session does not exist', function (done) {
					var params = {
						qs: {
							"env": "dev",
							"name": "session"
						}
					};
					var tmp = {};
					mongo.findOne('environment', {'code': 'DEV'}, function (error, record) {
						assert.ifError(error);
						tmp = util.cloneObj(record.dbs.config.session);
						delete record.dbs.config.session;

						mongo.save('environment', record, function (error) {
							assert.ifError(error);

							executeMyRequest(params, 'environment/dbs/delete', 'delete', function (body) {
								assert.deepEqual(body.errors.details[0], {
									"code": 511,
									"message": "environment session database does not exist"
								});

								record.dbs.config.session = tmp;
								mongo.save('environment', record, function (error) {
									assert.ifError(error);
									done();
								});
							});
						});
					});
				});

				it('success - delete database', function (done) {
					var params = {
						qs: {
							"env": "dev",
							"name": "urac"
						}
					};
					executeMyRequest(params, 'environment/dbs/delete', 'delete', function (body) {
						assert.ok(body.data);
						done();
					});
				});

				it('success - delete session', function (done) {
					var params = {
						qs: {
							"env": "dev",
							"name": "session"
						}
					};
					executeMyRequest(params, 'environment/dbs/delete', 'delete', function (body) {
						assert.ok(body.data);
						done();
					});
				});

				it('mongo - testing database', function (done) {
					mongo.findOne('environment', {'code': "DEV"}, function (error, record) {
						assert.ifError(error);
						assert.ok(record);
						assert.deepEqual(record.dbs.databases, {
							"urac_2": {
								"cluster": "cluster1",
								"tenantSpecific": true
							},
							"session_test": {
								"cluster": "cluster1",
								"tenantSpecific": false
							}
						});
						done();
					});
				});
			});
			
			describe("list environment dbs", function () {
				before("clean env record", function (done) {
					mongo.update('environment', {code: 'DEV'}, {
						'$set': {
							'dbs.databases': {},
							'dbs.config': {}
						}
					}, function (error) {
						assert.ifError(error);
						done();
					});
				});

				it('success - no session and no databases', function (done) {
					var params = {
						qs: {'env': 'dev'}
					};
					executeMyRequest(params, 'environment/dbs/list', 'get', function (body) {
						assert.ok(body.data);
						assert.equal(JSON.stringify(body.data.databases), '{}');
						assert.equal(JSON.stringify(body.data.config), '{}');
						done();
					});
				});

				it('success - add session db', function (done) {
					var params = {
						qs: {
							env: "dev"
						},
						form: {
							'name': 'session',
							'cluster': 'cluster1',
							'sessionInfo': {
								"cluster": "cluster1",
								"dbName": "core_session",
								'store': {},
								"collection": "sessions",
								'stringify': false,
								'expireAfter': 1000 * 60 * 60 * 24 * 14 // 2 weeks
							}
						}
					};
					executeMyRequest(params, 'environment/dbs/add', 'post', function (body) {
						assert.ok(body.data);
						done();
					});
				});
				
				it('success - add urac db', function (done) {
					var params = {
						qs: {
							env: "dev"
						},
						form: {
							'name': 'urac',
							'tenantSpecific': true,
							'cluster': 'cluster1'
						}
					};
					executeMyRequest(params, 'environment/dbs/add', 'post', function (body) {
						assert.ok(body.data);
						done();
					});
				});
				
				it('success - yes session and yes databases', function (done) {
					var params = {
						qs: {'env': 'dev'}
					};
					executeMyRequest(params, 'environment/dbs/list', 'get', function (body) {
						assert.ok(body.data);
						assert.deepEqual(body.data.databases, {
							'urac': {
								'cluster': 'cluster1',
								'tenantSpecific': true
							}
						});
						assert.deepEqual(body.data.config, {
							'session': {
								"cluster": "cluster1",
								"name": "core_session",
								'store': {},
								"collection": "sessions",
								'stringify': false,
								'expireAfter': 1000 * 60 * 60 * 24 * 14
							}
						});
						done();
					});
				});
			});

			describe("update environment db prefix", function () {
				it("success - add db prefix", function (done) {
					var params = {
						qs: {
							env: "dev"
						},
						form: {
							'prefix': 'soajs_'
						}
					};
					executeMyRequest(params, 'environment/dbs/updatePrefix', 'put', function (body) {
						assert.ok(body.data);

						mongo.findOne('environment', {'code': 'DEV'}, function (error, envRecord) {
							assert.ifError(error);
							assert.equal(envRecord.dbs.config.prefix, 'soajs_');
							done();
						});
					});
				});

				it("success - empty db prefix", function (done) {
					var params = {
						qs: {
							env: "dev"
						},
						form: {
							'prefix': ''
						}
					};
					executeMyRequest(params, 'environment/dbs/updatePrefix', 'put', function (body) {
						assert.ok(body.data);

						mongo.findOne('environment', {'code': 'DEV'}, function (error, envRecord) {
							assert.ifError(error);
							assert.equal(envRecord.dbs.config.prefix, '');
							done();
						});
					});
				});
			});

		});

		describe("mongo check db", function () {

			it('asserting environment record', function (done) {
				mongo.findOne('environment', {"code": "DEV"}, function (error, record) {
					assert.ifError(error);
					assert.ok(record);
					delete record._id;
					delete record.deployer;
					delete record.profile;
					delete record.proxy;
					assert.deepEqual(record, {
						"code": "DEV",
						"domain": "api.myDomain.com",
						"apiPrefix": "api",
						"sitePrefix": "site",
						"description": "this is a dummy updated description",
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
									"proxy" : "undefined", //todo remove
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
						},
						"dbs": {
							"clusters": {
								"cluster1": {
									"URLParam": {
										"connectTimeoutMS": 0,
										"socketTimeoutMS": 0,
										"maxPoolSize": 5,
										"wtimeoutMS": 0,
										"slaveOk": true
									},
									"servers": [
										{
											"host": "127.0.0.1",
											"port": 27017
										}
									],
									"extraParam": {
										"db": {
											"native_parser": true
										},
										"server": {
											"auto_reconnect": true
										}
									}
								},
								"cluster2": {
									"URLParam": {
										"connectTimeoutMS": 0,
										"socketTimeoutMS": 0,
										"maxPoolSize": 5,
										"wtimeoutMS": 0,
										"slaveOk": true
									},
									"servers": [
										{
											"host": "127.0.0.1",
											"port": 27017
										}
									],
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
								"session": {
									"cluster": "cluster1",
									"name": "core_session",
									"store": {},
									"collection": "sessions",
									"stringify": false,
									"expireAfter": 1209600000
								},
								"prefix": ""
							},
							"databases": {
								"urac": {
									"cluster": "cluster1",
									"tenantSpecific": true
								}
							}
						}
					});
					done();
				});
			});

		});

	});

	describe("login tests", function () {
		var auth, access_token;

		it("success - did not specify environment code, old acl", function (done) {
			var options = {
				uri: 'http://localhost:4000/oauth/token',
				headers: {
					'Content-Type': 'application/json',
					key: extKey,
					Authorization: AuthValue
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
				var params = {
					qs: {
						access_token: access_token
					}
				};
				executeMyRequest(params, 'permissions/get', 'get', function (body) {
					console.log(JSON.stringify(body, null, 2));
					assert.ok(body.result);
					assert.ok(body.data);
					done();
				});
			});
		});

		it("success - did not specify environment code, new acl", function (done) {
			//todo: implement this test case
			done();
		});

		it("success - specified environment code, old acl", function (done) {
			var params = {
				qs: {
					access_token: access_token,
					envCode: 'DEV'
				}
			};
			executeMyRequest(params, 'permissions/get', 'get', function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				done();
			});
		});
	});

	describe("testing settings for logged in users", function () {
		var access_token;

		it("fail - should not work for non-logged in users", function (done) {
			executeMyRequest({}, 'permissions/get', 'get', function (body) {
				assert.deepEqual(body.errors.details[0],
					{"code": 601, "message": "No Logged in User found."});
				done();
			});
		});

		it("success - should work for logged in users", function (done) {
			var options = {
				uri: 'http://localhost:4000/oauth/token',
				headers: {
					'Content-Type': 'application/json',
					key: extKey,
					Authorization: AuthValue
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
				done();
			});
		});

		describe("settings tests", function () {
			var tenantId, applicationId, key, extKey, oauthUserId;

			before("update environment records to include session database in order to be able to proceed", function (done) {
				var update = {
					'$set': {
						"dbs": {
							"clusters": {
								"cluster1": {
									"URLParam": {
										"connectTimeoutMS": 0,
										"socketTimeoutMS": 0,
										"maxPoolSize": 5,
										"wtimeoutMS": 0,
										"slaveOk": true
									},
									"servers": [
										{
											"host": "127.0.0.1",
											"port": 27017
										}
									],
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
								"session": {
									"cluster": "cluster1",
									"name": "core_session",
									"store": {},
									"collection": "sessions",
									"stringify": false,
									"expireAfter": 1209600000
								},
								"prefix": ""
							},
							"databases": {
								"urac": {
									"cluster": "cluster1",
									"tenantSpecific": true
								}
							}
						}
					}
				};
				mongo.update("environment", {}, update, {multi: true}, function (error) {
					assert.ifError(error);
					done();
				});
			});

			it("fail - user not logged in", function (done) {
				executeMyRequest({},
					'settings/tenant/get', 'get', function (body) {
						assert.deepEqual(body.errors.details[0], {"code": 601, "message": "No Logged in User found."});
						done();
					});
			});

			it("success - will get tenant", function (done) {
				executeMyRequest({
					'qs': {
						'access_token': access_token
					}
				}, 'settings/tenant/get', 'get', function (body) {
					console.log(JSON.stringify(body, null, 2));
					assert.ok(body.result);
					assert.ok(body.data);
					tenantId = body.data.tenant._id.toString();
					done();
				});
			});

			it("success - will update tenant", function (done) {
				var params = {
					'qs': {
						'access_token': access_token
					},
					form: {
						"description": 'this is a dummy updated description',
						"name": "test tenant updated"
					}
				};
				executeMyRequest(params, 'settings/tenant/update', 'put', function (body) {
					assert.ok(body.result);
					assert.ok(body.data);
					done();
				});

			});

			it("success - will add oauth", function (done) {
				var params = {
					'qs': {
						'access_token': access_token
					},
					form: {
						"secret": "my secret key",
						"redirectURI": "http://www.myredirecturi.com/"
					}
				};

				executeMyRequest(params, 'settings/tenant/oauth/add/', 'post', function (body) {
					assert.ok(body.data);
					mongo.findOne('tenants', {'code': 'test'}, function (error, tenantRecord) {
						assert.ifError(error);
						assert.deepEqual(tenantRecord.oauth, {
							"secret": "my secret key",
							"redirectURI": "http://www.myredirecturi.com/",
							"grants": ["password", "refresh_token"]
						});
						done();

					});

				});
			});

			it("success - will update oauth", function (done) {
				var params = {
					'qs': {
						'access_token': access_token
					},
					form: {
						"secret": "my secret key2",
						"redirectURI": "http://www.myredirecturi.com/"
					}
				};
				executeMyRequest(params, 'settings/tenant/oauth/update/', 'put', function (body) {
					assert.ok(body.data);
					mongo.findOne('tenants', {'code': 'test'}, function (error, tenantRecord) {
						assert.ifError(error);
						assert.deepEqual(tenantRecord.oauth, {
							"secret": "my secret key2",
							"redirectURI": "http://www.myredirecturi.com/",
							"grants": ["password", "refresh_token"]
						});
						done();
					});
				});
			});

			it("success - will get oauth object", function (done) {
				executeMyRequest({
					'qs': {
						'access_token': access_token
					}
				}, 'settings/tenant/oauth/list/', 'get', function (body) {
					assert.ok(body.data);
					assert.deepEqual(body.data, {
						"secret": "my secret key2",
						"redirectURI": "http://www.myredirecturi.com/",
						"grants": ["password", "refresh_token"]
					});
					done();
				});
			});

			it("success - will delete oauth", function (done) {
				executeMyRequest({
					'qs': {
						'access_token': access_token
					}
				}, 'settings/tenant/oauth/delete/', 'delete', function (body) {
					assert.ok(body.data);
					done();
				});
			});

			it("success - will return oauth obj", function (done) {
				var params = {
					'qs': {
						'access_token': access_token
					},
					form: {
						"secret": "my secret key2",
						"redirectURI": "http://www.myredirecturi.com/"
					}
				};
				executeMyRequest(params, 'settings/tenant/oauth/update/', 'put', function (body) {
					assert.ok(body.data);
					done();
				});
			});

			it("success - will add oauth user", function (done) {
				var params = {
					'qs': {
						'access_token': access_token
					},
					form: {
						"userId": "oauth_user",
						"password": "password1"
					}
				};

				executeMyRequest(params, 'settings/tenant/oauth/users/add/', 'post', function (body) {
					mongo.findOne('oauth_urac', {'userId': 'oauth_user'}, function (error, tenantRecord) {
						assert.ifError(error);
						assert.ok(tenantRecord);
						assert.equal(tenantRecord.userId, "oauth_user");
						assert.equal(tenantRecord.tId.toString(), tenantId);
						oauthUserId = tenantRecord._id.toString();
						done();
					});
				});
			});

			it("success - will update oauth users", function (done) {
				var params = {
					qs: {
						'access_token': access_token,
						uId: oauthUserId
					},
					form: {
						"userId": "oauth_user_up",
						"password": "password2"
					}
				};
				executeMyRequest(params, 'settings/tenant/oauth/users/update/', 'put', function (body) {
					assert.ok(body.data);
					mongo.findOne('oauth_urac', {'userId': 'oauth_user_up'}, function (error, tenantRecord) {
						assert.ifError(error);
						assert.ok(tenantRecord);
						assert.equal(tenantRecord.userId, 'oauth_user_up');
						assert.equal(tenantRecord.tId.toString(), tenantId);
						done();
					});
				});
			});

			it("success - will delete oauth user", function (done) {
				executeMyRequest({
					qs: {
						'access_token': access_token,
						'uId': oauthUserId
					}
				}, 'settings/tenant/oauth/users/delete/', 'delete', function (body) {
					assert.ok(body.data);
					done();
				});
			});

			it("success - will get oauth users", function (done) {
				executeMyRequest({
					qs: {
						'access_token': access_token
					}
				}, 'settings/tenant/oauth/users/list/', 'get', function (body) {
					assert.ok(body.data);
					assert.equal(body.data.length, 0);
					done();
				});
			});

			it("success - will list applications", function (done) {
				applicationId = "5550b473373137a130ebbb68";
				var newApplication = {
					"product": "TPROD",
					"package": "TPROD_BASIC",
					"appId": mongo.ObjectId(applicationId),
					"description": "This is a dummy desc",
					"_TTL": 604800000,
					"keys": []
				};
				var push = {
					'$push': {'applications': newApplication}
				};
				mongo.update('tenants', {'_id': mongo.ObjectId(tenantId)}, push, {
					'upsert': false,
					'safe': true
				}, function (error) {
					assert.ifError(error);
					done();
				});
			});

			it("success - will get empty object", function (done) {
				executeMyRequest({
					qs: {
						'access_token': access_token
					}
				}, 'settings/tenant/application/list/', 'get', function (body) {
					assert.ok(body.data);
					assert.equal(body.data.length, 4);
					done();
				});
			});

			it("success - will add key", function (done) {
				var params = {
					qs: {
						'access_token': access_token,
						'appId': applicationId
					}
				};
				executeMyRequest(params, 'settings/tenant/application/key/add', 'post', function (body) {
					assert.ok(body.data);

					mongo.findOne('tenants', {'_id': mongo.ObjectId(tenantId)}, function (error, tenantRecord) {
						assert.ifError(error);
						assert.ok(tenantRecord);
						key = tenantRecord.applications[tenantRecord.applications.length - 1].keys[0].key.toString();
						done();
					});
				});
			});

			it("success - will list key", function (done) {
				var params = {
					qs: {
						'access_token': access_token,
						appId: applicationId
					}
				};
				executeMyRequest(params, 'settings/tenant/application/key/list/', 'get', function (body) {
					assert.ok(body.data);
					assert.equal(body.data.length, 1);
					key = body.data[0].key.toString();
					done();
				});
			});

			it("success - will add ext key for STG", function (done) {
				var params = {
					qs: {
						'access_token': access_token,
						appId: applicationId,
						key: key
					},
					form: {
						'expDate': expDateValue,
						'device': {
							'a': 'b'
						},
						'geo': {
							'x': 'y'
						},
						'env': 'STG'
					}
				};
				executeMyRequest(params, 'settings/tenant/application/key/ext/add/', 'post', function (body) {
					console.log(JSON.stringify(body, null, 2));
					assert.ok(body.data);
					mongo.findOne('tenants', {'_id': mongo.ObjectId(tenantId)}, function (error, tenantRecord) {
						assert.ifError(error);
						assert.ok(tenantRecord);
						extKey = tenantRecord.applications[tenantRecord.applications.length - 1].keys[0].extKeys[0].extKey;
						done();
					});
				});
			});

			it("success - will update ext key STG", function (done) {
				var params = {
					qs: {
						'access_token': access_token,
						appId: applicationId,
						key: key,
						extKeyEnv: 'STG'
					},
					form: {
						'extKey': extKey,
						'expDate': expDateValue,
						'device': {
							'a': 'b'
						},
						'geo': {
							'x': 'y'
						}
					}
				};
				console.log(params);
				executeMyRequest(params, 'settings/tenant/application/key/ext/update/', 'put', function (body) {
					console.log(JSON.stringify(body, null, 2));
					assert.ok(body.data);
					done();
				});
			});

			it("success - will delete ext key STG", function (done) {
				var params = {
					qs: {
						'access_token': access_token,
						appId: applicationId,
						key: key
					},
					form: {
						'extKey': extKey,
						'extKeyEnv': 'STG'
					}
				};
				console.log(params);
				executeMyRequest(params, 'settings/tenant/application/key/ext/delete/', 'post', function (body) {
					console.log(JSON.stringify(body, null, 2));
					assert.ok(body.data);
					done();
				});
			});
			
			it("success - will list ext key", function (done) {
				var params = {
					qs: {
						'access_token': access_token,
						appId: applicationId,
						key: key
					}
				};
				executeMyRequest(params, 'settings/tenant/application/key/ext/list/', 'get', function (body) {
					assert.ok(body.data);
					assert.equal(body.data.length, 0);
					done();
				});
			});

			it("success - will update configuration", function (done) {
				var params = {
					qs: {
						'access_token': access_token,
						appId: applicationId,
						key: key
					},
					form: {
						'envCode': 'DEV',
						'config': {
							'mail': {
								'a': 'b'
							},
							'urac': {
								'x': 'y'
							}
						}
					}
				};
				executeMyRequest(params, 'settings/tenant/application/key/config/update', 'put', function (body) {
					assert.ok(body.data);
					done();
				});
			});

			it("success - will list configuration", function (done) {
				var params = {
					qs: {
						'access_token': access_token,
						appId: applicationId,
						key: key
					}
				};
				executeMyRequest(params, 'settings/tenant/application/key/config/list', 'get', function (body) {
					assert.ok(body.data);
					assert.deepEqual(body.data, {
						dev: {
							mail: {'a': 'b'},
							urac: {'x': 'y'}
						}
					});

					done();
				});
			});

			it("success - will delete key", function (done) {
				var params = {
					qs: {
						'access_token': access_token,
						'appId': applicationId,
						'key': key.toString()
					}
				};
				executeMyRequest(params, 'settings/tenant/application/key/delete', 'delete', function (body) {
					assert.ok(body.data);
					done();
				});
			});

		});
	});

	describe("platforms tests", function () {

		describe("list platforms", function () {

			it("success - will list platforms and available certificates", function (done) {
				var params = {
					qs: {
						env: 'DEV'
					}
				};

				executeMyRequest(params, "environment/platforms/list", 'get', function (body) {
					assert.ok(body.data);
					assert.ok(Object.keys(body.data).length > 0);
					done();
				});
			});

			it("fail - missing required params", function (done) {
				executeMyRequest({}, "environment/platforms/list", 'get', function (body) {
					assert.ok(body.errors);
					assert.deepEqual(body.errors.details[0], {'code': 172, 'message': 'Missing required field: env'});
					done();
				});
			});
		});

		describe("change selected driver", function () {

			it("success - will change selected driver", function (done) {
				var params = {
					qs: {
						env: 'DEV'
					},
					form: {
						selected: 'container.dockermachine.cloud.joyent'
					}
				};

				executeMyRequest(params, 'environment/platforms/driver/changeSelected', 'put', function (body) {
					assert.ok(body.data);
					done();
				});
			});

			it("fail - missing required params", function (done) {
				var params = {
					form: {
						selected: 'container.dockermachine.cloud.joyent'
					}
				};

				executeMyRequest(params, 'environment/platforms/driver/changeSelected', 'put', function (body) {
					assert.ok(body.errors);
					assert.deepEqual(body.errors.details[0], {'code': 172, 'message': 'Missing required field: env'});
					done();
				});
			});
		});

		describe("change deployer type", function () {

			it("success - will change deployer type", function (done) {
				var params = {
					qs: {
						env: 'DEV'
					},
					form: {
						deployerType: 'container'
					}
				};

				executeMyRequest(params, 'environment/platforms/deployer/type/change', 'put', function (body) {
					assert.ok(body.data);
					done();
				});
			});

			it("fail - missing required params", function (done) {
				var params = {
					qs: {
						env: 'DEV'
					}
				};

				executeMyRequest(params, 'environment/platforms/deployer/type/change', 'put', function (body) {
					assert.ok(body.errors);
					assert.deepEqual(body.errors.details[0], {
						'code': 172,
						'message': 'Missing required field: deployerType'
					});
					done();
				});
			});
		});
	});
	
	describe("hosts tests", function () {
		// TODO: fill deployer object for all ENV records
		var hosts = [], hostsCount = 0;
		describe("list Hosts", function () {

			it("success - will get hosts list", function (done) {
				executeMyRequest({qs: {'env': 'dev'}}, 'hosts/list', 'get', function (body) {
					assert.ok(body.data);
					hostsCount = body.data.hosts.length;
					done();
				});
			});

			it("mongo - empty the hosts", function (done) {
				mongo.find('hosts', {}, function (error, dbHosts) {
					assert.ifError(error);
					assert.ok(dbHosts);
					dbHosts.forEach(function (oneHost) {
						oneHost.hostname = oneHost.name;
					});
					hosts = dbHosts;
					mongo.remove('hosts', {}, function (error) {
						assert.ifError(error);
						done();
					});
				});
			});

			it("success - will get an empty list", function (done) {
				executeMyRequest({qs: {'env': 'dev'}}, 'hosts/list', 'get', function (body) {
					assert.ok(body.data);
					assert.equal(body.data.hosts.length, 0);
					done();
				});
			});

			it("mongo - fill the hosts", function (done) {
				mongo.remove('hosts', {}, function (error) {
					assert.ifError(error);
					mongo.insert('hosts', hosts, function (error) {
						assert.ifError(error);
						done();
					});
				});
			});

			it("success - will get hosts list", function (done) {
				executeMyRequest({qs: {'env': 'dev'}}, 'hosts/list', 'get', function (body) {
					assert.ok(body.data);
					assert.ok(body.data.hosts.length > 0);
					assert.equal(body.data.hosts.length, hostsCount);
					done();
				});
			});
		});
		//testing the services API in which env are deployed
		describe("return environments where a service is deployed", function () {
			var swaggerDev = {
				"env": "dev",
				"name": "swaggerSample",
				"ip": "127.0.0.1",
				"hostname": "dashboard",
				"version": 1
			};
			var swaggerDash = {
				"env": "prod",
				"name": "swaggerSample",
				"ip": "127.0.0.1",
				"hostname": "production",
				"version": 1
			};
			it("success - will get the env list in case the service has more than 1 env", function (done) {
				mongo.insert('hosts', swaggerDash, function (error) {
					assert.ifError(error);
					mongo.insert('hosts', swaggerDev, function (error) {
						assert.ifError(error);
						executeMyRequest({qs: {'service': 'swaggerSample'}}, 'services/env/list', 'get', function (body) {
							assert.ok(body.result);
							assert.deepEqual(body.data, {
								"dev": "api.api.myDomain.com",
								"prod": "api.api.myDomain.com"
							});
							done();
						});
					});
				});
			});

			it("success - will get the env list in case the service has one env", function (done) {
				executeMyRequest({qs: {'service': 'dashboard'}}, 'services/env/list', 'get', function (body) {
					assert.ok(body.result);
					assert.deepEqual(body.data, {"dev": "api.api.myDomain.com"});
					done();
				});
			});

			it("fail - service doesn't exist", function (done) {
				executeMyRequest({qs: {'service': 'noService'}}, 'services/env/list', 'get', function (body) {
					assert.equal(body.result, false);
					done();
				});
			});
		});

		describe("maintenance operation Hosts", function () {
			//afterEach(function(done){
			//	setTimeout(function(){ done(); }, 1000);
			//});

			it("fail - missing params", function (done) {
				var params = {
					form: {
						'env': 'dev',
						'serviceName': 'controller',
						'servicePort': 4000,
						'operation': 'heartbeat'
					}
				};
				executeMyRequest(params, 'hosts/maintenanceOperation', 'post', function (body) {
					assert.deepEqual(body.errors.details[0], {
						"code": 172,
						"message": "Missing required field: hostname"
					});
					done();
				});
			});

			it("fail - error calling awareness on service", function (done) {
				var params = {
					form: {
						'env': 'dev',
						'serviceName': 'dashboard',
						'hostname': 'dashboard',
						'servicePort': 4003,
						'operation': 'awarenessStat',
						'serviceHost': '127.0.0.1'
					}
				};
				executeMyRequest(params, 'hosts/maintenanceOperation', 'post', function (body) {
					assert.deepEqual(body.errors.details[0], {
						"code": 602,
						"message": "Invalid maintenance operation requested."
					});
					done();
				});
			});

			it("fail - error calling load provision on controller", function (done) {
				var params = {
					form: {
						'env': 'dev',
						'serviceName': 'controller',
						'servicePort': 4003,
						'hostname': 'controller',
						'operation': 'loadProvision',
						'serviceHost': '127.0.0.1'
					}
				};
				executeMyRequest(params, 'hosts/maintenanceOperation', 'post', function (body) {
					assert.deepEqual(body.errors.details[0], {
						"code": 602,
						"message": "Invalid maintenance operation requested."
					});
					done();
				});
			});

			it("fail - host not found", function (done) {
				var params = {
					form: {
						'env': 'dev',
						'serviceName': 'dashboard',
						'servicePort': 4003,
						'hostname': 'dashboard2',
						'operation': 'heartbeat',
						'serviceHost': '128.0.0.1'
					}
				};
				executeMyRequest(params, 'hosts/maintenanceOperation', 'post', function (body) {
					assert.deepEqual(body.errors.details[0], {"code": 605, "message": "Service Host not found."});
					done();
				});
			});

			it("fail - service not found", function (done) {
				var params = {
					form: {
						'env': 'dev',
						'serviceName': 'invalidService',
						'servicePort': 4000,
						'hostname': 'invalidService',
						'operation': 'heartbeat',
						'serviceHost': '127.0.0.1'
					}
				};
				executeMyRequest(params, 'hosts/maintenanceOperation', 'post', function (body) {
					assert.deepEqual(body.errors.details[0], {"code": 604, "message": "Service not found."});
					done();
				});
			});

            it("fail - invalid ip address", function (done) {
                var params = {
                    form: {
                        'env': 'dev',
                        'serviceName': 'controller',
                        'servicePort': 4000,
                        'hostname': 'controller',
                        'operation': 'heartbeat',
                        'serviceHost': '71.255.67.89'
                    }
                };
                executeMyRequest(params, 'hosts/maintenanceOperation', 'post', function (body) {
                	assert.equal(body.result, false);
                	assert.ok(body.errors);
                    assert.deepEqual(body.errors.details[0], {"code": 605, "message": "Service Host not found."});
                    done();
                });
            });

			it("success - heartbeat controller and service", function (done) {
				var params = {
					form: {
						'env': 'dev',
						'serviceName': 'controller',
						'servicePort': 4000,
						'operation': 'heartbeat',
						'hostname': 'controller',
						'serviceHost': '127.0.0.1'
					}
				};
				executeMyRequest(params, 'hosts/maintenanceOperation', 'post', function (body) {
					assert.ok(body.data);

					params.form.serviceName = 'dashboard';
					params.form.hostname = 'dashboard';
					params.form.servicePort = 4003;
					executeMyRequest(params, 'hosts/maintenanceOperation', 'post', function (body) {
						assert.ok(body.data);
						done();
					});
				});
			});

			it("success - awareness on controller", function (done) {
				var params = {
					form: {
						'env': 'dev',
						'serviceName': 'controller',
						'hostname': 'controller',
						'servicePort': 4000,
						'operation': 'awarenessStat',
						'serviceHost': '127.0.0.1'
					}
				};
				executeMyRequest(params, 'hosts/maintenanceOperation', 'post', function (body) {
					assert.ok(body.data);
					done();
				});
			});

			it("success - load provision service", function (done) {
				var params = {
					form: {
						'env': 'dev',
						'serviceName': 'dashboard',
						'hostname': 'dashboard',
						'servicePort': 4003,
						'operation': 'loadProvision',
						'serviceHost': '127.0.0.1'
					}
				};
				executeMyRequest(params, 'hosts/maintenanceOperation', 'post', function (body) {
					assert.ok(body.data);
					done();
				});
			});

		});
	});
	
	describe("change tenant security key", function () {

		describe("will change tenant security key", function () {
			var Authorization, access_token;
			var newKey = "9b96ba56ce934ded56c3f21ac9bdaddc8ba4782b7753cf07576bfabcace8632eba1749ff1187239ef1f56dd74377aa1e5d0a1113de2ed18368af4b808ad245bc7da986e101caddb7b75992b14d6a866db884ea8aee5ab02786886ecf9f25e974";

			it("get Auhtorization token", function (done) {
				var options = {
					uri: 'http://localhost:4000/oauth/authorization',
					headers: {
						'Content-Type': 'application/json',
						'key': newKey
					},
					json: true
				};

				request.get(options, function (error, response, body) {
					assert.ifError(error);
					assert.ok(body);
					Authorization = body.data;
					done();
				});
			});

			it("success - change security key", function (done) {
				mongo.findOne('environment', {'code': 'DEV'}, function (error, envRecord) {
					assert.ifError(error);
					assert.ok(envRecord);
					//Login first
					var options = {
						uri: 'http://localhost:4000/oauth/token',
						headers: {
							'Content-Type': 'application/json',
							key: newKey,
							'Authorization': Authorization
						},
						body: {
							"username": "owner",
							"password": "123456",
							"grant_type": "password"
						},
						json: true
					};

					request.post(options, function (error, response, body) {
						assert.ifError(error);
						assert.ok(body);
						access_token = body.access_token;

						var params = {
							headers: {
								key: newKey
							},
							qs: {
								'access_token': access_token,
								'id': envRecord._id.toString()
							},
							form: {
								'algorithm': 'aes256',
								'password': 'new test case password'
							}
						};

						executeMyRequest(params, 'environment/key/update', 'put', function (body) {
							assert.ok(body.result);
							done();
						});
					});
				});
			});
		});

		describe("fail - logged in user is not the owner of the app", function () {
			var Authorization2, access_token;

			// before("update mongo. assure oauth", function (done) {
			// 	mongo.update('tenants', {'code': 'test'}, {
			// 		$set: {
			// 			"oauth": {
			// 				"secret": "my secret key2",
			// 				"redirectURI": "http://www.myredirecturi.com/",
			// 				"grants": ["password", "refresh_token"]
			// 			}
			// 		}
			// 	}, {
			// 		'upsert': false, 'safe': true, multi: false
			// 	}, function (error, success) {
			// 		setTimeout(function () {
			// 			done();
			// 		}, 900);
			// 	});
			// });

			it("get Auhtorization token", function (done) {
				var options = {
					uri: 'http://localhost:4000/oauth/authorization',
					headers: {
						'Content-Type': 'application/json',
						'key': extKey
					},
					json: true
				};

				request.get(options, function (error, response, body) {
					assert.ifError(error);
					assert.ok(body);
					console.log(JSON.stringify(body, null, 2));
					assert.ok(body.data);
					Authorization2 = body.data;
					done();
				});
			});

			it("Login first", function (done) {
				var options = {
					uri: 'http://localhost:4000/oauth/token',
					headers: {
						'Content-Type': 'application/json',
						key: extKey,
						Authorization: Authorization2
					},
					body: {
						"username": "user1",
						"password": "123456",
						"grant_type": "password"
					},
					json: true
				};
				console.log(options);
				request.post(options, function (error, response, body) {
					assert.ifError(error);
					assert.ok(body);
					console.log(JSON.stringify(body, null, 2));
					access_token = body.access_token;
					assert.ok(body.access_token);
					done();
				});
			});

			it("fail - logged in user is not the owner of the app", function (done) {
				mongo.findOne('environment', {'code': 'DEV'}, function (error, envRecord) {
					assert.ifError(error);
					assert.ok(envRecord);
					var params = {
						qs: {
							'access_token': access_token,
							'id': envRecord._id.toString()
						},
						form: {
							'algorithm': 'aes256',
							'password': 'new test case password'
						}
					};
					executeMyRequest(params, 'environment/key/update', 'put', function (body) {
						assert.ok(!body.result);
						assert.deepEqual(body.errors.details[0], {"code": 781, "message": errorCodes[781]});
						done();
					});
				});
			});

		});
	});
	
	describe("prevent operator from removing tenant/application/key/extKey/product/package he is currently logged in with", function () {
		var tenantId, appId, key, tenantExtKey, productCode, productId, packageCode, params;

		before(function (done) {
			//get tenant/product info from db
			mongo.findOne('tenants', {'code': "test"}, function (error, record) {
				assert.ifError(error);
				assert.ok(record);
				tenantId = record._id.toString();
				appId = record.applications[0].appId.toString();
				key = record.applications[0].keys[0].key;
				tenantExtKey = record.applications[0].keys[0].extKeys[0].extKey;
				productCode = record.applications[0].product;
				packageCode = record.applications[0].package;

				mongo.findOne('products', {'code': productCode}, function (error, record) {
					assert.ifError(error);
					assert.ok(record);
					productId = record._id.toString();

					done();
				});
			});
		});

		it("success - prevent from deleting tenant", function (done) {
			params = {
				qs: {
					"id": tenantId
				}
			};

			executeMyRequest(params, 'tenant/delete', 'delete', function (body) {
				assert.ok(body);
				if (body.result === false)
					assert.ifError(body.result);

				assert.deepEqual(body.errors.details[0], {"code": 462, "message": errorCodes[462]});
				done();
			});
		});

		it("success - prevent from deleting application", function (done) {
			params = {
				qs: {
					"id": tenantId,
					"appId": appId
				}
			};
			executeMyRequest(params, 'tenant/application/delete', 'delete', function (body) {
				assert.ok(body);
				if (body.result === false)
					assert.ifError(body.result);

				assert.deepEqual(body.errors.details[0], {"code": 463, "message": errorCodes[463]});
				done();
			});
		});

		it("success - prevent from deleting key", function (done) {
			params = {
				qs: {
					"id": tenantId,
					"appId": appId,
					"key": key
				}
			};
			executeMyRequest(params, 'tenant/application/key/delete', 'delete', function (body) {
				assert.ok(body);
				if (body.result === false)
					assert.ifError(body.result);

				assert.deepEqual(body.errors.details[0], {"code": 464, "message": errorCodes[464]});
				done();
			});
		});

		it("success - prevent from deleting extKey", function (done) {
			params = {
				qs: {
					"id": tenantId,
					"appId": appId,
					"key": key
				},
				form: {
					"extKey": tenantExtKey,
					"extKeyEnv": "DEV"
				}
			};
			executeMyRequest(params, 'tenant/application/key/ext/delete', 'post', function (body) {
				assert.ok(body);
				assert.ok(body.errors);
				assert.deepEqual(body.errors.details[0], {"code": 465, "message": errorCodes[465]});
				done();
			});
		});

		it("success - prevent from deleting product", function (done) {
			params = {
				qs: {
					'id': productId
				}
			};
			executeMyRequest(params, 'product/delete', 'delete', function (body) {
				assert.ok(body);
				if (body.result === false)
					assert.ifError(body.result);

				assert.deepEqual(body.errors.details[0], {"code": 466, "message": errorCodes[466]});
				done();
			});
		});

		it("success - prevent from deleting package", function (done) {
			params = {
				qs: {
					'id': productId,
					'code': packageCode.split("_")[1]
				}
			};
			executeMyRequest(params, 'product/packages/delete', 'delete', function (body) {
				assert.ok(body);
				if (body.result === false)
					assert.ifError(body.result);

				assert.deepEqual(body.errors.details[0], {"code": 467, "message": errorCodes[467]});
				done();
			});
		});
	});
	
	describe("static content tests", function () {
		it("success - will list static content", function (done) {
			executeMyRequest({}, "staticContent/list", 'post', function (body) {
				assert.ok(body.data);
				done();
			});
		});
	});
});
