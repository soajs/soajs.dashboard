"use strict";
const assert = require("assert");
const helper = require("../../../helper.js");
const utils = helper.requireModule('./lib/hosts/index.js');
const controllersModel = helper.requireModule("./models/controllers.js");

//todo: check unused
const mongo = helper.requireModule('./models/mongo.js');
const sinon = require('sinon');

let host;
const config = helper.requireModule('./config.js');
const deployer = helper.deployer;

const helpers = helper.requireModule('./lib/hosts/helper.js');

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
		cb(null, {metadata: {}});
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
	},
	initConnection: function (soajs) {
		return true;
	},
	closeConnection: function (soajs) {
		return true;
	},
	switchConnection: function (soajs) {
	}
};
let envRecord = {
	_id: '',
	code: 'DEV',
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
	services: {
		config: {
			ports: {}
		}
	}
};

describe("testing host.js", function () {
	let soajs = {
		registry: {
			name: 'dev',
			environment: 'dev',
			coreDB: {},
			serviceConfig: {
				awareness: {},
				ports: {controller: 4000, maintenanceInc: 1000, randomInc: 100}
			},
			ports: {},
			deployer: {
				type: 'manual',
				selected: 'container.docker.local',
				container: {docker: {}, kubernetes: {}}
			},
			services: {}
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
	
	deployer.listServices = function (data, cb) {
		let arr = [
			{
				labels: {
					'soajs.env.code': 'dev',
					'soajs.service.name': 'kbprofile'
				},
				ports: [
					{
						published: true
					}
				]
			}
		];
		return cb(null, arr);
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
				done();
			});
		});
	});
	
	describe("list", function () {
		let envs = [{
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
		}];
		let tenants = [
			{
				_id: '',
				applications: []
			}
		];
		before(() => {
			stubMongo.findEntry = function (soajs, opts, cb) {
				if (opts.collection === 'environment') {
					return cb(null, envRecord);
				}
				return cb(null, {});
			};
		});
		after(() => {
		});
		
		it("Success list", function (done) {
			stubMongo.findEntries = function (soajs, opts, cb) {
				if (opts.collection === 'environment') {
					return cb(null, envs);
				}
				return cb(null, tenants);
			};
			soajs.inputmaskData = {
				env: 'dev'
			};
			host.list(config, soajs, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
		
	});
	
	describe("listHostEnv", function () {
		let envs = [{
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
		}];
		let tenants = [
			{
				_id: '',
				applications: [],
				deployments: [
					{
						environments: ['XXX'] // or DEV to test the other path
					}
				]
			}
		];
		before(() => {
		});
		after(() => {
		});
		
		it("Success listHostEnv", function (done) {
			stubMongo.distinctEntries = function (soajs, opts, cb) {
				let hosts = ['dev', 'prod'];
				return cb(null, hosts);
			};
			soajs.inputmaskData = {
				service: 'kbprofile'
			};
			stubMongo.findEntries = function (soajs, opts, cb) {
				if (opts.collection === 'environment') {
					return cb(null, envs);
				}
				return cb(null, tenants);
			};
			host.listHostEnv(config, soajs, deployer, helpers, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
		
	});
	
	describe("awareness", function () {
		let envs = [{
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
		}];
		let tenants = [
			{
				_id: '',
				applications: []
			}
		];
		before(() => {
			stubMongo.findEntry = function (soajs, opts, cb) {
				if (opts.collection === 'environment') {
					return cb(null, envRecord);
				}
				return cb(null, {});
			};
		});
		after(() => {
		});
		
		it("Success maintenanceOperation. controller", function (done) {
			stubMongo.findEntries = function (soajs, opts, cb) {
				if (opts.collection === 'environment') {
					return cb(null, envs);
				}
				return cb(null, tenants);
			};
			soajs.inputmaskData = {
				env: 'dev'
			};
			let model = {
				controllersModel: controllersModel
			};
			host.awareness(config, soajs, model, function (error, body) {
				assert.ok(body);
				done();
			});
		});
	});
	
	describe("start", function () {
		let envRecord = {
			_id: '',
			code: 'DEV',
			deployer: {
				type: "manual",
				"selected": "manual",
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
			},
			services: {
				config: {
					ports: {
						controller: 6000,
						maintenanceInc: 1000
					}
				}
			}
		};
		
		it("Success start", function (done) {
			let counter = 0;
			stubMongo.findEntry = function (soajs, opts, cb) {
				if (opts.collection === 'environment') {
					return cb(null, envRecord);
				} else if (opts.collection === 'hosts') {
					if (counter === 0) {
						counter++;
						return cb(null, null);
					} else {
						let serviceHost = {
							"_id": '5be039a9914c0d532ebfc285',
							"env": "dev",
							"name": "urac",
							"ip": "127.0.0.1",
							"hostname": "mikes-macbook-pro-3.local",
							"version": 2,
							"port": 10001
						};
						return cb(null, serviceHost);
					}
				} else {
					return cb(null, {});
				}
			};
			
			soajs.inputmaskData = {
				env: 'dev',
				serviceName: 'urac',
				serviceVersion: 1
			};
			host.start(config, soajs, function (error, body) {
				assert.ifError(error);
				assert.ok(body);
				done();
			});
		});
		
		it("fail service not starting", function (done) {
			stubMongo.findEntry = function (soajs, opts, cb) {
				if (opts.collection === 'environment') {
					return cb(null, envRecord);
				} else if (opts.collection === 'hosts') {
					return cb(null, null);
				} else {
					return cb(null, {});
				}
			};
			
			soajs.inputmaskData = {
				env: 'dev',
				serviceName: 'urac',
				serviceVersion: 1
			};
			host.start(config, soajs, function (error, body) {
				assert.ifError(error);
				assert.ok(body);
				done();
			});
		});
		
		it("fail, service not found", function (done) {
			
			stubMongo.findEntry = function (soajs, opts, cb) {
				if (opts.collection === 'environment') {
					return cb(null, envRecord);
				} else if (opts.collection === 'hosts') {
					return cb(null, null);
				}
				return cb(null, {});
			};
			
			soajs.inputmaskData = {
				env: 'dev',
				serviceVersion: 1
			};
			host.start(config, soajs, function (error) {
				assert.ok(error);
				assert.deepEqual(error, {code: 524, msg: 'The requested service is not found!'});
				done();
			});
		});
	});
	
	describe("stop", function () {
		let envRecord = {
			_id: '',
			code: 'DEV',
			deployer: {
				type: "manual",
				"selected": "manual",
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
			},
			services: {
				config: {
					ports: {
						controller: 6000,
						maintenanceInc: 1000
					}
				}
			}
		};
		
		it("Success stop", function (done) {
			stubMongo.findEntry = function (soajs, opts, cb) {
				if (opts.collection === 'environment') {
					return cb(null, envRecord);
				} else if (opts.collection === 'hosts') {
					let serviceHost = {
						"_id": '5be039a9914c0d532ebfc285',
						"env": "dev",
						"name": "urac",
						"ip": "127.0.0.1",
						"hostname": "mikes-macbook-pro-3.local",
						"version": 2,
						"port": 10001
					};
					return cb(null, serviceHost);
				} else {
					return cb(null, {});
				}
			};
			
			soajs.inputmaskData = {
				env: 'dev',
				serviceName: 'urac',
				serviceVersion: 1
			};
			host.stop(config, soajs, function (error, body) {
				assert.ifError(error);
				assert.ok(body);
				done();
			});
		});
		
		it("Success stop gateway", function (done) {
			stubMongo.findEntry = function (soajs, opts, cb) {
				if (opts.collection === 'environment') {
					return cb(null, envRecord);
				} else if (opts.collection === 'hosts') {
					let serviceHost = {
						"_id": '5be039a9914c0d532ebfc285',
						"env": "dev",
						"name": "controller",
						"ip": "127.0.0.1",
						"hostname": "mikes-macbook-pro-3.local",
						"version": 2,
						"port": 6000
					};
					return cb(null, serviceHost);
				} else {
					return cb(null, {});
				}
			};
			
			soajs.inputmaskData = {
				env: 'dev',
				serviceName: 'controller',
				serviceVersion: 1
			};
			host.stop(config, soajs, function (error, body) {
				assert.ifError(error);
				assert.ok(body);
				done();
			});
		});
	});
	
	describe("maintenance", function () {
		let envRecord = {
			_id: '',
			code: 'DEV',
			deployer: {
				type: "manual",
				"selected": "manual",
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
			},
			services: {
				config: {
					ports: {
						controller: 6000,
						maintenanceInc: 1000
					}
				}
			}
		};
		
		it("Success urac reload registry", function (done) {
			stubMongo.findEntry = function (soajs, opts, cb) {
				if (opts.collection === 'environment') {
					return cb(null, envRecord);
				} else if (opts.collection === 'hosts') {
					let serviceHost = {
						"_id": '5be039a9914c0d532ebfc285',
						"env": "dev",
						"name": "urac",
						"ip": "127.0.0.1",
						"hostname": "mikes-macbook-pro-3.local",
						"version": 2,
						"port": 10001
					};
					return cb(null, serviceHost);
				} else {
					return cb(null, {});
				}
			};
			
			soajs.inputmaskData = {
				env: 'dev',
				serviceName: 'urac',
				serviceType: 'service',
				'operation': 'reloadRegistry',
				'serviceVersion': '1'
			};
			host.maintenance(config, soajs, function (error, body) {
				assert.ifError(error);
				assert.ok(body);
				done();
			});
		});
		
		it("Success controller awareness", function (done) {
			stubMongo.findEntry = function (soajs, opts, cb) {
				if (opts.collection === 'environment') {
					return cb(null, envRecord);
				} else if (opts.collection === 'hosts') {
					let serviceHost = {
						"_id": '5be039a9914c0d532ebfc285',
						"env": "dev",
						"name": "controller",
						"ip": "127.0.0.1",
						"hostname": "mikes-macbook-pro-3.local",
						"version": 2,
						"port": 6000
					};
					return cb(null, serviceHost);
				} else {
					return cb(null, {});
				}
			};
			
			soajs.inputmaskData = {
				env: 'dev',
				serviceName: 'controller',
				'serviceVersion': '1',
				serviceType: 'service',
				operation: 'awarenessStat'
			};
			host.maintenance(config, soajs, function (error, body) {
				assert.ifError(error);
				assert.ok(body);
				done();
			});
		});
		
		it("Success oauth reload provision", function (done) {
			stubMongo.findEntry = function (soajs, opts, cb) {
				if (opts.collection === 'environment') {
					return cb(null, envRecord);
				} else if (opts.collection === 'hosts') {
					let serviceHost = {
						"_id": '5be039a9914c0d532ebfc285',
						"env": "dev",
						"name": "oauth",
						"ip": "127.0.0.1",
						"hostname": "mikes-macbook-pro-3.local",
						"version": 2,
						"port": 10002
					};
					return cb(null, serviceHost);
				} else {
					return cb(null, {});
				}
			};
			
			soajs.inputmaskData = {
				env: 'dev',
				serviceName: 'oauth',
				serviceType: 'service',
				'operation': 'loadProvision',
				'serviceVersion': '1'
			};
			host.maintenance(config, soajs, function (error, body) {
				assert.ifError(error);
				assert.ok(body);
				done();
			});
		});
		
		it("Success daemon daemonStats", function (done) {
			stubMongo.findEntry = function (soajs, opts, cb) {
				if (opts.collection === 'environment') {
					return cb(null, envRecord);
				} else if (opts.collection === 'hosts') {
					let serviceHost = {
						"_id": '5be039a9914c0d532ebfc285',
						"env": "dev",
						"name": "my_daemon",
						"ip": "127.0.0.1",
						"hostname": "mikes-macbook-pro-3.local",
						"version": 2,
						"port": 10005
					};
					return cb(null, serviceHost);
				} else {
					return cb(null, {});
				}
			};
			
			soajs.inputmaskData = {
				env: 'dev',
				serviceName: 'my_daemon',
				serviceType: 'daemon',
				'operation': 'daemonStats',
				'serviceVersion': '1'
			};
			host.maintenance(config, soajs, function (error, body) {
				assert.ifError(error);
				assert.ok(body);
				done();
			});
		});
		
		it("Fail operation not permitted for service type", function (done) {
			stubMongo.findEntry = function (soajs, opts, cb) {
				if (opts.collection === 'environment') {
					return cb(null, envRecord);
				} else if (opts.collection === 'hosts') {
					let serviceHost = {
						"_id": '5be039a9914c0d532ebfc285',
						"env": "dev",
						"name": "my_service",
						"ip": "127.0.0.1",
						"hostname": "mikes-macbook-pro-3.local",
						"version": 2,
						"port": 10005
					};
					return cb(null, serviceHost);
				} else {
					return cb(null, {});
				}
			};
			
			soajs.inputmaskData = {
				env: 'dev',
				serviceName: 'my_service',
				serviceType: 'service',
				'operation': 'daemonStats',
				'serviceVersion': '1'
			};
			host.maintenance(config, soajs, function (error, body) {
				done();
			});
		});
	});
});