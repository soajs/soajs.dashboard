'use strict';
var colName = "environment";
var templatesColName = "templates";
var hostsColName = "hosts";
var controllesColl = "controllers";
var tenantColName = "tenants";
var cdColName = 'cicd';

var fs = require('fs');
var async = require('async');

const config = require("../../config.js");
var utils = require("../../utils/utils.js");
var envHelper = require("./helper.js");
var envDeployStatus = require("./status.js");


function validateId(soajs, cb) {
	BL.model.validateId(soajs, cb);
}

function checkReturnError(req, mainCb, data, cb) {
	if (data.error) {
		if (typeof (data.error) === 'object') {
			req.soajs.log.error(data.error);
		}
		if (!data.config){
			data.config = config;
		}
		let message = data.config.errors[data.code];
		if(!message && data.error.message){
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

	let environmentId = soajs.inputmaskData.id;
	let locked = soajs.tenant.locked;

	let opts = {};
	opts.collection = colName;
	opts.conditions = { '_id': soajs.inputmaskData.id };
	BL.model.findEntry(soajs, opts, function (error, envRecord) {
		if (error) {
			return cb(600);
		}

		//i am root
		if(locked){
			return cb(null, {});
		}
		else{
			//i am not root but this is a locked environment
			if(envRecord && envRecord.locked){
				return cb(501);
			}
			//i am not root and this is not a locked environment
			else{
				return cb(null, {});
			}
		}
	});
}

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
						async.auto({
							"checkPreviousEnvironment": (mCb) =>{
								if(req.soajs.inputmaskData.data.deploy && req.soajs.inputmaskData.data.deploy.previousEnvironment){
									let condition = {
										'code': req.soajs.inputmaskData.data.deploy.previousEnvironment.toUpperCase()
									};

									BL.model.findEntry(req.soajs, { collection: colName, conditions: condition }, (error, envDBRecord) => {
										checkReturnError(req, cbMain, { config: config, error: error, code: 400 }, () => {
											return mCb(null, envHelper.getDefaultRegistryServicesConfig(envDBRecord));
										});
									});
								}
								else{
									return mCb(null, envHelper.getDefaultRegistryServicesConfig());
								}
							},
							"removePreviousTemplateifAny": (mCb) => {
								BL.model.removeEntry(req.soajs, {
										collection: templatesColName,
										conditions: {
											envCode: req.soajs.inputmaskData.data.code
										}
									}, (error) => {
										checkReturnError(req, cbMain, { config: config, error: error, code: 400 }, () => {
											return mCb();
										});
								});
							},
							"getRequestedTemplate": (mCb) =>{
								let opts = {
									collection: templatesColName,
									conditions: { "type": "_template", "_id": new BL.model.getDb(req.soajs).ObjectId(req.soajs.inputmaskData.data.templateId) }
								};
								BL.model.findEntry(req.soajs, opts, (error, template) => {
									checkReturnError(req, cbMain, { config: config, error: error, code: 400 }, () => {
										checkReturnError(req, cbMain, { config: config, error: !template, code: 400 }, () => {
											return mCb(null, template);
										});
									});
								});
							},
							"prepareEnvRecord": ["checkPreviousEnvironment", (info, mCb) => {
								let envRecord = info.checkPreviousEnvironment;
								let record = envHelper.prepareEnvRecord(config, req.soajs.inputmaskData.data, envRecord);
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

								if(record.deployer.type === 'manual'){
									pendingEnvironment = false;
								}
								record.pending = pendingEnvironment;
								return mCb(null, record);
							}],
							"insertEnvironment": ["prepareEnvRecord", (info, mCb) => {
								let opts = {
									collection: colName,
									record: info.prepareEnvRecord
								};
								BL.model.insertEntry(req.soajs, opts, mCb);
							}],
							"checkTemplate": ["insertEnvironment", "getRequestedTemplate", function(info, mCb){
								envRecord = info.insertEnvironment[0];

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
										errors.push({code: 173, msg: `Template  ${req.soajs.inputmaskData.template.name}: ` + err.stack});
									});
									return mCb(errors);
								}

								if(process.env.SOAJS_SAAS && req.soajs.servicesConfig && req.soajs.inputmaskData.soajs_project){
									template.soajs_project = req.soajs.inputmaskData.soajs_project;
								}
								
								template.envCode = req.soajs.inputmaskData.data.code;
								template.type = "_environment_" + template.envCode;
								
								//transform the . -> __dot__
								for(let stage in template.deploy){
									for (let group in template.deploy[stage]){
										for(let section in template.deploy[stage][group]){
											if(section.indexOf(".") !== -1){
												let newSection = section.replace(/\./g, "__dot__");
												template.deploy[stage][group][newSection] = JSON.parse(JSON.stringify(template.deploy[stage][group][section]));
												delete template.deploy[stage][group][section];
											}
										}
									}
								}

								//save template and resume deployment
								envTemplate = template;
								BL.model.insertEntry(req.soajs, { collection: templatesColName, record: template }, mCb);
							}]
						}, (error) =>{
							checkReturnError(req, cbMain, { config: config, error: error, code: (error && error.code) ? error.code : 400 }, function () {
								//check template inputs
								envDeployStatus.validateDeploymentInputs(req, BL, config, envRecord, envTemplate, (error) =>{
									if(error){
										//array of errors detected, soajs response mw will parse it
										//remove the environment
										opts = {
											collection: colName,
											conditions: { code: envRecord.code.toUpperCase() }
										};
										BL.model.removeEntry(req.soajs, opts, (err) =>{
											if(err){
												req.soajs.log.error(err);
											}
										});
										return cbMain(error);
									}

									//resume deployment of environment from template
									envDeployStatus.resumeDeployment(req, BL, config, envRecord, envTemplate, (error) =>{
										
										checkReturnError(req, cbMain, { config: config, error: error, code: 400 }, function () {
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

		function checkSAASSettings(cb){
			if (process.env.SOAJS_SAAS && !req.soajs.tenant.locked && req.soajs.servicesConfig) {
				let serviceConfig = req.soajs.servicesConfig.SOAJS_SAAS;

				//if soajs_project is found in one of the applications configuration, then use ONLY that ext key
				if(serviceConfig && serviceConfig[req.soajs.inputmaskData.soajs_project]){
					let valid = true;
					let limit = null;
					if(serviceConfig[req.soajs.inputmaskData.soajs_project]['SOAJS_SAAS_environments']) {
						limit = serviceConfig[req.soajs.inputmaskData.soajs_project]['SOAJS_SAAS_environments'].limit;
					}
					if(!limit){
						return cb();
					}

					//get the limit value
					//count the environment
					//if fail, return res
					//if ok return cb
					let opts = { collection: colName, conditions: {} };
					BL.model.countEntries(req.soajs, opts, (error, count) => {
						checkReturnError(req, cbMain, { config: config, error: error, code: 400 }, () => {
							if(count && count >= limit){
								valid = false;
							}

							if(!valid){
								return cbMain({"code": 999, "msg": config.errors[999] });
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
	"getDeploymentStatus": function(config, req, res, cbMain){
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
						if(record.error && !req.soajs.inputmaskData.rollback && !req.soajs.inputmaskData.activate){
							return cbMain({code: 400, msg: record.error});
						}

						//activate the environment
						if(req.soajs.inputmaskData.activate){
							delete record.error;
							delete record.pending;
							BL.model.saveEntry(req.soajs, {collection: colName, record: record}, function (error) {
								checkReturnError(req, cbMain, { config: config, error: error, code: 600 }, function () {
									return cbMain(null, {"completed": true});
								});
							});
						}
						//return environment deployment progress
						else{
							loadAndProcessTemplate(record);
						}
					});
				});
			});
		}

		function loadAndProcessTemplate(environmentRecord){
			BL.model.findEntry(req.soajs, {collection:templatesColName, conditions: { envCode: req.soajs.inputmaskData.code } }, function(error, template) {
				checkReturnError(req, cbMain, { config: config, error: error, code: 600 }, function () {
					checkReturnError(req, cbMain, { config: config, error: !template, code: 600 }, function () {

						//resume deployment if resume is triggered else return deployment status
						let statusMethod = ((environmentRecord.pending || environmentRecord.error) && req.soajs.inputmaskData.resume) ? "resumeDeployment" : "checkProgress";
						envDeployStatus[statusMethod](req, BL, config, environmentRecord, template, cbMain);
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
		
		if(req.soajs.inputmaskData.id){
			try{
				opts.conditions = { '_id': new BL.model.getDb(req.soajs).ObjectId(req.soajs.inputmaskData.id) };
			}
			catch(e){
				return cbMain({code: 405, msg: e.toString() });
			}
		}
		if(req.soajs.inputmaskData.code){
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
					opts.conditions = { 'created': envRecord.code.toUpperCase()};
					BL.model.removeEntry(req.soajs, opts, vCb);
				},
				"removeResources": (vCb) => {
					opts = {};
					opts.collection = "resources";
					opts.conditions = { 'created': envRecord.code.toUpperCase()};
					BL.model.removeEntry(req.soajs, opts, vCb);
				},
				"removeTemplate": (vCb) => {
					opts = {};
					opts.collection = templatesColName;
					opts.conditions = { 'envCode': envRecord.code.toUpperCase()};
					BL.model.removeEntry(req.soajs, opts, vCb);
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

		function deleteCdInfo(envRecord, cb) {
			opts = {};
			opts.collection = cdColName;
			opts.conditions = { type: 'cd' };
			opts.fields = {
				$unset: { [envRecord.code.toUpperCase()]: '' }
			};
			BL.model.updateEntry(req.soajs, opts, function(error) {
				checkReturnError(req, cbMain, {
					config: config,
					error: error,
					code: 600
				}, cb);
			});
		}

		function deleteHostsControllers(envRecord, cb) {
			opts = {};
			opts.conditions = { env: envRecord.code.toLowerCase() };

			async.parallel({
				hosts : function(callback) {
					opts.collection = hostsColName;
					BL.model.removeEntry(req.soajs, opts, callback);
				},
				controllers : function (callback) {
					opts.collection = controllesColl;
					BL.model.removeEntry(req.soajs, opts, callback);
				}
			}, function (err) {
				checkReturnError(req, cbMain, { config: config, error: err, code: 600 }, cb);
			});
		}

		function checkContainerDeployments(envRecord, cb) {
			if (req.soajs.inputmaskData.force) {
				return cb();
			}

			var options = utils.buildDeployerOptions(envRecord, req.soajs, BL);
			options.params = { env: envRecord.code.toLowerCase() };
			deployer.listServices(options, function (error, services) {
				utils.checkErrorReturn(req.soajs, cbMain, { config: config, error: error }, function () { //utils.checkErrorReturn() is used to handle driver errors
					checkReturnError(req, cbMain, {
						config: config,
						error: services.length > 0,
						code: 906
					}, function() {
						return deleteCdInfo(envRecord, cb);
					});
				});
			});
		}
	},

	"update": function (config, req, res, cbMain) {
		validateId(req.soajs, function (err) {
			checkReturnError(req, cbMain, { config: config, error: err, code: 405 }, function () {

				var opts = {};
				opts.collection = colName;
				opts.conditions = {
					"_id": req.soajs.inputmaskData.id
				};

				BL.model.findEntry(req.soajs, opts, function(error, environment){
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
						environment.services = req.soajs.inputmaskData.services;
						environment.profile = config.profileLocation + "profile.js";

						if (req.soajs.inputmaskData.portalPrefix) {
							environment["portalPrefix"] = req.soajs.inputmaskData.portalPrefix;
						}

						//update machine ip
						if(environment.deployer.type === 'manual'){
							environment.deployer.manual = {
								nodes: req.soajs.inputmaskData.machineip
							};
						}
						else {
							let deployerInfo = req.soajs.inputmaskData.deployer.selected.split(".");
							if(deployerInfo[1] !== 'docker' && deployerInfo[2] !== 'local'){
								environment.deployer[deployerInfo[0]][deployerInfo[1]][deployerInfo[2]].nodes = req.soajs.inputmaskData.machineip;
							}
						}

						opts.record = environment;
						BL.model.saveEntry(req.soajs, opts, function (err, data) {
							checkReturnError(req, cbMain, { config: config, error: err, code: 401 }, function () {
								return cbMain(null, "environment update successful");
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
		var opts = {};
		checkCanEdit(req.soajs, function (error) {
			checkReturnError(req, cbMain, { config: config, error: error, code: error }, function () {
				validateId(req.soajs, function (err) {
					checkReturnError(req, cbMain, {
						config: config,
						error: err,
						code: 405
					}, function () {
						//get environment record
						opts.collection = colName;
						opts.conditions = { '_id': req.soajs.inputmaskData.id };
						opts.options = { upsert: false, safe: true, multi: false };
						opts.fields = {
							"$set": {
								"services.config.key.algorithm": req.soajs.inputmaskData.algorithm,
								"services.config.key.password": req.soajs.inputmaskData.password
							}
						};

						BL.model.updateEntry(req.soajs, opts, function (error) {
							checkReturnError(req, cbMain, {
								config: config,
								error: error,
								code: 600
							}, function () {
								opts = {
									collection: colName,
									conditions: { '_id': req.soajs.inputmaskData.id }
								};
								BL.model.findEntry(req.soajs, opts, function (error, envRecord) {
									checkReturnError(req, cbMain, {
										config: config,
										error: error || !envRecord,
										code: 446
									}, function () {
										//get tenant records
										opts = {};
										opts.collection = tenantColName;
										opts.conditions = {};
										BL.model.findEntries(req.soajs, opts, function (error, tenantRecords) {
											checkReturnError(req, cbMain, {
												config: config,
												error: error || !tenantRecords,
												code: 438
											}, function () {
												req.soajs.inputmaskData.envCode = envRecord.code;
												updateTenants(tenantRecords, envRecord);
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

		function updateTenants(tenantRecords, envRecord) {
			var newKeys = {};
			async.map(tenantRecords, function (oneTenant, tntCb) {
				async.map(oneTenant.applications, function (oneApp, appCb) {
					async.map(oneApp.keys, function (oneKey, keyCb) {

						async.map(oneKey.extKeys, function (oneExtKey, extKeyCb) {
							var clone = JSON.parse(JSON.stringify(oneExtKey));
							if (oneExtKey.env === envRecord.code) {
								oneExtKey.deprecated = true;
								clone.extKey = '';
								soajsCore.key.generateExternalKey(oneKey.key, {
									id: oneTenant._id,
									code: oneTenant.code,
									locked: oneTenant.locked || false
								}, {
									product: oneApp.product,
										package: oneApp.package,
										appId: oneApp.appId.toString(),
								}, envRecord.services.config.key, function (error, newExtKey) {
									if (error) {
										return extKeyCb(error);
									}

									clone.extKey = newExtKey;
									oneKey.extKeys.push(clone);
									return extKeyCb(null, oneExtKey);
								});
							}
							else {
								return extKeyCb(null, oneExtKey);
							}

						}, function (error, extKeys) {
							return keyCb(error, oneKey);
						});

					}, function (error, keys) {
						if (!error) {
							oneApp.keys = keys;
						}
						newKeys[oneApp.appId.toString()] = {
							package: oneApp.package,
							newKeys: keys
						};
						return appCb(error, oneApp);
					});

				}, function (error, applications) {
					if (!error) {
						oneTenant.applications = applications;
					}
					return tntCb(error, oneTenant);
				});
			}, function (error, updatedRecords) {
				checkReturnError(req, cbMain, {

					config: config,
					error: error,
					code: 600
				}, function () {
					//update tenant records in db
					async.each(updatedRecords, function (oneTenant, mCb) {
						opts = {
							collection: tenantColName,
							record: oneTenant
						};
						BL.model.saveEntry(req.soajs, opts, mCb);
					}, function (error) {
						checkReturnError(req, cbMain, {
							config: config,
							error: error,
							code: 600
						}, function () {
							let data = true;
							if (envRecord.code.toUpperCase() === process.env.SOAJS_ENV.toUpperCase()) {
								data = { 'newKeys': newKeys };
							}
							return cbMain(null, data);
						});
					});
				});
			});
		}
	},

	"listDbs": function (config, req, res, cbMain) {
		var opts = {};
		opts.collection = colName;
		opts.conditions = { 'code': req.soajs.inputmaskData.env.toUpperCase() };
		BL.model.findEntry(req.soajs, opts, function (err, envRecord) {
			checkReturnError(req, cbMain, {
				config: config,
				error: err || !envRecord,
				code: 402
			}, function () {
				return cbMain(null, envRecord.dbs);
			});
		});
	},

	"addDb": function (config, req, res, cbMain) {
		if (req.soajs.inputmaskData.name === 'session') {
			if (!req.soajs.inputmaskData.sessionInfo || JSON.stringify(req.soajs.inputmaskData.sessionInfo) === '{}') {
				return cbMain({ "code": 507, "msg": config.errors[507] });
			}
		}
		var opts = {};
		opts.collection = colName;
		opts.conditions = { 'code': req.soajs.inputmaskData.env.toUpperCase() };

		//check in old schema
		BL.model.findEntry(req.soajs, opts, function (err, envRecord) {
			checkReturnError(req, cbMain, {
				config: config,
				error: err || !envRecord,
				code: 402
			}, function () {
				//check in resources
				BL.model.findEntry(req.soajs, {
					collection: 'resources',
					conditions: {
						'name': req.soajs.inputmaskData.cluster,
						'$or': [
							{
								created: req.soajs.inputmaskData.env.toUpperCase()
							},
							{
								created: { $ne: req.soajs.inputmaskData.env.toUpperCase() },
								shared: { $eq: true },
								sharedEnv: { $exists: false }
							},
							{
								created: { $ne: req.soajs.inputmaskData.env.toUpperCase() },
								shared: { $eq: true },
								sharedEnv: { $exists: true },
								['sharedEnv.' + req.soajs.inputmaskData.env.toUpperCase()]: { $exists: true, $eq: true }
							}
						]
					}
				}, function (error, resource) {
					checkReturnError(req, cbMain, {
						config: config,
						error: error || !resource,
						code: 502
					}, function () {
						//check if this is the session
						if (req.soajs.inputmaskData.name === 'session') {
							checkReturnError(req, cbMain, {
								config: config,
								error: envRecord.dbs.session && JSON.stringify(envRecord.dbs.session) !== '{}',
								code: 510
							}, function () {
								envRecord.dbs.session = {
									'prefix': req.soajs.inputmaskData.prefix,
									'cluster': req.soajs.inputmaskData.cluster,
									'name': req.soajs.inputmaskData.sessionInfo.dbName,
									'store': req.soajs.inputmaskData.sessionInfo.store,
									'collection': req.soajs.inputmaskData.sessionInfo.collection,
									'stringify': req.soajs.inputmaskData.sessionInfo.stringify,
									'expireAfter': req.soajs.inputmaskData.sessionInfo.expireAfter
								};
								opts = {};
								opts.collection = colName;
								opts.record = envRecord;
								BL.model.saveEntry(req.soajs, opts, function (err) {
									checkReturnError(req, cbMain, {
										config: config,
										error: err,
										code: 503
									}, function () {
										return cbMain(null, "environment database added successful");
									});
								});
							});
						}
						else {
							checkReturnError(req, cbMain, {
								config: config,
								error: envRecord.dbs.databases[req.soajs.inputmaskData.name],
								code: 509
							}, function () {
								//otherwise
								envRecord.dbs.databases[req.soajs.inputmaskData.name] = {
									'prefix': req.soajs.inputmaskData.prefix,
									'cluster': req.soajs.inputmaskData.cluster,
									'tenantSpecific': req.soajs.inputmaskData.tenantSpecific || false
								};
								opts = {};
								opts.collection = colName;
								opts.record = envRecord;
								BL.model.saveEntry(req.soajs, opts, function (err) {
									checkReturnError(req, cbMain, {
										config: config,
										error: err,
										code: 503
									}, function () {
										return cbMain(null, "environment database added successful");
									});
								});
							});
						}
					});
				});
			});
		});
	},

	"updateDb": function (config, req, res, cbMain) {
		if (req.soajs.inputmaskData.name === 'session') {
			if (!req.soajs.inputmaskData.sessionInfo || JSON.stringify(req.soajs.inputmaskData.sessionInfo) === '{}') {
				return cbMain({ "code": 507, "msg": config.errors[507] });
			}
		}
		var opts = {};
		opts.collection = colName;
		opts.conditions = { 'code': req.soajs.inputmaskData.env.toUpperCase() };
		BL.model.findEntry(req.soajs, opts, function (err, envRecord) {
			checkReturnError(req, cbMain, {
				config: config,
				error: err || !envRecord,
				code: 402
			}, function () {
				BL.model.findEntry(req.soajs, {
					collection: 'resources',
					conditions: {
						'name': req.soajs.inputmaskData.cluster,
						'$or': [
							{
								created: req.soajs.inputmaskData.env.toUpperCase()
							},
							{
								created: { $ne: req.soajs.inputmaskData.env.toUpperCase() },
								shared: { $eq: true },
								sharedEnv: { $exists: false }
							},
							{
								created: { $ne: req.soajs.inputmaskData.env.toUpperCase() },
								shared: { $eq: true },
								sharedEnv: { $exists: true },
								['sharedEnv.' + req.soajs.inputmaskData.env.toUpperCase()]: { $exists: true, $eq: true }
							}
						]
					}
				}, function (error, resource) {
					checkReturnError(req, cbMain, {
						config: config,
						error: error || !resource,
						code: 502
					}, function () {
						//check if this is the session
						if (req.soajs.inputmaskData.name === 'session') {
							checkReturnError(req, cbMain, {
								config: config,
								error: (!envRecord.dbs.session && !envRecord.dbs.config.session),
								code: 511
							}, function () {
								//remove old
								delete envRecord.dbs.config.session;

								//add new
								envRecord.dbs.session = {
									'cluster': req.soajs.inputmaskData.cluster,
									'name': req.soajs.inputmaskData.sessionInfo.dbName,
									'store': req.soajs.inputmaskData.sessionInfo.store,
									'collection': req.soajs.inputmaskData.sessionInfo.collection,
									'stringify': req.soajs.inputmaskData.sessionInfo.stringify,
									'expireAfter': req.soajs.inputmaskData.sessionInfo.expireAfter
								};

								if (req.soajs.inputmaskData.prefix && req.soajs.inputmaskData.prefix !== '') {
									envRecord.dbs.session['prefix'] = req.soajs.inputmaskData.prefix;
								}

								opts = {};
								opts.collection = colName;
								opts.record = envRecord;
								BL.model.saveEntry(req.soajs, opts, function (err) {
									checkReturnError(req, cbMain, {
										config: config,
										error: err,
										code: 513
									}, function () {
										return cbMain(null, "environment database updated successful");
									});
								});
							});
						}
						else {
							checkReturnError(req, cbMain, {
								config: config,
								error: !envRecord.dbs.databases[req.soajs.inputmaskData.name],
								code: 512
							}, function () {
								//otherwise
								envRecord.dbs.databases[req.soajs.inputmaskData.name] = {
									'cluster': req.soajs.inputmaskData.cluster,
									'tenantSpecific': req.soajs.inputmaskData.tenantSpecific || false
								};

								if (req.soajs.inputmaskData.prefix && req.soajs.inputmaskData.prefix !== '') {
									envRecord.dbs.databases[req.soajs.inputmaskData.name]['prefix'] = req.soajs.inputmaskData.prefix;
								}

								opts = {};
								opts.collection = colName;
								opts.record = envRecord;
								BL.model.saveEntry(req.soajs, opts, function (err) {
									checkReturnError(req, cbMain, {
										config: config,
										error: err,
										code: 513
									}, function () {
										return cbMain(null, "environment database updated successful");
									});
								});
							});
						}
					});
				});
			});
		});
	},

	"deleteDb": function (config, req, res, cbMain) {
		var opts = {};
		opts.collection = colName;
		opts.conditions = { 'code': req.soajs.inputmaskData.env.toUpperCase() };
		BL.model.findEntry(req.soajs, opts, function (err, envRecord) {
			checkReturnError(req, cbMain, {
				config: config,
				error: err || !envRecord,
				code: 402
			}, function () {
				if (req.soajs.inputmaskData.name === 'session') {
					checkReturnError(req, cbMain, {
						config: config,
						error: (!envRecord.dbs.session && !envRecord.dbs.config.session),
						code: 511
					}, function () {
						delete envRecord.dbs.config.session;
						delete envRecord.dbs.session;
						opts = {};
						opts.collection = colName;
						opts.record = envRecord;
						BL.model.saveEntry(req.soajs, opts, function (err) {
							checkReturnError(req, cbMain, {
								config: config,
								error: err,
								code: 514
							}, function () {
								return cbMain(null, "environment database removed successful");
							});
						});
					});
				}
				else {
					checkReturnError(req, cbMain, {
						config: config,
						error: !envRecord.dbs.databases[req.soajs.inputmaskData.name],
						code: 512
					}, function () {
						delete envRecord.dbs.databases[req.soajs.inputmaskData.name];
						opts = {};
						opts.collection = colName;
						opts.record = envRecord;
						BL.model.saveEntry(req.soajs, opts, function (err) {
							checkReturnError(req, cbMain, {

								config: config,
								error: err,
								code: 514
							}, function () {
								return cbMain(null, "environment database removed successful");
							});
						});
					});
				}
			});
		});
	},

	"updateDbsPrefix": function (config, req, res, cbMain) {
		var prefix = { "dbs.config.prefix": req.soajs.inputmaskData.prefix };
		var opts = {};
		opts.collection = colName;
		opts.conditions = { 'code': req.soajs.inputmaskData.env.toUpperCase() };
		opts.fields = { "$set": prefix };
		opts.options = { 'upsert': false, 'safe': true };
		BL.model.updateEntry(req.soajs, opts, function (err) {
			checkReturnError(req, cbMain, { config: config, error: err, code: 402 }, function () {
				return cbMain(null, "environment Database prefix update successful");
			});
		});
	},

	"listPlatforms": function (config, req, res, cbMain) {
		req.soajs.inputmaskData.env = req.soajs.inputmaskData.env.toUpperCase();
		var opts = {};
		opts.collection = colName;
		opts.conditions = { 'code': req.soajs.inputmaskData.env };
		BL.model.findEntry(req.soajs, opts, function (error, envRecord) {
			checkReturnError(req, cbMain, {
				config: config,
				error: error || !envRecord,
				code: 402
			}, function () {
				envHelper.listCerts(req.soajs, BL.model, function (error, certs) {
					checkReturnError(req, cbMain, {
						config: config,
						error: error,
						code: 732
					}, function () {
						envRecord.deployer.certs = certs;
						return cbMain(null, envRecord.deployer);
					});
				});
			});
		});
	},

	"updateDeployerConfig": function (config, req, deployer, cbMain) {

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
					var currentPlatform = ((envRecord.deployer && envRecord.deployer.selected) ? envRecord.deployer.selected.split('.')[1] : '');
					checkIfNamespaceHasServices(envRecord, currentPlatform, function () {
						if(req.soajs.inputmaskData.config.nodes){
							envRecord.deployer.container[currentPlatform][req.soajs.inputmaskData.driver].nodes = req.soajs.inputmaskData.config.nodes;
						}
						if(currentPlatform === 'docker'){
							if(req.soajs.inputmaskData.config.apiPort){
								envRecord.deployer.container[currentPlatform][req.soajs.inputmaskData.driver].apiPort = req.soajs.inputmaskData.config.apiPort;
							}

							if(req.soajs.inputmaskData.config.token){
								envRecord.deployer.container[currentPlatform][req.soajs.inputmaskData.driver].auth.token = req.soajs.inputmaskData.config.token;
							}
						}
						else{
							if(!Object.hasOwnProperty.call(req.soajs.inputmaskData.config, 'namespace')){
								envRecord.deployer.container[currentPlatform][req.soajs.inputmaskData.driver].auth.token = req.soajs.inputmaskData.config.token;
							}
							else{
								envRecord.deployer.container[currentPlatform][req.soajs.inputmaskData.driver].namespace = req.soajs.inputmaskData.config.namespace;
							}
						}
						let opts = {
							collection: colName,
							record: envRecord
						};
						BL.model.saveEntry(req.soajs, opts, function (error) {
							checkReturnError(req, cbMain, { config: config, error: error, code: 600 }, function () {
								if(currentPlatform === 'docker'){
									cleanUpOldCerts(req.soajs.inputmaskData.env);
								}
								return cbMain(null, true);
							});
						});
					});
				});
			});
		});

		function checkIfNamespaceHasServices(envRecord, currentPlatform, cb) {
			if(currentPlatform !== 'kubernetes'){
				return cb(null);
			}

			if(!Object.hasOwnProperty.call(req.soajs.inputmaskData.config, 'namespace')){
				return cb(null);
			}

			//cannot change kubernetes namespace
			var options = utils.buildDeployerOptions(envRecord, req.soajs, BL);
			options.params = { env: req.soajs.inputmaskData.env.toUpperCase() };
			deployer.listServices(options, function (error, services) {
				utils.checkErrorReturn(req.soajs, cbMain, { config: config, error: error }, function () {
					checkReturnError(req, cbMain, { config: config, error: services.length > 0, code: 907 }, () =>{
						if(envRecord.deployer.container[currentPlatform][req.soajs.inputmaskData.driver].namespace.default !== req.soajs.inputmaskData.config.namespace.default){
							//namespace has been modified, create it then return cb

							options.deployerConfig.namespace = {
								default: req.soajs.inputmaskData.config.namespace.default,
								perService: req.soajs.inputmaskData.config.namespace.perService
							};

							deployer.createNameSpace(options, (error, response) => {
								if(error && error.code == 672){
									return cb();
								}
								utils.checkErrorReturn(req.soajs, cbMain, { config: config, error: error }, cb);
							});
						}
						else{
							return cb();
						}
					});
				});
			});
		}

		function cleanUpOldCerts(envCode){
			envHelper.listCerts(req.soajs, BL.model, (error, certs) =>{
				if(error){
					req.soajs.log.error(error);
				}

				envHelper.deleteCerts(certs, req, BL.model, envCode);
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
