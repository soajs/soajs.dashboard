"use strict";
var assert = require("assert");
var testHelper = require("../../../../helper.js");
var infraTemplates = testHelper.requireModule('./lib/cloud/infra/templates.js');
var config = testHelper.requireModule('./config.js');
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

describe("testing cloud/infra/templates.js", function () {
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
	
	describe("getLocalTemplates", function () {
		var oneInfra = {};
		it("Success getLocalTemplates", function (done) {
			infraTemplates.getLocalTemplates(soajs, config, BL, oneInfra, function (error, body) {
				done();
			});
		});
		
	});

	
});
