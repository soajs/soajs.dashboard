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

const extKey = 'aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac';

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

describe("DASHBOARD UNIT Tests: Services & Daemons", function () {
	
	after(function (done) {
		mongo.closeDb();
		done();
	});
	
	describe("services tests", function () {
		
		describe("list services test", function () {
			it("success - will get services list", function (done) {
				executeMyRequest({}, 'services/list', 'post', function (body) {
					assert.ok(body.data);
					done();
				});
			});
			it("success - will get services list specific services", function (done) {
				let params = {
					form: {
						"serviceNames": ['urac']
					}
				};
				executeMyRequest(params, 'services/list', 'post', function (body) {
					assert.ok(body.data);
					done();
				});
			});
		});
		
		describe("list dashboard test", function () {
			it("success - will get dashboard list services", function (done) {
				executeMyRequest({}, 'services/dashboard/services', 'post', function (body) {
					assert.ok(body.data);
					done();
				});
			});
			it("success - will get dashboard list apiRoutes", function (done) {
				executeMyRequest({}, 'services/dashboard/apiRoutes', 'post', function (body) {
					assert.ok(body.data);
					done();
				});
			});
		});
		
		describe("update service settings tests", function () {
			
			it("success - will update settings", function (done) {
				//NOTE: this test only calls the api for coverage, functionality is tested in unit tests
				let params = {
					qs: {
						id: 'dummyServiceId'
					},
					form: {
						"env": "dev",
						"version": "1",
						"settings": {}
					}
				};
				executeMyRequest(params, 'services/settings/update', 'put', function (body) {
					assert.ok(body);
					done();
				});
			});
			
		});
		
	});
	
	describe("daemons/groups tests", function () {
		
		describe("daemons tests", function () {
			let daemonId = "";
			// to get id
			describe("list daemon tests", function () {
				
				it("success - list all daemons", function (done) {
					executeMyRequest({}, 'daemons/list', 'post', function (body) {
						assert.ok(body.data);
						assert.ok(body.data.length > 0);
						daemonId = body.data[0]._id.toString();
						done();
					});
				});
				
				it("success - list all daemons with group configurations of each", function (done) {
					let params = {
						qs: {
							getGroupConfigs: true
						}
					};
					executeMyRequest(params, 'daemons/list', 'post', function (body) {
						assert.ok(body.data);
						assert.ok(body.data.length > 0);
						done();
					});
				});
				
				it("success - list only specified daemons", function (done) {
					let params = {
						form: {
							"daemonNames": ['helloDaemon']
						}
					};
					executeMyRequest(params, 'daemons/list', 'post', function (body) {
						assert.ok(body.data);
						assert.ok(body.data.length > 0);
						done();
					});
				});
			});
			
		});
		
		describe("group configuration tests", function () {
			let groupId = "";
			
			describe("add group config tests", function () {
				
				it("success - add new group config", function (done) {
					let params = {
						form: {
							"groupName": "test group config 1",
							"daemon": "orderDaemon",
							"interval": 150000,
							"status": 0,
							"solo": true,
							"processing": "parallel",
							"type": "interval",
							"jobs": {},
							"order": []
						}
					};
					executeMyRequest(params, "daemons/groupConfig/add", "post", function (body) {
						assert.ok(body.data);
						assert.deepEqual(body.data, true);
						done();
					});
				});
				
				it("fail - missing required param", function (done) {
					let params = {
						form: {
							"groupName": "test group config 1",
							"interval": 150000,
							"status": 0,
							"solo": true,
							"processing": "parallel",
							"type": "interval",
							"jobs": {},
							"order": []
						}
					};
					executeMyRequest(params, "daemons/groupConfig/add", "post", function (body) {
						assert.ok(body.errors);
						assert.deepEqual(body.errors.details[0], {
							"code": 172,
							"message": "Missing required field: daemon"
						});
						done();
					});
				});
				
				it("fail - group config already exists", function (done) {
					let params = {
						form: {
							"groupName": "test group config 1",
							"daemon": "orderDaemon",
							"interval": 150000,
							"status": 0,
							"solo": true,
							"processing": "parallel",
							"type": "interval",
							"jobs": {},
							"order": []
						}
					};
					executeMyRequest(params, "daemons/groupConfig/add", "post", function (body) {
						assert.ok(body.errors);
						assert.deepEqual(body.errors.details[0], {"code": 714, "message": errorCodes[714]});
						done();
					});
				});
			});
			
			describe("update group config tests", function () {
				
				before("get group config data", function (done) {
					mongo.findOne("daemon_grpconf", {"daemonConfigGroup": "test group config 1"}, function (error, data) {
						assert.ifError(error);
						assert.ok(data);
						groupId = data._id.toString();
						done();
					});
				});
				
				it("success - updates group", function (done) {
					let params = {
						qs: {
							"id": groupId
						},
						form: {
							"groupName": "test group config 2",
							"daemon": "orderDaemon",
							"interval": 200000,
							"status": 1,
							"solo": false,
							"processing": "parallel",
							"type": "interval",
							"jobs": {},
							"order": []
						}
					};
					executeMyRequest(params, "daemons/groupConfig/update", "put", function (body) {
						assert.ok(body.data);
						assert.deepEqual(body.data, true);
						done();
					});
				});
				
				it("fail - invalid id provided", function (done) {
					let params = {
						qs: {
							"id": "123:::321"
						},
						form: {
							"groupName": "test group config 2",
							"daemon": "orderDaemon",
							"interval": 200000,
							"status": 1,
							"solo": false,
							"processing": "parallel",
							"type": "interval",
							"jobs": {},
							"order": []
						}
					};
					executeMyRequest(params, "daemons/groupConfig/update", "put", function (body) {
						assert.ok(body.errors);
						assert.deepEqual(body.errors.details[0], {code: 701, message: errorCodes[701]});
						done();
					});
				});
				
				it("fail - missing required param", function (done) {
					let params = {
						form: {
							"groupName": "test group config 3",
							"daemon": "orderDaemon",
							"interval": 200000,
							"status": 1,
							"solo": false,
							"processing": "parallel",
							"type": "interval",
							"jobs": {},
							"order": []
						}
					};
					executeMyRequest(params, "daemons/groupConfig/update", "put", function (body) {
						assert.ok(body.errors);
						assert.deepEqual(body.errors.details[0], {
							"code": 172,
							"message": "Missing required field: id"
						});
						done();
					});
				});
			});
			
			describe("delete group config tests", function () {
				
				it("fail - missing required param", function (done) {
					executeMyRequest({}, "daemons/groupConfig/delete", "delete", function (body) {
						assert.ok(body.errors);
						assert.deepEqual(body.errors.details[0], {
							"code": 172,
							"message": "Missing required field: id"
						});
						done();
					});
				});
				
				it("success - deletes group", function (done) {
					let params = {
						qs: {
							"id": groupId
						}
					};
					executeMyRequest(params, "daemons/groupConfig/delete", "delete", function (body) {
						assert.ok(body.data);
						assert.deepEqual(body.data, true);
						done();
					});
				});
			});
			
			describe("list group config tests", function () {
				
				it("success - list all group configs", function (done) {
					executeMyRequest({}, 'daemons/groupConfig/list', 'post', function (body) {
						assert.ok(body.data);
						assert.ok(body.data.length > 0);
						done();
					});
				});
				
				it("success - list only specified group configs", function (done) {
					let params = {
						form: {
							"grpConfNames": ['group1']
						}
					};
					executeMyRequest(params, 'daemons/groupConfig/list', 'post', function (body) {
						assert.ok(body.data);
						done();
					});
				});
			});
			
			describe("update service configuration tests", function () {
				
				before("create a new daemon group configuration and get its id", function (done) {
					let params = {
						form: {
							"groupName": "test group config 5",
							"daemon": "orderDaemon",
							"interval": 150000,
							"status": 0,
							"solo": true,
							"processing": "parallel",
							"type": "interval",
							"jobs": {
								someJob: {
									type: "global",
									serviceConfig: {},
									tenantExtKeys: [],
									tenantsInfo: []
								}
							},
							"order": []
						}
					};
					executeMyRequest(params, "daemons/groupConfig/add", "post", function (body) {
						assert.ok(body.data);
						assert.deepEqual(body.data, true);
						
						mongo.findOne("daemon_grpconf", {daemonConfigGroup: "test group config 5"}, function (error, group) {
							assert.ifError(error);
							assert.ok(group);
							groupId = group._id.toString();
							done();
						});
					});
				});
				
				it("success - service configuration updated successfully", function (done) {
					let params = {
						qs: {
							id: groupId,
							jobName: "someJob"
						},
						form: {
							env: "dev",
							config: {"testProperty": "testValue"}
						}
					};
					executeMyRequest(params, "daemons/groupConfig/serviceConfig/update", "put", function (body) {
						assert.ok(body.data);
						assert.deepEqual(body.data, true);
						done();
					});
				});
				
				it("success - delete service configuration successfully", function (done) {
					let params = {
						qs: {
							id: groupId,
							jobName: "someJob"
						},
						form: {
							env: "dev",
							config: {}
						}
					};
					executeMyRequest(params, "daemons/groupConfig/serviceConfig/update", "put", function (body) {
						assert.ok(body.data);
						assert.deepEqual(body.data, true);
						done();
					});
				});
				
				it("fail - missing required params", function (done) {
					let params = {
						form: {
							env: "dev",
							config: {"testProperty": "testValue"}
						}
					};
					executeMyRequest(params, "daemons/groupConfig/serviceConfig/update", "put", function (body) {
						assert.ok(body.errors);
						assert.deepEqual(body.errors.details[0], {
							"code": 172,
							"message": "Missing required field: id, jobName"
						});
						done();
					});
				});
			});
			
			describe("list service configuration tests", function () {
				
				before("update service configuration for job", function (done) {
					let params = {
						qs: {
							id: groupId,
							jobName: "someJob"
						},
						form: {
							env: "dev",
							config: {
								"prop1": "value1",
								"prop2": "value2"
							}
						}
					};
					executeMyRequest(params, "daemons/groupConfig/serviceConfig/update", "put", function (body) {
						assert.ok(body.data);
						assert.deepEqual(body.data, true);
						done();
					});
				});
				
				it("success - lists service configuration of specified job", function (done) {
					let params = {
						qs: {
							id: groupId,
							jobName: "someJob"
						}
					};
					executeMyRequest(params, "daemons/groupConfig/serviceConfig/list", "get", function (body) {
						assert.ok(body.data);
						assert.ok(Object.keys(body.data).length > 0);
						done();
					});
				});
				
				it("fail - missing required params", function (done) {
					let params = {
						qs: {
							id: groupId
						}
					};
					executeMyRequest(params, "daemons/groupConfig/serviceConfig/list", "get", function (body) {
						assert.ok(body.errors);
						assert.deepEqual(body.errors.details[0], {
							"code": 172,
							"message": "Missing required field: jobName"
						});
						done();
					});
				});
				
				it("fail - job does not exist", function (done) {
					let params = {
						qs: {
							id: groupId,
							jobName: "wrongJob"
						}
					};
					executeMyRequest(params, "daemons/groupConfig/serviceConfig/list", "get", function (body) {
						assert.ok(body.errors);
						assert.deepEqual(body.errors.details[0], {"code": 724, "message": errorCodes[724]});
						done();
					});
				});
			});
			
			describe("update tenant external keys tests", function () {
				
				before("update test group and add a job of type tenant", function (done) {
					let params = {
						qs: {
							"id": groupId
						},
						form: {
							"groupName": "test group config 2",
							"daemon": "orderDaemon",
							"interval": 200000,
							"status": 1,
							"solo": true,
							"processing": "parallel",
							"type": "interval",
							"jobs": {
								anotherJob: {
									"type": "tenant",
									"serviceConfig": {},
									"tenantExtKeys": [],
									"tenantsInfo": []
								}
							},
							"order": []
						}
					};
					executeMyRequest(params, "daemons/groupConfig/update", "put", function (body) {
						assert.ok(body.data);
						assert.deepEqual(body.data, true);
						done();
					});
				});
				
				it("success - updates test group", function (done) {
					let params = {
						qs: {
							"id": groupId,
							"jobName": "anotherJob"
						},
						form: {
							tenantExtKeys: [
								"123456780c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac"
							],
							tenantsInfo: [
								{
									"code": "TTNT",
									"name": "Testing Tenant",
									"appDescription": "Fake tenant used for testing purposes",
									"package": "TPROD_ABC",
									"extKey": "123456780c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac"
								}
							]
						}
					};
					executeMyRequest(params, "daemons/groupConfig/tenantExtKeys/update", "put", function (body) {
						assert.ok(body.data);
						assert.deepEqual(body.data, true);
						done();
					});
				});
				
				it("fails - missing required params", function (done) {
					let params = {
						qs: {
							"id": groupId
						},
						form: {
							tenantExtKeys: [
								"123456780c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac"
							],
							tenantsInfo: [
								{
									"code": "TTNT",
									"name": "Testing Tenant",
									"appDescription": "Fake tenant used for testing purposes",
									"package": "TPROD_ABC",
									"extKey": "123456780c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac"
								}
							]
						}
					};
					executeMyRequest(params, "daemons/groupConfig/tenantExtKeys/update", "put", function (body) {
						assert.ok(body.errors);
						assert.deepEqual(body.errors.details[0], {
							"code": 172,
							"message": "Missing required field: jobName"
						});
						done();
					});
				});
			});
			
			describe("list tenant external keys tests", function () {
				
				it("success - lists tenant external keys of specified job", function (done) {
					let params = {
						qs: {
							id: groupId,
							jobName: "anotherJob"
						}
					};
					executeMyRequest(params, "daemons/groupConfig/tenantExtKeys/list", "get", function (body) {
						assert.ok(body.data);
						assert.ok(body.data.length > 0);
						done();
					});
				});
				
				it("fail - missing required params", function (done) {
					let params = {
						qs: {
							id: groupId
						}
					};
					executeMyRequest(params, "daemons/groupConfig/tenantExtKeys/list", "get", function (body) {
						assert.ok(body.errors);
						assert.deepEqual(body.errors.details[0], {
							"code": 172,
							"message": "Missing required field: jobName"
						});
						done();
					});
				});
				
				it("fail - job does not exist", function (done) {
					let params = {
						qs: {
							id: groupId,
							jobName: "wrongJob"
						}
					};
					executeMyRequest(params, "daemons/groupConfig/tenantExtKeys/list", "get", function (body) {
						assert.ok(body.errors);
						assert.deepEqual(body.errors.details[0], {"code": 724, "message": errorCodes[724]});
						done();
					});
				});
				
			});
			
			after("delete test group", function (done) {
				let params = {
					qs: {
						"id": groupId
					}
				};
				executeMyRequest(params, "daemons/groupConfig/delete", "delete", function (body) {
					assert.ok(body.data);
					assert.deepEqual(body.data, true);
					done();
				});
			});
		});
	});
	
});
