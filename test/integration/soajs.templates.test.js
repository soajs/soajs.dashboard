"use strict";

const assert = require('assert');
var request = require("request");

var utils = require("soajs.core.libs").utils;

var Mongo = require("soajs.core.modules").mongo;
var dbConfig = require("./db.config.test.js");

var dashboardConfig = dbConfig();
dashboardConfig.name = "core_provision";
var mongo = new Mongo(dashboardConfig);

const extKey = 'aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac';

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

let params = {};
//Begin testing
describe("Testing Templates Functionality", function () {

	describe("Testing Templates GET", function () {

		it("success", function (done) {
			params = {
				"qs": {}
			};

			executeMyRequest(params, "templates", 'get', function (result) {
				assert.ok(result.data);
				done();
			});
		});

		it("success - fullList", function (done) {
			params = {
				"qs": {
					fullList: true
				}
			};

			executeMyRequest(params, "templates", 'get', function (result) {
				assert.ok(result.data);
				done();
			});
		});

	});

	describe.skip("Testing Templates Import API", function () {

		it("Success Import", function (done) {

			params = {
				"qs": {},
				"form": {}
			};

			executeMyRequest(params, "templates/import", 'post', function (result) {
				// assert.ok(result.data);
				// assert.ok(result.result);
				done();
			});
		});
	});

	describe.skip("Testing Templates Export API", function () {

		it("Fail - Export", function (done) {
			params = {
				"qs": {}
			};

			executeMyRequest(params, "templates/export", 'post', function (result) {
				// assert.ok(result.errors);
				// assert.deepEqual(result.errors.details[0].code, 404);
				done();
			});
		});

	});

	describe("Testing Templates upgrade API", function () {

		it("Fail - invalidId", function (done) {
			params = {
				"qs": {}
			};

			executeMyRequest(params, "templates/upgrade", 'get', function (result) {
				// assert.ok(result.errors);
				// assert.deepEqual(result.errors.details[0].code, 404);
				done();
			});
		});

	});

	describe("Testing Templates DELETE API", function () {
		
		it("Fail - delete", function (done) {
			params = {
				"qs": {
					"id": "invalidId"
				}
			};

			executeMyRequest(params, "templates", 'delete', function (result) {
				assert.ok(result.errors);
				assert.deepEqual(result.errors.details[0].code, 701);
				done();
			});
		});

		it("Success - delete", function (done) {
			params = {
				"qs": {
					"id": "5b990031238c971bc53959f5"
				}
			};

			executeMyRequest(params, "templates", 'delete', function (result) {
				assert.ok(result.data);
				done();
			});
		});
	});

	after(function (done) {
		mongo.closeDb();
		done();
	});
});
