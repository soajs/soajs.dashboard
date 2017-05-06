'use strict';

var fs = require("fs");
var async = require("async");
var deployer = require("soajs").drivers;
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
            	//soajs.log.debug(error, catalogRecord);
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

function computeCatalogEnvVars(context, soajs, config, cb) {
    // context.catalog.recipe.buildOptions.env <- read environment variables config
    // context.variables <- replace computed values from this object
    // context.serviceParams.variables <- push final list of values to this array

    if (!context.catalog.recipe.buildOptions || !context.catalog.recipe.buildOptions.env || Object.keys(context.catalog.recipe.buildOptions.env).length === 0) {
        return cb(null, []);
    }

    var catalogEnvs = Object.keys(context.catalog.recipe.buildOptions.env);
    async.concat(catalogEnvs, function (oneEnvName, callback) {
        var oneEnv = context.catalog.recipe.buildOptions.env[oneEnvName];
        var result = [];

        // if env variable is of type static, just set its value and return
        if (oneEnv.type === 'static') {
            result.push(oneEnvName + '=' + oneEnv.value);
        }
        // if env variable is of type userInput, get value from request body, if not found see use default value
        else if (oneEnv.type === 'userInput') {
            var value = null;
            // first set to default value if found
            if (oneEnv.default) value = oneEnv.default;

            // if user specified value in request body, overwrite default with the new value
            if (soajs.inputmaskData.catalogUserInput &&
                soajs.inputmaskData.catalogUserInput.env &&
                soajs.inputmaskData.catalogUserInput.env[oneEnvName]) {
                    value = soajs.inputmaskData.catalogUserInput.env[oneEnvName];
            }

            if (value) result.push(oneEnvName + '=' + value);
            else return callback({type: 'userInput', name: oneEnvName});
        }
        else if (oneEnv.type === 'computed') {
            // if computed value is dynamic, collect all applicable values and set them
            if (config.HA.dynamicCatalogVariables.indexOf(oneEnv.value) !== -1) {
                var nVariableName = oneEnv.value.replace(/_N$/, ''), nCount = 1;
                var regex = new RegExp(nVariableName.replace("$", "\\$") + '_[0-9]+');
                Object.keys(context.variables).forEach(function (oneVar) {
                    if (oneVar.match(regex)) {
                        result.push(oneEnvName + '_' + nCount++ + '=' + context.variables[oneVar]);
                    }
                });
            }
            else {
                result.push(oneEnvName + '=' + ((oneEnv.value && context.variables[oneEnv.value]) ? context.variables[oneEnv.value] : null));
            }
        }

        return callback(null, result);
    }, cb);
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
    var context = { name: '', origin: '' }, options = {};

    function getEnvInfo(cb) {
        utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (error, envRecord) {
	        //soajs.log.debug(error, envRecord);
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
	        //soajs.log.debug(error, data);
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
	        //soajs.log.debug(error, accountRecord);
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
        console.log(opts);
        BL.model.findEntry(soajs, opts, function (error, dbRecord) {
	        soajs.log.debug(error, dbRecord);
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

        if (soajs.inputmaskData.deployConfig) {
            //NOTE: this param is not required when rebuilding service
            soajs.inputmaskData.deployConfig.replication.mode = verifyReplicationMode(soajs);
        }

        var image = '';
        if (context.catalog.recipe.deployOptions.image.prefix) image += context.catalog.recipe.deployOptions.image.prefix + '/';
        image += context.catalog.recipe.deployOptions.image.name;
        if (context.catalog.recipe.deployOptions.image.tag) image += ':' + context.catalog.recipe.deployOptions.image.tag;

        if (soajs.inputmaskData.catalogUserInput && soajs.inputmaskData.catalogUserInput.image && soajs.inputmaskData.catalogUserInput.image.name) {
            image = '';
            if (soajs.inputmaskData.catalogUserInput.image.prefix) image += soajs.inputmaskData.catalogUserInput.image.prefix + '/';
            image += soajs.inputmaskData.catalogUserInput.image.name;
            if (soajs.inputmaskData.catalogUserInput.image.tag) image += ':' + soajs.inputmaskData.catalogUserInput.image.tag;
        }

        var serviceParams = {
            "env": soajs.inputmaskData.env.toLowerCase(),
            "id": serviceName.toLowerCase(), // required field to build namespace in kubernetes deployments
            "name": serviceName.toLowerCase(),
            "image": image,
            "imagePullPolicy": ((platform === 'kubernetes' && context.catalog.recipe.deployOptions.image.pullPolicy) ? context.catalog.recipe.deployOptions.image.pullPolicy : ''),
            "labels": { //very useful when filtering
                "soajs.content": "true",

                "soajs.env.code": soajs.inputmaskData.env.toLowerCase(),

                "soajs.service.name": context.dbRecord.name,
                "soajs.service.group": ((context.dbRecord.group) ? context.dbRecord.group.toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-') : ''),
                "soajs.service.type": soajs.inputmaskData.type,
                "soajs.service.version": "" + soajs.inputmaskData.version,
                "soajs.service.label": serviceName,
                "soajs.service.mode": ((soajs.inputmaskData.deployConfig) ? soajs.inputmaskData.deployConfig.replication.mode : null), //replicated || global for swarm, deployment || daemonset for kubernetes
                "soajs.catalog.id": context.catalog._id.toString()
            },
            "memoryLimit": ((soajs.inputmaskData.deployConfig) ? soajs.inputmaskData.deployConfig.memoryLimit : null),
            "replication": {
                "mode": ((soajs.inputmaskData.deployConfig) ? soajs.inputmaskData.deployConfig.replication.mode : null)
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
	    if(soajs.inputmaskData.deployConfig && soajs.inputmaskData.deployConfig.replication.replicas) {
	    	serviceParams.replication.replicas = soajs.inputmaskData.deployConfig.replication.replicas;
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

        //Add the commands to execute when running the containers
        if (context.catalog.recipe.buildOptions && context.catalog.recipe.buildOptions.cmd && context.catalog.recipe.buildOptions.cmd.deploy && context.catalog.recipe.buildOptions.cmd.deploy.command) {
            serviceParams.command = context.catalog.recipe.buildOptions.cmd.deploy.command;
        }

        //Add the command arguments
        if (context.catalog.recipe.buildOptions && context.catalog.recipe.buildOptions.cmd && context.catalog.recipe.buildOptions.cmd.deploy && context.catalog.recipe.buildOptions.cmd.deploy.args) {
            serviceParams.args = context.catalog.recipe.buildOptions.cmd.deploy.args;
        }

        //If a service requires to run cmd commands before starting, get them from service record and add them
        if (serviceParams.cmd && context.dbRecord.src && context.dbRecord.src.cmd) {
            if (Array.isArray(context.dbRecord.src.cmd) && context.dbRecord.src.cmd.length > 0) {
                if (!serviceParams.args) {
                    serviceParams.args = [];
                }

                serviceParams.args = context.dbRecord.src.cmd.concat(serviceParams.args);
            }
        }

        //Add the user-defined volumes if any
        if (context.catalog.recipe.deployOptions && context.catalog.recipe.deployOptions.voluming) {
            serviceParams.voluming = context.catalog.recipe.deployOptions.voluming;
        }

        context.serviceParams = serviceParams;
        return cb();
    }

    function buildAvailableVariables() {
        var variables = {
            '$NODE_ENV': 'production',
            '$SOAJS_ENV': soajs.inputmaskData.env.toLowerCase(),
            '$SOAJS_PROFILE': context.envRecord.profile,
            '$SOAJS_SRV_AUTOREGISTERHOST': 'true',
            '$SOAJS_MONGO_NB': context.mongoDbs.length,
            '$SOAJS_GIT_OWNER': soajs.inputmaskData.gitSource.owner,
            '$SOAJS_GIT_REPO': soajs.inputmaskData.gitSource.repo,
            '$SOAJS_GIT_BRANCH': soajs.inputmaskData.gitSource.branch,
            '$SOAJS_GIT_COMMIT': soajs.inputmaskData.gitSource.commit,
            '$SOAJS_GIT_PROVIDER': context.accountRecord.providerName,
            '$SOAJS_GIT_DOMAIN': context.accountRecord.domain,
            '$SOAJS_SRV_MEMORY': (soajs.inputmaskData.deployConfig.memoryLimit / 1048576),

            '$SOAJS_DEPLOY_HA': '$SOAJS_DEPLOY_HA', // field computed at the driver level
            '$SOAJS_HA_NAME': '$SOAJS_HA_NAME' // field computed at the driver level
        };

        //If user wants to use local SOAJS package inside the image, add the option to the deployer params
        if (context.catalog.recipe.buildOptions && context.catalog.recipe.buildOptions.settings && context.catalog.recipe.buildOptions.settings.accelerateDeployment) {
            variables['$SOAJS_DEPLOY_ACC'] = 'true';
        }

        //Daemons read additional environment variable that points out the name of the group configuration that should be used
        if (soajs.inputmaskData.type === 'daemon' && soajs.inputmaskData.contentConfig && soajs.inputmaskData.contentConfig.daemon) {
            variables['$SOAJS_DAEMON_GRP_CONF'] = soajs.inputmaskData.contentConfig.daemon.grpConfName;
        }

        //If the service has a custom entry point, add it as an option to the deployer
        if (context.dbRecord.src && context.dbRecord.src.main) {
            variables['$SOAJS_SRV_MAIN'] = context.dbRecord.src.main;
        }

        //adding info about database servers
        for (var i = 0; i < context.mongoDbs.length; i++) {
            variables["$SOAJS_MONGO_IP_" + (i + 1)] = context.mongoDbs[i].host;
            variables["$SOAJS_MONGO_PORT_" + (i + 1)] = context.mongoDbs[i].port;
        }

        //if database prefix exists, add it to env variables
        if (context.dbConfig && context.dbConfig.prefix) {
            variables["$SOAJS_MONGO_PREFIX"] = context.dbConfig.prefix;
        }

        //if mongo credentials exist, add them to env variables
        if (context.mongoCred && context.mongoCred.username && context.mongoCred.password) {
            variables["$SOAJS_MONGO_USERNAME"] = context.mongoCred.username;
            variables["$SOAJS_MONGO_PASSWORD"] = context.mongoCred.password;
        }

        //if replica set is used, add name to env variables
        if (context.clusterInfo.URLParam && context.clusterInfo.URLParam.replicaSet && context.clusterInfo.URLParam.replicaSet) {
            variables["$SOAJS_MONGO_RSNAME"] = context.clusterInfo.URLParam.replicaSet;
        }

        //if authSource is set, add it to env variables
        if (context.clusterInfo.URLParam && context.clusterInfo.URLParam.authSource) {
            variables["$SOAJS_MONGO_AUTH_DB"] = context.clusterInfo.URLParam.authSource;
        }

        //if ssl is set, add it to env variables
        if (context.clusterInfo.URLParam && context.clusterInfo.URLParam.ssl) {
            variables["$SOAJS_MONGO_SSL"] = 'true';
        }

        //if private repo, add token to env variables
        if (context.accountRecord.token) {
            if (context.accountRecord.provider === 'bitbucket_enterprise') {
                context.accountRecord.token = new Buffer(context.accountRecord.token, 'base64').toString();
            }
            variables["$SOAJS_GIT_TOKEN"] = context.accountRecord.token;
        }

        //if gc, add gc info to env variables
        if (soajs.inputmaskData.contentConfig && soajs.inputmaskData.contentConfig.service && soajs.inputmaskData.contentConfig.service.gc) {
            variables["$SOAJS_GC_NAME"] = soajs.inputmaskData.contentConfig.service.gcName;
            variables["$SOAJS_GC_VERSION"] = soajs.inputmaskData.contentConfig.service.gcVersion;
        }

        return variables;
    }

    function createService(cb) {
        options.params = context.serviceParams;
        soajs.log.debug("Creating service with deployer: " + JSON.stringify(options.params));

        deployer.deployService(options, function (error) {
            utils.checkIfError(soajs, res, {config: config, error: error}, cb);
        });
    }

    function rebuildService(cb) {
        options.params = {
            id: soajs.inputmaskData.serviceId,
            mode: soajs.inputmaskData.mode, //NOTE: only required for kubernetes driver
            action: soajs.inputmaskData.action,
            newBuild: context.serviceParams
        };

        soajs.log.debug("Rebuilding service with deployer: " + JSON.stringify(options.params));
        deployer.redeployService(options, function (error) {
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
        options = utils.buildDeployerOptions(context.envRecord, soajs, BL);
        getCatalogRecipe(soajs, res, config, function (catalogRecord) {
            context.catalog = catalogRecord;
            checkPort({ soajs: soajs, res: res, config: config, context: context }, function() {
                getDashboardConnection(function () {
                    getGitInfo(function () {
                        getServiceDaemonInfo(function () {
                            checkMemoryRequirement(function () {
                                constructDeployerParams(function () {
                                    context.variables = buildAvailableVariables();
                                    computeCatalogEnvVars(context, soajs, config, function (error, variables) {
                                        if (error) {
                                            var errorMessage = config.errors[911];
                                            errorMessage = errorMessage.replace('%ENV_NAME%', error.name);
                                            errorMessage = errorMessage.replace('%ENV_TYPE%', error.type);
                                            return res.jsonp(soajs.buildResponse({code: 911, msg: errorMessage}));
                                        }

                                        context.serviceParams.variables = variables;
                                        if (!soajs.inputmaskData.action || soajs.inputmaskData.action !== 'rebuild') {
                                            createService(function () {
                                                return res.jsonp(soajs.buildResponse(null, true));
                                            });
                                        }
                                        else {
                                            rebuildService(function () {
                                                return res.jsonp(soajs.buildResponse(null, true));
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
            //NOTE
            //NOTE: This is an overloaded function used for both deploy and rebuild. Some IMFV input is only valid for deploy and not passed while calling redeploy
            //NOTE

            if (!soajs.inputmaskData.action || soajs.inputmaskData.action !== 'rebuild') {
                //settings replication is only applicable in deploy operations, not when rebuilding
                soajs.inputmaskData.deployConfig.replication.mode = verifyReplicationMode(soajs);
            }

            var platform = context.envRecord.deployer.selected.split('.')[1];

            var image = '';
            if (context.catalog.recipe.deployOptions.image.prefix) image += context.catalog.recipe.deployOptions.image.prefix + '/';
            image += context.catalog.recipe.deployOptions.image.name;
            if (context.catalog.recipe.deployOptions.image.tag) image += ':' + context.catalog.recipe.deployOptions.image.tag;

            if (soajs.inputmaskData.catalogUserInput && soajs.inputmaskData.catalogUserInput.image && soajs.inputmaskData.catalogUserInput.image.name) {
                image = '';
                if (soajs.inputmaskData.catalogUserInput.image.prefix) image += soajs.inputmaskData.catalogUserInput.image.prefix + '/';
                image += soajs.inputmaskData.catalogUserInput.image.name;
                if (soajs.inputmaskData.catalogUserInput.image.tag) image += ':' + soajs.inputmaskData.catalogUserInput.image.tag;
            }

            var nginxParams = {
                "env": context.envRecord.code.toLowerCase(),
                "id": soajs.inputmaskData.env.toLowerCase() + "-nginx",
                "name": soajs.inputmaskData.env.toLowerCase() + "-nginx",
                "image": image,
                "imagePullPolicy": ((platform === 'kubernetes' && context.catalog.recipe.deployOptions.image.pullPolicy) ? context.catalog.recipe.deployOptions.image.pullPolicy : ''),
                "labels": {
                    "soajs.content": "true",
                    "soajs.env.code": soajs.inputmaskData.env.toLowerCase(),
                    "soajs.service.name": "nginx",
                    "soajs.service.group": "nginx",
                    "soajs.service.type": "nginx",
                    "soajs.service.label": soajs.inputmaskData.env.toLowerCase() + "-nginx",
                    "soajs.service.mode": ((soajs.inputmaskData.deployConfig) ? soajs.inputmaskData.deployConfig.replication.mode : null), //replicated || global for swarm, deployment || daemonset for kubernetes
                    "soajs.catalog.id": context.catalog._id.toString()
                },
                "memoryLimit": ((soajs.inputmaskData.deployConfig) ? soajs.inputmaskData.deployConfig.memoryLimit : null),
                "containerDir": config.imagesDir,
                "replication": {
                    "mode": ((soajs.inputmaskData.deployConfig) ? soajs.inputmaskData.deployConfig.replication.mode : null)
                },
                "restartPolicy": {
                    "condition": "any",
                    "maxAttempts": 5
                },
                "network": ((platform === 'docker') ? config.network : ''),
                "ports": context.catalog.recipe.deployOptions.ports || []
            };

            if(soajs.inputmaskData.deployConfig && soajs.inputmaskData.deployConfig.replication.replicas) {
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

            //Add the commands to execute when running the containers
            if (context.catalog.recipe.buildOptions && context.catalog.recipe.buildOptions.cmd && context.catalog.recipe.buildOptions.cmd.deploy && context.catalog.recipe.buildOptions.cmd.deploy.command) {
                nginxParams.command = context.catalog.recipe.buildOptions.cmd.deploy.command;
            }

            //Add the command arguments
            if (context.catalog.recipe.buildOptions && context.catalog.recipe.buildOptions.cmd && context.catalog.recipe.buildOptions.cmd.deploy && context.catalog.recipe.buildOptions.cmd.deploy.args) {
                nginxParams.args = context.catalog.recipe.buildOptions.cmd.deploy.args;
            }

            //Add the user-defined volumes if any
            if (context.catalog.recipe.deployOptions && context.catalog.recipe.deployOptions.voluming) {
                nginxParams.voluming = context.catalog.recipe.deployOptions.voluming;
            }

            return nginxParams;
        }

        function buildAvailableVariables() {
            var variables = {
                '$SOAJS_ENV':  context.envRecord.code.toLowerCase(),
                '$SOAJS_NX_CONTROLLER_NB': '1',
                '$SOAJS_NX_CONTROLLER_IP_1': context.controller.domain,
                '$SOAJS_NX_CONTROLLER_PORT': '' + context.envRecord.services.config.ports.controller,
                '$SOAJS_NX_DOMAIN': context.envRecord.domain,
                '$SOAJS_NX_SITE_DOMAIN': context.envRecord.sitePrefix + "." + context.envRecord.domain,
                '$SOAJS_NX_API_DOMAIN': context.envRecord.apiPrefix + "." + context.envRecord.domain,

                '$SOAJS_DEPLOY_HA': '$SOAJS_DEPLOY_HA', // field computed at the driver level
                '$SOAJS_HA_NAME': '$SOAJS_HA_NAME' // field computed at the driver level
            };

            return variables;
        }

        function createService(cb) {
            options.params = context.nginxParams;
            soajs.log.debug("Creating service with deployer: " + JSON.stringify(options.params));
            deployer.deployService(options, function (error) {
                utils.checkIfError(soajs, res, {config: config, error: error}, cb);
            });
        }

        function rebuildService(cb) {
            options.params = {
                id: soajs.inputmaskData.serviceId,
                mode: soajs.inputmaskData.mode, //NOTE: only required for kubernetes driver
                action: soajs.inputmaskData.action,
                newBuild: context.nginxParams
            };

            soajs.log.debug("Rebuilding service with deployer: " + JSON.stringify(options.params));
            deployer.redeployService(options, function (error) {
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
                        context.variables = buildAvailableVariables();
                        computeCatalogEnvVars(context, soajs, config, function (error, variables) {
                            if (error) {
                                var errorMessage = config.errors[911];
                                errorMessage = errorMessage.replace('%ENV_NAME%', error.name);
                                errorMessage = errorMessage.replace('%ENV_TYPE%', error.type);
                                return res.jsonp(soajs.buildResponse({code: 911, msg: errorMessage}));
                            }

                            context.nginxParams.variables = variables;
                            if (!soajs.inputmaskData.action || soajs.inputmaskData.action !== 'rebuild') {
                                createService(function () {
                                    return res.jsonp(soajs.buildResponse(null, true));
                                });
                            }
                            else {
                                rebuildService(function () {
                                    return res.jsonp(soajs.buildResponse(null, true));
                                });
                            }
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
    "redeployService": function (config, soajs, registry, res) {
        utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (error, envRecord) {
            utils.checkIfError(soajs, res, {config: config, error: error || !envRecord, code: 402}, function () {
                var options = utils.buildDeployerOptions(envRecord, soajs, BL);
                if (soajs.inputmaskData.action === 'redeploy') {
                    options.params = {
                        id: soajs.inputmaskData.serviceId,
                        mode: soajs.inputmaskData.mode, //NOTE: only required for kubernetes driver
                        action: soajs.inputmaskData.action
                    };

                    deployer.redeployService(options, function (error) {
                        utils.checkIfError(soajs, res, {config: config, error: error}, function () {
                            return res.jsonp(soajs.buildResponse(null, true));
                        });
                    });
                }
                else if (soajs.inputmaskData.action === 'rebuild') {
                    options.params = { id: soajs.inputmaskData.serviceId, excludeTasks: true };
                    deployer.inspectService(options, function (error, record) {
                        utils.checkIfError(soajs, res, {config: config, error: error}, function () {
                            utils.checkIfError(soajs, res, {
                                config: config,
                                error: !record.service || !record.service.labels || !record.service.labels['soajs.catalog.id'],
                                code: 954
                            }, function () {
                                //set catalog id and rebuild option and forward to deploy() function
                                soajs.inputmaskData.recipe = record.service.labels['soajs.catalog.id'];
	                            soajs.inputmaskData.name = record.service.labels['soajs.service.name'];
	                            soajs.inputmaskData.deployConfig ={
		                            memoryLimit: null,
		                            replication: {
			                            mode: record.service.labels["soajs.service.mode"]
		                            }
	                            };
	                            if(['deployment', 'daemonset'].indexOf(soajs.inputmaskData.deployConfig.replication.mode) !== -1){
	                            	soajs.inputmaskData.deployConfig.isKubernetes = true;
	                            }
	                            if(['replicated', 'deployment'].indexOf(soajs.inputmaskData.deployConfig.replication.mode) !== -1){
		                            soajs.inputmaskData.deployConfig.replication.replicas = record.service.tasks.length - record.service.failures;
	                            }
	                            //'replicated', 'global', 'deployment', 'daemonset'
	                            record.service.env.forEach(function(oneEnv){
		                            if(oneEnv.indexOf('SOAJS_SRV_MEMORY') !== -1) soajs.inputmaskData.deployConfig.memoryLimit = oneEnv.split('=')[1];
	                            });
	                            
                                if (record.service.labels['soajs.service.type'] === 'nginx') {
                                    return BL.deployNginx(config, soajs, res);
                                }
                                else if (record.service.labels['soajs.service.type'] === 'service' || record.service.labels['soajs.service.type'] === 'daemon') {
                                    soajs.inputmaskData.type = record.service.labels['soajs.service.type'];
                                    soajs.inputmaskData.version = record.service.labels['soajs.service.version'];
        							soajs.inputmaskData.gitSource = {};

                                    if (soajs.inputmaskData.type === 'daemon') {
                                        soajs.inputmaskData.contentConfig = { daemon: {} };
                                    }
                                    else if (soajs.inputmaskData.type === 'service') {
                                        soajs.inputmaskData.contentConfig = { service: {} };
                                    }
                                    async.each(record.service.env, function (oneEnv, callback) {
                                        if (oneEnv.indexOf('SOAJS_GIT_OWNER') !== -1) soajs.inputmaskData.gitSource.owner = oneEnv.split('=')[1];
                                        else if (oneEnv.indexOf('SOAJS_GIT_REPO') !== -1) soajs.inputmaskData.gitSource.repo = oneEnv.split('=')[1];
                                        else if (oneEnv.indexOf('SOAJS_GIT_BRANCH') !== -1) soajs.inputmaskData.gitSource.branch = oneEnv.split('=')[1];

                                        else if (soajs.inputmaskData.type === 'daemon' && oneEnv.indexOf('SOAJS_DAEMON_GRP_CONF') !== -1) {
                                            soajs.inputmaskData.contentConfig.daemon.grpConfName = oneEnv.split('=')[1];
                                        }
                                        else if (soajs.inputmaskData.type === 'service' && oneEnv.indexOf('SOAJS_GC_NAME') !== -1) {
                                            soajs.inputmaskData.contentConfig.service = { gc: true, gcName: oneEnv.split('=')[1] };
                                        }
                                        else if (soajs.inputmaskData.type === 'service' && oneEnv.indexOf('SOAJS_GC_VERSION') !== -1) {
                                            soajs.inputmaskData.contentConfig.service.gcVersion = oneEnv.split('=')[1];
                                        }

                                        return callback();
                                    }, function () {
                                        return BL.deployService(config, soajs, registry, res);
                                    });
                                }
                            });
                        });
                    });
                }
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
