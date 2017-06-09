"use strict";
var assert = require("assert");
var helper = require("../../../../../helper.js");
var driverHelper = helper.requireModule('./utils/drivers/git/github/helper.js');

describe("testing git/github helper.js", function () {
	var soajs = {};
	var options = {
		provider: 'github'
	};

	describe("testing getRepoBranches", function () {
		it("Success", function (done) {
			driverHelper.getRepoBranches(options, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
	});

	describe("testing getRepoContent", function () {
		it("Success", function (done) {
			options.path = '';
			driverHelper.getRepoContent(options, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
	});
});