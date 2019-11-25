"use strict";

const assert = require('assert');
const request = require("request");

const utils = require("soajs.core.libs").utils; //todo: check not used

const Mongo = require("soajs.core.modules").mongo;
const dbConfig = require("./db.config.test.js");

let dashboardConfig = dbConfig();
dashboardConfig.name = "core_provision";

const mongo = new Mongo(dashboardConfig); //todo: check not used

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

//Begin testing
describe("Testing Secrets Management", function () {
	
	it("Success - Add Secret", function (done) {
		let params = {
			"form": {
				"name": "wissam",
				"data": "d2lzc2Ft",
				"env": "DASHBOARD"
			}
		};
		executeMyRequest(params, "secrets/add", 'post', function (result) {
			assert.ok(result);
			done();
		});
	});
	
	it("Fail - Add Secret Same Name", function (done) {
		let params = {
			"form": {
				"name": "wissam",
				"data": "d2lzc2Ft",
				"env": "DASHBOARD"
			}
		};
		executeMyRequest(params, "secrets/add", 'post', function (result) {
			assert.ok(result);
			done();
		});
	});
	
	it("Success - List Secrets", function (done) {
		let params = {
			"qs": {
				"env": "DASHBOARD"
			}
		};
		executeMyRequest(params, "secrets/list", 'get', function (result) {
			assert.ok(result);
			done();
		});
	});
	
	it("Success - Get Secret", function (done) {
		let params = {
			"qs": {
				"name": "wissam",
				"env": "DASHBOARD"
			}
		};
		executeMyRequest(params, "secrets/get", 'get', function (result) {
			assert.ok(result);
			done();
		});
	});
	
	it("Success - Delete Secret", function (done) {
		let params = {
			"qs": {
				"name": "wissam",
				"env": "DASHBOARD"
			}
		};
		executeMyRequest(params, "secrets/delete", 'delete', function (result) {
			assert.ok(result);
			done();
		});
	});
	
	
});
