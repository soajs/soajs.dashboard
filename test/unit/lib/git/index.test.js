"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");
var utils = helper.requireModule('./lib/git/index.js');
var helpers = helper.requireModule('./lib/git/helper.js');

var lib;
var config = helper.requireModule('./config.js');

var deployer = {};

var mongoStub = {
	checkForMongo: function (soajs) {
		return true;
	},
	validateId: function (soajs, cb) {
		return cb(null, soajs.inputmaskData.id);
	},
	findEntries: function (soajs, opts, cb) {
		cb(null, []);
	},
	findEntry: function (soajs, opts, cb) {
		if (opts.conditions) {
			if (opts.conditions.name === 'sample__Single') {
				return cb(null, null);
			}
		}
		cb(null, {});
	},
	updateEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	countEntries: function (soajs, opts, cb) {
		cb(null, 0);
	},
	removeEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	insertEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	saveEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	initConnection: function (soajs) {
		return true;
	},
	closeConnection: function (soajs) {
		return true;
	},
	switchConnection: function(soajs) {
	}
};

var req = {
	soajs: {
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
		inputmaskData: {}
	}
};

var gitDriver = {
	logout: function (soajs, gitModel, model, options, cb) {
		return cb(null);
	},
	login: function (soajs, gitModel, model, record, cb) {
		return cb(null);
	},
	getAnyContent: function (soajs, gitModel, model, options, cb) {
		return cb(null, {});
	},
	getJSONContent: function (soajs, gitModel, model, obj, cb) {
		var repoConfig = {
			type: ''
		};
		if (obj.accountId === '123multi' && obj.path === '/config.js') {
			repoConfig = {
				type: 'multi',
				folders: [
					'/sample2', '/sample3', 'sample4'
				]
			};
		}
		var configSHA = 'hash';
		cb(null, repoConfig, configSHA);
	},
	getRepos: function (soajs, data, model, options, cb) {
		var repos = [
			{
				id: 55780678,
				name: 'deployDemo',
				full_name: 'soajsTestAccount/deployDemo',
				owner: {}
			},
			{
				id: 5578067811,
				name: 'deployDemo11',
				full_name: 'soajsTestAccount/deployDemo11',
				owner: {
					type: 'Organization'
				}
			}
		];
		return cb(null, repos);
	},
	getBranches: function (soajs, data, model, options, cb) {
		var branches = {
			"branches": [
				{
					"name": "master",
					"commit": {
						"sha": "16e67b49a590d061d8a518b16360f387118f1475",
						"url": "https://api.github.com/repos/soajsTestAccount/testMulti/commits/16e67b49a590d061d8a518b16360f387118f1475"
					}
				}
			]
		};
		return cb(null, branches);
	}
};

var gitModel = {
	listGitAccounts: function (soajs, model, cb) {
		return cb(null, []);
	},
	getRepo: function (soajs, model, options, cb) {
		var accountRecord = {
			"label": "Test personal public Account",
			"owner": "soajsTestAccount",
			"provider": "github",
			"domain": "github.com",
			"type": "personal",
			"access": "public",
			repos: [
				{
					"name": "owner/repo",
					"type": "multi",
					"configBranch": "master",
					configSHA: [
						{
							contentType: 'service',
							contentName: 'samplesuccess2',
							path: '/sample2/config.js',
							sha: '6cb17c1d5509fa33105c155dde3a9bf2d07c97b4'
						},
						{
							contentType: 'daemon',
							contentName: 'sampledaemonsuccess1',
							path: '/sample3/config.js',
							sha: '1d4e3a0628618265b73d609b154f263837eb820f'
						}
					]
				}
			]
		};
		return cb(null, accountRecord);
	},
	updateRepoInfo: function (soajs, model, options, cb) {
		return cb(null, true);
	},
	getAccount: function (soajs, model, options, cb) {
		var accountRecord = {
			"label": "Test personal public Account",
			"owner": "soajsTestAccount",
			"provider": "github",
			"domain": "github.com",
			"type": "personal",
			"access": "public",
			repos: [
				{
					"name": "owner/repo",
					"type": "service",
					"configBranch": "master",
					"configSHA": "df650c9da0f19d4f2b1fbc86f3924c54f2d7da1b"
				}
			]
		};
		return cb(null, accountRecord);
	},
	getAuthToken: function (soajs, model, options, cb) {
		return cb(null, "token");
	}
};

describe("testing git.js", function () {

	describe("testing init", function () {

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
				lib = body;
				lib.model = mongoStub;
				done();
			});
		});

	});

	describe("testing login", function () {

		it("success", function (done) {
			req.soajs.inputmaskData = {
				label: '',
				owner: 'username',
				provider: 'provider',
				domain: 'domain',
				type: 'type',
				access: 'access'
			};
			lib.login(config, req, gitDriver, helpers, gitModel, function (error, body) {
				assert.ok(body);
				done();
			});
		});

		it("success password", function (done) {
			req.soajs.inputmaskData = {
				label: '',
				password: 'password',
				owner: 'username',
				provider: 'provider',
				domain: 'domain',
				type: 'type',
				access: 'access',
				oauthSecret: 'secret',
				oauthKey: "key"
			};
			lib.login(config, req, gitDriver, helpers, gitModel, function (error, body) {
				assert.ok(body);
				done();
			});
		});

	});

	describe("testing logout", function () {

		it("success", function (done) {
			req.soajs.inputmaskData = {
				password: 'password',
				access: 'access'
			};
			lib.logout(config, req, gitDriver, helpers, gitModel, function (error, body) {
				assert.ok(body);
				done();
			});
		});

		it("success 2", function (done) {
			req.soajs.inputmaskData = {
				access: 'access'
			};
			lib.logout(config, req, gitDriver, helpers, gitModel, function (error, body) {
				assert.ok(body);
				done();
			});
		});

	});

	describe("testing listAccounts", function () {

		it("success listAccounts", function (done) {
			req.soajs.inputmaskData = {
				"id": '592be42296fe4eac1ccab1be',
				"provider": "github",
				"name": "soajsTestAccount/testMulti",
				"type": "repo"
			};
			lib.listAccounts(config, req, gitDriver, helpers, gitModel, function (error, body) {
				assert.ok(body);
				done();
			});
		});

	});

	describe("testing getRepos", function () {

		it("success getRepos", function (done) {
			req.soajs.inputmaskData = {
				"id": '592be42296fe4eac1ccab1be',
				"provider": "github",
				"page": 1,
				"per_page": 50
			};

			lib.getRepos(config, req, gitDriver, helpers, gitModel, function (error, body) {
				assert.ok(body);
				done();
			});
		});

	});

	describe("testing getFiles", function () {

		it("success getFile", function (done) {
			req.soajs.inputmaskData = {
				"owner": 'soajs',
				"repo": "soajs.oauth"
			};
			lib.getFile(config, req, gitDriver, deployer, helpers, gitModel, function (error, body) {
				done();
			})
		});

		it("success getHAFile", function (done) {
			
			deployer.execute = function (in1, in2, in3, cb) {
				return cb(null, {
					env : ['SOAJS_GIT_BRANCH']
				});
			};
			
			req.soajs.inputmaskData = {
				"env": "dev",
				"serviceName": "serviceName",
				"version": 2
			};
			mongoStub.findEntry = function (soajs, opts, cb) {
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
						
						}
					}
				};
				cb(null, envRecord);
			};

			deployer.findService = function (options, cb) {
				var service = {
					"env": ["SOAJS_GIT_BRANCH", "SOAJS_GIT_OWNER"]
				};
				return cb(null, service)
			};
			
			lib.getHaFile("account", config, req, gitDriver, deployer, helpers, gitModel, function (error, body) {
				done();
			})
		});
	});

	describe("testing getBranches", function () {

		it("success getBranches", function (done) {
			req.soajs.inputmaskData = {
				"id": '592be42296fe4eac1ccab1be',
				"provider": "github",
				"name": "soajsTestAccount/testMulti",
				"type": "repo"
			};
			lib.getBranches(config, req, gitDriver, helpers, gitModel, function (error, body) {
				assert.ok(body);
				assert.ok(body.branches);
				done();
			});
		});

		it("fail - cannot get Branches for service - wrong name", function (done) {
			mongoStub.findEntry = function (soajs, opts, cb) {
				if (opts.conditions) {
					if (opts.conditions.name === 'sample__Single') {
						return cb(null, null);
					}
				}
				cb(null, {});
			};
			req.soajs.inputmaskData = {
				"id": '592be42296fe4eac1ccab1be',
				"name": "sample__Single",
				"type": "service"
			};
			lib.getBranches(config, req, gitDriver, helpers, gitModel, function (error) {
				assert.ok(error);
				assert.equal(error.code, 759);
				done();
			});
		});

		it("success - will get Branches for service", function (done) {
			var record1 = {
				src: {
					owner: "unittest",
					repo: "unittest"
				}
			};
			var record2 = {
				token: "abc",
				provider: "github"
			};
			gitModel.getAccount = function (soajs, model, options, cb) {
				return cb(null, record1);
			};
			mongoStub.findEntry = function (soajs, opts, cb) {
				if (opts.conditions) {
					if (opts.conditions.name === 'sampleSuccessSingle') {
						return cb(null, record1);
					}
					else {
						// repos.name
						return cb(null, record2);
					}
				}
				cb(null, {});
			};
			req.soajs.inputmaskData = {
				"id": '592be42296fe4eac1ccab1be',
				"name": "sampleSuccessSingle",
				"type": "service"
			};

			lib.getBranches(config, req, gitDriver, helpers, gitModel, function (error, body) {
				assert.ok(body);
				done();
			});
		});

		it("success - will get Branches for daemon", function (done) {
			var record1 = {
				src: {
					owner: "unittest",
					repo: "unittest"
				}
			};
			var record2 = {
				provider: "github"
			};
			mongoStub.findEntry = function (soajs, opts, cb) {
				if (opts.conditions) {
					if (opts.conditions.name === 'singleDaemon1') {
						return cb(null, record1);
					}
					else {
						return cb(null, record2);
					}
				}
				cb(null, {});
			};
			req.soajs.inputmaskData = {
				"id": '592be42296fe4eac1ccab1be',
				"name": "singleDaemon1",
				"type": "daemon"
			};

			lib.getBranches(config, req, gitDriver, helpers, gitModel, function (error, body) {
				assert.ok(body);
				done();
			});
		});

	});

	describe("testing activateRepo", function () {
		var accountRecord = {
			"label": "Test personal public Account",
			"owner": "soajsTestAccount",
			"provider": "github",
			"domain": "github.com",
			"type": "personal",
			"access": "public",
			repos: [
				{
					"name": "owner/repo",
					"type": "service",
					"configBranch": "master",
					"configSHA": "df650c9da0f19d4f2b1fbc86f3924c54f2d7da1b"
				}
			]
		};
		before(() => {
			helpers = helper.requireModule('./lib/git/helper.js');

			gitModel.addRepoToAccount = function (soajs, model, options, cb) {
				var data = {};
				return cb(null, data);
			};
			gitModel.getAccount = function (soajs, model, options, cb) {
				return cb(null, accountRecord);
			};
			mongoStub.findEntry = function (soajs, opts, cb) {
				cb(null, {});
			};
			helpers.cleanConfigDir = function (req, options, cb) {
				return cb(null);
			};
			helpers.analyzeConfigSyncFile = function (req, repoConfig, path, configSHA, flag, cb) {
				return cb(null);
			};
			helpers.validateFileContents = function (req, res, repoConfig, cb) {
				return cb(null);
			};
			helpers.getServiceInfo = function (req, repoConfig, path, flags, provider) {
				var info = {};
				info = {
					swagger: repoConfig.swagger || false,
					name: repoConfig.serviceName,
					port: repoConfig.servicePort,
					group: repoConfig.serviceGroup,
					src: {
						provider: provider,
						owner: req.soajs.inputmaskData.owner,
						repo: req.soajs.inputmaskData.repo
					},
					prerequisites: repoConfig.prerequisites || {},
					requestTimeout: repoConfig.requestTimeout,
					requestTimeoutRenewal: repoConfig.requestTimeoutRenewal,
					versions: {},
					path: path //needed for multi repo, not saved in db
				};
				return info;
			};
		});

		it("success activateRepo service", function (done) {
			gitDriver.getJSONContent = function (soajs, gitModel, model, obj, cb) {
				var repoConfig = {
					type: 'service',
					name: ''
				};
				var configSHA = [];
				cb(null, repoConfig, configSHA);
			};

			mongoStub.findEntry = function (soajs, opts, cb) {
				if (opts.collection === 'git_accounts') {
					return cb(null, accountRecord);
				}
				cb(null, {});
			};

			gitModel.getAccount = function (soajs, model, options, cb) {
				return cb(null, accountRecord);
			};
			req.soajs.inputmaskData = {
				"id": '123456',
				"provider": "github",
				"owner": 'owner',
				"repo": 'repo',
				"project": '',
				"configBranch": "develop"
			};
			lib.activateRepo(config, req, gitDriver, helpers, gitModel, function (error, body) {
				// assert.ok(body);
				done();
			});
		});

		it("success activateRepo multi", function (done) {
			gitDriver.getJSONContent = function (soajs, gitModel, model, obj, cb) {
				var repoConfig = {};
				if (obj.path === '/config.js') {
					repoConfig = {
						type: 'multi',
						folders: [
							'/sample2', '/sample3', '/sample4'
						]
					}
				}
				else {
					repoConfig = {
						type: 'service'
					}
				}
				if (obj.path === '/sample2/config.js') {
					repoConfig = {
						type: 'service',
						serviceName: "samplesuccess2",
						serviceGroup: "test",
						servicePort: 3002,
						requestTimeout: 30,
						requestTimeoutRenewal: 5,
						extKeyRequired: true,
						prerequisites: {},
						"errors": {},
						"schema": {}
					}
				}
				else if (obj.path === '/sample3/config.js') {
					repoConfig = {
						serviceName: "sampledaemonsuccess1",
						serviceGroup: "test",
						servicePort: 3003,
						type: 'daemon',
						prerequisites: {},
						//serviceVersion: 1,
						main: "index.js",
						errors: {},
						"cmd": ["ls"],
						"schema": {
							"testJob": {
								"l": "test Job"
							}
						}
					}
				}
				var configSHA = [];
				cb(null, repoConfig, configSHA);
			};

			mongoStub.findEntry = function (soajs, opts, cb) {
				if (opts.collection === 'git_accounts') {
					return cb(null, accountRecord);
				}
				cb(null, {});
			};

			gitModel.getAccount = function (soajs, model, options, cb) {
				return cb(null, accountRecord);
			};
			req.soajs.inputmaskData = {
				"id": '123456',
				"provider": "github",
				"owner": 'owner',
				"repo": 'repo',
				"project": '',
				"configBranch": "develop"
			};
			lib.activateRepo(config, req, gitDriver, helpers, gitModel, function (error, body) {
				// assert.ok(body);
				done();
			});
		});

		it("success activateRepo custom", function (done) {
			gitDriver.getJSONContent = function (soajs, gitModel, model, obj, cb) {
				var error = {
					code: 761
				};
				var configSHA = [];
				cb(error, null, configSHA);
			};
			helpers.getCustomRepoFiles = function (options, req, cb) {
				var configData = {
					path: 'path.js',
					content: {}
				};
				return cb(null, configData);
			};
			mongoStub.findEntry = function (soajs, opts, cb) {
				if (opts.collection === 'git_accounts') {
					return cb(null, accountRecord);
				}
				cb(null, {});
			};

			gitModel.getAccount = function (soajs, model, options, cb) {
				return cb(null, accountRecord);
			};
			req.soajs.inputmaskData = {
				"id": '123456',
				"provider": "github",
				"owner": 'owner',
				"repo": 'repo',
				"project": '',
				"configBranch": "develop"
			};
			lib.activateRepo(config, req, gitDriver, helpers, gitModel, function (error, body) {
				// assert.ok(body);
				done();
			});
		});

		it("success activateRepo misc", function (done) {
			gitDriver.getJSONContent = function (soajs, gitModel, model, obj, cb) {
				var error = {
					code: 761
				};
				var configSHA = [];
				cb(error, null, configSHA);
			};
			helpers.getCustomRepoFiles = function (options, req, cb) {
				var error = {
					code: 761
				};
				cb(error);
			};
			mongoStub.findEntry = function (soajs, opts, cb) {
				if (opts.collection === 'git_accounts') {
					return cb(null, accountRecord);
				}
				cb(null, {});
			};

			gitModel.getAccount = function (soajs, model, options, cb) {
				return cb(null, accountRecord);
			};
			req.soajs.inputmaskData = {
				"id": '123456',
				"provider": "github",
				"owner": 'owner',
				"repo": 'repo',
				"project": '',
				"configBranch": "develop"
			};
			lib.activateRepo(config, req, gitDriver, helpers, gitModel, function (error, body) {
				// assert.ok(body);
				done();
			});
		});

	});

	describe("testing deactivateRepo", function () {
		beforeEach(() => {
			mongoStub.findEntry = function (soajs, opts, cb) {
				cb(null, {
					name: ""
				});
			};

			gitModel.removeRepoFromAccount = function (soajs, model, options, cb) {
				return cb(null, true);
			};
			mongoStub.removeEntry = function (soajs, opts, cb) {
				cb(null, true);
			};
		});

		it("success deactivate multi", function (done) {
			gitModel.getRepo = function (soajs, model, options, cb) {
				var accountRecord = {
					"label": "Test personal public Account",
					"owner": "soajsTestAccount",
					"provider": "github",
					"domain": "github.com",
					"type": "personal",
					"access": "public",
					repos: [
						{
							"name": "owner/repo",
							"type": "multi",
							"configBranch": "master",
							configSHA: [
								{
									contentType: 'service',
									contentName: 'samplesuccess2',
									path: '/sample2/config.js',
									sha: '6cb17c1d5509fa33105c155dde3a9bf2d07c97b4'
								},
								{
									contentType: 'daemon',
									contentName: 'sampledaemonsuccess1',
									path: '/sample3/config.js',
									sha: '1d4e3a0628618265b73d609b154f263837eb820f'
								}
							]
						}
					]
				};
				return cb(null, accountRecord);
			};

			mongoStub.findEntry = function (soajs, opts, cb) {
				cb(null, {
					name: ""
				});
			};

			req.soajs.inputmaskData = {
				"owner": '592be42296fe4eac1ccab1be',
				"repo": "github",
				"id": '592be42296fe4eac1ccab1be'
			};
			lib.deactivateRepo(config, req, gitDriver, helpers, gitModel, {}, {}, function (error, body) {
				assert.ok(body);
				done();
			});
		});

		it("success deactivate custom", function (done) {
			gitModel.getRepo = function (soajs, model, options, cb) {

				return cb(null, null);
			};

			mongoStub.findEntry = function (soajs, opts, cb) {
				cb(null, {
					name: ""
				});
			};

			req.soajs.inputmaskData = {
				"owner": '592be42296fe4eac1ccab1be',
				"repo": "github",
				"id": '592be42296fe4eac1ccab1be'
			};
			lib.deactivateRepo(config, req, gitDriver, helpers, gitModel, {}, {}, function (error, body) {
				assert.ok(body);
				done();
			});
		});

		it("success deactivate service", function (done) {
			gitModel.getRepo = function (soajs, model, options, cb) {
				var accountRecord = {
					"label": "Test personal public Account",
					"owner": "soajsTestAccount",
					"provider": "github",
					"domain": "github.com",
					"type": "personal",
					"access": "public",
					repos: [
						{
							"name": "owner/repo",
							"type": "service",
							"configBranch": "master"
						}
					]
				};
				return cb(null, accountRecord);
			};

			mongoStub.findEntry = function (soajs, opts, cb) {
				cb(null, {
					name: ""
				});
			};

			req.soajs.inputmaskData = {
				"owner": '592be42296fe4eac1ccab1be',
				"repo": "github",
				"id": '592be42296fe4eac1ccab1be'
			};
			lib.deactivateRepo(config, req, gitDriver, helpers, gitModel, {}, {}, function (error, body) {
				assert.ok(body);
				done();
			});
		});

		it("fail deactivateRepo", function (done) {
			mongoStub.countEntries = function (soajs, opts, cb) {
				cb(null, 1);
			};

			req.soajs.inputmaskData = {
				"owner": '592be42296fe4eac1ccab1be',
				"repo": "github",
				"id": '592be42296fe4eac1ccab1be'
			};
			lib.deactivateRepo(config, req, gitDriver, helpers, gitModel, {}, {}, function (error, body) {
				assert.ok(error);
				done();
			});
		});

	});

	describe("testing syncRepo", function () {
		var accountRecord = {
			"label": "Test personal public Account",
			"owner": "soajsTestAccount",
			"provider": "github",
			"domain": "github.com",
			"type": "personal",
			"access": "public",
			repos: [
				{
					"name": "owner/repo",
					"type": "service",
					"configBranch": "master",
					"configSHA": "df650c9da0f19d4f2b1fbc86f3924c54f2d7da1b"
				}
			]
		};
		beforeEach(() => {
			gitDriver.getJSONContent = function (soajs, gitModel, model, obj, cb) {
				var repoConfig = {
					type: ''
				};
				if (obj.accountId === '123multi' && obj.path === '/config.js') {
					repoConfig = {
						type: 'multi',
						folders: [
							'/sample2', '/sample3', 'sample4'
						]
					};
				}
				var configSHA = 'hash';
				cb(null, repoConfig, configSHA);
			};

			helpers = helper.requireModule('./lib/git/helper.js');

			gitModel.getAccount = function (soajs, model, options, cb) {
				return cb(null, accountRecord);
			};
			mongoStub.findEntry = function (soajs, opts, cb) {
				cb(null, {});
			};
			helpers.analyzeConfigSyncFile = function (req, repoConfig, path, configSHA, flag, cb) {
				return cb(null);
			};
		});

		it("success syncRepo service", function (done) {
			mongoStub.findEntry = function (soajs, opts, cb) {
				if (opts.collection === 'git_accounts') {
					return cb(null, accountRecord);
				}
				cb(null, {});
			};

			gitModel.getAccount = function (soajs, model, options, cb) {
				return cb(null, accountRecord);
			};
			req.soajs.inputmaskData = {
				"id": '123456',
				"provider": "github",
				"owner": 'owner',
				"repo": 'repo'
			};
			lib.syncRepo(config, req, gitDriver, helpers, gitModel, function (error, body) {
				// assert.ok(body);
				done();
			});
		});

		it("success syncRepo multi", function (done) {
			accountRecord = {
				"label": "Test personal public Account",
				"owner": "soajsTestAccount",
				"provider": "github",
				"domain": "github.com",
				"type": "personal",
				"access": "public",
				repos: [
					{
						"name": "owner/repo",
						"type": "multi",
						"configBranch": "master",
						configSHA: [
							{
								contentType: 'service',
								contentName: 'samplesuccess2',
								path: '/sample2/config.js',
								sha: '6cb17c1d5509fa33105c155dde3a9bf2d07c97b4'
							},
							{
								contentType: 'daemon',
								contentName: 'sampledaemonsuccess1',
								path: '/sample3/config.js',
								sha: '1d4e3a0628618265b73d609b154f263837eb820f'
							}
						]
					}
				]
			};
			gitModel.getRepo = function (soajs, model, options, cb) {
				return cb(null, accountRecord);
			};
			gitModel.getAccount = function (soajs, model, options, cb) {
				return cb(null, accountRecord);
			};
			req.soajs.inputmaskData = {
				"id": '123multi',
				"provider": "github",
				"owner": 'owner',
				"repo": 'repo'
			};
			lib.syncRepo(config, req, gitDriver, helpers, gitModel, function (error, body) {
				// assert.ok(body);
				done();
			});
		});

		it("success syncRepo multi 2", function (done) {
			helpers.removePath = function (model, soajs, path, callback) {
				return callback(null, {
					removed: true,
					contentName: path.contentName,
					contentType: path.contentType,
					path: path.path,
					sha: path.sha
				});
			};
			helpers.comparePaths = function (req, config, remote, local, callback) {
				return callback([
					{
						path: '/sample1/config.js',
						sha: '6cbeae3ed88e9e3296e05fd52a48533ba53c0931',
						status: 'new'
					},
					{
						path: '/sample2/config.js',
						sha: '6cbeae3ed88e9e3296e05fd52a48533ba53c0931',
						status: 'available'
					},
					{
						path: '/sample3/config.js',
						sha: '6cbeae3ed88e9e3296e05fd52a48533ba53c0931',
						status: 'removed'
					},
					{
						path: '/sample4/config.js',
						sha: '6cbeae3ed88e9e3296e05fd52a48533ba53c0931',
						status: 'available'
					}
				]);
			};
			accountRecord = {
				"label": "Test personal public Account",
				"owner": "soajsTestAccount",
				"provider": "github",
				"domain": "github.com",
				"type": "personal",
				"access": "public",
				repos: [
					{
						"name": "owner/repo",
						"type": "multi",
						"configBranch": "master",
						configSHA: [
							{
								contentType: 'service',
								contentName: 'samplesuccess2',
								path: '/sample2/config.js',
								sha: '6cb17c1d5509fa33105c155dde3a9bf2d07c97b4'
							},
							{
								contentType: 'daemon',
								contentName: 'sampledaemonsuccess1',
								path: '/sample3/config.js',
								sha: '1d4e3a0628618265b73d609b154f263837eb820f'
							}
						]
					}
				]
			};
			gitModel.getRepo = function (soajs, model, options, cb) {
				return cb(null, accountRecord);
			};
			gitModel.getAccount = function (soajs, model, options, cb) {
				return cb(null, accountRecord);
			};
			req.soajs.inputmaskData = {
				"id": '123multi',
				"provider": "github",
				"owner": 'owner',
				"repo": 'repo'
			};
			lib.syncRepo(config, req, gitDriver, helpers, gitModel, function (error, body) {
				assert.ok(body);
				done();
			});
		});

		it("Fail syncRepo outOfSync", function (done) {
			helpers.analyzeConfigSyncFile = function (req, repoConfig, path, configSHA, flag, cb) {
				return cb('outOfSync');
			};

			req.soajs.inputmaskData = {
				"id": '123456',
				"provider": "github",
				"owner": 'owner',
				"repo": 'repo'
			};
			lib.syncRepo(config, req, gitDriver, helpers, gitModel, function (error, body) {
				assert.ok(body);
				assert.equal(body.status, 'outOfSync');
				done();
			});
		});

		it("Success syncRepo upToDate", function (done) {
			helpers.analyzeConfigSyncFile = function (req, repoConfig, path, configSHA, flag, cb) {
				return cb(null, 'upToDate');
			};

			req.soajs.inputmaskData = {
				"id": '123456',
				"provider": "github",
				"owner": 'owner',
				"repo": 'repo'
			};
			lib.syncRepo(config, req, gitDriver, helpers, gitModel, function (error, body) {
				assert.ok(body);
				done();
			});
		});

	});

});
