"use strict";
var assert = require("assert");
var helper = require("../../helper.js");
var utils = helper.requireModule('./lib/host.js');
var mongo = helper.requireModule('./models/mongo.js');
const sinon = require('sinon');
var host;
var config;
var myDeployer = {};
var deployer = require("soajs").drivers;

describe("testing host.js", function () {
	var soajs = {
		registry: {
			name: 'dev',
			environment: 'dev',
			coreDB: {},
			serviceConfig: {
				awareness: {},
				ports: { controller: 4000, maintenanceInc: 1000, randomInc: 100 }
			},
			ports: {},
			deployer: {
				type: 'manual',
				selected: 'container.docker.local',
				container: { docker: {}, kubernetes: {} }
			},
			services: {}
		},
		log: {
			debug: function (data) {
				// console.log(data);
			},
			error: function (data) {
				// console.log(data);
			},
			info: function (data) {
				// console.log(data);
			}
		},
		inputmaskData: {},
		tenant: {
			application: {
				acl_all_env: {
					dashboard: {
						access: false,
						proxy: {}
					}
				},
				acl: {
					urac: {
						access: false
					}
				}
			}
		}
	};
	let stubMongo = {
		checkForMongo: function (soajs) {
			return true;
		},
		countEntries: function (soajs, opts, cb) {
			return cb(null, 1);
		},
		validateId: function (soajs, cb) {
			return cb(null, soajs.inputmaskData.id);
		},
		findEntry: function (soajs, opts, cb) {
			cb(null, { metadata: {} });
		},
		findEntries: function (soajs, opts, cb) {
			cb(null, []);
		},
		insertEntry: function (soajs, opts, cb) {
			cb(null, true);
		},
		removeEntry: function (soajs, opts, cb) {
			cb(null, true);
		},
		saveEntry: function (soajs, opts, cb) {
			cb(null, true);
		},
		distinctEntries: function (soajs, opts, cb) {
			cb(null, true);
		}

	};
	myDeployer = {
		listServices: function (data, cb) {
			var arr = [
				{
					labels: {
						'soajs.env.code': 'dev'
					},
					ports: []
				}
			];
			return cb(null, arr);
		}
	};

	describe("init ()", function () {
		
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
		
		it("Init model", function (done) {
			utils.init('mongo', function (error, body) {
				assert.ok(body);
				host = body;
				host.model = stubMongo;
				host.myDeployer = myDeployer;
				done();
			});
		});
	});
	
	describe("listHAhostEnv", function () {
		var envs = [ {
			_id: '',
			code: 'DEV',
			deployer: {
				type: "docker",
				"selected": "container.docker.local",
				"container": {
					"docker": {
						"local": {
							"socketPath": "/var/run/docker.sock"
						},
						"remote": {
							"nodes": []
						}
					},
					"kubernetes": {
						"local": {},
						"remote": {
							"nodes": []
						}
					}
				}
			}
		} ];
		var tenants = [
			{
				_id: '',
				applications: []
			}
		];
		before(() => {
			config = {
				errors: {
					825: ''
				}
			};

		});
		after(() => {
		});

		it("Success listHAhostEnv", function (done) {

			stubMongo.findEntries = function (soajs, opts, cb) {
				if (opts.collection === 'environment') {
					return cb(null, envs);
				}
				return cb(null, tenants);
			};
			
			host.listHAhostEnv(config, soajs, deployer, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
		
	});
	
});