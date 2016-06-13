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
		if (typeof (data.error) === 'object' && data.error.message) {
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

function listCerts (mongo, type, cb) {
	mongo.find('fs.files', {'metadata.type': type}, function (error, certs) {
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
			2. Generate New Key
				2.1 Get all apps and keys available for this tenant
				2.2 Generate new keys via provision.generateInternalKey()
				2.3 Clone the config from the current keys to the newly generated ones
			3. Update Tenant - add the new keys
			4. Generate New External Key
				4.1 Get the current external keys available and the dashboard external key
				4.2 Clone the device, geo, and expDate values from the current ext key to the new one
				4.3 Generate new external keys for the specified environment using the newly set algorithm and password
					4.3.1 Replace the dashboard external key with the new external key that was generated
			5. Update Tenant - add the new external keys
			6. Update Environment
				6.1 Update the env record to include the new algorithm and password
			7. Load Provision
			8. If update was for dashboard environment return new ext key in response | else return true
		*/
		var provision = require("soajs/modules/soajs.provision");
		provision.init(req.soajs.registry.coreDB.provision, req.soajs.log);
		var position = [];
		var newKey;

		validateId(mongo, req, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 405}, function () {
				//get environment record
				mongo.findOne(colName, {'_id': req.soajs.inputmaskData.id}, function (error, envRecord) {
					checkIfError(req, res, {config: config, error: error || !envRecord, code: 446}, function () {
						//get tenant record
						mongo.findOne(tenantColName, {'_id': mongo.ObjectId(req.soajs.tenant.id)}, function (error, tenantRecord) {
							checkIfError(req, res, {config: config, error: error || !tenantRecord, code: 438}, function () {
								//get current dashboard ext key
								getDashboardExtKey(tenantRecord, envRecord, function (error, dashExtKey) {
									checkIfError(req, res, {config: config, error: error, code: 600}, function () {
										//generate new keys and external keys for this tenant
										generateKeysForTenantApps(tenantRecord, envRecord, dashExtKey, function (error, newKeys) {
											checkIfError(req, res, {config: config, error: error, code: 600}, function () {
												//update environment
												updateEnvironment(function (error) {
													checkIfError(req, res, {
														config: config,
														error: error,
														code: error
													}, function () {
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

		//TODO: check if rollback method is still needed after the latest update
		// function rollback(tenantRecord, error) {
		// 	for (var key = 0; key < tenantRecord.applications[position[0]].keys.length; key++) {
		// 		if (tenantRecord.applications[position[0]].keys[key].key === newKey.key) {
		// 			tenantRecord.applications[position[0]].keys.splice(key, 1);
		// 		}
		// 	}
		//
		// 	updateTenantRecord(tenantRecord, function (error) {
		// 		checkIfError(req, res, {config: config, error: error, code: 406});
		// 	});
		// }

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

							if (dashExtKey && oneExtKey.extKey === dashExtKey.key) {
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
			mongo.update(dashExtKeysColName, criteria, update, {upsert: false, safe: true}, function (error) {
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

			/*if(err) { return res.jsonp(req.soajs.buildResponse({"code": 402, "msg": config.errors[402]})); }
			 return res.jsonp(req.soajs.buildResponse(null, "environment Database prefix update successful"));*/
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
			docker: type, driver
			nginx: type, label
		*/
		validateInput(function (error) {
			checkIfError(req, res, {config: config, error: error, code: 739}, function () {
				//check if cert already exists before proceeding
				var criteria = {
					'filename': req.query.filename,
					'metadata.type': req.query.type
				};
				mongo.findOne("fs.files", criteria, function (error, cert) {
					checkIfError(req, res, {config: config, error: error, code: 727}, function () {
						checkIfError(req, res, {config: config, error: cert, code: 731}, function () {
							mongo.getMongoSkinDB(function (error, db) {
								checkIfError(req, res, {config: config, error: error, code: 727}, function () {
									var gfs = Grid(db, mongo.mongoSkin);

									checkIfError(req, res, {config: config, error: error, code: 729}, function () {
										form.onPart = function (part) {
											if (!part.filename) return form.handlePart(part);

											var fileData = {
												filename: part.filename,
												metadata: {
													type: req.query.type
												}
											};
											if (req.query.type === 'docker') {
												fileData.metadata.env = {};
												fileData.metadata.env[req.query.envCode] = [req.query.driver];
											}
											else if (req.query.type === 'nginx') {
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
		});

		function validateInput (cb) {
			if (!req.query.filename || !req.query.envCode || !req.query.type) {
				return cb({'message': 'Missing required fields: filename OR envCode OR type'});
			}

			if (req.query.type === 'docker' && !req.query.driver) {
				return cb({'message': 'Missing required field: docker driver name'});
			}

			if (req.query.type === 'nginx' && !req.query.label) {
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
							certs.forEach(function (oneCert) {
								if (oneCert.metadata.env[req.soajs.inputmaskData.env]) {
									if (oneCert.metadata.env[req.soajs.inputmaskData.env].indexOf(req.soajs.inputmaskData.driverName) === -1) { //push driver name only if it does not already exist
										oneCert.metadata.env[req.soajs.inputmaskData.env].push(req.soajs.inputmaskData.driverName);
									}
								} else {
									oneCert.metadata.env[req.soajs.inputmaskData.env] = [];
									oneCert.metadata.env[req.soajs.inputmaskData.env].push(req.soajs.inputmaskData.driverName);
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

	"addDriver": function (config, mongo, req, res) {
		mongo.findOne(colName, {code: req.soajs.inputmaskData.env}, function (error, envRecord) {
			checkIfError(req, res, {config: config, error: error, code: 733}, function () {
				checkIfError(req, res, {config: config, error: !envRecord, code: 446}, function () {
					var driver = req.soajs.inputmaskData.driverName;
					if (!envRecord.deployer.container) {
						req.soajs.log.debug('Missing deployer information, using default schema');
						envRecord.deployer.container = {
							"dockermachine": {
								"local": {},
								"cloud": {}
							},
							"docker": {}
						};
					}
					if (driver === 'dockermachine - local') {
						envRecord.deployer.container.dockermachine.local = req.soajs.inputmaskData.local;
					}
					else if (driver === 'dockermachine - cloud') {
						var cloudProvider = req.soajs.inputmaskData.cloud.cloudProvider;
						delete req.soajs.inputmaskData.cloud.cloudProvider;
						envRecord.deployer.container.dockermachine.cloud[cloudProvider] = req.soajs.inputmaskData.cloud;
					}
					else if (driver === 'docker - socket') {
						envRecord.deployer.container.docker.socket = req.soajs.inputmaskData.socket;
					}
					mongo.save(colName, envRecord, function (error, result) {
						checkIfError(req, res, {config: config, error: error, code: 733}, function () {
							return res.jsonp(req.soajs.buildResponse(null, true));
						});
					});
				});
			});
		});
	},

	"editDriver": function (config, mongo, req, res) {
		var driver = req.soajs.inputmaskData.driverName;
		var update = {
			'$set': {}
		};
		if (driver === 'dockermachine - local') {
			update['$set']['deployer.container.dockermachine.local'] = {};
			update['$set']['deployer.container.dockermachine.local'] = req.soajs.inputmaskData.local;
		} else if (driver.indexOf('dockermachine - cloud') !== -1) {
			var cloudProvider = req.soajs.inputmaskData.cloud.cloudProvider;
			delete req.soajs.inputmaskData.cloud.cloudProvider;

			update['$set']['deployer.container.dockermachine.cloud'] = {};
			update['$set']['deployer.container.dockermachine.cloud'][cloudProvider] = req.soajs.inputmaskData.cloud;
		} else if (driver === 'docker - socket') {
			update['$set']['deployer.container.docker.socket'] = {};
			update['$set']['deployer.container.docker.socket'] = req.soajs.inputmaskData.socket;
		}

		mongo.update(colName, {code: req.soajs.inputmaskData.env}, update, function (error, result) {
			checkIfError(req, res, {config: config, error: error, code: 734}, function () {
				return res.jsonp(req.soajs.buildResponse(null, true));
			});
		});
	},

	"changeSelectedDriver": function (config, mongo, req, res) {
		req.soajs.inputmaskData.env = req.soajs.inputmaskData.env.toUpperCase();
		var criteria = {
			code: req.soajs.inputmaskData.env
		};
		var update = {
			'$set': {
				'deployer.selected': req.soajs.inputmaskData.selected
			}
		};
		mongo.update(colName, criteria, update, {upsert: true}, function (error, result) {
			checkIfError(req, res, {config: config, error: error, code: 735}, function () {
				return res.jsonp(req.soajs.buildResponse(null, true));
			});
		});
	},

	"deleteDriver": function (config, mongo, req, res) {
		mongo.findOne(colName, {code: req.soajs.inputmaskData.env}, function (error, envRecord) {
			checkIfError(req, res, {config: config, error: error, code: 736}, function () {
				checkIfError(req, res, {config: config, error: !envRecord, code: 446}, function () {
					checkIfError(req, res, { //checking if user is trying to delete the driver that is currently selected
						config: config,
						error: req.soajs.inputmaskData.driverName.replace(/ - /g, ".") === envRecord.deployer.selected.replace(envRecord.deployer.type + ".", ""),
						code: 737
					}, function () {
						var driverArr = req.soajs.inputmaskData.driverName.split(" - ");
						if (driverArr.length === 2) {
							envRecord.deployer.container[driverArr[0]][driverArr[1]] = {};
						} else if (driverArr.length === 3) {
							envRecord.deployer.container[driverArr[0]][driverArr[1]][driverArr[2]] = {};
						}

						mongo.save(colName, envRecord, function (error, result) {
							checkIfError(req, res, {config: config, error: error, code: 736}, function () {
								//delete certs of this driver before replying
								var criteria = {};
								criteria['metadata.env.' + req.soajs.inputmaskData.env] = req.soajs.inputmaskData.driverName;
								mongo.find("fs.files", criteria, function (error, certs) {
									checkIfError(req, res, {config: config, error: error, code: 729}, function () {
										if (certs.length > 0) {
											deleteCerts(mongo, certs, req, 0, function (error, result) {
												checkIfError(req, res, {
													config: config,
													error: error,
													code: 729
												}, function () {
													return res.jsonp(req.soajs.buildResponse(null, true));
												});
											});
										} else {
											return res.jsonp(req.soajs.buildResponse(null, true));
										}
									});
								});
							});
						});
					});
				});
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
