'use strict';
var fs = require("fs");
var async = require("async");
var request = require("request");

var deployer = require("../utils/drivers/deployer.js");

function checkIfError(soajs, res, data, cb) {
	if (data.error) {
		if (typeof (data.error) === 'object' && (data.error.message || data.error.msg)) {
			soajs.log.error(data.error);
		}

		return res.jsonp(soajs.buildResponse({"code": data.code, "msg": data.config.errors[data.code]}));
	} else {
		if (cb) return cb();
	}
}

function getdeployerConfig(envRecord) {
	var deployerConfig = envRecord.deployer;
	if (!deployerConfig.type || !deployerConfig.selected) {
		return null;
	}
	var driver = deployerConfig.selected.split(".");

	for (var i = 0; i < driver.length; i++) {
		deployerConfig = deployerConfig[driver[i]];
	}

	if (driver[driver.length - 1] === 'socket') {
		if (!deployerConfig.socketPath) {
			return null;
		}
	}
	else {
		if (!deployerConfig.host || !deployerConfig.port || !deployerConfig.config) {
			return null;
		}
		if (Object.keys(deployerConfig.config).length === 0) {
			return null;
		}
	}

	deployerConfig.driver = {
		'type': envRecord.deployer.type,
		'driver': 'docker'
	};
	deployerConfig.selectedDriver = envRecord.deployer.selected.replace(driver[0] + '.', '').replace(/\./g, " - ");

	return deployerConfig;
}

function registerHost(soajs, res, model, config, data, deployerConfig, info, cb) {
	var document = {
		"cid": data.Id,
		"env": soajs.inputmaskData.envCode.toLowerCase(),
		"hostname": data.Name || data.name, //Config.Hostname,
		"type": info.type,
		"running": true,
		"provider": data.provider,
		"deployer": deployerConfig
	};

	model.insertContainer(soajs, document, function (error) {
		checkIfError(soajs, res, {config: config, error: error, code: 615}, function () {
			return cb();
		});
	});
}

function updateHostWithNetworkInfo(soajs, res, model, config, data, info, deployerConfig) {
	var ipValue;
	if (deployerConfig.config && deployerConfig.config.HostConfig && data.NetworkSettings && data.NetworkSettings.Networks && data.NetworkSettings.Networks[deployerConfig.config.HostConfig.NetworkMode]) {
		ipValue = data.NetworkSettings.Networks[deployerConfig.config.HostConfig.NetworkMode].IPAddress;
	} else {
		ipValue = data.NetworkSettings.IPAddress;
	}

	var newHost = {
		"version": soajs.inputmaskData.version,
		"env": soajs.inputmaskData.envCode.toLowerCase(),
		"name": info.name,
		"hostname": data.Name || data.name, //data.Config.Hostname
		"src": {
			"commit": soajs.inputmaskData.commit,
			"branch": soajs.inputmaskData.branch
		},
		"ip": ipValue
	};

	if (soajs.inputmaskData.grpConfName) {
		newHost.grpConfName = soajs.inputmaskData.grpConfName;
	}
	model.insertHost(soajs, newHost, function (error) {
		checkIfError(soajs, res, {config: config, error: error, code: 615}, function () {

			model.getHosts(soajs, soajs.inputmaskData.envCode, "controller", function (error, controllers) {
				checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {

					model.updateContainer(soajs, data.Id, data, function (error) {
						checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {

							return res.json(soajs.buildResponse(null, {
								'cid': data.Id,
								'hostname': newHost.hostname, //data.Config.Hostname,
								"ip": ipValue,
								"controllers": controllers
							}));
						});
					});
				});
			});
		});
	});
}

function deployContainerServiceOrDaemon(config, soajs, res, model, type) {
	var context = {
		name: '',
		origin: '',
		modelMethod : (type === 'service') ? "getService": "getDaemon"
	};

	function getEnvInfo(cb){
		model.getEnvironment(soajs, soajs.inputmaskData.envCode, function (error, envRecord) {
			checkIfError(soajs, res, {config: config, error: error || !envRecord, code: 600}, function () {
				checkIfError(soajs, res, {
					config: config,
					error: envRecord.deployer.type === 'manual',
					code: 618
				}, function(){
					context.envRecord = envRecord;
					return cb();
				});
			});
		});
	}

	function getDashboardConnection(cb){
		getDashDbInfo(model, soajs, function (error, data) {
			checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
				context.mongoDbs = data.mongoDbs;
				context.mongoCred = data.mongoCred;
				context.clusterInfo = data.clusterInfo;

				context.origin = context.name = soajs.inputmaskData.name;
				if (soajs.inputmaskData.gcName && type === 'service') {
					context.name = soajs.inputmaskData.gcName;
					context.origin = "gcs";
				}
				return cb();
			});
		});
	}

	function getGitInfo(cb){
		var repoLabel = soajs.inputmaskData.owner + '/' + soajs.inputmaskData.repo;
		model.getGitAccounts(soajs, repoLabel, function (error, accountRecord) {
			checkIfError(soajs, res, {
				config: config,
				error: error || !accountRecord,
				code: 600
			}, function () {
				context.accountRecord = accountRecord;
				return cb();
			});
		});
	}

	function getServiceDaemonInfo(cb){
		model[context.modelMethod](soajs, {name: context.name}, function (error, dbRecord) {
			checkIfError(soajs, res, {
				config: config,
				error: error || !dbRecord,
				code: 600
			}, function () {
				context.dbRecord = dbRecord;
				return cb();
			});
		});
	}

	function constructDeployerParams(cb){
		var dockerParams = {
			"env": soajs.inputmaskData.envCode.toLowerCase(),
			"name": context.name,
			"image": config.images.services,
			"variables": [
				"NODE_ENV=production",
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
				'cd /opt/soajs/FILES/deployer/; ./soajsDeployer.sh -T service -X deploy -G ' + context.accountRecord.provider
			]
		};

		if (soajs.inputmaskData.haService) {
			dockerParams.variables.push('SOAJS_ENV=' + soajs.inputmaskData.envCode.toLowerCase());
		}

		if (!soajs.inputmaskData.haService) {
			dockerParams.variables.push("SOAJS_SRV_AUTOREGISTERHOST=false");
		}

		if (soajs.inputmaskData.useLocalSOAJS) {
			dockerParams.Cmd[2] = dockerParams.Cmd[2] + ' -L'
		}

		if(type === 'daemon'){
			dockerParams['variables'].push("SOAJS_DAEMON_GRP_CONF=" + soajs.inputmaskData.grpConfName);
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

	function initDeployer(cb){
		var deployerConfig = getdeployerConfig(context.envRecord);
		checkIfError(soajs, res, {
			config: config,
			error: !deployerConfig,
			code: 743
		}, function () {
			context.deployerConfig = deployerConfig;
			return cb();
		});
	}

	function createContainer(cb){
		soajs.log.debug("Calling create container with params:", JSON.stringify(context.deployerConfig), JSON.stringify(context.dockerParams));
		deployer.createContainer(context.deployerConfig, context.dockerParams, model.getDB(), function (error, data) {
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

	function createHAService(cb) {
		context.deployerConfig.envCode = context.envRecord.code;
		soajs.log.debug("Creating HA service with params: " + JSON.stringify(context.deployerConfig), JSON.stringify(context.haServiceParams));
		deployer.deployHAService(context.deployerConfig, context.haServiceParams, model.getDB(), function (error, data) {
			checkIfError(soajs, res, {config: config, error: error, code: (error && error.code === 741) ? error.code : 615}, function () {
				context.data = data;
				return cb();
			});
		});
	}

	function registerHostInfo(cb){
		soajs.log.debug("Container Created, starting container with params:", JSON.stringify(context.deployerConfig), JSON.stringify(context.data));
		context.info = {
			type: type,
			name: context.name
		};
		context.data.provider = context.accountRecord.provider;
		registerHost(soajs, res, model, config, context.data, context.deployerConfig, context.info, cb);
	}

	function startContainer(cb){
		deployer.start(context.deployerConfig, context.data.Id, model.getDB(), function (error, data) {
			checkIfError(soajs, res, {
				config: config,
				error: error,
				code: 615
			}, function () {
				context.data = data;
				soajs.log.debug("Container started, saving information in core_provision", JSON.stringify(context.data));
				return cb();
			});
		});
	}

	function updateHost(){
		updateHostWithNetworkInfo(soajs, res, model, config, context.data, context.info, context.deployerConfig);
	}

	getEnvInfo(function(){
		getDashboardConnection(function(){
			getGitInfo(function(){
				getServiceDaemonInfo(function(){
					constructDeployerParams(function(){
						initDeployer(function(){
							if (!soajs.inputmaskData.haService) {
								createContainer(function(){
									registerHostInfo(function(){
										startContainer(function(){
											updateHost();
										});
									});
								});
							}
							else {
								var haServiceParams = {
									"env": context.dockerParams.env,
									"Name": context.dockerParams.env + '_' + context.dockerParams.name + '_v' + soajs.inputmaskData.version,
								    "TaskTemplate": {
								        "ContainerSpec": {
								            "Image": config.images.services,
								            "Env": context.dockerParams.variables,
								            "Dir": config.imagesDir,
								            "Command": [context.dockerParams.Cmd[0]],
								            "Args": context.dockerParams.Cmd.splice(1),
								            "Mounts": [
										        {
										            "Type": "bind",
										            "ReadOnly": true,
										            "Source": "/var/run/docker.sock",
										            "Target": "/var/run/docker.sock",
										        }
										    ]
								        },
								        "RestartPolicy": {
								            "Condition": "any",
								            "MaxAttempts": 5
								        }
								    },
								    "Mode": {
								        "Replicated": {
								            "Replicas": soajs.inputmaskData.haCount
								        }
								    },
								    "UpdateConfig": {
								        "Delay": 500.0,
								        "Parallelism": 2,
								        "FailureAction": "pause"
								    },
								    "Networks": [{ID: 'ingress'}],
								    "Labels": {
								        "soajs.env": context.dockerParams.env,
								        "soajs.service": context.dockerParams.name,
								        "soajs.service.group": context.dbRecord.group
								    }
								};

								haServiceParams.TaskTemplate.ContainerSpec.Env.push('SOAJS_DEPLOY_HA=true');
								context.haServiceParams = haServiceParams;
								createHAService(function () {
									var dockerRecords = [];
									for (var i = 0; i < soajs.inputmaskData.haCount; i++) {
										dockerRecords.push({
											"type": ((soajs.customData && soajs.customData.type) ? soajs.customData.type : 'service'),
											"env": context.dockerParams.env,
											"running": true,
											"recordType": "container",
											"deployer": context.deployerConfig,
											"cid": "",
											"hostname": "",
											"serviceName": context.dockerParams.env + '_' + context.dockerParams.name + '_v' + soajs.inputmaskData.version,
											"taskName": haServiceParams.Name + '.' + (i+1),
											"info": {}
										});
									}
									model.insertContainers(soajs, dockerRecords, function (error) {
										checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
											model.getHosts(soajs, soajs.inputmaskData.envCode, "controller", function (error, controllers) {
												checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
													return res.jsonp(soajs.buildResponse(null, {controllers: controllers}));
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
}

function getDashDbInfo(model, soajs, cb) {
	model.getDashboardEnvironment(soajs, function (error, envRecord) {
		if (error) {
			return cb(error);
		}

		var clusterName = envRecord.dbs.config.session.cluster;
		var data = {
			mongoDbs: envRecord.dbs.clusters[clusterName].servers,
			mongoCred: envRecord.dbs.clusters[clusterName].credentials,
			clusterInfo: envRecord.dbs.clusters[clusterName]
		};
		return cb(null, data);
	});
}

var BL = {
	model: null,

	"nginx": function(config, soajs, deployNewNginx, res){
		/*
		 1- get environment information
		 2- get running controllers
		 3- get nginx containers
		    3.1- if nginx > 0
		        3.1.1- get oneNginx container
		            3.1.1.1 - if new
		                 3.1.1.1.1- initialize deployer
						 3.1.1.1.2- construct deployer params
						 3.1.1.1.3- deploy nginx container
						 3.1.1.1.4- insert nginx container information
		            3.1.1.2 - if old
						 3.1.1.2.1- construct deployer params
						 3.1.1.2.2- exec nginx container
						 3.1.1.2.3- update nginx container information
	        3.2- if nginx === 0
		        3.2.1- get ui information
		        3.2.2- initialize deployer
		        3.2.3- construct deployer params
		        3.2.4- deploy nginx container
		        3.2.5- insert nginx container information
		 */
		var context = {};
		function getEnvInfo(cb){
			//from envCode, load env, get port and domain
			BL.model.getEnvironment(soajs, soajs.inputmaskData.envCode, function (err, envRecord) {
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

		function getRunningControllers(cb){
			BL.model.getContainers(soajs, context.envRecord.code, "controller", true, function (error, controllers) {
				checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {

					//no controllers found, no need to proceed
					if (!controllers || (controllers && controllers.length === 0)) {
						soajs.log.debug("No controllers found for environment: " + context.envRecord.code + ". No need to proceed.");
						return res.json(soajs.buildResponse(null, true));
					}
					else {
						BL.model.getHosts(soajs, context.envRecord.code, "controller", function (error, hostsData) {
							checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {

								controllers.forEach(function (oneController) {
									hostsData.forEach(function (oneHostData) {
										if (oneController.hostname === oneHostData.hostname) {
											oneController.ip = oneHostData.ip;
										}
									});
								});
								context.controllers = controllers;
								return cb();
							});
						});
					}
				});
			});
		}

		function getRunningNginxContainers(cb){
			BL.model.getContainers(soajs, context.envRecord.code, "nginx", true, function (error, nginxes) {
				checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
					if (nginxes && nginxes.length > 0) {
						context.nginxes = nginxes;
					}

					return cb();
				});
			});
		}

		function getCustomUIConfig(cb){
			if (soajs.inputmaskData.nginxConfig && soajs.inputmaskData.nginxConfig.customUIId) {
				var id = soajs.inputmaskData.nginxConfig.customUIId;
				try {
					id = BL.model.makeObjectId(id);
				} catch (e) {
					return cb(e);
				}

				BL.model.getStaticContent(soajs, id, function (error, srcRecord) {
					if (error) {
						return cb(error);
					}

					if (srcRecord) {
						var repoLabel = srcRecord.src.owner + '/' + srcRecord.src.repo;
						BL.model.getGitAccounts(soajs, repoLabel, function (error, tokenRecord) {
							if (error || !tokenRecord) {
								return cb(error || !tokenRecord);
							}
							if (tokenRecord.token) {
								srcRecord.token = tokenRecord.token;
							}

							cb(null, srcRecord);
						});
					}
					else {
						return cb();
					}
				});
			} else {
				cb(null, null);
			}
		}

		function initializeDeployer(cb){
			context.deployerConfig = getdeployerConfig(context.envRecord);
			checkIfError(soajs, res, {
				config: config,
				error: !context.deployerConfig,
				code: 743
			}, function () {
				return cb();
			});
		}

		function constructDeployerParams(customData, oldVariables){
			if(oldVariables && oldVariables.length > 0){
				for(var i = oldVariables.length -1; i >= 0; i--){
					if(oldVariables[i].indexOf("SOAJS_NX_CONTROLLER_NB") !== -1){
						oldVariables.splice(i, 1);
					}
					else if(oldVariables[i].indexOf("SOAJS_NX_CONTROLLER_IP_") !== -1){
						oldVariables.splice(i, 1);
					}
				}

				if (context.nginxes && context.nginxes[0] && context.nginxes[0].info && context.nginxes[0].info.Args) {
					var pattern = new RegExp(/\b\s-s\s?\b/g);
					soajs.inputmaskData.supportSSL = pattern.test(context.nginxes[0].info.Args[context.nginxes[0].info.Args.length - 1]);
				}
			}

			var dockerParams = {
				"env": context.envRecord.code.toLowerCase(),
				"name": "nginxapi",
				"image": config.images.nginx,
				"variables": oldVariables,
				"Cmd": [
					'bash',
					'-c',
					'./soajsDeployer.sh -T nginx -X'
				]
			};

			dockerParams.Cmd[2] += (deployNewNginx) ? ' deploy' : ' redeploy -c';

			if (soajs.inputmaskData.supportSSL) {
				dockerParams.Cmd[2] = dockerParams.Cmd[2] + ' -s';
			}

			if (soajs.inputmaskData.haService) {
				dockerParams.variables.push("SOAJS_NX_CONTROLLER_NB=1");
				dockerParams.variables.push("SOAJS_NX_CONTROLLER_IP_1=" + context.controllers[0].taskName.split('.')[0]);
			}
			else {
				dockerParams.variables.push("SOAJS_NX_CONTROLLER_NB=" + context.controllers.length);
				for (var i = 0; i < context.controllers.length; i++) {
					dockerParams.variables.push("SOAJS_NX_CONTROLLER_IP_" + (i + 1) + "=" + context.controllers[i].ip);
				}
			}

			dockerParams.variables.push("SOAJS_NX_SITE_DOMAIN=" + context.envRecord.sitePrefix + "." + context.envRecord.domain);
			dockerParams.variables.push("SOAJS_NX_API_DOMAIN=" + context.envRecord.apiPrefix + "." + context.envRecord.domain);

			if (customData) {
				dockerParams.variables.push("SOAJS_GIT_REPO=" + customData.src.repo);
				dockerParams.variables.push("SOAJS_GIT_OWNER=" + customData.src.owner);
				dockerParams.variables.push("SOAJS_GIT_BRANCH=" + soajs.inputmaskData.nginxConfig.branch);
				dockerParams.variables.push("SOAJS_GIT_COMMIT=" + soajs.inputmaskData.nginxConfig.commit);
				if (customData.token) {
					dockerParams.variables.push("SOAJS_GIT_TOKEN=" + customData.token);
				}
			}

			if(!deployNewNginx){
				if (Array.isArray(dockerParams.variables) && dockerParams.variables.length > 0) {
					var commands = [];
					dockerParams.variables.forEach(function(oneVariable){
						commands.push('export ' + oneVariable + " && ");
					});
					dockerParams.Cmd[2] = commands.join("") + dockerParams.Cmd[2];
				}
			}
			else{
				if(soajs.inputmaskData.exposedPort){
					dockerParams.exposedPort = soajs.inputmaskData.exposedPort;
				}

			}

			dockerParams.Cmd[2] = "cd /opt/soajs/FILES/deployer/; " + dockerParams.Cmd[2];
			// console.log("====================================");
			// console.log(JSON.stringify(dockerParams, null, 2));
			// console.log("====================================");
			return dockerParams;
		}

		function deployContainerAndInsert(cb){
			soajs.log.debug("Creating container with params:", JSON.stringify(context.deployerConfig), JSON.stringify(context.dockerParams));
			deployer.createContainer(context.deployerConfig, context.dockerParams, BL.model.getDB(), function (error, data) {
				checkIfError(soajs, res, {config: config, error: error, code: 615}, function () {

					soajs.log.debug("Starting container with params:", JSON.stringify(context.deployerConfig), JSON.stringify(data));
					deployer.start(context.deployerConfig, data.Id, BL.model.getDB(), function (error, data) {
						checkIfError(soajs, res, {config: config, error: error, code: 615}, function () {

							soajs.log.debug("Saving container information in docker collection.");
							var document = {
								"env": context.envRecord.code.toLowerCase(),
								"cid": data.Id,
								"hostname": "nginx_" + context.envRecord.code.toLowerCase(),
								"type": "nginx",
								"running": true,
								"deployer": context.deployerConfig,
								"info": data
							};
							BL.model.insertContainer(soajs, document, function (error) {
								checkIfError(soajs, res, {
									config: config,
									error: error,
									code: 615
								}, function () {
									return cb();
								});
							});
						});
					});
				});
			});
		}

		function execContainerAndUpdate(containerRecord, dockerParams, cb){
			soajs.log.debug("Updating container with params:", JSON.stringify(containerRecord.deployer), JSON.stringify(dockerParams));
			deployer.exec(containerRecord.deployer, containerRecord.cid, BL.model.getDB(), dockerParams, function (error, exec) {
				checkIfError(soajs, res, {config: config, error: error, code: 615}, function () {
					exec.start({}, function(err){
						checkIfError(soajs, res, {config: config, error: err, code: 615}, function () {
							var newParams = containerRecord;
							newParams.info.Config.Env = dockerParams.variables;
							BL.model.updateContainer(soajs, containerRecord.cid, newParams.info, function (error) {
								checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
									return cb();
								});
							});
						});
					});
				});
			});
		}

		function createHAService(cb) {
			context.deployerConfig.envCode = context.envRecord.code;
			soajs.log.debug("Creating HA service with params: " + JSON.stringify(context.deployerConfig), JSON.stringify(context.haServiceParams));
			deployer.deployHAService(context.deployerConfig, context.haServiceParams, BL.model.getDB(), function (error, data) {
				checkIfError(soajs, res, {config: config, error: error, code: (error && error.code === 741) ? error.code : 615}, function () {
					context.data = data;
					return cb();
				});
			});
		}

		getEnvInfo(function(){
			getRunningControllers(function(){
				getRunningNginxContainers(function(){
					if (!soajs.inputmaskData.haService) {
						if(context.nginxes){
							if(deployNewNginx){
								initializeDeployer(function(){
									context.dockerParams = constructDeployerParams(null, context.nginxes[0].info.Config.Env);
									deployContainerAndInsert(function(){
										return res.json(soajs.buildResponse(null, true));
									});
								});
							}
							else{
								async.each(context.nginxes, function(oneNginxContainerRecord, cb){
									var dockerParams = constructDeployerParams(null, oneNginxContainerRecord.info.Config.Env);
									execContainerAndUpdate(oneNginxContainerRecord, dockerParams, cb);

								}, function(){
									return res.json(soajs.buildResponse(null, true));
								});
							}
						}
						else{
							getCustomUIConfig(function(error, customData){
								initializeDeployer(function(){
									context.dockerParams = constructDeployerParams(customData, []);
									deployContainerAndInsert(function(){
										return res.json(soajs.buildResponse(null, true));
									});
								});
							});
						}
					}
					else {
						getCustomUIConfig(function (error, customData) {
							initializeDeployer(function () {
								context.dockerParams = constructDeployerParams(customData, []);
								var haServiceParams = {
									"env": context.dockerParams.env,
									"Name": context.dockerParams.env + '_' + context.dockerParams.name,
									"TaskTemplate": {
										"ContainerSpec": {
											"Image": config.images.nginx,
											"Env": context.dockerParams.variables,
											"Dir": config.imagesDir,
											"Command": [context.dockerParams.Cmd[0]],
											"Args": context.dockerParams.Cmd.splice(1)
										},
										"RestartPolicy": {
											"Condition": "any",
											"MaxAttempts": 5
										}
									},
									"Mode": {
										"Replicated": {
											"Replicas": soajs.inputmaskData.haCount
										}
									},
									"UpdateConfig": {
										"Delay": 500.0,
										"Parallelism": 2,
										"FailureAction": "pause"
									},
									"Networks": [{ID: 'ingress'}],
									"Labels": {
										"soajs.env": context.dockerParams.env,
										"soajs.service": context.dockerParams.name,
									},
									"EndpointSpec": {
										"Mode": "vip",
										"Ports": [
											{
												"Protocol": "tcp",
												"PublishedPort": soajs.inputmaskData.exposedPort || Math.floor((Math.random() * 100) + 81),
												"TargetPort": 80
											}
										]
									},
								};

								context.haServiceParams = haServiceParams;
								createHAService(function () {
									var dockerRecords = [];
									for (var i = 0; i < soajs.inputmaskData.haCount; i++) {
										dockerRecords.push({
											"type": "nginx",
											"env": context.dockerParams.env,
											"running": true,
											"recordType": "container",
											"deployer": context.deployerConfig,
											"cid": "",
											"hostname": "",
											"taskName": haServiceParams.Name + '.' + (i+1),
											"info": {}
										});
									}
									BL.model.insertContainers(soajs, dockerRecords, function (error) {
										checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
											BL.model.getHosts(soajs, soajs.inputmaskData.envCode, "controller", function (error, controllers) {
												checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
													return res.jsonp(soajs.buildResponse(null, {controllers: controllers}));
												});
											});
										});
									});
								});
							});
						});
					}
				});
			});
		});
	},

	"deployController": function (config, soajs, res) {
		var context = {};
		function checkifDashboardEnvironment(cb){
			checkIfError(soajs, res, {
				config: config,
				error: soajs.inputmaskData.envCode.toLowerCase() === 'dashboard',
				code: 750
			}, cb);
		}

		function getEnvInfo(cb){
			BL.model.getEnvironment(soajs, soajs.inputmaskData.envCode, function (err, envRecord) {
				checkIfError(soajs, res, {config: config, error: err || !envRecord, code: 600}, function () {
						checkIfError(soajs, res, {
							config: config,
							error: envRecord.deployer.type === 'manual',
							code: 618
						}, function () {
							context.envRecord = envRecord;
							return cb();
						});
				});
			});
		}

		function getDashboardConnection(cb){
			getDashDbInfo(BL.model, soajs, function (error, data) {
				checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
					context.mongoDbs = data.mongoDbs;
					context.mongoCred = data.mongoCred;
					context.clusterInfo = data.clusterInfo;
					return cb();
				});
			});
		}

		function getGitInfo(cb){
			var repoLabel = soajs.inputmaskData.owner + '/' + soajs.inputmaskData.repo;
			BL.model.getGitAccounts(soajs, repoLabel, function (error, accountRecord) {
				checkIfError(soajs, res, {
					config: config,
					error: error || !accountRecord,
					code: 600
				}, function () {
					context.accountRecord = accountRecord;
					return cb();
				});
			});
		}

		function getControllerInfo(cb){
			BL.model.getService(soajs, {name: 'controller'}, function (error, dbRecord) {
				checkIfError(soajs, res, {
					config: config,
					error: error || !dbRecord,
					code: 600
				}, function () {
					context.dbRecord = dbRecord;
					return cb();
				});
			});
		}

		function constructDeployerParams(cb){
			var dockerParams = {
				"image": config.images.services,
				"name": "controller",
				"env": soajs.inputmaskData.envCode.toLowerCase(),
				"variables": [
					"SOAJS_SRV_AUTOREGISTERHOST=false",
					"NODE_ENV=production",
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
					'cd /opt/soajs/FILES/deployer/; ./soajsDeployer.sh -T service -X deploy -G ' + context.accountRecord.provider
				]
			};

			if (soajs.inputmaskData.useLocalSOAJS) {
				dockerParams.Cmd[2] = dockerParams.Cmd[2] + ' -L'
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
				dockerParams.variables.push("SOAJS_GIT_TOKEN=" + context.accountRecord.token);
			}

			//Add additional variables if any
			if (soajs.inputmaskData.variables && soajs.inputmaskData.variables.length > 0) {
				dockerParams.variables = dockerParams.variables.concat(soajs.inputmaskData.variables);
			}

			context.dockerParams = dockerParams;
			return cb();
		}

		checkifDashboardEnvironment(function(){
			getEnvInfo(function(){
				getDashboardConnection(function(){
					getGitInfo(function(){
						getControllerInfo(function(){
							constructDeployerParams(function(){
								deployControllers(0, soajs.inputmaskData.number, context.envRecord, context.dockerParams, function () {
									return res.json(soajs.buildResponse(null, true));
								});
							});
						});
					});
				});
			});
		});

		function deployControllers(counter, max, envRecord, dockerParams, cb) {
			var deployerConfig = getdeployerConfig(envRecord);
			checkIfError(soajs, res, {
				config: config,
				error: !deployerConfig,
				code: 743
			}, function () {
				soajs.log.debug("Calling create container:", JSON.stringify(deployerConfig), JSON.stringify(dockerParams));
				deployer.createContainer(deployerConfig, dockerParams, BL.model.getDB(), function (error, data) {
					checkIfError(soajs, res, {
						config: config,
						error: error,
						code: (error && error.code === 741) ? error.code : 615
					}, function () {
						soajs.log.debug("Container Created, starting container:", JSON.stringify(deployerConfig), JSON.stringify(data));
						deployer.start(deployerConfig, data.Id, BL.model.getDB(), function (error, data) {
							checkIfError(soajs, res, {config: config, error: error, code: 615}, function () {
								registerNewControllerHost(data, deployerConfig, function () {
									counter++;

									// checkIfError(soajs, res, {config: config, error: error, code: 615}, function () {
									soajs.log.debug("Container started, saving information in core_provision", JSON.stringify(data));
									updateControllerHostWithNetworkInfo(data, deployerConfig, function () {
										if (counter === max) {
											return cb();
										}
										else {
											deployControllers(counter, max, envRecord, dockerParams, cb);
										}
									});
								});
							});
						});
					});
				});
			});
		}

		function registerNewControllerHost(data, deployerConfig, cb) {
			//get the ip of the host from hosts
			//insert into docker collection
			var document = {
				"cid": data.Id,
				"env": soajs.inputmaskData.envCode.toLowerCase(),
				"hostname": data.Name || data.name, //data.Config.Hostname,
				"running": true,
				"type": "controller",
				"provider": context.accountRecord.provider,
				"deployer": deployerConfig,
				"info": data
			};
			BL.model.insertContainer(soajs, document, function (error) {
				checkIfError(soajs, res, {config: config, error: error, code: 615}, function () {
					return cb();
				});
			});
		}

		function updateControllerHostWithNetworkInfo(data, deployerConfig, cb) {
			var ipValue;
			if (deployerConfig.config && deployerConfig.config.HostConfig && data.NetworkSettings && data.NetworkSettings.Networks && data.NetworkSettings.Networks[deployerConfig.config.HostConfig.NetworkMode]) {
				ipValue = data.NetworkSettings.Networks[deployerConfig.config.HostConfig.NetworkMode].IPAddress;
			} else {
				ipValue = data.NetworkSettings.IPAddress;
			}

			var newHost = {
				"version": soajs.inputmaskData.version,
				"env": soajs.inputmaskData.envCode.toLowerCase(),
				"name": "controller",
				"hostname": data.Name || data.name, //data.Config.Hostname
				"src": {
					"commit": soajs.inputmaskData.commit,
					"branch": soajs.inputmaskData.branch
				},
				"ip": ipValue
			};

			BL.model.insertHost(soajs, newHost, function (error) {
				checkIfError(soajs, res, {config: config, error: error, code: 615}, function () {
					return cb(null, true);
				});
			});
		}
	},

	"deployService": function (config, soajs, res) {
		deployContainerServiceOrDaemon(config, soajs, res, BL.model, 'service');
	},

	"deployDaemon": function (config, soajs, res) {
		deployContainerServiceOrDaemon(config, soajs, res, BL.model, 'daemon');
	},

	"list": function (config, soajs, res) {
		BL.model.getEnvironment(soajs, soajs.inputmaskData.env, function (err, envRecord) {
			checkIfError(soajs, res, {config: config, error: err || !envRecord, code: 600}, function () {

				BL.model.getHosts(soajs, envRecord.code, null, function (err, hosts) {
					checkIfError(soajs, res, {config: config, error: err, code: 600}, function () {

						BL.model.getContainers(soajs, envRecord.code, null, null, function (err, containers) {
							checkIfError(soajs, res, {config: config, error: err, code: 600}, function () {

								hosts.forEach(function (oneHost) {
									containers.forEach(function (oneContainer) {
										if (oneHost.hostname === oneContainer.hostname) {
											oneHost.cid = oneContainer.cid;
										}
									});
								});
								return res.jsonp(soajs.buildResponse(null, {
									'hosts': hosts,
									'deployer': envRecord.deployer,
									'profile': envRecord.profile
								}));
							});
						});
					});
				});
			});
		});
	},

	"listNginx": function (config, soajs, res) {
		BL.model.getContainers(soajs, soajs.inputmaskData.env, 'nginx', true, function (error, records) {
			checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
				return res.jsonp(soajs.buildResponse(null, records));
			});
		});
	},

	"delete": function (config, soajs, res) {

		var rebuildNginx = false;
		BL.model.getEnvironment(soajs, soajs.inputmaskData.env, function (err, envRecord) {
			checkIfError(soajs, res, {config: config, error: err || !envRecord, code: 600}, function () {
				if (envRecord.deployer.type === 'manual') {
					removeHost(envRecord.code, envRecord.deployer.type, null);
				}
				else {
					BL.model.getOneContainer(soajs, envRecord.code, soajs.inputmaskData.hostname, function (error, dockerRecord) {
						checkIfError(soajs, res, {
							config: config,
							error: error || !dockerRecord,
							code: 600
						}, function () {
							if (dockerRecord.type === 'controller') {
								rebuildNginx = true;
							}

							removeHost(envRecord.code, envRecord.deployer.type, dockerRecord);
						});
					});
				}
			});
		});

		function removeHost(env, deployerType, dockerRecord) {
			BL.model.removeHost(soajs, env, soajs.inputmaskData.name, soajs.inputmaskData.ip, function (error) {
				checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
					if (deployerType === 'container') {
						removeDockerContainer(env, dockerRecord);
					}
					else {
						return res.jsonp(soajs.buildResponse(null, true));
					}
				});
			});
		}

		function removeDockerContainer(env, dockerRecord) {
			deployer.remove(dockerRecord.deployer, dockerRecord.cid, BL.model.getDB(), function (error) {
				checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {

					BL.model.removeContainer(soajs, env, dockerRecord.hostname, function (err) {
						checkIfError(soajs, res, {config: config, error: err, code: 600}, function () {

							if (rebuildNginx) {
								soajs.log.debug("Deleted controller container, rebuilding Nginx ....");
								soajs.inputmaskData.envCode = env.toUpperCase();
								BL.nginx(config, soajs, false, res);
							}
							else {
								return res.jsonp(soajs.buildResponse(null, true));
							}
						});
					});
				});
			});
		}
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
					BL.model.getService(soajs, {
						'name': soajs.inputmaskData.serviceName,
						'port': soajs.inputmaskData.servicePort
					}, function (error, record) {
						checkIfError(soajs, res, {config: config, error: error, code: 603}, function () {
							if (!record) {
								BL.model.getDaemon(soajs, {
									'name': soajs.inputmaskData.serviceName,
									'port': soajs.inputmaskData.servicePort
								}, function (error, record) {
									checkIfError(soajs, res, {config: config, error: error, code: 603}, function () {
										checkIfError(soajs, res, {
											config: config,
											error: !record,
											code: 604
										}, function () {
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
			BL.model.getOneHost(soajs, soajs.inputmaskData.env, soajs.inputmaskData.serviceName, soajs.inputmaskData.ip, soajs.inputmaskData.hostname, function (error, record) {
				checkIfError(soajs, res, {config: config, error: error, code: 603}, function () {
					checkIfError(soajs, res, {config: config, error: !record, code: 605}, function () {
						//perform maintenance operation
						doMaintenance(record);
					});
				});
			});
		}

		function doMaintenance(oneHost) {
			BL.model.getEnvironment(soajs, soajs.inputmaskData.env, function (err, envRecord) {
				checkIfError(soajs, res, {config: config, error: err || !envRecord, code: 600}, function () {
					if (!envRecord.deployer) {
						soajs.log.error('Missing deployer obj');
					}
					checkIfError(soajs, res, {
						config: config,
						error: soajs.inputmaskData.operation === 'hostLogs' && envRecord.deployer.type === 'manual',
						code: 619
					}, function () {
						switch (soajs.inputmaskData.operation) {
							case 'hostLogs':
								BL.model.getOneContainer(soajs, envRecord.code, soajs.inputmaskData.hostname, function (error, response) {
									checkIfError(soajs, res, {config: config, error: error, code: 603}, function () {
										var deployerConfig;
										if (response) {
											deployerConfig = response.deployer;
											deployer.info(deployerConfig, response.cid, soajs, res, BL.model.getDB());
										}
										else {
											soajs.log.error('No response obj');
											checkIfError(soajs, res, {
												config: config,
												error: true,
												code: 603
											}, function () {
											});
										}
									});
								});
								break;
							default:
								soajs.inputmaskData.servicePort = soajs.inputmaskData.servicePort + 1000;
								var maintenanceURL = "http://" + oneHost.ip + ":" + soajs.inputmaskData.servicePort;
								maintenanceURL += "/" + soajs.inputmaskData.operation;
								request.get(maintenanceURL, function (error, response, body) {
									checkIfError(soajs, res, {config: config, error: error, code: 603}, function () {
										return res.jsonp(soajs.buildResponse(null, JSON.parse(body)));
									});
								});
								break;
						}
					});
				});
			});
		}
	},

	"getContainerLogs": function (config, soajs, res) {
		BL.model.getEnvironment(soajs, soajs.inputmaskData.env, function (error, envRecord) {
			checkIfError(soajs, res, {config: config, error: error || !envRecord, code: 600}, function () {
				checkIfError(soajs, res, {
					config: config,
					error: envRecord.deployer.type === 'manual',
					code: 619
				}, function () {

					BL.model.getOneContainer(soajs, envRecord.code, soajs.inputmaskData.cid, function (error, record) {
						checkIfError(soajs, res, {config: config, error: error || !record, code: 600}, function () {

							deployer.info(record.deployer, record.cid, soajs, res, BL.model.getDB());
						});
					});
				});
			});
		});
	},

	"deleteContainer": function (config, soajs, res) {
		//should be used in case container has no host record such as nginx containers and zombie containers
		BL.model.getEnvironment(soajs, soajs.inputmaskData.env, function (error, envRecord) {
			checkIfError(soajs, res, {config: config, error: error || !envRecord, code: 773}, function () {
				checkIfError(soajs, res, {
					config: config,
					error: envRecord.deployer.type === 'manual',
					code: 619
				}, function () {

					BL.model.getOneContainer(soajs, envRecord.code, soajs.inputmaskData.cid, function (error, dockerRecord) {
						checkIfError(soajs, res, {config: config, error: error || !dockerRecord, code: 773}, function () {
								removeDockerContainer(dockerRecord, envRecord.code);
						});
					});
				});
			});
		});

		function removeDockerContainer(dockerRecord, env) {
			deployer.remove(dockerRecord.deployer, dockerRecord.cid, BL.model.getDB(), function (error) {
				if (error) {
					soajs.log.error(error);
				}
				else {
					soajs.log.debug("Container has been deleted from " + soajs.inputmaskData.env + " environment");
				}

				BL.model.removeContainer(soajs, env, soajs.inputmaskData.cid, function (error) {
					checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
						soajs.log.debug("Container has been removed from docker collection");

						return res.jsonp(soajs.buildResponse(null, true));
					});
				});
			});
		}
	},

	"getContainersNoHost": function (config, soajs, res) {

		BL.model.getEnvironment(soajs, soajs.inputmaskData.env, function (err, envRecord) {
			checkIfError(soajs, res, {config: config, error: err || !envRecord, code: 772}, function () {

				if (envRecord.deployer.type === 'manual') {
					return res.json(soajs.buildResponse(null, []));
				}

				BL.model.getContainers(soajs, envRecord.code, {"$ne": "nginx"}, null, function (error, containers) {
					checkIfError(soajs, res, {config: config, error: error, code: 772}, function () {

						BL.model.getHosts(soajs, envRecord.code, null, function (error, hosts) {
							checkIfError(soajs, res, {config: config, error: error, code: 772}, function () {

								for (var i = containers.length - 1; i >= 0; i--) {
									var found = false;
									hosts.forEach(function (oneHost) {
										if (containers[i].hostname === oneHost.hostname) {
											found = true;
										}
									});
									//only keep containers that have no host
									if (found) {
										containers.splice(i, 1);
									}
								}

								return res.json(soajs.buildResponse(null, containers));
							});
						});
					});
				});
			});
		});
	},

	"listNodes": function (config, soajs, res) {
		BL.model.listNodes(soajs, {}, function (error, nodes) {
			checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
				return res.jsonp(soajs.buildResponse(null, nodes));
			});
		});
	},

	"addNode": function (config, soajs, res) {
		var nodeInfo = {};
		BL.model.listNodes(soajs, {role: 'manager'}, function (error, managerNodes) {
			checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
				async.map(managerNodes, function (oneNode, callback) {
					return callback(null, oneNode.ip + ':' + oneNode.dockerPort);
				}, function (error, remoteAddrs) {
					nodeInfo.RemoteAddrs = remoteAddrs;
					nodeInfo.AdverstiseAddr = soajs.inputmaskData.ip + ':' + soajs.inputmaskData.port;
					nodeInfo.ListenAddr = '0.0.0.0:' + soajs.inputmaskData.port;
					nodeInfo.JoinToken = '';

					deployer.addNode(nodeInfo, function (error, node) {
						checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
							var record = {
			                    recordType: 'node',
			                    id: node.ID,
			                    name: node.Description.Hostname,
			                    availability: node.Spec.Availability,
			                    role: node.Spec.Role,
			                    resources: {
			                        cpuCount: node.Description.Resources.NanoCPUs / 1000000000,
			                        memory: node.Description.Resources.MemoryBytes
			                    }
			                };

							if (record.role === 'manager') {
								record.ip = node.ManagerStatus.Addr.split(':')[0];
								record.dockerPort = node.ManagerStatus.Addr.split(':')[1];
							}
							else {
								record.ip = nodeInfo.ip;
								record.dockerPort = nodeInfo.port;
							}

							BL.model.addNode(soajs, record, function (error) {
								checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
									return res.jsonp(soajs.buildResponse(null, true));
								});
							});
						});
					});
				});
			});
		});
	},

	"removeNode": function (config, soajs, res) {
		var criteria = {
			id: soajs.inputmaskData.nodeId
		};

		BL.model.getOneNode(soajs, criteria, function (error, nodeRecord) {
			checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
				deployer.removeNode(criteria, function (error) {
					checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
						BL.model.removeNode(soajs, criteria, function (error) {
							checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
								return res.jsonp(soajs.buildResponse(null, true));
							});
						});
					});
				});
			});
		});
	},

	"updateNode": function (config, soajs, res) {
		var criteria = {
			id: soajs.inputmaskData.nodeId
		};

		var update = {
			'$set': {}
		};

		var deployerFn;
		if (soajs.inputmaskData.type === 'role') {
			update.$set.role = soajs.inputmaskData.value;
			deployerFn = 'updateNodeRole';
		}
		else if (soajs.inputmaskData.type === 'availability') {
			update.$set.availability = soajs.inputmaskData.value;
			deployerFn = 'updateNodeAvailability';
		}

		deployer[deployerFn](soajs, data, function (error) {
			checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
				BL.model.updateNode(soajs, criteria, update, function (error) {
					checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
						return res.jsonp(soajs.buildResponse(null, true));
					});
				});
			});
		});
	},

	"scaleHAService": function (config, soajs, res) {

	},

	"deleteHAService": function (config, soajs, res) {

	},

	"checkAnalytics": function (config, soajs, res) {
		BL.model.getEnvAnalyticsRecord(soajs, soajs.inputmaskData.env, function (error, record) {
			checkIfError(soajs, res, {config: config, error: error || !record, code: 600}, function () {
				return res.jsonp(soajs.buildResponse(null, {enabled: record.json.enabled}));
			});
		});
	},

	"activateAnalytics": function (config, soajs, res) {
		var elasticURL = 'elasticsearch:9200'; //TODO: MAKE DYNAMIC, ONLY SUPPORTS ELASTIC CONTAINERS IN SWARM FOR NOW
		var list = [
			{
				type: 'visual',
				route: '/.kibana/visualization/'
			},
			{
				type: 'dashboard',
				route: '/.kibana/dashboard/'
			}
		];

		putIndexPattern(function (error, result) {
			checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
				async.eachSeries(list, function (oneListItem, callback) {
					putIntoElastic(oneListItem.type, oneListItem.route, callback);
				}, function (error) {
					checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
						var update = {
							'$set': {
								'json.enabled': true
							}
						};
						BL.model.updateAnalyticsRecord(soajs, soajs.inputmaskData.env.toLowerCase(), update, function (error) {
							checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
								return res.jsonp(soajs.buildResponse(null, true));
							});
						});
					});
				});
			});
		});

		function putIntoElastic(type, route, cb) {
			BL.model.getAnalyticsRecords(soajs, type, function (error, content) {
				if (error) {
					return cb(error);
				}

				soajs.log.debug(type);
				soajs.log.debug(content);

				async.each(content, function (oneContent, callback) {
					var routeParam = route + oneContent.json.title.toLowerCase().replace(' ', '-');

					var options = {
						method: 'PUT',
						uri: 'http://' + elasticURL + (routeParam || route),
						json: true,
						body: oneContent.json
					};

					soajs.log.debug(options);

					request(options, function (error, response, body) {
						if (error) return callback(error);

						soajs.log.debug(body);

						return callback(null, body);
					});
				}, cb);
			});
		}

		function putIndexPattern(cb) {

			var indexPattern = soajs.inputmaskData.env.toLowerCase() + '-nginx-access-*';
			var options = {
				method: 'PUT',
				uri: 'http://' + elasticURL + '/.kibana/index-pattern/' + indexPattern,
				json: true,
				body: {
					title: indexPattern,
					timeFieldName: '@timestamp'
				}
			};

			request(options, function (error, response, body) {
				if (error) return cb(error);

				options = {
					method: 'PUT',
					uri: 'http://' + elasticURL + '/.kibana/config/4.6.1',
					json: true,
					body: {
						defaultIndex: indexPattern
					}
				};

				request(options, function (error, response, body) {
					if (error) return cb(error);

					return cb(null, true);
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
