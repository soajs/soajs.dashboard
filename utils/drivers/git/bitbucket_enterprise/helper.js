"use strict";

var fs = require("fs");
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var request = require('request');

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
	
	//options.headers['Content-Type'] = 'application/json';
	request(options, function (error, response, body) {
		return cb(error, body);
	});
}

var lib = {
	"checkUserRecord": function (data, cb) {
		
		var options = {
			method: 'GET',
			url: config.gitAccounts.bitbucket_enterprise.apiDomain.replace('%PROVIDER_DOMAIN%', data.domain) + config.gitAccounts.bitbucket_enterprise.routes.getUserRecord
		};
		
		if (data.owner && data.password) {
			data.token = data.owner + ":" + data.password;
			options.auth = {
				"type": "basic",
				"username": data.owner,
				"password": data.password
			};
		}
		//check for access only
		options.qs = {
			"limit": 1,
			"start": 0
		};
		return requester(options, cb);
		
	},
	
	"getRepoBranches": function (options, cb) {
		
		let credentials;
		if (options.token) {
			credentials = options.token.split(':');
		}
		var repoInfo = [];
		
		if (options.name) {
			repoInfo = options.name.split("/");
		} else {
			repoInfo = [options.owner, options.repo];
		}
		
		var opts = {
			method: 'GET',
			url: config.gitAccounts.bitbucket_enterprise.apiDomain.replace('%PROVIDER_DOMAIN%', options.domain)
				+ config.gitAccounts.bitbucket_enterprise.routes.getBranches.replace('%PROJECT_NAME%', repoInfo[0]).replace('%REPO_NAME%', repoInfo[1])
		};
		if (credentials) {
			opts.auth = {
				"type": "basic",
				"username": credentials[0],
				"password": credentials[1]
			};
		}
		opts.qs = {
			"limit": options.per_page ? options.per_page : 100,
			"start": options.page && options.page >0  ?  options.page -1 : 0
		};
		requester(opts, (err, branches) => {
			if (err) {
				return cb(err);
			}
			let branchesArray = [];
			// The GUI expects a 'name'
			if (branches && branches.values){
				// Bitbucket does not return one like GitHub, so we construct it
				for (let i = 0; i < branches.values.length; ++i) {
					branchesArray.push({
						name: branches.values[i].displayId,
						commit: {
							sha: branches.values[i].latestCommit
						}
					});
				}
			}
			return cb(null, branchesArray);
		});
	},
	
	"getRepoContent": function (options, cb) {
		let credentials;
		if (options.token) {
			credentials = options.token.split(':');
		}
		
		let opts = {
			method: 'GET',
			url: config.gitAccounts.bitbucket_enterprise.apiDomain.replace('%PROVIDER_DOMAIN%', options.domain)
				+ config.gitAccounts.bitbucket_enterprise.routes.getContent
					.replace('%PROJECT_NAME%', options.project)
					.replace('%REPO_NAME%', options.repo)
					+ options.path
		};
		if (credentials) {
			opts.auth = {
				"type": "basic",
				"username": credentials[0],
				"password": credentials[1]
			};
		}
		opts.qs = {
			"limit": 1000,
			"at": options.ref
		};
		
		let lines = [];
		
		let max = 1000 * 1000;
		function getFile (start, cb){
			opts.qs.start = start;
			requester(opts, (err, response) => {
				if (err) {
					return cb(err);
				}
				if (response.errors){
					return cb(response.errors);
				}
				if (response["status-code"] === 404){
					return cb(response);
				}
				if (response.lines){
					lines = lines.concat(response.lines);
				}
				if (opts.qs.start > max){
					return cb ({message: "File is too Large"});
				}
				if (!response.isLastPage) {
					return getFile((response.start + response.size), cb);
				} else {
					return cb(null, {lines: lines});
				}
			});
		}
		
		getFile(0, cb);
	},
	
	"getAllRepos": function (options, cb) {
		let credentials;
		if (options.token) {
			credentials = options.token.split(':');
		}
		
		var opts = {
			method: 'GET',
			url: config.gitAccounts.bitbucket_enterprise.apiDomain.replace('%PROVIDER_DOMAIN%', options.domain)
				+ config.gitAccounts.bitbucket_enterprise.routes.getAllRepos
		};
		if (credentials) {
			opts.auth = {
				"type": "basic",
				"username": credentials[0],
				"password": credentials[1]
			};
		}
		opts.qs = {
			"limit": options.per_page ? options.per_page : 100,
			"start": options.page && options.page > 0 ?  options.page - 1 : 0
		};
		if (options.name) {
			opts.qs.name = options.name;
		}
		requester(opts, (err, res) => {
			if (err) {
				return cb(err);
			}
			if (res && res.values && res.values.length > 0){
				for (var i = 0; i < res.values.length; ++i) {
					let repo = res.values[i];
					repo.name = repo.slug; //overwrite the name with the slug, slug is required for api calls
					repo.full_name = repo.project.key + "/" + repo.slug;
					repo.owner = {
						login: repo.project.key
					};
				}
				return cb(null, res.values)
			}
			else {
				return cb(null, []);
			}
		});
		//keep this for future reference
		// get all repos from all projects
		// bitbucketClient.repos.getCombined()
		// 	.then(function (repos) {
		// 		.log("repos")console
		// 		console.log(JSON.stringify(repos, null, 2))
		// 		allRepos = repos.values;
		//
		// 		// get all repos from current user
		// 		// a user "project" is his slug, prepended with '~'
		// 		return bitbucketClient.repos.get('~' + options.owner);
		// 	})
		// 	.then(function (userRepos) {
		// 		console.log("userRepos")
		// 		console.log(JSON.stringify(userRepos, null, 2))
		// 		allRepos = allRepos.concat(userRepos.values);
		//
		// 		// The GUI expects a 'full_name' and a 'repo.owner.login' attributes.
		// 		// BitbucketClient does not return one like GitHub, so we construct them
		// 		// We set the owner.login as the project repo, which is ('~' + username)
		// 		for (var i = 0; i < allRepos.length; ++i) {
		// 			var repo = allRepos[i];
		// 			repo.name = repo.slug; //overwrite the name with the slug, slug is required for api calls
		// 			repo.full_name = repo.project.key + "/" + repo.slug;
		// 			repo.owner = {
		// 				login: repo.project.key
		// 			};
		// 		}
		//
		// 		return cb(null, allRepos);
		// 	})
		// 	.catch(function (error) {
		// 		return cb(error);
		// 	});
		
	},
	
	"addReposStatus": function (allRepos, activeRepos, cb) {
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
				if (allRepos[i].full_name.toLowerCase() === oneRepo.name.toLowerCase()) {
					
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
		});
		
		return cb(allRepos);
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
