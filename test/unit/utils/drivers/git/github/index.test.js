"use strict";
var assert = require("assert");
var helper = require("../../../../../helper.js");
var driver = helper.requireModule('./utils/drivers/git/github/index.js');
var driverHelper = helper.requireModule('./utils/drivers/git/github/helper.js');
driver.helper = driverHelper;

describe("testing git/github index.js", function () {
	var soajs = {};
	var data = {
		getAccount: function (soajs, model, options, cb) {
			var accountRecord = {
				repos: []
			};
			return cb(null, accountRecord);
		},
		removeAccount: function (soajs, model, id, cb) {
			return cb(null, true);
		}
	};
	var model = {};
	var options = {
		provider: 'github'
	};

	describe("testing logout", function () {
		it("Success", function (done) {
			driver.logout(soajs, data, model, options, function (error, body) {
				// assert.ok(error);
				done();
			});
		});
	});

	describe("testing getRepos", function () {
		it("Success", function (done) {
			driverHelper.getAllRepos = function (options, cb) {
				return cb(null);
			};
			driver.getRepos(soajs, data, model, options, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
	});

	describe("testing getBranches", function () {
		it("Success", function (done) {
			driverHelper.getRepoBranches = function (options, cb) {
				return cb(null);
			};
			driver.getBranches(soajs, data, model, options, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
	});

	describe("testing getJSONContent", function () {
		it("Success", function (done) {
			options.path = '';
			driverHelper.getRepoContent = function (options, cb) {
				var content = {
					sha: "code",
					content: "{}"
				};
				return cb(null, content);
			};
			driver.getJSONContent(soajs, data, model, options, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
	});
});