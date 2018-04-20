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
var qaEnvRecord;
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

describe("DASHBOARD Integration Tests:", function () {
	var expDateValue = new Date().toISOString();
	var envId;
	var qaID;
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
			"description":  "this is the QA environment",
			"domain": "api.QA.com",
			"profile": "single",
			"deployer": {
				"type": "container",
				"selected": "container.kubernetes.local",
				"container": {
					"docker": {
						"local": {
							"socketPath": "/var/run/docker.sock",
                            "auth": {
                                "token": ""
                            }
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

		describe("get environment tests", function () {
			it("success - get environment/code", function (done) {
				var params = {
					qs: {
						"code": "dev"
					}
				};
				executeMyRequest(params, 'environment/', 'get', function (body) {
					assert.ok(body.data);
					assert.deepEqual(body.data.code, "DEV");
					done();
				});
			});

			it('success - get environment/id', function (done) {
				mongo.findOne('environment', {code: 'DEV'}, function (error, envRecord) {
					assert.ifError(error);
					assert.ok(envRecord);

					var params = {
						qs: {'id': envRecord._id.toString()}
					};
					executeMyRequest(params, 'environment/', 'get', function (body) {
						assert.ok(body.data);
						assert.deepEqual(body.data.code, "DEV");
						done();
					});
				});
			});

			it('fail - invalid environment id provided', function (done) {
				var params = {
					qs: {'id': 'qwrr'}
				};
				executeMyRequest(params, 'environment/', 'get', function (body) {
					assert.ok(body.errors);
					assert.deepEqual(body.errors.details[0], {"code": 405, "message": errorCodes[405]});
					done();
				});
			});

			it('fail - Unable to get the environment records', function (done) {
				var params = {
					qs: {'code': 'freeww'}
				};
				executeMyRequest(params, 'environment/', 'get', function (body) {
					assert.deepEqual(body.data, null);
					done();
				});
			});

			it('fail - no id or code provided', function (done) {
				var params = {
					qs: {}
				};
				executeMyRequest(params, 'environment/', 'get', function (body) {
					assert.ok(body.errors);
					assert.deepEqual(body.errors.details[0], {
						"code": 405,
						"message": errorCodes[405]
					});
					done();
				});
			});
		});

		describe("listing environments to initiate templates", function (){
			it("success - will get environments", function (done) {
				executeMyRequest({}, 'environment/list', 'get', function (body) {
					assert.ok(body.data);
					done();
				});
			});
		});

		describe("add environment tests", function () {

			it("success - will add STG environment", function (done) {
				var data2 = util.cloneObj(validEnvRecord);
				data2.code = 'STG';
				data2.services.config.session.proxy = "true";
				data2.templateId = "5acf46c4af4cd3a45f21e1eb";
				delete data2._id;
				var params = {
					form: {
						template: {
							gi: {
								code: "STG",
							},
							deploy: {
								// selectedDriver : 'docker'
							},
							controller: {}
						},
						data: data2,
					}
				};

				executeMyRequest(params, 'environment/add', 'post', function (body) {
					assert.ok(body.data);
					done();
				});
			});

			it("success - will add PROD environment", function (done) {
				var data3 = util.cloneObj(validEnvRecord);
				data3.code = 'PROD';
				data3.services.config.session.proxy = "false";
				data3.templateId = "5acf46c4af4cd3a45f21e1eb";
				delete data3._id;
				var params = {
					form: {
						template: {
							gi: {
								code: "PROD",
							},
							deploy: {
								// selectedDriver : 'docker'
							}
						},
						data: data3
					}
				};
				executeMyRequest(params, 'environment/add', 'post', function (body) {
					assert.ok(body.data);
					done();
				});
			});

			it("success - will add testKubLocal environment", function (done) {
				var data4 = util.cloneObj(qaEnvRecord);
				data4.code = 'testKubLocal';
				data4.templateId = "5acf46c4af4cd3a45f21e1eb";
				data4.deploy = {
					"type": "container",
					"selectedDriver" : 'kubernetes',
					"deployment" : {
						"kubernetes" : {
							"kubernetesremote": false,
							"local": {}
						}
					}
				};
				delete data4._id;
				var params = {
					form: {
						template: {
							gi: {
								code: "testKubLocal",
							},
							deploy: {
								// selectedDriver : 'kubernetes'
							}
						},
						data: data4
					}
				};
				executeMyRequest(params, 'environment/add', 'post', function (body) {
					assert.ok(body.data);
					done();
				});
			});

			it("success - will add testKubRemote environment", function (done) {
				var data5 = util.cloneObj(qaEnvRecord);
				data5.code = 'testKubRemote';
				data5.templateId = "5acf46c4af4cd3a45f21e1eb";
				data5.deploy = {
					"type": "container",
					"selectedDriver" : 'kubernetes',
					"deployment" : {
						"kubernetes" : {
							"kubernetesremote": true,
							"port": 30000,
							"nginxDeployType": 30443,
							"NS": "34344",
							"perService": "token",
							"token": "1234"
						}
					}
				};

				delete data5._id;
				var params = {
					form: {
						template: {
							gi: {
								code: "testKubRemote",
							},
							deploy: {
								// selectedDriver : 'kubernetes'
							}
						},
						data: data5
					}
				};
				executeMyRequest(params, 'environment/add', 'post', function (body) {
					assert.ok(body.data);
					done();
				});
			});

			it("success - will add testDockerLocal environment", function (done) {
				var data6 = util.cloneObj(qaEnvRecord);
				data6.code = 'testDockerLocal';
				data6.templateId = "5acf46c4af4cd3a45f21e1eb";
				data6.deploy = {
					"type": "container",
					"selectedDriver" : 'docker',
					"deployment" : {
						"docker" : {
							"dockerremote": false,
							"token" : "123abd",
							"port": 2222,
							"loval": {

							}
						}
					}
				};
				delete data6._id;
				var params = {
					form: {
						template: {
							gi: {
								code: "testDockerLocal",
							},
							deploy: {
								// selectedDriver : 'docker'
							}
						},
						data: data6
					}
				};
				executeMyRequest(params, 'environment/add', 'post', function (body) {
					assert.ok(body.data);
					done();
				});
			});

			it("success - will add testDockerRemote environment", function (done) {
				var data7 = util.cloneObj(qaEnvRecord);
				data7.code = 'testDockerRemote';
				data7.templateId = "5acf46c4af4cd3a45f21e1eb";
				data7.deploy = {
					"type": "container",
					"selectedDriver" : 'docker',
					"deployment" : {
						"docker" : {
							"dockerremote": true,
							"externalPort": 11111,
							"internalPort": 22222,
							"network": "soajsnet"
						}
					},
					soajsFrmwrk : true,
					cookiesecret : "secret",
					sessionName: "sessionName",
					sessionSecret: "sessionSecret"
				};
				delete data7._id;
				var params = {
					form: {
						template: {
							gi: {
								code: "testDockerRemote",
							},
							deploy: {
								// selectedDriver : 'docker'
							}
						},
						data: data7
					}
				};
				executeMyRequest(params, 'environment/add', 'post', function (body) {
					assert.ok(body.data);
					done();
				});
			});

			it('fail - missing params', function (done) {
				var params = {
					form: {
						template: {
							gi: {
								code: "testDockerRemote",
							},
							deploy: {
								// selectedDriver : 'docker'
							}
						},
						data: {
							"description": 'this is a dummy description'
						}
					}
				};
				executeMyRequest(params, 'environment/add', 'post', function (body) {
					assert.deepEqual(body.errors.details[0].code, 173);
					done();
				});
			});

			it('fail - environment exists', function (done) {
				var params = {
					form: {
						template: {
							gi: {
								code: "testDockerRemote",
							},
							deploy: {
								// selectedDriver : 'docker'
							}
						},
						data: validEnvRecord
					}
				};
				params.form.data.templateId = "5acf46c4af4cd3a45f21e1eb";
				delete params.form.data._id;
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
					delete tester.templateId;
					assert.deepEqual(envRecord, tester);
					mongo.findOne('environment', {'code': 'QA'}, function (error, qaRecord) {
						assert.ifError(error);
						qaID = qaRecord._id.toString();
						delete qaRecord._id;
						delete qaRecord.profile;
						assert.ok(qaRecord);
						qaEnvRecord = qaRecord;
						done();
					});
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
						"services": data2.services,
						"sensitive": true,
						"deployer": {
							"type" : "manual",
							"selected" : "manual",
							"container" : {
								"docker" : {
									"local" : {
										"socketPath" : "/var/run/docker.sock"
									},
									"remote" : {
										"nodes" : [

										]
									}
								},
								"kubernetes" : {
									"local" : {

									},
									"remote" : {
										"nodes" : [

										]
									}
								}
							}
						}
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
						"services": data2.services,
						"sensitive": true,
						"deployer": {
							"type" : "manual",
							"selected" : "manual",
							"container" : {
								"docker" : {
									"local" : {
										"socketPath" : "/var/run/docker.sock"
									},
									"remote" : {
										"nodes" : [

										]
									}
								},
								"kubernetes" : {
									"local" : {

									},
									"remote" : {
										"nodes" : [

										]
									}
								}
							}
						}
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
						"services": validEnvRecord.services,
						"sensitive": true,
						"deployer": {
							"type" : "manual",
							"selected" : "manual",
							"container" : {
								"docker" : {
									"local" : {
										"socketPath" : "/var/run/docker.sock"
									},
									"remote" : {
										"nodes" : [

										]
									}
								},
								"kubernetes" : {
									"local" : {

									},
									"remote" : {
										"nodes" : [

										]
									}
								}
							}
						}
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
						"message": "Missing required field: deployer, services"
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
						"services": validEnvRecord.services,
						"sensitive": true,
						"deployer": {
							"type" : "manual",
							"selected" : "manual",
							"container" : {
								"docker" : {
									"local" : {
										"socketPath" : "/var/run/docker.sock"
									},
									"remote" : {
										"nodes" : [

										]
									}
								},
								"kubernetes" : {
									"local" : {

									},
									"remote" : {
										"nodes" : [

										]
									}
								}
							}
						}
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
					if(envRecord.services && envRecord.services.config && envRecord.services.config.session) {
						delete envRecord.services.config.session.proxy;
					}
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
					assert.deepEqual(body.errors.details[0], {"code": 405, "message": "Invalid environment id provided"});
					done();
				});
			});

			it('fail - invalid environment id provided', function (done) {
				var params = {
					qs: {'id': 'aaaabbcdddd'}
				};
				executeMyRequest(params, 'environment/delete', 'delete', function (body) {
					assert.deepEqual(body.errors.details[0], {"code": 405, "message": "Error: Argument passed in must be a single String of 12 bytes or a string of 24 hex characters"});
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
					assert.equal(records.length, 7);
					done();
				});
			});
		});

		describe("list environment tests", function () {
			it("success - will get 3 environments", function (done) {
				executeMyRequest({}, 'environment/list', 'get', function (body) {
					assert.ok(body.data);
					assert.equal(body.data.length, 7);
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
					assert.equal(body.data.length, 8);

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

		describe("Get environment profile tests", function () {
			it("success - will get environment profile", function (done) {
				executeMyRequest({}, 'environment/profile', 'get', function (body) {
					assert.ok(body.data);
					done();
				});
			});
		});

		describe("Get environment status tests", function () {
			it("success - will get environment status", function (done) {
				var params = {
					qs: {
						code: 'PROD',
						activate: false
					}
				};
				executeMyRequest(params, 'environment/status', 'get', function (body) {
					assert.ok(body);
					done();
				});
			});
		});

		//NOTE: db tests moved to soajs.resources.test.js
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
				done();

				// executeMyRequest(params, 'permissions/get', 'get', function (body) {
				// 	assert.ok(body.result);
				// 	assert.ok(body.data);
				// 	done();
				// });
			});
		});

		it("success - did not specify environment code, new acl", function (done) {
			//todo: implement this test case
			done();
		});

		// it("success - specified environment code, old acl", function (done) {
		// 	var params = {
		// 		qs: {
		// 			access_token: access_token,
		// 			envCode: 'DEV'
		// 		}
		// 	};
		// 	executeMyRequest(params, 'permissions/get', 'get', function (body) {
		// 		assert.ok(body.result);
		// 		assert.ok(body.data);
		// 		done();
		// 	});
		// });
	});

	describe("testing settings for logged in users", function () {
		var access_token;

		// it("fail - should not work for non-logged in users", function (done) {
		// 	executeMyRequest({}, 'permissions/get', 'get', function (body) {
		// 		assert.deepEqual(body.errors.details[0],
		// 			{"code": 601, "message": "No Logged in User found."});
		// 		done();
		// 	});
		// });

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
						assert.deepEqual(body.errors.details[0], {
							"code": 601,
							"message": "No Logged in User found."
						});
						done();
					});
			});

			it("success - will get tenant", function (done) {
				executeMyRequest({
					'qs': {
						'access_token': access_token
					}
				}, 'settings/tenant/get', 'get', function (body) {
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
						"redirectURI": "http://www.myredirecturi.com/",
						"oauthType": "urac",
						"availableEnv": ["dashboard", "dev", "stg"]
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
						"secret": "shhh this is a secret",
						"redirectURI": "http://www.myredirecturi.com/",
						"oauthType": "urac",
						"availableEnv": ["dashboard", "dev", "stg"]
					}
				};
				executeMyRequest(params, 'settings/tenant/oauth/update/', 'put', function (body) {
					assert.ok(body.data);
					mongo.findOne('tenants', {'code': 'test'}, function (error, tenantRecord) {
						assert.ifError(error);
						assert.deepEqual(tenantRecord.oauth, {
							"secret": "shhh this is a secret",
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
						"secret": "shhh this is a secret",
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
						"secret": "shhh this is a secret",
						"redirectURI": "http://www.myredirecturi.com/",
						"oauthType": "urac",
						"availableEnv": ["dashboard", "dev", "stg"]
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
				executeMyRequest(params, 'settings/tenant/application/key/ext/update/', 'put', function (body) {
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
				executeMyRequest(params, 'settings/tenant/application/key/ext/delete/', 'post', function (body) {
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
			before(function(done){
				mongo.remove("fs.files", {}, (error)=>{
					assert.ifError(error);
					mongo.insert("fs.files", [
						{
							"filename": "key.pem",
							"contentType": "binary/octet-stream",
							"length": 3247,
							"chunkSize": 261120,
							"uploadDate": "2017-11-29T17:51:24.332+0000",
							"aliases": null,
							"metadata": {
								"platform": "docker",
								"certType": "key",
								"env": {
									"TESTDOCKERLOCAL": [
										"docker.remote"
									]
								}
							},
							"md5": "f174ab26870198bfdd568ffeaf92b41a"
						},
						{
							"filename": "key.pem",
							"contentType": "binary/octet-stream",
							"length": 3247,
							"chunkSize": 261120,
							"uploadDate": "2017-11-29T17:51:24.332+0000",
							"aliases": null,
							"metadata": {
								"platform": "docker",
								"certType": "key",
								"env": {
									"TESTDOCKERLOCAL": [
										"docker.remote",
										"remote"
									]
								}
							},
							"md5": "f174ab26870198bfdd568ffeaf92b41a"
						},
						{
							"filename": "key.pem",
							"contentType": "binary/octet-stream",
							"length": 3247,
							"chunkSize": 261120,
							"uploadDate": "2017-11-29T17:51:24.332+0000",
							"aliases": null,
							"metadata": {
								"platform": "docker",
								"certType": "key",
								"env": {
									"TESTDOCKERLOCAL": [
										"docker.remote"
									],
									"TESTDOCKERLOCA": [
										"docker.remote"
									]
								}
							},
							"md5": "f174ab26870198bfdd568ffeaf92b41a"
						},
						{
							"filename": "key.pem",
							"contentType": "binary/octet-stream",
							"length": 3247,
							"chunkSize": 261120,
							"uploadDate": "2017-11-29T17:51:24.332+0000",
							"aliases": null,
							"metadata": {
							},
							"md5": "f174ab26870198bfdd568ffeaf92b41a"
						}
					], (error) =>{
						assert.ifError(error);
						done();
					});
				});
			});

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

            it("success - will update the deployer ", function (done) {
                var params = {
                    qs: {
                        env: 'TESTDOCKERLOCAL'
                    },
                    form: {
                        driver: 'remote',
                        config: {
                            nodes: '127.0.0.1',
                            apiPort: '2222',
                            token: '123abc'
						}
                    }
                };
                executeMyRequest(params, "environment/platforms/deployer/update", 'put', function (body) {
                    assert.ok(body.data);
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
				"name": "swaggersample",
				"ip": "127.0.0.1",
				"hostname": "dashboard",
				"version": 1
			};
			var swaggerDash = {
				"env": "prod",
				"name": "swaggersample",
				"ip": "127.0.0.1",
				"hostname": "production",
				"version": 1
			};
			it("success - will get the env list in case the service has more than 1 env", function (done) {
				mongo.update("environment", {code: {$in: ["DEV", "PROD"]}}, {"$unset": {"sensitive": ""}}, function (error) {
					assert.ifError(error);
					mongo.insert('hosts', swaggerDash, function (error) {
						assert.ifError(error);
						mongo.insert('hosts', swaggerDev, function (error) {
							assert.ifError(error);
							executeMyRequest({qs: {'service': 'swaggersample'}}, 'services/env/list', 'get', function (body) {
								assert.ok(body.result);
								assert.ok(body.data.dev.domain);
								assert.ok(body.data.dev.tenants);
								done();
							});
						});
					});
				});
			});

			it("success - will get the env list in case the service has one env", function (done) {
				executeMyRequest({qs: {'service': 'dashboard'}}, 'services/env/list', 'get', function (body) {
					assert.ok(body.result);
					assert.ok(body.data.dev.domain);
					assert.ok(body.data.dev.tenants);
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

		describe("list Controllers", function () {

			it("success - will get hosts list", function (done) {
				executeMyRequest({qs: {'env': 'dev'}}, 'hosts/awareness', 'get', function (body) {
					assert.ok(body.data);
					done();
				});
			});
		});
	});

	describe("node management tests", function () {

		describe("list cloud nodes ", function () {

			it("fail - will get nodes list", function (done) {
				var params = {
					qs:
						{
							'env': 'qa'
						}
				};
				executeMyRequest(params, 'cloud/nodes/list', 'get', function (body) {
					assert.ok(body);
					done();
				});
			});
			it("fail - will add node", function (done) {
				var params = {
					form:
						{
							'env': 'qa',
							'host': "test",

						}
				};
				executeMyRequest(params, 'cloud/nodes/add', 'post', function (body) {
					assert.ok(body);
					done();
				});
			});
			it("fail - will update node", function (done) {
				var params = {
					qs: {
						'env': 'qa',
						'nodeId': 'nodeTest',
					},
					form:
						{
							'type': 'role',
							'value': 'testValue'
						}
				};
				executeMyRequest(params, 'cloud/nodes/update', 'put', function (body) {
					assert.ok(body);
					done();
				});
			});
			it("fail - will tag node", function (done) {
				var params = {
					form:
						{
							'id': 'nodeTest',
							'tag': 'tagTest'
						}
				};
				executeMyRequest(params, 'cloud/nodes/tag', 'put', function (body) {
					assert.ok(body);
					done();
				});
			});
			it("fail - will remove node", function (done) {
				var params = {
					qs:
						{
							'env': 'qa',
							'nodeId': 'nodeId'
						}
				};
				executeMyRequest(params, 'cloud/nodes/remove', 'delete', function (body) {
					assert.ok(body);
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
			it("reload controller provision", function (done) {
				var params = {
					"uri": "http://127.0.0.1:5000/loadProvision",
					"headers": {
						"content-type": "application/json"
					},
					"json": true
				};
				helper.requester("get", params, function (error, response) {
					assert.ifError(error);
					assert.ok(response);
					setTimeout(function () {
						done();
					}, 100);
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
});
