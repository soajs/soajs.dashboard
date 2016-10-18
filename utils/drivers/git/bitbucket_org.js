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
                authorization: 'Basic ' + data.token
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
            repoInfo = [data.owner, data.repo]
        }

        var options = {
            method: 'GET',
            url: config.gitAccounts.bitbucket_org.apiDomain + config.gitAccounts.bitbucket_org.routes.getBranches
                .replace('%USERNAME%', repoInfo[0])
                .replace('%REPO_NAME%', repoInfo[1])
        };

        if (data.token) {
            options.headers = {
                authorization: 'Basic ' + data.token
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
                authorization: 'Basic ' + data.token
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
                authorization: 'Basic ' + data.token
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
    }

};

var lib = {
    buildToken: function (options) {
        if (!options.owner || !options.password) {
            return null;
        }

        return new Buffer(options.owner + ':' + options.password).toString('base64');
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
        allRepos.forEach(function (oneRepo) {
            repos.push({
                full_name: oneRepo.owner + '/' + oneRepo.name,
                owner: {
                    login: oneRepo.owner
                },
                name: oneRepo.name
            });
        });
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

    login: function (soajs, data, mongo, options, cb) {
        data.checkIfAccountExists(mongo, options, function (error, count) {
            checkIfError(error, {}, cb, function () {
				checkIfError(count > 0, {code: 752, message: 'Account already added'}, cb, function () {
					if (options.access === 'public') { //in case of public access, no tokens are created, just verify that user/org exists and save
                        lib.checkUserRecord(options, function (error) {
                            checkIfError(error, {}, cb, function () {
                                return data.saveNewAccount(mongo, options, cb);
                            });
                        });
	                }
	                else if (options.access === 'private') {//create token for account and save
                        options.token = lib.buildToken(options);
                        delete options.password;
                        lib.checkUserRecord(options, function (error) {
                            checkIfError(error, {}, cb, function () {
                                return data.saveNewAccount(mongo, options, cb);
                            });
                        });
	                }
				});
            });
        });
    },

    logout: function (soajs, data, mongo, options, cb) {
        data.getAccount(mongo, options, function (error, accountRecord) {
            checkIfError(error || !accountRecord, {}, cb, function () {
                checkIfError(accountRecord.repos.length > 0, {code: 754, message: 'Active repositories exist for this user'}, cb, function () {
                    return data.removeAccount(mongo, accountRecord._id, cb);
                });
            });
        });
    },

    getRepos: function (soajs, data, mongo, options, cb) {
        data.getAccount(mongo, options, function (error, accountRecord) {
            checkIfError(error || !accountRecord, {}, cb, function () {
                if (accountRecord.token) {
                    options.token = accountRecord.token;
                }
                options.type = accountRecord.type;
                options.owner = accountRecord.owner;
                lib.getAllRepos(options, function (error, result) {
                    checkIfError(error, {}, cb, function () {
                        result = lib.buildReposArray(result);
                        lib.addReposStatus(result, accountRecord.repos, function (repos) {
                            return cb (null, repos);
                        });
                    });
                });
            });
        });
    },

    getBranches: function (soajs, data, mongo, options, cb) {
        data.getAccount(mongo, options, function (error, accountRecord) {
            checkIfError(error, {}, cb, function () {
                options.token = accountRecord.token;
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
    },

    getContent: function (soajs, options, cb) {
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
    }

};
