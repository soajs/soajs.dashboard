"use strict";

var request = require("request");
var fs = require("fs");
var mkdirp = require("mkdirp");
var rimraf = require("rimraf");

var config = require("../../../config.js");

var shortid = require("shortid");
shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_');

var githubApi = require("github");
var github = new githubApi({
	version: config.gitAccounts.github.apiVersion,
	debug: false,
	protocol: config.gitAccounts.github.protocol,
	host: config.gitAccounts.github.domainName,
	timeout: config.gitAccounts.github.timeout,
	headers: {
		'user-agent': config.gitAccounts.github.userAgent
	}
});

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

        return cb (error);
    }

    return callback();
}

var lib = {
    "authenticate": function (options, cb) {
        if (options.type === 'basic' && options.username && options.password) {
            github.authenticate({
                type: 'basic',
                username: options.username,
                password: options.password
            });
        }
        else if (options.type === 'oauth' && options.token) {
            github.authenticate({
                type: 'oauth',
                token: options.token
            });
        }

        return cb();
    },

    "createAuthToken": function (options, cb) {
        lib.authenticate({
            type: 'basic',
            username: options.owner,
            password: options.password
        }, function () {
            var tokenLabel = 'SOAJS GitHub App Token (soajs_' + shortid.generate() + ')';
            github.authorization.create({
                scopes: config.gitAccounts.github.tokenScope,
                note: tokenLabel
            }, function (error, response) {
                checkIfError(error, {code: 767}, cb, function () {
                    var tokenInfo = {
                        token: response.token,
                        authId: response.id
                    };

                    return cb(null, tokenInfo);
                });
            });
        });
    },

    "deleteAuthToken": function (options, cb) {
        lib.authenticate({
            type: 'basic',
            username: options.owner,
            password: options.password
        }, function () {
            github.authorization.delete({
                id: options.authId
            }, function (error) {
                return cb (error);
            });
        });
    },

    "checkUserRecord": function (options, cb) {
        github.user.getFrom({
            user: options.owner
        }, function (error, result) {
            if (error) {
                error.code = 763;
                if (error.message && JSON.parse(error).message === "Not Found") {
                    error.code = 767;
                }
                return cb(error);
            }

            return cb();
        });
    },

    "checkOrgRecord": function (options, cb) {
        github.orgs.get({
            org: options.owner
        }, function (error, result) {
            if (error) {
                error.code = 763;
                if (error.message && JSON.parse(error).message === "Not Found") {
                    error.code = 767;
                }
                return cb(error);
            }

            return cb();
        });
    },

    "getRepoBranches": function (options, cb) {
        //if token exists, authentication will succeed, else no need to authenticate
        lib.authenticate({type: 'oauth', token: options.token}, function () {
            var repoInfo = [];
            if (options.name) {
                repoInfo = options.name.split("/");
            }
            else {
                repoInfo = [options.owner, options.repo];
            }
            github.repos.getBranches({
                user: repoInfo[0],
                repo: repoInfo[1]
            }, function (error, response) {
                checkIfError(error && error.message && error.message.indexOf('API rate limit exceeded') !== -1, {code: 776, message: 'GitHub API limit exceeded for this IP'}, cb, function () {//in case limit was exceeded
                    checkIfError(error && error.message && error.message.indexOf('Not Found') !== -1, {code: 767, message: 'Repository not found'}, cb, function () {//in case of invalid repo info
                        checkIfError(error, {code: 763}, cb, function () {//generic case
                            return cb (null, response);
                        });
                    });
                });
            });
        });
    },

    "getRepoContent": function (options, cb) {
        lib.authenticate({type: 'oauth', token: options.token}, function () {
            github.repos.getContent(options, function (error, response) {
        		if (error) {
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
        });
    },

    "getAllRepos": function (options, cb) {
        var reqOptions = {
    		url: '',
    		headers: {
    			'user-agent': config.gitAccounts.github.userAgent,
    			'version': config.gitAccounts.github.apiVersion
    		},
    		qs: {
    			per_page: options.per_page,
    			page: options.page
    		}
    	};

    	if (options && options.token) {
    		reqOptions.url = config.gitAccounts.github.urls.getReposAuthUser;
    		reqOptions.headers.Authorization = 'token ' + options.token;
    		// options.qs.affiliation = 'owner, collaborator';

    		request.get(reqOptions, function (error, response, body) {
    			return cb(error, (body) ? JSON.parse(body) : []);
    		});
    	}
        else if (options && options.owner && options.type) {
    		if (options.type === 'personal') {
    			reqOptions.url = config.gitAccounts.github.urls.getReposNonAuthUser.replace('%OWNER%', options.owner);
    			reqOptions.qs.type = 'all';

    			request.get(reqOptions, function (error, response, body) {
    				return cb(error, (body) ? JSON.parse(body) : []);
    			});
    		}
    		else if (options.type === 'organization') {
    			reqOptions.url = config.gitAccounts.github.urls.getReposPublicOrg.replace('%OWNER%', options.owner);
    			reqOptions.qs.type = 'all';

    			request.get(reqOptions, function (error, response, body) {
                    checkIfError(body && body.indexOf('API rate limit exceeded') !== -1, {code: 776, message: 'API rate limit exceeded for this IP'}, cb, function () {
                        return cb(error, (body) ? JSON.parse(body) : []);
                    });
    			});
    		}
    	}
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
                allRepos.push({
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
    },

    "writeFile": function (options, cb) {
        fs.exists(options.configDirPath, function (exists) {
			if (exists) {
				lib.clearDir({soajs: options.soajs, repoConfigsFolder: options.configDirPath}, function () {
					write();
				});
			}
			else {
				write();
			}

			function write() {
				mkdirp(options.configDirPath, function (error) {
                    checkIfError(error, {}, cb, function () {
                        fs.writeFile(options.configFilePath, options.configFile, function (error) {
                            return (error) ? cb (error) : cb ();
                        });
                    });
                });
			};
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


module.exports = {
    "login": function (soajs, data, model, options, cb) {
        data.checkIfAccountExists(soajs, model, options, function (error, count) {
            checkIfError(error, {}, cb, function () {
				checkIfError(count > 0, {code: 752, message: 'Account already exists'}, cb, function () {
					if (options.access === 'public') { //in case of public access, no tokens are created, just verify that user/org exists and save
	                    if (options.type === 'personal') {
	                        lib.checkUserRecord(options, function (error) {
	                            checkIfError(error, {}, cb, function () {
	                                data.saveNewAccount(soajs, model, options, cb);
	                            });
	                        });
	                    }
	                    else if (options.type === 'organization') {
	                        lib.checkOrgRecord(options, function (error) {
	                            checkIfError(error, {}, cb, function () {
	                                data.saveNewAccount(soajs, model, options, cb);
	                            });
	                        });
	                    }
	                }
	                else if (options.access === 'private') {//create token for account and save
	                    lib.createAuthToken(options, function (error, tokenInfo) {
	                        checkIfError(error, {}, cb, function () {
	                            delete options.password;
	                            options.token = tokenInfo.token;
	                            options.authId = tokenInfo.authId;
	                            data.saveNewAccount(soajs, model, options, cb);
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
                checkIfError(accountRecord.repos.length > 0, {code: 754, message: 'Active repositories exist for this user'}, cb, function () {
					data.removeAccount(soajs, model, accountRecord._id, function (error) {
						checkIfError(error, {}, cb, function () {
							if (accountRecord.access === 'public') {
		                        return cb(null, true);
		                    }
							else {
								accountRecord.password = options.password;
                                lib.deleteAuthToken(accountRecord, cb);
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
                lib.getAllRepos(options, function (error, result) {
                    checkIfError(error, {}, cb, function () {
                        lib.addReposStatus(result, accountRecord.repos, function (repos) {
                            return cb (null, repos);
                        });
                    });
                });
            });
        });
    },

    "getBranches": function (soajs, data, model, options, cb) {
        data.getAccount(soajs, model, options, function (error, accountRecord) {
            checkIfError(error, {}, cb, function () {
                options.token = accountRecord.token;
                lib.getRepoBranches(options, function (error, branches) {
                    checkIfError(error, {}, cb, function () {
                        var result = {
                            owner: options.owner,
                            repo: options.repo,
                            branches: branches
                        };
                        return cb (null, result);
                    });
                });
            });
        });
    },

    "getContent": function (soajs, data, model, options, cb) {
        lib.getRepoContent(options, function (error, response) {
            checkIfError(error, {}, cb, function () {
				checkIfError(!response.sha || !response.content, {code: 763}, cb, function () {
					var configSHA = response.sha;
	                var configFile = new Buffer(response.content, 'base64');
	                configFile = configFile.toString().replace(/require\s*\(.+\)/g, '""');
	                var repoConfigsFolder = config.gitAccounts.github.repoConfigsFolder;
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
	            				delete require.cache[require.resolve(fileInfo.configFilePath)];
	            			}
	                        try {
	                            var repoConfig = require(fileInfo.configFilePath);
	                        }
	            			catch (e) {
	                            return cb (e);
	                        }

							return cb (null, repoConfig, configSHA);
	                    });
	                });
				});
            });
        });
    }
};
