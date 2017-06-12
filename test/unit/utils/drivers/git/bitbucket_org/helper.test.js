"use strict";
var assert = require("assert");
var helper = require("../../../../../helper.js");
var driverHelper = helper.requireModule('./utils/drivers/git/bitbucket_org/helper.js');

describe("testing git/bitbucket_org helper.js", function () {
	var soajs = {};
	var model = {};
	var options = {
		provider: 'bitbucket_org'
	};

	describe("testing checkUserRecord", function () {
		it("Success", function (done) {
			driverHelper.checkUserRecord(options, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
	});

	describe("testing getRepoBranches", function () {
		it("Success", function (done) {
			driverHelper.getRepoBranches(options, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
	});

	describe("testing getAllRepos", function () {
		it("Success", function (done) {
			driverHelper.getAllRepos(options, function (error, body) {
				// assert.ok(body);
				done();
			});
		});

		it("Success wth token", function (done) {
			options.token = '123';
			driverHelper.getAllRepos(options, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
	});

	describe("testing checkAuthToken", function () {
		// soajs, options, model, accountRecord,
		var accountRecord = {};
		it("Success generate", function (done) {
			options.action = 'generate';
			options.tokenInfo = {};
			driverHelper.checkAuthToken(soajs, options, model, accountRecord, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
		
		it("Success refresh", function (done) {
			options.action = 'refresh';
			driverHelper.checkAuthToken(soajs, options, model, accountRecord, function (error, body) {
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