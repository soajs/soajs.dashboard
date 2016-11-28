'use strict';
var fs = require("fs");
var async = require("async");
var request = require("request");

var deployer = require("../utils/drivers/deployer.js");
var data = require("../models/host.js");

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

function reloadControllerRegistry(soajs, envRecord, cb) {
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
				body = JSON.parse(body);
				if (error || !body.result) {
					soajs.log.error('Failed to reload registry for controller with IP: ' + oneCtrl.ip);
					soajs.log.error(error || body);
				}
				else {
					soajs.log.debug('Reloaded registry for controller with IP: ' + oneCtrl.ip);
				}

				return callback();
			});
		}, cb);
	});
}

function inspectService(soajs, deployerConfig, options, dataSource, serviceCount, cb) {
	options.serviceCount = serviceCount;
	return deployer.getServiceComponents(soajs, deployerConfig, options, dataSource, cb);
}

function findAndSaveContainers(deployerConfig, soajs, model, serviceInfo, serviceType, env, cb) {
	var options = {
		serviceInfo: serviceInfo,
		serviceType: serviceType
	};
	deployer.buildContainerRecords(soajs, deployerConfig, options, BL.model, function (error, records) {
		if (error) {
			return cb(error);
		}

		model.insertContainers(soajs, BL.model, records, cb);
	});

	// async.map(tasks, function (oneInstance, callback) {
	// 	var options = {
	// 		nodeId: oneInstance.NodeID,
	// 		containerId: oneInstance.Status.ContainerStatus.ContainerID
	// 	};
	// 	deployer.inspectContainer(soajs, deployerConfig, options, BL.model, function (error, containerInfo) {
	// 		if (error) {
	// 			return callback(error);
	// 		}
	//
	// 		var newRecord = {
	// 			type: serviceType,
	// 			env: env.toLowerCase(),
	// 			running: true,
	// 			recordType: 'container',
	// 			deployer: deployerConfig,
	// 			taskName: containerInfo.Config.Labels['com.docker.swarm.task.name'],
	// 			serviceName: containerInfo.Config.Labels['com.docker.swarm.service.name']
	// 		};
	//
	// 		//cleaning dots from field names to avoid mongo error
	// 		var labels = Object.keys(containerInfo.Config.Labels);
	// 		labels.forEach(function (oneLabel) {
	// 			containerInfo.Config.Labels[oneLabel.replace(/\./g, '-')] = containerInfo.Config.Labels[oneLabel];
	// 			delete containerInfo.Config.Labels[oneLabel];
	// 		});
	// 		newRecord.info = containerInfo;
	//
	// 		return callback(null, newRecord);
	// 	});
	// }, function (error, results) {
	// 	if (error) {
	// 		return cb(error);
	// 	}
	//
	// 	model.insertContainers(soajs, BL.model, results, cb);
	// });
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

	function getDashboardConnection(cb) {
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

	function getGitInfo(cb) {
		var repoLabel = soajs.inputmaskData.owner + '/' + soajs.inputmaskData.repo;
		model.getGitAccounts(soajs, BL.model, repoLabel, function (error, accountRecord) {
			checkIfError(soajs, res, {
				config: config,
				error: error || !accountRecord,
				code: 600
			}, function () {
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

	function constructDeployerParams(cb) {
		var dockerParams = {
			"env": soajs.inputmaskData.envCode.toLowerCase(),
			"name": context.name,
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
				'./soajsDeployer.sh -T service -X deploy -g ' + context.accountRecord.providerName + ' -G ' + context.accountRecord.domain
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

		if (type === 'daemon') {
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
		checkIfError(soajs, res, {
			config: config,
			error: !deployerConfig,
			code: 743
		}, function () {
			context.deployerConfig = deployerConfig;
			return cb();
		});
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

	getEnvInfo(function () {
		getDashboardConnection(function () {
			getGitInfo(function () {
				getServiceDaemonInfo(function () {
					constructDeployerParams(function () {
						initDeployer(function () {
							context.origin = ((soajs.customData && soajs.customData.type) ? soajs.customData.type : 'service');
							createHAService(function () {
								var serviceName = context.dockerParams.env + '-' + context.dockerParams.name + '-v' + soajs.inputmaskData.version;

								inspectService(soajs, context.deployerConfig, {serviceName: serviceName}, BL.model, soajs.inputmaskData.haCount, function (error, serviceInfo) {
									checkIfError(soajs, res, {
										config: config,
										error: error,
										code: 615
									}, function () {
										var serviceType = ((soajs.customData && soajs.customData.type) ? soajs.customData.type : 'service');
										findAndSaveContainers(context.deployerConfig, soajs, model, serviceInfo, serviceType, context.dockerParams.env, function (error) {
											checkIfError(soajs, res, {
												config: config,
												error: error,
												code: 615
											}, function () {
												model.getHosts(soajs, BL.model, soajs.inputmaskData.envCode, "controller", function (error, controllers) {
													checkIfError(soajs, res, {
														config: config,
														error: error,
														code: 600
													}, function () {
														return res.jsonp(soajs.buildResponse(null, {controllers: controllers}));
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
			clusterInfo: envRecord.dbs.clusters[clusterName]
		};
		return cb(null, data);
	});
}

var BL = {
	model: null,

	"nginx": function (config, soajs, deployNewNginx, res) {
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

		function getRunningControllers(cb) {
			data.getContainers(soajs, BL.model, context.envRecord.code, "controller", true, function (error, controllers) {
				checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {

					//no controllers found, no need to proceed
					if (!controllers || (controllers && controllers.length === 0)) {
						soajs.log.debug("No controllers found for environment: " + context.envRecord.code + ". No need to proceed.");
						return res.json(soajs.buildResponse(null, true));
					}
					else {
						data.getHosts(soajs, BL.model, context.envRecord.code, "controller", function (error, hostsData) {
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

		function getRunningNginxContainers(cb) {
			data.getContainers(soajs, BL.model, context.envRecord.code, "nginx", true, function (error, nginxes) {
				checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
					if (nginxes && nginxes.length > 0) {
						context.nginxes = nginxes;
					}

					return cb();
				});
			});
		}

		function getCustomUIConfig(cb) {
			if (soajs.inputmaskData.nginxConfig && soajs.inputmaskData.nginxConfig.customUIId) {
				var id = soajs.inputmaskData.nginxConfig.customUIId;
				BL.model.validateCustomId(soajs, id, function (error, id) {
					if (error) {
						return cb(error);
					}

					data.getStaticContent(soajs, BL.model, id, function (error, srcRecord) {
						if (error) {
							return cb(error);
						}

						if (srcRecord) {
							var repoLabel = srcRecord.src.owner + '/' + srcRecord.src.repo;
							data.getGitAccounts(soajs, BL.model, repoLabel, function (error, tokenRecord) {
								if (error || !tokenRecord) {
									return cb(error || !tokenRecord);
								}
								if (tokenRecord.token) {
									if (tokenRecord.provider === 'bitbucket_enterprise') {
										tokenRecord.token = new Buffer(tokenRecord.token, 'base64').toString();
									}
									srcRecord.token = tokenRecord.token;
								}

								cb(null, srcRecord);
							});
						}
						else {
							return cb();
						}
					});
				});
			} else {
				cb(null, null);
			}
		}

		function initializeDeployer(cb) {
			context.deployerConfig = getDeployerConfig(context.envRecord);
			checkIfError(soajs, res, {
				config: config,
				error: !context.deployerConfig,
				code: 743
			}, function () {
				return cb();
			});
		}

		function constructDeployerParams(customData, oldVariables) {
			if (oldVariables && oldVariables.length > 0) {
				for (var i = oldVariables.length - 1; i >= 0; i--) {
					if (oldVariables[i].indexOf("SOAJS_NX_CONTROLLER_NB") !== -1) {
						oldVariables.splice(i, 1);
					}
					else if (oldVariables[i].indexOf("SOAJS_NX_CONTROLLER_IP_") !== -1) {
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

			if (!deployNewNginx) {
				if (Array.isArray(dockerParams.variables) && dockerParams.variables.length > 0) {
					var commands = [];
					dockerParams.variables.forEach(function (oneVariable) {
						commands.push('export ' + oneVariable + " && ");
					});
					dockerParams.Cmd[2] = commands.join("") + dockerParams.Cmd[2];
				}
			}
			else {
				if (soajs.inputmaskData.exposedPort) {
					dockerParams.exposedPort = soajs.inputmaskData.exposedPort;
				}

			}

			// console.log("====================================");
			// console.log(JSON.stringify(dockerParams, null, 2));
			// console.log("====================================");
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

		getEnvInfo(function () {
			getRunningControllers(function () {
				getRunningNginxContainers(function () {
					getCustomUIConfig(function (error, customData) {
						initializeDeployer(function () {
							context.dockerParams = constructDeployerParams(customData, []);
							context.origin = 'nginx';

							createHAService(function () {
								var serviceName = context.dockerParams.env + '-' + context.dockerParams.name;
								inspectService(soajs, context.deployerConfig, {serviceName: serviceName}, BL.model, soajs.inputmaskData.haCount, function (error, serviceInfo) {
									checkIfError(soajs, res, {
										config: config,
										error: error,
										code: 615
									}, function () {
										findAndSaveContainers(context.deployerConfig, soajs, data, serviceInfo, 'nginx', context.dockerParams.env, function (error) {
											checkIfError(soajs, res, {
												config: config,
												error: error,
												code: 615
											}, function () {
												data.getHosts(soajs, BL.model, soajs.inputmaskData.envCode, "controller", function (error, controllers) {
													checkIfError(soajs, res, {
														config: config,
														error: error,
														code: 600
													}, function () {
														return res.jsonp(soajs.buildResponse(null, {controllers: controllers}));
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

						data.getContainers(soajs, BL.model, envRecord.code, null, null, function (err, containers) {
							checkIfError(soajs, res, {config: config, error: err, code: 600}, function () {

								hosts.forEach(function (oneHost) {
									containers.forEach(function (oneContainer) {
										if (oneHost.serviceHATask && oneHost.serviceHATask.match(new RegExp(oneContainer.serviceName + '.[0-9]+', 'g'))) {
											oneHost.cid = oneContainer.cid;
											oneHost.serviceHAName = oneContainer.serviceName;
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
		data.getContainers(soajs, BL.model, soajs.inputmaskData.env, 'nginx', true, function (error, records) {
			checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
				return res.jsonp(soajs.buildResponse(null, records));
			});
		});
	},

	"delete": function (config, soajs, res) {

		var rebuildNginx = false;
		data.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (err, envRecord) {
			checkIfError(soajs, res, {config: config, error: err || !envRecord, code: 600}, function () {
				if (envRecord.deployer.type === 'manual') {
					removeHost(envRecord.code, envRecord.deployer.type, null);
				}
				else {
					data.getOneContainer(soajs, BL.model, envRecord.code, soajs.inputmaskData.hostname, function (error, dockerRecord) {
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
			data.removeHost(soajs, BL.model, env, soajs.inputmaskData.name, soajs.inputmaskData.ip, function (error) {
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
			deployer.remove(soajs, dockerRecord.deployer, dockerRecord.cid, BL.model, function (error) {
				checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {

					data.removeContainer(soajs, BL.model, env, dockerRecord.hostname, function (err) {
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
			data.getOneHost(soajs, BL.model, soajs.inputmaskData.env, soajs.inputmaskData.serviceName, soajs.inputmaskData.ip, soajs.inputmaskData.hostname, function (error, record) {
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
					checkIfError(soajs, res, {
						config: config,
						error: soajs.inputmaskData.operation === 'hostLogs' && envRecord.deployer.type === 'manual',
						code: 619
					}, function () {
						switch (soajs.inputmaskData.operation) {
							case 'hostLogs':
								data.getOneContainer(soajs, BL.model, envRecord.code, soajs.inputmaskData.hostname, function (error, response) {
									checkIfError(soajs, res, {config: config, error: error, code: 603}, function () {
										var deployerConfig;
										if (response) {
											deployerConfig = response.deployer;
											deployer.info(soajs, deployerConfig, response.cid, res, BL.model);
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

	"listNodes": function (config, soajs, res) {
		data.listNodes(soajs, BL.model, {}, function (error, nodes) {
			checkIfError(soajs, res, {config: config, error: error, code: 817}, function () {
				return res.jsonp(soajs.buildResponse(null, nodes));
			});
		});
	},

	"addNode": function (config, soajs, res) {
		var nodeInfo = {}, swarmPort;

		function getManagerNodes(cb) {
			soajs.inputmaskData.env = soajs.inputmaskData.env.toUpperCase();
			data.listNodes(soajs, BL.model, {role: 'manager'}, function (error, managerNodes) {
				checkIfError(soajs, res, {config: config, error: error || managerNodes.length === 0, code: 800}, function () {
					return cb(managerNodes);
				});
			});
		}

		function buildApiPayload(managerNodes, cb) {
			async.map(managerNodes, function (oneNode, callback) {
				return callback(null, oneNode.ip + ':' + oneNode.swarmPort);
			}, function (error, remoteAddrs) {
				swarmPort = managerNodes[0].swarmPort; //use same swarm port as standard for all nodes
				nodeInfo.RemoteAddrs = remoteAddrs;
				nodeInfo.AdverstiseAddr = soajs.inputmaskData.host + ':' + swarmPort;
				nodeInfo.ListenAddr = '0.0.0.0:' + swarmPort;
				nodeInfo.JoinToken = managerNodes[0].tokens[soajs.inputmaskData.role];
				nodeInfo.role = soajs.inputmaskData.role; //not required for api call

				return cb();
			});
		}

		function getEnv (cb) {
			data.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (error, envRecord) {
				checkIfError(soajs, res, {config: config, error: error || !envRecord, code: 402}, function () {
					return cb(envRecord);
				});
			});
		}

		function addNodeToSwarm (envRecord, cb) {
			var deployerConfig = getDeployerConfig(envRecord);
			deployerConfig.host = soajs.inputmaskData.host;
			deployerConfig.port = soajs.inputmaskData.port;
			deployerConfig.envCode = soajs.inputmaskData.env;
			checkIfError(soajs, res, {config: config, error: !deployerConfig, code: 743}, function () {
				deployer.addNode(soajs, deployerConfig, nodeInfo, BL.model, function (error, node) {
					checkIfError(soajs, res, {config: config, error: error, code: ((error && error.code && !isNaN(error.code)) ? error.code : 801)}, function () {
						return cb(node);
					});
				});
			});
		}

		function saveNodeRecord (managerNodes, node, cb) {
			var record = {
				recordType: 'node',
				id: node.ID,
				name: node.Description.Hostname,
				availability: node.Spec.Availability,
				role: node.Spec.Role,
				resources: {
					cpuCount: node.Description.Resources.NanoCPUs / 1000000000,
					memory: node.Description.Resources.MemoryBytes
				},
				tokens: managerNodes[0].tokens
			};

			if (record.role === 'manager') {
				record.ip = node.ManagerStatus.Addr.split(':')[0];
				record.dockerPort = soajs.inputmaskData.port;
				record.swarmPort = node.ManagerStatus.Addr.split(':')[1];
			}
			else {
				record.ip = soajs.inputmaskData.host;
				record.dockerPort = soajs.inputmaskData.port;
				record.swarmPort = swarmPort;
			}

			data.addNode(soajs, BL.model, record, function (error) {
				checkIfError(soajs, res, {config: config, error: error, code: 802}, function () {
					return cb();
				});
			});
		}

		checkIfError(soajs, res, {config: config, error: soajs.inputmaskData.env.toLowerCase() !== 'dashboard', code: 818}, function () {
			getManagerNodes(function (managerNodes) {
				buildApiPayload(managerNodes, function () {
					getEnv(function (envRecord) {
						addNodeToSwarm(envRecord, function (node) {
							saveNodeRecord(managerNodes, node, function () {
								//if manager node, add to list of nodes for deployer object of all environments config
								if (node.Spec.Role === 'manager') {
									data.updateDockerDeployerNodes(soajs, BL.model, 'add', node.Description.Hostname, function (error) {
										checkIfError(soajs, res, {
											config: config,
											error: error,
											code: 819
										}, function () {
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
			});
		});
	},

	"removeNode": function (config, soajs, res) {
		var criteria = { id: soajs.inputmaskData.nodeId };
		var nodeRecord = {};

		function getNodeRecord(cb) {
			soajs.inputmaskData.env = soajs.inputmaskData.env.toUpperCase();
			data.getOneNode(soajs, BL.model, criteria, function (error, record) {
				checkIfError(soajs, res, {config: config, error: error || !record, code: 803}, function () {
					checkIfError(soajs, res, {config: config, error: record.role === 'manager', code: 821}, function () {
						nodeRecord = record;
						return cb();
					});
				});
			});
		}

		function getEnvRecord (cb) {
			data.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (error, envRecord) {
				checkIfError(soajs, res, {config: config, error: error || !envRecord, code: 402}, function () {
					return cb(envRecord);
				});
			});
		}

		function removeNodeFromSwarm (envRecord, cb, logBackgroundProgress) {
			var deployerConfig = getDeployerConfig(envRecord);
			deployerConfig.envCode = soajs.inputmaskData.env;

			deployer.removeNode(soajs, deployerConfig, nodeRecord, BL.model, function (error) {
				checkIfError(soajs, res, {config: config, error: error, code: ((error && error.code && !isNaN(error.code)) ? error.code : 804)}, cb);
			}, logBackgroundProgress);
		}

		function removeNodeRecord (cb) {
			data.removeNode(soajs, BL.model, criteria, function (error) {
				checkIfError(soajs, res, {config: config, error: error, code: 805}, function () {
					return cb();
				});
			});
		}

		function logBackgroundProgress (error) {
			if (error) {
				soajs.log.warn('Error occured while trying to remove ' + nodeRecord.name + ' from cluster');
				soajs.log.error(error);
			}
			else {
				soajs.log.info('Node ' + nodeRecord.name + ' was removed from cluster successfully');
			}
		}

		checkIfError(soajs, res, {config: config, error: soajs.inputmaskData.env.toLowerCase() !== 'dashboard', code: 818}, function () {
			getNodeRecord(function () {
				getEnvRecord(function (envRecord) {
					removeNodeFromSwarm(envRecord, function () {
						removeNodeRecord(function () {
							if (nodeRecord.role === 'manager') {
								data.updateDockerDeployerNodes(soajs, BL.model, 'remove', nodeRecord.name, function (error) {
									checkIfError(soajs, res, {config: config, error: error, code: 820}, function () {
										return res.jsonp(soajs.buildResponse(null, true));
									});
								});
							}
							else {
								return res.jsonp(soajs.buildResponse(null, true));
							}
						});
					}, logBackgroundProgress);
				});
			});
		});
	},

	"updateNode": function (config, soajs, res) {
		var criteria = { id: soajs.inputmaskData.nodeId }, update = { '$set': {} }, options = {};

		function getNodeRecord (cb) {
			soajs.inputmaskData.env = soajs.inputmaskData.env.toUpperCase();
			data.listNodes(soajs, BL.model, {}, function (error, nodes) {
				checkIfError(soajs, res, {config: config, error: error || nodes.length === 0, code: 803}, function () {
					checkIfError(soajs, res, {config: config, error: nodes.length === 1, code: 823}, function () {
						async.detect(nodes, function (oneNode, callback) {
							return callback((oneNode.id === soajs.inputmaskData.nodeId));
						}, function (nodeRecord) {
							checkIfError(soajs, res, {config: config, error: !nodeRecord, code: 803}, function () {
								return cb(nodeRecord);
							});
						});
					});
				});
			});
		}

		function buildUpdateOptions (nodeRecord, cb) {
			options.nodeId = nodeRecord.id;

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

		function updateNodeRecord (cb) {
			data.updateNode(soajs, BL.model, criteria, update, function (error) {
				checkIfError(soajs, res, {config: config, error: error, code: 807}, function () {
					return cb();
				});
			});
		}

		checkIfError(soajs, res, {config: config, error: soajs.inputmaskData.env.toLowerCase() !== 'dashboard', code: 818}, function () {
			getNodeRecord(function (nodeRecord) {
				buildUpdateOptions(nodeRecord, function () {
					getEnvRecord(function (envRecord) {
						updateNode(envRecord, function () {
							updateNodeRecord(function () {
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
			});
		});
	},

	"scaleHAService": function (config, soajs, res) {
		var criteria = {
			env: soajs.inputmaskData.env,
			serviceName: soajs.inputmaskData.name
		};
		data.getServiceContainers(soajs, BL.model, criteria, function (error, records) {
			checkIfError(soajs, res, {config: config, error: error || records.length === 0, code: 808}, function () {
				checkIfError(soajs, res, {
					config: config,
					error: records.length === soajs.inputmaskData.scale,
					code: 809
				}, function () {
					var scaling = (soajs.inputmaskData.scale > records.length) ? 'up' : 'down';
					data.getEnvironment(soajs, BL.model, soajs.inputmaskData.env.toUpperCase(), function (error, envRecord) {
						checkIfError(soajs, res, {config: config, error: error, code: 402}, function () {
							var deployerConfig = getDeployerConfig(envRecord);
							deployerConfig.envCode = soajs.inputmaskData.env;
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
									inspectService(soajs, deployerConfig, options, BL.model, soajs.inputmaskData.scale, function (error, serviceInfo) {
										checkIfError(soajs, res, {
											config: config,
											error: error,
											code: 811
										}, function () {
											scale[scaling](records, serviceInfo, deployerConfig, function (error) {
												checkIfError(soajs, res, {
													config: config,
													error: error,
													code: 812
												}, function () {
													if (scaling === 'down') {
														reloadControllerRegistry(soajs, envRecord, function () {
															return res.jsonp(soajs.buildResponse(null, true));
														});
													}
													else {
														return res.jsonp(soajs.buildResponse(null, true));
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
			});
		});

		var scale = {

			up: function (dockerRecords, serviceInfo, deployerConfig, cb) {
				var newInstances = [];
				async.each(serviceInfo.tasks, function (oneTask, callback) {
					var found = false;
					var taskName = serviceInfo.service.Spec.Name + '.' + oneTask.Slot;
					for (var i = 0; i < dockerRecords.length; i++) {
						if (dockerRecords[i].taskName === taskName) {
							found = true;
							break;
						}
					}

					if (!found) {
						newInstances.push(oneTask);
					}

					return callback(null, true);
				}, function (error, result) {
					var serviceInfo = {
						tasks: newInstances
					};
					var serviceType = ((soajs.inputmaskData.name.indexOf('nginx') !== -1) ? 'nginx' : 'service');
					return findAndSaveContainers(deployerConfig, soajs, data, serviceInfo, serviceType, soajs.inputmaskData.env, cb);
				});
			},

			down: function (dockerRecords, serviceInfo, deployerConfig, cb) {
				var rmInstances = [];
				async.each(dockerRecords, function (oneRecord, callback) {
					var found = false;
					for (var i = 0; i < serviceInfo.tasks.length; i++) {
						var taskName = serviceInfo.service.Spec.Name + '.' + serviceInfo.tasks[i].Slot;
						if (taskName === oneRecord.taskName) {
							found = true;
							break;
						}
					}

					if (!found) {
						rmInstances.push(oneRecord);
					}

					return callback(null, true);
				}, function (error, result) {
					async.each(rmInstances, function (oneInstance, callback) {
						data.removeContainerByTask(soajs, BL.model, soajs.inputmaskData.env, oneInstance.taskName, function (error) {
							if (error) {
								return callback(error);
							}

							delete criteria.taskName;
							criteria.serviceHATask = oneInstance.taskName;
							data.removeHostByTask(soajs, BL.model, soajs.inputmaskData.env, oneInstance.taskName, callback);
						});
					}, cb);
				});
			}
		};
	},

	"deleteHAService": function (config, soajs, res) {
		data.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (error, envRecord) {
			checkIfError(soajs, res, {config: config, error: error || !envRecord, code: 402}, function () {
				var deployerConfig = getDeployerConfig(envRecord);
				deployerConfig.envCode = soajs.inputmaskData.env;

				var options = {}, criteria = {};
				options.serviceName = soajs.inputmaskData.name;
				deployer.deleteHAService(soajs, deployerConfig, options, BL.model, function (error, result) {
					checkIfError(soajs, res, {
						config: config,
						error: error,
						code: ((error && error.code && !isNaN(error.code)) ? error.code : 813)
					}, function () {
						criteria = {
							serviceName: soajs.inputmaskData.name
						};
						removeDockerRecords(criteria, function (error) {
							checkIfError(soajs, res, {config: config, error: error, code: 814}, function () {
								criteria = {
									serviceHATask: new RegExp(soajs.inputmaskData.name + '.[0-9]+', 'g')
								};
								removeHostRecords(criteria, function (error) {
									checkIfError(soajs, res, {config: config, error: error, code: 815}, function () {

										//reload controllers registry in affected environment
										reloadControllerRegistry(soajs, envRecord, function () {
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

		function removeDockerRecords(criteria, cb) {
			data.removeServiceContainers(soajs, BL.model, criteria, cb);
		}

		function removeHostRecords(criteria, cb) {
			data.removeServiceHosts(soajs, BL.model, criteria, cb);
		}
	},

	"streamLogs": function (config, soajs, res) {
		data.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (error, envRecord) {
			checkIfError(soajs, res, {config: config, error: error, code: 402}, function () {
				var deployerConfig = getDeployerConfig(envRecord);
				deployerConfig.envCode = soajs.inputmaskData.env;
				var options = {taskName: soajs.inputmaskData.taskName};
				return deployer.getContainerlogs(soajs, deployerConfig, options, BL.model, res);

				// deployer.inspectHATask(soajs, deployerConfig, options, BL.model, function (error, taskInfo) {
				// 	checkIfError(soajs, res, {
				// 		config: config,
				// 		error: error || !taskInfo,
				// 		code: ((error && error.code && !isNaN(error.code)) ? error.code : 811)
				// 	}, function () {
				// 		options = {
				// 			nodeId: taskInfo.NodeID,
				// 			containerId: taskInfo.Status.ContainerStatus.ContainerID
				// 		};
				//
				// 		deployer.getContainerLogs(soajs, deployerConfig, options, BL.model, res);
				// 	});
				// });
			});
		});
	},

	"checkAnalytics": function (config, soajs, res) {
		data.getEnvAnalyticsRecord(soajs, BL.model, soajs.inputmaskData.env, function (error, record) {
			checkIfError(soajs, res, {config: config, error: error || !record, code: 816}, function () {
				return res.jsonp(soajs.buildResponse(null, {enabled: record.json.enabled}));
			});
		});
	},

	"activateAnalytics": function (config, soajs, res) {
		//TODO: not final, needs updating
		var elasticURL = 'elasticsearch:9200'; //TODO: MAKE DYNAMIC, ONLY SUPPORTS ELASTIC CONTAINERS IN SWARM FOR NOW
		var list = [
			{
				type: 'visual',
				route: '/.kibana/visualization/'
			},
			{
				type: 'dashboard',
				route: '/.kibana/dashboard/'
			},
			{
				type: 'search',
				route: '/.kibana/search/'
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
						data.updateAnalyticsRecord(soajs, BL.model, soajs.inputmaskData.env.toLowerCase(), update, function (error) {
							checkIfError(soajs, res, {config: config, error: error, code: 600}, function () {
								return res.jsonp(soajs.buildResponse(null, true));
							});
						});
					});
				});
			});
		});

		function putIntoElastic(type, route, cb) {
			data.getAnalyticsRecords(soajs, BL.model, type, function (error, content) {
				if (error) {
					return cb(error);
				}

				soajs.log.debug(type);
				soajs.log.debug(content);

				async.each(content, function (oneContent, callback) {
					var routeParam = route + oneContent.json.title.replace(/\s/g, '-');

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

					options = {
						method: 'PUT',
						uri: 'http://' + elasticURL + '/.kibana/index-pattern/topbeat-*',
						json: true,
						body: {
							title: 'topbeat-*',
							timeFieldName: '@timestamp'
						}
					};

					request(options, function (error, response, body) {
						if (error) return cb(error);

						return cb(null, true);
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
