'use strict';

var fs = require("fs");
var async = require("async");
var deployer = require("soajs.core.drivers");
var utils = require("../../utils/utils.js");

var colls = {
    git: 'git_accounts',
    services: 'services',
    daemons: 'daemons',
    staticContent: 'staticContent'
};

/**
 * Get activated git record from data store
 *
 * @param {Object} soajs
 * @param {Object} repo
 * @param {Callback Function} cb
 */
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

function verifyReplicationMode (soajs) {
    if (soajs.inputmaskData.deployConfig.isKubernetes){
        if (soajs.inputmaskData.deployConfig.replication.mode === 'replicated') return "deployment";
        else if (soajs.inputmaskData.deployConfig.replication.mode === 'global') return "daemonset";
        else return soajs.inputmaskData.deployConfig.replication.mode
    }

    return soajs.inputmaskData.deployConfig.replication.mode
}

/**
 * Deploy a new SOAJS service of type [ controller || service || daemon ]
 *
 * @param {Object} config
 * @param {Object} soajs
 * @param {Object} registry
 * @param {Response Object} res
 */
function deployServiceOrDaemon(config, soajs, registry, res) {
    var context = {
        name: '',
        origin: ''
    };

    function getEnvInfo(cb) {
        utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (error, envRecord) {
            utils.checkIfError(soajs, res, {config: config, error: error || !envRecord, code: 600}, function () {
                utils.checkIfError(soajs, res, {config: config, error: envRecord.deployer.type === 'manual', code: 618}, function () {
                    context.envRecord = envRecord;
                    return cb();
                });
            });
        });
    }

    function getDashboardConnection(cb) {
        getDashDbInfo(soajs, function (error, data) {
            utils.checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
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
            utils.checkIfError(soajs, res, {config: config, error: error || !accountRecord, code: 600}, function () {
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
            utils.checkIfError(soajs, res, {config: config, error: error || !dbRecord, code: 600}, function () {
                registry.loadByEnv({ envCode: soajs.inputmaskData.env.toLowerCase() }, function (error, registry) {
                    utils.checkIfError(soajs, res, {config: config, error: error, code: 446}, function () {
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
        var platform = context.envRecord.deployer.selected.split('.')[1];

    	if (platform === 'docker' && context.name !== 'controller') {
    		serviceName += (soajs.inputmaskData.version) ? "-v" + soajs.inputmaskData.version : "";
	    }
        else if (platform === 'kubernetes') {
            serviceName += (soajs.inputmaskData.version) ? "-v" + soajs.inputmaskData.version : "";
        }

        soajs.inputmaskData.deployConfig.replication.mode = verifyReplicationMode(soajs);

        var serviceParams = {
            "env": soajs.inputmaskData.env.toLowerCase(),
            "id": serviceName.toLowerCase(), // required field to build namespace in kubernetes deployments
            "name": serviceName.toLowerCase(),
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
                "SOAJS_GIT_COMMIT=" + soajs.inputmaskData.gitSource.commit,

                "SOAJS_SRV_MEMORY=" + (soajs.inputmaskData.deployConfig.memoryLimit / 1048576) //converting from bytes to mbytes
            ],
            "labels": { //very useful when filtering
                "soajs.content": "true",

                "soajs.env.code": soajs.inputmaskData.env.toLowerCase(),

                "soajs.service.name": context.dbRecord.name,
                "soajs.service.group": ((context.dbRecord.group) ? context.dbRecord.group.toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-') : ''),
                "soajs.service.type": soajs.inputmaskData.type,
                "soajs.service.version": "" + soajs.inputmaskData.version,
                "soajs.service.label": serviceName,

                "soajs.service.mode": soajs.inputmaskData.deployConfig.replication.mode //replicated || global for swarm, deployment || daemonset for kubernetes
            },
            "cmd": [
                'bash',
                '-c',
                './soajsDeployer.sh -T service -X deploy -g ' + context.accountRecord.providerName + ' -G ' + context.accountRecord.domain
            ],
            "memoryLimit": soajs.inputmaskData.deployConfig.memoryLimit,
            "replication": {
                "mode": soajs.inputmaskData.deployConfig.replication.mode
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
                    "name": "service",
                    "isPublished": false,
                    "target": context.dbRecord.port
                },
                {
                    "name": "maintenance",
                    "isPublished": false,
                    "target": context.dbRecord.maintenancePort
                }
            ]
        };

        if (soajs.inputmaskData.deployConfig.readinessProbe) {
            serviceParams.readinessProbe = {
                "initialDelaySeconds": soajs.inputmaskData.deployConfig.readinessProbe.initialDelaySeconds,
                "timeoutSeconds": soajs.inputmaskData.deployConfig.readinessProbe.timeoutSeconds,
                "periodSeconds": soajs.inputmaskData.deployConfig.readinessProbe.periodSeconds,
                "successThreshold": soajs.inputmaskData.deployConfig.readinessProbe.successThreshold,
                "failureThreshold": soajs.inputmaskData.deployConfig.readinessProbe.failureThreshold
            };
        }

	    if(soajs.inputmaskData.deployConfig.replication.replicas) {
	    	serviceParams.replication.replicas = soajs.inputmaskData.deployConfig.replication.replicas;
	    }

        if (soajs.inputmaskData.deployConfig.useLocalSOAJS) {
            serviceParams.cmd[2] = serviceParams.cmd[2] + ' -L';
        }

        if (soajs.inputmaskData.type === 'daemon' && soajs.inputmaskData.contentConfig && soajs.inputmaskData.contentConfig.daemon) { //TODO: check to verify that grpConfName is present
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
        if (context.clusterInfo.URLParam && context.clusterInfo.URLParam.replicaSet && context.clusterInfo.URLParam.replicaSet) {
            serviceParams.variables.push("SOAJS_MONGO_RSNAME=" + context.clusterInfo.URLParam.replicaSet);
        }

        //if authSource is set, add it to env variables
        if (context.clusterInfo.URLParam && context.clusterInfo.URLParam.authSource) {
            serviceParams.variables.push("SOAJS_MONGO_AUTH_DB=" + context.clusterInfo.URLParam.authSource);
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
        var options = utils.buildDeployerOptions(context.envRecord, soajs, BL);
        options.params = context.serviceParams;
        soajs.log.debug("Creating HA service with deployer: " + JSON.stringify(options.params));

        deployer.deployService(options, function (error) {
            utils.checkIfError(soajs, res, {config: config, error: error}, cb);
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

    function checkMemoryRequirement (cb) {
        if (context.dbRecord && context.dbRecord.prerequisites && context.dbRecord.prerequisites.memory) {
            utils.checkIfError(soajs, res, {
                config: config,
                error: (context.dbRecord.prerequisites.memory > soajs.inputmaskData.deployConfig.memoryLimit),
                code: 910
            }, cb);
        }
        else {
            return cb();
        }
    }

    getEnvInfo(function () {
        checkPort(function(){
            getDashboardConnection(function () {
                getGitInfo(function () {
                    getServiceDaemonInfo(function () {
                        checkMemoryRequirement(function () {
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
    });
}

/**
 * Get environment record and extract cluster information from it
 *
 * @param {Object} soajs
 * @param {Callback Function} cb
 */
function getDashDbInfo(soajs, cb) {
    utils.getEnvironment(soajs, BL.model, 'DASHBOARD', function (error, envRecord) {
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

    /**
	 * Deploy a new SOAJS service of type [ nginx || controller || service || daemon ], routes to specific function
	 *
	 * @param {Object} options
	 * @param {Response Object} res
	 */
    "deployService": function (config, soajs, registry, res) {
        if (soajs.inputmaskData.type === 'nginx') {
            BL.deployNginx(config, soajs, res);
        }
        else if (['service', 'daemon'].indexOf(soajs.inputmaskData.type) !== -1) {
            deployServiceOrDaemon(config, soajs, registry, res);
        }
    },

    /**
	 * Deploy a new custom service
	 *
	 * @param {Object} options
     * @param {Response Object} res
	 */
    "deployCustomService": function (config, soajs, res) {
        soajs.inputmaskData.deployConfig.replication.mode = verifyReplicationMode(soajs);

        var serviceParams = {
            "env": soajs.inputmaskData.env.toLowerCase(),
            "id": soajs.inputmaskData.name.toLowerCase(),
            "name": soajs.inputmaskData.name.toLowerCase(),
            "image": soajs.inputmaskData.deployConfig.image,
            "variables": soajs.inputmaskData.variables || [],
            "labels": soajs.inputmaskData.labels,
            "cmd": soajs.inputmaskData.command.cmd.concat(soajs.inputmaskData.command.args),
            "memoryLimit": soajs.inputmaskData.deployConfig.memoryLimit,
            "replication": {
                "mode": soajs.inputmaskData.deployConfig.replication.mode
            },
            "containerDir": soajs.inputmaskData.deployConfig.workDir,
            "restartPolicy": {
                "condition": soajs.inputmaskData.deployConfig.restartPolicy.condition,
                "maxAttempts": soajs.inputmaskData.deployConfig.restartPolicy.maxAttempts
            },
            "network": soajs.inputmaskData.deployConfig.network,
            "ports": soajs.inputmaskData.deployConfig.ports || []
        };

        if(soajs.inputmaskData.deployConfig.replication.replicas) {
	    	serviceParams.replication.replicas = soajs.inputmaskData.deployConfig.replication.replicas;
	    }

        if (soajs.inputmaskData.deployConfig.volume && Object.keys(soajs.inputmaskData.deployConfig.volume).length > 0) {
            serviceParams.volume = { //NOTE: onyl one volume is supported for now
                "name": soajs.inputmaskData.name + '-volume',
                "type": soajs.inputmaskData.deployConfig.volume.type,
                "readOnly": soajs.inputmaskData.deployConfig.volume.readOnly || false,
                "source": soajs.inputmaskData.deployConfig.volume.source,
                "target": soajs.inputmaskData.deployConfig.volume.target
            };
        }

        if (soajs.inputmaskData.deployConfig.readinessProbe) {
            serviceParams.readinessProbe = { //NOTE: only httpGet readiness probe is supported for now
                "path": soajs.inputmaskData.deployConfig.readinessProbe.path,
                "port": soajs.inputmaskData.deployConfig.readinessProbe.port,
                "initialDelaySeconds": soajs.inputmaskData.deployConfig.readinessProbe.initialDelaySeconds,
                "timeoutSeconds": soajs.inputmaskData.deployConfig.readinessProbe.timeoutSeconds,
                "periodSeconds": soajs.inputmaskData.deployConfig.readinessProbe.periodSeconds,
                "successThreshold": soajs.inputmaskData.deployConfig.readinessProbe.successThreshold,
                "failureThreshold": soajs.inputmaskData.deployConfig.readinessProbe.failureThreshold
            };
        }

        utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (error, envRecord) {
            utils.checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
                utils.checkIfError(soajs, res, {config: config, error: !envRecord, code: 446}, function () {
                    var options = utils.buildDeployerOptions(envRecord, soajs, BL);
                    options.params = serviceParams;
                    deployer.deployService(options, function (error) {
                        utils.checkIfError(soajs, res, {config: config, error: error}, function () {
                            return res.jsonp(soajs.buildResponse(null, true));
                        });
                    });
                });
            });
        });
    },

    /**
	 * Deploy a new nginx service
	 *
	 * @param {Object} options
	 * @param {Response Object} res
	 */
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
            utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (error, envRecord) {
                utils.checkIfError(soajs, res, {config: config, error: error || !envRecord, code: 600}, function () {
                    utils.checkIfError(soajs, res, {
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
                utils.checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {

                    var opts = {
                        collection: colls.staticContent,
                        conditions: { '_id': id }
                    };
                    BL.model.findEntry(soajs, opts, function (error, srcRecord) {
                        utils.checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
                            if (!srcRecord) return cb();

                            getGitRecord(soajs, srcRecord.src.owner + '/' + srcRecord.src.repo, function (error, tokenRecord) {
                                utils.checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
                                    utils.checkIfError(soajs, res, {config: config, error: !tokenRecord, code: 600}, function () {

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
                utils.checkIfError(soajs, res, {config: config, error: error}, function () {
                    context.controller = {
                        domain: controllerDomainName
                    };

                    return cb();
                });
            });
        }

        function constructDeployerParams() {
            soajs.inputmaskData.deployConfig.replication.mode = verifyReplicationMode(soajs);

            var nginxParams = {
                "env": context.envRecord.code.toLowerCase(),
                "id": soajs.inputmaskData.env.toLowerCase() + "-nginx",
                "name": soajs.inputmaskData.env.toLowerCase() + "-nginx",
                "image": soajs.inputmaskData.deployConfig.imagePrefix + "/nginx",
                "variables": [
                    "SOAJS_NX_CONTROLLER_NB=1",
                    "SOAJS_NX_CONTROLLER_IP_1=" + context.controller.domain,

                    "SOAJS_NX_DOMAIN=" + context.envRecord.domain,
                    "SOAJS_NX_SITE_DOMAIN=" + context.envRecord.sitePrefix + "." + context.envRecord.domain,
                    "SOAJS_NX_API_DOMAIN=" + context.envRecord.apiPrefix + "." + context.envRecord.domain
                ],
                "labels": {
                    "soajs.content": "true",

                    "soajs.env.code": soajs.inputmaskData.env.toLowerCase(),

                    "soajs.service.name": "nginx",
                    "soajs.service.group": "nginx",
                    "soajs.service.type": "nginx",
                    "soajs.service.label": soajs.inputmaskData.env.toLowerCase() + "-nginx",

                    "soajs.service.mode": soajs.inputmaskData.deployConfig.replication.mode //replicated || global for swarm, deployment || daemonset for kubernetes
                },
                "cmd": [ './soajsDeployer.sh', '-T', 'nginx', '-X', 'deploy' ],
                "memoryLimit": soajs.inputmaskData.deployConfig.memoryLimit,
                "containerDir": config.imagesDir,
                "replication": {
                    "mode": soajs.inputmaskData.deployConfig.replication.mode
                },
                "restartPolicy": {
                    "condition": "any", //TODO: make dynamic
                    "maxAttempts": 5 //TODO: make dynamic
                },
                "network": config.network,
                "ports": [
                    //NOTE: an https port is automatically exposed with a random port
                    //NOTE: only one http exposed port is permitted for now for nginx deployment
                    {
                        "name": "http",
                        "isPublished": true,
                        "target": 80,
                        "published": ((soajs.inputmaskData.deployConfig.ports && soajs.inputmaskData.deployConfig.ports[0]) ? soajs.inputmaskData.deployConfig.ports[0].published : null)
                    },
                    {
                        "name": "https",
                        "isPublished": true,
                        "target": 443
                    }
                ]
            };

            if(soajs.inputmaskData.deployConfig.replication.replicas) {
    	    	nginxParams.replication.replicas = soajs.inputmaskData.deployConfig.replication.replicas;
    	    }

            if (soajs.inputmaskData.deployConfig.readinessProbe) {
                nginxParams.readinessProbe = {
                    "initialDelaySeconds": soajs.inputmaskData.deployConfig.readinessProbe.initialDelaySeconds,
                    "timeoutSeconds": soajs.inputmaskData.deployConfig.readinessProbe.timeoutSeconds,
                    "periodSeconds": soajs.inputmaskData.deployConfig.readinessProbe.periodSeconds,
                    "successThreshold": soajs.inputmaskData.deployConfig.readinessProbe.successThreshold,
                    "failureThreshold": soajs.inputmaskData.deployConfig.readinessProbe.failureThreshold
                };
            }

            if (soajs.inputmaskData.contentConfig && soajs.inputmaskData.contentConfig.nginx && soajs.inputmaskData.contentConfig.nginx.supportSSL) {
                nginxParams.cmd.push('-s');
                nginxParams.ssl = {
                    "enabled": true
                }

                if(soajs.inputmaskData.contentConfig.nginx.kubeSecret){
                    nginxParams.variables.push("SOAJS_NX_CUSTOM_SSL=1");
                    nginxParams.variables.push("SOAJS_NX_SSL_CERTS_LOCATION=/etc/soajs/ssl");
                    nginxParams.variables.push("SOAJS_NX_SSL_SECRET=" + soajs.inputmaskData.contentConfig.nginx.kubeSecret);

                    nginxParams.ssl.secret = soajs.inputmaskData.contentConfig.nginx.kubeSecret
                }

                nginxParams.variables.push("SOAJS_NX_API_HTTPS=1");
                nginxParams.variables.push("SOAJS_NX_API_HTTP_REDIRECT=1");
                nginxParams.variables.push("SOAJS_NX_SITE_HTTPS=1");
                nginxParams.variables.push("SOAJS_NX_SITE_HTTP_REDIRECT=1");
            }

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
                utils.checkIfError(soajs, res, {config: config, error: error}, cb);
            });
        }

        function checkPort(cb){
            //TODO: check if exposed port is set before proceeding in case of type === nginx
            var nginxInputPort = soajs.inputmaskData.deployConfig.ports[0].published;
            var deployType = context.envRecord.deployer.selected.split('.')[1];

            if(deployType === "kubernetes" && (nginxInputPort < config.kubeNginx.minPort || nginxInputPort > config.kubeNginx.maxPort)){
                var errMsg = config.errors[824];
                errMsg = errMsg.replace("%PORTNUMBER%", nginxInputPort);
                errMsg = errMsg.replace("%MINNGINXPORT%", config.kubeNginx.minPort);
                errMsg = errMsg.replace("%MAXNGINXPORT%", config.kubeNginx.maxPort);
                return res.jsonp(soajs.buildResponse({"code": 824, "msg": errMsg}));
            }
            else{
                if(deployType === "kubernetes") {
                    soajs.inputmaskData.deployConfig.ports[0].published += 30000;
                }

                return cb();
            }
        }

        getEnvInfo(function () {
            options = utils.buildDeployerOptions(context.envRecord, soajs, BL);
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

    /**
     * Redeploy a service (does not update config, only simulates a deployment restart)
     *
     * @param {Object} options
     * @param {Response Object} res
     */
    "redeployService": function (config, soajs, res) {
        utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (error, envRecord) {
            utils.checkIfError(soajs, res, {config: config, error: error || !envRecord, code: 402}, function () {
                var options = utils.buildDeployerOptions(envRecord, soajs, BL);
                options.params = {
                    id: soajs.inputmaskData.serviceId,
                    mode: soajs.inputmaskData.mode //NOTE: only required for kubernetes driver
                };

                if (soajs.inputmaskData.ssl && soajs.inputmaskData.ssl.supportSSL) {
                    options.params.ssl = {
                        "enabled": true
                    };

                    if (soajs.inputmaskData.ssl.kubeSecret) {
                        options.params.ssl.kubeSecret = soajs.inputmaskData.ssl.kubeSecret;
                    }
                }

                getUIConfig(function (error, config) { //error is already catered for in function
                    if (config.available) {
                        options.params.ui = config.values;
                    }
                    deployer.redeployService(options, function (error) {
                        utils.checkIfError(soajs, res, {config: config, error: error}, function () {
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
                utils.checkIfError(soajs, res, {config: config, error: error, code: 701}, function () {
                    var opts = {
                        collection: colls.staticContent,
                        condition: { _id: id }
                    };
                    BL.model.findEntry(soajs, opts, function (error, record) {
                        utils.checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
                            utils.checkIfError(soajs, res, {config: config, error: !record, code: 905}, function () {
                                getGitRecord(soajs, record.src.owner + '/' + record.src.repo, function (error, gitRecord) {
                                    utils.checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
                                        utils.checkIfError(soajs, res, {config: config, error: !gitRecord, code: 757}, function () {
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
    }
};

module.exports = {
    "init": function (modelName, cb) {
        var modelPath;

        if (!modelName) {
            return cb(new Error("No Model Requested!"));
        }

        modelPath = __dirname + "/../../models/" + modelName + ".js";
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
