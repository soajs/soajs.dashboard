"use strict";
var assert = require("assert");
const nock = require("nock");
const sinon = require('sinon');

var testHelper = require("../../../../helper.js");
var clustersModule = testHelper.requireModule('./lib/cloud/infra/cluster.js');
var helper = testHelper.requireModule('./lib/cloud/infra/helper.js');
var config = testHelper.requireModule('./config.js');

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

var deployer = testHelper.deployer;
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
							errors: [{error: 'msg'}]
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
	soajs: soajs
};

describe("testing cloud/infra/cluster.js", function () {
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
					servers: [{port: 123, host: 'host'}]
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
	
	describe("deployCluster", function () {
		
		let serviceStub;
		
		var InfraRecord = {
			templates: []
		};
		var info = [];
		before(function (done) {
			
			serviceStub = sinon.stub(helper, 'getCommonData', function (config, soajs, BL, cbMain, cb) {
				return cb();
			});
			
			done();
		});
		
		after(function (done) {
			serviceStub.restore();
			done();
		});
		
		it("Success deployCluster", function (done) {
			soajs.inputmaskData.envCode = 'DEV';
			soajs.inputmaskData.previousEnvironment = 'DEV';
			clustersModule.deployCluster(config, req, soajs, BL, deployer, function (error, body) {
				done();
			});
		});
		
		
		it("Success deployCluster with prev", function (done) {
			soajs.inputmaskData.previousEnvironment = 'STG';
			clustersModule.deployCluster(config, req, soajs, BL, deployer, function (error, body) {
				done();
			});
		});
		
	});
	
	
});
