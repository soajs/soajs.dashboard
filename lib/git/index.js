'use strict';
var utils = require("../../utils/utils.js");

var async = require('async');
var fs = require('fs');

var configGenerator = require('./configGenerator.js');

var servicesColl = 'services';
var daemonsColl = 'daemons';
var hostsColl = 'hosts';
var reposColl = 'repos';


function validateId(soajs, cb) {
	BL.model.validateId(soajs, cb);
}

function checkReturnError(req, mainCb, data, cb) {
	if (data.error) {
		if (typeof (data.error) === 'object' && (data.error.message || data.error.msg)) {
			req.soajs.log.error(data.error);
		}

		if (data.error.message && typeof (data.error.messagedata) === 'string' && error.message.indexOf('getaddrinfo EAI_AGAIN ') != -1) {
			data.code = 763;
			data.config.errors[data.code] = data.config.errors[data.code].replace("%message%", data.config.errors[904]);
		}
		else {
			data.config.errors[data.code] = data.config.errors[data.code].replace("%message%", data.error.message);
		}
		return mainCb({ "code": data.code, "msg": data.config.errors[data.code] });
	} else {
		return cb();
	}
}

function checkMongoError(req, error, cb, fCb) {
	if (error) {
		req.soajs.log.error(error);
		return cb(error);
	}
	return fCb();
}

var BL = {

	model: null,

	'login': function (config, req, git, helpers, gitModel, cbMain) {
		var record = {
			label: req.soajs.inputmaskData.label,
			owner: req.soajs.inputmaskData.username,
			provider: req.soajs.inputmaskData.provider,
			domain: req.soajs.inputmaskData.domain,
			type: req.soajs.inputmaskData.type,
			access: req.soajs.inputmaskData.access,
			repos: []
		};
		if (req.soajs.inputmaskData.password) {
			record.password = req.soajs.inputmaskData.password
		}

		if (req.soajs.inputmaskData.oauthKey && req.soajs.inputmaskData.oauthSecret) {
			record.tokenInfo = {
				oauthKey: req.soajs.inputmaskData.oauthKey,
				oauthSecret: req.soajs.inputmaskData.oauthSecret
			};
		}
		git.login(req.soajs, gitModel, BL.model, record, function (error, reesult) {
			checkReturnError(req, cbMain, {
				config: config,
				error: error,
				code: (error && error.code && config.errors[error.code]) ? error.code : 751
			}, function () {
				return cbMain(null, true);
			});
		});
	},

	'logout': function (config, req, git, helpers, gitModel, cbMain) {
		validateId(req.soajs, function (error) {
			checkReturnError(req, cbMain, { config: config, error: error, code: 701 }, function () {
				var options = {
					accountId: req.soajs.inputmaskData.id,
					provider: req.soajs.inputmaskData.provider
				};
				if (req.soajs.inputmaskData.password) {
					options.password = req.soajs.inputmaskData.password;
				}
				git.logout(req.soajs, gitModel, BL.model, options, function (error, reesult) {
					checkReturnError(req, cbMain, {
						config: config,
						error: error,
						code: (error && error.code && config.errors[error.code]) ? error.code : 753
					}, function () {
						return cbMain(null, true);
					});
				});
			});
		});
	},

	'listAccounts': function (config, req, git, helpers, gitModel, cbMain) {
		gitModel.listGitAccounts(req.soajs, BL.model, function (error, records) {
			checkReturnError(req, cbMain, { config: config, error: error, code: 756 }, function () {
				
				if(req.soajs.inputmaskData.type){
					for(let j = records.length -1; j >=0; j--){
						let oneRecord = records[j];
						for(let i = oneRecord.repos.length -1; i >=0; i--){
							
							if(oneRecord.repos[i].type === 'multi'){
								for(let k = oneRecord.repos[i].configSHA.length -1; k >=0; k--){
									delete oneRecord.repos[i].configSHA[k].sha;
									if(oneRecord.repos[i].configSHA[k].contentType !== req.soajs.inputmaskData.type){
										oneRecord.repos[i].configSHA.splice(k, 1);
									}
								}
								if(oneRecord.repos[i].configSHA.length === 0){
									oneRecord.repos.splice(i , 1);
								}
							}
							else{
								delete oneRecord.repos[i].configSHA;
								if(oneRecord.repos[i].type !== req.soajs.inputmaskData.type){
									oneRecord.repos.splice(i, 1);
								}
							}
						}
						
						if(oneRecord.repos.length === 0){
							records.splice(j, 1);
						}
					}
				}
				
				return cbMain(null, records);
			});
		});
	},

	'getRepos': function (config, req, git, helpers, gitModel, cbMain) {
		validateId(req.soajs, function (error) {
			checkReturnError(req, cbMain, { config: config, error: error, code: 701 }, function () {
				var options = {
					provider: req.soajs.inputmaskData.provider,
					accountId: req.soajs.inputmaskData.id,
					per_page: req.soajs.inputmaskData.per_page,
					page: req.soajs.inputmaskData.page
				};

				git.getRepos(req.soajs, gitModel, BL.model, options, function (error, repos) {
					checkReturnError(req, cbMain, {
						config: config,
						error: error,
						code: (error && error.code && config.errors[error.code]) ? error.code : 757
					}, function () {
						if (req.soajs.inputmaskData.activeOnly) {
							async.filter(repos, function (oneRepo, callback) {
								return callback(null, oneRepo.status === 'active');
							}, cbMain);
						}
						else {
							return cbMain(null, repos);
						}
					});
				});
			});
		});
	},

	'getBranches': function (config, req, git, helpers, gitModel, cbMain) {
		if (req.soajs.inputmaskData.type === 'repo') {
			validateId(req.soajs, function (error) {
				checkReturnError(req, cbMain, { config: config, error: error, code: 701 }, function () {
					//provider is mandatory in this case only
					checkReturnError(req, cbMain, {
						config: config,
						error: !req.soajs.inputmaskData.provider,
						code: 775
					}, function () {
						var options = {
							accountId: req.soajs.inputmaskData.id,
							name: req.soajs.inputmaskData.name,
							type: req.soajs.inputmaskData.type,
							provider: req.soajs.inputmaskData.provider
						};
						git.getBranches(req.soajs, gitModel, BL.model, options, function (error, reesult) {
							checkReturnError(req, cbMain, {
								config: config,
								error: error,
								code: (error && error.code && config.errors[error.code]) ? error.code : 759
							}, function () {
								return cbMain(null, reesult);
							});
						});
					});
				});
			});
		}
		else {
			getContentInfo(function (error, info) {
				if (error) {
					return cbMain({ "code": 759, "msg": config.errors[759] });
				}
				gitModel.getAccount(req.soajs, BL.model, {
					owner: info.src.owner,
					repo: info.src.repo
				}, function (error, accountRecord) {
					checkReturnError(req, cbMain, {
						config: config,
						error: error || !accountRecord,
						code: 759
					}, function () {
						var options = {
							owner: info.src.owner,
							repo: info.src.repo,
							type: req.soajs.inputmaskData.type,
							provider: accountRecord.provider
						};
						if (accountRecord.token) {
							options.token = accountRecord.token;
						}
						git.getBranches(req.soajs, gitModel, BL.model, options, function (error, reesult) {
							checkReturnError(req, cbMain, {
								config: config,
								error: error,
								code: (error && error.code && config.errors[error.code]) ? error.code : 759
							}, function () {
								return cbMain(null, reesult);
							});
						});
					});
				});
			});
		}

		function getContentInfo(cb) {
			var coll;
			var type = req.soajs.inputmaskData.type;
			if (type === 'service') {
				coll = servicesColl;
			}
			else if (type === 'daemon') {
				coll = daemonsColl;
			}

			var opts = {
				collection: coll,
				conditions: { name: req.soajs.inputmaskData.name }
			};
			BL.model.findEntry(req.soajs, opts, function (error, record) {
				checkMongoError(req, error, cb, function () {
					if (!record) {
						req.soajs.log.error('Name [' + req.soajs.inputmaskData.name + '] does not match any ' + type);
						return cb({ 'message': 'Name does not match any ' + type });
					}

					return cb(null, record);
				});
			});
		}
	},

	'activateRepo': function (config, req, git, helpers, gitModel, cbMain) {
		var configSHA = [];
		validateId(req.soajs, function (error) {
			if (error) {
				return cbMain({ "code": 701, "msg": config.errors[701] });
			}
			checkSAASSettings(() => {
				gitModel.getAuthToken(req.soajs, BL.model, { accountId: req.soajs.inputmaskData.id }, function (error, token) {
					checkReturnError(req, cbMain, { config: config, error: error, code: 755 }, function () {
						if (!config.gitAccounts[req.soajs.inputmaskData.provider]) {
							return cbMain({ "code": 778, "msg": config.errors[778] });
						}
						getConfigFile(token, config.gitAccounts[req.soajs.inputmaskData.provider].defaultConfigFilePath, null, function (error, repoInfo) {
							helpers.cleanConfigDir(req, { repoConfigsFolder: config.gitAccounts[req.soajs.inputmaskData.provider].repoConfigsFolder }, function () {
								if (error) {
									if (error === 'alreadyExists') {
										return cbMain({ "code": 762, "msg": config.errors[762] });
									}
									var code = (error.code && config.errors[error.code]) ? error.code : 761;
									return cbMain({ "code": code, "msg": config.errors[code] });
								}
								helpers.cleanConfigDir(req, { repoConfigsFolder: config.gitAccounts[req.soajs.inputmaskData.provider].repoConfigsFolder }, function () {
									//only triggered in case of single repo, in case of multi check addMultiNew()
									addNew(repoInfo.type, repoInfo.info, function (error, reesult) {
										checkReturnError(req, cbMain, {
											config: config,
											error: error,
											code: 761
										}, function () {
											var newRepo = {
												name: req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo,
												type: reesult.type,
												serviceName: repoInfo.info.name,
												configBranch: req.soajs.inputmaskData.configBranch,
												configSHA: configSHA[0].sha
											};
											gitModel.addRepoToAccount(req.soajs, BL.model, {
												accountId: req.soajs.inputmaskData.id,
												repo: newRepo
											}, function (error, response) {
												checkReturnError(req, cbMain, {
													config: config,
													error: error || !response,
													code: 761
												}, function () {
													return cbMain(null, reesult);
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
		
		function checkSAASSettings(cb){
			if (process.env.SOAJS_SAAS && !req.soajs.tenant.locked && req.soajs.servicesConfig) {
				let serviceConfig = req.soajs.servicesConfig.SOAJS_SAAS;
				
				//if soajs_project is found in one of the applications configuration, then use ONLY that ext key
				if(serviceConfig && serviceConfig[req.soajs.inputmaskData.soajs_project]){
					let valid = true;
					let limit = null;
					
					if(serviceConfig[req.soajs.inputmaskData.soajs_project]['SOAJS_SAAS_gitRepos']) {
						limit = serviceConfig[req.soajs.inputmaskData.soajs_project]['SOAJS_SAAS_gitRepos'].limit;
					}
					if(!limit){
						return cb();
					}
					
					//get the limit value
					//count the repos that are not soajs
					//if fail, return res
					//if ok return cb
					req.soajs.log.debug("Detected SAAS Limit of", limit);
					gitModel.listGitAccountsWithRepos(req.soajs, BL.model, (error, gitAccounts) => {
						checkReturnError(req, cbMain, { config: config, error: error, code: 400 }, function () {
							let count = 0;
							
							async.eachSeries(gitAccounts, (oneGitAccount, mCb) => {
								if(oneGitAccount.owner !== 'soajs' && oneGitAccount.repos){
									count += oneGitAccount.repos.length;
								}
								return mCb();
							}, () => {
								req.soajs.log.debug("Git Repos Count is:", count);
								if(count && count >= limit){
									valid = false;
								}
								
								if(!valid){
									return cbMain({"code": 999, "msg": config.errors[999] });
								}
								else return cb();
							});
						});
					});
				}
				else return cb();
			}
			else return cb();
		}

		function getConfigFile(token, path, flags, cb) {
			function analyzeConfigFile(repoConfig, path, token, flags, cb) {
				function checkCanAdd(type, info, cb) {
					helpers.checkCanAdd(BL.model, req.soajs, type, info, function (error, info) {
						checkMongoError(req, error, cb, function () {
							return cb(null, info);
						});
					});
				}

				if (repoConfig.type !== 'multi') {
					req.soajs.log.debug("Analyzing config file for: " + repoConfig.serviceName + " of type: " + repoConfig.type);
				}
				else {
					req.soajs.log.debug("Analyzing root config file for repository of type " + repoConfig.type);
				}
				helpers.validateFileContents(req, {}, repoConfig, function (error) {
					if (error) {
						return cb(error);
					}
					var info = {};
					if (repoConfig.type === 'multi') {
						addMultiNew(repoConfig.folders, token, cb);
					}
					else {
						info = helpers.getServiceInfo(req, repoConfig, path, flags, req.soajs.inputmaskData.provider);
						if (info.path) {
							delete info.path;
						}
						checkCanAdd(repoConfig.type, info, function (error) {
							if (error) {
								return cb(error);
							}
							var reesult = {
								type: repoConfig.type,
								info: info
							};
							reesult.info.path = {//needed for multi repos
								path: path.path,
								sha: path.sha
							};
							return cb(null, reesult);
						});
					}
				});
			}

			var configPath = helpers.assurePath('config', path, req.soajs.inputmaskData.provider);
			var gitConfigObj = {
				accountId: req.soajs.inputmaskData.id,
				provider: req.soajs.inputmaskData.provider,
				user: req.soajs.inputmaskData.owner,
				repo: req.soajs.inputmaskData.repo,
				project: req.soajs.inputmaskData.project,
				path: configPath,
				ref: req.soajs.inputmaskData.configBranch,
				token: token
			};

			req.soajs.log.debug("Getting config file: " + configPath);
			git.getJSONContent(req.soajs, gitModel, BL.model, gitConfigObj, function (error, repoConfig, configSHA1) {
				if (error) {
					if(error.code === 404){
						error.code = 761;
					}
					// error code 761 means the config.js was not found in the repository
					// this means repository might contain custom services, call function that searches for yml and soa.js file
					if (error.code === 761) {
						var options = {
							gitConfig: gitConfigObj,
							git: git,
							gitModel: gitModel,
							configGenerator: configGenerator,
							path: path,
							flags: flags,
							model: BL.model
						};
						if(configSHA1){
							configSHA.push({
								sha: configSHA1
							});
						}
						return helpers.getCustomRepoFiles(options, req, function (error, configData) {
							if (error) {
								if(error.code === 404){
									error.code = 761;
								}
								if (error.code === 761) return activateMiscRepo(options, cb);
								else return cb(error);
							}

							if(configData.configSHA){
								configSHA.push({
									sha: configData.configSHA
								});
							}
							return analyzeConfigFile(configData.content, configData.path, token, flags, cb);
						});
					}
					else {
						return cb(error);
					}
				}
				var path = {
					path: configPath,
					sha: configSHA1
				};
				analyzeConfigFile(repoConfig, path, token, flags, cb);
			});
		}

		function activateMiscRepo(options, cb) {
			var repoRecord = {
				accountId: options.gitConfig.accountId,
				provider: options.gitConfig.provider,
				owner: options.gitConfig.user,
				repo: options.gitConfig.repo,
				branch: options.gitConfig.ref
			};

			if (options.gitConfig.project) {
				repoRecord.project = options.gitConfig.project;
			}

			var opts = {
				collection: reposColl,
				record: repoRecord
			};

			BL.model.insertEntry(req.soajs, opts, function (error) {
				var newRepo = {
					name: options.gitConfig.user + '/' + options.gitConfig.repo,
					type: 'custom',
					configBranch: options.gitConfig.ref
				};

				if(Array.isArray(configSHA)){
					newRepo.configSHA= (configSHA[0] && configSHA[0].sha) ? configSHA[0].sha : null;
				}
				else {
					newRepo.configSHA= configSHA;
				}

				gitModel.addRepoToAccount(req.soajs, BL.model, {
					accountId: req.soajs.inputmaskData.id,
					repo: newRepo
				}, function (error) {
					checkReturnError(req, cbMain, { config: config, error: error, code: 761 }, function () {
						return cbMain(null, newRepo);
					});
				});
			});
		}

		function addNew(type, info, cb) {
			if (type === 'service' || type === 'daemon') {
				addNewServiceOrDaemon(type, info, cb);
			}
			else {
				let defaulType = 'custom';
				if(['component','static','config'].indexOf(type) !== -1){
					defaulType = type;
				}
				var added = {
					type: defaulType,
					name: info.name,
					repo: req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo
				};

				var tempPath = info.path.path;
				var tempSHA = info.path.sha;
				configSHA.push({
					contentType: type,
					contentName: info.name,
					path: tempPath,
					sha: tempSHA
				});

				return cb(null, added);
			}

			function addNewServiceOrDaemon(type, info, cb) {
				helpers.addNewServiceOrDaemon(req.soajs, BL.model, configSHA, type, info, function (error, added) {
					checkMongoError(req, error, cb, function () {
						return cb(null, added);
					});
				});
			}
		}

		function addMultiNew(paths, token, cb) {
			async.mapSeries(paths, function (path, callback) {
				getConfigFile(token, path, { multi: true }, callback);
			}, function (error, reesults) {
				helpers.cleanConfigDir(req, { repoConfigsFolder: config.gitAccounts[req.soajs.inputmaskData.provider].repoConfigsFolder }, function () {
					checkMongoError(req, error, cb, function () {
						async.map(reesults, function (reesult, callback) {
							addNew(reesult.type, reesult.info, callback);
						}, function (error, reesults) {
							checkMongoError(req, error, cb, function () {
								var newRepo = {
									name: req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo,
									type: 'multi',
									configBranch: req.soajs.inputmaskData.configBranch,
									configSHA: configSHA
								};

								gitModel.addRepoToAccount(req.soajs, BL.model, {
									accountId: req.soajs.inputmaskData.id,
									repo: newRepo
								}, function (error, reesult) {
									checkReturnError(req, cbMain, {
										config: config,
										error: error || !reesult,
										code: 761
									}, function () {
										return cbMain(null, reesults);
									});
								});
							});
						});
					});
				});
			});
		}
	},

	'deactivateRepo': function (config, req, git, helpers, gitModel, cloudBL, deployer, cbMain) {
		validateId(req.soajs, function (error) {
			checkReturnError(req, cbMain, { config: config, error: error, code: 701 }, function () {
				var repoLabel = req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo;
				gitModel.getRepo(req.soajs, BL.model, {
					accountId: req.soajs.inputmaskData.id,
					repoLabel: repoLabel
				}, function (error, record) {
					checkReturnError(req, cbMain, { config: config, error: error, code: 765 }, function () {
						var type = '';
						if (!record) type = 'custom';
						else type = record.repos[0].type;
						remove(type, function (error, reesult) {
							checkReturnError(req, cbMain, {
								config: config,
								error: error,
								code: (error && error.code) ? error.code : 795
							}, function () {
								return cbMain(null, true);
							});
						});
					});
				});
			});
		});

		function remove(type, cb) {
			checkCatalogRecipes(() => {
				switch (type) {
					case 'service':
					case 'daemon':
						removeServiceOrDaemon(type, cb);
						break;
					
					case 'multi':
						removeMulti(cb);
						break;
					
					case 'component':
					case 'custom':
					case 'static':
					case 'config':
						removeCustom(cb);
						break;
					
					default:
						req.soajs.log.error("Invalid type detected, must be [service || daemon || multi || custom]");
						return cb("invalidType");
				}
			});
		}
		
		function checkCatalogRecipes(cb){
			let repo = req.soajs.inputmaskData.owner + "/" + req.soajs.inputmaskData.repo;
			let opts = {
				collection: 'catalogs',
				conditions: {
					"$or": [
						{
							"recipe.deployOptions.sourceCode.configuration.repo": repo
						},
						{
							"recipe.deployOptions.sourceCode.custom.repo": repo
						}
					]
				}
			};
			BL.model.countEntries(req.soajs, opts, function(error ,count){
				checkReturnError(req, cbMain, { config: config, error: error, code: 600 }, function () {
					checkReturnError(req, cbMain, { config: config, error: (count && count > 0), code: 765 }, function () {
						return cb();
					});
				});
			});
		}

		function removeServiceOrDaemon(type, cb) {
			var coll = '';
			if (type === 'service') {
				coll = servicesColl
			} else {
				coll = daemonsColl;
			}

			var opts = {
				collection: coll,
				conditions: {
					'src.owner': req.soajs.inputmaskData.owner,
					'src.repo': req.soajs.inputmaskData.repo
				},
				fields: { name: 1, _id: 0 }
			};

			BL.model.findEntry(req.soajs, opts, function (error, record) {
				checkMongoError(req, error || !record, cb, function () {
					if(process.env.SOAJS_DEPLOY_HA){
						helpers.checkifRepoIsDeployed(req, config, BL, cloudBL, deployer, cb, function(){
							//do remove
							doRemove();
						});
					}
					else{
						//check hosts collection first, if no running services exist, allow deactivate
						opts.collection = hostsColl;
						opts.conditions = { name: record.name };
						delete opts.fields;

						BL.model.countEntries(req.soajs, opts, function (error, count) {
							checkMongoError(req, error, cb, function () {
								if (count > 0) {
									return cb({ 'code': 766, 'message': 'Repository has running hosts' });
								}

								//do remove
								doRemove();
							});
						});
					}
				});
			});

			function doRemove(){
				var opts = {
					collection: coll,
					conditions: {
						'src.owner': req.soajs.inputmaskData.owner,
						'src.repo': req.soajs.inputmaskData.repo
					}
				};
				BL.model.removeEntry(req.soajs, opts, function (error) {
					checkMongoError(req, error, cb, function () {
						var repoLabel = req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo;
						gitModel.removeRepoFromAccount(req.soajs, BL.model, {
							accountId: req.soajs.inputmaskData.id,
							repoLabel: repoLabel
						}, function (error, reesult) {
							checkMongoError(req, error || !reesult, cb, function () {
								return cb(null, true);
							});
						});
					});
				});
			}
		}

		function removeMulti(cb) {
			helpers.deleteMulti(req.soajs, BL.model, function (errors, reesults) {
				checkMongoError(req, errors, cb, function () {
					var repoLabel = req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo;
					gitModel.removeRepoFromAccount(req.soajs, BL.model, {
						accountId: req.soajs.inputmaskData.id,
						repoLabel: repoLabel
					}, function (error, reesult) {
						checkMongoError(req, error || !reesult, cb, function () {
							return cb(null, reesults);
						});
					});
				});
			});
		}

		function removeCustom(cb) {
			var opts = {
				collection: reposColl,
				conditions: {
					accountId: req.soajs.inputmaskData.id,
					'owner': req.soajs.inputmaskData.owner,
					'repo': req.soajs.inputmaskData.repo
				}
			};
			BL.model.removeEntry(req.soajs, opts, function (error) {
				checkMongoError(req, error, cb, function () {
					var repoLabel = req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo;
					gitModel.removeRepoFromAccount(req.soajs, BL.model, {
						accountId: req.soajs.inputmaskData.id,
						repoLabel: repoLabel
					}, function (error) {
						checkMongoError(req, error, cb, cb);
					});
				});
			});
		}
	},
	
	'syncRepo': function (config, req, git, helpers, gitModel, cbMain) {
		validateId(req.soajs, function (error) {
			checkReturnError(req, cbMain, { config: config, error: error, code: 701 }, function () {
				gitModel.getAccount(req.soajs, BL.model, { accountId: req.soajs.inputmaskData.id }, function (error, accountRecord) {
					checkReturnError(req, cbMain, {
						config: config,
						error: error || !accountRecord,
						code: 767
					}, function () {
						var repoLabel = req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo;
						var configSHA;
						for (var i = 0; i < accountRecord.repos.length; i++) {
							if (accountRecord.repos[i].name === repoLabel) {
								configSHA = accountRecord.repos[i].configSHA;
								req.soajs.data = {
									configBranch: accountRecord.repos[i].configBranch,
									repoType: accountRecord.repos[i].type
								};

								if (accountRecord.repos[i].type === 'multi') {
									var repo = accountRecord.repos[i];
									req.soajs.data.repoContentTypes = {};
									for (var j = 0; j < accountRecord.repos[i].configSHA.length; j++) {
										req.soajs.data.repoContentTypes[repo.configSHA[j].contentName] = repo.configSHA[j].contentType;
									}
								}

								break;
							}
						}

						if (!req.soajs.data || !req.soajs.data.configBranch) {
							return cbMain({ "code": 767, "msg": config.errors[767] });
						}

						checkReturnError(req, cbMain, {
							config: config,
							error: !config.gitAccounts[req.soajs.inputmaskData.provider],
							code: 778
						}, function () {
							getConfigSyncFile(accountRecord.token, configSHA, config.gitAccounts[req.soajs.inputmaskData.provider].defaultConfigFilePath, null, function (error, reesult) {
								helpers.cleanConfigDir(req, { repoConfigsFolder: config.gitAccounts[req.soajs.inputmaskData.provider].repoConfigsFolder }, function () {
									if (error && error === 'outOfSync') {
										gitModel.updateRepoInfo(req.soajs, BL.model, {
											accountId: req.soajs.inputmaskData.id,
											repoLabel: repoLabel,
											property: 'status',
											value: 'outOfSync'
										}, function (error, reesult) {
											checkReturnError(req, cbMain, {
												config: config,
												error: error || !reesult,
												code: 600
											}, function () {
												return cbMain(null, { status: 'outOfSync' });
											});
										});
									}
									else {
										checkReturnError(req, cbMain, {
											config: config,
											error: error,
											code: (error && error.code && config.errors[error.code]) ? error.code : 768
										}, function () {
											if (reesult && reesult.status === 'multiSyncDone') { //multi repo, syncRepo already done
												return cbMain(null, reesult);
											}

											//repo config is up to date, no need for sync
											if (reesult && reesult === 'upToDate') {
												return cbMain(null, { status: 'upToDate' });
											}

											//not a multi repo and repo config is not up to date
											//todo: you are here ...
											syncMyRepo(BL.model, req.soajs, reesult.type, reesult.info, reesult.sha, function (error, newSHA) {
												checkReturnError(req, cbMain, {
													config: config,
													error: error,
													code: 768
												}, function () {
													var repoLabel = req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo;
													gitModel.updateRepoInfo(req.soajs, BL.model, {
														accountId: req.soajs.inputmaskData.id,
														repoLabel: repoLabel,
														property: 'configSHA',
														value: newSHA.sha
													}, function (error, reesult) {
														checkReturnError(req, cbMain, {
															config: config,
															error: error || !reesult,
															code: 600
														}, function () {
															return cbMain(null, true);
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
		});

		function getConfigSyncFile(token, sha, path, flags, cb) {
			var configPath = helpers.assurePath('config', path, req.soajs.inputmaskData.provider);
			var gitConfigObj = {
				accountId: req.soajs.inputmaskData.id,
				provider: req.soajs.inputmaskData.provider,
				project: req.soajs.inputmaskData.project,
				user: req.soajs.inputmaskData.owner,
				repo: req.soajs.inputmaskData.repo,
				path: configPath,
				ref: req.soajs.data.configBranch,
				token: token
			};

			req.soajs.log.debug("Getting config file: " + configPath);
			git.getJSONContent(req.soajs, gitModel, BL.model, gitConfigObj, function (error, repoConfig, configSHA1) {
				if (error) {
					// error code 761 means the config.js was not found in the repository
					// this means repository might contain custom services, call function that searches for yml and soa.js file
					if (error.code === 761) {
						var options = {
							gitConfig: gitConfigObj,
							git: git,
							gitModel: gitModel,
							configGenerator: configGenerator,
							path: path,
							flags: flags,
							model: BL.model
						};

						if(configSHA1){
							if(!Array.isArray(sha)){
								sha = [];
							}
							sha.push({
								sha: configSHA1
							});
						}

						return helpers.getCustomRepoFiles(options, req, function (error, configData) {
							if(error && error.code){
								error.code = 768;
							}
							if (error) return cb(error);

							if (!options.flags) options.flags = {};
							options.flags.custom = true;

							if(configData.configSHA){
								if(!Array.isArray(sha)) {
									sha = [];
								}
								sha.push({
									sha: configData.configSHA
								});
							}
							return analyzeConfigSyncFile(configData.content, configData.path, token, sha, options.flags, cb);
						});
					}
					else {
						return cb(error);
					}
				}

				var configSHA = {
					local: sha,
					remote: configSHA1
				};

				analyzeConfigSyncFile(repoConfig, path, token, configSHA, flags, cb);
			});

			function analyzeConfigSyncFile(repoConfig, path, token, configSHA, flags, cb) {
				helpers.analyzeConfigSyncFile(req, repoConfig, path, configSHA, flags, function (error, result) {
					checkMongoError(req, error, cb, function () {
						if (result) {
							return cb(null, result);
						}
						var info = {};
						if (repoConfig.type === 'multi') {
							syncMultiRepo(repoConfig.folders, token, cb);
						}
						else {
							info = helpers.getServiceInfo(req, repoConfig, path, flags, req.soajs.inputmaskData.provider);
							helpers.checkCanSync(BL.model, req.soajs, repoConfig.type, info, flags, function (error) {
								if (error) {
									req.soajs.log.error(error);
									return cb(error);
								}

								if(Array.isArray(configSHA)){
									configSHA.remote = (configSHA[0] && configSHA[0].sha) ? configSHA[0].sha : null;
								}
								var reesult = {
									type: repoConfig.type,
									info: info,
									sha: configSHA.remote
								};
								return cb(null, reesult);
							});
						}
					});
				});
			}
		}

		function syncMyRepo(model, soajs, type, info, configSHA, cb) {
			helpers.syncMyRepo(model, soajs, type, info, configSHA, cb);
		}

		function comparePaths(remote, local, callback) {
			helpers.comparePaths(req, config, remote, local, callback);
		}

		function syncMultiRepo(paths, token, cb) {
			var repoLabel = req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo;
			gitModel.getRepo(req.soajs, BL.model, {
				accountId: req.soajs.inputmaskData.id,
				repoLabel: repoLabel
			}, function (error, record) {
				checkMongoError(req, error, cb, function () {
					var configSHA = record.repos[0].configSHA;
					if(!configSHA || configSHA === ''){
						configSHA = [];
					}
					comparePaths(paths, configSHA, function (allPaths) {
						var flags = {
							multi: true
						};
						async.mapSeries(allPaths, function (path, callback) {
							if (path.status === 'available') {
								getConfigSyncFile(token, path.sha, path.path, flags, callback);
							}
							else if (path.status === 'new') {
								flags.new = true;
								getConfigSyncFile(token, path.sha, path.path, flags, callback);
							}
							else if (path.status === 'removed') {
								helpers.removePath(BL.model, req.soajs, path, callback);
							}
						}, function (error, reesults) {
							helpers.cleanConfigDir(req, { repoConfigsFolder: config.gitAccounts[req.soajs.inputmaskData.provider].repoConfigsFolder }, function () {
								if (error) {
									return cb(error);
								}
								async.map(reesults, function (oneResult, callback) {
									if (typeof(oneResult) === 'object' && oneResult.type && oneResult.info && oneResult.sha) {
										syncMyRepo(BL.model, req.soajs, oneResult.type, oneResult.info, oneResult.sha, callback);
									} else {
										return callback(null, oneResult);
									}
								}, function (error, reesults) {

									checkMongoError(req, error, cb, function () {

										var resObj = {
											updated: [],
											removed: [],
											added: []
										};
										var found = false;
										reesults.forEach(function (output) {
											if (output !== 'upToDate') {
												if (output.removed) {//removed
													for (var i = configSHA.length - 1; i >= 0; i--) {
														if (configSHA[i].path === output.path && configSHA[i].sha === output.sha) {
															resObj.removed.push({
																name: output.contentName,
																type: output.contentType
															});
															configSHA.splice(i, 1);
															break;
														}
													}
												} else {//updated
													for (var i = 0; i < configSHA.length; i++) {
														if (configSHA[i].path === output.path) {
															configSHA[i].sha = output.sha;
															resObj.updated.push({
																name: output.contentName,
																type: output.contentType
															});
															found = true;
															break;
														}
													}
													if (!found) { //added
														configSHA.push(output);
														resObj.added.push({
															name: output.contentName,
															type: output.contentType
														});
													}
												}
											}
										});
										gitModel.updateRepoInfo(req.soajs, BL.model, {
											accountId: req.soajs.inputmaskData.id,
											repoLabel: repoLabel,
											property: 'configSHA',
											value: configSHA
										}, function (error, reesult) {
											checkMongoError(req, error || !reesult, cb, function () {
												resObj.status = 'multiSyncDone';
												return cb(null, resObj);
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
	},

	/**
	 * this function will get the content and the url of any file located on a specific
	 * github/bitbucket account for a certain repo.
	 * @param owner, repo, filepath, env, service
	 * @param req
	 * @param cbMain
	 */
	'getFile': function (config, req, git, deployer, helpers, gitModel, cbMain) {
		gitModel.getAccount(req.soajs, BL.model, {
			owner: req.soajs.inputmaskData.owner,
			repo: req.soajs.inputmaskData.repo
		}, function (error, account) {
			checkReturnError(req, cbMain, { config: config, error: error || !account, code: 757 }, function () {
				if (process.env.SOAJS_DEPLOY_HA) {
					BL.getHaFile(account, config, req, git, deployer, helpers, gitModel, cbMain);
				}
				else {
					helpers.doGetFile(req, BL, git, gitModel, account, "master", cbMain);
				}
			});
		});
	},

	'getHaFile': function (account, config, req, git, deployer, helpers, gitModel, cbMain) {
		utils.getEnvironment(req.soajs, BL.model, req.soajs.inputmaskData.env.toUpperCase(), function (error, envRecord) {
			checkReturnError(req, cbMain, {
				config: config,
				error: error || !envRecord,
				code: 600
			}, function () {
				checkReturnError(req, cbMain, {
					config: config,
					error: !envRecord.deployer.type || !envRecord.deployer.selected || envRecord.deployer.type === 'manual',
					code: 743
				}, function () {
					
					var options = helpers.buildDeployerOptions(envRecord, req.soajs, BL.model);
					checkReturnError(req, cbMain, {
						config: config,
						error: !options,
						code: 825
					}, function () {
						
						options.params = {
							env: req.soajs.inputmaskData.env.toLowerCase(),
							serviceName: req.soajs.inputmaskData.serviceName
						};
						
						if (req.soajs.inputmaskData.version) {
							options.params.version = req.soajs.inputmaskData.version;
						}
						deployer.execute({'type': 'container', 'driver': options.strategy}, 'findService', options, (error, oneService) =>{
							checkReturnError(req, cbMain, { config: config, error: error }, function () {
								checkReturnError(req, cbMain, {
									config: config,
									error: !oneService,
									code: 604
								}, function () {
									var branch = "master";
									var envs = oneService.env;
									envs.forEach(function (oneEnv) {
										if (oneEnv.indexOf("SOAJS_GIT_BRANCH") !== -1) {
											branch = oneEnv.split("=")[1];
										}
									});
									helpers.doGetFile(req, BL, git, gitModel, account, branch, cbMain);
								});
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

		modelPath = __dirname + "/../../models/" + modelName + ".js";

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
