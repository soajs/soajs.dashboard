"use strict";
var assert = require("assert");
var helper = require("../../helper.js");
var utils = helper.requireModule('./lib/analytics.js');

describe("testing analytics.js", function () {
	
	describe("testing init", function () {

		it("No Model Requested", function (done) {
			utils.init(null, function (error, body) {
				assert.ok(error);
				done();
			});
		});

		it("Model Name not found", function (done) {

			utils.init('anyName', function (error, body) {
				assert.ok(error);
				done();
			});
		});

	});
	
});