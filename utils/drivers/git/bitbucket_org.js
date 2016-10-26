'use strict';

var fs = require("fs");
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var request = require('request');
var async = require('async');

var config = require('../../../config.js');

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
            url: config.gitAccounts.bitbucket_org.apiDomain + config.gitAccounts.bitbucket_org.routes.getUserRecord.replace('%USERNAME%', data.owner)
        };

        if (data.token) {
            options.headers = {
                authorization: 'Bearer ' + data.token
            };
        }

        return requester(options, cb);
    },

    getRepoBranches: function (data, cb) {
        var repoInfo;
        if (data.name) {
            repoInfo = data.name.split('/');
        }
        else {
            repoInfo = [data.owner, data.repo];
        }

        var options = {
            method: 'GET',
            url: config.gitAccounts.bitbucket_org.apiDomain + config.gitAccounts.bitbucket_org.routes.getBranches
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
            url: config.gitAccounts.bitbucket_org.apiDomain + config.gitAccounts.bitbucket_org.routes.getContent
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

        return requester(options, cb);
    },

    getAllRepos: function (data, cb) {
        var options = {
            method: 'GET'
        };
        if (data.token) {
            options.url = config.gitAccounts.bitbucket_org.apiDomain + config.gitAccounts.bitbucket_org.routes.getAllRepos;
            options.headers = {
                authorization: 'Bearer ' + data.token
            };

            return requester(options, cb);
        }
        else {
            options.url = config.gitAccounts.bitbucket_org.apiDomain + config.gitAccounts.bitbucket_org.routes.getUserRecord.replace('%USERNAME%', data.owner);
            requester(options, function (error, userRecord) {
                if (error) {
                    return cb(error);
                }

                return cb(null, userRecord.repositories);
            });
        }
    },

    getToken: function (data, cb) {
        //generates or refreshes a oauth token
        var formData = {};
        if (data.action === 'generate') {
            formData.grant_type = 'password';
            formData.username = data.owner;
            formData.password = data.password;
        }
        else if (data.action === 'refresh') {
            formData.grant_type = 'refresh_token';
            formData.refresh_token = data.tokenInfo.refresh_token;
        }

        var options = {
            method: 'POST',
            json: true,
            url: config.gitAccounts.bitbucket_org.oauth.domain,
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
        }
        else {
            return cb(null, false);
        }
    },

    checkUserRecord: function (options, cb) {
        return bitbucket.getUserRecord(options, function (error, record) {
            if (error) {
                return cb(error);
            }

            if (!record || record === 'None') {
                return cb({message: 'User does not exist'});
            }

            return cb(null, true);
        });
    },

    getAllRepos: function (options, cb) {
        return bitbucket.getAllRepos(options, cb);
    },

    buildReposArray: function (allRepos) {
        var repos = [];

        if (allRepos && Array.isArray(allRepos)) {
            allRepos.forEach(function (oneRepo) {
                repos.push({
                    full_name: oneRepo.owner + '/' + oneRepo.name,
                    owner: {
                        login: oneRepo.owner
                    },
                    name: oneRepo.name
                });
            });
        }
        else {
            repos = null;
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

    getRepoBranches: function (options, cb) {
        return bitbucket.getRepoBranches(options, cb);
    },

    buildBranchesArray: function (allBranches) {
        var branches = [], branchNames = Object.keys(allBranches);
        branchNames.forEach(function (oneBranch) {
            branches.push({
                name: oneBranch,
                commit: {
                    sha: allBranches[oneBranch].raw_node
                }
            });
        });
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

module.exports = {

    login: function (soajs, data, model, options, cb) {
        data.checkIfAccountExists(soajs, model, options, function (error, count) {
            checkIfError(error, {}, cb, function () {
				checkIfError(count > 0, {code: 752, message: 'Account already added'}, cb, function () {
					if (options.access === 'public') { //in case of public access, no tokens are created, just verify that user/org exists and save
                        lib.checkUserRecord(options, function (error) {
                            checkIfError(error, {}, cb, function () {
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
                                lib.checkUserRecord(options, function (error) {
                                    checkIfError(error, {}, cb, function () {
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
                checkIfError(accountRecord.repos.length > 0, {code: 754, message: 'Active repositories exist for this user'}, cb, function () {
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
                                        return cb (null, repos);
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
                                return cb (null, result);
                            });
                        });
                    });
                });
            });
        });
    },

    getContent: function (soajs, data, model, options, cb) {
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
                                            delete require.cache[require.resolve(fileInfo.configFilePath)];
                                        }
                                        try {
                                            repoConfig = require(fileInfo.configFilePath);
                                        }
                                        catch (e) {
                                            return cb (e);
                                        }

                                        return cb (null, repoConfig, '');
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    }

};
