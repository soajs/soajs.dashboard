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
		}
		else {
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
								}
								else {
									return cb(error);
								}
							}
							else {
								return cb(null, repoInfo);
							}
						});
					}
					else {
						return cb(error);
					}
				}
				else {
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
		let configFilePath = path.join(gitConfig.repoConfigsFolder, gitConfig.customConfigFilePath);
		
		
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
				options.git.getAnyContent(req.soajs, options.gitModel, options.model, options.gitConfig, (error, fileData) => {
					if (error) {
						if (error.code === 761) {
							swaggerFilePath = path.join(gitConfig.repoConfigsFolder, gitConfig.soajsConfigFilesPath.swaggerJSONFile);
							options.gitConfig.path = gitConfig.soajsConfigFilesPath.swaggerJSONFile;
							options.git.getAnyContent(req.soajs, options.gitModel, options.model, options.gitConfig, (err, fileData) => {
								if (err) {
									err.reason = 'swagger.json';
									req.soajs.log.error(err);
									return writeFiles(repoConfig, configSHA, true, cb);
								}
								else {
									return writeFiles(repoConfig, configSHA, fileData, cb);
								}
							});
						}
						else {
							error.reason = 'swagger.yml';
							req.soajs.log.error(error);
							return cb(error);
						}
					}
					else {
						//write swagger file
						return writeFiles(repoConfig, configSHA, fileData, cb);
					}
				});
			}
			else {
				//write swagger file
				return writeFiles(repoConfig, configSHA, null, cb);
			}
		});
		function writeFiles(repoConfig, configSHA, fileData, cb) {
			if (fileData && fileData.content) {
				fs.writeFile(swaggerFilePath, fileData.content, (error) => {
					if (error) {
						if (error.code === 'ENOENT') {
							fs.mkdir(gitConfig.repoConfigsFolder, (error) => {
								if (error) {
									return cb(error);
								}
								else {
									return writeFiles(repoConfig, configSHA, fileData, cb);
								}
							});
						}
						else {
							return cb(error);
						}
					}
					else {
						//call generateConfig function and pass the file paths as params
						options.configGenerator.generate(soajsFilePath, swaggerFilePath, (error, config) => {
							if (error) {
								error.reason = soajsFilePath;
								req.soajs.log.error(error);
								return cb(error);
							}
							
							return writeConfigOrSOAFile(true, config, cb);
						});
					}
				});
			}
			else if (fileData === true){
				//swagger file was not detected
				req.soajs.noApi = true;
				let fileData = "\"use strict\";" + os.EOL + "module.exports = " + JSON.stringify(repoConfig, null, 2) + ";";
				return writeConfigOrSOAFile(true, fileData, cb);
			}
			else {
				let fileData = "\"use strict\";" + os.EOL + "module.exports = " + JSON.stringify(repoConfig, null, 2) + ";";
				return writeConfigOrSOAFile(false, fileData, cb);
			}
			
			function writeConfigOrSOAFile(isConfig, configurationFile, cb) {
				let filePath = (isConfig) ? configFilePath : soajsFilePath;
				// write output config file and require it
				fs.writeFile(filePath, configurationFile, (error) => {
					if (error) {
						if (error.code === 'ENOENT') {
							fs.mkdir(gitConfig.repoConfigsFolder, (error) => {
								if (error) {
									return cb(error);
								}
								else {
									return writeConfigOrSOAFile(isConfig, configurationFile, cb);
								}
							});
						}
						else {
							return cb(error);
						}
					}
					else {
						let configData = {
							path: filePath
						};
						if (!configData.path.includes('soa.json')){
							if (require.resolve(filePath)) {
								delete require.cache[require.resolve(filePath)];
							}
							try {
								configData.content = require(filePath);
								configData.configSHA = configSHA;
								return cb(null, configData);
							}
							catch (e) {
								return cb(e);
							}
						}
						else {
							fs.readFile(configData.path, 'utf8', function (err, data) {
								if (err) {
									return cb(err);
								}
								try {
									configData.content = JSON.parse(data);
									configData.configSHA = configSHA;
									return cb(null, configData);
								}
								catch (l){
									return cb(l);
									
								}
							});
						}
					}
				});
			}
		}
	},
	
	
	"analyzeConfigFile": (config, req, BL, repoConfig, path, token, flags, cb) => {
		function checkCanAdd(type, info, cb) {
			helpers.checkCanAdd(BL.model, req.soajs, type, info, cb);
		}
		
		if (repoConfig.type !== 'multi') {
			req.soajs.log.debug("Analyzing file for: " + repoConfig.serviceName + " of type: " + repoConfig.type);
		}
		else {
			req.soajs.log.debug("Analyzing root file for repository of type " + repoConfig.type);
		}
		
		helpers.validateFileContents(req, {}, repoConfig, (error) => {
			checkIfError(req, error, cb, () => {
				let info = {};
				if (repoConfig.type === 'multi') {
					return cb(null, repoConfig);
				}
				else {
					info = helpers.getServiceInfo(req, repoConfig, path, flags, req.soajs.inputmaskData.provider);
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
				}
				else {
					if (!status || status === 'outOfSync') {
						return cb('outOfSync');
					}
					
					info = helpers.getServiceInfo(req, repoConfig, path, flags, req.soajs.inputmaskData.provider);
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