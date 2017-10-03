"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");
var analytics = helper.requireModule('./lib/analytics/helper.js');

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

describe("testing analytics/helper.js", function () {

	describe("testing setEsCluster", function () {
		var registry = {
			dbs: {
				databases: {},
				clusters: {}
			},
			deployer: {
				"type": "container",
				"selected": "container.docker.local",
				"container": {
					"docker": {
						"local": {
							"socketPath": "/var/run/docker.sock"
						},
						"remote": {
							"nodes": ""
						}
					},
					"kubernetes": {
						"local": {
							"nginxDeployType": "",
							"namespace": {},
							"auth": {
								"token": ""
							}
						},
						"remote": {
							"nginxDeployType": "",
							"namespace": {},
							"auth": {
								"token": ""
							}
						}
					}
				}
			}
		};
		var settings = {};
		it("Success setEsCluster", function (done) {
			req.soajs.inputmaskData = { env: 'dev' };
			analytics.setEsCluster(req, res, config, registry, settings, mongoStub, function (error, body) {
				assert.ok(body);
				done();
			});
		});

	});

});
