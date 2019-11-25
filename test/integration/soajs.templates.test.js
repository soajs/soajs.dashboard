"use strict";

const assert = require('assert');
const request = require("request");

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

let params = {};

describe("Testing Templates Functionality", function () {
	
	describe("Testing Templates GET", function () {
		
		// it.skip("success", function (done) {
		// 	params = {
		// 		"qs": {}
		// 	};
		//
		// 	executeMyRequest(params, "templates", 'get', function (result) {
		// 		assert.ok(result.data);
		// 		done();
		// 	});
		// });
		
		it("success - fullList", function (done) {
			params = {
				"qs": {
					fullList: true
				}
			};
			
			executeMyRequest(params, "templates", 'get', function (result) {
				if (!result.data) {
					console.log(JSON.stringify(result, null, 2)) // replace with ifError
				}
				assert.ok(result.data);
				done();
			});
		});
		
	});
	
	describe("Testing Templates Import API", function () {
		
		// it.skip("Success Import", function (done) {
		// 	params = {};
		// 	executeMyRequest(params, "templates/import", 'post', function (result) {
		// 		done();
		// 	});
		// });
		
		it("Success Import", function (done) {
			
			params = {
				"qs": {
					"id": "5b990031238c971bc53959f5"
				},
				"form": {
					"correction": {}
				}
			};
			
			executeMyRequest(params, "templates/import", 'post', function (result) {
				assert.ok(result);
				done();
			});
		});
	});
	
	describe("Testing Templates Export API", function () {
		
		it("Success - Export - nothing to export", function (done) {
			params = {};
			
			executeMyRequest(params, "templates/export", 'post', function (result) {
				assert.ok(result.errors);
				done();
			});
		});
		
		it("Fail - Export id", function (done) {
			params = {
				form: {
					"id": "invalid",
					"deployment": ["test"]
				}
			};
			
			executeMyRequest(params, "templates/export", 'post', function (result) {
				assert.deepEqual(result.errors.details[0].code, 701);
				done();
			});
		});
		
		it.skip("Success - Export id", function (done) {
			params = {
				form: {
					"id": "5acf46c4af4cd3a45f21e2eb",
					"deployment": []
				}
			};
			
			executeMyRequest(params, "templates/export", 'post', function (result) {
				assert.ok(result);
				done();
			});
		});
	});
	
	describe("Testing Templates upgrade API", function () {
		
		it("Success", function (done) {
			params = {
				"qs": {}
			};
			
			executeMyRequest(params, "templates/upgrade", 'get', function (result) {
				assert.ok(result.result);
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
	
});
