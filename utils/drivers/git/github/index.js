"use strict";
var request = require("request");
var fs = require("fs");
var path = require("path");
var mkdirp = require("mkdirp");
var rimraf = require("rimraf");

var config = require("../../../../config.js");

var shortid = require("shortid");
shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_');

var gitApihub = require("github");
var github = new gitApihub({
	version: config.gitAccounts.github.apiVersion,
	debug: false,
	protocol: config.gitAccounts.github.protocol,
	host: config.gitAccounts.github.domainName,
	timeout: config.gitAccounts.github.timeout,
	headers: {
		'user-agent': config.gitAccounts.github.userAgent
	}
});

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

var driver = {

	helper: {},

	"login": function (soajs, data, model, options, cb) {
		data.checkIfAccountExists(soajs, model, options, function (error, count) {
			checkIfError(error, {}, cb, function () {
				checkIfError(count > 0, { code: 752, message: 'Account already exists' }, cb, function () {
					if (options.access === 'public') { //in case of public access, no tokens are created, just verify that user/org exists and save
						if (options.type === 'personal') {
							driver.helper.checkUserRecord(options, function (error) {
								checkIfError(error, {}, cb, function () {
									data.saveNewAccount(soajs, model, options, cb);
								});
							});
						}
						else if (options.type === 'organization') {
							driver.helper.checkOrgRecord(options, function (error) {
								checkIfError(error, {}, cb, function () {
									data.saveNewAccount(soajs, model, options, cb);
								});
							});
						}
					}
					else if (options.access === 'private') {//create token for account and save
						driver.helper.checkUserRecord(options, function (error) {
							checkIfError(error, {}, cb, function () {
								driver.helper.createAuthToken(options, function (error, tokenInfo) {
									checkIfError(error, {}, cb, function () {
										delete options.password;
										options.token = tokenInfo.token;
										options.authId = tokenInfo.authId;
										data.saveNewAccount(soajs, model, options, cb);
									});
								});
							});
						});
					}
				});
			});
		});
	},

	"logout": function (soajs, data, model, options, cb) {
		data.getAccount(soajs, model, options, function (error, accountRecord) {
			checkIfError(error || !accountRecord, {}, cb, function () {
				checkIfError(accountRecord.repos.length > 0, {
					code: 754,
					message: 'Active repositories exist for this user'
				}, cb, function () {
					data.removeAccount(soajs, model, accountRecord._id, function (error) {
						checkIfError(error, {}, cb, function () {
							if (accountRecord.access === 'public') {
								return cb(null, true);
							}
							else {
								accountRecord.password = options.password;
								driver.helper.deleteAuthToken(accountRecord, cb);
							}
						});
					});
				});
			});
		});
	},

	"getRepos": function (soajs, data, model, options, cb) {
		data.getAccount(soajs, model, options, function (error, accountRecord) {
			checkIfError(error || !accountRecord, {}, cb, function () {
				if (accountRecord.token) {
					options.token = accountRecord.token;
				}
				options.type = accountRecord.type;
				options.owner = accountRecord.owner;
				driver.helper.getAllRepos(options, function (error, result) {
					checkIfError(error, {}, cb, function () {
						driver.helper.addReposStatus(result, accountRecord.repos, function (repos) {
							return cb(null, repos);
						});
					});
				});
			});
		});
	},

	"getBranches": function (soajs, data, model, options, cb) {
		data.getAccount(soajs, model, options, function (error, accountRecord) {
			// todo : add code
			checkIfError(error, {}, cb, function () {
				checkIfError(!accountRecord, { code: 759 }, cb, function () {
					options.token = accountRecord.token;
					driver.helper.getRepoBranches(options, function (error, branches) {
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
	},

	"getJSONContent": function (soajs, data, model, options, cb) {
		driver.helper.getRepoContent(options, function (error, response) {
			checkIfError(error, {}, cb, function () {
				checkIfError(!response.sha || !response.content, { code: 763 }, cb, function () {
					var configSHA = response.sha;
					var configFile = new Buffer(response.content, 'base64');
					configFile = configFile.toString().replace(/require\s*\(.+\)/g, '""');
					var repoConfigsFolder = config.gitAccounts.github.repoConfigsFolder;
					var configDirPath = repoConfigsFolder + options.path.substring(0, options.path.lastIndexOf('/'));
					var fileInfo = {
						configDirPath: configDirPath,
						configFilePath: path.join(repoConfigsFolder, options.path),
						configFile: configFile,
						soajs: soajs
					};

					driver.helper.writeFile(fileInfo, function (error) {
						checkIfError(error, {}, cb, function () {
							var repoConfig;
							if (require.resolve(fileInfo.configFilePath)) {
								delete require.cache[ require.resolve(fileInfo.configFilePath) ];
							}
							try {
								repoConfig = require(fileInfo.configFilePath);
							}
							catch (e) {
								soajs.log.error(e);
							}
							repoConfig = repoConfig || { "type" : "custom" };
							return cb(null, repoConfig, configSHA);
						});
					});
				});
			});
		});
	},

	"getAnyContent": function (soajs, data, model, options, cb) {
		driver.helper.getRepoContent(options, function (error, response) {
			checkIfError(error, {}, cb, function () {
				return cb(null, {
					token: options.token || null,
					downloadLink: response.download_url,
					content: new Buffer(response.content, 'base64').toString()
				}, response.sha);
			});
		});
	}
};

module.exports = driver;