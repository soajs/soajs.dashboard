"use strict";
var assert = require("assert");
var testHelper = require("../../../../helper.js");
var module = testHelper.requireModule('./lib/cloud/infra/index.js');
var extras;
var config = testHelper.requireModule('./config.js');
var deployer = testHelper.deployer;

const sinon = require('sinon');

var soajs = {
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
	inputmaskData: {},
	validator: {
		Validator: function () {
			return {
				validate: function (boolean) {
					if (boolean) {
						//valid
						return {
							errors: []
						};
					}
					else {
						//invalid
						return {
							errors: [{ error: 'msg' }]
						};
					}
				}
			};
		}
	}
};
var infraRecord = {
	"_id": '5b28c5edb53002d7b3b1f0cf',
	"api": {
		"clientId": "1",
		"secret": "1",
		"domain": "2",
		"subscriptionId": "36"
	},
	"name": "azure",
	"technologies": [
		"vm"
	],
	"templates": [
		"local"
	],
	"drivers": [
		"Native",
		"Terraform"
	],
	"label": "Azure Soajs",
	"deployments": [
		{
			"technology": "vm",
			"options": {
				"zone": "local"
			},
			"environments": [
				"DEV"
			],
			"loadBalancers": {},
			"name": "htlocalp42pyx0b5lsyt",
			"id": "htlocalp42pyx0b5lsyt"
		}
	]
};
var vm_layers = {
	"_id": '5b2cea680669cf2c142e6407',
	"infraId": "5b28c5edb53002d7b3b1f0cf",
	"layerName": "tester-ragheb",
	"infraCodeTemplate": "dynamic-template-loadBalancer",
	"templateState": "{}",
	"input": "{}",
	"env": "dashboard",
	"v": 1,
	"ts": 1529670248943
};
var template = {
	"type": "_infra",
	"infra": "5b28c5edb53002d7b3b1f0cf",
	"location": "local",
	"deletable": true,
	"textMode": true,
	"driver": "Terraform",
	"technology": "vm",
	"name": "template azure ip",
	"description": "sdasdasdas",
	"content": "provider"
};
var envRecord = {
	code: 'DEV',
	deployer: {
		"type": "container",
		"selected": "container.kubernetes.local",
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
		},
	},
	dbs: {
		clusters: {
			analy: {
				credentials: {
					username: 'username',
					password: 'password'
				},
				servers: [{ port: 123, host: 'host' }]
			},
			oneCluster: {
				servers: []
			}
		},
		config: {
			session: {
				cluster: 'oneCluster'
			}
		}
	},
	services: {},
	profile: '',
	"restriction":{
		"1231231":{
			"eastus": {
				group: "grouptest",
				network: "networktest"
			}
		}
	}
};
var req = {
	query: {},
	soajs: soajs
};
var mongoStub = {
	getDb: function () {
	},
	checkForMongo: function (soajs) {
		return true;
	},
	insertEntry: function (soajs, options, cb) {
		cb(null, [{ _id: "123" }]);
	},
	validateId: function (soajs, cb) {
		return cb(null, soajs.inputmaskData.id);
	},
	validateCustomId: function (soajs, id, cb) {
		if (typeof cb === 'function') {
			return cb(null, id);
		}
		else {
			return id;
		}
	},
	findEntry: function (soajs, opts, cb) {
		if (opts.collection === 'environment') {
			cb(null, envRecord);
		}
		else if (opts.collection === 'infra') {
			cb(null, infraRecord);
		}
		else if (opts.collection === 'templates') {
			cb(null, template);
		}
		else if (opts.collection === 'vm_layers') {
			cb(null, vm_layers);
		}
	},
	findEntries: function (soajs, opts, cb) {
		var data = [{
			name: 'one'
		}];
		cb(null, data);
	},
	removeEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	saveEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	updateEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	switchConnection: function (soajs) {
	},
	closeConnection: function (soajs) {
		return true;
	}
};

describe("testing lib/cloud/infra/extras.js", function () {

	after(function (done) {
		sinon.restore();
		done();
	});

	describe("testing init", function () {
		before(() => {
			mongoStub.findEntry = function (soajs, opts, cb) {
				if (opts.collection === 'environment') {
					return cb(null, envRecord);
				} else if (opts.collection === 'infra') {
					return cb(null, infraRecord);
				} else if (opts.collection === 'templates') {
					return cb(null, template);
				} else if (opts.collection === 'vm_layers') {
					return cb(null, vm_layers);
				} else {
					return cb(null, {});
				}
			};
		});
		it("No Model Requested", function (done) {
			module.init(null, function (error, body) {
				assert.ok(error);
				done();
			});
		});

		it("Model Name not found", function (done) {
			module.init('anyName', function (error, body) {
				assert.ok(error);
				done();
			});
		});

		it("Init", function (done) {
			module.init('mongo', function (error, body) {
				assert.ok(body);
				extras = body;
				extras.model = mongoStub;
				done();
			});
		});

	});

	describe("Testing getExtras", function () {
		afterEach(function (done) {
			deployer.execute = function (opts, command, options, cb) {
				return cb(null, []);
			};
			done();
		});
		it("Success", function (done) {
			req.soajs.inputmaskData = {
				"id": "5b28c5edb53002d7b3b1f0cf",
				"envCode": "DEV",
				"group": "group",
				"region": "eastus",
			};
			deployer.execute = function (opts, command, options, cb) {
				if (command === "listDisks") {
					return cb(new Error("error"));
				}
				return cb(null, []);
			};
			deployer.validateInputs = function (options, schema, type, cb) {
				return cb(null, true);
			};
			extras.getExtras(config, req, req.soajs, deployer, function (error, body) {
				assert.ok(body);
				done();
			});
		});
	});
	
	describe("Testing createExtras", function () {
		afterEach(function (done) {
			deployer.execute = function (opts, command, options, cb) {
				return cb(null, []);
			};
			done();
		});
		it("Success group", function (done) {
			req.soajs.inputmaskData = {
				"infraId": "5b28c5edb53002d7b3b1f0cf",
				"envCode": "DEV",
				"technology": "vm",
				"params": {
					"section": "group",
					"name": "testcase",
					"labels": { "test": "case" }
				},
			};
			deployer.execute = function (opts, command, options, cb) {
				return cb(null, true);
			};
			
			extras.createExtras(config, req, req.soajs, deployer, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
		it("Success network", function (done) {
			req.soajs.inputmaskData = {
				"infraId": "5b28c5edb53002d7b3b1f0cf",
				"envCode": "DEV",
				"technology": "vm",
				"params": {
					"section": "network",
					"name": "testcase",
					"labels": { "test": "case" }
				},
			};
			deployer.execute = function (opts, command, options, cb) {
				return cb(null, true);
			};
			
			extras.createExtras(config, req, req.soajs, deployer, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
		it("Success loadBalancer", function (done) {
			req.soajs.inputmaskData = {
				"infraId": "5b28c5edb53002d7b3b1f0cf",
				"envCode": "DEV",
				"technology": "vm",
				"params": {
					"section": "loadBalancer",
					"name": "testcase",
					"labels": { "test": "case" }
				},
			};
			deployer.execute = function (opts, command, options, cb) {
				return cb(null, true);
			};
			
			extras.createExtras(config, req, req.soajs, deployer, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
		it("Success publicIp", function (done) {
			req.soajs.inputmaskData = {
				"infraId": "5b28c5edb53002d7b3b1f0cf",
				"envCode": "DEV",
				"technology": "vm",
				"params": {
					"section": "publicIp",
					"name": "testcase",
					"labels": { "test": "case" }
				},
			};
			deployer.execute = function (opts, command, options, cb) {
				return cb(null, true);
			};
			
			extras.createExtras(config, req, req.soajs, deployer, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
		it("Success securityGroup", function (done) {
			req.soajs.inputmaskData = {
				"infraId": "5b28c5edb53002d7b3b1f0cf",
				"envCode": "DEV",
				"technology": "vm",
				"params": {
					"section": "securityGroup",
					"name": "testcase",
					"labels": { "test": "case" }
				},
			};
			deployer.execute = function (opts, command, options, cb) {
				return cb(null, true);
			};
			
			extras.createExtras(config, req, req.soajs, deployer, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
		it("fail wrong", function (done) {
			req.soajs.inputmaskData = {
				"infraId": "5b28c5edb53002d7b3b1f0cf",
				"envCode": "DEV",
				"technology": "vm",
				"params": {
					"section": "wrong",
					"name": "testcase",
					"labels": { "test": "case" }
				},
			};
			deployer.execute = function (opts, command, options, cb) {
				return cb(null, true);
			};
			
			extras.createExtras(config, req, req.soajs, deployer, function (error, body) {
				assert.ok(error);
				done();
			});
		});
	});
	
	describe("Testing updateExtras", function () {
		afterEach(function (done) {
			deployer.execute = function (opts, command, options, cb) {
				return cb(null, []);
			};
			done();
		});
		it("Success group", function (done) {
			req.soajs.inputmaskData = {
				"infraId": "5b28c5edb53002d7b3b1f0cf",
				"envCode": "DEV",
				"technology": "vm",
				"params": {
					"section": "group",
					"name": "testcase",
					"labels": { "test": "case" }
				},
			};
			deployer.execute = function (opts, command, options, cb) {
				return cb(null, true);
			};
			
			extras.updateExtras(config, req, req.soajs, deployer, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
		it("Success network", function (done) {
			req.soajs.inputmaskData = {
				"infraId": "5b28c5edb53002d7b3b1f0cf",
				"envCode": "DEV",
				"technology": "vm",
				"params": {
					"section": "network",
					"name": "testcase",
					"labels": { "test": "case" }
				},
			};
			deployer.execute = function (opts, command, options, cb) {
				return cb(null, true);
			};
			
			extras.updateExtras(config, req, req.soajs, deployer, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
		it("Success loadBalancer", function (done) {
			req.soajs.inputmaskData = {
				"infraId": "5b28c5edb53002d7b3b1f0cf",
				"envCode": "DEV",
				"technology": "vm",
				"params": {
					"section": "loadBalancer",
					"name": "testcase",
					"labels": { "test": "case" }
				},
			};
			deployer.execute = function (opts, command, options, cb) {
				return cb(null, true);
			};
			
			extras.updateExtras(config, req, req.soajs, deployer, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
		it("Success publicIp", function (done) {
			req.soajs.inputmaskData = {
				"infraId": "5b28c5edb53002d7b3b1f0cf",
				"envCode": "DEV",
				"technology": "vm",
				"params": {
					"section": "publicIp",
					"name": "testcase",
					"labels": { "test": "case" }
				},
			};
			deployer.execute = function (opts, command, options, cb) {
				return cb(null, true);
			};
			
			extras.updateExtras(config, req, req.soajs, deployer, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
		it("Success securityGroup", function (done) {
			req.soajs.inputmaskData = {
				"infraId": "5b28c5edb53002d7b3b1f0cf",
				"envCode": "DEV",
				"technology": "vm",
				"params": {
					"section": "securityGroup",
					"name": "testcase",
					"labels": { "test": "case" }
				},
			};
			deployer.execute = function (opts, command, options, cb) {
				return cb(null, true);
			};
			
			extras.updateExtras(config, req, req.soajs, deployer, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
		it("fail wrong", function (done) {
			req.soajs.inputmaskData = {
				"infraId": "5b28c5edb53002d7b3b1f0cf",
				"envCode": "DEV",
				"technology": "vm",
				"params": {
					"section": "wrong",
					"name": "testcase",
					"labels": { "test": "case" }
				},
			};
			deployer.execute = function (opts, command, options, cb) {
				return cb(null, true);
			};
			
			extras.updateExtras(config, req, req.soajs, deployer, function (error, body) {
				assert.ok(error);
				done();
			});
		});
	});
	
	describe("Testing deleteExtras", function () {
		afterEach(function (done) {
			deployer.execute = function (opts, command, options, cb) {
				return cb(null, []);
			};
			done();
		});
		it("Success group", function (done) {
			req.soajs.inputmaskData = {
				"id": "5b28c5edb53002d7b3b1f0cf",
				"envCode": "DEV",
				"name": "testcase",
				"section": "group",
			};
			deployer.execute = function (opts, command, options, cb) {
				return cb(null, true);
			};
			
			extras.deleteExtras(config, req, req.soajs, deployer, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
		it("Success network", function (done) {
			req.soajs.inputmaskData = {
				"id": "5b28c5edb53002d7b3b1f0cf",
				"envCode": "DEV",
				"name": "testcase",
				"section": "network",
			};
			deployer.execute = function (opts, command, options, cb) {
				return cb(null, true);
			};
			
			extras.deleteExtras(config, req, req.soajs, deployer, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
		it("Success loadBalancer", function (done) {
			req.soajs.inputmaskData = {
				"id": "5b28c5edb53002d7b3b1f0cf",
				"envCode": "DEV",
				"name": "testcase",
				"section": "loadBalancer",
			};
			deployer.execute = function (opts, command, options, cb) {
				return cb(null, true);
			};
			
			extras.deleteExtras(config, req, req.soajs, deployer, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
		it("Success publicIp", function (done) {
			req.soajs.inputmaskData = {
				"id": "5b28c5edb53002d7b3b1f0cf",
				"envCode": "DEV",
				"name": "testcase",
				"section": "publicIp",
			};
			deployer.execute = function (opts, command, options, cb) {
				return cb(null, true);
			};
			
			extras.deleteExtras(config, req, req.soajs, deployer, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
		it("Success securityGroup", function (done) {
			req.soajs.inputmaskData = {
				"id": "5b28c5edb53002d7b3b1f0cf",
				"envCode": "DEV",
				"name": "testcase",
				"section": "securityGroup",
			};
			deployer.execute = function (opts, command, options, cb) {
				return cb(null, true);
			};
			
			extras.deleteExtras(config, req, req.soajs, deployer, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
		it("fail wrong", function (done) {
			req.soajs.inputmaskData = {
				"id": "5b28c5edb53002d7b3b1f0cf",
				"envCode": "DEV",
				"name": "testcase",
				"section": "wrong",
			};
			deployer.execute = function (opts, command, options, cb) {
				return cb(null, true);
			};
			
			extras.deleteExtras(config, req, req.soajs, deployer, function (error, body) {
				assert.ok(error);
				done();
			});
		});
	});

});
