'use strict';
var core = require("soajs/modules/soajs.core");
var validator = new core.validator.Validator();
var validatorSchemas = require("../schemas/serviceSchema.js");

var request = require('request');
var async = require('async');
var fs = require('fs');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');
var shortid = require('shortid');

var config = require('../config.js');
var git = require('../utils/drivers/git.js');
var data = require('../models/git.js');

var servicesColl = 'services';
var daemonsColl = 'daemons';
var staticContentColl = 'staticContent';
var hostsColl = 'hosts';

var repoConfigsFolder = __dirname + '/repoConfigs';
shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_');

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
        if (cb) {
            return cb();
        }
    }
}

function checkMongoError(req, error, cb, fCb) {
    if (error) {
        req.soajs.log.error(error);
        return cb(error);
    }
    return fCb();
}

function assurePath(pathTo, path, provider) {
    if (pathTo === 'config' && path.indexOf(config.gitAccounts[provider].defaultConfigFilePath) !== -1) {
        if (path.indexOf('/') === 0) {
            return path;
        }
        else {
            return '/' + path;
        }
    }

    if (pathTo === 'main' && path.indexOf(config.gitAccounts[provider].defaultConfigFilePath) !== -1) {
        path = path.substring(0, path.indexOf(config.gitAccounts[provider].defaultConfigFilePath));
    }

    if (path.charAt(0) !== '/') {
        path = '/' + path;
    }
    if (path.charAt(path.length - 1) !== '/') {
        path = path + '/';
    }

    if (pathTo === 'main') {
        path = path + '.';
    }
    else if (pathTo === 'config') {
        path = path + config.gitAccounts[provider].defaultConfigFilePath;
    }

    return path;
}

function cleanConfigDir (req, options, cb) {
    fs.exists(options.repoConfigsFolder, function (exists) {
        if (exists) {
            rimraf(options.repoConfigsFolder, function (error) {
                if (error) {
                    req.soajs.log.warn("Failed to clean repoConfigs directory, proceeding ...");
                    req.soajs.log.error(error);
                }

                return cb();
            });
        }
        else {
            return cb();
        }
    });
}

function extractAPIsList(schema) {
    var excluded = ['commonFields'];
    var apiList = [];
    for (var route in schema) {
        if (Object.hasOwnProperty.call(schema, route)) {
            if (excluded.indexOf(route) !== -1) {
                continue;
            }

            var oneApi = {
                'l': schema[route]._apiInfo.l,
                'v': route
            };

            if (schema[route]._apiInfo.group) {
                oneApi.group = schema[route]._apiInfo.group;
            }

            if (schema[route]._apiInfo.groupMain) {
                oneApi.groupMain = schema[route]._apiInfo.groupMain;
            }

            apiList.push(oneApi);
        }
    }
    return apiList;
}

function extractDaemonJobs(schema) {
    var jobList = {};
    for (var job in schema) {
        jobList[job] = {};
    }
    return jobList;
}

function getServiceInfo(req, repoConfig, path, flags, provider) {
    var info = {};
    if (repoConfig.type === 'static') {
        info = {
            name: repoConfig.name,
            dashUI: repoConfig.dashUI,
            src: {
                owner: req.soajs.inputmaskData.owner,
                repo: req.soajs.inputmaskData.repo
            },
            path: path //needed for multi repo, not saved in db
        };
    }
    else if (repoConfig.type === 'daemon' || repoConfig.type === 'service') {
        if (repoConfig.type === 'service') {
            info = {
                name: repoConfig.serviceName,
                port: repoConfig.servicePort,
                group: repoConfig.serviceGroup,
                src: {
                    owner: req.soajs.inputmaskData.owner,
                    repo: req.soajs.inputmaskData.repo
                },
                requestTimeout: repoConfig.requestTimeout,
                requestTimeoutRenewal: repoConfig.requestTimeoutRenewal,
                versions: {},
                path: path //needed for multi repo, not saved in db
            };
            if (!repoConfig.serviceVersion) { //setting version to 1 by default if not specified in config file
                repoConfig.serviceVersion = 1;
            }
            info.versions[repoConfig.serviceVersion] = {
                extKeyRequired: repoConfig.extKeyRequired,
                awareness: repoConfig.awareness,
                apis: extractAPIsList(repoConfig.schema)
            };
        }
        else if (repoConfig.type === 'daemon') {
            info = {
                name: repoConfig.serviceName,
                port: repoConfig.servicePort,
                group: repoConfig.serviceGroup,
                src: {
                    owner: req.soajs.inputmaskData.owner,
                    repo: req.soajs.inputmaskData.repo
                },
                versions: {},
                path: path //needed for multi repo, not saved in db
            };
            if (!repoConfig.serviceVersion) { //setting version to 1 by default if not specified in config file
                repoConfig.serviceVersion = 1;
            }
            info.versions[repoConfig.serviceVersion] = {
                jobs: extractDaemonJobs(repoConfig.schema)
            };
        }

        if(repoConfig.cmd){
            info.src.cmd = repoConfig.cmd;
        }

        if (repoConfig.main) {
            if (repoConfig.main.charAt(0) !== '/') {
                repoConfig.main = '/' + repoConfig.main;
            }
            info.src.main = repoConfig.main;
        }
        else if (flags && flags.multi) {
            if (typeof (path) === 'object') {
                info.src.main = assurePath('main', path.path, provider);
            }
            else {
                info.src.main = assurePath('main', path, provider);
            }
        }
    }
    return info;
}

function validateFileContents(req, repoConfig, cb) {
    if (repoConfig.type && repoConfig.type === 'multi') {
        if (!repoConfig.folders || !Array.isArray(repoConfig.folders) || (Array.isArray(repoConfig.folders) && repoConfig.folders.length === 0)) {
            req.soajs.log.error('Missing multi repository config data');
            return cb({'message': 'Missing multi repository config data'});
        }
    }
    else if (repoConfig.type && (repoConfig.type === 'service' || repoConfig.type === 'daemon')) {
        var errMsgs = [];
        var check = validator.validate(repoConfig, validatorSchemas.config);
        if (!check.valid) {
            check.errors.forEach(function (oneError) {
                errMsgs.push(oneError.stack);
            });
            req.soajs.log.error(errMsgs);
            return cb({"message": new Error(errMsgs.join(" - ")).message});
        }
    }
    else if (repoConfig.type && repoConfig.type === 'static') {
        if (!repoConfig.name) {
            return cb({'message': 'Missing field name for static repo in config.js'});
        }
    }
    else {
        return cb({'message': 'Invalid or no type provided in config.js'});
    }
    return cb(null, true);
}

module.exports = {

    'login': function (mongo, config, req, res) {
        var accountInfo = {
            type: req.soajs.inputmaskData.type,
            access: req.soajs.inputmaskData.access
        };

        var record = {
            label: req.soajs.inputmaskData.label,
            owner: req.soajs.inputmaskData.username,
            provider: req.soajs.inputmaskData.provider,
            type: req.soajs.inputmaskData.type,
            access: req.soajs.inputmaskData.access,
            repos: []
        };
        if (req.soajs.inputmaskData.password) {
            record.password = req.soajs.inputmaskData.password
        }

        git.login(req.soajs, data, mongo, record, function (error, result) {
            checkIfError(req, res, {config: config, error: error, code: (error && error.code && config.errors[error.code]) ? error.code : 751}, function () {
                return res.jsonp(req.soajs.buildResponse(null, true));
            });
        });
    },

    'logout': function (mongo, config, req, res) {
        validateId(mongo, req, function (error) {
            checkIfError(req, res, {config: config, error: error, code: 701}, function () {
                var options = {
                    accountId: req.soajs.inputmaskData.id,
                    provider: req.soajs.inputmaskData.provider,
                };
                if (req.soajs.inputmaskData.password) {
                    options.password = req.soajs.inputmaskData.password;
                }
                git.logout(req.soajs, data, mongo, options, function (error, result) {
                    checkIfError(req, res, {config: config, error: error, code: (error && error.code && config.errors[error.code]) ? error.code : 753}, function () {
                        return res.jsonp(req.soajs.buildResponse(null, true));
                    });
                });
            });
        });
    },

    'listAccounts': function (mongo, config, req, res) {
        data.listGitAccounts(mongo, function (error, records) {
            checkIfError(req, res, {config: config, error: error, code: 756}, function () {
                return res.jsonp(req.soajs.buildResponse(null, records));
            });
        });
    },

    'getRepos': function (mongo, config, req, res) {
        validateId(mongo, req, function (error) {
            checkIfError(req, res, {config: config, error: error, code: 701}, function () {
                var options = {
                    provider: req.soajs.inputmaskData.provider,
                    accountId: req.soajs.inputmaskData.id,
                    per_page: req.soajs.inputmaskData.per_page,
                    page: req.soajs.inputmaskData.page
                };

                git.getRepos(req.soajs, data, mongo, options, function (error, repos) {
                    checkIfError(req, res, {config: config, error: error, code: (error && error.code && config.errors[error.code]) ? error.code : 757}, function () {
                        return res.jsonp(req.soajs.buildResponse(null, repos));
                    });
                });
            });
        });
    },

    'getBranches': function (mongo, config, req, res) {
        if (req.soajs.inputmaskData.type === 'repo') {
            validateId(mongo, req, function (error) {
                checkIfError(req, res, {config: config, error: error, code: 701}, function () {
                    //provider is mandatory in this case only
                    checkIfError(req, res, {config: config, error: !req.soajs.inputmaskData.provider, code: 775}, function () {
                        var options = {
                            accountId: req.soajs.inputmaskData.id,
                            name: req.soajs.inputmaskData.name,
                            type: req.soajs.inputmaskData.type,
                            provider: req.soajs.inputmaskData.provider
                        };
                        git.getBranches(req.soajs, data, mongo, options, function (error, result) {
                            checkIfError(req, res, {config: config, error: error, code: (error && error.code && config.errors[error.code]) ? error.code : 759}, function () {
                                return res.jsonp(req.soajs.buildResponse(null, result));
                            });
                        });
                    });
                });
            });
        }
        else {
            getContentInfo(function (error, info) {
                if (error) {
                    return res.jsonp(req.soajs.buildResponse({"code": 759, "msg": config.errors[759]}));
                }

                data.getAccount(mongo, {owner: info.src.owner, repo: info.src.repo}, function (error, accountRecord) {
                    checkIfError(req, res, {config: config, error: error || !accountRecord, code: 759}, function () {
                        var options = {
                            owner: info.src.owner,
                            repo: info.src.repo,
                            type: req.soajs.inputmaskData.type,
                            provider: accountRecord.provider
                        };
                        if (accountRecord.token) {
                            options.token = accountRecord.token;
                        }
                        git.getBranches(req.soajs, data, mongo, options, function (error, result) {
                            checkIfError(req, res, {config: config, error: error, code: (error && error.code && config.errors[error.code]) ? error.code : 759}, function () {
                                return res.jsonp(req.soajs.buildResponse(null, result));
                            });
                        });
                    });
                });
            });
        }

        function getContentInfo(cb) {
            var coll;
            var type = req.soajs.inputmaskData.type;
            if (type === 'service') {
                coll = servicesColl;
            }
            else if (type === 'daemon') {
                coll = daemonsColl;
            }
            else if (type === 'static') {
                coll = staticContentColl;
            }

            mongo.findOne(coll, {name: req.soajs.inputmaskData.name}, function (error, record) {
                checkMongoError(req, error, cb, function () {
                    if (!record) {
                        req.soajs.log.error('Name [' + req.soajs.inputmaskData.name + '] does not match any ' + type);
                        return cb({'message': 'Name does not match any ' + type});
                    }

                    return cb (null, record);
                });
            });
        }
    },

    'activateRepo': function (mongo, config, req, res) {
        var configSHA = [];
        validateId(mongo, req, function (error) {
            checkIfError(req, res, {config: config, error: error, code: 701}, function () {
                data.getAuthToken(mongo, {accountId: req.soajs.inputmaskData.id}, function (error, token) {
                    checkIfError(req, res, {config: config, error: error, code: 755}, function () {
                        checkIfError(req, res, {config: config, error: !config.gitAccounts[req.soajs.inputmaskData.provider], code: 778}, function () {
                            getConfigFile(token, config.gitAccounts[req.soajs.inputmaskData.provider].defaultConfigFilePath, null, function (error, repoInfo) {
                                cleanConfigDir(req, {repoConfigsFolder: config.gitAccounts[req.soajs.inputmaskData.provider].repoConfigsFolder}, function () {
                                    checkIfError(req, res, {
                                        config: config,
                                        error: (error && error === 'alreadyExists'),
                                        code: 762
                                    }, function () {
                                        checkIfError(req, res, {
                                            config: config,
                                            error: error,
                                            code: (error && error.code && config.errors[error.code]) ? error.code : 761
                                        }, function () {
                                            cleanConfigDir(req, {repoConfigsFolder: config.gitAccounts[req.soajs.inputmaskData.provider].repoConfigsFolder}, function () {
                                                //only triggered in case of single repo, in case of multi check addNewMulti()
                                                addNew(repoInfo.type, repoInfo.info, function (error, result) {
                                                    checkIfError(req, res, {config: config, error: error, code: 761}, function () {
                                                        var newRepo = {
                                                            name: req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo,
                                                            type: result.type,
                                                            configBranch: req.soajs.inputmaskData.configBranch,
                                                            configSHA: configSHA[0].sha
                                                        };
                                                        data.addRepoToAccount(mongo, {accountId: req.soajs.inputmaskData.id, repo: newRepo}, function (error, data) {
                                                            checkIfError(req, res, {
                                                                config: config,
                                                                error: error || !data,
                                                                code: 761
                                                            }, function () {
                                                                return res.jsonp(req.soajs.buildResponse(null, result));
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
                    });
                });
            });
        });

        function getConfigFile(token, path, flags, cb) {
            var configPath = assurePath('config', path, req.soajs.inputmaskData.provider);
            var gitConfigObj = {
                provider: req.soajs.inputmaskData.provider,
                user: req.soajs.inputmaskData.owner,
                repo: req.soajs.inputmaskData.repo,
                path: configPath,
                ref: req.soajs.inputmaskData.configBranch,
                token: token
            };

            req.soajs.log.debug("Getting config file: " + configPath);
            git.getContent(req.soajs, gitConfigObj, function (error, repoConfig, configSHA) {
                if (error) {
                    return cb(error);
                }

                var path = {
                    path: configPath,
                    sha: configSHA
                };

                analyzeConfigFile(repoConfig, path, token, flags, cb);
            });
        }

        function analyzeConfigFile(repoConfig, path, token, flags, cb) {
            if (repoConfig.type !== 'multi') {
                req.soajs.log.debug("Analyzing config file for: " + repoConfig.serviceName + " of type: " + repoConfig.type);
            }
            else {
                req.soajs.log.debug("Analyzing root config file for repository of type " + repoConfig.type);
            }
            validateFileContents(req, repoConfig, function (error) {
                if (error) {
                    return cb(error);
                }
                var info = {};
                if (repoConfig.type === 'multi') {
                    addNewMulti(repoConfig.folders, token, cb);
                }
                else {
                    info = getServiceInfo(req, repoConfig, path, flags, req.soajs.inputmaskData.provider);
                    if (info.path) {
                        delete info.path;
                    }
                    checkCanAdd(repoConfig.type, info, function (error) {
                        if (error) {
                            return cb(error);
                        }
                        var result = {
                            type: repoConfig.type,
                            info: info
                        };
                        result.info.path = {//needed for multi repos
                            path: path.path,
                            sha: path.sha
                        };
                        return cb(null, result);
                    });
                }
            });
        }

        function checkCanAdd(type, info, cb) {
            var coll;
            var criteria = {};

            if (type === 'service') {
                coll = servicesColl;
                criteria['$or'] = [
                    { "name": info.name },
                    { "port": info.port }
                ];
            }
            else if (type === 'daemon') {
                coll = daemonsColl;
                criteria['$or'] = [
                    { "name": info.name },
                    { "port": info.port }
                ];
            }
            else if (type === 'static') {
                criteria['name'] = info.name;
                criteria['src.repo'] = req.soajs.inputmaskData.repo;
                criteria['src.owner'] = req.soajs.inputmaskData.owner;
                coll = staticContentColl;
            }

            mongo.count(coll, criteria, function (error, count) {
                checkMongoError(req, error, cb, function () {
                    if(type === 'service' || type === 'daemon'){
                        if (count > 0) {
                            req.soajs.log.error("A " + type + " with the same name or port exists");
                            return cb('alreadyExists');
                        }
                        return cb(null, info);
                    }
                    else{
                        if (count > 0) {
                            req.soajs.log.error("Static content with the same name exists");
                            return cb('alreadyExists');
                        }
                        return cb(null, info);
                    }
                });
            });
        }

        function addNew(type, info, cb) {
            if (type === 'service' || type === 'daemon') {
                addNewServiceOrDaemon(type, info, cb);
            }
            else if (type === 'static') {
                addNewStaticContent(type, info, cb);
            }
        }

        function addNewServiceOrDaemon(type, info, cb) {
            var coll;
            if (type === 'service') {
                coll = servicesColl;
            } else if (type === 'daemon') {
                coll = daemonsColl;
            }

            var tempPath = info.path.path;
            var tempSHA = info.path.sha;

            delete info.path;

            var s = {
                '$set': {}
            };

            for (var p in info) {
                if (Object.hasOwnProperty.call(info, p)) {
                    if (p !== 'versions') {
                        s.$set[p] = info[p];
                    }
                }
            }

            if (info.versions) {
                for (var vp in info.versions) {
                    if (Object.hasOwnProperty.call(info.versions, vp)) {
                        s.$set['versions.' + vp] = info.versions[vp];
                    }
                }
            }

            mongo.update(coll, {name: info.name}, s, {safe: true, multi: false, 'upsert': true}, function (error) {
                checkMongoError(req, error, cb, function () {
                    var added = {
                        type: type,
                        name: info.name,
                        repo: req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo
                    };
                    configSHA.push({
                        contentType: type,
                        contentName: info.name,
                        path: tempPath,
                        sha: tempSHA
                    });
                    return cb(null, added);
                });
            });
        }

        function addNewMulti(paths, token, cb) {
            async.mapSeries(paths, function (path, callback) {
                getConfigFile(token, path, {multi: true}, callback);
            }, function (error, results) {
                cleanConfigDir(req, {repoConfigsFolder: config.gitAccounts[req.soajs.inputmaskData.provider].repoConfigsFolder}, function () {
                    checkMongoError(req, error, cb, function () {
                        async.map(results, function (result, callback) {
                            addNew(result.type, result.info, callback);
                        }, function (error, results) {
                            checkMongoError(req, error, cb, function () {
                                var newRepo = {
                                    name: req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo,
                                    type: 'multi',
                                    configBranch: req.soajs.inputmaskData.configBranch,
                                    configSHA: configSHA
                                };

                                data.addRepoToAccount(mongo, {accountId: req.soajs.inputmaskData.id, repo: newRepo}, function (error, result) {
                                    checkIfError(req, res, {
                                        config: config,
                                        error: error || !result,
                                        code: 761
                                    }, function () {
                                        return res.jsonp(req.soajs.buildResponse(null, results));
                                    });
                                });
                            });
                        });
                    });
                });
            });
        }

        function addNewStaticContent(type, staticContentInfo, cb) {
            var tempPath = staticContentInfo.path.path;
            var tempSHA = staticContentInfo.path.sha;

            delete staticContentInfo.path;

            mongo.insert(staticContentColl, staticContentInfo, function (error) {
                checkMongoError(req, error, cb, function () {
                    var added = {
                        type: 'static',
                        name: staticContentInfo.name,
                        repo: req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo
                    };
                    configSHA.push({
                        contentType: type,
                        contentName: staticContentInfo.name,
                        path: tempPath,
                        sha: tempSHA
                    });
                    return cb(null, added);
                });
            });
        }
    },

    'deactivateRepo': function (mongo, config, req, res) {
        validateId(mongo, req, function (error) {
            checkIfError(req, res, {config: config, error: error, code: 701}, function () {
                var repoLabel = req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo;
                data.getRepo(mongo, {accountId: req.soajs.inputmaskData.id, repoLabel: repoLabel}, function (error, record) {
                    checkIfError(req, res, {config: config, error: error || !record, code: 765}, function () {
                        remove(record.repos[0].type, function (error, result) {
                            checkIfError(req, res, {
                                config: config,
                                error: error,
                                code: (error && error.code) ? error.code : 765
                            }, function () {
                                return res.jsonp(req.soajs.buildResponse(null, true));
                            });
                        });
                    });
                });
            });
        });

        function remove(type, cb) {
            if (type === 'service' || type === 'daemon') {
                removeServiceOrDaemon(type, cb);
            } else if (type === 'static') {
                removeStaticContent(cb);
            } else if (type === 'multi') {
                removeMulti(cb);
            } else {
                req.soajs.log.error("Invalid type detected, must be [service || daemon || static || multi]");
                return cb("invalidType");
            }
        }

        function removeServiceOrDaemon(type, cb) {
            var coll = '';
            if (type === 'service') {
                coll = servicesColl
            } else {
                coll = daemonsColl;
            }

            mongo.findOne(coll, {
                'src.owner': req.soajs.inputmaskData.owner,
                'src.repo': req.soajs.inputmaskData.repo
            }, {name: 1, _id: 0}, function (error, record) {

                checkMongoError(req, error || !record, cb, function () {
                    //check hosts collection first, if no running services exist, allow deactivate
                    mongo.count(hostsColl, {name: record.name}, function (error, count) {
                        checkMongoError(req, error, cb, function () {
                            if (count > 0) {
                                return cb({'code': 766, 'message': 'Repository has running hosts'});
                            }

                            mongo.remove(coll, {
                                'src.owner': req.soajs.inputmaskData.owner,
                                'src.repo': req.soajs.inputmaskData.repo
                            }, function (error) {

                                checkMongoError(req, error, cb, function () {
                                    var repoLabel = req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo;
                                    data.removeRepoFromAccount(mongo, {accountId: req.soajs.inputmaskData.id, repoLabel: repoLabel}, function (error, result) {
                                        checkMongoError(req, error || !result, cb, function () {
                                            return cb(null, true);
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        }

        function removeStaticContent(cb) {
            mongo.remove(staticContentColl, {
                'src.owner': req.soajs.inputmaskData.owner,
                'src.repo': req.soajs.inputmaskData.repo
            }, function (error) {
                checkMongoError(req, error, cb, function () {
                    var repoLabel = req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo;
                    data.removeRepoFromAccount(mongo, {accountId: req.soajs.inputmaskData.id, repoLabel: repoLabel}, function (error, result) {
                        checkMongoError(req, error || !result, cb, function () {
                            return cb(null, true);
                        });
                    });
                });
            });
        }

        function removeMulti(cb) {
            async.parallel([getRepoServices, getRepoDaemons], function (error, repoContents) {
                var names = [];
                repoContents.forEach(function (oneRepoArr) {
                    names = names.concat(oneRepoArr);
                });

                //check if running instances exist before deleting
                mongo.count(hostsColl, {name: {'$in': names}}, function (error, count) {
                    checkMongoError(req, error, cb, function () {
                        if (count > 0) {
                            return cb({'code': 766, 'message': 'Repository has running hosts'});
                        }

                        async.parallel([removeService, removeDaemon, removeStaticContent], function (error, results) {
                            var repoLabel = req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo;
                            data.removeRepoFromAccount(mongo, {accountId: req.soajs.inputmaskData.id, repoLabel: repoLabel}, function (error, result) {
                                checkMongoError(req, error || !result, cb, function () {
                                    return cb(null, results);
                                });
                            });
                        });
                    });
                });
            });

            function removeService(callback) {
                mongo.remove(servicesColl, {
                    'src.owner': req.soajs.inputmaskData.owner,
                    'src.repo': req.soajs.inputmaskData.repo
                }, function (error) {
                    return callback(error);
                });
            }

            function removeDaemon(callback) {
                mongo.remove(daemonsColl, {
                    'src.owner': req.soajs.inputmaskData.owner,
                    'src.repo': req.soajs.inputmaskData.repo
                }, function (error) {
                    return callback(error);
                });
            }

            function removeStaticContent(callback) {
                mongo.remove(staticContentColl, {
                    'src.owner': req.soajs.inputmaskData.owner,
                    'src.repo': req.soajs.inputmaskData.repo
                }, function (error) {
                    return callback(error);
                });
            }

            function getRepoServices(callback) {
                mongo.find(servicesColl, {
                    'src.owner': req.soajs.inputmaskData.owner,
                    'src.repo': req.soajs.inputmaskData.repo
                }, {name: 1, _id: 0}, function (error, records) {
                    for (var i = 0; i < records.length; i++) {
                        records[i] = records[i].name;
                    }
                    return callback(error, records);
                });
            }

            function getRepoDaemons(callback) {
                mongo.find(daemonsColl, {
                    'src.owner': req.soajs.inputmaskData.owner,
                    'src.repo': req.soajs.inputmaskData.repo
                }, {name: 1, _id: 0}, function (error, records) {
                    for (var i = 0; i < records.length; i++) {
                        records[i] = records[i].name;
                    }
                    return callback(error, records);
                });
            }
        }
    },

    'syncRepo': function (mongo, config, req, res) {
        validateId(mongo, req, function (error) {
            checkIfError(req, res, {config: config, error: error, code: 701}, function () {
                data.getAccount(mongo, {accountId: req.soajs.inputmaskData.id}, function (error, accountRecord) {
                    checkIfError(req, res, {config: config, error: error || !accountRecord, code: 767}, function () {
                        var repoLabel = req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo;
                        var configSHA;
                        for (var i = 0; i < accountRecord.repos.length; i++) {
                            if (accountRecord.repos[i].name === repoLabel) {
                                configSHA = accountRecord.repos[i].configSHA;
                                req.soajs.data = {
                                    configBranch: accountRecord.repos[i].configBranch,
                                    repoType: accountRecord.repos[i].type
                                };

                                if (accountRecord.repos[i].type === 'multi') {
                                    var repo = accountRecord.repos[i];
                                    req.soajs.data.repoContentTypes = {};
                                    for (var j = 0; j < accountRecord.repos[i].configSHA.length; j++) {
                                        req.soajs.data.repoContentTypes[repo.configSHA[j].contentName] = repo.configSHA[j].contentType;
                                    }
                                }

                                break;
                            }
                        }

                        checkIfError(req, res, {config: config, error: !req.soajs.data || !req.soajs.data.configBranch, code: 767}, function () {
                            checkIfError(req, res, {config: config, error: !config.gitAccounts[req.soajs.inputmaskData.provider], code: 778}, function () {
                                getConfigFile(accountRecord.token, configSHA, config.gitAccounts[req.soajs.inputmaskData.provider].defaultConfigFilePath, null, function (error, result) {
                                    cleanConfigDir(req, {repoConfigsFolder: config.gitAccounts[req.soajs.inputmaskData.provider].repoConfigsFolder}, function () {
                                        if (error && error === 'outOfSync') {
                                            data.updateRepoInfo(mongo, {accountId: req.soajs.inputmaskData.id, repoLabel: repoLabel, property: 'status', value: 'outOfSync'}, function (error, result) {
                                                checkIfError(req, res, {
                                                    config: config,
                                                    error: error || !result,
                                                    code: 600
                                                }, function () {
                                                    return res.jsonp(req.soajs.buildResponse(null, {status: 'outOfSync'}));
                                                });
                                            });
                                        }
                                        else {
                                            checkIfError(req, res, {
                                                config: config,
                                                error: error,
                                                code: (error && error.code && config.errors[error.code]) ? error.code : 768
                                            }, function () {
                                                if (result && result.status === 'multiSyncDone') { //multi repo, syncRepo already done
                                                    return res.jsonp(req.soajs.buildResponse(null, result));
                                                }

                                                //repo config is up to date, no need for sync
                                                if (result && result === 'upToDate') {
                                                    return res.jsonp(req.soajs.buildResponse(null, {status: 'upToDate'}));
                                                }

                                                //not a multi repo and repo config is not up to date
                                                syncRepo(result.type, result.info, result.sha, function (error, newSHA) {
                                                    checkIfError(req, res, {
                                                        config: config,
                                                        error: error,
                                                        code: 768
                                                    }, function () {
                                                        var repoLabel = req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo;
                                                        data.updateRepoInfo(mongo, {accountId: req.soajs.inputmaskData.id, repoLabel: repoLabel, property: 'configSHA', value: newSHA.sha}, function (error, result) {
                                                            checkIfError(req, res, {
                                                                config: config,
                                                                error: error || !result,
                                                                code: 600
                                                            }, function () {
                                                                return res.jsonp(req.soajs.buildResponse(null, true));
                                                            });
                                                        });
                                                    });
                                                });
                                            });
                                        }
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

        function getConfigFile(token, sha, path, flags, cb) {
            var configPath = assurePath('config', path, req.soajs.inputmaskData.provider);
            var gitConfigObj = {
                provider: req.soajs.inputmaskData.provider,
                user: req.soajs.inputmaskData.owner,
                repo: req.soajs.inputmaskData.repo,
                path: configPath,
                ref: req.soajs.data.configBranch,
                token: token
            };

            req.soajs.log.debug("Getting config file: " + configPath);
            git.getContent(req.soajs, gitConfigObj, function (error, repoConfig, configSHA) {
                if (error) {
                    return cb (error);
                }

                var configSHA = {
                    local: sha,
                    remote: configSHA
                };

                analyzeConfigFile(repoConfig, path, token, configSHA, flags, cb);
            });
        }

        function analyzeConfigFile(repoConfig, path, token, configSHA, flags, cb) {
            if (repoConfig.type !== 'multi') {
                req.soajs.log.debug("Analyzing config file for: " + repoConfig.serviceName + " of type: " + repoConfig.type);
            }
            else {
                req.soajs.log.debug("Analyzing root config file for repository of type " + repoConfig.type);
            }

            if (req.soajs.data.repoType === 'mutli' && repoConfig.type !== req.soajs.data.repoContentTypes[repoConfig.serviceName]) {
                return cb('outOfSync');
            }
            if (req.soajs.data.repoType !== 'multi' && repoConfig.type !== req.soajs.data.repoType) {
                return cb('outOfSync');
            }
            if (repoConfig.type !== 'multi' && configSHA.local === configSHA.remote) {//not applicable in case of multi repo, sub configs might be changed without changing root config
                return cb(null, 'upToDate');
            }
            validateFileContents(req, repoConfig, function (error) {

                checkMongoError(req, error, cb, function () {
                    var info = {};
                    if (repoConfig.type === 'multi') {
                        syncMultiRepo(repoConfig.folders, token, cb);
                    }
                    else {
                        info = getServiceInfo(req, repoConfig, path, flags, req.soajs.inputmaskData.provider);
                        checkCanSync(repoConfig.type, info, flags, function (error) {
                            if (error) {
                                req.soajs.log.error(error);
                                return cb(error);
                            }
                            var result = {
                                type: repoConfig.type,
                                info: info,
                                sha: configSHA.remote
                            };

                            return cb(null, result);
                        });
                    }
                });
            });
        }

        function checkCanSync(type, info, flags, cb) {
            if (flags && flags.new) {//in case a new sub service was added, it shouldn't check for its existence
                return cb(null, info);
            }
            var coll;
            var criteria = {};
            criteria['name'] = info.name;
            criteria['src.repo'] = req.soajs.inputmaskData.repo;
            criteria['src.owner'] = req.soajs.inputmaskData.owner;
            if (type === 'service') {
                coll = servicesColl;
                criteria['port'] = info.port;
            }
            else if (type === 'daemon') {
                coll = daemonsColl;
                criteria['port'] = info.port;
            }
            else if (type === 'static') {
                coll = staticContentColl;
            }
            mongo.count(coll, criteria, function (error, count) {

                checkMongoError(req, error, cb, function () {
                    if (count === 0) {
                        req.soajs.log.error("Repository is out of sync");
                        return cb('outOfSync');
                    }
                    return cb(null, info);
                });
            });
        }

        function syncRepo(type, info, configSHA, cb) {
            var coll;
            var criteria = {};
            criteria['name'] = info.name;
            criteria['src.repo'] = req.soajs.inputmaskData.repo;
            criteria['src.owner'] = req.soajs.inputmaskData.owner;

            if (type === 'service') {
                coll = servicesColl;
                criteria['port'] = info.port;
            } else if (type === 'daemon') {
                coll = daemonsColl;
                criteria['port'] = info.port;
            } else if (type === 'static') {
                coll = staticContentColl;
            }

            var configData = {
                contentType: type,
                contentName: info.name,
                path: info.path,
                sha: configSHA
            };

            delete info.name;
            delete info.path;

            if (info.port) {
                delete info.port;
            }

            var s = {
                '$set': {}
            };

            for (var p in info) {
                if (Object.hasOwnProperty.call(info, p)) {
                    if (p !== 'versions') {
                        s.$set[p] = info[p];
                    }
                }
            }

            if (info.versions) {
                for (var vp in info.versions) {
                    if (Object.hasOwnProperty.call(info.versions, vp)) {
                        s.$set['versions.' + vp] = info.versions[vp];
                    }
                }
            }
            mongo.update(coll, criteria, s, {'upsert': true}, function (error) {
                checkMongoError(req, error, cb, function () {
                    return cb(null, configData);
                });
            });
        }

        function syncMultiRepo(paths, token, cb) {
            var repoLabel = req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo;
            data.getRepo(mongo, {accountId: req.soajs.inputmaskData.id, repoLabel: repoLabel}, function (error, record) {
                checkMongoError(req, error, cb, function () {
                    var configSHA = record.repos[0].configSHA;
                    comparePaths(paths, configSHA, function (allPaths) {
                        var flags = {
                            multi: true
                        };

                        async.mapSeries(allPaths, function (path, callback) {
                            if (path.status === 'available') {
                                getConfigFile(token, path.sha, path.path, flags, callback);
                            }
                            else if (path.status === 'new') {
                                flags.new = true;
                                getConfigFile(token, path.sha, path.path, flags, callback);
                            }
                            else if (path.status === 'removed') {
                                remove(path, callback);
                            }
                        }, function (error, results) {
                            cleanConfigDir(req, {repoConfigsFolder: config.gitAccounts[req.soajs.inputmaskData.provider].repoConfigsFolder}, function () {
                                if (error) {
                                    return cb(error);
                                }

                                async.map(results, function (oneResult, callback) {
                                    if (typeof(oneResult) === 'object' && oneResult.type && oneResult.info && oneResult.sha) {
                                        syncRepo(oneResult.type, oneResult.info, oneResult.sha, callback);
                                    } else {
                                        return callback(null, oneResult);
                                    }
                                }, function (error, results) {

                                    checkMongoError(req, error, cb, function () {

                                        var resObj = {
                                            updated: [],
                                            removed: [],
                                            added: []
                                        };
                                        var found = false;
                                        results.forEach(function (output) {
                                            if (output !== 'upToDate') {
                                                if (output.removed) {//removed
                                                    for (var i = configSHA.length - 1; i >= 0; i--) {
                                                        if (configSHA[i].path === output.path && configSHA[i].sha === output.sha) {
                                                            resObj.removed.push({
                                                                name: output.contentName,
                                                                type: output.contentType
                                                            });
                                                            configSHA.splice(i, 1);
                                                            break;
                                                        }
                                                    }
                                                } else {//updated
                                                    for (var i = 0; i < configSHA.length; i++) {
                                                        if (configSHA[i].path === output.path) {
                                                            configSHA[i].sha = output.sha;
                                                            resObj.updated.push({
                                                                name: output.contentName,
                                                                type: output.contentType
                                                            });
                                                            found = true;
                                                            break;
                                                        }
                                                    }
                                                    if (!found) { //added
                                                        configSHA.push(output);
                                                        resObj.added.push({
                                                            name: output.contentName,
                                                            type: output.contentType
                                                        });
                                                    }
                                                }
                                            }
                                        });
                                        data.updateRepoInfo(mongo, {accountId: req.soajs.inputmaskData.id, repoLabel: repoLabel, property: 'configSHA', value: configSHA}, function (error, result) {
                                            checkMongoError(req, error || !result, cb, function () {
                                                resObj.status = 'multiSyncDone';
                                                return cb(null, resObj);
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        }

        function comparePaths(remote, local, callback) {
            //create indexes for local and remote
            var allPaths = [];
            var remoteIndex = {};
            var localIndex = {};

            remote.forEach(function (onePath) {
                remoteIndex[assurePath('config', onePath, req.soajs.inputmaskData.provider)] = {};
                if (allPaths.indexOf(assurePath('config', onePath, req.soajs.inputmaskData.provider)) === -1) {
                    allPaths.push(assurePath('config', onePath, req.soajs.inputmaskData.provider));
                }
            });

            local.forEach(function (onePath) {
                if (onePath.path !== config.gitAccounts[req.soajs.inputmaskData.provider].defaultConfigFilePath) { //excluding root config.js file
                    localIndex[assurePath('config', onePath.path, req.soajs.inputmaskData.provider)] = {
                        contentName: onePath.contentName,
                        contentType: onePath.contentType,
                        sha: onePath.sha
                    };
                    if (allPaths.indexOf(assurePath('config', onePath.path, req.soajs.inputmaskData.provider)) === -1) {
                        allPaths.push(assurePath('config', onePath.path, req.soajs.inputmaskData.provider));
                    }
                }
            });

            for (var i = 0; i < allPaths.length; i++) {
                if (localIndex[allPaths[i]] && remoteIndex[allPaths[i]]) {
                    allPaths[i] = {
                        path: allPaths[i],
                        sha: localIndex[allPaths[i]].sha,
                        status: 'available'
                    };
                }
                else if (localIndex[allPaths[i]] && !remoteIndex[allPaths[i]]) {
                    allPaths[i] = {
                        path: allPaths[i],
                        contentType: localIndex[allPaths[i]].contentType,
                        contentName: localIndex[allPaths[i]].contentName,
                        sha: localIndex[allPaths[i]].sha,
                        status: 'removed'
                    };
                }
                else if (!localIndex[allPaths[i]] && remoteIndex[allPaths[i]]) {
                    allPaths[i] = {
                        path: allPaths[i],
                        status: 'new'
                    };
                }
            }

            return callback(allPaths);
        }

        function remove(path, callback) {
            mongo.count(hostsColl, {name: path.contentName}, function (error, count) {

                checkMongoError(req, error, callback, function () {
                    if (count > 0) {
                        return callback('hostsExist');
                    }

                    var coll;
                    if (path.contentType === 'service') {
                        coll = servicesColl;
                    }
                    else if (path.contentType === 'daemon') {
                        coll = daemonsColl;
                    }
                    else if (path.contentType === 'static') {
                        coll = staticContentColl;
                    }

                    mongo.remove(coll, {
                        name: path.contentName,
                        'src.owner': req.soajs.inputmaskData.owner,
                        'src.repo': req.soajs.inputmaskData.repo
                    }, function (error) {

                        checkMongoError(req, error, callback, function () {

                            return callback(null, {
                                removed: true,
                                contentName: path.contentName,
                                contentType: path.contentType,
                                path: path.path,
                                sha: path.sha
                            });
                        });

                    });

                });

            });
        }
    }
};
