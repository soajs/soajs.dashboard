"use strict";
const assert = require('assert');
const request = require("request");
const helper = require("../helper.js");
let dashboard; //todo: check not used

const config = helper.requireModule('./config');
const errorCodes = config.errors;

const Mongo = require("soajs.core.modules").mongo;
const dbConfig = require("./db.config.test.js");

let dashboardConfig = dbConfig();
dashboardConfig.name = "core_provision";
const mongo = new Mongo(dashboardConfig);

let uracConfig = dbConfig();
uracConfig.name = 'test_urac';
const uracMongo = new Mongo(uracConfig);

const extKey = 'aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac';
const wrong_Id = '55375fc26aa74450771a1513';

// /tenant/application/acl/get
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

describe("DASHBOARD UNIT Tests:", function () {
	let expDateValue = new Date().toISOString();
	
	after(function (done) {
		mongo.closeDb();
		done();
	});
	
	describe("products tests", function () {
		let productId;
		
		describe("product", function () {
			before(function (done) {
				mongo.remove('products', {'code': 'TPROD'}, function (error) {
					assert.ifError(error);
					done();
				});
			});
			describe("add product tests", function () {
				it("success - will add product", function (done) {
					let params = {
						form: {
							"code": "TPROD",
							"name": 'test product',
							"description": 'this is a dummy description'
						}
					};
					executeMyRequest(params, 'product/add', 'post', function (body) {
						assert.ok(body.data);
						done();
					});
				});
				
				
				it('fail - product exists', function (done) {
					let params = {
						form: {
							"code": "TPROD",
							"name": 'test product',
							"description": 'this is a dummy description'
						}
					};
					executeMyRequest(params, 'product/add', 'post', function (body) {
						assert.deepEqual(body.errors.details[0], {"code": 413, "message": errorCodes[413]});
						
						done();
					});
				});
				// product/get
				
				it('mongo test', function (done) {
					mongo.findOne('products', {'code': 'TPROD'}, function (error, productRecord) {
						assert.ifError(error);
						productId = productRecord._id.toString();
						delete productRecord._id;
						assert.deepEqual(productRecord, {
							"code": "TPROD",
							"name": "test product",
							"description": "this is a dummy description",
							"packages": [],
							"scope": {
								acl: {}
							}
						});
						done();
					});
					
				});
			});
			
			describe("update product tests", function () {
				it("success - will update product", function (done) {
					let params = {
						qs: {'id': productId},
						form: {
							"id": productId,
							"description": 'this is a dummy updated description',
							"name": "test product updated"
						}
					};
					executeMyRequest(params, 'product/update', 'put', function (body) {
						assert.ok(body.data);
						done();
					});
				});
				
				it('success - product/get', function (done) {
					let params = {
						qs: {
							"id": productId
						}
					};
					executeMyRequest(params, 'product/get', 'get', function (body) {
						//assert.deepEqual(body.errors.details[0], {"code": 413, "message": errorCodes[413]});
						assert.ok(body.data);
						done();
					});
				});
				
				it('fail - missing params', function (done) {
					let params = {
						qs: {'id': productId},
						form: {
							"description": 'this is a dummy description'
						}
					};
					executeMyRequest(params, 'product/update', 'put', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 172,
							"message": "Missing required field: name"
						});
						
						done();
					});
				});
				
				it('fail - invalid product id provided', function (done) {
					let params = {
						qs: {'id': 'aaaabbbbccccdddd'},
						form: {
							"description": 'this is a dummy description',
							"name": 'test product updated'
						}
					};
					executeMyRequest(params, 'product/update', 'put', function (body) {
						assert.deepEqual(body.errors.details[0], {"code": 409, "message": errorCodes[409]});
						
						done();
					});
				});
				
				it('mongo test', function (done) {
					mongo.find('products', {}, {}, function (error, records) {
						assert.ifError(error);
						assert.ok(records);
						assert.equal(records.length, 2);
						delete records[1]._id;
						assert.deepEqual(records[1], {
							"code": "TPROD",
							"name": "test product updated",
							"description": "this is a dummy updated description",
							"packages": [],
							"scope": {
								acl: {}
							}
						});
						done();
					});
				});
			});
			
			describe("delete product tests", function () {
				let tProd2;
				it('fail - missing params', function (done) {
					let params = {
						qs: {}
					};
					executeMyRequest(params, 'product/delete', 'delete', function (body) {
						assert.deepEqual(body.errors.details[0].code, 470);
						done();
					});
				});
				
				it('fail - invalid product id provided', function (done) {
					let params = {
						qs: {'id': "aaaabbbbccccdddd"}
					};
					executeMyRequest(params, 'product/delete', 'delete', function (body) {
						assert.deepEqual(body.errors.details[0], {"code": 409, "message": errorCodes[409]});
						
						done();
					});
				});
				
				it("success - will add product again", function (done) {
					let params = {
						form: {
							"code": "TPRO2",
							"name": 'test product 2',
							"description": 'this is a dummy description'
						}
					};
					executeMyRequest(params, 'product/add', 'post', function (body) {
						assert.ok(body.data);
						mongo.findOne('products', {'code': 'TPRO2'}, function (error, productRecord) {
							assert.ifError(error);
							tProd2 = productRecord._id.toString();
							done();
						});
					});
				});
				
				it("success - will delete product", function (done) {
					let params = {
						qs: {'id': tProd2}
					};
					executeMyRequest(params, 'product/delete', 'delete', function (body) {
						assert.ok(body.data);
						done();
					});
				});
				
				it('mongo test', function (done) {
					mongo.find('products', {}, {}, function (error, records) {
						assert.ifError(error);
						assert.ok(records);
						assert.equal(records.length, 2);
						done();
					});
				});
			});
			
			describe("list product tests", function () {
				it("success - will list product", function (done) {
					executeMyRequest({}, 'product/list', 'get', function (body) {
						assert.ok(body.data);
						assert.equal(body.data.length, 1);
						productId = body.data[0]._id.toString();
						delete body.data[0]._id;
						assert.deepEqual(body.data[0], {
							"code": "TPROD",
							"name": "test product updated",
							"description": "this is a dummy updated description",
							"packages": [],
							"scope": {
								acl: {}
							}
						});
						done();
					});
				});
			});
			
			describe("list console product tests", function () {
				it("success - will list product", function (done) {
					executeMyRequest({}, 'console/product/list', 'get', function (body) {
						assert.ok(body.data);
						done();
					});
				});
			});
		});
		
		describe("package", function () {
			describe("add package tests", function () {
				it("fail - invalid env code in acl", function (done) {
					let params = {
						qs: {'id': productId},
						form: {
							"code": "BASIC",
							"name": "basic package",
							"description": 'this is a dummy description',
							"_TTL": '12',
							"acl": {
								"inv": {
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
						}
					};
					executeMyRequest(params, 'product/packages/add', 'post', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 405,
							"message": "Invalid environment id provided"
						});
						done();
					});
				});
				
				it("success - will add package, no locked product -> acl will be ignored for dashboard's env", function (done) {
					let params = {
						qs: {'id': productId},
						form: {
							"code": "BASIC",
							"name": "basic package",
							"description": 'this is a dummy description',
							"_TTL": '12',
							"acl": {
								"dev": {
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
						}
					};
					executeMyRequest(params, 'product/packages/add', 'post', function (body) {
						assert.ok(body.data);
						mongo.findOne('products', {'code': 'TPROD'}, function (error, record) {
							assert.ifError(error);
							delete record._id;
							assert.deepEqual(record.packages[0], {
								"code": "TPROD_BASIC",
								"name": "basic package",
								"description": "this is a dummy description",
								"_TTL": 12 * 3600 * 1000,
								"acl": {}
							});
							done();
							
						});
					});
				});
				
				it("success - will add another package", function (done) {
					let params = {
						qs: {'id': productId},
						form: {
							"code": "PACKA",
							"name": "some package",
							"description": 'this is a dummy description',
							"_TTL": '12',
							"acl": {}
						}
					};
					executeMyRequest(params, 'product/packages/add', 'post', function (body) {
						assert.ok(body.data);
						mongo.findOne('products', {'code': 'TPROD'}, function (error, record) {
							assert.ifError(error);
							delete record._id;
							assert.deepEqual(record.packages[1], {
								"code": "TPROD_PACKA",
								"name": "some package",
								"description": "this is a dummy description",
								"_TTL": 12 * 3600 * 1000,
								"acl": {}
							});
							done();
							
						});
					});
				});
				it("fail add - wrong product id", function (done) {
					let params = {
						qs: {'id': wrong_Id},
						form: {
							"name": "basic package",
							"code": "BSIC",
							"description": 'this is a dummy description',
							"_TTL": '12',
							"acl": {}
						}
					};
					executeMyRequest(params, 'product/packages/add', 'post', function (body) {
						assert.ok(body.errors);
						assert.equal(body.errors.details[0].code, 415);
						done();
					});
				});
				
				it('fail - package exists', function (done) {
					let params = {
						qs: {'id': productId},
						form: {
							"code": "BASIC",
							"name": "basic package",
							"description": 'this is a dummy description',
							"_TTL": '12',
							"acl": {
								"dev": {
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
						}
					};
					executeMyRequest(params, 'product/packages/add', 'post', function (body) {
						assert.deepEqual(body.errors.details[0], {"code": 418, "message": errorCodes[418]});
						
						done();
					});
				});
				
			});
			
			describe("get prod package tests", function () {
				it('success - product/packages/get', function (done) {
					let params = {
						qs: {
							"productCode": "TPROD",
							"packageCode": "TPROD_BASIC"
						}
					};
					executeMyRequest(params, 'product/packages/get', 'get', function (body) {
						//assert.deepEqual(body.errors.details[0], {"code": 413, "message": errorCodes[413]});
						assert.ok(body.data);
						assert.ok(body.data.code);
						done();
					});
				});
				it('fail - product/packages/get - wrong package Code', function (done) {
					let params = {
						qs: {
							"productCode": "TPROD",
							"packageCode": "TPROD_BASC"
						}
					};
					executeMyRequest(params, 'product/packages/get', 'get', function (body) {
						assert.deepEqual(body.errors.details[0], {"code": 461, "message": errorCodes[461]});
						done();
					});
				});
				it('fail - product/packages/get - wrong product Code', function (done) {
					let params = {
						qs: {
							"productCode": "TROD",
							"packageCode": "TPROD_BASC"
						}
					};
					executeMyRequest(params, 'product/packages/get', 'get', function (body) {
						assert.deepEqual(body.errors.details[0], {"code": 460, "message": errorCodes[460]});
						done();
					});
				});
			});
			
			describe("update package tests", function () {
				it('fail - invalid env code in acl', function (done) {
					let params = {
						qs: {'id': productId, "code": "BASIC"},
						form: {
							"name": "basic package 2",
							"description": 'this is a dummy updated description',
							"_TTL": '24',
							"acl": {
								"inv": {
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
						}
					};
					executeMyRequest(params, 'product/packages/update', 'put', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 405,
							"message": "Invalid environment id provided"
						});
						done();
					});
				});
				
				it("success - will update package, acl will be ignored", function (done) {
					let params = {
						qs: {'id': productId, "code": "BASIC"},
						form: {
							"name": "basic package 2",
							"description": 'this is a dummy updated description',
							"_TTL": '24',
							"acl": {
								"dev": {
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
						}
					};
					executeMyRequest(params, 'product/packages/update', 'put', function (body) {
						assert.ok(body.data);
						
						mongo.findOne('products', {'code': 'TPROD'}, function (error, record) {
							assert.ifError(error);
							delete record._id;
							assert.deepEqual(record.packages[0], {
								"code": "TPROD_BASIC",
								"name": "basic package 2",
								"description": "this is a dummy updated description",
								"_TTL": 24 * 3600 * 1000,
								"acl": {}
							});
							done();
							
						});
					});
				});
				
				it('fail - missing params', function (done) {
					let params = {
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
					executeMyRequest(params, 'product/packages/update', 'put', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 172,
							"message": "Missing required field: id"
						});
						
						done();
					});
				});
				
				it("fail update - wrong product id", function (done) {
					let params = {
						qs: {'id': wrong_Id, "code": "BASIC"},
						form: {
							"name": "basic package",
							"description": 'this is a dummy description',
							"_TTL": '12',
							"acl": {}
						}
					};
					executeMyRequest(params, 'product/packages/update', 'put', function (body) {
						assert.ok(body.errors);
						done();
					});
				});
				
				it('fail - invalid package code provided', function (done) {
					let params = {
						qs: {'id': productId, "code": "BASI2"},
						form: {
							"name": "basic package 2",
							"description": 'this is a dummy updated description',
							"_TTL": '24',
							"acl": {
								"urac": {
									"dev": {
										'access': false,
										'apis': {
											'/account/changeEmail': {
												'access': true
											}
										}
									}
								}
							}
						}
					};
					executeMyRequest(params, 'product/packages/update', 'put', function (body) {
						assert.deepEqual(body.errors.details[0], {"code": 405, "message": errorCodes[405]});
						done();
					});
				});
				
			});
			
			describe("delete package tests", function () {
				
				it("success - will delete package", function (done) {
					let params = {
						qs: {
							"id": productId,
							"code": "PACKA"
						}
					};
					executeMyRequest(params, 'product/packages/delete', 'delete', function (body) {
						assert.ifError(body.errors);
						assert.ok(body.data);
						done();
					});
				});
				
				it('fail - missing params', function (done) {
					let params = {
						qs: {}
					};
					executeMyRequest(params, 'product/packages/delete', 'delete', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 172,
							"message": "Missing required field: code, id"
						});
						
						done();
					});
				});
				
				it('fail - invalid package code provided', function (done) {
					let params = {
						qs: {"id": productId, 'code': 'BASI4'}
					};
					executeMyRequest(params, 'product/packages/delete', 'delete', function (body) {
						assert.deepEqual(body.errors.details[0], {"code": 419, "message": errorCodes[419]});
						done();
					});
				});
				
				it("fail - cannot delete package being used by current key", function (done) {
					let params = {
						qs: {"id": productId, 'code': 'BASIC'}
					};
					executeMyRequest(params, 'product/packages/delete', 'delete', function (body) {
						assert.ok(body.errors);
						done();
					});
				});
				
				it('mongo test', function (done) {
					mongo.find('products', {}, {}, function (error, records) {
						assert.ifError(error);
						assert.ok(records);
						assert.equal(records.length, 2);
						assert.equal(records[1].packages.length, 1);
						done();
					});
				});
			});
			
			describe("list package tests", function () {
				//it("success - will get empty list", function(done) {
				//    let params = {
				//        qs: {"id": productId}
				//    };
				//    executeMyRequest(params, 'product/packages/list', 'get', function(body) {
				//        assert.ok(body.data);
				//        assert.equal(body.data.length, 0);
				//
				//        done();
				//    });
				//});
				//it("success - will add package", function(done) {
				//    let params = {
				//        qs: {"id": productId},
				//        form: {
				//            "code": "BASIC",
				//            "name": "basic package",
				//            "description": 'this is a dummy description',
				//            "_TTL": '12',
				//            "acl": {
				//                "urac": {
				//                    'access': false,
				//                    'apis': {
				//                        '/account/changeEmail': {
				//                            'access': true
				//                        }
				//                    }
				//                }
				//            }
				//        }
				//    };
				//    executeMyRequest(params, 'product/packages/add', 'post', function(body) {
				//        assert.ok(body.data);
				//
				//        done();
				//    });
				//});
				it("success - will list package", function (done) {
					let params = {
						qs: {"id": productId, 'code': 'BASIC'}
					};
					executeMyRequest(params, 'product/packages/list', 'get', function (body) {
						assert.ok(body.data);
						assert.equal(body.data.length, 1);
						assert.deepEqual(body.data[0], {
							"code": "TPROD_BASIC",
							"name": "basic package 2",
							"description": "this is a dummy updated description",
							"_TTL": 24 * 3600 * 1000,
							"acl": {}
						});
						done();
					});
				});
			});
		});
		
		describe("mongo check db", function () {
			it('asserting product record', function (done) {
				mongo.findOne('products', {"code": "TPROD"}, function (error, record) {
					assert.ifError(error);
					assert.ok(record);
					delete record._id;
					assert.deepEqual(record, {
						"code": "TPROD",
						"name": "test product updated",
						"description": "this is a dummy updated description",
						"packages": [
							{
								"code": "TPROD_BASIC",
								"name": "basic package 2",
								"description": "this is a dummy updated description",
								"acl": {},
								"_TTL": 24 * 3600 * 1000
							}
						],
						"scope": {
							acl: {}
						}
					});
					done();
				});
			});
		});
		
	});
	
	describe("tenants tests", function () {
		let tenantId, applicationId, key, tstgTenantId, profileTenant;
		
		describe("tenant", function () {
			before(function (done) {
				uracMongo.remove('users', {'tenant.code': 'TSTN'}, function (error, data) {
					assert.ifError(error);
					assert.ok(data);
					
					uracMongo.remove('groups', {'tenant.code': 'TSTN'}, function (error, data) {
						assert.ifError(error);
						assert.ok(data);
						done();
					});
				});
			});
			
			describe("add tenant tests", function () {
				
				it("success - will add tenant and set type to client by default", function (done) {
					let params = {
						form: {
							"code": "TSTN",
							"name": 'test tenant',
							"email": 'admin@someTenant.com',
							"description": 'this is a dummy description',
							"subTenant": '551286bce603d7e01ab1688e',
							"type": "client"
						}
					};
					executeMyRequest(params, 'tenant/add', 'post', function (body) {
						assert.ok(body.data);
						done();
					});
				});
				
				it("success - will add tenant and set type to product and tag to testing", function (done) {
					let params = {
						form: {
							"code": "TSTG",
							"name": 'test product tenant',
							"email": 'admin2@someTenant.com',
							"description": 'this is a dummy product description',
							"type": 'product',
							"tag": 'testing'
						}
					};
					executeMyRequest(params, 'tenant/add', 'post', function (body) {
						assert.ok(body.data);
						tstgTenantId = body.data.id;
						done();
					});
				});
				
				it("success - will add tenant with profile", function (done) {
					let params = {
						form: {
							"code": "TES1",
							"name": 'Test profile',
							"email": 'profile@someTenant.com',
							"description": 'this is a tenant profile test description',
							"type": "product",
							"profile": {
								"test": "data"
							}
						}
					};
					executeMyRequest(params, 'tenant/add', 'post', function (body) {
						assert.ok(body.data);
						done();
					});
				});
				
				it('fail - tenant exists', function (done) {
					let params = {
						form: {
							"code": "TSTN",
							"name": 'test tenant',
							"email": 'admin@someTenant.com',
							"description": 'this is a dummy description'
						}
					};
					executeMyRequest(params, 'tenant/add', 'post', function (body) {
						assert.deepEqual(body.errors.details[0], {"code": 423, "message": errorCodes[423]});
						done();
					});
				});
				
				it('mongo test', function (done) {
					mongo.findOne('tenants', {'code': 'TSTN'}, function (error, tenantRecord) {
						assert.ifError(error);
						tenantId = tenantRecord._id.toString();
						delete tenantRecord._id;
						assert.deepEqual(tenantRecord, {
							"code": "TSTN",
							"name": "test tenant",
							"description": "this is a dummy description",
							"type": "client",
							"applications": [],
							"oauth": {
								"secret": 'this is a secret',
								"redirectURI": 'http://domain.com',
								"grants": ["password", "refresh_token"],
								"disabled": 0,
								"type": 2,
								"loginMode": "urac"
							},
							"tenant": {
								"code": "DBTN",
								"id": "551286bce603d7e01ab1688e"
							}
						});
						
						uracMongo.find('users', {'tenant.code': 'TSTN'}, function (error, data) {
							assert.ifError(error);
							assert.ok(data);
							uracMongo.find('groups', {'tenant.code': 'TSTN'}, function (error, data) {
								assert.ifError(error);
								assert.ok(data);
								done();
							});
						});
					});
				});
				
				it('Get Profile Tenant', function (done) {
					mongo.findOne('tenants', {'code': 'TES1'}, function (error, tenantRecord) {
						assert.ifError(error);
						profileTenant = tenantRecord._id.toString();
						delete tenantRecord._id;
						assert.ok(tenantRecord);
						
						uracMongo.find('users', {'tenant.code': 'TES1'}, function (error, data) {
							assert.ifError(error);
							assert.ok(data);
							uracMongo.find('groups', {'tenant.code': 'TES1'}, function (error, data) {
								assert.ifError(error);
								assert.ok(data);
								done();
							});
						});
					});
				});
			});
			
			describe("update tenant tests", function () {
				it("success - will update tenant", function (done) {
					let params = {
						qs: {"id": tenantId},
						form: {
							"description": 'this is a dummy updated description',
							"name": "test tenant updated"
						}
					};
					executeMyRequest(params, 'tenant/update', 'put', function (body) {
						assert.ok(body.data);
						done();
					});
					
				});
				
				it("success - will update profile tenant", function (done) {
					let params = {
						qs: {"id": profileTenant},
						form: {
							"description": 'this is a dummy updated description',
							"name": "test profile tenant updated"
						}
					};
					executeMyRequest(params, 'tenant/update', 'put', function (body) {
						assert.ok(body.data);
						done();
					});
					
				});
				
				it("success - will update tenant", function (done) {
					let params = {
						qs: {"id": tenantId},
						form: {
							"description": 'this is a dummy updated description',
							"name": "test tenant updated"
						}
					};
					executeMyRequest(params, 'tenant/update', 'put', function (body) {
						assert.ok(body.data);
						done();
					});
					
				});
				
				it("success - will get tenant", function (done) {
					let params = {
						qs: {
							"id": tenantId
						}
					};
					executeMyRequest(params, 'tenant/get', 'get', function (body) {
						assert.ok(body.data);
						delete body.data._id;
						delete body.data.oauth.authorization;
						assert.deepEqual(body.data, {
							"code": "TSTN",
							"name": "test tenant updated",
							"description": "this is a dummy updated description",
							"type": "client",
							"applications": [],
							"oauth": {
								"secret": 'this is a secret',
								"redirectURI": 'http://domain.com',
								"grants": ["password", "refresh_token"],
								"disabled": 0,
								"type": 2,
								"loginMode": "urac"
							},
							"tenant": {
								"code": "DBTN",
								"id": "551286bce603d7e01ab1688e"
							}
						});
						done();
					});
				});
				
				it("success - will update tenant type and tag", function (done) {
					let params = {
						qs: {
							"id": tstgTenantId
						},
						form: {
							"code": "TSTG",
							"name": 'test product tenant updated',
							"email": 'admin2@someTenant.com',
							"description": 'this is a dummy product description updated',
							"type": 'client',
							"tag": 'myTag',
							"profile": {
								"test": "popop"
							}
						}
					};
					executeMyRequest(params, 'tenant/update', 'put', function (body) {
						assert.ok(body.data);
						done();
					});
				});
				
				it('fail - missing params', function (done) {
					let params = {
						qs: {},
						form: {
							"description": 'this is a dummy description',
							"name": 'test tenant updated'
						}
					};
					executeMyRequest(params, 'tenant/update', 'put', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 172,
							"message": "Missing required field: id"
						});
						done();
					});
				});
				
				it('fail - invalid tenant id provided', function (done) {
					let params = {
						qs: {"id": "aaaabbdd"},
						form: {
							"description": 'this is a dummy description',
							"name": 'test tenant updated'
						}
					};
					executeMyRequest(params, 'tenant/update', 'put', function (body) {
						assert.deepEqual(body.errors.details[0], {"code": 438, "message": errorCodes[438]});
						
						done();
					});
				});
				
			});
			
			describe("delete tenant tests", function () {
				it('fail - missing params', function (done) {
					executeMyRequest({}, 'tenant/delete', 'delete', function (body) {
						assert.deepEqual(body.errors.details[0].code, 470);
						done();
					});
				});
				
				it('fail - invalid tenant id provided', function (done) {
					executeMyRequest({qs: {id: 'aaaabdddd'}}, 'tenant/delete', 'delete', function (body) {
						assert.deepEqual(body.errors.details[0], {"code": 438, "message": errorCodes[438]});
						done();
					});
				});
				
				it("success - will delete tenant", function (done) {
					executeMyRequest({'qs': {id: tenantId}}, 'tenant/delete/', 'delete', function (body) {
						assert.ok(body.data);
						
						done();
					});
				});
				
			});
			
			describe("list tenant tests", function () {
				it("success - will get empty list", function (done) {
					executeMyRequest({}, 'tenant/list', 'get', function (body) {
						assert.ok(body.data);
						done();
					});
				});
				
				it("success - will get empty list", function (done) {
					executeMyRequest({}, 'console/tenant/list', 'get', function (body) {
						assert.ok(body.data);
						done();
					});
				});
				
				it("success - will add tenant", function (done) {
					let params = {
						form: {
							"code": "TSTN",
							"email": "admin@someTenant.com",
							"description": 'this is a dummy description',
							"name": "test tenant",
							"subTenant": '551286bce603d7e01ab1688e',
							"type": "client"
						}
					};
					
					uracMongo.remove('users', {'tenant.code': 'TSTN'}, function (error) {
						assert.ifError(error);
						uracMongo.remove('groups', {'tenant.code': 'TSTN'}, function (error) {
							assert.ifError(error);
							
							executeMyRequest(params, 'tenant/add', 'post', function (body) {
								assert.ok(body.data);
								mongo.findOne('tenants', {'code': 'TSTN'}, function (error, tenantRecord) {
									assert.ifError(error);
									tenantId = tenantRecord._id.toString();
									done();
								});
							});
							
						});
					});
				});
				
				it("succeess - will list tenants of type client only", function (done) {
					let params = {
						qs: {
							"type": "client"
						}
					};
					executeMyRequest(params, 'tenant/list', 'get', function (body) {
						assert.ok(body.data);
						body.data.forEach(function (tenant) {
							assert.deepEqual(tenant.type, "client");
						});
						done();
					});
				});
			});
		});
		
		describe("oauth", function () {
			describe("add oauth tests", function () {
				it("success - will add oauth", function (done) {
					let params = {
						qs: {
							'id': tenantId
						},
						form: {
							"secret": "my secret key",
							"redirectURI": "http://www.myredirecturi.com/",
							"oauthType": "urac",
							"availableEnv": ["dashboard", "dev", "stg"]
						}
					};
					
					executeMyRequest(params, 'tenant/oauth/add/', 'post', function (body) {
						assert.ok(body.data);
						
						mongo.findOne('tenants', {'code': 'TSTN'}, function (error, tenantRecord) {
							assert.ifError(error);
							assert.deepEqual(tenantRecord.oauth, {
								"secret": "my secret key",
								"redirectURI": "http://www.myredirecturi.com/",
								"grants": ["password", "refresh_token"],
								"type": 2,
								"disabled": 0,
								"loginMode": "urac"
							});
							done();
							
						});
						
					});
				});
				
				it('fail - missing params', function (done) {
					let params = {
						qs: {},
						form: {
							"secret": "my secret key",
							"redirectURI": "http://www.myredirecturi.com/",
							"oauthType": "urac",
							"availableEnv": ["dashboard", "dev", "stg"]
						}
					};
					executeMyRequest(params, 'tenant/oauth/add/', 'post', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 172,
							"message": "Missing required field: id"
						});
						
						done();
					});
				});
				
				it("success - will get tenant containing oauth", function (done) {
					let params = {
						qs: {
							'id': tenantId
						}
					};
					
					executeMyRequest(params, 'tenant/get', 'get', function (body) {
						assert.ok(body.data);
						assert.ok(body.data.oauth.authorization);
						done();
					});
				});
			});
			
			describe("update oauth tests", function () {
				it("success - will update oauth", function (done) {
					let params = {
						qs: {id: tenantId},
						form: {
							"secret": "my secret key",
							"redirectURI": "http://www.myredirecturi2.com/",
							"oauthType": "urac",
							"availableEnv": ["dashboard", "dev", "stg"],
							"pin": {
								"test": {
									"enabled": true
								}
							}
						}
					};
					executeMyRequest(params, 'tenant/oauth/update/', 'put', function (body) {
						assert.ok(body.data);
						mongo.findOne('tenants', {'code': 'TSTN'}, function (error, tenantRecord) {
							assert.ifError(error);
							assert.deepEqual(tenantRecord.oauth, {
								"secret": "my secret key",
								"redirectURI": "http://www.myredirecturi2.com/",
								"grants": ["password", "refresh_token"],
								"type": 2,
								"disabled": 0,
								"loginMode": "urac",
								"pin": {
									"test": {
										"enabled": true
									}
								}
							});
							done();
						});
					});
				});
				
				it('fail - missing params', function (done) {
					let params = {
						qs: {},
						form: {
							"secret": "my secret key",
							"redirectURI": "http://www.myredirecturi.com/",
							"oauthType": "urac",
							"availableEnv": ["dashboard", "dev", "stg"],
							"type": 2,
							"disabled": 0,
						}
					};
					executeMyRequest(params, 'tenant/oauth/update', 'put', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 172,
							"message": "Missing required field: id"
						});
						
						done();
					});
				});
			});
			
			describe("delete oauth tests", function () {
				it('fail - missing params', function (done) {
					executeMyRequest({qs: {}}, 'tenant/oauth/delete', 'delete', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 172,
							"message": "Missing required field: id"
						});
						
						done();
					});
				});
				
				it("success - will delete oauth", function (done) {
					executeMyRequest({qs: {id: tenantId}}, 'tenant/oauth/delete/', 'delete', function (body) {
						assert.ok(body.data);
						done();
					});
				});
			});
			
			describe("list oauth tests", function () {
				it("success - will get empty object", function (done) {
					executeMyRequest({qs: {id: tenantId}}, 'tenant/oauth/list/', 'get', function (body) {
						assert.ok(body.data);
						assert.equal(JSON.stringify(body.data), '{}');
						done();
					});
				});
				it("success - will add oauth", function (done) {
					let params = {
						qs: {id: tenantId},
						form: {
							"secret": "my secret key",
							"redirectURI": "http://www.myredirecturi.com/",
							"oauthType": "urac",
							"availableEnv": ["dashboard", "dev", "stg"],
							"type": 2,
							"disabled": 0,
						}
					};
					executeMyRequest(params, 'tenant/oauth/add/', 'post', function (body) {
						assert.ok(body.data);
						done();
					});
				});
				it("success - will get oauth object", function (done) {
					executeMyRequest({qs: {id: tenantId}}, 'tenant/oauth/list/', 'get', function (body) {
						assert.ok(body.data);
						assert.deepEqual(body.data, {
							"secret": "my secret key",
							"redirectURI": "http://www.myredirecturi.com/",
							"grants": ["password", "refresh_token"],
							"disabled": 0,
							"loginMode": "urac"
						});
						done();
					});
				});
			});
		});
		
		describe("oauth users", function () {
			let oauthUserId, oauthUserId2;
			describe("add oauth users tests", function () {
				it("success - will add oauth user", function (done) {
					let params = {
						qs: {
							'id': tenantId
						},
						form: {
							"userId": "oauth_user",
							"password": "password1"
						}
					};
					
					executeMyRequest(params, 'tenant/oauth/users/add/', 'post', function (body) {
						assert.ok(body.data);
						
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
				
				it('fail - missing params', function (done) {
					let params = {
						qs: {},
						form: {
							"userId": "oauth_user",
							"password": "password1"
						}
					};
					executeMyRequest(params, 'tenant/oauth/users/add/', 'post', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 172,
							"message": "Missing required field: id"
						});
						
						done();
					});
				});
				
			});
			
			describe("update oauth users tests", function () {
				it("success - will update oauth users", function (done) {
					let params = {
						qs: {
							id: tenantId,
							uId: oauthUserId
						},
						form: {
							"userId": "oauth_user_up",
							"password": "password2"
						}
					};
					executeMyRequest(params, 'tenant/oauth/users/update/', 'put', function (body) {
						assert.ok(body.data);
						mongo.findOne('oauth_urac', {'userId': 'oauth_user_up'}, function (error, tenantRecord) {
							assert.ifError(error);
							assert.ok(tenantRecord);
							assert.equal(tenantRecord.userId, 'oauth_user_up');
							assert.equal(tenantRecord.tId.toString(), tenantId);
							oauthUserId2 = tenantRecord._id.toString();
							done();
						});
					});
				});
				
				it("fail - will update oauth users without password", function (done) {
					let params = {
						qs: {
							id: tenantId,
							uId: oauthUserId
						},
						form: {}
					};
					executeMyRequest(params, 'tenant/oauth/users/update/', 'put', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 451,
							"message": "Unable to updated tenant oAuth User"
						});
						done();
					});
				});
				
				it('fail - missing params', function (done) {
					let params = {
						qs: {
							uId: oauthUserId
						},
						form: {
							"userId": "oauth_user_up",
							"password": "password2"
						}
					};
					executeMyRequest(params, 'tenant/oauth/users/update', 'put', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 172,
							"message": "Missing required field: id"
						});
						
						done();
					});
				});
				
				it('fail - user does not exist', function (done) {
					let params = {
						qs: {
							'id': tenantId,
							uId: '22d2cb5fc04ce51e06000001'
						},
						form: {
							"userId": "invalid",
							"password": "password2"
						}
					};
					executeMyRequest(params, 'tenant/oauth/users/update', 'put', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 447,
							"message": "Unable to get tenant oAuth Users"
						});
						
						done();
					});
				});
				
				it('fail - invalid userid given', function (done) {
					let params = {
						qs: {
							'id': tenantId,
							'uId': 'invalid'
						},
						form: {
							"userId": "invalid",
							"password": "password2"
						}
					};
					executeMyRequest(params, 'tenant/oauth/users/update', 'put', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 439,
							"message": "Invalid tenant oauth user Id provided"
						});
						
						done();
					});
				});
				
				it('fail - userid already exist in another account', function (done) {
					let params = {
						qs: {
							'id': tenantId
						},
						form: {
							"userId": "oauth_user2",
							"password": "password1"
						}
					};
					
					executeMyRequest(params, 'tenant/oauth/users/add/', 'post', function (body) {
						assert.ok(body.data);
						
						
						let params = {
							qs: {
								id: tenantId,
								uId: oauthUserId
							},
							form: {
								"userId": "oauth_user2",
								"password": "password2"
							}
						};
						executeMyRequest(params, 'tenant/oauth/users/update/', 'put', function (body) {
							assert.deepEqual(body.errors.details[0], {
								"code": 448,
								"message": "tenant oAuth User already exists"
							});
							
							done();
						});
					});
				});
			});
			
			describe("delete oauth tests", function () {
				it('fail - missing params', function (done) {
					executeMyRequest({qs: {uId: oauthUserId}}, 'tenant/oauth/users/delete', 'delete', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 172,
							"message": "Missing required field: id"
						});
						
						done();
					});
				});
				
				it('fail - invalid id provided', function (done) {
					executeMyRequest({
						qs: {
							id: tenantId,
							uId: 'abcde'
						}
					}, 'tenant/oauth/users/delete', 'delete', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 439,
							"message": "Invalid tenant oauth user Id provided"
						});
						
						done();
					});
				});
				
				it("success - will delete oauth user", function (done) {
					executeMyRequest({
						qs: {
							id: tenantId,
							'uId': oauthUserId
						}
					}, 'tenant/oauth/users/delete/', 'delete', function (body) {
						assert.ok(body.data);
						done();
					});
				});
				
			});
			
			describe("list oauth users tests", function () {
				
				it("success - will get oauth users", function (done) {
					executeMyRequest({qs: {id: tenantId}}, 'tenant/oauth/users/list/', 'get', function (body) {
						assert.ok(body.data);
						assert.equal(body.data.length, 1);
						done();
					});
				});
				
				it("success - will remove oauth user", function (done) {
					let params = {
						qs: {
							id: tenantId,
							uId: oauthUserId2
						}
					};
					executeMyRequest(params, 'tenant/oauth/users/delete/', 'delete', function (body) {
						assert.ok(body.data);
						done();
					});
				});
				
				it("success - will get empty object", function (done) {
					executeMyRequest({qs: {id: tenantId}}, 'tenant/oauth/users/list/', 'get', function (body) {
						assert.ok(body.data);
						assert.equal(body.data.length, 1);
						done();
					});
				});
			});
		});
		
		describe("applications", function () {
			
			describe("add applications tests", function () {
				it("success - will add application", function (done) {
					let params = {
						qs: {'id': tenantId},
						form: {
							"productCode": "TPROD",
							"packageCode": "BASIC",
							"description": "this is a dummy description",
							"_TTL": '12'
						}
					};
					executeMyRequest(params, 'tenant/application/add', 'post', function (body) {
						assert.ok(body.data);
						done();
					});
				});
				
				it('fail - missing params', function (done) {
					let params = {
						qs: {},
						form: {
							"productCode": "TPROD",
							"packageCode": "BASIC",
							"description": "this is a dummy description",
							"_TTL": '12'
						}
					};
					executeMyRequest(params, 'tenant/application/add/', 'post', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 172,
							"message": "Missing required field: id"
						});
						
						done();
					});
				});
				
				it('fail - invalid product code given', function (done) {
					let params = {
						qs: {'id': tenantId},
						form: {
							"productCode": "INVAL",
							"packageCode": "BASIC",
							"description": "this is a dummy description",
							"_TTL": '12'
						}
					};
					executeMyRequest(params, 'tenant/application/add/', 'post', function (body) {
						assert.deepEqual(body.errors.details[0], {"code": 434, "message": errorCodes[434]});
						
						done();
					});
				});
				
				it('fail - invalid package code given', function (done) {
					let params = {
						qs: {'id': tenantId},
						form: {
							"productCode": "TPROD",
							"packageCode": "INVAL",
							"description": "this is a dummy description",
							"_TTL": '12'
						}
					};
					executeMyRequest(params, 'tenant/application/add/', 'post', function (body) {
						assert.deepEqual(body.errors.details[0], {"code": 434, "message": errorCodes[434]});
						
						done();
					});
				});
				
				it('mongo test', function (done) {
					mongo.findOne('tenants', {"code": "TSTN"}, function (error, records) {
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
						});
						done();
					});
				});
			});
			
			describe("update applications tests", function () {
				it("success - will update application", function (done) {
					let params = {
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
					executeMyRequest(params, 'tenant/application/update', 'put', function (body) {
						assert.ok(body.data);
						done();
					});
				});
				it("fail - wrong key: fdsffsd", function (done) {
					let params = {
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
					executeMyRequest(params, 'tenant/application/update', 'put', function (body) {
						assert.ok(body.errors);
						done();
					});
				});
				
				it('fail - missing params', function (done) {
					let params = {
						qs: {'id': tenantId, 'appId': applicationId},
						form: {
							"packageCode": "BASIC",
							"description": "this is a dummy description",
							"_TTL": '12'
						}
					};
					executeMyRequest(params, 'tenant/application/update', 'put', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 172,
							"message": "Missing required field: productCode"
						});
						
						done();
					});
				});
				
				it('fail - invalid product code given', function (done) {
					let params = {
						qs: {'id': tenantId, 'appId': applicationId},
						form: {
							"productCode": "INVAL",
							"packageCode": "BASIC",
							"description": "this is a dummy description",
							"_TTL": '12'
						}
					};
					executeMyRequest(params, 'tenant/application/update', 'put', function (body) {
						assert.deepEqual(body.errors.details[0], {"code": 434, "message": errorCodes[434]});
						
						done();
					});
				});
				
				it('fail - invalid package code given', function (done) {
					let params = {
						qs: {'id': tenantId, 'appId': applicationId},
						form: {
							"productCode": "TPROD",
							"packageCode": "INVAL",
							"description": "this is a dummy description",
							"_TTL": '12'
						}
					};
					executeMyRequest(params, 'tenant/application/update', 'put', function (body) {
						assert.deepEqual(body.errors.details[0], {"code": 434, "message": errorCodes[434]});
						
						done();
					});
				});
				
				it('mongo test', function (done) {
					mongo.findOne('tenants', {"code": "TSTN"}, function (error, records) {
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
				
				it("success - will clear application acl", function (done) {
					let params = {
						qs: {'id': tenantId, 'appId': applicationId},
						form: {
							"productCode": "TPROD",
							"packageCode": "BASIC",
							"description": "this is a dummy description updated",
							"_TTL": '24',
							"clearAcl": true,
							"acl": {}
						}
					};
					executeMyRequest(params, 'tenant/application/update', 'put', function (body) {
						assert.ok(body);
						assert.ok(body.data);
						mongo.findOne('tenants', {"code": "TSTN"}, function (error, records) {
							assert.ifError(error);
							assert.ok(records.applications);
							assert.equal(records.applications.length, 1);
							applicationId = records.applications[0].appId.toString();
							delete records.applications[0].appId;
							delete records.oauth;
							assert.deepEqual(records.applications[0], {
								"product": "TPROD",
								"package": "TPROD_BASIC",
								"description": "this is a dummy description updated",
								"_TTL": 24 * 3600 * 1000,
								'keys': []
							});
							done();
						});
						
					});
				});
			});
			
			describe("delete applications tests", function () {
				it('fail - missing params', function (done) {
					executeMyRequest({qs: {'id': tenantId}}, 'tenant/application/delete/', 'delete', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 172,
							"message": "Missing required field: appId"
						});
						done();
					});
				});
				
				it("success - will delete application", function (done) {
					executeMyRequest({
						qs: {
							'id': tenantId,
							'appId': applicationId
						}
					}, 'tenant/application/delete/', 'delete', function (body) {
						assert.ok(body.data);
						done();
					});
				});
				it("fail - wrong key", function (done) {
					executeMyRequest({
						qs: {
							'id': tenantId,
							'appId': 'fdfdsfs'
						}
					}, 'tenant/application/delete/', 'delete', function (body) {
						assert.ok(body.errors);
						done();
					});
				});
				
				
			});
			
			describe("list applications tests", function () {
				it("success - will get empty object", function (done) {
					executeMyRequest({qs: {id: tenantId}}, 'tenant/application/list/', 'get', function (body) {
						assert.ok(body.data);
						assert.equal(body.data.length, 0);
						done();
					});
				});
				it("fail - wrong id", function (done) {
					executeMyRequest({qs: {id: wrong_Id}}, 'tenant/application/list/', 'get', function (body) {
						assert.ok(body.errors);
						done();
					});
				});
				it("success - will add application", function (done) {
					let params = {
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
					executeMyRequest(params, 'tenant/application/add/', 'post', function (body) {
						assert.ok(body.data);
						done();
					});
				});
				it("fail - cant add application - wrong id", function (done) {
					let params = {
						qs: {id: wrong_Id},
						form: {
							"productCode": "TPROD",
							"packageCode": "BASIC",
							"description": "this is a dummy description",
							"_TTL": '12',
							"acl": {}
						}
					};
					executeMyRequest(params, 'tenant/application/add/', 'post', function (body) {
						assert.ok(body.errors);
						done();
					});
				});
				it("success - will list applications", function (done) {
					executeMyRequest({qs: {id: tenantId}}, 'tenant/application/list/', 'get', function (body) {
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
		
		describe("application keys", function () {
			describe("add application keys", function () {
				it("success - will add key", function (done) {
					let params = {
						qs: {
							'id': tenantId,
							'appId': applicationId
						}
					};
					executeMyRequest(params, 'tenant/application/key/add', 'post', function (body) {
						assert.ok(body.data);
						done();
					});
				});
				it("fail - app id not found", function (done) {
					let params = {
						qs: {
							'id': tenantId,
							'appId': 'xxxx'
						}
					};
					executeMyRequest(params, 'tenant/application/key/add', 'post', function (body) {
						assert.ok(body);
						done();
					});
				});
				
				it('fail - missing params', function (done) {
					let params = {
						qs: {
							'id': tenantId
						}
					};
					executeMyRequest(params, 'tenant/application/key/add/', 'post', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 172,
							"message": "Missing required field: appId"
						});
						done();
					});
				});
				
				it('mongo test', function (done) {
					mongo.findOne('tenants', {"code": "TSTN"}, function (error, records) {
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
			
			describe("delete application keys", function () {
				it("success - will delete key", function (done) {
					let params = {
						qs: {
							'id': tenantId,
							'appId': applicationId,
							'key': key.toString()
						}
					};
					executeMyRequest(params, 'tenant/application/key/delete', 'delete', function (body) {
						assert.ok(body.data);
						done();
					});
				});
				it("fail - wrong key", function (done) {
					let params = {
						qs: {
							'id': tenantId,
							'appId': applicationId,
							'key': 'gdsgsfds'
						}
					};
					executeMyRequest(params, 'tenant/application/key/delete', 'delete', function (body) {
						assert.ok(body);
						assert.ok(body.errors);
						assert.deepEqual(body.errors.details[0], {
							"code": 437,
							"message": "Unable to remove key from the tenant application"
						});
						done();
					});
				});
				
				it('fail - missing params', function (done) {
					let params = {
						qs: {
							'id': tenantId,
							'appId': applicationId
						}
					};
					executeMyRequest(params, 'tenant/application/key/delete', 'delete', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 172,
							"message": "Missing required field: key"
						});
						done();
					});
				});
				
			});
			
			describe("list application keys", function () {
				it("success - will add key", function (done) {
					let params = {
						qs: {
							id: tenantId,
							appId: applicationId
						}
					};
					executeMyRequest(params, 'tenant/application/key/list', 'get', function (body) {
						assert.ok(body.data);
						assert.equal(body.data.length, 0);
						done();
					});
				});
				
				it("success - will add key", function (done) {
					let params = {
						qs: {
							id: tenantId,
							appId: applicationId
						}
					};
					executeMyRequest(params, 'tenant/application/key/add/', 'post', function (body) {
						assert.ok(body.data);
						done();
					});
				});
				
				it("success - will list key", function (done) {
					let params = {
						qs: {
							id: tenantId,
							appId: applicationId
						}
					};
					executeMyRequest(params, 'tenant/application/key/list/', 'get', function (body) {
						assert.ok(body.data);
						assert.equal(body.data.length, 1);
						key = body.data[0].key.toString();
						done();
					});
				});
			});
		});
		
		describe("application ext keys", function () {
			let extKey;
			describe("add application ext keys 1", function () {
				it("success - will add ext key to STG", function (done) {
					let params = {
						qs: {
							id: tenantId,
							appId: applicationId,
							key: key
						},
						form: {
							'expDate': expDateValue,
							'device': {
								'a': 'bbb'
							},
							'geo': {
								'x': 'yyy'
							},
							'env': 'STG',
							'label': "werwer"
						}
					};
					executeMyRequest(params, 'tenant/application/key/ext/add/', 'post', function (body) {
						//todo check this !
						//assert.ok(body.data);
						assert.ok(body);
						done();
					});
				});
				
				it('fail - wrong key', function (done) {
					let params = {
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
							},
							'env': 'DEV',
							'label': "werwer"
						}
					};
					executeMyRequest(params, 'tenant/application/key/ext/add/', 'post', function (body) {
						assert.deepEqual(body.errors.details[0], {"code": 440, "message": errorCodes[440]});
						done();
					});
				});
				
				it('fail - missing params', function (done) {
					let params = {
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
							},
							'env': 'DEV',
							'label': "werewewer"
						}
					};
					executeMyRequest(params, 'tenant/application/key/ext/add/', 'post', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 172,
							"message": "Missing required field: key"
						});
						
						done();
					});
				});
				
				it('mongo test for key', function (done) {
					mongo.findOne('tenants', {"code": "TSTN"}, function (error, records) {
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
						delete records.applications[0].keys[0].extKeys[0].dashboardAccess;
						assert.deepEqual(records.applications[0].keys[0].extKeys[0], {
							'expDate': new Date(expDateValue).getTime() + config.expDateTTL,
							'device': {
								'a': 'bbb'
							},
							'geo': {
								'x': 'yyy'
							},
							'env': 'STG',
							'label': "werwer"
						});
						done();
					});
				});
				
			});
			
			describe("add application ext keys 2", function () {
				
				it("success - will add two external keys (using locked product) but only one with dashboard access", function (done) {
					let params = {
						form: {
							'code': "RATE",
							'name': "Random Tenant",
							'email': "user@tenantDomain.com",
							"subTenant": '551286bce603d7e01ab1688e',
							"type": "client"
						}
					};
					executeMyRequest(params, 'tenant/add', 'post', function (tenant_body) {
						assert.ok(tenant_body.data.id);
						params = {
							qs: {
								"id": tenant_body.data.id
							},
							form: {
								'description': 'Test Dashboard application',
								'_TTL': '168',
								'productCode': 'DSBRD',
								'packageCode': 'OWNER'
							}
						};
						executeMyRequest(params, 'tenant/application/add', 'post', function (app_body) {
							assert.ok(app_body.data.appId);
							params = {
								qs: {
									"id": tenant_body.data.id,
									"appId": app_body.data.appId
								}
							};
							executeMyRequest(params, 'tenant/application/key/add', 'post', function (key_body) {
								assert.ok(key_body.data.key);
								params = {
									qs: {
										"id": tenant_body.data.id,
										"appId": app_body.data.appId,
										"key": key_body.data.key
									},
									form: {
										"env": "DEV", "label": "dsdas"
										
									}
								};
								executeMyRequest(params, 'tenant/application/key/ext/add', 'post', function (extKey_body) {
									assert.ok(extKey_body.data);
									assert.ok(extKey_body.data.extKey);
									params = {
										qs: {
											"id": tenant_body.data.id,
											"appId": app_body.data.appId,
											"key": key_body.data.key
										},
										form: {
											"env": "DEV",
											"label": "dsdas"
										}
									};
									executeMyRequest(params, 'tenant/application/key/ext/add', 'post', function (extKeyTwo_body) {
										assert.ok(extKeyTwo_body.data.extKey);
										done();
									});
								});
							});
						});
					});
				});
				
				it("success - will add an external key for DEV environment using its corresponding encryption key (tenant using new acl)", function (done) {
					let newAcl = {
						'dev': {
							'example01': {
								"access": ["user"],
								"apis": {}
							}
						},
						'dashboard': {
							'urac': {
								"access": false,
								"apis": {
									"/account/changeEmail": {
										"access": true
									}
								}
							},
							'dashboard': {
								"access": ["owner"],
								"apis": {}
							}
						}
					};
					
					let id;
					
					try {
						id = mongo.ObjectId(tenantId);
					} catch (e) {
						assert.ifError(e);
					}
					
					//Upgrading acl of TSTN from old to new and removing external keys for all environments except dashboard
					mongo.findOne("tenants", {"_id": id}, function (error, tenantRecord) {
						assert.ifError(error);
						assert.ok(tenantRecord);
						tenantRecord.applications[0].acl = newAcl;
						tenantRecord.applications[0].keys[0].extKeys = [
							{
								"extKey": extKey,
								"device": {},
								"geo": {},
								"env": "DASHBOARD",
								"dashboardAccess": true,
								"expDate": 1456498678832
							}
						];
						mongo.save("tenants", tenantRecord, function (error, result) {
							assert.ifError(error);
							assert.ok(result);
							
							let params = {
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
									},
									'env': 'STG',
									"label": "dsdaasdasds"
								}
							};
							
							executeMyRequest(params, 'tenant/application/key/ext/add/', 'post', function (body) {
								assert.ok(body.data);
								done();
							});
						});
					});
				});
				
				it("fail - trying to add an external key for an environment that does not exist", function (done) {
					let params = {
						qs: {
							id: tenantId,
							appId: applicationId,
							key: key
						},
						form: {
							'expDate': expDateValue,
							'device': {
								'a': 'cccb'
							},
							'geo': {
								'x': 'y'
							},
							'env': 'QAAAAA',
							"label": "dsdas"
						}
					};
					
					executeMyRequest(params, 'tenant/application/key/ext/add/', 'post', function (body) {
						assert.ok(body.errors);
						assert.deepEqual(body.errors.details[0], {"code": 446, "message": errorCodes[446]});
						done();
					});
				});
				
			});
			
			describe("update application ext keys", function () {
				it("success - will update ext key", function (done) {
					let params = {
						qs: {
							id: tenantId,
							appId: applicationId,
							key: key,
							extKeyEnv: 'DASHBOARD'
						},
						form: {
							'extKey': extKey,
							'expDate': expDateValue,
							'device': {
								'a': 'b'
							},
							'geo': {
								'x': 'y'
							},
							"label": "qweqweq"
						}
					};
					executeMyRequest(params, 'tenant/application/key/ext/update/', 'put', function (body) {
						assert.ok(body.data);
						done();
					});
				});
				
				it('fail - wrong key value', function (done) {
					let params = {
						qs: {
							id: tenantId,
							appId: applicationId,
							key: key,
							extKeyEnv: 'DEV'
						},
						form: {
							'extKey': 'fdfdgdfgdf',
							'expDate': new Date().toISOString(),
							'device': {
								'a': 'b'
							},
							'geo': {
								'x': 'y'
							},
							'label': "werwer"
						}
					};
					executeMyRequest(params, 'tenant/application/key/ext/update/', 'put', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 441,
							"message": "Unable to update the tenant application ext Key"
						});
						done();
					});
				});
				
				it('fail - missing params', function (done) {
					let params = {
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
							},
							"label": "dsdas"
						}
					};
					executeMyRequest(params, 'tenant/application/key/ext/update/', 'put', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 172,
							"message": "Missing required field: extKeyEnv, extKey"
						});
						
						done();
					});
				});
				
				it('mongo test. 1', function (done) {
					mongo.findOne('tenants', {"code": "TSTN"}, function (error, records) {
						assert.ifError(error);
						assert.ok(records);
						
						assert.ok(records.applications);
						assert.equal(records.applications.length, 1);
						assert.equal(records.applications[0].keys.length, 1);
						assert.ok(records.applications[0].keys[0].key);
						key = records.applications[0].keys[0].key;
						assert.equal(records.applications[0].keys[0].extKeys.length, 2);
						extKey = records.applications[0].keys[0].extKeys[0].extKey;
						delete records.applications[0].keys[0].extKeys[0].extKey;
						assert.deepEqual(records.applications[0].keys[0].extKeys[0], {
							'expDate': new Date(expDateValue).getTime() + config.expDateTTL,
							'device': {
								'a': 'b'
							},
							'geo': {
								'x': 'y'
							},
							'dashboardAccess': true,
							'env': 'DASHBOARD',
							"label": "qweqweq"
						});
						done();
					});
				});
			});
			
			describe("delete application ext keys", function () {
				it("success - will delete ext key", function (done) {
					let params = {
						qs: {
							id: tenantId,
							appId: applicationId,
							key: key
						},
						form: {
							'extKey': extKey,
							'extKeyEnv': 'DASHBOARD'
						}
					};
					executeMyRequest(params, 'tenant/application/key/ext/delete/', 'post', function (body) {
						assert.ok(body.data);
						done();
					});
				});
				it("fail - wrong key value", function (done) {
					let params = {
						qs: {
							id: tenantId,
							appId: 'hjghjvbhgj',
							key: key
						},
						form: {
							'extKey': extKey,
							'extKeyEnv': 'DEV'
						}
					};
					executeMyRequest(params, 'tenant/application/key/ext/delete/', 'post', function (body) {
						assert.ok(body.errors);
						assert.deepEqual(body.errors.details[0], {
							"code": 443,
							"message": "Unable to remove tenant application ext Key"
						});
						done();
					});
				});
				
				it('fail - missing params', function (done) {
					let params = {
						qs: {
							id: tenantId,
							appId: applicationId,
							key: key
						},
						form: {}
					};
					executeMyRequest(params, 'tenant/application/key/ext/delete/', 'post', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 172,
							"message": "Missing required field: extKeyEnv, extKey"
						});
						
						done();
					});
				});
				
				it('mongo test', function (done) {
					mongo.findOne('tenants', {"code": "TSTN"}, function (error, records) {
						assert.ifError(error);
						assert.ok(records);
						
						assert.ok(records.applications);
						assert.equal(records.applications.length, 1);
						assert.equal(records.applications[0].keys.length, 1);
						assert.ok(records.applications[0].keys[0].key);
						key = records.applications[0].keys[0].key;
						assert.equal(records.applications[0].keys[0].extKeys.length, 1);
						done();
					});
				});
			});
			
			describe("list application ext keys", function () {
				it("success - will list ext key", function (done) {
					let params = {
						qs: {
							id: tenantId,
							appId: applicationId,
							key: key
						}
					};
					executeMyRequest(params, 'tenant/application/key/ext/list/', 'get', function (body) {
						assert.ok(body.data);
						assert.equal(body.data.length, 1);
						done();
					});
				});
				it("success - wrong key, will return empty result", function (done) {
					let params = {
						qs: {
							id: tenantId,
							appId: applicationId,
							key: 'fffdfs'
						}
					};
					executeMyRequest(params, 'tenant/application/key/ext/list/', 'get', function (body) {
						assert.ok(body.data);
						assert.equal(body.data.length, 0);
						done();
					});
				});
				
				it("success - will add ext key to STG", function (done) {
					let params = {
						qs: {
							id: tenantId,
							appId: applicationId,
							key: key
						},
						form: {
							'expDate': expDateValue,
							'device': {
								'aa': 'bb'
							},
							'geo': {
								'xxx': 'yyy'
							},
							'env': 'STG',
							'label': "qweqweq"
						}
					};
					executeMyRequest(params, 'tenant/application/key/ext/add/', 'post', function (body) {
						assert.ok(body.data);
						done();
					});
				});
				
				it("success - will list ext key", function (done) {
					let params = {
						qs: {
							id: tenantId,
							appId: applicationId,
							key: key
						}
					};
					executeMyRequest(params, 'tenant/application/key/ext/list/', 'get', function (body) {
						assert.ok(body.data);
						assert.equal(body.data.length, 2);
						done();
					});
				});
				
				it("success - will list ext keys that contain an ext key with dashboard access", function (done) {
					mongo.findOne("tenants", {"code": "test"}, function (error, record) {
						assert.ifError(error);
						assert.ok(record);
						
						let params = {
							qs: {
								id: record._id.toString(),
								appId: record.applications[0].appId.toString(),
								key: record.applications[0].keys[0].key
							}
						};
						executeMyRequest(params, 'tenant/application/key/ext/list/', 'get', function (body) {
							assert.ok(body.data);
							assert.ok(body.data[0].dashboardAccess);
							done();
						});
					});
				});
			});
		});
		
		describe("application config", function () {
			describe("update application config", function () {
				
				it("success - will update configuration (empty config)", function (done) {
					let params = {
						qs: {
							id: tenantId,
							appId: applicationId,
							key: key
						},
						form: {
							'envCode': 'DEV',
							'config': {}
						}
					};
					executeMyRequest(params, 'tenant/application/key/config/update', 'put', function (body) {
						assert.ok(body.data);
						done();
					});
				});
				
				it("success - will update configuration", function (done) {
					let params = {
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
					executeMyRequest(params, 'tenant/application/key/config/update', 'put', function (body) {
						assert.ok(body.data);
						done();
					});
				});
				
				it("fail - wrong key: gfdgdf", function (done) {
					let params = {
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
					executeMyRequest(params, 'tenant/application/key/config/update', 'put', function (body) {
						assert.ok(body.errors);
						assert.deepEqual(body.errors.details[0],
							{"code": 445, "message": "Unable to update the tenant application configuration"});
						
						done();
					});
				});
				
				it('fail - missing params', function (done) {
					let params = {
						qs: {
							id: tenantId,
							appId: applicationId,
							key: key
						},
						form: {
							'envCode': 'DEV'
						}
					};
					executeMyRequest(params, 'tenant/application/key/config/update', 'put', function (body) {
						assert.deepEqual(body.errors.details[0], {
							"code": 172,
							"message": "Missing required field: config"
						});
						done();
					});
				});
				
				it("fail - invalid environment provided", function (done) {
					let params = {
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
					executeMyRequest(params, 'tenant/application/key/config/update', 'put', function (body) {
						assert.deepEqual(body.errors.details[0], {"code": 446, "message": errorCodes[446]});
						done();
					});
				});
				
				it('mongo test', function (done) {
					mongo.findOne('tenants', {"code": "TSTN"}, function (error, records) {
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
			
			describe("list application config", function () {
				it("success - will list configuration", function (done) {
					let params = {
						qs: {
							id: tenantId,
							appId: applicationId,
							key: key
						}
					};
					executeMyRequest(params, 'tenant/application/key/config/list', 'get', function (body) {
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
				it("fail - wrong key: jjjjjjkkkkkk", function (done) {
					let params = {
						qs: {
							id: tenantId,
							appId: applicationId,
							key: 'jjjjjjkkkkkk'
						}
					};
					///// no error msg returned. just empty objct
					executeMyRequest(params, 'tenant/application/key/config/list', 'get', function (body) {
						assert.ok(body);
						done();
					});
				});
				
			});
		});
		
		describe("Removal of automatically created dashboard tenant keys tests", function () {
			let tenantCode = "DTKT";
			let tenantId, appId, key, tenantExtKey;
			
			function createDashboardTenantKey(cb) {
				let params = {
					form: {
						'code': tenantCode,
						'name': "Dashboard Tenant Key Test",
						'email': "user@soajs.org",
						"subTenant": '551286bce603d7e01ab1688e',
						"type": "client"
					}
				};
				executeMyRequest(params, 'tenant/add', 'post', function (body) {
					if (body.result === false) {
						assert.ifError(body.result);
					}
					assert.ok(body.data.id);
					tenantId = body.data.id;
					params = {
						qs: {
							"id": tenantId
						},
						form: {
							'description': 'Test Dashboard application',
							'_TTL': '168',
							'productCode': 'DSBRD',
							'packageCode': 'OWNER'
						}
					};
					executeMyRequest(params, 'tenant/application/add', 'post', function (body) {
						assert.ok(body.data.appId);
						appId = body.data.appId;
						params = {
							qs: {
								"id": tenantId,
								"appId": appId
							}
						};
						executeMyRequest(params, 'tenant/application/key/add', 'post', function (body) {
							assert.ok(body.data.key);
							key = body.data.key;
							params = {
								qs: {
									"id": tenantId,
									"appId": appId,
									"key": key
								},
								form: {
									'env': 'DEV',
									"label": "qweqweq"
								}
							};
							executeMyRequest(params, 'tenant/application/key/ext/add', 'post', function (body) {
								assert.ok(body.data.extKey);
								tenantExtKey = body.data.extKey;
								cb();
							});
						});
					});
				});
			}
			
			function deleteTestingTenantIfExists(cb) {
				mongo.count('tenants', {'code': tenantCode}, function (error, count) {
					assert.ifError(error);
					
					if (count > 0) {
						mongo.remove('tenants', {'code': tenantCode}, function (error) {
							assert.ifError(error);
							cb();
						});
					} else {
						cb();
					}
				});
			}
			
			function deleteTenantUracDataIfExists(cb) {
				uracMongo.count('users', {'tenant.code': tenantCode}, function (error, count) {
					assert.ifError(error);
					
					if (count > 0) {
						uracMongo.remove('users', {'tenant.code': tenantCode}, function (error, data) {
							assert.ifError(error);
							assert.ok(data);
							
							uracMongo.remove('groups', {'tenant.code': tenantCode}, function (error, data) {
								assert.ifError(error);
								assert.ok(data);
								
								cb();
							});
						});
					} else {
						cb();
					}
				});
			}
			
			function checkIfKeyExists(code, cb) {
				mongo.findOne("dashboard_extKeys", {'code': code}, function (error, result) {
					assert.ifError(error);
					if (!result) {
						cb(null, true);
					} else {
						cb(null, false);
					}
				});
			}
			
			beforeEach("remove test tenant if it exists and recreate it", function (done) {
				deleteTestingTenantIfExists(function () {
					deleteTenantUracDataIfExists(function () {
						createDashboardTenantKey(function () {
							done();
						});
					});
				});
			});
			
			it("success - will automatically delete dashboard key when tenant gets deleted", function (done) {
				let params = {
					qs: {
						'id': tenantId
					}
				};
				executeMyRequest(params, 'tenant/delete', 'delete', function (body) {
					if (body.result === false) {
						assert.ifError(body);
					}
					
					checkIfKeyExists(tenantCode, function (error, deleted) {
						assert.ifError(error);
						assert.ok(deleted);
						assert.equal(deleted, true);
						done();
					});
				});
			});
			
			it("success - will automatically delete dashboard key when application gets deleted", function (done) {
				let params = {
					qs: {
						"id": tenantId,
						"appId": appId
					}
				};
				executeMyRequest(params, 'tenant/application/delete', 'delete', function (body) {
					if (body.result === false) {
						assert.ifError(body.result);
					}
					
					checkIfKeyExists(tenantCode, function (error, deleted) {
						assert.ifError(error);
						assert.ok(deleted);
						assert.equal(deleted, true);
						done();
					});
				});
			});
			
			it("success - will automatically delete dashboard key when key gets deleted", function (done) {
				let params = {
					qs: {
						"id": tenantId,
						"appId": appId,
						"key": key
					}
				};
				executeMyRequest(params, 'tenant/application/key/delete', 'delete', function (body) {
					if (body.result === false) {
						assert.ifError(body.result);
					}
					
					checkIfKeyExists(tenantCode, function (error, deleted) {
						assert.ifError(error);
						assert.ok(deleted);
						assert.equal(deleted, true);
						done();
					});
				});
			});
			
			it("success - will automatically delete dashboard key when external key gets deleted", function (done) {
				let params = {
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
					assert.equal(body.result, true);
					checkIfKeyExists(tenantCode, function (error, deleted) {
						assert.ifError(error);
						assert.ok(deleted);
						assert.equal(deleted, true);
						done();
					});
				});
			});
		});
		
		describe("mongo check db", function () {
			
			it('asserting tenant record', function (done) {
				//TSTN
				mongo.findOne('tenants', {"code": 'TSTN'}, function (error, record) {
					assert.ifError(error);
					assert.ok(record);
					delete record._id;
					delete record.applications[0].appId;
					
					assert.ok(record.applications[0].keys[0].key);
					delete record.applications[0].keys[0].key;
					
					assert.ok(record.applications[0].keys[0].extKeys[0].extKey);
					delete record.applications[0].keys[0].extKeys[0].extKey;
					
					assert.ok(record.applications[0].keys[0].extKeys[1].extKey);
					delete record.applications[0].keys[0].extKeys[1].extKey;
					
					assert.deepEqual(record.oauth, {
						"secret": "my secret key",
						"redirectURI": "http://www.myredirecturi.com/",
						"grants": [
							"password", "refresh_token"
						],
						"loginMode": "urac",
						"disabled": 0
					});
					delete record.oauth;
					assert.deepEqual(record.applications, [
						{
							"product": "TPROD",
							"package": "TPROD_BASIC",
							"description": "this is a dummy description",
							"_TTL": 12 * 3600 * 1000,
							"acl": {
								'dev': {
									'example01': {
										"access": ["user"],
										"apis": {}
									}
								},
								'dashboard': {
									'urac': {
										"access": false,
										"apis": {
											"/account/changeEmail": {
												"access": true
											}
										}
									},
									'dashboard': {
										"access": ["owner"],
										"apis": {}
									}
								}
							},
							"keys": [
								{
									"extKeys": [
										{
											"expDate": new Date(expDateValue).getTime() + config.expDateTTL,
											"dashboardAccess": false,
											"device": {'a': 'b'},
											"geo": {'x': 'y'},
											"env": 'STG',
											"label": "dsdaasdasds"
										},
										{
											"expDate": new Date(expDateValue).getTime() + config.expDateTTL,
											"dashboardAccess": false,
											"device": {'aa': 'bb'},
											"geo": {'xxx': 'yyy'},
											"env": 'STG',
											"label": "qweqweq"
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
					delete record.currentKeyId;
					assert.deepEqual(record, {
						"code": "TSTN",
						"name": "test tenant",
						"description": "this is a dummy description",
						"type": "client",
						"tenant": {
							"code": "DBTN",
							"id": "551286bce603d7e01ab1688e"
						}
					});
					done();
				});
			});
			
		});
		
		
	});
	
});
