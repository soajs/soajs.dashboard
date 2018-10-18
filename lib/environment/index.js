'use strict';
var colName = "environment";
var templatesColName = "templates";
var hostsColName = "hosts";
var controllesColl = "controllers";
var tenantColName = "tenants";
var cdColName = 'cicd';

const fs = require('fs');
const async = require('async');

const config = require("../../config.js");
const utils = require("../../utils/utils.js");
const soajsUtils = require("soajs").utils;
const envHelper = require("./helper.js");
const envDeployStatus = require("./status.js");
const platformsHelper = require("./platform.js");
const restrictions = require("./drivers/restrictions.js");
const cloudProviderHelper = require("./cloudProvider.js");

function validateId(soajs, cb) {
	BL.model.validateId(soajs, cb);
}

function checkReturnError(req, mainCb, data, cb) {
	if (data.error) {
		if (typeof (data.error) === 'object') {
			req.soajs.log.error(data.error);
		}
		if (!data.config) {
			data.config = config;
		}
		let message = data.config.errors[data.code];
		if (!message && data.error.message) {
			message = data.error.message;
		}
		
		return mainCb({ "code": data.code, "msg": message });
	} else {
		if (cb) {
			return cb();
		}
	}
}

function checkCanEdit(soajs, cb) {
	
	let locked = soajs.tenant.locked;
	
	let opts = {};
	opts.collection = colName;
	opts.conditions = { '_id': soajs.inputmaskData.id };
	BL.model.findEntry(soajs, opts, function (error, envRecord) {
		if (error) {
			return cb(600);
		}
		
		//i am root
		if (locked) {
			return cb(null, {});
		}
		else {
			//i am not root but this is a locked environment
			if (envRecord && envRecord.locked) {
				return cb(501);
			}
			//i am not root and this is not a locked environment
			else {
				return cb(null, {});
			}
		}
	});
}

function initBLModel(BLModule, modelName, cb) {
	BLModule.init(modelName, cb);
}

const databaseModules = require("./dbs");
const keyModules = require("./key");

var BL = {
	model: null,
	
	/**
	 * Function that adds an environment record in the database, creates a deployment template for it and triggers deploy environment from that template
	 * @param config
	 * @param req
	 * @param res
	 * @param cbMain
	 * @returns {*}
	 */
	"add": function (config, req, res, cbMain) {
		let pendingEnvironment = true;
		if (req.soajs.inputmaskData.data.soajsFrmwrk) {
			if (!req.soajs.inputmaskData.data.cookiesecret || !req.soajs.inputmaskData.data.sessionName || !req.soajs.inputmaskData.data.sessionSecret) {
				return cbMain({ code: 408, msg: config.errors[408] });
			}
		}
		
		if (!req.soajs.inputmaskData.data.deployPortal) {
			if (['DASHBOARD', 'PORTAL'].indexOf(req.soajs.inputmaskData.data.code.toUpperCase()) !== -1) {
				return cbMain({ code: 457, msg: config.errors[457] });
			}
		}
		req.soajs.inputmaskData.data.code = req.soajs.inputmaskData.data.code.toUpperCase();
		checkSAASSettings(() => {
			let opts = {
				collection: colName,
				conditions: { 'code': req.soajs.inputmaskData.data.code }
			};
			BL.model.countEntries(req.soajs, opts, function (error, count) {
				checkReturnError(req, cbMain, { config: config, error: error, code: 400 }, () => {
					checkReturnError(req, cbMain, { config: config, error: count > 0, code: 403 }, () => {
						let envRecord;
						let envTemplate;
						let selectedProvider;
						async.auto({
							"getRequestedTemplate": (mCb) => {
								let opts = {
									collection: templatesColName,
									conditions: {
										"type": "_template",
										"_id": new BL.model.getDb(req.soajs).ObjectId(req.soajs.inputmaskData.data.templateId)
									}
								};
								BL.model.findEntry(req.soajs, opts, (error, template) => {
									checkReturnError(req, mCb, { config: config, error: error, code: 400 }, () => {
										checkReturnError(req, mCb, {
											config: config,
											error: !template,
											code: 400
										}, () => {
											if (template.reusable === false) {
												let envOpts = {
													collection: "templates",
													conditions: {
														"name": template.name,
														"envCode": {
															"$exists": true
														}
													}
												};
												BL.model.countEntries(req.soajs, envOpts, (error, envCount) => {
													checkReturnError(req, mCb, {
														config: config,
														error: error,
														code: 400
													}, () => {
														if (envCount > 0) {
															let error = [];
															error.push({
																code: 173,
																msg: `Template ${template.name}: Already used to deploy another environment`
															});
															return mCb(error);
														} else {
															return mCb(null, template);
														}
													});
												});
											} else {
												return mCb(null, template);
											}
										});
									});
								});
							},
							"validateEnvironmentRestrictions": ["getRequestedTemplate", (info, mCb) => {
								restrictions.validateEnvironmentRestrictions(req, info.getRequestedTemplate, mCb);
							}],
							"checkPreviousEnvironment": ['validateEnvironmentRestrictions', (info, mCb) => {
								if (req.soajs.inputmaskData.data.deploy && req.soajs.inputmaskData.data.deploy.previousEnvironment) {
									let condition = {
										'code': req.soajs.inputmaskData.data.deploy.previousEnvironment.toUpperCase()
									};
									
									BL.model.findEntry(req.soajs, {
										collection: colName,
										conditions: condition
									}, (error, envDBRecord) => {
										checkReturnError(req, mCb, { config: config, error: error, code: 400 }, () => {
											return mCb(null, envHelper.getDefaultRegistryServicesConfig(envDBRecord));
										});
									});
								}
								else {
									return mCb(null, envHelper.getDefaultRegistryServicesConfig());
								}
							}],
							"removePreviousTemplateifAny": ['validateEnvironmentRestrictions', (info, mCb) => {
								BL.model.removeEntry(req.soajs, {
									collection: templatesColName,
									conditions: {
										envCode: req.soajs.inputmaskData.data.code
									}
								}, (error) => {
									checkReturnError(req, mCb, { config: config, error: error, code: 400 }, () => {
										return mCb();
									});
								});
							}],
							"getInfraProvider": ['validateEnvironmentRestrictions', (info, mCb) => {
								if (!req.soajs.inputmaskData.data.deploy || !req.soajs.inputmaskData.data.deploy.selectedInfraProvider) {
									return mCb();
								}
								req.soajs.inputmaskData.data.infraId = req.soajs.inputmaskData.data.deploy.selectedInfraProvider._id;
								let opts = {
									collection: "infra",
									conditions: {
										"_id": new BL.model.getDb(req.soajs).ObjectId(req.soajs.inputmaskData.data.infraId)
									}
								};
								BL.model.findEntry(req.soajs, opts, (error, infraRecord) => {
									checkReturnError(req, mCb, { config: config, error: error, code: 400 }, () => {
										checkReturnError(req, mCb, {
											config: config,
											error: !infraRecord,
											code: 400
										}, () => {
											selectedProvider = infraRecord;
											return mCb(null, infraRecord);
										});
									});
								});
							}],
							"prepareEnvRecord": ["checkPreviousEnvironment", "getInfraProvider", (info, mCb) => {
								let envRecord = info.checkPreviousEnvironment;
								let prefix = null;
								if (req.soajs.registry && req.soajs.registry.coreDB && req.soajs.registry.coreDB && req.soajs.registry.coreDB.provision && req.soajs.registry.coreDB.provision.prefix){
									prefix = req.soajs.registry.coreDB.provision.prefix;
								}
								let record = envHelper.prepareEnvRecord(config, req.soajs.inputmaskData.data, envRecord, prefix, info.getInfraProvider);
								if(!record){
									return mCb(new Error("Invalid Environment Deployment Configuration!"));
								}
								record.services = envRecord.services;
								record.services.config.key.password = req.soajs.inputmaskData.data.tKeyPass;
								if (req.soajs.inputmaskData.data.soajsFrmwrk) {
									record.services.config.cookie.secret = req.soajs.inputmaskData.data.cookiesecret;
									record.services.config.session.name = req.soajs.inputmaskData.data.sessionName;
									record.services.config.session.secret = req.soajs.inputmaskData.data.sessionSecret;
								}
								else {
									//auto generate values and fill the db
									record.services.config.cookie.secret = envHelper.generateRandomString();
									record.services.config.session.name = envHelper.generateRandomString();
									record.services.config.session.secret = envHelper.generateRandomString();
								}
								if (!record.services.config.key.password) {
									record.services.config.key.password = envHelper.generateRandomString();
								}
								if (record.deployer.type === 'manual') {
									pendingEnvironment = false;
								}
								record.pending = pendingEnvironment;
								return mCb(null, record);
							}],
							"insertEnvironment": ["prepareEnvRecord", (info, mCb) => {
								req.soajs.log.debug('Step: insert Environment');
								let opts = {
									collection: colName,
									record: info.prepareEnvRecord
								};
								// req.soajs.log.debug(opts);
								BL.model.insertEntry(req.soajs, opts, mCb);
							}],
							"checkTemplate": ["insertEnvironment", "getRequestedTemplate", "getInfraProvider", function (info, mCb) {
								envRecord = info.insertEnvironment[0];
								//req.soajs.log.debug('Step: check Template');
								let template = info.getRequestedTemplate;
								delete template.type;
								delete template._id;
								delete template.deletable;
								
								//append the user inputs to the template and insert a new record to deploy the environment from
								template.deploy = req.soajs.inputmaskData.template.deploy;
								
								//validate template schema before resuming
								let schema = require("../../schemas/template");
								let myValidator = new req.soajs.validator.Validator();
								let status = myValidator.validate(template, schema);
								if (!status.valid) {
									let errors = [];
									status.errors.forEach(function (err) {
										errors.push({
											code: 173,
											msg: `Template ${req.soajs.inputmaskData.template.name}: ` + err.stack
										});
									});
									return mCb(errors);
								}
								
								if (process.env.SOAJS_SAAS && req.soajs.servicesConfig && req.soajs.inputmaskData.soajs_project) {
									template.soajs_project = req.soajs.inputmaskData.soajs_project;
								}
								
								template.envCode = req.soajs.inputmaskData.data.code;
								template.type = "_environment_" + template.envCode;
								if (info.getInfraProvider) {
									template.infra = info.getInfraProvider._id.toString();
								}
								
								//transform the . -> __dot__
								utils.accommodateDeployTemplateForMongo(template.deploy, true, () => {
									//save template and resume deployment
									envTemplate = template;
									BL.model.insertEntry(req.soajs, {
										collection: templatesColName,
										record: template
									}, mCb);
								});
								
							}]
						}, (error) => {
							checkReturnError(req, cbMain, {
								config: config,
								error: error,
								code: (error && error.code) ? error.code : 400
							}, function () {
								//check template inputs
								//req.soajs.log.debug('Step: validate Deployment Inputs');
								envDeployStatus.validateDeploymentInputs(req, BL, config, envRecord, envTemplate, selectedProvider, (error) => {
									if (error) {
										//array of errors detected, soajs response mw will parse it
										//remove the environment
										opts = {
											collection: colName,
											conditions: { code: envRecord.code.toUpperCase() }
										};
										BL.model.removeEntry(req.soajs, opts, (err) => {
											if (err) {
												req.soajs.log.error(err);
											}
										});
										return cbMain(error);
									}
									
									//resume deployment of environment from template
									envDeployStatus.resumeDeployment(req, BL, config, envRecord, envTemplate, selectedProvider, (error) => {
										checkReturnError(req, cbMain, {
											config: config,
											error: error,
											code: 400
										}, function () {
											return cbMain(null, envRecord._id);
										});
									});
								});
							});
						});
					});
				});
			});
		});
		
		function checkSAASSettings(cb) {
			if (process.env.SOAJS_SAAS && !req.soajs.tenant.locked && req.soajs.servicesConfig) {
				let serviceConfig = req.soajs.servicesConfig.SOAJS_SAAS;
				
				//if soajs_project is found in one of the applications configuration, then use ONLY that ext key
				if (serviceConfig && serviceConfig[req.soajs.inputmaskData.soajs_project]) {
					let valid = true;
					let limit = null;
					if (serviceConfig[req.soajs.inputmaskData.soajs_project]['SOAJS_SAAS_environments']) {
						limit = serviceConfig[req.soajs.inputmaskData.soajs_project]['SOAJS_SAAS_environments'].limit;
					}
					if (!limit) {
						return cb();
					}
					
					//get the limit value
					//count the environment
					//if fail, return res
					//if ok return cb
					let opts = { collection: colName, conditions: {} };
					BL.model.countEntries(req.soajs, opts, (error, count) => {
						checkReturnError(req, cbMain, { config: config, error: error, code: 400 }, () => {
							if (count && count >= limit) {
								valid = false;
							}
							
							if (!valid) {
								return cbMain({ "code": 999, "msg": config.errors[999] });
							}
							else return cb();
						});
					});
				}
				else return cb();
			}
			else return cb();
		}
	},
	
	/**
	 * Function that returns the environment deployment status
	 * @param config
	 * @param req
	 * @param res
	 * @param cbMain
	 */
	"getDeploymentStatus": function (config, req, res, cbMain) {
		let opts = {
			collection: colName,
			conditions: {}
		};
		
		if (req.soajs.inputmaskData.code) {
			req.soajs.inputmaskData.code = req.soajs.inputmaskData.code.toUpperCase();
			opts.conditions.code = req.soajs.inputmaskData.code;
			getEnv();
		}
		else {
			validateId(req.soajs, function (err) {
				checkReturnError(req, cbMain, { config: config, error: err, code: 405 }, function () {
					opts.conditions['_id'] = req.soajs.inputmaskData.id;
					getEnv();
				});
			});
		}
		
		function getEnv() {
			BL.model.findEntry(req.soajs, opts, function (error, record) {
				checkReturnError(req, cbMain, { config: config, error: error, code: 600 }, function () {
					checkReturnError(req, cbMain, { config: config, error: !record, code: 405 }, function () {
						
						//environment has been deployment
						if (record.error && !req.soajs.inputmaskData.rollback && !req.soajs.inputmaskData.activate) {
							return cbMain({ code: 400, msg: record.error });
						}
						
						//activate the environment
						if (req.soajs.inputmaskData.activate) {
							delete record.error;
							delete record.pending;
							BL.model.saveEntry(req.soajs, { collection: colName, record: record }, function (error) {
								checkReturnError(req, cbMain, { config: config, error: error, code: 600 }, function () {
									return cbMain(null, { "completed": true });
								});
							});
						}
						//return environment deployment progress
						else {
							loadAndProcessTemplate(record);
						}
					});
				});
			});
		}
		
		function loadAndProcessTemplate(environmentRecord) {
			BL.model.findEntry(req.soajs, {
				collection: templatesColName,
				conditions: { envCode: req.soajs.inputmaskData.code }
			}, function (error, template) {
				checkReturnError(req, cbMain, { config: config, error: error, code: 600 }, function () {
					checkReturnError(req, cbMain, { config: config, error: !template, code: 600 }, function () {
						
						//get infra provider
						if (template.infra) {
							let infraId = new BL.model.getDb(req.soajs).ObjectId(template.infra);
							BL.model.findEntry(req.soajs, {
								collection: 'infra',
								conditions: { _id: infraId }
							}, function (error, selectedProvider) {
								checkReturnError(req, cbMain, { config: config, error: error, code: 600 }, function () {
									checkReturnError(req, cbMain, {
										config: config,
										error: !selectedProvider,
										code: 600
									}, function () {
										//resume deployment if resume is triggered else return deployment status
										let statusMethod = ((environmentRecord.pending || environmentRecord.error) && req.soajs.inputmaskData.resume) ? "resumeDeployment" : "checkProgress";
										envDeployStatus[statusMethod](req, BL, config, environmentRecord, template, selectedProvider, cbMain);
									});
								});
							});
						}
						else {
							//resume deployment if resume is triggered else return deployment status
							let statusMethod = ((environmentRecord.pending || environmentRecord.error) && req.soajs.inputmaskData.resume) ? "resumeDeployment" : "checkProgress";
							envDeployStatus[statusMethod](req, BL, config, environmentRecord, template, null, cbMain);
						}
					});
				});
			});
		}
	},
	
	"get": function (config, req, res, cbMain) {
		var opts = {};
		opts.collection = colName;
		opts.conditions = {};
		if (req.soajs.inputmaskData.code) {
			req.soajs.inputmaskData.code = req.soajs.inputmaskData.code.toUpperCase();
			opts.conditions.code = req.soajs.inputmaskData.code;
			getEnv();
		}
		else {
			validateId(req.soajs, function (err) {
				checkReturnError(req, cbMain, { config: config, error: err, code: 405 }, function () {
					opts.conditions['_id'] = req.soajs.inputmaskData.id;
					getEnv();
				});
			});
		}
		
		function getEnv() {
			BL.model.findEntry(req.soajs, opts, function (error, record) {
				checkReturnError(req, cbMain, { config: config, error: error, code: 600 }, function () {
					if (!record) {
						req.soajs.log.error('No env record found');
						return cbMain(null, null);
					}
					
					BL.model.findEntry(req.soajs, {
						collection: templatesColName,
						conditions: { envCode: record.code }
					}, function (error, template) {
						checkReturnError(req, cbMain, { config: config, error: error, code: 600 }, function () {
							if (!record) {
								req.soajs.log.error('No env record found');
							}
							
							record.template = template;
							return cbMain(null, record);
						});
					});
				});
			});
		}
	},
	
	"delete": function (config, req, deployer, cbMain) {
		
		let envRecord;
		var opts = {};
		opts.collection = colName;
		
		if (req.soajs.inputmaskData.id) {
			try {
				opts.conditions = { '_id': new BL.model.getDb(req.soajs).ObjectId(req.soajs.inputmaskData.id) };
			}
			catch (e) {
				return cbMain({ code: 405, msg: e.toString() });
			}
		}
		if (req.soajs.inputmaskData.code) {
			opts.conditions = { 'code': req.soajs.inputmaskData.code.toUpperCase() };
		}
		
		checkReturnError(req, cbMain, { config: config, error: !opts.conditions, code: 405 }, function () {
			BL.model.findEntry(req.soajs, opts, function (error, record) {
				checkReturnError(req, cbMain, {
					config: config,
					error: error || !record || record.code === process.env.SOAJS_ENV.toUpperCase(),
					code: 404
				}, function () {
					checkReturnError(req, cbMain, {
						config: config,
						error: record.locked,
						code: 500
					}, function () { // return error msg that this record is locked
						envRecord = record;
						if (record.deployer.type === 'manual') {
							deleteHostsControllers(record, deleteEnv);
						}
						else {
							checkContainerDeployments(record, deleteEnv);
						}
					});
				});
			});
		});
		
		function deleteEnv() {
			async.series({
				"removeCustomRegistries": (vCb) => {
					opts = {};
					opts.collection = "custom_registry";
					opts.conditions = { 'created': envRecord.code.toUpperCase() };
					BL.model.removeEntry(req.soajs, opts, vCb);
				},
				"removeResources": (vCb) => {
					opts = {};
					opts.collection = "resources";
					opts.conditions = { 'created': envRecord.code.toUpperCase() };
					BL.model.removeEntry(req.soajs, opts, vCb);
				},
				"removeTemplate": (vCb) => {
					opts = {};
					opts.collection = templatesColName;
					opts.conditions = { 'envCode': envRecord.code.toUpperCase() };
					BL.model.removeEntry(req.soajs, opts, vCb);
				},
				"cleanUpInfra": (vCb) => {
					function initBLModel(BLModule, modelName, cb) {
						BLModule.init(modelName, cb);
					}
					
					req.soajs.inputmaskData.envCode = envRecord.code;
					req.soajs.log.debug("Cleaning up Cluster deployments ...");
					initBLModel(require("../cloud/infra/index.js"), "mongo", (error, infraModule) => {
						checkReturnError(req, vCb, { config: config, error: error, code: 600 }, function () {
							infraModule.removeEnvFromDeployment(config, req, req.soajs, deployer, (error) => {
								if (error) {
									req.soajs.log.warn(error);
								}
								return vCb();
							});
						});
					});
				},
				"removeEnv": (vCb) => {
					opts = {};
					opts.collection = colName;
					opts.conditions = { 'code': envRecord.code.toUpperCase(), 'locked': { $ne: true } };
					BL.model.removeEntry(req.soajs, opts, vCb);
				}
			}, (error) => {
				checkReturnError(req, cbMain, { config: config, error: error, code: 404 }, function () {
					return cbMain(null, "environment delete successful");
				});
			});
			
		}
		
		function deleteCdInfo(envRecord, cbk) {
			req.soajs.log.debug('delete CdInfo');
			opts = {};
			opts.collection = cdColName;
			opts.conditions = { type: 'cd' };
			opts.fields = {
				$unset: { [envRecord.code.toUpperCase()]: '' }
			};
			req.soajs.log.debug(opts);
			BL.model.updateEntry(req.soajs, opts, function (error) {
				checkReturnError(req, cbMain, {
					config: config,
					error: error,
					code: 600
				}, cbk);
			});
		}
		
		function deleteHostsControllers(envRecord, cb) {
			opts = {};
			opts.conditions = { env: envRecord.code.toLowerCase() };
			
			async.parallel({
				hosts: function (callback) {
					opts.collection = hostsColName;
					BL.model.removeEntry(req.soajs, opts, callback);
				},
				controllers: function (callback) {
					opts.collection = controllesColl;
					BL.model.removeEntry(req.soajs, opts, callback);
				}
			}, function (err) {
				checkReturnError(req, cbMain, { config: config, error: err, code: 600 }, cb);
			});
		}
		
		function checkContainerDeployments(envRecord, cb) {
			let cbToUse = (req.soajs.inputmaskData.force) ? cb : cbMain;
			initBLModel(require(__dirname + "/../cloud/services/index.js"), 'mongo', (error, serviceModule) => {
				checkReturnError(req, cbToUse, {
					config: config,
					error: error,
					code: (error && error.code) ? error.code : 600
				}, () => {
					req.soajs.inputmaskData.env = envRecord.code;
					let imfvClone = soajsUtils.cloneObj(req.soajs.inputmaskData);
					serviceModule.listServices(config, req.soajs, deployer, (error, services) => {
						utils.checkErrorReturn(req.soajs, cbToUse, { config: config, error: error }, () => {
							
							//clean all services & secrets
							if (imfvClone.force) {
								let deployerInfo = envRecord.deployer.selected.split(".");
								if (envRecord.deployer.selected.indexOf("container.kubernetes") !== -1) {
									let namespace = envRecord.deployer[deployerInfo[0]][deployerInfo[1]][deployerInfo[2]].namespace.default;
									imfvClone.namespace = namespace;
								}
								
								async.series({
									"deleteServices": (mCb) => {
										if (!services || services.length === 0) {
											return mCb();
										}
										async.eachSeries(services, (oneService, sCb) => {
											req.soajs.inputmaskData = soajsUtils.cloneObj(imfvClone);
											req.soajs.inputmaskData.technology = deployerInfo[1];
											req.soajs.inputmaskData.serviceId = oneService.id;
											if (req.soajs.inputmaskData.namespace !== oneService.namespace) {
												return sCb();
											}
											req.soajs.inputmaskData.mode = oneService.labels['soajs.service.mode'];
											req.soajs.inputmaskData.group = oneService.labels['soajs.service.group'];
											serviceModule.deleteService(config, req, deployer, sCb);
										}, mCb);
									},
									"deleteSecrets": (mCb) => {
										req.soajs.inputmaskData = soajsUtils.cloneObj(imfvClone);
										initBLModel(require(__dirname + "/../cloud/secrets/index.js"), 'mongo', (error, secretsModule) => {
											checkReturnError(req, mCb, {
												config: config,
												error: error,
												code: 600
											}, () => {
												secretsModule.list(config, req.soajs, deployer, (error, secrets) => {
													checkReturnError(req, mCb, {
														config: config,
														error: error,
														code: 600
													}, () => {
														if (!secrets || secrets.length === 0) {
															return mCb();
														}
														async.eachSeries(secrets, (oneSecret, sCb) => {
															if (oneSecret.type === "kubernetes.io/service-account-token" || oneSecret.namespace !== req.soajs.inputmaskData.namespace) {
																return sCb(null, true);
															}
															req.soajs.inputmaskData = soajsUtils.cloneObj(imfvClone);
															req.soajs.inputmaskData.name = oneSecret.name;
															secretsModule.delete(config, req.soajs, deployer, sCb);
														}, mCb);
													});
												});
											});
										});
									},
									"deleteCd": (mCb) => {
										deleteCdInfo(envRecord, mCb);
									}
								}, cb);
							}
							else {
								checkReturnError(req, cbToUse, {
									config: config,
									error: services.length > 0,
									code: 906
								}, () => {
									return deleteCdInfo(envRecord, cb);
								});
							}
						});
					});
				});
			});
		}
	},
	
	"update": function (config, req, res, cbMain) {
		validateId(req.soajs, function (err) {
			checkReturnError(req, cbMain, { config: config, error: err, code: 405 }, function () {
				checkCanEdit(req.soajs, function (errCode) {
					checkReturnError(req, cbMain, {
						config: config,
						error: config.errors[errCode],
						code: errCode
					}, function () {
						let opts = {};
						opts.collection = colName;
						opts.conditions = {
							"_id": req.soajs.inputmaskData.id
						};
						
						BL.model.findEntry(req.soajs, opts, function (error, environment) {
							checkReturnError(req, cbMain, { config: config, error: error, code: 405 }, function () {
								switch (req.soajs.inputmaskData.services.config.session.proxy) {
									case "true":
										req.soajs.inputmaskData.services.config.session.proxy = true;
										break;
									case "false":
										req.soajs.inputmaskData.services.config.session.proxy = false;
										break;
									case "undefined":
										delete req.soajs.inputmaskData.services.config.session.proxy;
										break;
								}
								req.soajs.inputmaskData.services.config.oauth.grants = ['password', 'refresh_token'];
								
								environment.domain = req.soajs.inputmaskData.domain || "";
								environment.apiPrefix = req.soajs.inputmaskData.apiPrefix;
								environment.sitePrefix = req.soajs.inputmaskData.sitePrefix;
								environment.description = req.soajs.inputmaskData.description;
								environment.sensitive = req.soajs.inputmaskData.sensitive;
								// If the password is already set, dont change it
								let services = soajsUtils.cloneObj(req.soajs.inputmaskData.services);
								let oldKey = soajsUtils.cloneObj(environment.services.config.key);
								if (environment.services.config.key && environment.services.config.key.password) {
									if (services.config && services.config.key) {
										delete services.config.key;
									}
								}
								environment.services = soajsUtils.cloneObj(services);
								environment.services.config.key = oldKey;
								environment.profile = config.profileLocation + "profile.js";
								
								if (req.soajs.inputmaskData.portalPrefix) {
									environment["portalPrefix"] = req.soajs.inputmaskData.portalPrefix;
								}
								
								if (req.soajs.inputmaskData.services.config.throttling) {
									//triggered when removing a strategy that is already assign
									let defaultPublic = req.soajs.inputmaskData.services.config.throttling.publicAPIStrategy;
									if (defaultPublic === "") {
										defaultPublic = req.soajs.inputmaskData.services.config.throttling.publicAPIStrategy = null;
									}
									if (defaultPublic && !req.soajs.inputmaskData.services.config.throttling[defaultPublic]) {
										return cbMain({
											"code": 173,
											"msg": "Did not find the throtting configuration for the default public throttling strategy selected of this environment."
										});
									}
									
									//triggered when removing a strategy that is already assign
									let defaultPrivate = req.soajs.inputmaskData.services.config.throttling.privateAPIStrategy;
									if (defaultPrivate === "") {
										defaultPrivate = req.soajs.inputmaskData.services.config.throttling.privateAPIStrategy = null;
									}
									if (defaultPrivate && !req.soajs.inputmaskData.services.config.throttling[defaultPrivate]) {
										return cbMain({
											"code": 173,
											"msg": "Did not find the throtting configuration for the default private throttling strategy selected of this environment."
										});
									}
								}
								
								//update machine ip
								if (environment.deployer && environment.deployer.type === 'manual') {
									environment.deployer.manual = {
										nodes: req.soajs.inputmaskData.machineip
									};
								}
								else {
									let deployerInfo = req.soajs.inputmaskData.deployer.selected.split(".");
									if (deployerInfo[1] !== 'docker' && deployerInfo[2] !== 'local') {
										environment.deployer[deployerInfo[0]][deployerInfo[1]][deployerInfo[2]].nodes = req.soajs.inputmaskData.machineip;
									}
								}
								
								opts.record = environment;
								BL.model.saveEntry(req.soajs, opts, function (err, data) {
									checkReturnError(req, cbMain, {
										config: config,
										error: err,
										code: 401
									}, function () {
										return cbMain(null, "environment update successful");
									});
								});
							});
						});
					});
				});
			});
		});
	},
	
	"list": function (config, req, res, cbMain) {
		var opts = {
			collection: colName
		};
		
		BL.model.findEntries(req.soajs, opts, function (err, records) {
			checkReturnError(req, cbMain, { config: config, error: err, code: 402 }, function () {
				return cbMain(null, records);
			});
		});
	},
	
	"keyUpdate": function (config, soajsCore, req, res, cbMain) {
		keyModules.keyUpdate(config, soajsCore, req, res, BL, cbMain);
	},
	
	"listDbs": function (config, req, res, cbMain) {
		databaseModules.listDbs(config, req, res, BL, cbMain);
	},
	
	"addDb": function (config, req, res, cbMain) {
		databaseModules.addDb(config, req, res, BL, cbMain);
	},
	
	"updateDb": function (config, req, res, cbMain) {
		databaseModules.updateDb(config, req, res, BL, cbMain);
	},
	
	"deleteDb": function (config, req, res, cbMain) {
		databaseModules.deleteDb(config, req, res, BL, cbMain);
	},
	
	"updateDbsPrefix": function (config, req, res, cbMain) {
		databaseModules.updateDbsPrefix(config, req, res, BL, cbMain);
	},
	
	"listPlatforms": function (config, req, res, deployer, cbMain) {
		platformsHelper.listPlatforms(config, req, res, BL, envHelper, deployer, cbMain);
	},
	
	"updateDeployerConfig": function (config, req, deployer, cbMain) {
		platformsHelper.updateDeployerConfig(config, req, BL, deployer, cbMain);
	},
	
	"attachContainer": function (config, req, deployer, cbMain) {
		platformsHelper.attachContainer(config, req, BL, deployer, cbMain);
	},
	
	"detachContainer": function (config, req, deployer, cbMain) {
		platformsHelper.detachContainer(config, req, BL, deployer, cbMain);
	},
	
	"lockEnvToCloudProvider": function(config, req, cbMain){
		cloudProviderHelper.lockEnvToCloudProvider(config, req, BL, cbMain);
	},

	"unlockEnvToCloudProvider": function(config, req, deployer, cbMain){
		cloudProviderHelper.unlockEnvToCloudProvider(config, req, BL, deployer, cbMain);
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
