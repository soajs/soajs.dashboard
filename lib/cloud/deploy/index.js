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
	catalog: 'catalogs'
};

var helpers = require("./helper.js");

var BL = {
	model: null,

	/**
	 * Deploy a new SOAJS service of type [ nginx || controller || service || daemon ], routes to specific function
	 *
	 * @param {Response Object} res
	 */
	"deployService": function (config, soajs, registry, deployer, cbMain) {
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

		function getEnvInfo(cb) {
			//from envCode, load env, get port and domain
			utils.getEnvironment(soajs, BL.model, context.env.toUpperCase(), function (error, envRecord) {
				utils.checkErrorReturn(soajs, cbMain, {
					config: config,
					error: error || !envRecord,
					code: 600
				}, function () {
					utils.checkErrorReturn(soajs, cbMain, {
						config: config,
						error: !envRecord.deployer.type || !envRecord.deployer.selected || envRecord.deployer.type === 'manual',
						code: 743
					}, function () {
						context.envRecord = envRecord;
						context.variables['$SOAJS_NX_DOMAIN'] = context.envRecord.domain;
						context.variables['$SOAJS_NX_SITE_DOMAIN'] = context.envRecord.sitePrefix + "." + context.envRecord.domain;
						context.variables['$SOAJS_NX_API_DOMAIN'] = context.envRecord.apiPrefix + "." + context.envRecord.domain;
						context.variables['$SOAJS_PROFILE'] = context.envRecord.profile;
						options = utils.buildDeployerOptions(context.envRecord, soajs, BL);
						return cb();
					});
				});
			});
		}

		function getCatalogRecipe(cb) {
			BL.model.validateCustomId(soajs, soajs.inputmaskData.recipe, function (error, recipeId) {
				utils.checkErrorReturn(soajs, cbMain, {
					config: config,
					error: error || !recipeId,
					code: 701
				}, function () {
					var opts = {
						collection: colls.catalog,
						conditions: { _id: recipeId }
					};
					BL.model.findEntry(soajs, opts, function (error, catalogRecord) {
						utils.checkErrorReturn(soajs, cbMain, { config: config, error: error, code: 600 }, function () {
							utils.checkErrorReturn(soajs, cbMain, {
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
			helpers.checkPort(context, config, cbMain, cb);
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
				deployer.getServiceHost(options, function (error, controllerDomainName) {
					utils.checkErrorReturn(soajs, cbMain, { config: config, error: error }, function () {
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
					utils.checkErrorReturn(soajs, cbMain, {
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
						}
						context.variables['$SOAJS_GIT_PROVIDER'] = accountRecord.providerName;
						context.variables['$SOAJS_GIT_DOMAIN'] = accountRecord.domain;

						if (soajs.inputmaskData.gitSource && soajs.inputmaskData.gitSource.owner) {
							context.variables['$SOAJS_GIT_OWNER'] = soajs.inputmaskData.gitSource.owner;
						}
						if (soajs.inputmaskData.gitSource && soajs.inputmaskData.gitSource.repo) {
							context.variables['$SOAJS_GIT_REPO'] = soajs.inputmaskData.gitSource.repo;
						}
						if (soajs.inputmaskData.gitSource && soajs.inputmaskData.gitSource.branch) {
							context.variables['$SOAJS_GIT_BRANCH'] = soajs.inputmaskData.gitSource.branch;
						}
						if (soajs.inputmaskData.gitSource && soajs.inputmaskData.gitSource.commit) {
							context.variables['$SOAJS_GIT_COMMIT'] = soajs.inputmaskData.gitSource.commit;
						}

						return cb();
					});
				});
			}
			else {
				return cb();
			}
		}

		function getServiceDaemonInfo(cb) {
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
				utils.checkErrorReturn(soajs, cbMain, {
					config: config,
					error: error || (!dbRecord && (context.catalog.type === 'soajs' || ((context.catalog.type === 'service' || context.catalog.type === 'daemon') && context.catalog.subtype === 'soajs'))),
					code: 600
				}, function () {
					//misc services might not have db records, return
					if (!dbRecord) {
						return cb();
					}
					else {
						registry.loadByEnv({ envCode: context.envRecord.code.toLowerCase() }, function (error, registry) {
							utils.checkErrorReturn(soajs, cbMain, {
								config: config,
								error: error,
								code: 446
							}, function () {
								//If the service has a custom entry point, add it as an option to the deployer
								if (dbRecord.src && dbRecord.src.main) {
									context.variables['$SOAJS_SRV_MAIN'] = dbRecord.src.main;
								}

								//Add service ports as computed fields
								context.variables['$SOAJS_SRV_PORT'] = dbRecord.port;

								context.ports = [
									{
										"name": "service",
										"isPublished": false,
										"target": dbRecord.port
									}
								];
								context.serviceName = dbRecord.name;
								context.serviceGroup = dbRecord.group;

								//If the service is a soajs service, add maintenance port
								if (context.catalog.type === 'soajs' || ((context.catalog.type === 'service' || context.catalog.type === 'daemon') && context.catalog.subtype === 'soajs')) {
									dbRecord.maintenancePort = dbRecord.port + registry.serviceConfig.ports.maintenanceInc;
									context.ports.push({
										"name": "maintenance",
										"isPublished": false,
										"target": dbRecord.maintenancePort
									});

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

								if(soajs.inputmaskData.custom && soajs.inputmaskData.custom.daemonGroup) {
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
									utils.checkErrorReturn(soajs, cbMain, {
										config: config,
										error: (dbRecord.prerequisites.memory > soajs.inputmaskData.deployConfig.memoryLimit),
										code: 910
									}, cb);
								}
								else {
									return cb();
								}
							});
						});
					}
				});
			});
		}

		function getDashboardConnection(cb) {
			helpers.getDashDbInfo(soajs, function (error, data) {
				utils.checkErrorReturn(soajs, cbMain, { config: config, error: error, code: 600 }, function () {
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

		function getAnalyticsEsInfo(cb) {
			helpers.getAnalyticsEsInfo(soajs, config, context, BL.model, cb);
		}
		
		function getDefaultUIExtKey(cb){
			BL.model.findEntry(soajs, {"collection": "tenants", "conditions": {"locked": true}}, function (error, tenantRecord) {
				utils.checkErrorReturn(soajs, cbMain, {
					config: config,
					error: error || !tenantRecord,
					code: 701
				}, function () {
					tenantRecord.applications.forEach(function(oneApplication){
						var soajsPackabge = process.env.SOAJS_TEST_PACKAGE || "DSBRD_MAIN";
						if(oneApplication.package === soajsPackabge){
							oneApplication.keys.forEach(function(oneKey){
								oneKey.extKeys.forEach(function(oneExtKey){
									if(oneExtKey.env === process.env.SOAJS_ENV.toUpperCase()){
										context.variables['$SOAJS_EXTKEY'] = oneExtKey.extKey;
									}
								});
							});
						}
					});
					return cb();
				});
			});
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
				headers: { 'cache-control': 'no-cache' },
				json: true
			};
			request.get(opts, function (error, response, body) {
				utils.checkErrorReturn(soajs, cbMain, { config: config, error: error, code: 600 }, function () {
					context.imageInfo = body;
					return cb();
				});
			});
		}

		async.series([getEnvInfo, getCatalogRecipe, checkPort, getLatestSOAJSImageInfo, getDefaultUIExtKey], function () {
			var platform = context.envRecord.deployer.selected.split('.')[1];
			context.platform = platform;
			context.options = options;

			if (soajs.inputmaskData.deployConfig && soajs.inputmaskData.deployConfig.memoryLimit) {
				context.variables['$SOAJS_SRV_MEMORY'] = Math.floor(soajs.inputmaskData.deployConfig.memoryLimit / 1048576);
			}

			async.series([getDashboardConnection, getAnalyticsEsInfo, getControllerDomain, getGitInfo, getServiceDaemonInfo], function () {
				
				if(context.catalog.type === 'soajs' || (context.catalog.subtype === 'soajs' && (context.catalog.type ==='service' || context.catalog.type === 'daemon'))){
					context.labels = {
						"soajs.content": "true",
						"soajs.service.name": context.serviceName,
						"soajs.service.group": (context.serviceGroup) ? context.serviceGroup.toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-') : '',
						"soajs.service.label": context.name,
						"soajs.service.repo.name": "soajs_" + context.serviceName
					};
					
					if (context.catalog.type) {
						context.labels["soajs.service.type"] = context.catalog.type;
					}
					
					if (context.catalog.subtype) {
						context.labels["soajs.service.subtype"] = context.catalog.subtype;
					}
					
					if (soajs.inputmaskData.custom && soajs.inputmaskData.custom.version) {
						context.labels["soajs.service.version"] = soajs.inputmaskData.custom.version.toString();
					}
					
					if(soajs.inputmaskData.custom && soajs.inputmaskData.custom.daemonGroup && context.daemonGroupName) {
						context.labels["soajs.daemon.group"] = context.daemonGroupName;
					}
					
					//add repo and branch as labels
					if (context.catalog && context.catalog.recipe && context.catalog.recipe.buildOptions && context.catalog.recipe.buildOptions.env) {
						for (let i = 0, oneEnvKey = '', oneEnv = {}; i < Object.keys(context.catalog.recipe.buildOptions.env).length; i++) {
							oneEnvKey = Object.keys(context.catalog.recipe.buildOptions.env)[i];
							oneEnv = context.catalog.recipe.buildOptions.env[oneEnvKey];
							
							if (oneEnv.type === 'computed' && oneEnv.value === '$SOAJS_GIT_REPO') {
								context.labels['service.repo'] = context.variables['$SOAJS_GIT_REPO'];
							}
							else if (oneEnv.type === 'computed' && oneEnv.value === '$SOAJS_GIT_BRANCH') {
								context.labels['service.branch'] = context.variables['$SOAJS_GIT_BRANCH'];
							}
							else if (oneEnv.type === 'computed' && oneEnv.value === '$SOAJS_GIT_COMMIT'){
								context.labels['service.commit'] = context.variables['$SOAJS_GIT_COMMIT'];
							}
							else if (oneEnv.type === 'computed' && oneEnv.value === '$SOAJS_GIT_OWNER'){
								context.labels['service.owner'] = context.variables['$SOAJS_GIT_OWNER'];
							}
							
							if (context.labels['service.repo'] && context.labels['service.branch'] && context.labels['service.commit']) break;
						}
					}
				}
				else if(context.catalog.type ==='nginx' || (context.catalog.subtype ==='nginx' && context.catalog.type ==='server')){
					context.labels = {
						"soajs.content": "true",
						"soajs.service.name": "nginx",
						"soajs.service.group": "nginx",
						"soajs.service.type": context.catalog.type,
						"soajs.service.label": context.envRecord.code.toLowerCase() + "-nginx"
					};
					
					if (context.catalog.subtype) {
						context.labels["soajs.service.subtype"] = context.catalog.subtype;
					}
					
					context.name = context.envRecord.code.toLowerCase() + "_nginx";
					//add repo and branch as labels
					if (context.catalog && context.catalog.recipe && context.catalog.recipe.buildOptions && context.catalog.recipe.buildOptions.env) {
						for (let i = 0, oneEnvKey = '', oneEnv = {}; i < Object.keys(context.catalog.recipe.buildOptions.env).length; i++) {
							oneEnvKey = Object.keys(context.catalog.recipe.buildOptions.env)[i];
							oneEnv = context.catalog.recipe.buildOptions.env[oneEnvKey];
							
							if (oneEnvKey === 'SOAJS_GIT_REPO') {
								if (oneEnv.type === 'static') {
									context.labels['service.repo'] = oneEnv.value;
								}
								else if (oneEnv.type === 'userInput') {
									context.labels['service.repo'] = soajs.inputmaskData.custom.env['SOAJS_GIT_REPO'] || oneEnv.default;
								}
							}
							else if (oneEnvKey === 'SOAJS_GIT_BRANCH') {
								if (oneEnv.type === 'static') {
									context.labels['service.branch'] = oneEnv.value;
								}
								else if (oneEnv.type === 'userInput') {
									context.labels['service.branch'] = soajs.inputmaskData.custom.env['SOAJS_GIT_BRANCH'] || oneEnv.default;
								}
							}
							else if (oneEnvKey === 'SOAJS_GIT_COMMIT') {
								if (oneEnv.type === 'static') {
									context.labels['service.commit'] = oneEnv.value;
								}
								else if (oneEnv.type === 'userInput') {
									context.labels['service.commit'] = soajs.inputmaskData.custom.env['SOAJS_GIT_COMMIT'] || oneEnv.default;
								}
							}
							else if (oneEnvKey === 'SOAJS_GIT_OWNER') {
								if (oneEnv.type === 'static') {
									context.labels['service.owner'] = oneEnv.value;
								}
								else if (oneEnv.type === 'userInput') {
									context.labels['service.owner'] = soajs.inputmaskData.custom.env['SOAJS_GIT_OWNER'] || oneEnv.default;
								}
							}
							
							if (context.labels['service.repo'] && context.labels['service.branch'] && context.labels['service.commit']) break;
						}
					}
				}
				else{
					var serviceLabel = '';
					if (soajs.inputmaskData.custom && soajs.inputmaskData.custom.name) {
						serviceLabel = context.envRecord.code.toLowerCase() + "-" + soajs.inputmaskData.custom.name;
						if (soajs.inputmaskData.custom.allEnv) {
							serviceLabel = soajs.inputmaskData.custom.name;
						}
					}
					else {
						var serviceUid = shortid.generate().replace(/[\.-_]/g, '0'); //remove characters that might cause errors on kubernetes
						serviceLabel = context.envRecord.code.toLowerCase() + "-" + context.catalog.type;
						if(context.catalog.subtype){
							serviceLabel+= "-" + context.catalog.subtype + "-" + serviceUid;
						}
						if (soajs.inputmaskData.custom && soajs.inputmaskData.custom.allEnv) {
							serviceLabel = context.catalog.type;
							if(context.catalog.subtype){
								serviceLabel += "-" + context.catalog.subtype;
							}
							serviceLabel += "-" + serviceUid
						}
					}
					
					context.name = serviceLabel;
					context.labels = {
						"soajs.service.name": context.serviceName || context.name,
						"soajs.service.type": context.catalog.type,
						"soajs.service.label": serviceLabel
						// "soajs.service.version": soajs.inputmaskData.custom.version.toString() || "1"
					};
					
					if(context.catalog.subtype){
						context.labels["soajs.service.subtype"] = context.catalog.subtype;
					}
					
					if (soajs.inputmaskData.custom && soajs.inputmaskData.custom.version) {
						context.labels['soajs.service.version'] = soajs.inputmaskData.custom.version.toString();
					}
					
					//NOTE: might not be needed anymore.
					// if (config.HA.clustersList.indexOf(context.catalog.type.toLowerCase()) !== -1) {
					// 	context.labels['soajs.content'] = "true";
					// 	context.labels['soajs.service.group'] = "db";
					// }
					//add repo and branch as labels
					if (context.catalog && context.catalog.recipe && context.catalog.recipe.buildOptions && context.catalog.recipe.buildOptions.env) {
						for (let i = 0, oneEnvKey = '', oneEnv = {}; i < Object.keys(context.catalog.recipe.buildOptions.env).length; i++) {
							oneEnvKey = Object.keys(context.catalog.recipe.buildOptions.env)[i];
							oneEnv = context.catalog.recipe.buildOptions.env[oneEnvKey];
							
							if (oneEnv.type === 'computed' && oneEnv.value === '$SOAJS_GIT_REPO') {
								context.labels['service.repo'] = context.variables['$SOAJS_GIT_REPO'];
							}
							else if (oneEnv.type === 'computed' && oneEnv.value === '$SOAJS_GIT_BRANCH') {
								context.labels['service.branch'] = context.variables['$SOAJS_GIT_BRANCH'];
							}
							else if (oneEnv.type === 'computed' && oneEnv.value === '$SOAJS_GIT_COMMIT'){
								context.labels['service.commit'] = context.variables['$SOAJS_GIT_COMMIT'];
							}
							else if (oneEnv.type === 'computed' && oneEnv.value === '$SOAJS_GIT_OWNER'){
								context.labels['service.owner'] = context.variables['$SOAJS_GIT_OWNER'];
							}
							
							if (context.labels['service.repo'] && context.labels['service.branch'] && context.labels['service.commit']) break;
						}
					}
					
				}

				if(context.variables['$SOAJS_SRV_MEMORY']){
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

		function doDeploy() {
			helpers.deployContainer(config, context, soajs, deployer, BL, cbMain);
		}
	},

	/**
	 * Redeploy a service (does not update config, only simulates a deployment restart)
	 *
	 * @param {Object} options
	 * @param {Response Object} res
	 */
	"redeployService": function (config, soajs, registry, deployer, cbMain) {
		utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function (error, envRecord) {
			utils.checkErrorReturn(soajs, cbMain, {
				config: config,
				error: error || !envRecord,
				code: 402
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
					deployer.redeployService(options, function (error) {
						utils.checkErrorReturn(soajs, cbMain, { config: config, error: error }, function () {
							return cbMain(null, true);
						});
					});
				}
				else if (soajs.inputmaskData.action === 'rebuild') {
					options.params = { id: soajs.inputmaskData.serviceId, excludeTasks: true };
					deployer.inspectService(options, function (error, record) {
						utils.checkErrorReturn(soajs, cbMain, { config: config, error: error }, function () {
							utils.checkErrorReturn(soajs, cbMain, {
								config: config,
								error: !record.service || !record.service.labels || !record.service.labels['soajs.catalog.id'],
								code: 954
							}, function () {
								//set catalog id and rebuild option and forward to deploy() function
								soajs.inputmaskData.recipe = record.service.labels['soajs.catalog.id'];
								soajs.inputmaskData.custom.name = record.service.labels['soajs.service.name'];
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

								//set the memory limit
								soajs.inputmaskData.deployConfig.memoryLimit = 500;
								if(soajs.inputmaskData.custom.memory){
									soajs.inputmaskData.deployConfig.memoryLimit = soajs.inputmaskData.custom.memory;
								}
								else{
									//'replicated', 'global', 'deployment', 'daemonset'
									record.service.env.forEach(function (oneEnv) {
										if (oneEnv.indexOf('SOAJS_SRV_MEMORY') !== -1) {
											soajs.inputmaskData.deployConfig.memoryLimit = parseInt(oneEnv.split('=')[1]);
										}
									});
								}
								if( soajs.inputmaskData.deployConfig.memoryLimit / 1048576 < 1){
									soajs.inputmaskData.deployConfig.memoryLimit = soajs.inputmaskData.deployConfig.memoryLimit * 1048576;
								}

								if (record.service.labels['soajs.service.type'] === 'service' || record.service.labels['soajs.service.type'] === 'daemon') {
									soajs.inputmaskData.custom.type = record.service.labels['soajs.service.type'];
									soajs.inputmaskData.custom.version = record.service.labels['soajs.service.version'];
									soajs.inputmaskData.gitSource = {};

									if(soajs.inputmaskData.custom.branch){
										soajs.inputmaskData.gitSource.branch = soajs.inputmaskData.custom.branch;
									}
									async.each(record.service.env, function (oneEnv, callback) {
										if (oneEnv.indexOf('SOAJS_GIT_OWNER') !== -1) soajs.inputmaskData.gitSource.owner = oneEnv.split('=')[1];
										else if (oneEnv.indexOf('SOAJS_GIT_REPO') !== -1) soajs.inputmaskData.gitSource.repo = oneEnv.split('=')[1];
										else if (oneEnv.indexOf('SOAJS_GIT_BRANCH') !== -1 && !soajs.inputmaskData.gitSource.branch) soajs.inputmaskData.gitSource.branch = oneEnv.split('=')[1];

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
										else if (soajs.inputmaskData.type === 'service' && oneEnv.indexOf('SOAJS_GC_VERSION') !== -1) {
											if (oneEnv !== 'SOAJS_GC_VERSION=null') {
												if (!soajs.inputmaskData.custom.gc) {
													soajs.inputmaskData.custom.gc = {};
												}
												soajs.inputmaskData.custom.gc.gcVersion = oneEnv.split('=')[1];
											}
										}

										return callback();
									}, function () {
										return BL.deployService(config, soajs, registry, deployer, cbMain);
									});
								}
								else {
									return BL.deployService(config, soajs, registry, deployer, cbMain);
								}
							});
						});
					});
				}
			});
		});
	},

	/**
	 * Deploy a plugin such as heapster using templates
	 * This api can be later updated to allow sending plugin templates as input, thus allowing the user to deploy anything
	 * @param  {Object}   config
	 * @param  {Object}   soajs
	 * @param  {Object}   registry
	 * @param  {Object}   deployer
	 * @param  {Function} cb
	 *
	 */
	"deployPlugin": function (config, soajs, deployer, cb) {
		utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env, function(error, envRecord) {
			utils.checkErrorReturn(soajs, cb, { config: config, error: error, code: 600 }, function() {
				utils.checkErrorReturn(soajs, cb, { config: config, error: !envRecord, code: 402 }, function() {
					var options = utils.buildDeployerOptions(envRecord, soajs, BL);
					utils.checkErrorReturn(soajs, cb, { config: config, error: !options, code: 600 }, function() {
						options.params = {
							action: 'post',
							resource: soajs.inputmaskData.plugin
						};
						deployer.manageResources(options, function(error) {
							utils.checkErrorReturn(soajs, cb, { config: config, error: error }, function() {
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
