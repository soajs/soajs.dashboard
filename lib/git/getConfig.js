/*
 *  **********************************************************************************
 *   (C) Copyright Herrontech (www.herrontech.com)
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   Contributors:
 *   - mikehajj
 *  **********************************************************************************
 */

"use strict";
var os = require("os");
var fs = require('fs');
var path = require('path');
var helpers = require('./helper.js');
var configGenerator = require('./configGenerator.js');

function checkIfError(req, error, cb, fCb) {
	if (error) {
		return cb(error);
	}
	return fCb();
}

const configFileModule = {
	"getConfig": (config, req, BL, git, helpers, gitModel, flags, cb) => {
		
		let gitConfigObj = {
			accountId: req.soajs.inputmaskData.id,
			provider: req.soajs.inputmaskData.provider,
			user: req.soajs.inputmaskData.owner,
			repo: req.soajs.inputmaskData.repo,
			project: req.soajs.inputmaskData.project,
			ref: req.soajs.inputmaskData.branch || req.soajs.inputmaskData.configBranch
		};
		
		if (flags && flags.multi) {
			configFileModule.getConfigFile(config, req, {
				gitConfig: gitConfigObj,
				git: git,
				gitModel: gitModel,
				configGenerator: configGenerator,
				model: BL.model,
				path: flags.path,
				token: (flags && flags.token) ? flags.token : null
			}, cb);
		} else {
			configFileModule.getSOAFileJSON(config, req, {
				gitConfig: gitConfigObj,
				git: git,
				gitModel: gitModel,
				configGenerator: configGenerator,
				model: BL.model,
				token: (flags && flags.token) ? flags.token : null
			}, (error, repoInfo) => {
				if (error) {
					if (error.code === 761) {
						configFileModule.getSOAFile(config, req, {
							gitConfig: gitConfigObj,
							git: git,
							gitModel: gitModel,
							configGenerator: configGenerator,
							model: BL.model,
							token: (flags && flags.token) ? flags.token : null
						}, (error, repoInfo) => {
							if (error) {
								if (error.code === 761) {
									configFileModule.getConfigFile(config, req, {
										gitConfig: gitConfigObj,
										git: git,
										gitModel: gitModel,
										configGenerator: configGenerator,
										model: BL.model,
										token: (flags && flags.token) ? flags.token : null
									}, cb);
								} else {
									return cb(error);
								}
							} else {
								return cb(null, repoInfo);
							}
						});
					} else {
						return cb(error);
					}
				} else {
					return cb(null, repoInfo);
				}
			});
		}
	},
	
	"getConfigFile": (config, req, options, cb) => {
		let gitConfig = config.gitAccounts[options.gitConfig.provider];
		let prefix = (options && options.path) ? options.path + "/" : "";
		let configPath = helpers.assurePath('config', prefix + gitConfig.customConfigFilePath, req.soajs.inputmaskData.provider);
		configPath = configPath.replace("/config.js/config.js", "/config.js");
		configPath = path.normalize(configPath);
		
		let gitConfigObj = {
			accountId: req.soajs.inputmaskData.id,
			provider: req.soajs.inputmaskData.provider,
			user: req.soajs.inputmaskData.owner,
			repo: req.soajs.inputmaskData.repo,
			project: req.soajs.inputmaskData.project,
			path: configPath,
			ref: req.soajs.inputmaskData.configBranch,
			token: options.token
		};
		
		req.soajs.log.debug("Getting config file: " + configPath);
		options.git.getJSONContent(req.soajs, options.gitModel, options.model, gitConfigObj, (error, repoConfig, configSHA) => {
			if (error) {
				if (error.code === 404) {
					error.code = 761;
				}
				return cb(error);
			}
			
			
			let configData = {
				path: configPath,
				content: repoConfig,
				configSHA: configSHA
			};
			return cb(null, configData);
		});
	},
	
	"getSOAFile": (config, req, options, cb) => {
		let gitConfig = config.gitAccounts[options.gitConfig.provider];
		
		options.gitConfig.path = helpers.assurePath('config', gitConfig.soajsConfigFilesPath.soajsFile, req.soajs.inputmaskData.provider);
		options.gitConfig.path = path.normalize(options.gitConfig.path);
		
		configFileModule.getFile(config, req, options, gitConfig.soajsConfigFilesPath.soajsFile, cb);
	},
	
	"getSOAFileJSON": (config, req, options, cb) => {
		let gitConfig = config.gitAccounts[options.gitConfig.provider];
		
		options.gitConfig.path = helpers.assurePath('config', gitConfig.soajsConfigFilesPath.soajsJSONFile, req.soajs.inputmaskData.provider);
		options.gitConfig.path = path.normalize(options.gitConfig.path);
		
		configFileModule.getFile(config, req, options, gitConfig.soajsConfigFilesPath.soajsJSONFile, cb);
		
	},
	
	"getFile": (config, req, options, soajsFile, cb) => {
		let gitConfig = config.gitAccounts[options.gitConfig.provider];
		
		let soajsFilePath = path.join(gitConfig.repoConfigsFolder, soajsFile);
		let swaggerFilePath = path.join(gitConfig.repoConfigsFolder, gitConfig.soajsConfigFilesPath.swaggerFile);
		
		req.soajs.log.debug("Getting soajs file: " + options.gitConfig.path);
		options.git.getJSONContent(req.soajs, options.gitModel, options.model, options.gitConfig, (error, repoConfig, configSHA) => {
			if (error) {
				error.reason = soajsFilePath;
				req.soajs.log.error(error);
				return cb(error);
			}
			if (repoConfig.type && ['service', 'daemon'].indexOf(repoConfig.type) !== -1) {
				// fetch swagger.yml swagger file
				
				options.gitConfig.path = gitConfig.soajsConfigFilesPath.swaggerFile;
				if (repoConfig.swaggerFilename) {
					options.gitConfig.path = repoConfig.swaggerFilename;
				}
				
				helpers.validateFillSoa(repoConfig, (err) => {
					if (err) {
						return cb(err);
					}
					options.git.getAnyContent(req.soajs, options.gitModel, options.model, options.gitConfig, (error, fileData, swaggerSHA) => {
						if (error) {
							if (error.code === 761) {
								if (repoConfig.swaggerFilename) {
									error.reason = repoConfig.swaggerFilename;
									req.soajs.log.error(error);
									return createConfigData(repoConfig, configSHA, true, swaggerSHA, cb);
								} else {
									swaggerFilePath = path.join(gitConfig.repoConfigsFolder, gitConfig.soajsConfigFilesPath.swaggerJSONFile);
									options.gitConfig.path = gitConfig.soajsConfigFilesPath.swaggerJSONFile;
									options.git.getAnyContent(req.soajs, options.gitModel, options.model, options.gitConfig, (err, fileData, swaggerSHA) => {
										if (err) {
											err.reason = 'swagger.json';
											req.soajs.log.error(err);
											return createConfigData(repoConfig, configSHA, true, swaggerSHA, cb);
										} else {
											return createConfigData(repoConfig, configSHA, fileData, swaggerSHA, cb);
										}
									});
								}
							} else {
								error.reason = 'swagger.yml';
								req.soajs.log.error(error);
								return cb(error);
							}
						} else {
							//write swagger file
							return createConfigData(repoConfig, configSHA, fileData, swaggerSHA, cb);
						}
					});
				});
				
			} else {
				//write swagger file
				return createConfigData(repoConfig, configSHA, null, null, cb);
			}
		});
		
		function createConfigData(repoConfig, configSHA, fileData, swaggerSHA, cb) {
			let dataNeeded = {
				content: {},
				configSHA: configSHA,
				swaggerSHA: swaggerSHA
			};
			options.configGenerator.generate(req, repoConfig, fileData, (error, config) => {
				dataNeeded.content = config;
				return cb(error, dataNeeded);
			});
		}
	},
	
	
	"analyzeConfigFile": (config, req, BL, repoConfig, path, token, flags, cb) => {
		function checkCanAdd(type, info, cb) {
			helpers.checkCanAdd(BL.model, req.soajs, type, info, cb);
		}
		
		if (repoConfig.type !== 'multi') {
			req.soajs.log.debug("Analyzing file for: " + repoConfig.serviceName ? repoConfig.serviceName : repoConfig.name + " of type: " + repoConfig.type);
		} else {
			req.soajs.log.debug("Analyzing root file for repository of type " + repoConfig.type);
		}
		
		helpers.validateFileContents(req, {}, repoConfig, (error) => {
			checkIfError(req, error, cb, () => {
				let info = {};
				if (repoConfig.type === 'multi') {
					return cb(null, repoConfig);
				} else {
					info = helpers.getServiceInfo(req, repoConfig, path, flags, req.soajs.inputmaskData.provider,
						repoConfig.swaggerFile ? repoConfig.swaggerFile : null,
						repoConfig.soaFile ? repoConfig.soaFile : null);
					if (info.path) {
						delete info.path;
					}
					checkCanAdd(repoConfig.type, info, (error) => {
						checkIfError(req, error, cb, () => {
							let result = {
								type: repoConfig.type,
								info: info
							};
							result.info.path = {//needed for multi repos
								path: path.path,
								sha: path.sha
							};
							return cb(null, result);
						});
					});
				}
			});
		});
	},
	
	"analyzeConfigSyncFile": function (config, req, BL, repoConfig, path, token, configSHA, flags, cb) {
		helpers.analyzeConfigSyncFile(req, repoConfig, path, configSHA, flags, (error, status) => {
			checkIfError(req, error, cb, () => {
				let info = {};
				if (repoConfig.type === 'multi') {
					repoConfig.status = status;
					return cb(null, repoConfig);
				} else {
					if (!status || status === 'outOfSync') {
						return cb('outOfSync');
					}
					
					info = helpers.getServiceInfo(req, repoConfig, path, flags, req.soajs.inputmaskData.provider,
						repoConfig.swaggerFile ? repoConfig.swaggerFile : null,
						repoConfig.soaFile ? repoConfig.soaFile : null);
					helpers.checkCanSync(BL.model, req.soajs, repoConfig.type, info, flags, (error) => {
						checkIfError(req, error, cb, () => {
							if (Array.isArray(configSHA)) {
								configSHA.remote = (configSHA[0] && configSHA[0].sha) ? configSHA[0].sha : null;
							}
							
							let result = {
								status: status,
								type: repoConfig.type,
								info: info,
								sha: configSHA.remote
							};
							return cb(null, result);
						});
					});
				}
			});
		});
	}
};

module.exports = configFileModule;