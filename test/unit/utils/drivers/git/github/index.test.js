"use strict";
const assert = require("assert"); //todo: check unused
const helper = require("../../../../../helper.js");

let driver = helper.requireModule('./utils/drivers/git/github/index.js');
let driverHelper = helper.requireModule('./utils/drivers/git/github/helper.js');
driver.helper = driverHelper;

let soajs = {};
let data = {
	getAccount: function (soajs, model, options, cb) {
		let accountRecord = {
			repos: []
		};
		return cb(null, accountRecord);
	},
	removeAccount: function (soajs, model, id, cb) {
		return cb(null, true);
	},
	saveNewAccount: function (soajs, model, id, cb) {
		return cb(null, true);
	},
	checkIfAccountExists: function (soajs, model, options, cb) {
		return cb(null, 0);
	}
	
};
let model = {};

describe("testing git/github index.js", function () {
	let options = {
		provider: 'github'
	};
	
	describe("testing login", function () {
		it("Success public personal", function (done) {
			options = {
				owner: '123456789',
				access: 'public',
				type: 'personal',
				provider: 'github'
			};
			driver.login(soajs, data, model, options, function (error, body) {
				// assert.ok(error);
				done();
			});
		});
		
		it("Success public organization", function (done) {
			options = {
				owner: '123456789',
				access: 'public',
				type: 'organization',
				provider: 'github'
			};
			driver.login(soajs, data, model, options, function (error, body) {
				// assert.ok(error);
				done();
			});
		});
		
		it("Success public organization", function (done) {
			options = {
				username: "username",
				password: 'password',
				owner: '123456789',
				access: 'private',
				provider: 'github'
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
		it("Success 1", function (done) {
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
				let content = {
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
	
	describe("testing getAnyContent", function () {
		it("Success", function (done) {
			options.path = '';
			driverHelper.getRepoContent = function (options, cb) {
				let content = {
					sha: "code",
					content: "{}"
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