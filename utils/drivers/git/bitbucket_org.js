'use strict';

var fs = require("fs");
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var request = require('request');
var async = require('async');

var config = require('../../../config.js');

function checkIfError (error, options, cb, callback) {
	if (error) {
		if (options && options.code) {
			if (typeof(error) === 'object' && error.code) {
				error.code = options.code;
			}
			else {
				error = {
					code: options.code,
					message: options.message || error
				};
			}
		}
		
		return cb(error);
	}
	
	return callback();
}

var lib = require('./helpers/bitbucket_org.js');

var driver = {
	helper: {},
	
	login: function (soajs, data, model, options, cb) {
		data.checkIfAccountExists(soajs, model, options, function (error, count) {
			checkIfError(error, {}, cb, function () {
				checkIfError(count > 0, { code: 752, message: 'Account already added' }, cb, function () {
					if (options.access === 'public') { //in case of public access, no tokens are created, just verify that user/org exists and save
						lib.checkUserRecord(options, function (error, record) {
							checkIfError(error, {}, cb, function () {
								options.owner = record.user.username;
								return data.saveNewAccount(soajs, model, options, cb);
							});
						});
					}
					else if (options.access === 'private') {//create token for account and save
						lib.createAuthToken(options, function (error, tokenInfo) {
							checkIfError(error, {}, cb, function () {
								options.token = tokenInfo.access_token;
								//these fields are required in order to refresh the token when it exipres
								options.tokenInfo.refresh_token = tokenInfo.refresh_token;
								options.tokenInfo.created = (new Date).getTime();
								options.tokenInfo.expires_in = tokenInfo.expires_in * 1000;
								
								delete options.tokenInfo.access_token;
								delete options.password;
								delete options.action;
								lib.checkUserRecord(options, function (error, record) {
									checkIfError(error, {}, cb, function () {
										options.owner = record.user.username;
										return data.saveNewAccount(soajs, model, options, cb);
									});
								});
							});
						});
					}
				});
			});
		});
	},
	
	logout: function (soajs, data, model, options, cb) {
		data.getAccount(soajs, model, options, function (error, accountRecord) {
			checkIfError(error || !accountRecord, {}, cb, function () {
				checkIfError(accountRecord.repos.length > 0, {
					code: 754,
					message: 'Active repositories exist for this user'
				}, cb, function () {
					return data.removeAccount(soajs, model, accountRecord._id, cb);
				});
			});
		});
	},
	
	getRepos: function (soajs, data, model, options, cb) {
		data.getAccount(soajs, model, options, function (error, accountRecord) {
			checkIfError(error || !accountRecord, {}, cb, function () {
				if (accountRecord.token) {
					options.token = accountRecord.token;
				}
				options.type = accountRecord.type;
				options.owner = accountRecord.owner;
				options.tokenInfo = accountRecord.tokenInfo;
				lib.checkAuthToken(soajs, options, model, accountRecord, function (error, updated, newTokenInfo) {
					checkIfError(error, {}, cb, function () {
						if (updated) {
							options.token = newTokenInfo.token;
							options.tokenInfo = newTokenInfo.tokenInfo;
						}
						lib.getAllRepos(options, function (error, result) {
							checkIfError(error, {}, cb, function () {
								result = lib.buildReposArray(result);
								checkIfError(!result, {}, cb, function () {
									lib.addReposStatus(result, accountRecord.repos, function (repos) {
										return cb(null, repos);
									});
								});
							});
						});
					});
				});
			});
		});
	},
	
	getBranches: function (soajs, data, model, options, cb) {
		data.getAccount(soajs, model, options, function (error, accountRecord) {
			checkIfError(error, {}, cb, function () {
				options.token = accountRecord.token;
				options.tokenInfo = accountRecord.tokenInfo;
				
				lib.checkAuthToken(soajs, options, model, accountRecord, function (error, updated, newTokenInfo) {
					checkIfError(error, {}, cb, function () {
						if (updated) {
							options.token = newTokenInfo.token;
							options.tokenInfo = newTokenInfo.tokenInfo;
						}
						lib.getRepoBranches(options, function (error, branches) {
							branches = lib.buildBranchesArray(branches);
							checkIfError(error, {}, cb, function () {
								var result = {
									owner: options.owner,
									repo: options.repo,
									branches: branches
								};
								return cb(null, result);
							});
						});
					});
				});
			});
		});
	},
	
	getJSONContent: function (soajs, data, model, options, cb) {
		data.getAccount(soajs, model, options, function (error, accountRecord) {
			checkIfError(error, {}, cb, function () {
				lib.checkAuthToken(soajs, options, model, accountRecord, function (error, updated, newTokenInfo) {
					if (updated) {
						options.token = newTokenInfo.token;
						options.tokenInfo = newTokenInfo.tokenInfo;
					}
					checkIfError(error, {}, cb, function () {
						lib.getRepoContent(options, function (error, response) {
							checkIfError(error, {}, cb, function () {
								var configFile = response.replace(/require\s*\(.+\)/g, '""');
								var repoConfigsFolder = config.gitAccounts.bitbucket_org.repoConfigsFolder;
								var configDirPath = repoConfigsFolder + options.path.substring(0, options.path.lastIndexOf('/'));
								
								var fileInfo = {
									configDirPath: configDirPath,
									configFilePath: repoConfigsFolder + options.path,
									configFile: configFile,
									soajs: soajs
								};
								
								lib.writeFile(fileInfo, function (error) {
									checkIfError(error, {}, cb, function () {
										var repoConfig;
										if (require.resolve(fileInfo.configFilePath)) {
											delete require.cache[ require.resolve(fileInfo.configFilePath) ];
										}
										try {
											repoConfig = require(fileInfo.configFilePath);
										}
										catch (e) {
											return cb(e);
										}
										
										return cb(null, repoConfig, '');
									});
								});
							});
						});
					});
				});
			});
		});
	},
	
	getAnyContent: function (soajs, data, model, options, cb) {
		lib.checkAuthToken(soajs, options, model, options.accountRecord, function (error, updated, newTokenInfo) {
			checkIfError(error, {}, cb, function () {
				if (updated) {
					options.token = newTokenInfo.token;
					options.tokenInfo = newTokenInfo.tokenInfo;
				}
				
				lib.getRepoContent(options, function (error, response) {
					checkIfError(error, {}, cb, function () {
						var downloadLink = config.gitAccounts.bitbucket_org.apiDomain + config.gitAccounts.bitbucket_org.routes.getContent
								.replace('%USERNAME%', options.user)
								.replace('%REPO_NAME%', options.repo)
								.replace('%BRANCH%', options.ref || 'master')
								.replace('%FILE_PATH%', options.path);
						
						return cb(null, {
							token: options.token,
							downloadLink: downloadLink,
							content: response
						});
					});
				});
			});
		});
	}
	
};

module.exports = driver;