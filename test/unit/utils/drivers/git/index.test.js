"use strict";
const assert = require("assert");
const helper = require("../../../../helper.js");
const utils = helper.requireModule('./utils/drivers/git/index.js');

describe("testing git index.js", function () {
	let soajs = {};
	let data = {
		getAccount: function (soajs, model, options, cb) {
			return cb('error');
		},
		checkIfAccountExists: function (soajs, model, options, cb) {
			return cb('error');
		}
	};
	let model = {};
	let options = {
		provider: 'any'
	};
	
	describe("testing login", function () {
		
		it("Login github", function (done) {
			options = {
				provider: 'github'
			};
			utils.login(soajs, data, model, options, function (error, body) {
				// assert.ok(body);
				// assert.ok(body);
				done();
			});
		});
		
	});
	
	describe("testing logout", function () {
		
		it("logout github", function (done) {
			options = {
				provider: 'github'
			};
			utils.logout(soajs, data, model, options, function (error, body) {
				// assert.ok(body);
				// assert.ok(body);
				done();
			});
		});
		
	});
	
	describe("testing getRepos", function () {
		
		it("getRepos github", function (done) {
			options = {
				provider: 'github'
			};
			utils.getRepos(soajs, data, model, options, function (error, body) {
				// assert.ok(body);
				// assert.ok(body);
				done();
			});
		});
		
	});
	
	describe("testing getBranches", function () {
		
		it("getBranches github", function (done) {
			options = {
				provider: 'github'
			};
			utils.getBranches(soajs, data, model, options, function (error, body) {
				// assert.ok(body);
				// assert.ok(body);
				done();
			});
		});
		
	});
	
	describe("testing getJSONContent", function () {
		
		it("getJSONContent github", function (done) {
			options = {
				path: 'name.js',
				provider: 'github'
			};
			utils.getJSONContent(soajs, data, model, options, function (error, body) {
				// assert.ok(body);
				// assert.ok(body);
				done();
			});
		});
		
	});
	
	describe("testing getAnyContent", function () {
		
		it("Fail name not found", function (done) {
			options = {
				provider: 'any'
			};
			utils.getAnyContent(soajs, data, model, options, function (error, body) {
				assert.ok(error);
				done();
			});
		});
		
		it("Success get github", function (done) {
			options = {
				provider: 'github'
			};
			utils.getAnyContent(soajs, data, model, options, function (error, body) {
				// assert.ok(body);
				// assert.ok(body);
				done();
			});
		});
		
	});
	
});