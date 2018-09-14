"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");
var helpers = helper.requireModule('./lib/git/helper.js', true);
var config = helper.requireModule('./config.js');

var mongoStub = {
	checkForMongo: function (soajs) {
		return true;
	},
	validateId: function (soajs, cb) {
		return cb(null, soajs.inputmaskData.id);
	},
	findEntry: function (soajs, opts, cb) {
		cb(null, { metadata: {} });
	},
	removeEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	saveEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	countEntries: function (soajs, opts, cb) {
		cb(null, 0);
	},
	switchConnection: function(soajs) {
	}
};

describe("testing helper git.js", function () {
	var soajs = {
		registry: {
			"coreDB": {
				registryLocation: {
				
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
		inputmaskData: {},
		tenant: {}
	};
	var req = {
		soajs: soajs
	};
	var res = {};

	describe("comparePaths", function () {
		beforeEach(() => {
		});
		var remote = [];
		var local = [];
		it("Success: will remove", function (done) {
			remote = ['/sample1', '/sample2', '/sample3', '/sample4'];
			local = [
				{
					contentType: 'service',
					contentName: 'sampleFake1',
					path: '/sampleFake1/config.js',
					sha: '95b14565e3fdd0048e351493056025a7020ea561'
				},
				{
					contentType: 'daemon',
					contentName: 'sampleFake2',
					path: '/sampleFake2/config.js',
					sha: '15b14565e3fdd0048e351493056025a7020ea561'
				}
			];
			soajs.inputmaskData = {
				id: '592d8b62448c393e25964d0b',
				provider: 'github',
				owner: 'soajsTestAccount',
				repo: 'test.successMulti'
			};
			helpers.comparePaths(req, config, remote, local, function (error, body) {
				done();
			});
		});

		it("Success: will sync", function (done) {
			remote = ['/sample1', '/sample2', '/sample3', '/sample4'];
			local = [
				{
					contentType: 'service',
					contentName: 'samplesuccess1',
					path: '/sample1/config.js',
					sha: '6cbeae3ed88e9e3296e05fd52a48533ba53c0931'
				},
				{
					contentType: 'service',
					contentName: 'samplesuccess2',
					path: '/sample2/config.js',
					sha: '6cbeae3ed88e9e3296e05fd52a48533ba53c0931'
				},
				{
					contentType: 'daemon',
					contentName: 'sampledaemonsuccess1',
					path: '/sample3/config.js',
					sha: '6cbeae3ed88e9e3296e05fd52a48533ba53c0931'
				}
			];
			soajs.inputmaskData = {
				id: '592d8befa60dc176250235a8',
				provider: 'github',
				owner: 'soajsTestAccount',
				repo: 'test.successMulti'
			};
			helpers.comparePaths(req, config, remote, local, function (error, body) {
				done();
			});
		});

	});

	describe("testing removePath", function() {

		it("success - type service", function(done) {
			var path = { contentName: 'testSrv', contentType: 'service' };
			helpers.removePath(mongoStub, req.soajs, path, function(error, result) {
				assert.ok(result);
				done();
			});
		});

		it("success - type daemon", function(done) {
			var path = { contentName: 'testSrv', contentType: 'daemon' };
			helpers.removePath(mongoStub, req.soajs, path, function(error, result) {
				assert.ok(result);
				done();
			});
		});

	});

	describe("extractAPIsList", function () {
		beforeEach(() => {

		});

		it("Success new style", function (done) {
			var schema = {
				commonFields: {},
				get: {
					'/one': {
						_apiInfo: {
							l: 'label',
							group: 'group',
							groupMain: true
						}
					}
				},
				post: {
					'/one': {
						_apiInfo: {
							l: 'label'
						}
					}
				}
			};
			helpers.extractAPIsList(schema);
			done();
		});

		it("Success old style", function (done) {
			var schema = {
				'/one': {
					_apiInfo: {
						l: 'label',
						group: 'group',
						groupMain: true
					}
				}
			};
			helpers.extractAPIsList(schema);
			done();
		});

	});

	describe("validateFileContents", function () {
		beforeEach(() => {

		});
		it("No type", function (done) {
			var repoConfig = {
				serviceGroup: "test",
				serviceVersion: 1,
				servicePort: 3001,
				requestTimeout: 30,
				main: 'index.js',
				prerequisites: {},
				schema: {}

			};
			helpers.validateFileContents(req, res, repoConfig, function () {
				done();
			});
		});

		it("Success service", function (done) {
			var repoConfig = {
				type: 'service',
				serviceGroup: "test",
				serviceVersion: 1,
				servicePort: 3001,
				requestTimeout: 30,
				requestTimeoutRenewal: 5,
				extKeyRequired: true,
				main: 'index.js',
				prerequisites: {},
				schema: {
					commonFields: {},
					get: {
						'/one': {
							_apiInfo: {
								l: 'label',
								group: 'group',
								groupMain: true
							}
						}
					},
					post: {
						'/one': {
							_apiInfo: {
								l: 'label'
							}
						}
					}
				}

			};
			helpers.validateFileContents(req, res, repoConfig, function () {
				done();
			});
		});

		it("Success daemon", function (done) {
			var repoConfig = {
				type: 'daemon',
				serviceGroup: "test",
				serviceVersion: 1,
				servicePort: 3001,
				requestTimeout: 30,
				requestTimeoutRenewal: 5,
				extKeyRequired: true,
				main: 'index.js',
				prerequisites: {},
				schema: {
					commonFields: {},
					get: {
						'/one': {
							_apiInfo: {
								l: 'label',
								group: 'group',
								groupMain: true
							}
						}
					},
					post: {
						'/one': {
							_apiInfo: {
								l: 'label'
							}
						}
					}
				}

			};
			helpers.validateFileContents(req, res, repoConfig, function () {
				done();
			});
		});

	});

	describe("analyzeConfigSyncFile", function () {
		var path;
		var configSHA = {};
		var flags;
		before(() => {
			soajs.data = {
				repoType: "",
				repoContentTypes: {}
			};
		});
		it("Fail. no type", function (done) {
			var repoConfig = {
				serviceGroup: "test",
				serviceVersion: 1,
				servicePort: 3001,
				requestTimeout: 30,
				main: 'index.js',
				prerequisites: {},
				schema: {}

			};
			helpers.analyzeConfigSyncFile(req, repoConfig, path, configSHA, flags, function () {
				done();
			});
		});

		it("Success service", function (done) {
			var repoConfig = {
				type: 'service',
				serviceGroup: "test",
				serviceVersion: 1,
				servicePort: 3001,
				requestTimeout: 30,
				requestTimeoutRenewal: 5,
				extKeyRequired: true,
				main: 'index.js',
				prerequisites: {},
				schema: {
					commonFields: {},
					get: {
						'/one': {
							_apiInfo: {
								l: 'label',
								group: 'group',
								groupMain: true
							}
						}
					},
					post: {
						'/one': {
							_apiInfo: {
								l: 'label'
							}
						}
					}
				}

			};
			helpers.analyzeConfigSyncFile(req, repoConfig, path, configSHA, flags, function () {
				done();
			});
		});

		it("Success daemon", function (done) {
			var repoConfig = {
				type: 'daemon',
				serviceGroup: "test",
				serviceVersion: 1,
				servicePort: 3001,
				requestTimeout: 30,
				requestTimeoutRenewal: 5,
				extKeyRequired: true,
				main: 'index.js',
				prerequisites: {},
				schema: {
					commonFields: {},
					get: {
						'/one': {
							_apiInfo: {
								l: 'label',
								group: 'group',
								groupMain: true
							}
						}
					},
					post: {
						'/one': {
							_apiInfo: {
								l: 'label'
							}
						}
					}
				}

			};
			helpers.analyzeConfigSyncFile(req, repoConfig, path, configSHA, flags, function () {
				done();
			});
		});

		it("Success Multi", function (done) {
			var repoConfig = {
				type: 'multi',
				folders: []

			};
			helpers.analyzeConfigSyncFile(req, repoConfig, path, configSHA, flags, function () {
				done();
			});
		});

		it("Fail Multi", function (done) {
			var repoConfig = {
				type: 'multi',
				folders: []
			};
			soajs.data = {
				repoType: "mutli",
				repoContentTypes: {
					urac: 'service'
				}
			};
			helpers.analyzeConfigSyncFile(req, repoConfig, path, configSHA, flags, function () {
				done();
			});
		});
	});

	describe("buildDeployerOptions", function () {
		beforeEach(() => {

		});
		var envRecord = {
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
					ports: {
						maintenanceInc: 5
					}
				}
			}
		};
		it("Success", function (done) {
			var options = helpers.buildDeployerOptions(envRecord, soajs, mongoStub);
			assert.ok(options);
			assert.ok(options.strategy);
			assert.ok(options.deployerConfig);
			done();
		});

	});

	describe("getServiceInfo", function () {
		var path;
		var flags;
		var provider = 'github';
		beforeEach(() => {

		});
		it("No type", function (done) {
			var repoConfig = {
				serviceGroup: "test",
				serviceVersion: 1,
				servicePort: 3001,
				requestTimeout: 30,
				main: 'index.js',
				prerequisites: {},
				schema: {}
			};
			helpers.getServiceInfo(req, repoConfig, path, flags, provider);
			done();
		});

		it("Success service", function (done) {
			var repoConfig = {
				type: 'service',
				serviceGroup: "test",
				serviceVersion: 1,
				servicePort: 3001,
				requestTimeout: 30,
				requestTimeoutRenewal: 5,
				extKeyRequired: true,
				main: 'index.js',
				prerequisites: {},
				schema: {
					commonFields: {},
					get: {
						'/one': {
							_apiInfo: {
								l: 'label',
								group: 'group',
								groupMain: true
							}
						}
					},
					post: {
						'/one': {
							_apiInfo: {
								l: 'label'
							}
						}
					}
				}

			};
			helpers.getServiceInfo(req, repoConfig, path, flags, provider);
			done();
		});

		it("Success daemon", function (done) {
			var repoConfig = {
				type: 'daemon',
				serviceGroup: "test",
				serviceVersion: 1,
				servicePort: 3001,
				requestTimeout: 30,
				requestTimeoutRenewal: 5,
				extKeyRequired: true,
				main: 'index.js',
				prerequisites: {},
				schema: {
					commonFields: {},
					get: {
						'/one': {
							_apiInfo: {
								l: 'label',
								group: 'group',
								groupMain: true
							}
						}
					},
					post: {
						'/one': {
							_apiInfo: {
								l: 'label'
							}
						}
					}
				}

			};
			helpers.getServiceInfo(req, repoConfig, path, flags, provider);
			done();
		});

	});

	describe("checkCanAdd", function () {
		var type;
		var info = {
			name: 'name'
		};
		before(() => {
			mongoStub.countEntries = function (soajs, opts, cb) {
				cb(null, 1);
			}
		});
		// model, soajs, type, info, flags, cb
		it("No type", function (done) {
			type = 'none';
			helpers.checkCanAdd(mongoStub, soajs, type, info, function () {
				done();
			});
		});

		it("Success service", function (done) {
			type = 'service';
			helpers.checkCanAdd(mongoStub, soajs, type, info, function () {
				done();
			});
		});

		it("Success daemon", function (done) {
			type = 'daemon';
			helpers.checkCanAdd(mongoStub, soajs, type, info, function () {
				done();
			});
		});

	});

	describe("checkCanSync", function () {
		var type;
		var info = {
			name: 'name'
		};
		var flags;
		before(() => {
			mongoStub.countEntries = function (soajs, opts, cb) {
				cb(null, 1);
			}
		});
		// model, soajs, type, info, flags, cb
		it("Fail. no type", function (done) {
			helpers.checkCanSync(mongoStub, soajs, type, info, flags, function () {
				done();
			});
		});

		it("Success service", function (done) {
			type = 'service';
			helpers.checkCanSync(mongoStub, soajs, type, info, flags, function () {
				done();
			});
		});

		it("Success daemon", function (done) {
			type = 'daemon';
			helpers.checkCanSync(mongoStub, soajs, type, info, flags, function () {
				done();
			});
		});

	});

	describe("extractDaemonJobs", function () {
		it("Success", function (done) {
			var schema = {
				"testJob": {
					"l": "test Job"
				}
			};
			helpers.extractDaemonJobs(schema);
			done();
		});

	});

	describe("cleanConfigDir", function () {
		var options = {
			repoConfigsFolder: 'path.js'
		};
		it("Success", function (done) {
			helpers.cleanConfigDir(req, options, function () {
				done();
			});
		});

	});

	describe("testing checkifRepoIsDeployed", function() {
		var config = {};
		var BL = {}, cloudBL = {}, deployer = {};

		before("init", function(done) {
			req.soajs.inputmaskData.repo = 'testRepo';

			BL = { model: mongoStub };

			BL.model.findEntries = function (soajs, opts, cb) {
				var entries = [
					{
						code: 'DEV'
					}
				];

				return cb(null, entries);
			};

			deployer = {
				listServices: function (options, cb) {
					var services = [
						{
							labels: {
								'service.repo': 'testRepo'
							}
						}
					];

					return cb(null, services);
				}
			};


			cloudBL = {
				listServices: function (config, soajs, deployer, cb) {
					deployer.listServices({}, function (error, services) {
						return cb(null, services);
					});
				}
			};

			done();
		});

		it("success - will get one deployed service", function(done) {
			function mainCb() {
				done();
			}
			helpers.checkifRepoIsDeployed(req, config, BL, cloudBL, deployer, mainCb, function () {
				//main cb will be called since an error will occur
			});
		});

		it("success - will not find any deployed services", function(done) {
			function mainCb() {}
			deployer.listServices = function (options, cb) {
				var services = [
					{
						labels: {
							'service.repo': 'invalidTestRepo'
						}
					}
				];

				return cb(null, services);
			};

			helpers.checkifRepoIsDeployed(req, config, BL, cloudBL, deployer, mainCb, function () {
				done();
			});
		});

	});

});
