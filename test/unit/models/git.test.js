"use strict";
var assert = require("assert");
var helper = require("../../helper.js");
var models = helper.requireModule('./models/git.js');

var soajs = {
	log: {
		debug: function (data) {
			
		},
		error: function (data) {
			
		},
		info: function (data) {
			
		}
	}
};
var mongoStub = {
	checkForMongo: function (soajs) {
		return true;
	},
	validateId: function (soajs, cb) {
		return cb(null, soajs.inputmaskData.id);
	},
	findEntries: function (soajs, opts, cb) {
		cb(null, []);
	},
	findEntry: function (soajs, opts, cb) {
		cb(null, {});
	},
	updateEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	countEntries: function (soajs, opts, cb) {
		cb(null, 0);
	},
	removeEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	saveEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	insertEntry: function (soajs, opts, cb) {
		cb(null, true);
	}
};
describe("testing models git.js", function () {
	var options = {};
	describe("testing getAuthToken", function () {
		it("success 1", function (done) {
			models.getAuthToken(soajs, mongoStub, options, function () {
				done();
			});
		});
	});

	describe("testing getAccount", function () {
		it("success 1", function (done) {
			options.accountId = '111';
			models.getAccount(soajs, mongoStub, options, function () {
				done();
			});
		});
		it("success 2", function (done) {
			options = {
				owner: 'owner',
				'repo': 'repo'
			};
			models.getAccount(soajs, mongoStub, options, function () {
				done();
			});
		});
	});

	describe("testing getRepo", function () {
		it("success 1", function (done) {
			models.getRepo(soajs, mongoStub, options, function () {
				done();
			});
		});
	});

	describe("testing searchForAccount", function () {
		it("success 1", function (done) {
			models.searchForAccount(soajs, mongoStub, options, function () {
				done();
			});
		});
	});

	describe("testing addRepoToAccount", function () {
		it("success 1", function (done) {
			options = {
				repo: 'property'
			};
			soajs.inputmaskData = {
				accountRecord : {
					repos: []
				}
			};
			models.addRepoToAccount(soajs, mongoStub, options, function () {
				done();
			});
		});
	});


	describe("testing removeRepoFromAccount", function () {
		it("success 1", function (done) {
			options = {
				repoLabel: 'property'
			};
			soajs.inputmaskData = {
				accountRecord : {
					repos: []
				}
			};
			models.removeRepoFromAccount(soajs, mongoStub, options, function () {
				done();
			});
		});
	});

	describe("testing updateRepoInfo", function () {
		it("success 1", function (done) {
			options = {
				property: 'property'
			};
			models.updateRepoInfo(soajs, mongoStub, options, function () {
				done();
			});
		});
	});

});