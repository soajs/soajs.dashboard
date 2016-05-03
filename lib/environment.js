'use strict';
var colName = "environment";
var tenantColName = "tenants";

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
			"port": req.soajs.inputmaskData.port,
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
						"port": req.soajs.inputmaskData.port,
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
		var provision = require("soajs/modules/soajs.provision");
		provision.init(req.soajs.registry.coreDB.provision, req.soajs.log);
		var position = [];
		var newKey;

		validateId(mongo, req, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 405}, function () {
				//get tenant record
				mongo.findOne(tenantColName, {'_id': mongo.ObjectId(req.soajs.tenant.id)}, function (error, tenantRecord) {
					checkIfError(req, res, {config: config, error: error || !tenantRecord, code: 438}, function () {
						//generate new key
						generateNewKey(provision, tenantRecord, function (error) {
							checkIfError(req, res, {config: config, error: error, code: error}, function () {
								//update tenant
								updateTenantRecord(tenantRecord, function (error) {
									checkIfError(req, res, {config: config, error: error, code: error}, function () {
										//generate external key
										generateNewExtKey(provision, tenantRecord, function (error) {
											if (error) {
												rollback(tenantRecord, error);
											}
											//update tenant
											updateTenantRecord(tenantRecord, function (error) {
												checkIfError(req, res, {
													config: config,
													error: error,
													code: error
												}, function () {
													//update environment
													updateEnvironment(function (error) {
														checkIfError(req, res, {
															config: config,
															error: error,
															code: error
														}, function () {
															provision.loadProvision(function (loaded) {
																return res.jsonp(req.soajs.buildResponse(null, {'newKey': newKey.extKeys[0].extKey}));
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
					});
				});
			});
		});

		function rollback(tenantRecord, error) {
			for (var key = 0; key < tenantRecord.applications[position[0]].keys.length; key++) {
				if (tenantRecord.applications[position[0]].keys[key].key === newKey.key) {
					tenantRecord.applications[position[0]].keys.splice(key, 1);
				}
			}

			updateTenantRecord(tenantRecord, function (error) {
				checkIfError(req, res, {config: config, error: error, code: 406});
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

		function generateNewKey(provision, tenantRecord, cb) {
			for (var app = 0; app < tenantRecord.applications.length; app++) {
				if (tenantRecord.applications[app].appId.toString() === req.soajs.tenant.application.appId) {
					position.push(app);

					//get old key configuration
					for (var key = 0; key < tenantRecord.applications[app].keys.length; key++) {
						if (tenantRecord.applications[app].keys[key].key === req.soajs.tenant.key.iKey) {
							position.push(key);
							provision.generateInternalKey(function (error, internalKey) {
								if (error) {
									return cb(436);
								}

								newKey = {
									"key": internalKey,
									"config": tenantRecord.applications[app].keys[key].config,
									"extKeys": []
								};

								tenantRecord.applications[app].keys.push(newKey);
								return cb(null, true);
							});
						}
					}
				}
			}
		}

		function generateNewExtKey(provision, tenantRecord, cb) {
			var app = position[0];
			var key = position[1];
			var internalKey = newKey.key;

			//get old ext key security and expDate
			for (var extKey = 0; extKey < tenantRecord.applications[app].keys[key].extKeys.length; extKey++) {
				if (tenantRecord.applications[app].keys[key].extKeys[extKey].extKey === req.soajs.tenant.key.eKey) {

					var newExtKey = {
						device: tenantRecord.applications[app].keys[key].extKeys[extKey].device,
						geo: tenantRecord.applications[app].keys[key].extKeys[extKey].geo,
						expDate: tenantRecord.applications[app].keys[key].extKeys[extKey].expDate
					};
					provision.generateExtKey(internalKey, {
						algorithm: req.soajs.inputmaskData.algorithm,
						password: req.soajs.inputmaskData.password
					}, function (error, extKeyValue) {
						if (error) {
							return cb(440);
						}

						newExtKey.extKey = extKeyValue;
						newKey.extKeys.push(newExtKey);
						tenantRecord.applications[app].keys[key].extKeys.push(newExtKey);
						return cb(null, true);
					});
				}
			}
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
				mongo.find('fs.files', {}, function (error, certs) {
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
		checkIfError(req, res, {
			config: config,
			error: !req.query.filename || !req.query.envCode || !req.query.driver,
			code: 739
		}, function () {
			//check if cert already exists before proceeding
			var criteria = {
				'filename': req.query.filename
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
												env: {}
											}
										};
										fileData.metadata.env[req.query.envCode] = [req.query.driver];

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
		try {
			for (var i = 0; i < req.soajs.inputmaskData.certIds.length; i++) {
				req.soajs.inputmaskData.certIds[i] = mongo.ObjectId(req.soajs.inputmaskData.certIds[i]);
			}
		} catch (e) {
			return res.jsonp(req.soajs.buildResponse({code: 701, msg: config.errors[701]}));
		}

		var criteria = {
			_id: {
				'$in': req.soajs.inputmaskData.certIds
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

					async.each(certs, function (cert, cb) {
						mongo.save("fs.files", cert, function (error, result) {
							cb(error, result);
						});
					}, function (error, data) {
						checkIfError(req, res, {config: config, error: error, code: 727}, function () {
							return res.jsonp(req.soajs.buildResponse(null, true));
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
