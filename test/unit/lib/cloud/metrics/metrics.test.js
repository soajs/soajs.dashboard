"use strict";
const assert = require("assert");
const helper = require("../../../../helper.js");
const utils = helper.requireModule('./lib/cloud/metrics/index.js');
let metrics;
let config = {
	errors: {}
};
let req = {
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
			
			},
			error: function (data) {
			
			},
			info: function (data) {
			
			}
		},
		inputmaskData: {
			"env": "DEV"
		}
	}
};
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
	switchConnection: function (soajs) {
	}
};

let envRecord = {
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
			ports: {
				maintenanceInc: 5
			}
		}
	}
};

let deployer = helper.deployer;

describe("testing lib/cloud/metrics/index.js", function () {
	
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
				metrics = body;
				metrics.model = mongoStub;
				done();
			});
		});
		
	});
	
	describe("metrics", function () {
		
		
		it("get service metrics", function (done) {
			mongoStub.findEntry = function (soajs, opts, cb) {
				return cb(null, envRecord);
			};
			
			metrics.getServicesMetrics(config, req.soajs, deployer, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
		it("get node metrics", function (done) {
			mongoStub.findEntry = function (soajs, opts, cb) {
				return cb(null, envRecord);
			};
			
			metrics.getNodesMetrics(config, req.soajs, deployer, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
	});
});