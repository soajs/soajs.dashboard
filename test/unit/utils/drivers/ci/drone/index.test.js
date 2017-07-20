'use strict';
var assert = require('assert');
const nock = require('nock');
var helper = require('../../../../../helper.js');
var utils = helper.requireModule('./utils/drivers/ci/drone/index.js');

describe('testing ci drone index.js', function () {
	var options = {
		log: {
			debug: function (data) {
				console.log('DATA', data);
			}
		},
		_id: 'aaa',
		driver: 'drone',
		settings: {
			domain: 'my.drone',
			owner: 'soajsTestAccount',
			repo: 'soajsTestRepo',
			gitToken: 'mygitToken',
			ciToken: 'access1'
		},
		recipe: '',
		type: 'ci',
		params: { repoId: 123456 }
	};
	
	beforeEach(function (done) {
		done();
	});
	afterEach(function (done) {
		done();
	});
	
	describe('testing generateToken', function () {
		
		it('Call generateToken', function (done) {
			utils.generateToken(options, function (error, body) {
				assert.equal(error, 'Not supported by Drone');
				done();
			});
		});
		
	});
	
	describe('testing listRepos', function () {
		
		it('Call listRepos will return 1 repo only', function (done) {
			const REPO = require('../../fixtures/drone/repos.json')[0];
			const BUILDS = require('../../fixtures/drone/builds.json');
			
			const nocks = nock('https://my.drone')
				.get('/api/repos/CLOUD/dashboard?access_token=access1')
				.reply(200, REPO)
				.get('/api/repos/CLOUD/dashboard/builds?access_token=access1')
				.reply(200, BUILDS);
			
			const options = {
				settings: {
					domain: 'my.drone',
					owner: 'CLOUD',
					repo: 'dashboard',
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
						active: true,
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
				
				assert.deepEqual(body, EXPECTED);
				assert.equal(nocks.isDone(), true);
				
				done();
			});
		});
		
		it('Call listRepos will return repos list', function (done) {
			const REPOS = require('../../fixtures/drone/repos.json');
			const BUILDS = require('../../fixtures/drone/builds.json');
			
			const nocks = nock('https://my.drone')
				.get('/api/user/repos?access_token=access1')
				.reply(200, REPOS)
				.get('/api/repos/CLOUD/dashboard/builds?access_token=access1')
				.reply(200, [BUILDS[0]])
				.get('/api/repos/CLOUD/console-server/builds?access_token=access1')
				.reply(200, [BUILDS[1], BUILDS[2]]);
			
			const options = {
				settings: {
					domain: 'my.drone',
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
						active: true,
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
						active: true,
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
				
				assert.deepEqual(body, EXPECTED);
				assert.equal(nocks.isDone(), true);
				
				done();
			});
		});
		
		describe('testing listRepoBranches', function () {
			const BUILDS = require('../../fixtures/drone/builds.json');
			
			it('Call listRepoBranches', function (done) {
				const nocks = nock('https://my.drone')
					.get('/api/repos/soajsTestAccount/soajsTestRepo/builds?access_token=access1')
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
				
				const nocks = nock('https://my.drone')
					.get('/api/repos/CLOUD/dashboard/secrets?access_token=access1')
					.reply(200, SECRETS);
				
				const options = {
					settings: {
						domain: 'my.drone',
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
							value: '',
							public: false,
							owner: 'CLOUD/dashboard'
						},
						{
							id: 2,
							name: 'ENV_NAME_2',
							value: '',
							public: false,
							owner: 'CLOUD/dashboard'
						},
						{
							id: 3,
							name: 'ENV_NAME_3',
							value: '',
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
				const nocks = nock('https://my.drone')
					.post('/api/repos/CLOUD/dashboard/secrets?access_token=access1', {
						name: 'SOAJS_CD_API_ROUTE',
						value: '/cd/deploy'
					})
					.reply(200, {});
				
				const options = {
					settings: {
						domain: 'my.drone',
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
				const nocks = nock('https://my.drone')
					.post('/api/repos/CLOUD/dashboard/secrets?access_token=access1', {
						name: 'SOAJS_CD_API_ROUTE',
						value: '/cd/deploy'
					})
					.reply(200, {});
				
				const options = {
					settings: {
						domain: 'my.drone',
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
				const nocks = nock('https://my.drone')
					.delete('/api/repos/CLOUD/dashboard/secrets/SECRET_NAME?access_token=access1')
					.reply(200, {});
				
				const options = {
					settings: {
						domain: 'my.drone',
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
				
				const nocks = nock('https://my.drone')
					.get('/api/repos/CLOUD/dashboard/secrets?access_token=access1')
					.reply(200, SECRETS)
					// deletes all envs
					.delete('/api/repos/CLOUD/dashboard/secrets/ENV_NAME_1?access_token=access1')
					.reply(200, {})
					.delete('/api/repos/CLOUD/dashboard/secrets/ENV_NAME_2?access_token=access1')
					.reply(200, {})
					.delete('/api/repos/CLOUD/dashboard/secrets/ENV_NAME_3?access_token=access1')
					.reply(200, {})
					.post('/api/repos/CLOUD/dashboard/secrets?access_token=access1', {
						name: 'ENV_NAME_1',
						value: 'ENV_VALUE_1'
					})
					.reply(200, {})
					.post('/api/repos/CLOUD/dashboard/secrets?access_token=access1', {
						name: 'ENV_NAME_2',
						value: 'ENV_VALUE_2'
					})
					.reply(200, {});
				
				const options = {
					settings: {
						domain: 'my.drone',
						owner: 'CLOUD',
						repo: 'dashboard',
						ciToken: 'access1'
					},
					params: {
						variables: {
							ENV_NAME_1: 'ENV_VALUE_1',
							ENV_NAME_2: 'ENV_VALUE_2'
						}
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
			const nocks = nock('https://my.drone')
				.patch('/api/repos/CLOUD/dashboard?access_token=access1', {
					owner: 'CLOUD',
					name: 'dashboard',
					allow_push: true,
					allow_pr: true
				})
				.reply(200, {
					result: true
				});
			
			it('Call setHook', function (done) {
				const options = {
					settings: {
						domain: 'my.drone',
						owner: 'CLOUD',
						repo: 'dashboard',
						ciToken: 'access1'
					},
					hook: {
						allow_push: true,
						allow_pr: true
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
			it('Call listSettings', function (done) {
				utils.listSettings({}, function (error, body) {
					assert.equal(error, 'Not supported by Drone');
					done();
				});
			});
		});
		
		describe('testing updateSettings', function () {
			it('Call updateSettings', function (done) {
				utils.updateSettings({}, function (error, body) {
					assert.equal(error, 'Not supported by Drone');
					done();
				});
			});
		});
	});
});
