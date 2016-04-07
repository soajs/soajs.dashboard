'use strict';
var core = require("soajs/modules/soajs.core");
var validator = new core.validator.Validator();
var validatorSchemas = require("../schemas/serviceSchema.js");

var githubApi = require('github');
var async = require('async');
var fs = require('fs');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');
var shortid = require('shortid');

var githubTokenScope = ['repo', 'admin:repo_hook'];
var github = new githubApi({
	version: '3.0.0',
	debug: false,
	protocol: 'https',
	host: 'api.github.com',
	timeout: 30000,
	headers: {
		'user-agent': 'SOAJS GitHub App'
	}
});

var collName = 'git_accounts';
var servicesColl = 'services';
var daemonsColl = 'daemons';
var staticContentColl = 'staticContent';
var hostsColl = 'hosts';

var repoConfigsFolder = __dirname + '/repoConfigs';
shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_');

function validateId(mongo, req, cb) {
	try {
		req.soajs.inputmaskData.id = mongo.ObjectId(req.soajs.inputmaskData.id);
		return cb(null);
	} catch (e) {
		return cb(e);
	}
}

function checkIfError(req, res, data, cb) {
	if (data.error) {
		if (typeof (data.error) === 'object' && data.error.message) {
			req.soajs.log.error(data.error);
		}

		return res.jsonp(req.soajs.buildResponse({"code": data.code, "msg": data.config.errors[data.code]}));
	} else {
		if (cb) return cb();
	}
}

function getAuthToken(mongo, accountId, cb) {
	mongo.findOne(collName, {_id: accountId}, {token: 1, _id: 0}, function (error, tokenRecord) {
		return cb(error, (tokenRecord) ? tokenRecord.token : null);
	});
}

function clearConfigDir(cb) {
	rimraf(repoConfigsFolder, function (error) {
		if (error) {
			return cb(error);
		}

		return cb(null);
	});
}

function assurePath(pathTo, path) {
	if (pathTo === 'config' && path.indexOf('config.js') !== -1) {
		if (path.indexOf('/') === 0) {
			return path;
		}
		else {
			return '/' + path;
		}
	}

	if (pathTo === 'main' && path.indexOf('config.js') !== -1) {
		path = path.substring(0, path.indexOf('config.js'));
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
		path = path + 'config.js';
	}

	return path;
}

function getGitRepoContent(req, gitConfigObj, cb) {
	github.repos.getContent(gitConfigObj, function (error, response) {
		if (error) {
			req.soajs.log.error('Error for [' + gitConfigObj.repo + ']: ' + gitConfigObj.path);
			req.soajs.log.error(error);
			if (error.code === 404) {
				error.code = 761;//in case config file was not found in the remote repo
			}
			else {
				error.code = 763;//generic error to indicate an error while communicating with the github api
			}
			return cb(error);
		}
		return cb(null, response);
	});
}

function extractAPIsList(schema) {
	var excluded = ['commonFields'];
	var apiList = [];
	for (var route in schema) {
		if (Object.hasOwnProperty.call(schema, route)) {
			if (excluded.indexOf(route) !== -1) {
				continue;
			}

			var oneApi = {
				'l': schema[route]._apiInfo.l,
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
	return apiList;
}

function extractDaemonJobs(schema) {
	var jobList = {};
	for (var job in schema) {
		jobList[job] = {};
	}
	return jobList;
}


function getServiceInfo(req, repoConfig, path, flags) {
	var info = {};
	if (repoConfig.type === 'static') {
		info = {
			name: repoConfig.name,
			dashUI: repoConfig.dashUI,
			src: {
				owner: req.soajs.inputmaskData.owner,
				repo: req.soajs.inputmaskData.repo
			},
			path: path //needed for multi repo, not saved in db
		};
	}
	else if (repoConfig.type === 'daemon' || repoConfig.type === 'service') {
		if (repoConfig.type === 'service') {
			info = {
				name: repoConfig.serviceName,
				port: repoConfig.servicePort,
				group: repoConfig.serviceGroup,
				src: {
					owner: req.soajs.inputmaskData.owner,
					repo: req.soajs.inputmaskData.repo
				},
				requestTimeout: repoConfig.requestTimeout,
				requestTimeoutRenewal: repoConfig.requestTimeoutRenewal,
				versions: {},
				path: path //needed for multi repo, not saved in db
			};
			if (!repoConfig.serviceVersion) { //setting version to 1 by default if not specified in config file
				repoConfig.serviceVersion = 1;
			}
			info.versions[repoConfig.serviceVersion] = {
				extKeyRequired: repoConfig.extKeyRequired,
				awareness: repoConfig.awareness,
				apis: extractAPIsList(repoConfig.schema)
			};
		}
		else if (repoConfig.type === 'daemon') {
			info = {
				name: repoConfig.serviceName,
				port: repoConfig.servicePort,
				group: repoConfig.serviceGroup,
				src: {
					owner: req.soajs.inputmaskData.owner,
					repo: req.soajs.inputmaskData.repo
				},
				versions: {},
				path: path //needed for multi repo, not saved in db
			};
			if (!repoConfig.serviceVersion) { //setting version to 1 by default if not specified in config file
				repoConfig.serviceVersion = 1;
			}
			info.versions[repoConfig.serviceVersion] = {
				jobs: extractDaemonJobs(repoConfig.schema)
			};
		}
		if (repoConfig.main) {
			if (repoConfig.main.charAt(0) !== '/') {
				repoConfig.main = '/' + repoConfig.main;
			}
			info.src.main = repoConfig.main;
		}
		else if (flags && flags.multi) {
			if (typeof (path) === 'object') {
				info.src.main = assurePath('main', path.path);
			}
			else {
				info.src.main = assurePath('main', path);
			}
		}
	}
	return info;
}

function validateFileContents(req, repoConfig, cb) {
	if (repoConfig.type && repoConfig.type === 'multi') {
		if (!repoConfig.folders || !Array.isArray(repoConfig.folders) || (Array.isArray(repoConfig.folders) && repoConfig.folders.length === 0)) {
			req.soajs.log.error('Missing multi repository config data');
			return cb({'message': 'Missing multi repository config data'});
		}
	}
	else if (repoConfig.type && (repoConfig.type === 'service' || repoConfig.type === 'daemon')) {
		var errMsgs = [];
		var check = validator.validate(repoConfig, validatorSchemas.config);
		if (!check.valid) {
			check.errors.forEach(function (oneError) {
				errMsgs.push(oneError.stack);
			});
			req.soajs.log.error(errMsgs);
			return cb({"message": new Error(errMsgs.join(" - ")).message});
		}
	}
	else if (repoConfig.type && repoConfig.type === 'static') {
		if (!repoConfig.name) {
			return cb({'message': 'Missing field name for static repo in config.js'});
		}
	}
	else {
		return cb({'message': 'Invalid or no type provided in config.js'});
	}
	return cb(null, true);
}

module.exports = {

	'login': function (mongo, config, req, res) {
		var accountInfo = {
			type: req.soajs.inputmaskData.type,
			access: req.soajs.inputmaskData.access
		};

		mongo.count(collName, {owner: req.soajs.inputmaskData.username}, function (error, count) {
			checkIfError(req, res, {config: config, error: error, code: 751}, function () {
				checkIfError(req, res, {config: config, error: count > 0, code: 752}, function () {
					createAccount(accountInfo, function (error, record) {
						checkIfError(req, res, {
							config: config,
							error: error,
							code: (error && error.code) ? error.code : 751
						}, function () {
							mongo.insert(collName, record, function (error) {
								checkIfError(req, res, {config: config, error: error, code: 751}, function () {
									return res.jsonp(req.soajs.buildResponse(null, true));
								});
							});
						});
					});
				});
			});
		});

		function createAccount(info, cb) {
			if (info.type === 'personal') {
				createPersonalAccount(info, cb);
			} else {
				createOrgAccount(info, cb);
			}
		}

		function createPersonalAccount(info, cb) {
			var record = {
				label: req.soajs.inputmaskData.label,
				owner: req.soajs.inputmaskData.username,
				provider: req.soajs.inputmaskData.provider,
				type: info.type,
				access: info.access,
				repos: []
			};

			if (info.access === 'private') {
				github.authenticate({
					type: 'basic',
					username: req.soajs.inputmaskData.username,
					password: req.soajs.inputmaskData.password
				});

				var tokenLabel = 'SOAJS GitHub App Token (soajs_' + shortid.generate() + ')';
				github.authorization.create({
					scopes: githubTokenScope,
					note: tokenLabel
				}, function (error, response) {
					if (error) {
						req.soajs.log.error(error);
						error.code = 763;
						return cb(error);
					}

					record.token = response.token;
					record.authId = response.id;

					return cb(null, record);
				});
			} else {
				//verify the public user account exists
				github.user.getFrom({
					user: req.soajs.inputmaskData.username
				}, function (error, result) {
					if (error) {
						if (error.message === 'Not Found') {
							error.code = 767;
						} else {
							error.code = 763;
						}
						return cb(error);
					}

					return cb(null, record);
				});
			}
		}

		function createOrgAccount(info, cb) {
			var record = {
				label: req.soajs.inputmaskData.label,
				owner: req.soajs.inputmaskData.username,
				type: info.type,
				access: info.access,
				repos: []
			};

			//verify that public org exists
			github.orgs.get({
				org: req.soajs.inputmaskData.username
			}, function (error, result) {
				if (error) {
					if (error.message === 'Not Found') {
						error.code = 767;
					} else {
						error.code = 763;
					}

					return cb(error);
				}

				return cb(null, record);
			});
		}
	},

	'logout': function (mongo, config, req, res) {
		validateId(mongo, req, function (error) {
			checkIfError(req, res, {config: config, error: error, code: 701}, function () {
				mongo.findOne(collName, {_id: req.soajs.inputmaskData.id}, function (error, record) {
					checkIfError(req, res, {config: config, error: error || !record, code: 753}, function () {
						checkIfError(req, res, {
							config: config,
							error: record.repos.length > 0,
							code: 754
						}, function () {
							mongo.remove(collName, {_id: req.soajs.inputmaskData.id}, function (error) {
								checkIfError(req, res, {config: config, error: error, code: 753}, function () {
									if (record.authId) {
										github.authenticate({
											type: 'basic',
											username: req.soajs.inputmaskData.username,
											password: req.soajs.inputmaskData.password
										});
										github.authorization.delete({
											id: record.authId
										}, function (error) {
											checkIfError(req, res, {
												config: config,
												error: error,
												code: 753
											}, function () {
												req.soajs.log.debug("SOAJS token deleted successfully from GitHub account");
												return res.jsonp(req.soajs.buildResponse(null, true));
											});
										});
									}
									else {
										return res.jsonp(req.soajs.buildResponse(null, true));
									}
								});
							});
						});
					});
				});
			});
		});
	},

	'listAccounts': function (mongo, config, req, res) {
		mongo.find(collName, {}, {token: 0, repos: 0}, function (error, accounts) {
			checkIfError(req, res, {config: config, error: error, code: 756}, function () {
				return res.jsonp(req.soajs.buildResponse(null, accounts));
			});
		});
	},

	'getRepos': function (mongo, config, req, res) {
		validateId(mongo, req, function (error) {
			checkIfError(req, res, {config: config, error: error, code: 701}, function () {
				mongo.findOne(collName, {_id: req.soajs.inputmaskData.id}, function (error, accountRecord) {
					checkIfError(req, res, {config: config, error: error || !accountRecord, code: 757}, function () {
						if (accountRecord.token) { //private account with token
							github.authenticate({type: 'oauth', token: accountRecord.token});
							github.repos.getAll({}, function (error, response) {
								checkIfError(req, res, {config: config, error: error, code: 758}, function () {
									addReposStatus(response, accountRecord.repos, function (repos) {
										return res.jsonp(req.soajs.buildResponse(null, repos));
									});
								});
							});
						} else { //public account
							github.repos.getFromUser({
								user: accountRecord.owner
							}, function (error, response) {
								checkIfError(req, res, {config: config, error: error, code: 758}, function () {
									addReposStatus(response, accountRecord.repos, function (repos) {
										return res.jsonp(req.soajs.buildResponse(null, repos));
									});
								});
							});
						}
					});
				});
			});
		});

		function addReposStatus(allRepos, activeRepos, cb) {
			if (!allRepos || allRepos.length === 0 || !activeRepos || activeRepos.length === 0) {
				return cb(allRepos);
			}

			var found;
			activeRepos.forEach(function (oneRepo) {
				found = false;
				for (var i = 0; i < allRepos.length; i++) {
					if (allRepos[i].full_name === oneRepo.name) {
						if (oneRepo.status) {
							allRepos[i].status = oneRepo.status;
						} else {
							allRepos[i].status = 'active';
						}

						found = true;
						break;
					}
				}
				if (!found) {
					//USING THE SAME RECORD FORMAT AS GITHUB API RESPONSES
					var repoInfo = oneRepo.name.split('/');
					allRepos.unshift({
						full_name: oneRepo.name,
						owner: {
							login: repoInfo[0]
						},
						name: repoInfo[1],
						status: 'deleted'
					});
				}
			});

			return cb(allRepos);
		}
	},

	'getBranches': function (mongo, config, req, res) {
		getRecord(function (error, info) {
			if (error) {
				return res.jsonp(req.soajs.buildResponse({"code": 759, "msg": config.errors[759]}));
			}
			var repoInfo = info.repoInfo.split('/');
			if (info.token) {
				github.authenticate({type: 'oauth', token: info.token});
			}
			github.repos.getBranches({
				user: repoInfo[0],
				repo: repoInfo[1]
			}, function (error, response) {
				checkIfError(req, res, {config: config, error: error, code: 759}, function () {
					var result = {
						owner: repoInfo[0],
						repo: repoInfo[1],
						branches: response
					};
					return res.jsonp(req.soajs.buildResponse(null, result));
				});
			});
		});

		function getRecord(cb) {
			var coll;
			var type = req.soajs.inputmaskData.type;
			if (type === 'service') {
				coll = servicesColl;
			}
			else if (type === 'daemon') {
				coll = daemonsColl;
			}
			else if (type === 'static') {
				coll = staticContentColl;
			}
			else if (type === 'repo') {
				return getAccountByRepo(cb);
			}

			mongo.findOne(coll, {name: req.soajs.inputmaskData.name}, function (error, record) {
				if (error) {
					return cb(error);
				}

				if (!record) {
					req.soajs.log.error('Name [' + req.soajs.inputmaskData.name + '] does not match any ' + type);
					return cb({'message': 'Name does not match any ' + type});
				}

				return getAccountByModule(record, cb);
			});
		}

		function getAccountByModule(record, cb) {
			var repoLabel = record.src.owner + '/' + record.src.repo;
			mongo.findOne(collName, {'repos.name': repoLabel}, {
				'token': 1,
				'repos.$': 1
			}, function (error, accountRecord) {
				checkIfError(req, res, {
					config: config,
					error: error || !accountRecord,
					code: 759
				}, function () {
					var info = {
						repoInfo: accountRecord.repos[0].name,
						token: accountRecord.token
					};
					return cb(null, info);
				});
			});
		}

		function getAccountByRepo(cb) {
			validateId(mongo, req, function (error) {
				checkIfError(req, res, {config: config, error: error, code: 701}, function () {
					mongo.findOne(collName, {'_id': req.soajs.inputmaskData.id}, function (error, record) {
						checkIfError(req, res, {config: config, error: error || !record, code: 759}, function () {
							var info = {
								repoInfo: req.soajs.inputmaskData.name,
								token: record.token
							};

							return cb(null, info);
						});
					});
				});
			});
		}
	},

	'activateRepo': function (mongo, config, req, res) {
		var configSHA = [];
		validateId(mongo, req, function (error) {
			checkIfError(req, res, {config: config, error: error, code: 701}, function () {
				getAuthToken(mongo, req.soajs.inputmaskData.id, function (error, token) {
					checkIfError(req, res, {config: config, error: error, code: 755}, function () {
						getConfigFile(token, 'config.js', null, function (error, repoInfo) {
							checkIfError(req, res, {
								config: config,
								error: (error && error === 'alreadyExists'),
								code: 762
							}, function () {
								checkIfError(req, res, {
									config: config,
									error: error,
									code: (error && error.code) ? error.code : 761
								}, function () {
									//only triggered in case of single repo, in case of multi check addNewMulti()
									addNew(repoInfo.type, repoInfo.info, function (error, result) {
										checkIfError(req, res, {config: config, error: error, code: 761}, function () {
											clearConfigDir(function (error) {
												checkIfError(req, res, {
													config: config,
													error: error,
													code: 761
												}, function () {
													var newRepo = {
														name: req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo,
														type: result.type,
														configBranch: req.soajs.inputmaskData.configBranch,
														configSHA: configSHA[0].sha
													};
													mongo.update(collName, {_id: req.soajs.inputmaskData.id}, {'$addToSet': {'repos': newRepo}}, function (error, data) {
														checkIfError(req, res, {
															config: config,
															error: error || !data,
															code: 761
														}, function () {
															return res.jsonp(req.soajs.buildResponse(null, result));
														});
													});
												});
											});
										});
									});
								});
							});
						});
					});
				});
			});
		});

		function getConfigFile(token, path, flags, cb) {
			var configPath = assurePath('config', path);
			if (token) {
				github.authenticate({type: 'oauth', token: token});
			}
			var gitConfigObj = {
				user: req.soajs.inputmaskData.owner,
				repo: req.soajs.inputmaskData.repo,
				path: configPath,
				ref: req.soajs.inputmaskData.configBranch
			};
			getGitRepoContent(req, gitConfigObj, function (error, response) {
				if (error) {
					return cb(error);
				}
				var path = {
					path: configPath,
					sha: response.sha
				};

				var configFile = new Buffer(response.content, 'base64');
				//Remove all require() calls from config file if any
				configFile = configFile.toString().replace(/require\s*\(.+\)/g, '""');

				var configDirPath = repoConfigsFolder + configPath.substring(0, configPath.lastIndexOf('/'));

				fs.exists(configDirPath, function (exists) {
					if (!exists) {
						mkdirp(configDirPath, function (error) {
							if (error) {
								return cb(error);
							}

							fs.writeFile(repoConfigsFolder + configPath, configFile, function (error) {
								if (error) {
									return cb(error);
								}

								analyzeConfigFile(path, token, flags, cb);
							});
						});
					}
					else {
						fs.writeFile(repoConfigsFolder + configPath, configFile, function (error) {
							if (error) {
								return cb(error);
							}

							analyzeConfigFile(path, token, flags, cb);
						});
					}
				});

			});

		}

		function analyzeConfigFile(path, token, flags, cb) {
			var configPath = path.path;

			var configFilePath = repoConfigsFolder + configPath;
			if (require.resolve(configFilePath)) {
				delete require.cache[require.resolve(configFilePath)];
			}

			var repoConfig = require(configFilePath);
			validateFileContents(req, repoConfig, function (error) {
				if (error) {
					return cb(error);
				}
				var info = {};
				if (repoConfig.type === 'multi') {
					addNewMulti(repoConfig.folders, token, cb);
				}
				else {
					info = getServiceInfo(req, repoConfig, path, flags);
					if (info.path) {
						delete info.path;
					}
					checkCanAdd(repoConfig.type, info, function (error) {
						if (error) {
							return cb(error);
						}
						var result = {
							type: repoConfig.type,
							info: info
						};
						result.info.path = {//needed for multi repos
							path: path.path,
							sha: path.sha
						};
						return cb(null, result);
					});
				}
			});
		}

		function checkCanAdd(type, info, cb) {
			var coll;
			var criteria = {};
			criteria['name'] = info.name;
			criteria['src.repo'] = req.soajs.inputmaskData.repo;
			criteria['src.owner'] = req.soajs.inputmaskData.owner;

			if (type === 'service') {
				coll = servicesColl;
				criteria['port'] = info.port;
			}
			else if (type === 'daemon') {
				coll = daemonsColl;
				criteria['port'] = info.port;
			}
			else if (type === 'static') {
				coll = staticContentColl;
			}

			mongo.count(coll, criteria, function (error, count) {
				if (error) {
					return cb(error);
				}

				if (count > 0) {
					if (type === 'service' || type === 'daemon') {
						req.soajs.log.error("A " + type + " with the same name or port exists");
					}
					else {
						req.soajs.log.error("Static content with the same name exists");
					}

					return cb('alreadyExists');
				}

				return cb(null, info);
			});
		}

		function addNew(type, info, cb) {
			if (type === 'service' || type === 'daemon') {
				addNewServiceOrDaemon(type, info, cb);
			}
			else if (type === 'static') {
				addNewStaticContent(type, info, cb);
			}
		}

		function addNewServiceOrDaemon(type, info, cb) {
			var coll;
			if (type === 'service') {
				coll = servicesColl;
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

			if (info.versions) {
				for (var vp in info.versions) {
					if (Object.hasOwnProperty.call(info.versions, vp)) {
						s.$set['versions.' + vp] = info.versions[vp];
					}
				}
			}

			mongo.update(coll, {name: info.name}, s, {safe: true, multi: false, 'upsert': true}, function (error) {
				if (error) {
					return cb(error);
				}

				var added = {
					type: type,
					name: info.name,
					repo: req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo
				};
				configSHA.push({
					contentType: type,
					contentName: info.name,
					path: tempPath,
					sha: tempSHA
				});
				return cb(null, added);
			});
		}

		function addNewMulti(paths, token, cb) {
			async.map(paths, function (path, callback) {
				getConfigFile(token, path, {multi: true}, callback);
			}, function (error, results) {
				if (error) {
					//req.soajs.log.error(error);
					return cb(error);
				}
				async.map(results, function (result, callback) {
					addNew(result.type, result.info, callback);
				}, function (error, data) {
					if (error) {
						return cb(error);
					}
					clearConfigDir(function (error) {
						checkIfError(req, res, {config: config, error: error, code: 761}, function () {
							var newRepo = {
								name: req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo,
								type: 'multi',
								configBranch: req.soajs.inputmaskData.configBranch,
								configSHA: configSHA
							};
							mongo.update(collName, {_id: req.soajs.inputmaskData.id}, {'$addToSet': {'repos': newRepo}}, function (error, result) {
								checkIfError(req, res, {
									config: config,
									error: error || !result,
									code: 761
								}, function () {
									return res.jsonp(req.soajs.buildResponse(null, data));
								});
							});
						});
					});
				});
			});
		}

		function addNewStaticContent(type, staticContentInfo, cb) {
			var tempPath = staticContentInfo.path.path;
			var tempSHA = staticContentInfo.path.sha;

			delete staticContentInfo.path;

			mongo.insert(staticContentColl, staticContentInfo, function (error) {
				if (error) {
					return cb(error);
				}

				var added = {
					type: 'static',
					name: staticContentInfo.name,
					repo: req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo
				};
				configSHA.push({
					contentType: type,
					contentName: staticContentInfo.name,
					path: tempPath,
					sha: tempSHA
				});
				return cb(null, added);
			});
		}
	},

	'deactivateRepo': function (mongo, config, req, res) {
		validateId(mongo, req, function (error) {
			checkIfError(req, res, {config: config, error: error, code: 701}, function () {
				mongo.findOne(collName, {_id: req.soajs.inputmaskData.id}, function (error, accountRecord) {
					checkIfError(req, res, {config: config, error: error, code: 765}, function () {
						for (var i = 0; i < accountRecord.repos.length; i++) {
							if (accountRecord.repos[i].name === req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo) {
								remove(accountRecord.repos[i].type, function (error, result) {
									checkIfError(req, res, {
										config: config,
										error: error,
										code: (error && error.code) ? error.code : 765
									}, function () {
										return res.jsonp(req.soajs.buildResponse(null, true));
									});
								});
							}
						}
					});
				});
			});
		});

		function remove(type, cb) {
			if (type === 'service' || type === 'daemon') {
				removeServiceOrDaemon(type, cb);
			} else if (type === 'static') {
				removeStaticContent(cb);
			} else if (type === 'multi') {
				removeMulti(cb);
			} else {
				req.soajs.log.error("Invalid type detected, must be [service || daemon || static || multi]");
				return cb("invalidType");
			}
		}

		function removeServiceOrDaemon(type, cb) {
			var coll = '';
			if (type === 'service') {
				coll = servicesColl
			} else {
				coll = daemonsColl;
			}
			mongo.findOne(coll, {
				'src.owner': req.soajs.inputmaskData.owner,
				'src.repo': req.soajs.inputmaskData.repo
			}, {name: 1, _id: 0}, function (error, record) {
				if (error || !record) {
					return cb(error);// || !record);
				}
				//check hosts collection first, if no running services exist, allow deactivate
				mongo.count(hostsColl, {name: record.name}, function (error, count) {
					if (error) {
						return cb(error);
					}
					if (count > 0) {
						return cb({'code': 766, 'message': 'Repository has running hosts'});
					}

					mongo.remove(coll, {
						'src.owner': req.soajs.inputmaskData.owner,
						'src.repo': req.soajs.inputmaskData.repo
					}, function (error) {
						if (error) {
							return cb(error);
						}

						var repoLabel = req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo;
						mongo.update(collName, {_id: req.soajs.inputmaskData.id}, {'$pull': {'repos': {'name': repoLabel}}}, function (error, result) {
							if (error || !result) {
								return cb(error || !result);
							}

							return cb(null, true);
						});
					});
				});
			});
		}

		function removeStaticContent(cb) {
			mongo.remove(staticContentColl, {
				'src.owner': req.soajs.inputmaskData.owner,
				'src.repo': req.soajs.inputmaskData.repo
			}, function (error) {
				if (error) {
					return cb(error);
				}

				var repoLabel = req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo;
				mongo.update(collName, {_id: req.soajs.inputmaskData.id}, {'$pull': {'repos': {'name': repoLabel}}}, function (error, result) {
					if (error || !result) {
						return cb(error || !result);
					}

					return cb(null, true);
				});
			});
		}

		function removeMulti(cb) {
			async.parallel([getRepoServices, getRepoDaemons], function (error, repoContents) {
				var names = [];
				repoContents.forEach(function (oneRepoArr) {
					names = names.concat(oneRepoArr);
				});

				//check if running instances exist before deleting
				mongo.count(hostsColl, {name: {'$in': names}}, function (error, count) {
					if (error) {
						return cb(error);
					}
					if (count > 0) {
						return cb({'code': 766, 'message': 'Repository has running hosts'});
					}

					async.parallel([removeService, removeDaemon, removeStaticContent], function (error, results) {
						var repoLabel = req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo;
						mongo.update(collName, {_id: req.soajs.inputmaskData.id}, {'$pull': {'repos': {'name': repoLabel}}}, function (error, result) {
							if (error || !result) {
								return cb(error || !result);
							}

							return cb(null, results);
						});
					});
				});
			});

			function removeService(callback) {
				mongo.remove(servicesColl, {
					'src.owner': req.soajs.inputmaskData.owner,
					'src.repo': req.soajs.inputmaskData.repo
				}, function (error) {
					return callback(error);
				});
			}

			function removeDaemon(callback) {
				mongo.remove(daemonsColl, {
					'src.owner': req.soajs.inputmaskData.owner,
					'src.repo': req.soajs.inputmaskData.repo
				}, function (error) {
					return callback(error);
				});
			}

			function removeStaticContent(callback) {
				mongo.remove(staticContentColl, {
					'src.owner': req.soajs.inputmaskData.owner,
					'src.repo': req.soajs.inputmaskData.repo
				}, function (error) {
					return callback(error);
				});
			}

			function getRepoServices(callback) {
				mongo.find(servicesColl, {
					'src.owner': req.soajs.inputmaskData.owner,
					'src.repo': req.soajs.inputmaskData.repo
				}, {name: 1, _id: 0}, function (error, records) {
					for (var i = 0; i < records.length; i++) {
						records[i] = records[i].name;
					}
					return callback(error, records);
				});
			}

			function getRepoDaemons(callback) {
				mongo.find(daemonsColl, {
					'src.owner': req.soajs.inputmaskData.owner,
					'src.repo': req.soajs.inputmaskData.repo
				}, {name: 1, _id: 0}, function (error, records) {
					for (var i = 0; i < records.length; i++) {
						records[i] = records[i].name;
					}
					return callback(error, records);
				});
			}
		}
	},

	'syncRepo': function (mongo, config, req, res) {
		validateId(mongo, req, function (error) {
			checkIfError(req, res, {config: config, error: error, code: 701}, function () {
				mongo.findOne(collName, {_id: req.soajs.inputmaskData.id}, function (error, accountRecord) {
					checkIfError(req, res, {config: config, error: error, code: 767}, function () {
						var repoLabel = req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo;
						var configSHA;
						for (var i = 0; i < accountRecord.repos.length; i++) {
							if (accountRecord.repos[i].name === repoLabel) {
								configSHA = accountRecord.repos[i].configSHA;
								req.soajs.data = {
									configBranch: accountRecord.repos[i].configBranch
								};
								break;
							}
						}

						getConfigFile(accountRecord.token, configSHA, 'config.js', null, function (error, result) {
							clearConfigDir(function (clearError) {
								checkIfError(req, res, {config: config, error: clearError, code: 768}, function () {
									if (error && error === 'outOfSync') {
										mongo.update(collName, {
											_id: req.soajs.inputmaskData.id,
											'repos.name': repoLabel
										}, {'$set': {'repos.$.status': 'outOfSync'}}, function (error, result) {
											checkIfError(req, res, {
												config: config,
												error: error || !result,
												code: 600
											}, function () {
												return res.jsonp(req.soajs.buildResponse(null, {status: 'outOfSync'}));
											});
										});
									}
									else {
										checkIfError(req, res, {
											config: config,
											error: error,
											code: (error && error.code) || 768
										}, function () {
											if (result && result.status === 'multiSyncDone') { //multi repo, syncRepo already done
												return res.jsonp(req.soajs.buildResponse(null, result));
											}

											//repo config is up to date, no need for sync
											if (result && result === 'upToDate') {
												return res.jsonp(req.soajs.buildResponse(null, {status: 'upToDate'}));
											}

											//not a multi repo and repo config is not up to date
											syncRepo(result.type, result.info, result.sha, function (error, newSHA) {
												checkIfError(req, res, {
													config: config,
													error: error,
													code: 768
												}, function () {
													var repoLabel = req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo;
													mongo.update(collName, {
														_id: req.soajs.inputmaskData.id,
														'repos.name': repoLabel
													}, {'$set': {'repos.$.configSHA': newSHA.sha}}, function (error, result) {
														checkIfError(req, res, {
															config: config,
															error: error || !result,
															code: 600
														}, function () {
															return res.jsonp(req.soajs.buildResponse(null, true));
														});
													});
												});
											});
										});
									}
								});
							});
						});
					});
				});
			});
		});

		function getConfigFile(token, sha, path, flags, cb) {
			var configPath = assurePath('config', path);
			if (token) {
				github.authenticate({type: 'oauth', token: token});
			}
			var gitConfigObj = {
				user: req.soajs.inputmaskData.owner,
				repo: req.soajs.inputmaskData.repo,
				path: configPath,
				ref: req.soajs.data.configBranch
			};

			getGitRepoContent(req, gitConfigObj, function (error, response) {
				if (error) {
					return cb(error);
				}

				var configSHA = {
					local: sha,
					remote: response.sha
				};

				var configFile = new Buffer(response.content, 'base64');
				//Remove all require() calls from config file if any
				configFile = configFile.toString().replace(/require\s*\(.+\)/g, '""');

				var configDirPath = repoConfigsFolder + configPath.substring(0, configPath.lastIndexOf('/'));
				fs.exists(configDirPath, function (exists) {
					if (!exists) {
						mkdirp(configDirPath, function (error) {
							if (error) {
								return cb(error);
							}

							fs.writeFile(repoConfigsFolder + configPath, configFile, function (error) {
								if (error) {
									return cb(error);
								}

								analyzeConfigFile(path, token, configSHA, flags, cb);
							});
						});
					}
					else {
						fs.writeFile(repoConfigsFolder + configPath, configFile, function (error) {
							if (error) {
								return cb(error);
							}

							analyzeConfigFile(path, token, configSHA, flags, cb);
						});
					}
				});
			});

		}

		function analyzeConfigFile(path, token, configSHA, flags, cb) {
			var configPath = assurePath('config', path);

			var configFilePath = repoConfigsFolder + configPath;
			if (require.resolve(configFilePath)) {
				delete require.cache[require.resolve(configFilePath)];
			}

			var repoConfig = require(configFilePath);
			if (repoConfig.type !== 'multi' && configSHA.local === configSHA.remote) {//not applicable in case of multi repo, sub configs might be changed without changing root config
				return cb(null, 'upToDate');
			}
			validateFileContents(req, repoConfig, function (error) {
				if (error) {
					return cb(error);
				}
				var info = {};
				if (repoConfig.type === 'multi') {
					syncMultiRepo(repoConfig.folders, token, cb);
				}
				else {
					info = getServiceInfo(req, repoConfig, path, flags);
					checkCanSync(repoConfig.type, info, flags, function (error) {
						if (error) {
							req.soajs.log.error(error);
							return cb(error);
						}
						var result = {
							type: repoConfig.type,
							info: info,
							sha: configSHA.remote
						};

						return cb(null, result);
					});
				}
			});
		}

		function checkCanSync(type, info, flags, cb) {
			if (flags && flags.new) {//in case a new sub service was added, it shouldn't check for its existence
				return cb(null, info);
			}
			var coll;
			var criteria = {};
			criteria['name'] = info.name;
			criteria['src.repo'] = req.soajs.inputmaskData.repo;
			criteria['src.owner'] = req.soajs.inputmaskData.owner;
			if (type === 'service') {
				coll = servicesColl;
				criteria['port'] = info.port;
			}
			else if (type === 'daemon') {
				coll = daemonsColl;
				criteria['port'] = info.port;
			}
			else if (type === 'static') {
				coll = staticContentColl;
			}
			mongo.count(coll, criteria, function (error, count) {
				if (error) {
					return cb(error);
				}

				if (count === 0) {
					req.soajs.log.error("Repository is out of sync");
					return cb('outOfSync');
				}

				return cb(null, info);
			});
		}

		function syncRepo(type, info, configSHA, cb) {
			var coll;
			var criteria = {};
			criteria['name'] = info.name;
			criteria['src.repo'] = req.soajs.inputmaskData.repo;
			criteria['src.owner'] = req.soajs.inputmaskData.owner;

			if (type === 'service') {
				coll = servicesColl;
				criteria['port'] = info.port;
			} else if (type === 'daemon') {
				coll = daemonsColl;
				criteria['port'] = info.port;
			} else if (type === 'static') {
				coll = staticContentColl;
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
						s.$set[p] = info[p];
					}
				}
			}

			if (info.versions) {
				for (var vp in info.versions) {
					if (Object.hasOwnProperty.call(info.versions, vp)) {
						s.$set['versions.' + vp] = info.versions[vp];
					}
				}
			}
			mongo.update(coll, criteria, s, {'upsert': true}, function (error) {
				if (error) {
					return cb(error);
				}

				return cb(null, configData);
			});
		}

		function syncMultiRepo(paths, token, cb) {
			var repoLabel = req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo;
			mongo.findOne(collName, {
				_id: req.soajs.inputmaskData.id,
				'repos.name': repoLabel
			}, {'repos.$': 1}, function (error, record) {
				if (error) {
					return cb(error);
				}

				var configSHA = record.repos[0].configSHA;
				comparePaths(paths, configSHA, function (allPaths) {
					var flags = {
						multi: true
					};

					async.map(allPaths, function (path, callback) {
						if (path.status === 'available') {
							getConfigFile(token, path.sha, path.path, flags, callback);
						}
						else if (path.status === 'new') {
							flags.new = true;
							getConfigFile(token, path.sha, path.path, flags, callback);
						}
						else if (path.status === 'removed') {
							remove(path, callback);
						}
					}, function (error, results) {
						if (error) {
							return cb(error);
						}

						async.map(results, function (oneResult, callback) {
							if (typeof(oneResult) === 'object' && oneResult.type && oneResult.info && oneResult.sha) {
								syncRepo(oneResult.type, oneResult.info, oneResult.sha, callback);
							} else {
								return callback(null, oneResult);
							}
						}, function (error, results) {
							if (error) {
								return cb(error);
							}

							var resObj = {
								updated: [],
								removed: [],
								added: []
							};
							var found = false;
							results.forEach(function (output) {
								if (output !== 'upToDate') {
									if (output.removed) {//removed
										for (var i = configSHA.length - 1; i >= 0; i--) {
											if (configSHA[i].path === output.path && configSHA[i].sha === output.sha) {
												resObj.removed.push({
													name: output.contentName,
													type: output.contentType
												});
												configSHA.splice(i, 1);
												break;
											}
										}
									} else {//updated
										for (var i = 0; i < configSHA.length; i++) {
											if (configSHA[i].path === output.path) {
												configSHA[i].sha = output.sha;
												resObj.updated.push({
													name: output.contentName,
													type: output.contentType
												});
												found = true;
												break;
											}
										}
										if (!found) { //added
											configSHA.push(output);
											resObj.added.push({
												name: output.contentName,
												type: output.contentType
											});
										}
									}
								}
							});
							mongo.update(collName, {
								_id: req.soajs.inputmaskData.id,
								'repos.name': repoLabel
							}, {'$set': {'repos.$.configSHA': configSHA}}, function (error, result) {
								if (error || !result) {
									return cb(error || !result);
								}

								resObj.status = 'multiSyncDone';
								return cb(null, resObj);
							});
						});
					});
				});
			});
		}

		function comparePaths(remote, local, callback) {
			//create indexes for local and remote
			var allPaths = [];
			var remoteIndex = {};
			var localIndex = {};

			remote.forEach(function (onePath) {
				remoteIndex[assurePath('config', onePath)] = {};
				if (allPaths.indexOf(assurePath('config', onePath)) === -1) {
					allPaths.push(assurePath('config', onePath));
				}
			});

			local.forEach(function (onePath) {
				if (onePath.path !== 'config.js') { //excluding root config.js file
					localIndex[assurePath('config', onePath.path)] = {
						contentName: onePath.contentName,
						contentType: onePath.contentType,
						sha: onePath.sha
					};
					if (allPaths.indexOf(assurePath('config', onePath.path)) === -1) {
						allPaths.push(assurePath('config', onePath.path));
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
		}

		function remove(path, callback) {
			mongo.count(hostsColl, {name: path.contentName}, function (error, count) {
				if (error) {
					return callback(error);
				}

				if (count > 0) {
					return callback('hostsExist');
				}

				var coll;
				if (path.contentType === 'service') {
					coll = servicesColl;
				}
				else if (path.contentType === 'daemon') {
					coll = daemonsColl;
				}
				else if (path.contentType === 'static') {
					coll = staticContentColl;
				}

				mongo.remove(coll, {
					name: path.contentName,
					'src.owner': req.soajs.inputmaskData.owner,
					'src.repo': req.soajs.inputmaskData.repo
				}, function (error) {
					if (error) {
						return callback(error);
					}

					return callback(null, {
						removed: true,
						contentName: path.contentName,
						contentType: path.contentType,
						path: path.path,
						sha: path.sha
					});
				});
			});
		}
	}
};