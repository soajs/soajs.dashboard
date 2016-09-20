'use strict';
var colName = "environment";
var tenantColName = "tenants";
var dashExtKeysColName = "dashboard_extKeys";

var Grid = require('gridfs-stream');
var formidable = require('formidable');
var async = require('async');

function validateId(mongo, req, cb) {
	try {
		req.soajs.inputmaskData.id = mongo.ObjectId(req.soajs.inputmaskData.id);
		return cb(null);
	} catch (e) {
		return cb(e);
	}
}

function validateCertId(mongo, oneCert, cb) {
	try {
		oneCert = mongo.ObjectId(oneCert);
		return cb (null, oneCert);
	}
	catch (e) {
		return cb (e);
	}
}

function saveUpdatedCerts(mongo, certs, cb) {
	async.each(certs, function (cert, callback) {
		mongo.save("fs.files", cert, function (error, result) {
			callback(error, result);
		});
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

function deleteCerts(mongo, certsArr, req, counter, cb) {
	var envCode = req.soajs.inputmaskData.env;
	var cert = certsArr[counter];

	async.each(certsArr, function (cert, cb) {
		if (cert.metadata.env[envCode].length === 1 && Object.keys(cert.metadata.env).length === 1) { //only 1 available env and driver
			mongo.remove("fs.files", {_id: cert._id}, function (error, data) {
				return cb(error, data);
			});
		} else if (cert.metadata.env[envCode].length === 1 && Object.keys(cert.metadata.env).length > 1) { //other env are available but only 1 driver in selected env
			delete cert.metadata.env[envCode];
			mongo.save("fs.files", cert, function (error, result) {
				return cb(error, result);
			});
		} else if (cert.metadata.env[envCode].length > 1) { //several drivers exist in env
			for (var i = 0; i < cert.metadata.env[envCode].length; i++) {
				if (cert.metadata.env[envCode][i] === req.soajs.inputmaskData.driverName) {
					cert.metadata.env[envCode].splice(i, 1);
					break;
				}
			}
			mongo.save("fs.files", cert, function (error, result) {
				return cb(error, result);
			});
		}
	}, cb);
}

function listCerts (mongo, platform, cb) {
	mongo.find('fs.files', {'metadata.platform': platform}, function (error, certs) {
		return cb(error, certs);
	});
}

module.exports = {
	"add": function (config, mongo, req, res) {
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

		mongo.count(colName, {'code': record.code}, function (error, count) {
			checkIfError(req, res, {config: config, error: error, code: 400}, function () {
				checkIfError(req, res, {config: config, error: count > 0, code: 403}, function () {
					mongo.insert(colName, record, function (err, data) {
						checkIfError(req, res, {config: config, error: err, code: 400}, function () {
							return res.jsonp(req.soajs.buildResponse(null, data));
						});
					});
				});
			});
		});
	},

	"delete": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 405}, function () {
				var criteria1 = {
					'_id': req.soajs.inputmaskData.id, 'locked': true
				};
				mongo.findOne(colName, criteria1, function (error, record) {
					checkIfError(req, res, {config: config, error: error, code: 404}, function () {
						checkIfError(req, res, {config: config, error: record, code: 500}, function () { // return error msg that this record is locked
							var criteria = {
								'_id': req.soajs.inputmaskData.id, 'locked': {$ne: true}
							};
							mongo.remove(colName, criteria, function (error) {
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

	"update": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
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

				mongo.update(colName, {"_id": req.soajs.inputmaskData.id}, s, {
					'upsert': false,
					'safe': true
				}, function (err, data) {
					checkIfError(req, res, {config: config, error: err, code: 401}, function () {
						return res.jsonp(req.soajs.buildResponse(null, "environment update successful"));
					});
				});
			});
		});
	},

	"list": function (config, mongo, req, res, cb) {
		mongo.find(colName, function (err, records) {
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

	"keyUpdate": function (config, mongo, req, res) {
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

		var myUrac = req.soajs.session.getUrac();
		checkIfError(req, res, {config: config, error: myUrac.tenant.id !== req.soajs.tenant.id, code: 781}, function () {
			validateId(mongo, req, function (err) {
				checkIfError(req, res, {config: config, error: err, code: 405}, function () {
					//get environment record
					mongo.findOne(colName, {'_id': req.soajs.inputmaskData.id}, function (error, envRecord) {
						checkIfError(req, res, {config: config, error: error || !envRecord, code: 446}, function () {
							//get tenant record
							mongo.findOne(tenantColName, {'_id': mongo.ObjectId(req.soajs.tenant.id)}, function (error, tenantRecord) {
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

			mongo.find(tenantColName, criteria, function (error, records) {
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

					mongo.save(tenantColName, oneRecord, function (error) {
						if (error) {
							return callback(error);
						}

						return callback();
					});
				}, function (error) {
					if (deprecate) {
						mongo.find(dashExtKeysColName, {env: envRecord.code.toUpperCase()}, function (error, extKeys) {
							if (error) {
								return cb(error);
							}

							oldDashExtKeys = extKeys;

							mongo.remove(dashExtKeysColName, {env: envRecord.code.toUpperCase()}, function (error) {
								if (error) {
									return cb(error);
								}

								return cb();
							});
						});
					}
					else if (restore) {
						if (oldDashExtKeys.length > 0) {
							mongo.remove(dashExtKeysColName, {env: envRecord.code.toUpperCase()}, function (error) {
								if (error) {
									return cb(error);
								}

								mongo.insert(dashExtKeysColName, oldDashExtKeys, function (error) {
									if (error) {
										return cb(error);
									}

									return cb();
								});
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
			mongo.save(tenantColName, tenantRecord, function (error) {
				if (error) {
					return cb(436);
				}
				return cb(null, true);
			});
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
			mongo.update(colName, {"_id": req.soajs.inputmaskData.id}, s, {
				'upsert': false,
				'safe': true
			}, function (err) {
				if (err) {
					return cb(406);
				}
				return cb(null, true);
			});
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
			mongo.update(dashExtKeysColName, criteria, update, {upsert: true, safe: true}, function (error) {
				if (error) {
					return cb(error);
				}
				return cb(null, true);
			});
		}

		function getDashboardExtKey(tenantRecord, envRecord, cb) {
			var criteria = {
				env: envRecord.code.toUpperCase(),
				code: tenantRecord.code.toUpperCase()
			};
			mongo.findOne(dashExtKeysColName, criteria, function (error, dashExtKey) {
				if (error) {
					return cb(error);
				}
				return cb (null, dashExtKey);
			});
		}
	},

	"listDbs": function (config, mongo, req, res) {
		mongo.findOne(colName, {'code': req.soajs.inputmaskData.env.toUpperCase()}, function (err, envRecord) {
			checkIfError(req, res, {config: config, error: err || !envRecord, code: 402}, function () {
				return res.jsonp(req.soajs.buildResponse(null, envRecord.dbs));
			});
		});
	},

	"addDb": function (config, mongo, req, res) {
		if (req.soajs.inputmaskData.name === 'session') {
			if (!req.soajs.inputmaskData.sessionInfo || JSON.stringify(req.soajs.inputmaskData.sessionInfo) === '{}') {
				return res.jsonp(req.soajs.buildResponse({"code": 507, "msg": config.errors[507]}));
			}
		}
		mongo.findOne(colName, {'code': req.soajs.inputmaskData.env.toUpperCase()}, function (err, envRecord) {
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

							mongo.save(colName, envRecord, function (err) {
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

							mongo.save(colName, envRecord, function (err) {
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

	"updateDb": function (config, mongo, req, res) {
		if (req.soajs.inputmaskData.name === 'session') {
			if (!req.soajs.inputmaskData.sessionInfo || JSON.stringify(req.soajs.inputmaskData.sessionInfo) === '{}') {
				return res.jsonp(req.soajs.buildResponse({"code": 507, "msg": config.errors[507]}));
			}
		}
		mongo.findOne(colName, {'code': req.soajs.inputmaskData.env.toUpperCase()}, function (err, envRecord) {
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
							mongo.save(colName, envRecord, function (err) {
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
							mongo.save(colName, envRecord, function (err) {
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

	"deleteDb": function (config, mongo, req, res) {
		mongo.findOne(colName, {'code': req.soajs.inputmaskData.env.toUpperCase()}, function (err, envRecord) {
			checkIfError(req, res, {config: config, error: err || !envRecord, code: 402}, function () {
				if (req.soajs.inputmaskData.name === 'session') {
					checkIfError(req, res, {
						config: config,
						error: !envRecord.dbs.config.session,
						code: 511
					}, function () {
						delete envRecord.dbs.config.session;

						mongo.save(colName, envRecord, function (err) {
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

						mongo.save(colName, envRecord, function (err) {
							checkIfError(req, res, {config: config, error: err, code: 514}, function () {
								return res.jsonp(req.soajs.buildResponse(null, "environment database removed successful"));
							});
						});
					});
				}
			});
		});
	},

	"updateDbsPrefix": function (config, mongo, req, res) {
		var prefix = {"dbs.config.prefix": req.soajs.inputmaskData.prefix};
		mongo.update(colName, {'code': req.soajs.inputmaskData.env.toUpperCase()}, {"$set": prefix}, {
			'upsert': false,
			'safe': true
		}, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 402}, function () {
				return res.jsonp(req.soajs.buildResponse(null, "environment Database prefix update successful"));
			});
		});
	},

	"listClusters": function (config, mongo, req, res) {
		mongo.findOne(colName, {'code': req.soajs.inputmaskData.env.toUpperCase()}, function (err, envRecord) {
			checkIfError(req, res, {config: config, error: err || !envRecord, code: 402}, function () {
				return res.jsonp(req.soajs.buildResponse(null, envRecord.dbs.clusters));
			});
		});
	},

	"addCluster": function (config, mongo, req, res) {
		mongo.findOne(colName, {'code': req.soajs.inputmaskData.env.toUpperCase()}, function (err, envRecord) {
			checkIfError(req, res, {config: config, error: err || !envRecord, code: 402}, function () {
				var clusters = Object.keys(envRecord.dbs.clusters);
				checkIfError(req, res, {
					config: config,
					error: clusters.indexOf(req.soajs.inputmaskData.name) !== -1,
					code: 504
				}, function () {
					envRecord.dbs.clusters[req.soajs.inputmaskData.name] = req.soajs.inputmaskData.cluster;

					mongo.save(colName, envRecord, function (err) {
						checkIfError(req, res, {config: config, error: err, code: 505}, function () {
							return res.jsonp(req.soajs.buildResponse(null, "environment cluster added successful"));
						});
					});
				});
			});
		});
	},

	"updateCluster": function (config, mongo, req, res) {
		mongo.findOne(colName, {'code': req.soajs.inputmaskData.env.toUpperCase()}, function (err, envRecord) {
			checkIfError(req, res, {config: config, error: err || !envRecord, code: 402}, function () {
				var clusters = Object.keys(envRecord.dbs.clusters);
				checkIfError(req, res, {
					config: config,
					error: clusters.indexOf(req.soajs.inputmaskData.name) === -1,
					code: 502
				}, function () {
					envRecord.dbs.clusters[req.soajs.inputmaskData.name] = req.soajs.inputmaskData.cluster;

					mongo.save(colName, envRecord, function (err) {
						checkIfError(req, res, {config: config, error: err, code: 506}, function () {
							return res.jsonp(req.soajs.buildResponse(null, "environment cluster updated successful"));
						});
					});
				});
			});
		});
	},

	"deleteCluster": function (config, mongo, req, res) {
		mongo.findOne(colName, {'code': req.soajs.inputmaskData.env.toUpperCase()}, function (error, envRecord) {
			checkIfError(req, res, {config: config, error: error || !envRecord, code: 402}, function () {
				checkIfError(req, res, {
					config: config,
					error: !envRecord.dbs.clusters[req.soajs.inputmaskData.name],
					code: 508
				}, function () {
					delete envRecord.dbs.clusters[req.soajs.inputmaskData.name];

					mongo.save(colName, envRecord, function (err) {
						checkIfError(req, res, {config: config, error: err, code: 402}, function () {
							return res.jsonp(req.soajs.buildResponse(null, "environment cluster removed successful"));
						});
					});
				});
			});
		});
	},

	"listPlatforms": function (config, mongo, req, res) {
		req.soajs.inputmaskData.env = req.soajs.inputmaskData.env.toUpperCase();
		mongo.findOne(colName, {'code': req.soajs.inputmaskData.env}, function (error, envRecord) {
			checkIfError(req, res, {config: config, error: error || !envRecord, code: 402}, function () {
				listCerts(mongo, 'docker', function (error, certs) {
					checkIfError(req, res, {config: config, error: error, code: 732}, function () {
						envRecord.deployer.certs = certs;
						return res.jsonp(req.soajs.buildResponse(null, envRecord.deployer));
					});
				});
			});
		});
	},

	"uploadCerts": function (config, mongo, req, res) {
		var form = new formidable.IncomingForm();
		form.encoding = 'utf-8';
		form.keepExtensions = true;
		form.maxFieldSize = 100 * 1024 * 1024;

		//verify that required params are available
		/*
			docker: platform, driver
			nginx: platform, label
		*/
		validateInput(function (error) {
			checkIfError(req, res, {config: config, error: error, code: 739}, function () {
				//check if cert already exists before proceeding
				var criteria = {
					'filename': req.query.filename,
					'metadata.platform': req.query.platform
				};
				mongo.findOne("fs.files", criteria, function (error, cert) {
					checkIfError(req, res, {config: config, error: error, code: 727}, function () {
						checkIfError(req, res, {config: config, error: cert, code: 731}, function () {
							mongo.getMongoSkinDB(function (error, db) {
								checkIfError(req, res, {config: config, error: error, code: 727}, function () {
									var gfs = Grid(db, mongo.mongoSkin);

									form.onPart = function (part) {
										if (!part.filename) return form.handlePart(part);

										var fileData = {
											filename: part.filename,
											metadata: {
												platform: req.query.platform
											}
										};
										if (req.query.platform === 'docker') {
											fileData.metadata.env = {};
											fileData.metadata.env[req.query.envCode] = [req.query.platform + '.' + req.query.driver];
										}
										else if (req.query.platform === 'nginx') {
											fileData.metadata.label = req.query.label;
											fileData.metadata.env = [req.query.envCode];
										}
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

	"removeCert": function (config, mongo, req, res) {
		validateId(mongo, req, function (error) {
			checkIfError(req, res, {config: config, error: error, code: 701}, function () {
				mongo.findOne("fs.files", {_id: req.soajs.inputmaskData.id}, function (error, cert) {
					checkIfError(req, res, {config: config, error: error, code: 729}, function () {
						checkIfError(req, res, {config: config, error: !cert, code: 730}, function () {
							deleteCerts(mongo, [cert], req, 0, function (error, result) {
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

	"chooseExistingCerts": function (config, mongo, req, res) {
		mongo.count(colName, {code: req.soajs.inputmaskData.env}, function (error, count) {
			checkIfError(req, res, {config: config, error: error, code: 600}, function () {
				checkIfError(req, res, {config: config, error: count === 0, code: 446}, function () {
					async.map(req.soajs.inputmaskData.certIds, function (oneCert, callback) {
						validateCertId(mongo, oneCert, callback);
					}, function (error, certIds) {
						checkIfError(req, res, {config: config, error: error, code: 701}, function () {
							var criteria = {
								_id: {
									'$in': certIds
								}
							};

							mongo.find("fs.files", criteria, function (error, certs) {
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

										saveUpdatedCerts(mongo, certs, function (error) {
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

	"listNginxCerts": function (config, mongo, req, res) {
		listCerts(mongo, 'nginx', function (error, certs) {
			checkIfError(req, res, {config: config, error: error, code: 600}, function () {
				return res.jsonp(req.soajs.buildResponse(null, certs));
			});
		});
	},

	"removeNginxCert": function (config, mongo, req, res) {
		req.soajs.inputmaskData.env = req.soajs.inputmaskData.env.toUpperCase();
		validateId(mongo, req, function (error) {
			checkIfError(req, res, {config: config, error: error, code: 701}, function () {
				var criteria = {
					_id: req.soajs.inputmaskData.id
				};
				mongo.findOne("fs.files", criteria, function (error, cert) {
					checkIfError(req, res, {config: config, error: error, code: 729}, function () {
						checkIfError(req, res, {config: config, error: !cert, code: 730}, function () {
							checkIfError(req, res, {
								config: config,
								error: cert.metadata.env.indexOf(req.soajs.inputmaskData.env) === -1,
								code: 730
							}, function () {
								if (cert.metadata.env.length === 1) {
									mongo.remove("fs.files", criteria, function (error) {
										checkIfError(req, res, {config: config, error: error, code: 729}, function () {
											return res.jsonp(req.soajs.buildResponse(null, true));
										});
									});
								}
								else {
									cert.metadata.env.splice(cert.metadata.env.indexOf(req.soajs.inputmaskData.env), 1);
									mongo.save("fs.files", cert, function (error) {
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

	"chooseExistingNginxCerts": function (config, mongo, req, res) {
		async.map(req.soajs.inputmaskData.certIds, function (oneCert, callback) {
			validateCertId(mongo, oneCert, callback);
		}, function (error, certs) {
			checkIfError(req, res, {config: config, error: error, code: 701}, function () {
				var criteria = {
					_id: {
						'$in': certs
					}
				};
				mongo.find("fs.files", criteria, function (error, records) {
					checkIfError(req, res, {config: config, error: error, code: 728}, function () {
						checkIfError(req, res, {config: config, error: certs.length !== records.length, code: 730}, function () {
							records.forEach(function (oneCert) {
								oneCert.metadata.env.push(req.soajs.inputmaskData.env);
							});

							saveUpdatedCerts(mongo, records, function (error) {
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

	"changeSelectedDriver": function (config, mongo, req, res) {
		var criteria = {
			code: req.soajs.inputmaskData.env.toUpperCase()
		};
		var update = {
			'$set': {
				'deployer.selected': req.soajs.inputmaskData.selected
			}
		};
		mongo.update(colName, criteria, update, function (error, result) {
			checkIfError(req, res, {config: config, error: error, code: 735}, function () {
				return res.jsonp(req.soajs.buildResponse(null, true));
			});
		});
	},

	"changeDeployerType": function (config, mongo, req, res) {
		mongo.update(colName, {code: req.soajs.inputmaskData.env}, {$set: {'deployer.type': req.soajs.inputmaskData.deployerType}}, function (error, result) {
			checkIfError(req, res, {config: config, error: error || !result, code: 738}, function () {
				res.jsonp(req.soajs.buildResponse(null, true));
			});
		});
	}
};
