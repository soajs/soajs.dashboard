"use strict";
var assert = require("assert");
var helper = require("../../../../helper.js");
var helpers = helper.requireModule('./lib/cloud/infra/helper.js');
var config = helper.requireModule('./config.js');

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

var deployer = helper.deployer;

describe("testing cloud/infra/helper.js", function () {
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
	
	describe.skip("getCommonData", function () {
		var cbMain = function () {
		};
		it("Success getCommonData", function (done) {
			helpers.getCommonData(config, soajs, BL, cbMain, function (error, body) {
				done();
			});
		});
		
	});
	
	describe("getClusterEnvironments", function () {
		var infra = {};
		var options = {};
		it("Success getClusterEnvironments", function (done) {
			helpers.getClusterEnvironments(infra, options);
			done();
		});
		
	});
	
});
