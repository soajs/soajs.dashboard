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
	
	describe("testing createAuthToken", function () {
		it("Success generate", function (done) {
			var data = {
				tokenInfo: {
					oauthKey: 'oauthKey',
					oauthSecret: 'oauthSecret'
				},
				action: 'generate',
				owner: 'owner',
				password: 'password'
			};
			driverHelper.createAuthToken(data, function (error, body) {
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
			options.tokenInfo = {
				created: 700000,
				expires_in: 1234522
			};
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

	describe("testing buildBranchesArray", function () {
		it("Success", function (done) {
			var allBranches = {
				develop: {
					raw_node: {}
				}
			};
			driverHelper.buildBranchesArray(allBranches);
			done();
		});
	});

	describe("testing addReposStatus", function () {
		it("Success", function (done) {
			var allRepos = [
				{
					full_name: 'abccccc'
				},
				{
					full_name: 'nameeeeee'
				},
				{
					full_name: 'abc/123'
				}
			];
			var activeRepos = [
				{
					type: 'multi',
					status: 'active',
					name: 'abc/123',
					configSHA: [
						{
							contentType: 'service',
							contentName: 'name'
						}
					]
				},
				{
					type: 'multi',
					status: 'active',
					name: 'nulti/repo',
					configSHA: [
						{
							contentType: 'service',
							contentName: 'name'
						}
					]
				},
				{
					name: 'abccccc',
					status: 'active',
					type: 'service',
					configSHA: '123456'
				},
				{
					name: 'nameeeeee',
					type: 'service',
					configSHA: '123456'
				}
			];
			driverHelper.addReposStatus(allRepos, activeRepos, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
	});

	// describe("testing writeFile", function () {
	// 	it("Success writeFile", function (done) {
	// 		var options = {
	// 			configDirPath: './test/uploads/name1.js',
	// 			configFile: ""
	// 		};
	// 		driverHelper.writeFile(options, function (error, body) {
	// 			done();
	// 		});
	// 	});
	// });
});