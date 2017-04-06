'use strict';
var coreModules = require ("soajs.core.modules");
var core = coreModules.core;
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

var deployer = require("soajs.core.drivers");

function validateId(soajs, cb) {
	BL.model.validateId(soajs, cb);
}

function checkIfError(req, res, data, cb) {
    if (data.error) {
        if (typeof (data.error) === 'object' && (data.error.message || data.error.msg)) {
            req.soajs.log.error(data.error);
        }

        if(data.error.message && typeof (data.error.messagedata) === 'string' && error.message.indexOf('getaddrinfo EAI_AGAIN ') != -1) {
            data.code = 763;
            data.config.errors[data.code] = data.config.errors[data.code].replace("%message%", data.config.errors[904]);
        }
        else {
            data.config.errors[data.code] = data.config.errors[data.code].replace("%message%", data.error.message);
        }
        return res.jsonp(req.soajs.buildResponse({"code": data.code, "msg": data.config.errors[data.code]}));
    } else {
        return cb();
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
	var protocols = ['post','get', 'put','del','delete'];
    var excluded = ['commonFields'];
    var apiList = [];
	var newStyleApi = false;
    for (var route in schema) {
        if (Object.hasOwnProperty.call(schema, route)) {
            if (excluded.indexOf(route) !== -1) {
                continue;
            }

	        if(protocols.indexOf(route) !== -1){
		        newStyleApi = true;
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

	if(newStyleApi){
		for (var protocol in schema) {
            if (excluded.indexOf(protocol) !== -1) {
                continue;
            }

			for(var route in schema[protocol]){
				var oneApi = {
					'l': schema[protocol][route]._apiInfo.l,
					'v': route,
					'm': protocol
				};

				if (schema[protocol][route]._apiInfo.group) {
					oneApi.group = schema[protocol][route]._apiInfo.group;
				}

				if (schema[protocol][route]._apiInfo.groupMain) {
					oneApi.groupMain = schema[protocol][route]._apiInfo.groupMain;
				}
				apiList.push(oneApi);
			}
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
            	provider: provider,
                owner: req.soajs.inputmaskData.owner,
                repo: req.soajs.inputmaskData.repo
            },
            path: path //needed for multi repo, not saved in db
        };
    }
    else if (repoConfig.type === 'daemon' || repoConfig.type === 'service') {
        if (repoConfig.type === 'service') {
            info = {
            	swagger: repoConfig.swagger || false,
                name: repoConfig.serviceName,
                port: repoConfig.servicePort,
                group: repoConfig.serviceGroup,
                src: {
	                provider: provider,
                    owner: req.soajs.inputmaskData.owner,
                    repo: req.soajs.inputmaskData.repo
                },
				prerequisites: repoConfig.prerequisites || {},
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
                awareness: repoConfig.awareness || true,
                apis: extractAPIsList(repoConfig.schema)
            };
        }
        else if (repoConfig.type === 'daemon') {
            info = {
                name: repoConfig.serviceName,
                port: repoConfig.servicePort,
                group: repoConfig.serviceGroup,
                src: {
	                provider: provider,
                    owner: req.soajs.inputmaskData.owner,
                    repo: req.soajs.inputmaskData.repo
                },
				prerequisites: repoConfig.prerequisites || {},
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

function validateFileContents(req, res, repoConfig, cb) {
    if (repoConfig.type && repoConfig.type === 'multi') {
        if (!repoConfig.folders) {
            return res.jsonp(req.soajs.buildResponse({code: 783, "msg": config.errors[783]}));
        }
        if (!Array.isArray(repoConfig.folders)) {
            return res.jsonp(req.soajs.buildResponse({code: 784, "msg": config.errors[784]}));
        }
        if (Array.isArray(repoConfig.folders) && repoConfig.folders.length === 0) {
            return res.jsonp(req.soajs.buildResponse({code: 785, "msg": config.errors[785]}));
        }
    }
    else if (repoConfig.type && (repoConfig.type === 'service' || repoConfig.type === 'daemon')) {
        var errMsgs = [];
	    var check;
        if(repoConfig.type === 'service'){
	        check = validator.validate(repoConfig, validatorSchemas.service);
        }
        else{
	        check = validator.validate(repoConfig, validatorSchemas.daemon);
        }
        if (!check.valid) {
            check.errors.forEach(function (oneError) {
                errMsgs.push(oneError.stack);
            });
            req.soajs.log.error(errMsgs);
            return cb({code: 786, "message": new Error(errMsgs.join(" - ")).message});
        }
    }
    else if (repoConfig.type && repoConfig.type === 'static') {
        if (!repoConfig.name) {
            return res.jsonp(req.soajs.buildResponse({code: 787, "msg": config.errors[787]}));
        }
    }
    else {
        return res.jsonp(req.soajs.buildResponse({code: 788, "msg": config.errors[788]}));
    }
    return cb(null, true);
}

function buildDeployerOptions(envRecord, soajs) {
	var options = {};
	var envDeployer = envRecord.deployer;

	if (!envDeployer) return null;
	if (Object.keys(envDeployer).length === 0) return null;
	if (!envDeployer.type || !envDeployer.selected) return null;
	if (envDeployer.type === 'manual') return null;

	var selected = envDeployer.selected.split('.');

	options.strategy = selected[1];
	options.driver = selected[1] + '.' + selected[2];
	options.env = envRecord.code.toLowerCase();

	for (var i = 0; i < selected.length; i++) {
		envDeployer = envDeployer[selected[i]];
	}

	options.deployerConfig = envDeployer;
	options.soajs = { registry: soajs.registry };
	options.model = BL.model;

	//temporary///////
	if (options.strategy === 'docker') options.strategy = 'swarm';
	//////////////////

	return options;
}

var BL = {

    model: null,

    'login': function (config, req, res) {
        var record = {
            label: req.soajs.inputmaskData.label,
            owner: req.soajs.inputmaskData.username,
            provider: req.soajs.inputmaskData.provider,
            domain: req.soajs.inputmaskData.domain,
            type: req.soajs.inputmaskData.type,
            access: req.soajs.inputmaskData.access,
            repos: []
        };

        if (req.soajs.inputmaskData.password) {
            record.password = req.soajs.inputmaskData.password
        }

        if (req.soajs.inputmaskData.oauthKey && req.soajs.inputmaskData.oauthSecret) {
            record.tokenInfo = {
                oauthKey: req.soajs.inputmaskData.oauthKey,
                oauthSecret: req.soajs.inputmaskData.oauthSecret
            };
        }

        git.login(req.soajs, data, BL.model, record, function (error, result) {
            checkIfError(req, res, {config: config, error: error, code: (error && error.code && config.errors[error.code]) ? error.code : 751}, function () {
                return res.jsonp(req.soajs.buildResponse(null, true));
            });
        });
    },

    'logout': function (config, req, res) {
        validateId(req.soajs, function (error) {
            checkIfError(req, res, {config: config, error: error, code: 701}, function () {
                var options = {
                    accountId: req.soajs.inputmaskData.id,
                    provider: req.soajs.inputmaskData.provider,
                };
                if (req.soajs.inputmaskData.password) {
                    options.password = req.soajs.inputmaskData.password;
                }
                git.logout(req.soajs, data, BL.model, options, function (error, result) {
                    checkIfError(req, res, {config: config, error: error, code: (error && error.code && config.errors[error.code]) ? error.code : 753}, function () {
                        return res.jsonp(req.soajs.buildResponse(null, true));
                    });
                });
            });
        });
    },

    'listAccounts': function (config, req, res) {
        data.listGitAccounts(req.soajs, BL.model, function (error, records) {
            checkIfError(req, res, {config: config, error: error, code: 756}, function () {
                return res.jsonp(req.soajs.buildResponse(null, records));
            });
        });
    },

    'getRepos': function (config, req, res) {
        validateId(req.soajs, function (error) {
            checkIfError(req, res, {config: config, error: error, code: 701}, function () {
                var options = {
                    provider: req.soajs.inputmaskData.provider,
                    accountId: req.soajs.inputmaskData.id,
                    per_page: req.soajs.inputmaskData.per_page,
                    page: req.soajs.inputmaskData.page
                };

                git.getRepos(req.soajs, data, BL.model, options, function (error, repos) {
                    checkIfError(req, res, {config: config, error: error, code: (error && error.code && config.errors[error.code]) ? error.code : 757}, function () {
                        return res.jsonp(req.soajs.buildResponse(null, repos));
                    });
                });
            });
        });
    },

    'getBranches': function (config, req, res) {
        if (req.soajs.inputmaskData.type === 'repo') {
            validateId(req.soajs, function (error) {
                checkIfError(req, res, {config: config, error: error, code: 701}, function () {
                    //provider is mandatory in this case only
                    checkIfError(req, res, {config: config, error: !req.soajs.inputmaskData.provider, code: 775}, function () {
                        var options = {
                            accountId: req.soajs.inputmaskData.id,
                            name: req.soajs.inputmaskData.name,
                            type: req.soajs.inputmaskData.type,
                            provider: req.soajs.inputmaskData.provider
                        };
                        git.getBranches(req.soajs, data, BL.model, options, function (error, result) {
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

                data.getAccount(req.soajs, BL.model, {owner: info.src.owner, repo: info.src.repo}, function (error, accountRecord) {
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
                        git.getBranches(req.soajs, data, BL.model, options, function (error, result) {
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

            var opts = {
                collection: coll,
                conditions: { name: req.soajs.inputmaskData.name }
            };
            BL.model.findEntry(req.soajs, opts, function (error, record) {
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

    'activateRepo': function (config, req, res) {
        var configSHA = [];
        validateId(req.soajs, function (error) {
            checkIfError(req, res, {config: config, error: error, code: 701}, function () {
                data.getAuthToken(req.soajs, BL.model, {accountId: req.soajs.inputmaskData.id}, function (error, token) {
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
                                                        data.addRepoToAccount(req.soajs, BL.model, {accountId: req.soajs.inputmaskData.id, repo: newRepo}, function (error, data) {
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
                accountId: req.soajs.inputmaskData.id,
                provider: req.soajs.inputmaskData.provider,
                user: req.soajs.inputmaskData.owner,
                repo: req.soajs.inputmaskData.repo,
                project: req.soajs.inputmaskData.project,
                path: configPath,
                ref: req.soajs.inputmaskData.configBranch,
                token: token
            };

            req.soajs.log.debug("Getting config file: " + configPath);
            git.getJSONContent(req.soajs, data, BL.model, gitConfigObj, function (error, repoConfig, configSHA) {
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
            validateFileContents(req, res, repoConfig, function (error) {
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
            var opts = {
                collection: '',
                conditions: {}
            };

            if (type === 'service') {
                opts.collection = servicesColl;
                opts.conditions['$or'] = [
                    { "name": info.name },
                    { "port": info.port }
                ];
            }
            else if (type === 'daemon') {
                opts.collection = daemonsColl;
                opts.conditions['$or'] = [
                    { "name": info.name },
                    { "port": info.port }
                ];
            }
            else if (type === 'static') {
                opts.conditions['name'] = info.name;
                opts.conditions['src.repo'] = req.soajs.inputmaskData.repo;
                opts.conditions['src.owner'] = req.soajs.inputmaskData.owner;
                opts.collection = staticContentColl;
            }

            BL.model.countEntries(req.soajs, opts, function (error, count) {
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

	            if(!info.swagger){
		            info.swagger = false;
	            }

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

            var opts = {
                collection: coll,
                conditions: { name: info.name },
                fields: s,
                options: { safe: true, multi: false, 'upsert': true }
            };
            BL.model.updateEntry(req.soajs, opts, function (error) {
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

                                data.addRepoToAccount(req.soajs, BL.model, {accountId: req.soajs.inputmaskData.id, repo: newRepo}, function (error, result) {
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

            var opts = {
                collection: staticContentColl,
                record: staticContentInfo
            };
            BL.model.insertEntry(req.soajs, opts, function (error) {
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

    'deactivateRepo': function (config, req, res) {
        validateId(req.soajs, function (error) {
            checkIfError(req, res, {config: config, error: error, code: 701}, function () {
                var repoLabel = req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo;
                data.getRepo(req.soajs, BL.model, {accountId: req.soajs.inputmaskData.id, repoLabel: repoLabel}, function (error, record) {
                    checkIfError(req, res, {config: config, error: error || !record, code: 765}, function () {
                        remove(record.repos[0].type, function (error, result) {
                            checkIfError(req, res, {
                                config: config,
                                error: error,
                                code: (error && error.code) ? error.code : 795
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

            var opts = {
                collection: coll,
                conditions: {
                    'src.owner': req.soajs.inputmaskData.owner,
                    'src.repo': req.soajs.inputmaskData.repo
                },
                fields: { name: 1, _id: 0 }
            };

            BL.model.findEntry(req.soajs, opts, function (error, record) {
                checkMongoError(req, error || !record, cb, function () {
                    //check hosts collection first, if no running services exist, allow deactivate
                    opts.collection = hostsColl;
                    opts.conditions = { name: record.name };
                    delete opts.fields;

                    BL.model.countEntries(req.soajs, opts, function (error, count) {
                        checkMongoError(req, error, cb, function () {
                            if (count > 0) {
                                return cb({'code': 766, 'message': 'Repository has running hosts'});
                            }

                            opts.collection = coll;
                            opts.conditions = { 'src.owner': req.soajs.inputmaskData.owner, 'src.repo': req.soajs.inputmaskData.repo };
                            BL.model.removeEntry(req.soajs, opts, function (error) {
                                checkMongoError(req, error, cb, function () {
                                    var repoLabel = req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo;
                                    data.removeRepoFromAccount(req.soajs, BL.model, {accountId: req.soajs.inputmaskData.id, repoLabel: repoLabel}, function (error, result) {
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
            var opts = {
                collection: staticContentColl,
                conditions: { 'src.owner': req.soajs.inputmaskData.owner, 'src.repo': req.soajs.inputmaskData.repo }
            };
            BL.model.removeEntry(req.soajs, opts, function (error) {
                checkMongoError(req, error, cb, function () {
                    var repoLabel = req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo;
                    data.removeRepoFromAccount(req.soajs, BL.model, {accountId: req.soajs.inputmaskData.id, repoLabel: repoLabel}, function (error, result) {
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
                var opts = {
                    collection: hostsColl,
                    conditions: { name: {'$in': names } }
                };
                BL.model.countEntries(req.soajs, opts, function (error, count) {
                    checkMongoError(req, error, cb, function () {
                        if (count > 0) {
                            return cb({'code': 766, 'message': 'Repository has running hosts'});
                        }

                        async.parallel([removeService, removeDaemon, removeStaticContent], function (error, results) {
                            var repoLabel = req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo;
                            data.removeRepoFromAccount(req.soajs, BL.model, {accountId: req.soajs.inputmaskData.id, repoLabel: repoLabel}, function (error, result) {
                                checkMongoError(req, error || !result, cb, function () {
                                    return cb(null, results);
                                });
                            });
                        });
                    });
                });
            });

            function removeService(callback) {
                var opts = {
                    collection: servicesColl,
                    conditions: { 'src.owner': req.soajs.inputmaskData.owner, 'src.repo': req.soajs.inputmaskData.repo }
                };
                BL.model.removeEntry(req.soajs, opts, callback);
            }

            function removeDaemon(callback) {
                var opts = {
                    collection: daemonsColl,
                    conditions: { 'src.owner': req.soajs.inputmaskData.owner, 'src.repo': req.soajs.inputmaskData.repo }
                };
                BL.model.removeEntry(req.soajs, opts, callback);
            }

            function removeStaticContent(callback) {
                var opts = {
                    collection: staticContentColl,
                    conditions: { 'src.owner': req.soajs.inputmaskData.owner, 'src.repo': req.soajs.inputmaskData.repo }
                };
                BL.model.removeEntry(req.soajs, opts, callback);
            }

            function getRepoServices(callback) {
                var opts = {
                    collection: servicesColl,
                    conditions: { 'src.owner': req.soajs.inputmaskData.owner, 'src.repo': req.soajs.inputmaskData.repo },
                    fields: { name: 1, _id: 0 }
                };
                BL.model.findEntries(req.soajs, opts, function (error, records) {
                    if (error) {
                        return callback(error);
                    }

                    for (var i = 0; i < records.length; i++) {
                        records[i] = records[i].name;
                    }
                    return callback(null, records);
                });
            }

            function getRepoDaemons(callback) {
                var opts = {
                    collection: daemonsColl,
                    conditions: { 'src.owner': req.soajs.inputmaskData.owner, 'src.repo': req.soajs.inputmaskData.repo },
                    fields: { name: 1, _id: 0 }
                };
                BL.model.findEntries(req.soajs, opts, function (error, records) {
                    if (error) {
                        return callback(error);
                    }

                    for (var i = 0; i < records.length; i++) {
                        records[i] = records[i].name;
                    }
                    return callback(null, records);
                });
            }
        }
    },

    'syncRepo': function (config, req, res) {
        validateId(req.soajs, function (error) {
            checkIfError(req, res, {config: config, error: error, code: 701}, function () {
                data.getAccount(req.soajs, BL.model, {accountId: req.soajs.inputmaskData.id}, function (error, accountRecord) {
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
                                            data.updateRepoInfo(req.soajs, BL.model, {accountId: req.soajs.inputmaskData.id, repoLabel: repoLabel, property: 'status', value: 'outOfSync'}, function (error, result) {
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
                                                        data.updateRepoInfo(req.soajs, BL.model, {accountId: req.soajs.inputmaskData.id, repoLabel: repoLabel, property: 'configSHA', value: newSHA.sha}, function (error, result) {
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
                accountId: req.soajs.inputmaskData.id,
                provider: req.soajs.inputmaskData.provider,
				project: req.soajs.inputmaskData.project,
                user: req.soajs.inputmaskData.owner,
                repo: req.soajs.inputmaskData.repo,
                path: configPath,
                ref: req.soajs.data.configBranch,
                token: token
            };

            req.soajs.log.debug("Getting config file: " + configPath);
            git.getJSONContent(req.soajs, data, BL.model, gitConfigObj, function (error, repoConfig, configSHA) {
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
            validateFileContents(req, res, repoConfig, function (error) {
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

            var opts = {
                collection: '',
                conditions: {}
            };

            opts.conditions['name'] = info.name;
            opts.conditions['src.repo'] = req.soajs.inputmaskData.repo;
            opts.conditions['src.owner'] = req.soajs.inputmaskData.owner;
            if (type === 'service') {
                opts.collection = servicesColl;
                opts.conditions['port'] = info.port;
            }
            else if (type === 'daemon') {
                opts.collection = daemonsColl;
                opts.conditions['port'] = info.port;
            }
            else if (type === 'static') {
                opts.collection = staticContentColl;
            }

            BL.model.countEntries(req.soajs, opts, function (error, count) {
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
            var opts = {
                collection: '',
                conditions: {}
            };

            opts.conditions['name'] = info.name;
            opts.conditions['src.repo'] = req.soajs.inputmaskData.repo;
            opts.conditions['src.owner'] = req.soajs.inputmaskData.owner;

            if (type === 'service') {
                opts.collection = servicesColl;
                opts.conditions['port'] = info.port;
            } else if (type === 'daemon') {
                opts.collection = daemonsColl;
                opts.conditions['port'] = info.port;
            } else if (type === 'static') {
                opts.collection = staticContentColl;
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
            opts.fields = s;
            opts.options = { 'upsert': true };
            BL.model.updateEntry(req.soajs, opts, function (error) {
                checkMongoError(req, error, cb, function () {
                    return cb(null, configData);
                });
            });
        }

        function syncMultiRepo(paths, token, cb) {
            var repoLabel = req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo;
            data.getRepo(req.soajs, BL.model, {accountId: req.soajs.inputmaskData.id, repoLabel: repoLabel}, function (error, record) {
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
                                        data.updateRepoInfo(req.soajs, BL.model, {accountId: req.soajs.inputmaskData.id, repoLabel: repoLabel, property: 'configSHA', value: configSHA}, function (error, result) {
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
            var opts = {
                collection: hostsColl,
                conditions: { name: path.contentName }
            };
            BL.model.countEntries(req.soajs, opts, function (error, count) {
                checkMongoError(req, error, callback, function () {
                    if (count > 0) {
                        return callback('hostsExist');
                    }

                    var opts = {
                        collection: '',
                        conditions: {
                            'name': path.contentName,
                            'src.owner': req.soajs.inputmaskData.owner,
                            'src.repo': req.soajs.inputmaskData.repo
                        }
                    };

                    if (path.contentType === 'service') {
                        opts.collection = servicesColl;
                    }
                    else if (path.contentType === 'daemon') {
                        opts.collection = daemonsColl;
                    }
                    else if (path.contentType === 'static') {
                        opts.collection = staticContentColl;
                    }

                    BL.model.removeEntry(req.soajs, opts, function (error) {
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
    },

	/**
	 * this function will get the content and the url of any file located on a specific
	 * github/bitbucket account for a certain repo.
	 * @param owner, repo, filepath, env, service
	 * @param req
	 * @param res
	 */
	'getFile': function (config, req, res) {
		data.getAccount(req.soajs, BL.model, {
			owner: req.soajs.inputmaskData.owner,
			repo: req.soajs.inputmaskData.repo
		}, function (error, account) {
			checkIfError(req, res, {config: config, error: error || !account, code: 757}, function () {
				if(process.env.SOAJS_DEPLOY_HA){
					BL.model.findEntry(req.soajs, {
						"collection": "environment",
						"conditions": {
							"code": req.soajs.inputmaskData.env.toUpperCase()
						}
					}, function(error, oneEnvironment) {
						checkIfError(req, res, {config: config, error: error || !account, code: 600}, function () {

							var options = buildDeployerOptions(oneEnvironment, req.soajs);
							checkIfError(req, res, {config: config, error: !options, code: 825}, function () {

								options.params = {
									env: oneEnvironment.code.toLowerCase(),
									serviceName: req.soajs.inputmaskData.serviceName
								};

								if(req.soajs.inputmaskData.version){
									options.params.version = req.soajs.inputmaskData.version;
								}

								deployer.findService(options, function (error, oneService) {
									checkIfError(req, res, {config: config, error: error}, function () {
										checkIfError(req, res, {config: config, error: !oneService, code: 604}, function () {
											var branch = "master";
											var envs = oneService.env;
											envs.forEach(function(oneEnv){
												if(oneEnv.indexOf("SOAJS_GIT_BRANCH") !== -1){
													branch = oneEnv.split("=")[1];
												}
											});
											doGetFile(account, branch);
										});
									});
								});
							});
						});
					});
				}
				else{
					doGetFile(account, "master");
				}
			});
		});

		function doGetFile(account,branch){
			var options = {
				provider: account.provider,
				domain: account.domain,
				user: req.soajs.inputmaskData.owner,
				repo: req.soajs.inputmaskData.repo,
				project: req.soajs.inputmaskData.owner,
				path: req.soajs.inputmaskData.filepath,
				ref: branch,
				token: account.token,
				accountRecord: account
			};
			req.soajs.log.debug("Fetching file from:", options);
			git.getAnyContent(req.soajs, data, BL.model, options, function (error, fileData) {
				checkIfError(req, res, {config: config, error: error, code: 789}, function () {
					return res.jsonp(req.soajs.buildResponse(null, fileData));
				});
			});
		}
	}
};

module.exports = {
    "init": function (modelName, cb) {
        var modelPath;

        if (!modelName) {
            return cb(new Error("No Model Requested!"));
        }

        modelPath = __dirname + "/../models/" + modelName + ".js";

        return requireModel(modelPath, cb);

        /**
         * checks if model file exists, requires it and returns it.
         * @param filePath
         * @param cb
         */
        function requireModel(filePath, cb) {
            //check if file exist. if not return error
            fs.exists(filePath, function (exists) {
                if (!exists) {
                    return cb(new Error("Requested Model Not Found!"));
                }

                BL.model = require(filePath);
                return cb(null, BL);
            });
        }
    }
};
