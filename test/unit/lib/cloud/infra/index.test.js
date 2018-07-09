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
	findEntry: function (soajs, opts, cb) {
		cb(null, {});
	},
	updateEntry: function (soajs, opts, cb) {
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
	
	after(function (done) {
		sinon.restore();
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

	describe("activate", function () {

		it("Success activate", function (done) {
			infra.activate(config, req.soajs, deployer, function (error, body) {
				done();
			});
		});

	});

	describe("modify", function () {

		it("Success modify", function (done) {
			infra.modify(config, req.soajs, deployer, function (error, body) {
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
});
