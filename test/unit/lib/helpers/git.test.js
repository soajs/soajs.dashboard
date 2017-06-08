"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");
var helpers = helper.requireModule('./lib/helpers/git.js');
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
	}
};

describe("testing helper git.js", function () {
	var soajs = {
		registry: {},
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
		it("Test 1: will remove", function (done) {
			remote = [ '/sample1', '/sample2', '/sample3', '/sample4' ];
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
				},
				{
					contentType: 'static',
					contentName: 'sampleFake3',
					path: '/sampleFake3/config.js',
					sha: '15b14565e3fdd0048e351493056025a7020ea567'
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

		it("Test 2: will sync", function (done) {
			remote = [ '/sample1', '/sample2', '/sample3', '/sample4' ];
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
				},
				{
					contentType: 'static',
					contentName: 'sampletest4',
					path: '/sample4/config.js',
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

	describe("extractAPIsList", function () {
		var output;
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
		var output;
		beforeEach(() => {

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

		it("Success static", function (done) {
			var repoConfig = {
				type: 'static',
				name: "test",
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

		it("Fail static", function (done) {
			var repoConfig = {
				type: 'static',
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

	describe("buildDeployerOptions", function () {
		var output;
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
			console.log(options);
			assert.ok(options);
			assert.ok(options.strategy);
			assert.ok(options.deployerConfig);
			done();
		});

	});

});