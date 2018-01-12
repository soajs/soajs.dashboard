"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");
var utils = helper.requireModule('./lib/environment/status.js');
var statusUtils = helper.requireModule("./lib/environment/statusUtils");
var statusRollback = helper.requireModule("./lib/environment/statusRollback");
var sinon = require('sinon');

//mock statusUtils
sinon
	.stub(statusUtils, 'getAPIInfo')
    .withArgs(sinon.match.string).returns('http://test.local');
sinon
	.stub(statusUtils, 'uploadCertificates')
	.yields(null, true);
sinon
	.stub(statusUtils, 'redirectTo3rdPartyDeploy')
	.yields(null, true);
sinon
	.stub(statusUtils, 'handleClusters')
	.yields(null, true);
sinon
	.stub(statusUtils, 'deployController')
	.yields(null, true);
sinon
	.stub(statusUtils, 'deployUrac')
	.yields(null, true);
sinon
	.stub(statusUtils, 'deployOauth')
	.yields(null);
sinon
	.stub(statusUtils, 'deployNginx')
	.yields(null, true);
sinon
	.stub(statusUtils, 'createNginxRecipe')
	.yields(null, true);
sinon
	.stub(statusUtils, 'createUserAndGroup')
	.yields(null, true);

//mock statusRollback
sinon
	.stub(statusRollback, 'redirectTo3rdParty')
	.yields(null, true);
sinon
	.stub(statusRollback, 'removeProduct')
	.yields(null, true);
sinon
	.stub(statusRollback, 'removeCluster')
	.yields(null, true);
sinon
	.stub(statusRollback, 'removeController')
	.yields(null, true);
sinon
	.stub(statusRollback, 'removeUrac')
	.yields(null, true);
sinon
	.stub(statusRollback, 'removeOauth')
	.yields(null, true);
sinon
	.stub(statusRollback, 'removeNginx')
	.yields(null, true);
sinon
	.stub(statusRollback, 'removeCatalog')
	.yields(null, true);
sinon
	.stub(statusRollback, 'removeCertificates')
	.yields(null, true);

var req = {
	soajs: {
		registry: {
			coreDB: {
				provision: {
					name: 'core_provision',
					prefix: '',
					servers: [
						{host: '127.0.0.1', port: 27017}
					],
					credentials: null,
					streaming: {
						batchSize: 10000,
						colName: {
							batchSize: 10000
						}
					},
					URLParam: {
						maxPoolSize: 2, bufferMaxEntries: 0
					},
					registryLocation: {
						l1: 'coreDB',
						l2: 'provision',
						env: 'dev'
					},
					timeConnected: 1491861560912
				}
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
var mongoStub = {
	findEntry: function (soajs, opts, cb) {
		cb(null, {
			"productize": {},
			"cluster": {},
			"controller": {},
			"urac": {},
			"oauth": {},
			"nginx": {},
			"user": {}
		});
	},
	updateEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	saveEntry: function (soajs, opts, cb) {
		cb(null, true);
	}
};
var BL = {
	model: mongoStub
};
var config = {};
var template = {
	"gi": {"code": "DASHBOARD", "description": "DASHBOARD ENV", "deploy": true},
	"deploy": {"certificates": [], "deployment": {"docker": {"dockerremote": true}}, "selectedDriver": "docker"},
	"code": "DASHBOARD",
	"ready": false,
	"type": "BLANK",
	"error": null,
	"productize": {
		"wf": {
			"rollback": 1
		}
	},
	"cluster": {
		"wf": {
			"rollback": 1
		}
	},
	"controller": {
		"wf": {
			"status": true,
			"rollback": 1
		}
	},
	"urac": {
		"position": 2,
		"wf": {
			"rollback": 1
		}
	},
	"oauth": {
		"wf": {
			"rollback": 1
		}
	},
	"nginx": {
		"_id":"5a58d942ace01a5325fa3e50",
		"exception": true,
		"catalog": {},
		"wf": {
			"rollback": 1
		}
	},
	"user": {
		"wf": {
			"rollback": 1
		}
	}
};
var environmentRecord = {
	_id: '5a58d942ace01a5325fa3e4c',
	code: 'DASHBORAD',
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
	dbs: {
		clusters: {
			oneCluster: {
				servers: {}
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
var context = {
	BL: BL,
	template: template,
	schemaOptions: ['productize','cluster','controller','urac','oauth','nginx','user'],
	environmentRecord: environmentRecord
};
describe("testing status.js", function () {
	it("Success startDeployment", function (done) {
		utils.startDeployment(req,BL,config, environmentRecord,template,  function (err, body) {
			assert.ok(body);
			done();
		})
	});
	
	it("Success checkProgress", function (done) {
		utils.checkProgress(req,BL,config, environmentRecord,template,  function (err, body) {
			assert.ok(body);
			done();
		})
	});
	
	it("Success rollbackDeployment", function (done) {
		req.soajs.inputmaskData.rollback = 1;
		utils.rollbackDeployment(req, context, function (err, body) {
			assert.ok(body);
			done();
		})
	});
});