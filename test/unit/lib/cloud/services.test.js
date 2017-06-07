"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");
var utils = helper.requireModule('./lib/cloud/services.js');
var services;
var config = helper.requireModule('./config.js');

var req = {
	soajs: {
		servicesConfig: {
			dashboard: {}
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

var envRecord = {
	_id: '',
	code: 'DEV',
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
	},
	services: {
		config: {
			ports: {}
		}
	}
};
var deployer = helper.deployer;

deployer.listServices = function (options, cb) {
	var arr = [
		{
			env: [
				'NODE_ENV=production',
				'SOAJS_ENV=dev',
				'SOAJS_PROFILE=/opt/soajs/FILES/profiles/profile.js',
				'SOAJS_SRV_AUTOREGISTERHOST=true',
				'SOAJS_SRV_MEMORY=200',
				'SOAJS_GIT_OWNER=soajs',
				'SOAJS_GIT_BRANCH=develop',
				'SOAJS_GIT_COMMIT=67a61db0955803cddf94672b0192be28f47cf280',
				'SOAJS_GIT_REPO=soajs.controller',
				'SOAJS_DEPLOY_HA=swarm'
			]
		}
	];
	return cb(null, arr);
};

describe("testing services.js", function () {

	before(() => {
		mongoStub.findEntry = function (soajs, opts, cb) {
			if (opts.collection === 'environment') {
				return cb(null, envRecord);
			}
			return cb(null, {});
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

		it("Init", function (done) {

			utils.init('mongo', function (error, body) {
				assert.ok(body);
				services = body;
				services.model = mongoStub;
				done();
			});
		});

	});

	describe("listServices", function () {

		it("Success", function (done) {
			req.soajs.inputmaskData.env = 'dev';
			req.soajs.inputmaskData.type = 'daemon';

			services.listServices(config, req.soajs, deployer, function (error, body) {
				assert.ok(body);
				done();
			});
		});

	});

	describe("scaleService", function () {

		it("Success", function (done) {
			req.soajs.inputmaskData.env = 'dev';

			services.scaleService(config, req.soajs, deployer, function (error, body) {
				assert.ok(body);
				done();
			});
		});

	});

	describe("deleteService", function () {

		it("Success", function (done) {
			req.soajs.inputmaskData.env = 'dev';
			req.soajs.inputmaskData.serviceId = '123';

			services.deleteService(config, req.soajs, deployer, function (error, body) {
				assert.ok(body);
				done();
			});
		});

	});
});