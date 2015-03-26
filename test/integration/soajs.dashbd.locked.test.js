"use strict";
var assert = require('assert');
var request = require("request");
var soajs = require('soajs');
var helper = require("../helper.js");
//var shell = require('shelljs');
var controller, dashboard;

var config = helper.requireModule('./service/config');
var errorCodes = config.errors;

var Mongo = soajs.mongo;
var dbConfig = require("./db.config.test.js");

var dashboardConfig = dbConfig();
dashboardConfig.name = "core_provision";
var mongo = new Mongo(dashboardConfig);

var sampleData = require("soajs.mongodb.data/modules/oauth");

var extKey = 'aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac';

function executeMyRequest(params, apiPath, method, cb) {
	requester(apiPath, method, params, function(error, body) {
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

		if(params.headers) {
			for(var h in params.headers) {
				if(params.headers.hasOwnProperty(h)) {
					options.headers[h] = params.headers.h;
				}
			}
		}

		if(params.form) {
			options.body = params.form;
		}

		if(params.qs) {
			options.qs = params.qs;
		}
		request[method](options, function(error, response, body) {
			assert.ifError(error);
			assert.ok(body);
			return cb(null, body);
		});
	}
}

describe("importing sample data", function() {
	/*
	before(function(done){
		mongo.dropDatabase(function(error){
			assert.ifError(error);
			done();
		});
	});

	it("do import", function(done) {
		shell.pushd(sampleData.dir);
		shell.exec("chmod +x " + sampleData.shell, function(code) {
			assert.equal(code, 0);
			shell.exec(sampleData.shell, function(code) {
				assert.equal(code, 0);
				shell.popd();
				done();
			});
		});
	});
	*/
	after(function(done) {
		console.log('test data imported.');
		controller = require("soajs.controller");
		dashboard = helper.requireModule('./service/index');
		console.log('starting tests ....');
		setTimeout(function() {
			done();
		}, 2000);
	});
});

describe("DASHBOARD UNIT TESTS", function() {
	var expDateValue = new Date().toISOString();

	describe("environment tests", function() {
		var envId;
		describe("add environment tests", function() {
			it("success - will add environment", function(done) {
				var params = {
					form: {
						"code": "DEV",
						"locked":true,
						"description": 'this is a dummy description',
						"ips": ['127.0.0.1', '192.168.0.1']
					}
				};
				executeMyRequest(params, 'environment/add', 'post', function(body) {
					console.log(JSON.stringify(body));
					assert.ok(body.data);
					done();
				});
			});


			it('mongo test', function(done) {
				mongo.find('environment', {}, {}, function(error, records) {
					assert.ifError(error);
					assert.ok(records);
					assert.equal(records.length, 1);
					delete records[0]._id;
					assert.deepEqual(records[0], {
						"code": "DEV",
						"description": "this is a dummy description",
						"ips": ['127.0.0.1', '192.168.0.1']
					});
					done();
				});
			});
		});

		describe("update environment tests", function() {
			it("success - will update environment", function(done) {
				mongo.findOne('environment', {'code': 'DEV'}, function(error, envRecord) {
					assert.ifError(error);
					envId = envRecord._id.toString();
					var params = {
						qs: {"id": envId},
						form: {
							"description": 'this is a dummy updated description',
							"ips": ['127.0.0.1', '192.168.0.1']
						}
					};
					executeMyRequest(params, 'environment/update', 'post', function(body) {
						assert.ok(body.data);
						done();
					});
				});
			});





			it('mongo test', function(done) {
				mongo.find('environment', {}, {}, function(error, records) {
					assert.ifError(error);
					assert.ok(records);
					assert.equal(records.length, 1);
					delete records[0]._id;
					assert.deepEqual(records[0], {
						"code": "DEV",
						"description": "this is a dummy updated description",
						"ips": ['127.0.0.1', '192.168.0.1']
					});
					done();
				});
			});
		});

		describe("delete environment tests", function() {




			it("success - will update environment", function(done) {
				var params = {
					qs: {'id': envId}
				};
				executeMyRequest(params, 'environment/delete', 'get', function(body) {
					assert.ok(body.data);
					done();
				});
			});

			it('mongo test', function(done) {
				mongo.find('environment', {}, {}, function(error, records) {
					assert.ifError(error);
					assert.ok(records);
					assert.equal(records.length, 0);
					done();
				});
			});
		});


	});

	describe("products tests", function() {
		var productId;

		describe("product", function() {
			before(function(done){
				mongo.remove('products', {}, function(error){
					assert.ifError(error);
					done();
				});
			});
			describe("add product tests", function() {
				it("success - will add product", function(done) {
					var params = {
						form: {
							"code": "TPROD",
							"locked": true,
							"name": 'test product',
							"description": 'this is a dummy description'
						}
					};
					executeMyRequest(params, 'product/add', 'post', function(body) {
						assert.ok(body.data);
						done();
					});
				});

				// product/get

				it('mongo test', function(done) {
					mongo.find('products', {}, {}, function(error, records) {
						assert.ifError(error);
						assert.ok(records);
						assert.equal(records.length, 1);
						delete records[0]._id;
						assert.deepEqual(records[0], {
							"code": "TPROD",
							"name": "test product",
							"description": "this is a dummy description",
							"packages": []
						});
						done();
					});
				});
			});

			describe("update product tests", function() {
				it("success - will update product", function(done) {
					mongo.findOne('products', {'code': 'TPROD'}, function(error, productRecord) {
						assert.ifError(error);
						productId = productRecord._id.toString();
						var params = {
							qs: {'id': productId},
							form: {
								"id": productId,
								"description": 'this is a dummy updated description',
								"name": "test product updated"
							}
						};
						executeMyRequest(params, 'product/update', 'post', function(body) {
							assert.ok(body.data);

							done();
						});
					});
				});


			});

			describe("delete product tests", function() {
				it("success - will delete product", function(done) {
					var params = {
						qs: {'id': productId}
					};
					executeMyRequest(params, 'product/delete', 'get', function(body) {
						assert.ok(body.data);

						done();
					});
				});


			});

			describe("list product tests", function() {
				it("success - will get empty list", function(done) {
					executeMyRequest({}, 'product/list', 'get', function(body) {
						assert.ok(body.data);
						assert.equal(body.data.length, 0);

						done();
					});
				});

			});
		});

		describe("package", function() {
			describe("add package tests", function() {
				it("FAIL - locked. cant add package", function(done) {
					var params = {
						qs: {'id': productId},
						form: {
							"code": "BASIC",
							"name": "basic package",
							"description": 'this is a dummy description',
							"_TTL": '12',
							"acl": {
								"urac": {
									'access': false,
									'apis': {
										'/account/changeEmail': {
											'access': true
										}
									}
								}
							}
						}
					};
					executeMyRequest(params, 'product/packages/add', 'post', function(body) {
						assert.ok(body.data);
						done();
					});
				});

			});

			describe("update package tests", function() {
				it("FAIL - locked. cant update package", function(done) {
					var params = {
						qs: {'id': productId, "code": "BASIC"},
						form: {
							"name": "basic package 2",
							"description": 'this is a dummy updated description',
							"_TTL": '24',
							"acl": {
								"urac": {
									'access': false,
									'apis': {
										'/account/changeEmail': {
											'access': true
										}
									}
								}
							}
						}
					};
					executeMyRequest(params, 'product/packages/update', 'post', function(body) {
						assert.ok(body.data);
						done();
					});
				});

			});

			describe("delete package tests", function() {

				it("FAIL - locked. cant delete package", function(done) {
					var params = {
						qs: {"id": productId, 'code': 'BASIC'}
					};
					executeMyRequest(params, 'product/packages/delete', 'get', function(body) {
						assert.ok(body.data);

						done();
					});
				});

				it('mongo test', function(done) {
					mongo.find('products', {}, {}, function(error, records) {
						assert.ifError(error);
						assert.ok(records);
						assert.equal(records.length, 1);
						assert.equal(records[0].packages.length, 0);
						done();
					});
				});
			});

			describe("list package tests", function() {

			});
		});
	});

	describe("tenants tests", function() {
		var tenantId, applicationId, key;

		describe("tenant", function() {
			describe("add tenant tests", function() {
				it("success - will add tenant", function(done) {
					var params = {
						form: {
							"code": "TEST",
							"name": 'test tenant',
							"description": 'this is a dummy description'
						}
					};
					executeMyRequest(params, 'tenant/add', 'post', function(body) {
						assert.ok(body.data);
						done();
					});
				});



				it('mongo test', function(done) {
					mongo.find('tenants', {}, {}, function(error, records) {
						assert.ifError(error);
						assert.ok(records);
						assert.equal(records.length, 2);
						delete records[1]._id;
						assert.deepEqual(records[1], {
							"code": "TEST",
							"name": "test tenant",
							"description": "this is a dummy description",
							"applications": [],
							"oauth": {}
						});
						done();
					});
				});
			});

			describe("update tenant tests", function() {


				it("FAIL - locked. - cant update tenant", function(done) {
					mongo.findOne('tenants', {'code': 'TEST'}, function(error, tenantRecord) {
						assert.ifError(error);
						tenantId = tenantRecord._id.toString();

						var params = {
							qs: {"id": tenantId},
							form: {
								"description": 'this is a dummy updated description',
								"name": "test tenant updated"
							}
						};
						executeMyRequest(params, 'tenant/update', 'post', function(body) {
							assert.ok(body.data);

							done();
						});
					});
				});


				it('mongo test', function(done) {
					mongo.find('tenants', {}, {}, function(error, records) {
						assert.ifError(error);
						assert.ok(records);
						assert.equal(records.length, 2);
						delete records[1]._id;
						assert.deepEqual(records[1], {
							"code": "TEST",
							"name": "test tenant updated",
							"description": "this is a dummy updated description",
							"applications": [],
							"oauth": {}
						});
						done();
					});
				});
			});

			describe("delete tenant tests", function() {

				it("FAIL - locked. cant delete tenant", function(done) {
					executeMyRequest({'qs': {id: tenantId}}, 'tenant/delete/', 'get', function(body) {
						assert.ok(body.data);

						done();
					});
				});

				it('mongo test', function(done) {
					mongo.find('tenants', {}, {}, function(error, records) {
						assert.ifError(error);
						assert.ok(records);
						assert.equal(records.length, 1);
						done();
					});
				});
			});

			describe("list tenant tests", function() {

			});
		});

		describe("oauth", function() {
			describe("add oauth tests", function() {
				it("FAIL - locked. cant add oauth", function(done) {
					var params = {
						qs: {
							'id': tenantId
						},
						form: {
							"secret": "my secret key",
							"redirectURI": "http://www.myredirecturi.com/"
						}
					};
					executeMyRequest(params, 'tenant/oauth/add/', 'post', function(body) {
						assert.ok(body.data);
						done();
					});
				});

				it('mongo test', function(done) {
					mongo.find('tenants', {}, {}, function(error, records) {
						assert.ifError(error);
						assert.ok(records);
						assert.equal(records.length, 2);
						assert.ok(records[1].oauth);

						assert.deepEqual(records[1].oauth, {
							"secret": "my secret key",
							"redirectURI": "http://www.myredirecturi.com/",
							"grants": ["password", "refresh_token"]
						});
						done();
					});
				});
			});

			describe("update oauth tests", function() {
				it("FAIL - locked. cant update oauth", function(done) {
					var params = {
						qs: {id: tenantId},
						form: {
							"secret": "my secret key",
							"redirectURI": "http://www.myredirecturi.com/"
						}
					};
					executeMyRequest(params, 'tenant/oauth/update/', 'post', function(body) {
						assert.ok(body.data);

						done();
					});
				});

			});

			describe("delete oauth tests", function() {
				it("FAIL - locked. - cant delete oauth", function(done) {
					executeMyRequest({qs: {id: tenantId}}, 'tenant/oauth/delete/', 'get', function(body) {
						assert.ok(body.data);
						done();
					});
				});

			});

			describe("list oauth tests", function() {

			});
		});

		describe("applications", function() {

			describe("add applications tests", function() {
				it("FAIL - locked. - cant add application", function(done) {
					var params = {
						qs: {'id': tenantId},
						form: {
							"productCode": "TPROD",
							"packageCode": "BASIC",
							"description": "this is a dummy description",
							"_TTL": '12'
						}
					};
					executeMyRequest(params, 'tenant/application/add', 'post', function(body) {
						assert.ok(body.data);
						done();
					});
				});

				it('mongo test', function(done) {
					mongo.find('tenants', {}, {}, function(error, records) {
						assert.ifError(error);
						assert.ok(records);
						assert.equal(records.length, 2);
						assert.ok(records[1].applications);
						assert.equal(records[1].applications.length, 1);
						applicationId = records[1].applications[0].appId.toString();
						delete records[1].applications[0].appId;
						assert.deepEqual(records[1].applications[0], {
							"product": "TPROD",
							"package": "TPROD_BASIC",
							"description": "this is a dummy description",
							"_TTL": 12 * 3600,
							'keys': []
							//"acl": {
							//	"urac": {
							//		'access': false,
							//		'apis': {
							//			'/account/changeEmail': {
							//				'access': true
							//			}
							//		}
							//	}
							//}
						});
						done();
					});
				});
			});

			describe("update applications tests", function() {
				it("FAIL - locked. - will update application", function(done) {
					var params = {
						qs: {'id': tenantId, 'appId': applicationId},
						form: {
							"productCode": "TPROD",
							"packageCode": "BASIC",
							"description": "this is a dummy description updated",
							"_TTL": '24',
							"acl": {
								"urac": {}
							}
						}
					};
					executeMyRequest(params, 'tenant/application/update', 'post', function(body) {
						assert.ok(body.data);
						done();
					});
				});


				it('mongo test', function(done) {
					mongo.find('tenants', {}, {}, function(error, records) {
						assert.ifError(error);
						assert.ok(records);
						assert.equal(records.length, 2);
						assert.ok(records[1].applications);
						assert.ok(records[1].applications.length, 2);
						delete records[1].applications[0].appId;
						assert.deepEqual(records[1].applications[0], {
							"product": "TPROD",
							"package": "TPROD_BASIC",
							"description": "this is a dummy description updated",
							"_TTL": 24 * 3600,
							'keys': [],
							"acl": {
								"urac": {}
							}
							//"acl": {
							//	"urac": {
							//		'access': false,
							//		'apis': {
							//			'/account/changeEmail': {
							//				'access': true
							//			}
							//		}
							//	}
							//}
						});
						done();
					});
				});
			});

			describe("delete applications tests", function() {

				it("FAIL - locked. - will delete application", function(done) {
					executeMyRequest({qs: {'id': tenantId, 'appId': applicationId}}, 'tenant/application/delete/', 'get', function(body) {
						assert.ok(body.data);
						done();
					});
				});

				it('mongo test', function(done) {
					mongo.find('tenants', {}, {}, function(error, records) {
						assert.ifError(error);
						assert.ok(records);
						assert.equal(records.length, 2);
						assert.equal(records[1].applications.length, 0);
						done();
					});
				});
			});


		});

		describe("application keys", function() {
			describe("add application keys", function() {
				it("success - will add key", function(done) {
					var params = {
						qs: {
							'id': tenantId,
							'appId': applicationId
						}
					};
					executeMyRequest(params, 'tenant/application/key/add', 'post', function(body) {
						assert.ok(body.data);
						done();
					});
				});

				it('mongo test', function(done) {
					mongo.find('tenants', {}, {}, function(error, records) {
						assert.ifError(error);
						assert.ok(records);
						assert.equal(records.length, 2);
						assert.ok(records[1].applications);
						assert.equal(records[1].applications.length, 1);
						assert.equal(records[1].applications[0].keys.length, 1);
						assert.ok(records[1].applications[0].keys[0].key);
						key = records[1].applications[0].keys[0].key;
						done();
					});
				});

			});

			describe("delete application keys", function() {
				it("success - will add key", function(done) {
					var params = {
						qs: {
							'id': tenantId,
							'appId': applicationId,
							'key': key.toString()
						}
					};
					executeMyRequest(params, 'tenant/application/key/delete', 'get', function(body) {
						assert.ok(body.data);
						done();
					});
				});

				it('mongo test', function(done) {
					mongo.find('tenants', {}, {}, function(error, records) {
						assert.ifError(error);
						assert.ok(records);
						assert.equal(records.length, 2);
						assert.ok(records[1].applications);
						assert.equal(records[1].applications.length, 1);
						assert.equal(records[1].applications[0].keys.length, 0);
						done();
					});
				});
			});


		});

		describe("application ext keys", function() {
			var extKey;
			describe("add application ext keys", function() {
				it("success - will add ext key", function(done) {
					var params = {
						qs: {
							id: tenantId,
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
							}
						}
					};
					executeMyRequest(params, 'tenant/application/key/ext/add/', 'post', function(body) {
						console.log(JSON.stringify(body));
						assert.ok(body.data);
						done();
					});
				});

			});

			describe("update application ext keys", function() {
				it("success - will update ext key", function(done) {
					var params = {
						qs: {
							id: tenantId,
							appId: applicationId,
							key: key
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
					executeMyRequest(params, 'tenant/application/key/ext/update/', 'post', function(body) {
						assert.ok(body.data);
						done();
					});
				});

			});

			describe("delete application ext keys", function() {
				it("success - will delete ext key", function(done) {
					var params = {
						qs: {
							id: tenantId,
							appId: applicationId,
							key: key
						},
						form: {
							'extKey': extKey
						}
					};
					executeMyRequest(params, 'tenant/application/key/ext/delete/', 'post', function(body) {
						assert.ok(body.data);
						done();
					});
				});
			});


		});

		describe("application config", function() {
			describe("update application config", function() {
				it("success - will update configuration", function(done) {
					var params = {
						qs: {
							id: tenantId,
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
					executeMyRequest(params, 'tenant/application/key/config/update', 'post', function(body) {
						assert.ok(body.data);
						done();
					});
				});

			});

		});
	});

	describe('mongo check db', function() {
		it('asserting environment record', function(done) {
			mongo.find('environment', {}, {}, function(error, record) {
				assert.ifError(error);
				assert.ok(record);
				assert.ok(record[0]);
				delete record[0]._id;
				assert.deepEqual(record[0], {
					"code": "DEV",
					"description": 'this is a dummy description',
					"ips": ['127.0.0.1', '192.168.0.1']
				});
				done();
			});
		});



	});
});