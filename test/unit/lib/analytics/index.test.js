"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");
var utils = helper.requireModule('./lib/analytics/index.js');
var analytics;

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
	removeEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	saveEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	insertEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	updateEntry: function (soajs, opts, cb) {
		cb(null, true);
	}
};
var req = {
	soajs: {
		registry: {
			coreDB: {
				provision: {}
			}
		},
		log: {
			debug: function (data) {

			},
			error: function (data) {

			},
			info: function (data) {

			}
		},
		inputmaskData: {}
	}
};
var res = {};
var config = helper.requireModule('./config.js');

describe("testing analytics.js", function () {
	
	describe("testing init", function () {

		it("No Model Requested", function (done) {
			utils.init(null, function (error, body) {
				assert.ok(error);
				done();
			});
		});

		it("Model Name not found", function (done) {
			utils.init('anyName', function (error, body) {
				assert.ok(error);
				done();
			});
		});

		it("Init model", function (done) {
			utils.init('mongo', function (error, body) {
				assert.ok(body);
				analytics = body;
				analytics.model = mongoStub;
				done();
			});
		});

	});

	describe("testing getSettings", function () {
		before(() => {
		});
		after(() => {
		});

		it("Success getSettings", function (done) {
			req.soajs.inputmaskData = {
				env: 'dev'
			};
			analytics.getSettings(config, req, res, function (error, body) {
				// assert.ok(body);
				done();
			});
		});

	});
	
});