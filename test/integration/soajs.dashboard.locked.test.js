"use strict";
var assert = require('assert');
var request = require("request");
var shell = require('shelljs');
var helper = require("../helper.js");
var dashboard;

var config = helper.requireModule('./config');
var errorCodes = config.errors;

var Mongo = require("soajs.core.modules").mongo;
var dbConfig = require("./db.config.test.js");

var dashboardConfig = dbConfig();
dashboardConfig.name = "core_provision";
var mongo = new Mongo(dashboardConfig);

var sampleData = require("soajs.mongodb.data/modules/dashboard");

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
				'Content-Type': 'application/json',
				key: extKey
			},
			json: true
		};

		if (params.headers) {
			for (var h in params.headers) {
				if (params.headers[h]) {
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

describe("DASHBOARD UNIT TESTS for locked", function () {

	afterEach(function (done) {
		console.log("========================================================");
		done();
	});

	after(function (done) {
		mongo.closeDb();
		done();
	});

	var expDateValue = new Date().toISOString();
	var envId;
	var productId;
	var qaId;
	describe("environment tests", function () {
		before(function (done) {
			mongo.findOne('environment', {'code': 'DEV'}, function (error, record) {
				assert.ifError(error);
				assert.ok(record);
				envId = record._id.toString();
				mongo.findOne('environment', {'code': 'QA'}, function (error, record) {
					assert.ifError(error);
					assert.ok(record);
					qaId = record._id.toString();
					done();
				});
			});
		});

		describe("delete environment tests", function () {
			it("FAIL locked - cant delete environment", function (done) {
				var params = {
					qs: {'id': qaId}
				};
				executeMyRequest(params, 'environment/delete', 'delete', function (body) {
					assert.ok(body);
					assert.deepEqual(body.errors.details[0], {
						"code": 500,
						"message": "This record is locked. You cannot delete it"
					});
					done();
				});
			});
		});

	});

	describe("products tests", function () {

		before(function (done) {
			mongo.findOne('products', {'code': 'DSBRD'}, function (error, record) {
				assert.ifError(error);
				productId = record._id.toString();
				done();
			});
		});

		describe("product", function () {
			it("Fail - locked. Cant update product", function (done) {
				var params = {
					qs: {'id': productId},
					form: {
						"description": 'this is a dummy updated description',
						"name": "test product updated"
					}
				};
				executeMyRequest(params, 'product/update', 'put', function (body) {
					assert.ok(body);
					assert.deepEqual(body.errors.details[0],
						{"code": 501, "message": "This record is locked. You cannot modify or delete it"});
					done();
				});

			});

			it("Fail - locked - delete product", function (done) {
				var params = {
					qs: {'id': productId}
				};
				executeMyRequest(params, 'product/delete', 'delete', function (body) {
					assert.ok(body);
					assert.deepEqual(body.errors.details[0],
						{"code": 501, "message": "This record is locked. You cannot modify or delete it"});
					done();
				});
			});
		});

		describe("package", function () {
			it("FAIL - locked. cant add package", function (done) {
				var params = {
					qs: {'id': productId},
					form: {
						"code": "BSIC",
						"name": "basic package",
						"description": 'this is a dummy description',
						"_TTL": '12',
						"acl": {
							"urac": {}
						}
					}
				};
				executeMyRequest(params, 'product/packages/add', 'post', function (body) {
					assert.ok(body);
					assert.deepEqual(body.errors.details[0],
						{"code": 501, "message": "This record is locked. You cannot modify or delete it"});
					done();
				});
			});

			it("FAIL - locked. cant update package", function (done) {
				var params = {
					qs: {'id': productId, "code": "DEFLT"},
					form: {
						"name": "basic package 2",
						"description": 'this is a dummy updated description',
						"_TTL": '24',
						"acl": {
							"urac": {}
						}
					}
				};
				executeMyRequest(params, 'product/packages/update', 'put', function (body) {
					assert.ok(body);
					assert.deepEqual(body.errors.details[0], {
						"code": 501,
						"message": "This record is locked. You cannot modify or delete it"
					});
					done();
				});
			});

			it("FAIL - locked. cant delete package", function (done) {
				var params = {
					qs: {"id": productId, 'code': 'DEFLT'}
				};
				executeMyRequest(params, 'product/packages/delete', 'delete', function (body) {
					assert.ok(body);
					assert.deepEqual(body.errors.details[0], {
						"code": 501,
						"message": "This record is locked. You cannot modify or delete it"
					});
					done();
				});
			});
		});
	});

	describe("tenants tests", function () {
		var tenantId, applicationId, key;
		var appExtKey;
		describe("tenant", function () {
			it('mongo test', function (done) {
				mongo.findOne('tenants', {'code': 'DBTN'}, function (error, tenantRecord) {
					assert.ifError(error);
					tenantId = tenantRecord._id.toString();
					applicationId = tenantRecord.applications[0].appId.toString();
					key = tenantRecord.applications[0].keys[0].key;
					appExtKey = tenantRecord.applications[0].keys[0].extKeys[0].extKey;
					done();
				});

			});

			it("FAIL - locked. - cant update tenant", function (done) {
				var params = {
					qs: {"id": tenantId},
					form: {
						"description": 'this is a dummy updated description',
						"name": "test tenant updated"
					}
				};
				executeMyRequest(params, 'tenant/update', 'put', function (body) {
					assert.ok(body);
					done();
				});

			});

			it("FAIL - locked. cant delete tenant", function (done) {
				executeMyRequest({'qs': {id: tenantId}}, 'tenant/delete/', 'delete', function (body) {
					assert.ok(body);
					assert.deepEqual(body.errors.details[0],
						{"code": 501, "message": "This record is locked. You cannot modify or delete it"});
					done();
				});
			});

		});

		describe("oauth", function () {

			it("FAIL - locked. cant add oauth", function (done) {
				var params = {
					qs: {
						'id': tenantId
					},
					form: {
						"secret": "my secret key",
						"redirectURI": "http://www.myredirecturi.com/",
						"oauthType" : "urac",
						"availableEnv" : ["dashboard","dev","stg"]
					}
				};
				executeMyRequest(params, 'tenant/oauth/add/', 'post', function (body) {
					assert.ok(body);
					assert.deepEqual(body.errors.details[0], {
						"code": 501,
						"message": "This record is locked. You cannot modify or delete it"
					});
					done();
				});
			});

			it("FAIL - locked. cant update oauth", function (done) {
				var params = {
					qs: {id: tenantId},
					form: {
						"secret": "my secret key",
						"redirectURI": "http://www.myredirecturi.com/",
						"oauthType" : "urac",
						"availableEnv" : ["dashboard","dev","stg"]
					}
				};
				executeMyRequest(params, 'tenant/oauth/update/', 'put', function (body) {
					assert.ok(body);
					assert.deepEqual(body.errors.details[0], {
						"code": 501,
						"message": "This record is locked. You cannot modify or delete it"
					});
					done();
				});
			});

			it("FAIL - locked. - cant delete oauth", function (done) {
				executeMyRequest({qs: {id: tenantId}}, 'tenant/oauth/delete/', 'delete', function (body) {
					assert.ok(body);
					assert.deepEqual(body.errors.details[0], {
						"code": 501,
						"message": "This record is locked. You cannot modify or delete it"
					});
					done();
				});
			});

		});

		describe("applications", function () {

			describe("add applications tests", function () {
				it("FAIL - locked. - cant add application", function (done) {
					var params = {
						qs: {'id': tenantId},
						form: {
							"productCode": "TPROD",
							"packageCode": "BASIC",
							"description": "this is a dummy description",
							"_TTL": '12'
						}
					};
					executeMyRequest(params, 'tenant/application/add', 'post', function (body) {
						assert.ok(body);
						assert.deepEqual(body.errors.details[0],
							{"code": 501, "message": "This record is locked. You cannot modify or delete it"});
						done();
					});
				});

			});

			describe("update applications tests", function () {
				it("FAIL - locked. - cant update application", function (done) {
					var params = {
						qs: {'id': tenantId, 'appId': applicationId},
						form: {
							"productCode": "DSBRD",
							"packageCode": "DEFLT",
							"description": "this is a dummy description updated",
							"_TTL": '24',
							"acl": {
								"urac": {}
							}
						}
					};
					executeMyRequest(params, 'tenant/application/update', 'put', function (body) {
						assert.ok(body);
						assert.deepEqual(body.errors.details[0],
							{"code": 501, "message": "This record is locked. You cannot modify or delete it"});
						done();
					});
				});

			});

			describe("delete applications tests", function () {

				it("FAIL - locked. - will delete application", function (done) {
					executeMyRequest({
						qs: {
							'id': tenantId,
							'appId': applicationId
						}
					}, 'tenant/application/delete/', 'delete', function (body) {
						assert.ok(body);
						assert.deepEqual(body.errors.details[0],
							{"code": 501, "message": "This record is locked. You cannot modify or delete it"});
						done();
					});
				});

			});


		});

		describe("application keys", function () {
			describe("add application keys", function () {
				it("FAIL - cant add key", function (done) {
					var params = {
						qs: {
							'id': tenantId,
							'appId': applicationId
						}
					};
					executeMyRequest(params, 'tenant/application/key/add', 'post', function (body) {
						assert.ok(body);
						assert.deepEqual(body.errors.details[0],
							{"code": 501, "message": "This record is locked. You cannot modify or delete it"});
						done();
					});
				});

			});

			describe("delete application keys", function () {
				it("FAIL - cant delete key", function (done) {
					var params = {
						qs: {
							'id': tenantId,
							'appId': applicationId,
							'key': key.toString()
						}
					};
					executeMyRequest(params, 'tenant/application/key/delete', 'delete', function (body) {
						assert.ok(body);
						assert.deepEqual(body.errors.details[0],
							{"code": 501, "message": "This record is locked. You cannot modify or delete it"});
						done();
					});
				});

			});

		});

		describe("application ext keys", function () {

			describe("add application ext keys", function () {
				it("FAIL - cant add ext key", function (done) {
					var params = {
						qs: {
							id: tenantId,
							appId: applicationId,
							key: key
						},
						form: {
							'expDate': expDateValue,
							'device': {},
							'geo': {},
							'env': 'DASHBOARD'
						}
					};
					executeMyRequest(params, 'tenant/application/key/ext/add/', 'post', function (body) {
						assert.ok(body);
						assert.deepEqual(body.errors.details[0],
							{"code": 501, "message": "This record is locked. You cannot modify or delete it"});
						done();
					});
				});

			});

			describe("update application ext keys", function () {
				it("FAIL - cant update ext key", function (done) {
					var params = {
						qs: {
							id: tenantId,
							appId: applicationId,
							key: appExtKey,
							extKeyEnv: 'DASHBOARD'
						},
						form: {
							'extKey': appExtKey,
							'expDate': expDateValue,
							'device': {},
							'geo': {}
						}
					};
					executeMyRequest(params, 'tenant/application/key/ext/update/', 'put', function (body) {
						assert.ok(body);
						assert.deepEqual(body.errors.details[0],
							{"code": 501, "message": "This record is locked. You cannot modify or delete it"});
						done();
					});
				});

			});

			describe("delete application ext keys", function () {
				it("FAIL - cant delete ext key", function (done) {
					var params = {
						qs: {
							id: tenantId,
							appId: applicationId,
							key: key
						},
						form: {
							'extKey': appExtKey,
							'extKeyEnv': 'DASHBOARD'
						}
					};
					executeMyRequest(params, 'tenant/application/key/ext/delete/', 'post', function (body) {
						assert.ok(body);
						assert.deepEqual(body.errors.details[0],
							{"code": 501, "message": "This record is locked. You cannot modify or delete it"});
						done();
					});
				});
			});


		});

		describe("application config", function () {
			describe("update application config", function () {
				it("FAIL - cant update configuration", function (done) {
					var params = {
						qs: {
							id: tenantId,
							appId: applicationId,
							key: key,
							extKeyEnv: 'DASHBOARD'
						},
						form: {
							'envCode': 'DEV',
							'config': {}
						}
					};
					executeMyRequest(params, 'tenant/application/key/config/update', 'put', function (body) {
						assert.ok(body);
						done();
					});
				});

			});

		});
	});

	describe("dashboard keys tests", function () {

		var keys = [];
		it("success - ext Key list", function (done) {
			executeMyRequest({}, 'tenant/db/keys/list', 'get', function (body) {
				assert.equal(body.result, true);
				assert.ok(body.data);
				assert.equal(body.data.length, 1);
				keys = body.data;
				done();
			});
		});
	});

	describe("owner tests", function () {
		var access_token;
		var Authorization;
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

		it("get token owner user", function (done) {
			var options = {
				uri: 'http://localhost:4000/oauth/token',
				headers: {
					'Content-Type': 'application/json',
					'key': newKey,
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
				assert.ok(body.access_token);
				access_token = body.access_token;
				done();
			});
		});

		it("success - locked. cant delete package", function (done) {
			var params = {
				'headers': {
					'key': newKey
				},
				qs: {
					'access_token': access_token,
					'id': productId,
					"code": "CLIENT"
				}
			};
			executeMyRequest(params, 'product/packages/delete', 'delete', function (body) {
				assert.ok(body);
				assert.ok(body.data);
				done();
			});
		});

		it("get tenant acl owner", function (done) {
			executeMyRequest({
				'headers': {
					'key': newKey
				},
				'qs': {
					'access_token': access_token,
					'id': '551286bce603d7e01ab1688e'
				}
			}, 'tenant/acl/get', 'post', function (body) {
				assert.equal(body.result, true);
				assert.ok(body.data);
				done();
			});
		});
		
		describe("test with user 1", function () {
			var access_token2;

			it("login test user", function (done) {
				var options = {
					uri: 'http://localhost:4000/oauth/token',
					headers: {
						'Content-Type': 'application/json',
						'key': extKey,
						'Authorization': Authorization
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
					access_token2 = body.access_token;
					done();
				});
			});

			// it("will get user permissions", function (done) {
			// 	executeMyRequest({
			// 		'qs': {
			// 			'access_token': access_token2
			// 		},
			// 		'headers': {
			// 			'key': extKey
			// 		}
			// 	}, 'permissions/get', 'get', function (body) {
			// 		assert.equal(body.result, true);
			// 		assert.ok(body.data);
			// 		done();
			// 	});
			// });

		});

		describe("test with user 2", function () {
			var access_token2;

			it("login test user2", function (done) {
				var options = {
					uri: 'http://localhost:4000/oauth/token',
					headers: {
						'Content-Type': 'application/json',
						'key': extKey,
						'Authorization': Authorization
					},
					body: {
						"username": "user2",
						"password": "123456",
						"grant_type": "password"
					},
					json: true
				};

				request.post(options, function (error, response, body) {
					assert.ifError(error);
					assert.ok(body);
					access_token2 = body.access_token;
					done();
				});
			});

		});

	});
});
