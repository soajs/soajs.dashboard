'use strict';
var fs = require("fs");
var request = require("request");
var colName = "hosts";
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

function deployNginx(config, mongo, req, res) {
	//from envCode, load env, get port and domain
	mongo.findOne("environment", {code: req.soajs.inputmaskData.envCode.toUpperCase()}, function (err, envRecord) {
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
			var dockerParams = {
				"env": req.soajs.inputmaskData.envCode.toLowerCase(),
				"name": "nginxapi",
				"image": config.images.nginx,
				"port": envRecord.port,
				"variables": [
					"SOAJS_NX_CONTROLLER_NB=" + controllers.length,

					"SOAJS_NX_API_PORT=" + envRecord.port,
					"SOAJS_NX_API_DOMAIN=api." + envRecord.domain, //mydomain.com,

					"SOAJS_NX_SITE_DOMAIN=site." + envRecord.domain,
					"SOAJS_NX_SITE_PORT=" + envRecord.port
				],
				"Cmd": [
					'bash',
					'-c',
					'cd /opt/soajs/FILES/scripts/; ./runNginx.sh'
				]
			};

			for (var i = 0; i < controllers.length; i++) {
				dockerParams.variables.push("SOAJS_NX_CONTROLLER_IP_" + (i + 1) + "=" + controllers[i].ip);
			}

			getCustomUIConfigIfApplicable(function (error, customData) {
				checkIfError(req, res, {config: config, error: error, code: 600}, function () {
					if (customData) {
						dockerParams.variables.push("SOAJS_GIT_REPO=" + customData.src.repo);
						dockerParams.variables.push("SOAJS_GIT_OWNER=" + customData.src.owner);
						dockerParams.variables.push("SOAJS_GIT_BRANCH=" + req.soajs.inputmaskData.nginxConfig.branch);
						dockerParams.variables.push("SOAJS_GIT_COMMIT=" + req.soajs.inputmaskData.nginxConfig.commit);
						if (customData.token) {
							dockerParams.variables.push("SOAJS_GIT_TOKEN=" + customData.token);
						}
					}

					var deployerConfig = envRecord.deployer;
					var driver = deployerConfig.selected.split(".");
					deployerConfig = deployerConfig[driver[0]][driver[1]][driver[2]];
					deployerConfig.driver = {
						'type': envRecord.deployer.type,
						'driver': 'docker'
					};
					deployerConfig.selectedDriver = envRecord.deployer.selected.replace(driver[0] + '.', '').replace(/\./, " - ");
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
										"deployer": deployerConfig
									};
									mongo.insert("docker", document, function (error) {
										checkIfError(req, res, {config: config, error: error, code: 615}, function () {
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
						return cb (error);
					}

					if (srcRecord) {
						var repoLabel = srcRecord.src.owner + '/' + srcRecord.src.repo;
						mongo.findOne('git_accounts', {'repos.name': repoLabel}, {token: 1}, function (error, tokenRecord) {
							if (error) {
								return cb (error);
							}
							if (tokenRecord.token) {
								srcRecord.token = tokenRecord.token;
							}

							cb(null, srcRecord);
						});
					}
					else {
						return cb ();
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
			var newHost = {
				"version": req.soajs.inputmaskData.version,
				"env": req.soajs.inputmaskData.envCode.toLowerCase(),
				"name": info.name,
				"hostname": data.Name || data.name, //data.Config.Hostname
				"src": {
					"commit": req.soajs.inputmaskData.commit,
					"branch": req.soajs.inputmaskData.branch
				}
			};

			newHost.hostname = newHost.hostname.replace("/", "");
			mongo.insert(colName, newHost, function (error, hostRecord) {
				checkIfError(req, res, {config: config, error: error, code: 615}, function () {
					return cb(hostRecord);
				});
			});
		});
	});
}

function updateHostWithNetworkInfo(req, res, mongo, config, data, deployerConfig, hostRecord) {
	var ipValue;
	if (data.NetworkSettings && data.NetworkSettings.Networks && data.NetworkSettings.Networks[deployerConfig.config.HostConfig.NetworkMode]) {
		ipValue = data.NetworkSettings.Networks[deployerConfig.config.HostConfig.NetworkMode].IPAddress;
	} else {
		ipValue = data.NetworkSettings.IPAddress;
	}

	var document = {
		"$set":{
			"ip": ipValue
		}
	};

	mongo.update(colName, { "_id": hostRecord._id }, document, {"upsert":false}, function (error) {
		checkIfError(req, res, {config: config, error: error, code: 615}, function () {

			mongo.find(colName, {
				"env": req.soajs.inputmaskData.envCode.toLowerCase(),
				"name": "controller"
			}, function (error, controllers) {
				checkIfError(req, res, {config: config, error: error, code: 600}, function () {
					return res.json(req.soajs.buildResponse(null, {
						'cid': data.Id,
						'hostname': hostRecord.hostname, //data.Config.Hostname,
						"ip": ipValue,
						"controllers": controllers
					}));
				});
			});
		});
	});
}

function getDashDbInfo(mongo, cb) {
	mongo.findOne("environment", {'code': 'DASHBOARD'}, {'dbs': 1}, function (error, envRecord) {
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
			mongo.findOne("environment", {code: req.soajs.inputmaskData.envCode.toUpperCase()}, function (err, envRecord) {
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

												if (ctrlRecord.src.main) {
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
			var deployerConfig = envRecord.deployer;
			var driver = deployerConfig.selected.split(".");
			deployerConfig = deployerConfig[driver[0]][driver[1]][driver[2]]; //need to add manual OR cloud here, if cloud, need to go further one level to get configs
			deployerConfig.driver = {
				'type': envRecord.deployer.type,
				'driver': 'docker'
			};
			deployerConfig.selectedDriver = envRecord.deployer.selected.replace(driver[0] + '.', '').replace(/\./, " - ");
			req.soajs.log.debug("Calling create controller container:", JSON.stringify(deployerConfig), JSON.stringify(dockerParams));
			deployer.createContainer(deployerConfig, dockerParams, mongo, function (error, data) {
				checkIfError(req, res, {
					config: config,
					error: error,
					code: (error && error.code) ? error.code : 615
				}, function () {
					req.soajs.log.debug("Controller Container Created, starting container:", JSON.stringify(deployerConfig), JSON.stringify(data));
					registerNewControllerHost(data, deployerConfig, function (hostDBRecord) {
						counter++;

						deployer.start(deployerConfig, data.Id, mongo, function (error, data) {
							checkIfError(req, res, {config: config, error: error, code: 615}, function () {
								req.soajs.log.debug("Controller Container started, saving information in core_provision");

								updateControllerHostWithNetworkInfo(data, deployerConfig, hostDBRecord, function(){
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
					var newHost = {
						"version": req.soajs.inputmaskData.version,
						"env": req.soajs.inputmaskData.envCode.toLowerCase(),
						"name": "controller",
						"hostname": data.Name || data.name, //data.Config.Hostname
						"src": {
							"commit": req.soajs.inputmaskData.commit,
							"branch": req.soajs.inputmaskData.branch
						}
					};

					newHost.hostname = newHost.hostname.replace("/", "");
					mongo.insert(colName, newHost, function (error, record) {
						checkIfError(req, res, {config: config, error: error, code: 615}, function () {
							return cb(record);
						});
					});
				});
			});
		}

		function updateControllerHostWithNetworkInfo(data, deployerConfig, hostRecord, cb) {
			var ipValue;
			if (data.NetworkSettings && data.NetworkSettings.Networks && data.NetworkSettings.Networks[deployerConfig.config.HostConfig.NetworkMode]) {
				ipValue = data.NetworkSettings.Networks[deployerConfig.config.HostConfig.NetworkMode].IPAddress;
			} else {
				ipValue = data.NetworkSettings.IPAddress;
			}

			var document = {
				"$set":{
					"ip": ipValue
				}
			};

			mongo.update(colName, { "_id": hostRecord._id }, document, {"upsert":false}, function (error) {
				checkIfError(req, res, {config: config, error: error, code: 615}, function () {
					return cb();
				});
			});
		}
	},

	"deployService": function (config, mongo, req, res) {
		var serviceName, serviceOrig;
		//if gc info, check if gc exists before proceeding
		mongo.findOne("environment", {code: req.soajs.inputmaskData.envCode.toUpperCase()}, function (err, envRecord) {
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

											if (serviceRecord.src.main) {
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

											var deployerConfig = envRecord.deployer;
											var driver = deployerConfig.selected.split(".");
											deployerConfig = deployerConfig[driver[0]][driver[1]][driver[2]];
											deployerConfig.driver = {
												'type': envRecord.deployer.type,
												'driver': 'docker'
											};
											deployerConfig.selectedDriver = envRecord.deployer.selected.replace(driver[0] + '.', '').replace(/\./, " - ");
											req.soajs.log.debug("Calling create service container with params:", JSON.stringify(deployerConfig), JSON.stringify(dockerParams));
											deployer.createContainer(deployerConfig, dockerParams, mongo, function (error, data) {
												checkIfError(req, res, {
													config: config,
													error: error,
													code: (error && error.code) ? error.code : 615
												}, function () {
													req.soajs.log.debug("Service Container Created, starting container with params:", JSON.stringify(deployerConfig), JSON.stringify(data));
													var info = {
														type: "service",
														name: serviceName
													};
													registerHost(req, res, mongo, config, data, deployerConfig, info, function(hostRecord){

														deployer.start(deployerConfig, data.Id, mongo, function (error, data) {
															checkIfError(req, res, {
																config: config,
																error: error,
																code: 615
															}, function () {
																req.soajs.log.debug("Service Container started, saving information in core_provision");
																updateHostWithNetworkInfo(req, res, mongo, config, data, deployerConfig, hostRecord);
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
		mongo.findOne("environment", {code: req.soajs.inputmaskData.envCode.toUpperCase()}, function (error, envRecord) {
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

											//if main exists, get main path
											if (daemonRecord.src.main) {
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

											var deployerConfig = envRecord.deployer;
											var driver = deployerConfig.selected.split(".");
											deployerConfig = deployerConfig[driver[0]][driver[1]][driver[2]];
											deployerConfig.driver = {
												'type': envRecord.deployer.type,
												'driver': 'docker'
											};
											deployerConfig.selectedDriver = envRecord.deployer.selected.replace(driver[0] + '.', '').replace(/\./, " - ");
											deployer.createContainer(deployerConfig, dockerParams, mongo, function (error, data) {
												checkIfError(req, res, {
													config: config,
													error: error,
													code: (error && error.code) ? error.code : 615
												}, function () {
													req.soajs.log.debug("Daemon Container Created, starting container with params:", JSON.stringify(deployerConfig), JSON.stringify(data));
													var info = {
														type: "daemon",
														name: daemonName
													};
													registerHost(req, res, mongo, config, data, deployerConfig, info, function(hostRecord){
														deployer.start(deployerConfig, data.Id, mongo, function (error, data) {
															checkIfError(req, res, {
																config: config,
																error: error,
																code: 615
															}, function () {
																req.soajs.log.debug("Daemon Container started, saving information in core_provision");
																//get the ip of the host from hosts

																updateHostWithNetworkInfo(req, res, mongo, config, data, deployerConfig, hostRecord);
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
		mongo.findOne("environment", {code: req.soajs.inputmaskData.env.toUpperCase()}, function (err, envRecord) {
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

	"delete": function (config, mongo, req, res) {
		var dockerColCriteria = {
			'env': req.soajs.inputmaskData.env.toLowerCase(),
			'hostname': req.soajs.inputmaskData.hostname
		};

		var rebuildNginx = false;
		mongo.findOne("environment", {code: req.soajs.inputmaskData.env.toUpperCase()}, function (err, envRecord) {
			checkIfError(req, res, {config: config, error: err || !envRecord, code: 600}, function () {
				if (envRecord.deployer.type === 'manual') {
					removeFromHosts();
				}
				else {
					removeDockerRecord();
				}
			});
		});

		function removeDockerRecord() {
			mongo.findOne('docker', dockerColCriteria, function (error, response) {
				checkIfError(req, res, {config: config, error: error || !response, code: 600}, function () {
					if (response.type === 'controller') {
						rebuildNginx = true;
					}

					var deployerConfig = response.deployer;
					deployer.remove(deployerConfig, response.cid, mongo, function (error) {
						checkIfError(req, res, {config: config, error: error, code: 600}, function () {
							mongo.remove('docker', {'_id': response._id}, function (err) {
								checkIfError(req, res, {config: config, error: err, code: 600}, function () {
									removeFromHosts();
								});
							});
						});
					});
				});
			});
		}

		function removeFromHosts() {
			var hostCriteria = {
				'env': req.soajs.inputmaskData.env.toLowerCase(),
				'name': req.soajs.inputmaskData.name,
				'ip': req.soajs.inputmaskData.ip
			};
			mongo.remove(colName, hostCriteria, function (err) {
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

			mongo.findOne('environment', {'code': req.soajs.inputmaskData.env.toUpperCase()}, function (err, envRecord) {
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
										var deployerConfig = response.deployer;
										deployer.info(deployerConfig, response.cid, req, res, mongo);
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
	}
};