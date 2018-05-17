'use strict';
var fs = require("fs");
var async = require("async");
var shortid = require('shortid');

var utils = require("../../../utils/utils.js");
shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_');

var colls = {
	env: 'environment',
	git: 'git_accounts',
	services: 'services',
	daemons: 'daemons',
	staticContent: 'staticContent',
	catalog: 'catalogs',
	cicd: 'cicd',
	infra: 'infra',
	resources: 'resources'
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
	 *
	 * @param config
	 * @param req
	 * @param deployer
	 * @param cbMain
	 */
	"deployService": function (config, req, deployer, cbMain) {
		let soajs = req.soajs;
		let options = {};
		soajs.log.info('deployService start');
		async.auto({
			getEnvInfo: (fCb) => {
				soajs.log.info('get environment record');
				utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env.toUpperCase(), (error, envRecord) => {
					checkIfError(soajs, fCb, {config: config, error: error || !envRecord, code: 600}, () => {
						options = utils.buildDeployerOptions(envRecord, soajs, BL);
						options.params = {
							data: {
								variables: {}
							}
						};
						return fCb(null, envRecord);
					});
				});
			},
			
			getCatalogAndInfra: ['getEnvInfo', (info, fCb) => {
				async.auto({
					// if action was rebuild get needed information from inspect service and fill inputmaskData with needed input
					// else move forward
					inspectService: function (callback) {
						if (soajs.inputmaskData.action !== 'rebuild') {
							return callback();
						}
						
						soajs.log.info('inspecting service');
						options.params = {
							id: soajs.inputmaskData.serviceId,
							mode: soajs.inputmaskData.mode || null,
							excludeTasks: true
						};
						deployer.execute({
							'type': 'container',
							'driver': options.strategy
						}, 'inspectService', options, (error, record) => {
							checkIfError(soajs, callback, {config: config, error: error}, () => {
								checkIfError(soajs, callback, {
									config: config,
									error: !record.service || !record.service.labels || !record.service.labels['soajs.catalog.id'],
									code: 954
								}, () => {
									if(!soajs.inputmaskData.custom){
										soajs.inputmaskData.custom = {};
									}
									//set catalog id and rebuild option and forward to deploy() function
									soajs.inputmaskData.recipe = record.service.labels['soajs.catalog.id'];
									soajs.inputmaskData.custom.name = record.service.labels['soajs.service.label'].replace(soajs.inputmaskData.env.toLowerCase() + "-", "");
									soajs.inputmaskData.imageLastTs = record.service.labels['service.image.ts'] || "";
									soajs.inputmaskData.deployConfig = {
										replication: {
											mode: record.service.labels["soajs.service.mode"]
										}
									};
									
									if (['replicated', 'deployment'].indexOf(soajs.inputmaskData.deployConfig.replication.mode) !== -1) {
										soajs.inputmaskData.deployConfig.replication.replicas = (record.service.tasks.length - record.service.failures) || 1;
									}
									
									//check for secrets
									if (record.secrets && Array.isArray(record.secrets) && record.secrets.length > 0) {
										soajs.inputmaskData.secrets = [];
										record.secrets.forEach((oneSecret) => {
											let mySecret = {
												"name": oneSecret.SecretName,
												"mountPath": oneSecret.File.Name
											};
											
											//if secret mount path value is equal to value of env SOAJS_NX_SSL_CERTS_LOCATION
											//this secret is a certificate, add type to it
											record.service.env.forEach(function (oneEnv) {
												if (oneEnv.indexOf('SOAJS_NX_SSL_CERTS_LOCATION') !== -1) {
													let thisEnv = oneEnv.split("=");
													if (thisEnv[1] === mySecret.mountPath) {
														mySecret.type = "certificate";
													}
												}
											});
											
											soajs.inputmaskData.custom.secrets.push(mySecret);
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
										
										async.each(record.service.env, function (oneEnv, cb) {
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
											return cb();
										}, callback);
									}
									else {
										if (record.service.labels['soajs.resource.id']) {
											soajs.inputmaskData.custom.resourceId = record.service.labels['soajs.resource.id'];
										}
										return callback();
									}
								});
							});
						});
					},
					
					//wait until inspectService service and then get catalog recipe
					getCatalogRecipe: ['inspectService', function (result, callback) {
						BL.model.validateCustomId(soajs, soajs.inputmaskData.recipe, (error, recipeId) => {
							checkIfError(soajs, callback, {
								config: config,
								error: error || !recipeId,
								code: 701
							}, () => {
								let opts = {
									collection: colls.catalog,
									conditions: {_id: recipeId}
								};
								BL.model.findEntry(soajs, opts, (error, catalogRecord) => {
									checkIfError(soajs, callback, {config: config, error: error, code: 600}, () => {
										checkIfError(soajs, callback, {
											config: config,
											error: !catalogRecord,
											code: 950
										}, () => {
											return callback(null, catalogRecord);
										});
									});
								});
							});
						});
					}],
					
					//wait until inspectService service and then get infra record
					getInfraRecord: ['inspectService', function (result, callback) {
						//if infra id provided, use it
						//else pull based on env code
						if (soajs.inputmaskData.infraId) {
							BL.model.validateCustomId(soajs, soajs.inputmaskData.infraId, (err) => {
								checkIfError(soajs, callback, {config: config, error: err, code: 490}, () => {
									let opts = {
										collection: colls.infra,
										conditions: {
											_id: req.soajs.inputmaskData.id
										}
									};
									BL.model.findEntry(soajs, opts, function (err, infraRecord) {
										checkIfError(soajs, callback, {config: config, error: err, code: 600}, () => {
											checkIfError(soajs, callback, {
												config: config,
												error: !infraRecord,
												code: 600
											}, () => {
												return callback(null, infraRecord);
											});
										});
									});
								});
							});
						}
						else {
							let opts = {
								collection: colls.infra,
								conditions: {
									"deployments.environments": {"$in": [soajs.inputmaskData.env.toUpperCase()]}
								}
							};
							BL.model.findEntry(soajs, opts, function (err, infraRecord) {
								checkIfError(soajs, callback, {config: config, error: err, code: 600}, () => {
									checkIfError(soajs, callback, {
										config: config,
										error: !infraRecord,
										code: 600
									}, () => {
										return callback(null, infraRecord);
									});
								});
							});
						}
					}]
				}, (err, result) => {
					if (err) {
						return fCb(err);
					}
					//fill options with needed information
					options.params.catalog = result.getCatalogRecipe;
					options.infra = result.getInfraRecord;
					options.params.inputmaskData = soajs.inputmaskData;
					return fCb(null, result);
				});
			}],
			
			getDashboardConnectionAndExtKey: ['getCatalogAndInfra', (result, fCb) => {
				async.parallel({
					//get tenant ext key
					getDefaultUIExtKey: function (callback) {
						let packageName = '', tenantCondition = {};
						if (soajs.inputmaskData.env.toLowerCase() === 'portal') {
							tenantCondition = {code: 'PRTL'};
							packageName = 'PRTAL_MAIN';
						}
						else {
							tenantCondition = {locked: true};
							packageName = 'DSBRD_MAIN';
						}
						
						BL.model.findEntry(soajs, { "collection": "tenants", "conditions": tenantCondition }, (error, tenantRecord) => {
							checkIfError(soajs, callback, { config: config, error: error, code: 701 }, () => {
								let extKey = null;
								if (tenantRecord) {
									let envKeyCheck = (tenantRecord.code === 'PRTL') ? 'PORTAL' : process.env.SOAJS_ENV.toUpperCase();
									tenantRecord.applications.forEach(function (oneApplication) {
										let soajsPackabge = process.env.SOAJS_TEST_PACKAGE || packageName;
										if (oneApplication.package === soajsPackabge) {
											oneApplication.keys.forEach(function (oneKey) {
												oneKey.extKeys.forEach(function (oneExtKey) {
													if (oneExtKey.env === envKeyCheck) {
														extKey = oneExtKey.extKey;
													}
												});
											});
										}
									});
								}
								return callback(null, extKey);
							});
						});
					},
					
					//get dashboard mongo connection
					getDashboardConnection: function (callback) {
						helpers.getDashDbInfo(soajs, BL, (error, data) => {
							checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, () => {
								return callback(null, data);
							});
						});
					}
					
				}, (err, result) => {
					if (result.getDefaultUIExtKey) {
						options.params.data.variables['$SOAJS_EXTKEY'] = result.getDefaultUIExtKey;
					}
					
					let data = result.getDashboardConnection;
					options.params.data.variables['$SOAJS_MONGO_NB'] = data.mongoDbs.length;
					
					//adding info about database servers
					for (let i = 0; i < data.mongoDbs.length; i++) {
						options.params.data.variables["$SOAJS_MONGO_IP_" + (i + 1)] = data.mongoDbs[i].host;
						options.params.data.variables["$SOAJS_MONGO_PORT_" + (i + 1)] = data.mongoDbs[i].port;
					}
					
					//if database prefix exists, add it to env variables
					if (data.prefix) {
						options.params.data.variables["$SOAJS_MONGO_PREFIX"] = data.prefix;
					}
					
					//if mongo credentials exist, add them to env variables
					if (data.mongoCred && data.mongoCred.username && data.mongoCred.password) {
						options.params.data.variables["$SOAJS_MONGO_USERNAME"] = data.mongoCred.username;
						options.params.data.variables["$SOAJS_MONGO_PASSWORD"] = data.mongoCred.password;
					}
					
					//if replica set is used, add name to env variables
					if (data.clusterInfo.URLParam && data.clusterInfo.URLParam.replicaSet && data.clusterInfo.URLParam.replicaSet) {
						options.params.data.variables["$SOAJS_MONGO_RSNAME"] = data.clusterInfo.URLParam.replicaSet;
					}
					
					//if authSource is set, add it to env variables
					if (data.clusterInfo.URLParam && data.clusterInfo.URLParam.authSource) {
						options.params.data.variables["$SOAJS_MONGO_AUTH_DB"] = data.clusterInfo.URLParam.authSource;
					}
					
					//if ssl is set, add it to env variables
					if (data.clusterInfo.URLParam && data.clusterInfo.URLParam.ssl) {
						options.params.data.variables["$SOAJS_MONGO_SSL"] = 'true';
					}
					return fCb(null, result);
				});
			}],
			
			getGitAndServiceDaemonInfo: ['getDashboardConnectionAndExtKey', (result, fCb) => {
				async.parallel({
					//get git info for service
					getGitInfo: (callback) => {
						if (soajs.inputmaskData && soajs.inputmaskData.gitSource && soajs.inputmaskData.gitSource.owner && soajs.inputmaskData.gitSource.repo) {
							helpers.getGitRecord(soajs, soajs.inputmaskData.gitSource.owner + '/' + soajs.inputmaskData.gitSource.repo, BL, (error, accountRecord) => {
								soajs.log.info('get Git Info of: ', soajs.inputmaskData.gitSource.owner + '/' + soajs.inputmaskData.gitSource.repo);
								checkIfError(soajs, callback, { config: config, error: error || !accountRecord, code: 600 }, () => {
									accountRecord.providerName = accountRecord.provider;
									
									if (accountRecord.providerName.indexOf('_') !== -1) {
										accountRecord.providerName = accountRecord.providerName.split('_')[0];
									}
									
									//if private repo, add token to env variables
									if (accountRecord.token) {
										if (accountRecord.provider === 'bitbucket_enterprise') {
											accountRecord.token = new Buffer(accountRecord.token, 'base64').toString();
										}
										options.params.data.variables["$SOAJS_GIT_TOKEN"] = accountRecord.token;
									}
									options.params.data.variables['$SOAJS_GIT_PROVIDER'] = accountRecord.providerName;
									options.params.data.variables['$SOAJS_GIT_DOMAIN'] = accountRecord.domain;
									
									if (soajs.inputmaskData.gitSource && soajs.inputmaskData.gitSource.owner) {
										options.params.data.variables['$SOAJS_GIT_OWNER'] = soajs.inputmaskData.gitSource.owner;
									}
									if (soajs.inputmaskData.gitSource && soajs.inputmaskData.gitSource.repo) {
										options.params.data.variables['$SOAJS_GIT_REPO'] = soajs.inputmaskData.gitSource.repo;
									}
									if (soajs.inputmaskData.gitSource && soajs.inputmaskData.gitSource.branch) {
										options.params.data.variables['$SOAJS_GIT_BRANCH'] = soajs.inputmaskData.gitSource.branch;
									}
									if (soajs.inputmaskData.gitSource && soajs.inputmaskData.gitSource.commit) {
										options.params.data.variables['$SOAJS_GIT_COMMIT'] = soajs.inputmaskData.gitSource.commit;
									}
									
									checkConfigCustom(callback);
								});
							});
						}
						else {
							checkConfigCustom(callback);
						}
						
						function checkConfigCustom(vCb) {
							if (soajs.inputmaskData && soajs.inputmaskData.custom && soajs.inputmaskData.custom.sourceCode && Object.keys(soajs.inputmaskData.custom.sourceCode).length > 0) {
								let sourceCodeEntries = Object.keys(soajs.inputmaskData.custom.sourceCode);
								async.each(sourceCodeEntries, (oneSourceCode, mCb) => {
									helpers.getGitRecord(soajs, soajs.inputmaskData.custom.sourceCode[oneSourceCode].repo, BL, (error, dbRecord) => {
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
													options.params.data.variables["$" + mapping[entry]] = dbRecord[entry];
												}
												
												options.params.data.variables['$SOAJS_CONFIG_REPO_NAME'] = soajs.inputmaskData.custom.sourceCode[oneSourceCode].repo.split("/")[1];
												
												options.params.data.variables['$SOAJS_CONFIG_REPO_BRANCH'] = soajs.inputmaskData.custom.sourceCode[oneSourceCode].branch;
												
												if (soajs.inputmaskData.custom.sourceCode[oneSourceCode].commit) {
													options.params.data.variables['$SOAJS_CONFIG_REPO_COMMIT'] = soajs.inputmaskData.custom.sourceCode[oneSourceCode].commit;
												}
												
												if (soajs.inputmaskData.custom.sourceCode[oneSourceCode].path) {
													options.params.data.variables['$SOAJS_CONFIG_REPO_PATH'] = soajs.inputmaskData.custom.sourceCode[oneSourceCode].path;
												}
											}
											else if (dbRecord.repos[0].type === 'multi') {
												dbRecord.repos[0].configSHA.forEach((oneSubRepo) => {
													if (['custom', 'static', 'service', 'daemon'].indexOf(oneSubRepo.contentType) !== -1 && oneSubRepo.contentName === soajs.inputmaskData.custom.sourceCode[oneSourceCode].subName) {
														handleOneRepoLevel(dbRecord, oneSourceCode, oneSubRepo.path);
													}
												});
											}
											else if (['config', 'multi'].indexOf(dbRecord.repos[0].type) === -1 && options.params.catalog.type === 'server') {
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
								options.params.data.variables["$" + mapping[entry]] = dbRecord[entry];
							}
							
							options.params.data.variables['$SOAJS_GIT_REPO'] = soajs.inputmaskData.custom.sourceCode[oneSourceCode].repo.split("/")[1];
							options.params.data.variables['$SOAJS_GIT_BRANCH'] = soajs.inputmaskData.custom.sourceCode[oneSourceCode].branch;
							
							if (soajs.inputmaskData.custom.sourceCode[oneSourceCode].commit) {
								options.params.data.variables['$SOAJS_GIT_COMMIT'] = soajs.inputmaskData.custom.sourceCode[oneSourceCode].commit;
							}
							
							if (soajs.inputmaskData.custom.sourceCode[oneSourceCode].path || subPath) {
								let path = soajs.inputmaskData.custom.sourceCode[oneSourceCode].path;
								if (subPath) {
									path = subPath.replace("/config.js", "/");
									path = path.replace("/soa.js", "/");
								}
								options.params.data.variables['$SOAJS_GIT_PATH'] = path;
							}
						}
					},
					
					// service and daemon information
					getServiceDaemonInfo: (callback) => {
						if (['service', 'daemon'].indexOf(options.params.catalog.type) === -1 || (soajs.inputmaskData.custom && ['service', 'daemon'].indexOf(soajs.inputmaskData.custom.type) === -1)) {
							return callback();
						}
						let opts = {
							collection: (soajs.inputmaskData.custom && soajs.inputmaskData.custom.daemonGroup) ? colls.daemons : colls.services,
							conditions: {
								name: (soajs.inputmaskData.custom && soajs.inputmaskData.custom.name) ? soajs.inputmaskData.custom.name : ''
							}
						};
						if (soajs.inputmaskData.custom && soajs.inputmaskData.custom.gc && soajs.inputmaskData.custom.gc.gcName) {
							opts.conditions.name = soajs.inputmaskData.custom.gc.gcName;
						}
						BL.model.findEntry(soajs, opts, (error, dbRecord) => {
							checkIfError(soajs, callback, { config: config, error: error, code: 600 }, function () {
								if (!dbRecord && (options.params.catalog.type === 'soajs' || ((options.params.catalog.type === 'service' || options.params.catalog.type === 'daemon') && options.params.catalog.subtype === 'soajs'))) {
									return callback({
										"code": 600,
										"message": "This Repository does not contain a service or a daemon code that can be matched to the API catalog or the Daemon Catalog!"
									});
								}
								
								//misc services might not have db records, return
								if (!dbRecord) {
									return callback(null, null);
								}
								else {
									//If the service has a custom entry point, add it as an option to the deployer
									if (dbRecord.src && dbRecord.src.main) {
										options.params.data.variables['$SOAJS_SRV_MAIN'] = dbRecord.src.main;
									}
									
									//Add service ports as computed fields
									options.params.data.variables['$SOAJS_SRV_PORT'] = dbRecord.port;
									
									options.params.data.serviceName = dbRecord.name;
									options.params.data.serviceGroup = dbRecord.group;
									if(dbRecord.name === 'controller' && !dbRecord.group){
										dbRecord.group = "SOAJS Core Services";
									}
									
									//If the service is a soajs service, add maintenance port
									if (options.params.catalog.type === 'soajs' || ((options.params.catalog.type === 'service' || options.params.catalog.type === 'daemon') && options.params.catalog.subtype === 'soajs')) {
										dbRecord.maintenancePort = dbRecord.port + options.soajs.registry.services.config.ports.maintenanceInc;
										
										options.params.data.variables['$SOAJS_SRV_PORT_MAINTENANCE'] = dbRecord.maintenancePort;
									}
									
									//If a service requires to run cmd commands before starting, get them from service record and add them
									if (dbRecord.src && dbRecord.src.cmd && Array.isArray(dbRecord.src.cmd) && dbRecord.src.cmd.length > 0) {
										for (let cmd = dbRecord.src.cmd.length - 1; cmd >= 0; cmd--) {
											if (dbRecord.src.cmd[cmd].trim() === '') {
												dbRecord.src.cmd.splice(cmd, 1);
											}
										}
										if (dbRecord.src.cmd.length > 0) {
											options.params.data.serviceCmd = dbRecord.src.cmd;
										}
									}
									
									var serviceName = options.soajs.registry.code.toLowerCase() + "-" + soajs.inputmaskData.custom.name;
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
									
									options.params.data.name = serviceName;
									if (daemonGroupName) options.params.data.daemonGroupName = daemonGroupName;
									
									if (dbRecord && dbRecord.prerequisites && dbRecord.prerequisites.memory) {
										checkIfError(soajs, callback, {
											config: config,
											error: (dbRecord.prerequisites.memory > soajs.inputmaskData.deployConfig.memoryLimit),
											code: 910
										}, callback);
									}
									else {
										return callback(null, {
											maintenancePort: {
												"name": "service",
												"isPublished": false,
												"target": dbRecord.maintenancePort
											},
											servicePort: {
												"name": "maintenance",
												"isPublished": false,
												"target": dbRecord.port
											}
										});
									}
								}
							});
						});
					}
				}, fCb);
			}],
			
			// gather all ports from all sources (service-daemon, custom ports, and recipe)
			portComputing: ['getGitAndServiceDaemonInfo', (result, fCb) => {
				let ports = options.params.catalog.recipe.deployOptions.ports || [];
				if (ports.length === 0 && result.getGitAndServiceDaemonInfo.getServiceDaemonInfo) {
					if (result.getGitAndServiceDaemonInfo.getServiceDaemonInfo.servicePort) {
						ports.push(result.getGitAndServiceDaemonInfo.getServiceDaemonInfo.servicePort);
					}
					if (result.getGitAndServiceDaemonInfo.getServiceDaemonInfo.maintenancePort) {
						ports.push(result.getGitAndServiceDaemonInfo.getServiceDaemonInfo.maintenancePort);
					}
					return fCb(null, true);
				}
				else {
					let servicePort = false;
					let maintenancePort = false;
					async.each(ports, function (onePort, callback) {
						if (soajs.inputmaskData.custom && soajs.inputmaskData.custom.ports && soajs.inputmaskData.custom.ports.length > 0) {
							soajs.inputmaskData.custom.ports.forEach((oneInputPort) => {
								if (onePort.isPublished && oneInputPort.name === onePort.name && oneInputPort.published) {
									onePort.published = oneInputPort.published;
								}
							});
						}
						if (result.getGitAndServiceDaemonInfo.getServiceDaemonInfo) {
							if (result.getGitAndServiceDaemonInfo.getServiceDaemonInfo.servicePort
								&& result.getGitAndServiceDaemonInfo.getServiceDaemonInfo.servicePort.target === onePort.target) {
								servicePort = true;
							}
							if (result.getGitAndServiceDaemonInfo.getServiceDaemonInfo.maintenancePort) {
								if (onePort.name === 'maintenance') {
									maintenancePort = true;
								}
							}
						}
						return callback();
					}, () => {
						if (result.getGitAndServiceDaemonInfo.getServiceDaemonInfo && result.getGitAndServiceDaemonInfo.getServiceDaemonInfo.servicePort && !servicePort) {
							ports.push(result.getGitAndServiceDaemonInfo.getServiceDaemonInfo.servicePort);
						}
						if (result.getGitAndServiceDaemonInfo.getServiceDaemonInfo && result.getGitAndServiceDaemonInfo.getServiceDaemonInfo.maintenancePort && !maintenancePort) {
							ports.push(result.getGitAndServiceDaemonInfo.getServiceDaemonInfo.servicePort);
						}
						options.params.inputmaskData.custom.ports = ports;
						return fCb(null, true);
					});
				}
			}],
			
		}, (err) => {
			//todo: check if error with cbMain
			if (err) {
				return cbMain(err);
			}
			
			//update environment record
			//update infra record
			//update resource record if type is resource
			//update CiCD record
			//update ledger record
			
			function updateCiCdRecord(opts, recordType, callback) {
				return callback();
				let cond = {
					collection: colls.cicd,
					conditions: {
						type: recordType
					}
				};
				BL.model.findEntry(soajs, cond, function (error, record) {
					if (error){
						return callback(error);
					}
					else {
						//todo need to update this
						let env = opts.env.toUpperCase();
						let name =  record.service.labels['soajs.service.label'].replace(soajs.inputmaskData.env.toLowerCase() + "-", "");
						let version = record.service.labels['soajs.service.version'];
						if (record && record[env] && record[env][name]) {
							if (record[env][name]["v" + version]) {
								record[env][name]["v" + version].branch = branch;
								
								if (record[env][name]["v" + version].options && opts.custom) {
									record[env][name]["v" + version].options.custom = soajs.inputmaskData.custom;
								}
								
								if (record[env][name]["v" + version].options && soajs.inputmaskData.gitSource) {
									record[env][name]["v" + version].options.gitSource = soajs.inputmaskData.gitSource;
								}
								
								if (record[env][name]["v" + version].options && opts.deployConfig) {
									record[env][name]["v" + version].options.deployConfig = soajs.inputmaskData.deployConfig;
								}
							}
							else {
								if (!record[env][name].options) {
									record[env][name].options = {}
								}
								record[env][name].status = 'ready';
								if (soajs.inputmaskData.custom) {
									record[name][name].options.custom = soajs.inputmaskData.custom;
								}
								if (soajs.inputmaskData.gitSource) {
									record[name][name].options.gitSource = soajs.inputmaskData.gitSource;
								}
								if (soajs.inputmaskData.deployConfig) {
									record[name][name].options.deployConfig = soajs.inputmaskData.deployConfig;
								}
							}
							
							delete cond.conditions;
							cond.record = record;
							soajs.log.info('cicd record updated!');
							BL.model.saveEntry(soajs, cond, callback);
						}
						else {
							return callback(null, true);
						}
					}
				});
			}
			
			options.params.inputmaskData = soajs.inputmaskData;
			options.params.action = soajs.inputmaskData.action || "deploy";
			
			let technology = req.soajs.inputmaskData.technology || options.strategy;
			options.infra.stack = utils.getDeploymentFromInfra(options.infra, options.env);
			if (options.infra.stack) {
				options.infra.stack = options.infra.stack[0];
			}
			delete options.soajs.inputmaskData;
			delete options.model;
			
			async.auto({
				"triggerDeploy": (mCb) => {
					soajs.log.info("Preparing to deploy service!");
					deployer.execute({ 'type': 'infra', 'driver': options.infra.name, 'technology': technology }, 'deployService', options, (error, data) => {
						utils.checkErrorReturn(soajs, mCb, {config: config, error: error}, () => {
							soajs.log.info("Deployment successfully!");
							//todo need to update this in case of vm and test this
							let opts = JSON.parse(JSON.stringify(options));
							opts.params = {
								id: data.id,
								mode: mode,
								excludeTasks: false
							};
							/**
							 * This timeout is set to ensure the response returned is full
							 */
							setTimeout(function () {
								//todo need to update this
								deployer.execute({
									'type': 'infra',
									'driver': options.infra.name,
									'technology': technology
								}, 'inspectService', opts, mCb);
							}, 1500);
						});
					});
				},
				"postDeployment": ["triggerDeploy", (info, mCb) =>{
					let record = info.triggerDeploy;
					async.parallel({
						updateEnv: (callback) => {
							let opts = {
								collection: colls.env,
								record: options.soajs.registry //todo: need to double check that this is returned sa7
							};
							BL.model.saveEntry(soajs, opts, callback);
						},
						updateInfra: (callback) => {
							let infra = options.infra;
							delete infra.stack;
							let opts = {
								collection: colls.infra,
								record: infra
							};
							BL.model.saveEntry(soajs, opts, callback);
						},
						updateCiCD: (callback) => {
							if (record.service.labels['soajs.service.type'] === 'service' || record.service.labels['soajs.service.type'] === 'daemon' || record.service.labels['soajs.service.type'] === 'other') {
								updateCiCdRecord(options, 'cd', callback);
							}
							else if (record.service.labels['soajs.resource.id']) {
								updateCiCdRecord(options, 'resource', callback);
							}
							else{
								return callback();
							}
						},
						updateResource: (callback) => {
							if (!record.service.labels['soajs.resource.id']) {
								return callback();
							}
							let resourceOpts = {
								collection: colls.resources,
								conditions: {name: soajs.inputmaskData.custom.name}
							};
							BL.model.findEntry(soajs, resourceOpts, function (error, resource) {
								utils.checkErrorReturn(soajs, callback, {config: config, error: error}, () => {
									if (resource && resource.config && resource.config.servers && resource.config.servers[0] && resource.config.servers[0].host) {
										resource.config.servers[0].host = record.ip.toString();
										resourceOpts = {
											collection: colls.resources,
											record: resource
										};
										BL.model.saveEntry(soajs, resourceOpts, callback);
									}
									else{
										return callback();
									}
								});
							});
						}
					}, mCb);
				}]
			}, (error) => {
				if(error){
					soajs.log.error(error);
					//generate error audit log message
				}
				else{
					//generate success audit log message
				}
				
				//insert ledger entry for audit log message
			});
			
			//do not wait for deploy to finish, return api response
			return cbMain(null, true);
		});
	},
	
	/**
	 * Redeploy a service (does not update config, only simulates a deployment restart)
	 *
	 * @param {Object} config
	 * @param {Object} req
	 * @param {Object} soajs
	 * @param {Object} deployer
	 * @param {Function} cbMain
	 */
	"redeployService": function (config, req, soajs, deployer, cbMain) {
		if (soajs.inputmaskData.action === 'redeploy') {
			utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env.toUpperCase(), (error, envRecord) => {
				checkIfError(soajs, cbMain, {
					config: config,
					error: error || !envRecord,
					code: 600
				}, () => {
					let options = utils.buildDeployerOptions(envRecord, soajs, BL);
					options.params = {
						id: soajs.inputmaskData.serviceId,
						mode: soajs.inputmaskData.mode, //NOTE: only required for kubernetes driver
						action: soajs.inputmaskData.action
					};
					deployer.execute({
						'type': 'infra',
						'driver': options.strategy,
						'technology': options.strategy
					}, 'redeployService', options, (error) => {
						checkIfError(soajs, cbMain, {config: config, error: error}, () => {
							return cbMain(null, true);
						});
					});
				});
			});
		}
		else if (soajs.inputmaskData.action === 'rebuild') {
			BL.deployService(config, req, deployer, (error, serviceInfo) => {
				checkIfError(soajs, cbMain, {config: config, error: error}, () => {
					return cbMain(null, serviceInfo);
				});
			});
		}
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
						deployer.execute({
							'type': 'container',
							'driver': options.strategy
						}, 'manageResources', options, (error) => {
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
