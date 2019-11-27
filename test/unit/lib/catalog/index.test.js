"use strict";
const assert = require("assert");
const helper = require("../../../helper.js");
const utils = helper.requireModule('./lib/catalog/index.js');
let catalog;
const config = helper.requireModule('./config.js');

let mongoStub = {
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
	},
	initConnection: function (soajs) {
		return true;
	},
	closeConnection: function (soajs) {
		return true;
	}
};
let req = {
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

describe("testing catalog.js", function () {
	before(() => {
	});
	after(() => {
	});
	
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
				catalog = body;
				catalog.model = mongoStub;
				done();
			});
		});
		
	});
	
	describe("testing list", function () {
		
		it("Success", function (done) {
			req.soajs.inputmaskData = {};
			catalog.list(config, req, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
		
		it("Success with version", function (done) {
			req.soajs.inputmaskData = {
				version: true
			};
			catalog.list(config, req, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
		
	});
	
});