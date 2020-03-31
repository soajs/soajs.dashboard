'use strict';
const async = require("async");
const soajsLib = require("soajs.core.libs");
const colls = {
	git: 'git_accounts',
	services: 'services',
	daemons: 'daemons',
	daemonsGrpconf: 'daemon_grpconf',
	staticContent: 'staticContent',
	catalog: 'catalogs',
	resources: 'resources',
	environment: 'environment',
	cicd: 'cicd',
	infra: 'infra'
};

let helpers = {
	/**
	 * Get activated git record from data store
	 *
	 * @param {Object} soajs
	 * @param {Object} repo
	 * @param {Object} BL
	 * @param {Function} cb
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
	 *
	 * @param {Object} soajs
	 * @param {Object} record
	 * @param {Function} cb
	 */
	computeInspectService: function (soajs, record, cb) {
		if (!soajs.inputmaskData.custom) {
			soajs.inputmaskData.custom = {};
		}
		//if new recipe dont use recipe coming from service
		if (!soajs.inputmaskData.recipe){
			soajs.inputmaskData.recipe = record.service.labels['soajs.catalog.id'];
		}
		
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
		
		/**
		 * check for secrets
		 */
		
		//case of docker
		if (record.service && record.service.secrets && Array.isArray(record.service.secrets) && record.service.secrets.length > 0) {
			if(!soajs.inputmaskData.custom){
				soajs.inputmaskData.custom = {};
			}
			soajs.inputmaskData.custom.secrets = [];
			record.service.secrets.forEach((oneSecret) => {
				let mySecret = {
					"name": oneSecret.SecretName,
					"mountPath": oneSecret.File.Name,
					"id": oneSecret.SecretID
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
				let found = false;
				soajs.inputmaskData.custom.secrets.forEach((customSecret)=>{
					if (customSecret.name === mySecret.name){
						found = true;
						customSecret.mountPath = mountPath.mountPath;
					}
				});
				if (!found){
					soajs.inputmaskData.custom.secrets.push(mySecret);
				}
			});
		}
		
		//case of kubernetes
		if(record.service && record.service.voluming && record.service.voluming.volumes && Array.isArray(record.service.voluming.volumes) && record.service.voluming.volumes.length > 0 && record.service.voluming.volumeMounts){
			for( let i = 0; i < record.service.voluming.volumes.length; i++){
				if(record.service.voluming.volumes[i].secret && Object.keys(record.service.voluming.volumes[i].secret).length > 0){
					if(!soajs.inputmaskData.custom){
						soajs.inputmaskData.custom = {};
					}
					if(!soajs.inputmaskData.custom.secrets){
						soajs.inputmaskData.custom.secrets = [];
					}
					
					let mountPath;
					record.service.voluming.volumeMounts.forEach((oneVolumeMount) => {
						if(oneVolumeMount.name === record.service.voluming.volumes[i].secret.secretName){
							mountPath = oneVolumeMount;
						}
					});
					//if mountpath not found skip
					if (mountPath){
						let mySecret = {
							"name": record.service.voluming.volumes[i].secret.secretName,
							"mountPath": mountPath.mountPath,
							"id": record.service.voluming.volumes[i].secret.secretName
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
						let found = false;
						soajs.inputmaskData.custom.secrets.forEach((oneSecret)=>{
							if (oneSecret.name === mySecret.name){
								found = true;
								oneSecret.mountPath = mountPath.mountPath;
							}
						});
						if (!found){
							soajs.inputmaskData.custom.secrets.push(mySecret);
						}
					}
				}
			}
		}

		//set the memory limit
		if(!Object.hasOwnProperty.call(soajs.inputmaskData.deployConfig, 'memoryLimit') && record.service && record.service.labels && record.service.labels['memoryLimit']){
			soajs.inputmaskData.deployConfig.memoryLimit = record.service.labels['memoryLimit'];
		}

		if (Object.hasOwnProperty.call(soajs.inputmaskData.custom, 'memory')) {
			soajs.inputmaskData.deployConfig.memoryLimit = soajs.inputmaskData.custom.memory;
		}
		else {
			//'replicated', 'global', 'deployment', 'daemonset'
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

			async.each(record.service.env, function (oneEnv, miniCB) {
				if (oneEnv.indexOf('SOAJS_GIT_OWNER') !== -1 && !soajs.inputmaskData.gitSource.owner) soajs.inputmaskData.gitSource.owner = oneEnv.split('=')[1];
				else if (oneEnv.indexOf('SOAJS_GIT_REPO') !== -1 && !soajs.inputmaskData.gitSource.repo) soajs.inputmaskData.gitSource.repo = oneEnv.split('=')[1];
				else if (oneEnv.indexOf('SOAJS_GIT_BRANCH') !== -1 && !soajs.inputmaskData.gitSource.branch) soajs.inputmaskData.gitSource.branch = oneEnv.split('=')[1];
				else if (oneEnv.indexOf('SOAJS_GIT_COMMIT') !== -1 && !soajs.inputmaskData.gitSource.commit) soajs.inputmaskData.gitSource.commit = oneEnv.split('=')[1];

				else if (soajs.inputmaskData.custom.type === 'daemon' && oneEnv.indexOf('SOAJS_DAEMON_GRP_CONF') !== -1) {
					soajs.inputmaskData.custom.daemonGroup = oneEnv.split('=')[1];
				}
				return miniCB();
			}, cb);
		}
		else {
			if (record.service.labels['soajs.resource.id']) {
				soajs.inputmaskData.custom.resourceId = record.service.labels['soajs.resource.id'];
			}
			return cb();
		}
	},

	/**
	 *
	 * @param {Object} soajs
	 * @param {Object} opts
	 * @param {Object} config
	 * @param {Object} BL
	 * @param {Function} cb
	 */
	getInfraRecord: function (soajs, config, BL, cb) {

		//if infra id provided, use it
		//else pull based on env code
		let opts = {
			collection: colls.infra
		};

		if(!soajs.inputmaskData.infraId && soajs.inputmaskData.deployConfig && soajs.inputmaskData.deployConfig.infra) {
			soajs.inputmaskData.infraId = soajs.inputmaskData.deployConfig.infra;
		}
		BL.checkIfError(soajs, cb, {
			config: config,
			error: !soajs.inputmaskData.infraId && (soajs.inputmaskData.deployConfig && soajs.inputmaskData.deployConfig.type === 'vm'),
			code: 496 // infraId and deployment is vm
		}, () => {
			if (soajs.inputmaskData.infraId) {
				BL.model.validateCustomId(soajs, soajs.inputmaskData.infraId, (err, infraIdObj) => {
					BL.checkIfError(soajs, cb, {config: config, error: err, code: 490}, () => {
						opts.conditions = {_id: infraIdObj};
					});
				});
			}
			else {
				opts.conditions = {"deployments.environments": {"$in": [soajs.inputmaskData.env.toUpperCase()]}};
			}
			BL.model.findEntry(soajs, opts, function (err, infraRecord) {
				BL.checkIfError(soajs, cb, {config: config, error: err, code: 600}, () => {
					BL.checkIfError(soajs, cb, {
						config: config,
						error: !infraRecord,
						code: 490 // infra not found / Invalid Infra Provider Id Provided
					}, () => {
						return cb(null, infraRecord);
					});
				});
			});
		});
	},

	/**
	 *
	 * @param {Object} soajs
	 * @param {Object} config
	 * @param {Object} BL
	 * @param {Function} cb
	 */
	getDefaultUIExtKey: function (soajs, config, BL, cb) {
		let packageName = '', tenantCondition = {};
		if (soajs.inputmaskData.env.toLowerCase() === 'portal') {
			tenantCondition = {code: 'PRTL'};
			packageName = 'PORTAL_MAIN';
		}
		else {
			tenantCondition = {locked: true};
			packageName = 'DSBRD_GUEST';
		}
		//if packageName DSBRD_GUEST was not  found
		// ==> take the first package
		BL.model.findEntry(soajs, {
			"collection": "tenants",
			"conditions": tenantCondition
		}, (error, tenantRecord) => {
			BL.checkIfError(soajs, cb, {config: config, error: error, code: 701}, () => {
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
					
					if (!extKey && tenantRecord.applications.length > 0 &&
						tenantRecord.applications[0] && tenantRecord.applications[0].keys &&
						tenantRecord.applications[0].keys.length > 0 ){
						tenantRecord.applications[0].keys.forEach(function (oneKey) {
							oneKey.extKeys.forEach(function (oneExtKey) {
								if (oneExtKey.env === envKeyCheck) {
									extKey = oneExtKey.extKey;
								}
							});
						});
					}
				}
				return cb(null, extKey);
			});
		});
	},

	/**
	 *
	 * @param {Object} soajs
	 * @param {Object} options
	 * @param {Object} config
	 * @param {Object} BL
	 * @param {Function} cb
	 */
	getGitInfo: function (soajs, options, config, BL, cb) {
		if (soajs.inputmaskData && soajs.inputmaskData.gitSource && soajs.inputmaskData.gitSource.owner && soajs.inputmaskData.gitSource.repo) {
			helpers.getGitRecord(soajs, soajs.inputmaskData.gitSource.owner + '/' + soajs.inputmaskData.gitSource.repo, BL, (error, accountRecord) => {
				soajs.log.info('get Git Info of: ', soajs.inputmaskData.gitSource.owner + '/' + soajs.inputmaskData.gitSource.repo);
				BL.checkIfError(soajs, cb, {
					config: config,
					error: error || !accountRecord,
					code: 600
				}, () => {
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
						if (!options.params.catalog.recipe.buildOptions.env['SOAJS_GIT_TOKEN']) {
							options.params.catalog.recipe.buildOptions.env['SOAJS_GIT_TOKEN'] = {
								"type": "computed",
								"value": "$SOAJS_GIT_TOKEN"
							};
						}
					}
					options.params.data.variables['$SOAJS_GIT_PROVIDER'] = accountRecord.providerName;
					if (!options.params.catalog.recipe.buildOptions.env['SOAJS_GIT_PROVIDER']) {
						options.params.catalog.recipe.buildOptions.env['SOAJS_GIT_PROVIDER'] = {
							"type": "computed",
							"value": "$SOAJS_GIT_PROVIDER"
						};
					}
					options.params.data.variables['$SOAJS_GIT_DOMAIN'] = accountRecord.domain;
					if (!options.params.catalog.recipe.buildOptions.env['SOAJS_GIT_DOMAIN']) {
						options.params.catalog.recipe.buildOptions.env['SOAJS_GIT_DOMAIN'] = {
							"type": "computed",
							"value": "$SOAJS_GIT_DOMAIN"
						};
					}

					if (soajs.inputmaskData.gitSource && soajs.inputmaskData.gitSource.repo) {
						if(soajs.inputmaskData.gitSource.repo.indexOf("/") !== -1){
							soajs.inputmaskData.gitSource.owner = soajs.inputmaskData.gitSource.repo.split("/")[0];
						}
						options.params.data.variables['$SOAJS_GIT_REPO'] = soajs.inputmaskData.gitSource.repo;
						if (!options.params.catalog.recipe.buildOptions.env['SOAJS_GIT_REPO']) {
							options.params.catalog.recipe.buildOptions.env['SOAJS_GIT_REPO'] = {
								"type": "computed",
								"value": "$SOAJS_GIT_REPO"
							};
						}
					}

					if (soajs.inputmaskData.gitSource && soajs.inputmaskData.gitSource.owner) {
						options.params.data.variables['$SOAJS_GIT_OWNER'] = soajs.inputmaskData.gitSource.owner;
						if (!options.params.catalog.recipe.buildOptions.env['SOAJS_GIT_OWNER']) {
							options.params.catalog.recipe.buildOptions.env['SOAJS_GIT_OWNER'] = {
								"type": "computed",
								"value": "$SOAJS_GIT_OWNER"
							};
						}
					}

					if (soajs.inputmaskData.gitSource && soajs.inputmaskData.gitSource.branch) {
						options.params.data.variables['$SOAJS_GIT_BRANCH'] = soajs.inputmaskData.gitSource.branch;
						if (!options.params.catalog.recipe.buildOptions.env['SOAJS_GIT_BRANCH']) {
							options.params.catalog.recipe.buildOptions.env['SOAJS_GIT_BRANCH'] = {
								"type": "computed",
								"value": "$SOAJS_GIT_BRANCH"
							};
						}
					}
					if (soajs.inputmaskData.gitSource && soajs.inputmaskData.gitSource.commit) {
						options.params.data.variables['$SOAJS_GIT_COMMIT'] = soajs.inputmaskData.gitSource.commit;
						if (!options.params.catalog.recipe.buildOptions.env['SOAJS_GIT_COMMIT']) {
							options.params.catalog.recipe.buildOptions.env['SOAJS_GIT_COMMIT'] = {
								"type": "computed",
								"value": "$SOAJS_GIT_COMMIT"
							};
						}
					}

					helpers.checkConfigCustom(soajs, options, config, BL, cb);
				});
			});
		}
		else {
			helpers.checkConfigCustom(soajs, options, config, BL, cb);
		}
	},

	/**
	 *
	 * @param {Object} soajs
	 * @param {Object} options
	 * @param {Object} config
	 * @param {Object} BL
	 * @param {Function} cb
	 */
	checkConfigCustom: function (soajs, options, config, BL, cb) {
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
								// owner: 'SOAJS_CONFIG_REPO_OWNER'
							};

							for (let entry in mapping) {
								options.params.data.variables["$" + mapping[entry]] = dbRecord[entry];
								if (!options.params.catalog.recipe.buildOptions.env[mapping[entry]]) {
									options.params.catalog.recipe.buildOptions.env[mapping[entry]] = {
										"type": "computed",
										"value": "$" + mapping[entry]
									};
								}
							}

							if(soajs.inputmaskData.custom.sourceCode[oneSourceCode].repo.indexOf("/") !== -1){
								soajs.inputmaskData.custom.sourceCode[oneSourceCode].owner = soajs.inputmaskData.custom.sourceCode[oneSourceCode].repo.split("/")[0];
								options.params.data.variables['$SOAJS_CONFIG_REPO_OWNER'] = soajs.inputmaskData.custom.sourceCode[oneSourceCode].repo.split("/")[0];
							}
							if (!options.params.catalog.recipe.buildOptions.env['SOAJS_CONFIG_REPO_OWNER']) {
								options.params.catalog.recipe.buildOptions.env['SOAJS_CONFIG_REPO_OWNER'] = {
									"type": "computed",
									"value": "$SOAJS_CONFIG_REPO_OWNER"
								};
							}

							options.params.data.variables['$SOAJS_CONFIG_REPO_NAME'] = soajs.inputmaskData.custom.sourceCode[oneSourceCode].repo.split("/")[1];
							if (!options.params.catalog.recipe.buildOptions.env['SOAJS_CONFIG_REPO_NAME']) {
								options.params.catalog.recipe.buildOptions.env['SOAJS_CONFIG_REPO_NAME'] = {
									"type": "computed",
									"value": "$SOAJS_CONFIG_REPO_NAME"
								};
							}

							options.params.data.variables['$SOAJS_CONFIG_REPO_BRANCH'] = soajs.inputmaskData.custom.sourceCode[oneSourceCode].branch;
							if (!options.params.catalog.recipe.buildOptions.env['SOAJS_CONFIG_REPO_BRANCH']) {
								options.params.catalog.recipe.buildOptions.env['SOAJS_CONFIG_REPO_BRANCH'] = {
									"type": "computed",
									"value": "$SOAJS_CONFIG_REPO_BRANCH"
								};
							}

							if (soajs.inputmaskData.custom.sourceCode[oneSourceCode].commit) {
								options.params.data.variables['$SOAJS_CONFIG_REPO_COMMIT'] = soajs.inputmaskData.custom.sourceCode[oneSourceCode].commit;
								if (!options.params.catalog.recipe.buildOptions.env['SOAJS_CONFIG_REPO_COMMIT']) {
									options.params.catalog.recipe.buildOptions.env['SOAJS_CONFIG_REPO_COMMIT'] = {
										"type": "computed",
										"value": "$SOAJS_CONFIG_REPO_COMMIT"
									};
								}
							}

							if (soajs.inputmaskData.custom.sourceCode[oneSourceCode].path) {
								options.params.data.variables['$SOAJS_CONFIG_REPO_PATH'] = soajs.inputmaskData.custom.sourceCode[oneSourceCode].path;
								if (!options.params.catalog.recipe.buildOptions.env['SOAJS_CONFIG_REPO_PATH']) {
									options.params.catalog.recipe.buildOptions.env['SOAJS_CONFIG_REPO_PATH'] = {
										"type": "computed",
										"value": "$SOAJS_CONFIG_REPO_PATH"
									};
								}
							}
						}
						else if (dbRecord.repos[0].type === 'multi') {
							dbRecord.repos[0].configSHA.forEach((oneSubRepo) => {
								if (['custom', 'static', 'service', 'daemon'].indexOf(oneSubRepo.contentType) !== -1 && oneSubRepo.contentName === soajs.inputmaskData.custom.sourceCode[oneSourceCode].subName) {
									helpers.handleOneRepoLevel(soajs, options, dbRecord, oneSourceCode, oneSubRepo.path);
								}
							});
						}
						else if (['config', 'multi'].indexOf(dbRecord.repos[0].type) === -1 && options.params.catalog.type === 'server') {
							helpers.handleOneRepoLevel(soajs, options, dbRecord, oneSourceCode, null);
						}
						return mCb();
					}
				});
			}, cb);
		}
		else {
			return cb();
		}
	},

	/**
	 *
	 * @param {Object} soajs
	 * @param {Object} options
	 * @param {Object} dbRecord
	 * @param {Object} oneSourceCode
	 * @param {Object} subPath
	 */
	handleOneRepoLevel: function (soajs, options, dbRecord, oneSourceCode, subPath) {
		let mapping = {
			token: 'SOAJS_GIT_TOKEN',
			provider: 'SOAJS_GIT_PROVIDER',
			domain: 'SOAJS_GIT_DOMAIN',
			// owner: 'SOAJS_GIT_OWNER'
		};

		for (let entry in mapping) {
			options.params.data.variables["$" + mapping[entry]] = dbRecord[entry];
			if (!options.params.catalog.recipe.buildOptions.env[mapping[entry]]) {
				options.params.catalog.recipe.buildOptions.env[mapping[entry]] = {
					"type": "computed",
					"value": "$" + mapping[entry]
				};
			}
		}
		if(soajs.inputmaskData.custom.sourceCode[oneSourceCode].repo.indexOf("/") !== -1){
			soajs.inputmaskData.custom.sourceCode[oneSourceCode].owner = soajs.inputmaskData.custom.sourceCode[oneSourceCode].repo.split("/")[0];
			options.params.data.variables['$SOAJS_GIT_OWNER'] = soajs.inputmaskData.custom.sourceCode[oneSourceCode].repo.split("/")[0];
		}

		if (!options.params.catalog.recipe.buildOptions.env['SOAJS_GIT_OWNER']) {
			options.params.catalog.recipe.buildOptions.env['SOAJS_GIT_OWNER'] = {
				"type": "computed",
				"value": "$SOAJS_GIT_OWNER"
			};
		}

		options.params.data.variables['$SOAJS_GIT_REPO'] = soajs.inputmaskData.custom.sourceCode[oneSourceCode].repo.split("/")[1];
		if (!options.params.catalog.recipe.buildOptions.env['SOAJS_GIT_REPO']) {
			options.params.catalog.recipe.buildOptions.env['SOAJS_GIT_REPO'] = {
				"type": "computed",
				"value": "$SOAJS_GIT_REPO"
			};
		}

		options.params.data.variables['$SOAJS_GIT_BRANCH'] = soajs.inputmaskData.custom.sourceCode[oneSourceCode].branch;
		if (!options.params.catalog.recipe.buildOptions.env['SOAJS_GIT_BRANCH']) {
			options.params.catalog.recipe.buildOptions.env['SOAJS_GIT_BRANCH'] = {
				"type": "computed",
				"value": "$SOAJS_GIT_BRANCH"
			};
		}

		if (soajs.inputmaskData.custom.sourceCode[oneSourceCode].commit) {
			options.params.data.variables['$SOAJS_GIT_COMMIT'] = soajs.inputmaskData.custom.sourceCode[oneSourceCode].commit;
			if (!options.params.catalog.recipe.buildOptions.env['SOAJS_GIT_COMMIT']) {
				options.params.catalog.recipe.buildOptions.env['SOAJS_GIT_COMMIT'] = {
					"type": "computed",
					"value": "$SOAJS_GIT_COMMIT"
				};
			}
		}
	},

	/**
	 *
	 * @param {Object} soajs
	 * @param {Object} options
	 * @param {Object} result
	 * @param {Object} config
	 * @param {Object} BL
	 * @param {Function} cb
	 */
	getServiceDaemonInfo: function (soajs, options, result, config, BL, cb) {
		if (['service', 'daemon'].indexOf(options.params.catalog.type) === -1 || (soajs.inputmaskData.custom && ['service', 'daemon'].indexOf(soajs.inputmaskData.custom.type) === -1)) {
			return cb();
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

		if(soajs.inputmaskData.custom && soajs.inputmaskData.custom.type === 'daemon' && soajs.inputmaskData.custom.daemonGroup) {
			opts.conditions.name = opts.conditions.name.replace(`-${soajs.inputmaskData.custom.daemonGroup}`, '');
		}
		
		BL.model.findEntry(soajs, opts, (error, dbRecord) => {
			BL.checkIfError(soajs, cb, {config: config, error: error, code: 600}, function () {
				opts.collection = colls.daemonsGrpconf;
				opts.conditions.type = "cronJob";
				delete opts.conditions.name;
				opts.conditions.daemon = soajs.inputmaskData.custom.name;
				if(soajs.inputmaskData.custom && soajs.inputmaskData.custom.type === 'daemon' && soajs.inputmaskData.custom.daemonGroup) {
					opts.conditions.daemon = opts.conditions.daemon.replace(`-${soajs.inputmaskData.custom.daemonGroup}`, '');
				}
				BL.model.findEntry(soajs, opts, (error, dbGrpconfRecord) => {
					BL.checkIfError(soajs, cb, {config: config, error: error, code: 600}, function () {
						if (!dbRecord && (options.params.catalog.type === 'soajs' || ((options.params.catalog.type === 'service' || options.params.catalog.type === 'daemon') && options.params.catalog.subtype === 'soajs'))) {
							return cb({
								"code": 600,
								"message": "This Repository does not contain a service or a daemon code that can be matched to the API catalog or the Daemon Catalog!"
							});
						}
						
						//misc services might not have db records, return
						if (!dbRecord) {
							return cb(null, null);
						} else {
							
							if (dbRecord.name === 'controller' && !dbRecord.group) {
								dbRecord.group = "SOAJS Core Services";
							}
							
							//Add service ports as computed fields
							options.params.data.variables['$SOAJS_SRV_PORT'] = dbRecord.port;
							options.params.data.serviceName = dbRecord.name;
							options.params.data.serviceGroup = dbRecord.group;
							
							//If the service is a soajs service, add maintenance port
							if (options.params.catalog.type === 'soajs' || (options.params.catalog.type === 'service' || options.params.catalog.type === 'daemon')) {
								if (dbRecord.maintenance && dbRecord.maintenance.port && dbRecord.maintenance.port.type ){
									if (dbRecord.maintenance.port.type === "inherit"){
										dbRecord.maintenancePort = dbRecord.port;
									}
									else if (dbRecord.maintenance.port.type === "maintenance"){
										dbRecord.maintenancePort = dbRecord.port + result.getEnvInfo.services.config.ports.maintenanceInc;
									}
									else {
										dbRecord.maintenancePort = dbRecord.maintenance.port.value;
									}
								}
								else {
									dbRecord.maintenancePort = dbRecord.port + result.getEnvInfo.services.config.ports.maintenanceInc;
								}
								
								if (dbRecord.maintenancePort){
									options.params.data.variables['$SOAJS_SRV_PORT_MAINTENANCE'] = dbRecord.maintenancePort;
								}
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
							
							let serviceName = options.soajs.registry.code.toLowerCase() + "-" + soajs.inputmaskData.custom.name;
							let daemonGroupName;
							if (dbGrpconfRecord) {
								options.params.data.cronConfig = dbGrpconfRecord.cronConfig;
							}
							if (soajs.inputmaskData.custom && soajs.inputmaskData.custom.daemonGroup) {
								//if daemon group is present then the deployment is of sub-type daemon. add group name to deployment name
								daemonGroupName = soajs.inputmaskData.custom.daemonGroup.toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-');
								serviceName += '-' + daemonGroupName;
								options.params.data.serviceName += '-' + daemonGroupName;
								options.params.catalog.recipe.buildOptions.env['$SOAJS_DAEMON_GRP_CONF'] = {
									"type": "static",
									"value": daemonGroupName
								};
							}
							
							var version = 1;
							if (soajs.inputmaskData.custom && soajs.inputmaskData.custom.version) {
								version = soajs.inputmaskData.custom.version;
							}
							soajs.inputmaskData.custom.version = version;
							
							options.params.data.name = serviceName;
							if (daemonGroupName) options.params.data.daemonGroupName = daemonGroupName;
							
							if (dbRecord && dbRecord.prerequisites && dbRecord.prerequisites.memory) {
								BL.checkIfError(soajs, cb, {
									config: config,
									error: (dbRecord.prerequisites.memory > soajs.inputmaskData.deployConfig.memoryLimit),
									code: 910
								}, () => {
									let response = {};
									if (dbRecord.maintenancePort !== dbRecord.port) {
										response.maintenancePort = {
											"name": "maintenance",
											"isPublished": false,
											"target": dbRecord.maintenancePort
										};
									}
									if (dbRecord.port) {
										response.servicePort = {
											"name": "service",
											"isPublished": false,
											"target": dbRecord.port
										};
										if (soajs.inputmaskData.custom && soajs.inputmaskData.custom.exposeServicePort && soajs.inputmaskData.custom.exposeServicePortValue) {
											response.servicePort.isPublished = true;
											response.servicePort.published = soajs.inputmaskData.custom.exposeServicePortValue;
										}
									}
									return cb(null, response);
								});
							} else {
								let response = {};
								if (dbRecord.maintenancePort !== dbRecord.port) {
									response.maintenancePort = {
										"name": "maintenance",
										"isPublished": false,
										"target": dbRecord.maintenancePort
									};
								}
								if (dbRecord.port) {
									response.servicePort = {
										"name": "service",
										"isPublished": false,
										"target": dbRecord.port
									};
									if (soajs.inputmaskData.custom && soajs.inputmaskData.custom.exposeServicePort && soajs.inputmaskData.custom.exposeServicePortValue) {
										response.servicePort.isPublished = true;
										response.servicePort.published = soajs.inputmaskData.custom.exposeServicePortValue;
									}
								}
								return cb(null, response);
							}
						}
					});
				});
			});
		});
	},

	/**
	 *
	 * @param {Object} soajs
	 * @param {Object} options
	 * @param {Object} config
	 * @param {Object} BL
	 * @param {Function} cb
	 */
	registerCiCd: function (soajs, options, config, BL, cb) {
		let cicdType = (options.params.inputmaskData.custom.resourceId) ? 'resource' : 'cd';
		let cond = {
			collection: colls.cicd,
			conditions: {
				type: cicdType
			}
		};
		BL.model.findEntry(soajs, cond, function (error, record) {
			BL.checkIfError(soajs, cb, {config: config, error: error, code: 600}, () => {
				//todo need to update this
				let env = options.env.toUpperCase();
				let name = options.params.inputmaskData.custom.name;
				let version = options.params.inputmaskData.custom.version ? soajsLib.version.sanitize(options.params.inputmaskData.custom.version) : null;
				//sanitize
				if (record && record[env] && record[env][name]) {

					if(cicdType === 'resource'){
						record[env][name].status = 'pending';
					}
					else{
						if(options.params.inputmaskData.custom && options.params.inputmaskData.custom.daemonGroup){
							let daemonGroup = options.params.inputmaskData.custom.daemonGroup;
							record[env][name]["v" + version][daemonGroup].status = 'pending'
						}
						else if(record[env][name]["v" + version]){
							record[env][name]["v" + version].status = 'pending'
						}
						else{
							record[env][name].status = 'pending';
						}
					}

					if (record[env][name]["v" + version]) {
						if (options.params.inputmaskData.gitSource) {
							record[env][name]["v" + version].branch = options.params.inputmaskData.gitSource.branch;
						}

						if (record[env][name]["v" + version].options && options.params.inputmaskData.custom) {
							record[env][name]["v" + version].options.custom = options.params.inputmaskData.custom;
							if (record[env][name]["v" + version].options.custom.secrets){
								record[env][name]["v" + version].options.custom.secrets.forEach((secret) => {
									delete secret.data;
								});
							}
						}

						if (record[env][name]["v" + version].options && options.params.inputmaskData.gitSource) {
							record[env][name]["v" + version].options.gitSource = options.params.inputmaskData.gitSource;
						}

						if (record[env][name]["v" + version].options && options.params.inputmaskData.deployConfig) {
							record[env][name]["v" + version].options.deployConfig = options.params.inputmaskData.deployConfig;
						}
					}
					else {
						if (!record[env][name].options) {
							record[env][name].options = {}
						}

						if (options.params.inputmaskData.custom) {
							record[env][name].options.custom = options.params.inputmaskData.custom;
							if (record[env][name].options.custom.secrets) {
                                record[env][name].options.custom.secrets.forEach((secret) => {
                                    delete secret.data;
                                });
                            }
						}
						if (options.params.inputmaskData.gitSource) {
							record[env][name].options.gitSource = options.params.inputmaskData.gitSource;
						}
						if (options.params.inputmaskData.deployConfig) {
							record[env][name].options.deployConfig = options.params.inputmaskData.deployConfig;
						}
					}

					delete cond.conditions;
					cond.record = record;
					soajs.log.info('cicd record updated!');
					BL.model.saveEntry(soajs, cond, cb);
				}
				else {
					return cb(null, true);
				}
			});
		});
	},

	/**
	 *
	 * @param {Object} soajs
	 * @param {Object} options
	 * @param {Object} result
	 * @param {Function} cb
	 */
	portComputing: function (soajs, options, result, cb) {
		let ports = options.params.catalog.recipe.deployOptions.ports ? JSON.parse(JSON.stringify(options.params.catalog.recipe.deployOptions.ports)) : [];
		if (ports.length === 0 && result.getGitAndServiceDaemonInfo.getServiceDaemonInfo) {
			if (result.getGitAndServiceDaemonInfo.getServiceDaemonInfo.servicePort) {
				ports.push(result.getGitAndServiceDaemonInfo.getServiceDaemonInfo.servicePort);
			}
			if (result.getGitAndServiceDaemonInfo.getServiceDaemonInfo.maintenancePort) {
				ports.push(result.getGitAndServiceDaemonInfo.getServiceDaemonInfo.maintenancePort);
			}
			options.params.inputmaskData.custom.ports = ports;
			helpers.makePortsUnique(options, cb);
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
					if (result.getGitAndServiceDaemonInfo.getServiceDaemonInfo.servicePort) {
						if(result.getGitAndServiceDaemonInfo.getServiceDaemonInfo.servicePort.target === onePort.target) {
							servicePort = true;
						}
					}

					if (result.getGitAndServiceDaemonInfo.getServiceDaemonInfo.maintenancePort) {
						if(result.getGitAndServiceDaemonInfo.getServiceDaemonInfo.maintenancePort.target === onePort.target){
							maintenancePort = true;
						}
					}
				}
				return callback();
			}, () => {
				if (!servicePort && result.getGitAndServiceDaemonInfo.getServiceDaemonInfo && result.getGitAndServiceDaemonInfo.getServiceDaemonInfo.servicePort) {
					ports.push(result.getGitAndServiceDaemonInfo.getServiceDaemonInfo.servicePort);
				}
				if (!maintenancePort && result.getGitAndServiceDaemonInfo.getServiceDaemonInfo && result.getGitAndServiceDaemonInfo.getServiceDaemonInfo.maintenancePort) {
					ports.push(result.getGitAndServiceDaemonInfo.getServiceDaemonInfo.maintenancePort);
				}
				options.params.inputmaskData.custom.ports = ports;
				helpers.makePortsUnique(options, cb);
			});
		}
	},

	/**
	 *
	 * @param {Object} options
	 * @param {Function} cb
	 */
	makePortsUnique: function (options, cb) {
		let portTargets = [];
		if (options.params.inputmaskData.custom && options.params.inputmaskData.custom.ports) {
			for (let i = options.params.inputmaskData.custom.ports.length - 1; i >= 0; i--) {
				if (portTargets.indexOf(options.params.inputmaskData.custom.ports[i].target) === -1) {
					portTargets.push(options.params.inputmaskData.custom.ports[i].target);
				}
				else {
					options.params.inputmaskData.custom.ports.splice(i, 1);
				}
				if (options.params.inputmaskData.custom.loadBalancer){
					delete options.params.inputmaskData.custom.ports[i].published;
				}
			}
		}
		return cb();
	},
	
	/**
	 *
	 * @param {Object} soajs
	 * @param {Object} options
	 * @param {Object} result
	 * @param {Function} cb
	 */
	computeReadinessProbe: function (soajs, options, result, cb) {
		//"maintenance | inherit | 8888"
		if (result.getCatalogAndInfra && result.getCatalogAndInfra.getCatalogRecipe
			&& result.getCatalogAndInfra.getCatalogRecipe.recipe
			&& result.getCatalogAndInfra.getCatalogRecipe.recipe.deployOptions
			&& result.getCatalogAndInfra.getCatalogRecipe.recipe.deployOptions.readinessProbe
			&& result.getCatalogAndInfra.getCatalogRecipe.recipe.deployOptions.readinessProbe.httpGet
			&& result.getCatalogAndInfra.getCatalogRecipe.recipe.deployOptions.readinessProbe.httpGet.port) {
			if (result.getCatalogAndInfra.getCatalogRecipe.recipe.deployOptions.readinessProbe.httpGet.port === "maintenance") {
				result.getCatalogAndInfra.getCatalogRecipe.recipe.deployOptions.readinessProbe.httpGet.port = options.params.data.variables['$SOAJS_SRV_PORT'] + result.getEnvInfo.services.config.ports.maintenanceInc;
			}
			if (result.getCatalogAndInfra.getCatalogRecipe.recipe.deployOptions.readinessProbe.httpGet.port === "inherit") {
				result.getCatalogAndInfra.getCatalogRecipe.recipe.deployOptions.readinessProbe.httpGet.port = options.params.data.variables['$SOAJS_SRV_PORT'];
			}
		}
		return cb();
	},

	/**
	 * Function that maps the computed environment variables
	 * @param options
	 * @returns {{$SOAJS_ENV: (void|string), $SOAJS_DEPLOY_HA: string}}
	 */
	buildAvailableVariables: function (options) {
		let variables = {
			'$SOAJS_ENV': options.env.toLowerCase(),
			'$SOAJS_DEPLOY_HA': '$SOAJS_DEPLOY_HA', // field computed at the driver level
		};

		for (let i in options.params.data.variables) {
			variables[i] = options.params.data.variables[i];
		}

		return variables;
	},

	/**
	 * map computed env variables into catalog recipe env variables
	 * @param {Object} options
	 * @param {Array} serviceVariables
	 * @returns {*}
	 */
	computeCatalogEnvVars : function (config, options, serviceVariables) {
		// options.params.catalog.recipe.buildOptions.env <- read environment variables config
		// options.params.data.variables <- replace computed values from this object
		// options.params.serviceParams.variables <- push final list of values to this array
		if (!options.params.catalog.recipe.buildOptions || !options.params.catalog.recipe.buildOptions.env || Object.keys(options.params.catalog.recipe.buildOptions.env).length === 0) {
			return [];
		}

		//based on the catalog inputs in the recipe
		let result = [];
		let catalogEnvs = Object.keys(options.params.catalog.recipe.buildOptions.env);
		let technology = req.soajs.inputmaskData.technology || options.strategy;
		catalogEnvs.forEach((oneEnvName) => {
			let oneEnv = options.params.catalog.recipe.buildOptions.env[oneEnvName];
			// if env variable is of type static, just set its value and return
			if (oneEnv.type === 'static') {
				result.push(oneEnvName + '=' + oneEnv.value);
			}
			// if env variable is of type userInput, get value from request body, if not found see use default value
			else if (oneEnv.type === 'userInput') {
				let value = null;

				// if user specified value in request body, overwrite default with the new value
				if (options.params.inputmaskData.custom &&
					options.params.inputmaskData.custom.env &&
					options.params.inputmaskData.custom.env[oneEnvName]) {
					value = options.params.inputmaskData.custom.env[oneEnvName];
				}

				if (value) {
					result.push(oneEnvName + '=' + value);
				}
			}
			else if (oneEnv.type === 'secret' && technology === "kubernetes") {
				let value = null;
				if (options.params.inputmaskData.custom &&
					options.params.inputmaskData.custom.env &&
					options.params.inputmaskData.custom.env[oneEnvName]) {
					value = options.params.inputmaskData.custom.env[oneEnvName];
				}
				if (value){
					result.push({
						name: oneEnvName,
						valueFrom: {
							secretKeyRef: {
								name: options.params.inputmaskData.custom.env[oneEnvName].secret,
								key: options.params.inputmaskData.custom.env[oneEnvName].key
							}
						}
					});
				}
			}
			else if (oneEnv.type === 'computed') {

				// if computed value is dynamic, collect all applicable values and set them
				if (config.HA.dynamicCatalogVariables.indexOf(oneEnv.value) !== -1) {
					let nVariableName = oneEnv.value.replace(/_N$/, ''), nCount = 1;
					let regex = new RegExp(nVariableName.replace("$", "\\$") + '_[0-9]+');
					Object.keys(serviceVariables).forEach(function (oneVar) {
						if (oneVar.match(regex)) {
							result.push(oneEnvName + '_' + nCount++ + '=' + serviceVariables[oneVar]);
						}
					});
				}
				else {
					if (oneEnv.value && serviceVariables[oneEnv.value]) {
						result.push(oneEnvName + '=' + serviceVariables[oneEnv.value]);
					}
				}
			}
		});

		return result;
	},

	/**
	 * Compare catalog recipe ports and layer ports, update the security group accordingly and then deploy resource
	 * @param {Object} options
	 * @param {Array} serviceVariables
	 * @returns {*}
	 */
	updateVmPortsAndDeployResource: function(deployer, model, options, soajs, config, cb) {

		//sync catalog recipe ports with security groups ports
		function syncPorts(callback) {
			let syncOptions = Object.assign({}, options);
			syncOptions.params = {
				ports: soajs.inputmaskData.catalog.recipe.deployOptions.ports,
				group: soajs.inputmaskData.group || null,
				region: soajs.inputmaskData.region || null,
				securityGroups: soajs.inputmaskData.securityGroups || [],
				vms: options.vms
			};

			deployer.execute({ type: "infra", name: syncOptions.infra.name, technology: 'vm' }, 'syncPortsFromCatalogRecipe', syncOptions, (error, result) => {
				if(error) return callback(error);
				return callback(null, { result });
			});
		}

		//run commands
		function runCommand(result, callback) {
			if(typeof(result) === 'function') callback = result;

			async.each(options.vms, function (oneVm, eachCallback) {
				soajs.inputmaskData.vmName = oneVm;
				model.runCommand(config, soajs, deployer, eachCallback);
			}, callback);
		}

		let asyncFunctions = {};
		// check if catalog recipe contains ports | if yes, the security group of the layer should be checked and updated before deployment
		if(soajs.inputmaskData.catalog.recipe &&
			soajs.inputmaskData.catalog.recipe.deployOptions &&
			soajs.inputmaskData.catalog.recipe.deployOptions.ports &&
			Array.isArray(soajs.inputmaskData.catalog.recipe.deployOptions.ports) &&
			soajs.inputmaskData.catalog.recipe.deployOptions.ports.length > 0) {
			asyncFunctions = {
				syncPorts,
				runCommand: ['syncPorts', runCommand]
			};
		}
		else {
			asyncFunctions = { runCommand };
		}

		return async.auto(asyncFunctions, cb);
	}
};

module.exports = helpers;
