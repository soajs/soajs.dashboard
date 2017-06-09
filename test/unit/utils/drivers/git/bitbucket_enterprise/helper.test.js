"use strict";
var assert = require("assert");
var helper = require("../../../../../helper.js");
var driverHelper = helper.requireModule('./utils/drivers/git/bitbucket_enterprise/helper.js');

describe("testing git/bitbucket_org helper.js", function () {
	var soajs = {};
	var model = {};
	var bitbucketClient = {
		branches: {
			get: function (info1, info2) {
				//return new Promise();
			}
		}
	};
	var options = {
		provider: 'bitbucket_enterprise'
	};
	
	describe("testing authenticate", function () {
		it("Success", function (done) {
			options.token = "test:test";
			driverHelper.authenticate(options);
			done();
		});
	});
	
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
			driverHelper.getRepoBranches(options, bitbucketClient, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
	});
	
	describe("testing getRepoContent", function () {
		it("Success", function (done) {
			driverHelper.getRepoContent(options, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
	});
	
	describe("testing getAllRepos", function () {
		it("Success", function (done) {
			driverHelper.getAllRepos(options, bitbucketClient, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
	});
	
	describe("testing addReposStatus", function () {
		it("Success", function (done) {
			var allRepos = [];
			var activeRepos = [];
			driverHelper.addReposStatus(allRepos, activeRepos, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
	});
	
	describe("testing writeFile", function () {
		it.skip("Success", function (done) {
			options.configDirPath = 'name/name';
			driverHelper.writeFile(options, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
	});
	
	describe("testing clearDir", function () {
		it("Success", function (done) {
			options.repoConfigsFolder = 'name/name';
			driverHelper.clearDir(options, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
	});
});