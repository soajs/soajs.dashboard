"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");
var utils = helper.requireModule('./lib/cloud/maintenance/index.js');
var maintenance;
var config = {
	errors: {}
};

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
				
			},
			error: function (data) {
				
			},
			info: function (data) {
				
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
	},
	switchConnection: function(soajs) {
	}
};

var envRecord = {
	_id: '',
	code: 'DEV',
	deployments: [
		{
			"technology": "docker",
			"options": {
				"zone": "local"
			},
			"environments": [
				"DCKR"
			],
			"loadBalancers": {},
			"name": "htlocalmggdiohh06wiu",
			"id": "htlocalmggdiohh06wiu"
		}
	],
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

var deployer = helper.deployer;

describe("testing lib/cloud/maintenance/index.js", function () {
	
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
			maintenance.streamLogs(config, req.soajs, deployer, function (error, body) {
				assert.ok(error);
				done();
			});
		});
		
	});
	
	describe("maintenance", function () {
		
		it("Success service", function (done) {
			mongoStub.findEntry = function (soajs, opts, cb) {
				if (opts.collection === 'environment') {
					return cb(null, envRecord);
				}else if (opts.collection === 'infra') {
					return cb(null, helper.infraRecord);
				}else{
					return cb(null, {});
				}
			};
			req.soajs.inputmaskData.env = 'dev';
			req.soajs.inputmaskData.type = 'service';
			req.soajs.inputmaskData.serviceName = 'test';
			req.soajs.inputmaskData.serviceId = '123';
			
			maintenance.maintenance(config, req.soajs, deployer, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
		it("Success daemon", function (done) {
			mongoStub.findEntry = function (soajs, opts, cb) {
				if (opts.collection === 'environment') {
					return cb(null, envRecord);
				}else if (opts.collection === 'infra') {
					return cb(null, helper.infraRecord);
				}else{
					return cb(null, {});
				}
			};
			req.soajs.inputmaskData.env = 'dev';
			req.soajs.inputmaskData.type = 'daemon';
			req.soajs.inputmaskData.serviceName = 'test';
			req.soajs.inputmaskData.serviceId = '123';
			
			maintenance.maintenance(config, req.soajs, deployer, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
	});
});