"use strict";
var assert = require("assert");
var helper = require("../../../../../helper.js");
var driver = helper.requireModule('./utils/drivers/git/bitbucket_enterprise/index.js');
var driverHelper = helper.requireModule('./utils/drivers/git/bitbucket_enterprise/helper.js');
driver.helper = driverHelper;

describe("testing git/bitbucket_enterprise index.js", function () {
	var soajs = {};
	var data = {
		// data.checkIfAccountExists
		getAccount: function (soajs, model, options, cb) {
			var accountRecord = {
				repos: [],
				token : "123456",
				domain : "org"
			};
			return cb(null, accountRecord);
		},
		removeAccount: function (soajs, model, id, cb) {
			return cb(null, true);
		},
		checkIfAccountExists: function (soajs, model, options, cb) {
			return cb(null, 0);
		},
		saveNewAccount: function (soajs, model, options, cb) {
			return cb(null, true);
		}
	};
	var model = {};
	var options = {
		owner: '123',
		password: '123',
		accountRecord: {
			token : "123456",
			domain : "org"
		},
		tokenInfo: {},
		provider: 'bitbucket_enterprise'
	};
	
	describe("testing login", function () {
		it("Success private", function (done) {
			driverHelper.createAuthToken = function (options, cb) {
				return cb(null, {
					access_token: "123456",
					expires_in: 2000
				});
			};
			driverHelper.checkUserRecord = function (options, cb) {
				return cb(null, {});
			};
			options.access = 'private';
			driver.login(soajs, data, model, options, function (error, body) {
				// assert.ok(error);
				done();
			});
		});
		
		it("Success public", function (done) {
			driverHelper.createAuthToken = function (options, cb) {
				return cb(null, {
					access_token: "123456",
					expires_in: 2000
				});
			};
			driverHelper.checkUserRecord = function (options, cb) {
				return cb(null, {});
			};
			options.access = 'public';
			driver.login(soajs, data, model, options, function (error, body) {
				// assert.ok(error);
				done();
			});
		});
		
		it("Fail", function (done) {
			data.checkIfAccountExists = function (soajs, model, id, cb) {
				return cb(null, 1);
			};
			driver.login(soajs, data, model, options, function (error, body) {
				// assert.ok(error);
				done();
			});
		});
	});
	
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
			options.path = '/-/>??.??';
			driverHelper.getRepoContent = function (options, cb) {
				var content = {
					lines: [{
						text: ''
					}]
				};
				return cb(null, content);
			};
			driver.getJSONContent(soajs, data, model, options, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
	});
	
	describe("testing getAnyContent", function () {
		it("Success", function (done) {
			options.path = '';
			driverHelper.getRepoContent = function (options, cb) {
				var content = {
					lines: [{
						text: ''
					}]
				};
				return cb(null, content);
			};
			driver.getAnyContent(soajs, data, model, options, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
	});
	
});