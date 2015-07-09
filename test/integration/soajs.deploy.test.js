"use strict";
var assert = require('assert');
var request = require("request");
var soajs = require('soajs');
var util = require('soajs/lib/utils');
var helper = require("../helper.js");
var dashboard;

var config = helper.requireModule('./service/config');
var errorCodes = config.errors;

var Mongo = soajs.mongo;
var dbConfig = require("./db.config.test.js");

var dashboardConfig = dbConfig();
dashboardConfig.name = "core_provision";
var mongo = new Mongo(dashboardConfig);

var uracConfig = dbConfig();
uracConfig.name = 'test_urac';
var uracMongo = new Mongo(uracConfig);

var extKey = 'aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac';
// /tenant/application/acl/get
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
				if(Object.hasOwnProperty.call(params.headers, h)) {
					options.headers[h] = params.headers[h];
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

describe("DASHBOARD Deploy UNIT TSTNS", function() {
	var expDateValue = new Date().toISOString();
	var envId;
	it("environment creating", function(done) {
		var validEnvRecord = {
			"code": "DEV",
			"description": 'this is a dummy description',
			"port": 8080,
			"profile": "/opt/soajs/FILES/profiles/single.js",
			"deployer": {
				"selected": "boot2docker",
				"unix": {
					'socketPath': '/var/run/docker.sock',
					'driver': 'docker'
				},
				"boot2docker": {
					'host': '192.168.59.103',
					'port': 2376,
					'driver': 'docker'
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
						"src": true,
						"level": "debug"
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

		mongo.remove('environment', {}, function(error) {
			assert.ifError(error);
			mongo.insert('environment', validEnvRecord, function(error) {
				assert.ifError(error);
				done();
			});
		});
	});

	describe("hosts tests", function() {

		before(function(done) {
			console.log("*************************************************");
			console.log("starting deployment tests");
			console.log("*************************************************");
			done();
		});

		it("success - calls deployController", function(done) {
			var params = {
				"form": {
					'envCode': 'DEV',
					'number': 3
				}
			};
			executeMyRequest(params, 'hosts/deployController', 'post', function(body) {
				assert.ok(body.result);
				console.log(body.data);
				done();
			});
		});

		it("mongo - update service dashboard, add imageName", function(done){
			mongo.update("services", {"name": "dashboard"}, {"$set": {"image": "soajsorg/dashboard"}}, function(error){
				assert.ifError(error);
				done();
			});
		});

		it("success - calls deployService via image", function(done) {
			var params = {
				"form": {
					'envCode': 'DEV',
					'image': 'soajsorg/dashboard'
				}
			};
			executeMyRequest(params, 'hosts/deployService', 'post', function(body) {
				assert.ok(body.result);
				console.log(body.data);
				done();
			});
		});

		it("mongo - update gc add pages", function(done){
			var gcServiceRecord = {
				"name": "pages",
				"author": "owner",
				"genericService": {
					"config": {
						"errors": {
							"400": "Database Error",
							"401": "Invalid Id provided"
						},
						"schema": {
							"commonFields": {
								"id": {
									"source": [
										"query.id"
									],
									"validation": {
										"type": "string"
									},
									"required": true
								},
								"title": {
									"source": [
										"body.title"
									],
									"validation": {
										"type": "string"
									},
									"required": true
								},
								"content": {
									"source": [
										"body.content"
									],
									"validation": {
										"type": "string"
									},
									"required": true
								}
							},
							"/list": {
								"_apiInfo": {
									"l": "List Pages",
									"group": "Pages",
									"groupMain": true
								}
							},
							"/add": {
								"_apiInfo": {
									"l": "Add New Page",
									"group": "Pages"
								},
								"commonFields": [
									"title",
									"content"
								]
							},
							"/edit": {
								"_apiInfo": {
									"l": "Edit Page",
									"group": "Pages"
								},
								"commonFields": [
									"id",
									"title",
									"content"
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
						"serviceName": "pages",
						"servicePort": 4100,
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
								"pages": {
									"cluster": "cluster1",
									"tenantSpecific": true
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
						"/edit": {
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
								"placeholder": "Page Title...",
								"tooltip": "Enter a title for the page",
								"type": "text",
								"required": true
							},
							{
								"name": "content",
								"label": "Content",
								"placeholder": "",
								"tooltip": "",
								"type": "editor",
								"required": true
							}
						],
						"update": [
							{
								"name": "title",
								"label": "Title",
								"placeholder": "Page Title...",
								"tooltip": "Enter a title for the page",
								"type": "text",
								"required": true
							},
							{
								"name": "content",
								"label": "Content",
								"placeholder": "",
								"tooltip": "",
								"type": "editor",
								"required": true
							}
						]
					}
				},
				"v": 1,
				"ts": 1434460208718,
				"modified": 1434460208714
			};

			mongo.remove("gc", {}, function(error){
				assert.ifError(error);
				mongo.insert("gc", gcServiceRecord, function(error){
					assert.ifError(error);
					done();
				});
			});
		});

		it("success - calls deployService via gc", function(done) {
			var params = {
				"form": {
					'image': 'soajsorg/gcs',
					'envCode': 'DEV',
					'gcName': 'pages',
					'gcVersion': 1
				}
			};
			executeMyRequest(params, 'hosts/deployService', 'post', function(body) {
				assert.ok(body.result);
				console.log(body.data);
				done();
			});
		});
	});
});