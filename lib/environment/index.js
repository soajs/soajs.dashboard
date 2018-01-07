'use strict';
var colName = "environment";
var templatesColName = "templates";
var hostsColName = "hosts";
var controllesColl = "controllers";
var tenantColName = "tenants";
var cdColName = 'cicd';

var fs = require('fs');

var Grid = require('gridfs-stream');
var formidable = require('formidable');
var async = require('async');

var soajsCore = require("soajs").core;
var soajsUtils = require("soajs").utils;
var utils = require("../../utils/utils.js");
var envHelper = require("./helper.js");
var statusChecker = require("./status.js");


function validateId(soajs, cb) {
	BL.model.validateId(soajs, cb);
}

function validateCertId(soajs, oneCert, cb) {
	BL.model.validateCustomId(soajs, oneCert, cb);
}

function checkReturnError(req, mainCb, data, cb) {
	if (data.error) {
		if (typeof (data.error) === 'object') {
			req.soajs.log.error(data.error);
		}
		return mainCb({ "code": data.code, "msg": data.config.errors[data.code] });
	} else {
		if (cb) {
			return cb();
		}
	}
}

function checkCanEdit(soajs, cb) {
	var myProduct;
	var myUrac;
	if (soajs.uracDriver && soajs.uracDriver.getProfile()) {
		myUrac = soajs.uracDriver.getProfile();
	}
	if (myUrac && myUrac.tenant.id === soajs.tenant.id) {
		myProduct = soajs.tenant.application.product;
	}

	var opts = {};
	opts.collection = tenantColName;
	opts.conditions = { '_id': soajs.inputmaskData.id };
	BL.model.findEntry(soajs, opts, function (error, record) {
		if (error) {
			return cb(600);
		}
		//if i am the owner of the product
		if (record && myProduct && record.code === myProduct) {
			return cb(null, {});
		}
		// return error msg that this record is locked
		else if (record && record.locked) {
			return cb(501);
		}
		//i am not the owner and the product is not locked
		else {
			return cb(null, {});
		}
	});
}

var BL = {
	model: null,

	"add": function (config, service, provision, dbModel, req, res, cbMain) {
		let pendingEnvironment = true;
		if (req.soajs.inputmaskData.data.soajsFrmwrk) {
			if (!req.soajs.inputmaskData.data.cookiesecret || !req.soajs.inputmaskData.data.sessionName || !req.soajs.inputmaskData.data.sessionSecret) {
				return cbMain({ code: 408, msg: config.errors[408] });
			}
		}

		if (!Object.hasOwnProperty.call(req.soajs.inputmaskData.data, 'deployPortal')) {
			req.soajs.inputmaskData.data.deployPortal = false;
		}

		if (!req.soajs.inputmaskData.data.deployPortal) {
			if (['DASHBOARD', 'PORTAL'].indexOf(req.soajs.inputmaskData.data.code.toUpperCase()) !== -1) {
				return cbMain({ code: 457, msg: config.errors[457] });
			}
		}

		var opts = {
			collection: colName,
			conditions: { 'code': req.soajs.inputmaskData.data.code.toUpperCase() }
		};
		BL.model.countEntries(req.soajs, opts, function (error, count) {
			checkReturnError(req, cbMain, { config: config, error: error, code: 400 }, function () {
				checkReturnError(req, cbMain, { config: config, error: count > 0, code: 403 }, function () {

					let condition = { 'code': process.env.SOAJS_ENV.toUpperCase() };
					if(req.soajs.inputmaskData.data.deploy && req.soajs.inputmaskData.data.deploy.previousEnvironment){
						condition = {
							'code': req.soajs.inputmaskData.data.deploy.previousEnvironment.toUpperCase(),
							'deployer.type': 'container'
						};
					}

					BL.model.findEntry(req.soajs, {
						collection: colName,
						conditions: condition
					}, function(error, envDBRecord){
						checkReturnError(req, cbMain, { config: config, error: error, code: 400 }, function () {
							var envRecord = envHelper.getDefaultRegistryServicesConfig(envDBRecord, req.soajs.inputmaskData.data);
							var record = envHelper.prepareEnvRecord(config, req.soajs.inputmaskData.data, envRecord);
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
							opts = {
								collection: colName,
								record: record
							};
							async.series({
								"insertEnvironment": function(mCb){
									BL.model.insertEntry(req.soajs, opts, mCb);
								},
								"checkTemplate": function(mCb){
									if(req.soajs.inputmaskData.template){
										delete req.soajs.inputmaskData.template.gi.deploy;
										if(req.soajs.inputmaskData.data.code.toUpperCase() === 'PORTAL'){
											req.soajs.inputmaskData.template.type = 'PORTAL';
										}
										else if(req.soajs.inputmaskData.template.controller){
											req.soajs.inputmaskData.template.type = 'SOAJS';
										}
										else{
											req.soajs.inputmaskData.template.type = 'BLANK';
										}
										BL.model.removeEntry(req.soajs, {
											collection: templatesColName,
											conditions: {
												code: req.soajs.inputmaskData.data.code.toUpperCase()
											}
										}, () => {
											BL.model.updateEntry(req.soajs, {
												collection: templatesColName,
												conditions: {
													code : req.soajs.inputmaskData.data.code.toUpperCase()
												},
												fields: {
													$set: req.soajs.inputmaskData.template,
													$unset: { error: "" }
												},
												options: {multi: false, upsert: true, safe: true}
											}, mCb);
										});
									}
									else{
										return mCb();
									}
								}
							}, (error, response) => {
								checkReturnError(req, cbMain, { config: config, error: error, code: 400 }, function () {
									//check deployment type and certificate status
									if(record.deployer.selected === 'container.docker.remote' && req.soajs.inputmaskData.data.deploy
										&& req.soajs.inputmaskData.data.deploy.previousEnvironment){
										//update certificates, push new environment
										attachCertificates(record, req.soajs.inputmaskData.data, () => {
											req.soajs.inputmaskData.code = req.soajs.inputmaskData.data.code.toUpperCase();
											statusChecker.startDeployment(req, BL, config, record, req.soajs.inputmaskData.template, (error) =>{
												checkReturnError(req, cbMain, { config: config, error: error, code: 400 }, function () {
													return cbMain(null, record._id);
												});
											});
										});
									}
									else{
										req.soajs.inputmaskData.code = req.soajs.inputmaskData.data.code.toUpperCase();
										statusChecker.startDeployment(req, BL, config, record, req.soajs.inputmaskData.template, (error) =>{
											checkReturnError(req, cbMain, { config: config, error: error, code: 400 }, function () {
												return cbMain(null, record._id);
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

		function attachCertificates(record, data, fCb){
			let opts = {
				collection: "fs.files",
				conditions: {
					"metadata.platform": "docker"
				}
			};

			opts.conditions["metadata.env." + data.deploy.previousEnvironment.toUpperCase()] = { "$exists": true };
			BL.model.findEntries(req.soajs, opts, function(error, records){
				checkReturnError(req, cbMain, { config: config, error: error, code: 400 }, function () {
					async.eachSeries(records, (oneRecord, mCb) => {
						oneRecord.metadata.env[record.code.toUpperCase()]= oneRecord.metadata.env[data.deploy.previousEnvironment.toUpperCase()];
						BL.model.saveEntry(req.soajs, {
							"collection": "fs.files",
							"record": oneRecord
						}, mCb);
					}, (error) =>{
						checkReturnError(req, cbMain, { config: config, error: error, code: 400 }, function () {
							return fCb();
						});
					});
				});
			});
		}
	},
	
	"getStatus": function(config, req, res, cbMain){
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
					}
					loadAndProcessTemplate(record);
				});
			});
		}
		
		function loadAndProcessTemplate(environmentRecord){
			BL.model.findEntry(req.soajs, {collection:templatesColName, conditions: { code: req.soajs.inputmaskData.code } }, function(error, template) {
				checkReturnError(req, cbMain, { config: config, error: error, code: 600 }, function () {
					checkReturnError(req, cbMain, { config: config, error: !template, code: 600 }, function () {
						statusChecker.checkProgress(req, BL, config, environmentRecord, template, cbMain);
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
					}
					
					BL.model.findEntry(req.soajs, {
						collection: 'templates',
						conditions: { code: record.code }
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
		var opts = {};
		validateId(req.soajs, function (err) {
			checkReturnError(req, cbMain, { config: config, error: err, code: 405 }, function () {
				opts.collection = colName;
				opts.conditions = { '_id': req.soajs.inputmaskData.id };
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
							
							BL.model.removeEntry(req.soajs, {collection: "templates", conditions: {code: record.code.toUpperCase() }}, (error) => {
								checkReturnError(req, cbMain, { config: config, error: error, code: 404 }, function () {
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
				});
			});
		});

		function deleteEnv() {
			opts = {};
			opts.collection = colName;
			opts.conditions = { '_id': req.soajs.inputmaskData.id, 'locked': { $ne: true } };
			BL.model.removeEntry(req.soajs, opts, function (error) {
				checkReturnError(req, cbMain, {
					config: config,
					error: error,
					code: 404
				}, function () {
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
				if (!req.soajs.tenant.locked) {
					opts.conditions = {
						locked: { '$ne': true }
					};
				}
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
		if (!req.soajs.tenant.locked) {
			opts.conditions = {
				locked: { '$ne': true }
			};
		}
		
		BL.model.findEntries(req.soajs, opts, function (err, records) {
			checkReturnError(req, cbMain, { config: config, error: err, code: 402 }, function () {
				return cbMain(null, records);
			});
		});
	},

	"keyUpdate": function (config, coreProvision, req, res, cbMain) {
		let provision = soajsUtils.cloneObj(req.soajs.registry.coreDB.provision);
		delete provision.registryLocation;
		const switchedConnection = BL.model.switchConnection(req.soajs);
		if (switchedConnection) {
			if (typeof  switchedConnection === 'object' && Object.keys(switchedConnection).length > 0) {
				provision = switchedConnection;
			}
		}

		coreProvision.init(provision, req.soajs.log);
		var opts = {};
		var myUrac;
		if (req.soajs.uracDriver) {
			myUrac = req.soajs.uracDriver.getProfile();
		}
		else {
			return cbMain({ code: 601, msg: config.errors[601] });
		}
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
								coreProvision.generateExtKey(oneKey.key, envRecord.services.config.key, function (error, newExtKey) {
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

							coreProvision.loadProvision(function (loaded) {
								var data;
								if (envRecord.code.toUpperCase() === process.env.SOAJS_ENV.toUpperCase()) {
									data = { 'newKeys': newKeys };
								}
								else {
									data = true;
								}
								return cbMain(null, data);
							});
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
				if (envRecord.locked) {
					if (!req.soajs.tenant.locked) {
						// return error
						return cbMain({ "code": 501, "msg": config.errors[501] });
					}
				}
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
				if (envRecord.locked) {
					if (!req.soajs.tenant.locked) {
						// return error
						return cbMain({ "code": 501, "msg": config.errors[501] });
					}
				}
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

	"uploadCerts": function (config, req, res, cbMain) {
		var form = new formidable.IncomingForm();
		form.encoding = 'utf-8';
		form.keepExtensions = true;
		form.maxFieldSize = 100 * 1024 * 1024;

		validateInput(function (error) {
			checkReturnError(req, cbMain, {
				config: config,
				error: error,
				code: ((error && error.code) ? error.code : 739)
			}, function () {
				BL.model.getDb(req.soajs).getMongoDB(function (error, db) {
					checkReturnError(req, cbMain, {
						config: config,
						error: error,
						code: 727
					}, function () {
						var gfs = Grid(db, BL.model.getDb(req.soajs).mongodb);

						form.onPart = function (part) {
							if (!part.filename) return form.handlePart(part);

							var fileData = {
								filename: part.filename,
								metadata: {
									platform: req.query.platform,
									certType: req.query.certType
								}
							};

							fileData.metadata.env = {};
							fileData.metadata.env[req.query.envCode] = [req.query.platform + '.' + req.query.driver];

							var writeStream = gfs.createWriteStream(fileData);

							part.pipe(writeStream);
							writeStream.on('error', function (error) {
								return checkReturnError(req, cbMain, {

									config: config,
									error: error,
									code: 727
								});
							});
							writeStream.on('close', function (file) {
								return cbMain(null, true);
							});
						};
						form.parse(req);
					});
				});
			});
		});

		function validateInput(cb) {
			if (!req.query.filename || !req.query.envCode || !req.query.platform) {
				return cb({ 'message': 'Missing required fields: filename OR envCode OR platform' });
			}

			if (req.query.platform === 'docker' && !req.query.driver) {
				return cb({ 'message': 'Missing required field: docker driver name' });
			}

			if (req.query.platform === 'nginx' && !req.query.label) {
				return cb({ 'message': 'Missing required field: nginx certificate label' });
			}

			return cb();
		}
	},

	"removeCert": function (config, req, res, cbMain) {
		var opts = {};
		validateId(req.soajs, function (error) {
			checkReturnError(req, cbMain, { config: config, error: error, code: 701 }, function () {
				opts.collection = "fs.files";
				opts.conditions = { _id: req.soajs.inputmaskData.id };
				BL.model.findEntry(req.soajs, opts, function (error, cert) {
					checkReturnError(req, cbMain, {
						config: config,
						error: error,
						code: 729
					}, function () {
						checkReturnError(req, cbMain, {

							config: config,
							error: !cert,
							code: 730
						}, function () {
							envHelper.deleteCerts([cert], req, 0, BL.model, function (error, result) {
								checkReturnError(req, cbMain, {
									config: config,
									error: error,
									code: 729
								}, function () {
									return cbMain(null, true);
								});
							});
						});
					});
				});
			});
		});
	},

	"chooseExistingCerts": function (config, req, res, cbMain) {
		var opts = {};
		opts.collection = colName;
		opts.conditions = { code: req.soajs.inputmaskData.env };
		BL.model.countEntries(req.soajs, opts, function (error, count) {
			checkReturnError(req, cbMain, { config: config, error: error, code: 600 }, function () {
				checkReturnError(req, cbMain, {

					config: config,
					error: count === 0,
					code: 446
				}, function () {
					async.map(req.soajs.inputmaskData.certIds, function (oneCert, callback) {
						validateCertId(req.soajs, oneCert, callback);
					}, function (error, certIds) {
						checkReturnError(req, cbMain, {

							config: config,
							error: error,
							code: 701
						}, function () {
							var criteria = {
								_id: {
									'$in': certIds
								}
							};
							opts = {};
							opts.collection = "fs.files";
							opts.conditions = criteria;
							BL.model.findEntries(req.soajs, opts, function (error, certs) {
								checkReturnError(req, cbMain, {

									config: config,
									error: error,
									code: 728
								}, function () {
									checkReturnError(req, cbMain, {
										config: config,
										error: !certs || certs.length !== req.soajs.inputmaskData.certIds.length,
										code: 730
									}, function () {
										var platformDriver = req.soajs.inputmaskData.platform + '.' + req.soajs.inputmaskData.driverName;
										certs.forEach(function (oneCert) {
											if (oneCert.metadata.env[req.soajs.inputmaskData.env]) {
												if (oneCert.metadata.env[req.soajs.inputmaskData.env].indexOf(platformDriver) === -1) { //push driver name only if it does not already exist
													oneCert.metadata.env[req.soajs.inputmaskData.env].push(platformDriver);
												}
											} else {
												oneCert.metadata.env[req.soajs.inputmaskData.env] = [];
												oneCert.metadata.env[req.soajs.inputmaskData.env].push(platformDriver);
											}
										});

										envHelper.saveUpdatedCerts(req.soajs, certs, BL.model, function (error) {
											checkReturnError(req, cbMain, {
												config: config,
												error: error,
												code: 727
											}, function () {
												return cbMain(null, true);
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
	},

	"changeSelectedDriver": function (config, req, res, cbMain) {
		var opts = {};
		var criteria = {
			code: req.soajs.inputmaskData.env.toUpperCase()
		};
		var update = {
			'$set': {
				'deployer.selected': req.soajs.inputmaskData.selected
			}
		};
		opts.collection = colName;
		opts.conditions = criteria;
		opts.fields = update;
		BL.model.updateEntry(req.soajs, opts, function (error, result) {
			checkReturnError(req, cbMain, { config: config, error: error, code: 735 }, function () {
				return cbMain(null, true);
			});
		});
	},

	"changeDeployerType": function (config, req, res, cbMain) {
		var opts = {};
		opts.collection = colName;
		opts.conditions = { code: req.soajs.inputmaskData.env };
		opts.fields = { $set: { 'deployer.type': req.soajs.inputmaskData.deployerType } };
		BL.model.updateEntry(req.soajs, opts, function (error, result) {
			checkReturnError(req, cbMain, {
				config: config,
				error: error || !result,
				code: 738
			}, function () {
				cbMain(null, true);
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
					checkIfEnvIsDeployed(envRecord, currentPlatform, function () {
						if(req.soajs.inputmaskData.config.nodes){
							envRecord.deployer.container[currentPlatform][req.soajs.inputmaskData.driver].nodes = req.soajs.inputmaskData.config.nodes;
						}
						if(currentPlatform === 'docker'){
							envRecord.deployer.container[currentPlatform][req.soajs.inputmaskData.driver].apiPort = req.soajs.inputmaskData.config.apiPort;
						}
						else{
							if(!Object.hasOwnProperty.call(req.soajs.inputmaskData.config, 'namespace')){
								envRecord.deployer.container[currentPlatform][req.soajs.inputmaskData.driver].auth.token = req.soajs.inputmaskData.config.token;
								envRecord.deployer.container[currentPlatform][req.soajs.inputmaskData.driver].nginxDeployType = req.soajs.inputmaskData.config.nginxDeployType;
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
								return cbMain(null, true);
							});
						});
					});
				});
			});
		});

		function checkIfEnvIsDeployed(envRecord, currentPlatform, cb) {
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
					checkReturnError(req, cbMain, {
						config: config,
						error: services.length > 0,
						code: 907
					}, cb);
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
