'use strict';
var fs = require("fs");
var async = require("async");
var request = require("request");
var shortid = require('shortid');

var utils = require("../../../utils/utils.js");
shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_');

var colls = {
	git: 'git_accounts',
	services: 'services',
	daemons: 'daemons',
	staticContent: 'staticContent',
	catalog: 'catalogs',
	cicd: 'cicd',
	infra: 'infra'
};

var helpers = require("./helper.js");

function checkIfError(soajs, mainCb, data, cb) {
	if (data.error) {
		soajs.log.error(data.error);
	}
	utils.checkErrorReturn(soajs, mainCb, data, cb);
}

var BL = {
	model: null,

	/**
	 * Deploy a new SOAJS service of type [ nginx || controller || service || daemon ], routes to specific function
	 *
	 * @param {Response Object} res
	 */
	"deployService": function (config, req, soajs, deployer, cbMain) {
		var context = {
			env: soajs.inputmaskData.env.toUpperCase(),
			envRecord: {},
			catalog: {},
			ports: {},
			variables: {},
			name: '',
			origin: ''
		};
		var options = {};
		soajs.log.info('deployService start');

		function getEnvInfo(cb) {
			soajs.log.info('Get env');
			//from envCode, load env, get port and domain
			utils.getEnvironment(soajs, BL.model, context.env.toUpperCase(), function (error, envRecord) {
				soajs.log.info('after utils Get env');
				checkIfError(soajs, cbMain, {
					config: config,
					error: error || !envRecord,
					code: 600
				}, function () {
					checkIfError(soajs, cbMain, {
						config: config,
						error: !envRecord.deployer.type || !envRecord.deployer.selected || envRecord.deployer.type === 'manual',
						code: 743
					}, function () {
						context.envRecord = envRecord;
						context.variables['$SOAJS_NX_DOMAIN'] = context.envRecord.domain;
						context.variables['$SOAJS_NX_SITE_DOMAIN'] = context.envRecord.sitePrefix + "." + context.envRecord.domain;
						context.variables['$SOAJS_NX_API_DOMAIN'] = context.envRecord.apiPrefix + "." + context.envRecord.domain;
						if (context.envRecord.portalPrefix) {
							context.variables['$SOAJS_NX_PORTAL_DOMAIN'] = context.envRecord.portalPrefix + "." + context.envRecord.domain;
						}
						context.variables['$SOAJS_PROFILE'] = context.envRecord.profile;
						options = utils.buildDeployerOptions(envRecord, soajs, BL);
						return cb();
					});
				});
			});
		}

		function getCatalogRecipe(cb) {
			BL.model.validateCustomId(soajs, soajs.inputmaskData.recipe, function (error, recipeId) {
				checkIfError(soajs, cbMain, {
					config: config,
					error: error || !recipeId,
					code: 701
				}, function () {
					var opts = {
						collection: colls.catalog,
						conditions: {_id: recipeId}
					};
					BL.model.findEntry(soajs, opts, function (error, catalogRecord) {
						checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
							checkIfError(soajs, cbMain, {
								config: config,
								error: !catalogRecord,
								code: 950
							}, function () {
								if (catalogRecord.recipe.buildOptions && catalogRecord.recipe.buildOptions.settings && catalogRecord.recipe.buildOptions.settings.accelerateDeployment) {
									catalogRecord.recipe.buildOptions.env['SOAJS_DEPLOY_ACC'] = {
										"type": "static",
										"value": "true"
									};
								}

								//If user wants to use local SOAJS package inside the image, add the option to the deployer params
								if (catalogRecord.recipe.buildOptions && catalogRecord.recipe.buildOptions.settings && catalogRecord.recipe.buildOptions.settings.accelerateDeployment) {
									context.variables['$SOAJS_DEPLOY_ACC'] = 'true';
								}

								context.catalog = catalogRecord;
								context.ports = context.catalog.recipe.deployOptions.ports;
								return cb();
							});
						});
					});
				});
			});
		}

		function checkPort(cb) {
			helpers.checkPort(context, config, soajs, cbMain, cb);
		}

		function checkVolumes(cb) {
			helpers.checkVolumes(context, config, soajs, cbMain, cb);
		}

		function checkClusterPorts(cb) {
			if (!context.ports || context.ports.length === 0) {
				return cb();
			}

			//check if the current deployment exposes any ports
			async.filter(context.ports, function (onePort, callback) {
				return callback(null, onePort.isPublished && onePort.published);
			}, function (error, newExposedPorts) {
				//if no exposed ports are found, no need to check for conflicts
				if (!newExposedPorts || newExposedPorts.length === 0) {
					return cb();
				}

				//list deployed services in cluster
				options.params = {};
				deployer.execute({'type': 'container', 'driver': options.strategy}, 'listServices', options, (error, services) =>{
					checkIfError(soajs, cbMain, {config: config, error: error}, function () {
						async.each(services, function (oneService, callback) {
							comparePorts(newExposedPorts, oneService, function (error, conflict) {
								//error is always null, set only to be compatible with async callbacks
								return callback(conflict);
							});
						}, function (error) {
							return checkIfError(soajs, cbMain, {config: config, error: error, code: 996}, cb);
						});
					});
				});
			});

			function comparePorts(newPorts, deployedService, callback) {
				if (!deployedService.ports || deployedService.ports.length === 0) {
					return callback();
				}

				//go through the ports of each deployed service
				async.detect(deployedService.ports, function (onePort, callback) {
					if (!onePort.published) {
						return callback();
					}

					//compare each deployed service port with the new ports, return true if at least one port matches
					async.detect(newPorts, function (oneNewPort, callback) {
						var conflict = false;

						if (onePort.published === oneNewPort.published) {
							conflict = true;
							//in case of redeploy service, make sure that the service itself does not conflict (in case the port was not changed)
							if (soajs.inputmaskData.action === 'rebuild' && soajs.inputmaskData.custom && soajs.inputmaskData.custom.name) {
								if (deployedService.labels && deployedService.labels['soajs.service.name'] === soajs.inputmaskData.custom.name) {
									conflict = false;
								}
								else if (deployedService.labels && deployedService.labels['soajs.service.label'] === soajs.inputmaskData.custom.name) {
									conflict = false;
								}
								else if (soajs.inputmaskData.custom.name === deployedService.name) {
									conflict = false;
								}
							}
						}

						return callback(null, conflict);
					}, callback);
				}, callback);
			}
		}

		function getControllerDomain(cb) {
			var getControllers = false;
			if (context.catalog.recipe.buildOptions && context.catalog.recipe.buildOptions.env) {
				for (var env in context.catalog.recipe.buildOptions.env) {
					if (context.catalog.recipe.buildOptions.env[env].value === '$SOAJS_NX_CONTROLLER_NB') {
						getControllers = true;
					}
				}
			}

			if (getControllers) {
				options.params = {
					env: context.envRecord.code.toLowerCase(),
					serviceName: 'controller',
					version: '1'
				};
				deployer.execute({'type': 'container', 'driver': options.strategy}, 'getServiceHost', options, (error, controllerDomainName) =>{
					if (error && error.source === 'driver' && error.code === 661) {
						error.msg = "Unable to proceed because the recipe of this deployment requires the SOAJS Controller to be deployed in this environment. Deploy the SOAJS Controller first so you can proceed or use another recipe.";
					}
					checkIfError(soajs, cbMain, {config: config, error: error, code: 404}, function () {
						context.variables['$SOAJS_NX_CONTROLLER_IP_1'] = controllerDomainName;
						context.variables['$SOAJS_NX_CONTROLLER_NB'] = '1';
						context.variables['$SOAJS_NX_CONTROLLER_PORT'] = '' + context.envRecord.services.config.ports.controller;
						return cb();
					});
				});
			}
			else {
				return cb();
			}
		}

		function getGitInfo(cb) {
			if (soajs.inputmaskData && soajs.inputmaskData.gitSource && soajs.inputmaskData.gitSource.owner && soajs.inputmaskData.gitSource.repo) {
				helpers.getGitRecord(soajs, soajs.inputmaskData.gitSource.owner + '/' + soajs.inputmaskData.gitSource.repo, BL, function (error, accountRecord) {
					soajs.log.info('get Git Info of: ', soajs.inputmaskData.gitSource.owner + '/' + soajs.inputmaskData.gitSource.repo);
					checkIfError(soajs, cbMain, {
						config: config,
						error: error || !accountRecord,
						code: 600
					}, function () {
						accountRecord.providerName = accountRecord.provider;

						if (accountRecord.providerName.indexOf('_') !== -1) {
							accountRecord.providerName = accountRecord.providerName.split('_')[0];
						}

						//if private repo, add token to env variables
						if (accountRecord.token) {
							if (accountRecord.provider === 'bitbucket_enterprise') {
								accountRecord.token = new Buffer(accountRecord.token, 'base64').toString();
							}
							context.variables["$SOAJS_GIT_TOKEN"] = accountRecord.token;
							if (!context.catalog.recipe.buildOptions.env['SOAJS_GIT_TOKEN']) {
								context.catalog.recipe.buildOptions.env['SOAJS_GIT_TOKEN'] = {
									"type": "computed",
									"value": "$SOAJS_GIT_TOKEN"
								};
							}
						}
						context.variables['$SOAJS_GIT_PROVIDER'] = accountRecord.providerName;
						if (!context.catalog.recipe.buildOptions.env['SOAJS_GIT_PROVIDER']) {
							context.catalog.recipe.buildOptions.env['SOAJS_GIT_PROVIDER'] = {
								"type": "computed",
								"value": "$SOAJS_GIT_PROVIDER"
							};
						}
						context.variables['$SOAJS_GIT_DOMAIN'] = accountRecord.domain;
						if (!context.catalog.recipe.buildOptions.env['SOAJS_GIT_DOMAIN']) {
							context.catalog.recipe.buildOptions.env['SOAJS_GIT_DOMAIN'] = {
								"type": "computed",
								"value": "$SOAJS_GIT_DOMAIN"
							};
						}

						if (soajs.inputmaskData.gitSource && soajs.inputmaskData.gitSource.owner) {
							context.variables['$SOAJS_GIT_OWNER'] = soajs.inputmaskData.gitSource.owner;
							if (!context.catalog.recipe.buildOptions.env['SOAJS_GIT_OWNER']) {
								context.catalog.recipe.buildOptions.env['SOAJS_GIT_OWNER'] = {
									"type": "computed",
									"value": "$SOAJS_GIT_OWNER"
								};
							}
						}
						if (soajs.inputmaskData.gitSource && soajs.inputmaskData.gitSource.repo) {
							context.variables['$SOAJS_GIT_REPO'] = soajs.inputmaskData.gitSource.repo;
							if (!context.catalog.recipe.buildOptions.env['SOAJS_GIT_REPO']) {
								context.catalog.recipe.buildOptions.env['SOAJS_GIT_REPO'] = {
									"type": "computed",
									"value": "$SOAJS_GIT_REPO"
								};
							}
						}
						if (soajs.inputmaskData.gitSource && soajs.inputmaskData.gitSource.branch) {
							context.variables['$SOAJS_GIT_BRANCH'] = soajs.inputmaskData.gitSource.branch;
							if (!context.catalog.recipe.buildOptions.env['SOAJS_GIT_BRANCH']) {
								context.catalog.recipe.buildOptions.env['SOAJS_GIT_BRANCH'] = {
									"type": "computed",
									"value": "$SOAJS_GIT_BRANCH"
								};
							}
						}
						if (soajs.inputmaskData.gitSource && soajs.inputmaskData.gitSource.commit) {
							context.variables['$SOAJS_GIT_COMMIT'] = soajs.inputmaskData.gitSource.commit;
							if (!context.catalog.recipe.buildOptions.env['SOAJS_GIT_COMMIT']) {
								context.catalog.recipe.buildOptions.env['SOAJS_GIT_COMMIT'] = {
									"type": "computed",
									"value": "$SOAJS_GIT_COMMIT"
								};
							}
						}

						checkConfigCustom(cb);
					});
				});
			}
			else {
				checkConfigCustom(cb);
			}

			function checkConfigCustom(vCb) {
				if (soajs.inputmaskData && soajs.inputmaskData.custom && soajs.inputmaskData.custom.sourceCode && Object.keys(soajs.inputmaskData.custom.sourceCode).length > 0) {
					let sourceCodeEntries = Object.keys(soajs.inputmaskData.custom.sourceCode);
					async.each(sourceCodeEntries, (oneSourceCode, mCb) => {
						helpers.getGitRecord(soajs, soajs.inputmaskData.custom.sourceCode[oneSourceCode].repo, BL, function (error, dbRecord) {
							if (error) {
								soajs.log.error(error);
								return mCb();
							}
							else if (!dbRecord) {
								soajs.log.warn("No Record found for:", oneSourceCode);
								return mCb();
							}
							else {
								soajs.log.info('get Git Info of: ', oneSourceCode);
								if (dbRecord.token) {
									if (dbRecord.provider === 'bitbucket_enterprise') {
										dbRecord.token = new Buffer(dbRecord.token, 'base64').toString();
									}
								}

								let mapping = {};
								if (dbRecord.repos[0].type === 'config') {
									mapping = {
										token: 'SOAJS_CONFIG_REPO_TOKEN',
										provider: 'SOAJS_CONFIG_REPO_PROVIDER',
										domain: 'SOAJS_CONFIG_REPO_DOMAIN',
										owner: 'SOAJS_CONFIG_REPO_OWNER'
									};

									for (let entry in mapping) {
										context.variables["$" + mapping[entry]] = dbRecord[entry];
										if (!context.catalog.recipe.buildOptions.env[mapping[entry]]) {
											context.catalog.recipe.buildOptions.env[mapping[entry]] = {
												"type": "computed",
												"value": "$" + mapping[entry]
											};
										}
									}

									context.variables['$SOAJS_CONFIG_REPO_NAME'] = soajs.inputmaskData.custom.sourceCode[oneSourceCode].repo.split("/")[1];
									if (!context.catalog.recipe.buildOptions.env['SOAJS_CONFIG_REPO_NAME']) {
										context.catalog.recipe.buildOptions.env['SOAJS_CONFIG_REPO_NAME'] = {
											"type": "computed",
											"value": "$SOAJS_CONFIG_REPO_NAME"
										};
									}

									context.variables['$SOAJS_CONFIG_REPO_BRANCH'] = soajs.inputmaskData.custom.sourceCode[oneSourceCode].branch;
									if (!context.catalog.recipe.buildOptions.env['SOAJS_CONFIG_REPO_BRANCH']) {
										context.catalog.recipe.buildOptions.env['SOAJS_CONFIG_REPO_BRANCH'] = {
											"type": "computed",
											"value": "$SOAJS_CONFIG_REPO_BRANCH"
										};
									}

									if (soajs.inputmaskData.custom.sourceCode[oneSourceCode].commit) {
										context.variables['$SOAJS_CONFIG_REPO_COMMIT'] = soajs.inputmaskData.custom.sourceCode[oneSourceCode].commit;
										if (!context.catalog.recipe.buildOptions.env['SOAJS_CONFIG_REPO_COMMIT']) {
											context.catalog.recipe.buildOptions.env['SOAJS_CONFIG_REPO_COMMIT'] = {
												"type": "computed",
												"value": "$SOAJS_CONFIG_REPO_COMMIT"
											};
										}
									}

									if (soajs.inputmaskData.custom.sourceCode[oneSourceCode].path) {
										context.variables['$SOAJS_CONFIG_REPO_PATH'] = soajs.inputmaskData.custom.sourceCode[oneSourceCode].path;
										if (!context.catalog.recipe.buildOptions.env['SOAJS_CONFIG_REPO_PATH']) {
											context.catalog.recipe.buildOptions.env['SOAJS_CONFIG_REPO_PATH'] = {
												"type": "computed",
												"value": "$SOAJS_CONFIG_REPO_PATH"
											};
										}
									}
								}
								else if (dbRecord.repos[0].type === 'multi') {
									dbRecord.repos[0].configSHA.forEach((oneSubRepo) => {
										if (['custom', 'static', 'service', 'daemon'].indexOf(oneSubRepo.contentType) !== -1 && oneSubRepo.contentName === soajs.inputmaskData.custom.sourceCode[oneSourceCode].subName) {
											handleOneRepoLevel(dbRecord, oneSourceCode, oneSubRepo.path);
										}
									});
								}
								else if (['config', 'multi'].indexOf(dbRecord.repos[0].type) === -1 && context.catalog.type === 'server') {
									handleOneRepoLevel(dbRecord, oneSourceCode);
								}

								return mCb();
							}
						});
					}, vCb);
				}
				else {
					return vCb();
				}
			}

			function handleOneRepoLevel(dbRecord, oneSourceCode, subPath) {
				let mapping = {
					token: 'SOAJS_GIT_TOKEN',
					provider: 'SOAJS_GIT_PROVIDER',
					domain: 'SOAJS_GIT_DOMAIN',
					owner: 'SOAJS_GIT_OWNER'
				};

				for (let entry in mapping) {
					context.variables["$" + mapping[entry]] = dbRecord[entry];
					if (!context.catalog.recipe.buildOptions.env[mapping[entry]]) {
						context.catalog.recipe.buildOptions.env[mapping[entry]] = {
							"type": "computed",
							"value": "$" + mapping[entry]
						};
					}
				}

				context.variables['$SOAJS_GIT_REPO'] = soajs.inputmaskData.custom.sourceCode[oneSourceCode].repo.split("/")[1];
				if (!context.catalog.recipe.buildOptions.env['SOAJS_GIT_REPO']) {
					context.catalog.recipe.buildOptions.env['SOAJS_GIT_REPO'] = {
						"type": "computed",
						"value": "$SOAJS_GIT_REPO"
					};
				}

				context.variables['$SOAJS_GIT_BRANCH'] = soajs.inputmaskData.custom.sourceCode[oneSourceCode].branch;
				if (!context.catalog.recipe.buildOptions.env['SOAJS_GIT_BRANCH']) {
					context.catalog.recipe.buildOptions.env['SOAJS_GIT_BRANCH'] = {
						"type": "computed",
						"value": "$SOAJS_GIT_BRANCH"
					};
				}

				if (soajs.inputmaskData.custom.sourceCode[oneSourceCode].commit) {
					context.variables['$SOAJS_GIT_COMMIT'] = soajs.inputmaskData.custom.sourceCode[oneSourceCode].commit;
					if (!context.catalog.recipe.buildOptions.env['SOAJS_GIT_COMMIT']) {
						context.catalog.recipe.buildOptions.env['SOAJS_GIT_COMMIT'] = {
							"type": "computed",
							"value": "$SOAJS_GIT_COMMIT"
						};
					}
				}

				if (soajs.inputmaskData.custom.sourceCode[oneSourceCode].path || subPath) {
					let path = soajs.inputmaskData.custom.sourceCode[oneSourceCode].path;
					if (subPath) {
						path = subPath.replace("/config.js", "/");
						path = path.replace("/soa.js", "/");
					}
					context.variables['$SOAJS_GIT_PATH'] = path;
					if (!context.catalog.recipe.buildOptions.env['SOAJS_GIT_PATH']) {
						context.catalog.recipe.buildOptions.env['SOAJS_GIT_PATH'] = {
							"type": "computed",
							"value": "$SOAJS_GIT_PATH"
						};
					}
				}
			}
		}

		function getServiceDaemonInfo(cb) {
			if (['service', 'daemon'].indexOf(context.catalog.type) === -1 || (soajs.inputmaskData.custom && ['service', 'daemon'].indexOf(soajs.inputmaskData.custom.type) === -1)) {
				return cb();
			}
			var opts = {
				collection: (soajs.inputmaskData.custom && soajs.inputmaskData.custom.daemonGroup) ? colls.daemons : colls.services,
				conditions: {
					name: (soajs.inputmaskData.custom && soajs.inputmaskData.custom.name) ? soajs.inputmaskData.custom.name : ''
				}
			};
			if (soajs.inputmaskData.custom && soajs.inputmaskData.custom.gc && soajs.inputmaskData.custom.gc.gcName) {
				opts.conditions.name = soajs.inputmaskData.custom.gc.gcName;
			}
			BL.model.findEntry(soajs, opts, function (error, dbRecord) {
				checkIfError(soajs, cbMain, {
					config: config,
					error: error,
					code: 600
				}, function () {
					if (!dbRecord && (context.catalog.type === 'soajs' || ((context.catalog.type === 'service' || context.catalog.type === 'daemon') && context.catalog.subtype === 'soajs'))) {
						return cbMain({
							"code": 600,
							"message": "This Repository does not contain a service or a daemon code that can be matched to the API catalog or the Daemon Catalog!"
						});
					}

					//misc services might not have db records, return
					if (!dbRecord) {
						return cb();
					}
					else {
						//If the service has a custom entry point, add it as an option to the deployer
						if (dbRecord.src && dbRecord.src.main) {
							context.variables['$SOAJS_SRV_MAIN'] = dbRecord.src.main;
						}

						//Add service ports as computed fields
						context.variables['$SOAJS_SRV_PORT'] = dbRecord.port;

						if (!context.ports) {
							context.ports = [
								{
									"name": "service",
									"isPublished": false,
									"target": dbRecord.port
								}
							];
						}
						else {
							let found = false;
							for (let i = 0; i < context.ports.length; i++) {
								if (context.ports[i].target === dbRecord.port) {
									found = true;
									break;
								}
							}
							if (!found) {
								context.ports.push({
									"name": "service",
									"isPublished": false,
									"target": dbRecord.port
								});
							}
						}

						context.serviceName = dbRecord.name;
						context.serviceGroup = dbRecord.group;

						//If the service is a soajs service, add maintenance port
						if (context.catalog.type === 'soajs' || ((context.catalog.type === 'service' || context.catalog.type === 'daemon') && context.catalog.subtype === 'soajs')) {
							dbRecord.maintenancePort = dbRecord.port + context.envRecord.services.config.ports.maintenanceInc;

							let found = false;
							if (context.ports) {
								context.ports.forEach((onePort) => {
									if (onePort.name === 'maintenance') {
										found = true;
									}
								});
							}
							if (!found) {
								context.ports.push({
									"name": "maintenance",
									"isPublished": false,
									"target": dbRecord.maintenancePort
								});
							}

							context.variables['$SOAJS_SRV_PORT_MAINTENANCE'] = dbRecord.maintenancePort;
						}

						//Daemons read additional environment variable that points out the name of the group configuration that should be used
						if (soajs.inputmaskData.custom && soajs.inputmaskData.custom.daemonGroup) {
							context.variables['$SOAJS_DAEMON_GRP_CONF'] = soajs.inputmaskData.custom.daemonGroup;
						}

						//if gc, add gc info to env variables
						if (soajs.inputmaskData.custom && soajs.inputmaskData.custom.gc) {
							context.variables["$SOAJS_GC_NAME"] = soajs.inputmaskData.custom.gc.gcName;
							context.variables["$SOAJS_GC_VERSION"] = soajs.inputmaskData.custom.gc.gcVersion;

							context.origin = context.name = soajs.inputmaskData.custom.name;
							context.name = soajs.inputmaskData.custom.gc.gcName;
							context.origin = "gcs";
						}
						//If a service requires to run cmd commands before starting, get them from service record and add them
						if (dbRecord.src && dbRecord.src.cmd && Array.isArray(dbRecord.src.cmd) && dbRecord.src.cmd.length > 0) {
							for (var cmd = dbRecord.src.cmd.length - 1; cmd >= 0; cmd--) {
								if (dbRecord.src.cmd[cmd].trim() === '') {
									dbRecord.src.cmd.splice(cmd, 1);
								}
							}
							if (dbRecord.src.cmd.length > 0) {
								context.serviceCmd = dbRecord.src.cmd;
							}
						}

						var platform = context.envRecord.deployer.selected.split('.')[1];
						var serviceName = context.envRecord.code.toLowerCase() + "-" + soajs.inputmaskData.custom.name;
						var daemonGroupName;

						if (soajs.inputmaskData.custom && soajs.inputmaskData.custom.daemonGroup) {
							//if daemon group is present then the deployment is of sub-type daemon. add group name to deployment name
							daemonGroupName = soajs.inputmaskData.custom.daemonGroup.toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-');
							serviceName += '-' + daemonGroupName;
						}

						var version = "1";
						if (soajs.inputmaskData.custom && soajs.inputmaskData.custom.version) {
							version = soajs.inputmaskData.custom.version;
						}
						soajs.inputmaskData.custom.version = version;

						if (platform === 'docker' && soajs.inputmaskData.custom.name !== 'controller') {
							serviceName += (soajs.inputmaskData.custom.version) ? "-v" + soajs.inputmaskData.custom.version : "";
						}
						else if (platform === 'kubernetes') {
							serviceName += (soajs.inputmaskData.custom.version) ? "-v" + soajs.inputmaskData.custom.version : "";
						}

						context.name = serviceName;
						if (daemonGroupName) context.daemonGroupName = daemonGroupName;

						if (dbRecord && dbRecord.prerequisites && dbRecord.prerequisites.memory) {
							checkIfError(soajs, cbMain, {
								config: config,
								error: (dbRecord.prerequisites.memory > soajs.inputmaskData.deployConfig.memoryLimit),
								code: 910
							}, cb);
						}
						else {
							return cb();
						}
					}
				});
			});
		}

		function getDashboardConnection(cb) {
			helpers.getDashDbInfo(soajs, BL, function (error, data) {
				checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
					context.variables['$SOAJS_MONGO_NB'] = data.mongoDbs.length;

					//adding info about database servers
					for (var i = 0; i < data.mongoDbs.length; i++) {
						context.variables["$SOAJS_MONGO_IP_" + (i + 1)] = data.mongoDbs[i].host;
						context.variables["$SOAJS_MONGO_PORT_" + (i + 1)] = data.mongoDbs[i].port;
					}

					//if database prefix exists, add it to env variables
					if (data.prefix) {
						context.variables["$SOAJS_MONGO_PREFIX"] = data.prefix;
					}

					//if mongo credentials exist, add them to env variables
					if (data.mongoCred && data.mongoCred.username && data.mongoCred.password) {
						context.variables["$SOAJS_MONGO_USERNAME"] = data.mongoCred.username;
						context.variables["$SOAJS_MONGO_PASSWORD"] = data.mongoCred.password;
					}

					//if replica set is used, add name to env variables
					if (data.clusterInfo.URLParam && data.clusterInfo.URLParam.replicaSet && data.clusterInfo.URLParam.replicaSet) {
						context.variables["$SOAJS_MONGO_RSNAME"] = data.clusterInfo.URLParam.replicaSet;
					}

					//if authSource is set, add it to env variables
					if (data.clusterInfo.URLParam && data.clusterInfo.URLParam.authSource) {
						context.variables["$SOAJS_MONGO_AUTH_DB"] = data.clusterInfo.URLParam.authSource;
					}

					//if ssl is set, add it to env variables
					if (data.clusterInfo.URLParam && data.clusterInfo.URLParam.ssl) {
						context.variables["$SOAJS_MONGO_SSL"] = 'true';
					}
					return cb();
				});
			});
		}

		function getDefaultUIExtKey(cb) {
			var packageName = '', tenantCondition = {};
			if (soajs.inputmaskData.env.toLowerCase() === 'portal') {
				tenantCondition = {code: 'PRTL'};
				packageName = 'PRTAL_MAIN';
			}
			else {
				tenantCondition = {locked: true};
				packageName = 'DSBRD_MAIN';
			}

			BL.model.findEntry(soajs, {
				"collection": "tenants",
				"conditions": tenantCondition
			}, function (error, tenantRecord) {
				checkIfError(soajs, cbMain, {
					config: config,
					error: error,
					code: 701
				}, function () {
					if (tenantRecord) {
						let envKeyCheck = (tenantRecord.code === 'PRTL') ? 'PORTAL' : process.env.SOAJS_ENV.toUpperCase();
						tenantRecord.applications.forEach(function (oneApplication) {
							var soajsPackabge = process.env.SOAJS_TEST_PACKAGE || packageName;
							if (oneApplication.package === soajsPackabge) {
								oneApplication.keys.forEach(function (oneKey) {
									oneKey.extKeys.forEach(function (oneExtKey) {
										if (oneExtKey.env === envKeyCheck) {
											context.variables['$SOAJS_EXTKEY'] = oneExtKey.extKey;
										}
									});
								});
							}
						});
					}
					return cb();
				});
			});
		}

		function getSecrets(cb) {
			if (soajs.inputmaskData.custom.secrets && Array.isArray(soajs.inputmaskData.custom.secrets) && soajs.inputmaskData.custom.secrets.length > 0) {
				helpers.getSecrets(context, soajs, deployer, BL, (error, secrets) => {
					checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {

						if (secrets && secrets.length > 0) {
							soajs.inputmaskData.custom.secrets.forEach((oneInputSecret) => {
								let found = false;
								secrets.forEach((oneSecret) => {
									if (oneSecret.name === oneInputSecret.name) {
										found = true;
									}
								});

								if (!found) {
									return cb(new Error(`The following Secret ${oneInputSecret.name} does not exist !`));
								}
							});
						}
						else{
							return cb(new Error(`Unable to find any secret in this deployment. Create Secrets first then supply them while deploying service(s).`));
						}

						context.secrets = secrets;
						return cb(null, true);
					});
				});
			}
			else {
				return cb(null, true);
			}
		}


		/**
		 * get the latest soajs images
		 * @param cb
		 */
		function getLatestSOAJSImageInfo(cb) {

			let myUrl = config.docker.url;
			var prefix = "library";
			if (context.catalog.recipe.deployOptions.image.prefix && context.catalog.recipe.deployOptions.image.prefix !== '') {
				prefix = context.catalog.recipe.deployOptions.image.prefix;
			}

			myUrl = myUrl.replace("%organization%", prefix).replace("%imagename%", context.catalog.recipe.deployOptions.image.name);
			var tag = "latest";
			if (context.catalog.recipe.deployOptions.image.tag && context.catalog.recipe.deployOptions.image.tag !== '') {
				tag = context.catalog.recipe.deployOptions.image.tag;
			}
			myUrl += tag;
			let opts = {
				method: 'GET',
				url: myUrl,
				headers: {'cache-control': 'no-cache'},
				json: true
			};
			request.get(opts, function (error, response, body) {
				checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
					context.imageInfo = body;
					return cb();
				});
			});
		}

		function doDeploy() {
			// todo fix branch name
			if (context.labels['service.branch']) {
				context.labels['service.branch'] = context.labels['service.branch'].replace(/\//g, "__");
			}
			soajs.log.info('change branch name', context.labels['service.branch']);
			helpers.deployContainer(config, context, req, soajs, deployer, BL, cbMain);
		}

		soajs.log.debug(soajs.inputmaskData);
		if (soajs.inputmaskData.deployConfig.type && soajs.inputmaskData.deployConfig.type === "vm") {
			checkIfError(soajs, cbMain, {
				config: config,
				error: !soajs.inputmaskData.deployConfig.infraAccountId && !soajs.inputmaskData.deployConfig.location && !soajs.inputmaskData.deployConfig.vmConfiguration,
				code: 490
			}, function () {
				utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env.toUpperCase(), function (error, envRecord) {
					checkIfError(soajs, cbMain, {
						config: config,
						error: error || !envRecord,
						code: 600
					}, function () {
						checkIfError(soajs, cbMain, {
							config: config,
							error: !envRecord.deployer.type || !envRecord.deployer.selected,
							code: 743
						}, function () {
							soajs.inputmaskData.id = soajs.inputmaskData.deployConfig.infraAccountId;
							BL.model.validateId(soajs, function (err) {
								checkIfError(soajs, cbMain, {config: config, error: err, code: 490}, function () {
									let opts = {
										collection: colls.infra,
										conditions: {
											_id: soajs.inputmaskData.id
										}
									};
									BL.model.findEntry(soajs, opts, function (err, infraRecord) {
										checkIfError(soajs, cbMain, {
											config: config,
											error: err,
											code: 600
										}, function () {
											checkIfError(soajs, cbMain, {
												config: config,
												error: !infraRecord,
												code: 490
											}, function () {
												var options = utils.buildDeployerOptions(envRecord, soajs, BL, {technology: 'vm'});
												options.params = {
													location: soajs.inputmaskData.deployConfig.location,
													instance: {
														name: soajs.inputmaskData.custom.name,
														size: soajs.inputmaskData.deployConfig.vmConfiguration.flavor,
														adminAccess: {
															username: soajs.inputmaskData.deployConfig.vmConfiguration.adminAccess.username
														}
													}
												};
												checkIfError(soajs, cbMain, {
													config: config,
													error: !soajs.inputmaskData.deployConfig.vmConfiguration.adminAccess.password && !soajs.inputmaskData.deployConfig.vmConfiguration.adminAccess.token,
													code: 490
												}, function () {
													if (soajs.inputmaskData.deployConfig.vmConfiguration.adminAccess.password){
														options.params.instance.adminAccess.passsword = soajs.inputmaskData.deployConfig.vmConfiguration.adminAccess.password;
													}
													else {
														options.params.instance.adminAccess.token = soajs.inputmaskData.deployConfig.vmConfiguration.adminAccess.token;
													}
													options.infra = {
														id: infraRecord.id,
														api: infraRecord.api
													};

													options.params.labels = {
														"soajs.content": "true",
														"soajs.env.code": envRecord.code.toLowerCase(),
														"soajs.service.technology": "vm",
														"soajs.infra.id": infraRecord._id.toString(),
													};
													if (soajs.inputmaskData.custom && soajs.inputmaskData.custom.resourceId) {
														context.labels["soajs.resource.id"] = soajs.inputmaskData.custom.resourceId;
													}

													getCatalogRecipe (function (err) {
														checkIfError(soajs, cbMain, { config: config, error: err, code: 950 }, function () {
															if (soajs.inputmaskData.custom.image){
																options.params.image = {
																	prefix: soajs.inputmaskData.custom.image.prefix,
																	name: soajs.inputmaskData.custom.image.name,
																	tag: soajs.inputmaskData.custom.image.tag
																};
															}
															else {
																options.params.image = context.catalog.recipe.deployOptions.image;
															}

															options.params.labels['soajs.image.name'] = options.params.image.name;
															options.params.labels['soajs.image.prefix'] = options.params.image.prefix;
															options.params.labels['soajs.image.tag'] = options.params.image.tag;
															options.params.labels['soajs.catalog.id'] = context.catalog._id.toString();

															if (soajs.inputmaskData.custom && soajs.inputmaskData.custom.name) {
																options.params.labels['soajs.service.name'] = soajs.inputmaskData.custom.name;
																options.params.labels['soajs.service.label'] = soajs.inputmaskData.custom.name;
															}

															options.params.labels['soajs.service.type'] = context.catalog.type;
															options.params.labels['soajs.service.subtype'] = context.catalog.subtype;

															//pass commands to vm driver
															if(context.catalog.recipe && context.catalog.recipe.buildOptions && context.catalog.recipe.buildOptions.cmd && context.catalog.recipe.buildOptions.cmd.deploy) {
																options.params.instance.command = context.catalog.recipe.buildOptions.cmd.deploy;
															}

															//pass ports to vm driver
															if(context.catalog.recipe && context.catalog.recipe.ports && Array.isArray(context.catalog.recipe.ports)) {
																options.params.instance.ports = context.catalog.recipe.ports;
															}

															helpers.computeCatalogEnvVars(context, soajs, config, function(error, envVariables) {
																if (error) {
																	var errorMessage = config.errors[911];
																	errorMessage = errorMessage.replace('%ENV_NAME%', error.name);
																	errorMessage = errorMessage.replace('%ENV_TYPE%', error.type);
																	return cbMain({code: 911, msg: errorMessage});
																}

																options.params.instance.env = envVariables || [];

																soajs.log.debug(options);
																deployer.execute({
																	type: "infra",
																	name: infraRecord.name,
																	technology: "vm"
																}, 'deployVM', options, (error, vms) => {
																	checkIfError(soajs, cbMain, {
																		config: config,
																		error: error
																	}, function () {
																		return cbMain(null, vms);
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
		}
		else{
			// instance.options.deployConfig.replication is required
			if (!req.soajs.inputmaskData.deployConfig.replication){
				return cbMain({ "code": '829', "msg": config.errors['829'] })
			}
			async.series([getEnvInfo, getCatalogRecipe, checkPort, checkVolumes, checkClusterPorts, getLatestSOAJSImageInfo, getDefaultUIExtKey], function () {
				var platform = context.envRecord.deployer.selected.split('.')[1];
				context.platform = platform;
				context.options = options;

				if (soajs.inputmaskData.deployConfig && soajs.inputmaskData.deployConfig.memoryLimit) {
					context.variables['$SOAJS_SRV_MEMORY'] = Math.floor(soajs.inputmaskData.deployConfig.memoryLimit / 1048576);
				}

				async.series([getDashboardConnection, getControllerDomain, getGitInfo, getServiceDaemonInfo, getSecrets], function () {

					if (soajs.inputmaskData.custom.secrets && Array.isArray(soajs.inputmaskData.custom.secrets) && soajs.inputmaskData.custom.secrets.length > 0) {
						if (context.secrets && context.secrets.length > 0) {
							//inject secrets as volumes
							soajs.inputmaskData.custom.secrets.forEach((oneSecret) => {

								if (context.platform === 'kubernetes') {
									let volumeName = oneSecret.name.replace(/\s/g, '-').toLowerCase();

									//volumes already reverted to use old schema
									context.catalog.recipe.deployOptions.voluming.volumes.push({
										"name": volumeName,
										"secret": {
											"secretName": oneSecret.name
										}
									});
									context.catalog.recipe.deployOptions.voluming.volumeMounts.push({
										"mountPath": oneSecret.mountPath, // "/etc/soajs/ssl/",
										"name": volumeName,
										"readOnly": true
									});
								}

								if (context.platform === 'docker') {
									context.dockerServiceSecrets = [];
									context.secrets.forEach((oneDockerSecret) => {
										if (oneSecret.name === oneDockerSecret.name) {
											let mySecret = {
												id: oneDockerSecret.uid,
												name: oneSecret.name,
												target: oneSecret.mountPath,
												UID: "0",
												GID: "0",
												Mode: 644
											};
											context.dockerServiceSecrets.push(mySecret);
										}
									});
								}
							});
						}
					}

					if (soajs.inputmaskData.custom && ['service', 'daemon'].indexOf(soajs.inputmaskData.custom.type) !== -1 && context.catalog.type === 'service' || context.catalog.type === 'daemon') {
						context.labels = {
							"soajs.content": "true",
							"soajs.service.name": context.serviceName,
							"soajs.service.group": (context.serviceGroup) ? context.serviceGroup.toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-') : '',
							"soajs.service.label": context.name,
							"soajs.service.repo.name": "soajs_" + context.serviceName,
							"soajs.service.type": context.catalog.type,
							"soajs.service.subtype": context.catalog.subtype
						};

						context.variables['$SOAJS_SERVICE_NAME'] = context.serviceName;

						if (soajs.inputmaskData.custom && soajs.inputmaskData.custom.version) {
							context.labels["soajs.service.version"] = soajs.inputmaskData.custom.version.toString();
						}

						if (soajs.inputmaskData.custom && soajs.inputmaskData.custom.daemonGroup && context.daemonGroupName) {
							context.labels["soajs.daemon.group"] = context.daemonGroupName;
						}

						/**
						 * in this case soajs.inputmaskData.gitSource has to be provided
						 **/
						if (soajs.inputmaskData.gitSource) {
							//variables already filled above
							context.labels['service.repo'] = context.variables['$SOAJS_GIT_REPO'];
							context.labels['service.branch'] = context.variables['$SOAJS_GIT_BRANCH'];
							context.labels['service.commit'] = context.variables['$SOAJS_GIT_COMMIT'];
							context.labels['service.owner'] = context.variables['$SOAJS_GIT_OWNER'];
						}
					}
					else if (context.catalog.type === 'server' && context.catalog.subtype === 'nginx') {
						let group = "soajs-nginx";
						context.name = context.envRecord.code.toLowerCase() + "-nginx";
						if (soajs.inputmaskData.custom && soajs.inputmaskData.custom.name) {
							context.name = soajs.inputmaskData.custom.name;
							if (context.name === 'nginx') {
								context.name = context.envRecord.code.toLowerCase() + "-nginx";
							}
							if (context.catalog.recipe.deployOptions.image.prefix !== 'soajsorg') {
								group = "custom-nginx";
							}
						}

						context.labels = {
							"soajs.content": "true",
							"soajs.service.name": "nginx",
							"soajs.service.group": group,
							"soajs.service.label": context.name,
							"soajs.service.type": context.catalog.type,
							"soajs.service.subtype": context.catalog.subtype
						};

						context.variables['$SOAJS_SERVICE_NAME'] = "nginx";

						if (soajs.inputmaskData.custom && soajs.inputmaskData.custom.resourceId) {
							context.labels["soajs.resource.id"] = soajs.inputmaskData.custom.resourceId;
						}

						//create env variables when secrets are found
						if (soajs.inputmaskData.custom.secrets && Array.isArray(soajs.inputmaskData.custom.secrets) && soajs.inputmaskData.custom.secrets.length > 0) {

							if (context.catalog.recipe.certificates !== 'none') {
								let certificateSecret;
								soajs.inputmaskData.custom.secrets.forEach((oneSecret) => {
									if (oneSecret.type === 'certificate') {
										certificateSecret = oneSecret;
									}
								});

								//one of the secrets contains custom certificates, add path as env and instruct deployer to use it
								if(certificateSecret){
									context.catalog.recipe.buildOptions.env['SOAJS_NX_SSL_CERTS_LOCATION'] = {
										"type": "static",
										"value": certificateSecret.mountPath || "/etc/soajs/ssl"
									};

									context.catalog.recipe.buildOptions.env['SOAJS_NX_CUSTOM_SSL'] = {
										"type": "static",
										"value": "true"
									};
								}

								//works with custom or self signed certificates
								let https = ["SOAJS_NX_API_HTTPS", "SOAJS_NX_API_HTTP_REDIRECT", "SOAJS_NX_SITE_HTTPS", "SOAJS_NX_SITE_HTTP_REDIRECT"];
								https.forEach((oneEnv) => {
									context.catalog.recipe.buildOptions.env[oneEnv] = {
										"type": "static",
										"value": "true"
									};
								});
							}
						}
					}
					else {
						var serviceLabel = '';
						if (soajs.inputmaskData.custom && soajs.inputmaskData.custom.name) {
							//NOTE: in case of deploying a resource, set the deployment name to the name specified by the user
							if (soajs.inputmaskData.custom.resourceId) {
								serviceLabel = soajs.inputmaskData.custom.name;
							}
							else {
								//in case of deploying a service from the repos section, add the env code to the deployment name
								serviceLabel = context.envRecord.code.toLowerCase() + "-" + soajs.inputmaskData.custom.name;
								if (soajs.inputmaskData.custom.version) {
									serviceLabel += '-v' + soajs.inputmaskData.custom.version;
								}
							}
						}
						context.name = serviceLabel;
						context.labels = {
							"soajs.service.name": context.serviceName || context.name,
							"soajs.service.type": context.catalog.type,
							"soajs.service.group": "Other",
							"soajs.service.subtype": context.catalog.subtype,
							"soajs.service.label": serviceLabel
						};

						context.variables['$SOAJS_SERVICE_NAME'] = context.serviceName || context.name;

						if (soajs.inputmaskData.custom && soajs.inputmaskData.custom.version) {
							context.labels['soajs.service.version'] = soajs.inputmaskData.custom.version.toString();
						}

						if (soajs.inputmaskData.custom && soajs.inputmaskData.custom.resourceId) {
							context.labels["soajs.resource.id"] = soajs.inputmaskData.custom.resourceId;
						}

						/**
						 * if case soajs.inputmaskData.gitSource is provided
						 **/
						if (soajs.inputmaskData.gitSource) {
							//variables already filled above
							context.labels['service.repo'] = context.variables['$SOAJS_GIT_REPO'];
							context.labels['service.branch'] = context.variables['$SOAJS_GIT_BRANCH'];
							context.labels['service.commit'] = context.variables['$SOAJS_GIT_COMMIT'];
							context.labels['service.owner'] = context.variables['$SOAJS_GIT_OWNER'];
						}
						else {
							//add repo and branch as labels
							if (context.catalog && context.catalog.recipe && context.catalog.recipe.buildOptions && context.catalog.recipe.buildOptions.env) {
								for (let oneEnvName in context.catalog.recipe.buildOptions.env) {
									let oneEnv = context.catalog.recipe.buildOptions.env[oneEnvName];

									if (oneEnv.type === 'static') {
										switch (oneEnvName) {
											case 'SOAJS_GIT_REPO':
												context.labels['service.repo'] = oneEnv.value;
												break;
											case 'SOAJS_GIT_BRANCH':
												context.labels['service.branch'] = oneEnv.value;
												break;
											case 'SOAJS_GIT_COMMIT':
												context.labels['service.commit'] = oneEnv.value;
												break;
											case 'SOAJS_GIT_OWNER':
												context.labels['service.owner'] = oneEnv.value;
												break;
										}
									}
								}
							}
						}
					}

					if (context.variables['$SOAJS_SRV_MEMORY']) {
						context.labels['memoryLimit'] = context.variables['$SOAJS_SRV_MEMORY'].toString();
					}

					if (context.catalog.recipe.deployOptions.labels) {
						for (var labelKey in context.catalog.recipe.deployOptions.labels) {
							var newKey = labelKey.replace(/__dot__/g, '.');
							context.labels[newKey] = context.catalog.recipe.deployOptions.labels[labelKey];
						}
					}

					//add image tag where applicable
					if (soajs.inputmaskData.action === 'rebuild') {
						if (context.platform === 'kubernetes' && context.catalog.recipe.deployOptions.image.pullPolicy !== 'Always') {
							context.labels['service.image.ts'] = soajs.inputmaskData.imageLastTs;
						}
						else {
							context.labels['service.image.ts'] = new Date(context.imageInfo.last_updated).getTime().toString();
						}
					}
					else {
						context.labels['service.image.ts'] = new Date(context.imageInfo.last_updated).getTime().toString();
					}
					doDeploy();
				});
			});

		}
	},

	/**
	 * Redeploy a service (does not update config, only simulates a deployment restart)
	 *
	 * @param {Object} options
	 * @param {Response Object} res
	 */
	"redeployService": function (config, req, soajs, deployer, cbMain) {

		utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env.toUpperCase(), function (error, envRecord) {
			checkIfError(soajs, cbMain, {
				config: config,
				error: error || !envRecord,
				code: 600
			}, function () {
				checkIfError(soajs, cbMain, {
					config: config,
					error: !envRecord.deployer.type || !envRecord.deployer.selected || envRecord.deployer.type === 'manual',
					code: 743
				}, function () {

					if (!soajs.inputmaskData.custom) {
						soajs.inputmaskData.custom = {};
					}

					var options = utils.buildDeployerOptions(envRecord, soajs, BL);
					if (soajs.inputmaskData.action === 'redeploy') {
						options.params = {
							id: soajs.inputmaskData.serviceId,
							mode: soajs.inputmaskData.mode, //NOTE: only required for kubernetes driver
							action: soajs.inputmaskData.action
						};
						deployer.execute({'type': 'container', 'driver': options.strategy}, 'redeployService', options, (error) =>{
							checkIfError(soajs, cbMain, {config: config, error: error}, function () {
								return cbMain(null, true);
							});
						});
					}
					else if (soajs.inputmaskData.action === 'rebuild') {
						options.params = {
							id: soajs.inputmaskData.serviceId,
							mode: soajs.inputmaskData.mode,
							excludeTasks: true
						};
						deployer.execute({'type': 'container', 'driver': options.strategy}, 'inspectService', options, (error, record) =>{
							checkIfError(soajs, cbMain, {config: config, error: error}, function () {
								checkIfError(soajs, cbMain, {
									config: config,
									error: !record.service || !record.service.labels || !record.service.labels['soajs.catalog.id'],
									code: 954
								}, function () {
									//set catalog id and rebuild option and forward to deploy() function
									soajs.inputmaskData.recipe = record.service.labels['soajs.catalog.id'];
									soajs.inputmaskData.custom.name = record.service.labels['soajs.service.label'].replace(soajs.inputmaskData.env.toLowerCase() + "-", "");
									soajs.inputmaskData.imageLastTs = record.service.labels['service.image.ts'] || "";
									soajs.inputmaskData.deployConfig = {
										replication: {
											mode: record.service.labels["soajs.service.mode"]
										}
									};
									if (['deployment', 'daemonset'].indexOf(soajs.inputmaskData.deployConfig.replication.mode) !== -1) {
										soajs.inputmaskData.deployConfig.isKubernetes = true;
									}
									if (['replicated', 'deployment'].indexOf(soajs.inputmaskData.deployConfig.replication.mode) !== -1) {
										soajs.inputmaskData.deployConfig.replication.replicas = (record.service.tasks.length - record.service.failures) || 1;
									}

									//check for secrets
									if(record.secrets && Array.isArray(record.secrets) && record.secrets.length > 0){
										soajs.inputmaskData.secrets = [];
										record.secrets.forEach((oneSecret) => {
											let mySecret = {
												"name": oneSecret.SecretName,
												"mountPath": oneSecret.File.Name
											};

											//if secret mount path value is equal to value of env SOAJS_NX_SSL_CERTS_LOCATION
											//this secret is a certificate, add type to it
											record.service.env.forEach(function (oneEnv) {
												if(oneEnv.indexOf('SOAJS_NX_SSL_CERTS_LOCATION') !== -1){
													let thisEnv = oneEnv.split("=");
													if(thisEnv[1] === mySecret.mountPath){
														mySecret.type = "certificate";
													}
												}
											});

											soajs.inputmaskData.secrets.push(mySecret);
										});
									}

									//set the memory limit
									soajs.inputmaskData.deployConfig.memoryLimit = 500;
									if (soajs.inputmaskData.custom.memory) {
										soajs.inputmaskData.deployConfig.memoryLimit = soajs.inputmaskData.custom.memory;
									}
									else {
										//'replicated', 'global', 'deployment', 'daemonset'
										record.service.env.forEach(function (oneEnv) {
											if (oneEnv.indexOf('SOAJS_SRV_MEMORY') !== -1) {
												soajs.inputmaskData.deployConfig.memoryLimit = parseInt(oneEnv.split('=')[1]);
											}
										});
									}
									if (soajs.inputmaskData.deployConfig.memoryLimit / 1048576 < 1) {
										soajs.inputmaskData.deployConfig.memoryLimit = soajs.inputmaskData.deployConfig.memoryLimit * 1048576;
									}

									if (record.service.labels['soajs.service.type'] === 'service' || record.service.labels['soajs.service.type'] === 'daemon' || record.service.labels['soajs.service.type'] === 'other') {
										soajs.inputmaskData.custom.name = record.service.labels['soajs.service.name'].replace(soajs.inputmaskData.env.toLowerCase() + "-", "");
										soajs.inputmaskData.custom.type = record.service.labels['soajs.service.type'];
										soajs.inputmaskData.custom.version = record.service.labels['soajs.service.version'];
										soajs.inputmaskData.gitSource = {};

										if (record.service.labels['service.owner']) {
											soajs.inputmaskData.gitSource.owner = record.service.labels['service.owner'];
										}

										if (record.service.labels['service.repo']) {
											soajs.inputmaskData.gitSource.repo = record.service.labels['service.repo'];
										}

										if (soajs.inputmaskData.custom.branch) {
											soajs.inputmaskData.gitSource.branch = soajs.inputmaskData.custom.branch;
										}

										if (soajs.inputmaskData.custom.commit) {
											soajs.inputmaskData.gitSource.commit = soajs.inputmaskData.custom.commit;
										}

										async.each(record.service.env, function (oneEnv, callback) {
											if (oneEnv.indexOf('SOAJS_GIT_OWNER') !== -1 && !soajs.inputmaskData.gitSource.owner) soajs.inputmaskData.gitSource.owner = oneEnv.split('=')[1];
											else if (oneEnv.indexOf('SOAJS_GIT_REPO') !== -1 && !soajs.inputmaskData.gitSource.repo) soajs.inputmaskData.gitSource.repo = oneEnv.split('=')[1];
											else if (oneEnv.indexOf('SOAJS_GIT_BRANCH') !== -1 && !soajs.inputmaskData.gitSource.branch) soajs.inputmaskData.gitSource.branch = oneEnv.split('=')[1];
											else if (oneEnv.indexOf('SOAJS_GIT_COMMIT') !== -1 && !soajs.inputmaskData.gitSource.commit) soajs.inputmaskData.gitSource.commit = oneEnv.split('=')[1];

											else if (soajs.inputmaskData.custom.type === 'daemon' && oneEnv.indexOf('SOAJS_DAEMON_GRP_CONF') !== -1) {
												soajs.inputmaskData.custom.daemonGroup = oneEnv.split('=')[1];
											}
											else if (soajs.inputmaskData.custom.type === 'service' && oneEnv.indexOf('SOAJS_GC_NAME') !== -1) {
												if (oneEnv !== 'SOAJS_GC_NAME=null') {
													if (!soajs.inputmaskData.custom.gc) {
														soajs.inputmaskData.custom.gc = {};
													}
													soajs.inputmaskData.custom.gc.gcName = oneEnv.split('=')[1];
												}
											}
											else if (soajs.inputmaskData.custom.type === 'service' && oneEnv.indexOf('SOAJS_GC_VERSION') !== -1) {
												if (oneEnv !== 'SOAJS_GC_VERSION=null') {
													if (!soajs.inputmaskData.custom.gc) {
														soajs.inputmaskData.custom.gc = {};
													}
													soajs.inputmaskData.custom.gc.gcVersion = oneEnv.split('=')[1];
												}
											}

											return callback();
										}, function () {
											BL.deployService(config, req, soajs, deployer, (error, serviceInfo) => {
												checkIfError(soajs, cbMain, {
													config: config,
													error: error
												}, function () {
													updateCiCdRecord(soajs.inputmaskData, 'cd', (error) => {
														checkIfError(soajs, cbMain, {
															config: config,
															error: error
														}, function () {
															return cbMain(null, serviceInfo);
														});
													});
												});
											});
										});
									}
									else {
										if (record.service.labels['soajs.resource.id']) {
											if (!soajs.inputmaskData.custom) {
												soajs.inputmaskData.custom = {};
											}
											soajs.inputmaskData.custom.resourceId = record.service.labels['soajs.resource.id'];
										}

										BL.deployService(config, req, soajs, deployer, (error, serviceInfo) => {
											checkIfError(soajs, cbMain, {config: config, error: error}, function () {
												updateCiCdRecord(soajs.inputmaskData, 'resource', (error) => {
													checkIfError(soajs, cbMain, {
														config: config,
														error: error
													}, function () {
														return cbMain(null, serviceInfo);
													});
												});
											});
										});
									}

									function updateCiCdRecord(opts, recordType, myCb) {
										var cond = {
											collection: colls.cicd,
											conditions: {
												type: recordType
											}
										};

										BL.model.findEntry(soajs, cond, function (error, record) {
											checkIfError(soajs, cbMain, {config: config, error: error}, function () {
												if (record && record[opts.env] && record[opts.env][opts.custom.name]) {
													if (record[opts.env][opts.custom.name]["v" + opts.custom.version]) {

														record[opts.env][opts.custom.name]["v" + opts.custom.version].branch = opts.custom.branch;

														if (record[opts.env][opts.custom.name]["v" + opts.custom.version].options && opts.custom) {
															record[opts.env][opts.custom.name]["v" + opts.custom.version].options.custom = opts.custom;
														}

														if (record[opts.env][opts.custom.name]["v" + opts.custom.version].options && opts.gitSource) {
															record[opts.env][opts.custom.name]["v" + opts.custom.version].options.gitSource = opts.gitSource;
														}

														if (record[opts.env][opts.custom.name]["v" + opts.custom.version].options && opts.deployConfig) {
															record[opts.env][opts.custom.name]["v" + opts.custom.version].options.deployConfig = opts.deployConfig;
														}
													}
													else {
														if (!record[opts.env][opts.custom.name].options) {
															record[opts.env][opts.custom.name].options = {}
														}
														if (opts.custom) {
															record[opts.env][opts.custom.name].options.custom = opts.custom;
														}
														if (opts.gitSource) {
															record[opts.env][opts.custom.name].options.gitSource = opts.gitSource;
														}
														if (opts.deployConfig) {
															record[opts.env][opts.custom.name].options.deployConfig = opts.deployConfig;
														}
													}

													delete cond.conditions;
													cond.record = record;
													soajs.log.info('cicd record updated');
													BL.model.saveEntry(soajs, cond, myCb);
												}
												else {
													return myCb(null, true);
												}
											});
										});
									}
								});
							});
						});
					}
				});
			});
		});
	},

	/**
	 * Deploy a plugin such as heapster using templates
	 * This api can be later updated to allow sending plugin templates as input, thus allowing the user to deploy anything
	 * @param  {Object}   config
	 * @param  {Object}   soajs
	 * @param  {Object}   deployer
	 * @param  {Function} cb
	 *
	 */
	"deployPlugin": function (config, soajs, deployer, cb) {
		utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env.toUpperCase(), function (error, envRecord) {
			checkIfError(soajs, cb, {
				config: config,
				error: error || !envRecord,
				code: 600
			}, function () {
				checkIfError(soajs, cb, {
					config: config,
					error: !envRecord.deployer.type || !envRecord.deployer.selected || envRecord.deployer.type === 'manual',
					code: 743
				}, function () {

					var options = utils.buildDeployerOptions(envRecord, soajs, BL);
					checkIfError(soajs, cb, {config: config, error: !options, code: 600}, function () {
						options.params = {
							action: 'post',
							resource: soajs.inputmaskData.plugin
						};
						deployer.execute({'type': 'container', 'driver': options.strategy}, 'manageResources', options, (error) =>{
							checkIfError(soajs, cb, {config: config, error: error}, function () {
								return cb(null, true);
							});
						});
					});
				});
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

		modelPath = __dirname + "/../../../models/" + modelName + ".js";
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
