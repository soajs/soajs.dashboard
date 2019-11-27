"use strict";
const assert = require("assert");
const helper = require("../../../helper.js");
const utils = helper.requireModule('./lib/cloud/maintenance/index.js');
let maintenance;
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
		
		
		it("success with infra id ", function (done) {
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
			req.soajs.inputmaskData.type = 'service';
			req.soajs.inputmaskData.infraId = '5aec1c671242bc43b6cb9e9c';
			req.soajs.inputmaskData.serviceId = '123';
			maintenance.streamLogs(config, req.soajs, deployer, function (error, body) {
				assert.ok(error);
				done();
			});
		});
		
		it("success with no infra id ", function (done) {
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
			req.soajs.inputmaskData.type = 'service';
			delete req.soajs.inputmaskData.infraId;
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
				} else if (opts.collection === 'infra') {
					return cb(null, helper.infraRecord);
				} else {
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
				} else if (opts.collection === 'infra') {
					return cb(null, helper.infraRecord);
				} else {
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
	
	describe("maintenance VM", function () {
		it("Success", function (done) {
			mongoStub.findEntry = function (soajs, opts, cb) {
				let infraRecord = {
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
				if (opts.collection === 'environment') {
					return cb(null, envRecord);
				} else if (opts.collection === 'infra') {
					return cb(null, infraRecord);
				} else {
					return cb(null, {});
				}
			};
			req.soajs.inputmaskData = {
				
				"env": "tester",
				"vmName": "tester-vm",
				"infraId": "5b28c5edb53002d7b3b1f0cf",
				"technology": "vm",
				"operation": "startVM"
				
			};
			maintenance.maintenanceVM(config, req.soajs, deployer, function (error, body) {
				assert.ok(body);
				assert.ifError(error);
				done();
			});
		});
	});
	
	describe("get Logs VM", function () {
		it("Success", function (done) {
			mongoStub.findEntry = function (soajs, opts, cb) {
				let infraRecord = {
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
				if (opts.collection === 'environment') {
					return cb(null, envRecord);
				} else if (opts.collection === 'infra') {
					return cb(null, infraRecord);
				} else {
					return cb(null, {});
				}
			};
			req.soajs.inputmaskData = {
				
				"env": "tester",
				"vmName": "tester-vm",
				"infraId": "5b28c5edb53002d7b3b1f0cf",
				"technology": "vm",
				"numberOfLines": 100
				
			};
			maintenance.getLogVM(config, req.soajs, deployer, function (error, body) {
				assert.ok(body);
				assert.ifError(error);
				done();
			});
		});
	});
});