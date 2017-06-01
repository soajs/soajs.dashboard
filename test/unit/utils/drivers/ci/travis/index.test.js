"use strict";
var assert = require("assert");
var helper = require("../../../../../helper.js");
var utils = helper.requireModule('./utils/drivers/ci/travis/index.js');
const nock = require('nock');

describe("testing ci travis index.js", function () {
	var options = {
		log: {
			debug: function (data) {
				console.log(data);
			}
		},
		_id: 'aaa',
		driver: 'travis',
		settings: {
			domain: 'my.travis',
			owner: 'soajsTestAccount',
			gitToken: 'mygitToken',
			ciToken: 'access1'
		},
		recipe: '',
		type: 'ci',
		params: { repoId: 123456 }
	};
	beforeEach(function (done) {
		console.log('=======================================================');
		done();
	});
	afterEach(function (done) {
		console.log('%%%%%%%%%%%%% %%%%%%%%%%%%% %%%%%%%%%%%%% %%%%%%%%%%%%%');
		done();
	});
	describe("testing generateToken", function () {
		
		it("Call generateToken", function (done) {
			nock('https://my.travis')
				.post('/auth/github')
				.reply(200, { access_token: 'access1' });
			
			utils.generateToken(options, function (error, body) {
				console.log(body);
				assert.ok(body);
				assert.equal(body, 'access1');
				done();
			});
		});
		
	});
	
	describe("testing listRepos", function () {
		
		it("Call listRepos", function (done) {
			nock('https://my.travis')
				.get('/repos/soajsTestAccount?access_token=access1')
				.reply(200, {
					repos: [
						{
							id: 12587674,
							slug: 'soajsTestAccount/test.success1',
							description: null,
							last_build_id: null,
							last_build_number: null,
							last_build_state: '',
							last_build_duration: null,
							last_build_language: null,
							last_build_started_at: null,
							last_build_finished_at: null,
							active: false,
							github_language: null
						},
						{
							id: 12801808,
							slug: 'soajsTestAccount/test.successMulti',
							description: null,
							last_build_id: null,
							last_build_number: null,
							last_build_state: '',
							last_build_duration: null,
							last_build_language: null,
							last_build_started_at: null,
							last_build_finished_at: null,
							active: false,
							github_language: null
						},
						{
							id: 8276532,
							slug: 'soajsTestAccount/uiDemo',
							description: null,
							last_build_id: null,
							last_build_number: null,
							last_build_state: '',
							last_build_duration: null,
							last_build_language: null,
							last_build_started_at: null,
							last_build_finished_at: null,
							active: false,
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
							active: false,
							github_language: null
						},
						{
							id: 12464663,
							slug: 'soajsTestAccount/validateConfig',
							description: null,
							active: false,
							github_language: null
						}
					]
				});
			
			options.variables = {
				SOAJS_CD_AUTH_KEY: 'aa39b54908c39565bd8d72f68ac',
				SOAJS_CD_DEPLOY_TOKEN: 'token',
				SOAJS_CD_DASHBOARD_DOMAIN: 'undefined.undefined',
				SOAJS_CD_API_ROUTE: '/cd/deploy',
				SOAJS_CD_DASHBOARD_PORT: '80',
				SOAJS_CD_DASHBOARD_PROTOCOL: 'http'
			};
			utils.listRepos(options, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
	});
	
	describe("testing listRepoBranches", function () {
		
		it("Call listRepoBranches", function (done) {
			nock('https://my.travis')
				.get('/repos/123456/branches?access_token=access1')
				.reply(200, {
					branches: [
						{
							commit_id: "",
							started_at: ""
						}
					],
					commits: [
						{
							branch: "develop",
							committed_a: ""
						}
					]
				});
			options.params = {
				repoId: 123456
			};
			utils.listRepoBranches(options, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
	});
	
	describe("testing updateEnvVar", function () {
		before(function (done) {
			nock('https://my.travis')
				.patch('/settings/env_vars?repository_id=123456?access_token=access1')
				.reply(200, {});
			done();
		});
		
		it("Call updateEnvVar", function (done) {
			
			var options = {
				log: {
					debug: function (data) {
						console.log(data);
					}
				},
				_id: 'aaa',
				driver: 'travis',
				settings: {
					envVar: {
						name: 'SOAJS_CD_API_ROUTE',
						value: '/cd/deploy',
						public: true
					},
					domain: 'my.travis',
					owner: 'soajsTestAccount',
					gitToken: 'mygitToken',
					ciToken: 'access1'
				},
				recipe: 'sudo:',
				type: 'ci',
				params: { repoId: 123456 }
			};
			utils.updateEnvVar(options, function (error, body) {
				console.log(error);
				console.log(body);
				// assert.ok(body);
				done();
			});
		});
	});
	
	describe("testing ensureRepoVars", function () {
		beforeEach(function (done) {
			nock('https://my.travis')
				.delete('/settings/env_vars/5eb00b12424d?repository_id=123456&access_token=access1')
				.reply(200, {});
			
			nock('https://my.travis')
				.post('/settings/env_vars?repository_id=123456&access_token=access1', {
					env_var: {
						name: 'SOAJS_CD_AUTH_KEY',
						value: "aa39b5490c72c39565bd8d72f68ac",
						public: false
					}
				})
				.reply(200, {
					env_var: {
						id: '12',
						name: 'SOAJS_CD_AUTH_KEY',
						value: "aa39b54908c39565bd8d72f68ac",
						public: false,
						repository_id: 123456
					}
				});

			nock('https://my.travis')
				.post('/settings/env_vars?repository_id=123456&access_token=access1', {
					env_var: {
						name: 'var2',
						value: "val2",
						public: true
					}
				})
				.reply(200, {
					env_var: {
						id: '15',
						name: 'var2',
						value: 'val2',
						public: true,
						repository_id: 123456
					}
				});

			nock('https://my.travis')
				.post('/settings/env_vars?repository_id=123456&access_token=access1', {
					env_var: {
						name: 'var1',
						value: "val1",
						public: true
					}
				})
				.reply(200, {
					env_var: {
						id: '17',
						name: 'var1',
						value: 'val1',
						public: true,
						repository_id: 123456
					}
				});

			nock('https://my.travis')
				.get('/settings/env_vars?repository_id=123456&access_token=access1')
				.reply(200, {
					env_vars: [
						{
							id: '1dc1cab6-87f4-b1ee425e9199',
							name: 'var1',
							value: 'val1',
							public: true,
							repository_id: 123456
						},
						{
							id: 'af6b4819-8f2b-9dd83959286a',
							name: 'var2',
							value: 'val2',
							public: true,
							repository_id: 123456
						},
						{
							id: 'f5c87b74-833d-5850b5dbc958',
							name: 'SOAJS_CD_API_ROUTE',
							value: '/cd/deploy',
							public: true,
							repository_id: 123456
						},
						{
							id: '430ecfdc-9b64-9fe3de71efcb',
							name: 'SOAJS_CD_DASHBOARD_PROTOCOL',
							value: 'http',
							public: true,
							repository_id: 123456
						}
					]
				});
			done();
		});
		
		it("Call addEnvVar", function (done) {
			var options = {
				log: {
					debug: function (data) {
					}
				},
				_id: 'aaa',
				driver: 'travis',
				settings: {
					envVar: {
						name: 'var2',
						value: "val2", public: true
					},
					domain: 'my.travis',
					owner: 'soajsTestAccount',
					gitToken: 'mygitToken',
					ciToken: 'access1'
				},
				recipe: 'sudo:',
				type: 'ci',
				params: { repoId: 123456 }
			};
			utils.addEnvVar(options, function (error, body) {
				assert.ok(body);
				assert.equal(body, true);
				done();
			});
		});
		
		it("Call updateEnvVar", function (done) {
			nock('https://my.travis')
				.patch('/settings/env_vars/18e99209-5eb00b12424d?repository_id=123456&access_token=access1', {
					env_var: {
						name: 'SOAJS_ROUTE',
						value: '/cd/deploy',
						public: true
					}
				})
				.reply(200, {});
			var options = {
				log: {
					debug: function (data) {
					}
				},
				_id: 'aaa',
				driver: 'travis',
				settings: {
					repoId: 123456,
					varID: '18e99209-5eb00b12424d',
					envVar: {
						name: 'SOAJS_ROUTE',
						value: '/cd/deploy',
						public: true
					},
					domain: 'my.travis',
					owner: 'soajsTestAccount',
					gitToken: 'mygitToken',
					ciToken: 'access1'
				},
				recipe: 'sudo:',
				type: 'ci',
				params: {
					// repoId: 123456
				}
			};
			utils.updateEnvVar(options, function (error, body) {
				assert.ok(body);
				assert.equal(body, true);
				done();
			});
		});
		
		it("Call deleteEnvVar", function (done) {
			var options = {
				log: {
					debug: function (data) {
					}
				},
				_id: 'aaa',
				driver: 'travis',
				settings: {
					varID: '5eb00b12424d',
					domain: 'my.travis',
					owner: 'soajsTestAccount',
					gitToken: 'mygitToken',
					ciToken: 'access1'
				},
				recipe: 'sudo:',
				type: 'ci',
				params: { repoId: 123456 },
				variables: {}
			};
			utils.deleteEnvVar(options, function (error, body) {
				assert.ok(body);
				assert.equal(body, true);
				done();
			});
		});
		
		it("Call listEnvVars", function (done) {
			var options = {
				log: {
					debug: function (data) {
					}
				},
				_id: 'aaa',
				driver: 'travis',
				settings: {
					domain: 'my.travis',
					owner: 'soajsTestAccount',
					gitToken: 'mygitToken',
					ciToken: 'access1'
				},
				recipe: 'sudo:',
				type: 'ci',
				params: { repoId: 123456 }
			};
			utils.listEnvVars(options, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
		it("Call ensureRepoVars Success", function (done) {
			nock('https://my.travis')
				.post('/settings/env_vars?repository_id=123456&access_token=access1', {
					env_var: {
						name: 'var1',
						value: 'val1',
						public: true
					}
				})
				.reply(200, {
					env_var: {
						id: '0aee984d',
						name: 'var1',
						value: 'val1',
						public: true,
						repository_id: 123456
					}
				});

			var options = {
				log: {
					debug: function (data) {
						// console.log(data);
					}
				},
				_id: '592806440e',
				driver: 'travis',
				settings: {
					domain: 'my.travis',
					owner: 'soajsTestAccount',
					gitToken: 'mygitToken',
					ciToken: 'access1'
				},
				recipe: 'sudo:',
				type: 'ci',
				params: {
					repoId: 123456,
					settings: {},
					variables: {
						var1: 'val1',
						var2: 'val2',
						SOAJS_CD_AUTH_KEY: 'aa39b5490c72c39565bd8d72f68ac'
					}
				}
			};
			utils.ensureRepoVars(options, function (error, body) {
				done();
			});
		});

		it("Call ensureRepoVars Fail", function (done) {
			var options = {
				log: {
					debug: function () {
					}
				},
				_id: '592806440e',
				driver: 'travis',
				settings: {
					domain: 'my.travis',
					owner: 'soajsTestAccount',
					gitToken: 'mygitToken',
					ciToken: 'access1'
				},
				recipe: 'sudo:',
				type: 'ci',
				params: {
					repoId: 123456,
					settings: {},
					variables: {}
				}
			};
			utils.ensureRepoVars(options, function (error, body) {
				done();
			});
		});

	});
	
	describe("testing updateSettings", function () {
		before(function (done) {
			nock('https://my.travis')
				.patch('/settings/env_vars?repository_id=123456&access_token=access1')
				.reply(200, {});
			done();
		});
		
		it("Call updateSettings", function (done) {
			var options = {
				log: {
					debug: function (data) {
						console.log(data);
					}
				},
				_id: 'aaa',
				driver: 'travis',
				settings: {
					domain: 'my.travis',
					owner: 'soajsTestAccount',
					gitToken: 'mygitToken',
					ciToken: 'access1'
				},
				recipe: 'sudo:',
				type: 'ci',
				params: {
					repoId: 123456,
					settings: {},
					variables: {
						var1: 'val1',
						var2: 'val2',
						SOAJS_CD_AUTH_KEY: 'aa39b5490c72c39565bd8d72f68ac'
					}
				}
			};
			utils.updateSettings(options, function (error, body) {
				// { error: 'Settings must be passed with a request' }
				// assert.ok(body);
				done();
			});
		});
	});

	// setHook
});