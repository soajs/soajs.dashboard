'use strict';
var fs = require("fs");
var request = require("request");
var colName = "hosts";
var envColl = "environment";
var deployer = require("../utils/deployer.js");

function checkIfError(req, res, data, cb) {
	if (data.error) {
		if (typeof (data.error) === 'object' && data.error.message) {
			req.soajs.log.error(data.error);
		}

		return res.jsonp(req.soajs.buildResponse({"code": data.code, "msg": data.config.errors[data.code]}));
	} else {
		if (cb) return cb();
	}
}

function getdeployerConfig(envRecord) {
	var deployerConfig = envRecord.deployer;
	var driver = deployerConfig.selected.split(".");

	for (var i = 0; i < driver.length; i++) {
		deployerConfig = deployerConfig[driver[i]];
	}

	if (driver[driver.length - 1] === 'socket' && !deployerConfig.socketPath) {
		return null;
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

function deployNginx(config, mongo, req, res) {
	//from envCode, load env, get port and domain
	mongo.findOne(envColl, {code: req.soajs.inputmaskData.envCode.toUpperCase()}, function (err, envRecord) {
		checkIfError(req, res, {config: config, error: err || !envRecord, code: 600}, function () {
			req.soajs.log.debug("checking for old nginx container for environment: " + envRecord.code);
			var condition = {
				"env": req.soajs.inputmaskData.envCode.toLowerCase(),
				"hostname": "nginx_" + req.soajs.inputmaskData.envCode.toLowerCase()
			};
			mongo.findOne("docker", condition, function (error, oldNginx) {
				checkIfError(req, res, {config: config, error: error, code: 600}, function () {
					if (oldNginx) {
						removeOldNginx(oldNginx, envRecord);
					}
					else {
						req.soajs.log.debug("NO old Nginx container found, building new nginx...");
						rebuildNginx(envRecord);
					}
				});
			});
		});
	});

	function removeOldNginx(oldNginx, envRecord) {
		var condition = {
			"env": req.soajs.inputmaskData.envCode.toLowerCase(),
			"hostname": "nginx_" + req.soajs.inputmaskData.envCode.toLowerCase()
		};
		req.soajs.log.debug("Old Nginx container found, removing nginx ...");
		mongo.remove("docker", condition, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 600}, function () {
				deployer.remove(oldNginx.deployer, oldNginx.cid, mongo, function (error) {
					checkIfError(req, res, {config: config, error: error, code: 600}, function () {
						req.soajs.log.debug("Old Nginx container removed, building new nginx...");
						rebuildNginx(envRecord);
					});
				});
			});
		});
	}

	function getRunningControllers(cb) {
		var condition = {
			"env": req.soajs.inputmaskData.envCode.toLowerCase(),
			"running": true,
			"type": "controller"
		};
		mongo.find("docker", condition, function (error, controllers) {
			checkIfError(req, res, {config: config, error: error, code: 600}, function () {
				//no controllers found, no need to proceed
				if (!controllers || (controllers && controllers.length === 0)) {
					req.soajs.log.debug("No controllers found for environment: " + req.soajs.inputmaskData.envCode + ". No need to proceed.");
					return res.json(req.soajs.buildResponse(null, true));
				}
				else {
					condition = {
						"env": req.soajs.inputmaskData.envCode.toLowerCase(),
						"name": "controller"
					};
					mongo.find("hosts", condition, function (error, hostsData) {
						checkIfError(req, res, {config: config, error: error, code: 600}, function () {

							controllers.forEach(function (oneController) {
								hostsData.forEach(function (oneHostData) {
									if (oneController.hostname === oneHostData.hostname) {
										oneController.ip = oneHostData.ip;
									}
								});
							});
							return cb(controllers);
						});
					});
				}
			});
		});
	}

	function rebuildNginx(envRecord) {
		getRunningControllers(function (controllers) {

			getCustomUIConfigIfApplicable(function (error, customData) {
				checkIfError(req, res, {config: config, error: error, code: 600}, function () {

					var dockerParams = {
						"env": req.soajs.inputmaskData.envCode.toLowerCase(),
						"name": "nginxapi",
						"image": config.images.nginx,
						"variables": [
							"SOAJS_NX_CONTROLLER_NB=" + controllers.length,

							"SOAJS_NX_API_PORT=" + envRecord.port,
							"SOAJS_NX_API_DOMAIN=" + envRecord.apiPrefix + "." + envRecord.domain, //mydomain.com,

							"SOAJS_NX_SITE_DOMAIN=" + envRecord.sitePrefix + "." + envRecord.domain,
							"SOAJS_NX_SITE_PORT=" + envRecord.port
						],
						"Cmd": [
							'bash',
							'-c',
							'cd /opt/soajs/FILES/scripts/; ./runNginx.sh'
						]
					};

					checkIfError(req, res, {
						config: config,
						error: !envRecord.deployer.type || !envRecord.deployer.selected,
						code: 743
					}, function () {

						var deployerConfig = getdeployerConfig(envRecord);
						checkIfError(req, res, {
							config: config,
							error: !deployerConfig,
							code: 743
						}, function () {

							//if docker deploy expose the port
							if (envRecord.deployer.selected.indexOf("dockermachine") !== -1) {
								dockerParams["port"] = envRecord.port;
							}

							for (var i = 0; i < controllers.length; i++) {
								dockerParams.variables.push("SOAJS_NX_CONTROLLER_IP_" + (i + 1) + "=" + controllers[i].ip);
							}

							if (customData) {
								dockerParams.variables.push("SOAJS_GIT_REPO=" + customData.src.repo);
								dockerParams.variables.push("SOAJS_GIT_OWNER=" + customData.src.owner);
								dockerParams.variables.push("SOAJS_GIT_BRANCH=" + req.soajs.inputmaskData.nginxConfig.branch);
								dockerParams.variables.push("SOAJS_GIT_COMMIT=" + req.soajs.inputmaskData.nginxConfig.commit);
								if (customData.token) {
									dockerParams.variables.push("SOAJS_GIT_TOKEN=" + customData.token);
								}
							}

							req.soajs.log.debug("Calling create nginx container with params:", JSON.stringify(deployerConfig), JSON.stringify(dockerParams));
							deployer.createContainer(deployerConfig, dockerParams, mongo, function (error, data) {
								checkIfError(req, res, {config: config, error: error, code: 615}, function () {
									req.soajs.log.debug("Nginx Container Created, starting container with params:", JSON.stringify(deployerConfig), JSON.stringify(data));
									deployer.start(deployerConfig, data.Id, mongo, function (error) {
										checkIfError(req, res, {config: config, error: error, code: 615}, function () {
											req.soajs.log.debug("Nginx Container started. Saving nginx container information in docker collection.");
											var document = {
												"env": req.soajs.inputmaskData.envCode.toLowerCase(),
												"cid": data.Id,
												"hostname": "nginx_" + req.soajs.inputmaskData.envCode.toLowerCase(),
												"type": "nginx",
												"running": true,
												"deployer": deployerConfig
											};
											mongo.insert("docker", document, function (error) {
												checkIfError(req, res, {
													config: config,
													error: error,
													code: 615
												}, function () {
													return res.json(req.soajs.buildResponse(null, true));
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

		function getCustomUIConfigIfApplicable(cb) {
			if (req.soajs.inputmaskData.nginxConfig && req.soajs.inputmaskData.nginxConfig.customUIId) {
				var id = req.soajs.inputmaskData.nginxConfig.customUIId;
				try {
					id = mongo.ObjectId(id);
				} catch (e) {
					return cb(e);
				}

				mongo.findOne('staticContent', {'_id': id}, function (error, srcRecord) {
					if (error) {
						return cb(error);
					}

					if (srcRecord) {
						var repoLabel = srcRecord.src.owner + '/' + srcRecord.src.repo;
						mongo.findOne('git_accounts', {'repos.name': repoLabel}, {token: 1}, function (error, tokenRecord) {
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
	}
}

function registerHost(req, res, mongo, config, data, deployerConfig, info, cb) {
	var document = {
		"cid": data.Id,
		"env": req.soajs.inputmaskData.envCode.toLowerCase(),
		"hostname": data.Name || data.name, //Config.Hostname,
		"type": info.type,
		"running": true,
		"deployer": deployerConfig
	};
	document.hostname = document.hostname.replace("/", "");
	mongo.insert("docker", document, function (error) {
		checkIfError(req, res, {config: config, error: error, code: 615}, function () {
			return cb();
		});
	});
}

function updateHostWithNetworkInfo(req, res, mongo, config, data, info, deployerConfig) {
	var ipValue;
	if (deployerConfig.config && deployerConfig.config.HostConfig && data.NetworkSettings && data.NetworkSettings.Networks && data.NetworkSettings.Networks[deployerConfig.config.HostConfig.NetworkMode]) {
		ipValue = data.NetworkSettings.Networks[deployerConfig.config.HostConfig.NetworkMode].IPAddress;
	} else {
		ipValue = data.NetworkSettings.IPAddress;
	}

	var newHost = {
		"version": req.soajs.inputmaskData.version,
		"env": req.soajs.inputmaskData.envCode.toLowerCase(),
		"name": info.name,
		"hostname": data.Name || data.name, //data.Config.Hostname
		"src": {
			"commit": req.soajs.inputmaskData.commit,
			"branch": req.soajs.inputmaskData.branch
		},
		"ip": ipValue
	};

	newHost.hostname = newHost.hostname.replace("/", "");
	mongo.insert(colName, newHost, function (error) {
		checkIfError(req, res, {config: config, error: error, code: 615}, function () {
			mongo.find(colName, {
				"env": req.soajs.inputmaskData.envCode.toLowerCase(),
				"name": "controller"
			}, function (error, controllers) {
				checkIfError(req, res, {config: config, error: error, code: 600}, function () {
					return res.json(req.soajs.buildResponse(null, {
						'cid': data.Id,
						'hostname': newHost.hostname, //data.Config.Hostname,
						"ip": ipValue,
						"controllers": controllers
					}));
				});
			});
		});
	});
}

function getDashDbInfo(mongo, cb) {
	mongo.findOne(envColl, {'code': 'DASHBOARD'}, {'dbs': 1}, function (error, envRecord) {
		if (error) {
			return cb(error);
		}

		var clusterName = envRecord.dbs.config.session.cluster;
		var data = {
			mongoDbs: envRecord.dbs.clusters[clusterName].servers,
			clusterInfo: envRecord.dbs.clusters[clusterName]
		};
		return cb(null, data);
	});
}

//todo: remove zombie containers
//todo: when deploying env for first time, loop and turn off all old containers

module.exports = {

	"deployController": function (config, mongo, req, res) {
		checkIfError(req, res, {
			config: config,
			error: req.soajs.inputmaskData.envCode.toLowerCase() === 'dashboard',
			code: 750
		}, function () {
			mongo.findOne(envColl, {code: req.soajs.inputmaskData.envCode.toUpperCase()}, function (err, envRecord) {
				checkIfError(req, res, {config: config, error: err || !envRecord, code: 600}, function () {
					checkIfError(req, res, {
						config: config,
						error: envRecord.deployer.type === 'manual',
						code: 618
					}, function () {
						getDashDbInfo(mongo, function (error, data) {
							checkIfError(req, res, {config: config, error: error, code: 600}, function () {
								var mongoDbs = data.mongoDbs;
								var clusterInfo = data.clusterInfo;

								var repoLabel = req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo;
								mongo.findOne("git_accounts", {'repos.name': repoLabel}, function (error, accountRecord) {
									checkIfError(req, res, {
										config: config,
										error: error || !accountRecord,
										code: 600
									}, function () {
										mongo.findOne("services", {name: 'controller'}, function (error, ctrlRecord) {
											checkIfError(req, res, {
												config: config,
												error: error || !ctrlRecord,
												code: 600
											}, function () {
												var dockerParams = {
													"image": config.images.services,
													"name": "controller",
													"env": req.soajs.inputmaskData.envCode.toLowerCase(),
													"variables": [
														"SOAJS_SRV_AUTOREGISTERHOST=false",
														"NODE_ENV=production",
														"SOAJS_PROFILE=" + envRecord.profile,
														"SOAJS_MONGO_NB=" + mongoDbs.length,

														"SOAJS_GIT_OWNER=" + req.soajs.inputmaskData.owner,
														"SOAJS_GIT_REPO=" + req.soajs.inputmaskData.repo,
														"SOAJS_GIT_BRANCH=" + req.soajs.inputmaskData.branch,
														"SOAJS_GIT_COMMIT=" + req.soajs.inputmaskData.commit
													],
													"Cmd": [
														'bash',
														'-c',
														'/opt/soajs/FILES/scripts/runService.sh'
													]
												};

												if (ctrlRecord.src && ctrlRecord.src.cmd) {
													if (Array.isArray(ctrlRecord.src.cmd) && ctrlRecord.src.cmd.length > 0) {
														var commands = ctrlRecord.src.cmd.join("; ");
														dockerParams.Cmd[2] = commands + "; " + dockerParams.Cmd[2];
													}
												}

												if (ctrlRecord.src && ctrlRecord.src.main) {
													dockerParams.Cmd[2] = dockerParams.Cmd[2] + ' ' + ctrlRecord.src.main;
												}

												//adding info about database servers
												for (var i = 0; i < mongoDbs.length; i++) {
													dockerParams.variables.push("SOAJS_MONGO_IP_" + (i + 1) + "=" + mongoDbs[i].host);
													dockerParams.variables.push("SOAJS_MONGO_PORT_" + (i + 1) + "=" + mongoDbs[i].port);
												}

												//if replica set is used, add name to env variables
												if (clusterInfo.extraParam && clusterInfo.extraParam.replSet && clusterInfo.extraParam.replSet.rs_name) {
													dockerParams.variables.push("SOAJS_MONGO_RSNAME=" + clusterInfo.extraParam.replSet.rs_name);
												}

												//if private repo, add token to env variables
												if (accountRecord.token) {
													dockerParams.variables.push("SOAJS_GIT_TOKEN=" + accountRecord.token);
												}

												//Add additional variables if any
												if (req.soajs.inputmaskData.variables && req.soajs.inputmaskData.variables.length > 0) {
													dockerParams.variables = dockerParams.variables.concat(req.soajs.inputmaskData.variables);
												}
												deployControllers(0, req.soajs.inputmaskData.number, envRecord, dockerParams, function () {
													deployNginx(config, mongo, req, res);
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

		function deployControllers(counter, max, envRecord, dockerParams, cb) {
			var deployerConfig = getdeployerConfig(envRecord);
			checkIfError(req, res, {
				config: config,
				error: !deployerConfig,
				code: 743
			}, function () {
				req.soajs.log.debug("Calling create controller container:", JSON.stringify(deployerConfig), JSON.stringify(dockerParams));
				deployer.createContainer(deployerConfig, dockerParams, mongo, function (error, data) {
					checkIfError(req, res, {
						config: config,
						error: error,
						code: (error && error.code === 741) ? error.code : 615
					}, function () {
						req.soajs.log.debug("Controller Container Created, starting container:", JSON.stringify(deployerConfig), JSON.stringify(data));
						registerNewControllerHost(data, deployerConfig, function () {
							counter++;

							deployer.start(deployerConfig, data.Id, mongo, function (error, data) {
								checkIfError(req, res, {config: config, error: error, code: 615}, function () {
									req.soajs.log.debug("Controller Container started, saving information in core_provision", JSON.stringify(data));

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
				"env": req.soajs.inputmaskData.envCode.toLowerCase(),
				"hostname": data.Name || data.name, //data.Config.Hostname,
				"running": true,
				"type": "controller",
				"deployer": deployerConfig
			};
			document.hostname = document.hostname.replace("/", "");
			mongo.insert("docker", document, function (error) {
				checkIfError(req, res, {config: config, error: error, code: 615}, function () {
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
				"version": req.soajs.inputmaskData.version,
				"env": req.soajs.inputmaskData.envCode.toLowerCase(),
				"name": "controller",
				"hostname": data.Name || data.name, //data.Config.Hostname
				"src": {
					"commit": req.soajs.inputmaskData.commit,
					"branch": req.soajs.inputmaskData.branch
				},
				"ip": ipValue
			};

			newHost.hostname = newHost.hostname.replace("/", "");
			mongo.insert(colName, newHost, function (error) {
				checkIfError(req, res, {config: config, error: error, code: 615}, function () {
					return cb(null, true);
				});
			});
		}
	},

	"deployService": function (config, mongo, req, res) {
		var serviceName, serviceOrig;
		//if gc info, check if gc exists before proceeding
		mongo.findOne(envColl, {code: req.soajs.inputmaskData.envCode.toUpperCase()}, function (err, envRecord) {
			checkIfError(req, res, {config: config, error: err || !envRecord, code: 600}, function () {
				checkIfError(req, res, {
					config: config,
					error: envRecord.deployer.type === 'manual',
					code: 618
				}, function () {
					getDashDbInfo(mongo, function (error, data) {
						checkIfError(req, res, {config: config, error: error, code: 600}, function () {
							var mongoDbs = data.mongoDbs;
							var clusterInfo = data.clusterInfo;

							serviceOrig = serviceName = req.soajs.inputmaskData.name;
							if (req.soajs.inputmaskData.gcName) {
								serviceName = req.soajs.inputmaskData.gcName;
								serviceOrig = 'gcs';
							}

							var repoLabel = req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo;
							mongo.findOne("git_accounts", {"repos.name": repoLabel}, {
								token: 1,
								'repos.$': 1
							}, function (err, accountRecord) {
								checkIfError(req, res, {
									config: config,
									error: err || !accountRecord,
									code: 600
								}, function () {
									mongo.findOne("services", {name: serviceName}, function (error, serviceRecord) {
										checkIfError(req, res, {
											config: config,
											error: error || !serviceRecord,
											code: 600
										}, function () {
											var dockerParams = {
												"env": req.soajs.inputmaskData.envCode.toLowerCase(),
												"name": serviceName,
												"image": config.images.services,
												"variables": [
													"SOAJS_SRV_AUTOREGISTERHOST=false",
													"NODE_ENV=production",
													"SOAJS_PROFILE=" + envRecord.profile,

													"SOAJS_MONGO_NB=" + mongoDbs.length,

													"SOAJS_GIT_OWNER=" + req.soajs.inputmaskData.owner,
													"SOAJS_GIT_REPO=" + req.soajs.inputmaskData.repo,
													"SOAJS_GIT_BRANCH=" + req.soajs.inputmaskData.branch,
													"SOAJS_GIT_COMMIT=" + req.soajs.inputmaskData.commit
												],
												"Cmd": [
													'bash',
													'-c',
													'/opt/soajs/FILES/scripts/runService.sh'
												]
											};

											if (serviceRecord.src && serviceRecord.src.cmd) {
												if (Array.isArray(serviceRecord.src.cmd) && serviceRecord.src.cmd.length > 0) {
													var commands = serviceRecord.src.cmd.join("; ");
													dockerParams.Cmd[2] = commands + "; " + dockerParams.Cmd[2];
												}
											}

											if (serviceRecord.src && serviceRecord.src.main) {
												dockerParams.Cmd[2] = dockerParams.Cmd[2] + ' ' + serviceRecord.src.main;
											}

											//adding info about database servers
											for (var i = 0; i < mongoDbs.length; i++) {
												dockerParams.variables.push("SOAJS_MONGO_IP_" + (i + 1) + "=" + mongoDbs[i].host);
												dockerParams.variables.push("SOAJS_MONGO_PORT_" + (i + 1) + "=" + mongoDbs[i].port);
											}

											//if replica set is used, add name to env variables
											if (clusterInfo.extraParam && clusterInfo.extraParam.replSet && clusterInfo.extraParam.replSet.rs_name) {
												dockerParams.variables.push("SOAJS_MONGO_RSNAME=" + clusterInfo.extraParam.replSet.rs_name);
											}

											//if private repo, add token to env variables
											if (accountRecord.token) {
												dockerParams.variables.push("SOAJS_GIT_TOKEN=" + accountRecord.token);
											}

											//if gc, add gc info to env variables
											if (req.soajs.inputmaskData.gcName) {
												dockerParams.variables.push("SOAJS_GC_NAME=" + req.soajs.inputmaskData.gcName);
												dockerParams.variables.push("SOAJS_GC_VERSION=" + req.soajs.inputmaskData.gcVersion);
											}

											//Add additional variables if any
											if (req.soajs.inputmaskData.variables && req.soajs.inputmaskData.variables.length > 0) {
												dockerParams.variables = dockerParams.variables.concat(req.soajs.inputmaskData.variables);
											}

											var deployerConfig = getdeployerConfig(envRecord);
											checkIfError(req, res, {
												config: config,
												error: !deployerConfig,
												code: 743
											}, function () {

												req.soajs.log.debug("Calling create service container with params:", JSON.stringify(deployerConfig), JSON.stringify(dockerParams));
												deployer.createContainer(deployerConfig, dockerParams, mongo, function (error, data) {
													checkIfError(req, res, {
														config: config,
														error: error,
														code: (error && error.code === 741) ? error.code : 615
													}, function () {
														req.soajs.log.debug("Service Container Created, starting container with params:", JSON.stringify(deployerConfig), JSON.stringify(data));
														var info = {
															type: "service",
															name: serviceName
														};
														registerHost(req, res, mongo, config, data, deployerConfig, info, function () {

															deployer.start(deployerConfig, data.Id, mongo, function (error, data) {
																checkIfError(req, res, {
																	config: config,
																	error: error,
																	code: 615
																}, function () {
																	req.soajs.log.debug("Service Container started, saving information in core_provision", JSON.stringify(data));
																	updateHostWithNetworkInfo(req, res, mongo, config, data, info, deployerConfig);
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
			});
		});
	},

	"deployDaemon": function (config, mongo, req, res) {
		var daemonName, daemonOrig;
		mongo.findOne(envColl, {code: req.soajs.inputmaskData.envCode.toUpperCase()}, function (error, envRecord) {
			checkIfError(req, res, {config: config, error: error || !envRecord, code: 600}, function () {
				checkIfError(req, res, {
					config: config,
					error: envRecord.deployer.type === 'manual',
					code: 618
				}, function () {
					getDashDbInfo(mongo, function (error, data) {
						checkIfError(req, res, {config: config, error: error, code: 600}, function () {
							var mongoDbs = data.mongoDbs;
							var clusterInfo = data.clusterInfo;

							daemonOrig = daemonName = req.soajs.inputmaskData.name;
							if (req.soajs.inputmaskData.gcName) {
								daemonName = req.soajs.inputmaskData.gcName;
								daemonOrig = "gcs";
							}

							var repoLabel = req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo;
							mongo.findOne("git_accounts", {"repos.name": repoLabel}, {
								token: 1,
								'repos.$': 1
							}, function (error, accountRecord) {
								checkIfError(req, res, {
									config: config,
									error: error || !accountRecord,
									code: 600
								}, function () {
									mongo.findOne("daemons", {name: daemonName}, function (error, daemonRecord) {
										checkIfError(req, res, {
											config: config,
											error: error || !daemonRecord,
											code: 600
										}, function () {
											var dockerParams = {
												"env": req.soajs.inputmaskData.envCode.toLowerCase(),
												"name": daemonName,
												"image": config.images.services,
												"variables": [
													"SOAJS_SRV_AUTOREGISTERHOST=false",
													"SOAJS_PROFILE=" + envRecord.profile,
													"NODE_ENV=production",

													"SOAJS_DAEMON_GRP_CONF=" + req.soajs.inputmaskData.grpConfName,

													"SOAJS_MONGO_NB=" + mongoDbs.length,

													"SOAJS_GIT_OWNER=" + req.soajs.inputmaskData.owner,
													"SOAJS_GIT_REPO=" + req.soajs.inputmaskData.repo,
													"SOAJS_GIT_BRANCH=" + req.soajs.inputmaskData.branch,
													"SOAJS_GIT_COMMIT=" + req.soajs.inputmaskData.commit
												],
												"Cmd": [
													'bash',
													'-c',
													'/opt/soajs/FILES/scripts/runService.sh'
												]
											};

											if (daemonRecord.src && daemonRecord.src.cmd) {
												if (Array.isArray(daemonRecord.src.cmd) && daemonRecord.src.cmd.length > 0) {
													var commands = daemonRecord.src.cmd.join("; ");
													dockerParams.Cmd[2] = commands + "; " + dockerParams.Cmd[2];
												}
											}

											//if main exists, get main path
											if (daemonRecord.src && daemonRecord.src.main) {
												dockerParams.Cmd[2] = dockerParams.Cmd[2] + ' ' + daemonRecord.src.main;
											}

											//adding info about database servers
											for (var i = 0; i < mongoDbs.length; i++) {
												dockerParams.variables.push("SOAJS_MONGO_IP_" + (i + 1) + "=" + mongoDbs[i].host);
												dockerParams.variables.push("SOAJS_MONGO_PORT_" + (i + 1) + "=" + mongoDbs[i].port);
											}

											//if replica set is used, add name to env variables
											if (clusterInfo.extraParam && clusterInfo.extraParam.replSet && clusterInfo.extraParam.replSet.rs_name) {
												dockerParams.variables.push("SOAJS_MONGO_RSNAME=" + clusterInfo.extraParam.replSet.rs_name);
											}

											//if private repo, add token to env variables
											if (accountRecord.token) {
												dockerParams.variables.push("SOAJS_GIT_TOKEN=" + accountRecord.token);
											}

											//if gc, add gc info to env variables
											if (req.soajs.inputmaskData.gcName) {
												dockerParams.variables.push("SOAJS_GC_NAME=" + req.soajs.inputmaskData.gcName);
												dockerParams.variables.push("SOAJS_GC_VERSION=" + req.soajs.inputmaskData.gcVersion);
											}

											//Add additional variables if any
											if (req.soajs.inputmaskData.variables && req.soajs.inputmaskData.variables.length > 0) {
												dockerParams.variables = dockerParams.variables.concat(req.soajs.inputmaskData.variables);
											}

											var deployerConfig = getdeployerConfig(envRecord);
											checkIfError(req, res, {
												config: config,
												error: !deployerConfig,
												code: 743
											}, function () {

												req.soajs.log.debug("Calling create daemon container with params:", JSON.stringify(deployerConfig), JSON.stringify(dockerParams));
												deployer.createContainer(deployerConfig, dockerParams, mongo, function (error, data) {
													checkIfError(req, res, {
														config: config,
														error: error,
														code: (error && error.code === 741) ? error.code : 615
													}, function () {
														req.soajs.log.debug("Daemon Container Created, starting container with params:", JSON.stringify(deployerConfig), JSON.stringify(data));
														var info = {
															type: "daemon",
															name: daemonName
														};
														registerHost(req, res, mongo, config, data, deployerConfig, info, function () {
															deployer.start(deployerConfig, data.Id, mongo, function (error, data) {
																checkIfError(req, res, {
																	config: config,
																	error: error,
																	code: 615
																}, function () {
																	req.soajs.log.debug("Daemon Container started, saving information in core_provision");
																	//get the ip of the host from hosts

																	updateHostWithNetworkInfo(req, res, mongo, config, data, info, deployerConfig);
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
			});
		});
	},

	"list": function (config, mongo, req, res) {
		mongo.findOne(envColl, {code: req.soajs.inputmaskData.env.toUpperCase()}, function (err, envRecord) {
			checkIfError(req, res, {config: config, error: err || !envRecord, code: 600}, function () {
				mongo.find(colName, {env: req.soajs.inputmaskData.env.toLowerCase()}, function (err, hosts) {
					checkIfError(req, res, {config: config, error: err, code: 600}, function () {
						mongo.find('docker', {env: req.soajs.inputmaskData.env.toLowerCase()}, function (err, containers) {
							checkIfError(req, res, {config: config, error: err, code: 600}, function () {
								hosts.forEach(function (oneHost) {
									containers.forEach(function (oneContainer) {
										if (oneHost.hostname === oneContainer.hostname) {
											oneHost.cid = oneContainer.cid;
										}
									});
								});
								return res.jsonp(req.soajs.buildResponse(null, {
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

	"listNginx": function (config, mongo, req, res) {
		var criteria = {
			env: req.soajs.inputmaskData.env.toLowerCase(),
			type: 'nginx'
		};
		mongo.find('docker', criteria, function (error, records) {
			checkIfError(req, res, {config: config, error: error, code: 600}, function () {
				return res.jsonp(req.soajs.buildResponse(null, records));
			});
		});
	},

	"delete": function (config, mongo, req, res) {
		var dockerColCriteria = {
			'env': req.soajs.inputmaskData.env.toLowerCase(),
			'hostname': req.soajs.inputmaskData.hostname
		};

		var rebuildNginx = false;
		mongo.findOne(envColl, {code: req.soajs.inputmaskData.env.toUpperCase()}, function (err, envRecord) {
			checkIfError(req, res, {config: config, error: err || !envRecord, code: 600}, function () {
				if (envRecord.deployer.type === 'manual') {
					removeHost(envRecord.deployer.type, rebuildNginx, null);
				}
				else {
					mongo.findOne("docker", dockerColCriteria, function (error, dockerRecord) {
						checkIfError(req, res, {config: config, error: error, code: 600}, function () {
							if (dockerRecord.type === 'controller') {
								rebuildNginx = true;
							}

							removeHost(envRecord.deployer.type, rebuildNginx, dockerRecord);
						});
					});
				}
			});
		});

		function removeHost(deployerType, rebuildNginx, dockerRecord) {
			var hostCriteria = {
				'env': req.soajs.inputmaskData.env.toLowerCase(),
				'name': req.soajs.inputmaskData.name,
				'ip': req.soajs.inputmaskData.ip
			};
			mongo.remove(colName, hostCriteria, function (error) {
				checkIfError(req, res, {config: config, error: error, code: 600}, function () {
					if (deployerType === 'container') {
						removeDockerContainer(dockerRecord, rebuildNginx);
					}
					else {
						return res.jsonp(req.soajs.buildResponse(null, true));
					}
				});
			});
		}

		function removeDockerContainer(dockerRecord, rebuildNginx) {
			deployer.remove(dockerRecord.deployer, dockerRecord.cid, mongo, function (error) {
				checkIfError(req, res, {config: config, error: error, code: 600}, function () {
					mongo.remove('docker', {'_id': dockerRecord._id}, function (err) {
						checkIfError(req, res, {config: config, error: err, code: 600}, function () {
							if (rebuildNginx) {
								req.soajs.log.debug("Deleted controller container, rebuilding Nginx ....");
								req.soajs.inputmaskData.envCode = req.soajs.inputmaskData.env.toUpperCase();
								deployNginx(config, mongo, req, res);
							}
							else {
								return res.jsonp(req.soajs.buildResponse(null, true));
							}
						});
					});
				});
			});
		}
	},

	"maintenanceOperation": function (config, mongo, req, res) {
		req.soajs.inputmaskData.env = req.soajs.inputmaskData.env.toLowerCase();
		checkIfError(req, res, {
			config: config,
			error: req.soajs.inputmaskData.operation === 'awarenessStat' && req.soajs.inputmaskData.serviceName !== 'controller',
			code: 602
		}, function () {
			checkIfError(req, res, {
				config: config,
				error: req.soajs.inputmaskData.operation === 'loadProvision' && req.soajs.inputmaskData.serviceName === 'controller',
				code: 602
			}, function () {
				//check that the given service has the given port in services collection
				if (req.soajs.inputmaskData.serviceName === 'controller') {
					checkServiceHost();
				}
				else {
					mongo.findOne('services', {
						'name': req.soajs.inputmaskData.serviceName,
						'port': req.soajs.inputmaskData.servicePort
					}, function (error, record) {
						checkIfError(req, res, {config: config, error: error, code: 603}, function () {
							if (!record) {
								mongo.findOne('daemons', {
									'name': req.soajs.inputmaskData.serviceName,
									'port': req.soajs.inputmaskData.servicePort
								}, function (error, record) {
									checkIfError(req, res, {config: config, error: error, code: 603}, function () {
										checkIfError(req, res, {
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
			var condition = {
				'env': req.soajs.inputmaskData.env.toLowerCase(),
				"name": req.soajs.inputmaskData.serviceName
			};
			if (req.soajs.inputmaskData.ip) {
				condition.ip = req.soajs.inputmaskData.serviceHost;
			}
			else {
				condition.hostname = req.soajs.inputmaskData.hostname;
			}
			mongo.findOne(colName, condition, function (error, record) {
				checkIfError(req, res, {config: config, error: error, code: 603}, function () {
					checkIfError(req, res, {config: config, error: !record, code: 605}, function () {
						//perform maintenance operation
						doMaintenance(record);
					});
				});
			});
		}

		function doMaintenance(oneHost) {
			var criteria = {
				'env': req.soajs.inputmaskData.env.toLowerCase(),
				"hostname": req.soajs.inputmaskData.hostname
			};

			mongo.findOne(envColl, {'code': req.soajs.inputmaskData.env.toUpperCase()}, function (err, envRecord) {
				checkIfError(req, res, {config: config, error: err || !envRecord, code: 600}, function () {
					if (!envRecord.deployer) {
						req.soajs.log.error('Missing deployer obj');
					}
					checkIfError(req, res, {
						config: config,
						error: req.soajs.inputmaskData.operation === 'hostLogs' && envRecord.deployer.type === 'manual',
						code: 619
					}, function () {
						switch (req.soajs.inputmaskData.operation) {
							case 'hostLogs':
								mongo.findOne("docker", criteria, function (error, response) {
									checkIfError(req, res, {config: config, error: error, code: 603}, function () {
										var deployerConfig;
										if (response) {
											deployerConfig = response.deployer;
											deployer.info(deployerConfig, response.cid, req, res, mongo);
										}
										else {
											req.soajs.log.error('No response obj');
											checkIfError(req, res, {
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
								req.soajs.inputmaskData.servicePort = req.soajs.inputmaskData.servicePort + 1000;
								var maintenanceURL = "http://" + oneHost.ip + ":" + req.soajs.inputmaskData.servicePort;
								maintenanceURL += "/" + req.soajs.inputmaskData.operation;
								request.get(maintenanceURL, function (error, response, body) {
									checkIfError(req, res, {config: config, error: error, code: 603}, function () {
										return res.jsonp(req.soajs.buildResponse(null, JSON.parse(body)));
									});
								});
								break;
						}
					});
				});
			});
		}
	},

	"getContainerLogs": function (config, mongo, req, res) {
		mongo.findOne(envColl, {code: req.soajs.inputmaskData.env.toUpperCase()}, function (error, envRecord) {
			checkIfError(req, res, {config: config, error: error || !envRecord, code: 600}, function () {
				checkIfError(req, res, {config: config, error: envRecord.deployer.type === 'manual', code: 619}, function () {
					var criteria = {
						env: req.soajs.inputmaskData.env.toLowerCase(),
						cid: req.soajs.inputmaskData.cid
					};

					mongo.findOne('docker', criteria, function (error, record) {
						checkIfError(req, res, {config: config, error: error || !record, code: 600}, function () {
							var deployerConfig = record.deployer;
							deployer.info(deployerConfig, record.cid, req, res, mongo);
						});
					});
				});
			});
		});
	},

	"getContainersNoHost": function (config, mongo, req, res) {
		mongo.findOne(envColl, {code: req.soajs.inputmaskData.envCode.toUpperCase()}, function (err, envRecord) {
			checkIfError(req, res, {config: config, error: err || !envRecord, code: 772}, function () {

				if (envRecord.deployer.type === 'manual') {
					return res.json(req.soajs.buildResponse(null, []));
				}

				mongo.find("docker", {
					"env": req.soajs.inputmaskData.envCode.toLowerCase(),
					"type": {"$exists": 1}
				}, function (error, containers) {
					checkIfError(req, res, {config: config, error: error, code: 772}, function () {

						mongo.find("hosts", {
							"env": req.soajs.inputmaskData.envCode.toLowerCase()
						}, function (error, hosts) {
							checkIfError(req, res, {config: config, error: error, code: 772}, function () {

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

								return res.json(req.soajs.buildResponse(null, containers));
							});
						});
					});
				});
			});
		});
	},

	"deleteZombieContainer": function (config, mongo, req, res) {
		var criteria = {
			env: req.soajs.inputmaskData.envCode.toLowerCase(),
			cid: req.soajs.inputmaskData.cid
		};

		mongo.findOne('docker', criteria, function (error, record) {
			checkIfError(req, res, {config: config, error: error || !record, code: 773}, function () {
				var deployerConfig = record.deployer;
				deployer.remove(deployerConfig, record.cid, mongo, function (error) {
					if (error) {
						req.soajs.log.error(error);
					} else {
						req.soajs.log.debug("Zombie container has been deleted from " + req.soajs.inputmaskData.envCode + " environment.");
					}
				});

				mongo.remove('docker', criteria, function (error) {
					checkIfError(req, res, {config: config, error: error, code: 773}, function () {
						req.soajs.log.debug("Zombie container has been removed from docker collection");
						return res.jsonp(req.soajs.buildResponse(null, true));
					});
				});
			});
		});
	}
};
