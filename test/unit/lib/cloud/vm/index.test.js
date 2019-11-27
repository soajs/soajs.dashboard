"use strict";
const assert = require("assert");
const helper = require("../../../../helper.js");
const utils = helper.requireModule('./lib/cloud/vm/index.js');
let services;
const config = helper.requireModule('./config.js');
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
		cb(null, [{
			"_id": '123',
			"api": {
				"clientId": "123",
				"secret": "123",
				"domain": "123",
				"subscriptionId": "123"
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
			"deployments": []
		}
		]);
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
			ports: {}
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
let vm_layers = {
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
let deployer = helper.deployer;

deployer.runCommand = function (opts, command, options, cb) {
	
	return cb(null, true);
};

describe("testing lib/cloud/vm/index.js", function () {
	
	before(() => {
		mongoStub.findEntry = function (soajs, opts, cb) {
			if (opts.collection === 'environment') {
				return cb(null, envRecord);
			} else if (opts.collection === 'infra') {
				return cb(null, infraRecord);
			} else if (opts.collection === 'vm_layers') {
				return cb(null, vm_layers);
			} else {
				return cb(null, {});
			}
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
	
	describe("list Vms", function () {
		
		it("Success", function (done) {
			req.soajs.inputmaskData.env = 'tester';
			deployer.execute = function (opts, command, options, cb) {
				let resp = [
					{
						"layer": "tester-ragheb",
						"name": "tester-vm",
						"id": "tester-vm",
						"labels": {
							"soajs.env.code": "tester",
							"soajs.service.vm.location": "eastus",
							"soajs.service.vm.group": "TESTER",
							"soajs.service.vm.size": "Standard_A1"
						},
						"ports": [
							{
								"protocol": "Tcp",
								"target": "*",
								"published": "22",
								"isPublished": true
							}
						],
						"voluming": {},
						"tasks": [
							{
								"id": "tester-vm",
								"name": "tester-vm",
								"status": {
									"state": "succeeded",
									"ts": 1529401817897
								},
								"ref": {
									"os": {
										"type": "Linux",
										"diskSizeGB": 30
									}
								}
							}
						],
						"env": [],
						"ip": "40.114.123.90"
					},
					{
						"name": "mongo",
						"layer": "tester-ragheb",
						"id": "mongo",
						"labels": {
							"soajs.service.vm.location": "centralus",
							"soajs.service.vm.group": "SOAJS",
							"soajs.service.vm.size": "Standard_B1ms"
						},
						"ports": [
							{
								"protocol": "TCP",
								"target": "*",
								"published": "22",
								"isPublished": true
							},
							{
								"protocol": "tcp/udp",
								"target": "*",
								"published": "27017",
								"isPublished": true
							}
						],
						"voluming": {},
						"tasks": [
							{
								"id": "mongo",
								"name": "mongo",
								"status": {
									"state": "succeeded",
									"ts": 1529401818453
								},
								"ref": {
									"os": {
										"type": "Linux",
										"diskSizeGB": 30
									}
								}
							}
						],
						"env": [],
						"ip": "104.43.136.85"
					},
					{
						"name": "mysql",
						"layer": "tester-differ",
						"id": "mysql",
						"labels": {
							"soajs.service.vm.location": "centralus",
							"soajs.service.vm.group": "SOAJS",
							"soajs.service.vm.size": "Standard_B1ms"
						},
						"ports": [
							{
								"protocol": "TCP",
								"target": "*",
								"published": "22",
								"isPublished": true
							},
							{
								"protocol": "tcp/udp",
								"target": "*",
								"published": "3306",
								"isPublished": true
							}
						],
						"voluming": {},
						"tasks": [
							{
								"id": "mysql",
								"name": "mysql",
								"status": {
									"state": "succeeded",
									"ts": 1529401818328
								},
								"ref": {
									"os": {
										"type": "Linux",
										"diskSizeGB": 30
									}
								}
							}
						],
						"env": [],
						"ip": "104.43.151.227"
					}
				];
				
				return cb(null, resp);
			};
			services.listVMs(config, req.soajs, deployer, function (error, body) {
				assert.ok(body);
				assert.ifError(error);
				assert.equal(body.azure.length, 3);
				done();
			});
		});
	});
	
	describe("runCommand", function () {
		
		it("Success", function (done) {
			req.soajs.inputmaskData.env = 'tester';
			req.soajs.inputmaskData.vmName = 'tester-vm';
			req.soajs.inputmaskData.catalog = {
				"recipe": {
					"buildOptions": {
						"settings": {
							"accelerateDeployment": true
						},
						"cmd": {
							"deploy": {
								"command": [
									"journalctl -r --lines 10"
								],
							}
						}
					}
				}
			};
			req.soajs.inputmaskData.infra = infraRecord;
			
			services.runCommand(config, req.soajs, deployer, function (error, body) {
				assert.ok(body);
				assert.ifError(error);
				done();
			});
		});
	});
});
