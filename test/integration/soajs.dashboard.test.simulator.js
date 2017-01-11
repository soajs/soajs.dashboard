"use strict";
var assert = require('assert');
var request = require("request");
var soajs = require('soajs');
var util = require('soajs/lib/utils');
var helper = require("../helper.js");
var dashboard;

var config = helper.requireModule('./config');
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

	describe.skip("Testing simple validation`", function () {
		it("success - will check input", function (done) {
			var params = {
				"form": {
					"data": {
						"input": {"number" : 10},
						"imfv": {
							"type": "number"
						}
					}
				}
			};
			executeMyRequest(params, "test/simulate", 'post', function (result) {
				console.log(JSON.stringify("==============", null, 2));// 2del
				console.log(JSON.stringify(result, null, 2));// 2del
				assert.ok(result.data);
				done();
			});
		});
	});
	
	describe("Testing simulation api", function () {
		it("success - will check input", function (done) {
			var params = {
				headers: {
					// soajsauth: soajsauth
				},
				"form": {
					"data": {
						"input": {
							"number": 10
						},
						"imfv": {
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
			executeMyRequest(params, "test/simulate", 'post', function (result) {
				console.log(JSON.stringify("==============", null, 2));// 2del
				console.log(JSON.stringify(result, null, 2));// 2del
				assert.ok(result.data);
				done();
			});
		});
	});
});
