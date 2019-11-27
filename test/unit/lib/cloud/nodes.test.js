"use strict";
const assert = require("assert");
const helper = require("../../../helper.js");
const utils = helper.requireModule('./lib/cloud/nodes/index.js');
let nodes;
let config = {
	errors: {}
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
		config: {}
	},
	"restriction": {
		"1231231": {
			"eastus": {
				group: "grouptest",
				network: "networktest"
			}
		}
	}
};

let deployer = helper.deployer;

describe("testing lib/cloud/nodes/index.js", function () {
	
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
				nodes = body;
				nodes.model = mongoStub;
				done();
			});
		});
		
	});
	
	describe("listNodes", function () {
		
		it("success", function (done) {
			mongoStub.findEntry = function (soajs, opts, cb) {
				if (opts.collection === 'environment') {
					return cb(null, envRecord);
				} else if (opts.collection === 'infra') {
					return cb(null, helper.infraRecord);
				} else {
					return cb(null, {});
				}
			};
			req.soajs.inputmaskData.env = 'dev';
			nodes.listNodes(config, req.soajs, deployer, function (error, body) {
				// assert.ok(error);
				done();
			});
		});
		
	});
	
	describe("removeNode", function () {
		
		it("success", function (done) {
			mongoStub.findEntry = function (soajs, opts, cb) {
				cb(null, envRecord);
			};
			req.soajs.inputmaskData.env = 'dashboard';
			nodes.removeNode(config, req.soajs, deployer, function (error, body) {
				// assert.ok(error);
				done();
			});
		});
		
	});
	
	describe("updateNode", function () {
		
		it("success", function (done) {
			mongoStub.findEntry = function (soajs, opts, cb) {
				cb(null, envRecord);
			};
			req.soajs.inputmaskData.env = 'dashboard';
			nodes.updateNode(config, req.soajs, deployer, function (error, body) {
				// assert.ok(error);
				done();
			});
		});
		
	});
	
	describe("addNode", function () {
		
		it("success", function (done) {
			mongoStub.findEntry = function (soajs, opts, cb) {
				cb(null, envRecord);
			};
			req.soajs.inputmaskData.env = 'dashboard';
			nodes.addNode(config, req.soajs, deployer, function (error, body) {
				// assert.ok(error);
				done();
			});
		});
		
	});
	
});