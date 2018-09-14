/*
 *  **********************************************************************************
 *   (C) Copyright Herrontech (www.herrontech.com)
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   Contributors:
 *   -
 *  **********************************************************************************
 */

"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");
var helpers1 = helper.requireModule('./lib/git/helper.js');
var getConfig1 = helper.requireModule('./lib/git/getConfig.js');
var config = helper.requireModule('./config.js');

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
var gitModel = {};

let soajsUtils = require('soajs.core.libs').utils;
let helpers = soajsUtils.cloneObj(helpers1);
let getConfig = soajsUtils.cloneObj(getConfig1);

describe("testing get config git.js", function () {
	var soajs = {
		registry: {
			"coreDB": {
				registryLocation: {
				
				}
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
		tenant: {}
	};
	var req = {
		soajs: soajs
	};
	var res = {};

	describe("getSOAFile", function () {

		it("success 1: soa.js", function (done) {
			var configGenerator = {
				generate: function(soajsFilePath, swaggerFilePath, cb) {
					return cb(null, "module.exports = {};");
				}
			};
			
			req.soajs.inputmaskData.provider = 'github';
			getConfig.getSOAFile(config, req, {
				gitConfig: {
					accountId: "1234",
					provider: "github",
					user: "soajs",
					repo: "test",
					project: "test",
					ref: "master"
				},
				git: gitDriver,
				gitModel: gitModel,
				configGenerator: configGenerator
			}, (error, response) => {
				assert.ifError(error);
				assert.ok(response);
				done();
			});
		});
	});
	
	describe("getConfigFile", function () {
		
		it("success 1: config.js", function (done) {
			var configGenerator = {
				generate: function(soajsFilePath, swaggerFilePath, cb) {
					return cb(null, "module.exports = {};");
				}
			};
			
			req.soajs.inputmaskData.provider = 'github';
			getConfig.getConfigFile(config, req, {
				gitConfig: {
					accountId: "1234",
					provider: "github",
					user: "soajs",
					repo: "test",
					project: "test",
					ref: "master"
				},
				git: gitDriver,
				gitModel: gitModel,
				configGenerator: configGenerator
			}, (error, response) => {
				assert.ifError(error);
				assert.ok(response);
				done();
			});
		});
	});
	
	describe("analyzeConfigFile", function () {
		
		it("success 1: config.js", function (done) {
			helpers.checkCanAdd = function(model, soajs, type, info, cb) {
				return cb(null, true);
			};
			
			helpers.validateFileContents = function(req, object, repoConfig, cb) {
				return cb(null, true);
			};
			
			helpers.getServiceInfo = function() {
				return {};
			};
			
			req.soajs.inputmaskData.provider = 'github';
			getConfig.analyzeConfigFile(config, req, {}, {}, '', '', {}, (error, response) => {
				assert.ifError(error);
				assert.ok(response);
				done();
			});
		});
	});
	
	describe("analyzeConfigSyncFile", function () {
		
		it("success 1: config.js", function (done) {
			helpers.analyzeConfigSyncFile = function(req, repoConfig, path, configSHA, flags, cb) {
				return cb(null, 'upToDate');
			};
			
			helpers.checkCanSync = function(model, soajs, type, info, flags, cb) {
				return cb(null, true);
			};
			
			helpers.getServiceInfo = function() {
				return {};
			};
			
			req.soajs.inputmaskData.provider = 'github';
			getConfig.analyzeConfigSyncFile(config, req, {}, {}, '', '', '', {}, (error, response) => {
				assert.ifError(error);
				assert.ok(response);
				done();
			});
		});
	});
});
