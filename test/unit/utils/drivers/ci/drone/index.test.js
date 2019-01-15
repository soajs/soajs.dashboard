'use strict';
var assert = require('assert');
const nock = require('nock');
var helper = require('../../../../../helper.js');
var utils = helper.requireModule('./utils/drivers/ci/drone/index.js');


describe('testing ci drone index.js', function () {
	const headers = {
		reqheaders: {
			'Content-Type': 'application/json',
			'Accept': 'application/json',
			'Host': 'my.drone',
			'Authorization': 'access1'
		}
	};
	var options = {
		log: {
			debug: function (data) {
				console.log('DATA', data);
			}
		},
		_id: 'aaa',
		driver: 'drone',
		settings: {
			domain: 'https://my.drone',
			owner: 'soajsTestAccount',
			repo: 'soajsTestRepo',
			gitToken: 'mygitToken',
			ciToken: 'access1'
		},
		recipe: '',
		type: 'ci',
		params: {repoId: 123456}
	};

	beforeEach(function (done) {
		done();
	});
	afterEach(function (done) {
		done();
	});

	describe('testing getFileName', function () {

		it('Call getFileName', function (done) {
			utils.getFileName(function (error, body) {
				assert.deepEqual(body, '.drone.yml');
				done();
			});
		});

	});
	
	describe('testing generateToken', function () {
		
		it('Call generateToken', function (done) {
			utils.generateToken(options, function (error, body) {
				assert.deepEqual(options.settings.gitToken, 'mygitToken');
				done();
			});
		});
		
	});

	describe('testing listRepos', function () {

		it('Call listRepos will return 1 repo only', function (done) {
			const REPO = require('../../fixtures/drone/repos.json')[0];
			const BUILDS = require('../../fixtures/drone/build-1.json');

			const nocks = nock('https://my.drone', headers)
				.get('/api/repos/dashboard')
				.reply(200, REPO)
				.get('/api/repos/CLOUD/dashboard/builds')
				.reply(200, BUILDS);

			const options = {
				log: {
					debug: function (data) {
						console.log('DATA', data);
					}
				},
				settings: {
					domain: 'https://my.drone',
					owner: 'CLOUD',
					repo: 'dashboard',
					gitToken: 'mygitToken',
					ciToken: 'access1'
				},
				variables: {
					SOAJS_CD_AUTH_KEY: 'aa39b54908c39565bd8d72f68ac',
					SOAJS_CD_DEPLOY_TOKEN: 'token',
					SOAJS_CD_DASHBOARD_DOMAIN: 'dashboard-api.soajs.org',
					SOAJS_CD_API_ROUTE: '/cd/deploy',
					SOAJS_CD_DASHBOARD_PORT: '80',
					SOAJS_CD_DASHBOARD_PROTOCOL: 'http'
				}
			};

			utils.listRepos(options, function (error, body) {
				const EXPECTED = [
					{
						id: 45,
						name: 'CLOUD/dashboard',
						description: '',
						branches: [
							{
								name: 'master',
								lastCommit: new Date(1498138365 * 1000),
								lastBuild: new Date(1498138365 * 1000),
								state: 'success',
							},
							{
								name: 'develop',
								lastCommit: new Date(1498137476 * 1000),
								lastBuild: new Date(1498137476 * 1000),
								state: 'success',
							}
						]
					}
				];

				delete body[0].active;
				assert.deepEqual(body, EXPECTED);
				assert.equal(nocks.isDone(), true);
				done();
			});
		});

		it('Call listRepos will return repos list', function (done) {
			const REPOS = require('../../fixtures/drone/repos.json');
			const BUILDS = require('../../fixtures/drone/build-1.json');

			const nocks = nock('https://my.drone', headers)
				.get('/api/user/repos')
				.reply(200, REPOS)
				.get('/api/repos/CLOUD/dashboard/builds')
				.reply(200, [BUILDS[0]])
				.get('/api/repos/CLOUD/console-server/builds')
				.reply(200, [BUILDS[1], BUILDS[2]]);

			const options = {
				log: {
					debug: function (data) {
						console.log('DATA', data);
					}
				},
				settings: {
					domain: 'https://my.drone',
					gitToken: 'mygitToken',
					ciToken: 'access1'
				},
				variables: {
					SOAJS_CD_AUTH_KEY: 'aa39b54908c39565bd8d72f68ac',
					SOAJS_CD_DEPLOY_TOKEN: 'token',
					SOAJS_CD_DASHBOARD_DOMAIN: 'undefined.undefined',
					SOAJS_CD_API_ROUTE: '/cd/deploy',
					SOAJS_CD_DASHBOARD_PORT: '80',
					SOAJS_CD_DASHBOARD_PROTOCOL: 'http'
				}
			};

			utils.listRepos(options, function (error, body) {
				const EXPECTED = [
					{
						id: 45,
						name: 'CLOUD/dashboard',
						description: '',
						branches: [
							{
								name: 'master',
								lastCommit: new Date(1498138365 * 1000),
								lastBuild: new Date(1498138365 * 1000),
								state: 'success',
							}
						]
					},
					{
						id: 46,
						name: 'CLOUD/console-server',
						description: '',
						branches: [
							{
								name: 'develop',
								lastCommit: new Date(1498137476 * 1000),
								lastBuild: new Date(1498137476 * 1000),
								state: 'success',
							},
							{
								name: 'master',
								lastCommit: new Date(1496946780 * 1000),
								lastBuild: new Date(1496946781 * 1000),
								state: 'success',
							}
						]
					}
				];

				delete body[0].active;
				delete body[1].active;
				assert.deepEqual(body, EXPECTED);
				assert.equal(nocks.isDone(), true);
				done();
			});
		});

		it('get repos on inactive', function (done) {
			const nocks = nock('https://my.drone', headers)
				.get('/api/user/repos')
				.reply(200, null);

			const options = {
				log: {
					debug: function (data) {
						console.log('DATA', data);
					}
				},
				settings: {
					domain: 'https://my.drone',
					gitToken: 'mygitToken',
					ciToken: 'access1'
				},
				variables: {
					SOAJS_CD_AUTH_KEY: 'aa39b54908c39565bd8d72f68ac',
					SOAJS_CD_DEPLOY_TOKEN: 'token',
					SOAJS_CD_DASHBOARD_DOMAIN: 'undefined.undefined',
					SOAJS_CD_API_ROUTE: '/cd/deploy',
					SOAJS_CD_DASHBOARD_PORT: '80',
					SOAJS_CD_DASHBOARD_PROTOCOL: 'http'
				}
			};

			utils.listRepos(options, function (error, body) {
				const EXPECTED = [{
					id: null,
					active: false,
					owner: options.settings.owner,
					name: options.settings.repo,
					full_name: options.settings.owner + "/" + options.settings.repo,
					scm: "",
					clone_url: "",
					default_branch: "",
					visibility: "public"
				}];
				assert.deepEqual(body, EXPECTED);
				assert.equal(nocks.isDone(), true);
				done();
			});
		});

		it('no repositories found', function (done) {
			const nocks = nock('https://my.drone', headers)
				.get('/api/user/repos')
				.reply(200, []);

			const options = {
				log: {
					debug: function (data) {
						console.log('DATA', data);
					}
				},
				settings: {
					domain: 'https://my.drone',
					gitToken: 'mygitToken',
					ciToken: 'access1'
				},
				variables: {
					SOAJS_CD_AUTH_KEY: 'aa39b54908c39565bd8d72f68ac',
					SOAJS_CD_DEPLOY_TOKEN: 'token',
					SOAJS_CD_DASHBOARD_DOMAIN: 'undefined.undefined',
					SOAJS_CD_API_ROUTE: '/cd/deploy',
					SOAJS_CD_DASHBOARD_PORT: '80',
					SOAJS_CD_DASHBOARD_PROTOCOL: 'http'
				}
			};

			utils.listRepos(options, function (error, body) {
				const EXPECTED = [];
				assert.deepEqual(body, EXPECTED);
				assert.equal(nocks.isDone(), true);
				done();
			});
		});

		it('error while fetching repositories', function (done) {
			const nocks = nock('https://my.drone', headers)
				.get('/api/user/repos')
				.reply(200, [null]);

			const options = {
				log: {
					debug: function (data) {
						console.log('DATA', data);
					}
				},
				settings: {
					domain: 'https://my.drone',
					gitToken: 'mygitToken',
					ciToken: 'access1'
				},
				variables: {
					SOAJS_CD_AUTH_KEY: 'aa39b54908c39565bd8d72f68ac',
					SOAJS_CD_DEPLOY_TOKEN: 'token',
					SOAJS_CD_DASHBOARD_DOMAIN: 'undefined.undefined',
					SOAJS_CD_API_ROUTE: '/cd/deploy',
					SOAJS_CD_DASHBOARD_PORT: '80',
					SOAJS_CD_DASHBOARD_PROTOCOL: 'http'
				}
			};

			utils.listRepos(options, function (error, body) {
				assert.ok(error);
				assert.equal(nocks.isDone(), true);
				done();
			});
		});
	});

	describe('testing listRepoBranches', function () {
		const BUILDS = require('../../fixtures/drone/build-1.json');

		it('Call listRepoBranches', function (done) {
			const nocks = nock('https://my.drone', headers)
				.get('/api/repos/soajsTestAccount/soajsTestRepo/builds')
				.reply(200, BUILDS);

			utils.listRepoBranches(options, function (error, body) {
				const EXPECTED = [
					{
						name: 'master',
						lastCommit: new Date(1498138365 * 1000),
						lastBuild: new Date(1498138365 * 1000),
						state: 'success',
					},
					{
						name: 'develop',
						lastCommit: new Date(1498137476 * 1000),
						lastBuild: new Date(1498137476 * 1000),
						state: 'success',
					}
				];
				assert.deepEqual(body, EXPECTED);
				assert.equal(nocks.isDone(), true);

				done();
			});
		});

	});

	describe('testing listEnvVars', function () {
		it('Call listEnvVars', function (done) {
			const SECRETS = require('../../fixtures/drone/secrets.json');

			const nocks = nock('https://my.drone', headers)
				.get('/api/repos/CLOUD/dashboard/secrets')
				.reply(200, SECRETS);

			const options = {
				log: {
					debug: function (data) {
						console.log('DATA', data);
					}
				},
				settings: {
					domain: 'https://my.drone',
					owner: 'CLOUD',
					repo: 'dashboard',
					ciToken: 'access1'
				},
			};

			utils.listEnvVars(options, function (error, body) {
				const EXPECTED = [
					{
						id: 1,
						name: 'ENV_NAME_1',
						value: 'ENV_VALUE_1',
						public: false,
						owner: 'CLOUD/dashboard'
					},
					{
						id: 2,
						name: 'ENV_NAME_2',
						value: 'ENV_VALUE_2',
						public: false,
						owner: 'CLOUD/dashboard'
					},
					{
						id: 3,
						name: 'ENV_NAME_3',
						value: 'ENV_VALUE_3',
						public: false,
						owner: 'CLOUD/dashboard'
					}
				];

				assert.deepEqual(body, EXPECTED);
				assert.equal(nocks.isDone(), true);

				done();
			});
		});
	});

	describe('testing addEnvVar', function () {
		it('Call addEnvVar', function (done) {
			const nocks = nock('https://my.drone', headers)
				.post('/api/repos/CLOUD/dashboard/secrets', {
					name: 'SOAJS_CD_API_ROUTE',
					value: '/cd/deploy'
				})
				.reply(200, {});

			const options = {
				log: {
					debug: function (data) {
						console.log('DATA', data);
					}
				},
				settings: {
					domain: 'https://my.drone',
					owner: 'CLOUD',
					repo: 'dashboard',
					ciToken: 'access1',
					envVar: {
						name: 'SOAJS_CD_API_ROUTE',
						value: '/cd/deploy'
					}
				},
			};

			utils.addEnvVar(options, function (error, body) {
				assert.equal(body, true);
				assert.equal(nocks.isDone(), true);

				done();
			});
		});
	});

// same as addEnvVar...
	describe('testing updateEnvVar', function () {
		it('Call updateEnvVar', function (done) {
			const nocks = nock('https://my.drone', headers)
				.post('/api/repos/CLOUD/dashboard/secrets', {
					name: 'SOAJS_CD_API_ROUTE',
					value: '/cd/deploy'
				})
				.reply(200, {});

			const options = {
				log: {
					debug: function (data) {
						console.log('DATA', data);
					}
				},
				settings: {
					domain: 'https://my.drone',
					owner: 'CLOUD',
					repo: 'dashboard',
					ciToken: 'access1',
					envVar: {
						name: 'SOAJS_CD_API_ROUTE',
						value: '/cd/deploy'
					}
				},
			};

			utils.updateEnvVar(options, function (error, body) {
				assert.equal(body, true);
				assert.equal(nocks.isDone(), true);

				done();
			});
		});
	});

	describe('testing deleteEnvVar', function () {
		it('Call deleteEnvVar', function (done) {

			const nocks = nock('https://my.drone', headers)
				.delete('/api/repos/CLOUD/dashboard/secrets/SECRET_NAME')
				.reply(200, {});

			const options = {
				log: {
					debug: function (data) {
						console.log('DATA', data);
					}
				},
				settings: {
					domain: 'https://my.drone',
					owner: 'CLOUD',
					repo: 'dashboard',
					name: 'SECRET_NAME',
					ciToken: 'access1'
				},
			};

			utils.deleteEnvVar(options, function (error, body) {
				assert.equal(body, true);
				assert.equal(nocks.isDone(), true);

				done();
			});
		});
	});

	describe('testing ensureRepoVars', function () {
		it('Call ensureRepoVars', function (done) {
			const SECRETS = require('../../fixtures/drone/secrets.json');

			const nocks = nock('https://my.drone', headers)
				.get('/api/repos/CLOUD/dashboard/secrets')
				.reply(200, SECRETS)
				// deletes all envs
				.delete('/api/repos/CLOUD/dashboard/secrets/ENV_NAME_1')
				.reply(200, {})
				.delete('/api/repos/CLOUD/dashboard/secrets/ENV_NAME_2')
				.reply(200, {})
				.delete('/api/repos/CLOUD/dashboard/secrets/ENV_NAME_3')
				.reply(200, {})
				.post('/api/repos/CLOUD/dashboard/secrets', {
					name: 'ENV_NAME_1',
					value: 'ENV_VALUE_1'
				})
				.reply(200, {})
				.post('/api/repos/CLOUD/dashboard/secrets', {
					name: 'ENV_NAME_2',
					value: 'ENV_VALUE_2'
				})
				.reply(200, {});

			const options = {
				log: {
					debug: function (data) {
						console.log('DATA', data);
					}
				},
				settings: {
					domain: 'https://my.drone',
					owner: 'CLOUD',
					repo: 'dashboard',
					ciToken: 'access1'
				},
				params: {
					repoOwner: 'CLOUD',
					variables: [{
						name: 'ENV_NAME_1',
						value: 'ENV_VALUE_1'
					},
						{
							name: 'ENV_NAME_2',
							value: 'ENV_VALUE_2'
						}]
				}
			};

			utils.ensureRepoVars(options, function (error, body) {
				assert.equal(body, true);
				assert.equal(nocks.isDone(), true);

				done();
			});
		});
	});

	describe('testing setHook', function () {
		const BUILDS = require('../../fixtures/drone/build-1.json');
		it('Call activate setHook', function (done) {
			const nocks = nock('https://my.drone', headers)
				.post('/api/repos/CLOUD/dashboard')
				.reply(200, BUILDS);
			const options = {
				log: {
					debug: function (data) {
						console.log('DATA', data);
					}
				},
				settings: {
					domain: 'https://my.drone',
					owner: 'CLOUD',
					repo: 'myrepo/dashboard',
					ciToken: 'access1'
				},
				hook: {
					active: true
				}
			};
			utils.setHook(options, function (error, body) {
				assert.equal(body, true);
				assert.equal(nocks.isDone(), true);

				done();
			});
		});
		it('Call deactivate setHook', function (done) {
			const nocks = nock('https://my.drone', headers)
				.delete('/api/repos/CLOUD/dashboard')
				.reply(200, {
					result: true
				});
			const options = {
				log: {
					debug: function (data) {
						console.log('DATA', data);
					}
				},
				settings: {
					domain: 'https://my.drone',
					owner: 'CLOUD',
					repo: 'myrepo/dashboard',
					ciToken: 'access1'
				},
				hook: {
					active: false
				}
			};
			utils.setHook(options, function (error, body) {
				assert.equal(body, true);
				assert.equal(nocks.isDone(), true);

				done();
			});
		});
	});

	describe('testing listSettings', function () {
		const REPO = require('../../fixtures/drone/repos.json')[0];

		it('Call listSettings', function (done) {
			const nocks = nock('https://my.drone', headers)
				.get('/api/repos/CLOUD/dashboard')
				.reply(200, REPO);

			const options = {
				log: {
					debug: function (data) {
						console.log('DATA', data);
					}
				},
				settings: {
					domain: 'https://my.drone',
					owner: 'CLOUD',
					repo: 'dashboard',
					ciToken: 'access1'
				},
				hook: {
					active: true
				}
			};
			var expected = REPO;
			expected.repoCiId = 'dashboard';
			expected.active = false;
			utils.listSettings(options, function (error, body) {
				assert.deepEqual(body, expected);
				assert.equal(nocks.isDone(), true);
				done();
			});
		});
		it('get repos on inactive', function (done) {
			const nocks = nock('https://my.drone', headers)
				.get('/api/repos/CLOUD/dashboard')
				.reply(200, null);

			const options = {
				log: {
					debug: function (data) {
						console.log('DATA', data);
					}
				},
				settings: {
					domain: 'https://my.drone',
					owner: 'CLOUD',
					repo: 'dashboard',
					ciToken: 'access1'
				},
				hook: {
					active: true
				}
			};

			utils.listSettings(options, function (error, body) {
				const EXPECTED = {
					id: null,
					active: false,
					owner: options.settings.owner,
					name: options.settings.repo,
					full_name: options.settings.owner + "/" + options.settings.repo,
					scm: "",
					clone_url: "",
					default_branch: "",
					visibility: "public",
					repoCiId: 'dashboard'
				};
				assert.deepEqual(body, EXPECTED);
				assert.equal(nocks.isDone(), true);
				done();
			});
		});

		it('no repositories found', function (done) {
			const nocks = nock('https://my.drone', headers)
				.get('/api/repos/CLOUD/dashboard')
				.reply(200, []);

			const options = {
				log: {
					debug: function (data) {
						console.log('DATA', data);
					}
				},
				settings: {
					domain: 'https://my.drone',
					owner: 'CLOUD',
					repo: 'dashboard',
					ciToken: 'access1'
				},
				hook: {
					active: true
				}
			};

			utils.listSettings(options, function (error, body) {
				const EXPECTED = {
					repoCiId: 'dashboard',
					active: false
				};
				assert.deepEqual(body, EXPECTED);
				assert.equal(nocks.isDone(), true);
				done();
			});
		});
	});

	describe('testing updateSettings', function () {
		it('Call updateSettings', function (done) {
			const REPO = require('../../fixtures/drone/repos.json')[0];
			const nocks = nock('https://my.drone', headers)
				.patch('/api/repos/CLOUD/dashboard', {
					"name": 'dashboard',
					"owner": 'CLOUD',
					"allow_tags": true,
					"allow_tag": true
				})
				.reply(200, REPO)
				.patch('/api/repos/CLOUD/dashboard', {
					"name": 'dashboard',
					"owner": 'CLOUD',
					"allow_deploys": true,
					"allow_deploy": true
				})
				.reply(200, REPO);

			const options = {
				log: {
					debug: function (data) {
						console.log('DATA', data);
					}
				},
				settings: {
					domain: 'https://my.drone',
					owner: 'CLOUD',
					repo: 'dashboard',
					ciToken: 'access1'
				},
				params: {
					repoId: 'dashboard',
					repoOwner: 'CLOUD',
					settings: {
						"allow_tags": true,
						"allow_deploys": true
					}
				}
			};
			utils.updateSettings(options, function (error, body) {
				assert.equal(body, true);
				assert.equal(nocks.isDone(), true);
				done();
			});

		});

		it('updateSettings with Insufficient privileges', function (done) {
			const REPO = require('../../fixtures/drone/repos.json')[0];
			const nocks = nock('https://my.drone', headers)
				.patch('/api/repos/CLOUD/dashboard', {
					"name": 'dashboard',
					"owner": 'CLOUD',
					"allow_tags": true,
					"allow_tag": true
				})
				.reply(200, REPO)
				.patch('/api/repos/CLOUD/dashboard', {
					"name": 'dashboard',
					"owner": 'CLOUD',
					"allow_deploys": true,
					"allow_deploy": true
				})
				.reply(200, "Insufficient privileges");

			const options = {
				log: {
					debug: function (data) {
						console.log('DATA', data);
					}
				},
				settings: {
					domain: 'https://my.drone',
					owner: 'CLOUD',
					repo: 'dashboard',
					ciToken: 'access1'
				},
				params: {
					repoOwner: 'CLOUD',
					repoId: 'dashboard',
					settings: {
						"allow_tags": true,
						"allow_deploys": true
					}
				}
			};
			utils.updateSettings(options, function (error, body) {
				assert.ok(error);
				assert.equal(nocks.isDone(), true);
				done();
			});

		});

		it('error in updating', function (done) {
			const REPO = require('../../fixtures/drone/repos.json')[0];
			const nocks = nock('https://my.drone', headers)
				.patch('/api/repos/CLOUD/dashboard', {
					"name": 'dashboard',
					"owner": 'CLOUD',
					"allow_tags": true,
					"allow_tag": true
				})
				.reply(200, REPO)
				.patch('/api/repos/CLOUD/dashboard', {
					"name": 'dashboard',
					"owner": 'CLOUD',
					"allow_deploys": true,
					"allow_deploy": true
				})
				.reply(400, {
					error: {
						"message": "error"
					}
				});

			const options = {
				log: {
					debug: function (data) {
						console.log('DATA', data);
					},
					error: function (data) {
						console.log('DATA', data);
					}
				},
				settings: {
					domain: 'https://my.drone',
					owner: 'CLOUD',
					repo: 'dashboard',
					ciToken: 'access1'
				},
				params: {
					repoOwner: 'CLOUD',
					repoId: 'dashboard',
					settings: {
						"allow_tags": true,
						"allow_deploys": true
					}
				}
			};
			utils.updateSettings(options, function (error, body) {
				assert.equal(body, true);
				assert.equal(nocks.isDone(), true);
				done();
			});

		});
	});
	
	describe('testing getRepoBuilds', function () {
		it('fail', function (done) {

			var options = {
				driver: 'drone',
				settings: {
					domain: 'https://my.drone',
					owner: 'CLOUD',
					repo: 'dashboard',
					ciToken: 'access1'
				},
				log: {
					debug: function (data) {
						console.log('DATA', data);
					}
				},
				params: {
					repo: '/dashboard',
					gitDomain: 'https://my.drone'
				}
			};
			utils.getRepoBuilds(options, function (error, body) {
				assert.equal(error.code, 971);
				done();
			});
		});
		
		it('success 1st', function (done) {
			const BUILDS = require('../../fixtures/drone/build-2.json');
			const BUILDS_INFO = require('../../fixtures/drone/build-2-info.json');
			const BUILDS_LOGS_1 = require('../../fixtures/drone/build-2-logs-1.json');
			const BUILDS_LOGS_2 = require('../../fixtures/drone/build-2-logs-2.json');
			const nocks = nock('https://my.drone', headers)
				.get('/api/repos/CLOUD/dashboard/builds')
				.reply(200, BUILDS)
				.get('/api/repos/CLOUD/dashboard/builds/1')
				.reply(200, BUILDS_INFO)
				.get('/api/repos/CLOUD/dashboard/logs/1/2')
				.reply(200, BUILDS_LOGS_1)
				.get('/api/repos/CLOUD/dashboard/logs/1/3')
				.reply(200, BUILDS_LOGS_2);
			
				
			var options = {
				driver: 'drone',
				settings: {
					domain: 'https://my.drone',
					owner: 'CLOUD',
					repo: 'dashboard',
					ciToken: 'access1'
				},
				log: {
					debug: function (data) {
						console.log('DATA', data);
					}
				},
				params: {
					repo: '/dashboard',
					gitDomain: 'https://my.drone'
				}
			};
			utils.getRepoBuilds(options, function (error, body) {
				const EXPECTED = {
					commit_id: '4ddb5fb85abc91d83d03ef8e9d22ed0b3c942c3a'
				};
				assert.deepEqual(body.master.commit_id, EXPECTED.commit_id);
				assert.equal(nocks.isDone(), true);
				done();
			});
		});
	});

})
;
