"use strict";
const fs = require('fs');
const assert = require("assert");
const helper = require("../../../helper.js");
const utils = helper.requireModule('./lib/ci/index.js');
let ci;

let ciDriver = {
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
	},
	getFileName: function (options, cb) {
		let filename = '';
		if (options.driver === 'travis') {
			filename = '.travis.yml';
		}
		return cb(filename);
	}
};

let mongoStub = {
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
	},
	initConnection: function (soajs) {
		return true;
	},
	closeConnection: function (soajs) {
		return true;
	}
};

//git files are used for getRepoYamlFile
let git = {};

let gitBL = {
	model: {}
};

let gitModel = {
	getAccount: function (soajs, model, options, cb) {
		return cb(null, {});
	}
};

let gitHelpers = {
	doGetFile: function (req, BL, git, gitModel, account, branch, cb) {
		let filedata = {
			content: "language: node_js\nnode_js: 6.9.5\nafter_success:\n    - 'node ./soajs.cd.js'\n"
		};
		return cb(null, filedata);
	}
};

let req = {
	soajs: {
		tenant: {
			key: {
				eKey: 'eKey'
			}
		},
		registry: {
			coreDB: {
				provision: {}
			},
			custom: {
				ciConfig: {
					value: {
						apiPrefix: 'PRE',
						domain: 'localhost',
						protocol: 'http',
						port: 1234
					}
				}
			}
		},
		servicesConfig: {
			SOAJS_SAAS: {
				test: {}
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
let config = helper.requireModule('./config.js');

describe("testing ci.js", function () {
	beforeEach(() => {
		let record = {
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
	
	describe("testing toggleRepoStatus", function () {
		
		before(function (done) {
			ciDriver.listRepos = function (options, cb) {
				let repos = [
					{
						id: 'ciRepoId'
					}
				];
				return cb(null, repos);
			};
			
			done();
		});
		
		it("Success - enable", function (done) {
			req.soajs.inputmaskData = {
				id: 'ciRepoId',
				enable: true,
				owner: 'soajs',
				provider: 'travis'
			};
			ci.toggleRepoStatus(config, req, ciDriver, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
		it("Success - disable", function (done) {
			req.soajs.inputmaskData = {
				id: 'ciRepoId',
				enable: false,
				owner: 'soajs',
				provider: 'travis'
			};
			ci.toggleRepoStatus(config, req, ciDriver, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
	});
	
	describe("testing getRepoSettings", function () {
		
		before(function (done) {
			ciDriver.listEnvVars = function (options, cb) {
				let envs = [
					"TEST_ENV_1=test1",
					"TEST_ENV_2=test2"
				];
				return cb(null, envs);
			};
			
			ciDriver.listSettings = function (options, cb) {
				let settings = {
					"builds_only_with_travis_yml": true,
					"build_pushes": true,
					"build_pull_requests": true,
					"maximum_number_of_builds": 0
				};
				return cb(null, settings);
			};
			
			done();
		});
		
		it("Success getRepoSettings", function (done) {
			ci.getRepoSettings(config, req, ciDriver, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
	});
	
	describe("testing updateRepoSettings", function () {
		
		it("Success id (number)", function (done) {
			req.soajs.inputmaskData = {
				"id": 12464664,
				"port": 80,
				"settings": {},
				"variables": [{
					name: "var1",
					value: "val1"
				}, {
					name: "var2",
					value: "val2"
				}
				]
			};
			
			mongoStub.findEntry = function (soajs, opts, cb) {
				cb(null, {
					apiPrefix: "dashboard-api",
					domain: "soajs",
					port: 80,
					protocol: "http"
				});
			};
			
			ci.updateRepoSettings(config, req, ciDriver, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
		it("Success id (string)", function (done) {
			req.soajs.inputmaskData = {
				"id": "CLOUD/dashboard",
				"port": 80,
				"settings": {},
				"variables": [{
					name: "var1",
					value: "val1"
				}, {
					name: "var2",
					value: "val2"
				}
				]
			};
			
			mongoStub.findEntry = function (soajs, opts, cb) {
				cb(null, {
					apiPrefix: "dashboard-api",
					domain: "soajs",
					port: 80,
					protocol: "http"
				});
			};
			
			ci.updateRepoSettings(config, req, ciDriver, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
		it("Success empty reg", function (done) {
			let oldSoajsSaasValue = process.env.SOAJS_SAAS;
			process.env.SOAJS_SAAS = "true";
			req.soajs.inputmaskData = {
				"id": "CLOUD/dashboard",
				"port": 80,
				"settings": {},
				"variables": [{
					name: "var1",
					value: "val1"
				}, {
					name: "var2",
					value: "val2"
				}
				],
				soajs_project: 'test'
			};
			
			mongoStub.findEntry = function (soajs, opts, cb) {
				cb(null, {});
			};
			
			ci.updateRepoSettings(config, req, ciDriver, function (error, body) {
				if (oldSoajsSaasValue) {
					process.env.SOAJS_SAAS = oldSoajsSaasValue;
				} else {
					delete process.env.SOAJS_SAAS;
				}
				
				assert.ok(body);
				done();
			});
		});
		
	});
	
	describe("testing getRepoYamlFile", function () {
		
		it("success - will get file", function (done) {
			req.soajs.inputmaskData = {
				provider: 'travis',
				owner: 'soajs',
				repo: 'soajs.test',
				branch: 'testBranch'
			};
			ci.getRepoYamlFile(config, req, ciDriver, git, gitHelpers, gitModel, gitBL, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
	});
});
