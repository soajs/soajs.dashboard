"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");
var utils = helper.requireModule('./lib/cloud/maintenance.js');
var maintenance;
var config = {
	errors: {}
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

var deployer = {
	addNode: function (options, cb) {
		return cb(null, true);
	},
	updateNode: function (options, cb) {
		return cb(null, true);
	},
	removeNode: function (options, cb) {
		return cb(null, true);
	},
	listNodes: function (options, cb) {
		var arr = [];
		return cb(null, arr);
	},
	listServices: function (data, cb) {
		var arr = [
			{
				labels: {
					'soajs.env.code': 'dev'
				},
				ports: []
			}
		];
		return cb(null, arr);
	}
};

describe("testing maintenance.js", function () {

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

		it("Init", function (done) {

			utils.init('mongo', function (error, body) {
				assert.ok(body);
				maintenance = body;
				maintenance.model = mongoStub;
				done();
			});
		});

	});

	describe("streamLogs", function () {

		it("Failed", function (done) {
			mongoStub.findEntry = function (soajs, opts, cb) {
				cb(null, {
					_id: '',
					code: '',
					deployer: {
						type: 'manual',
						selected: 'container.docker.local',
						container: {
							docker: {},
							kubernetes: {}
						}
					}
				});
			};
			req.soajs.inputmaskData.env = 'dev';
			req.soajs.inputmaskData.serviceId = '123';
			maintenance.streamLogs(config, req.soajs, {}, deployer, function (error, body) {
				assert.ok(error);
				done();
			});
		});

	});
});