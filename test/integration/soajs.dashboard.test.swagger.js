"use strict";
var fs = require("fs");
var assert = require('assert');
var request = require("request");
var extKey = 'aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac';

var util = require("soajs.core.libs").utils;

function executeMyRequest(params, apiPath, method, cb) {
	if (cb && typeof(cb) === 'function') {
		requester(apiPath, method, params, function (error, body) {
			assert.ifError(error);
			assert.ok(body);
			return cb(body);
		});
	}
	else {
		return requester(apiPath, method, params);
	}
	
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
		
		if (cb && typeof(cb) === 'function') {
			request[method](options, function (error, response, body) {
				assert.ifError(error);
				assert.ok(body);
				return cb(null, body);
			});
		}
		else {
			return options;
		}
	}
}

describe("Swagger", function () {
	describe("Simulator Tests", function () {
		describe("Testing source", function () {
			it("fail - will check input no source", function (done) {
				var params = {
					"form": {
						"data": {
							"input": { "number": 10 },
							"imfv": {
								"type": "number"
							}
						}
					}
				};
				executeMyRequest(params, "swagger/simulate", 'post', function (result) {
					assert.ok(result.errors);
					done();
				});
			});
			
			it("fail - will check input invalid source", function (done) {
				var params = {
					"form": {
						"data": {
							"input": { "number": 10 },
							"imfv": {
								"number": {
									"source": "body"
								}
							}
						}
					}
				};
				executeMyRequest(params, "swagger/simulate", 'post', function (result) {
					assert.ok(result.errors);
					done();
				});
			});
			
			it("fail - will check input empty source", function (done) {
				var params = {
					"form": {
						"data": {
							"input": { "number": 10 },
							"imfv": {
								"number": {
									"source": []
								}
							}
						}
					}
				};
				executeMyRequest(params, "swagger/simulate", 'post', function (result) {
					assert.ok(result.errors);
					done();
				});
			});
		});
		
		describe("Testing complex simulation api", function () {
			it("success - will check input", function (done) {
				var params = {
					"form": {
						"data": {
							"input": {
								"number": "xx",
								"flag": "invalid"
							},
							"imfv": {
								"flag": {
									"source": ["body.flag"],
									"required": true,
									"validation": {
										"type": "bool"
									}
								},
								"number": {
									"source": ["body.number"],
									"required": true,
									"validation": {
										"type": "number"
									}
								}
							}
						}
					}
				};
				executeMyRequest(params, "swagger/simulate", 'post', function (result) {
					assert.ok(result.errors);
					done()
				});
			});
		});
		
		describe("Testing missing item simulation api", function () {
			it("success - will check input", function (done) {
				var params = {
					"form": {
						"data": {
							"input": {
								"number": "xx"
							},
							"imfv": {
								"flag": {
									"source": ["body.flag"],
									"required": true,
									"validation": {
										"type": "bool"
									}
								},
								"number": {
									"source": ["body.number"],
									"required": true,
									"validation": {
										"type": "number"
									}
								}
							}
						}
					}
				};
				executeMyRequest(params, "swagger/simulate", 'post', function (result) {
					assert.ok(result.errors);
					done();
					
				});
			});
		});
		
		describe("Testing item with multiple errors", function () {
			it("success - will check input", function (done) {
				var params = {
					"form": {
						"data": {
							"input": {
								"number1": "xx",
								"number2": "xx"
							},
							"imfv": {
								"number1": {
									"source": ["body.number"],
									"required": false,
									"default": 0,
									"validation": {
										"type": "number"
									}
								},
								"number2": {
									"required": true,
									"default": "x",
									"validation": {
										"type": "number"
									}
								},
								"number3": {
									"source": [],
									"required": false,
									"default": "x",
									"validation": {
										"type": "number"
									}
								},
								"number4": {
									"source": "invalid",
									"required": false,
									"default": "1",
									"validation": {
										"type": "number"
									}
								}
							}
						}
					}
				};
				executeMyRequest(params, "swagger/simulate", 'post', function (result) {
					assert.ok(result.errors);
					done();
				});
			});
		});
	});
	
	describe("Generator Tests", function () {
		
		var Mongo = require("soajs.core.modules").mongo;
		var dbConfig = require("./db.config.test.js");
		
		var dashboardConfig = dbConfig();
		dashboardConfig.name = "core_provision";
		var mongo = new Mongo(dashboardConfig);
		
		var oParams = {
			"form": {
				"data": {
					"service": {
						"serviceName": "mytestservice",
						"serviceGroup": "Swagger",
						"servicePort": 4100,
						"serviceVersion": 1,
						"requestTimeout": 30,
						"requestTimeoutRenewal": 5,
						"extKeyRequired": false,
						"oauth": false,
						"urac": false,
						"urac_Profile": false,
						"urac_ACL": false,
						"provision_ACL": false,
						"session": false,
						"dbs": [
							{
								"name": "myDatabase",
								"model": "mongo"
							},
							{
								"name": "myES",
								"model": "es"
							}
						]
					},
					"yaml": fs.readFileSync(__dirname + "/swagger.test.yaml", "utf8").toString()
				}
			}
		};
		
		describe("service check", function () {
			it("create temp service", function (done) {
				var tempRec = {
					"name": oParams.form.data.service.serviceName,
					"port": oParams.form.data.service.servicePort,
					"group": oParams.form.data.service.serviceGroup,
					"src": {
						"provider": "github",
						"owner": "soajs",
						"repo": oParams.form.data.service.serviceName
					},
					"swagger": true,
					"requestTimeout": oParams.form.data.service.requestTimeout,
					"requestTimeoutRenewal": oParams.form.data.service.requestTimeoutRenewal,
					"versions": {
						"1": {
							"extKeyRequired": oParams.form.data.service.extKeyRequired,
							"oauth": false,
							"urac": false,
							"urac_Profile": false,
							"urac_ACL": false,
							"provision_ACL": false,
							"session": false,
							"apis": [
								{
									"l": "get users",
									"v": "/",
									"group": "users",
									"groupMain": true
								},
								{
									"l": "set a cart",
									"v": "/",
									"group": "users"
								}
							]
						}
					}
				};
				mongo.insert("services", tempRec, function (error) {
					assert.ifError(error);
					done();
				});
			});
			
			it("fail - service name taken", function (done) {
				var params = util.cloneObj(oParams);
				params.form.data.service.servicePort = 4999;
				executeMyRequest(params, "swagger/generate", 'post', function (result) {
					assert.ok(result.errors);
					done();
				});
			});

			it("fail - service port taken", function (done) {
				var params = util.cloneObj(oParams);
				params.form.data.service.serviceName = "somethingelse";
				executeMyRequest(params, "swagger/generate", 'post', function (result) {
					assert.ok(result.errors);
					done();
				});
			});

			it("remove temp service", function (done) {
				var condition = {
					"name": oParams.form.data.service.serviceName
				};
				mongo.remove("services", condition, function (error) {
					assert.ifError(error);
					done();
				});
			});
		});
		
		describe("yaml check", function () {
			it("fail - invalid yaml code provided", function (done) {
				var params = util.cloneObj(oParams);
				params.form.data.yaml = null;
				executeMyRequest(params, "swagger/generate", 'post', function (result) {
					assert.ok(result.errors);
					done();
				});
			});

			it("fail - invalid mapping of inputs", function (done) {
				var params = util.cloneObj(oParams);
				params.form.data.yaml = fs.readFileSync(__dirname + "/swagger.invalid.test.yaml", "utf8").toString();
				executeMyRequest(params, "swagger/generate", 'post', function (result) {
					assert.ok(result.errors);
					done();
				});
			});
		});
		
		describe("full check", function () {
			it("success - service generated", function (done) {
				var params = util.cloneObj(oParams);
				oParams.headers = {
					'Accept': 'application/zip'
				};
				
				var options = executeMyRequest(params, "swagger/generate", 'post');
				request.post(options).pipe(fs.createWriteStream("./" + oParams.form.data.service.serviceName + ".zip")).on('close', function () {
					fs.exists("./" + oParams.form.data.service.serviceName + ".zip", function (exists) {
						console.log("file downloaded to:", "./" + oParams.form.data.service.serviceName + ".zip");
						assert.equal(exists, true);
						done();
					});
				});
			});
		});
	});

	describe("Testing swagger/generateExistingService", function () {
		it("success", function (done) {
			var params = {
				"form": {
					"id": "123"
				}
			};
			executeMyRequest(params, "swagger/generateExistingService", 'post', function (result) {
				assert.ok(result);
				done();
			});
		});
	});

});
