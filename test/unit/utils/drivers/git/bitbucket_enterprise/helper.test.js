"use strict";
var assert = require("assert");
var helper = require("../../../../../helper.js");
var driverHelper = helper.requireModule('./utils/drivers/git/bitbucket_enterprise/helper.js');

describe("testing git/bitbucket helper.js", function () {
	var options = {
		provider: 'bitbucket_enterprise'
	};
	
	describe("testing checkUserRecord", function () {
		
		let serviceStub;
		afterEach(() => {
			if (serviceStub) {
				serviceStub.restore();
			}
		});
		
		it("Fail", function (done) {
			driverHelper.checkUserRecord(options, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
		
		it("Success - TODO", function (done) {
			options.domain = "test";
			options.owner = "test";
			options.password = "test";
			
			driverHelper.checkUserRecord(options, function (error, body) {
				done();
			});
		});
	});
	
	describe("testing getRepoBranches", function () {
		it("Success", function (done) {
			options.token = "test:1233";
			driverHelper.getRepoBranches(options, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
		
		it("Success - with options name", function (done) {
			options.name = 'test/test';
			driverHelper.getRepoBranches(options, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
		
		it("Fail", function (done) {
			driverHelper.getRepoBranches(options, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
		
	});
	
	describe("testing getRepoContent", function () {
		
		it("Fail", function (done) {
			driverHelper.getRepoContent(options, function (error, body) {
				done();
			});
		});
		it("Success", function (done) {
			options.project = "x";
			options.repo = "y";
			options.path = "z";
			options.ref = "a";
			
			driverHelper.getRepoContent(options, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
		
	});
	
	describe("testing getAllRepos", function () {
		
		it("Fail", function (done) {
			driverHelper.getAllRepos(options, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
		
		it("Success", function (done) {
			driverHelper.getAllRepos(options, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
	});
	
	describe("testing addReposStatus", function () {
		it("Success - empty repos", function (done) {
			var allRepos = [];
			var activeRepos = [];
			driverHelper.addReposStatus(allRepos, activeRepos, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
		
		it("Success - repo not found", function (done) {
			var allRepos = [
				{
					full_name : 'repo1'
				},
				{
					full_name : 'repo2'
				}
			];
			var activeRepos = [
				{
					name : 'repo1',
					type : 'multi',
					status : 'active',
					configSHA : [
						{
							contentName : 'example',
							contentType : 'any',
						}
					]
				},
				{
					name : 'repo2',
					type : 'multi',
					configSHA : [
						{
							contentName : 'example',
							contentType : 'any',
						}
					]
				}
			];
			driverHelper.addReposStatus(allRepos, activeRepos, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
		
		it("Success - repo found", function (done) {
			var allRepos = [];
			var activeRepos = [
				{
					name : 'repo1',
					type : 'multi',
					configSHA : [
						{
							contentName : 'example',
							contentType : 'any',
						}
					]
				}
			];
			driverHelper.addReposStatus(allRepos, activeRepos, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
	});
	
	describe("testing writeFile", function () {
		it("Success - doesnt exist", function (done) {
			options.configDirPath = '/wrongpath';
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