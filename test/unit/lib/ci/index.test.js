"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");
var utils = helper.requireModule('./lib/ci/index.js');
var ci;
var ciDriver = {
	ensureRepoVars: function (settings, cb) {
		return cb(null, true);
	},
	updateSettings: function (settings, cb) {
		return cb(null, true);
	},
	setHook: function (settings, cb) {
		return cb(null, true);
	},
	generateToken: function (settings, cb) {
		return cb(null, '');
	},
	listRepos: function (options, cb) {
		return cb(null, []);
	},
	listEnvVars: function (options, cb) {
		return cb(null, []);
	},
	listSettings: function (options, cb) {
		return cb(null, []);
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
	removeEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	saveEntry: function (soajs, opts, cb) {
		cb(null, true);
	}
};
// req.soajs.tenant.key.eKey
var req = {
	soajs: {
		tenant: {
			key: {
				eKey: 'eKey'
			}
		},
		registry: {
			coreDB: {
				provision: {}
			}
		},
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
		},
		inputmaskData: {}
	}
};
var config = helper.requireModule('./config.js');

describe("testing services.js", function () {
	beforeEach(() => {
		var record = {
			_id: '592806440effddeec7d52b55',
			driver: 'travis',
			settings: {
				domain: 'api.travis-ci.org',
				owner: 'soajsTestAccount',
				gitToken: '78fa461ee6f5c25530e705415ec6'
			},
			recipe: 'sudo',
			type: 'ci'
		};
		mongoStub.findEntry = function (soajs, opts, cb) {
			if (opts.collection === 'cicd') {
				return cb(null, record);
			}
			cb(null, {});
		};
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
				ci = body;
				ci.model = mongoStub;
				done();
			});
		});

	});

	describe("testing getConfig", function () {

		before(() => {
		});
		after(() => {
		});

		it("Success. Not found", function (done) {
			mongoStub.findEntry = function (soajs, opts, cb) {
				cb(null, null);
			};
			ci.getConfig(config, req, ciDriver, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
		
		it("Success. Found 1", function (done) {
			ci.getConfig(config, req, ciDriver, function (error, body) {
				// assert.ok(body);
				done();
			});
		});

		it("Success. Found 2", function (done) {
			var record = {
				_id: '592806440effddeec7d52b55',
				driver: 'travis',
				settings: {
					domain: 'api.travis-ci.org',
					owner: 'soajsTestAccount',
					gitToken: '78fa461e6a5530e705415ec6',
					ciToken: '1234'
				},
				recipe: 'sudo',
				type: 'ci'
			};
			mongoStub.findEntry = function (soajs, opts, cb) {
				if (opts.collection === 'cicd') {
					return cb(null, record);
				}
				cb(null, {});
			};
			ci.getConfig(config, req, ciDriver, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
	});

	describe("testing deleteConfig", function () {

		before(() => {
		});
		after(() => {
		});

		it("Success deleteConfig", function (done) {

			ci.deleteConfig(config, req, ciDriver, function (error, body) {
				// assert.ok(body);
				done();
			});
		});

	});

	describe("testing toggleRepoStatus", function () {

		before(() => {
		});
		after(() => {
		});

		it("Success", function (done) {

			ci.toggleRepoStatus(config, req, ciDriver, function (error, body) {
				// assert.ok(body);
				done();
			});
		});

	});

	describe("testing getRepoSettings", function () {

		before(() => {
		});
		after(() => {
		});

		it("Success", function (done) {

			ci.getRepoSettings(config, req, ciDriver, function (error, body) {
				// assert.ok(body);
				done();
			});
		});

	});

	describe("testing updateRepoSettings", function () {

		before(() => {
		});
		after(() => {
		});

		it("Success", function (done) {
			req.soajs.inputmaskData = {
				"id": 12464664,
				"port": 80,
				"settings": {},
				"variables": {
					"var1": "val1",
					"var2": "val2"
				}
			};
			ci.updateRepoSettings(config, req, ciDriver, function (error, body) {
				// assert.ok(body);
				done();
			});
		});

	});

});