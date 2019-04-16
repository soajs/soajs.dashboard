'use strict';
var fs = require("fs");
var crypto = require("crypto");

var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var request = require('request');
var async = require('async');

var config = require('../../../../config.js');

function checkIfError(error, options, cb, callback) {
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
		if(!error.code && error.statusCode){
			error.code = error.statusCode;
		}
		return cb(error);
	}
	
	return callback();
}

var lib = require('./helper.js');

var driver = {
	
	helper: lib,
	
	login: function (soajs, data, model, options, cb) {
		data.checkIfAccountExists(soajs, model, options, function (error, count) {
			checkIfError(error, {}, cb, function () {
				checkIfError(count > 0, { code: 752, message: 'Account already added' }, cb, function () {
					if (options.access === 'public') { //in case of public access, no tokens are created, just verify that user/org exists and save
						driver.helper.checkUserRecord(options, function (error, record) {
							checkIfError(error, {}, cb, function () {
								options.owner = record.username;
								return data.saveNewAccount(soajs, model, options, cb);
							});
						});
					}
					else if (options.access === 'private') {//create token for account and save
						driver.helper.createAuthToken(options, function (error, tokenInfo) {
							checkIfError(error, {}, cb, function () {
								options.token = tokenInfo.access_token;
								//these fields are required in order to refresh the token when it exipres
								options.tokenInfo.refresh_token = tokenInfo.refresh_token;
								options.tokenInfo.created = (new Date).getTime();
								options.tokenInfo.expires_in = tokenInfo.expires_in * 1000;
								
								delete options.tokenInfo.access_token;
								delete options.password;
								delete options.action;
								driver.helper.checkUserRecord(options, function (error, record) {
									checkIfError(error, {}, cb, function () {
										options.owner = record.username;
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
				driver.helper.checkAuthToken(soajs, options, model, accountRecord, function (error, updated, newTokenInfo) {
					checkIfError(error, {}, cb, function () {
						if (updated) {
							options.token = newTokenInfo.token;
							options.tokenInfo = newTokenInfo.tokenInfo;
						}
						driver.helper.getAllRepos(options, function (error, result) {
							checkIfError(error, {}, cb, function () {
								result = driver.helper.buildReposArray(result);
								checkIfError(!result, {}, cb, function () {
									driver.helper.addReposStatus(result, accountRecord.repos, function (repos) {
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
				
				driver.helper.checkAuthToken(soajs, options, model, accountRecord, function (error, updated, newTokenInfo) {
					checkIfError(error, {}, cb, function () {
						if (updated) {
							options.token = newTokenInfo.token;
							options.tokenInfo = newTokenInfo.tokenInfo;
						}
						driver.helper.getRepoBranches(options, function (error, branches) {
							branches = driver.helper.buildBranchesArray(branches);
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
				driver.helper.checkAuthToken(soajs, options, model, accountRecord, function (error, updated, newTokenInfo) {
					if (updated) {
						options.token = newTokenInfo.token;
						options.tokenInfo = newTokenInfo.tokenInfo;
					}
					else {
						options.token = accountRecord.token;
						options.tokenInfo = accountRecord.tokenInfo;
					}
					checkIfError(error, {}, cb, function () {
						driver.helper.getRepoContent(options, function (error, response) {
							checkIfError(error, {}, cb, function () {
								checkIfError(!response, {
									code: 758,
									message: 'Unable to get repositories. Please try again.'
								}, cb, function () {
									var configFile = response.replace(/require\s*\(.+\)/g, '""');
									var repoConfigsFolder = config.gitAccounts.bitbucket.repoConfigsFolder;
									var configDirPath = repoConfigsFolder + options.path.substring(0, options.path.lastIndexOf('/'));
									
									var configSHA = options.repo + options.path;
									var hash = crypto.createHash(config.gitAccounts.bitbucket_enterprise.hash.algorithm);
									configSHA = hash.update(configSHA).digest('hex');
									
									var fileInfo = {
										configDirPath: configDirPath,
										configFilePath: repoConfigsFolder + options.path,
										configFile: configFile,
										soajs: soajs
									};
									
									driver.helper.writeFile(fileInfo, function (error) {
										checkIfError(error, {}, cb, function () {
											var repoConfig;
											if (require.resolve(fileInfo.configFilePath)) {
												delete require.cache[require.resolve(fileInfo.configFilePath)];
											}
											try {
												repoConfig = require(fileInfo.configFilePath);
											}
											catch (e) {
												soajs.log.error(e);
											}
											repoConfig = repoConfig || {"type": "custom"};
											return cb(null, repoConfig, configSHA);
										});
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
		driver.helper.checkAuthToken(soajs, options, model, options.accountRecord, function (error, updated, newTokenInfo) {
			checkIfError(error, {}, cb, function () {
				if (updated) {
					options.token = newTokenInfo.token;
					options.tokenInfo = newTokenInfo.tokenInfo;
				}
				driver.helper.getRepoContent(options, function (error, response) {
					checkIfError(error, {}, cb, function () {
						var downloadLink = config.gitAccounts.bitbucket.apiDomain + config.gitAccounts.bitbucket.routes.getContent
							.replace('%USERNAME%', options.user)
							.replace('%REPO_NAME%', options.repo)
							.replace('%BRANCH%', options.ref || 'master')
							.replace('%FILE_PATH%', options.path);
						var configSHA = options.repo + options.path;
						var hash = crypto.createHash(config.gitAccounts.bitbucket_enterprise.hash.algorithm);
						configSHA = hash.update(configSHA).digest('hex');
						return cb(null, {
							token: options.token,
							downloadLink: downloadLink,
							content: response
						}, configSHA);
					});
				});
			});
		});
	}
};

module.exports = driver;