"use strict";
var assert = require("assert");
var helper = require("../../../../helper.js");
var utils = helper.requireModule('./utils/drivers/ci/index.js');

describe("testing ci index.js", function () {
	
	describe("testing addEnvVar", function () {
		
		it("Call addEnvVar", function (done) {
			var options = {
				log: {
					debug: function () {
					}
				},
				params: {},
				settings: {},
				driver: 'travis'
			};
			utils.addEnvVar(options, function (error, body) {
				assert.ok(error);
				done();
			});
		});
		
	});

	describe("testing updateEnvVar", function () {

		it("Call updateEnvVar", function (done) {
			var options = {
				log: {
					debug: function () {
					}
				},
				params: {},
				settings: {},
				driver: 'travis'
			};
			utils.updateEnvVar(options, function (error, body) {
				assert.ok(error);
				done();
			});
		});

	});

	describe("testing deleteEnvVar", function () {

		it("Call deleteEnvVar", function (done) {
			var options = {
				log: {
					debug: function () {
					}
				},
				params: {},
				settings: {},
				driver: 'travis'
			};
			utils.deleteEnvVar(options, function (error, body) {
				assert.ok(error);
				done();
			});
		});

	});

	describe("empty repo settings", function () {

		it("empty repo settings", function (done) {
			var options = {
				log: {
					debug: function () {
					}
				},
				params: {},
				settings: {},
				driver: 'travis'
			};
			utils.deleteEnvVar(options, function (error, body) {
				assert.ok(error);
				done();
			});
		});

	});
	
});