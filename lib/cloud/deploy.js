'use strict';

var fs = require("fs");
var async = require("async");
var deployer = require("soajs.core.drivers");
var utils = require("../../utils/utils.js");

var colls = {
    git: 'git_accounts',
    services: 'services',
    daemons: 'daemons',
    staticContent: 'staticContent',
    catalog: 'catalogs'
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

/**
 * Get deployment catalog recipe record
 *
 * @param {Callback Function} cb
 */
function getCatalogRecipe(soajs, res, config, cb) {
    BL.model.validateCustomId(soajs, soajs.inputmaskData.recipe, function (error, recipeId) {
        utils.checkIfError(soajs, res, {config: config, error: error || !recipeId, code: 701}, function () {
            var opts = {
                collection: colls.catalog,
                conditions: { _id: recipeId }
            };

            BL.model.findEntry(soajs, opts, function (error, catalogRecord) {
                utils.checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
                    utils.checkIfError(soajs, res, {config: config, error: !catalogRecord, code: 950}, function () {
                        return cb(catalogRecord);
                    });
                });
            });
        });
    });
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
 * Verify exposed ports are within kubernetes port range
 *
 * @param {Object} options
 * @param {Callback Function} cb
 */
function checkPort(options, cb) {
    var deployType = options.context.envRecord.deployer.selected.split('.')[1];
    if (deployType !== 'kubernetes') {
        return cb();
    }

    if (!options.context.catalog.recipe.deployOptions || !options.context.catalog.recipe.deployOptions.ports || options.context.catalog.recipe.deployOptions.ports.length === 0) {
        return cb();
    }

    var ports = options.context.catalog.recipe.deployOptions.ports;
    async.each(ports, function (onePort, callback) {
        if (!onePort.published) {
            return callback();
        }

        if (onePort.published < options.config.kubeNginx.minPort || onePort.published > options.config.kubeNginx.maxPort) {
            return callback({ wrongPort: onePort });
        }

        return callback();
    }, function (error) {
        if (error && error.wrongPort) {
            var errMsg = options.config.errors[824];
            errMsg = errMsg.replace("%PORTNUMBER%", error.wrongPort.published);
            errMsg = errMsg.replace("%MINNGINXPORT%", options.config.kubeNginx.minPort);
            errMsg = errMsg.replace("%MAXNGINXPORT%", options.config.kubeNginx.maxPort);
            return options.res.jsonp(options.soajs.buildResponse({"code": 824, "msg": errMsg}));
        }
        else {
            async.map(ports, function (onePort, callback) {
                // Increment all exposed port by 30000 to be in the port range of kubernetes exposed ports
                // NOTE: It's better to leave it for the user to set the proper ports
                if (onePort.published) {
                    onePort.published += 30000;
                }

                return callback(null, onePort)
            }, function (error, updatedPorts) {
                //No error to be handled
                options.context.catalog.recipe.deployOptions.ports = updatedPorts;
                return cb();
            });
        }
    });
}

/**
 * Convert object of environment variables to an array of strings and return it
 *
 * @param {Object} variables
 * @returns {Array} result
 */
function normalizeEnvVars (variables) {
    var result = [];
    for (var oneVar in variables) {
        if (typeof variables[oneVar] === 'string') {
            result.push('' + oneVar + '=' + variables[oneVar]);
        }
        else if (typeof variables[oneVar] === 'object') {
            result.push('' + oneVar + '=' + JSON.stringify (variables[oneVar]));
        }
    }

    return result;
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

        var image = '';
        if (context.catalog.recipe.deployOptions.image.prefix) image += context.catalog.recipe.deployOptions.image.prefix + '/';
        image += context.catalog.recipe.deployOptions.image.name;
        if (context.catalog.recipe.deployOptions.image.tag) image += ':' + context.catalog.recipe.deployOptions.image.tag;

        var serviceParams = {
            "env": soajs.inputmaskData.env.toLowerCase(),
            "id": serviceName.toLowerCase(), // required field to build namespace in kubernetes deployments
            "name": serviceName.toLowerCase(),
            "image": image,
            "variables": [
                "SOAJS_ENV=" + soajs.inputmaskData.env.toLowerCase(),
                "SOAJS_PROFILE=" + context.envRecord.profile,
                "SOAJS_SRV_AUTOREGISTERHOST=true",

                "SOAJS_MONGO_NB=" + context.mongoDbs.length,

                "SOAJS_GIT_OWNER=" + soajs.inputmaskData.gitSource.owner,
                "SOAJS_GIT_REPO=" + soajs.inputmaskData.gitSource.repo,
                "SOAJS_GIT_BRANCH=" + soajs.inputmaskData.gitSource.branch,
                "SOAJS_GIT_COMMIT=" + soajs.inputmaskData.gitSource.commit,
                "SOAJS_GIT_PROVIDER=" + context.accountRecord.providerName,
                "SOAJS_GIT_DOMAIN=" +  context.accountRecord.domain,

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
                'node index.js -T service'
            ],
            "memoryLimit": soajs.inputmaskData.deployConfig.memoryLimit,
            "replication": {
                "mode": soajs.inputmaskData.deployConfig.replication.mode
            },
            "version": soajs.inputmaskData.version || "",
            "containerDir": config.imagesDir,
            "restartPolicy": {
                "condition": "any",
                "maxAttempts": 5
            },
            "network": ((platform === 'docker') ? config.network : ''),
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

        //Add readiness probe configuration if present, only for kubernetes deployments
        if (platform === 'kubernetes' && context.catalog.recipe && context.catalog.recipe.deployOptions && context.catalog.recipe.deployOptions.readinessProbe) {
            serviceParams.readinessProbe = context.catalog.recipe.deployOptions.readinessProbe;
        }

        //Add user-defined ports if any
        if (context.catalog.recipe.deployOptions.ports) {
            serviceParams.ports = serviceParams.ports.concat(context.catalog.recipe.deployOptions.ports);
        }

        //Add replica count in case of docker replicated service or kubernetes deployment
	    if(soajs.inputmaskData.deployConfig.replication.replicas) {
	    	serviceParams.replication.replicas = soajs.inputmaskData.deployConfig.replication.replicas;
	    }

        //If user wants to use local SOAJS package inside the image, add the option to the deployer params
        if (context.catalog.recipe.buildOptions && context.catalog.recipe.buildOptions.settings && context.catalog.recipe.buildOptions.settings.accelerateDeployment) {
            serviceParams.variables.push('SOAJS_DEPLOY_ACC=true');
        }

        //Override the default docker network of the user wants to use a custom overlay network
        if (platform === 'docker' && context.catalog.recipe.deployOptions.container && context.catalog.recipe.deployOptions.container.network) {
            serviceParams.network = context.catalog.recipe.deployOptions.container.network;
        }

        //Override the default container working directory if the user wants to set a custom path
        if (context.catalog.recipe.deployOptions.container && context.catalog.recipe.deployOptions.container.workingDir) {
            serviceParams.containerDir = context.catalog.recipe.deployOptions.container.workingDir;
        }

        //Override the default container restart policy if set
        if (context.catalog.recipe.deployOptions.restartPolicy) {
            serviceParams.restartPolicy.condition = context.catalog.recipe.deployOptions.restartPolicy.condition;
            if (context.catalog.recipe.deployOptions.restartPolicy.maxAttempts) {
                serviceParams.restartPolicy.maxAttempts = context.catalog.recipe.deployOptions.restartPolicy.maxAttempts;
            }
        }

        //Daemons read additional environment variable that points out the name of the group configuration that should be used
        if (soajs.inputmaskData.type === 'daemon' && soajs.inputmaskData.contentConfig && soajs.inputmaskData.contentConfig.daemon) { //TODO: check to verify that grpConfName is present
            serviceParams.variables.push("SOAJS_DAEMON_GRP_CONF=" + soajs.inputmaskData.contentConfig.daemon.grpConfName);
        }

        //If a service requires to run cmd commands before starting, get them from service record and add them
        if (context.dbRecord.src && context.dbRecord.src.cmd) {
            if (Array.isArray(context.dbRecord.src.cmd) && context.dbRecord.src.cmd.length > 0) {
                var commands = context.dbRecord.src.cmd.join("; ");
                serviceParams.cmd[2] = commands + "; " + serviceParams.cmd[2];
            }
        }

        //If the service has a custom entry point, add it as an option to the deployer
        if (context.dbRecord.src && context.dbRecord.src.main) {
            serviceParams.variables.push('SOAJS_SRV_MAIN=' + context.dbRecord.src.main);
        }

        //If user defined pre_deploy and post_deploy commands are found in the catalog, add them
        if (context.catalog.recipe.buildOptions && context.catalog.recipe.buildOptions.cmd) {
            if (context.catalog.recipe.buildOptions.cmd.pre_deploy) {
                if (Array.isArray(context.catalog.recipe.buildOptions.cmd.pre_deploy) && context.catalog.recipe.buildOptions.cmd.pre_deploy.length > 0) {
                    var pre_deploy_cmd = context.catalog.recipe.buildOptions.cmd.pre_deploy.join("; ");
                    serviceParams.cmd[2] = pre_deploy_cmd + "; " + serviceParams.cmd[2];
                }
            }

            if (context.catalog.recipe.buildOptions.cmd.post_deploy) {
                if (Array.isArray(context.catalog.recipe.buildOptions.cmd.post_deploy) && context.catalog.recipe.buildOptions.cmd.post_deploy.length > 0) {
                    var post_deploy_cmd = context.catalog.recipe.buildOptions.cmd.post_deploy.join("; ");
                    serviceParams.cmd[2] = serviceParams.cmd[2] + "; " + post_deploy_cmd;
                }
            }
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

        //Add the user-defined environment variables from the catalog recipe to the service params
        if (context.catalog.recipe.buildOptions && context.catalog.recipe.buildOptions.env && Object.keys(context.catalog.recipe.buildOptions.env).length > 0) {
            serviceParams.variables = serviceParams.variables.concat(normalizeEnvVars(context.catalog.recipe.buildOptions.env));
        }

        //Add the node env if not specified in the catalog recipe
        if(context.catalog.recipe.buildOptions && !context.catalog.recipe.buildOptions.env['NODE_ENV']){
            serviceParams.variables.push("NODE_ENV=production");
        }

        //Add the user-defined volumes if any
        if (context.catalog.recipe.deployOptions && context.catalog.recipe.deployOptions.voluming) {
            serviceParams.voluming = context.catalog.recipe.deployOptions.voluming;
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
        getCatalogRecipe(soajs, res, config, function (catalogRecord) {
            context.catalog = catalogRecord;
            checkPort({ soajs: soajs, res: res, config: config, context: context }, function() {
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
            "type": "custom",
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

            var platform = context.envRecord.deployer.selected.split('.')[1];

            var image = '';
            if (context.catalog.recipe.deployOptions.image.prefix) image += context.catalog.recipe.deployOptions.image.prefix + '/';
            image += context.catalog.recipe.deployOptions.image.name;
            if (context.catalog.recipe.deployOptions.image.tag) image += ':' + context.catalog.recipe.deployOptions.image.tag;

            var nginxParams = {
                "env": context.envRecord.code.toLowerCase(),
                "id": soajs.inputmaskData.env.toLowerCase() + "-nginx",
                "name": soajs.inputmaskData.env.toLowerCase() + "-nginx",
                "image": image,
                "variables": [
                    "SOAJS_ENV=" + context.envRecord.code.toLowerCase(), 
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
                "cmd": [ 'bash', '-c', 'node index.js -T nginx' ],
                "memoryLimit": soajs.inputmaskData.deployConfig.memoryLimit,
                "containerDir": config.imagesDir,
                "replication": {
                    "mode": soajs.inputmaskData.deployConfig.replication.mode
                },
                "restartPolicy": {
                    "condition": "any",
                    "maxAttempts": 5
                },
                "network": ((platform === 'docker') ? config.network : ''),
                "ports": context.catalog.recipe.deployOptions.ports || []
            };

            if(soajs.inputmaskData.deployConfig.replication.replicas) {
    	    	nginxParams.replication.replicas = soajs.inputmaskData.deployConfig.replication.replicas;
    	    }

            if (platform === 'kubernetes' && context.catalog.recipe && context.catalog.recipe.deployOptions && context.catalog.recipe.deployOptions.readinessProbe) {
                nginxParams.readinessProbe = context.catalog.recipe.deployOptions.readinessProbe;
            }

            //Override the default container restart policy if set
            if (context.catalog.recipe.deployOptions.restartPolicy) {
                nginxParams.restartPolicy.condition = context.catalog.recipe.deployOptions.restartPolicy.condition;
                if (context.catalog.recipe.deployOptions.restartPolicy.maxAttempts) {
                    nginxParams.restartPolicy.maxAttempts = context.catalog.recipe.deployOptions.restartPolicy.maxAttempts;
                }
            }

            if (context.catalog.recipe.buildOptions && context.catalog.recipe.buildOptions.env) {
                if (context.catalog.recipe.buildOptions.env['SOAJS_NX_API_HTTPS'] === "1" || context.catalog.recipe.buildOptions.env['SOAJS_NX_SITE_HTTPS'] === "1") {
                    nginxParams.ssl = {
                        "enabled": true
                    };

                    if (context.catalog.recipe.buildOptions.env['SOAJS_NX_CUSTOM_SSL'] === "1" && context.catalog.recipe.buildOptions.env['SOAJS_NX_SSL_SECRET']) {
                        nginxParams.ssl.secret = context.catalog.recipe.buildOptions.env['SOAJS_NX_SSL_SECRET'];
                    }
                }
            }

            //If user defined pre_deploy and post_deploy commands are found in the catalog, add them
            if (context.catalog.recipe.buildOptions && context.catalog.recipe.buildOptions.cmd) {
                if (context.catalog.recipe.buildOptions.cmd.pre_deploy) {
                    if (Array.isArray(context.catalog.recipe.buildOptions.cmd.pre_deploy) && context.catalog.recipe.buildOptions.cmd.pre_deploy.length > 0) {
                        var pre_deploy_cmd = context.catalog.recipe.buildOptions.cmd.pre_deploy.join("; ");
                        nginxParams.cmd[2] = pre_deploy_cmd + "; " + nginxParams.cmd[2];
                    }
                }

                if (context.catalog.recipe.buildOptions.cmd.post_deploy) {
                    if (Array.isArray(context.catalog.recipe.buildOptions.cmd.post_deploy) && context.catalog.recipe.buildOptions.cmd.post_deploy.length > 0) {
                        var post_deploy_cmd = context.catalog.recipe.buildOptions.cmd.post_deploy.join("; ");
                        nginxParams.cmd[2] += "; " + post_deploy_cmd;
                    }
                }
            }

            //Add the user-defined environment variables from the catalog recipe to the nginx params
            if (context.catalog.recipe.buildOptions && context.catalog.recipe.buildOptions.env && Object.keys(context.catalog.recipe.buildOptions.env).length > 0) {
                nginxParams.variables = nginxParams.variables.concat(normalizeEnvVars(context.catalog.recipe.buildOptions.env));
            }

            //Add the user-defined volumes if any
            if (context.catalog.recipe.deployOptions && context.catalog.recipe.deployOptions.voluming) {
                nginxParams.voluming = context.catalog.recipe.deployOptions.voluming;
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

        getEnvInfo(function () {
            options = utils.buildDeployerOptions(context.envRecord, soajs, BL);
            getCatalogRecipe(soajs, res, config, function (catalogRecord) {
                context.catalog = catalogRecord;
                checkPort({ soajs: soajs, res: res, config: config, context: context }, function() {
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
