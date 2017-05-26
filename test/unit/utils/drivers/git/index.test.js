"use strict";
var assert = require("assert");
var helper = require("../../../../helper.js");
var utils = helper.requireModule('./utils/drivers/git/index.js');

describe("testing git index.js", function () {
	var soajs = {};
	describe("testing getAnyContent", function () {
		var data = {};
		var model = {};
		var options = {
			provider: 'any'
		};

		it("Fail", function (done) {
			utils.getAnyContent(soajs, data, model, options, function (error, body) {
				assert.ok(error);
				done();
			});
		});

		it("Success get github", function (done) {
			options = {
				provider: 'github'
			};
			utils.getAnyContent(soajs, data, model, options, function (error, body) {
				assert.ok(error);
				done();
			});
		});

	});

});