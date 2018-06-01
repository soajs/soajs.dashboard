"use strict";
const sinon = require('sinon');

var assert = require("assert");
var testHelper = require("../../../../helper.js");
var config = testHelper.requireModule('./config.js');

var infraTemplates = testHelper.requireModule('./lib/cloud/infra/templates.js');
var deployer = testHelper.deployer;

var mongoStub = {
	getDb: function () {
	},
	checkForMongo: function (soajs) {
		return true;
	},
	validateId: function (soajs, cb) {
		return cb(null, soajs.inputmaskData.id);
	},
	findEntry: function (soajs, opts, cb) {
		cb(null, {});
	},
	findEntries: function (soajs, opts, cb) {
		var data = [];
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
	// uracDriver: {},
	inputmaskData: {},
	tenant: {}
};
var BL = {
	model: mongoStub
};
var req = {
	soajs: soajs,
	query: {}
};

describe("testing lib/cloud/infra/templates.js", function () {
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

	before(function (done) {
		sinon.restore();
		done();
	});

	describe("getLocalTemplates", function () {
		var oneInfra = {};
		it("Success getLocalTemplates", function (done) {
			infraTemplates.getLocalTemplates(soajs, config, BL, oneInfra, function (error, body) {
				done();
			});
		});

		it("Success getLocalTemplates - 2", function (done) {
			oneInfra._id = '123';
			oneInfra.templatesTypes = ['local'];
			infraTemplates.getLocalTemplates(soajs, config, BL, oneInfra, function (error, body) {
				done();
			});
		});

	});

	describe("getRemoteTemplates", function () {
		var oneInfra = {};
		var options = {};
		it("Error getRemoteTemplates", function (done) {
			infraTemplates.getRemoteTemplates(soajs, config, BL, oneInfra, deployer, options, function (error, body) {
				done();
			});
		});

		it("Success getRemoteTemplates", function (done) {
			oneInfra.templatesTypes = ['external'];
			infraTemplates.getRemoteTemplates(soajs, config, BL, oneInfra, deployer, options, function (error, body) {
				done();
			});
		});

		it("Success getRemoteTemplates - 2", function (done) {
			oneInfra.templatesTypes = ['external'];
			deployer.execute = function (driverOptions, method, methodOptions, cb) {
				var templates = [{
					type: 'inputsAndDisplay'
				}];
				return cb(null, templates);
			};
			infraTemplates.getRemoteTemplates(soajs, config, BL, oneInfra, deployer, options, function (error, body) {
				deployer.execute = function (driverOptions, method, methodOptions, cb) {
					if (method === 'listKubeServices') {
						return cb(null, [{
							metadata: {
								name: 'heapster',
								namespace: 'kube-system'
							}
						}]);
					} else {
						return cb(null, []);
					}
				};
				done();
			});
		});

	});

	describe("removeTemplate", function () {
		it("Success removeTemplate", function (done) {
			infraTemplates.removeTemplate(config, soajs, BL, deployer, function (error, body) {
				done();
			});
		});

	});

	describe("addTemplate", function () {
		it("Success addTemplate", function (done) {
			mongoStub.findEntry = function (soajs, opts, cb) {
				var InfraRecord = {
					templates: []
				};
				cb(null, InfraRecord);
			};
			infraTemplates.addTemplate(config, soajs, BL, function (error, body) {
				done();
			});
		});

	});

	describe("updateTemplate", function () {
		it("Success updateTemplate", function (done) {
			infraTemplates.updateTemplate(config, soajs, BL, function (error, body) {
				done();
			});
		});

	});

	describe("uploadTemplate", function () {
		it("Success uploadTemplate", function (done) {
			mongoStub.findEntry = function (soajs, opts, cb) {
				var InfraRecord = {
					templates: []
				};
				cb(null, InfraRecord);
			};
			infraTemplates.uploadTemplate(config, req, soajs, BL, deployer, function (error, body) {
				done();
			});
		});

	});

	describe("uploadTemplateInputsFile", function () {
		it("Success uploadTemplateInputsFile", function (done) {
			soajs.inputmaskData.inputs = [
				{
					name: '1'
				}
			];
			soajs.inputmaskData.display = [
				{
					name: '1'
				}
			];
			mongoStub.findEntry = function (soajs, opts, cb) {
				var InfraRecord = {
					_id: '123',
					templates: ['external']
				};
				cb(null, InfraRecord);
			};

			infraTemplates.uploadTemplateInputsFile(config, req, soajs, BL, deployer, function (error, body) {
				done();
			});
		});

	});

	describe("downloadTemplate", function () {
		var res = {};
		it("Success downloadTemplate", function (done) {
			infraTemplates.downloadTemplate(config, soajs, BL, deployer, res, function (error, body) {
				done();
			});
		});

	});

});
