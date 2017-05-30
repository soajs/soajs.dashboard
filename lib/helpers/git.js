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

var servicesColl = 'services';
var daemonsColl = 'daemons';
var staticContentColl = 'staticContent';
var hostsColl = 'hosts';

function checkMongoError (soajs, error, cb, fCb) {
	if (error) {
		soajs.log.error(error);
		return cb(error);
	}
	return fCb();
}

var helpers = {
	comparePaths: function (req, config, remote, local, callback) {
		var soajs = req.soajs;
		//create indexes for local and remote
		var allPaths = [];
		var remoteIndex = {};
		var localIndex = {};
		
		remote.forEach(function (onePath) {
			remoteIndex[ helpers.assurePath('config', onePath, soajs.inputmaskData.provider) ] = {};
			if (allPaths.indexOf(helpers.assurePath('config', onePath, soajs.inputmaskData.provider)) === -1) {
				allPaths.push(helpers.assurePath('config', onePath, soajs.inputmaskData.provider));
			}
		});
		
		local.forEach(function (onePath) {
			if (onePath.path !== config.gitAccounts[ soajs.inputmaskData.provider ].defaultConfigFilePath) { //excluding root config.js file
				localIndex[ helpers.assurePath('config', onePath.path, soajs.inputmaskData.provider) ] = {
					contentName: onePath.contentName,
					contentType: onePath.contentType,
					sha: onePath.sha
				};
				if (allPaths.indexOf(helpers.assurePath('config', onePath.path, soajs.inputmaskData.provider)) === -1) {
					allPaths.push(helpers.assurePath('config', onePath.path, soajs.inputmaskData.provider));
				}
			}
		});
		
		for (var i = 0; i < allPaths.length; i++) {
			if (localIndex[ allPaths[ i ] ] && remoteIndex[ allPaths[ i ] ]) {
				allPaths[ i ] = {
					path: allPaths[ i ],
					sha: localIndex[ allPaths[ i ] ].sha,
					status: 'available'
				};
			}
			else if (localIndex[ allPaths[ i ] ] && !remoteIndex[ allPaths[ i ] ]) {
				allPaths[ i ] = {
					path: allPaths[ i ],
					contentType: localIndex[ allPaths[ i ] ].contentType,
					contentName: localIndex[ allPaths[ i ] ].contentName,
					sha: localIndex[ allPaths[ i ] ].sha,
					status: 'removed'
				};
			}
			else if (!localIndex[ allPaths[ i ] ] && remoteIndex[ allPaths[ i ] ]) {
				allPaths[ i ] = {
					path: allPaths[ i ],
					status: 'new'
				};
			}
		}
		
		return callback(allPaths);
	},
	analyzeConfigSyncFile: function (req, repoConfig, path, configSHA, cb) {
		if (repoConfig.type !== 'multi') {
			req.soajs.log.debug("Analyzing config file for: " + repoConfig.serviceName + " of type: " + repoConfig.type);
		}
		else {
			req.soajs.log.debug("Analyzing root config file for repository of type " + repoConfig.type);
		}
		
		if (req.soajs.data.repoType === 'mutli' && repoConfig.type !== req.soajs.data.repoContentTypes[ repoConfig.serviceName ]) {
			return cb('outOfSync');
		}
		if (req.soajs.data.repoType !== 'multi' && repoConfig.type !== req.soajs.data.repoType) {
			return cb('outOfSync');
		}
		if (repoConfig.type !== 'multi' && configSHA.local === configSHA.remote) {//not applicable in case of multi repo, sub configs might be changed without changing root config
			return cb(null, 'upToDate');
		}
		helpers.validateFileContents(req, {}, repoConfig, function (error) {
			checkMongoError(req.soajs, error, cb, function () {
				return cb(null);
			});
		});
	},
	removePath: function (model, soajs, path, callback) {
		var opts = {
			collection: hostsColl,
			conditions: { name: path.contentName }
		};
		model.countEntries(soajs, opts, function (error, count) {
			checkMongoError(soajs, error, callback, function () {
				if (count > 0) {
					return callback('hostsExist');
				}
				
				var opts = {
					collection: '',
					conditions: {
						'name': path.contentName,
						'src.owner': soajs.inputmaskData.owner,
						'src.repo': soajs.inputmaskData.repo
					}
				};
				
				if (path.contentType === 'service') {
					opts.collection = servicesColl;
				}
				else if (path.contentType === 'daemon') {
					opts.collection = daemonsColl;
				}
				else if (path.contentType === 'static') {
					opts.collection = staticContentColl;
				}
				
				model.removeEntry(soajs, opts, function (error) {
					checkMongoError(soajs, error, callback, function () {
						
						return callback(null, {
							removed: true,
							contentName: path.contentName,
							contentType: path.contentType,
							path: path.path,
							sha: path.sha
						});
					});
				});
			});
		});
	},
	syncMyRepo: function (model, soajs, type, info, configSHA, cb) {
		var opts = {
			collection: '',
			conditions: {}
		};
		
		opts.conditions[ 'name' ] = info.name;
		opts.conditions[ 'src.repo' ] = soajs.inputmaskData.repo;
		opts.conditions[ 'src.owner' ] = soajs.inputmaskData.owner;
		
		if (type === 'service') {
			opts.collection = servicesColl;
			opts.conditions[ 'port' ] = info.port;
		} else if (type === 'daemon') {
			opts.collection = daemonsColl;
			opts.conditions[ 'port' ] = info.port;
		} else if (type === 'static') {
			opts.collection = staticContentColl;
		}
		
		var configData = {
			contentType: type,
			contentName: info.name,
			path: info.path,
			sha: configSHA
		};
		
		delete info.name;
		delete info.path;
		
		if (info.port) {
			delete info.port;
		}
		
		var s = {
			'$set': {}
		};
		
		for (var p in info) {
			if (Object.hasOwnProperty.call(info, p)) {
				if (p !== 'versions') {
					s.$set[ p ] = info[ p ];
				}
			}
		}
		
		if (info.versions) {
			for (var vp in info.versions) {
				if (Object.hasOwnProperty.call(info.versions, vp)) {
					s.$set[ 'versions.' + vp ] = info.versions[ vp ];
				}
			}
		}
		opts.fields = s;
		opts.options = { 'upsert': true };
		model.updateEntry(soajs, opts, function (error) {
			checkMongoError(soajs, error, cb, function () {
				return cb(null, configData);
			});
		});
	},
	checkCanSync: function (model, soajs, type, info, flags, cb) {
		if (flags && flags.new) {//in case a new sub service was added, it shouldn't check for its existence
			return cb(null, info);
		}
		
		var opts = {
			collection: '',
			conditions: {}
		};
		
		opts.conditions[ 'name' ] = info.name;
		opts.conditions[ 'src.repo' ] = soajs.inputmaskData.repo;
		opts.conditions[ 'src.owner' ] = soajs.inputmaskData.owner;
		if (type === 'service') {
			opts.collection = servicesColl;
			opts.conditions[ 'port' ] = info.port;
		}
		else if (type === 'daemon') {
			opts.collection = daemonsColl;
			opts.conditions[ 'port' ] = info.port;
		}
		else if (type === 'static') {
			opts.collection = staticContentColl;
		}
		
		model.countEntries(soajs, opts, function (error, count) {
			checkMongoError(soajs, error, cb, function () {
				if (count === 0) {
					soajs.log.error("Repository is out of sync");
					return cb('outOfSync');
				}
				return cb(null, info);
			});
		});
	},
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
		utils.buildDeployerOptions(envRecord, soajs, BL);
	}
};

module.exports = helpers;