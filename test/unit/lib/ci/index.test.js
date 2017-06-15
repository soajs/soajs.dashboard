"use strict";
var fs = require('fs');
var assert = require("assert");
var helper = require("../../../helper.js");
var utils = helper.requireModule('./lib/ci/index.js');
var ci;
var ciDriver = {
	ensureRepoVars: function (settings, cb) {
		return cb(null, true);
	},
	updateSettings: function (settings, cb) {
		return cb(null, true);
	},
	setHook: function (settings, cb) {
		return cb(null, true);
	},
	generateToken: function (settings, cb) {
		return cb(null, '');
	},
	listRepos: function (options, cb) {
		return cb(null, []);
	},
	listEnvVars: function (options, cb) {
		return cb(null, []);
	},
	listSettings: function (options, cb) {
		return cb(null, []);
	}
};

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
		cb(null, {});
	},
	updateEntry: function (soajs, opts, cb) {
		cb(null, true);
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
		tenant: {
			key: {
				eKey: 'eKey'
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
		inputmaskData: {}
	}
};
var config = helper.requireModule('./config.js');

describe("testing ci.js", function () {
	beforeEach(() => {
		var record = {
			_id: '592806440effddeec7d52b55',
			driver: 'travis',
			settings: {
				domain: 'api.travis-ci.org',
				owner: 'soajsTestAccount',
				gitToken: 'mygitToken'
			},
			recipe: 'sudo',
			type: 'ci'
		};
		mongoStub.findEntry = function (soajs, opts, cb) {
			if (opts.collection === 'cicd') {
				return cb(null, record);
			}
			cb(null, {});
		};
	});
	
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
				ci = body;
				ci.model = mongoStub;
				done();
			});
		});
		
	});
	
	describe("testing getConfig", function () {
		
		before(() => {
		});
		after(() => {
		});
		
		it("Fail mongo", function (done) {
			mongoStub.findEntry = function (soajs, opts, cb) {
				cb({ code: 400 }, null);
			};
			ci.getConfig(config, req, ciDriver, function (error, body) {
				assert.ok(error);
				assert.ok(error.code);
				done();
			});
		});
		it("Success. Not found", function (done) {
			mongoStub.findEntry = function (soajs, opts, cb) {
				cb(null, null);
			};
			ci.getConfig(config, req, ciDriver, function (error, body) {
				assert.ok(body);
				assert.equal(body.list, 0);
				done();
			});
		});
		
		it("Success. Found 1", function (done) {
			ci.getConfig(config, req, ciDriver, function (error, body) {
				assert.ok(body);
				assert.ok(body.variables);
				done();
			});
		});
		
		it("Success. Found 2", function (done) {
			var record = {
				_id: '592806440effddeec7d52b55',
				driver: 'travis',
				settings: {
					domain: 'api.travis-ci.org',
					owner: 'soajsTestAccount',
					ciToken: '1234'
				},
				recipe: 'sudo',
				type: 'ci'
			};
			mongoStub.findEntry = function (soajs, opts, cb) {
				return cb(null, record);
			};
			ci.getConfig(config, req, ciDriver, function (error, body) {
				assert.ok(body);
				done();
			});
		});
	});
	
	describe("testing saveConfig", function () {
		
		before(() => {
		});
		after(() => {
		});
		
		it("Success saveConfig with recipe", function (done) {
			var path = __dirname + "/../../../uploads/.travis.yml";
			fs.readFile(path, { "encoding": "utf8" }, function (error, data) {
				assert.ifError(error);
				// assert.ok(data);
				
				var configData = {
					"config": {
						"driver": "travis",
						"settings": {
							"domain": "api.travis-ci.org",
							"owner": "soajsTestAccount",
							"gitToken": '11111'
						},
						"recipe": data
					}
				};
				req.soajs.inputmaskData = {
					config: configData.config
				};
				ci.saveConfig(config, req, ciDriver, function (error, body) {
					assert.ok(body);
					done();
				});
			});
		});
		
		it("Success saveConfig without recipe", function (done) {
			var configData = {
				"config": {
					"driver": "travis",
					"settings": {
						"domain": "api.travis-ci.org",
						"owner": "soajsTestAccount",
						"gitToken": '11111'
					},
					"recipe": ""
				}
			};
			req.soajs.inputmaskData = {
				config: configData.config
			};
			ci.saveConfig(config, req, ciDriver, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
		it("Failed recipe", function (done) {
			var configData = {
				"config": {
					"driver": "travis",
					"settings": {
						"domain": "api.travis-ci.org",
						"owner": "soajsTestAccount",
						"gitToken": '11111'
					},
					"recipe": 'sudo:'
				}
			};
			req.soajs.inputmaskData = {
				config: configData.config
			};
			ci.saveConfig(config, req, ciDriver, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
		it("Failed recipe - non object", function (done) {
			var configData = {
				"config": {
					"driver": "travis",
					"settings": {
						"domain": "api.travis-ci.org",
						"owner": "soajsTestAccount",
						"gitToken": '11111'
					},
					"recipe": '"string"'
				}
			};
			req.soajs.inputmaskData = {
				config: configData.config
			};
			ci.saveConfig(config, req, ciDriver, function (error, body) {
				assert.ok(error);
				done();
			});
		});
		
		it("Failed recipe malformed data", function (done) {
			var path = __dirname + "/../../../uploads/invalid.yml";
			fs.readFile(path, { "encoding": "utf8" }, function (error, data) {
				assert.ifError(error);
				// assert.ok(data);
				
				var configData = {
					"config": {
						"driver": "travis",
						"settings": {
							"domain": "api.travis-ci.org",
							"owner": "soajsTestAccount",
							"gitToken": '11111'
						},
						"recipe": data
					}
				};
				req.soajs.inputmaskData = {
					config: configData.config
				};
				ci.saveConfig(config, req, ciDriver, function (error, body) {
					assert.ok(error);
					done();
				});
			});
		});
		
	});
	
	describe("testing deleteConfig", function () {
		
		before(() => {
		});
		after(() => {
		});
		
		it("Success deleteConfig", function (done) {
			
			ci.deleteConfig(config, req, ciDriver, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
		
	});
	
	describe("testing toggleRepoStatus", function () {
		
		before(() => {
		});
		after(() => {
		});
		
		it("Success - enable", function (done) {
			req.soajs.inputmaskData = {
				enable: true
			};
			ci.toggleRepoStatus(config, req, ciDriver, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
		it("Success - disable", function (done) {
			req.soajs.inputmaskData = {
				enable: false
			};
			ci.toggleRepoStatus(config, req, ciDriver, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
	});
	
	describe("testing getRepoSettings", function () {
		
		before(() => {
		});
		after(() => {
		});
		
		it("Success getRepoSettings", function (done) {
			ci.getRepoSettings(config, req, ciDriver, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
		
	});
	
	describe("testing updateRepoSettings", function () {
		
		before(() => {
		});
		after(() => {
		});
		
		it("Success", function (done) {
			req.soajs.inputmaskData = {
				"id": 12464664,
				"port": 80,
				"settings": {},
				"variables": {
					"var1": "val1",
					"var2": "val2"
				}
			};
			ci.updateRepoSettings(config, req, ciDriver, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
		
	});
	
	describe("testing syncRepos", function () {
		
		before(() => {
		});
		after(() => {
		});
		
		it("Success syncRepos", function (done) {
			ciDriver.listRepos = function (options, cb) {
				var repos = [
					{
						id: 12587674,
						slug: 'soajsTestAccount/test.success1',
						description: null,
						last_build_id: 12,
						last_build_number: 2,
						last_build_state: 'a',
						last_build_duration: 12,
						last_build_language: null,
						last_build_started_at: 15,
						last_build_finished_at: 21,
						active: true,
						github_language: null
					},
					{
						id: 12464660,
						slug: 'soajsTestAccount/testStaticContent',
						description: null,
						last_build_id: null,
						last_build_number: null,
						last_build_state: '',
						last_build_duration: null,
						last_build_language: null,
						last_build_started_at: null,
						last_build_finished_at: null,
						active: true,
						github_language: null
					},
					{
						id: 12464663,
						slug: 'soajsTestAccount/validateConfig',
						description: null,
						active: false,
						github_language: null
					}
				];
				return cb(null, repos);
			};
			mongoStub.findEntry = function (soajs, opts, cb) {
				var rec = {
					_id: 'ffddeec7d52b55',
					driver: 'travis',
					settings: {
						domain: 'api.travis-ci.org',
						owner: 'soajsTestAccount',
						ciToken: '8ZXvX0Mu'
					},
					recipe: 'sudo: required\nlanguage',
					type: 'ci'
				};
				cb(null, rec);
			};
			req.soajs.inputmaskData = {
				"port": 80
			};
			ci.syncRepos(config, req, ciDriver, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
	});
	
	// describe("testing downloadRecipe", function () {
	//	
	// 	before(() => {
	// 	});
	// 	after(() => {
	// 	});
	//	
	// 	it("Success downloadRecipe", function (done) {
	// 		mongoStub.findEntry = function (soajs, opts, cb) {
	// 			var rec = {
	// 				_id: 'ffddeec7d52b55',
	// 				driver: 'travis',
	// 				settings: {
	// 					domain: 'api.travis-ci.org',
	// 					owner: 'soajsTestAccount',
	// 					ciToken: '8ZXvX0MudBH'
	// 				},
	// 				recipe: 'sudo: required\nlanguage',
	// 				type: 'ci'
	// 			};
	// 			cb(null, rec);
	// 		};
	// 		req.soajs.inputmaskData = {
	// 			"port": 80
	// 		};
	// 		ci.downloadRecipe(config, req, ciDriver, function (error, body) {
	// 			assert.ok(body);
	// 			done();
	// 		});
	// 	});
	//	
	// });
});