'use strict';
var fs = require("fs");
var async = require("async");
var request = require("request");
var shortid = require('shortid');

var utils = require("../../utils/utils.js");
shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_');

var colls = {
	git: 'git_accounts',
	services: 'services',
	daemons: 'daemons',
	staticContent: 'staticContent',
	catalog: 'catalogs'
};

var helpers = {
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
			conditions: { 'repos.name': repo },
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
	computeCatalogEnvVars: function (context, soajs, config, BL, cb) {
		// context.catalog.recipe.buildOptions.env <- read environment variables config
		// context.variables <- replace computed values from this object
		// context.serviceParams.variables <- push final list of values to this array
		
		if (!context.catalog.recipe.buildOptions || !context.catalog.recipe.buildOptions.env || Object.keys(context.catalog.recipe.buildOptions.env).length === 0) {
			return cb(null, []);
		}
		
		var catalogEnvs = Object.keys(context.catalog.recipe.buildOptions.env);
		async.concat(catalogEnvs, function (oneEnvName, callback) {
			var oneEnv = context.catalog.recipe.buildOptions.env[ oneEnvName ];
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
					soajs.inputmaskData.custom.env[ oneEnvName ]) {
					value = soajs.inputmaskData.custom.env[ oneEnvName ];
				}
				
				if (value) result.push(oneEnvName + '=' + value);
				else return callback({ type: 'userInput', name: oneEnvName });
			}
			else if (oneEnv.type === 'computed') {
				// if computed value is dynamic, collect all applicable values and set them
				if (config.HA.dynamicCatalogVariables.indexOf(oneEnv.value) !== -1) {
					var nVariableName = oneEnv.value.replace(/_N$/, ''), nCount = 1;
					var regex = new RegExp(nVariableName.replace("$", "\\$") + '_[0-9]+');
					Object.keys(context.variables).forEach(function (oneVar) {
						if (oneVar.match(regex)) {
							result.push(oneEnvName + '_' + nCount++ + '=' + context.variables[ oneVar ]);
						}
					});
				}
				else {
					if (oneEnv.value && context.variables[ oneEnv.value ]) {
						result.push(oneEnvName + '=' + context.variables[ oneEnv.value ]);
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
	getDashDbInfo: function (soajs, BL, cb) {
		utils.getEnvironment(soajs, BL.model, 'DASHBOARD', function (error, envRecord) {
			if (error) {
				return cb(error);
			}
			
			var clusterName = envRecord.dbs.config.session.cluster;
			var data = {
				mongoDbs: envRecord.dbs.clusters[ clusterName ].servers,
				mongoCred: envRecord.dbs.clusters[ clusterName ].credentials,
				clusterInfo: envRecord.dbs.clusters[ clusterName ],
				dbConfig: envRecord.dbs.config
			};
			return cb(null, data);
		});
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
		
		function verifyReplicationMode (soajs) {
			if (soajs.inputmaskData.deployConfig.isKubernetes) {
				if (soajs.inputmaskData.deployConfig.replication.mode === 'replicated') return "deployment";
				else if (soajs.inputmaskData.deployConfig.replication.mode === 'global') return "daemonset";
				else return soajs.inputmaskData.deployConfig.replication.mode
			}
			
			return soajs.inputmaskData.deployConfig.replication.mode
		}
		
		function createService (cb) {
			options.params = context.serviceParams;
			soajs.log.debug("Creating service with deployer: " + JSON.stringify(options.params));
			deployer.deployService(options, function (error, data) {
				utils.checkErrorReturn(soajs, cbMain, { config: config, error: error }, cb);
			});
		}
		
		function rebuildService (cb) {
			options.params = {
				id: soajs.inputmaskData.serviceId,
				mode: soajs.inputmaskData.mode, //NOTE: only required for kubernetes driver
				action: soajs.inputmaskData.action,
				newBuild: context.serviceParams
			};
			
			soajs.log.debug("Rebuilding service with deployer: " + JSON.stringify(options.params));
			deployer.redeployService(options, function (error) {
				utils.checkErrorReturn(soajs, cbMain, { config: config, error: error }, cb);
			});
		}
		
		function buildAvailableVariables () {
			var variables = {
				'$SOAJS_ENV': context.envRecord.code.toLowerCase(),
				'$SOAJS_DEPLOY_HA': '$SOAJS_DEPLOY_HA', // field computed at the driver level
				'$SOAJS_HA_NAME': '$SOAJS_HA_NAME' // field computed at the driver level
			};
			
			for (var i in context.variables) {
				variables[ i ] = context.variables[ i ];
			}
			
			return variables;
		}
		
		function constructDeployerParams (serviceName) {
			if (!soajs.inputmaskData.action || soajs.inputmaskData.action !== 'rebuild') {
				//settings replication is only applicable in deploy operations, not when rebuilding
				soajs.inputmaskData.deployConfig.replication.mode = verifyReplicationMode(soajs);
			}
			
			var image = '';
			if (context.catalog.recipe.deployOptions.image.prefix) image += context.catalog.recipe.deployOptions.image.prefix + '/';
			image += context.catalog.recipe.deployOptions.image.name;
			if (context.catalog.recipe.deployOptions.image.tag) image += ':' + context.catalog.recipe.deployOptions.image.tag;
			
			if (soajs.inputmaskData.custom && soajs.inputmaskData.custom.image && soajs.inputmaskData.custom.image.name) {
				image = '';
				if (soajs.inputmaskData.custom.image.prefix) image += soajs.inputmaskData.custom.image.prefix + '/';
				image += soajs.inputmaskData.custom.image.name;
				if (soajs.inputmaskData.custom.image.tag) image += ':' + soajs.inputmaskData.custom.image.tag;
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
			
			if (context.catalog.v) {
				serviceParams.labels[ "soajs.catalog.v" ] = context.catalog.v.toString();
			}
			
			for (var oneLabel in context.labels) {
				serviceParams.labels[ oneLabel ] = context.labels[ oneLabel ];
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
				
				serviceParams.args = context.serviceCmd.concat(serviceParams.args);
				serviceParams.args = serviceParams.args.join(";");
				serviceParams.args = [ serviceParams.args ];
				
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
				var errorMessage = config.errors[ 911 ];
				errorMessage = errorMessage.replace('%ENV_NAME%', error.name);
				errorMessage = errorMessage.replace('%ENV_TYPE%', error.type);
				return cbMain({ code: 911, msg: errorMessage });
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
