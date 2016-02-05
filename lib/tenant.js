'use strict';
var colName = "tenants";
var oauthUsersColName = "oauth_urac";
var prodColName = "products";
var envColName = "environment";
var dbKeysColl = "dashboard_extKeys";

var Hasher = require("../utils/hasher.js");
var request = require("request");
var async = require("async");
var objectHash = require("object-hash");

function checkIfError(req, res, data, cb) {
	if (data.error) {
		if (typeof (data.error) === 'object' && data.error.message) {
			req.soajs.log.error(data.error);
		}
		if (data.code) {
			return res.jsonp(req.soajs.buildResponse({"code": data.code, "msg": data.config.errors[data.code]}));
		}

	} else {
		if (cb) return cb();
	}
}

function validateId(mongo, req, cb) {
	try {
		req.soajs.inputmaskData.id = mongo.ObjectId(req.soajs.inputmaskData.id);
		return cb(null);
	} catch (e) {
		return cb(e);
	}
}

function checkCanEdit(mongo, req, cb) {
	var myUrac = req.soajs.session.getUrac();
	if (myUrac && myUrac.tenant.id.toString() === req.soajs.inputmaskData.id.toString()) {
		return cb(null, {});
	}
	else {
		var criteria1 = {'_id': req.soajs.inputmaskData.id, 'locked': true};
		mongo.findOne(colName, criteria1, function (error, record) {
			if (error) {
				return cb(600);
			}
			// return error msg that this record is locked
			if (record) {
				return cb(501);
			}
			return cb(null, {});
		});
	}
}

function checkifProductAndPackageExist(productCode, packageCode, mongo, cb) {
	mongo.findOne(prodColName, {'code': productCode}, function (error, productRecord) {
		if (error) {
			return cb(error);
		}
		if (!productRecord) {
			return cb(null, false);
		}

		for (var i = 0; i < productRecord.packages.length; i++) {
			if (productRecord.packages[i].code === productCode + '_' + packageCode) {
				return cb(null, {'product': productRecord, 'package': productRecord.packages[i]});
			}
		}
		return cb(null, false);
	});
}

function checkIfEnvironmentExists(mongo, envCode, cb) {
	mongo.findOne(envColName, {'code': envCode}, function (error, envRecord) {
		if (error) {
			return cb(error);
		}

		if (!envRecord) {
			return cb(null, false);
		}

		return cb(null, true);
	});
}

function getRequestedSubElementsPositions(tenantRecord, req) {
	var found = false;
	var position = [];

	//find the application
	for (var i = 0; i < tenantRecord.applications.length; i++) {
		if (tenantRecord.applications[i].appId.toString() === req.soajs.inputmaskData.appId) {
			position.push(i); //application position found

			//if key is requested, go one level deeper
			if (req.soajs.inputmaskData.key) {

				//find the key
				for (var j = 0; j < tenantRecord.applications[i].keys.length; j++) {
					if (tenantRecord.applications[i].keys[j].key === req.soajs.inputmaskData.key) {
						position.push(j); //application key position found

						//if extKey is requested, go one level deeper
						if (req.soajs.inputmaskData.extKey) {
							//find the ext key
							for (var k = 0; k < tenantRecord.applications[i].keys[j].extKeys.length; k++) {
								if (tenantRecord.applications[i].keys[j].extKeys[k].extKey === req.soajs.inputmaskData.extKey) {
									position.push(k); //application extKey found

									//no need to go further, simply return
									found = true;
									break;
								}
							}
						}
						//else return what is found
						else {
							found = true;
							break;
						}
					}
				}
			}
			//else return what is found
			else {
				found = true;
				break;
			}
		}
	}
	return {'found': found, 'position': position};
}

function saveTenantRecordAndExit(mongo, tenantRecord, config, req, res, code, msg) {
	mongo.save(colName, tenantRecord, function (error) {
		checkIfError(req, res, {config: config, error: error, code: code}, function () {
			var response = {};
			if (tenantRecord.applications[0]) {
				response.appId = tenantRecord.applications[0].appId.toString();

				if (tenantRecord.applications[0].keys[0]) {
					response.key = tenantRecord.applications[0].keys[0].key;

					if (tenantRecord.applications[0].keys[0].extKeys[0]) {
						response.extKey = tenantRecord.applications[0].keys[0].extKeys[0].extKey;
					}
				}
			}

			return res.jsonp(req.soajs.buildResponse(null, response));
		});
	});
}

function removeDashboardExtKey(mongo, extKey, code, cb) {
	if (!extKey)
		return cb();

	mongo.remove(dbKeysColl, {'code': code, 'key': extKey}, function (error, data) {
		if (error)
			return cb(error);

		if (data.result.n)
			return cb(null, data);

		return cb(null, null);
	});
}

function removeDashboardExtKeysFromKey(mongo, extKeysArr, code, cb) {
	if (!extKeysArr || extKeysArr.length === 0)
		return cb();

	async.each(extKeysArr, function (extKeyObj, callback) {
		removeDashboardExtKey(mongo, extKeyObj.extKey, code, function (error, data) {
			if (error)
				return callback(error);

			return callback(null, data || null);
		});
	}, function (error, data) {
		return cb(error, data);
	});
}

function removeDashboardExtKeysFromApplication(mongo, keysArr, code, cb) {
	if (!keysArr || keysArr.length === 0)
		return cb();

	async.each(keysArr, function (key, callback) {
		removeDashboardExtKeysFromKey(mongo, key.extKeys, code, function (error, data) {
			if (error)
				return callback(error);

			if (data)
				return callback(null, data);

			return callback();
		});
	}, function (error, data) {
		return cb(error, data);
	});
}

module.exports = {
	"delete": function (config, mongo, req, res) {
		validateId(mongo, req, function (error) {
			checkIfError(req, res, {config: config, error: error, code: 438}, function () {
				checkCanEdit(mongo, req, function (err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						//prevent operator from deleting the tenant he is logged in with
						if (req.soajs.inputmaskData.id.toString() === req.soajs.tenant.id) {
							return res.jsonp(req.soajs.buildResponse({"code": 462, "msg": config.errors[462]}));
						}
						//get tenant code from collection before deleting, delete tenant, then delete dbKey if it exists
						mongo.findOne(colName, {'_id': req.soajs.inputmaskData.id}, {'code': 1}, function (error, record) {
							checkIfError(req, res, {config: config, error: error, code: 422}, function () {
								checkIfError(req, res, {config: config, error: !record, code: 438}, function () {
									var tCode = record.code;
									var criteria = {'_id': req.soajs.inputmaskData.id, 'locked': {$ne: true}};
									mongo.remove(colName, criteria, function (error) {
										checkIfError(req, res, {config: config, error: error, code: 424}, function () {
											mongo.remove(dbKeysColl, {'code': tCode}, function (error) {
												checkIfError(req, res, {
													config: config,
													error: error,
													code: 424
												}, function () {
													return res.jsonp(req.soajs.buildResponse(null, "tenant delete successful"));
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
	},

	"list": function (config, mongo, req, res) {
		var criteria = {};
		if (req.soajs.inputmaskData.type)
			criteria.type = req.soajs.inputmaskData.type;
		mongo.find(colName, criteria, {"sort": {"name": 1}}, function (err, records) {
			checkIfError(req, res, {config: config, error: err, code: 422}, function () {
				//generate oauth authorization if needed.
				records.forEach(function (oneTenant) {
					if (oneTenant.oauth && oneTenant.oauth.secret && oneTenant.oauth.secret !== '') {
						oneTenant.oauth.authorization = "Basic " + new Buffer(oneTenant._id.toString() + oneTenant.oauth.secret).toString('base64');
					}
				});
				return res.jsonp(req.soajs.buildResponse(null, records));
			});
		});
	},

	"add": function (config, mongo, req, res) {
		req.soajs.inputmaskData.code = req.soajs.inputmaskData.code.toUpperCase();

		var record = {
			"type": req.soajs.inputmaskData.type,
			"code": req.soajs.inputmaskData.code,
			"name": req.soajs.inputmaskData.name,
			"description": req.soajs.inputmaskData.description,
			"oauth": {},
			"applications": []
		};

		if (req.soajs.inputmaskData.tag) record.tag = req.soajs.inputmaskData.tag;

		mongo.count(colName, {'code': record.code}, function (error, count) {
			checkIfError(req, res, {config: config, error: error, code: 420}, function () {
				checkIfError(req, res, {config: config, error: count > 0, code: 423}, function () {
					mongo.insert(colName, record, function (err, data) {
						checkIfError(req, res, {config: config, error: err || !data, code: 420}, function () {
							record.email = req.soajs.inputmaskData.email;
							createAdminUser(record, data, function (error, response, body) {
								logErrorAndExit(error, body, 606, function () {
									createAdminGroup(record, data, function (error, response, body) {
										logErrorAndExit(error, body, 607, function () {
											return res.jsonp(req.soajs.buildResponse(null, {'id': data[0]._id.toString()}));
										});
									});
								});
							});
						});
					});
				});
			});
		});

		function logErrorAndExit(error, body, errCode, cb) {
			if (error || !body.result) {
				checkIfError(req, res, {config: config, error: error});
				mongo.remove(colName, {'code': record.code}, function (error) {
					checkIfError(req, res, {config: config, error: error});
				});
				return res.jsonp(req.soajs.buildResponse({"code": errCode, "msg": config.errors[errCode]}));
			}
			else cb();
		}

		function createAdminUser(record, data, cb) {
			req.soajs.awareness.getHost('controller', function (host) {

				//call urac, insert an admin user
				var adminUserRequest = {
					'uri': 'http://' + host + ':' + req.soajs.registry.services.controller.port + '/urac/admin/addUser',
					'json': true,
					'headers': {
						'Content-Type': 'application/json',
						'accept': 'application/json',
						'connection': 'keep-alive',
						'key': req.headers.key,
						'soajsauth': req.headers.soajsauth
					},
					'body': {
						//'username': 'admin_' + record.code.toLowerCase() + "_" + data[0]._id.toString(),
						'username': 'admin_' + record.code.toLowerCase(),
						'firstName': 'Administrator',
						'lastName': record.name,
						'tId': data[0]._id.toString(),
						'tCode': record.code,
						'email': record.email,
						'groups': ['administrator']
					}
				};
				request.post(adminUserRequest, cb);

			});
		}

		function createAdminGroup(record, data, cb) {
			req.soajs.awareness.getHost('controller', function (host) {
				//call urac, insert an admin group
				var adminUserRequest = {
					'uri': 'http://' + host + ':' + req.soajs.registry.services.controller.port + '/urac/admin/group/add',
					'json': true,
					'headers': {
						'Content-Type': 'application/json',
						'accept': 'application/json',
						'connection': 'keep-alive',
						'key': req.headers.key,
						'soajsauth': req.headers.soajsauth
					},
					'body': {
						'code': 'administrator',
						'name': 'Administrator',
						'description': "Administrator Group for tenant " + record.name,
						'tId': data[0]._id.toString(),
						'tCode': record.code
					}
				};
				request.post(adminUserRequest, cb);
			});
		}
	},

	"update": function (config, mongo, req, res) {
		var s = {
			'$set': {
				'description': req.soajs.inputmaskData.description,
				'name': req.soajs.inputmaskData.name,
				'type': req.soajs.inputmaskData.type
			}
		};
		if (req.soajs.inputmaskData.tag) {
			s['$set']['tag'] = req.soajs.inputmaskData.tag;
		}

		validateId(mongo, req, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				checkCanEdit(mongo, req, function (err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						var criteria = {'_id': req.soajs.inputmaskData.id};
						mongo.update(colName, criteria, s, {'upsert': false, 'safe': true}, function (err) {
							checkIfError(req, res, {config: config, error: err, code: 421}, function () {
								return res.jsonp(req.soajs.buildResponse(null, "tenant update successful"));
							});
						});
					});
				});
			});
		});
	},

	"get": function (config, mongo, req, res, cb) {
		validateId(mongo, req, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				mongo.findOne(colName, {"_id": req.soajs.inputmaskData.id}, function (err, data) {
					checkIfError(req, res, {config: config, error: err || !data, code: 438}, function () {
						//generate oauth authorization if needed.
						if (data.oauth && data.oauth.secret && data.oauth.secret !== '') {
							data.oauth.authorization = "Basic " + new Buffer(data._id.toString() + data.oauth.secret).toString('base64');
						}
						if (cb && typeof(cb) === 'function') {
							return cb(data);
						}
						else {
							return res.jsonp(req.soajs.buildResponse(null, data));
						}
					});
				});
			});
		});
	},

	"deleteOAuth": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				checkCanEdit(mongo, req, function (err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						var criteria = {
							'_id': req.soajs.inputmaskData.id
						};
						var s = {'$set': {'oauth': {}}};
						mongo.update(colName, criteria, s, {'upsert': false, 'safe': true}, function (error) {
							checkIfError(req, res, {config: config, error: error, code: 428}, function () {
								return res.jsonp(req.soajs.buildResponse(null, "tenant OAuth delete successful"));
							});
						});
					});
				});
			});
		});
	},

	"getOAuth": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				mongo.findOne(colName, {"_id": req.soajs.inputmaskData.id}, function (err, tenantRecords) {
					checkIfError(req, res, {config: config, error: err, code: 427}, function () {
						return res.jsonp(req.soajs.buildResponse(null, tenantRecords.oauth));
					});
				});
			});
		});
	},

	"saveOAuth": function (config, code, msg, mongo, req, res) {
		validateId(mongo, req, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				checkCanEdit(mongo, req, function (err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						var criteria = {'_id': req.soajs.inputmaskData.id};
						var s = {
							'$set': {
								oauth: {
									"secret": req.soajs.inputmaskData.secret,
									"redirectURI": req.soajs.inputmaskData.redirectURI,
									"grants": ["password", "refresh_token"]
								}
							}
						};
						mongo.update(colName, criteria, s, {
							'upsert': false,
							'safe': true
						}, function (error, tenantRecord) {
							checkIfError(req, res, {
								config: config,
								error: error || !tenantRecord,
								code: code
							}, function () {
								return res.jsonp(req.soajs.buildResponse(null, msg));
							});
						});
					});
				});
			});
		});
	},

	"getOAuthUsers": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				mongo.find(oauthUsersColName, {"tId": req.soajs.inputmaskData.id}, function (err, tenantOauthUsers) {
					checkIfError(req, res, {config: config, error: err, code: 447}, function () {
						return res.jsonp(req.soajs.buildResponse(null, tenantOauthUsers));
					});
				});
			});
		});
	},

	"deleteOAuthUsers": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			try {
				req.soajs.inputmaskData.uId = mongo.ObjectId(req.soajs.inputmaskData.uId);
			}
			catch (e) {
				return res.jsonp(req.soajs.buildResponse({"code": 439, "msg": config.errors[439]}));
			}

			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				mongo.remove(oauthUsersColName, {
					"tId": req.soajs.inputmaskData.id,
					"_id": req.soajs.inputmaskData.uId
				}, function (err) {
					checkIfError(req, res, {config: config, error: err, code: 450}, function () {
						return res.jsonp(req.soajs.buildResponse(null, "tenant oauth user removed successful"));
					});
				});
			});
		});
	},

	"addOAuthUsers": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				mongo.findOne(oauthUsersColName, {
					"tId": req.soajs.inputmaskData.id,
					"userId": req.soajs.inputmaskData.userId
				}, function (err, tenantOauthUser) {
					checkIfError(req, res, {config: config, error: err, code: 447}, function () {
						checkIfError(req, res, {config: config, error: tenantOauthUser, code: 448}, function () {
							var hasher = new Hasher(config.hasher);
							var newPassword = hasher.hashSync(req.soajs.inputmaskData.password);
							var oauthUserRecord = {
								"userId": req.soajs.inputmaskData.userId,
								"password": newPassword,
								"tId": req.soajs.inputmaskData.id,
								"keys": null
							};
							mongo.insert(oauthUsersColName, oauthUserRecord, function (error) {
								checkIfError(req, res, {config: config, error: error, code: 449}, function () {
									return res.jsonp(req.soajs.buildResponse(null, "tenant oauth user added successful"));
								});
							});
						});
					});
				});
			});
		});
	},

	"updateOAuthUsers": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				try {
					req.soajs.inputmaskData.uId = mongo.ObjectId(req.soajs.inputmaskData.uId);
				}
				catch (e) {
					//checkIfError(req, res, {config: config, error: e, code: 439}, function () {});
					return res.jsonp(req.soajs.buildResponse({"code": 439, "msg": config.errors[439]}));
				}
				checkIfError(req, res, {
					config: config,
					error: !req.soajs.inputmaskData.userId && !req.soajs.inputmaskData.password,
					code: 451
				}, function () {
					mongo.findOne(oauthUsersColName, {
						"tId": req.soajs.inputmaskData.id,
						"userId": req.soajs.inputmaskData.userId,
						"_id": {$ne: req.soajs.inputmaskData.uId}
					}, function (err, tenantOauthUser) {
						checkIfError(req, res, {config: config, error: err, code: 447}, function () {
							checkIfError(req, res, {config: config, error: tenantOauthUser, code: 448}, function () {
								mongo.findOne(oauthUsersColName, {
									"tId": req.soajs.inputmaskData.id,
									"_id": req.soajs.inputmaskData.uId
								}, function (error, tenantOauthUser) {
									checkIfError(req, res, {
										config: config,
										error: error || !tenantOauthUser,
										code: 447
									}, function () {
										if (req.soajs.inputmaskData.userId) {
											tenantOauthUser.userId = req.soajs.inputmaskData.userId;
										}
										if (req.soajs.inputmaskData.password) {
											var hasher = new Hasher(config.hasher);
											tenantOauthUser.password = hasher.hashSync(req.soajs.inputmaskData.password);
										}
										mongo.save(oauthUsersColName, tenantOauthUser, function (error) {
											checkIfError(req, res, {
												config: config,
												error: error,
												code: 451
											}, function () {
												return res.jsonp(req.soajs.buildResponse(null, "tenant oauth user updated successful"));
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

	"deleteApplication": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				checkCanEdit(mongo, req, function (err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						checkIfError(req, res, {
							config: config,
							error: req.soajs.inputmaskData.appId === req.soajs.tenant.application.appId,
							code: 463
						}, function () {
							var criteria = {'_id': req.soajs.inputmaskData.id};
							mongo.findOne(colName, criteria, function (error, tenantRecord) {
								checkIfError(req, res, {
									config: config,
									error: error || !tenantRecord,
									code: 432
								}, function () {
									for (var i = 0; i < tenantRecord.applications.length; i++) {
										if (tenantRecord.applications[i].appId.toString() === req.soajs.inputmaskData.appId) {
											var keysArr = tenantRecord.applications[i].keys;
											break;
										}
									}
									removeDashboardExtKeysFromApplication(mongo, keysArr, tenantRecord.code, function (error) {
										checkIfError(req, res, {config: config, error: error, code: 443}, function () {
											var x = getRequestedSubElementsPositions(tenantRecord, req);
											checkIfError(req, res, {
												config: config,
												error: !x.found,
												code: 432
											}, function () {
												tenantRecord.applications.splice(x.position[0], 1);
												saveTenantRecordAndExit(mongo, tenantRecord, config, req, res, 432, "tenant application delete successful");
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

	"listApplication": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				mongo.findOne(colName, {'_id': req.soajs.inputmaskData.id}, function (error, tenantRecord) {
					checkIfError(req, res, {config: config, error: error || !tenantRecord, code: 431}, function () {
						return res.jsonp(req.soajs.buildResponse(null, tenantRecord.applications));
					});
				});
			});
		});
	},

	"addApplication": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				checkCanEdit(mongo, req, function (err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						var criteria = {'_id': req.soajs.inputmaskData.id};
						req.soajs.inputmaskData.productCode = req.soajs.inputmaskData.productCode.toUpperCase();
						req.soajs.inputmaskData.packageCode = req.soajs.inputmaskData.packageCode.toUpperCase();
						checkifProductAndPackageExist(req.soajs.inputmaskData.productCode, req.soajs.inputmaskData.packageCode, mongo, function (error, infoRecord) {
							checkIfError(req, res, {config: config, error: error, code: 429}, function () {
								checkIfError(req, res, {config: config, error: !infoRecord, code: 434}, function () {
									mongo.findOne(colName, criteria, function (error, tenantRecord) {
										checkIfError(req, res, {
											config: config,
											error: error || !tenantRecord,
											code: 429
										}, function () {
											var newApplication = {
												"product": req.soajs.inputmaskData.productCode,
												"package": req.soajs.inputmaskData.productCode + '_' + req.soajs.inputmaskData.packageCode,
												"appId": new mongo.ObjectId(),
												"description": req.soajs.inputmaskData.description,
												"_TTL": req.soajs.inputmaskData._TTL * 3600 * 1000, // 24 hours
												"keys": []
											};
											if (req.soajs.inputmaskData.acl) {
												newApplication.acl = req.soajs.inputmaskData.acl;
											}
											tenantRecord.applications.push(newApplication);
											saveTenantRecordAndExit(mongo, tenantRecord, config, req, res, 433, "tenant application add successful");
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

	"updateApplication": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				checkCanEdit(mongo, req, function (err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						var criteria = {'_id': req.soajs.inputmaskData.id};
						req.soajs.inputmaskData.productCode = req.soajs.inputmaskData.productCode.toUpperCase();
						req.soajs.inputmaskData.packageCode = req.soajs.inputmaskData.packageCode.toUpperCase();
						checkifProductAndPackageExist(req.soajs.inputmaskData.productCode, req.soajs.inputmaskData.packageCode, mongo, function (error, infoRecord) {
							checkIfError(req, res, {config: config, error: error, code: 429}, function () {
								checkIfError(req, res, {config: config, error: !infoRecord, code: 434}, function () {
									mongo.findOne(colName, criteria, function (error, tenantRecord) {
										checkIfError(req, res, {
											config: config,
											error: error || !tenantRecord,
											code: 430
										}, function () {
											var found = false;
											for (var i = 0; i < tenantRecord.applications.length; i++) {
												if (tenantRecord.applications[i].product === req.soajs.inputmaskData.productCode) {
													if (tenantRecord.applications[i].package === req.soajs.inputmaskData.productCode + '_' + req.soajs.inputmaskData.packageCode) {
														if (tenantRecord.applications[i].appId.toString() === req.soajs.inputmaskData.appId) {
															tenantRecord.applications[i].product = req.soajs.inputmaskData.productCode;
															tenantRecord.applications[i].package = req.soajs.inputmaskData.productCode + '_' + req.soajs.inputmaskData.packageCode;
															tenantRecord.applications[i].description = req.soajs.inputmaskData.description;
															tenantRecord.applications[i]._TTL = req.soajs.inputmaskData._TTL * 3600 * 1000;
															if (req.soajs.inputmaskData.acl) {
																tenantRecord.applications[i].acl = req.soajs.inputmaskData.acl;
															}
															if (req.soajs.inputmaskData.clearAcl && ( req.soajs.inputmaskData.clearAcl === true )) {
																delete tenantRecord.applications[i].acl;
															}
															found = true;
															break;
														}
													}
												}
											}
											checkIfError(req, res, {
												config: config,
												error: !found,
												code: 431
											}, function () {
												saveTenantRecordAndExit(mongo, tenantRecord, config, req, res, 430, "tenant application update successful");
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

	"getTenantAcl": function (config, mongo, req, res) {
		var packageName, packageDescription, accessLevels;

		mongo.findOne(colName, {'_id': mongo.ObjectId(req.soajs.inputmaskData.id)}, function (error, tenantRecord) {
			checkIfError(req, res, {config: config, error: error, code: 600}, function () {
				doesTenantAccessDashboard(tenantRecord, function (error) {
					checkIfError(req, res, {config: config, error: error, code: error}, function () {
						if (!packageName) {
							packageName = req.soajs.tenant.application.package;
						}
						proceedWithAcl(packageName);
					});
				});
			});
		});

		function doesTenantAccessDashboard(tenantRecord, cb) {
			var keys = [];
			if (tenantRecord.applications) {
				tenantRecord.applications.forEach(function (oneApplication) {
					if (oneApplication.keys) {
						oneApplication.keys.forEach(function (oneKey) {
							if (oneKey.extKeys) {
								oneKey.extKeys.forEach(function (oneExtKey) {
									keys.push(oneExtKey.extKey);
								});
							}
						});
					}
				});
			}

			if (keys.length === 0) {
				//return cb({"code": 600, "msg": config.errors[600]})
				return cb(600);
			}

			checkKeyAccess(tenantRecord.code, keys, 0, function (error, response) {
				if (error) {
					//return cb({"code": 600, "msg": config.errors[600]});
					return cb(600);
				}
				if (response === false) {
					return cb(null, null);
				}

				//get the package for this extKey
				tenantRecord.applications.forEach(function (oneApplication) {
					if (oneApplication.keys) {
						oneApplication.keys.forEach(function (oneKey) {
							if (oneKey.extKeys) {
								oneKey.extKeys.forEach(function (oneExtKey) {
									if (oneExtKey.extKey === response) {
										packageName = oneApplication.package;
									}
								});
							}
						});
					}
				});
				return cb(null, true);
			});
		}

		function checkKeyAccess(tenantCode, keys, counter, cb) {
			mongo.findOne(dbKeysColl, {"code": tenantCode, "key": keys[counter]}, function (error, record) {
				if (error) {
					return cb(error);
				}
				if (record) {
					return cb(null, keys[counter]);
				}

				counter++;
				if (counter === keys.length) {
					return cb(null, false);
				}
				else {
					checkKeyAccess(tenantCode, keys, counter, cb);
				}
			})
		}

		function proceedWithAcl(packageName) {
			mongo.findOne("products", {
				'code': req.soajs.tenant.application.product,
				"packages.code": packageName
			}, function (error, productRecord) {
				checkIfError(req, res, {config: config, error: error || !productRecord, code: 600}, function () {
					productRecord.packages.forEach(function (onePackage) {
						if (onePackage.code === packageName) {
							accessLevels = onePackage.acl;
							packageDescription = onePackage.description;
						}
					});
					var servicesNames = Object.keys(accessLevels);
					getServicesAndTheirAPIs(servicesNames, function (error, servicesInfo) {
						checkIfError(req, res, {config: config, error: error, code: error}, function () {
							var servicesNames = [];
							for (var sN in accessLevels) {
								if (accessLevels[sN].access || accessLevels[sN].apis || accessLevels[sN].apisRegExp || accessLevels[sN].apisPermission) {
									servicesNames.push(sN);
								}
								else {
									servicesNames = servicesNames.concat(Object.keys(accessLevels[sN]));
								}
							}
							//var servicesNames = Object.keys(accessLevels);
							getServicesAndTheirAPIs(servicesNames, function (error, servicesInfo) {
								if (error) {
									return res.jsonp(req.soajs.buildResponse(error));
								}

								var data = {
									"services": servicesInfo,
									"applications": [{
										'package': packageName,
										'description': packageDescription,
										'parentPackageAcl': accessLevels
									}]
								};

								return res.jsonp(req.soajs.buildResponse(null, data));
							});
						});
					});
				});
			});
		}

		function getServicesAndTheirAPIs(servicesNames, cb) {
			var criteria = (servicesNames.length > 0) ? {'name': {$in: servicesNames}} : {};
			mongo.find('services', criteria, function (err, records) {
				if (err) {
					//return cb({"code": 600, "msg": config.errors[600]});
					return cb(600);
				}
				return cb(null, records);
			});
		}
	},

	"createApplicationKey": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				checkCanEdit(mongo, req, function (err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						var criteria = {'_id': req.soajs.inputmaskData.id};
						mongo.findOne(colName, criteria, function (error, tenantRecord) {
							checkIfError(req, res, {
								config: config,
								error: error || !tenantRecord,
								code: 436
							}, function () {
								var x = getRequestedSubElementsPositions(tenantRecord, req);
								checkIfError(req, res, {config: config, error: !x.found, code: 436}, function () {
									var provision = require("soajs/modules/soajs.provision");
									provision.init(req.soajs.registry.coreDB.provision, req.soajs.log);
									provision.generateInternalKey(function (error, internalKey) {
										checkIfError(req, res, {config: config, error: error, code: 436}, function () {
											tenantRecord.applications[x.position[0]].keys.push({
												"key": internalKey,
												"extKeys": [],
												"config": {}
											});
											saveTenantRecordAndExit(mongo, tenantRecord, config, req, res, 436, "application key add successful");
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

	"getApplicationKeys": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				mongo.findOne(colName, {'_id': req.soajs.inputmaskData.id}, function (error, tenantRecord) {
					checkIfError(req, res, {config: config, error: error || !tenantRecord, code: 435}, function () {
						var keys = [];
						//find the application
						tenantRecord.applications.forEach(function (oneApplication) {
							if (oneApplication.appId.toString() === req.soajs.inputmaskData.appId) {
								keys = oneApplication.keys;
							}
						});
						return res.jsonp(req.soajs.buildResponse(null, keys));
					});
				});
			});
		});
	},

	"deleteApplicationKey": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				checkCanEdit(mongo, req, function (err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						checkIfError(req, res, {
							config: config,
							error: req.soajs.inputmaskData.key === req.soajs.tenant.key.iKey,
							code: 464
						}, function () {
							var criteria = {'_id': req.soajs.inputmaskData.id};
							mongo.findOne(colName, criteria, function (error, tenantRecord) {
								checkIfError(req, res, {
									config: config,
									error: error || !tenantRecord,
									code: 437
								}, function () {
									for (var i = 0; i < tenantRecord.applications.length; i++) {
										for (var j = 0; j < tenantRecord.applications[i].keys.length; j++) {
											if (tenantRecord.applications[i].keys[j].key === req.soajs.inputmaskData.key) {
												var extKeysArr = tenantRecord.applications[i].keys[j].extKeys;
												break;
											}
										}
									}
									removeDashboardExtKeysFromKey(mongo, extKeysArr, tenantRecord.code, function (error) {
										checkIfError(req, res, {config: config, error: error, code: 600}, function () {
											var x = getRequestedSubElementsPositions(tenantRecord, req);
											checkIfError(req, res, {
												config: config,
												error: !x.found,
												code: 437
											}, function () {
												tenantRecord.applications[x.position[0]].keys.splice(x.position[1], 1);
												saveTenantRecordAndExit(mongo, tenantRecord, config, req, res, 437, "application key remove successful");
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

	"listApplicationExtKeys": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				mongo.findOne(colName, {'_id': req.soajs.inputmaskData.id}, function (error, tenantRecord) {
					checkIfError(req, res, {config: config, error: error || !tenantRecord, code: 442}, function () {
						var x = getRequestedSubElementsPositions(tenantRecord, req);
						if (x.found) {
							//mark ext keys with dashboard access before replying
							var extKeys = tenantRecord.applications[x.position[0]].keys[x.position[1]].extKeys;
							mongo.find(dbKeysColl, function (error, dbKeys) {
								checkIfError(req, res, {config: config, error: error, code: 600}, function () {
									extKeys.forEach(function (extKeyObj) {
										for (var i = 0; i < dbKeys.length; i++) {
											if (extKeyObj.extKey === dbKeys[i].key) {
												extKeyObj.dashboardAccess = true;
												break;
											}
										}
									});

									return res.jsonp(req.soajs.buildResponse(null, extKeys));
								});
							});
						} else {
							return res.jsonp(req.soajs.buildResponse(null, []));
						}
					});
				});
			});
		});
	},

	"addApplicationExtKeys": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				checkCanEdit(mongo, req, function (err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						var criteria = {'_id': req.soajs.inputmaskData.id};
						mongo.findOne(colName, criteria, function (error, tenantRecord) {
							checkIfError(req, res, {
								config: config,
								error: error || !tenantRecord,
								code: 440
							}, function () {
								var x = getRequestedSubElementsPositions(tenantRecord, req);
								checkIfError(req, res, {config: config, error: !x.found, code: 440}, function () {
									var provision = require("soajs/modules/soajs.provision");
									provision.init(req.soajs.registry.coreDB.provision, req.soajs.log);
									provision.generateExtKey(req.soajs.inputmaskData.key, req.soajs.servicesConfig.key, function (error, extKeyValue) {
										checkIfError(req, res, {config: config, error: error, code: 440}, function () {
											var newExtKey = {
												"extKey": extKeyValue,
												"device": req.soajs.inputmaskData.device,
												"geo": req.soajs.inputmaskData.geo
											};
											if (req.soajs.inputmaskData.expDate) {
												newExtKey.expDate = new Date(req.soajs.inputmaskData.expDate).getTime() + config.expDateTTL;
											}
											//push new extKey
											tenantRecord.applications[x.position[0]].keys[x.position[1]].extKeys.push(newExtKey);
											//if application uses a locked product, add external key to dashboard_extKeys collection
											criteria = {'code': tenantRecord.applications[x.position[0]].product};
											mongo.findOne(prodColName, criteria, function (error, productRecord) {
												checkIfError(req, res, {
													config: config,
													error: error || !productRecord,
													code: 440
												}, function () {
													if (productRecord.locked) {
														mongo.count(dbKeysColl, {'code': tenantRecord.code}, function (error, count) {
															checkIfError(req, res, {
																config: config,
																error: error,
																code: 400
															}, function () {
																if (count === 0) {
																	var dbKey = {
																		'code': tenantRecord.code,
																		'key': extKeyValue
																	};
																	mongo.save(dbKeysColl, dbKey, function (error) {
																		checkIfError(req, res, {
																			config: config,
																			error: error,
																			code: 440
																		}, function () {
																			saveTenantRecordAndExit(mongo, tenantRecord, config, req, res, 440, "tenant application ext key add successful");
																		});
																	});
																} else {
																	saveTenantRecordAndExit(mongo, tenantRecord, config, req, res, 440, "tenant application ext key add successful");
																}
															});
														});
													} else {
														saveTenantRecordAndExit(mongo, tenantRecord, config, req, res, 440, "tenant application ext key add successful");
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
	},

	"updateApplicationExtKeys": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				checkCanEdit(mongo, req, function (err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						var criteria = {'_id': req.soajs.inputmaskData.id};
						mongo.findOne(colName, criteria, function (error, tenantRecord) {
							checkIfError(req, res, {
								config: config,
								error: error || !tenantRecord,
								code: 441
							}, function () {
								var x = getRequestedSubElementsPositions(tenantRecord, req);
								checkIfError(req, res, {config: config, error: !x.found, code: 441}, function () {
									if (req.soajs.inputmaskData.expDate) {
										tenantRecord.applications[x.position[0]].keys[x.position[1]].extKeys[x.position[2]].expDate = new Date(req.soajs.inputmaskData.expDate).getTime() + config.expDateTTL;
									}
									tenantRecord.applications[x.position[0]].keys[x.position[1]].extKeys[x.position[2]].device = req.soajs.inputmaskData.device;
									tenantRecord.applications[x.position[0]].keys[x.position[1]].extKeys[x.position[2]].geo = req.soajs.inputmaskData.geo;

									saveTenantRecordAndExit(mongo, tenantRecord, config, req, res, 441, "tenant application ext key update successful");
								});
							});
						});
					});
				});
			});
		});
	},

	"deleteApplicationExtKeys": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				checkCanEdit(mongo, req, function (err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						checkIfError(req, res, {
							config: config,
							error: req.soajs.inputmaskData.extKey === req.soajs.tenant.key.eKey,
							code: 465
						}, function () {
							var criteria = {'_id': req.soajs.inputmaskData.id};
							mongo.findOne(colName, criteria, function (error, tenantRecord) {
								checkIfError(req, res, {
									config: config,
									error: error || !tenantRecord,
									code: 443
								}, function () {
									for (var i = 0; i < tenantRecord.applications.length; i++) {
										for (var j = 0; j < tenantRecord.applications[i].keys.length; j++) {
											for (var k = 0; k < tenantRecord.applications[i].keys[j].extKeys.length; k++) {
												if (tenantRecord.applications[i].keys[j].extKeys[k].extKey === req.soajs.inputmaskData.extKey) {
													var extKey = tenantRecord.applications[i].keys[j].extKeys[k].extKey;
													break;
												}
											}
										}
									}
									removeDashboardExtKey(mongo, extKey, tenantRecord.code, function (error) {
										checkIfError(req, res, {config: config, error: error, code: 600}, function () {
											var x = getRequestedSubElementsPositions(tenantRecord, req);
											checkIfError(req, res, {
												config: config,
												error: !x.found,
												code: 443
											}, function () {
												tenantRecord.applications[x.position[0]].keys[x.position[1]].extKeys.splice(x.position[2], 1);
												saveTenantRecordAndExit(mongo, tenantRecord, config, req, res, 443, "tenant application ext key delete successful");
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

	"updateApplicationConfig": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				req.soajs.inputmaskData.envCode = req.soajs.inputmaskData.envCode.toUpperCase();
				checkCanEdit(mongo, req, function (err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						var criteria = {'_id': req.soajs.inputmaskData.id};
						mongo.findOne(colName, criteria, function (error, tenantRecord) {
							checkIfError(req, res, {
								config: config,
								error: error || !tenantRecord,
								code: 445
							}, function () {
								checkIfEnvironmentExists(mongo, req.soajs.inputmaskData.envCode, function (error, exists) {
									checkIfError(req, res, {config: config, error: error, code: 445}, function () {
										checkIfError(req, res, {
											config: config,
											error: !exists,
											code: 446
										}, function () {
											var x = getRequestedSubElementsPositions(tenantRecord, req);
											checkIfError(req, res, {
												config: config,
												error: !x.found,
												code: 445
											}, function () {
												tenantRecord.applications[x.position[0]].keys[x.position[1]].config[req.soajs.inputmaskData.envCode.toLowerCase()] = req.soajs.inputmaskData.config;
												if (Object.keys(tenantRecord.applications[x.position[0]].keys[x.position[1]].config[req.soajs.inputmaskData.envCode.toLowerCase()]).length === 0)
													delete tenantRecord.applications[x.position[0]].keys[x.position[1]].config[req.soajs.inputmaskData.envCode.toLowerCase()];
												saveTenantRecordAndExit(mongo, tenantRecord, config, req, res, 445, "tenant application configuration update successful");
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

	"listApplicationConfig": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				mongo.findOne(colName, {'_id': req.soajs.inputmaskData.id}, function (error, tenantRecord) {
					checkIfError(req, res, {config: config, error: error || !tenantRecord, code: 444}, function () {
						var x = getRequestedSubElementsPositions(tenantRecord, req);

						if (x.found) {
							return res.jsonp(req.soajs.buildResponse(null, tenantRecord.applications[x.position[0]].keys[x.position[1]].config));
						} else {
							return res.jsonp(req.soajs.buildResponse(null, {}));
						}
					});
				});
			});
		});
	},

	"permissionsGet": function (config, mongo, req, res) {
		var dashCluster = objectHash({
			"servers": req.soajs.registry.coreDB.session.servers,
			"credentials": req.soajs.registry.coreDB.session.credentials,
			"URLParam": req.soajs.registry.coreDB.session.URLParam,
			"extraParam": req.soajs.registry.coreDB.session.extraParam
		});
		var dashDb = req.soajs.registry.coreDB.session.name;
		var dashColl = req.soajs.registry.coreDB.session.collection;

		checkIfError(req, res, {
			config: config,
			error: !req.soajs.session || !req.soajs.session.getUrac(),
			code: 601
		}, function () {
			getUserAclPerKey(function (info) {
				async.mapLimit(info.environments, info.environments.length, loginToEnvViaRoaming, function (error, envauth) {
					checkIfError(req, res, {config: config, error: error, code: 400}, function () {

						var auth = {};
						envauth.forEach(function(oneEntry){
							if(typeof(oneEntry) === 'object'){
								auth[oneEntry.envTo] = oneEntry.soajsauth;
							}
						});

						return res.jsonp(req.soajs.buildResponse(null, {
							"acl": info.ACL,
							"environments": info.environments,
							"envauth": auth
						}));
					});
				});
			})
		});

		function getUserAclPerKey(cb) {
			mongo.find(envColName, {}, {"code": 1, "deployer": 1, "dbs": 1}, function (err, records) {
				checkIfError(req, res, {config: config, error: err, code: 402}, function () {
					var ACL = req.soajs.session.getAcl();
					if (ACL) {
						return cb({"ACL": ACL, "environments": records});
					}

					var tenant = req.soajs.tenant;
					ACL = (tenant.application.acl) ? tenant.application.acl : tenant.application.package_acl;
					return cb({"ACL": ACL, "environments": records});
				});
			});
		}

		function loginToEnvViaRoaming(envRecord, cb) {
			if(envRecord.code.toUpperCase() === process.env.SOAJS_ENV.toUpperCase()){
				return cb(null, true);
			}
			var clusterName = envRecord.dbs.config.session.cluster;
			var envCluster = objectHash(envRecord.dbs.clusters[clusterName]);
			var envDb = envRecord.dbs.config.session.name;
			var envColl = envRecord.dbs.config.session.collection;

			if(envCluster === dashCluster && dashDb === envDb && dashColl === envColl){
				return cb(null, true);
			}

			/*
				1- get the session
				2- get the cluster of the session
				3- use object-hash and compare if the session cluster of remote env is not the same as local env
				4- if no diff, return cb(null, true)
				5- else resume and roam ( diff clusters are involved )
			 */
			req.soajs.roaming.roamEnv(envRecord.code.toLowerCase(), {}, cb);
		}
	},

	"extKeyGet": function (config, mongo, req, res) {
		checkIfError(req, res, {
			config: config,
			error: !req.soajs.session || !req.soajs.session.getUrac(),
			code: 601
		}, function () {
			var tenant = req.soajs.session.getUrac().tenant;
			findExtKey(tenant, function (error, extKey) {
				checkIfError(req, res, {config: config, error: error, code: 600}, function () {
					checkIfError(req, res, {config: config, error: !extKey, code: 609}, function () {
						doRoaming(extKey);
					});
				});
			});
		});

		function doRoaming(extKey) {
			req.soajs.roaming.roamExtKey(extKey, {}, function (error) {
				checkIfError(req, res, {config: config, error: error, code: 600}, function () {
					return res.json(req.soajs.buildResponse(null, {extKey: extKey}));
				});
			});
		}

		function findExtKey(tenant, cb) {
			mongo.findOne("dashboard_extKeys", {"code": tenant.code}, function (error, record) {
				if (error || !record) {
					return cb(error, null);
				}
				return cb(null, record.key);
			});
		}
	},

	"listDashboardKeys": function (config, mongo, req, res) {
		mongo.find(dbKeysColl, function (err, records) {
			checkIfError(req, res, {config: config, error: err, code: 422}, function () {
				return res.jsonp(req.soajs.buildResponse(null, records));
			});
		});
	}
};