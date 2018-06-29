"use strict";
var assert = require("assert");
var testHelper = require("../../../../helper.js");
var module = testHelper.requireModule('./lib/cloud/infra/index.js');
var vm;
var config = testHelper.requireModule('./config.js');
var deployer = testHelper.deployer;

const nock = require("nock");
const sinon = require('sinon');

var mongoStub = {
	getDb: function () {
	},
	checkForMongo: function (soajs) {
		return true;
	},
	insertEntry: function (soajs, options, cb) {
		cb(null, {});
	},
	validateId: function (soajs, cb) {
		return cb(null, soajs.inputmaskData.id);
	},
	validateCustomId: function (soajs, id, cb) {
		return cb(null, id);
	},
	findEntry: function (soajs, opts, cb) {
		cb(null, {});
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
	}
};
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
	"_id": '5b2ccf5488e807af1f000001',
	"name": "dynamic-template-loadBalancer",
	"template": "provider azurerm"
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

describe("testing lib/cloud/infra/index.js", function () {
	var BL = {
		model: mongoStub
	};

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

	describe.skip("deployVM", function () {
		it("success ", function (done) {
			req.soajs.inputmaskData = {
				"infraId": "5b28c5edb53002d7b3b1f0cf",
				"infraCodeTemplate": "dynamic-template-loadBalancer",
				"region": "eastus",
				"layerName" : "tester-ragheb",
				"env": "dashboard",
				"specs": {
					"region": "eastus",
					"clientId": "cca65dcd-3aa3-44d3-81cb-6b57b764be6a",
					"secret": "QY7TMLyoA6Jjzidtduqbn/4Y2mDlyJUbKZ40c6dBTYw=",
					"domain": "608c3255-376b-47a4-8e8e-9291e506d03e",
					"subscriptionId": "d159e994-8b44-42f7-b100-78c4508c34a6",
					"resourceGroupName": "dynamic-template-ragheb",
					"name": "tester",
					"numberOfVms": 2,
					"vmSize": "Standard_A1",
					"createNewVirtualNetwork": true,
					"virtualNetworkAddressSpaces": "10.0.0.0/16,10.1.0.0/16",
					"subnetAddressPrefix": "10.0.1.0/24",
					"createNewSecurityGroup": true,
					"privateIpAlregionMethod": "dynamic",
					"attachPublicIpAddress": true,
					"createNewPublicIpAddress": true,
					"publicIpAlregionMethod": "dynamic",
					"publicIpIdleTimeout": "30",
					"ports": [
						{
							"name": "ssh",
							"protocol": "tcp",
							"target": 22,
							"published": 22,
							"isPublished": false
						},
						{
							"name": "http",
							"target": 80,
							"published": 80,
							"isPublished": true,
							"healthCheckRequestPath": "/",
							"healthCheckRequestProtocol": "Http"
						},
						{
							"name": "https",
							"target": 443,
							"published": 443,
							"isPublished": true,
							"healthCheckRequestPath": "/",
							"healthCheckRequestProtocol": "Http"
						}
					],
					"deleteOsDiskOnTermination": true,
					"deleteDataDisksOnTermination": true,
					"osDiskCachingMode": "ReadWrite",
					"osDiskType": "Standard_LRS",
					"volumes": [
						{
							"name": "volume_one",
							"createNew": true,
							"diskSizeGb": "5",
							"type": "Standard_LRS"
						},
						{
							"name": "existing_volume",
							"createNew": false,
							"existingDisksNames": [
								"existing-disk-1",
								"existing-disk-2"
							]
						}
					],
					"adminUsername": "ubuntu",
					"adminPassword": "Password1234!",
					"useSshKeyAuth": false,
					"imagePublisher": "Canonical",
					"imageOffer": "UbuntuServer",
					"imageSku": "16.04-LTS",
					"imageVersion": "latest",
					"tags": {
						"soajs.test": "true",
						"soajs.template.type": "terraform",
						"soajs.template.version": "1"
					}
				}
			};
			deployer.execute = function (opts, command, options, cb) {
				return cb(null, {stateFile: {}});
			};
			vm.deployVM(config, req, req.soajs, deployer, function (error, body) {
				assert.deepEqual(body, {"name": req.soajs.inputmaskData.layerName, "infraId": req.soajs.inputmaskData.infraId})
				done();
			});
		});
	});

	describe.skip("updateVM1", function () {
		it("success ", function (done) {
			req.soajs.inputmaskData = {
				"infraId": "5b28c5edb53002d7b3b1f0cf",
				"infraCodeTemplate": "dynamic-template-loadBalancer",
				"region": "eastus",
				"layerName" : "tester-ragheb",
				"env": "dashboard",
				"specs": {
					"region": "eastus",
					"clientId": "cca65dcd-3aa3-44d3-81cb-6b57b764be6a",
					"secret": "QY7TMLyoA6Jjzidtduqbn/4Y2mDlyJUbKZ40c6dBTYw=",
					"domain": "608c3255-376b-47a4-8e8e-9291e506d03e",
					"subscriptionId": "d159e994-8b44-42f7-b100-78c4508c34a6",
					"resourceGroupName": "dynamic-template-ragheb",
					"name": "tester",
					"numberOfVms": 2,
					"vmSize": "Standard_A1",
					"createNewVirtualNetwork": true,
					"virtualNetworkAddressSpaces": "10.0.0.0/16,10.1.0.0/16",
					"subnetAddressPrefix": "10.0.1.0/24",
					"createNewSecurityGroup": true,
					"privateIpAlregionMethod": "dynamic",
					"attachPublicIpAddress": true,
					"createNewPublicIpAddress": true,
					"publicIpAlregionMethod": "dynamic",
					"publicIpIdleTimeout": "30",
					"ports": [
						{
							"name": "ssh",
							"protocol": "tcp",
							"target": 22,
							"published": 22,
							"isPublished": false
						},
						{
							"name": "http",
							"target": 80,
							"published": 80,
							"isPublished": true,
							"healthCheckRequestPath": "/",
							"healthCheckRequestProtocol": "Http"
						},
						{
							"name": "https",
							"target": 443,
							"published": 443,
							"isPublished": true,
							"healthCheckRequestPath": "/",
							"healthCheckRequestProtocol": "Http"
						}
					],
					"deleteOsDiskOnTermination": true,
					"deleteDataDisksOnTermination": true,
					"osDiskCachingMode": "ReadWrite",
					"osDiskType": "Standard_LRS",
					"volumes": [
						{
							"name": "volume_one",
							"createNew": true,
							"diskSizeGb": "5",
							"type": "Standard_LRS"
						},
						{
							"name": "existing_volume",
							"createNew": false,
							"existingDisksNames": [
								"existing-disk-1",
								"existing-disk-2"
							]
						}
					],
					"adminUsername": "ubuntu",
					"adminPassword": "Password1234!",
					"useSshKeyAuth": false,
					"imagePublisher": "Canonical",
					"imageOffer": "UbuntuServer",
					"imageSku": "16.04-LTS",
					"imageVersion": "latest",
					"tags": {
						"soajs.test": "true",
						"soajs.template.type": "terraform",
						"soajs.template.version": "1"
					}
				}
			};
			deployer.execute = function (opts, command, options, cb) {
				return cb(null, {stateFile: {}});
			};
			vm.updateVM(config, req, req.soajs, deployer, function (error, body) {
				assert.deepEqual(body, {"name": req.soajs.inputmaskData.layerName, "infraId": req.soajs.inputmaskData.infraId})
				done();
			});
		});
	});

	describe.skip("updateVM2", function () {
		it("success ", function (done) {
			req.soajs.inputmaskData = {
				"infraId": "5b28c5edb53002d7b3b1f0cf",
				"technology": "vm",
				"layerName" : "tester-ragheb",
				"env": "dashboard",
			};
			deployer.execute = function (opts, command, options, cb) {
				return cb(null, {stateFile: {}});
			};
			vm.destroyVM(config, req, req.soajs, deployer, function (error, body) {
				assert.ok(body)
				done();
			});
		});
	});

	describe.skip("getDeployVMStatus", function () {
		it("success ", function (done) {
			req.soajs.inputmaskData = {
				"infraId": "5b28c5edb53002d7b3b1f0cf",
				"technology": "vm",
				"layerName" : "tester-ragheb",
				"env": "dashboard",
			};
			vm.getDeployVMStatus(config, req, req.soajs, deployer, function (error, body) {
				assert.ok(body);
				done();
			});
		});
	});
});
