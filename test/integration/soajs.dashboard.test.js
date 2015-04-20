"use strict";
var assert = require('assert');
var request = require("request");
var soajs = require('soajs');
var helper = require("../helper.js");
var shell = require('shelljs');
var dashboard;

var config = helper.requireModule('./service/config');
var errorCodes = config.errors;

var Mongo = soajs.mongo;
var dbConfig = require("./db.config.test.js");

var dashboardConfig = dbConfig();
dashboardConfig.name = "core_provision";
var mongo = new Mongo(dashboardConfig);

var sampleData = require("soajs.mongodb.data/modules/dashboard");

var extKey = 'aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac';

function executeMyRequest(params, apiPath, method, cb) {
	requester(apiPath, method, params, function(error, body) {
		assert.ifError(error);
		assert.ok(body);
		return cb(body);
	});

	function requester(apiName, method, params, cb) {
		var options = {
			uri: 'http://localhost:4003/' + apiName,
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

	before(function(done) {
		mongo.dropDatabase(function(error) {
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

	after(function(done) {
		console.log('test data imported.');
		dashboard = helper.requireModule('./service/index');
		console.log('starting tests ....');
		setTimeout(function() {
			done();
		}, 1500);
	});
});

describe("DASHBOARD UNIT TSTNS", function() {
	var expDateValue = new Date().toISOString();
	var envId;
	describe("environment tests", function() {
		
		before(function(done) {
			mongo.remove('environment', {}, function(error) {
				assert.ifError(error);
				done();
			});
		});

		describe("add environment tests", function() {
			it("success - will add environment", function(done) {
				var params = {
					form: {
						"code": "DEV",
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

			it('fail - missing params', function(done) {
				var params = {
					form: {
						"description": 'this is a dummy description',
						"ips": ['127.0.0.1', '192.168.0.1']
					}
				};
				executeMyRequest(params, 'environment/add', 'post', function(body) {
					assert.deepEqual(body.errors.details[0], {"code": 172, "message": "Missing required field: code"});

					done();
				});
			});

			it('fail - environment exists', function(done) {
				var params = {
					form: {
						"code": "DEV",
						"description": 'this is a dummy description',
						"ips": ['127.0.0.1', '192.168.0.1']
					}
				};
				executeMyRequest(params, 'environment/add', 'post', function(body) {
					assert.deepEqual(body.errors.details[0], {"code": 403, "message": errorCodes[403]});

					done();
				});
			});

			it('mongo test', function(done) {
				mongo.findOne('environment', {'code': 'DEV'}, function(error, envRecord) {
					assert.ifError(error);
					envId = envRecord._id.toString();
					delete envRecord._id;
					assert.deepEqual(envRecord, {
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

			it('fail - missing params', function(done) {
				var params = {
					qs: {"id": envId},
					form: {
						"description": 'this is a dummy description'
						//"ips": ['127.0.0.1', '192.168.0.1']
					}
				};
				executeMyRequest(params, 'environment/update', 'post', function(body) {
					assert.deepEqual(body.errors.details[0], {"code": 172, "message": "Missing required field: ips"});
					done();
				});
			});

			it('fail - invalid environment id provided', function(done) {
				var params = {
					qs: {"id": "aaaabbbbccc"},
					form: {
						"description": 'this is a dummy description',
						"ips": ['127.0.0.1', '192.168.0.1']
					}
				};
				executeMyRequest(params, 'environment/update', 'post', function(body) {
					assert.deepEqual(body.errors.details[0], {"code": 405, "message": errorCodes[405]});
					done();
				});
			});

			it('mongo test', function(done) {
				mongo.findOne('environment', {'code': 'DEV'}, function(error, envRecord) {
					assert.ifError(error);
					envId = envRecord._id.toString();
					delete envRecord._id;
					assert.deepEqual(envRecord, {
						"code": "DEV",
						"description": "this is a dummy updated description",
						"ips": ['127.0.0.1', '192.168.0.1']
					});
					done();
				});

			});
		});

		describe("delete environment tests", function() {
			it('fail - missing params', function(done) {
				var params = {
					qs: {}
				};
				executeMyRequest(params, 'environment/delete', 'get', function(body) {
					assert.deepEqual(body.errors.details[0], {"code": 172, "message": "Missing required field: id"});
					done();
				});
			});

			it('fail - invalid environment id provided', function(done) {
				var params = {
					qs: {'id': 'aaaabbcdddd'}
				};
				executeMyRequest(params, 'environment/delete', 'get', function(body) {
					assert.deepEqual(body.errors.details[0], {"code": 405, "message": errorCodes[405]});
					done();
				});
			});

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

		describe("list environment tests", function() {
			it("success - will get empty list", function(done) {
				executeMyRequest({}, 'environment/list', 'get', function(body) {
					assert.ok(body.data);
					assert.equal(body.data.length, 0);
					done();
				});
			});
			it("success - will add environment", function(done) {
				var params = {
					form: {
						"code": "DEV",
						"description": 'this is a dummy description',
						"ips": ['127.0.0.1', '192.168.0.1']
					}
				};
				executeMyRequest(params, 'environment/add', 'post', function(body) {
					assert.ok(body.data);
					done();
				});
			});
			it("success - will list environment", function(done) {
				executeMyRequest({}, 'environment/list', 'get', function(body) {
					assert.ok(body.data);
					assert.equal(body.data.length, 1);
					delete body.data[0]._id;
					assert.deepEqual(body.data[0], {
						"code": "DEV",
						"description": "this is a dummy description",
						"ips": ['127.0.0.1', '192.168.0.1']
					});
					done();
				});
			});
		});
	});

	describe("products tests", function() {
		var productId;

		describe("product", function() {
			before(function(done) {
				mongo.remove('products', {}, function(error) {
					assert.ifError(error);
					done();
				});
			});
			describe("add product tests", function() {
				it("success - will add product", function(done) {
					var params = {
						form: {
							"code": "TPROD",
							"name": 'test product',
							"description": 'this is a dummy description'
						}
					};
					executeMyRequest(params, 'product/add', 'post', function(body) {
						assert.ok(body.data);
						done();
					});
				});

				it('fail - missing params', function(done) {
					var params = {
						form: {
							"name": "test product",
							"description": 'this is a dummy description'
						}
					};
					executeMyRequest(params, 'product/add', 'post', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 172, "message": "Missing required field: code"});

						done();
					});
				});

				it('fail - product exists', function(done) {
					var params = {
						form: {
							"code": "TPROD",
							"name": 'test product',
							"description": 'this is a dummy description'
						}
					};
					executeMyRequest(params, 'product/add', 'post', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 413, "message": errorCodes[413]});

						done();
					});
				});
				// product/get
				
				it('mongo test', function(done) {
					mongo.findOne('products', {'code': 'TPROD'}, function(error, productRecord) {
						assert.ifError(error);
						productId = productRecord._id.toString();
						delete productRecord._id;
						assert.deepEqual(productRecord, {
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
				
				it('success - product/get', function(done) {
					var params = {
						qs: {
							"id": productId
						}
					};
					executeMyRequest(params, 'product/get', 'get', function(body) {
						//assert.deepEqual(body.errors.details[0], {"code": 413, "message": errorCodes[413]});
						console.log(body);
						done();
					});
				});
				
				it('fail - missing params', function(done) {
					var params = {
						qs: {'id': productId},
						form: {
							"description": 'this is a dummy description'
						}
					};
					executeMyRequest(params, 'product/update', 'post', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 172, "message": "Missing required field: name"});

						done();
					});
				});

				it('fail - invalid product id provided', function(done) {
					var params = {
						qs: {'id': 'aaaabbbbccccdddd'},
						form: {
							"description": 'this is a dummy description',
							"name": 'test product updated'
						}
					};
					executeMyRequest(params, 'product/update', 'post', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 409, "message": errorCodes[409]});

						done();
					});
				});

				it('mongo test', function(done) {
					mongo.find('products', {}, {}, function(error, records) {
						assert.ifError(error);
						assert.ok(records);
						assert.equal(records.length, 1);
						delete records[0]._id;
						assert.deepEqual(records[0], {
							"code": "TPROD",
							"name": "test product updated",
							"description": "this is a dummy updated description",
							"packages": []
						});
						done();
					});
				});
			});

			describe("delete product tests", function() {
				it('fail - missing params', function(done) {
					var params = {
						qs: {}
					};
					executeMyRequest(params, 'product/delete', 'get', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 172, "message": "Missing required field: id"});

						done();
					});
				});

				it('fail - invalid product id provided', function(done) {
					var params = {
						qs: {'id': "aaaabbbbccccdddd"}
					};
					executeMyRequest(params, 'product/delete', 'get', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 409, "message": errorCodes[409]});

						done();
					});
				});

				it("success - will delete product", function(done) {
					var params = {
						qs: {'id': productId}
					};
					executeMyRequest(params, 'product/delete', 'get', function(body) {
						assert.ok(body.data);

						done();
					});
				});
				
				it('mongo test', function(done) {
					mongo.find('products', {}, {}, function(error, records) {
						assert.ifError(error);
						assert.ok(records);
						assert.equal(records.length, 0);
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
				it("success - will add product", function(done) {
					var params = {
						form: {
							"code": "TPROD",
							"description": 'this is a dummy description',
							"name": "test product"
						}
					};
					executeMyRequest(params, 'product/add', 'post', function(body) {
						assert.ok(body.data);

						done();
					});
				});
				it("success - will list product", function(done) {
					executeMyRequest({}, 'product/list', 'get', function(body) {
						assert.ok(body.data);
						assert.equal(body.data.length, 1);

						productId = body.data[0]._id.toString();
						delete body.data[0]._id;
						assert.deepEqual(body.data[0], {
							"code": "TPROD",
							"name": "test product",
							"description": "this is a dummy description",
							"packages": []
						});
						done();
					});
				});
			});
		});

		describe("package", function() {
			describe("add package tests", function() {
				it("success - will add package", function(done) {
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
						mongo.findOne('products', {'code': 'TPROD'}, function(error, record) {
							assert.ifError(error);
							delete record._id;
							assert.deepEqual(record.packages[0], {
								"code": "TPROD_BASIC",
								"name": "basic package",
								"description": "this is a dummy description",
								"_TTL": 12 * 3600 * 1000,
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
							});
							done();

						});
					});
				});

				it('fail - missing params', function(done) {
					var params = {
						qs: {'id': productId},
						form: {
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
						assert.deepEqual(body.errors.details[0], {"code": 172, "message": "Missing required field: code"});

						done();
					});
				});

				it('fail - package exists', function(done) {
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
						assert.deepEqual(body.errors.details[0], {"code": 418, "message": errorCodes[418]});

						done();
					});
				});

			});

			describe("update package tests", function() {
				it("success - will update package", function(done) {
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

						mongo.findOne('products', {'code': 'TPROD'}, function(error, record) {
							assert.ifError(error);
							delete record._id;
							assert.deepEqual(record.packages[0], {
								"code": "TPROD_BASIC",
								"name": "basic package 2",
								"description": "this is a dummy updated description",
								"_TTL": 24 * 3600 * 1000,
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
							});
							done();

						});
						

					});
				});

				it('fail - missing params', function(done) {
					var params = {
						qs: {"code": "BASIC2"},
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
						assert.deepEqual(body.errors.details[0], {"code": 172, "message": "Missing required field: id"});

						done();
					});
				});

				it('fail - invalid package code provided', function(done) {
					var params = {
						qs: {'id': productId, "code": "BASI2"},
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
						assert.deepEqual(body.errors.details[0], {"code": 416, "message": errorCodes[416]});

						done();
					});
				});

			});

			describe("delete package tests", function() {
				it('fail - missing params', function(done) {
					var params = {
						qs: {}
					};
					executeMyRequest(params, 'product/packages/delete', 'get', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 172, "message": "Missing required field: code, id"});

						done();
					});
				});

				it('fail - invalid package code provided', function(done) {
					var params = {
						qs: {"id": productId, 'code': 'BASI4'}
					};
					executeMyRequest(params, 'product/packages/delete', 'get', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 419, "message": errorCodes[419]});
						done();
					});
				});

				it("success - will delete package", function(done) {
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
				it("success - will get empty list", function(done) {
					var params = {
						qs: {"id": productId}
					};
					executeMyRequest(params, 'product/packages/list', 'get', function(body) {
						assert.ok(body.data);
						assert.equal(body.data.length, 0);

						done();
					});
				});
				it("success - will add package", function(done) {
					var params = {
						qs: {"id": productId},
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
				it("success - will list package", function(done) {
					var params = {
						qs: {"id": productId, 'code': 'BASIC'}
					};
					executeMyRequest(params, 'product/packages/list', 'get', function(body) {
						assert.ok(body.data);
						assert.equal(body.data.length, 1);
						assert.deepEqual(body.data[0], {
							"code": "TPROD_BASIC",
							"name": "basic package",
							"description": "this is a dummy description",
							"_TTL": 12 * 3600 * 1000,
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
						});
						done();
					});
				});
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
							"code": "TSTN",
							"name": 'test tenant',
							"description": 'this is a dummy description'
						}
					};
					executeMyRequest(params, 'tenant/add', 'post', function(body) {
						assert.ok(body.data);
						done();
					});
				});
				
				it('fail - missing params', function(done) {
					var params = {
						form: {
							"name": "test tenant",
							"description": 'this is a dummy description'
						}
					};
					executeMyRequest(params, 'tenant/add', 'post', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 172, "message": "Missing required field: code"});

						done();
					});
				});

				it('fail - tenant exists', function(done) {
					var params = {
						form: {
							"code": "TSTN",
							"name": 'test tenant',
							"description": 'this is a dummy description'
						}
					};
					executeMyRequest(params, 'tenant/add', 'post', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 423, "message": errorCodes[423]});
						done();
					});
				});

				it('mongo test', function(done) {

					mongo.findOne('tenants', {'code': 'TSTN'}, function(error, tenantRecord) {
						assert.ifError(error);
						tenantId = tenantRecord._id.toString();
						delete tenantRecord._id;
						assert.deepEqual(tenantRecord, {
							"code": "TSTN",
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
				it("success - will update tenant", function(done) {
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
				
				it("success - will get tenant", function(done) {
					var params = {
						qs: {
							"id": tenantId
						}
					};
					executeMyRequest(params, 'tenant/get', 'get', function(body) {
						console.log(body);
						assert.ok(body.data);
						delete body.data._id;
						assert.deepEqual(body.data, {
							"code": "TSTN",
							"name": "test tenant updated",
							"description": "this is a dummy updated description",
							"applications": [],
							"oauth": {}
						});
						done();
					});
				});
				
				it('fail - missing params', function(done) {
					var params = {
						qs: {},
						form: {
							"description": 'this is a dummy description',
							"name": 'test tenant updated'
						}
					};
					executeMyRequest(params, 'tenant/update', 'post', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 172, "message": "Missing required field: id"});
						done();
					});
				});

				it('fail - invalid tenant id provided', function(done) {
					var params = {
						qs: {"id": "aaaabbdd"},
						form: {
							"description": 'this is a dummy description',
							"name": 'test tenant updated'
						}
					};
					executeMyRequest(params, 'tenant/update', 'post', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 438, "message": errorCodes[438]});

						done();
					});
				});

			});

			describe("delete tenant tests", function() {
				it('fail - missing params', function(done) {
					executeMyRequest({}, 'tenant/delete', 'get', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 172, "message": "Missing required field: id"});
						done();
					});
				});

				it('fail - invalid tenant id provided', function(done) {
					executeMyRequest({qs: {id: 'aaaabdddd'}}, 'tenant/delete', 'get', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 438, "message": errorCodes[438]});
						done();
					});
				});

				it("success - will delete tenant", function(done) {
					executeMyRequest({'qs': {id: tenantId}}, 'tenant/delete/', 'get', function(body) {
						assert.ok(body.data);

						done();
					});
				});
				
			});

			describe("list tenant tests", function() {
				it("success - will get empty list", function(done) {
					executeMyRequest({}, 'tenant/list', 'get', function(body) {
						assert.ok(body.data);
						done();
					});
				});
				it("success - will add tenant", function(done) {
					var params = {
						form: {
							"code": "TSTN",
							"description": 'this is a dummy description',
							"name": "test tenant"
						}
					};
					executeMyRequest(params, 'tenant/add', 'post', function(body) {
						assert.ok(body.data);
						mongo.findOne('tenants', {'code': 'TSTN'}, function(error, tenantRecord) {
							assert.ifError(error);
							tenantId = tenantRecord._id.toString();
							console.log(JSON.stringify(tenantRecord));
							done();
						});
					});
				});
				
			});
		});

		describe("oauth", function() {
			describe("add oauth tests", function() {
				it("success - will add oauth", function(done) {
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
						console.log(JSON.stringify(body));
						assert.ok(body.data);

						mongo.findOne('tenants', {'code': 'TSTN'}, function(error, tenantRecord) {
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

				it('fail - missing params', function(done) {
					var params = {
						qs: {},
						form: {
							"secret": "my secret key",
							"redirectURI": "http://www.myredirecturi.com/"
						}
					};
					executeMyRequest(params, 'tenant/oauth/add/', 'post', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 172, "message": "Missing required field: id"});

						done();
					});
				});

			});

			describe("update oauth tests", function() {
				it("success - will update oauth", function(done) {
					var params = {
						qs: {id: tenantId},
						form: {
							"secret": "my secret key",
							"redirectURI": "http://www.myredirecturi2.com/"
						}
					};
					executeMyRequest(params, 'tenant/oauth/update/', 'post', function(body) {
						assert.ok(body.data);
						mongo.findOne('tenants', {'code': 'TSTN'}, function(error, tenantRecord) {
							assert.ifError(error);
							assert.deepEqual(tenantRecord.oauth, {
								"secret": "my secret key",
								"redirectURI": "http://www.myredirecturi2.com/",
								"grants": ["password", "refresh_token"]
							});
							done();
						});
					});
				});

				it('fail - missing params', function(done) {
					var params = {
						qs: {},
						form: {
							"secret": "my secret key",
							"redirectURI": "http://www.myredirecturi.com/"
						}
					};
					executeMyRequest(params, 'tenant/oauth/update', 'post', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 172, "message": "Missing required field: id"});

						done();
					});
				});
			});

			describe("delete oauth tests", function() {
				it('fail - missing params', function(done) {
					executeMyRequest({qs: {}}, 'tenant/oauth/delete', 'get', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 172, "message": "Missing required field: id"});

						done();
					});
				});

				it("success - will delete oauth", function(done) {
					executeMyRequest({qs: {id: tenantId}}, 'tenant/oauth/delete/', 'get', function(body) {
						assert.ok(body.data);
						done();
					});
				});
				
			});

			describe("list oauth tests", function() {
				it("success - will get empty object", function(done) {
					executeMyRequest({qs: {id: tenantId}}, 'tenant/oauth/list/', 'get', function(body) {
						assert.ok(body.data);
						assert.equal(JSON.stringify(body.data), '{}');
						done();
					});
				});
				it("success - will add oauth", function(done) {
					var params = {
						qs: {id: tenantId},
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
				it("success - will get oauth object", function(done) {
					executeMyRequest({qs: {id: tenantId}}, 'tenant/oauth/list/', 'get', function(body) {
						assert.ok(body.data);
						assert.deepEqual(body.data, {
							"secret": "my secret key",
							"redirectURI": "http://www.myredirecturi.com/",
							"grants": ["password", "refresh_token"]
						});
						done();
					});
				});
			});
		});

		describe("oauth users", function() {
			var oauthUserId, oauthUserId2;
			describe("add oauth users tests", function() {
				it("success - will add oauth user", function(done) {
					var params = {
						qs: {
							'id': tenantId
						},
						form: {
							"userId": "oauth_user",
							"password": "password1"
						}
					};

					executeMyRequest(params, 'tenant/oauth/users/add/', 'post', function(body) {
						console.log(JSON.stringify(body));
						assert.ok(body.data);

						mongo.findOne('oauth_urac', {'userId': 'oauth_user'}, function(error, tenantRecord) {
							assert.ifError(error);
							assert.ok(tenantRecord);
							assert.equal(tenantRecord.userId, "oauth_user");
							assert.equal(tenantRecord.tId.toString(), tenantId);
							oauthUserId = tenantRecord._id.toString();
							done();
						});
					});
				});

				it('fail - missing params', function(done) {
					var params = {
						qs: {},
						form: {
							"userId": "oauth_user",
							"password": "password1"
						}
					};
					executeMyRequest(params, 'tenant/oauth/users/add/', 'post', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 172, "message": "Missing required field: id"});

						done();
					});
				});

			});

			describe("update oauth users tests", function() {
				it("success - will update oauth users", function(done) {
					var params = {
						qs: {
							id: tenantId,
							uId: oauthUserId
						},
						form: {
							"userId": "oauth_user_up",
							"password": "password2"
						}
					};
					executeMyRequest(params, 'tenant/oauth/users/update/', 'post', function(body) {
						assert.ok(body.data);
						mongo.findOne('oauth_urac', {'userId': 'oauth_user_up'}, function(error, tenantRecord) {
							assert.ifError(error);
							assert.ok(tenantRecord);
							assert.equal(tenantRecord.userId, 'oauth_user_up');
							assert.equal(tenantRecord.tId.toString(), tenantId);
							oauthUserId2 = tenantRecord._id.toString();
							done();
						});
					});
				});

				it('fail - missing params', function(done) {
					var params = {
						qs: {
							uId: oauthUserId
						},
						form: {
							"userId": "oauth_user_up",
							"password": "password2"
						}
					};
					executeMyRequest(params, 'tenant/oauth/users/update', 'post', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 172, "message": "Missing required field: id"});

						done();
					});
				});

				it('fail - user does not exist', function(done) {
					var params = {
						qs: {
							'id': tenantId,
							uId: '22d2cb5fc04ce51e06000001'
						},
						form: {
							"userId": "invalid",
							"password": "password2"
						}
					};
					executeMyRequest(params, 'tenant/oauth/users/update', 'post', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 447, "message": "Unable to get tenant oAuth Users"});

						done();
					});
				});

				it('fail - invalid userid given', function(done) {
					var params = {
						qs: {
							'id': tenantId,
							'uId': 'invalid'
						},
						form: {
							"userId": "invalid",
							"password": "password2"
						}
					};
					executeMyRequest(params, 'tenant/oauth/users/update', 'post', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 439, "message": "Invalid tenant oauth user Id provided"});

						done();
					});
				});

				it('fail - userid already exist in another account', function(done) {
					var params = {
						qs: {
							'id': tenantId
						},
						form: {
							"userId": "oauth_user2",
							"password": "password1"
						}
					};

					executeMyRequest(params, 'tenant/oauth/users/add/', 'post', function(body) {
						console.log(JSON.stringify(body));
						assert.ok(body.data);


						var params = {
							qs: {
								id: tenantId,
								uId: oauthUserId
							},
							form: {
								"userId": "oauth_user2",
								"password": "password2"
							}
						};
						executeMyRequest(params, 'tenant/oauth/users/update/', 'post', function(body) {
							assert.deepEqual(body.errors.details[0], {"code": 448, "message": "tenant oAuth User already exists"});

							done();
						});
					});
				});
			});

			describe("delete oauth tests", function() {
				it('fail - missing params', function(done) {
					executeMyRequest({qs: {uId: oauthUserId}}, 'tenant/oauth/users/delete', 'get', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 172, "message": "Missing required field: id"});

						done();
					});
				});

				it("success - will delete oauth user", function(done) {
					executeMyRequest({qs: {id: tenantId, 'uId': oauthUserId}}, 'tenant/oauth/users/delete/', 'get', function(body) {
						assert.ok(body.data);
						done();
					});
				});

			});

			describe("list oauth users tests", function() {

				it("success - will get oauth users", function(done) {
					executeMyRequest({qs: {id: tenantId}}, 'tenant/oauth/users/list/', 'get', function(body) {
						assert.ok(body.data);
						assert.equal(body.data.length, 1);
						done();
					});
				});

				it("success - will remove oauth user", function(done) {
					var params = {
						qs: {
							id: tenantId,
							uId: oauthUserId2
						}
					};
					executeMyRequest(params, 'tenant/oauth/users/delete/', 'get', function(body) {
						assert.ok(body.data);
						done();
					});
				});

				it("success - will get empty object", function(done) {
					executeMyRequest({qs: {id: tenantId}}, 'tenant/oauth/users/list/', 'get', function(body) {
						assert.ok(body.data);
						assert.equal(body.data.length, 1);
						done();
					});
				});
			});
		});

		describe("applications", function() {

			describe("add applications tests", function() {
				it("success - will add application", function(done) {
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

				it('fail - missing params', function(done) {
					var params = {
						qs: {},
						form: {
							"productCode": "TPROD",
							"packageCode": "BASIC",
							"description": "this is a dummy description",
							"_TTL": '12'
						}
					};
					executeMyRequest(params, 'tenant/application/add/', 'post', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 172, "message": "Missing required field: id"});

						done();
					});
				});

				//it('fail - application exists', function(done) {
				//	var params = {
				//		qs: {'id': tenantId},
				//		form: {
				//			"productCode": "TPROD",
				//			"packageCode": "BASIC",
				//			"description": "this is a dummy description",
				//			"_TTL": '12'
				//		}
				//	};
				//	executeMyRequest(params, 'tenant/application/add/', 'post', function(body) {
				//		assert.deepEqual(body.errors.details[0], {"code": 433, "message": errorCodes[433]});
				//
				//		done();
				//	});
				//});

				it('fail - invalid product code given', function(done) {
					var params = {
						qs: {'id': tenantId},
						form: {
							"productCode": "INVAL",
							"packageCode": "BASIC",
							"description": "this is a dummy description",
							"_TTL": '12'
						}
					};
					executeMyRequest(params, 'tenant/application/add/', 'post', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 434, "message": errorCodes[434]});

						done();
					});
				});

				it('fail - invalid package code given', function(done) {
					var params = {
						qs: {'id': tenantId},
						form: {
							"productCode": "TPROD",
							"packageCode": "INVAL",
							"description": "this is a dummy description",
							"_TTL": '12'
						}
					};
					executeMyRequest(params, 'tenant/application/add/', 'post', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 434, "message": errorCodes[434]});

						done();
					});
				});

				it('mongo test', function(done) {
					mongo.findOne('tenants', {"code": "TSTN"}, function(error, records) {
						assert.ifError(error);
						assert.ok(records);
						
						assert.ok(records.applications);
						assert.equal(records.applications.length, 1);
						applicationId = records.applications[0].appId.toString();
						delete records.applications[0].appId;
						assert.deepEqual(records.applications[0], {
							"product": "TPROD",
							"package": "TPROD_BASIC",
							"description": "this is a dummy description",
							"_TTL": 12 * 3600 * 1000,
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
				it("success - will update application", function(done) {
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
				it("fail - wrong key", function(done) {
					var params = {
						qs: {'id': tenantId, 'appId': 'fdsffsd'},
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
						console.log(body);
						assert.ok(body.errors);
						done();
					});
				});
				

				it('fail - missing params', function(done) {
					var params = {
						qs: {'id': tenantId, 'appId': applicationId},
						form: {
							"packageCode": "BASIC",
							"description": "this is a dummy description",
							"_TTL": '12'
						}
					};
					executeMyRequest(params, 'tenant/application/update', 'post', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 172, "message": "Missing required field: productCode"});

						done();
					});
				});

				it('fail - invalid product code given', function(done) {
					var params = {
						qs: {'id': tenantId, 'appId': applicationId},
						form: {
							"productCode": "INVAL",
							"packageCode": "BASIC",
							"description": "this is a dummy description",
							"_TTL": '12'
						}
					};
					executeMyRequest(params, 'tenant/application/update', 'post', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 434, "message": errorCodes[434]});

						done();
					});
				});

				it('fail - invalid package code given', function(done) {
					var params = {
						qs: {'id': tenantId, 'appId': applicationId},
						form: {
							"productCode": "TPROD",
							"packageCode": "INVAL",
							"description": "this is a dummy description",
							"_TTL": '12'
						}
					};
					executeMyRequest(params, 'tenant/application/update', 'post', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 434, "message": errorCodes[434]});

						done();
					});
				});

				it('mongo test', function(done) {
					mongo.findOne('tenants', {"code": "TSTN"}, function(error, records) {
						assert.ifError(error);
						assert.ok(records);
						
						assert.ok(records.applications);
						assert.ok(records.applications.length, 2);
						delete records.applications[0].appId;
						assert.deepEqual(records.applications[0], {
							"product": "TPROD",
							"package": "TPROD_BASIC",
							"description": "this is a dummy description updated",
							"_TTL": 24 * 3600 * 1000,
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
				it('fail - missing params', function(done) {
					executeMyRequest({qs: {'id': tenantId}}, 'tenant/application/delete/', 'get', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 172, "message": "Missing required field: appId"});
						done();
					});
				});

				it("success - will delete application", function(done) {
					executeMyRequest({qs: {'id': tenantId, 'appId': applicationId}}, 'tenant/application/delete/', 'get', function(body) {
						assert.ok(body.data);
						done();
					});
				});
				it("fail - wrong key", function(done) {
					executeMyRequest({qs: {'id': tenantId, 'appId': 'fdfdsfs'}}, 'tenant/application/delete/', 'get', function(body) {
						assert.ok(body.errors);
						done();
					});
				});

				
			});

			describe("list applications tests", function() {
				it("success - will get empty object", function(done) {
					executeMyRequest({qs: {id: tenantId}}, 'tenant/application/list/', 'get', function(body) {
						assert.ok(body.data);
						assert.equal(body.data.length, 0);
						done();
					});
				});

				it("success - will add application", function(done) {
					var params = {
						qs: {id: tenantId},
						form: {
							"productCode": "TPROD",
							"packageCode": "BASIC",
							"description": "this is a dummy description",
							"_TTL": '12',
							"acl": {
								"urac": {}
							}
						}
					};
					executeMyRequest(params, 'tenant/application/add/', 'post', function(body) {
						assert.ok(body.data);
						done();
					});
				});

				it("success - will list applications", function(done) {
					executeMyRequest({qs: {id: tenantId}}, 'tenant/application/list/', 'get', function(body) {
						assert.ok(body.data);
						assert.equal(body.data.length, 1);
						applicationId = body.data[0].appId.toString();
						delete body.data[0].appId;
						assert.deepEqual(body.data[0], {
							"product": "TPROD",
							"package": "TPROD_BASIC",
							"description": "this is a dummy description",
							//"acl": {
							//	"urac": {
							//		'access': false,
							//		'apis': {
							//			'/account/changeEmail': {
							//				'access': true
							//			}
							//		}
							//	}
							//},
							"acl": {
								"urac": {}
							},
							"_TTL": 12 * 3600 * 1000,
							"keys": []
						});
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
				it("fail - app id not found", function(done) {
					var params = {
						qs: {
							'id': tenantId,
							'appId': 'xxxx'
						}
					};
					executeMyRequest(params, 'tenant/application/key/add', 'post', function(body) {
						assert.ok(body);
						console.log(body);
						done();
					});
				});

				it('fail - missing params', function(done) {
					var params = {
						qs: {
							'id': tenantId
						}
					};
					executeMyRequest(params, 'tenant/application/key/add/', 'post', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 172, "message": "Missing required field: appId"});
						done();
					});
				});

				it('mongo test', function(done) {
					mongo.findOne('tenants', {"code": "TSTN"}, function(error, records) {
						assert.ifError(error);
						assert.ok(records);
						
						assert.ok(records.applications);
						assert.equal(records.applications.length, 1);
						assert.equal(records.applications[0].keys.length, 1);
						assert.ok(records.applications[0].keys[0].key);
						key = records.applications[0].keys[0].key;
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
				it("fail - wrong key", function(done) {
					var params = {
						qs: {
							'id': tenantId,
							'appId': applicationId,
							'key': 'gdsgsfds'
						}
					};
					executeMyRequest(params, 'tenant/application/key/delete', 'get', function(body) {
						assert.ok(body);
						assert.ok(body.errors);
						assert.deepEqual(body.errors.details[0], {"code": 437, "message": "Unable to remove key from the tenant application"});
						done();
					});
				});
				
				it('fail - missing params', function(done) {
					var params = {
						qs: {
							'id': tenantId,
							'appId': applicationId
						}
					};
					executeMyRequest(params, 'tenant/application/key/delete', 'get', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 172, "message": "Missing required field: key"});
						done();
					});
				});

			});

			describe("list application keys", function() {
				it("success - will add key", function(done) {
					var params = {
						qs: {
							id: tenantId,
							appId: applicationId
						}
					};
					executeMyRequest(params, 'tenant/application/key/list', 'get', function(body) {
						assert.ok(body.data);
						assert.equal(body.data.length, 0);
						done();
					});
				});

				it("success - will add key", function(done) {
					var params = {
						qs: {
							id: tenantId,
							appId: applicationId
						}
					};
					executeMyRequest(params, 'tenant/application/key/add/', 'post', function(body) {
						assert.ok(body.data);
						done();
					});
				});

				it("success - will list key", function(done) {
					var params = {
						qs: {
							id: tenantId,
							appId: applicationId
						}
					};
					executeMyRequest(params, 'tenant/application/key/list/', 'get', function(body) {
						assert.ok(body.data);
						assert.equal(body.data.length, 1);
						key = body.data[0].key.toString();
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

				it('fail - wrong key', function(done) {
					var params = {
						qs: {
							id: tenantId,
							appId: applicationId,
							key: '0243306942ef6a1d8856bbee217daabb'
						},
						form: {
							'expDate': new Date().toISOString(),
							'device': {
								'a': 'b'
							},
							'geo': {
								'x': 'y'
							}
						}
					};
					executeMyRequest(params, 'tenant/application/key/ext/add/', 'post', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 440, "message": "Unable to add the tenant application ext Key"});
						done();
					});
				});

				it('fail - missing params', function(done) {
					var params = {
						qs: {
							id: tenantId,
							appId: applicationId
						},
						form: {
							'expDate': new Date().toISOString(),
							'device': {
								'a': 'b'
							},
							'geo': {
								'x': 'y'
							}
						}
					};
					executeMyRequest(params, 'tenant/application/key/ext/add/', 'post', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 172, "message": "Missing required field: key"});

						done();
					});
				});
				
				it('mongo test', function(done) {
					mongo.findOne('tenants', {"code": "TSTN"}, function(error, records) {
						assert.ifError(error);
						assert.ok(records);
						
						assert.ok(records.applications);
						assert.equal(records.applications.length, 1);
						assert.equal(records.applications[0].keys.length, 1);
						assert.ok(records.applications[0].keys[0].key);
						key = records.applications[0].keys[0].key;
						assert.equal(records.applications[0].keys[0].extKeys.length, 1);
						extKey = records.applications[0].keys[0].extKeys[0].extKey;
						delete records.applications[0].keys[0].extKeys[0].extKey;
						assert.deepEqual(records.applications[0].keys[0].extKeys[0], {
							'expDate': new Date(expDateValue).getTime() + config.expDateTTL,
							'device': {
								'a': 'b'
							},
							'geo': {
								'x': 'y'
							}
						});
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

				it('fail - wrong key value', function(done) {
					var params = {
						qs: {
							id: tenantId,
							appId: applicationId,
							key: key
						},
						form: {
							'extKey': 'fdfdgdfgdf',
							'expDate': new Date().toISOString(),
							'device': {
								'a': 'b'
							},
							'geo': {
								'x': 'y'
							}
						}
					};
					executeMyRequest(params, 'tenant/application/key/ext/update/', 'post', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 441, "message": "Unable to update the tenant application ext Key"});
						done();
					});
				});
				
				it('fail - missing params', function(done) {
					var params = {
						qs: {
							id: tenantId,
							appId: applicationId,
							key: key
						},
						form: {
							'expDate': new Date().toISOString(),
							'device': {
								'a': 'b'
							},
							'geo': {
								'x': 'y'
							}
						}
					};
					executeMyRequest(params, 'tenant/application/key/ext/update/', 'post', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 172, "message": "Missing required field: extKey"});

						done();
					});
				});

				it('mongo test', function(done) {
					mongo.findOne('tenants', {"code": "TSTN"}, function(error, records) {
						assert.ifError(error);
						assert.ok(records);
						
						assert.ok(records.applications);
						assert.equal(records.applications.length, 1);
						assert.equal(records.applications[0].keys.length, 1);
						assert.ok(records.applications[0].keys[0].key);
						key = records.applications[0].keys[0].key;
						assert.equal(records.applications[0].keys[0].extKeys.length, 1);
						extKey = records.applications[0].keys[0].extKeys[0].extKey;
						delete records.applications[0].keys[0].extKeys[0].extKey;
						assert.deepEqual(records.applications[0].keys[0].extKeys[0], {
							'expDate': new Date(expDateValue).getTime() + config.expDateTTL,
							'device': {
								'a': 'b'
							},
							'geo': {
								'x': 'y'
							}
						});
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
				it("fail - wrong key value", function(done) {
					var params = {
						qs: {
							id: tenantId,
							appId: 'hjghjvbhgj',
							key: key
						},
						form: {
							'extKey': extKey
						}
					};
					executeMyRequest(params, 'tenant/application/key/ext/delete/', 'post', function(body) {
						assert.ok(body.errors);
						assert.deepEqual(body.errors.details[0], {"code": 443, "message": "Unable to remove tenant application ext Key"});
						done();
					});
				});

				it('fail - missing params', function(done) {
					var params = {
						qs: {
							id: tenantId,
							appId: applicationId,
							key: key
						},
						form: {}
					};
					executeMyRequest(params, 'tenant/application/key/ext/delete/', 'post', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 172, "message": "Missing required field: extKey"});

						done();
					});
				});

				it('mongo test', function(done) {
					mongo.findOne('tenants', {"code": "TSTN"}, function(error, records) {
						assert.ifError(error);
						assert.ok(records);
						
						assert.ok(records.applications);
						assert.equal(records.applications.length, 1);
						assert.equal(records.applications[0].keys.length, 1);
						assert.ok(records.applications[0].keys[0].key);
						key = records.applications[0].keys[0].key;
						assert.equal(records.applications[0].keys[0].extKeys.length, 0);
						done();
					});
				});
			});

			describe("list application ext keys", function() {
				it("success - will list ext key", function(done) {
					var params = {
						qs: {
							id: tenantId,
							appId: applicationId,
							key: key
						}
					};
					executeMyRequest(params, 'tenant/application/key/ext/list/', 'get', function(body) {
						assert.ok(body.data);
						assert.equal(body.data.length, 0);
						done();
					});
				});
				it("fail - wrong key", function(done) {
					var params = {
						qs: {
							id: tenantId,
							appId: applicationId,
							key: 'fffdfs'
						}
					};
					console.log(params);
					///////////// check this . no error msg. just empty data
					executeMyRequest(params, 'tenant/application/key/ext/list/', 'get', function(body) {
						console.log(body);
						console.log(' ******************************** ');
						//assert.ok(body.errors);						
						done();
					});
				});
				
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
						assert.ok(body.data);

						done();
					});
				});

				it("success - will list ext key", function(done) {
					var params = {
						qs: {
							id: tenantId,
							appId: applicationId,
							key: key
						}
					};
					executeMyRequest(params, 'tenant/application/key/ext/list/', 'get', function(body) {
						assert.ok(body.data);
						assert.equal(body.data.length, 1);

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
				it("fail - wrong key", function(done) {
					var params = {
						qs: {
							id: tenantId,
							appId: applicationId,
							key: 'gfdgdf'
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
						assert.ok(body.errors);
						assert.deepEqual(body.errors.details[0],
							{"code": 445, "message": "Unable to update the tenant application configuration"});

						done();
					});
				});
				
				it('fail - missing params', function(done) {
					var params = {
						qs: {
							id: tenantId,
							appId: applicationId,
							key: key
						},
						form: {
							'envCode': 'DEV'
						}
					};
					executeMyRequest(params, 'tenant/application/key/config/update', 'post', function(body) {
						assert.deepEqual(body.errors.details[0], {"code": 172, "message": "Missing required field: config"});
						done();
					});
				});

				it("fail - invalid environment provided", function(done) {
					var params = {
						qs: {
							id: tenantId,
							appId: applicationId,
							key: key
						},
						form: {
							'envCode': 'INV',
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
						assert.deepEqual(body.errors.details[0], {"code": 446, "message": errorCodes[446]});
						done();
					});
				});

				it('mongo test', function(done) {
					mongo.findOne('tenants', {"code": "TSTN"}, function(error, records) {
						assert.ifError(error);
						assert.ok(records);
						assert.ok(records.applications);
						assert.equal(records.applications.length, 1);
						assert.equal(records.applications[0].keys.length, 1);
						assert.ok(records.applications[0].keys[0].key);
						assert.ok(records.applications[0].keys[0].config);
						assert.ok(records.applications[0].keys[0].config.dev);
						assert.ok(records.applications[0].keys[0].config.dev.mail);
						assert.ok(records.applications[0].keys[0].config.dev.urac);

						assert.deepEqual(records.applications[0].keys[0].config.dev.mail, {
							'a': 'b'
						});

						assert.deepEqual(records.applications[0].keys[0].config.dev.urac, {
							'x': 'y'
						});
						done();
					});
				});
			});

			describe("list application config", function() {
				it("success - will list configuration", function(done) {
					var params = {
						qs: {
							id: tenantId,
							appId: applicationId,
							key: key
						}
					};
					executeMyRequest(params, 'tenant/application/key/config/list', 'get', function(body) {
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
				it("fail - wrong key", function(done) {
					var params = {
						qs: {
							id: tenantId,
							appId: applicationId,
							key: 'dfgdfg'
						}
					};
					///// no error msg returned. just empty objct
					executeMyRequest(params, 'tenant/application/key/config/list', 'get', function(body) {
						assert.ok(body);
						console.log(JSON.stringify(body));
						done();
					});
				});
				
			});
		});
	});

	describe('mongo check db', function() {
		it('asserting environment record', function(done) {
			mongo.findOne('environment', {"code": "DEV"}, function(error, record) {
				assert.ifError(error);
				assert.ok(record);
				delete record._id;
				assert.deepEqual(record, {
					"code": "DEV",
					"description": 'this is a dummy description',
					"ips": ['127.0.0.1', '192.168.0.1']
				});
				done();
			});
		});

		it('asserting product record', function(done) {
			mongo.findOne('products', {"code": "TPROD"}, function(error, record) {
				assert.ifError(error);
				assert.ok(record);
				delete record._id;
				assert.deepEqual(record, {
					"code": "TPROD",
					"name": "test product",
					"description": "this is a dummy description",
					"packages": [
						{
							"code": "TPROD_BASIC",
							"name": "basic package",
							"description": "this is a dummy description",
							"acl": {
								"urac": {
									'access': false,
									'apis': {
										'/account/changeEmail': {
											'access': true
										}
									}
									//todo: retest this after fixing inputmask data type conversion
									//,
									//'apisRegExp': [
									//	{
									//		'regExp': /admin\/.*/,
									//		'access': ['admin']
									//	}
									//]
								}
							},
							"_TTL": 12 * 3600 * 1000
						}
					]
				});
				done();
			});
		});

		it('asserting tenant record', function(done) {
			//TSTN
			mongo.findOne('tenants', {"code": 'TSTN'}, function(error, record) {
				assert.ifError(error);
				assert.ok(record);
				delete record._id;
				delete record.applications[0].appId;

				assert.ok(record.applications[0].keys[0].key);
				delete record.applications[0].keys[0].key;

				assert.ok(record.applications[0].keys[0].extKeys[0].extKey);
				delete record.applications[0].keys[0].extKeys[0].extKey;

				assert.deepEqual(record.oauth, {
					"secret": "my secret key",
					"redirectURI": "http://www.myredirecturi.com/",
					"grants": [
						"password", "refresh_token"
					]
				});
				delete record.oauth;
				assert.deepEqual(record.applications, [
					{
						"product": "TPROD",
						"package": "TPROD_BASIC",
						"description": "this is a dummy description",
						//"acl": {
						//	"urac": {
						//		'access': false,
						//		'apis': {
						//			'/account/changeEmail': {
						//				'access': true
						//			}
						//		}
						//	}
						//},
						"_TTL": 12 * 3600 * 1000,
						"acl": {
							"urac": {}
						},
						"keys": [
							{
								"extKeys": [
									{
										"expDate": new Date(expDateValue).getTime() + config.expDateTTL,
										"device": {'a': 'b'},
										"geo": {'x': 'y'}
									}
								],
								"config": {
									"dev": {
										"mail": {
											"a": "b"
										},
										"urac": {
											'x': 'y'
										}
									}
								}
							}
						]
					}
				]);
				delete record.applications;
				assert.deepEqual(record, {
					"code": "TSTN",
					"name": "test tenant",
					"description": "this is a dummy description"
				});
				done();
			});
		});
	});
});