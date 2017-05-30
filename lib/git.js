'use strict';
var coreModules = require("soajs");
var core = coreModules.core;
var validator = new core.validator.Validator();
var validatorSchemas = require("../schemas/serviceSchema.js");

var request = require('request');
var async = require('async');
var fs = require('fs');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');
var shortid = require('shortid');

var config = require('../config.js');
var gitModel = require('../models/git.js');

var servicesColl = 'services';
var daemonsColl = 'daemons';
var staticContentColl = 'staticContent';
var hostsColl = 'hosts';

var repoConfigsFolder = __dirname + '/repoConfigs';
shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_');

function validateId (soajs, cb) {
	BL.model.validateId(soajs, cb);
}

function checkReturnError (req, mainCb, data, cb) {
	if (data.error) {
		if (typeof (data.error) === 'object' && (data.error.message || data.error.msg)) {
			req.soajs.log.error(data.error);
		}
		
		if (data.error.message && typeof (data.error.messagedata) === 'string' && error.message.indexOf('getaddrinfo EAI_AGAIN ') != -1) {
			data.code = 763;
			data.config.errors[ data.code ] = data.config.errors[ data.code ].replace("%message%", data.config.errors[ 904 ]);
		}
		else {
			data.config.errors[ data.code ] = data.config.errors[ data.code ].replace("%message%", data.error.message);
		}
		return mainCb({ "code": data.code, "msg": data.config.errors[ data.code ] });
	} else {
		return cb();
	}
}

function checkMongoError (req, error, cb, fCb) {
	if (error) {
		req.soajs.log.error(error);
		return cb(error);
	}
	return fCb();
}

var BL = {
	
	model: null,
	
	'login': function (config, req, git, helpers, cbMain) {
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
				code: (error && error.code && config.errors[ error.code ]) ? error.code : 751
			}, function () {
				return cbMain(null, true);
			});
		});
	},
	
	'logout': function (config, req, git, helpers, cbMain) {
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
						code: (error && error.code && config.errors[ error.code ]) ? error.code : 753
					}, function () {
						return cbMain(null, true);
					});
				});
			});
		});
	},
	
	'listAccounts': function (config, req, git, helpers, cbMain) {
		gitModel.listGitAccounts(req.soajs, BL.model, function (error, records) {
			checkReturnError(req, cbMain, { config: config, error: error, code: 756 }, function () {
				return cbMain(null, records);
			});
		});
	},
	
	'getRepos': function (config, req, git, helpers, cbMain) {
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
						code: (error && error.code && config.errors[ error.code ]) ? error.code : 757
					}, function () {
						return cbMain(null, repos);
					});
				});
			});
		});
	},
	
	'getBranches': function (config, req, git, helpers, cbMain) {
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
								code: (error && error.code && config.errors[ error.code ]) ? error.code : 759
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
					return cbMain({ "code": 759, "msg": config.errors[ 759 ] });
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
								code: (error && error.code && config.errors[ error.code ]) ? error.code : 759
							}, function () {
								return cbMain(null, reesult);
							});
						});
					});
				});
			});
		}
		
		function getContentInfo (cb) {
			var coll;
			var type = req.soajs.inputmaskData.type;
			if (type === 'service') {
				coll = servicesColl;
			}
			else if (type === 'daemon') {
				coll = daemonsColl;
			}
			else if (type === 'static') {
				coll = staticContentColl;
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
	
	'activateRepo': function (config, req, git, helpers, cbMain) {
		var configSHA = [];
		validateId(req.soajs, function (error) {
			checkReturnError(req, cbMain, { config: config, error: error, code: 701 }, function () {
				gitModel.getAuthToken(req.soajs, BL.model, { accountId: req.soajs.inputmaskData.id }, function (error, token) {
					checkReturnError(req, cbMain, { config: config, error: error, code: 755 }, function () {
						checkReturnError(req, cbMain, {
							config: config,
							error: !config.gitAccounts[ req.soajs.inputmaskData.provider ],
							code: 778
						}, function () {
							getConfigFile(token, config.gitAccounts[ req.soajs.inputmaskData.provider ].defaultConfigFilePath, null, function (error, repoInfo) {
								helpers.cleanConfigDir(req, { repoConfigsFolder: config.gitAccounts[ req.soajs.inputmaskData.provider ].repoConfigsFolder }, function () {
									checkReturnError(req, cbMain, {
										config: config,
										error: (error && error === 'alreadyExists'),
										code: 762
									}, function () {
										checkReturnError(req, cbMain, {
											config: config,
											error: error,
											code: (error && error.code && config.errors[ error.code ]) ? error.code : 761
										}, function () {
											helpers.cleanConfigDir(req, { repoConfigsFolder: config.gitAccounts[ req.soajs.inputmaskData.provider ].repoConfigsFolder }, function () {
												//only triggered in case of single repo, in case of multi check addNewMulti()
												addNew(repoInfo.type, repoInfo.info, function (error, reesult) {
													checkReturnError(req, cbMain, {
														config: config,
														error: error,
														code: 761
													}, function () {
														var newRepo = {
															name: req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo,
															type: reesult.type,
															configBranch: req.soajs.inputmaskData.configBranch,
															configSHA: configSHA[ 0 ].sha
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
				});
			});
		});
		
		function getConfigFile (token, path, flags, cb) {
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
			git.getJSONContent(req.soajs, gitModel, BL.model, gitConfigObj, function (error, repoConfig, configSHA) {
				if (error) {
					return cb(error);
				}
				
				var path = {
					path: configPath,
					sha: configSHA
				};
				
				analyzeConfigFile(repoConfig, path, token, flags, cb);
			});
		}
		
		function analyzeConfigFile (repoConfig, path, token, flags, cb) {
			function checkCanAdd (type, info, cb) {
				var opts = {
					collection: '',
					conditions: {}
				};
				
				if (type === 'service') {
					opts.collection = servicesColl;
					opts.conditions[ '$or' ] = [
						{ "name": info.name },
						{ "port": info.port }
					];
				}
				else if (type === 'daemon') {
					opts.collection = daemonsColl;
					opts.conditions[ '$or' ] = [
						{ "name": info.name },
						{ "port": info.port }
					];
				}
				else if (type === 'static') {
					opts.conditions[ 'name' ] = info.name;
					opts.conditions[ 'src.repo' ] = req.soajs.inputmaskData.repo;
					opts.conditions[ 'src.owner' ] = req.soajs.inputmaskData.owner;
					opts.collection = staticContentColl;
				}
				
				BL.model.countEntries(req.soajs, opts, function (error, count) {
					checkMongoError(req, error, cb, function () {
						if (type === 'service' || type === 'daemon') {
							if (count > 0) {
								req.soajs.log.error("A " + type + " with the same name or port exists");
								return cb('alreadyExists');
							}
							return cb(null, info);
						}
						else {
							if (count > 0) {
								req.soajs.log.error("Static content with the same name exists");
								return cb('alreadyExists');
							}
							return cb(null, info);
						}
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
					addNewMulti(repoConfig.folders, token, cb);
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
		
		function addNew (type, info, cb) {
			if (type === 'service' || type === 'daemon') {
				addNewServiceOrDaemon(type, info, cb);
			}
			else if (type === 'static') {
				addNewStaticContent(type, info, cb);
			}
		}
		
		function addNewServiceOrDaemon (type, info, cb) {
			var coll;
			if (type === 'service') {
				coll = servicesColl;
				
				if (!info.swagger) {
					info.swagger = false;
				}
				
			} else if (type === 'daemon') {
				coll = daemonsColl;
			}
			
			var tempPath = info.path.path;
			var tempSHA = info.path.sha;
			
			delete info.path;
			
			var s = {
				'$set': {}
			};
			
			for (var p in info) {
				if (Object.hasOwnProperty.call(info, p)) {
					if (p !== 'versions') {
						s.$set[ p ] = info[ p ];
					}
				}
			}
			
			if (info.versions) {
				for (var vp in info.versions) {
					if (Object.hasOwnProperty.call(info.versions, vp)) {
						s.$set[ 'versions.' + vp ] = info.versions[ vp ];
					}
				}
			}
			
			var opts = {
				collection: coll,
				conditions: { name: info.name },
				fields: s,
				options: { safe: true, multi: false, 'upsert': true }
			};
			BL.model.updateEntry(req.soajs, opts, function (error) {
				checkMongoError(req, error, cb, function () {
					var added = {
						type: type,
						name: info.name,
						repo: req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo
					};
					configSHA.push({
						contentType: type,
						contentName: info.name,
						path: tempPath,
						sha: tempSHA
					});
					return cb(null, added);
				});
			});
		}
		
		function addNewMulti (paths, token, cb) {
			async.mapSeries(paths, function (path, callback) {
				getConfigFile(token, path, { multi: true }, callback);
			}, function (error, reesults) {
				helpers.cleanConfigDir(req, { repoConfigsFolder: config.gitAccounts[ req.soajs.inputmaskData.provider ].repoConfigsFolder }, function () {
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
		
		function addNewStaticContent (type, staticContentInfo, cb) {
			var tempPath = staticContentInfo.path.path;
			var tempSHA = staticContentInfo.path.sha;
			
			delete staticContentInfo.path;
			
			var opts = {
				collection: staticContentColl,
				record: staticContentInfo
			};
			BL.model.insertEntry(req.soajs, opts, function (error) {
				checkMongoError(req, error, cb, function () {
					var added = {
						type: 'static',
						name: staticContentInfo.name,
						repo: req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo
					};
					configSHA.push({
						contentType: type,
						contentName: staticContentInfo.name,
						path: tempPath,
						sha: tempSHA
					});
					return cb(null, added);
				});
			});
		}
	},
	
	'deactivateRepo': function (config, req, git, helpers, cbMain) {
		validateId(req.soajs, function (error) {
			checkReturnError(req, cbMain, { config: config, error: error, code: 701 }, function () {
				var repoLabel = req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo;
				gitModel.getRepo(req.soajs, BL.model, {
					accountId: req.soajs.inputmaskData.id,
					repoLabel: repoLabel
				}, function (error, record) {
					checkReturnError(req, cbMain, {
						config: config,
						error: error || !record,
						code: 765
					}, function () {
						remove(record.repos[ 0 ].type, function (error, reesult) {
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
		
		function remove (type, cb) {
			if (type === 'service' || type === 'daemon') {
				removeServiceOrDaemon(type, cb);
			} else if (type === 'static') {
				removeStaticContent(cb);
			} else if (type === 'multi') {
				removeMulti(cb);
			} else {
				req.soajs.log.error("Invalid type detected, must be [service || daemon || static || multi]");
				return cb("invalidType");
			}
		}
		
		function removeServiceOrDaemon (type, cb) {
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
					//check hosts collection first, if no running services exist, allow deactivate
					opts.collection = hostsColl;
					opts.conditions = { name: record.name };
					delete opts.fields;
					
					BL.model.countEntries(req.soajs, opts, function (error, count) {
						checkMongoError(req, error, cb, function () {
							if (count > 0) {
								return cb({ 'code': 766, 'message': 'Repository has running hosts' });
							}
							
							opts.collection = coll;
							opts.conditions = {
								'src.owner': req.soajs.inputmaskData.owner,
								'src.repo': req.soajs.inputmaskData.repo
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
						});
					});
				});
			});
		}
		
		function removeStaticContent (cb) {
			var opts = {
				collection: staticContentColl,
				conditions: { 'src.owner': req.soajs.inputmaskData.owner, 'src.repo': req.soajs.inputmaskData.repo }
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
		
		function removeMulti (cb) {
			async.parallel([ getRepoServices, getRepoDaemons ], function (error, repoContents) {
				var names = [];
				repoContents.forEach(function (oneRepoArr) {
					names = names.concat(oneRepoArr);
				});
				
				//check if running instances exist before deleting
				var opts = {
					collection: hostsColl,
					conditions: { name: { '$in': names } }
				};
				BL.model.countEntries(req.soajs, opts, function (error, count) {
					checkMongoError(req, error, cb, function () {
						if (count > 0) {
							return cb({ 'code': 766, 'message': 'Repository has running hosts' });
						}
						
						async.parallel([ removeService, removeDaemon, removeStaticContent ], function (error, reesults) {
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
				});
			});
			
			function removeService (callback) {
				var opts = {
					collection: servicesColl,
					conditions: { 'src.owner': req.soajs.inputmaskData.owner, 'src.repo': req.soajs.inputmaskData.repo }
				};
				BL.model.removeEntry(req.soajs, opts, callback);
			}
			
			function removeDaemon (callback) {
				var opts = {
					collection: daemonsColl,
					conditions: { 'src.owner': req.soajs.inputmaskData.owner, 'src.repo': req.soajs.inputmaskData.repo }
				};
				BL.model.removeEntry(req.soajs, opts, callback);
			}
			
			function removeStaticContent (callback) {
				var opts = {
					collection: staticContentColl,
					conditions: { 'src.owner': req.soajs.inputmaskData.owner, 'src.repo': req.soajs.inputmaskData.repo }
				};
				BL.model.removeEntry(req.soajs, opts, callback);
			}
			
			function getRepoServices (callback) {
				var opts = {
					collection: servicesColl,
					conditions: {
						'src.owner': req.soajs.inputmaskData.owner,
						'src.repo': req.soajs.inputmaskData.repo
					},
					fields: { name: 1, _id: 0 }
				};
				BL.model.findEntries(req.soajs, opts, function (error, records) {
					if (error) {
						return callback(error);
					}
					
					for (var i = 0; i < records.length; i++) {
						records[ i ] = records[ i ].name;
					}
					return callback(null, records);
				});
			}
			
			function getRepoDaemons (callback) {
				var opts = {
					collection: daemonsColl,
					conditions: {
						'src.owner': req.soajs.inputmaskData.owner,
						'src.repo': req.soajs.inputmaskData.repo
					},
					fields: { name: 1, _id: 0 }
				};
				BL.model.findEntries(req.soajs, opts, function (error, records) {
					if (error) {
						return callback(error);
					}
					
					for (var i = 0; i < records.length; i++) {
						records[ i ] = records[ i ].name;
					}
					return callback(null, records);
				});
			}
		}
	},
	
	'syncRepo': function (config, req, git, helpers, cbMain) {
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
							if (accountRecord.repos[ i ].name === repoLabel) {
								configSHA = accountRecord.repos[ i ].configSHA;
								req.soajs.data = {
									configBranch: accountRecord.repos[ i ].configBranch,
									repoType: accountRecord.repos[ i ].type
								};
								
								if (accountRecord.repos[ i ].type === 'multi') {
									var repo = accountRecord.repos[ i ];
									req.soajs.data.repoContentTypes = {};
									for (var j = 0; j < accountRecord.repos[ i ].configSHA.length; j++) {
										req.soajs.data.repoContentTypes[ repo.configSHA[ j ].contentName ] = repo.configSHA[ j ].contentType;
									}
								}
								
								break;
							}
						}
						
						checkReturnError(req, cbMain, {
							config: config,
							error: !req.soajs.data || !req.soajs.data.configBranch,
							code: 767
						}, function () {
							checkReturnError(req, cbMain, {
								config: config,
								error: !config.gitAccounts[ req.soajs.inputmaskData.provider ],
								code: 778
							}, function () {
								getConfigSyncFile(accountRecord.token, configSHA, config.gitAccounts[ req.soajs.inputmaskData.provider ].defaultConfigFilePath, null, function (error, reesult) {
									helpers.cleanConfigDir(req, { repoConfigsFolder: config.gitAccounts[ req.soajs.inputmaskData.provider ].repoConfigsFolder }, function () {
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
												code: (error && error.code && config.errors[ error.code ]) ? error.code : 768
											}, function () {
												if (reesult && reesult.status === 'multiSyncDone') { //multi repo, syncRepo already done
													return cbMain(null, reesult);
												}
												
												//repo config is up to date, no need for sync
												if (reesult && reesult === 'upToDate') {
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
		});
		
		function getConfigSyncFile (token, sha, path, flags, cb) {
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
			git.getJSONContent(req.soajs, gitModel, BL.model, gitConfigObj, function (error, repoConfig, configSHA) {
				if (error) {
					return cb(error);
				}
				
				var configSHA = {
					local: sha,
					remote: configSHA
				};
				
				analyzeConfigSyncFile(repoConfig, path, token, configSHA, flags, cb);
			});
			
			function analyzeConfigSyncFile (repoConfig, path, token, configSHA, flags, cb) {
				helpers.analyzeConfigSyncFile(req, repoConfig, path, configSHA, function (error, result) {
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
		
		function syncMyRepo (model, soajs, type, info, configSHA, cb) {
			helpers.syncMyRepo(model, soajs, type, info, configSHA, cb);
		}
		
		function syncMultiRepo (paths, token, cb) {
			var repoLabel = req.soajs.inputmaskData.owner + '/' + req.soajs.inputmaskData.repo;
			gitModel.getRepo(req.soajs, BL.model, {
				accountId: req.soajs.inputmaskData.id,
				repoLabel: repoLabel
			}, function (error, record) {
				checkMongoError(req, error, cb, function () {
					var configSHA = record.repos[ 0 ].configSHA;

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
							helpers.cleanConfigDir(req, { repoConfigsFolder: config.gitAccounts[ req.soajs.inputmaskData.provider ].repoConfigsFolder }, function () {
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
														if (configSHA[ i ].path === output.path && configSHA[ i ].sha === output.sha) {
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
														if (configSHA[ i ].path === output.path) {
															configSHA[ i ].sha = output.sha;
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
		
		function comparePaths (remote, local, callback) {
			helpers.comparePaths(req, config, remote, local, callback);
		}
		
	},
	
	/**
	 * this function will get the content and the url of any file located on a specific
	 * github/bitbucket account for a certain repo.
	 * @param owner, repo, filepath, env, service
	 * @param req
	 * @param cbMain
	 */
	'getFile': function (config, req, git, deployer, helpers, cbMain) {
		gitModel.getAccount(req.soajs, BL.model, {
			owner: req.soajs.inputmaskData.owner,
			repo: req.soajs.inputmaskData.repo
		}, function (error, account) {
			checkReturnError(req, cbMain, { config: config, error: error || !account, code: 757 }, function () {
				if (process.env.SOAJS_DEPLOY_HA) {
					BL.model.findEntry(req.soajs, {
						"collection": "environment",
						"conditions": {
							"code": req.soajs.inputmaskData.env.toUpperCase()
						}
					}, function (error, oneEnvironment) {
						checkReturnError(req, cbMain, {
							config: config,
							error: error || !account,
							code: 600
						}, function () {
							
							var options = helpers.buildDeployerOptions(oneEnvironment, req.soajs, BL.model);
							checkReturnError(req, cbMain, {
								config: config,
								error: !options,
								code: 825
							}, function () {
								
								options.params = {
									env: oneEnvironment.code.toLowerCase(),
									serviceName: req.soajs.inputmaskData.serviceName
								};
								
								if (req.soajs.inputmaskData.version) {
									options.params.version = req.soajs.inputmaskData.version;
								}
								
								deployer.findService(options, function (error, oneService) {
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
													branch = oneEnv.split("=")[ 1 ];
												}
											});
											doGetFile(account, branch);
										});
									});
								});
							});
						});
					});
				}
				else {
					doGetFile(account, "master");
				}
			});
		});
		
		function doGetFile (account, branch) {
			var options = {
				provider: account.provider,
				domain: account.domain,
				user: req.soajs.inputmaskData.owner,
				repo: req.soajs.inputmaskData.repo,
				project: req.soajs.inputmaskData.owner,
				path: req.soajs.inputmaskData.filepath,
				ref: branch,
				token: account.token,
				accountRecord: account
			};
			req.soajs.log.debug("Fetching file from:", options);
			git.getAnyContent(req.soajs, gitModel, BL.model, options, function (error, fileData) {
				checkReturnError(req, cbMain, { config: config, error: error, code: 789 }, function () {
					return cbMain(null, fileData);
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
		function requireModel (filePath, cb) {
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
