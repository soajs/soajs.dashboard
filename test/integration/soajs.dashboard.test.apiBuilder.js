"use strict";
var assert = require('assert');
var request = require("request");
var helper = require("../helper.js");

// var extKey = 'aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac';
var extKey = 'd44dfaaf1a3ba93adc6b3368816188f9481bf65ad90f23756391e85d754394e0ee45923e96286f55e60a98efe825af3ef9007121c7baaa49ec8ea3ac9159a4bfc56c87674c94625b36b468c75d58158e0c9df0b386d7f591fbf679eb611d02bf';
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

describe("DASHBOARD API builder Tests:", function () {

	describe("xxxxx", function () {
		var productId;

		describe("yyyyyy", function () {
			
			describe("xxxxxxxxx", function () {
				it("success - will add product", function (done) {
					var params = {
						qs : {
							mainType :  "services"
						}
					};
					executeMyRequest(params, 'apiBuilder/list', 'get', function (body) {
						console.log("zzzzzz");
						console.log(JSON.stringify(body,null,2));
						console.log("zzzzzz");
						assert.ok(body.data);
						done();
					});
				});
			});
		});


	});

});
