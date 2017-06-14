"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");
var helpers = helper.requireModule('./lib/cd/helper.js');
const nock = require('nock');

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
	}
};
var deployer = {
	redeployService: function (options, cb) {
		return cb(null, true);
	},
	listServices: function (options, cb) {
		var services = [];
		return cb(null, services);
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

			},
			error: function (data) {

			},
			info: function (data) {

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
	describe("processOneService", function () {
		beforeEach(() => {

		});
		var oneService = {
			serviceVersion: 1,
			envRecord: envRecord,
			service: {
				labels: {}
			},
			strategy: 'update'
		};
		it("Success update", function (done) {
			helpers.processOneService(req, BL, oneService, deployer, function (error, body) {
				done();
			});
		});

		it("Success notify", function (done) {
			oneService.pause = true;
			helpers.processOneService(req, BL, oneService, deployer, function (error, body) {
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
						branch: 'master',
						strategy: 'update',
						v2: {}
					},
					urac: {
						branch: 'master',
						strategy: 'update',
						v2: {}
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
			req.soajs.inputmaskData.services = [
				{
					serviceName: 'controller',
					serviceVersion: 1
				},
				{
					serviceName: 'urac',
					serviceVersion: 2,
					branch: 'master'
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
						}
					]
				}
			];
			helpers.checkRecordConfig(req, envs, record, function (error, body) {
				done();
			});
		});
	});

	describe("getEnvsServices", function () {
		beforeEach(() => {

		});
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
		it("Success getServices", function (done) {
			soajs.inputmaskData = {
				env: "dev"
			};
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
