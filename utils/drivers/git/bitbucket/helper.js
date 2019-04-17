'use strict';

var fs = require("fs");
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var request = require('request');
var async = require('async');

var config = require('../../../../config.js');

function checkIfError(error, options, cb, callback) {
	if (error) {
		if (options && options.code) {
			if (typeof (error) === 'object' && error.code) {
				error.code = options.code;
			} else {
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

function requester(options, cb) {
	options.json = true;
	
	if (!options.headers) {
		options.headers = {};
	}

	options.headers['Content-Type'] = 'application/json';
	request(options, function (error, response, body) {
		return cb(error, body);
	});
}

var bitbucket = {
	
	getUserRecord: function (data, cb) {
		var options = {
			method: 'GET',
			url: config.gitAccounts.bitbucket.apiDomain + config.gitAccounts.bitbucket.routes.getUserRecord
		};
		
		if (data.token) {
			options.headers = {
				'Authorization': 'Bearer ' + data.token
			};
		}
		return requester(options, cb);
	},
	
	getRepoBranches: function (data, cb) {
		var repoInfo;
		if (data.name) {
			repoInfo = data.name.split('/');
		} else {
			repoInfo = [data.owner, data.repo];
		}
		
		var options = {
			method: 'GET',
			url: config.gitAccounts.bitbucket.apiDomain + config.gitAccounts.bitbucket.routes.getBranches
				.replace('%USERNAME%', repoInfo[0])
				.replace('%REPO_NAME%', repoInfo[1])
		};
		
		if (data.token) {
			options.headers = {
				authorization: 'Bearer ' + data.token
			};
		}
		return requester(options, cb);
	},
	
	getContent: function (data, cb) {
		var options = {
			method: 'GET',
			url: config.gitAccounts.bitbucket.apiDomain + config.gitAccounts.bitbucket.routes.getContent
				.replace('%USERNAME%', data.user)
				.replace('%REPO_NAME%', data.repo)
				.replace('%BRANCH%', data.ref)
				.replace('%FILE_PATH%', data.path)
		};
		
		if (data.token) {
			options.headers = {
				authorization: 'Bearer ' + data.token
			};
		}
		if (!options.headers) {
			options.headers = {};
		}
		request(options, function (error, response, body) {
			return cb(error, body);
		});
	},
	
	getAllRepos: function (data, cb) {
		var options = {
			method: 'GET'
		};
		
		options.url = config.gitAccounts.bitbucket.apiDomain + config.gitAccounts.bitbucket.routes.getAllRepos.replace('%USERNAME%', data.owner);
		if (data.token) {
			options.headers = {
				authorization: 'Bearer ' + data.token
			};
		}
		options.qs = {
			"limit": options.per_page ? options.per_page : 100,
			"start": options.page && options.page > 0 ?  options.page - 1 : 0
		};
		if (data.name){
			options.qs.q = `name~"${data.name}"`;
		}
		return requester(options, cb);
	},
	
	getAllReposWithAccess: function (data, cb) {
		var options = {
			method: 'GET'
		};
		
		options.url = config.gitAccounts.bitbucket.apiDomain + config.gitAccounts.bitbucket.routes.getAllReposWithAccess;
		if (data.token) {
			options.headers = {
				authorization: 'Bearer ' + data.token
			};
		}
		options.qs = {
			"pagelen": options.per_page ? options.per_page : 100,
			"start": options.page  ?  options.page  : 1
		};
		if (data.name){
			options.qs.q = `repository.name~"${data.name}"`;
		}
		return requester(options, cb);
	},
	
	getToken: function (data, cb) {
		//generates or refreshes a oauth token
		var formData = {};
		if (data.action === 'generate') {
			formData.grant_type = 'password';
			formData.username = data.owner;
			formData.password = data.password;
		} else if (data.action === 'refresh') {
			formData.grant_type = 'refresh_token';
			formData.refresh_token = data.tokenInfo.refresh_token;
		}
		
		var options = {
			method: 'POST',
			json: true,
			url: config.gitAccounts.bitbucket.oauth.domain,
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			auth: {
				user: data.tokenInfo.oauthKey,
				pass: data.tokenInfo.oauthSecret
			},
			form: formData
		};
		
		return requester(options, cb);
	}
};

var lib = {
	"createAuthToken": function (options, cb) {
		options.action = 'generate';
		
		bitbucket.getToken(options, function (error, authInfo) {
			if (error || authInfo.error) {
				return cb(error || authInfo);
			}
			
			return cb(null, authInfo);
		});
	},
	
	"checkAuthToken": function (soajs, options, model, accountRecord, cb) {
		if (!options.tokenInfo) {
			return cb(null, false);
		}
		
		var expiryDate = options.tokenInfo.created + options.tokenInfo.expires_in - 300000; //5min extra for extra assurance when deploying
		var currentDate = (new Date).getTime();
		
		if (currentDate > expiryDate) {
			options.action = 'refresh';
			
			bitbucket.getToken(options, function (error, tokenInfo) {
				if (error || tokenInfo.error) {
					return cb(error || tokenInfo.error);
				}
				
				accountRecord.token = tokenInfo.access_token;
				accountRecord.tokenInfo.refresh_token = tokenInfo.refresh_token;
				accountRecord.tokenInfo.created = (new Date).getTime();
				accountRecord.tokenInfo.expires_in = tokenInfo.expires_in * 1000;
				
				var opts = {
					collection: 'git_accounts',
					record: accountRecord
				};
				model.saveEntry(soajs, opts, function (error) {
					if (error) {
						return cb(error);
					}
					
					var newTokenInfo = {
						token: accountRecord.token,
						tokenInfo: accountRecord.tokenInfo
					};
					
					return cb(null, true, newTokenInfo);
				});
			});
		} else {
			return cb(null, false);
		}
	},
	
	checkUserRecord: function (options, cb) {
		bitbucket.getUserRecord(options, function (error, record) {
			if (error) {
				return cb(error);
			}
			if (!record || record === 'None') {
				return cb({message: 'User does not exist'});
			}
			
			return cb(null, record);
		});
	},
	
	getAllRepos: function (options, cb) {
		return bitbucket.getAllRepos(options, cb);
	},
	
	getAllReposWithAccess: function (options, cb) {
		return bitbucket.getAllReposWithAccess(options, cb);
	},
	
	buildReposArray: function (allRepos) {
		var repos = [];
		
		if (allRepos && allRepos.values && Array.isArray(allRepos.values)) {
			allRepos.values.forEach(function (oneRepo) {
				repos.push({
					full_name: oneRepo.full_name,
					owner: {
						login: oneRepo.owner.username
					},
					name: oneRepo.slug
				});
			});
		} else {
			repos = [];
		}
		
		return repos;
	},
	buildReposArrayWithAccess: function (allRepos) {
		var repos = [];
		
		if (allRepos && allRepos.values && Array.isArray(allRepos.values)) {
			allRepos.values.forEach(function (oneRepo) {
				repos.push({
					full_name: oneRepo.repository.full_name,
					owner: {
						login: oneRepo.repository.full_name.split("/")[0]
					},
					name: oneRepo.repository.full_name.split("/")[1]
				});
			});
		} else {
			repos = [];
		}
		return repos;
	},
	
	addReposStatus: function (allRepos, activeRepos, cb) {
		if (!Array.isArray(allRepos)) {
			allRepos = [];
		}
		
		if (!activeRepos || activeRepos.length === 0) {
			return cb(allRepos);
		}
		
		var found;
		activeRepos.forEach(function (oneRepo) {
			found = false;
			var multi;
			if (oneRepo.type === 'multi' && oneRepo.configSHA && oneRepo.configSHA.length > 0) {
				if (!Array.isArray(multi)) {
					multi = [];
				}
				oneRepo.configSHA.forEach(function (oneSub) {
					multi.push({
						type: oneSub.contentType,
						name: oneSub.contentName
					})
				});
			}
			
			for (var i = 0; i < allRepos.length; i++) {
				if (allRepos[i].full_name === oneRepo.name) {
					if (oneRepo.status) {
						allRepos[i].status = oneRepo.status;
					} else {
						allRepos[i].status = 'active';
					}
					
					if (oneRepo.type !== 'multi') {
						if (oneRepo.serviceName) {
							allRepos[i].serviceName = oneRepo.serviceName;
						} else if (oneRepo.name) {
							var name = oneRepo.name;
							if (name.indexOf("/") !== -1) {
								name = name.split("/")[1];
							}
							allRepos[i].serviceName = name;
						}
					}
					
					allRepos[i].type = oneRepo.type;
					allRepos[i].git = oneRepo.git;
					allRepos[i].configBranch = oneRepo.configBranch;
					if (multi && multi.length > 0) {
						allRepos[i].multi = multi;
					}
					found = true;
					break;
				}
			}
			// if (!found) {
			// 	//USING THE SAME RECORD FORMAT AS GITHUB API RESPONSES
			// 	var repoInfo = oneRepo.name.split('/');
			// 	var newRepo = {
			// 		full_name: oneRepo.name,
			// 		owner: {
			// 			login: repoInfo[0]
			// 		},
			// 		name: repoInfo[1],
			// 		status: 'deleted',
			// 		type: oneRepo.type
			// 	};
			// 	if (oneRepo.configBranch){
			// 		newRepo.configBranch = oneRepo.configBranch;
			// 	}
			// 	if (multi && multi.length > 0) {
			// 		newRepo.multi = multi;
			// 	}
			// 	allRepos.push(newRepo);
			// }
		});
		
		return cb(allRepos);
	},
	
	getRepoBranches: function (options, cb) {
		return bitbucket.getRepoBranches(options, cb);
	},
	
	buildBranchesArray: function (allBranches) {
		var branches = [];
		if (allBranches && allBranches.values) {
			allBranches.values.forEach(function (oneBranch) {
				branches.push({
					name: oneBranch.name,
					commit: {
						sha: oneBranch.target.hash
					}
				});
			});
		}
		return branches;
	},
	
	getRepoContent: function (options, cb) {
		return bitbucket.getContent(options, cb);
	},
	
	"writeFile": function (options, cb) {
		fs.exists(options.configDirPath, function (exists) {
			if (exists) {
				lib.clearDir({soajs: options.soajs, repoConfigsFolder: options.configDirPath}, function () {
					write();
				});
			} else {
				write();
			}
			
			function write() {
				mkdirp(options.configDirPath, function (error) {
					checkIfError(error, {}, cb, function () {
						fs.writeFile(options.configFilePath, options.configFile, function (error) {
							return (error) ? cb(error) : cb();
						});
					});
				});
			}
		});
	},
	
	"clearDir": function (options, cb) {
		rimraf(options.repoConfigsFolder, function (error) {
			if (error) {
				options.soajs.log.warn("Failed to clean repoConfigs directory, proceeding ...");
				options.soajs.log.error(error);
			}
			
			return cb();
		});
	}
};

module.exports = lib;
