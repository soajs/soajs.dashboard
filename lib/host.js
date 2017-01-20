'use strict';
var fs = require("fs");
var async = require("async");
var request = require("request");

var deployer = require("soajs.core.drivers");
var data = require("../models/host.js");

function checkIfError(soajs, res, data, cb) {
    if (data.error) {
        if (data.error.source === 'driver') {
            soajs.log.error(data.error.value);
            return res.jsonp(soajs.buildResponse({"code": data.error.code, "msg": data.error.msg}));
        }

        if (typeof (data.error) === 'object' && (data.error.message || data.error.msg)) {
            soajs.log.error(data.error);
        }

        return res.jsonp(soajs.buildResponse({"code": data.code, "msg": data.config.errors[data.code]}));
    } else {
        if (cb) return cb();
    }
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

function getDeployerConfig(envRecord) {
    var deployerConfig = envRecord.deployer;
    if (!deployerConfig.type || !deployerConfig.selected) {
        return null;
    }
    var driver = deployerConfig.selected.split(".");

    for (var i = 0; i < driver.length; i++) {
        deployerConfig = deployerConfig[driver[i]];
    }

    if (Object.keys(deployerConfig).length === 0) {
        return null;
    }

    deployerConfig.driver = {
        'type': envRecord.deployer.type,
        'driver': driver[1]
    };
    deployerConfig.selectedDriver = envRecord.deployer.selected.replace(driver[0] + '.', '');

    return deployerConfig;
}

function reloadControllerRegistry(soajs, envRecord, cb) { //TODO: remove, replace with a driver call
    data.getHosts(soajs, BL.model, envRecord.code, 'controller', function (error, ctrlRecords) {
        if (error || !ctrlRecords) {
            soajs.log.error('Unable to get controller records for ' + envRecord.code + ' environment');
            soajs.log.warn('Reload registry for controllers failed');
            return cb();
        }

        var ctrlMaintenancePort = envRecord.services.config.ports.controller + envRecord.services.config.ports.maintenanceInc;
        async.each(ctrlRecords, function (oneCtrl, callback) {
            var maintenanceURL = 'http://' + oneCtrl.ip + ':' + ctrlMaintenancePort + '/reloadRegistry';
            request.get(maintenanceURL, function (error, response, body) {
                try {
                    body = JSON.parse(body);
                    if (error || !body.result) {
                        soajs.log.error('Failed to reload registry for controller with IP: ' + oneCtrl.ip);
                        soajs.log.error(error || body);
                    }
                    else {
                        soajs.log.debug('Reloaded registry for controller with IP: ' + oneCtrl.ip);
                    }

                    return callback();
                }
                catch (e) {
                    soajs.log.error('Failed to reload registry for controller with IP: ' + oneCtrl.ip);
                    soajs.log.error(e);

                    return callback();
                }
            });
        }, cb);
    });
}

function deployContainerServiceOrDaemon(config, soajs, res, model, type) {
    var context = {
        name: '',
        origin: '',
        modelMethod: (type === 'service') ? "getService" : "getDaemon"
    };

    function getEnvInfo(cb) {
        model.getEnvironment(soajs, BL.model, soajs.inputmaskData.envCode, function (error, envRecord) {
            checkIfError(soajs, res, {config: config, error: error || !envRecord, code: 600}, function () {
                checkIfError(soajs, res, {config: config, error: envRecord.deployer.type === 'manual', code: 618}, function () {
                    context.envRecord = envRecord;
                    return cb();
                });
            });
        });
    }

    function getDashboardConnection(cb) {
        getDashDbInfo(model, soajs, function (error, data) {
            checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
                context.mongoDbs = data.mongoDbs;
                context.mongoCred = data.mongoCred;
                context.clusterInfo = data.clusterInfo;
                context.dbConfig = data.dbConfig;

                context.origin = context.name = soajs.inputmaskData.name;
                if (soajs.inputmaskData.gcName && type === 'service') {
                    context.name = soajs.inputmaskData.gcName;
                    context.origin = "gcs";
                }
                return cb();
            });
        });
    }

    function getGitInfo(cb) {
        var repoLabel = soajs.inputmaskData.owner + '/' + soajs.inputmaskData.repo;
        model.getGitAccounts(soajs, BL.model, repoLabel, function (error, accountRecord) {
            checkIfError(soajs, res, {config: config, error: error || !accountRecord, code: 600}, function () {
                context.accountRecord = accountRecord;

                context.accountRecord.providerName = context.accountRecord.provider;

                if (context.accountRecord.providerName.indexOf('_') !== -1) {
                    context.accountRecord.providerName = context.accountRecord.providerName.split('_')[0];
                }

                return cb();
            });
        });
    }

    function getServiceDaemonInfo(cb) {
        model[context.modelMethod](soajs, BL.model, {name: context.name}, function (error, dbRecord) {
            checkIfError(soajs, res, {config: config, error: error || !dbRecord, code: 600}, function () {
                context.dbRecord = dbRecord;
                return cb();
            });
        });
    }

    function constructDeployerParams(cb) {
        var dockerParams = {
            "env": soajs.inputmaskData.envCode.toLowerCase(),
            "name": context.name,
            "variables": [
                "NODE_ENV=production",

                "SOAJS_ENV=" + soajs.inputmaskData.envCode.toLowerCase(),
                "SOAJS_PROFILE=" + context.envRecord.profile,

                "SOAJS_MONGO_NB=" + context.mongoDbs.length,

                "SOAJS_GIT_OWNER=" + soajs.inputmaskData.owner,
                "SOAJS_GIT_REPO=" + soajs.inputmaskData.repo,
                "SOAJS_GIT_BRANCH=" + soajs.inputmaskData.branch,
                "SOAJS_GIT_COMMIT=" + soajs.inputmaskData.commit
            ],
            "Cmd": [
                'bash',
                '-c',
                './soajsDeployer.sh -T service -X deploy -g ' + context.accountRecord.providerName + ' -G ' + context.accountRecord.domain
            ]
        };

        // if (!soajs.inputmaskData.haService) {
        //     dockerParams.variables.push("SOAJS_SRV_AUTOREGISTERHOST=false");
        // }

        if (soajs.inputmaskData.useLocalSOAJS) {
            dockerParams.Cmd[2] = dockerParams.Cmd[2] + ' -L'
        }

        if (type === 'daemon') {
            dockerParams.variables.push("SOAJS_DAEMON_GRP_CONF=" + soajs.inputmaskData.grpConfName);
        }

        if (context.dbRecord.src && context.dbRecord.src.cmd) {
            if (Array.isArray(context.dbRecord.src.cmd) && context.dbRecord.src.cmd.length > 0) {
                var commands = context.dbRecord.src.cmd.join("; ");
                dockerParams.Cmd[2] = commands + "; " + dockerParams.Cmd[2];
            }
        }

        if (context.dbRecord.src && context.dbRecord.src.main) {
            dockerParams.Cmd[2] = dockerParams.Cmd[2] + ' -M ' + context.dbRecord.src.main;
        }

        //adding info about database servers
        for (var i = 0; i < context.mongoDbs.length; i++) {
            dockerParams.variables.push("SOAJS_MONGO_IP_" + (i + 1) + "=" + context.mongoDbs[i].host);
            dockerParams.variables.push("SOAJS_MONGO_PORT_" + (i + 1) + "=" + context.mongoDbs[i].port);
        }

        //if database prefix exists, add it to env variables
        if (context.dbConfig && context.dbConfig.prefix) {
            dockerParams.variables.push("SOAJS_MONGO_PREFIX=" + context.dbConfig.prefix);
        }

        //if mongo credentials exist, add them to env variables
        if (context.mongoCred && context.mongoCred.username && context.mongoCred.password) {
            dockerParams.variables.push("SOAJS_MONGO_USERNAME=" + context.mongoCred.username);
            dockerParams.variables.push("SOAJS_MONGO_PASSWORD=" + context.mongoCred.password);
        }

        //if replica set is used, add name to env variables
        if (context.clusterInfo.extraParam && context.clusterInfo.extraParam.replSet && context.clusterInfo.extraParam.replSet.rs_name) {
            dockerParams.variables.push("SOAJS_MONGO_RSNAME=" + context.clusterInfo.extraParam.replSet.rs_name);
        }

        //if ssl is set, add it to env variables
        if (context.clusterInfo.URLParam && context.clusterInfo.URLParam.ssl) {
            dockerParams.variables.push("SOAJS_MONGO_SSL=true");
        }

        //if private repo, add token to env variables
        if (context.accountRecord.token) {
            if (context.accountRecord.provider === 'bitbucket_enterprise') {
                context.accountRecord.token = new Buffer(context.accountRecord.token, 'base64').toString();
            }
            dockerParams.variables.push("SOAJS_GIT_TOKEN=" + context.accountRecord.token);
        }

        //if gc, add gc info to env variables
        if (soajs.inputmaskData.gcName) {
            dockerParams.variables.push("SOAJS_GC_NAME=" + soajs.inputmaskData.gcName);
            dockerParams.variables.push("SOAJS_GC_VERSION=" + soajs.inputmaskData.gcVersion);
        }

        //Add additional variables if any
        if (soajs.inputmaskData.variables && soajs.inputmaskData.variables.length > 0) {
            dockerParams.variables = dockerParams.variables.concat(soajs.inputmaskData.variables);
        }

        context.dockerParams = dockerParams;
        return cb();
    }

    function initDeployer(cb) {
        var deployerConfig = getDeployerConfig(context.envRecord);
        checkIfError(soajs, res, {config: config, error: !deployerConfig, code: 743}, function () {
            context.deployerConfig = deployerConfig;
            return cb();
        });
    }

    function createHAService(cb) {
        context.deployerConfig.envCode = context.envRecord.code;
        soajs.log.debug("Creating HA service with deployer: " + JSON.stringify(context.deployerConfig));
        deployer.deployHAService(soajs, context.deployerConfig, {context: context, config: config}, BL.model, function (error, data) {
            checkIfError(soajs, res, {config: config, error: error, code: (error && error.code === 741) ? error.code : 615}, function () {
                context.data = data;
                return cb();
            });
        });
    }

    function checkPort(cb){
        if(soajs.inputmaskData.isKubernetes && soajs.inputmaskData.exposedPort){
            var nginxInputPort = soajs.inputmaskData.exposedPort;

            if(nginxInputPort < config.kubeNginx.minPort || nginxInputPort > config.kubeNginx.maxPort){
                var errMsg = config.errors[824];
                errMsg = errMsg.replace("%PORTNUMBER%", nginxInputPort);
                errMsg = errMsg.replace("%MINNGINXPORT%", config.kubeNginx.minPort);
                errMsg = errMsg.replace("%MAXNGINXPORT%", config.kubeNginx.maxPort);
                return res.jsonp(soajs.buildResponse({"code": 824, "msg": errMsg}));
            }
            else{
                return cb();
            }
        }
        else{
            return cb();
        }
    }

    getEnvInfo(function () {
        checkPort(function(){
            getDashboardConnection(function () {
                getGitInfo(function () {
                    getServiceDaemonInfo(function () {
                        constructDeployerParams(function () {
                            initDeployer(function () {
                                context.origin = ((soajs.customData && soajs.customData.type) ? soajs.customData.type : 'service');
                                createHAService(function () {
                                    return res.jsonp(soajs.buildResponse(null, true));
                                });
                            });
                        });
                    });
                });
            });
        });
    });
}

function getDashDbInfo(model, soajs, cb) {
    model.getDashboardEnvironment(soajs, BL.model, function (error, envRecord) {
        if (error) {
            return cb(error);
        }

        var clusterName = envRecord.dbs.config.session.cluster;
        var data = {
            mongoDbs: envRecord.dbs.clusters[clusterName].servers,
            mongoCred: envRecord.dbs.clusters[clusterName].credentials,
            clusterInfo: envRecord.dbs.clusters[clusterName],
            dbConfig: envRecord.dbs.config
        };
        return cb(null, data);
    });
}

var BL = {
    model: null,

    "nginx": function (config, soajs, res) {
        /*
         1- get environment information
         2- get ui information
         3- initialize deployer
            3.1- construct deployer params
            3.2- deploy nginx container
         */
        var context = {};

        function getEnvInfo(cb) {
            //from envCode, load env, get port and domain
            data.getEnvironment(soajs, BL.model, soajs.inputmaskData.envCode, function (err, envRecord) {
                checkIfError(soajs, res, {config: config, error: err || !envRecord, code: 600}, function () {
                    checkIfError(soajs, res, {
                        config: config,
                        error: !envRecord.deployer.type || !envRecord.deployer.selected,
                        code: 743
                    }, function () {
                        context.envRecord = envRecord;
                        return cb();
                    });
                });
            });
        }

        function getCustomUIConfig(cb) {
            if (!soajs.inputmaskData.nginxConfig && !soajs.inputmaskData.nginxConfig.customUIId) return cb();

            var id = soajs.inputmaskData.nginxConfig.customUIId;
            BL.model.validateCustomId(soajs, id, function (error, id) {
                if (error) return cb(error);

                data.getStaticContent(soajs, BL.model, id, function (error, srcRecord) {
                    if (error) return cb(error);

                    if (!srcRecord) return cb();

                    var repoLabel = srcRecord.src.owner + '/' + srcRecord.src.repo;
                    data.getGitAccounts(soajs, BL.model, repoLabel, function (error, tokenRecord) {
                        if (error || !tokenRecord) return cb(error || !tokenRecord);

                        if (tokenRecord.token) {
                            if (tokenRecord.provider === 'bitbucket_enterprise') {
                                tokenRecord.token = new Buffer(tokenRecord.token, 'base64').toString();
                            }
                            srcRecord.token = tokenRecord.token;
                        }

                        return cb(null, srcRecord);
                    });
                });
            });
        }

        function initializeDeployer(cb) {
            context.deployerConfig = getDeployerConfig(context.envRecord);
            checkIfError(soajs, res, {config: config, error: !context.deployerConfig, code: 743}, cb);
        }

        function constructDeployerParams(customData) {
            var dockerParams = {
                "env": context.envRecord.code.toLowerCase(),
                "name": "nginxapi",
                "variables": [
                    "SOAJS_NX_CONTROLLER_NB=1",

                    "SOAJS_NX_SITE_DOMAIN=" + context.envRecord.sitePrefix + "." + context.envRecord.domain,
                    "SOAJS_NX_API_DOMAIN=" + context.envRecord.apiPrefix + "." + context.envRecord.domain
                ],
                "Cmd": [ 'bash', '-c', './soajsDeployer.sh -T nginx -X deploy' ],
                "exposedPort": soajs.inputmaskData.exposedPort
            };

            if (soajs.inputmaskData.supportSSL) {
                dockerParams.Cmd[2] = dockerParams.Cmd[2] + ' -s';
            }

            //TODO: call drivers function getServiceHost() to get the domain name of the controller service
            var controllerServiceName = ''; //TODO
            if (context.envRecord.deployer.selected.split('.')[1] === 'kubernetes') {
                controllerServiceName += '-service';
            }
            dockerParams.variables.push("SOAJS_NX_CONTROLLER_IP_1=" + controllerServiceName);

            if (customData) {
                dockerParams.variables.push("SOAJS_GIT_REPO=" + customData.src.repo);
                dockerParams.variables.push("SOAJS_GIT_OWNER=" + customData.src.owner);
                dockerParams.variables.push("SOAJS_GIT_BRANCH=" + soajs.inputmaskData.nginxConfig.branch);
                dockerParams.variables.push("SOAJS_GIT_COMMIT=" + soajs.inputmaskData.nginxConfig.commit);
                if (customData.token) {
                    dockerParams.variables.push("SOAJS_GIT_TOKEN=" + customData.token);
                }
            }

            return dockerParams;
        }

        function createHAService(cb) {
            context.deployerConfig.envCode = context.envRecord.code;
            soajs.log.debug("Creating HA service with deployer: " + JSON.stringify(context.deployerConfig));
            deployer.deployHAService(soajs, context.deployerConfig, {context: context, config: config}, BL.model, function (error, data) {
                checkIfError(soajs, res, {
                    config: config,
                    error: error,
                    code: (error && error.code === 741) ? error.code : 615
                }, function () {
                    context.data = data;
                    return cb();
                });
            });
        }

        function checkPort(cb){
            var nginxInputPort = soajs.inputmaskData.exposedPort;
            var deployType = context.envRecord.deployer.selected.split('.')[1];

            if(deployType === "kubernetes" && (nginxInputPort < config.kubeNginx.minPort || nginxInputPort > config.kubeNginx.maxPort)){
                var errMsg = config.errors[824];
                errMsg = errMsg.replace("%PORTNUMBER%", nginxInputPort);
                errMsg = errMsg.replace("%MINNGINXPORT%", config.kubeNginx.minPort);
                errMsg = errMsg.replace("%MAXNGINXPORT%", config.kubeNginx.maxPort);
                return res.jsonp(soajs.buildResponse({"code": 824, "msg": errMsg}));
            }
            else{
                if(deployType === "kubernetes")
                    soajs.inputmaskData.exposedPort += 30000;
                return cb();
            }
        }

        getEnvInfo(function () {
            checkPort(function(){
                getCustomUIConfig(function (error, customData) {
                    initializeDeployer(function () {
                        context.dockerParams = constructDeployerParams(customData);
                        context.origin = 'nginx';
                        createHAService(function () {
                            return res.jsonp(soajs.buildResponse(null, true));
                        });
                    });
                });
            });
        });
    },

    "deployService": function (config, soajs, res) {
        deployContainerServiceOrDaemon(config, soajs, res, data, 'service');
    },

    "deployDaemon": function (config, soajs, res) {
        deployContainerServiceOrDaemon(config, soajs, res, data, 'daemon');
    },

    "list": function (config, soajs, res) {
        data.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (err, envRecord) {
            checkIfError(soajs, res, {config: config, error: err || !envRecord, code: 600}, function () {

                data.getHosts(soajs, BL.model, envRecord.code, null, function (err, hosts) {
                    checkIfError(soajs, res, {config: config, error: err, code: 600}, function () {

                        return res.jsonp(soajs.buildResponse(null, {
                            'hosts': hosts,
                            'deployer': envRecord.deployer,
                            'profile': envRecord.profile
                        }));
                    });
                });
            });
        });
    },

    "listNginx": function (config, soajs, res) { //only applicable in container deployment
        data.getEnvironment(soajs, BL.model, soajs.inputmaskData.env.toUpperCase(), function (error, envRecord) {
            checkIfError(soajs, res, {config: config, error: error || !envRecord, code: 402}, function () {
                var options = buildDeployerOptions(envRecord, soajs);
                checkIfError(soajs, res, {config: config, error: !options, code: 825}, function () {
                    deployer.listServices(options, function (error, services) {
                        checkIfError(soajs, res, {config: config, error: error}, function () {
                            async.filter(services, function (oneService, callback) {
                                return callback(null, (oneService.service.name === 'nginx' && oneService.service.env.toLowerCase() === soajs.inputmaskData.env.toLowerCase()));
                            }, function (error, nginxServices) {
                                return res.jsonp(soajs.buildResponse(null, nginxServices));
                            });
                        });
                    });
                });
            });
        });
    },

    "maintenanceOperation": function (config, soajs, res) {
        soajs.inputmaskData.env = soajs.inputmaskData.env.toLowerCase();
        checkIfError(soajs, res, {
            config: config,
            error: soajs.inputmaskData.operation === 'awarenessStat' && soajs.inputmaskData.serviceName !== 'controller',
            code: 602
        }, function () {
            checkIfError(soajs, res, {
                config: config,
                error: soajs.inputmaskData.operation === 'loadProvision' && soajs.inputmaskData.serviceName === 'controller',
                code: 602
            }, function () {
                //check that the given service has the given port in services collection
                if (soajs.inputmaskData.serviceName === 'controller') {
                    checkServiceHost();
                }
                else {
                    data.getService(soajs, BL.model, {
                        'name': soajs.inputmaskData.serviceName,
                        'port': soajs.inputmaskData.servicePort
                    }, function (error, record) {
                        checkIfError(soajs, res, {config: config, error: error, code: 603}, function () {
                            if (!record) {
                                data.getDaemon(soajs, BL.model, {
                                    'name': soajs.inputmaskData.serviceName,
                                    'port': soajs.inputmaskData.servicePort
                                }, function (error, record) {
                                    checkIfError(soajs, res, {config: config, error: error, code: 603}, function () {
                                        checkIfError(soajs, res, {config: config, error: !record, code: 604}, function () {
                                            checkServiceHost();
                                        });
                                    });
                                });
                            }
                            else {
                                //check that the given service has the given host in hosts collection
                                checkServiceHost();
                            }
                        });
                    });
                }
            });
        });

        function checkServiceHost() {
            data.getOneHost(soajs, BL.model, soajs.inputmaskData.env, soajs.inputmaskData.serviceName, soajs.inputmaskData.serviceHost, soajs.inputmaskData.hostname, function (error, record) {
                checkIfError(soajs, res, {config: config, error: error, code: 603}, function () {
                    checkIfError(soajs, res, {config: config, error: !record, code: 605}, function () {
                        //perform maintenance operation
                        doMaintenance(record);
                    });
                });
            });
        }

        function doMaintenance(oneHost) {
            data.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (err, envRecord) {
                checkIfError(soajs, res, {config: config, error: err || !envRecord, code: 600}, function () {
                    if (!envRecord.deployer) {
                        soajs.log.error('Missing deployer obj');
                    }

                    soajs.inputmaskData.servicePort = soajs.inputmaskData.servicePort + 1000;
                    var maintenanceURL = "http://" + oneHost.ip + ":" + soajs.inputmaskData.servicePort;
                    maintenanceURL += "/" + soajs.inputmaskData.operation;
                    request.get(maintenanceURL, function (error, response, body) {
                        checkIfError(soajs, res, {config: config, error: error, code: 603}, function () {
                            return res.jsonp(soajs.buildResponse(null, JSON.parse(body)));
                        });
                    });
                });
            });
        }
    },

    "listNodes": function (config, soajs, res) {
        data.getEnvironment(soajs, BL.model, process.env.SOAJS_ENV || 'dashboard', function (error, envRecord) {
            checkIfError(soajs, res, {config: config, error: error || !envRecord, code: 402}, function () {
                var options = buildDeployerOptions(envRecord, soajs);
                checkIfError(soajs, res, {config: config, error: !options, code: 825}, function () {
                    deployer.listNodes(options, function (error, nodes) {
                        checkIfError(soajs, res, {config: config, error: error}, function () {
                            return res.jsonp(soajs.buildResponse(null, nodes));
                        });
                    });
                });
            });
        });
    },

    "addNode": function (config, soajs, res) {
        function getEnv (cb) {
            data.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (error, envRecord) {
                checkIfError(soajs, res, {config: config, error: error || !envRecord, code: 402}, function () {
                    return cb(envRecord);
                });
            });
        }

        function addNodeToSwarm (envRecord, cb) {
            var options = buildDeployerOptions(envRecord, soajs);
            checkIfError(soajs, res, {config: config, error: !options, code: 825}, function () {
                options.params = {
                    host: soajs.inputmaskData.host,
                    port: soajs.inputmaskData.port,
                    role: soajs.inputmaskData.role
                };

                deployer.addNode(options, function (error) {
                    checkIfError(soajs, res, {config: config, error: error}, function () {
                        return cb();
                    });
                });
            });
        }

        checkIfError(soajs, res, {config: config, error: soajs.inputmaskData.env.toLowerCase() !== 'dashboard', code: 818}, function () {
            getEnv(function (envRecord) {
                addNodeToSwarm(envRecord, function () {

                    //TODO: investigate, might no longer be needed if kubernetes driver can work without it
                    //if manager node, add to list of nodes for deployer object of all environments config
                    // if (nodeInfo.role === 'manager') {
                    //     data.updateDockerDeployerNodes(soajs, BL.model, 'add', nodeInfo.name, function (error) {
                    //         checkIfError(soajs, res, {
                    //             config: config,
                    //             error: error,
                    //             code: 819
                    //         }, function () {
                    //             return res.jsonp(soajs.buildResponse(null, true));
                    //         });
                    //     });
                    // }
                    // else {
                    //     return res.jsonp(soajs.buildResponse(null, true));
                    // }

                    return res.jsonp(soajs.buildResponse(null, true));
                });
            });
        });
    },

    "removeNode": function (config, soajs, res) {
        function getEnvRecord (cb) {
            data.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (error, envRecord) {
                checkIfError(soajs, res, {config: config, error: error || !envRecord, code: 402}, function () {
                    return cb(envRecord);
                });
            });
        }

        function removeNodeFromSwarm (envRecord, cb) {
            var options = buildDeployerOptions(envRecord, soajs);
            options.params = {
                id: soajs.inputmaskData.nodeId,
                backgroundCB: logBackgroundProgress
            };

            deployer.removeNode(options, function (error) {
                checkIfError(soajs, res, {config: config, error: error}, cb);
            }, logBackgroundProgress);
        }

        function logBackgroundProgress (error) {
            if (error) {
                soajs.log.warn('Error occured while trying to remove node from cluster');
                soajs.log.error(error);
            }
            else {
                soajs.log.info('Node was removed from cluster successfully');
            }
        }

        checkIfError(soajs, res, {config: config, error: soajs.inputmaskData.env.toLowerCase() !== 'dashboard', code: 818}, function () {
            getEnvRecord(function (envRecord) {
                removeNodeFromSwarm(envRecord, function () {
                    return res.jsonp(soajs.buildResponse(null, true));

                    //TODO: investigate if this is still necessary
                    // if (nodeRecord.role === 'manager') {
                    //     data.updateDockerDeployerNodes(soajs, BL.model, 'remove', nodeRecord.name, function (error) {
                    //         checkIfError(soajs, res, {config: config, error: error, code: 820}, function () {
                    //             return res.jsonp(soajs.buildResponse(null, true));
                    //         });
                    //     });
                    // }
                    // else {
                    //     return res.jsonp(soajs.buildResponse(null, true));
                    // }
                });
            });
        });
    },

    "updateNode": function (config, soajs, res) {
        var criteria = { id: soajs.inputmaskData.nodeId }, update = { '$set': {} }, options = {};

        function buildUpdateOptions (nodeRecord, cb) {
            options.nodeId = nodeRecord.id;
            options.nodeName = nodeRecord.name;

            if (soajs.inputmaskData.type === 'role') {
                update.$set.role = soajs.inputmaskData.value;

                options.Availability = nodeRecord.availability;
                options.Role = soajs.inputmaskData.value;
            }
            else if (soajs.inputmaskData.type === 'availability') {
                update.$set.availability = soajs.inputmaskData.value;

                options.Availability = soajs.inputmaskData.value;
                options.Role = nodeRecord.role;
            }

            return cb();
        }

        function getEnvRecord (cb) {
            data.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (error, envRecord) {
                checkIfError(soajs, res, {config: config, error: error || !envRecord, code: 402}, function () {
                    return cb(envRecord);
                });
            });
        }

        function updateNode (envRecord, cb) {
            var deployerConfig = getDeployerConfig(envRecord);
            deployerConfig.envCode = soajs.inputmaskData.env;

            deployer.updateNode(soajs, deployerConfig, options, BL.model, function (error, result) {
                checkIfError(soajs, res, {config: config, error: error, code: ((error && error.code && !isNaN(error.code)) ? error.code : 806)}, function () {
                    return cb();
                });
            });
        }

        checkIfError(soajs, res, {config: config, error: soajs.inputmaskData.env.toLowerCase() !== 'dashboard', code: 818}, function () {
            buildUpdateOptions(nodeRecord, function () {
                getEnvRecord(function (envRecord) {
                    updateNode(envRecord, function () {
                        //TODO: might no longer be required
                        if (soajs.inputmaskData.type === 'role') {
                            var action = ((soajs.inputmaskData.value === 'manager') ? 'add' : 'remove');
                            data.updateDockerDeployerNodes(soajs, BL.model, action, nodeRecord.name, function (error) {
                                checkIfError(soajs, res, {config: config, error: error, code: 822}, function () {
                                    return res.jsonp(soajs.buildResponse(null, true));
                                });
                            });
                        }
                        else {
                            return res.jsonp(soajs.buildResponse(null, true));
                        }
                    });
                });
            });
        });
    },

    "scaleHAService": function (config, soajs, res) {
        var criteria = {
            env: soajs.inputmaskData.envCode,
            serviceName: soajs.inputmaskData.name
        };

        data.getEnvironment(soajs, BL.model, soajs.inputmaskData.envCode.toUpperCase(), function (error, envRecord) {
            checkIfError(soajs, res, {config: config, error: error, code: 402}, function () {
                var deployerConfig = getDeployerConfig(envRecord);
                deployerConfig.envCode = soajs.inputmaskData.envCode;
                var options = {
                    serviceName: soajs.inputmaskData.name,
                    scale: soajs.inputmaskData.scale
                };
                deployer.scaleHAService(soajs, deployerConfig, options, BL.model, function (error, result) {
                    checkIfError(soajs, res, {
                        config: config,
                        error: error,
                        code: ((error && error.code && !isNaN(error.code)) ? error.code : 810)
                    }, function () {
                        return res.jsonp(soajs.buildResponse(null, true));
                    });
                });
            });
        });
    },

    "deleteHAService": function (config, soajs, res) {
        data.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (error, envRecord) {
            checkIfError(soajs, res, {config: config, error: error || !envRecord, code: 402}, function () {
                var deployerConfig = getDeployerConfig(envRecord);
                deployerConfig.envCode = soajs.inputmaskData.env;

                var options = {};
                options.serviceName = soajs.inputmaskData.name;
                // options.serviceType = serviceType.type; //TODO: remove
                deployer.deleteHAService(soajs, deployerConfig, options, BL.model, function (error, result) {
                    checkIfError(soajs, res, {
                        config: config,
                        error: error,
                        code: ((error && error.code && !isNaN(error.code)) ? error.code : 813)
                    }, function () {
                        return res.jsonp(soajs.buildResponse(null, true));
                    });
                });
            });
        });
    },

    "streamLogs": function (config, soajs, res) {
        data.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (error, envRecord) {
            checkIfError(soajs, res, {config: config, error: error, code: 402}, function () {
                var deployerConfig = getDeployerConfig(envRecord);
                deployerConfig.envCode = soajs.inputmaskData.env;
                var options = {taskName: soajs.inputmaskData.taskName};
                return deployer.getContainerLogs(soajs, deployerConfig, options, BL.model, res);
            });
        });
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
