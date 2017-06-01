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
				done();
			});
		});

	});

	describe("testing setHook", function () {

		it("Call setHook", function (done) {
			var options = {
				log: {
					debug: function () {
					}
				},
				params: {},
				settings: {},
				driver: 'travis'
			};
			utils.setHook(options, function (error, body) {
				assert.ok(error);
				done();
			});
		});

	});

	describe("testing listSettings", function () {

		it("Call listSettings", function (done) {
			var options = {
				log: {
					debug: function () {
					}
				},
				params: {},
				settings: {},
				driver: 'travis'
			};
			utils.listSettings(options, function (error, body) {
				assert.ok(error);
				done();
			});
		});

	});

	describe("testing updateSettings", function () {

		it("Call updateSettings", function (done) {
			var options = {
				log: {
					debug: function () {
					}
				},
				params: {},
				settings: {},
				driver: 'travis'
			};
			utils.updateSettings(options, function (error, body) {
				assert.ok(error);
				done();
			});
		});

	});

	describe("testing generateToken", function () {

		it("Call generateToken", function (done) {
			var options = {
				log: {
					debug: function () {
					}
				},
				params: {},
				settings: {},
				driver: 'travis'
			};
			utils.generateToken(options, function (error, body) {
				assert.ok(error);
				done();
			});
		});

	});

	describe("testing listEnvVars", function () {

		it("Call listEnvVars", function (done) {
			var options = {
				log: {
					debug: function () {
					}
				},
				params: {},
				settings: {},
				driver: 'travis'
			};
			utils.listEnvVars(options, function (error, body) {
				assert.ok(error);
				done();
			});
		});

	});

	describe("testing listRepos", function () {

		it("Call listRepos", function (done) {
			var options = {
				log: {
					debug: function () {
					}
				},
				params: {},
				settings: {},
				driver: 'travis'
			};
			utils.listRepos(options, function (error, body) {
				assert.ok(error);
				done();
			});
		});

	});

	describe("testing ensureRepoVars", function () {

		it("Call ensureRepoVars", function (done) {
			var options = {
				log: {
					debug: function () {
					}
				},
				params: {},
				settings: {},
				driver: 'travis'
			};
			utils.ensureRepoVars(options, function (error, body) {
				done();
			});
		});

	});
	
});