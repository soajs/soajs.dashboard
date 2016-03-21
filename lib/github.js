'use strict';

var githubApi = require('github');
var async = require('async');
var fs = require('fs');
var rimraf = require('rimraf');

var githubTokenScope = ['repo', 'admin:repo_hook'];
var github = new githubApi({
    version: '3.0.0',
    debug: false,
    protocol: 'https',
    host: 'api.github.com',
    timeout: 5000,
    headers: {
        'user-agent': 'SOAJS Github App'
    }
});

var collName = 'github';
var servicesColl = 'services';
var daemonsColl = 'daemons';
var staticContentColl = 'staticContent';
var hostsColl = 'hosts';

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

function getAuthToken (mongo, accountId, cb) {
    mongo.findOne(collName, {_id: accountId}, {token: 1, _id: 0}, function (error, tokenRecord) {
        return cb (error, (tokenRecord) ? tokenRecord.token : null);
    });
}

module.exports = {

    'login': function (mongo, config, req, res) {
        //logic
        //check if personal or organization
        //check if username and password exist to determine if public or private account
        //
        //testing////////////////////
        var accountInfo = {
            type: req.soajs.inputmaskData.type,
            access: req.soajs.inputmaskData.access//(req.soajs.inputmaskData.username && req.soajs.inputmaskData.password) ? 'private' : 'public'
        };

        createAccount (accountInfo, function (error, record) {
            checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                mongo.insert(collName, record, function (error) {
                    checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                        return res.jsonp(req.soajs.buildResponse(null, true));
                    });
                });
            });
        });
        /////////////////////////////

        //github.authenticate({
        //    type: 'basic',
        //    username: req.soajs.inputmaskData.username,
        //    password: req.soajs.inputmaskData.password
        //});
        //
        ////todo: before creating token, check if it already exists
        //mongo.findOne(collName, {username: req.soajs.inputmaskData.username}, function (error, record) {
        //    checkIfError(req, res, {config: config, error: error, code: 600}, function () {
        //        checkIfError(req, res, {config: config, error: record, code: 600}, function () { //Account already exists
        //            //if token does not exist, create it
        //            github.authorization.create({
        //                scopes: githubTokenScope,
        //                note: 'SOAJS Github App Token'
        //            }, function (error, response) {
        //                checkIfError(req, res, {config: config, error: error, code: 600}, function () {
        //                    var record = {
        //                        label: req.soajs.inputmaskData.accountLabel,
        //                        username: req.soajs.inputmaskData.username,
        //                        token: response.token,
        //                        authId: response.id,
        //                        repos: []
        //                    };
        //
        //                    mongo.insert(collName, record, function (error, result) {
        //                        checkIfError(req, res, {config: config, error: error || !result, code: 600}, function () {
        //                            return res.jsonp(req.soajs.buildResponse(null, true));
        //                        });
        //                    });
        //                });
        //            });
        //        });
        //    });
        //});
        //name | type | access | token | authId | repos

        function createAccount (info, cb) {
            if (info.type === 'personal') {
                createPersonalAccount(info, cb);
            } else {
                createOrgAccount(info, cb);
            }
        }

        function createPersonalAccount (info, cb) {
            var record = {
                label: req.soajs.inputmaskData.label,
                username: req.soajs.inputmaskData.username,
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
                github.authorization.create({
                    scopes: githubTokenScope,
                    note: 'SOAJS Github App Token'
                }, function (error, response) {
                    if (error) {
                        return cb (error);
                    }

                    record.token = response.token;
                    record.authId = response.authId;

                    return cb (null, record);
                });
            } else {
                //todo: ping to verify that user account exists
                return cb (null, record);
            }
        }

        function createOrgAccount (info, cb) {
            var record = {
                label: req.soajs.inputmaskData.label,
                username: req.soajs.inputmaskData.username,
                type: info.type,
                access: info.access,
                repos: []
            };
            //todo: ping to verify that org exists
            return cb (null, record);
        }
    },

    'logout': function (mongo, config, req, res) { //todo: check if active repositories exist and disallow
        validateId(mongo, req, function (error) {
            checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                mongo.findOne(collName, {_id: req.soajs.inputmaskData.id}, function (error, record) {
                    checkIfError(req, res, {config: config, error: error || !record, code: 600}, function () {
                        checkIfError(req, res, {config: config, error: record.repos.length > 0, code: 600}, function () { //in case active repos exist, do not allow delete
                            if (record.authId) {
                                github.authenticate({
                                    type: 'basic',
                                    username: req.soajs.inputmaskData.username,
                                    password: req.soajs.inputmaskData.password
                                });
                                github.authorization.delete({
                                    id: record.authId
                                }, function (error, result) {
                                    checkIfError(req, res, {config: config, error: error || !result, code: 600}, function () {
                                        mongo.remove(collName, {_id: req.soajs.inputmaskData.id}, function (error) {
                                            checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                                                return res.jsonp(req.soajs.buildResponse(null, true));
                                            });
                                        });
                                    });
                                });
                            } else {
                                mongo.remove(collName, {_id: req.soajs.inputmaskData.id}, function (error) {
                                    checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                                        return res.jsonp(req.soajs.buildResponse(null, true));
                                    });
                                });
                            }
                        });
                    });
                });
            });
        });
    },

    'listAccounts': function (mongo, config, req, res) {
        mongo.find(collName, {}, {token: 0, repos: 0}, function (error, accounts) {
            checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                return res.jsonp(req.soajs.buildResponse(null, accounts));
            });
        });
    },

    'getRepos': function (mongo, config, req, res) {
        validateId(mongo, req, function (error) {
            checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                mongo.findOne(collName, {_id: req.soajs.inputmaskData.id}, function (error, accountRecord) {
                    checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                        if (accountRecord.token) { //private account with token
                            github.authenticate({type: 'oauth', token: accountRecord.token});
                            github.repos.getAll({}, function (error, response) {
                                checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                                    addReposStatus(response, accountRecord.repos, function (repos) {
                                        return res.jsonp(req.soajs.buildResponse(null, repos));
                                    });
                                });
                            });
                        } else { //public account
                            github.repos.getFromUser({
                                user: accountRecord.username
                            }, function (error, response) {
                                checkIfError(req, res, {config: config, error: error, code: 600}, function () {
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

        function addReposStatus (allRepos, activeRepos, cb) {
            if (!allRepos || allRepos.length === 0 || !activeRepos || activeRepos.length === 0) {
                return cb (allRepos);
            }

            var found;
            activeRepos.forEach (function (oneRepo) {
                found = false;
                for (var i = 0; i < allRepos.length; i++) {
                    if (allRepos[i].full_name === oneRepo.name) {
                        allRepos[i].status = 'active';
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

            return cb (allRepos);
        }
    },

    'getBranches': function (mongo, config, req, res) {
        //logic
        //grab service/daemon name from imfv and search for it in services/daemons collections
        //get owner and repo from record's src and search github collection for user
        //get user token, authenticate, get branches, and respond
        getServiceDaemonRecord(function (error, record) {
            checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                var repoLabel = record.src.owner + '/' + record.src.repo;
                mongo.findOne(collName, {'repos': {'$elemMatch': {'name': repoLabel}}}, {'token': 1, 'repos.$': 1}, function (error, accountRecord) {
                    checkIfError(req, res, {config: config, error: error || !accountRecord, code: 600}, function () {
                        var repoInfo = accountRecord.repos[0].name.split('/');
                        if (accountRecord.token) {
                            github.authenticate({type: 'oauth', token: accountRecord.token});
                        }
                        github.repos.getBranches({
                            user: repoInfo[0],
                            repo: repoInfo[1]
                        }, function (error, response) {
                            checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                                return res.jsonp(req.soajs.buildResponse(null, response));
                            });
                        });
                    });
                });
            });
        });

        function getServiceDaemonRecord(cb) {
            mongo.findOne(servicesColl, {name: req.soajs.inputmaskData.name}, function (error, record) {
                if (error) {
                    return cb (error);
                }

                if (record) {
                    return cb (null, record);
                }

                mongo.findOne(daemonsColl, {name: req.soajs.inputmaskData.name}, function (error, record) {
                    if (error) {
                        return cb (error);
                    }

                    if (record) {
                        return cb (null, record);
                    }

                    return cb ({'message': 'Name does not match any service or daemon'});
                });
            });
        }
    },

    'activateRepo': function (mongo, config, req, res) {
        validateId(mongo, req, function (error) {
            checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                getAuthToken(mongo, req.soajs.inputmaskData.id, function (error, token) {
                    checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                        getConfigFile(token, 'config.js', function (error, repoInfo) {
                            checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                                clearConfigDir(function (error) {
                                    checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                                        var newRepo = {
                                            name: req.soajs.inputmaskData.user + '/' + req.soajs.inputmaskData.repo,
                                            type: (Array.isArray(repoInfo) && repoInfo.length > 0) ? 'multi' : repoInfo.type
                                        };
                                        mongo.update(collName, {_id: req.soajs.inputmaskData.id}, {'$addToSet': {'repos': newRepo}}, function (error, result) {
                                            checkIfError(req, res, {config: config, error: error || !result, code: 600}, function () {
                                                return res.jsonp(req.soajs.buildResponse(null, repoInfo));
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

        function getConfigFile (token, path, cb) {
            if (token) {
                github.authenticate({type: 'oauth', token: token});
            }
            github.repos.getContent({
                user: req.soajs.inputmaskData.user,
                repo: req.soajs.inputmaskData.repo,
                path: path
            }, function (error, response) {
                if (error) {
                    return cb (error);
                }

                var configFile = new Buffer(response.content, 'base64');
                //Remove all require() calls from config file if any
                configFile = configFile.toString().replace(/require\s*\(.+\)/g,'""');

                var configDirPath = './repoConfigs/' + path.substring(0, path.lastIndexOf('/'));
                var configFilePath = '../repoConfigs/' + path;
                fs.exists(configDirPath, function (exists) {
                    if (!exists) {
                        fs.mkdir(configDirPath, function (error) {
                            if (error) {
                                return cb (error);
                            }

                            fs.writeFile('./repoConfigs/' + path, configFile, function (error) {
                                if (error) {
                                    return cb (error);
                                }

                                analyzeConfigFile(configFilePath, token, cb);
                            });
                        });
                    } else {
                        fs.writeFile('./repoConfigs/' + path, configFile, function (error) {
                            if (error) {
                                return cb (error);
                            }

                            analyzeConfigFile(configFilePath, token, cb);
                        });
                    }
                });
            });
        }

        function analyzeConfigFile (path, token, cb) {
            if (require.resolve(path)) {
                delete require.cache[require.resolve(path)];
            }

            var repoConfig = require (path);
            validateFileContents(repoConfig, function (error) {
                if (error) {
                    return cb (error);
                }

                var info = {};
                if (repoConfig.type === 'service') {
                    info = {
                        name: repoConfig.serviceName,
                        port: repoConfig.servicePort,
                        src: repoConfig.src,
                        extKeyRequired: repoConfig.extKeyRequired,
                        awareness: repoConfig.awareness,
                        requestTimeout: repoConfig.requestTimeout,
                        requestTimeoutRenewal: repoConfig.requestTimeoutRenewal,
                        group: repoConfig.serviceGroup
                    };

                    addNewService(info, cb);
                } else if (repoConfig.type === 'daemon') {
                    info = {
                        name: repoConfig.serviceName,
                        port: repoConfig.servicePort,
                        group: repoConfig.serviceGroup,
                        src: repoConfig.src
                    };

                    addNewDaemon(info, cb);
                } else if (repoConfig.type === 'staticContent') {
                    info = {
                        name: repoConfig.name,
                        dashUI: repoConfig.dashUI,
                        src: repoConfig.src
                    };

                    addNewStaticContent(info, cb);
                } else if (repoConfig.type === 'multi') {
                    addNewMulti(repoConfig.multi, token, cb);
                }
            });
        }

        function validateFileContents (repoConfig, cb) {
            if (repoConfig.type && (repoConfig.type === 'service' || repoConfig.type === 'daemon')) {
                if (!repoConfig.serviceName || !repoConfig.servicePort || !repoConfig.serviceGroup || !repoConfig.prerequisites) {
                    return cb ({'message': 'Missing config.js data'});
                }
                if (!repoConfig.src || !repoConfig.src.repo || !repoConfig.src.owner || !repoConfig.src.main) {
                    return cb ({'message': 'Missing config.js source data'});
                }
            } else if (repoConfig.type && repoConfig.type === 'staticContent') {
                if (!repoConfig.src || !repoConfig.src.repo || !repoConfig.src.owner || !repoConfig.src.main) {
                    return cb ({'message': 'Missing config.js static content data'});
                }
            } else if (repoConfig.type && repoConfig.type === 'multi') {
                if (!repoConfig.multi || !Array.isArray(repoConfig.multi) || (Array.isArray(repoConfig.multi) && repoConfig.multi.length === 0)) {
                    return cb ({'message': 'Missing multi repository config data'});
                }
            } else {
                return cb ({'message': 'Invalid or no type provided in config.js'});
            }

            return cb (null);
        }

        function addNewService (serviceInfo, cb) {
            mongo.count(servicesColl, {name: serviceInfo.name}, function (error, count) {
                if (error) {
                    return cb (error);
                }
                if (count > 0) {
                    return cb({message: 'Service already exists'});
                }

                mongo.insert(servicesColl, serviceInfo, function (error) {
                    if (error) {
                        return cb (error);
                    }

                    var added = {
                        type: 'service',
                        name: serviceInfo.name,
                        repo: req.soajs.inputmaskData.user + '/' + req.soajs.inputmaskData.repo
                    };
                    return cb (null, added);
                });
            });
        }

        function addNewDaemon (daemonInfo, cb) {
            mongo.count(daemonsColl, {name: daemonInfo.serviceName}, function (error, count) {
                if (error) {
                    return cb (error);
                }
                if (count > 0) {
                    return cb ({message: 'Daemon already exists'})
                }

                mongo.insert(daemonsColl, daemonInfo, function (error) {
                    if (error) {
                        return cb (error);
                    }

                    var added = {
                        type: 'daemon',
                        name: daemonInfo.name,
                        repo: req.soajs.inputmaskData.user + '/' + req.soajs.inputmaskData.repo
                    };
                    return cb (null, added);
                });
            });
        }

        function addNewMulti (paths, token, cb) {
            async.map(paths, function (path, callback) {
                getConfigFile(token, path, callback);
            }, function (error, result) {
                return cb (error, result);
            });
        }

        function addNewStaticContent (staticContentInfo, cb) {
            mongo.count(staticContentColl, {name: staticContentInfo.name, 'src.owner': req.soajs.inputmaskData.user, 'src.repo': req.soajs.inputmaskData.repo}, function (error, count) {
                if (error) {
                    return cb (error);
                }

                if (count > 0) {
                    return cb ({message: 'Static Content already exists'});
                }

                mongo.insert(staticContentColl, staticContentInfo, function (error) {
                    if (error) {
                        return cb (error);
                    }

                    var added = {
                        type: 'staticContent',
                        name: staticContentInfo.name,
                        repo: req.soajs.inputmaskData.user + '/' + req.soajs.inputmaskData.repo
                    };
                    return cb (null, added);
                });
            });
        }

        function clearConfigDir (cb) {
            rimraf('./repoConfigs', function (error) {
                if (error) {
                    return cb(error);
                }

                return cb(null);
            });
        }
    },

    'deactivateRepo': function (mongo, config, req, res) {
        //check hosts collection first, if no running services exist, allow deactivate
        validateId(mongo, req, function (error) {
            checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                mongo.findOne(collName, {_id: req.soajs.inputmaskData.id}, function (error, accountRecord) {
                    checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                        for (var i = 0; i < accountRecord.repos.length; i++) {
                            if (accountRecord.repos[i].name === req.soajs.inputmaskData.user + '/' + req.soajs.inputmaskData.repo) {
                                remove(accountRecord.repos[i].type, function (error, result) {
                                    checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                                        return res.jsonp(req.soajs.buildResponse(null, true));
                                    });
                                });
                            }
                        }
                    });
                });
            });
        });

        function remove (type, cb) {
            if (type === 'service' || type === 'daemon') {
                removeServiceOrDaemon(type, cb);
            } else if (type === 'staticContent') {
                removeStaticContent(cb);
            } else if (type === 'multi') {
                removeMulti(cb);
            }
        }

        function removeServiceOrDaemon (type, cb) {
            var coll = '';
            if (type === 'service') {
                coll = servicesColl
            } else {
                coll = daemonsColl;
            }

            mongo.findOne(coll, {'src.owner': req.soajs.inputmaskData.user, 'src.repo': req.soajs.inputmaskData.repo}, {name: 1, _id: 0}, function (error, record) {
                if (error || !record) {
                    return cb (error || !record);
                }

                mongo.count(hostsColl, {name: record.name}, function (error, count) {
                    if (error) {
                        return cb (error);
                    }
                    if (count > 0) {
                        return cb({'message': 'Repository has running hosts'});
                    }

                    mongo.remove(coll, {'src.owner': req.soajs.inputmaskData.user, 'src.repo': req.soajs.inputmaskData.repo}, function (error) {
                        if (error) {
                            return cb (error);
                        }

                        var repoLabel = req.soajs.inputmaskData.user + '/' + req.soajs.inputmaskData.repo;
                        mongo.update(collName, {_id: req.soajs.inputmaskData.id}, {'$pull': {'repos': {'name': repoLabel}}}, function (error, result) {
                            if (error || !result) {
                                return cb (error || !result);
                            }

                            return cb (null, true);
                        });
                    });
                });
            });
        }

        function removeStaticContent (cb) {
            mongo.remove(staticContentColl, {'src.owner': req.soajs.inputmaskData.user, 'src.repo': req.soajs.inputmaskData.repo}, function (error) {
                if (error) {
                    return cb (error);
                }

                var repoLabel = req.soajs.inputmaskData.user + '/' + req.soajs.inputmaskData.repo;
                mongo.update(collName, {_id: req.soajs.inputmaskData.id}, {'$pull': {'repos': {'name': repoLabel}}}, function (error, result) {
                    if (error || !result) {
                        return cb (error || !result);
                    }

                    return cb (null, true);
                });
            });
        }

        function removeMulti (cb) {
            async.parallel([getRepoServices, getRepoDaemons], function (error, repoContents) {
                var names = [];
                repoContents.forEach(function (oneRepoArr) {
                    names.concat(oneRepoArr);
                });

                //check if running instances exist before deleting
                mongo.count(hostsColl, {name: {'$in': names}}, function (error, count) {
                    if (error) {
                        return cb (error);
                    }
                    if (count > 0) {
                        return cb ({'message': 'Repository has running hosts'});
                    }

                    async.parallel([removeService, removeDaemon, removeStaticContent], function (error, results) {
                        var repoLabel = req.soajs.inputmaskData.user + '/' + req.soajs.inputmaskData.repo;
                        mongo.update(collName, {_id: req.soajs.inputmaskData.id}, {'$pull': {'repos': {'name': repoLabel}}}, function (error, result) {
                            if (error || !result) {
                                return cb (error || !result);
                            }

                            return cb(null, results);
                        });
                    });
                });
            });

            function removeService (callback) {
                mongo.remove(servicesColl, {'src.owner': req.soajs.inputmaskData.user, 'src.repo': req.soajs.inputmaskData.repo}, function (error) {
                    return callback (error);
                });
            }

            function removeDaemon (callback) {
                mongo.remove(daemonsColl, {'src.owner': req.soajs.inputmaskData.user, 'src.repo': req.soajs.inputmaskData.repo}, function (error) {
                    return callback (error);
                });
            }

            function removeStaticContent (callback) {
                mongo.remove(staticContentColl, {'repo': req.soajs.inputmaskData.repo}, function (error) {
                    return callback (error);
                });
            }

            function getRepoServices (callback) {
                mongo.find(servicesColl, {'src.owner': req.soajs.inputmaskData.user, 'src.repo': req.soajs.inputmaskData.repo}, {name: 1, _id: 0}, function (error, records) {
                    return callback (error, records);
                });
            }

            function getRepoDaemons (callback) {
                mongo.find(daemonsColl, {'src.owner': req.soajs.inputmaskData.user, 'src.repo': req.soajs.inputmaskData.repo}, {name: 1, _id: 0}, function (error, records) {
                    return callback (error, records);
                });
            }
        }
    },

    'syncRepo': function (mongo, config, req, res) {
        validateId(mongo, req, function (error) {
            checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                getAuthToken(mongo, req.soajs.inputmaskData.id, function (error, token) {
                    checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                        //logic
                        //get config file for repo
                        //compare SHA with local saved
                        //if different, load file and check if info has been updated
                        //check if instances are already running, return warning
                        //if no instances are running, update services/daemons/content
                        //return true
                    });
                });
            });
        });
    }
};