"use strict";
const assert = require("assert");
const helper = require("../../../helper.js");
const helpers = helper.requireModule('./lib/cd/helper.js');
const deployBL = helper.requireModule('./lib/cloud/deploy/index.js');

const nock = require('nock');
const sinon = require('sinon');

var config = {
	docker: {
		url: 'http://my.docker.com'
	}
};
var mongoStub = {
	checkForMongo: function (soajs) {
		return true;
	},
	validateId: function (soajs, cb) {
		return cb(null, soajs.inputmaskData.id);
	},
	findEntry: function (soajs, opts, cb) {
		cb(null, {});
	},
	removeEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	saveEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	insertEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	switchConnection: function (soajs) {
		return true;
	}
};
var deployer = {
	redeployService: function (options, cb) {
		return cb(null, true);
	},
	listServices: function (options, cb) {
		var services = [];
		return cb(null, services);
	},
	deployService: function (options, cb) {
		return cb(null, true);
	}
	
};
var BL = {
	model: mongoStub
};

describe("testing helper soajs.cd.js", function () {
	var soajs = {
		registry: {
			coreDB: {
				provision: {}
			}
		},
		log: {
			debug: function (data) {
				if (process.env.SOAJS_DEBUG_LOGS) console.log(data);
			},
			error: function (data) {
				if (process.env.SOAJS_DEBUG_LOGS) console.log(data);
			},
			info: function (data) {
				if (process.env.SOAJS_DEBUG_LOGS) console.log(data);
			},
			warn: function (data) {
				if (process.env.SOAJS_DEBUG_LOGS) console.log(data);
			}
		},
		inputmaskData: {},
		tenant: {
			application: {}
		}
	};
	var req = {
		soajs: soajs
	};
	var envRecord = {
		code: 'DEV',
		environment: 'dev',
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
		dbs: {},
		services: {},
		profile: ''
	};
	
	describe("testing deepVersionComparison", function () {
		var oneImage = {}, tag = "", opts = {}, newObj = {};
		before(function (done) {
			oneImage = { name: '1.0.x-1.0.x', last_updated: 1499852120 };
			opts.imageInfo = { prefix: 'soajsorg' };
			tag = '1.0.x-1.0.x';
			newObj.image = {};
			done();
		});
		
		it("success - no update detected, official image", function (done) {
			var result = helpers.deepVersionComparison(oneImage, tag, opts, newObj);
			assert.ok(result);
			done();
		});
		
		it("success - deployer update detected, official image", function (done) {
			oneImage.name = '1.1.x-1.0.x';
			var result = helpers.deepVersionComparison(oneImage, tag, opts, newObj);
			assert.ok(result);
			assert.ok(result[0]);
			done();
		});
		
		it("success - core update detected, official image", function (done) {
			oneImage.name = '1.0.x-1.1.x';
			var result = helpers.deepVersionComparison(oneImage, tag, opts, newObj);
			assert.ok(result);
			assert.ok(result[0]);
			done();
		});
		
		it("success - image update, custom image", function (done) {
			opts.imageInfo.prefix = 'soajstest';
			oneImage.name = '2.0';
			tag = '1.0';
			var result = helpers.deepVersionComparison(oneImage, tag, opts, newObj);
			assert.ok(result);
			assert.ok(result[0]);
			done();
		});
		
		it("success - image tag is not a number", function (done) {
			tag = "testing";
			var result = helpers.deepVersionComparison(oneImage, tag, opts, newObj);
			assert.ok(result);
			assert.ok(result[0]);
			done();
		});
		
	});
	
	describe("testing processUndeployedServices", function () {
		var deployedServices = [], allServices = [], cdInfo = {};
		
		before(function (done) {
			deployedServices.push({
				service: {
					id: 'rp11111exmaol22',
					version: 18000,
					name: 'dev-testDaemon2-testGroup2-v1',
					labels: {
						'service.branch': 'master',
						'service.image.ts': '1496063663358',
						'soajs.catalog.id': '593038623b872a839c7bccea',
						'soajs.catalog.v': '1',
						'soajs.content': 'true',
						'soajs.env.code': 'dev',
						'soajs.service.name': 'testDaemon2',
						'soajs.service.group': '',
						'soajs.service.mode': 'replicated',
						'soajs.service.type': 'daemon',
						'soajs.daemon.group': 'testGroup2',
						'soajs.service.version': '1'
					},
					env: [
						'NODE_ENV=production',
						'SOAJS_ENV=dev',
						'SOAJS_PROFILE=/opt/soajs/FILES/profiles/profile.js',
						'SOAJS_SRV_AUTOREGISTERHOST=true',
						'SOAJS_SRV_MEMORY=200',
						'SOAJS_GIT_OWNER=soajs',
						'SOAJS_GIT_BRANCH=master',
						'SOAJS_GIT_COMMIT=67a61db0955803cddf94672b0192be28f47cf280',
						'SOAJS_GIT_REPO=soajs.controller',
						'SOAJS_DEPLOY_HA=swarm',
						'SOAJS_HA_NAME={{.Task.Name}}',
						'SOAJS_MONGO_NB=1',
						'SOAJS_MONGO_IP_1=127.0.0.1',
						'SOAJS_MONGO_PORT_1=27017',
						'SOAJS_DEPLOY_ACC=true',
						'SOAJS_DAEMON_GRP_CONF=testGroup2'
					],
					ports: [],
					tasks: [],
					repo: 'soajs.testDaemon2',
					branch: 'master'
				}
			});
			
			allServices.push(
				{
					serviceName: 'testSrv',
					serviceVersion: '1',
					label: 'testSrv',
					type: 'service'
				},
				{
					serviceName: 'testDaemon',
					serviceVersion: '1',
					label: 'testDaemon',
					type: 'daemon',
					group: 'testGroup'
				}
			);
			
			cdInfo = {
				DEV: {
					envConfig: {
						branch: 'master',
						strategy: 'notify',
						testSrv: {
							type: 'service',
							branch: 'master',
							strategy: 'update',
							deploy: true,
							options: {
								gitSource: {
									commit: 'commitsha'
								}
							},
							v1: {
								strategy: 'notify',
								branch: 'master',
								deploy: true,
								options: {
									gitSource: {
										commit: 'commitsha'
									}
								}
							}
						},
						testDaemon: {
							type: 'daemon',
							v1: {
								testGroup: {
									strategy: 'notify',
									branch: 'master',
									deploy: true,
									options: {
										gitSource: {
											commit: 'commitsha'
										},
										custom: {
											type: 'daemon',
											daemonGroup: 'testGroup'
										}
									}
								}
							}
						}
					},
					envRecord: envRecord
				}
			};
			done();
		});
		
		it("success - will build list of undeployed services, version specified", function (done) {
			req.soajs.inputmaskData = {
				repo: 'testSrv-repo',
				branch: 'master',
				commit: 'commitsha'
			};
			helpers.processUndeployedServices(req, deployedServices, allServices, cdInfo, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
		it("success - will build list of undeployed services, version not specified", function (done) {
			req.soajs.inputmaskData = {
				repo: 'testSrv-repo',
				branch: 'master',
				commit: 'commitsha'
			};
			delete allServices[0].serviceVersion;
			helpers.processUndeployedServices(req, deployedServices, allServices, cdInfo, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
		it("success - will build list of one service, daemon specified is already deployed", function (done) {
			deployedServices = [
				{
					service: {
						id: 'rp11111exmaol22',
						version: 18000,
						name: 'dev-testDaemon-testGroup-v1',
						labels: {
							'service.branch': 'master',
							'service.image.ts': '1496063663358',
							'soajs.catalog.id': '593038623b872a839c7bccea',
							'soajs.catalog.v': '1',
							'soajs.content': 'true',
							'soajs.env.code': 'dev',
							'soajs.service.name': 'testDaemon',
							'soajs.service.group': '',
							'soajs.service.mode': 'replicated',
							'soajs.service.type': 'daemon',
							'soajs.daemon.group': 'testGroup',
							'soajs.service.version': '1'
						},
						env: [
							'NODE_ENV=production',
							'SOAJS_ENV=dev',
							'SOAJS_PROFILE=/opt/soajs/FILES/profiles/profile.js',
							'SOAJS_SRV_AUTOREGISTERHOST=true',
							'SOAJS_SRV_MEMORY=200',
							'SOAJS_GIT_OWNER=soajs',
							'SOAJS_GIT_BRANCH=master',
							'SOAJS_GIT_COMMIT=67a61db0955803cddf94672b0192be28f47cf280',
							'SOAJS_GIT_REPO=soajs.controller',
							'SOAJS_DEPLOY_HA=swarm',
							'SOAJS_HA_NAME={{.Task.Name}}',
							'SOAJS_MONGO_NB=1',
							'SOAJS_MONGO_IP_1=127.0.0.1',
							'SOAJS_MONGO_PORT_1=27017',
							'SOAJS_DEPLOY_ACC=true',
							'SOAJS_DAEMON_GRP_CONF=testGroup'
						],
						ports: [],
						tasks: [],
						repo: 'soajs.testDaemon',
						branch: 'master'
					}
				}
			];
			
			req.soajs.inputmaskData = {
				repo: 'testSrv-repo',
				branch: 'master',
				commit: 'commitsha'
			};
			helpers.processUndeployedServices(req, deployedServices, allServices, cdInfo, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
	});
	
	describe("processOneService", function () {
		
		let cdConfigRecord = {
			DEV: {
				'soajs.controller': {
					type: 'service',
					v1: {
						options: {
							custom: {}
						}
					}
				}
			}
		};
		
		before(function (done) {
			sinon
				.stub(deployBL, 'init')
				.yields(null, {
					redeployService: function (config, req, deployer, cb) {
						return cb(null, true);
					},
					deployService: function (config, req, deployer, cb) {
						return cb(null, true);
					}
				});
			
			done();
		});
		
		after(function (done) {
			sinon.restore(deployBL);
			done();
		});
		
		beforeEach(() => {
			
		});
		var oneService = {
			serviceVersion: 1,
			envRecord: envRecord,
			service: {
				labels: {
					'soajs.service.version': 1
				}
			},
			repo: 'soajs.controller',
			strategy: 'update'
		};
		let options = {};
		
		it("success - commit error, service is deployed", function (done) {
			oneService.commitError = true;
			// req, BL, oneService, registry, deployer, options, cdConfigRecord, callback
			helpers.processOneService(req, BL, oneService, deployer, options, cdConfigRecord, function (error, body) {
				oneService.commitError = false;
				done();
			});
		});
		
		it("success - commit error, service is not deployed", function (done) {
			oneService.commitError = true;
			delete oneService.service.labels;
			oneService.options = {
				deployConfig: {
					replication: {
						mode: 'replicated'
					}
				}
			};
			helpers.processOneService(req, BL, oneService, deployer, options, cdConfigRecord, function (error, body) {
				oneService.commitError = false;
				oneService.service.labels = {};
				oneService.options = {};
				done();
			});
		});
		
		it("Success update", function (done) {
			//NOTE: mocking environment variables for service to include daemon group config variable
			
			oneService.service.labels = { 'soajs.service.version': '1' };
			oneService.service.env = ['SOAJS_DAEMON_GRP_CONF=testGroup'];
			helpers.processOneService(req, BL, oneService, deployer, options, cdConfigRecord, function (error, body) {
				assert.equal(body, true);
				done();
			});
		});
		
		it("Success notify, service is deployed", function (done) {
			oneService.pause = true;
			helpers.processOneService(req, BL, oneService, deployer, options, cdConfigRecord, function (error, body) {
				oneService.pause = false;
				done();
			});
		});
		
		it("Success notify, service is not deployed", function (done) {
			oneService.pause = true;
			delete oneService.service.labels;
			oneService.options = {
				deployConfig: {
					replication: {
						mode: 'replicated'
					}
				}
			};
			helpers.processOneService(req, BL, oneService, deployer, options, cdConfigRecord, function (error, body) {
				oneService.pause = false;
				oneService.service.labels = {};
				oneService.options = {};
				done();
			});
		});
		
		it("Success - Deploy", function (done) {
			delete oneService.service.labels;
			oneService.deploy = true;
			oneService.options = {
				deployConfig: {
					replication: {
						mode: 'replicated'
					}
				}
			};
			helpers.processOneService(req, BL, oneService, deployer, options, cdConfigRecord, function (error, body) {
				done();
			});
		});
		
	});
	
	describe("checkRecordConfig", function () {
		beforeEach(() => {
			
		});
		
		it("Fail", function (done) {
			var envs2 = [
				{
					record: envRecord,
					services: [{
						id: 'rp7d7bxvuo2m9dd75exmaol1w',
						version: 18378,
						name: 'dev-controller',
						labels: {
							'service.branch': 'master',
							'service.image.ts': '1496063663358',
							'service.repo': 'soajs.controller',
							'soajs.catalog.id': '593038623b872a839c7bccea',
							'soajs.catalog.v': '1',
							'soajs.content': 'true',
							'soajs.env.code': 'dev',
							'soajs.service.group': '',
							'soajs.service.label': 'dev-controller',
							'soajs.service.mode': 'replicated',
							'soajs.service.name': 'controller',
							'soajs.service.repo.name': 'soajs_controller',
							'soajs.service.type': 'service',
							'soajs.service.version': '1'
						},
						env: ['NODE_ENV=production',
							'SOAJS_ENV=dev',
							'SOAJS_PROFILE=/opt/soajs/FILES/profiles/profile.js',
							'SOAJS_SRV_AUTOREGISTERHOST=true',
							'SOAJS_SRV_MEMORY=200',
							'SOAJS_GIT_OWNER=soajs',
							'SOAJS_GIT_BRANCH=master',
							'SOAJS_GIT_COMMIT=67a61db0955803cddf94672b0192be28f47cf280',
							'SOAJS_GIT_REPO=soajs.controller',
							'SOAJS_DEPLOY_HA=swarm',
							'SOAJS_HA_NAME={{.Task.Name}}',
							'SOAJS_MONGO_NB=1',
							'SOAJS_MONGO_IP_1=127.0.0.1',
							'SOAJS_MONGO_PORT_1=27017',
							'SOAJS_DEPLOY_ACC=true'],
						ports: [],
						tasks: [],
						repo: 'soajs.controller',
						branch: 'master'
					}]
				}
			];
			var record2 = {
				_id: 'ffddeec7d52b61',
				QA: {
					branch: 'master',
					strategy: 'notify',
					controller: {
						branch: 'master', strategy: 'update', v2: {}
					}
				},
				type: 'cd'
			};
			helpers.checkRecordConfig(req, envs2, record2, function (error, body) {
				done();
			});
		});
		
		it("Fail 2", function (done) {
			var record = {
				_id: 'ffddeec7d52b61',
				DEV: {
					branch: 'master',
					strategy: 'notify',
					controller: {
						branch: 'master', strategy: 'update', v2: {}
					}
				},
				type: 'cd'
			};
			var envs = [
				{
					record: envRecord,
					services: []
				}
			];
			helpers.checkRecordConfig(req, envs, record, function (error, body) {
				done();
			});
		});
		
		it("Success", function (done) {
			req.soajs.inputmaskData.services = [];
			var record = {
				_id: 'ffddeec7d52b61',
				DEV: {
					branch: 'master',
					strategy: 'notify',
					controller: {
						type: 'service',
						branch: 'master',
						strategy: 'update',
						v2: {}
					},
					urac: {
						type: 'service',
						v2: {
							branch: 'master',
							strategy: 'update',
						}
					}
				},
				type: 'cd'
			};
			var envs = [
				{
					record: envRecord,
					services: [
						{
							id: 'rp7d7bxvuo2m9dd75exmaol1w',
							version: 18378,
							name: 'dev-controller',
							labels: {
								'service.branch': 'master',
								'service.image.ts': '1496063663358',
								'service.repo': 'soajs.controller',
								'soajs.catalog.id': '593038623b872a839c7bccea',
								'soajs.catalog.v': '1',
								'soajs.content': 'true',
								'soajs.env.code': 'dev',
								'soajs.service.group': '',
								'soajs.service.label': 'dev-controller',
								'soajs.service.mode': 'replicated',
								'soajs.service.name': 'controller',
								'soajs.service.repo.name': 'soajs_controller',
								'soajs.service.type': 'service',
								'soajs.service.version': '1'
							},
							env: ['NODE_ENV=production',
								'SOAJS_ENV=dev',
								'SOAJS_PROFILE=/opt/soajs/FILES/profiles/profile.js',
								'SOAJS_SRV_AUTOREGISTERHOST=true',
								'SOAJS_SRV_MEMORY=200',
								'SOAJS_GIT_OWNER=soajs',
								'SOAJS_GIT_BRANCH=master',
								'SOAJS_GIT_COMMIT=67a61db0955803cddf94672b0192be28f47cf280',
								'SOAJS_GIT_REPO=soajs.controller',
								'SOAJS_DEPLOY_HA=swarm',
								'SOAJS_HA_NAME={{.Task.Name}}',
								'SOAJS_MONGO_NB=1',
								'SOAJS_MONGO_IP_1=127.0.0.1',
								'SOAJS_MONGO_PORT_1=27017',
								'SOAJS_DEPLOY_ACC=true'],
							ports: [],
							tasks: [],
							repo: 'soajs.controller',
							branch: 'master'
						},
						{
							id: 'rp11111exmaol1w',
							version: 18378,
							name: 'dev-catalog',
							labels: {
								'service.branch': 'master',
								'service.image.ts': '1496063663358',
								'soajs.catalog.id': '593038623b872a839c7bccea',
								'soajs.catalog.v': '1',
								'soajs.content': 'true',
								'soajs.env.code': 'dev',
								'soajs.service.group': '',
								'soajs.service.mode': 'replicated',
								'soajs.service.type': 'service',
								'soajs.service.version': '1'
							},
							env: ['NODE_ENV=production',
								'SOAJS_ENV=dev',
								'SOAJS_PROFILE=/opt/soajs/FILES/profiles/profile.js',
								'SOAJS_SRV_AUTOREGISTERHOST=true',
								'SOAJS_SRV_MEMORY=200',
								'SOAJS_GIT_OWNER=soajs',
								'SOAJS_GIT_BRANCH=master',
								'SOAJS_GIT_COMMIT=67a61db0955803cddf94672b0192be28f47cf280',
								'SOAJS_GIT_REPO=soajs.controller',
								'SOAJS_DEPLOY_HA=swarm',
								'SOAJS_HA_NAME={{.Task.Name}}',
								'SOAJS_MONGO_NB=1',
								'SOAJS_MONGO_IP_1=127.0.0.1',
								'SOAJS_MONGO_PORT_1=27017',
								'SOAJS_DEPLOY_ACC=true'],
							ports: [],
							tasks: [],
							repo: 'soajs.controller',
							branch: 'master'
						}
					]
				}
			];
			helpers.checkRecordConfig(req, envs, record, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
		it("Success 2", function (done) {
			req.soajs.inputmaskData.services = [
				{
					serviceName: 'controller',
					serviceVersion: 1
				}
			];
			var record = {
				_id: 'ffddeec7d52b61',
				DEV: {
					branch: 'master',
					strategy: 'notify',
					controller: {
						branch: 'master', strategy: 'update', v2: {}
					}
				},
				type: 'cd'
			};
			var envs = [
				{
					record: envRecord,
					services: [
						{
							id: 'rp7d7bxvuo2m9dd75exmaol1w',
							version: 18378,
							name: 'dev-controller',
							labels: {
								'service.branch': 'master',
								'service.image.ts': '1496063663358',
								'service.repo': 'soajs.controller',
								'soajs.catalog.id': '593038623b872a839c7bccea',
								'soajs.catalog.v': '1',
								'soajs.content': 'true',
								'soajs.env.code': 'dev',
								'soajs.service.group': '',
								'soajs.service.label': 'dev-controller',
								'soajs.service.mode': 'replicated',
								'soajs.service.name': 'controller',
								'soajs.service.repo.name': 'soajs_controller',
								'soajs.service.type': 'service',
								'soajs.service.version': '1'
							},
							env: ['NODE_ENV=production',
								'SOAJS_ENV=dev',
								'SOAJS_PROFILE=/opt/soajs/FILES/profiles/profile.js',
								'SOAJS_SRV_AUTOREGISTERHOST=true',
								'SOAJS_SRV_MEMORY=200',
								'SOAJS_GIT_OWNER=soajs',
								'SOAJS_GIT_BRANCH=master',
								'SOAJS_GIT_COMMIT=67a61db0955803cddf94672b0192be28f47cf280',
								'SOAJS_GIT_REPO=soajs.controller',
								'SOAJS_DEPLOY_HA=swarm',
								'SOAJS_HA_NAME={{.Task.Name}}',
								'SOAJS_MONGO_NB=1',
								'SOAJS_MONGO_IP_1=127.0.0.1',
								'SOAJS_MONGO_PORT_1=27017',
								'SOAJS_DEPLOY_ACC=true'],
							ports: [],
							tasks: [],
							repo: 'soajs.controller',
							branch: 'master'
						}
					]
				}
			];
			helpers.checkRecordConfig(req, envs, record, function (error, body) {
				done();
			});
		});
		
		it("Success 3", function (done) {
			req.soajs.inputmaskData.branch = 'master';
			req.soajs.inputmaskData.commit = '67a61db0955803cddf94672b0192be28f47cf280';
			req.soajs.inputmaskData.services = [
				{
					serviceName: 'controller',
					serviceVersion: 1
				},
				{
					serviceName: 'urac',
					serviceVersion: 2
				},
				{
					serviceName: 'testDaemon',
					serviceVersion: 1
				}
			
			];
			var record = {
				_id: 'ffddeec7d52b61',
				DEV: {
					pause: true,
					controller: {
						branch: 'master',
						strategy: 'update',
						v2: {}
					},
					urac: {
						branch: 'master',
						strategy: 'update',
						v2: {
							branch: 'master',
							strategy: 'update'
						}
					},
					testDaemon: {
						type: 'daemon',
						v1: {
							testGroup: {
								branch: 'master',
								strategy: 'update'
							}
						}
					}
				},
				type: 'cd'
			};
			var envs = [
				{
					record: envRecord,
					services: [
						{
							id: 'rp7d7bxvuo2m9dd75exmaol1w',
							version: 18378,
							name: 'dev-controller',
							labels: {
								'service.branch': 'master',
								'service.image.ts': '1496063663358',
								'service.repo': 'soajs.controller',
								'soajs.catalog.id': '593038623b872a839c7bccea',
								'soajs.catalog.v': '1',
								'soajs.content': 'true',
								'soajs.env.code': 'dev',
								'soajs.service.group': '',
								'soajs.service.label': 'dev-controller',
								'soajs.service.mode': 'replicated',
								'soajs.service.name': 'controller',
								'soajs.service.repo.name': 'soajs_controller',
								'soajs.service.type': 'service',
								'soajs.service.version': '1'
							},
							env: ['NODE_ENV=production',
								'SOAJS_ENV=dev',
								'SOAJS_PROFILE=/opt/soajs/FILES/profiles/profile.js',
								'SOAJS_SRV_AUTOREGISTERHOST=true',
								'SOAJS_SRV_MEMORY=200',
								'SOAJS_GIT_OWNER=soajs',
								'SOAJS_GIT_BRANCH=master',
								'SOAJS_GIT_COMMIT=67a61db0955803cddf94672b0192be28f47cf280',
								'SOAJS_GIT_REPO=soajs.controller',
								'SOAJS_DEPLOY_HA=swarm',
								'SOAJS_HA_NAME={{.Task.Name}}',
								'SOAJS_MONGO_NB=1',
								'SOAJS_MONGO_IP_1=127.0.0.1',
								'SOAJS_MONGO_PORT_1=27017',
								'SOAJS_DEPLOY_ACC=true'],
							ports: [],
							tasks: [],
							repo: 'soajs.controller',
							branch: 'master',
							commit: '67a61db0955803cddf94672b0192be28f47cf280'
						},
						{
							id: 'rp11111exmaol1w',
							version: 2,
							name: 'dev-urac',
							labels: {
								'service.branch': 'master',
								'service.image.ts': '1496063663358',
								'service.repo': 'soajs.urac',
								'soajs.catalog.id': '593038623b872a839c7bccea',
								'soajs.catalog.v': '1',
								'soajs.content': 'true',
								'soajs.env.code': 'dev',
								'soajs.service.group': '',
								'soajs.service.label': 'dev-urac',
								'soajs.service.mode': 'replicated',
								'soajs.service.name': 'urac',
								'soajs.service.repo.name': 'soajs_urac',
								'soajs.service.type': 'service',
								'soajs.service.version': '2'
							},
							env: ['NODE_ENV=production',
								'SOAJS_ENV=dev',
								'SOAJS_PROFILE=/opt/soajs/FILES/profiles/profile.js',
								'SOAJS_SRV_AUTOREGISTERHOST=true',
								'SOAJS_SRV_MEMORY=200',
								'SOAJS_GIT_OWNER=soajs',
								'SOAJS_GIT_BRANCH=master',
								'SOAJS_GIT_COMMIT=67a61db0955803cddf94672b0192be28f47cf280',
								'SOAJS_GIT_REPO=soajs.controller',
								'SOAJS_DEPLOY_HA=swarm',
								'SOAJS_HA_NAME={{.Task.Name}}',
								'SOAJS_MONGO_NB=1',
								'SOAJS_MONGO_IP_1=127.0.0.1',
								'SOAJS_MONGO_PORT_1=27017',
								'SOAJS_DEPLOY_ACC=true'],
							ports: [],
							tasks: [],
							repo: 'soajs.urac',
							branch: 'master'
						},
						{
							id: 'rp11111exmaol22',
							version: 18000,
							name: 'dev-testDaemon-testGroup-v1',
							labels: {
								'service.branch': 'master',
								'service.image.ts': '1496063663358',
								'soajs.catalog.id': '593038623b872a839c7bccea',
								'soajs.catalog.v': '1',
								'soajs.content': 'true',
								'soajs.env.code': 'dev',
								'soajs.service.name': 'testDaemon',
								'soajs.service.group': '',
								'soajs.service.mode': 'replicated',
								'soajs.service.type': 'daemon',
								'soajs.daemon.group': 'testGroup',
								'soajs.service.version': '1'
							},
							env: [
								'NODE_ENV=production',
								'SOAJS_ENV=dev',
								'SOAJS_PROFILE=/opt/soajs/FILES/profiles/profile.js',
								'SOAJS_SRV_AUTOREGISTERHOST=true',
								'SOAJS_SRV_MEMORY=200',
								'SOAJS_GIT_OWNER=soajs',
								'SOAJS_GIT_BRANCH=master',
								'SOAJS_GIT_COMMIT=67a61db0955803cddf94672b0192be28f47cf280',
								'SOAJS_GIT_REPO=soajs.controller',
								'SOAJS_DEPLOY_HA=swarm',
								'SOAJS_HA_NAME={{.Task.Name}}',
								'SOAJS_MONGO_NB=1',
								'SOAJS_MONGO_IP_1=127.0.0.1',
								'SOAJS_MONGO_PORT_1=27017',
								'SOAJS_DEPLOY_ACC=true',
								'SOAJS_DAEMON_GRP_CONF=testGroup'
							],
							ports: [],
							tasks: [],
							repo: 'soajs.testDaemon',
							branch: 'master'
						}
					]
				}
			];
			helpers.checkRecordConfig(req, envs, record, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
		it("Success - repository cd information found for custom deployed service", function (done) {
			req.soajs.inputmaskData.repo = 'testRepo';
			req.soajs.inputmaskData.owner = 'testOwner';
			req.soajs.inputmaskData.branch = 'master';
			req.soajs.inputmaskData.commit = '67a61db0955803cddf94672b0192be28f47cf280';
			
			var record = {
				_id: 'ffddeec7d52b61',
				DEV: {
					pause: true,
					testRepo: {
						branch: 'master',
						strategy: 'notify'
					}
				},
				type: 'cd'
			};
			
			var envs = [
				{
					record: envRecord,
					services: [
						{
							id: 'rp7d7bxvuo2m9dd75exmaol1w',
							version: 18378,
							name: 'dev-controller',
							labels: {
								'service.branch': 'master',
								'service.image.ts': '1496063663358',
								'service.repo': 'testRepo',
								'soajs.catalog.id': '593038623b872a839c7bccea',
								'soajs.catalog.v': '1',
								'soajs.env.code': 'dev',
								'soajs.service.group': '',
								'soajs.service.label': 'dev-controller',
								'soajs.service.mode': 'replicated',
								'soajs.service.repo.name': 'testRepo',
								'soajs.service.type': 'service',
								'soajs.service.version': '1'
							},
							env: [],
							ports: [],
							tasks: [],
							repo: 'testRepo',
							branch: 'master'
						}
					]
				}
			];
			
			helpers.checkRecordConfig(req, envs, record, function (error, body) {
				assert.ok(body);
				done();
			});
		});
	});
	
	describe("getEnvsServices", function () {
		
		var envs = [
			envRecord
		];
		it("Success", function (done) {
			deployer.listServices = function (options, cb) {
				var services = [{
					labels: {
						'service.repo': '',
						'service.branch': ''
					}
				}];
				return cb(null, services);
			};
			
			deployer.execute = function (in1, in2, in3, cb) {
				return cb(null, {});
			};
			BL.model.findEntry = function (soajs, opts, cb) {
				cb(null, envRecord);
			};
			helpers.getEnvsServices(envs, req, deployer, BL, function (error, body) {
				done();
			});
		});
		
	});
	
	describe("doesServiceHaveUpdates", function () {
		beforeEach(() => {
			
		});
		
		it("Fail 1", function (done) {
			var updateList = [];
			var oneService = {};
			var catalogs = [];
			var soajsImages = [];
			helpers.doesServiceHaveUpdates(req, config, updateList, oneService, catalogs, soajsImages, function (error, body) {
				done();
			});
		});
		
		it("Fail 2", function (done) {
			var updateList = [];
			var oneService = {
				tasks: [
					{
						status: {}
					}
				],
				labels: {
					'any': '12'
				}
			};
			var catalogs = [];
			var soajsImages = [];
			helpers.doesServiceHaveUpdates(req, config, updateList, oneService, catalogs, soajsImages, function (error, body) {
				done();
			});
		});
		
		it("Fail 3", function (done) {
			req.soajs.inputmaskData = {
				env: 'dev'
			};
			var updateList = [];
			var oneService = {
				tasks: [
					{
						status: {}
					}
				],
				labels: {
					'soajs.catalog.id': '12',
					'soajs.catalog.v': '1'
				}
			};
			var catalogs = [];
			var soajsImages = [];
			helpers.doesServiceHaveUpdates(req, config, updateList, oneService, catalogs, soajsImages, function (error, body) {
				done();
			});
		});
		
		it("Success doesServiceHaveUpdates", function (done) {
			req.soajs.inputmaskData = {
				env: 'dev'
			};
			var updateList = [];
			var oneService = {
				tasks: [
					{
						status: {}
					}
				],
				labels: {
					'soajs.env.code': 'dev',
					'soajs.catalog.id': '12',
					'soajs.catalog.v': '1'
				}
			};
			var catalogs = [
				{
					"_id": '12',
					"name": "serviceCatalog",
					"type": "soajs",
					"description": "This is a test catalog for deploying service instances",
					"recipe": {
						"deployOptions": {
							"image": {
								"prefix": "soajstest",
								"name": "soajs",
								"tag": "latest"
							}
						},
						"buildOptions": {
							"settings": {
								"accelerateDeployment": true
							},
							"env": {
								"SOAJS_SRV_AUTOREGISTERHOST": {
									"type": "static",
									"value": "true"
								},
								"SOAJS_MONGO_PORT": {
									"type": "computed",
									"value": "$SOAJS_MONGO_PORT_N"
								}
							},
							"cmd": {
								"deploy": {
									"command": [
										"bash",
										"-c"
									],
									"args": [
										"node index.js -T service"
									]
								}
							}
						}
					}
				}
			];
			var soajsImages = [];
			helpers.doesServiceHaveUpdates(req, config, updateList, oneService, catalogs, soajsImages, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
		it("Success doesServiceHaveUpdates with v", function (done) {
			nock('http://my.docker.com')
				.get('/')
				.reply(200, {
					results: [
						{
							name: 'one',
							last_updated: 211321332
						},
						{
							name: 'latest',
							last_updated: 211321332
						}
					]
				});
			
			req.soajs.inputmaskData = {
				env: 'dev'
			};
			var updateList = [];
			var oneService = {
				tasks: [
					{
						status: {}
					}
				],
				labels: {
					'soajs.env.code': 'dev',
					'soajs.catalog.id': '12',
					'soajs.catalog.v': '1'
				}
			};
			var catalogs = [
				{
					"_id": '12',
					"name": "serviceCatalog",
					"type": "soajs",
					"description": "This is a test catalog for deploying service instances",
					v: 2,
					"recipe": {
						"deployOptions": {
							"image": {
								"prefix": "soajstest",
								"name": "soajs",
								"tag": "latest"
							}
						},
						"buildOptions": {
							"settings": {
								"accelerateDeployment": true
							},
							"env": {
								"SOAJS_SRV_AUTOREGISTERHOST": {
									"type": "static",
									"value": "true"
								},
								"SOAJS_MONGO_PORT": {
									"type": "computed",
									"value": "$SOAJS_MONGO_PORT_N"
								}
							},
							"cmd": {
								"deploy": {
									"command": [
										"bash",
										"-c"
									],
									"args": [
										"node index.js -T service"
									]
								}
							}
						}
					}
				}
			];
			var soajsImages = [];
			helpers.doesServiceHaveUpdates(req, config, updateList, oneService, catalogs, soajsImages, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
		
	});
	
	describe("getLatestSOAJSImageInfo", function () {
		beforeEach(() => {
			
		});
		
		it("Success getLatestSOAJSImageInfo", function (done) {
			helpers.getLatestSOAJSImageInfo(config, function (error, body) {
				done();
			});
		});
		
	});
	
	describe("getServices", function () {
		var cloudServices = {
			init: function (modelName, cb) {
				var BL = {
					listServices: function (config, soajs, deployer, cb) {
						return cb(null, []);
					}
				};
				return cb(null, BL);
			}
		};
		it("Success 1", function (done) {
			soajs.inputmaskData = {
				env: "dev"
			};
			// getServices: function (config, req, registry, deployer, cloudServices, cb)
			helpers.getServices(config, req, deployer, cloudServices, function (error, body) {
				done();
			});
		});
	});
	
	describe("deepVersionComparison", function () {
		
		it("Success 1", function (done) {
			var oneImage = {
				name: 'soajs'
			};
			var tag = 1;
			var opts = {
				imageInfo: {
					prefix: ''
				}
			};
			var newObj = {};
			helpers.deepVersionComparison(oneImage, tag, opts, newObj);
			done();
		});
		
		it("Success 2", function (done) {
			var oneImage = {
				name: '1'
			};
			var tag = '1';
			var opts = {
				imageInfo: {
					prefix: 'soajsorg'
				}
			};
			var newObj = {};
			helpers.deepVersionComparison(oneImage, tag, opts, newObj);
			done();
		});
	});
	
	// describe("callDeployer", function () {
	// 	var registry = {};
	// 	var opName = 'deployService';
	// 	it("Success callDeployer", function (done) {
	// 		helpers.callDeployer(config, req, registry, deployer, opName, function (error, body) {
	// 			done();
	// 		});
	// 	});
	// });
	
});
