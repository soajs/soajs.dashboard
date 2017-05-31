"use strict";
var assert = require("assert");
var helper = require("../../helper.js");
var models = helper.requireModule('./models/host.js');

var soajs = {
	log: {
		debug: function (data) {
			console.log(data);
		},
		error: function (data) {
			console.log(data);
		},
		info: function (data) {
			console.log(data);
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

describe("testing models host.js", function () {
	var options = {};
	describe("testing getEnvironment", function () {
		it("success 1", function (done) {
			models.getEnvironment(soajs, mongoStub, 'code', function () {
				done();
			});
		});
	});


});