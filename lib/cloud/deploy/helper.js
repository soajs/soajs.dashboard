'use strict';
var fs = require("fs");
var async = require("async");

var utils = require("../../../utils/utils.js");

var colls = {
	git: 'git_accounts',
	services: 'services',
	daemons: 'daemons',
	staticContent: 'staticContent',
	catalog: 'catalogs',
	resources: 'resources',
	analytics: 'analytics'
};

var helpers = {
	/**
	 * Chech if analytics is configured and return its cluster information.
	 * @param soajs
	 * @param context
	 * @param model
	 * @param cb
	 */
	getAnalyticsEsInfo: function (soajs, config, context, model, cb) {

		let combo = {};
		combo.collection = colls.analytics;
		combo.conditions = {
			"_type": "settings"
		};

		model.findEntry(soajs, combo, (error, settings) => {
			utils.checkErrorReturn(soajs, cb, {config: config, error: error}, () =>{
				let es_analytics_db;
				if (settings && settings.elasticsearch && settings.elasticsearch.db_name && settings.elasticsearch.db_name !== '') {
					es_analytics_db = settings.elasticsearch.db_name;
				}

				let envRecord = soajs.registry;

				let analyticsCluster;
				if(es_analytics_db && envRecord.coreDB[es_analytics_db]){
					analyticsCluster = envRecord.coreDB[es_analytics_db];
				}

				if (!analyticsCluster) return cb();

				context.variables["$SOAJS_ANALYTICS_ES_NB"] = analyticsCluster.servers.length;
				if (analyticsCluster.credentials) {
					if (analyticsCluster.credentials.username) {
						context.variables['$SOAJS_ANALYTICS_ES_USERNAME'] = analyticsCluster.credentials.username;
					}
					if (analyticsCluster.credentials.password) {
						context.variables['$SOAJS_ANALYTICS_ES_PASSWORD'] = analyticsCluster.credentials.password;
					}
				}
				async.eachOf(analyticsCluster.servers, (oneServer, index, callback) => {
					context.variables["$SOAJS_ANALYTICS_ES_IP_" + (index + 1)] = oneServer.host;
					context.variables["$SOAJS_ANALYTICS_ES_PORT_" + (index + 1)] = oneServer.port;
					return callback();
				}, cb);
			});
		});
	},

	/**
	 * check if there are any docker or kubernetes exposed ports and how they are configured
	 * @param context
	 * @param config
	 * @param cbMain
	 * @param cb
	 * @returns {*}
	 */
	checkPort: function (context, config, cbMain, cb) {
		var deployType = context.envRecord.deployer.selected.split('.')[1];
		if (deployType !== 'kubernetes') {
			return cb();
		}
		if (!context.catalog.recipe.deployOptions || !context.catalog.recipe.deployOptions.ports || context.catalog.recipe.deployOptions.ports.length === 0) {
			return cb();
		}

		var ports = context.catalog.recipe.deployOptions.ports;
		async.each(ports, function (onePort, callback) {
			if (!onePort.published) {
				return callback();
			}

			if (onePort.published > 30000) {
				onePort.published -= 30000;
			}

			if (onePort.published < config.kubeNginx.minPort || onePort.published > config.kubeNginx.maxPort) {
				return callback({wrongPort: onePort});
			}

			return callback();
		}, function (error) {
			if (error && error.wrongPort) {
				var errMsg = config.errors[824];
				errMsg = errMsg.replace("%PORTNUMBER%", error.wrongPort.published);
				errMsg = errMsg.replace("%MINNGINXPORT%", config.kubeNginx.minPort);
				errMsg = errMsg.replace("%MAXNGINXPORT%", config.kubeNginx.maxPort);
				return cbMain({"code": 824, "msg": errMsg});
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
					context.ports = context.catalog.recipe.deployOptions.ports = updatedPorts;
					return cb();
				});
			}
		});
	},

	/**
	 * Get activated git record from data store
	 *
	 * @param {Object} soajs
	 * @param {Object} repo
	 * @param {Callback Function} cb
	 */
	getGitRecord: function (soajs, repo, BL, cb) {
		var opts = {
			collection: colls.git,
			conditions: {'repos.name': repo},
			fields: {
				provider: 1,
				domain: 1,
				token: 1,
				'repos.$': 1
			}
		};

		BL.model.findEntry(soajs, opts, cb);
	},
	/**
	 * map computed env variables into catalog recipe env variables
	 * @param context
	 * @param soajs
	 * @param config
	 * @param cb
	 * @returns {*}
	 */
	computeCatalogEnvVars: function (context, soajs, config, cb) {
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
				if (soajs.inputmaskData.custom &&
					soajs.inputmaskData.custom.env &&
					soajs.inputmaskData.custom.env[oneEnvName]) {
					value = soajs.inputmaskData.custom.env[oneEnvName];
				}

				if (value) {
					result.push(oneEnvName + '=' + value);
				}
				else {
					return callback({type: 'userInput', name: oneEnvName});
				}
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
					if (oneEnv.value && context.variables[oneEnv.value]) {
						result.push(oneEnvName + '=' + context.variables[oneEnv.value]);
					}
				}
			}
			return callback(null, result);
		}, cb);
	},
	/**
	 * Get environment record and extract cluster information from it
	 *
	 * @param {Object} soajs
	 * @param {Callback Function} cb
	 */
	getDashDbInfo: function (soajs, cb) {
		let envRecord = soajs.registry;
		let data;

		let cluster = envRecord.coreDB.provision;
		data = {
			mongoDbs: cluster.servers,
			mongoCred: cluster.credentials,
			clusterInfo: cluster,
			prefix: envRecord.coreDB.provision.prefix
		};
		
		return cb(null, data);
	},

	/**
	 * function that returns a cluster resource based on its name
	 * @param {Object} soajs
	 * @param {Object} name
	 * @param {Function} cb
	 */
	getClusterResource: function (soajs, BL, name, cb) {
		BL.model.findEntry(soajs, {
			collection: colls.resources,
			conditions: {
				"name": name,
				"type": "cluster",
				locked: true,
				plugged: true,
				shared: true
			}
		}, cb);
	},

	/**
	 * function that calls the drivers and deploys a service/container
	 *
	 * @param {Object} config
	 * @param {Object} opts
	 * @param {Object} soajs
	 * @param {Object} registry
	 * @param {Response} res
	 *
	 */
	deployContainer: function (config, context, soajs, deployer, BL, cbMain) {
		// console.log(JSON.stringify(context, null, 2));

		var options = context.options;
		var platform = context.platform;

		function verifyReplicationMode(soajs) {
			if (soajs.inputmaskData.deployConfig.isKubernetes) {
				if (soajs.inputmaskData.deployConfig.replication.mode === 'replicated') return "deployment";
				else if (soajs.inputmaskData.deployConfig.replication.mode === 'global') return "daemonset";
				else return soajs.inputmaskData.deployConfig.replication.mode
			}

			return soajs.inputmaskData.deployConfig.replication.mode
		}

		function createService(cb) {
			options.params = context.serviceParams;
			soajs.log.debug("Creating service with deployer: " + JSON.stringify(options.params));
			deployer.deployService(options, function (error, data) {
				utils.checkErrorReturn(soajs, cbMain, {config: config, error: error}, cb);
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
				utils.checkErrorReturn(soajs, cbMain, {config: config, error: error}, cb);
			});
		}

		function buildAvailableVariables() {
			var variables = {
				'$SOAJS_ENV': context.envRecord.code.toLowerCase(),
				'$SOAJS_DEPLOY_HA': '$SOAJS_DEPLOY_HA', // field computed at the driver level
				'$SOAJS_HA_NAME': '$SOAJS_HA_NAME' // field computed at the driver level
			};

			for (var i in context.variables) {
				variables[i] = context.variables[i];
			}

			return variables;
		}

		function constructDeployerParams(serviceName) {
			if (!soajs.inputmaskData.action || soajs.inputmaskData.action !== 'rebuild') {
				//settings replication is only applicable in deploy operations, not when rebuilding
				soajs.inputmaskData.deployConfig.replication.mode = verifyReplicationMode(soajs);
			}

			var image = '', iPrefix, iName, iTag;
			if (context.catalog.recipe.deployOptions.image.prefix) {
				image += context.catalog.recipe.deployOptions.image.prefix + '/';
				iPrefix = context.catalog.recipe.deployOptions.image.prefix;
			}

			image += context.catalog.recipe.deployOptions.image.name;
			iName = context.catalog.recipe.deployOptions.image.name;

			if (context.catalog.recipe.deployOptions.image.tag) {
				image += ':' + context.catalog.recipe.deployOptions.image.tag;
				iTag = context.catalog.recipe.deployOptions.image.tag;
			}

			if (soajs.inputmaskData.custom && soajs.inputmaskData.custom.image && soajs.inputmaskData.custom.image.name) {
				image = '';

				if (soajs.inputmaskData.custom.image.prefix) {
					image += soajs.inputmaskData.custom.image.prefix + '/';
					iPrefix = soajs.inputmaskData.custom.image.prefix;
				}

				image += soajs.inputmaskData.custom.image.name;
				iName = soajs.inputmaskData.custom.image.name;

				if (soajs.inputmaskData.custom.image.tag) {
					image += ':' + soajs.inputmaskData.custom.image.tag;
					iTag = soajs.inputmaskData.custom.image.tag;
				}
			}

			var serviceParams = {
				"env": context.envRecord.code.toLowerCase(),
				"id": serviceName.toLowerCase(),
				"name": serviceName.toLowerCase(),
				"image": image,
				"imagePullPolicy": context.catalog.recipe.deployOptions.image.pullPolicy || '',
				"labels": {
					"soajs.env.code": context.envRecord.code.toLowerCase(),
					"soajs.service.mode": (soajs.inputmaskData.deployConfig) ? soajs.inputmaskData.deployConfig.replication.mode : null, //replicated || global for swarm, deployment || daemonset for kubernetes
					"soajs.catalog.id": context.catalog._id.toString()
				},
				"memoryLimit": ((soajs.inputmaskData.deployConfig) ? soajs.inputmaskData.deployConfig.memoryLimit : null),
				"cpuLimit": ((soajs.inputmaskData.deployConfig) ? soajs.inputmaskData.deployConfig.cpuLimit : null),
				"replication": {
					"mode": ((soajs.inputmaskData.deployConfig) ? soajs.inputmaskData.deployConfig.replication.mode : null)
				},
				"version": parseFloat(soajs.inputmaskData.custom.version) || 1,
				"containerDir": config.imagesDir,
				"restartPolicy": {
					"condition": "any",
					"maxAttempts": 5
				},
				"network": ((platform === 'docker') ? config.network : ''),
				"ports": context.ports
			};

			if (soajs.inputmaskData.autoScale) {
				serviceParams.autoScale = {
					id: soajs.inputmaskData.autoScale.id,
					type: soajs.inputmaskData.autoScale.type,
					min: soajs.inputmaskData.autoScale.replicas.min,
					max: soajs.inputmaskData.autoScale.replicas.max,
					metrics: soajs.inputmaskData.autoScale.metrics
				};
			}

			if (context.catalog.v) {
				serviceParams.labels["soajs.catalog.v"] = context.catalog.v.toString();
			}

			if (iPrefix) serviceParams.labels['service.image.prefix'] = iPrefix;
			if (iName) serviceParams.labels['service.image.name'] = iName;
			if (iTag) serviceParams.labels['service.image.tag'] = iTag;

			if (['replicated', 'deployment'].indexOf(serviceParams.labels['soajs.service.mode']) !== -1) {
				serviceParams.labels["soajs.service.replicas"] = (soajs.inputmaskData.deployConfig) ? soajs.inputmaskData.deployConfig.replication.replicas : null; //if replicated how many replicas
				if (serviceParams.labels["soajs.service.replicas"]) {
					serviceParams.labels["soajs.service.replicas"] = serviceParams.labels["soajs.service.replicas"].toString();
				}
			}

			for (var oneLabel in context.labels) {
				serviceParams.labels[oneLabel] = context.labels[oneLabel];
			}

			//if a custom namespace is set in the catalog recipe, use it
			if (context.catalog.recipe.deployOptions.namespace) {
				serviceParams.namespace = context.catalog.recipe.deployOptions.namespace;
			}

			//Add readiness probe configuration if present, only for kubernetes deployments
			if (platform === 'kubernetes' && context.catalog.recipe && context.catalog.recipe.deployOptions && context.catalog.recipe.deployOptions.readinessProbe) {
				serviceParams.readinessProbe = context.catalog.recipe.deployOptions.readinessProbe;
			}

			//Add replica count in case of docker replicated service or kubernetes deployment
			if (soajs.inputmaskData.deployConfig && soajs.inputmaskData.deployConfig.replication.replicas) {
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
			if (serviceParams.command && context.serviceCmd) {
				if (!serviceParams.args) {
					serviceParams.args = [];
				}

				if (serviceParams.args[0] === '-c') {
					serviceParams.args.shift();
				}
				serviceParams.args = context.serviceCmd.concat(serviceParams.args);
				serviceParams.args = serviceParams.args.join(" && ");
				serviceParams.args = [serviceParams.args];
				serviceParams.args.unshift("-c");
			}

			//Add the user-defined volumes if any
			if (context.catalog.recipe.deployOptions && context.catalog.recipe.deployOptions.voluming) {
				serviceParams.voluming = context.catalog.recipe.deployOptions.voluming || {};
			}

			return serviceParams;
		}

		context.serviceParams = constructDeployerParams(context.name);
		context.variables = buildAvailableVariables();

		helpers.computeCatalogEnvVars(context, soajs, config, function (error, variables) {
			if (error) {
				var errorMessage = config.errors[911];
				errorMessage = errorMessage.replace('%ENV_NAME%', error.name);
				errorMessage = errorMessage.replace('%ENV_TYPE%', error.type);
				return cbMain({code: 911, msg: errorMessage});
			}

			context.serviceParams.variables = variables;
			if (soajs.inputmaskData.action && soajs.inputmaskData.action === 'analytics') {
				return cbMain(null, context.serviceParams)
			}
			if (!soajs.inputmaskData.action || soajs.inputmaskData.action !== 'rebuild') {
				createService(function () {
					return cbMain(null, true);
				});
			}
			else {
				rebuildService(function () {
					return cbMain(null, true);
				});
			}
		});
	}
};

module.exports = helpers;
