"use strict";
var assert = require("assert");
var testHelper = require("../../../../helper.js");
var module = testHelper.requireModule('./lib/cloud/infra/index.js');
var templates = testHelper.requireModule('./lib/cloud/infra/templates.js');
var clusters = testHelper.requireModule('./lib/cloud/infra/cluster.js');
var helper = testHelper.requireModule('./lib/cloud/infra/helper.js');

var infra;
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
		cb(null, {
			name: "local",
			deployments: [{
				environments: "dev"
			}]
		});
	},
	updateEntry: function (soajs, opts, cb) {
		cb(null, {});
	},
	findEntries: function (soajs, opts, cb) {
		var data = [{
			name: 'one',
			label: "docker",
			api: {},
			deployer: {
				manual: {
					nodes: ""
				},
				container: {
					docker: {
						local: {
							socketPath: "/var/run/docker.sock"
						},
						remote: {
							apiPort: 443,
							nodes: "192.168.61.51",
							apiProtocol: "https",
							auth: {
								token: "4fecc4c5bb31054ba4f2c7feeba5bd79f3d210e1abc216e0958c239ddb5050c99ccd94da522cb98d30bcaed851a6116cbf3a7115b8f83532b5ce06412ba4d6ac47cd7f403217286cac90ec8995f21773b1332421c8d2d8e1d4c6b5a8d8ebdf109f230a24bb84a1659d6da7ac8bdd9278731072896439c93a69a277290043aede8b205e81d79c27a63b109616a2cf781f080f79c463dcb649f3760477f80279251e954d00e7cb42ec899ad4741c41452369315a87c9f8af264bf991850dd4875e154fd6c89bf481763bbfe941b6eddb0433e7b8ccce358961fb041c900d006a3341369cf6c0e930016054a2656a62907580dad85b5ed2d99eb0e81a03d8503f75076b44d047342964fa1fc8cfa49725739a8d44706dcead75e835c9e28d13aa768dd60a29d3a6f6d00d158af20a1af2c5fe6d8ec7b4b2ffa9caa59ede2c0dd881b85824abcd9bca7a80e64a17b9b4710f0134cd1806c0bf6efa1b3bf0999f629d9c4a6394b20654119d79c5ee876e9fa31b72bfc41ad91f7ad88f202da95a7d10578c8c71ae833283f61008468bc137eb44566801036cbae5b7788398bae017139711f5c61d5500aedd118b6ddb3cc7704464c548295e0c8c255288c291e11a5291bcaf26f7a8273ac2afc2a5499e27f35dc3751b49e95b1976572a47dd5e0c22a55002da3d9310ec3168960da9a7e5d2f8e8522b62bcd022b6e6087ead728abe"
							}
						}
					},
					kubernetes: {
						local: {
							nodes: "",
							namespace: {
								default: "soajs",
								perService: false
							},
							auth: {
								token: ""
							}
						},
						remote: {
							nodes: "",
							namespace: {
								default: "soajs",
								perService: false
							},
							auth: {
								token: ""
							}
						}
					}
				},
				type: "container",
				selected: "container.docker.remote"
			}
		}];
		cb(null, data);
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
		sinon.restore(clusters);
		done();
	});

	describe("testing init", function () {
		
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
				infra = body;
				infra.model = mongoStub;
				done();
			});
		});
		
	});
	
	describe("list", function () {
		it("Success list", function (done) {
			infra.list(config, req.soajs, deployer, function (error, body) {
				done();
			});
		});

		it("Success list - 2", function (done) {
			req.soajs.inputmaskData = {
				technology: 'docker',
				envCode: 'dev'
			};
			infra.list(config, req.soajs, deployer, function (error, body) {
				req.soajs.inputmaskData = {};
				done();
			});
		});
		
	});

	describe("get", function () {
		it("Success list", function (done) {
			infra.get(config, req.soajs, deployer, function (error, body) {
				done();
			});
		});
	});

	describe("activate", function () {

		it("Success activate", function (done) {
			req.soajs.inputmaskData.name = 'docker';
			req.soajs.inputmaskData.label = 'kube';
			req.soajs.inputmaskData.api = {"data": true};
			infra.activate(config, req.soajs, deployer, function (error, body) {
				assert.ifError(error)
				assert.ok(body)
				done();
			});
		});
		
		it("failure Another Provider with the same name exists!", function (done) {
			req.soajs.inputmaskData.name = 'notdocker';
			req.soajs.inputmaskData.label = 'docker';
			req.soajs.inputmaskData.api = {"data": true};
			infra.activate(config, req.soajs, deployer, function (error, body) {
				assert.ok(error);
				done();
			});
		});
		
		it("failure Another Provider with the same configuration exists!", function (done) {
			req.soajs.inputmaskData.name = 'docker';
			req.soajs.inputmaskData.label = 'kube';
			req.soajs.inputmaskData.api = {};
			infra.activate(config, req.soajs, deployer, function (error, body) {
				assert.ok(error);
				done();
			});
		});

	});

	describe("modify", function () {

		it("Success modify", function (done) {
			infra.modify(config, req.soajs, deployer, function (error, body) {
				assert.ifError(error);
				assert.ok(body);
				done();
			});
		});

	});

	describe("deactivate", function () {

		it("Success deactivate", function (done) {
			mongoStub.findEntry = function (soajs, opts, cb) {
				var data = {
					deployments: []
				};
				cb(null, data);
			};
			infra.deactivate(config, req.soajs, deployer, function (error, body) {
				done();
			});
		});

	});

	describe("removeDeployment", function () {

		it("Success removeDeployment", function (done) {
			req.soajs.inputmaskData = {
				id: 'id',
				deploymentId: '1'
			};
			mongoStub.findEntry = function (soajs, opts, cb) {
				var data = {
					deployments: [{
						id: '1',
						name: '1'
					}]
				};
				cb(null, data);
			};
			infra.removeDeployment(config, req, req.soajs, deployer, function (error, body) {
				done();
			});
		});

	});

	describe("deployCluster", function () {

		it("Success deployCluster", function (done) {
			sinon
				.stub(clusters, 'deployCluster')
				.yields(null, {});

			infra.deployCluster(config, req, req.soajs, deployer, function (error, body) {
				done();
			});
		});

	});

	describe("getDeployClusterStatus", function () {

		it("Success getDeployClusterStatus", function (done) {
			sinon
				.stub(clusters, 'getDeployClusterStatus')
				.yields(null, {});

			infra.getDeployClusterStatus(config, req, req.soajs, deployer, function (error, body) {
				done();
			});
		});

	});

	describe("getDNSInfo", function () {

		it("Success getDNSInfo", function (done) {
			sinon
				.stub(clusters, 'getDNSInfo')
				.yields(null, {});

			infra.getDNSInfo(config, req, req.soajs, deployer, function (error, body) {
				done();
			});
		});

	});

	describe("scaleCluster", function () {

		it("Success scaleCluster", function (done) {
			sinon
				.stub(clusters, 'scaleCluster')
				.yields(null, {});

			infra.scaleCluster(config, req.soajs, deployer, function (error, body) {
				done();
			});
		});

	});

	describe("getCluster", function () {

		it("Success getCluster", function (done) {
			sinon
				.stub(clusters, 'getCluster')
				.yields(null, {});

			infra.getCluster(config, req.soajs, deployer, function (error, body) {
				done();
			});
		});

	});

	describe("updateCluster", function () {

		it("Success updateCluster", function (done) {
			sinon
				.stub(clusters, 'updateCluster')
				.yields(null, {});

			infra.updateCluster(config, req.soajs, deployer, function (error, body) {
				done();
			});
		});

	});

	describe("removeEnvFromDeployment", function () {

		it("Success removeEnvFromDeployment", function (done) {
			sinon
				.stub(clusters, 'removeEnvFromDeployment')
				.yields(null, {});

			infra.removeEnvFromDeployment(config, req, req.soajs, deployer, function (error, body) {
				done();
			});
		});

	});

	describe("removeTemplate", function () {

		it("Success removeTemplate", function (done) {
			infra.removeTemplate(config, req.soajs, deployer, function (error, body) {
				done();
			});
		});

	});

	describe("addTemplate", function () {

		it("Error addTemplate", function (done) {
			infra.model.findEntry = function (soajs, opts, cb) {
				var InfraRecord = {
					templates: []
				};
				cb(null, InfraRecord);
			};

			infra.addTemplate(config, req.soajs, function (error, body) {
				done();
			});
		});

		it("Success addTemplate", function (done) {
			soajs.inputmaskData.template = {};
			infra.model.findEntry = function (soajs, opts, cb) {
				var InfraRecord = {
					_id: '123',
					templates: ['local']
				};
				cb(null, InfraRecord);
			};
			
			infra.model.countEntries = function (soajs, opts, cb) {
				cb(null, 1);
			};

			infra.addTemplate(config, req.soajs, function (error, body) {
				done();
			});
		});

		it("Success addTemplate -2 ", function (done) {
			soajs.inputmaskData.template = {
				inputs: ['1'],
				display: '1',
				tags: [],
				driver: 'aws'
			};
			infra.model.findEntry = function (soajs, opts, cb) {
				var InfraRecord = {
					_id: '123',
					templates: ['local']
				};
				cb(null, InfraRecord);
			};
			
			infra.model.countEntries = function (soajs, opts, cb) {
				cb(null, 1);
			};

			infra.addTemplate(config, req.soajs, function (error, body) {
				done();
			});
		})
	});

	describe("updateTemplate", function () {

		it("Success updateTemplate", function (done) {
			infra.model.findEntry = function (soajs, opts, cb) {
				var templateRecord = {
					location: 'local'
				};
				cb(null, templateRecord);
			};
			infra.updateTemplate(config, req.soajs, function (error, body) {
				done();
			});
		});

	});

	describe("uploadTemplate", function () {

		it("Error uploadTemplate", function (done) {

			infra.model.findEntry = function (soajs, opts, cb) {
				var InfraRecord = {
					_id: '123',
					templates: ['external']
				};
				cb(null, InfraRecord);
			};
			infra.uploadTemplate(config, req, soajs, deployer, function (error, body) {
				done();
			});
		});

	});

	describe("uploadTemplateInputsFile", function () {

		it("Success uploadTemplateInputsFile", function (done) {
			infra.model.findEntry = function (soajs, opts, cb) {
				var InfraRecord = {
					_id: '123',
					templates: ['external']
				};
				cb(null, InfraRecord);
			};

			infra.uploadTemplateInputsFile(config, req, soajs, deployer, function (error, body) {
				done();
			});
		});

	});

	describe("downloadTemplate", function () {

		it("Success downloadTemplate", function (done) {
			var res = {};
			infra.downloadTemplate(config, req.soajs, deployer, res, function (error, body) {
				done();
			});
		});

	});
	
	describe("onboardVM", function () {
		
		it("Success onboardVM", function (done) {
			req.soajs.inputmaskData.env = "dev";
			infra.onboardVM(config, req, req.soajs, deployer, function (error, body) {
				done();
			});
		});
	});
});
