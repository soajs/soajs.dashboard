'use strict';
var async = require('async');
var fs = require('fs');
var path = require('path');

var servicesColl = 'services';
var daemonsColl = 'daemons';
var hostsColl = 'hosts';
var reposColl = 'repos';

var utils = require("../../utils/utils.js");


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
			if (data.config.errors[data.code]){
				data.config.errors[data.code] = data.config.errors[data.code].replace("%message%", data.error.message);
			}
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
				
				if(req.soajs.inputmaskData.rms){
					let soajsRMS = ['soajs/soajs.controller', 'soajs/soajs.urac', 'soajs/soajs.oauth'];
					records.forEach((oneGitRecord) => {
						for(let i = oneGitRecord.repos.length -1; i >= 0; i--){
							if(soajsRMS.indexOf(oneGitRecord.repos[i].name) === -1){
								oneGitRecord.repos.splice(i, 1);
							}
						}
					});
				}
				
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
						
						if (req.soajs.inputmaskData.version){
							gitModel.getAccount(req.soajs, BL.model, {
								accountId: req.soajs.inputmaskData.id
							}, function (error, accountRecord) {
								checkReturnError(req, cbMain, {
									config: config,
									error: error || !accountRecord,
									code: 759
								}, function () {
									if(accountRecord.repos && accountRecord.repos.length > 0){
										let repo = accountRecord.repos.find((oneRepo)=>{
											return oneRepo.name === req.soajs.inputmaskData.name
										});
										if (repo){
											if (repo && (repo.type === 'service' || repo.type === 'service')) {
												req.soajs.inputmaskData.type = repo.type;
												req.soajs.inputmaskData.name = repo.serviceName;
												getAllowedBranches(options, cbMain);
											}
											else if (repo.type === 'multi' && req.soajs.inputmaskData.serviceName) {
												let type = repo.configSHA.find((oneType)=>{
													return oneType.contentName === req.soajs.inputmaskData.serviceName
												});
												if (type && (type.contentType === 'service' || type.contentType === 'daemon')){
													req.soajs.inputmaskData.type = type.contentType;
													req.soajs.inputmaskData.name = type.contentName;
													getAllowedBranches(options, cbMain);
												}
												else {
													getBranches(options, cbMain);
												}
											}
											else {
												getBranches(options, cbMain);
											}
										}
										else {
											getBranches(options, cbMain);
										}
									}
									else {
										getBranches(options, cbMain);
									}
								});
							});
						}
						else {
							getBranches(options, cbMain);
						}
					});
				});
			});
		}
		else {
			getContentInfo(function (error, info) {
				if (error) {
					return cbMain({ "code": 759, "msg": config.errors[759] });
				}
				if (req.soajs.inputmaskData.version && info.versions && info.versions[req.soajs.inputmaskData.version]){
					options.allowedBranches = info.versions[req.soajs.inputmaskData.version].branches;
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
						getBranches (options, cbMain);
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
		
		function getAllowedBranches (options, cb) {
			getContentInfo(function (error, info) {
				checkReturnError(req, cb, {
					config: config,
					error: error,
					code: (error && error.code && config.errors[error.code]) ? error.code : 759
				}, function () {
					if (req.soajs.inputmaskData.version && info.versions
						&& info.versions[req.soajs.inputmaskData.version] && info.versions[req.soajs.inputmaskData.version].branches){
						options.allowedBranches = info.versions[req.soajs.inputmaskData.version].branches;
					}
					getBranches(options, cb)
				});
			});
		}
		
		function getBranches(options, cb) {
			git.getBranches(req.soajs, gitModel, BL.model, options, function (error, result) {
				checkReturnError(req, cb, {
					config: config,
					error: error,
					code: (error && error.code && config.errors[error.code]) ? error.code : 759
				}, function () {
					if (options.allowedBranches && result && result.branches && result.branches.length > 0) {
						for (let x = result.branches.length - 1; x >= 0; x--) {
							if (result.branches[x] && result.branches[x].name && options.allowedBranches.indexOf(result.branches[x].name) === -1){
								result.branches.splice(x, 1);
							}
						}
					}
					return cb(null, result);
				});
			});
		}
	},

	'activateRepo': function (config, req, git, helpers, configFile, gitModel, cloudBL, deployer, cbMain) {
		var configSHA = [], accountRecord;
		validateId(req.soajs, function (error) {
			if (error) {
				return cbMain({ "code": 701, "msg": config.errors[701] });
			}
			checkSAASSettings(() => {
				gitModel.getAuthToken(req.soajs, BL.model, { accountId: req.soajs.inputmaskData.id }, function (error, record) {
					accountRecord = record;
					checkReturnError(req, cbMain, { config: config, error: error, code: 755 }, function () {
						let token = accountRecord ? accountRecord.token : null;
						req.soajs.inputmaskData.accountRecord = accountRecord;
						if (!config.gitAccounts[req.soajs.inputmaskData.provider]) {
							return cbMain({ "code": 778, "msg": config.errors[778] });
						}
						getConfigFile(token, config.gitAccounts[req.soajs.inputmaskData.provider].soajsConfigFilesPath.soajsFile, null, function (error, repoInfo) {
							helpers.cleanConfigDir(req, { repoConfigsFolder: config.gitAccounts[req.soajs.inputmaskData.provider].repoConfigsFolder }, function () {
								if (error) {
									if (error === 'alreadyExists') {
										return cbMain({ "code": 762, "msg": config.errors[762] });
									}
									var code = (error.code && config.errors[error.code]) ? error.code : 761;
									return cbMain({ "code": code, "msg": config.errors[code] });
								}
								//only triggered in case of single repo, in case of multi check addMultiNew()
								addNew(repoInfo.type, repoInfo.info, function (error, reesult) {
									checkReturnError(req, cbMain, {
										config: config,
										error: error,
										code: 761
									}, function () {
										let newRepo = {
											name: req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo,
											type: reesult.type,
											serviceName: repoInfo.info.name,
											configBranch: req.soajs.inputmaskData.configBranch,
											configSHA: configSHA[0].sha,
											git: {}
										};
										if (req.soajs.inputmaskData.git && req.soajs.inputmaskData.git.branches && req.soajs.inputmaskData.git.branches.length > 0) {
											let oldGit = [];
											if(accountRecord.repos){
												accountRecord.repos.forEach((oneRepository) => {
													if (oneRepository.name === newRepo.name && oneRepository.git &&  oneRepository.git.branches){
														oldGit = oneRepository.git.branches;
													}
												});
											}
											if (reesult.type === 'service' || reesult.type === 'daemon') {
												req.soajs.inputmaskData.git.branches.forEach((oneBranch) => {
													if (req.soajs.inputmaskData.branch && oneBranch.name === req.soajs.inputmaskData.branch){
														oneBranch.configSHA = newRepo.configSHA;
													}
													else if (oneBranch.name === req.soajs.inputmaskData.configBranch){
														oneBranch.configSHA = newRepo.configSHA;
													}
													else {
														if (oldGit.length > 0){
															let GitBranch = oldGit.find((gitBranch)=>{
																return gitBranch.name === oneBranch.name && gitBranch.configSHA
															});
															if (GitBranch){
																oneBranch.configSHA = GitBranch.configSHA;
															}
														}
														
													}
												});
												newRepo.git.branches = req.soajs.inputmaskData.git.branches;
											}
										}
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
			//check for soa.js if not found check for config.js
			configFile.getConfig(config, req, BL, git, helpers, gitModel, flags, (error, repoConfig) => {
				if(error){
					//if none of the above is found and error code is 761, activate as misc
					if(error.code === 761){
						activateMiscRepo({
							repoConfig: repoConfig,
							gitConfig: {
								accountId: req.soajs.inputmaskData.id,
								provider: req.soajs.inputmaskData.provider,
								user: req.soajs.inputmaskData.owner,
								repo: req.soajs.inputmaskData.repo,
								project: req.soajs.inputmaskData.project,
								ref: req.soajs.inputmaskData.configBranch,
								token: token
							}
						});
					}
					else{
						return cb(error);
					}
				}
				else{
					//analyze what was found
					configFile.analyzeConfigFile(config, req, BL, repoConfig.content, path, token, flags, (error, info) => {
						checkMongoError(req, error, cb, function () {
							//if multi, then trigger multi activate
							if(info && info.type === 'multi'){
								addMultiNew(info, info.folders, token, cb)
							}
							else{
								if(!info.info.path){
									info.info.path = {};
								}
								info.info.path = {
									path: repoConfig.path,
									sha: repoConfig.configSHA
								};
								//return what was found
								return cb(null, info);
							}
						});
					});
				}
			});
		}

		function activateMiscRepo(options) {
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
					configBranch: options.gitConfig.ref,
					git: {}
				};

				if(Array.isArray(configSHA)){
					newRepo.configSHA = null;
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
				helpers.addNewServiceOrDaemon(req, BL, configSHA, type, info, config, cloudBL, deployer, function (error, added) {
					checkMongoError(req, error, cb, function () {
						return cb(null, added);
					});
				});
			}
		}

		function addMultiNew(info, paths, token, cb) {
			async.mapSeries(paths, function (path, callback) {
				getConfigFile(token, path, { multi: true, path: path }, callback);
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
									configSHA: configSHA,
									git: {}
								};
								let oldGit = [];
								if(accountRecord.repos){
									accountRecord.repos.forEach((oneRepository) => {
										if (oneRepository.name === newRepo.name && oneRepository.git &&  oneRepository.git.branches){
											oldGit = oneRepository.git.branches;
										}
									});
								}
								if (req.soajs.inputmaskData.git && req.soajs.inputmaskData.git.branches && req.soajs.inputmaskData.git.branches.length > 0) {
									req.soajs.inputmaskData.git.branches.forEach((oneBranch) => {
										if (req.soajs.inputmaskData.branch && oneBranch.name === req.soajs.inputmaskData.branch){
											oneBranch.configSHA = newRepo.configSHA;
										}
										else if (oneBranch.name === req.soajs.inputmaskData.configBranch){
											oneBranch.configSHA = newRepo.configSHA;
										}
										else {
											if (oldGit.length > 0){
												let GitBranch = oldGit.find((gitBranch)=>{
													return gitBranch.name === oneBranch.name && gitBranch.configSHA
												});
												if (GitBranch){
													oneBranch.configSHA = GitBranch.configSHA;
												}
											}
											
										}
									});
									newRepo.git.branches = req.soajs.inputmaskData.git.branches;
								}

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
						remove(type, function (error) {
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
			if (req.soajs.inputmaskData.branch){
				opts.fields.versions = 1;
			}
			BL.model.findEntry(req.soajs, opts, function (error, record) {
				checkMongoError(req, error || !record, cb, function () {
					if (req.soajs.inputmaskData.branch){
						for (let version in record.versions){
							let found = false;
							if (Object.hasOwnProperty.call(record.versions, version)) {
								if (record.versions[version].branches){
									for (let x= 0; x < record.versions[version].branches.length ; x++){
										if(record.versions[version].branches[x] === req.soajs.inputmaskData.branch){
											record.versions[version].branches.splice(x, 1);
											if (record.versions[version].branches.length === 0){
												delete record.versions[version];
												req.soajs.inputmaskData.oldVersion = version;
												found = true;
												delete req.soajs.inputmaskData.branch;
											}
											else {
												req.soajs.inputmaskData.recordToBeUpdated = {
													["$set"]: {
														["versions." + version.toString() + ".branches"] : record.versions[version].branches
													}
												};
											}
											break;
										}
									}
								}
							}
							if (found){
								break;
							}
						}
					}
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
				let method = "removeEntry";
				
				if (req.soajs.inputmaskData.branch && req.soajs.inputmaskData.recordToBeUpdated){
					method = "updateEntry";
					opts.fields = req.soajs.inputmaskData.recordToBeUpdated;
				}
				BL.model[method](req.soajs, opts, function (error) {
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
	
	'syncRepo': function (config, req, git, helpers, configFile, gitModel, cloudBL, deployer, cbMain) {
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
								if (accountRecord.repos[i].git && accountRecord.repos[i].git.branches && req.soajs.inputmaskData.branch) {
									accountRecord.repos[i].git.branches.forEach((oneBranch) => {
										if (oneBranch.name === req.soajs.inputmaskData.branch && oneBranch.configSHA) {
											configSHA = oneBranch.configSHA;
										}
									});
								}
								req.soajs.inputmaskData.configBranch = accountRecord.repos[i].configBranch;
								req.soajs.inputmaskData.repoType = accountRecord.repos[i].type;
								
								req.soajs.data = {
									configBranch: accountRecord.repos[i].configBranch,
									repoType: accountRecord.repos[i].type
								};
								
								if (accountRecord.repos[i].type === 'multi') {
									var repo = accountRecord.repos[i];
									req.soajs.data.repoContentTypes = {};
									for (var j = 0; j < accountRecord.repos[i].configSHA.length; j++) {
										req.soajs.data.repoContentTypes[repo.configSHA[j].contentName] = repo.configSHA[j].contentType;
										req.soajs.data.repoContentTypes[repo.configSHA[j].contentName + "_sha"] = repo.configSHA[j].sha;
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
							getConfigSyncFile(accountRecord.token, configSHA, config.gitAccounts[req.soajs.inputmaskData.provider].soajsConfigFilesPath.soajsFile, null, function (error, reesult) {
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
											if (reesult && reesult.status === 'upToDate') {
												return cbMain(null, { status: 'upToDate' });
											}
											
											//not a multi repo and repo config is not up to date
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
			if(!flags){
				flags = {};
			}
			flags.token = token;
			configFile.getConfig(config, req, BL, git, helpers, gitModel, flags, (error, repoConfig) => {
				if (error) {
					if(error.code === 761){
						//no soa.js and no config.js --> no repoConfig
						return cb('outOfSync');
					}
					else{
						return cb(error);
					}
				}
				else{
					analyzeConfigSyncFile(repoConfig, path, token, {
						local: sha,
						remote: repoConfig.configSHA
					}, flags, cb);
				}
			});
			
			function analyzeConfigSyncFile(repoConfig, path, token, configSHA, flags, cb) {
				configFile.analyzeConfigSyncFile(config, req, BL, repoConfig.content, path, token, configSHA, flags, (error, info) => {
					checkMongoError(req, error, cb, () => {
						//if multi, then trigger multi activate
						if(info && info.type === 'multi'){
							syncMultiRepo(info.folders, token, configSHA, cb);
						}
						else{
							let result = {
								type: req.soajs.inputmaskData.repoType,
								status: info.status,
								info: info,
								sha: repoConfig.configSHA
							};
							
							return cb(null, result);
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

		function syncMultiRepo(paths, token, localConfigSHA, cb) {
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
							multi: true,
							token: token
						};
						
						async.mapSeries(allPaths, function (subRepoPath, callback) {
							flags.path = subRepoPath.path;
							
							if(!subRepoPath.sha && localConfigSHA && localConfigSHA.local){
								localConfigSHA.local.forEach((oneSubContent) => {
									if(path.normalize(oneSubContent.path) === path.normalize(subRepoPath.path)){
										subRepoPath.sha = oneSubContent.sha;
									}
								});
							}
							
							if (subRepoPath.status === 'available') {
								getConfigSyncFile(token, subRepoPath.sha, subRepoPath.path, flags, callback);
							}
							else if (subRepoPath.status === 'new') {
								flags.new = true;
								getConfigSyncFile(token, subRepoPath.sha, subRepoPath.path, flags, callback);
							}
							else if (subRepoPath.status === 'removed') {
								helpers.removePath(BL.model, req.soajs, subRepoPath, callback);
							}
						}, function (error, reesults) {
							helpers.cleanConfigDir(req, { repoConfigsFolder: config.gitAccounts[req.soajs.inputmaskData.provider].repoConfigsFolder }, function () {
								if (error) {
									return cb(error);
								}
								
								async.map(reesults, function (oneResult, callback) {
									if (typeof(oneResult) === 'object' && oneResult.type && oneResult.info && oneResult.sha) {
										oneResult = oneResult.info;
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
	
	'syncRepoBranch': function (config, req, git, helpers, configFile, gitModel, cloudBL, deployer, cbMain) {
		validateId(req.soajs, function (error) {
			checkReturnError(req, cbMain, {config: config, error: error, code: 701}, function () {
				var options = {
					accountId: req.soajs.inputmaskData.id,
					name: req.soajs.inputmaskData.name,
					type: req.soajs.inputmaskData.type,
					provider: req.soajs.inputmaskData.provider
				};
				async.parallel({
						repo: function (callback) {
							git.getBranches(req.soajs, gitModel, BL.model, options, callback);
						},
						account: function (callback) {
							gitModel.getAccount(req.soajs, BL.model, {accountId: req.soajs.inputmaskData.id}, callback);
						}
					},
					function (err, results) {
						checkReturnError(req, cbMain, {
							config: config,
							error: err,
							code: (err && err.code && config.errors[err.code]) ? err.code : 759
						}, function () {
							checkReturnError(req, cbMain, {
								config: config,
								error: !results.account || !results.repo,
								code: !results.account ? 757 : 759
							}, function () {
								addRemoveBranches(results, (err, repo) => {
									checkReturnError(req, cbMain, {
										config: config,
										error: err,
										code: (err && err.code && config.errors[err.code]) ? err.code : 759
									}, function () {
										var set = {
											'$set': {}
										};
										set['$set']['repos'] = results.account.repos;
										
										var opts = {
											collection: 'git_accounts',
											conditions: {
												_id: req.soajs.inputmaskData.id,
												'repos.name': req.soajs.inputmaskData.name
											},
											fields: set
										};
										BL.model.updateEntry(req.soajs, opts, (err) => {
											checkReturnError(req, cbMain, {
												config: config,
												error: err,
												code: 600
											}, function () {
												return cbMain(null, repo);
											});
										});
									});
								});
							});
						});
					});
			});
		});
		
		function addRemoveBranches(results, cb) {
			let repo;
			async.each(results.account.repos, function (oneRepo, callBack) {
				//find the repo inside the account
				repo = oneRepo;
				if (oneRepo.name === req.soajs.inputmaskData.name) {
					//if no git branches found fill them
					if (!oneRepo.git || !oneRepo.git.branches) {
						repo.git = {
							branches: []
						};
						results.repo.branches.forEach((oneBranch) => {
							oneRepo.git.branches.push({
								name: oneBranch.name,
								active: false
							})
						});
						return callBack();
					}
					else {
						//add the branches if not found
						for (let i = 0; i < results.repo.branches.length; i++) {
							let found = oneRepo.git.branches.find(function (element) {
								return element.name === results.repo.branches[i].name;
							});
							if (!found) {
								oneRepo.git.branches.push({
									name: results.repo.branches[i].name,
									active: false
								})
							}
						}
						//find branches that will be deleted
						for (let j = oneRepo.git.branches.length -1; j >= 0; j--) {
							let found = results.repo.branches.find(function (element) {
								return element.name === oneRepo.git.branches[j].name;
							});
							if (!found) {
								if (!oneRepo.git.branches[j].active){
									oneRepo.git.branches.splice(j, 1);
								}
								else {
									return callBack({ 'code': 766, 'message': 'Cannot delete an active Branch' });
									break;
								}
								
							}
						}
						return callBack();
					}
				}
				else {
					return callBack({ 'code': 758, 'message': 'Unable to find repo' });
				}
				
			}, (err) => {
				return cb(err, repo)
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
