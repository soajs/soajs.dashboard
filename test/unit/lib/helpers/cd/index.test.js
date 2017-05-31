"use strict";
var assert = require("assert");
var helper = require("../../../../helper.js");
var helpers = helper.requireModule('./lib/helpers/cd/index.js');

var mongoStub = {
	checkForMongo: function (soajs) {
		return true;
	},
	validateId: function (soajs, cb) {
		return cb(null, soajs.inputmaskData.id);
	},
	findEntry: function (soajs, opts, cb) {
		cb(null, { metadata: {} });
	},
	removeEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	saveEntry: function (soajs, opts, cb) {
		cb(null, true);
	}
};
var deployer = {
	listServices: function (options, cb) {
		var services = [];
		return cb(null, services);
	}
};
var BL = {
	model: mongoStub
};
describe("testing helper cd.js", function () {
	var soajs = {
		inputmaskData: {},
		tenant: {
			application: {}
		}
	};
	var req = {
		soajs: soajs
	};
	describe("getEnvsServices", function () {
		var output;
		beforeEach(() => {

		});
		
		it("Success", function (done) {
			var envs = [];
			helpers.getEnvsServices(envs, req, deployer, BL, function (error, body) {
				done();
			});
		});
		
	});
	
});