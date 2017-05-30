"use strict";
var assert = require("assert");
var helper = require("../../helper.js");
var utils = helper.requireModule('./lib/git.js');
var helpers = helper.requireModule('./lib/helpers/git.js');

var lib;
var config = helper.requireModule('./config.js');

var deployer = require("soajs").drivers;

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
		cb(null, 1);
	},
	removeEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	
	saveEntry: function (soajs, opts, cb) {
		cb(null, true);
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
				console.log(data);
			},
			error: function (data) {
				console.log(data);
			},
			info: function (data) {
				console.log(data);
			}
		},
		inputmaskData: {}
	}
};

var gitDriver = {
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
	
	describe.skip("testing listAccounts", function () {
		
		it("success listAccounts", function (done) {
			req.soajs.inputmaskData = {
				"id": '592be42296fe4eac1ccab1be',
				"provider": "github",
				"name": "soajsTestAccount/testMulti",
				"type": "repo"
			};
			lib.listAccounts(config, req, gitDriver, helpers, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
	});
	
	describe.skip("testing getRepos", function () {
		
		it("success getRepos", function (done) {
			mongoStub.findEntry = function (soajs, opts, cb) {
				cb(null, {});
			};
			
			req.soajs.inputmaskData = {
				"id": '592be42296fe4eac1ccab1be',
				"provider": "github",
				"page": 1,
				"per_page": 50
			};
			lib.getRepos(config, req, gitDriver, helpers, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
	});
	
	describe.skip("testing getBranches", function () {
		
		it("success getBranches", function (done) {
			req.soajs.inputmaskData = {
				"id": '592be42296fe4eac1ccab1be',
				"provider": "github",
				"name": "soajsTestAccount/testMulti",
				"type": "repo"
			};
			lib.getBranches(config, req, gitDriver, helpers, function (error, body) {
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
			lib.getBranches(config, req, gitDriver, helpers, function (error) {
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
			
			lib.getBranches(config, req, gitDriver, helpers, function (error, body) {
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
			
			lib.getBranches(config, req, gitDriver, helpers, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
		it("success - will get Branches for static", function (done) {
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
			mongoStub.findEntry = function (soajs, opts, cb) {
				if (opts.conditions) {
					if (opts.conditions.name === 'SampleTest4') {
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
				"name": "SampleTest4",
				"type": "static"
			};
			
			lib.getBranches(config, req, gitDriver, helpers, function (error, body) {
				assert.ok(body);
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
			mongoStub.findEntry = function (soajs, opts, cb) {
				if (opts.collection === 'git_accounts') {
					return cb(null, accountRecord);
				}
				cb(null, {});
			};
			helpers.analyzeConfigSyncFile = function (req, repoConfig, path, configSHA, cb) {
				return cb(null);
			};
			//comparePaths: function (req, config, remote, local, callback) {
			helpers._comparePaths = function (req, config, remote, local, callback) {
				return callback([
					{
						path: '/sample1/config.js',
						sha: '6cbeae3ed88e9e3296e05fd52a48533ba53c0931',
						status: 'available'
					},
					{
						path: '/sample2/config.js',
						sha: '6cbeae3ed88e9e3296e05fd52a48533ba53c0931',
						status: 'available'
					},
					{
						path: '/sample3/config.js',
						sha: '6cbeae3ed88e9e3296e05fd52a48533ba53c0931',
						status: 'available'
					},
					{
						path: '/sample4/config.js',
						sha: '6cbeae3ed88e9e3296e05fd52a48533ba53c0931',
						status: 'available'
					}
				]);
			};
		});
		
		it("success syncRepo service", function (done) {
			mongoStub.findEntry = function (soajs, opts, cb) {
				if (opts.collection === 'git_accounts') {
					return cb(null, accountRecord);
				}
				cb(null, {});
			};

			req.soajs.inputmaskData = {
				"id": '123456',
				"provider": "github",
				"owner": 'owner',
				"repo": 'repo'
			};
			lib.syncRepo(config, req, gitDriver, helpers, function (error, body) {
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
							},
							{
								contentType: 'static',
								contentName: 'sampletest4',
								path: '/sample4/config.js',
								sha: 'd0f80dc4fe46d354035cb95b317feac69b83b876'
							}
						]
					}
				]
			};
			mongoStub.findEntry = function (soajs, opts, cb) {
				if (opts.collection === 'git_accounts') {
					return cb(null, accountRecord);
				}
				cb(null, {});
			};

			req.soajs.inputmaskData = {
				"id": '123multi',
				"provider": "github",
				"owner": 'owner',
				"repo": 'repo'
			};
			lib.syncRepo(config, req, gitDriver, helpers, function (error, body) {
				// assert.ok(body);
				done();
			});
		});

		it("Fail syncRepo outOfSync", function (done) {
			helpers.analyzeConfigSyncFile = function (req, repoConfig, path, configSHA, cb) {
				return cb('outOfSync');
			};

			req.soajs.inputmaskData = {
				"id": '123456',
				"provider": "github",
				"owner": 'owner',
				"repo": 'repo'
			};
			lib.syncRepo(config, req, gitDriver, helpers, function (error, body) {
				// assert.ok(body);
				done();
			});
		});

		it("Success syncRepo upToDate", function (done) {
			helpers.analyzeConfigSyncFile = function (req, repoConfig, path, configSHA, cb) {
				return cb(null, 'upToDate');
			};

			req.soajs.inputmaskData = {
				"id": '123456',
				"provider": "github",
				"owner": 'owner',
				"repo": 'repo'
			};
			lib.syncRepo(config, req, gitDriver, helpers, function (error, body) {
				console.log(body);
				// assert.ok(body);
				done();
			});
		});
		
	});
	
});
