"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");
var utils = helper.requireModule('./lib/services/index.js');
var servicesModel = helper.requireModule('./models/services.js');
var services;
let stubMongo = {
	checkForMongo: function (soajs) {
		return true;
	},
	updateEntry: function (soajs, opts, cb) {
		return cb(null, true);
	},
	countEntries: function (soajs, opts, cb) {
		return cb(null, 1);
	},
	validateId: function (soajs, cb) {
		return cb(null, soajs.inputmaskData.id);
	},
	findEntry: function (soajs, opts, cb) {
		cb(null, { metadata: {} });
	},
	findEntries: function (soajs, opts, cb) {
		cb(null, []);
	},
	insertEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	removeEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	saveEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	distinctEntries: function (soajs, opts, cb) {
		cb(null, true);
	},
	initConnection: function (soajs) {
		return true;
	},
	closeConnection: function (soajs) {
		return true;
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
var config = helper.requireModule('./config.js');

describe("testing services.js", function () {
	
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
				services = body;
				services.model = stubMongo;
				done();
			});
		});

	});

	describe("list", function () {
		before(() => {
			req.soajs.inputmaskData = {};
			stubMongo.findEntry = function (soajs, opts, cb) {
				return cb(null, {});
			};
		});
		after(() => {
		});

		it("Success list", function (done) {
			stubMongo.findEntries = function (soajs, opts, cb) {
				// var colName = 'services';
				// var envColName = 'environment';
				var services = [];
				if (opts.collection === 'services') {
					return cb(null, services);
				}
				return cb(null, services);
			};

			services.list(config, req, {}, servicesModel, function (error, body) {
				// assert.ok(body);
				done();
			});
		});

		it("Success list with includeEnvs", function (done) {
			stubMongo.findEntries = function (soajs, opts, cb) {
				// var colName = 'services';
				// var envColName = 'environment';
				var services = [];
				if (opts.collection === 'services') {
					return cb(null, services);
				}
				return cb(null, services);
			};
			req.soajs.inputmaskData = {
				includeEnvs: []
			};
			services.list(config, req, {}, servicesModel, function (error, body) {
				// assert.ok(body);
				done();
			});
		});


	});

	describe("updateSettings", function () {
		before(() => {
			stubMongo.findEntry = function (soajs, opts, cb) {
				return cb(null, {});
			};
		});
		after(() => {
		});

		it("Success updateSettings", function (done) {
			stubMongo.findEntries = function (soajs, opts, cb) {
				// var colName = 'services';
				// var envColName = 'environment';
				var services = [];
				if (opts.collection === 'services') {
					return cb(null, services);
				}
				return cb(null, services);
			};
			req.soajs.inputmaskData = {
				version: 1,
				env: "dev",
				id: "58b979deca8151ce00f366d9",
				settings: {}
			};

			services.updateSettings(config, req, {}, function (error, body) {
				// assert.ok(body);
				done();
			});
		});

	});
	
});