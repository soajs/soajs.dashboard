'use strict';
var colName = "environment";
var tenantColName = "tenants";
var dashExtKeysColName = "dashboard_extKeys";

var Grid = require('gridfs-stream');
var formidable = require('formidable');
var async = require('async');

var fs = require('fs');

function validateId(soajs, cb) {
	BL.model.validateId(soajs, cb);
}

function validateCertId(soajs, oneCert, cb) {
	BL.model.validateCustomId(soajs, oneCert, cb);
}

function saveUpdatedCerts(soajs, certs, cb) {
	async.each(certs, function (cert, callback) {
		var opts = {};
		opts.collection = "fs.files";
		opts.record = cert;
		BL.model.saveEntry(soajs, opts, callback)
	}, cb);
}


function checkIfError(req, res, data, cb) {
	if (data.error) {
		if (typeof (data.error) === 'object' && (data.error.message || data.error.msg)) {
			req.soajs.log.error(data.error);
		}

		return res.jsonp(req.soajs.buildResponse({"code": data.code, "msg": data.config.errors[data.code]}));
	} else {
		if (cb) return cb();
	}
}

function deleteCerts(certsArr, req, counter, cb) {
	var envCode = req.soajs.inputmaskData.env;
	var cert = certsArr[counter];
	var opts = {};
	async.each(certsArr, function (cert, cb) {
		if (cert.metadata.env[envCode].length === 1 && Object.keys(cert.metadata.env).length === 1) { //only 1 available env and driver
			opts.collection = "fs.files";
			opts.conditions = {_id: cert._id};
			BL.model.removeEntry(req.soajs, opts, cb);
		} else if (cert.metadata.env[envCode].length === 1 && Object.keys(cert.metadata.env).length > 1) { //other env are available but only 1 driver in selected env
			delete cert.metadata.env[envCode];
			opts.collection = "fs.files";
			opts.record = cert;
			BL.model.saveEntry(req.soajs, opts, cb);
		} else if (cert.metadata.env[envCode].length > 1) { //several drivers exist in env
			for (var i = 0; i < cert.metadata.env[envCode].length; i++) {
				if (cert.metadata.env[envCode][i] === req.soajs.inputmaskData.driverName) {
					cert.metadata.env[envCode].splice(i, 1);
					break;
				}
			}
			opts.collection = "fs.files";
			opts.record = cert;
			BL.model.saveEntry(req.soajs, opts, cb);
		}
	}, cb);
}

function listCerts (soajs, cb) {
	var opts = {};
	opts.collection = "fs.files";
	opts.conditions = {};
	BL.model.findEntries(soajs, opts, cb);
}

var BL = {
	model : null,

	"add": function (config, req, res) {
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
			"domain": req.soajs.inputmaskData.domain,
			"profile": config.profileLocation + "profile.js",
			"sitePrefix": req.soajs.inputmaskData.sitePrefix,
			"apiPrefix": req.soajs.inputmaskData.apiPrefix,
			"description": req.soajs.inputmaskData.description,
			"services": req.soajs.inputmaskData.services,
			"deployer": req.soajs.inputmaskData.deployer,
			"dbs": {
				"clusters": {},
				"config": {},
				"databases": {}
			}
		};
		var opts = {};
		opts.collection = colName;
		opts.conditions = {'code': record.code};
		BL.model.countEntries(req.soajs, opts, function (error, count) {
			checkIfError(req, res, {config: config, error: error, code: 400}, function () {
				checkIfError(req, res, {config: config, error: count > 0, code: 403}, function () {
					opts = {};
					opts.collection = colName;
					opts.record = record;
					BL.model.insertEntry(req.soajs, opts, function (err, data) {
						checkIfError(req, res, {config: config, error: err, code: 400}, function () {
							return res.jsonp(req.soajs.buildResponse(null, data));
						});
					});
				});
			});
		});
	},

	"delete": function (config, req, res) {
		validateId(req.soajs, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 405}, function () {
				var opts = {};
				opts.collection = colName;
				opts.conditions = {'_id': req.soajs.inputmaskData.id, 'locked': true};
				BL.model.findEntry(req.soajs, opts, function (error, record) {
					checkIfError(req, res, {config: config, error: error, code: 404}, function () {
						checkIfError(req, res, {config: config, error: record, code: 500}, function () { // return error msg that this record is locked
							opts = {};
							opts.collection = colName;
							opts.conditions = {'_id': req.soajs.inputmaskData.id, 'locked': {$ne: true}};
							BL.model.removeEntry(req.soajs, opts, function (error) {
								checkIfError(req, res, {config: config, error: error, code: 404}, function () {
									return res.jsonp(req.soajs.buildResponse(null, "environment delete successful"));
								});
							});
						});
					});
				});
			});
		});
	},

	"update": function (config, req, res) {
		validateId(req.soajs, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 405}, function () {
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

				var s = {
					'$set': {
						"domain": req.soajs.inputmaskData.domain,
						"apiPrefix": req.soajs.inputmaskData.apiPrefix,
						"sitePrefix": req.soajs.inputmaskData.sitePrefix,
						"description": req.soajs.inputmaskData.description,
						"services": req.soajs.inputmaskData.services,
						"profile": config.profileLocation + "profile.js"
					}
				};
				if (req.soajs.inputmaskData.custom) {
					s['$set']['custom'] = req.soajs.inputmaskData.custom;
				}
				var opts = {};
				opts.collection = colName;
				opts.conditions = {"_id": req.soajs.inputmaskData.id};
				opts.fields = s;
				opts.options = {'upsert': false,'safe': true};
				BL.model.updateEntry(req.soajs, opts, function (err, data) {
					checkIfError(req, res, {config: config, error: err, code: 401}, function () {
						return res.jsonp(req.soajs.buildResponse(null, "environment update successful"));
					});
				});
			});
		});
	},

	"list": function (config, req, res, cb) {
		var opts = {};
		opts.collection = colName;
		BL.model.findEntries(req.soajs, opts, function (err, records) {
			checkIfError(req, res, {config: config, error: err, code: 402}, function () {
				if (cb && typeof(cb) === 'function') {
					return cb(records);
				}
				else {
					return res.jsonp(req.soajs.buildResponse(null, records));
				}
			});
		});
	},

	"keyUpdate": function (config, req, res) {
		/*
		 1. Get Tenant Record based on current tenant id
		 2. Deprecate old external keys
		 2.1 Deprecate old external keys for all tenants for this environment
		 2.2 Store and remove dashboard external keys for this environment
		 3. Generate New Key
		 2.1 Get all apps and keys available for this tenant
		 2.2 Generate new keys via provision.generateInternalKey()
		 2.3 Clone the config from the current keys to the newly generated ones
		 4. Update Tenant - add the new keys
		 5. Generate New External Key
		 4.1 Get the current external keys available and the dashboard external key
		 4.2 Clone the device, geo, and expDate values from the current ext key to the new one
		 4.3 Generate new external keys for the specified environment using the newly set algorithm and password
		 4.3.1 Replace the dashboard external key with the new external key that was generated
		 6. Update Tenant - add the new external keys
		 7. Update Environment
		 6.1 Update the env record to include the new algorithm and password
		 6.2 In case of error
		 6.2.1 Restore old external keys (set deprecated = false)
		 6.2.2 Restore old dashboard external keys
		 8. Load Provision
		 9. If update was for dashboard environment return new ext key in response | else return true
		 */
		var provision = require("soajs/modules/soajs.provision");
		provision.init(req.soajs.registry.coreDB.provision, req.soajs.log);
		var oldDashExtKeys = [];
		var opts = {};
		var myUrac = req.soajs.session.getUrac();
		checkIfError(req, res, {config: config, error: myUrac.tenant.id !== req.soajs.tenant.id, code: 781}, function () {
			validateId(req.soajs, function (err) {
				checkIfError(req, res, {config: config, error: err, code: 405}, function () {
					//get environment record
					opts.collection = colName;
					opts.conditions = {'_id': req.soajs.inputmaskData.id};
					BL.model.findEntry(req.soajs, opts, function (error, envRecord) {
						checkIfError(req, res, {config: config, error: error || !envRecord, code: 446}, function () {
							//get tenant record
							opts = {};
							opts.collection = tenantColName;
							opts.conditions = {'_id': BL.model.validateCustomId(req.soajs, req.soajs.tenant.id)};
							BL.model.findEntry(req.soajs, opts, function (error, tenantRecord) {
								checkIfError(req, res, {config: config, error: error || !tenantRecord, code: 438}, function () {
									//verify that tenant is locked
									checkIfError(req, res, {config: config, error: !tenantRecord.locked, code: 781}, function () {
										//get current dashboard ext key
										getDashboardExtKey(tenantRecord, envRecord, function (error, dashExtKey) {
											checkIfError(req, res, {config: config, error: error, code: 600}, function () {
												//deprecate old external keys for this environment
												updateExtKeys(envRecord, {deprecate: true}, function (error) {
													checkIfError(req, res, {config: config, error: error, code: 600}, function () {
														//generate new keys and external keys for this tenant
														generateKeysForTenantApps(tenantRecord, envRecord, dashExtKey, function (error, newKeys) {
															checkIfError(req, res, {config: config, error: error, code: 436}, function () {
																//update environment
																updateEnvironment(function (envUpdateError) {
																	if (envUpdateError) {
																		//restore old external keys
																		updateExtKeys(envRecord, {deprecate: false, restore: true}, function (error) {
																			checkIfError(req, res, {config: config, error: error, code: 600}, function () {
																				return res.jsonp(req.soajs.buildResponse({code: 600, msg: config.errors[600]}));
																			});
																		});
																	}
																	else {
																		provision.loadProvision(function (loaded) {
																			var data;
																			if (envRecord.code.toLowerCase() === 'dashboard') {
																				data = {'newKeys': newKeys};
																			}
																			else {
																				data = true;
																			}
																			return res.jsonp(req.soajs.buildResponse(null, data));
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
								});
							});
						});
					});
				});
			});
		});

		function generateKeysForTenantApps (tenantRecord, envRecord, dashExtKey, cb) {
			var newAppKeys = {};
			async.each(tenantRecord.applications, function (oneApp, callback) {
				//generate new key
				generateNewKey(provision, tenantRecord, oneApp, function (error, newKeys, updatedTenantRecord) {
					if (error) {
						return callback(error);
					}

					//generate new external key
					generateNewExtKey(provision, updatedTenantRecord, envRecord, oneApp, newKeys, dashExtKey, function (error, newKeys) {
						if (error) {
							return callback(error);
						}

						newAppKeys[oneApp.appId.toString()] = {
							package: oneApp.package,
							newKeys: newKeys
						};
						return callback();
					});
				});
			}, function (error) {
				return cb(error, newAppKeys);
			});
		}

		function updateExtKeys(envRecord, options, cb) {
			var deprecate = options.deprecate;
			var restore = options.restore;
			var criteria = {
				'applications.keys.extKeys.env': envRecord.code.toUpperCase()
			};
			opts = {};
			opts.collection = tenantColName;
			opts.conditions = criteria;
			BL.model.findEntries(req.soajs, opts, function (error, records) {
				if (error) {
					return cb(error);
				}

				async.each(records, function (oneRecord, callback) {
					oneRecord.applications.forEach(function (oneApp) {
						oneApp.keys.forEach(function (oneKey) {
							for (var i = 0; i < oneKey.extKeys.length; i++) {
								if (oneKey.extKeys[i].env === envRecord.code.toUpperCase()) {
									if (deprecate) {
										oneKey.extKeys[i].deprecated = deprecate;
									}
									else if (restore) {
										if (oneKey.extKeys[i].deprecated) {
											//old key that was deprecated before creating new ext keys with the new encryption
											delete oneKey.extKeys[i].deprecated;
										}
										else {
											//new ext key, added using the new encryption
											oneKey.extKeys.splice(i, 1);
											i--;
										}

									}
								}
							}
						});
					});
					opts = {};
					opts.collection = tenantColName;
					opts.record = oneRecord;
					BL.model.saveEntry(req.soajs, opts, callback);
				}, function (error) {
					if (deprecate) {
						opts = {};
						opts.collection = dashExtKeysColName;
						opts.conditions = {env: envRecord.code.toUpperCase()};
						BL.model.findEntries(req.soajs, opts, function (error, extKeys) {
							if (error) {
								return cb(error);
							}

							oldDashExtKeys = extKeys;
							opts = {};
							opts.collection = dashExtKeysColName;
							opts.conditions = {env: envRecord.code.toUpperCase()};
							BL.model.removeEntry(req.soajs, opts, cb);
						});
					}
					else if (restore) {
						if (oldDashExtKeys.length > 0) {
							opts = {};
							opts.collection = dashExtKeysColName;
							opts.conditions = {env: envRecord.code.toUpperCase()};
							BL.model.removeEntry(req.soajs, opts, function (error) {
								if (error) {
									return cb(error);
								}
								opts = {};
								opts.collection = dashExtKeysColName;
								opts.record = oldDashExtKeys;
								BL.model.insertEntry(req.soajs, opts, cb);
							});
						}
						else {
							return cb();
						}
					}
				});
			});
		}

		function updateTenantRecord(tenantRecord, cb) {
			opts = {};
			opts.collection = tenantColName;
			opts.record = tenantRecord;
			BL.model.saveEntry(req.soajs, opts, cb);
		}

		function generateNewKey (provision, tenantRecord, oneApp, cb) {
			var newKeys = [];
			async.map(oneApp.keys, function (oneKey, callback) {
				//generate new internal keys
				provision.generateInternalKey(function (error, internalKey) {
					if (error) {
						return callback(error);
					}
					//clone config from old key to new
					var newKey = {
						key: internalKey,
						config: oneKey.config,
						extKeys: []
					};
					//add the key that was cloned from this key
					oneKey.clone = newKey.key;
					newKeys.push(newKey);
					return callback(null, oneKey);
				});
			}, function (error, deprecatedKeys) {
				if (error) {
					return cb(error);
				}
				//update tenant record with the deprecated and new keys
				for (var i = 0; i < tenantRecord.applications.length; i++) {
					if (tenantRecord.applications[i].appId === oneApp.appId) {
						tenantRecord.applications[i].keys = deprecatedKeys.concat(newKeys);
						break;
					}
				}
				//update tenant record
				updateTenantRecord(tenantRecord, function (error) {
					if (error) {
						return cb(error);
					}

					return cb(null, {old: deprecatedKeys, new: newKeys}, tenantRecord);
				});
			});
		}

		function generateNewExtKey(provision, tenantRecord, envRecord, oneApp, keys, dashExtKey, cb) {
			async.each(keys.old, function (oneKey, callback) {
				async.each(oneKey.extKeys, function (oneExtKey, extCallback) {
					if (oneExtKey.env === envRecord.code.toUpperCase()) {
						var newInternalKey = oneKey.clone;
						provision.generateExtKey(newInternalKey, {
							algorithm: req.soajs.inputmaskData.algorithm,
							password: req.soajs.inputmaskData.password
						}, function (error, extKeyValue) {
							if (error) {
								return extCallback(error);
							}
							var newExtKey = {
								device: oneExtKey.device,
								geo: oneExtKey.geo,
								expDate: oneExtKey.expDate,
								env: oneExtKey.env,
								extKey: extKeyValue
							};
							delete oneKey.clone;
							//deprecate old external key
							oneExtKey.deprecated = true;
							for (var i = 0; i < keys.new.length; i++) {
								if (keys.new[i].key === newInternalKey) {
									keys.new[i].extKeys.push(newExtKey);
									break;
								}
							}
							if (dashExtKey && oneExtKey.extKey === dashExtKey.key && oneExtKey.env === dashExtKey.env) {
								return updateDashboardExtKey(tenantRecord, envRecord, newExtKey.extKey, extCallback);
							}
							else {
								return extCallback();
							}
						});
					}
					else {
						return extCallback();
					}
				}, callback);
			}, function (error, oldKeys) {
				if (error) {
					return cb(error);
				}
				for (var i = 0; i < tenantRecord.applications.length; i++) {
					if (tenantRecord.applications[i].appId === oneApp.appId) {
						tenantRecord.applications[i].keys = keys.old.concat(keys.new);
						break;
					}
				}
				updateTenantRecord(tenantRecord, function (error) {
					if (error) {
						return cb(error);
					}
					return cb(null, keys.new);
				});
			});
		}

		function updateEnvironment(cb) {
			var s = {
				'$set': {
					"services.config.key.algorithm": req.soajs.inputmaskData.algorithm,
					"services.config.key.password": req.soajs.inputmaskData.password
				}
			};
			opts = {};
			opts.collection = colName;
			opts.conditions = {"_id": req.soajs.inputmaskData.id};
			opts.fields = s;
			opts.options = {'upsert': false,'safe': true};
			BL.model.updateEntry(req.soajs, opts, cb);
		}

		function updateDashboardExtKey(tenantRecord, envRecord, newExtKey, cb) {
			if (!newExtKey) return cb(null, true);

			var criteria = {
				env: envRecord.code.toUpperCase(),
				code: tenantRecord.code.toUpperCase()
			};
			var update = {
				'$set': {
					key: newExtKey
				}
			};
			opts = {};
			opts.collection = dashExtKeysColName;
			opts.conditions = criteria;
			opts.fields = update;
			opts.options = {upsert: true, safe: true};
			BL.model.updateEntry(req.soajs, opts, cb);
		}

		function getDashboardExtKey(tenantRecord, envRecord, cb) {
			var criteria = {
				env: envRecord.code.toUpperCase(),
				code: tenantRecord.code.toUpperCase()
			};
			opts = {};
			opts.collection = dashExtKeysColName;
			opts.conditions = criteria;
			BL.model.findEntry(req.soajs, opts, cb);
		}
	},

	"listDbs": function (config, req, res) {
		var opts = {};
		opts.collection = colName;
		opts.conditions = {'code': req.soajs.inputmaskData.env.toUpperCase()};
		BL.model.findEntry(req.soajs, opts, function (err, envRecord) {
			checkIfError(req, res, {config: config, error: err || !envRecord, code: 402}, function () {
				return res.jsonp(req.soajs.buildResponse(null, envRecord.dbs));
			});
		});
	},

	"addDb": function (config, req, res) {
		if (req.soajs.inputmaskData.name === 'session') {
			if (!req.soajs.inputmaskData.sessionInfo || JSON.stringify(req.soajs.inputmaskData.sessionInfo) === '{}') {
				return res.jsonp(req.soajs.buildResponse({"code": 507, "msg": config.errors[507]}));
			}
		}
		var opts = {};
		opts.collection = colName;
		opts.conditions = {'code': req.soajs.inputmaskData.env.toUpperCase()};
		BL.model.findEntry(req.soajs, opts, function (err, envRecord) {
			checkIfError(req, res, {config: config, error: err || !envRecord, code: 402}, function () {
				var clusters = Object.keys(envRecord.dbs.clusters);
				checkIfError(req, res, {
					config: config,
					error: clusters.indexOf(req.soajs.inputmaskData.cluster) === -1,
					code: 502
				}, function () {
					//check if this is the session
					if (req.soajs.inputmaskData.name === 'session') {
						checkIfError(req, res, {
							config: config,
							error: envRecord.dbs.config.session && JSON.stringify(envRecord.dbs.config.session) !== '{}',
							code: 510
						}, function () {
							envRecord.dbs.config.session = {
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
								checkIfError(req, res, {config: config, error: err, code: 503}, function () {
									return res.jsonp(req.soajs.buildResponse(null, "environment database added successful"));
								});
							});
						});
					}
					else {
						checkIfError(req, res, {
							config: config,
							error: envRecord.dbs.databases[req.soajs.inputmaskData.name],
							code: 509
						}, function () {
							//otherwise
							envRecord.dbs.databases[req.soajs.inputmaskData.name] = {
								'cluster': req.soajs.inputmaskData.cluster,
								'tenantSpecific': req.soajs.inputmaskData.tenantSpecific || false
							};
							opts = {};
							opts.collection = colName;
							opts.record = envRecord;
							BL.model.saveEntry(req.soajs, opts, function (err) {
								checkIfError(req, res, {config: config, error: err, code: 503}, function () {
									return res.jsonp(req.soajs.buildResponse(null, "environment database added successful"));
								});
							});
						});
					}
				});
			});
		});
	},

	"updateDb": function (config, req, res) {
		if (req.soajs.inputmaskData.name === 'session') {
			if (!req.soajs.inputmaskData.sessionInfo || JSON.stringify(req.soajs.inputmaskData.sessionInfo) === '{}') {
				return res.jsonp(req.soajs.buildResponse({"code": 507, "msg": config.errors[507]}));
			}
		}
		var opts = {};
		opts.collection = colName;
		opts.conditions = {'code': req.soajs.inputmaskData.env.toUpperCase()};
		BL.model.findEntry(req.soajs, opts, function (err, envRecord) {
			checkIfError(req, res, {config: config, error: err || !envRecord, code: 402}, function () {
				var clusters = Object.keys(envRecord.dbs.clusters);
				checkIfError(req, res, {
					config: config,
					error: clusters.indexOf(req.soajs.inputmaskData.cluster) === -1,
					code: 502
				}, function () {
					//check if this is the session
					if (req.soajs.inputmaskData.name === 'session') {
						checkIfError(req, res, {
							config: config,
							error: !envRecord.dbs.config.session,
							code: 511
						}, function () {
							envRecord.dbs.config.session = {
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
								checkIfError(req, res, {config: config, error: err, code: 513}, function () {
									return res.jsonp(req.soajs.buildResponse(null, "environment database updated successful"));
								});
							});
						});
					}
					else {
						checkIfError(req, res, {
							config: config,
							error: !envRecord.dbs.databases[req.soajs.inputmaskData.name],
							code: 512
						}, function () {
							//otherwise
							envRecord.dbs.databases[req.soajs.inputmaskData.name] = {
								'cluster': req.soajs.inputmaskData.cluster,
								'tenantSpecific': req.soajs.inputmaskData.tenantSpecific || false
							};
							opts = {};
							opts.collection = colName;
							opts.record = envRecord;
							BL.model.saveEntry(req.soajs, opts, function (err) {
								checkIfError(req, res, {config: config, error: err, code: 513}, function () {
									return res.jsonp(req.soajs.buildResponse(null, "environment database updated successful"));
								});
							});
						});
					}
				});
			});
		});
	},

	"deleteDb": function (config, req, res) {
		var opts = {};
		opts.collection = colName;
		opts.conditions = {'code': req.soajs.inputmaskData.env.toUpperCase()};
		BL.model.findEntry(req.soajs, opts, function (err, envRecord) {
			checkIfError(req, res, {config: config, error: err || !envRecord, code: 402}, function () {
				if (req.soajs.inputmaskData.name === 'session') {
					checkIfError(req, res, {
						config: config,
						error: !envRecord.dbs.config.session,
						code: 511
					}, function () {
						delete envRecord.dbs.config.session;
						opts = {};
						opts.collection = colName;
						opts.record = envRecord;
						BL.model.saveEntry(req.soajs, opts, function (err) {
							checkIfError(req, res, {config: config, error: err, code: 514}, function () {
								return res.jsonp(req.soajs.buildResponse(null, "environment database removed successful"));
							});
						});
					});
				}
				else {
					checkIfError(req, res, {
						config: config,
						error: !envRecord.dbs.databases[req.soajs.inputmaskData.name],
						code: 512
					}, function () {
						delete envRecord.dbs.databases[req.soajs.inputmaskData.name];
						opts = {};
						opts.collection = colName;
						opts.record = envRecord;
						BL.model.saveEntry(req.soajs, opts, function (err) {
							checkIfError(req, res, {config: config, error: err, code: 514}, function () {
								return res.jsonp(req.soajs.buildResponse(null, "environment database removed successful"));
							});
						});
					});
				}
			});
		});
	},

	"updateDbsPrefix": function (config, req, res) {
		var prefix = {"dbs.config.prefix": req.soajs.inputmaskData.prefix};
		var opts = {};
		opts.collection = colName;
		opts.conditions = {'code': req.soajs.inputmaskData.env.toUpperCase()};
		opts.fields = {"$set": prefix};
		opts.options = {'upsert': false,'safe': true};
		BL.model.updateEntry(req.soajs, opts, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 402}, function () {
				return res.jsonp(req.soajs.buildResponse(null, "environment Database prefix update successful"));
			});
		});
	},

	"listClusters": function (config, req, res) {
		var opts = {};
		opts.collection = colName;
		opts.conditions = {'code': req.soajs.inputmaskData.env.toUpperCase()};
		BL.model.findEntry(req.soajs, opts, function (err, envRecord) {
			checkIfError(req, res, {config: config, error: err || !envRecord, code: 402}, function () {
				return res.jsonp(req.soajs.buildResponse(null, envRecord.dbs.clusters));
			});
		});
	},

	"addCluster": function (config, req, res) {
		var opts = {};
		opts.collection = colName;
		opts.conditions = {'code': req.soajs.inputmaskData.env.toUpperCase()};
		BL.model.findEntry(req.soajs, opts, function (err, envRecord) {
			checkIfError(req, res, {config: config, error: err || !envRecord, code: 402}, function () {
				var clusters = Object.keys(envRecord.dbs.clusters);
				checkIfError(req, res, {
					config: config,
					error: clusters.indexOf(req.soajs.inputmaskData.name) !== -1,
					code: 504
				}, function () {
					envRecord.dbs.clusters[req.soajs.inputmaskData.name] = req.soajs.inputmaskData.cluster;
					opts = {};
					opts.collection = colName;
					opts.record = envRecord;
					BL.model.saveEntry(req.soajs, opts, function (err) {
						checkIfError(req, res, {config: config, error: err, code: 505}, function () {
							return res.jsonp(req.soajs.buildResponse(null, "environment cluster added successful"));
						});
					});
				});
			});
		});
	},

	"updateCluster": function (config, req, res) {
		var opts = {};
		opts.collection = colName;
		opts.conditions = {'code': req.soajs.inputmaskData.env.toUpperCase()}
		BL.model.findEntry(req.soajs, opts, function (err, envRecord) {
			checkIfError(req, res, {config: config, error: err || !envRecord, code: 402}, function () {
				var clusters = Object.keys(envRecord.dbs.clusters);
				checkIfError(req, res, {
					config: config,
					error: clusters.indexOf(req.soajs.inputmaskData.name) === -1,
					code: 502
				}, function () {
					envRecord.dbs.clusters[req.soajs.inputmaskData.name] = req.soajs.inputmaskData.cluster;
					opts = {};
					opts.collection = colName;
					opts.record = envRecord;
					BL.model.saveEntry(req.soajs, opts, function (err) {
						checkIfError(req, res, {config: config, error: err, code: 506}, function () {
							return res.jsonp(req.soajs.buildResponse(null, "environment cluster updated successful"));
						});
					});
				});
			});
		});
	},

	"deleteCluster": function (config, req, res) {
		var opts = {};
		opts.collection = colName;
		opts.conditions = {'code': req.soajs.inputmaskData.env.toUpperCase()};
		BL.model.findEntry(req.soajs, opts, function (error, envRecord) {
			checkIfError(req, res, {config: config, error: error || !envRecord, code: 402}, function () {
				checkIfError(req, res, {
					config: config,
					error: !envRecord.dbs.clusters[req.soajs.inputmaskData.name],
					code: 508
				}, function () {
					delete envRecord.dbs.clusters[req.soajs.inputmaskData.name];
					opts = {};
					opts.collection = colName;
					opts.record = envRecord;
					BL.model.saveEntry(req.soajs, opts, function (err) {
						checkIfError(req, res, {config: config, error: err, code: 402}, function () {
							return res.jsonp(req.soajs.buildResponse(null, "environment cluster removed successful"));
						});
					});
				});
			});
		});
	},

	"listPlatforms": function (config, req, res) {
		req.soajs.inputmaskData.env = req.soajs.inputmaskData.env.toUpperCase();
		var opts = {};
		opts.collection = colName;
		opts.conditions = {'code': req.soajs.inputmaskData.env};
		BL.model.findEntry(req.soajs, opts, function (error, envRecord) {
			checkIfError(req, res, {config: config, error: error || !envRecord, code: 402}, function () {
				listCerts(req.soajs, function (error, certs) {
					checkIfError(req, res, {config: config, error: error, code: 732}, function () {
						envRecord.deployer.certs = certs;
						return res.jsonp(req.soajs.buildResponse(null, envRecord.deployer));
					});
				});
			});
		});
	},

	"uploadCerts": function (config, req, res) {
		var form = new formidable.IncomingForm();
		form.encoding = 'utf-8';
		form.keepExtensions = true;
		form.maxFieldSize = 100 * 1024 * 1024;

		//verify that required params are available
		/*
		 docker: platform, driver
		 nginx: platform, label
		 */
		var opts = {};
		validateInput(function (error) {
			checkIfError(req, res, {config: config, error: error, code: 739}, function () {

				//check if cert already exists before proceeding
				var criteria = {
					'filename': req.query.filename,
					'metadata.platform': req.query.platform
				};
				opts.collection = "fs.files";
				opts.conditions = criteria

				BL.model.findEntry(req.soajs, opts, function (error, cert) {
					checkIfError(req, res, {config: config, error: error, code: 727}, function () {
						checkIfError(req, res, {config: config, error: cert, code: 731}, function () {
							BL.model.getDb(req.soajs).getMongoSkinDB(function (error, db) {
								checkIfError(req, res, {config: config, error: error, code: 727}, function () {
									var gfs = Grid(db, BL.model.getDb(req.soajs).mongoSkin);

									form.onPart = function (part) {
										if (!part.filename) return form.handlePart(part);

										var fileData = {
											filename: part.filename,
											metadata: {
												platform: req.query.platform
											}
										};

										fileData.metadata.env = {};
										fileData.metadata.env[req.query.envCode] = [req.query.platform + '.' + req.query.driver];

										var writeStream = gfs.createWriteStream(fileData);

										part.pipe(writeStream);
										writeStream.on('error', function (error) {
											return checkIfError(req, res, {config: config, error: error, code: 727});
										});
										writeStream.on('close', function (file) {
											return res.jsonp(req.soajs.buildResponse(null, true));
										});
									};
									form.parse(req);
								});
							});
						});
					});
				});
			});
		});

		function validateInput (cb) {
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

	"removeCert": function (config, req, res) {
		var opts = {};
		validateId(req.soajs, function (error) {
			checkIfError(req, res, {config: config, error: error, code: 701}, function () {
				opts.collection = "fs.files";
				opts.conditions = {_id: req.soajs.inputmaskData.id};
				BL.model.findEntry(req.soajs, opts, function (error, cert) {
					checkIfError(req, res, {config: config, error: error, code: 729}, function () {
						checkIfError(req, res, {config: config, error: !cert, code: 730}, function () {
							deleteCerts([cert], req, 0, function (error, result) {
								checkIfError(req, res, {config: config, error: error, code: 729}, function () {
									return res.jsonp(req.soajs.buildResponse(null, true));
								});
							});
						});
					});
				});
			});
		});
	},

	"chooseExistingCerts": function (config, req, res) {
		var opts = {};
		opts.collection = colName;
		opts.conditions = {code: req.soajs.inputmaskData.env};
		BL.model.countEntries(req.soajs, opts, function (error, count) {
			checkIfError(req, res, {config: config, error: error, code: 600}, function () {
				checkIfError(req, res, {config: config, error: count === 0, code: 446}, function () {
					async.map(req.soajs.inputmaskData.certIds, function (oneCert, callback) {
						validateCertId(req.soajs, oneCert, callback);
					}, function (error, certIds) {
						checkIfError(req, res, {config: config, error: error, code: 701}, function () {
							var criteria = {
								_id: {
									'$in': certIds
								}
							};
							opts = {};
							opts.collection = "fs.files";
							opts.conditions = criteria;
							BL.model.findEntries(req.soajs, opts, function (error, certs) {
								checkIfError(req, res, {config: config, error: error, code: 728}, function () {
									checkIfError(req, res, {
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

										saveUpdatedCerts(req.soajs, certs, function (error) {
											checkIfError(req, res, {config: config, error: error, code: 727}, function () {
												return res.jsonp(req.soajs.buildResponse(null, true));
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

	"listNginxCerts": function (config, req, res) {
		//TODO: remove function, no longer supported
		listCerts(req.soajs, 'nginx', function (error, certs) {
			checkIfError(req, res, {config: config, error: error, code: 600}, function () {
				return res.jsonp(req.soajs.buildResponse(null, certs));
			});
		});
	},

	"removeNginxCert": function (config, req, res) {
		//TODO: remove function, no longer supported
		var opts = {};
		req.soajs.inputmaskData.env = req.soajs.inputmaskData.env.toUpperCase();
		validateId(req.soajs, function (error) {
			checkIfError(req, res, {config: config, error: error, code: 701}, function () {
				var criteria = {
					_id: req.soajs.inputmaskData.id
				};
				opts. collection = "fs.files";
				opts.conditions = criteria;
				BL.model.findEntry(req.soajs, opts, function (error, cert) {
					checkIfError(req, res, {config: config, error: error, code: 729}, function () {
						checkIfError(req, res, {config: config, error: !cert, code: 730}, function () {
							checkIfError(req, res, {
								config: config,
								error: cert.metadata.env.indexOf(req.soajs.inputmaskData.env) === -1,
								code: 730
							}, function () {
								if (cert.metadata.env.length === 1) {
									opts = {};
									opts.collection = "fs.files";
									opts.conditions = criteria;
									BL.model.removeEntry(req.soajs, opts, function (error) {
										checkIfError(req, res, {config: config, error: error, code: 729}, function () {
											return res.jsonp(req.soajs.buildResponse(null, true));
										});
									});
								}
								else {
									cert.metadata.env.splice(cert.metadata.env.indexOf(req.soajs.inputmaskData.env), 1);
									opts = {};
									opts.collection = "fs.files";
									opts.record = cert;
									BL.model.saveEntry(req.soajs, opts, function (error) {
										checkIfError(req, res, {config: config, error: error, code: 729}, function () {
											return res.jsonp(req.soajs.buildResponse(null, true));
										});
									});
								}
							});
						});
					});
				});
			});
		});
	},

	"chooseExistingNginxCerts": function (config, req, res) {
		//TODO: remove function, no longer supported
		var opts = {};
		async.map(req.soajs.inputmaskData.certIds, function (oneCert, callback) {
			validateCertId(req.soajs, oneCert, callback);
		}, function (error, certs) {
			checkIfError(req, res, {config: config, error: error, code: 701}, function () {
				var criteria = {
					_id: {
						'$in': certs
					}
				};
				opts. collection = "fs.files";
				opts.conditions = criteria;
				BL.model.findEntries(req.soajs, opts, function (error, records) {
					checkIfError(req, res, {config: config, error: error, code: 728}, function () {
						checkIfError(req, res, {config: config, error: certs.length !== records.length, code: 730}, function () {
							records.forEach(function (oneCert) {
								oneCert.metadata.env.push(req.soajs.inputmaskData.env);
							});

							saveUpdatedCerts(req.soajs, records, function (error) {
								checkIfError(req, res, {config: config, error: error, code: 727}, function () {
									return res.jsonp(req.soajs.buildResponse(null, true));
								});
							});
						});
					});
				});
			});
		});
	},

	"changeSelectedDriver": function (config, req, res) {
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
			checkIfError(req, res, {config: config, error: error, code: 735}, function () {
				return res.jsonp(req.soajs.buildResponse(null, true));
			});
		});
	},

	"changeDeployerType": function (config, req, res) {
		var opts = {};
		opts.collection = colName;
		opts.conditions = {code: req.soajs.inputmaskData.env};
		opts.fields = {$set: {'deployer.type': req.soajs.inputmaskData.deployerType}};
		BL.model.updateEntry(req.soajs, opts, function (error, result) {
			checkIfError(req, res, {config: config, error: error || !result, code: 738}, function () {
				res.jsonp(req.soajs.buildResponse(null, true));
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

		modelPath = __dirname + "/../models/" + modelName + ".js";

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
