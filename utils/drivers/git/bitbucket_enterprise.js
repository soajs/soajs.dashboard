"use strict";

var fs = require("fs");
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');

var config = require('../../../config.js');
var BitbucketClient = require('bitbucket-server-nodejs').Client;

var bitbucketClient;

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

        return cb(error);
    }

    return callback();
}

var lib = {
    "authenticate": function (options) {
        var domain = 'https://' + config.gitAccounts.bitbucket_enterprise.apiDomain.replace('%PROVIDER_DOMAIN%', options.domain);
        if (options.access === 'public') {
            bitbucketClient = new BitbucketClient(domain);
        } else {
            // has the form username:password
            var credentials = options.token.split(':');

            bitbucketClient = new BitbucketClient(domain, {
                type: 'basic',
                username: credentials[0],
                password: credentials[1]
            });
        }
    },

    "checkUserRecord": function (options, cb) {
        var domain = 'https://' + config.gitAccounts.bitbucket_enterprise.apiDomain.replace('%PROVIDER_DOMAIN%', options.domain);
        var tempClient = new BitbucketClient(domain);

        tempClient.users.getUser(options.owner)
            .then(function (user) {
                return cb(null, user);
            })
            .catch(function (error) {
                return cb(error);
            })
            .finally(function () {
                // delete temp client
                tempClient = null;
            });
    },

    "getRepoBranches": function (options, cb) {
        var repoInfo = [];

        if (options.name) {
            repoInfo = options.name.split("/");
        }
        else {
            repoInfo = [options.owner, options.repo];
        }

        // options.owner contains either the project key or the user slug
        bitbucketClient.branches.get(repoInfo[0], repoInfo[1])
            .then(function (branches) {
                var branchesArray = [];
                // The GUI expects a 'name'
                // Bitbucket does not return one like GitHub, so we construct it
                for (var i = 0; i < branches.values.length; ++i) {
                    branchesArray.push({
                        name: branches.values[i].displayId,
                        commit: {
                            sha: branches.values[i].latestCommit
                        }
                    });
                }

                return cb(null, branchesArray);
            })
            .catch(function (error) {
                return cb(error);
            });
    },

    "getRepoContent": function (options, cb) {
        bitbucketClient.repos.browse(options.project, options.repo, {path: options.path})
            .then(function (result) {
                return cb(null, result);
            })
            .catch(function (error) {
                return cb(error);
            });
    },

    "getAllRepos": function (options, cb) {
        var allRepos = [];

        // get all repos from all projects
        bitbucketClient.repos.getCombined()
            .then(function (repos) {
                allRepos = repos.values;

                // get all repos from current user
                // a user "project" is his slug, prepended with '~'
                return bitbucketClient.repos.get('~' + options.owner);
            })
            .then(function (userRepos) {
                allRepos = allRepos.concat(userRepos.values);

                // The GUI expects a 'full_name' and a 'repo.owner.login' attributes.
                // BitbucketClient does not return one like GitHub, so we construct them
                // We set the owner.login as the project repo, which is ('~' + username)
                for (var i = 0; i < allRepos.length; ++i) {
                    var repo = allRepos[i];
                    repo.full_name = repo.project.key + "/" + repo.slug;
                    repo.owner = {
                        login: repo.project.key
                    };
                }

                return cb(null, allRepos);
            })
            .catch(function (error) {
                return cb(error);
            });
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
                if (allRepos[i].full_name.toLowerCase() === oneRepo.name.toLowerCase()) {

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

module.exports = {
    "login": function (soajs, data, model, options, cb) {
        data.checkIfAccountExists(soajs, model, options, function (error, count) {
            checkIfError(error, {}, cb, function () {
                checkIfError(count > 0, {code: 752, message: 'Account already exists'}, cb, function () {

                    if (options.access === 'public') { //in case of public access, no tokens are created, just verify that user/org exists and save
                        lib.checkUserRecord(options, function (error) {
                            checkIfError(error, {}, cb, function () {
                                lib.authenticate(options);
                                data.saveNewAccount(soajs, model, options, cb);
                            });
                        });
                    }
                    else if (options.access === 'private') {
                        options.token = options.owner + ":" + options.password;

                        var domain = 'https://' + config.gitAccounts.bitbucket_enterprise.apiDomain.replace('%PROVIDER_DOMAIN%', options.domain);
                        var tempClient = new BitbucketClient(domain, {
                            type: 'basic',
                            username: options.owner,
                            password: options.password
                        });

                        // if able to get user's settings, it means we have valid credentials
                        tempClient.settings.get(options.owner)
                            .then(function () {
                                delete options.password;
                                lib.authenticate(options);

                                options.token = new Buffer(options.token).toString('base64');
                                data.saveNewAccount(soajs, model, options, cb);
                            })
                            .catch(function (error) {
                                return cb(error);
                            })
                            .finally(function () {
                                // delete temp client
                                tempClient = null;
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
                    data.removeAccount(soajs, model, accountRecord._id, cb);
                });
            });
        });
    },

    "getRepos": function (soajs, data, model, options, cb) {
        data.getAccount(soajs, model, options, function (error, accountRecord) {
            checkIfError(error || !accountRecord, {}, cb, function () {
                options.domain = accountRecord.domain;

                if (accountRecord.token) {
                    options.token = new Buffer(accountRecord.token, 'base64').toString();
                    lib.authenticate(options);
                }

                options.type = accountRecord.type;
                options.owner = accountRecord.owner;

                if (error) {
                    return cb(error, null);
                }

                lib.getAllRepos(options, function (error, result) {
                    checkIfError(error, {}, cb, function () {
                        lib.addReposStatus(result, accountRecord.repos, function (repos) {
                            return cb(null, repos);
                        });
                    });
                });
            });
        });
    },

    "getBranches": function (soajs, data, model, options, cb) {
        data.getAccount(soajs, model, options, function (error, accountRecord) {
            checkIfError(error, {}, cb, function () {
                options.domain = accountRecord.domain;

                if (accountRecord.token) {
                    options.token = new Buffer (accountRecord.token, 'base64').toString();
                    lib.authenticate(options);
                }

                lib.getRepoBranches(options, function (error, branches) {
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
    },

    "getJSONContent": function (soajs, data, model, options, cb) {
        data.getAccount(soajs, model, options, function (error, accountRecord) {
            checkIfError(error || !accountRecord, {}, cb, function () {
                if (accountRecord.token) {
                    options.token = new Buffer(accountRecord.token, 'base64').toString();
                    options.domain = accountRecord.domain;
                    lib.authenticate(options);
                }

                lib.getRepoContent(options, function (error, response) {
                    checkIfError(error, {}, cb, function () {

                        // bitbucketClient returns no 'sha', use the path instead, its unique
                        var configSHA = options.repo + options.path;

                        // bitbucketClient returns file content as an array of lines
                        // concatenate them in one string
                        var content = "";
                        for (var i = 0; i < response.lines.length; ++i) {
                            content += response.lines[i].text + "\n";
                        }

                        // remove all "require('...')" occurrences
                        var configFile = content;
                        configFile = configFile.toString().replace(/require\s*\(.+\)/g, '""');

                        var repoConfigsFolder = config.gitAccounts.bitbucket_enterprise.repoConfigsFolder;
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
                                    return cb(e);
                                }

                                lib.clearDir({repoConfigsFolder: repoConfigsFolder}, function (error) {
                                    checkIfError(error, {}, cb, function () {
                                        return cb(null, repoConfig, configSHA);
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    },

    "getAnyContent": function (soajs, data, model, options, cb) {
        if (options.accountRecord.token) {
            options.token = new Buffer(options.accountRecord.token, 'base64').toString();
            options.domain = options.accountRecord.domain;
            lib.authenticate(options);
        }

        lib.getRepoContent(options, function (error, response) {
            checkIfError(error, {}, cb, function () {
                // bitbucketClient returns file content as an array of lines
                // concatenate them in one string
                var content = "";
                for (var i = 0; i < response.lines.length; ++i) {
                    content += response.lines[i].text + "\n";
                }

                var downloadLink = 'https://' + config.gitAccounts.bitbucket_enterprise.downloadUrl
                    .replace('%PROVIDER_DOMAIN%', options.domain)
                    .replace('%PROJECT_NAME%', options.project)
                    .replace('%REPO_NAME%', options.repo)
                    .replace('%PATH%', options.path)
                    .replace('%BRANCH%', options.ref || 'master');

                return cb(null, {
                    token: options.token,
                    downloadLink: downloadLink,
                    content: content
                });
            });
        });
    }
};
