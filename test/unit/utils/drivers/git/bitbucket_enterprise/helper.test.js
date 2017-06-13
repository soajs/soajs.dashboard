"use strict";
var assert = require("assert");
var helper = require("../../../../../helper.js");
var driverHelper = helper.requireModule('./utils/drivers/git/bitbucket_enterprise/helper.js');

describe("testing git/bitbucket_org helper.js", function () {
	var soajs = {};
	var model = {};
	var bitbucketClient = function(successRequested){
		return {
			branches: {
				get: function (info1, info2) {
					var promise = new Promise(function (fulfill, reject) {
						var branches = {
							values: [
								{
									displayId: 123,
									latestCommit: '12/12/2012'
								}
							]
						};
						
						if(successRequested){
							fulfill(branches);
						}else{
							reject(new Error());
						}
						
					});
					return promise;
				}
			},
			repos : {
				browse : function(project, repo, obj ){
					
					var promise = new Promise(function (fulfill, reject) {
						
						var isLastPage = false;
						if(obj.args.start !== 0){
							isLastPage=true;
						}
						
						var output = {
							lines : "ssss",
							isLastPage
						};
						
						if(successRequested){
							fulfill(output);
						}else{
							reject(output);
						}
					});
					return promise;
				},
				getCombined : function(){
					
					var promise = new Promise(function (fulfill, reject) {
						
						var output = {
							values : [
								{
									slug : 'test1',
									project : {
										key : "123"
									}
								}
							]
						};
						
						if(successRequested){
							fulfill(output);
						}else{
							reject(output);
						}
					});
					return promise;
				},
				get : function(owner){
					
					var promise = new Promise(function (fulfill, reject) {
						
						var output = {
							values : [
								{
									slug : 'test2',
									project : {
										key : "1233"
									}
								}
							]
						};
						fulfill(output);
						
					});
					return promise;
				}
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
			
			// // mocking a constructor ....
			// const sinon = require('sinon');
			//
			// var BitbucketClient = require('bitbucket-server-nodejs').Client;
			// let x = sinon.createStubInstance(BitbucketClient);
			// x.Client = sinon.stub();
			// x.Client = {
			//
			// };
			//
			// // var BitbucketClient = require('bitbucket-server-nodejs');
			// // var bitInstance = new BitbucketClient("https://test/rest/api/1.0");
			// // var BitbucketClientUsers = bitInstance.users;
			// console.log("zzz");
			// // console.log(BitbucketClientUsers);
			// console.log("zzz");
			// // serviceStub = sinon.stub(x, "constructor", (domain) =>
			// // 	{
			// // 		return Promise(function(fulfill, rejct){
			// // 			fulfill("waw");
			// // 		})
			// // 	}
			// // );
			
			options.domain = "test";
			options.owner = "test";
			
			driverHelper.checkUserRecord(options, function (error, body) {
				done();
			});
		});
	});
	
	describe("testing getRepoBranches", function () {
		it("Success", function (done) {
			
			driverHelper.getRepoBranches(options, bitbucketClient(true), function (error, body) {
				// assert.ok(body);
				done();
			});
		});
		
		it("Success - with options name", function (done) {
			options.name = 'test/test';
			driverHelper.getRepoBranches(options, bitbucketClient(true), function (error, body) {
				// assert.ok(body);
				done();
			});
		});
		
		it("Fail", function (done) {
			driverHelper.getRepoBranches(options, bitbucketClient(false), function (error, body) {
				// assert.ok(body);
				done();
			});
		});
		
	});
	
	describe("testing getRepoContent", function () {
		
		it("Fail", function (done) {
			driverHelper.getRepoContent(options, bitbucketClient(false), function (error, body) {
				done();
			});
		});
		it("Success", function (done) {
			options.project = "x";
			options.repo = "y";
			options.path = "z";
			options.ref = "a";
			
			driverHelper.getRepoContent(options, bitbucketClient(true), function (error, body) {
				// assert.ok(body);
				done();
			});
		});
		
	});
	
	describe("testing getAllRepos", function () {
		
		it("Fail", function (done) {
			driverHelper.getAllRepos(options, bitbucketClient(false), function (error, body) {
				// assert.ok(body);
				done();
			});
		});
		
		it("Success", function (done) {
			driverHelper.getAllRepos(options, bitbucketClient(true), function (error, body) {
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