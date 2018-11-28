'use strict';
var coreModules = require("soajs");
var core = coreModules.core;
var validator = new core.validator.Validator();
var validatorSchemas = require("../../schemas/serviceSchema.js");

var async = require('async');
var fs = require('fs');
var rimraf = require('rimraf');
var config = require('../../config.js');

var utils = require('../../utils/utils.js');

var servicesColl = 'services';
var daemonsColl = 'daemons';
var hostsColl = 'hosts';

function checkReturnError(req, mainCb, data, cb) {
	if (data.error) {
		if (typeof (data.error) === 'object' && (data.error.message || data.error.msg)) {
			req.soajs.log.error(data.error);
		}

		if (data.error.message && typeof (data.error.messagedata) === 'string' && error.message.indexOf('getaddrinfo EAI_AGAIN ') != -1) {
			data.code = 763;
			data.config.errors[data.code] = data.config.errors[data.code].replace("%message%", data.config.errors[904]);
		}
		else {
			data.config.errors[data.code] = data.config.errors[data.code].replace("%message%", data.error.message);
		}
		return mainCb({ "code": data.code, "msg": data.config.errors[data.code] });
	} else {
		return cb();
	}
}

function checkMongoError(soajs, error, cb, fCb) {
	if (error) {
		soajs.log.error(error);
		return cb(error);
	}
	return fCb();
}

var helpers = {

	deleteMulti: function (soajs, model, cb) {
		function getRepoServices(callback) {
			var opts = {
				collection: servicesColl,
				conditions: {
					'src.owner': soajs.inputmaskData.owner,
					'src.repo': soajs.inputmaskData.repo
				},
				fields: { name: 1, _id: 0 }
			};
			if (soajs.inputmaskData.branch){
				opts.fields.versions = 1;
			}
			model.findEntries(soajs, opts, function (error, results) {
				if (error) {
					return callback(error);
				}
				let records = [];
				for (var i = 0; i < results.length; i++) {
					records.push(results[i].name);
				}
				if (records && records.length > 0 && soajs.inputmaskData.branch){
					//one record apply to all
					soajs.inputmaskData.recordToBeUpdated.service = [];
					async.eachSeries(results, function (record, call) {
						checkBranches(soajs, record, 'service', () => {
							return call(null, records);
						});
					}, callback);
				}
				else {
					return callback(null, records);
				}
			});
		}

		function getRepoDaemons(callback) {
			var opts = {
				collection: daemonsColl,
				conditions: {
					'src.owner': soajs.inputmaskData.owner,
					'src.repo': soajs.inputmaskData.repo
				},
				fields: { name: 1, _id: 0 }
			};
			if (soajs.inputmaskData.branch){
				opts.fields.versions = 1;
			}
			model.findEntries(soajs, opts, function (error, records) {
				if (error) {
					return callback(error);
				}
				
				for (var i = 0; i < records.length; i++) {
					records[i] = records[i].name;
				}
				if (records && records.length > 0 && soajs.inputmaskData.branch){
					//one record apply to all
					soajs.inputmaskData.recordToBeUpdated.daemon = [];
					async.eachSeries(records, function (record, call) {
						checkBranches(soajs, record, 'daemon', () => {
							return call(null, records);
						});
					}, callback);
				}
				else {
					return callback(null, records);
				}
			});
		}
		
		function checkBranches(soajs, record, type, cb) {
			for (let version in record.versions) {
				let found = false;
				if (Object.hasOwnProperty.call(record.versions, version.toString())) {
					if (record.versions[version.toString()].branches) {
						for (let x = 0; x < record.versions[version.toString()].branches.length; x++) {
							if (record.versions[version.toString()].branches[x] === soajs.inputmaskData.branch) {
								record.versions[version.toString()].branches.splice(x, 1);
								if (record.versions[version.toString()].branches.length === 0) {
									delete record.versions[version.toString()];
									soajs.inputmaskData.oldVersion = version;
									found = true;
									delete soajs.inputmaskData.branch;
									// soajs.inputmaskData.recordToBeUpdated[type].push({
									// 	name: record.name,
									// 	field: {
									// 		["$unset"]: {
									// 			["versions." + version.toString()]: 1
									// 		}
									// 	}
									// });
								}
								else {
									soajs.inputmaskData.recordToBeUpdated[type].push({
										name: record.name,
										field: {
											["$set"]: {
												["versions." + version.toString() + ".branches"]: record.versions[version.toString()].branches
											}
										}
									});
								}
								break;
							}
						}
					}
				}
				if (found) {
					break;
				}
			}
			return cb();
		}
		
		soajs.inputmaskData.recordToBeUpdated = {};
		
		async.parallel([getRepoServices, getRepoDaemons], function (error, repoContents) {
			var names = [];
			repoContents.forEach(function (oneRepoArr) {
				names = names.concat(oneRepoArr);
			});

			//check if running instances exist before deleting
			var opts = {
				collection: hostsColl,
				conditions: { name: { '$in': names } }
			};
			model.countEntries(soajs, opts, function (error, count) {
				checkMongoError(soajs, error, cb, function () {
					if (count > 0) {
						return cb({ 'code': 766, 'message': 'Repository has running hosts' });
					}
					async.parallel([removeService, removeDaemon], function (error, results) {
						checkMongoError(soajs, error || !results, cb, function () {
							return cb(error, results);
						});
					});
				});
			});
		});

		function removeService(callback) {
			let opts = {
				collection: servicesColl,
				conditions: { 'src.owner': soajs.inputmaskData.owner, 'src.repo': soajs.inputmaskData.repo }
			};
			if(!soajs.inputmaskData.branch){
				model.removeEntry(soajs, opts, callback);
			}
			else {
				if(soajs.inputmaskData.recordToBeUpdated
					&& soajs.inputmaskData.recordToBeUpdated.service
					&& soajs.inputmaskData.recordToBeUpdated.service.length > 0){
					async.eachSeries(soajs.inputmaskData.recordToBeUpdated.service, function(service, call){
						opts.conditions.name = service.name;
						opts.fields = service.field;
						model.updateEntry(soajs, opts, call);
					}, callback)
				}
				else {
					return callback(null, true);
				}
			}
			
		}

		function removeDaemon(callback) {
			let opts = {
				collection: daemonsColl,
				conditions: { 'src.owner': soajs.inputmaskData.owner, 'src.repo': soajs.inputmaskData.repo }
			};
			if(!soajs.inputmaskData.branch){
				model.removeEntry(soajs, opts, callback);
			}
			else {
				if(soajs.inputmaskData.recordToBeUpdated
					&& soajs.inputmaskData.recordToBeUpdated.daemon
					&& soajs.inputmaskData.recordToBeUpdated.daemon.length > 0){
					async.eachSeries(soajs.inputmaskData.recordToBeUpdated.daemon, function(daemon, call){
						opts.conditions.name = daemon.name;
						opts.fields = daemon.field;
						model.updateEntry(soajs, opts, call);
					}, callback)
				}
				else {
					return callback(null, true);
				}
				
			}
		}
	},

	addNewServiceOrDaemon: function (req, BL, configSHA, type, info, config, cloudBL, deployer, cb) {
		let model = BL.model;
		let soajs = req.soajs;
		var coll;
		if (type === 'service') {
			coll = servicesColl;

			if (!info.swagger) {
				info.swagger = false;
			}

		} else if (type === 'daemon') {
			coll = daemonsColl;
		}

		var tempPath = info.path.path;
		var tempSHA = info.path.sha;

		delete info.path;

		var s = {
			'$set': {}
		};
		
		for (var p in info) {
			if (Object.hasOwnProperty.call(info, p)) {
				if (p !== 'versions') {
					s.$set[p] = info[p];
				}
			}
		}
		let version;
		if (info.versions) {
			for (var vp in info.versions) {
				if (Object.hasOwnProperty.call(info.versions, vp)) {
					s.$set['versions.' + vp.toString()] = info.versions[vp];
					version =  vp;
				}
			}
		}
		
		if (version){
			let inserted = false;
			if (soajs.inputmaskData.addingVersion){
				let serviceDaemonVersions;
				soajs.inputmaskData.branchToBeAdded.forEach((oneAddedBranch)=>{
					if (oneAddedBranch.name === info.name){
						serviceDaemonVersions = oneAddedBranch.versions;
					}
				});
				if (serviceDaemonVersions){
					for (let vp in serviceDaemonVersions) {
						if (Object.hasOwnProperty.call(serviceDaemonVersions, vp)) {
							//check if version found and add version to it
							if (vp === version){
								if (serviceDaemonVersions[vp].branches
									&& serviceDaemonVersions[vp].branches.length > 0){
									let f = serviceDaemonVersions[vp].branches.find(function(element) {
										return element === soajs.inputmaskData.configBranch;
									});
									if (!f){
										serviceDaemonVersions[vp].branches.push(soajs.inputmaskData.configBranch);
										s.$set['versions.' + vp.toString()].branches = serviceDaemonVersions[vp].branches;
									}
								}
								else {
									s.$set['versions.' + vp.toString()].branches = [soajs.inputmaskData.configBranch];
								}
								inserted = true;
							}
							else {
								//check if found in another version and removed
								if (serviceDaemonVersions[vp].branches
									&& serviceDaemonVersions[vp].branches.length > 0){
									for (let i = 0; i < serviceDaemonVersions[vp].branches.length; i++) {
										if (serviceDaemonVersions[vp].branches[i] === soajs.inputmaskData.configBranch) {
											serviceDaemonVersions[vp].branches.splice(i, 1);
											if (serviceDaemonVersions[vp].branches.length === 0){
												s.$unset['versions.' + vp.toString()] = 1;
												soajs.inputmaskData.oldVersion = vp.toString();
											}
											break;
										}
									}
								}
							}
						}
					}
				}
				//new version added
				if (!inserted){
					s.$set['versions.' + version.toString()].branches = [soajs.inputmaskData.configBranch];
				}
			}
			//first time adding version
			else {
				s.$set['versions.' + version.toString()].branches = [soajs.inputmaskData.configBranch];
			}
		}
		var opts = {
			collection: coll,
			conditions: { name: info.name },
			fields: s,
			options: { safe: true, multi: false, 'upsert': true }
		};
		if (s.$unset){
			helpers.checkifRepoIsDeployed(req, config, BL, cloudBL, deployer, cb, function(){
				updateEntry();
			});
		}
		else {
			updateEntry();
		}
		function updateEntry (){
			model.updateEntry(soajs, opts, function (error, data) {
				checkMongoError(soajs, error, cb, function () {
					var added = {
						type: type,
						name: info.name,
						repo: soajs.inputmaskData.owner + '/' + soajs.inputmaskData.repo
					};
					configSHA.push({
						contentType: type,
						contentName: info.name,
						path: tempPath,
						sha: tempSHA
					});
					return cb(null, added);
				});
			});
		}
	},

	comparePaths: function (req, config, remote, local, callback) {
		var soajs = req.soajs;
		let excludedFiles = [config.gitAccounts[soajs.inputmaskData.provider].soajsConfigFilesPath.soajsFile, config.gitAccounts[soajs.inputmaskData.provider].customConfigFilePath];
		
		//create indexes for local and remote
		var allPaths = [];
		var remoteIndex = {};
		var localIndex = {};
		
		remote.forEach(function (onePath) {
			if(onePath){
				remoteIndex[helpers.assurePath('config', onePath + "/config.js", soajs.inputmaskData.provider)] = {};
				if (allPaths.indexOf(helpers.assurePath('config', onePath + "/config.js", soajs.inputmaskData.provider)) === -1) {
					allPaths.push(helpers.assurePath('config', onePath + "/config.js", soajs.inputmaskData.provider));
				}
			}
		});

		local.forEach(function (onePath) {
			if (excludedFiles.indexOf(onePath.path) === -1) { //excluding root config.js file
				if(onePath.path){
					localIndex[helpers.assurePath('config', onePath.path, soajs.inputmaskData.provider)] = {
						contentName: onePath.contentName,
						contentType: onePath.contentType,
						sha: onePath.sha
					};
					if (allPaths.indexOf(helpers.assurePath('config', onePath.path, soajs.inputmaskData.provider)) === -1) {
						allPaths.push(helpers.assurePath('config', onePath.path, soajs.inputmaskData.provider));
					}
				}
			}
		});

		for (var i = 0; i < allPaths.length; i++) {
			if (localIndex[allPaths[i]] && remoteIndex[allPaths[i]]) {
				allPaths[i] = {
					path: allPaths[i],
					sha: localIndex[allPaths[i]].sha,
					status: 'available'
				};
			}
			else if (localIndex[allPaths[i]] && !remoteIndex[allPaths[i]]) {
				allPaths[i] = {
					path: allPaths[i],
					contentType: localIndex[allPaths[i]].contentType,
					contentName: localIndex[allPaths[i]].contentName,
					sha: localIndex[allPaths[i]].sha,
					status: 'removed'
				};
			}
			else if (!localIndex[allPaths[i]] && remoteIndex[allPaths[i]]) {
				allPaths[i] = {
					path: allPaths[i],
					status: 'new'
				};
			}
		}

		return callback(allPaths);
	},

	analyzeConfigSyncFile: function (req, repoConfig, path, configSHA, flags, cb) {
		if (repoConfig.type === 'service' || repoConfig.type === 'daemon') {
			req.soajs.log.debug("Analyzing config file for: " + repoConfig.serviceName + " of type: " + repoConfig.type);
		}
		else {
			req.soajs.log.debug("Analyzing root config file for repository of type " + repoConfig.type);
		}
		if(repoConfig.type !== 'multi'){
			
			if(configSHA && configSHA.remote === configSHA.local){
				return cb(null, 'upToDate');
			}
			else{
				return cb('outOfSync');
			}
			
			// if ((!flags || !flags.custom) && configSHA && configSHA.local === configSHA.remote) {//not applicable in case of multi repo, sub configs might be changed without changing root config
			// 	return cb(null, 'upToDate');
			// }
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

		opts.conditions['name'] = info.name;
		opts.conditions['src.repo'] = soajs.inputmaskData.repo;
		opts.conditions['src.owner'] = soajs.inputmaskData.owner;

		if (type === 'service') {
			opts.collection = servicesColl;
			opts.conditions['port'] = info.port;
		} else if (type === 'daemon') {
			opts.collection = daemonsColl;
			opts.conditions['port'] = info.port;
		}

		var configData = {
			contentType: type,
			contentName: info.name,
			path: info.path,
			sha: configSHA
		};
		
		if(['service','daemon'].indexOf(type) === -1){
			return cb(null, configData);
		}
		
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
					s.$set[ "versions." + vp.toString() ] = info.versions[ vp ];
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

	checkCanAdd: function (model, soajs, type, info, cb) {
		helpers.checkCanAddBranch(model, soajs, type, info, (err, count)=>{
			checkMongoError(soajs, err, cb, function () {
				if(count > 0){
					return cb(null, info);
				}
				let opts = {
					collection: '',
					conditions: {}
				};
				
				if (type === 'service') {
					opts.collection = servicesColl;
					opts.conditions[ '$or' ] = [
						{ "name": info.name },
						{ "port": info.port }
					];
				}
				else if (type === 'daemon') {
					opts.collection = daemonsColl;
					opts.conditions[ '$or' ] = [
						{ "name": info.name },
						{ "port": info.port }
					];
				}
				else{
					return cb(null, info);
				}
				
				model.countEntries(soajs, opts, function (error, count) {
					checkMongoError(soajs, error, cb, function () {
						if (type === 'service' || type === 'daemon') {
							if (count > 0) {
								soajs.log.error("A " + type + " with the same name or port exists");
								return cb('alreadyExists');
							}
							return cb(null, info);
						}
						else {
							if (count > 0) {
								soajs.log.error("Static content with the same name exists");
								return cb('alreadyExists');
							}
							return cb(null, info);
						}
					});
				});
			});
		});
	},
	
	checkCanAddBranch: function (model, soajs, type, info, cb) {
		let opts = {
			collection: '',
			conditions: {}
		};
		if (type === 'service') {
			opts.collection = servicesColl;
			opts.conditions[ '$and' ] = [
				{ "name": info.name },
				{ "port": info.port }
			];
		}
		else if (type === 'daemon') {
			opts.collection = daemonsColl;
			opts.conditions[ '$and' ] = [
				{ "name": info.name },
				{ "port": info.port }
			];
		}
		else {
			return cb(null, info);
		}
		model.findEntries(soajs, opts, (error, result) => {
			if (error) {
				return cb(error);
			}
			if (result && result.length > 0) {
				soajs.inputmaskData.addingVersion = true;
				if (soajs.inputmaskData.branchToBeAdded){
					soajs.inputmaskData.branchToBeAdded = soajs.inputmaskData.branchToBeAdded.concat(result);
				}
				else {
					soajs.inputmaskData.branchToBeAdded = result;
				}
			}
			return cb(null, result.length);
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

		opts.conditions['name'] = info.name;
		opts.conditions['src.repo'] = soajs.inputmaskData.repo;
		opts.conditions['src.owner'] = soajs.inputmaskData.owner;
		if (type === 'service') {
			opts.collection = servicesColl;
			opts.conditions['port'] = info.port;
		}
		else if (type === 'daemon') {
			opts.collection = daemonsColl;
			opts.conditions['port'] = info.port;
		}
		
		if(!opts.collection){
			return cb();
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
		let excludedFiles = [config.gitAccounts[provider].soajsConfigFilesPath.soajsFile, config.gitAccounts[provider].customConfigFilePath];
		let defaultConfigFilePath = checkPath();
		if (pathTo === 'config' && path.indexOf(defaultConfigFilePath) !== -1) {
			if (path.indexOf('/') === 0) {
				return path;
			}
			else {
				return '/' + path;
			}
		}

		if (pathTo === 'main' && path.indexOf(defaultConfigFilePath) !== -1) {
			path = path.substring(0, path.indexOf(defaultConfigFilePath));
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
			path = path + defaultConfigFilePath;
		}

		return path;
		
		function checkPath(){
			for(let i =0; i < excludedFiles.length; i++){
				if(path.indexOf(excludedFiles[i]) !== -1){
					return path;
				}
			}
		}
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
		var protocols = ['post', 'get', 'put', 'del', 'delete'];
		var excluded = ['commonFields'];
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

				if (schema[route]._apiInfo.group) {
					oneApi.group = schema[route]._apiInfo.group;
				}

				if (schema[route]._apiInfo.groupMain) {
					oneApi.groupMain = schema[route]._apiInfo.groupMain;
				}
				apiList.push(oneApi);
			}
		}

		if (newStyleApi) {
			for (var protocol in schema) {
				if (excluded.indexOf(protocol) !== -1) {
					continue;
				}

				for (var route in schema[protocol]) {
					var oneApi = {
						'l': schema[protocol][route]._apiInfo.l,
						'v': route,
						'm': protocol
					};

					if (schema[protocol][route]._apiInfo.group) {
						oneApi.group = schema[protocol][route]._apiInfo.group;
					}

					if (schema[protocol][route]._apiInfo.groupMain) {
						oneApi.groupMain = schema[protocol][route]._apiInfo.groupMain;
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
		if (repoConfig.type === 'daemon' || repoConfig.type === 'service') {
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
					lastSync: {
						branch : req.soajs.inputmaskData.configBranch,
						ts: new Date().getTime()
					},
					extKeyRequired: repoConfig.extKeyRequired,
					oauth: repoConfig.oauth || false,
					awareness: repoConfig.awareness || true,
					urac: repoConfig.urac || false,
					urac_Profile: repoConfig.urac_Profile || false,
					urac_ACL: repoConfig.urac_ACL || false,
					provision_ACL: repoConfig.provision_ACL || false,
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
				info.versions[repoConfig.serviceVersion] = {
					lastSync: {
						branch : req.soajs.inputmaskData.configBranch,
						ts: new Date().getTime()
					},
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
		else if(['static', 'custom'].indexOf(repoConfig.type) !== -1 && repoConfig.name){
			info.name = repoConfig.name;
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
		// else {
		// 	return cb({ code: 788, "msg": config.errors[788] });
		// }
		return cb(null, true);
	},

	buildDeployerOptions: function (envRecord, soajs, model) {
		var BL = {
			model: model
		};
		return utils.buildDeployerOptions(envRecord, soajs, BL);
	},

	doGetFile: function (req, BL, git, gitModel, account, branch, cb) {
		var options = {
			provider: account.provider,
			domain: account.domain,
			user: req.soajs.inputmaskData.owner,
			repo: req.soajs.inputmaskData.repo,
			project: req.soajs.inputmaskData.owner,
			path: req.soajs.inputmaskData.filepath,
			ref: branch,
			token: account.token,
			accountRecord: account
		};
		req.soajs.log.debug("Fetching file from:", options);
		git.getAnyContent(req.soajs, gitModel, BL.model, options, function (error, fileData) {
			checkReturnError(req, cb, {config: config, error: error, code: 789}, function () {
				return cb(null, fileData);
			});
		});
	},

	checkifRepoIsDeployed: function(req, config, BL, cloudBL, deployer, mainCb, cb){
		//get all env codes
		//async each env code --> get services
		//if on service matches stop
		var opts = {
			collection: 'environment',
			fields: {'code': 1}
		};
		let version = false;
		BL.model.findEntries(req.soajs, opts, function(error, envCodes){
			checkMongoError(req, error, mainCb, function () {
				async.eachSeries(envCodes, function(oneEnvCode, miniCb){
					//NOTE: need to get registry for environment, deployer depends on registry not environment record
					//NOTE: can't get registries without listing environments, no other way to get the list of available registries
					req.soajs.inputmaskData.env = oneEnvCode.code;
					cloudBL.listServices(config, req.soajs, deployer, function(error, services){
						checkReturnError(req, mainCb, { config: config, error: error, code: 795 }, function () {
							//check if a service is using this repo
							for(var i =0; i < services.length; i++){
								var match = false;
								var oneService = services[i];
								if(oneService.labels['service.repo'] === req.soajs.inputmaskData.repo){
									//check if same version
									if(oneService.labels['soajs.service.version']){
										if(oneService.labels['soajs.service.version'] === req.soajs.inputmaskData.oldVersion){
											match = true;
											version = true;
;											break;
										}
									}
									else {
										match = true;
										break;
									}
									
								}
							}
							if(match){
								return miniCb(true);
							}
							else{
								return miniCb(null, true);
							}
						});
					});
				}, function(error){
					if (error) {
						if (version) {
							return mainCb({
								'code': 766, 'message': `You cannot sync from branch ${req.soajs.inputmaskData.branch}
								because: v ${req.soajs.inputmaskData.oldVersion} is deployed from  branch  ${req.soajs.inputmaskData.branch}
								that you are trying to activate. We cannot find any active branch containing v ${req.soajs.inputmaskData.oldVersion},
								either activate a branch to support v ${req.soajs.inputmaskData.oldVersion} or delete its deployments.`
							});
						}
						else {
							return mainCb({'code': 766, 'message': 'Repository has services/daemons deployed'});
						}
					}
					else{
						return cb();
					}
				});
			});
		});
	}

};

module.exports = helpers;
