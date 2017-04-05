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

var extKey = 'aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac';
var access_token;
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
		if (access_token) {
			if (!options.qs) {
				options.qs = {};
			}
			options.qs['access_token'] = access_token;
		}
		request[method](options, function (error, response, body) {
			assert.ifError(error);
			assert.ok(body);
			return cb(null, body);
		});
	}
}

describe("Content Builder Tests", function () {
	var Authorization;
	var cbConfig = {
		"genericService": {
			"config": {
				"errors": {
					"400": "Database Error",
					"401": "Invalid Page Id Provided"
				},
				"schema": {
					"commonFields": {
						"id": {
							"source": [
								"query.id"
							],
							"validation": {
								"_type": "string"
							},
							"req": true
						},
						"title": {
							"source": [
								"body.title"
							],
							"validation": {
								"_type": "string"
							},
							"req": true
						},
						"content": {
							"source": [
								"body.content"
							],
							"validation": {
								"_type": "string"
							},
							"req": true
						}
					},
					"/list": {
						"_apiInfo": {
							"l": "List Entries",
							"group": "Pages",
							"groupMain": true
						}
					},
					"/add": {
						"_apiInfo": {
							"l": "Add Page",
							"group": "Pages"
						},
						"commonFields": [
							"title",
							"content"
						]
					},
					"/update": {
						"_apiInfo": {
							"l": "Update Page",
							"group": "Pages"
						},
						"commonFields": [
							"title",
							"content",
							"id"
						]
					},
					"/get": {
						"_apiInfo": {
							"l": "Get One Page",
							"group": "Pages"
						},
						"commonFields": [
							"id"
						]
					},
					"/delete": {
						"_apiInfo": {
							"l": "Delete Page",
							"group": "Pages"
						},
						"commonFields": [
							"id"
						]
					}
				},
				"serviceName": "gc-myservice",
				"servicePort": 4500,
				"requestTimeout": 30,
				"requestTimeoutRenewal": 5,
				"awareness": false,
				"extKeyRequired": true
			},
			"options": {
				"multitenant": true,
				"security": true,
				"session": true,
				"acl": true,
				"oauth": false
			}
		},
		"soajsService": {
			"db": {
				"config": {
					"DEV": {
						"gc-myservice": {
							"tenantSpecific": true,
							"cluster": "cluster1"
						}
					}
				},
				"multitenant": true,
				"collection": "data"
			},
			"apis": {
				"/list": {
					"method": "get",
					"mw": {
						"code": 400
					},
					"type": "list",
					"workflow": {}
				},
				"/add": {
					"method": "post",
					"mw": {
						"code": 400,
						"model": "add"
					},
					"type": "add",
					"workflow": {}
				},
				"/update": {
					"method": "post",
					"mw": {
						"code": 401,
						"model": "update"
					},
					"type": "update",
					"workflow": {}
				},
				"/get": {
					"method": "get",
					"mw": {
						"code": 401
					},
					"type": "get",
					"workflow": {}
				},
				"/delete": {
					"method": "get",
					"mw": {
						"code": 401
					},
					"type": "delete",
					"workflow": {}
				}
			}
		},
		"soajsUI": {
			"list": {
				"columns": [
					{
						"label": "Title",
						"name": "title",
						"field": "fields.title",
						"filter": []
					}
				],
				"defaultSortField": "title",
				"defaultSortASC": false
			},
			"form": {
				"add": [
					{
						"name": "title",
						"label": "Title",
						"placeholder": "My Page ...",
						"tooltip": "Enter the title of the page",
						"_type": "text",
						"req": true
					},
					{
						"name": "content",
						"label": "Content",
						"placeholder": "",
						"tooltip": "",
						"_type": "editor",
						"req": true
					}
				],
				"update": [
					{
						"name": "title",
						"label": "Title",
						"placeholder": "My Page ...",
						"tooltip": "Enter the title of the page",
						"_type": "text",
						"req": true
					},
					{
						"name": "content",
						"label": "Content",
						"placeholder": "",
						"tooltip": "",
						"_type": "editor",
						"req": true
					}
				]
			}
		}
	};
	
	before(function (done) {
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
				mongo.remove('gc', {}, function (error) {
					assert.ifError(error);
					mongo.remove('gc_versioning', {}, function (error) {
						assert.ifError(error);
						done();
					});
				});
			});
		});
		
	});
	
	after(function (done) {
		mongo.closeDb();
		done();
	});
	
	describe("Add Content Builder Tests", function () {
		
		it("success - add content builder", function (done) {
			var params = {
				form: {
					'name': 'gc-myservice',
					'config': cbConfig
				}
			};
			executeMyRequest(params, 'cb/add', 'post', function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				done();
			});
		});
		
		it("fail - missing information", function (done) {
			var params = {
				form: {
					'config': cbConfig
				}
			};
			executeMyRequest(params, 'cb/add', 'post', function (body) {
				assert.ok(!body.result);
				assert.deepEqual(body.errors.details[0],
					{"code": 172, "message": "Missing required field: name"});
				done();
			});
		});
		
		it("fail - content builder exists", function (done) {
			var params = {
				form: {
					'name': 'gc-myservice',
					'config': cbConfig
				}
			};
			executeMyRequest(params, 'cb/add', 'post', function (body) {
				assert.ok(!body.result);
				assert.deepEqual(body.errors.details[0],
					{"code": 700, "message": errorCodes[700]});
				done();
			});
		});
		
		it("fail - content builder name matches existing service", function (done) {
			var params = {
				form: {
					'name': 'dashboard',
					'config': cbConfig
				}
			};
			executeMyRequest(params, 'cb/add', 'post', function (body) {
				assert.ok(!body.result);
				assert.deepEqual(body.errors.details[0],
					{"code": 704, "message": errorCodes[704]});
				done();
			});
		});
		
		it("success - mongo", function (done) {
			mongo.count('gc', {'name': 'gc-myservice'}, function (error, count) {
				assert.ifError(error);
				assert.ok(count);
				assert.equal(count, 1);
				mongo.count('gc_versioning', {'name': 'gc-myservice'}, function (error, count) {
					assert.ifError(error);
					assert.equal(count, 0);
					mongo.count('services', {'name': 'gc-myservice'}, function (error, count) {
						assert.ifError(error);
						assert.equal(count, 1);
						done();
					});
				});
			});
		});
	});
	
	describe("Update Content Builder Tests", function () {
		var gc;
		
		it("fail - missing param", function (done) {
			var params = {
				form: {
					'config': cbConfig
				}
			};
			executeMyRequest(params, 'cb/update', 'put', function (body) {
				assert.ok(!body.result);
				assert.deepEqual(body.errors.details[0],
					{"code": 172, "message": "Missing required field: id"});
				done();
			});
		});
		
		it("fail - invalid id", function (done) {
			var params = {
				qs: {
					'id': 'invalidId'
				},
				form: {
					'config': cbConfig
				}
			};
			executeMyRequest(params, 'cb/update', 'put', function (body) {
				assert.ok(!body.result);
				assert.deepEqual(body.errors.details[0],
					{"code": 701, "message": errorCodes[701]});
				mongo.findOne('gc', {}, function (error, gcdb) {
					assert.ifError(error);
					assert.ok(gcdb);
					gc = gcdb;
					done();
				});
			});
		});
		
		it("fail - wrong id", function (done) {
			var params = {
				qs: {
					'id': '55bb5478dd52929d97bd49bb'
				},
				form: {
					'config': cbConfig
				}
			};
			executeMyRequest(params, 'cb/update', 'put', function (body) {
				assert.ok(!body.result);
				assert.deepEqual(body.errors.details[0],
					{"code": 702, "message": errorCodes[702]});
				mongo.findOne('gc', {}, function (error, gcdb) {
					assert.ifError(error);
					assert.ok(gcdb);
					gc = gcdb;
					done();
				});
			});
		});
		
		it("fail - content builder name matches existing service", function (done) {
			var data = util.cloneObj(cbConfig);
			data.genericService.config.serviceName = 'dashboard';
			var params = {
				qs: {
					'id': gc._id.toString()
				},
				form: {
					'config': data
				}
			};
			executeMyRequest(params, 'cb/update', 'put', function (body) {
				assert.ok(!body.result);
				assert.deepEqual(body.errors.details[0],
					{"code": 704, "message": errorCodes[704]});
				done();
			});
		});
		
		it("fail - content builder port matches existing service", function (done) {
			var data = util.cloneObj(cbConfig);
			data.genericService.config.servicePort = 4003;
			var params = {
				qs: {
					'id': gc._id.toString()
				},
				form: {
					'config': data
				}
			};
			executeMyRequest(params, 'cb/update', 'put', function (body) {
				assert.ok(!body.result);
				assert.deepEqual(body.errors.details[0],
					{"code": 704, "message": errorCodes[704]});
				done();
			});
		});
		
		it("success - no versioning", function (done) {
			var data = util.cloneObj(cbConfig);
			var params = {
				qs: {
					'id': gc._id.toString()
				},
				form: {
					'config': data
				}
			};
			executeMyRequest(params, 'cb/update', 'put', function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				mongo.count('gc_versioning', {}, function (error, count) {
					assert.ifError(error);
					assert.equal(count, 0);
					done();
				});
			});
		});
		
		it("success - versioning imfv1 changed", function (done) {
			var data = util.cloneObj(cbConfig);
			data.genericService.config.schema.commonFields['text'] =
			{
				"source": [
					"body.text"
				],
				"validation": {
					"_type": "string"
				},
				"req": true
			};
			var params = {
				qs: {
					'id': gc._id.toString()
				},
				form: {
					'config': data
				}
			};
			executeMyRequest(params, 'cb/update', 'put', function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				mongo.count('gc_versioning', {}, function (error, count) {
					assert.ifError(error);
					assert.equal(count, 1);
					done();
				});
			});
		});
		
		it("success - versioning imfv2 inputs changed", function (done) {
			var data = util.cloneObj(cbConfig);
			data.genericService.config.schema.commonFields['text'] =
			{
				"source": [
					"body.text"
				],
				"validation": {
					"_type": "string",
					'format': 'alphanumeric'
				},
				"req": true
			};
			var params = {
				qs: {
					'id': gc._id.toString()
				},
				form: {
					'config': data
				}
			};
			executeMyRequest(params, 'cb/update', 'put', function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				mongo.count('gc_versioning', {}, function (error, count) {
					assert.ifError(error);
					assert.equal(count, 2);
					done();
				});
			});
		});
		
		it("success - versioning apis1 inputs changed", function (done) {
			var data = util.cloneObj(cbConfig);
			data.genericService.config.schema.commonFields['text'] =
			{
				"source": [
					"body.text"
				],
				"validation": {
					"_type": "string",
					'format': 'alphanumeric'
				},
				"req": true
			};
			
			data.soajsService.apis['/test'] = {
				"method": "get",
				"mw": {
					"code": 400
				},
				"type": "list",
				"workflow": {}
			};
			var params = {
				qs: {
					'id': gc._id.toString()
				},
				form: {
					'config': data
				}
			};
			executeMyRequest(params, 'cb/update', 'put', function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				mongo.count('gc_versioning', {}, function (error, count) {
					assert.ifError(error);
					assert.equal(count, 2);
					done();
				});
			});
		});
		
		it("success - versioning apis2 inputs changed", function (done) {
			var data = util.cloneObj(cbConfig);
			data.genericService.config.schema.commonFields['text'] =
			{
				"source": [
					"body.text"
				],
				"validation": {
					"_type": "string",
					'format': 'alphanumeric'
				},
				"req": true
			};
			
			data.soajsService.apis['/test'] = {
				"method": "get",
				"mw": {
					"code": 400
				},
				"type": "add",
				"workflow": {}
			};
			var params = {
				qs: {
					'id': gc._id.toString()
				},
				form: {
					'config': data
				}
			};
			executeMyRequest(params, 'cb/update', 'put', function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				mongo.count('gc_versioning', {}, function (error, count) {
					assert.ifError(error);
					assert.equal(count, 3);
					done();
				});
			});
		});
		
		it("success - versioning apis workflow1 changed", function (done) {
			var data = util.cloneObj(cbConfig);
			data.genericService.config.schema.commonFields['text'] =
			{
				"source": [
					"body.text"
				],
				"validation": {
					"_type": "string",
					'format': 'alphanumeric'
				},
				"req": true
			};
			
			data.soajsService.apis['/test'] = {
				"method": "get",
				"mw": {
					"code": 400
				},
				"type": "add",
				"workflow": {
					'preExec': 'console.log(1);'
				}
			};
			var params = {
				qs: {
					'id': gc._id.toString()
				},
				form: {
					'config': data
				}
			};
			executeMyRequest(params, 'cb/update', 'put', function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				mongo.count('gc_versioning', {}, function (error, count) {
					assert.ifError(error);
					assert.equal(count, 4);
					done();
				});
			});
		});
		
		it("success - versioning apis workflow2 changed", function (done) {
			var data = util.cloneObj(cbConfig);
			data.genericService.config.schema.commonFields['text'] =
			{
				"source": [
					"body.text"
				],
				"validation": {
					"_type": "string",
					'format': 'alphanumeric'
				},
				"req": true
			};
			
			data.soajsService.apis['/test'] = {
				"method": "get",
				"mw": {
					"code": 400
				},
				"type": "add",
				"workflow": {
					'preExec': 'console.log(2);'
				}
			};
			var params = {
				qs: {
					'id': gc._id.toString()
				},
				form: {
					'config': data
				}
			};
			executeMyRequest(params, 'cb/update', 'put', function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				mongo.count('gc_versioning', {}, function (error, count) {
					assert.ifError(error);
					assert.equal(count, 5);
					cbConfig = data;
					done();
				});
			});
		});
		
		it("success - versioning apis ui1 changed", function (done) {
			var data = util.cloneObj(cbConfig);
			data.soajsUI.list.columns.push({
				"label": "Text",
				"name": "text",
				"field": "fields.text",
				"filter": []
			});
			var params = {
				qs: {
					'id': gc._id.toString()
				},
				form: {
					'config': data
				}
			};
			executeMyRequest(params, 'cb/update', 'put', function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				mongo.count('gc_versioning', {}, function (error, count) {
					assert.ifError(error);
					assert.equal(count, 6);
					done();
				});
			});
		});
		
		it("success - versioning apis ui2 changed", function (done) {
			var data = util.cloneObj(cbConfig);
			data.soajsUI.list.columns.push({
				"label": "Text",
				"name": "text",
				"field": "fields.text",
				"filter": ['date']
			});
			var params = {
				qs: {
					'id': gc._id.toString()
				},
				form: {
					'config': data
				}
			};
			executeMyRequest(params, 'cb/update', 'put', function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				mongo.count('gc_versioning', {}, function (error, count) {
					assert.ifError(error);
					assert.equal(count, 7);
					done();
				});
			});
		});
		
		it("success - versioning apis ui3 changed", function (done) {
			var data = util.cloneObj(cbConfig);
			data.soajsUI.list.columns.push({
				"label": "Text",
				"name": "text",
				"field": "fields.text",
				"filter": ['date']
			});
			
			data.soajsUI.form.add.push({
				"name": "text",
				"label": "Text",
				"placeholder": "My Page ...",
				"tooltip": "Enter the title of the page",
				"_type": "text",
				"req": true
			});
			var params = {
				qs: {
					'id': gc._id.toString()
				},
				form: {
					'config': data
				}
			};
			executeMyRequest(params, 'cb/update', 'put', function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				mongo.count('gc_versioning', {}, function (error, count) {
					assert.ifError(error);
					assert.equal(count, 8);
					done();
				});
			});
		});
		
		it("success - versioning apis ui4 changed", function (done) {
			var data = util.cloneObj(cbConfig);
			data.soajsUI.list.columns.push({
				"label": "Text",
				"name": "text",
				"field": "fields.text",
				"filter": ['date']
			});
			
			data.soajsUI.form.add.push({
				"name": "text",
				"label": "Text",
				"placeholder": "My Text ...",
				"tooltip": "Enter the title of the page",
				"_type": "text",
				"req": true
			});
			var params = {
				qs: {
					'id': gc._id.toString()
				},
				form: {
					'config': data
				}
			};
			executeMyRequest(params, 'cb/update', 'put', function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				mongo.count('gc_versioning', {}, function (error, count) {
					assert.ifError(error);
					assert.equal(count, 9);
					cbConfig = data;
					done();
				});
			});
		});
		
		it("success - versioning apis ui5 changed", function (done) {
			var data = util.cloneObj(cbConfig);
			data.soajsUI.form.update.push({
				"name": "text2",
				"label": "Text",
				"placeholder": "My Page ...",
				"tooltip": "Enter the title of the page",
				"_type": "text",
				"req": true
			});
			var params = {
				qs: {
					'id': gc._id.toString()
				},
				form: {
					'config': data
				}
			};
			executeMyRequest(params, 'cb/update', 'put', function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				mongo.count('gc_versioning', {}, function (error, count) {
					assert.ifError(error);
					assert.equal(count, 10);
					done();
				});
			});
		});
		
		it("success - versioning apis ui6 changed", function (done) {
			var data = util.cloneObj(cbConfig);
			data.soajsUI.form.update.push({
				"name": "text2",
				"label": "Text",
				"placeholder": "My Text ...",
				"tooltip": "Enter the title of the page",
				"_type": "text",
				"req": true
			});
			var params = {
				qs: {
					'id': gc._id.toString()
				},
				form: {
					'config': data
				}
			};
			executeMyRequest(params, 'cb/update', 'put', function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				mongo.count('gc_versioning', {}, function (error, count) {
					assert.ifError(error);
					assert.equal(count, 11);
					cbConfig = data;
					done();
				});
			});
		});
	});
	
	describe("Get Content Builder Tests", function () {
		var gc;
		before(function (done) {
			mongo.findOne('gc', {}, function (error, gcdb) {
				assert.ifError(error);
				assert.ok(gcdb);
				gc = gcdb;
				done();
			})
		});
		
		it('success - will get gc', function (done) {
			var params = {
				qs: {
					'id': gc._id.toString()
				}
			};
			executeMyRequest(params, 'cb/get', 'get', function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				done();
			});
		});
		
		it('success - will get gc specific version', function (done) {
			var params = {
				qs: {
					'id': gc._id.toString(),
					'version': 1
				}
			};
			executeMyRequest(params, 'cb/get', 'get', function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				done();
			});
		});
		
		it('fail - missing param', function (done) {
			var params = {
				qs: {
					'version': 1
				}
			};
			executeMyRequest(params, 'cb/get', 'get', function (body) {
				assert.ok(!body.result);
				assert.deepEqual(body.errors.details[0],
					{"code": 172, "message": "Missing required field: id"});
				done();
			});
		});
		
		it('fail - invalid id', function (done) {
			var params = {
				qs: {
					'id': 'invalid_id',
					'version': 1
				}
			};
			executeMyRequest(params, 'cb/get', 'get', function (body) {
				assert.ok(!body.result);
				assert.deepEqual(body.errors.details[0],
					{"code": 701, "message": errorCodes[701]});
				done();
			});
		});
		
		it('fail - wrong id', function (done) {
			var params = {
				qs: {
					'id': '55bb5478dd52929d97bd49bb',
					'version': 1
				}
			};
			executeMyRequest(params, 'cb/get', 'get', function (body) {
				assert.ok(!body.result);
				assert.deepEqual(body.errors.details[0],
					{"code": 702, "message": errorCodes[702]});
				done();
			});
		});
	});
	
	describe("List Content Builder Tests", function () {
		it('success - will list gc', function (done) {
			var params = {
				qs: {}
			};
			executeMyRequest(params, 'cb/list', 'get', function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				assert.ok(Array.isArray(body.data));
				done();
			});
		});
		
		it('success - will list with port', function (done) {
			var params = {
				qs: {
					'port': true
				}
			};
			executeMyRequest(params, 'cb/list', 'get', function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				assert.ok(Array.isArray(body.data));
				done();
			});
		});
	});
	
	describe("Revisions Content Builder Tests", function () {
		it('success - will list gc revisions', function (done) {
			var params = {
				qs: {}
			};
			executeMyRequest(params, 'cb/listRevisions', 'get', function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				assert.ok(Array.isArray(body.data));
				done();
			});
		});
	});
});
