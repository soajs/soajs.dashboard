"use strict";
const assert = require("assert"); //todo: check unused
const helper = require("../../../../../helper.js");

let driver = helper.requireModule('./utils/drivers/git/bitbucket/index.js');
let driverHelper = helper.requireModule('./utils/drivers/git/bitbucket/helper.js');
driver.helper = driverHelper;

describe("testing git/bitbucket index.js", function () {
	let soajs = {};
	let data = {
		// data.checkIfAccountExists
		getAccount: function (soajs, model, options, cb) {
			let accountRecord = {
				repos: []
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
	let model = {};
	let options = {
		tokenInfo: {},
		provider: 'bitbucket'
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
				return cb(null, {
					user: {
						username: "john"
					}
				});
			};
			options.access = 'private';
			driver.login(soajs, data, model, options, function (error, body) {
				// assert.ok(error);
				done();
			});
		});
		
		it("Success", function (done) {
			driverHelper.createAuthToken = function (options, cb) {
				return cb(null, {
					access_token: "123456",
					expires_in: 2000
				});
			};
			driverHelper.checkUserRecord = function (options, cb) {
				return cb(null, {
					user: {
						username: "john"
					}
				});
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
				return cb(null, true, {});
			};
			driverHelper.buildReposArray = function (options) {
				return true;
			};
			data.getAccount = function (soajs, model, options, cb) {
				return cb(null, {token: "123"});
			};
			driverHelper.checkAuthToken = function (soajs, options, model, accountRecord, cb) {
				return cb(null, true, {
					token: "123",
					tokenInfo: {}
				});
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
				let content = "{}";
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
				let content = "{}";
				return cb(null, content);
			};
			driver.getAnyContent(soajs, data, model, options, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
	});
	
});