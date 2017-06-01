'use strict';
var coreModules = require("soajs");
var core = coreModules.core;
var validator = new core.validator.Validator();
var validatorSchemas = require("../../schemas/serviceSchema.js");

var request = require('request');
var async = require('async');
var fs = require('fs');
var rimraf = require('rimraf');
var config = require('../../config.js');

var utils = require('../../utils/utils.js');

var helpers = {
	assurePath: function (pathTo, path, provider) {
		if (pathTo === 'config' && path.indexOf(config.gitAccounts[ provider ].defaultConfigFilePath) !== -1) {
			if (path.indexOf('/') === 0) {
				return path;
			}
			else {
				return '/' + path;
			}
		}
		
		if (pathTo === 'main' && path.indexOf(config.gitAccounts[ provider ].defaultConfigFilePath) !== -1) {
			path = path.substring(0, path.indexOf(config.gitAccounts[ provider ].defaultConfigFilePath));
		}
		
		if (path.charAt(0) !== '/') {
			path = '/' + path;
		}
		if (path.charAt(path.length - 1) !== '/') {
			path = path + '/';
		}
		
		if (pathTo === 'main') {
			path = path + '.';
		}
		else if (pathTo === 'config') {
			path = path + config.gitAccounts[ provider ].defaultConfigFilePath;
		}
		
		return path;
	},
	cleanConfigDir: function (req, options, cb) {
		fs.exists(options.repoConfigsFolder, function (exists) {
			if (exists) {
				rimraf(options.repoConfigsFolder, function (error) {
					if (error) {
						req.soajs.log.warn("Failed to clean repoConfigs directory, proceeding ...");
						req.soajs.log.error(error);
					}
					
					return cb();
				});
			}
			else {
				return cb();
			}
		});
	},
	extractAPIsList: function (schema) {
		var protocols = [ 'post', 'get', 'put', 'del', 'delete' ];
		var excluded = [ 'commonFields' ];
		var apiList = [];
		var newStyleApi = false;
		for (var route in schema) {
			if (Object.hasOwnProperty.call(schema, route)) {
				if (excluded.indexOf(route) !== -1) {
					continue;
				}
				
				if (protocols.indexOf(route) !== -1) {
					newStyleApi = true;
					continue;
				}
				
				var oneApi = {
					'l': schema[ route ]._apiInfo.l,
					'v': route
				};
				
				if (schema[ route ]._apiInfo.group) {
					oneApi.group = schema[ route ]._apiInfo.group;
				}
				
				if (schema[ route ]._apiInfo.groupMain) {
					oneApi.groupMain = schema[ route ]._apiInfo.groupMain;
				}
				apiList.push(oneApi);
			}
		}
		
		if (newStyleApi) {
			for (var protocol in schema) {
				if (excluded.indexOf(protocol) !== -1) {
					continue;
				}
				
				for (var route in schema[ protocol ]) {
					var oneApi = {
						'l': schema[ protocol ][ route ]._apiInfo.l,
						'v': route,
						'm': protocol
					};
					
					if (schema[ protocol ][ route ]._apiInfo.group) {
						oneApi.group = schema[ protocol ][ route ]._apiInfo.group;
					}
					
					if (schema[ protocol ][ route ]._apiInfo.groupMain) {
						oneApi.groupMain = schema[ protocol ][ route ]._apiInfo.groupMain;
					}
					apiList.push(oneApi);
				}
			}
		}
		return apiList;
	},
	extractDaemonJobs: function (schema) {
		var jobList = {};
		for (var job in schema) {
			jobList[ job ] = {};
		}
		return jobList;
	},
	getServiceInfo: function (req, repoConfig, path, flags, provider) {
		var info = {};
		if (repoConfig.type === 'static') {
			info = {
				name: repoConfig.name,
				dashUI: repoConfig.dashUI,
				src: {
					provider: provider,
					owner: req.soajs.inputmaskData.owner,
					repo: req.soajs.inputmaskData.repo
				},
				path: path //needed for multi repo, not saved in db
			};
		}
		else if (repoConfig.type === 'daemon' || repoConfig.type === 'service') {
			if (repoConfig.type === 'service') {
				info = {
					swagger: repoConfig.swagger || false,
					name: repoConfig.serviceName,
					port: repoConfig.servicePort,
					group: repoConfig.serviceGroup,
					src: {
						provider: provider,
						owner: req.soajs.inputmaskData.owner,
						repo: req.soajs.inputmaskData.repo
					},
					prerequisites: repoConfig.prerequisites || {},
					requestTimeout: repoConfig.requestTimeout,
					requestTimeoutRenewal: repoConfig.requestTimeoutRenewal,
					versions: {},
					path: path //needed for multi repo, not saved in db
				};
				if (!repoConfig.serviceVersion) { //setting version to 1 by default if not specified in config file
					repoConfig.serviceVersion = 1;
				}
				info.versions[ repoConfig.serviceVersion ] = {
					extKeyRequired: repoConfig.extKeyRequired,
					awareness: repoConfig.awareness || true,
					apis: helpers.extractAPIsList(repoConfig.schema)
				};
			}
			else if (repoConfig.type === 'daemon') {
				info = {
					name: repoConfig.serviceName,
					port: repoConfig.servicePort,
					group: repoConfig.serviceGroup,
					src: {
						provider: provider,
						owner: req.soajs.inputmaskData.owner,
						repo: req.soajs.inputmaskData.repo
					},
					prerequisites: repoConfig.prerequisites || {},
					versions: {},
					path: path //needed for multi repo, not saved in db
				};
				if (!repoConfig.serviceVersion) { //setting version to 1 by default if not specified in config file
					repoConfig.serviceVersion = 1;
				}
				info.versions[ repoConfig.serviceVersion ] = {
					jobs: helpers.extractDaemonJobs(repoConfig.schema)
				};
			}
			
			if (repoConfig.cmd) {
				info.src.cmd = repoConfig.cmd;
			}
			
			if (repoConfig.main) {
				if (repoConfig.main.charAt(0) !== '/') {
					repoConfig.main = '/' + repoConfig.main;
				}
				info.src.main = repoConfig.main;
			}
			else if (flags && flags.multi) {
				if (typeof (path) === 'object') {
					info.src.main = helpers.assurePath('main', path.path, provider);
				}
				else {
					info.src.main = helpers.assurePath('main', path, provider);
				}
			}
		}
		return info;
	},
	validateFileContents: function (req, res, repoConfig, cb) {
		if (repoConfig.type && repoConfig.type === 'multi') {
			if (!repoConfig.folders) {
				return cb({ code: 783, "msg": config.errors[ 783 ] });
			}
			if (!Array.isArray(repoConfig.folders)) {
				return cb({ code: 784, "msg": config.errors[ 784 ] });
			}
			if (Array.isArray(repoConfig.folders) && repoConfig.folders.length === 0) {
				return cb({ code: 785, "msg": config.errors[ 785 ] });
			}
		}
		else if (repoConfig.type && (repoConfig.type === 'service' || repoConfig.type === 'daemon')) {
			var errMsgs = [];
			var check;
			if (repoConfig.type === 'service') {
				check = validator.validate(repoConfig, validatorSchemas.service);
			}
			else {
				check = validator.validate(repoConfig, validatorSchemas.daemon);
			}
			if (!check.valid) {
				check.errors.forEach(function (oneError) {
					errMsgs.push(oneError.stack);
				});
				req.soajs.log.error(errMsgs);
				return cb({ code: 786, "message": new Error(errMsgs.join(" - ")).message });
			}
		}
		else if (repoConfig.type && repoConfig.type === 'static') {
			if (!repoConfig.name) {
				return cb({ code: 787, "msg": config.errors[ 787 ] });
			}
		}
		else {
			return cb({ code: 788, "msg": config.errors[ 788 ] });
		}
		return cb(null, true);
	},
	buildDeployerOptions: function (envRecord, soajs, model) {
		var BL = {
			model: model
		};
		return utils.buildDeployerOptions(envRecord, soajs, BL);
	}
};

module.exports = helpers;