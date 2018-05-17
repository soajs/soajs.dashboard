'use strict';
var async = require("async");
var utils = require("../../../utils/utils.js");

var colls = {
	git: 'git_accounts',
	services: 'services',
	daemons: 'daemons',
	staticContent: 'staticContent',
	catalog: 'catalogs',
	resources: 'resources',
	environment: 'environment'
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
			conditions: {'repos.name': repo},
			fields: {
				provider: 1,
				owner: 1,
				domain: 1,
				token: 1,
				'repos.$': 1
			}
		};
		BL.model.findEntry(soajs, opts, cb);
	},
	
	/**
	 * Get environment record and extract cluster information from it
	 *
	 * @param {Object} soajs
	 * @param {Object} BL
	 * @param {Function} cb
	 */
	getDashDbInfo: function (soajs, BL, cb) {
		let envRecord = soajs.registry;
		let data;
		
		let cluster = envRecord.coreDB.provision;
		data = {
			mongoDbs: cluster.servers,
			mongoCred: cluster.credentials,
			clusterInfo: cluster,
			prefix: envRecord.coreDB.provision.prefix
		};
		
		var switchedConnection = BL.model.switchConnection(soajs);
		if (switchedConnection) {
			if (typeof  switchedConnection === 'object' && Object.keys(switchedConnection).length > 0) {
				data.prefix = switchedConnection.prefix;
				data.mongoCred = switchedConnection.credentials;
				data.mongoDbs = switchedConnection.servers;
				data.clusterInfo = switchedConnection;
			}
		}
		
		return cb(null, data);
	},
	
	/**
	 * map computed env variables into catalog recipe env variables
	 * @param context
	 * @param soajs
	 * @param config
	 * @param cb
	 * @returns {*}
	 */
	// computeCatalogEnvVars: function (context, soajs, config, cb) {
	// 	// context.catalog.recipe.buildOptions.env <- read environment variables config
	// 	// context.variables <- replace computed values from this object
	// 	// context.serviceParams.variables <- push final list of values to this array
	// 	if (!context.catalog.recipe.buildOptions || !context.catalog.recipe.buildOptions.env || Object.keys(context.catalog.recipe.buildOptions.env).length === 0) {
	// 		return cb(null, []);
	// 	}
	//
	// 	//based on the catalog inputs in the recipe
	// 	var catalogEnvs = Object.keys(context.catalog.recipe.buildOptions.env);
	// 	async.concat(catalogEnvs, function (oneEnvName, callback) {
	// 		var oneEnv = context.catalog.recipe.buildOptions.env[oneEnvName];
	// 		var result = [];
	// 		// if env variable is of type static, just set its value and return
	// 		if (oneEnv.type === 'static') {
	// 			result.push(oneEnvName + '=' + oneEnv.value);
	// 		}
	// 		// if env variable is of type userInput, get value from request body, if not found see use default value
	// 		else if (oneEnv.type === 'userInput') {
	// 			var value = null;
	//
	// 			// if user specified value in request body, overwrite default with the new value
	// 			if (soajs.inputmaskData.custom &&
	// 				soajs.inputmaskData.custom.env &&
	// 				soajs.inputmaskData.custom.env[oneEnvName]) {
	// 				value = soajs.inputmaskData.custom.env[oneEnvName];
	// 			}
	//
	// 			if (value) {
	// 				result.push(oneEnvName + '=' + value);
	// 			}
	// 		}
	// 		else if (oneEnv.type === 'computed') {
	// 			// if computed value is dynamic, collect all applicable values and set them
	// 			if (config.HA.dynamicCatalogVariables.indexOf(oneEnv.value) !== -1) {
	// 				var nVariableName = oneEnv.value.replace(/_N$/, ''), nCount = 1;
	// 				var regex = new RegExp(nVariableName.replace("$", "\\$") + '_[0-9]+');
	// 				Object.keys(context.variables).forEach(function (oneVar) {
	// 					if (oneVar.match(regex)) {
	// 						result.push(oneEnvName + '_' + nCount++ + '=' + context.variables[oneVar]);
	// 					}
	// 				});
	// 			}
	// 			else {
	// 				if (oneEnv.value && context.variables[oneEnv.value]) {
	// 					result.push(oneEnvName + '=' + context.variables[oneEnv.value]);
	// 				}
	// 			}
	// 		}
	// 		return callback(null, result);
	// 	}, cb);
	// },

	/**
	 * function that calls the drivers and deploys a service/container
	 *
	 * @param {Object} config
	 * @param {Object} context
	 * @param {Object} soajs
	 * @param {Response} res
	 *
	 */
	// deployContainer: function (config, context, req, soajs, deployer, BL, cbMain) {
	// 	var options = context.options;
	// 	var platform = context.platform;
	//
	// 	function verifyReplicationMode(soajs) {
	//
	// 		let isKubernetes =(context.envRecord.deployer && context.envRecord.deployer.selected.includes(".kubernetes."));
	// 		soajs.inputmaskData.deployConfig.isKubernetes = isKubernetes;
	//
	// 		if (soajs.inputmaskData.deployConfig.isKubernetes) {
	// 			if (soajs.inputmaskData.deployConfig.replication.mode === 'replicated') return "deployment";
	// 			else if (soajs.inputmaskData.deployConfig.replication.mode === 'global') return "daemonset";
	// 			else return soajs.inputmaskData.deployConfig.replication.mode
	// 		}
	//
	// 		return soajs.inputmaskData.deployConfig.replication.mode
	// 	}
	//
	// 	function createService(cb) {
	// 		options.params = context.serviceParams;
	// 		let mode = options.params.replication.mode;
	// 		soajs.log.debug("Creating service with deployer: " + JSON.stringify(options.params));
	// 		deployer.execute({'type': 'container', 'driver': options.strategy}, 'deployService', options, (error, data) =>{
	// 			utils.checkErrorReturn(soajs, cbMain, { config: config, error: error }, function() {
	// 				options.params = {
	// 					id: data.id,
	// 					mode: mode,
	// 					excludeTasks: false
	// 				};
	// 				/**
	// 				 * This timeout is set to ensure the response returned is full
	// 				 */
	// 				setTimeout(function(){
	// 					deployer.execute({'type': 'container', 'driver': options.strategy}, 'inspectService', options, (error, record) =>{
	// 						utils.checkErrorReturn(soajs, cbMain, { config: config, error: error }, function() {
	// 							return cb(null, record);
	// 						});
	// 					});
	// 				},1500);
	// 			});
	// 		});
	// 	}
	//
	// 	function rebuildService(cb) {
	// 		options.params = {
	// 			id: soajs.inputmaskData.serviceId,
	// 			name: soajs.inputmaskData.serviceId,
	// 			mode: soajs.inputmaskData.mode, //NOTE: only required for kubernetes driver
	// 			action: soajs.inputmaskData.action,
	// 			newBuild: context.serviceParams,
	// 			labels: context.labels
	// 		};
	//
	// 		soajs.log.debug("Rebuilding service with deployer: " + JSON.stringify(options.params));
	// 		deployer.execute({'type': 'container', 'driver': options.strategy}, 'redeployService', options, (error) =>{
	// 			utils.checkErrorReturn(soajs, cbMain, { config: config, error: error }, function() {
	// 				options.params = {
	// 					id: soajs.inputmaskData.serviceId,
	// 					mode: soajs.inputmaskData.mode,
	// 					excludeTasks: false
	// 				};
	// 				/**
	// 				 * This timeout is set to ensure the response returned is full
	// 				 */
	// 				setTimeout(function(){
	// 					deployer.execute({'type': 'container', 'driver': options.strategy}, 'inspectService', options, (error, record) =>{
	// 						utils.checkErrorReturn(soajs, cbMain, { config: config, error: error }, function() {
	// 							return cb(null, record);
	// 						});
	// 					});
	// 				}, 1500);
	// 			});
	// 		});
	// 	}
	//
	// 	function buildAvailableVariables() {
	// 		var variables = {
	// 			'$SOAJS_ENV': context.envRecord.code.toLowerCase(),
	// 			'$SOAJS_DEPLOY_HA': '$SOAJS_DEPLOY_HA', // field computed at the driver level
	// 			'$SOAJS_HA_NAME': '$SOAJS_HA_NAME' // field computed at the driver level
	// 		};
	//
	// 		for (var i in context.variables) {
	// 			variables[i] = context.variables[i];
	// 		}
	//
	// 		return variables;
	// 	}
	//
	// 	function updateEnvSettings(deployedServiceDetails, cb) {
	// 		let maxAttempts = 30;
	// 		let currentAttempt = 1;
	//
	// 		if(context.catalog.type ==='nginx' || (context.catalog.subtype ==='nginx' && context.catalog.type ==='server')) {
	//
	// 			//if no ports are set in the recipe, do not perform check
	// 			if(!context.catalog || !context.catalog.recipe || !context.catalog.recipe.deployOptions || !context.catalog.recipe.deployOptions.ports || !Array.isArray(context.catalog.recipe.deployOptions.ports)) {
	// 				return cb();
	// 			}
	//
	// 			let publishedPort = false;
	// 			context.catalog.recipe.deployOptions.ports.forEach((onePublishedPort) => {
	// 				if(onePublishedPort.isPublished){
	// 					publishedPort = true;
	// 				}
	// 			});
	//
	// 			if(publishedPort){
	// 				computeProtocolAndPortsFromService(deployedServiceDetails);
	// 			}
	// 			return cb();
	// 		}
	// 		else {
	// 			//if no ports are set in the recipe, do not perform check
	// 			if(!context.catalog || !context.catalog.recipe || !context.catalog.recipe.deployOptions || !context.catalog.recipe.deployOptions.ports || !Array.isArray(context.catalog.recipe.deployOptions.ports)) {
	// 				return cb();
	// 			}
	//
	// 			let publishedPort = false;
	// 			context.catalog.recipe.deployOptions.ports.forEach((onePublishedPort) => {
	// 				if(onePublishedPort.isPublished){
	// 					publishedPort = true;
	// 				}
	// 			});
	//
	// 			if(publishedPort){
	// 				checkWithInfra(deployedServiceDetails, cb)
	// 			}
	// 			return cb();
	// 		}
	//
	// 		function computeProtocolAndPortsFromService(deployedService) {
	// 			let inspectOptions = Object.assign({}, context.options);
	// 			let mode = context.serviceParams.replication.mode;
	// 			inspectOptions.params = { id: deployedServiceDetails.service.id, mode: mode };
	//
	// 			deployer.execute({'type': 'container', 'driver': options.strategy}, 'inspectService', options, (error, deployedServiceDetails) =>{
	// 				if(error) {
	// 					req.soajs.log.error(error);
	// 				}
	// 				else {
	// 					let publishedPort = false;
	// 					deployedServiceDetails.service.ports.forEach((onePublishedPort) => {
	// 						if(onePublishedPort && onePublishedPort.published){
	// 							publishedPort = true;
	// 						}
	// 					});
	//
	// 					//no port allocated yet, restart in 2 seconds
	// 					if(!publishedPort && currentAttempt <= maxAttempts){
	// 						currentAttempt++;
	// 						setTimeout(() => {
	// 							computeProtocolAndPortsFromService(deployedServiceDetails);
	// 						}, 2000);
	// 					}
	// 					else{
	// 						let protocol = 'http';
	// 						let port = 80;
	//
	// 						for (let i = 0; i < deployedServiceDetails.service.env.length; i++) {
	// 							let oneEnv = deployedServiceDetails.service.env[i].split('=');
	// 							if(oneEnv[0] === 'SOAJS_NX_API_HTTPS' && ['true', '1'].indexOf(oneEnv[1]) !== -1) {
	// 								protocol = 'https';
	// 							}
	// 						}
	//
	// 						deployedServiceDetails.service.ports.forEach((onePort) => {
	// 							if(onePort.published){
	// 								//fi update
	// 								if(protocol === 'https' && onePort.target === 443){
	// 									port = onePort.published;
	// 								}
	// 								else if(protocol === 'http' && onePort.target === 80){
	// 									port = onePort.published;
	// 								}
	// 							}
	// 						});
	//
	//
	// 						//compare the above values with the current environment settings and update if required
	// 						if((!context.envRecord.protocol || (context.envRecord.protocol !== protocol)) || (!context.envRecord.port || (context.envRecord.port !== port))) {
	// 							let opts = {
	// 								collection: colls.environment,
	// 								conditions: { code: context.envRecord.code.toUpperCase() },
	// 								fields: {
	// 									$set: {
	// 										protocol: protocol,
	// 										port: port
	// 									}
	// 								}
	// 							};
	// 							req.soajs.log.debug(`Updating Registry ${context.envRecord.code} with protocol ${protocol} and port ${port}`);
	// 							BL.model.updateEntry(soajs, opts, function(error) {
	// 								if(error){
	// 									req.soajs.log.error(error);
	// 								}
	// 								else{
	// 									checkWithInfra(deployedServiceDetails)
	// 								}
	// 							});
	// 						}
	// 						else {
	// 							req.soajs.log.debug(`No need to update.`);
	// 							checkWithInfra(deployedServiceDetails)
	// 						}
	// 					}
	// 				}
	// 			});
	// 		}
	// 	}
	//
	// 	function checkWithInfra(deployedServiceDetails, cb){
	// 		BL.model.findEntry(soajs, {
	// 			collection: 'infra',
	// 			conditions: {
	// 				"deployments.environments" : {$in: [context.envRecord.code.toUpperCase()] }
	// 			}
	// 		}, (error, infraRecord) => {
	// 			if(error){
	// 				soajs.log.error(error);
	// 			}
	// 			else{
	// 				let infraModuleFile = require("../infra/index.js");
	// 				infraModuleFile.init('mongo', (error, infraModule) => {
	// 					soajs.inputmaskData = {
	// 						id: infraRecord._id.toString(),
	// 						name: deployedServiceDetails.service.labels['soajs.service.name'],
	// 						version: deployedServiceDetails.service.labels["soajs.service.version"],
	// 						type: deployedServiceDetails.service.labels["soajs.service.type"],
	// 						ports: deployedServiceDetails.service.ports,
	// 						envCode: context.envRecord.code.toUpperCase(),
	// 						soajs_project: soajs.inputmaskData.soajs_project || 'local'
	// 					};
	// 					soajs.log.debug("Calling Drivers to publish ports", soajs.inputmaskData.name, soajs.inputmaskData.ports);
	// 					infraModule.publishPorts(config, soajs, deployer, (error) => {
	// 						if(error){
	// 							soajs.log.error(error);
	// 						}
	// 					})
	// 				});
	// 			}
	// 		});
	// 	}
	//
	// 	function constructDeployerParams(serviceName) {
	// 		if (!soajs.inputmaskData.action || soajs.inputmaskData.action !== 'rebuild') {
	// 			//settings replication is only applicable in deploy operations, not when rebuilding
	// 			soajs.inputmaskData.deployConfig.replication.mode = verifyReplicationMode(soajs);
	// 		}
	//
	// 		var image = '', iPrefix, iName, iTag;
	// 		if (context.catalog.recipe.deployOptions.image.prefix) {
	// 			image += context.catalog.recipe.deployOptions.image.prefix + '/';
	// 			iPrefix = context.catalog.recipe.deployOptions.image.prefix;
	// 		}
	//
	// 		image += context.catalog.recipe.deployOptions.image.name;
	// 		iName = context.catalog.recipe.deployOptions.image.name;
	//
	// 		if (context.catalog.recipe.deployOptions.image.tag) {
	// 			image += ':' + context.catalog.recipe.deployOptions.image.tag;
	// 			iTag = context.catalog.recipe.deployOptions.image.tag;
	// 		}
	//
	// 		if (soajs.inputmaskData.custom && soajs.inputmaskData.custom.image && soajs.inputmaskData.custom.image.name) {
	// 			image = '';
	//
	// 			if (soajs.inputmaskData.custom.image.prefix) {
	// 				image += soajs.inputmaskData.custom.image.prefix + '/';
	// 				iPrefix = soajs.inputmaskData.custom.image.prefix;
	// 			}
	//
	// 			image += soajs.inputmaskData.custom.image.name;
	// 			iName = soajs.inputmaskData.custom.image.name;
	//
	// 			if (soajs.inputmaskData.custom.image.tag) {
	// 				image += ':' + soajs.inputmaskData.custom.image.tag;
	// 				iTag = soajs.inputmaskData.custom.image.tag;
	// 			}
	// 		}
	//
	// 		var serviceParams = {
	// 			"env": context.envRecord.code.toLowerCase(),
	// 			"id": serviceName.toLowerCase(),
	// 			"name": serviceName.toLowerCase(),
	// 			"image": image,
	// 			"imagePullPolicy": context.catalog.recipe.deployOptions.image.pullPolicy || '',
	// 			"labels": {
	// 				"soajs.env.code": context.envRecord.code.toLowerCase(),
	// 				"soajs.service.mode": (soajs.inputmaskData.deployConfig) ? soajs.inputmaskData.deployConfig.replication.mode : null, //replicated || global for swarm, deployment || daemonset for kubernetes
	// 				"soajs.catalog.id": context.catalog._id.toString()
	// 			},
	// 			"memoryLimit": ((soajs.inputmaskData.deployConfig) ? soajs.inputmaskData.deployConfig.memoryLimit : null),
	// 			"cpuLimit": ((soajs.inputmaskData.deployConfig) ? soajs.inputmaskData.deployConfig.cpuLimit : null),
	// 			"replication": {
	// 				"mode": ((soajs.inputmaskData.deployConfig) ? soajs.inputmaskData.deployConfig.replication.mode : null)
	// 			},
	// 			"version": parseFloat(soajs.inputmaskData.custom.version) || 1,
	// 			"restartPolicy": {
	// 				"condition": "any",
	// 				"maxAttempts": 5
	// 			},
	// 			"network": ((platform === 'docker') ? config.network : ''),
	// 			"ports": context.ports
	// 		};
	// 		if(serviceParams.memoryLimit/1048576 < 4){
	// 			serviceParams.memoryLimit = serviceParams.memoryLimit * 1048576;
	// 		}
	//
	// 		if (soajs.inputmaskData.autoScale) {
	// 			serviceParams.autoScale = {
	// 				id: soajs.inputmaskData.autoScale.id,
	// 				type: soajs.inputmaskData.autoScale.type,
	// 				min: soajs.inputmaskData.autoScale.replicas.min,
	// 				max: soajs.inputmaskData.autoScale.replicas.max,
	// 				metrics: soajs.inputmaskData.autoScale.metrics
	// 			};
	// 		}
	//
	// 		if (context.catalog.v) {
	// 			serviceParams.labels["soajs.catalog.v"] = context.catalog.v.toString();
	// 		}
	//
	// 		if (iPrefix) serviceParams.labels['service.image.prefix'] = iPrefix;
	// 		if (iName) serviceParams.labels['service.image.name'] = iName;
	// 		if (iTag) serviceParams.labels['service.image.tag'] = iTag;
	//
	// 		if (['replicated', 'deployment'].indexOf(serviceParams.labels['soajs.service.mode']) !== -1) {
	// 			serviceParams.labels["soajs.service.replicas"] = (soajs.inputmaskData.deployConfig) ? soajs.inputmaskData.deployConfig.replication.replicas : null; //if replicated how many replicas
	// 			if (serviceParams.labels["soajs.service.replicas"]) {
	// 				serviceParams.labels["soajs.service.replicas"] = serviceParams.labels["soajs.service.replicas"].toString();
	// 			}
	// 		}
	//
	// 		for (var oneLabel in context.labels) {
	// 			serviceParams.labels[oneLabel] = context.labels[oneLabel];
	// 		}
	//
	// 		//if a custom namespace is set in the catalog recipe, use it
	// 		if (context.catalog.recipe.deployOptions.namespace) {
	// 			serviceParams.namespace = context.catalog.recipe.deployOptions.namespace;
	// 		}
	//
	// 		//Add readiness probe configuration if present, only for kubernetes deployments
	// 		if (platform === 'kubernetes' && context.catalog.recipe && context.catalog.recipe.deployOptions && context.catalog.recipe.deployOptions.readinessProbe && Object.keys(context.catalog.recipe.deployOptions.readinessProbe).length > 0) {
	// 			serviceParams.readinessProbe = context.catalog.recipe.deployOptions.readinessProbe;
	// 		}
	//
	// 		//Add replica count in case of docker replicated service or kubernetes deployment
	// 		if (soajs.inputmaskData.deployConfig && soajs.inputmaskData.deployConfig.replication.replicas) {
	// 			serviceParams.replication.replicas = soajs.inputmaskData.deployConfig.replication.replicas;
	// 		}
	// 		//Override the default docker network of the user wants to use a custom overlay network
	// 		if (platform === 'docker' && context.catalog.recipe.deployOptions.container && context.catalog.recipe.deployOptions.container.network) {
	// 			serviceParams.network = context.catalog.recipe.deployOptions.container.network;
	// 		}
	//
	// 		if(platform === 'docker' && context.dockerServiceSecrets && Array.isArray(context.dockerServiceSecrets) && context.dockerServiceSecrets.length > 0){
	// 			serviceParams.secrets = context.dockerServiceSecrets;
	// 		}
	//
	// 		//Override the default container working directory if the user wants to set a custom path
	// 		if (context.catalog.recipe.deployOptions.container && context.catalog.recipe.deployOptions.container.workingDir) {
	// 			serviceParams.containerDir = context.catalog.recipe.deployOptions.container.workingDir;
	// 		}
	//
	// 		//Override the default container restart policy if set
	// 		if (context.catalog.recipe.deployOptions.restartPolicy) {
	// 			serviceParams.restartPolicy.condition = context.catalog.recipe.deployOptions.restartPolicy.condition;
	// 			if (context.catalog.recipe.deployOptions.restartPolicy.maxAttempts) {
	// 				serviceParams.restartPolicy.maxAttempts = context.catalog.recipe.deployOptions.restartPolicy.maxAttempts;
	// 			}
	// 		}
	//
	// 		//Add the commands to execute when running the containers
	// 		if (context.catalog.recipe.buildOptions && context.catalog.recipe.buildOptions.cmd && context.catalog.recipe.buildOptions.cmd.deploy && context.catalog.recipe.buildOptions.cmd.deploy.command) {
	// 			serviceParams.command = context.catalog.recipe.buildOptions.cmd.deploy.command;
	// 		}
	//
	// 		//Add the command arguments
	// 		if (context.catalog.recipe.buildOptions && context.catalog.recipe.buildOptions.cmd && context.catalog.recipe.buildOptions.cmd.deploy && context.catalog.recipe.buildOptions.cmd.deploy.args) {
	// 			serviceParams.args = context.catalog.recipe.buildOptions.cmd.deploy.args;
	// 		}
	//
	// 		if (!serviceParams.args) {
	// 			serviceParams.args = [];
	// 		}
	//
	// 		let bashCCmd = false;
	// 		if (serviceParams.args[0] && serviceParams.args[0].trim() === '-c') {
	// 			bashCCmd = true;
	// 			serviceParams.args.shift();
	// 		}
	//
	// 		//If a service requires to run cmd commands before starting, get them from service record and add them
	// 		if (serviceParams.command && context.serviceCmd) {
	// 			serviceParams.args = context.serviceCmd.concat(serviceParams.args);
	// 		}
	//
	//
	// 		for (let i =0; i < serviceParams.args.length -1; i++){
	// 			serviceParams.args[i] = serviceParams.args[i].trim();
	// 		}
	//
	// 		serviceParams.args = serviceParams.args.join(" && ");
	// 		if (serviceParams.args){
	// 			serviceParams.args = [serviceParams.args];
	// 			if(bashCCmd){
	// 				serviceParams.args.unshift("-c");
	// 			}
	// 		}
	// 		if (serviceParams.args.length === 0 ){
	// 			delete serviceParams.args
	// 		}
	//
	// 		//Add the user-defined volumes if any
	// 		if (context.catalog.recipe.deployOptions && context.catalog.recipe.deployOptions.voluming) {
	// 			serviceParams.voluming = context.catalog.recipe.deployOptions.voluming || {};
	// 		}
	//
	// 		return serviceParams;
	// 	}
	//
	// 	context.serviceParams = constructDeployerParams(context.name);
	// 	context.variables = buildAvailableVariables();
	//
	// 	helpers.computeCatalogEnvVars(context, soajs, config, function (error, variables) {
	// 		if (error) {
	// 			var errorMessage = config.errors[911];
	// 			errorMessage = errorMessage.replace('%ENV_NAME%', error.name);
	// 			errorMessage = errorMessage.replace('%ENV_TYPE%', error.type);
	// 			return cbMain({code: 911, msg: errorMessage});
	// 		}
	//
	// 		context.serviceParams.variables = variables;
	// 		if (!soajs.inputmaskData.action || soajs.inputmaskData.action !== 'rebuild') {
	// 			createService(function (error, data) {
	// 				//error handled in function
	// 				updateEnvSettings(data, function() {
	// 					return cbMain(null, data);
	// 				});
	// 			});
	// 		}
	// 		else {
	// 			rebuildService(function (err, data) {
	// 				updateEnvSettings(data, function() {
	// 					return cbMain(null, data);
	// 				});
	// 			});
	// 		}
	// 	});
	// }
};

module.exports = helpers;
