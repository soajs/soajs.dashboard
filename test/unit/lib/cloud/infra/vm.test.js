"use strict";
var assert = require("assert");
var testHelper = require("../../../../helper.js");
var module = testHelper.requireModule('./lib/cloud/infra/index.js');
var vmModule = testHelper.requireModule('./lib/cloud/vm/index.js');
var vm;
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
	"_id":'5b2cea680669cf2c142e6407',
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
		}
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
	profile: ''
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
		cb(null, [{_id: "123"}]);
	},
	validateId: function (soajs, cb) {
		return cb(null, soajs.inputmaskData.id);
	},
	validateCustomId: function (soajs, id, cb) {
		if (typeof cb === 'function'){
			return cb(null, id);
		}
		else {
			return id;
		}
	},
	findEntry: function (soajs, opts, cb) {
		if (opts.collection === 'environment'){
			cb(null, envRecord);
		}
		else if (opts.collection === 'infra'){
			cb(null, infraRecord);
		}
		else if (opts.collection === 'templates'){
			cb(null, template);
		}
		else if (opts.collection === 'vm_layers'){
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
	closeConnection: function (soajs){
		return true;
	}
};
describe("testing lib/cloud/infra/index.js", function () {

	after(function (done) {
		sinon.restore();
		done();
	});

	describe("testing init", function () {
		before(() => {
			mongoStub.findEntry = function (soajs, opts, cb) {
				if (opts.collection === 'environment') {
					return cb(null, envRecord);
				}else if (opts.collection === 'infra') {
					return cb(null, infraRecord);
				}else if (opts.collection === 'templates') {
					return cb(null, template);
				}else if (opts.collection === 'vm_layers') {
					return cb(null, vm_layers);
				}else{
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
				vm = body;
				vm.model = mongoStub;
				done();
			});
		});

	});

	describe("deployVM", function () {
		it("success ", function (done) {
			req.soajs.inputmaskData = {
				"infraId": "5b28c5edb53002d7b3b1f0cf",
				"technology": "vm",
				"infraCodeTemplate": "template loadBalancer",
				"region": "centralus",
				"layerName": "tester",
				"specs": {
					"infraCodeTemplate": "template loadBalancer",
					"name": "tester",
					"vmSize": "Standard_A0",
					"createNewVirtualNetwork": true,
					"createNewSecurityGroup": true,
					"privateIpAllocationMethod": "dynamic",
					"attachPublicIpAddress": true,
					"createNewPublicIpAddress": true,
					"publicIpAllocationMethod": "dynamic",
					"deleteOsDiskOnTermination": true,
					"deleteDataDisksOnTermination": true,
					"osDiskCachingMode": "ReadWrite",
					"osDiskType": "standard_LRS",
					"add_anothernewVolumes": "<a class='btn btn-sm btn-primary f-right'><span class='icon icon-plus'></span> Add Another</a>",
					"add_anotherexistingVolumes": "<a class='btn btn-sm btn-primary f-right'><span class='icon icon-plus'></span> Add Another</a>",
					"useSshKeyAuth": false,
					"imageSku": "16.04-LTS",
					"tags": {
						"key": "value"
					},
					"subnetAddressPrefix": "10.0.0.0/24",
					"virtualNetworkAddressSpaces": "10.0.0.0/16",
					"numberOfVms": 1,
					"publicIpIdleTimeout": 30,
					"adminUsername": "ubuntu",
					"adminPassword": "123123",
					"imagePublisher": "Canonical",
					"imageOffer": "UbuntuServer",
					"imageVersion": "latest",
					"region": "centralus",
					"group": "tester",
					"ports": [
						{
							"portName": "ssh",
							"protocol": "tcp",
							"target": 22,
							"published": 22,
							"isPublished": false,
							"healthCheckRequestPath": "/",
							"healthCheckRequestProtocol": "Http"
						}
					],
					"newVolumes": [],
					"existingVolumes": []
				},
				"env": "DEV"
			};
			deployer.execute = function (opts, command, options, cb) {
				return cb(null, {stateFileData: {}, render: {}});
			};
			
			vm.deployVM(config, req, req.soajs, deployer, function (error, body) {
				assert.deepEqual(body, {"id": "123", "name": req.soajs.inputmaskData.layerName, "infraId": req.soajs.inputmaskData.infraId});
				done();
			});
		});
	});

	describe("updateVM1", function () {
		it("success ", function (done) {
			req.soajs.inputmaskData = {
				"id": "123",
				"infraId": "5b28c5edb53002d7b3b1f0cf",
				"technology": "vm",
				"infraCodeTemplate": "template loadBalancer",
				"region": "centralus",
				"layerName": "tester",
				"specs": {
					"infraCodeTemplate": "template loadBalancer",
					"name": "tester",
					"vmSize": "Standard_A0",
					"createNewVirtualNetwork": true,
					"createNewSecurityGroup": true,
					"privateIpAllocationMethod": "dynamic",
					"attachPublicIpAddress": true,
					"createNewPublicIpAddress": true,
					"publicIpAllocationMethod": "dynamic",
					"deleteOsDiskOnTermination": true,
					"deleteDataDisksOnTermination": true,
					"osDiskCachingMode": "ReadWrite",
					"osDiskType": "standard_LRS",
					"add_anothernewVolumes": "<a class='btn btn-sm btn-primary f-right'><span class='icon icon-plus'></span> Add Another</a>",
					"add_anotherexistingVolumes": "<a class='btn btn-sm btn-primary f-right'><span class='icon icon-plus'></span> Add Another</a>",
					"useSshKeyAuth": false,
					"imageSku": "16.04-LTS",
					"tags": {
						"key": "value"
					},
					"subnetAddressPrefix": "10.0.0.0/24",
					"virtualNetworkAddressSpaces": "10.0.0.0/16",
					"numberOfVms": 1,
					"publicIpIdleTimeout": 30,
					"adminUsername": "ubuntu",
					"adminPassword": "123123",
					"imagePublisher": "Canonical",
					"imageOffer": "UbuntuServer",
					"imageVersion": "latest",
					"region": "centralus",
					"group": "tester",
					"ports": [
						{
							"portName": "ssh",
							"protocol": "tcp",
							"target": 22,
							"published": 22,
							"isPublished": false,
							"healthCheckRequestPath": "/",
							"healthCheckRequestProtocol": "Http"
						}
					],
					"newVolumes": [],
					"existingVolumes": []
				},
				"env": "DEV"
			};
			deployer.execute = function (opts, command, options, cb) {
				return cb(null, {stateFileData: {}, render: {}});
			};
			vm.updateVM(config, req, req.soajs, deployer, function (error, body) {
				assert.deepEqual(body, {"id": "123", "name": req.soajs.inputmaskData.layerName, "infraId": req.soajs.inputmaskData.infraId});
				done();
			});
		});
	});

	describe("getDeployVMStatus", function () {
		it("success ", function (done) {
			req.soajs.inputmaskData = {
				"infraId": "5b28c5edb53002d7b3b1f0cf",
				"technology": "vm",
				"id": "123",
				"layerName" : "tester-ragheb",
				"env": "dashboard",
			};
			sinon
				.stub(vmModule, 'init')
				.yields(null, {
					listVMs: (config, soajs, deployer, cb) => {
						return cb(null, [
							{
								"name": "tester-vm",
								"layer": "tester-ragheb",
							}
						])
					}
				});
					
			vm.getDeployVMStatus(config, req, req.soajs, deployer, function (error, body) {
				sinon.restore(vmModule);
				assert.ok(body);
				done();
			});
		});
	});
});
