'use strict';
var colName = "environment";
var hostsColName = "hosts";
var tenantColName = "tenants";
var productColName = "products";

var Grid = require('gridfs-stream');
var formidable = require('formidable');
var async = require('async');

var deployer = require("soajs").drivers;
var utils = require("../../utils/utils.js");

var fs = require('fs');

var tenant = require('../tenant/index.js');

function validateId(soajs, cb) {
	BL.model.validateId(soajs, cb);
}

function validateCertId(soajs, oneCert, cb) {
	BL.model.validateCustomId(soajs, oneCert, cb);
}

function checkReturnError(req, mainCb, data, cb) {
	if (data.error) {
		if (typeof (data.error) === 'object' && (data.error.message || data.error.msg)) {
			req.soajs.log.error(data.error);
		}

		return mainCb({"code": data.code, "msg": data.config.errors[data.code]});
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
	opts.conditions = {'_id': soajs.inputmaskData.id};
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

var helpers = {
	listCerts: function(soajs, model, cb){
		var opts = {};
		opts.collection = "fs.files";
		opts.conditions = {};
		model.findEntries(soajs, opts, cb);
	},
	deleteCerts:function(certsArr, req, counter, model, cb){
		var envCode = req.soajs.inputmaskData.env;
		var cert = certsArr[counter];
		var opts = {};
		async.each(certsArr, function (cert, cb) {
			if (cert.metadata.env[envCode].length === 1 && Object.keys(cert.metadata.env).length === 1) { //only 1 available env and driver
				opts.collection = "fs.files";
				opts.conditions = {_id: cert._id};
				model.removeEntry(req.soajs, opts, cb);
			} else if (cert.metadata.env[envCode].length === 1 && Object.keys(cert.metadata.env).length > 1) { //other env are available but only 1 driver in selected env
				delete cert.metadata.env[envCode];
				opts.collection = "fs.files";
				opts.record = cert;
				model.saveEntry(req.soajs, opts, cb);
			} else if (cert.metadata.env[envCode].length > 1) { //several drivers exist in env
				for (var i = 0; i < cert.metadata.env[envCode].length; i++) {
					if (cert.metadata.env[envCode][i] === req.soajs.inputmaskData.driverName) {
						cert.metadata.env[envCode].splice(i, 1);
						break;
					}
				}
				opts.collection = "fs.files";
				opts.record = cert;
				model.saveEntry(req.soajs, opts, cb);
			}
		}, cb);
	},
	saveUpdatedCerts: function(soajs, certs, model, cb){
		async.each(certs, function (cert, callback) {
			var opts = {};
			opts.collection = "fs.files";
			opts.record = cert;
			model.saveEntry(soajs, opts, callback)
		}, cb);
	}
};

var BL = {
	model: null,

	"add": function (config, service, provision, dbModel, req, res, cbMain) {
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

		req.soajs.inputmaskData.code = req.soajs.inputmaskData.code.toUpperCase();
		var record = {
			"code": req.soajs.inputmaskData.code,
			"sensitive": req.soajs.inputmaskData.sensitive,
			"domain": req.soajs.inputmaskData.domain,
			"profile": config.profileLocation + "profile.js",
			"sitePrefix": req.soajs.inputmaskData.sitePrefix,
			"apiPrefix": req.soajs.inputmaskData.apiPrefix,
			"description": req.soajs.inputmaskData.description,
			"services": req.soajs.inputmaskData.services,
			"dbs": {
				"config": {},
				"databases": {}
			}
		};
		var opts = {};
		opts.collection = colName;
		opts.conditions = {'code': record.code};
		BL.model.countEntries(req.soajs, opts, function (error, count) {
			checkReturnError(req, cbMain, {config: config, error: error, code: 400}, function () {
				checkReturnError(req, cbMain, {config: config, error: count > 0, code: 403}, function () {
					var currentEnvCode = process.env.SOAJS_ENV || 'DASHBOARD';
					opts.conditions = {'code': currentEnvCode.toUpperCase()};
					BL.model.findEntry(req.soajs, opts, function (error, envRecord) {
						checkReturnError(req, cbMain, {config: config, error: error, code: 400}, function () {
							if (envRecord && envRecord.deployer) {
								record.deployer = envRecord.deployer;
							}
							else {
								record.deployer = {};
							}

							if (!record.dbs) {
								record.dbs = {};
							}
							//clone session, prefix and dbs
							record.dbs.config = envRecord.dbs.config;

							//old style
							if(envRecord.dbs.clusters){
								record.dbs.clusters = {};
								record.dbs.clusters['dash_cluster'] = envRecord.dbs.clusters.dash_cluster;
								record.dbs.config.session.cluster = "dash_cluster";
								record.dbs.config.session.name = "dash_" + envRecord.dbs.config.session.name;
							}
							//new style
							else if(!envRecord.dbs.clusters){
								record.dbs.session = envRecord.dbs.session;

								if(envRecord.dbs.session.prefix){
									record.dbs.session.prefix = envRecord.dbs.session.prefix;
								}
								record.dbs.session.cluster = "dash_cluster";
							}

							record.dbs.databases.urac = envRecord.dbs.databases.urac;
							record.dbs.databases.urac.cluster = "dash_cluster";
							record.services.config.session.secret = envRecord.services.config.session.secret;
							record.services.config.cookie.secret = envRecord.services.config.cookie.secret;
							record.services.config.oauth.grants = ['password', 'refresh_token'];
							opts = {};
							opts.collection = colName;
							opts.record = record;
							BL.model.insertEntry(req.soajs, opts, function (err, data) {
								checkReturnError(req, cbMain, {config: config, error: err, code: 400}, function () {

									//updated package acl
									var userProduct = req.soajs.tenant.application.product;
									var userPackage = req.soajs.tenant.application.package;
									var tenantId = BL.model.validateCustomId(req.soajs, req.soajs.tenant.id);
									var appId = BL.model.validateCustomId(req.soajs, req.soajs.tenant.application.appId);
									var key = req.soajs.tenant.key.iKey;

									opts = {};
									opts.collection = productColName;
									opts.conditions = {'code': userProduct, 'packages.code': userPackage};
									opts.fields = {'$set': {}};
									opts.fields.$set['packages.$.acl.' + req.soajs.inputmaskData.code.toLowerCase()] = {
										urac: {
											"access": false,
											"apisPermission": "restricted",
											"apisRegExp": [
												{
													"regExp": /^\/owner\/.+$/,
													"access": ["owner"]
												}
											]
										}
									};
									BL.model.updateEntry(req.soajs, opts, function (error) {
										checkReturnError(req, cbMain, {
											config: config,
											error: error,
											code: 400
										}, function () {
											//clone tenant application config for new env
											opts = {};
											opts.collection = tenantColName;
											opts.conditions = {'_id': tenantId};
											BL.model.findEntry(req.soajs, opts, function (error, tenantRecord) {
												checkReturnError(req, cbMain, {
													config: config,
													error: error || !tenantRecord,
													code: 400
												}, function () {
													for (var i = 0; i < tenantRecord.applications.length; i++) {
														if (tenantRecord.applications[i].appId.toString() === appId.toString()) {
															for (var j = 0; j < tenantRecord.applications[i].keys.length; j++) {
																if (tenantRecord.applications[i].keys[j].key === key) {
																	tenantRecord.applications[i].keys[j].config[req.soajs.inputmaskData.code.toLowerCase()] = tenantRecord.applications[i].keys[j].config[envRecord.code.toLowerCase()];
																	break;
																}
															}
														}
													}

													opts = {
														collection: tenantColName,
														record: tenantRecord
													};
													BL.model.saveEntry(req.soajs, opts, function (error) {
														checkReturnError(req, cbMain, {
															config: config,
															error: error,
															code: 400
														}, function () {
															//generate tenant external key for currently logged in tenant
															tenant.init(dbModel, function (error, tenantBL) {
																checkReturnError(req, cbMain, {
																	config: config,
																	error: error,
																	code: 400
																}, function () {
																	//updating inputmaskData to include required params by addApplicationExtKeys()
																	req.soajs.inputmaskData.env = req.soajs.inputmaskData.code;
																	req.soajs.inputmaskData.id = req.soajs.tenant.id;
																	req.soajs.inputmaskData.appId = req.soajs.tenant.application.appId;
																	req.soajs.inputmaskData.key = req.soajs.tenant.key.iKey;
																	// todo: check if error
																	tenantBL.addApplicationExtKeys(config, provision, service.registry, req, res, function (error, result) {
																		return cbMain(error, data);
																	});
																});
															});
														});
													});
												});
											});
										});
									})
								});
							});
						});
					});
				});
			});
		});
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
                checkReturnError(req, cbMain, {config: config, error: err, code: 405}, function () {
                    opts.conditions['_id'] = req.soajs.inputmaskData.id;
                    getEnv();
                });
            });
        }

        function getEnv() {
            BL.model.findEntry(req.soajs, opts, function (error, record) {
                checkReturnError(req, cbMain, {config: config, error: error, code: 600}, function () {
                    checkReturnError(req, cbMain, {config: config, error: !record, code: 402}, function () {
                        return cbMain(null, record);
                    });
                });
            });
        }
    },

	"delete": function (config, req, res, cbMain) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkReturnError(req, cbMain, {config: config, error: err, code: 405}, function () {
				opts.collection = colName;
				opts.conditions = {'_id': req.soajs.inputmaskData.id};
				BL.model.findEntry(req.soajs, opts, function (error, record) {
					checkReturnError(req, cbMain, {config: config, error: error || !record, code: 404}, function () {
						checkReturnError(req, cbMain, {config: config, error: record.locked, code: 500}, function () { // return error msg that this record is locked
							if (record.deployer.type === 'manual') {
								checkManualDeployments(record, deleteEnv);
							}
							else {
								checkContainerDeployments(record, deleteEnv);
							}
						});
					});
				});
			});
		});

		function deleteEnv() {
			opts = {};
			opts.collection = colName;
			opts.conditions = {'_id': req.soajs.inputmaskData.id, 'locked': {$ne: true}};
			BL.model.removeEntry(req.soajs, opts, function (error) {
				checkReturnError(req, cbMain, {config: config, error: error, code: 404}, function () {
					return cbMain(null, "environment delete successful");
				});
			});
		}

		function checkManualDeployments(envRecord, cb) {
			opts = {};
			opts.collection = hostsColName;
			opts.conditions = {env: envRecord.code.toLowerCase()};
			BL.model.countEntries(req.soajs, opts, function (error, count) {
				checkReturnError(req, cbMain, {config: config, error: error, code: 402}, function () {
					checkReturnError(req, cbMain, {config: config, error: count > 0, code: 906}, cb);
				});
			});
		}

		function checkContainerDeployments(envRecord, cb) {
			var options = utils.buildDeployerOptions(envRecord, req.soajs, BL);
			options.params = {env: envRecord.code.toLowerCase()};
			deployer.listServices(options, function (error, services) {
				utils.checkErrorReturn(req.soajs, cbMain, {config: config, error: error}, function () { //utils.checkErrorReturn() is used to handle driver errors
					checkReturnError(req, cbMain, {config: config, error: services.length > 0, code: 906}, cb);
				});
			});
		}
	},

	"update": function (config, req, res, cbMain) {
		validateId(req.soajs, function (err) {
			checkReturnError(req, cbMain, {config: config, error: err, code: 405}, function () {
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
				var s = {
					'$set': {
						"domain": req.soajs.inputmaskData.domain,
						"apiPrefix": req.soajs.inputmaskData.apiPrefix,
						"sitePrefix": req.soajs.inputmaskData.sitePrefix,
						"description": req.soajs.inputmaskData.description,
						"sensitive": req.soajs.inputmaskData.sensitive,
						"services": req.soajs.inputmaskData.services,
						"profile": config.profileLocation + "profile.js"
					}
				};
				
				if(req.soajs.inputmaskData.portalPrefix){
					s['$set']["portalPrefix"] = req.soajs.inputmaskData.portalPrefix;
				}
				
				if (req.soajs.inputmaskData.custom) {
					s['$set']['custom'] = req.soajs.inputmaskData.custom;
				}
				
				var opts = {};
				opts.collection = colName;
				opts.conditions = {"_id": req.soajs.inputmaskData.id};
				opts.fields = s;
				opts.options = {'upsert': false, 'safe': true};
				BL.model.updateEntry(req.soajs, opts, function (err, data) {
					checkReturnError(req, cbMain, {config: config, error: err, code: 401}, function () {
						return cbMain(null, "environment update successful");
					});
				});
			});
		});
	},

	"list": function (config, req, res, cbMain) {
		// todo: check where it's called
		var opts = {};
		opts.collection = colName;
		BL.model.findEntries(req.soajs, opts, function (err, records) {
			checkReturnError(req, cbMain, {config: config, error: err, code: 402}, function () {
				opts.collection = "analytics";
				opts.conditions = {"_type": "settings"};
				BL.model.findEntry(req.soajs, opts, function (error, analyticsRecord){
					//check if analytics is turned on for each environment
					//if turned on, add it to the records variable
					if (analyticsRecord && analyticsRecord.env){
						records.forEach(function(record){
							let recordEnv = record.code.toLowerCase();
							record.analytics = false;
							if (analyticsRecord.env[recordEnv]) {
								record.analytics = true;
							}
						});
					}
                    return cbMain(null, records);
				});
			});
		});
	},

	"keyUpdate": function (config, provision, req, res, cbMain) {
		provision.init(req.soajs.registry.coreDB.provision, req.soajs.log);
		var opts = {};
		var myUrac;
		if (req.soajs.uracDriver) {
			myUrac = req.soajs.uracDriver.getProfile();
		}
		else {
			return cbMain({code: 601, msg: config.errors[601]});
		}
		checkCanEdit(req.soajs, function (error) {
			checkReturnError(req, cbMain, {config: config, error: error, code: error}, function () {
				validateId(req.soajs, function (err) {
					checkReturnError(req, cbMain, {config: config, error: err, code: 405}, function () {
						//get environment record
						opts.collection = colName;
						opts.conditions = {'_id': req.soajs.inputmaskData.id};
						opts.options = {upsert: false, safe: true, multi: false};
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
									conditions: {'_id': req.soajs.inputmaskData.id}
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
								provision.generateExtKey(oneKey.key, envRecord.services.config.key, function (error, newExtKey) {
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
				checkReturnError(req, cbMain, {config: config, error: error, code: 600}, function () {
					//update tenant records in db
					async.each(updatedRecords, function (oneTenant, mCb) {
						opts = {
							collection: tenantColName,
							record: oneTenant
						};
						BL.model.saveEntry(req.soajs, opts, mCb);
					}, function (error) {
						checkReturnError(req, cbMain, {config: config, error: error, code: 600}, function () {

							provision.loadProvision(function (loaded) {
								var data;
								if (envRecord.code.toUpperCase() === process.env.SOAJS_ENV.toUpperCase()) {
									data = {'newKeys': newKeys};
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
		opts.conditions = {'code': req.soajs.inputmaskData.env.toUpperCase()};
		BL.model.findEntry(req.soajs, opts, function (err, envRecord) {
			checkReturnError(req, cbMain, {config: config, error: err || !envRecord, code: 402}, function () {
				return cbMain(null, envRecord.dbs);
			});
		});
	},

	"addDb": function (config, req, res, cbMain) {
		if (req.soajs.inputmaskData.name === 'session') {
			if (!req.soajs.inputmaskData.sessionInfo || JSON.stringify(req.soajs.inputmaskData.sessionInfo) === '{}') {
				return cbMain({"code": 507, "msg": config.errors[507]});
			}
		}
		var opts = {};
		opts.collection = colName;
		opts.conditions = {'code': req.soajs.inputmaskData.env.toUpperCase()};

		//check in old schema
		BL.model.findEntry(req.soajs, opts, function (err, envRecord) {
			checkReturnError(req, cbMain, {config: config, error: err || !envRecord, code: 402}, function () {
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
				}, function(error, resource){
					checkReturnError(req, cbMain, {config: config, error: error || !resource, code: 502}, function () {
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
									checkReturnError(req, cbMain, {config: config, error: err, code: 503}, function () {
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
									checkReturnError(req, cbMain, {config: config, error: err, code: 503}, function () {
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
				return cbMain({"code": 507, "msg": config.errors[507]});
			}
		}
		var opts = {};
		opts.collection = colName;
		opts.conditions = {'code': req.soajs.inputmaskData.env.toUpperCase()};
		BL.model.findEntry(req.soajs, opts, function (err, envRecord) {
			checkReturnError(req, cbMain, {config: config, error: err || !envRecord, code: 402}, function () {

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
				}, function(error, resource){
					checkReturnError(req, cbMain, {config: config, error: error || !resource, code: 502}, function () {
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

								if(req.soajs.inputmaskData.prefix && req.soajs.inputmaskData.prefix !== ''){
									envRecord.dbs.session['prefix'] = req.soajs.inputmaskData.prefix;
								}

								opts = {};
								opts.collection = colName;
								opts.record = envRecord;
								BL.model.saveEntry(req.soajs, opts, function (err) {
									checkReturnError(req, cbMain, {config: config, error: err, code: 513}, function () {
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

								if(req.soajs.inputmaskData.prefix && req.soajs.inputmaskData.prefix !== ''){
									envRecord.dbs.databases[req.soajs.inputmaskData.name]['prefix'] = req.soajs.inputmaskData.prefix;
								}

								opts = {};
								opts.collection = colName;
								opts.record = envRecord;
								BL.model.saveEntry(req.soajs, opts, function (err) {
									checkReturnError(req, cbMain, {config: config, error: err, code: 513}, function () {
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
		opts.conditions = {'code': req.soajs.inputmaskData.env.toUpperCase()};
		BL.model.findEntry(req.soajs, opts, function (err, envRecord) {
			checkReturnError(req, cbMain, {config: config, error: err || !envRecord, code: 402}, function () {
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
							checkReturnError(req, cbMain, {config: config, error: err, code: 514}, function () {
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
							checkReturnError(req, cbMain, {config: config, error: err, code: 514}, function () {
								return cbMain(null, "environment database removed successful");
							});
						});
					});
				}
			});
		});
	},

	"updateDbsPrefix": function (config, req, res, cbMain) {
		var prefix = {"dbs.config.prefix": req.soajs.inputmaskData.prefix};
		var opts = {};
		opts.collection = colName;
		opts.conditions = {'code': req.soajs.inputmaskData.env.toUpperCase()};
		opts.fields = {"$set": prefix};
		opts.options = {'upsert': false, 'safe': true};
		BL.model.updateEntry(req.soajs, opts, function (err) {
			checkReturnError(req, cbMain, {config: config, error: err, code: 402}, function () {
				return cbMain(null, "environment Database prefix update successful");
			});
		});
	},

	"listPlatforms": function (config, req, res, cbMain) {
		req.soajs.inputmaskData.env = req.soajs.inputmaskData.env.toUpperCase();
		var opts = {};
		opts.collection = colName;
		opts.conditions = {'code': req.soajs.inputmaskData.env};
		BL.model.findEntry(req.soajs, opts, function (error, envRecord) {
			checkReturnError(req, cbMain, {config: config, error: error || !envRecord, code: 402}, function () {
				helpers.listCerts(req.soajs, BL.model, function (error, certs) {
					checkReturnError(req, cbMain, {config: config, error: error, code: 732}, function () {
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
					checkReturnError(req, cbMain, {config: config, error: error, code: 727}, function () {
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
								return checkReturnError(req, cbMain, {config: config, error: error, code: 727});
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
				return cb({'message': 'Missing required fields: filename OR envCode OR platform'});
			}

			if (req.query.platform === 'docker' && !req.query.driver) {
				return cb({'message': 'Missing required field: docker driver name'});
			}

			if (req.query.platform === 'nginx' && !req.query.label) {
				return cb({'message': 'Missing required field: nginx certificate label'});
			}

			return cb();
		}
	},

	"removeCert": function (config, req, res, cbMain) {
		var opts = {};
		validateId(req.soajs, function (error) {
			checkReturnError(req, cbMain, {config: config, error: error, code: 701}, function () {
				opts.collection = "fs.files";
				opts.conditions = {_id: req.soajs.inputmaskData.id};
				BL.model.findEntry(req.soajs, opts, function (error, cert) {
					checkReturnError(req, cbMain, {config: config, error: error, code: 729}, function () {
						checkReturnError(req, cbMain, {config: config, error: !cert, code: 730}, function () {
							helpers.deleteCerts([cert], req, 0, BL.model, function (error, result) {
								checkReturnError(req, cbMain, {config: config, error: error, code: 729}, function () {
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
		opts.conditions = {code: req.soajs.inputmaskData.env};
		BL.model.countEntries(req.soajs, opts, function (error, count) {
			checkReturnError(req, cbMain, {config: config, error: error, code: 600}, function () {
				checkReturnError(req, cbMain, {config: config, error: count === 0, code: 446}, function () {
					async.map(req.soajs.inputmaskData.certIds, function (oneCert, callback) {
						validateCertId(req.soajs, oneCert, callback);
					}, function (error, certIds) {
						checkReturnError(req, cbMain, {config: config, error: error, code: 701}, function () {
							var criteria = {
								_id: {
									'$in': certIds
								}
							};
							opts = {};
							opts.collection = "fs.files";
							opts.conditions = criteria;
							BL.model.findEntries(req.soajs, opts, function (error, certs) {
								checkReturnError(req, cbMain, {config: config, error: error, code: 728}, function () {
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

										helpers.saveUpdatedCerts(req.soajs, certs, BL.model, function (error) {
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
			checkReturnError(req, cbMain, {config: config, error: error, code: 735}, function () {
				return cbMain(null, true);
			});
		});
	},

	"changeDeployerType": function (config, req, res, cbMain) {
		var opts = {};
		opts.collection = colName;
		opts.conditions = {code: req.soajs.inputmaskData.env};
		opts.fields = {$set: {'deployer.type': req.soajs.inputmaskData.deployerType}};
		BL.model.updateEntry(req.soajs, opts, function (error, result) {
			checkReturnError(req, cbMain, {config: config, error: error || !result, code: 738}, function () {
				cbMain(null, true);
			});
		});
	},

	/**
	 * Updates environment deployer configuration
	 * NOTE: this function currently supports updating kubernetes namespace configuration only
	 *         future updates might require changing the function to support different deployer configs for swarm || kubernetes
	 *
	 * @param {Object} config
	 * @param {Request Object} req
	 * @param {Response Object} res
	 */
	"updateDeployerConfig": function (config, req, res, cbMain) {
		var opts = {};
		opts.collection = colName;
		opts.conditions = {code: req.soajs.inputmaskData.env.toUpperCase()};
		BL.model.findEntry(req.soajs, opts, function (error, envRecord) {
			checkReturnError(req, cbMain, {config: config, error: error, code: 600}, function () {
				checkReturnError(req, cbMain, {config: config, error: !envRecord, code: 402}, function () {
					var currentPlatform = ((envRecord.deployer && envRecord.deployer.selected) ? envRecord.deployer.selected.split('.')[1] : '');
					checkReturnError(req, cbMain, {
						config: config,
						error: (currentPlatform !== 'kubernetes'),
						code: 908
					}, function () {
						checkIfEnvIsDeployed(function () {
							opts.conditions = {code: req.soajs.inputmaskData.env.toUpperCase()};
							opts.fields = {$set: {}};
							opts.fields.$set['deployer.container.kubernetes.' + req.soajs.inputmaskData.driver + '.namespace'] = {
								default: req.soajs.inputmaskData.config.namespace.default,
								perService: req.soajs.inputmaskData.config.namespace.perService
							};
							BL.model.updateEntry(req.soajs, opts, function (error) {
								checkReturnError(req, cbMain, {config: config, error: error, code: 600}, function () {
									return cbMain(null, true);
								});
							});
						});
					});
				});
			});
		});

		function checkIfEnvIsDeployed(cb) {
			/**
			 * checking if a given environment is deployed can only be done using the dashboard env
			 * if an environment is not deployed, its controller won't be available to serve kubernetes proxy requests
			 * thus if the target env is not deployed (which is the purpose of this check), this function will not work when using the target environment's deployer
			 */
			opts.conditions = {code: 'DASHBOARD'};
			BL.model.findEntry(req.soajs, opts, function (error, envRecord) {
				checkReturnError(req, cbMain, {config: config, error: error, code: 600}, function () {
					checkReturnError(req, cbMain, {config: config, error: !envRecord, code: 402}, function () {
						var options = utils.buildDeployerOptions(envRecord, req.soajs, BL);
						options.params = {env: req.soajs.inputmaskData.env.toUpperCase()};
						deployer.listServices(options, function (error, services) {
							utils.checkErrorReturn(req.soajs, cbMain, {config: config, error: error}, function () { //utils.checkErrorReturn() is used to handle driver errors
								checkReturnError(req, cbMain, {
									config: config,
									error: services.length > 0,
									code: 907
								}, cb);
							});
						});
					});
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
