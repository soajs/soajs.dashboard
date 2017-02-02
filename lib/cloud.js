'use strict';

var fs = require("fs");
var async = require("async");
var deployer = require("soajs.core.drivers");

var colls = {
    env: 'environment',
    git: 'git_accounts',
    services: 'services',
    daemons: 'daemons',
    staticContent: 'staticContent'
};

function checkIfError(soajs, res, data, cb) {
    if (data.error) {
        if (data.error.source === 'driver') {
            soajs.log.error(data.error);
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

function getEnvironment(soajs, code, cb) {
    var opts = {
        collection: colls.env,
        conditions: { code: code.toUpperCase() }
    };

    BL.model.findEntry(soajs, opts, cb);
}

function getGitRecord(soajs, repo, cb) {
    var opts = {
        collection: colls.git,
        conditions: { 'repos.name': repo },
        fields: {
            provider: 1,
            domain: 1,
            token: 1,
            'repos.$': 1
        }
    };

    BL.model.findEntry(soajs, opts, cb);
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

function deployServiceOrDaemon(config, soajs, registry, res) {
    var context = {
        name: '',
        origin: ''
    };

    function getEnvInfo(cb) {
        getEnvironment(soajs, soajs.inputmaskData.env, function (error, envRecord) {
            checkIfError(soajs, res, {config: config, error: error || !envRecord, code: 600}, function () {
                checkIfError(soajs, res, {config: config, error: envRecord.deployer.type === 'manual', code: 618}, function () {
                    context.envRecord = envRecord;
                    return cb();
                });
            });
        });
    }

    function getDashboardConnection(cb) {
        getDashDbInfo(soajs, function (error, data) {
            checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
                context.mongoDbs = data.mongoDbs;
                context.mongoCred = data.mongoCred;
                context.clusterInfo = data.clusterInfo;
                context.dbConfig = data.dbConfig;

                context.origin = context.name = soajs.inputmaskData.name;
                if (soajs.inputmaskData.type === 'service' && soajs.inputmaskData.contentConfig && soajs.inputmaskData.contentConfig.service && soajs.inputmaskData.contentConfig.service.gc) {
                    context.name = soajs.inputmaskData.contentConfig.service.gcName;
                    context.origin = "gcs";
                }
                return cb();
            });
        });
    }

    function getGitInfo(cb) {
        getGitRecord(soajs, soajs.inputmaskData.gitSource.owner + '/' + soajs.inputmaskData.gitSource.repo, function (error, accountRecord) {
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
        var opts = {
            collection: ((soajs.inputmaskData.type === 'service') ? colls.services : colls.daemons ),
            conditions: {
                name: context.name
            }
        };
        BL.model.findEntry(soajs, opts, function (error, dbRecord) {
            checkIfError(soajs, res, {config: config, error: error || !dbRecord, code: 600}, function () {
                registry.loadByEnv({ envCode: soajs.inputmaskData.env.toLowerCase() }, function (error, registry) {
                    checkIfError(soajs, res, {config: config, error: error, code: 446}, function () {
                        context.dbRecord = dbRecord;
                        context.dbRecord.maintenancePort = context.dbRecord.port + registry.serviceConfig.ports.maintenanceInc;
                        return cb();
                    });
                });
            });
        });
    }

    function constructDeployerParams(cb) {
    	var serviceName = soajs.inputmaskData.env.toLowerCase() + "-" + context.name;
    	if(context.name !== 'controller'){
    		serviceName += (soajs.inputmaskData.version) ? "-v" + soajs.inputmaskData.version : "";
	    }
        var serviceParams = {
            "env": soajs.inputmaskData.env.toLowerCase(),
            "name": serviceName,
            "image": soajs.inputmaskData.deployConfig.imagePrefix + "/soajs",
            "variables": [
                "NODE_ENV=production",

                "SOAJS_ENV=" + soajs.inputmaskData.env.toLowerCase(),
                "SOAJS_PROFILE=" + context.envRecord.profile,
                "SOAJS_SRV_AUTOREGISTERHOST=true",

                "SOAJS_MONGO_NB=" + context.mongoDbs.length,

                "SOAJS_GIT_OWNER=" + soajs.inputmaskData.gitSource.owner,
                "SOAJS_GIT_REPO=" + soajs.inputmaskData.gitSource.repo,
                "SOAJS_GIT_BRANCH=" + soajs.inputmaskData.gitSource.branch,
                "SOAJS_GIT_COMMIT=" + soajs.inputmaskData.gitSource.commit
            ],
            "labels": { //very useful when filtering
                "soajs.content": "true",

                "soajs.env.code": soajs.inputmaskData.env.toLowerCase(),

                "soajs.service.name": context.dbRecord.name,
                "soajs.service.group": context.dbRecord.group,
                "soajs.service.type": soajs.inputmaskData.type,
                "soajs.service.version": "" + soajs.inputmaskData.version,
                "soajs.service.label": soajs.inputmaskData.env.toLowerCase() + "-" + context.name + "-v" + soajs.inputmaskData.version
            },
            "cmd": [
                'bash',
                '-c',
                './soajsDeployer.sh -T service -X deploy -g ' + context.accountRecord.providerName + ' -G ' + context.accountRecord.domain
            ],
            "memoryLimit": soajs.inputmaskData.deployConfig.memoryLimit,
            "replication": {
                "mode": soajs.inputmaskData.deployConfig.replication.mode,
                "replicas": ((soajs.inputmaskData.deployConfig.replication.mode === 'replicated') ? soajs.inputmaskData.deployConfig.replication.replicas : null)
            },
            "version": soajs.inputmaskData.version || "",
            "containerDir": config.imagesDir,
            "restartPolicy": {
                "condition": "any", //TODO: make dynamic
                "maxAttempts": 5 //TODO: make dynamic
            },
            "network": config.network,
            "ports": [
                {
                    "name": "service-port",
                    "isPublished": false,
                    "target": context.dbRecord.port
                },
                {
                    "name": "maintenance-port",
                    "isPublished": false,
                    "target": context.dbRecord.maintenancePort
                }
            ]
        };

        if (soajs.inputmaskData.deployConfig.useLocalSOAJS) {
            serviceParams.cmd[2] = serviceParams.cmd[2] + ' -L';
        }

        if (soajs.inputmaskData.type === 'daemon') { //TODO: check to verify that grpConfName is present
            serviceParams.variables.push("SOAJS_DAEMON_GRP_CONF=" + soajs.inputmaskData.contentConfig.daemon.grpConfName);
        }

        if (context.dbRecord.src && context.dbRecord.src.cmd) {
            if (Array.isArray(context.dbRecord.src.cmd) && context.dbRecord.src.cmd.length > 0) {
                var commands = context.dbRecord.src.cmd.join("; ");
                serviceParams.cmd[2] = commands + "; " + serviceParams.cmd[2];
            }
        }

        if (context.dbRecord.src && context.dbRecord.src.main) {
            serviceParams.cmd[2] = serviceParams.cmd[2] + ' -M ' + context.dbRecord.src.main;
        }

        //adding info about database servers
        for (var i = 0; i < context.mongoDbs.length; i++) {
            serviceParams.variables.push("SOAJS_MONGO_IP_" + (i + 1) + "=" + context.mongoDbs[i].host);
            serviceParams.variables.push("SOAJS_MONGO_PORT_" + (i + 1) + "=" + context.mongoDbs[i].port);
        }

        //if database prefix exists, add it to env variables
        if (context.dbConfig && context.dbConfig.prefix) {
            serviceParams.variables.push("SOAJS_MONGO_PREFIX=" + context.dbConfig.prefix);
        }

        //if mongo credentials exist, add them to env variables
        if (context.mongoCred && context.mongoCred.username && context.mongoCred.password) {
            serviceParams.variables.push("SOAJS_MONGO_USERNAME=" + context.mongoCred.username);
            serviceParams.variables.push("SOAJS_MONGO_PASSWORD=" + context.mongoCred.password);
        }

        //if replica set is used, add name to env variables
        if (context.clusterInfo.extraParam && context.clusterInfo.extraParam.replSet && context.clusterInfo.extraParam.replSet.rs_name) {
            serviceParams.variables.push("SOAJS_MONGO_RSNAME=" + context.clusterInfo.extraParam.replSet.rs_name);
        }

        //if ssl is set, add it to env variables
        if (context.clusterInfo.URLParam && context.clusterInfo.URLParam.ssl) {
            serviceParams.variables.push("SOAJS_MONGO_SSL=true");
        }

        //if private repo, add token to env variables
        if (context.accountRecord.token) {
            if (context.accountRecord.provider === 'bitbucket_enterprise') {
                context.accountRecord.token = new Buffer(context.accountRecord.token, 'base64').toString();
            }
            serviceParams.variables.push("SOAJS_GIT_TOKEN=" + context.accountRecord.token);
        }

        //if gc, add gc info to env variables
        if (soajs.inputmaskData.contentConfig && soajs.inputmaskData.contentConfig.service && soajs.inputmaskData.contentConfig.service.gc) {
            serviceParams.variables.push("SOAJS_GC_NAME=" + soajs.inputmaskData.contentConfig.service.gcName);
            serviceParams.variables.push("SOAJS_GC_VERSION=" + soajs.inputmaskData.contentConfig.service.gcVersion);
        }

        //Add additional variables if any
        if (soajs.inputmaskData.variables && soajs.inputmaskData.variables.length > 0) {
            serviceParams.variables = serviceParams.variables.concat(soajs.inputmaskData.variables);
        }

        context.serviceParams = serviceParams;
        return cb();
    }

    function createHAService(cb) {
        var options = buildDeployerOptions(context.envRecord, soajs);
        options.params = context.serviceParams;
        soajs.log.debug("Creating HA service with deployer: " + JSON.stringify(options.params));

        deployer.deployService(options, function (error) {
            checkIfError(soajs, res, {config: config, error: error}, cb);
        });
    }

    function checkPort(cb){
        if(soajs.inputmaskData.deployConfig.isKubernetes && soajs.inputmaskData.deployConfig.exposedPort){
            var nginxInputPort = soajs.inputmaskData.deployConfig.exposedPort;

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
                            createHAService(function () {
                                return res.jsonp(soajs.buildResponse(null, true));
                            });
                        });
                    });
                });
            });
        });
    });
}

function getDashDbInfo(soajs, cb) {
    getEnvironment(soajs, 'DASHBOARD', function (error, envRecord) {
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

    "deployService": function (config, soajs, registry, res) {
        if (soajs.inputmaskData.type === 'nginx') {
            BL.deployNginx(config, soajs, res);
        }
        else if (['service', 'daemon'].indexOf(soajs.inputmaskData.type) !== -1) {
            deployServiceOrDaemon(config, soajs, registry, res);
        }
    },

    "deployCustomService": function (config, soajs, res) {
        var serviceParams = {
            "env": soajs.inputmaskData.env.toLowerCase(),
            "name": soajs.inputmaskData.name,
            "image": soajs.inputmaskData.deployConfig.image,
            "variables": soajs.inputmaskData.variables || [],
            "labels": soajs.inputmaskData.labels,
            "cmd": soajs.inputmaskData.command.cmd.concat(soajs.inputmaskData.command.args),
            "memoryLimit": soajs.inputmaskData.deployConfig.memoryLimit,
            "replication": {
                "mode": soajs.inputmaskData.deployConfig.replication.mode,
                "replicas": ((soajs.inputmaskData.deployConfig.replication.mode === 'replicated') ? soajs.inputmaskData.deployConfig.replication.replicas : null)
            },
            "containerDir": soajs.inputmaskData.deployConfig.workDir,
            "restartPolicy": {
                "condition": soajs.inputmaskData.deployConfig.restartPolicy.condition,
                "maxAttempts": soajs.inputmaskData.deployConfig.restartPolicy.maxAttempts
            },
            "network": soajs.inputmaskData.deployConfig.network,
            "ports": soajs.inputmaskData.deployConfig.ports || [] //TODO: review
        };

        if (soajs.inputmaskData.deployConfig.volume && Object.keys(soajs.inputmaskData.deployConfig.volume).length > 0) {
            serviceParams.volume = { //NOTE: onyl one volume is supported for now
                "name": soajs.inputmaskData.name + '-volume',
                "type": soajs.inputmaskData.deployConfig.volume.type,
                "readOnly": soajs.inputmaskData.deployConfig.volume.readOnly || false,
                "source": soajs.inputmaskData.deployConfig.volume.source,
                "target": soajs.inputmaskData.deployConfig.volume.target
            };
        }

        getEnvironment(soajs, soajs.inputmaskData.env, function (error, envRecord) {
            checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
                checkIfError(soajs, res, {config: config, error: !envRecord, code: 446}, function () {
                    var options = buildDeployerOptions(envRecord, soajs);
                    options.params = serviceParams;
                    deployer.deployService(options, function (error) {
                        checkIfError(soajs, res, {config: config, error: error}, function () {
                            return res.jsonp(soajs.buildResponse(null, true));
                        });
                    });
                });
            });
        });
    },

    "deployNginx": function (config, soajs, res) {
        /*
         1- get environment information
         2- get ui information
         3- initialize deployer
            3.1- construct deployer params
            3.2- deploy nginx container
         */
        var context = {}, options = {};

        function getEnvInfo(cb) {
            //from envCode, load env, get port and domain
            getEnvironment(soajs, soajs.inputmaskData.env, function (error, envRecord) {
                checkIfError(soajs, res, {config: config, error: error || !envRecord, code: 600}, function () {
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
            if (!soajs.inputmaskData.contentConfig || !soajs.inputmaskData.contentConfig.nginx || !soajs.inputmaskData.contentConfig.nginx.ui) return cb();

            var id = soajs.inputmaskData.contentConfig.nginx.ui.id;
            BL.model.validateCustomId(soajs, id, function (error, id) {
                checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {

                    var opts = {
                        collection: colls.staticContent,
                        conditions: { '_id': id }
                    };
                    BL.model.findEntry(soajs, opts, function (error, srcRecord) {
                        checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
                            if (!srcRecord) return cb();

                            getGitRecord(soajs, srcRecord.src.owner + '/' + srcRecord.src.repo, function (error, tokenRecord) {
                                checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
                                    checkIfError(soajs, res, {config: config, error: !tokenRecord, code: 600}, function () {

                                        if (tokenRecord.token) {
                                            if (tokenRecord.provider === 'bitbucket_enterprise') {
                                                tokenRecord.token = new Buffer(tokenRecord.token, 'base64').toString();
                                            }
                                            srcRecord.token = tokenRecord.token;
                                        }

                                        context.ui = srcRecord;
                                        return cb();
                                    });
                                });
                            });
                        });
                    });
                });
            });
        }

        function getControllerDomain(cb) {
            options.params = {
                env: soajs.inputmaskData.env.toLowerCase(),
                serviceName: 'controller',
                version: '1'
            };

            deployer.getServiceHost(options, function (error, controllerDomainName) {
                checkIfError(soajs, res, {config: config, error: error}, function () {
                    context.controller = {
                        domain: controllerDomainName
                    };

                    return cb();
                });
            });
        }

        function constructDeployerParams() {
            var nginxParams = {
                "env": context.envRecord.code.toLowerCase(),
                "name": soajs.inputmaskData.env.toLowerCase() + "-nginx",
                "image": soajs.inputmaskData.deployConfig.imagePrefix + "/nginx",
                "variables": [
                    "SOAJS_NX_CONTROLLER_NB=1",

                    "SOAJS_NX_SITE_DOMAIN=" + context.envRecord.sitePrefix + "." + context.envRecord.domain,
                    "SOAJS_NX_API_DOMAIN=" + context.envRecord.apiPrefix + "." + context.envRecord.domain
                ],
                "labels": {
                    "soajs.content": "true",

                    "soajs.env.code": soajs.inputmaskData.env.toLowerCase(),

                    "soajs.service.name": "nginx",
                    "soajs.service.group": "nginx",
                    "soajs.service.type": "nginx",
                    "soajs.service.label": soajs.inputmaskData.env.toLowerCase() + "-nginx"
                },
                "cmd": [ 'bash', '-c', './soajsDeployer.sh -T nginx -X deploy' ],
                "memoryLimit": soajs.inputmaskData.deployConfig.memoryLimit,
                "containerDir": config.imagesDir,
                "replication": {
                    "mode": soajs.inputmaskData.deployConfig.replication.mode,
                    "replicas": ((soajs.inputmaskData.deployConfig.replication.mode === 'replicated') ? soajs.inputmaskData.deployConfig.replication.replicas : null)
                },
                "restartPolicy": {
                    "condition": "any", //TODO: make dynamic
                    "maxAttempts": 5 //TODO: make dynamic
                },
                "network": config.network,
                "ports": [
                    {
                        "isPublished": true,
                        "target": 80,
                        "published": soajs.inputmaskData.deployConfig.exposedPort
                    }
                ]
            };

            if (soajs.inputmaskData.contentConfig && soajs.inputmaskData.contentConfig.nginx && soajs.inputmaskData.contentConfig.nginx.supportSSL) {
                nginxParams.cmd[2] = nginxParams.cmd[2] + ' -s';
            }

            var controllerServiceName = context.controller.domain;
            if (context.envRecord.deployer.selected.split('.')[1] === 'kubernetes') {
                controllerServiceName += '-service';
            }
            nginxParams.variables.push("SOAJS_NX_CONTROLLER_IP_1=" + controllerServiceName);

            if (context.ui) {
                nginxParams.variables.push("SOAJS_GIT_REPO=" + context.ui.src.repo);
                nginxParams.variables.push("SOAJS_GIT_OWNER=" + context.ui.src.owner);
                nginxParams.variables.push("SOAJS_GIT_BRANCH=" + soajs.inputmaskData.contentConfig.nginx.ui.branch);
                nginxParams.variables.push("SOAJS_GIT_COMMIT=" + soajs.inputmaskData.contentConfig.nginx.ui.commit);
                if (context.ui.token) {
                    nginxParams.variables.push("SOAJS_GIT_TOKEN=" + context.ui.token);
                }
            }

            return nginxParams;
        }

        function createHAService(cb) {
            options.params = context.nginxParams;
            soajs.log.debug("Creating HA service with deployer: " + JSON.stringify(options.params));
            deployer.deployService(options, function (error) {
                checkIfError(soajs, res, {config: config, error: error}, cb);
            });
        }

        function checkPort(cb){
            //TODO: check if exposed port is set before proceeding in case of type === nginx
            var nginxInputPort = soajs.inputmaskData.deployConfig.exposedPort;
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
                    soajs.inputmaskData.deployConfig.exposedPort += 30000;
                return cb();
            }
        }

        getEnvInfo(function () {
            options = buildDeployerOptions(context.envRecord, soajs);
            checkPort(function() {
                getCustomUIConfig(function () {
                    getControllerDomain(function () {
                        context.nginxParams = constructDeployerParams();
                        createHAService(function () {
                            return res.jsonp(soajs.buildResponse(null, true));
                        });
                    });
                });
            });
        });
    },

    "listServices": function (config, soajs, res) {
        getEnvironment(soajs, soajs.inputmaskData.env, function (error, envRecord) {
            checkIfError(soajs, res, {config: config, error: error || !envRecord, code: 402}, function () {
                var options = buildDeployerOptions(envRecord, soajs);
                checkIfError(soajs, res, {config: config, error: !options, code: 825}, function () {
                    options.params = {
                        env: soajs.inputmaskData.env,
                        //TODO: add a filter, soajs services or misc. services
                    };
                    deployer.listServices(options, function (error, services) {
                        checkIfError(soajs, res, {config: config, error: error}, function () {
                            return res.jsonp(soajs.buildResponse(null, services));
                        });
                    });
                });
            });
        });
    },

    "listNginx": function (config, soajs, res) {
        getEnvironment(soajs, soajs.inputmaskData.env, function (error, envRecord) {
            checkIfError(soajs, res, {config: config, error: error || !envRecord, code: 402}, function () {
                var options = buildDeployerOptions(envRecord, soajs);
                options.params = { env: soajs.inputmaskData.env };
                checkIfError(soajs, res, {config: config, error: !options, code: 825}, function () {
                    deployer.listServices(options, function (error, services) {
                        checkIfError(soajs, res, {config: config, error: error}, function () {
                            async.filter(services, function (oneService, callback) {
                                return callback(null, (oneService.labels['soajs.service.name'] === 'nginx' && oneService.labels['soajs.env.code'] === soajs.inputmaskData.env.toLowerCase()));
                            }, function (error, nginxServices) {
                                return res.jsonp(soajs.buildResponse(null, nginxServices));
                            });
                        });
                    });
                });
            });
        });
    },

    "listNodes": function (config, soajs, res) {
        getEnvironment(soajs, process.env.SOAJS_ENV || 'dashboard', function (error, envRecord) {
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
            getEnvironment(soajs, soajs.inputmaskData.env, function (error, envRecord) {
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
                    return res.jsonp(soajs.buildResponse(null, true));
                });
            });
        });
    },

    "removeNode": function (config, soajs, res) {
        function getEnvRecord (cb) {
            getEnvironment(soajs, soajs.inputmaskData.env, function (error, envRecord) {
                checkIfError(soajs, res, {config: config, error: error || !envRecord, code: 402}, function () {
                    return cb(envRecord);
                });
            });
        }

        function removeNodeFromSwarm (envRecord, cb) {
            var options = buildDeployerOptions(envRecord, soajs);
            options.params = {
                id: soajs.inputmaskData.nodeId
            };

            deployer.removeNode(options, function (error) {
                checkIfError(soajs, res, {config: config, error: error}, cb);
            });
        }

        checkIfError(soajs, res, {config: config, error: soajs.inputmaskData.env.toLowerCase() !== 'dashboard', code: 818}, function () {
            getEnvRecord(function (envRecord) {
                removeNodeFromSwarm(envRecord, function () {
                    return res.jsonp(soajs.buildResponse(null, true));
                });
            });
        });
    },

    "updateNode": function (config, soajs, res) {
        checkIfError(soajs, res, {config: config, error: soajs.inputmaskData.env.toLowerCase() !== 'dashboard', code: 818}, function () {
            getEnvironment(soajs, soajs.inputmaskData.env, function (error, envRecord) {
                checkIfError(soajs, res, {config: config, error: error || !envRecord, code: 402}, function () {
                    var options = buildDeployerOptions(envRecord, soajs);
                    options.params = {};
                    options.params.id = soajs.inputmaskData.nodeId;
                    options.params[soajs.inputmaskData.type] = soajs.inputmaskData.value;

                    deployer.updateNode(options, function (error) {
                        checkIfError(soajs, res, {config: config, error: error}, function () {
                            return res.jsonp(soajs.buildResponse(null, true));
                        });
                    });
                });
            });
        });
    },

    "scaleService": function (config, soajs, res) {
        getEnvironment(soajs, soajs.inputmaskData.env, function (error, envRecord) {
            checkIfError(soajs, res, {config: config, error: error, code: 402}, function () {
                var options = buildDeployerOptions(envRecord, soajs);
                options.params = {
                    id: soajs.inputmaskData.serviceId,
                    scale: soajs.inputmaskData.scale
                };
                deployer.scaleService(options, function (error) {
                    checkIfError(soajs, res, {config: config, error: error}, function () {
                        return res.jsonp(soajs.buildResponse(null, true));
                    });
                });
            });
        });
    },

    "deleteService": function (config, soajs, res) {
        getEnvironment(soajs, soajs.inputmaskData.env, function (error, envRecord) {
            checkIfError(soajs, res, {config: config, error: error || !envRecord, code: 402}, function () {
                var options = buildDeployerOptions(envRecord, soajs);
                options.params = {
                    id: soajs.inputmaskData.serviceId
                };
                deployer.deleteService(options, function (error) {
                    checkIfError(soajs, res, {config: config, error: error}, function () {
                        return res.jsonp(soajs.buildResponse(null, true));
                    });
                });
            });
        });
    },

    "redeployService": function (config, soajs, res) {
        getEnvironment(soajs, soajs.inputmaskData.env, function (error, envRecord) {
            checkIfError(soajs, res, {config: config, error: error || !envRecord, code: 402}, function () {
                var options = buildDeployerOptions(envRecord, soajs);
                options.params = {
                    id: soajs.inputmaskData.serviceId
                };
                getUIConfig(function (error, config) { //error is already catered for in function
                    if (config.available) {
                        options.params.ui = config.values;
                    }
                    deployer.redeployService(options, function (error) {
                        checkIfError(soajs, res, {config: config, error: error}, function () {
                            return res.jsonp(soajs.buildResponse(null, true));
                        });
                    });
                });
            });
        });

        function getUIConfig (cb) {
            if (!soajs.inputmaskData.ui) {
                return cb(null, { available: false });
            }

            BL.model.validateCustomId(soajs, soajs.inputmaskData.ui.id, function (error, id) {
                checkIfError(soajs, res, {config: config, error: error, code: 701}, function () {
                    var opts = {
                        collection: colls.staticContent,
                        condition: { _id: id }
                    };
                    BL.model.findEntry(soajs, opts, function (error, record) {
                        checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
                            checkIfError(soajs, res, {config: config, error: !record, code: 905}, function () {
                                getGitRecord(soajs, record.src.owner + '/' + record.src.repo, function (error, gitRecord) {
                                    checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
                                        checkIfError(soajs, res, {config: config, error: !gitRecord, code: 757}, function () {
                                            var result = {
                                                available: true,
                                                values: {
                                                    owner: record.src.owner,
                                                    repo: record.src.repo,
                                                    branch: soajs.inputmaskData.ui.branch,
                                                    commit: soajs.inputmaskData.ui.commit,
                                                    provider: gitRecord.provider,
                                                    domain: gitRecord.domain
                                                }
                                            };

                                            if (gitRecord.access === 'private' && gitRecord.token) {
                                                if (gitRecord.provider === 'bitbucket_enterprise') {
                                                    gitRecord.token = new Buffer(gitRecord.token, 'base64').toString();
                                                }
                                                result.values.token = gitRecord.token;
                                            }
                                            return cb(null, result);
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        }
    },

    "streamLogs": function (config, soajs, res) {
        getEnvironment(soajs, soajs.inputmaskData.env, function (error, envRecord) {
            checkIfError(soajs, res, {config: config, error: error || !envRecord, code: 402}, function () {
                var options = buildDeployerOptions(envRecord, soajs);
                options.soajs.buildResponse = soajs.buildResponse;
                options.res = res;
                options.params = {
                    taskId: soajs.inputmaskData.taskId
                };

                deployer.getContainerLogs(options);
            });
        });
    },

    "maintenance": function (config, soajs, res) {
        getEnvironment(soajs, soajs.inputmaskData.env, function (error, envRecord) {
            checkIfError(soajs, res, {config: config, error: error || !envRecord, code: 402}, function () {
                var dbCollection = '';
                if (soajs.inputmaskData.type === 'service') dbCollection = 'services';
                else if (soajs.inputmaskData.type === 'daemon') dbCollection = 'daemons';
                var opts = {
                    collection: dbCollection,
                    conditions: {
                        name: soajs.inputmaskData.serviceName
                    }
                };
                BL.model.findEntry(soajs, opts, function (error, record) {
                    checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
                        checkIfError(soajs, res, {config: config, error: error, code: 795}, function () {
                            var options = buildDeployerOptions(envRecord, soajs);
                            options.params = {
                            	toEnv: soajs.inputmaskData.env,
                                id: soajs.inputmaskData.serviceId,
                                network: config.network,
                                maintenancePort: record.port + envRecord.services.config.ports.maintenanceInc,
                                operation: soajs.inputmaskData.operation
                            };
                            deployer.maintenance(options, function (error, result) {
                                checkIfError(soajs, res, {config: config, error: error}, function () {
                                    return res.jsonp(soajs.buildResponse(null, result));
                                });
                            });
                        });
                    });
                });
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
