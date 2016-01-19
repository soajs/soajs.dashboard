'use strict';
var colName = "tenants";
var oauthUsersColName = "oauth_urac";
var prodColName = "products";
var envColName = "environment";
var dbKeysColl = "dashboard_extKeys";

var Hasher = require("../utils/hasher.js");
var request = require("request");
var async = require("async");

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
		if (error) {
			return res.jsonp(req.soajs.buildResponse({"code": code, "msg": config.errors[code]}));
		}

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
}

function removeDashboardExtKey(mongo, extKey, code, cb) {
	if (!extKey)
		return cb();

	mongo.remove (dbKeysColl, {'code': code, 'key': extKey}, function (error, data) {
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

	async.each (extKeysArr, function (extKeyObj, callback) {
		removeDashboardExtKey (mongo, extKeyObj.extKey, code, function(error, data) {
			if (error)
				return callback (error);

			return callback (null, data || null);
		});
	}, function (error, data) {
		return cb(error, data);
	});
}

function removeDashboardExtKeysFromApplication (mongo, keysArr, code, cb) {
	if (!keysArr || keysArr.length === 0)
		return cb();

	async.each (keysArr, function (key, callback) {
		removeDashboardExtKeysFromKey(mongo, key.extKeys, code, function (error, data) {
			if (error)
				return callback (error);

			if (data)
				return callback (null, data);

			return callback();
		});
	}, function (error, data) {
		return cb(error, data);
	});
}

module.exports = {
	"delete": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			if (err) {
				return res.jsonp(req.soajs.buildResponse({"code": 438, "msg": config.errors[438]}));
			}

			checkCanEdit(mongo, req, function (err) {
				if (err) {
					return res.jsonp(req.soajs.buildResponse({"code": err, "msg": config.errors[err]}));
				}

				//prevent operator from deleting the tenant he is logged in with
				if (req.soajs.inputmaskData.id.toString() === req.soajs.tenant.id) {
					return res.jsonp(req.soajs.buildResponse({"code": 462, "msg": config.errors[462]}));
				}
				//get tenant code from collection before deleting, delete tenant, then delete dbKey if it exists
				mongo.findOne(colName, {'_id': req.soajs.inputmaskData.id}, {'code': 1}, function (error, record) {
					if (error) {
						return res.jsonp(req.soajs.buildResponse({"code": 422, "msg": config.errors[422]}));
					}
					if (!record) {
						return res.jsonp(req.soajs.buildResponse({"code": 438, "msg": config.errors[438]}));
					}

					var tCode = record.code;
					var criteria = {'_id': req.soajs.inputmaskData.id, 'locked': {$ne: true}};
					mongo.remove(colName, criteria, function (error) {
						if (error) {
							return res.jsonp(req.soajs.buildResponse({"code": 424, "msg": config.errors[424]}));
						}
						mongo.remove(dbKeysColl, {'code': tCode}, function (error) {
							if (error) {
								return res.jsonp(req.soajs.buildResponse({"code": 424, "msg": config.errors[424]}));
							}
							return res.jsonp(req.soajs.buildResponse(null, "tenant delete successful"));
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
			if (err) {
				return res.jsonp(req.soajs.buildResponse({"code": 422, "msg": config.errors[422]}));
			}

			//generate oauth authorization if needed.
			records.forEach(function (oneTenant) {
				if (oneTenant.oauth && oneTenant.oauth.secret && oneTenant.oauth.secret !== '') {
					oneTenant.oauth.authorization = "Basic " + new Buffer(oneTenant._id.toString() + oneTenant.oauth.secret).toString('base64');
				}
			});
			return res.jsonp(req.soajs.buildResponse(null, records));
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
			if (error) {
				return res.jsonp(req.soajs.buildResponse({"code": 420, "msg": config.errors[420]}));
			}

			if (count > 0) {
				return res.jsonp(req.soajs.buildResponse({"code": 423, "msg": config.errors[423]}));
			}

			mongo.insert(colName, record, function (err, data) {
				if (err || !data) {
					return res.jsonp(req.soajs.buildResponse({"code": 420, "msg": config.errors[420]}));
				}

				record.email = req.soajs.inputmaskData.email;
				createAdminUser(record, data, function (error, response, body) {
					logErrorAndExit(error, body, 606, function(){
						createAdminGroup(record, data, function (error, response, body) {
							logErrorAndExit(error, body, 607, function(){
								return res.jsonp(req.soajs.buildResponse(null, {'id': data[0]._id.toString()}));
							});
						});
					});
				});
			});
		});

		function logErrorAndExit(error, body, errCode, cb){
			if (error || !body.result) {
				if(error){
					req.soajs.log.error(error);
				}
				mongo.remove(colName, {'code': record.code}, function (error) {
					if (error) {
						req.soajs.log.error(error);
					}
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
						'username': 'admin_' + record.code.toLowerCase() + "_" + data[0]._id.toString(),
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
			if (err) {
				return res.jsonp(req.soajs.buildResponse({"code": 438, "msg": config.errors[438]}));
			}

			checkCanEdit(mongo, req, function (err) {
				if (err) {
					return res.jsonp(req.soajs.buildResponse({"code": err, "msg": config.errors[err]}));
				}

				var criteria = {'_id': req.soajs.inputmaskData.id};
				mongo.update(colName, criteria, s, {'upsert': false, 'safe': true}, function (err) {
					if (err) {
						return res.jsonp(req.soajs.buildResponse({"code": 421, "msg": config.errors[421]}));
					}
					return res.jsonp(req.soajs.buildResponse(null, "tenant update successful"));
				});
			});
		});
	},

	"get": function (config, mongo, req, res, cb) {
		validateId(mongo, req, function (err) {
			if (err) {
				return res.jsonp(req.soajs.buildResponse({"code": 438, "msg": config.errors[438]}));
			}

			mongo.findOne(colName, {"_id": req.soajs.inputmaskData.id}, function (err, data) {
				if (err || !data) {
					return res.jsonp(req.soajs.buildResponse({"code": 438, "msg": config.errors[438]}));
				}
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
	},

	"deleteOAuth": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			if (err) {
				return res.jsonp(req.soajs.buildResponse({"code": 438, "msg": config.errors[438]}));
			}

			checkCanEdit(mongo, req, function (err) {
				if (err) {
					return res.jsonp(req.soajs.buildResponse({"code": err, "msg": config.errors[err]}));
				}

				var criteria = {
					'_id': req.soajs.inputmaskData.id
				};
				var s = {'$set': {'oauth': {}}};
				mongo.update(colName, criteria, s, {'upsert': false, 'safe': true}, function (error) {
					if (error) {
						return res.jsonp(req.soajs.buildResponse({"code": 428, "msg": config.errors[428]}));
					}

					return res.jsonp(req.soajs.buildResponse(null, "tenant OAuth delete successful"));
				});
			});
		});
	},

	"getOAuth": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			if (err) {
				return res.jsonp(req.soajs.buildResponse({"code": 438, "msg": config.errors[438]}));
			}
			mongo.findOne(colName, {"_id": req.soajs.inputmaskData.id}, function (err, tenantRecords) {
				if (err) {
					return res.jsonp(req.soajs.buildResponse({"code": 427, "msg": config.errors[427]}));
				}
				return res.jsonp(req.soajs.buildResponse(null, tenantRecords.oauth));
			});
		});
	},

	"saveOAuth": function (config, code, msg, mongo, req, res) {
		validateId(mongo, req, function (err) {
			if (err) {
				return res.jsonp(req.soajs.buildResponse({"code": 438, "msg": config.errors[438]}));
			}
			checkCanEdit(mongo, req, function (err) {
				if (err) {
					return res.jsonp(req.soajs.buildResponse({"code": err, "msg": config.errors[err]}));
				}

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
				mongo.update(colName, criteria, s, {'upsert': false, 'safe': true}, function (error, tenantRecord) {
					if (error || !tenantRecord) {
						return res.jsonp(req.soajs.buildResponse({"code": code, "msg": config.errors[code]}));
					}
					return res.jsonp(req.soajs.buildResponse(null, msg));
				});
			});
		});
	},

	"getOAuthUsers": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			if (err) {
				return res.jsonp(req.soajs.buildResponse({"code": 438, "msg": config.errors[438]}));
			}
			mongo.find(oauthUsersColName, {"tId": req.soajs.inputmaskData.id}, function (err, tenantOauthUsers) {
				if (err) {
					return res.jsonp(req.soajs.buildResponse({"code": 447, "msg": config.errors[447]}));
				}

				return res.jsonp(req.soajs.buildResponse(null, tenantOauthUsers));
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

			if (err) {
				return res.jsonp(req.soajs.buildResponse({"code": 438, "msg": config.errors[438]}));
			}
			mongo.remove(oauthUsersColName, {
				"tId": req.soajs.inputmaskData.id,
				"_id": req.soajs.inputmaskData.uId
			}, function (err) {
				if (err) {
					return res.jsonp(req.soajs.buildResponse({"code": 450, "msg": config.errors[450]}));
				}
				return res.jsonp(req.soajs.buildResponse(null, "tenant oauth user removed successful"));
			});
		});
	},

	"addOAuthUsers": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			if (err) {
				return res.jsonp(req.soajs.buildResponse({"code": 438, "msg": config.errors[438]}));
			}
			mongo.findOne(oauthUsersColName, {
				"tId": req.soajs.inputmaskData.id,
				"userId": req.soajs.inputmaskData.userId
			}, function (err, tenantOauthUser) {
				if (err) {
					return res.jsonp(req.soajs.buildResponse({"code": 447, "msg": config.errors[447]}));
				}
				if (tenantOauthUser) {
					return res.jsonp(req.soajs.buildResponse({"code": 448, "msg": config.errors[448]}));
				}

				var hasher = new Hasher(config.hasher);
				var newPassword = hasher.hashSync(req.soajs.inputmaskData.password);
				var oauthUserRecord = {
					"userId": req.soajs.inputmaskData.userId,
					"password": newPassword,
					"tId": req.soajs.inputmaskData.id,
					"keys": null
				};

				mongo.insert(oauthUsersColName, oauthUserRecord, function (error) {
					if (error) {
						return res.jsonp(req.soajs.buildResponse({"code": 449, "msg": config.errors[449]}));
					}
					return res.jsonp(req.soajs.buildResponse(null, "tenant oauth user added successful"));
				});
			});
		});
	},

	"updateOAuthUsers": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			if (err) {
				return res.jsonp(req.soajs.buildResponse({"code": 438, "msg": config.errors[438]}));
			}

			try {
				req.soajs.inputmaskData.uId = mongo.ObjectId(req.soajs.inputmaskData.uId);
			}
			catch (e) {
				return res.jsonp(req.soajs.buildResponse({"code": 439, "msg": config.errors[439]}));
			}

			if (!req.soajs.inputmaskData.userId && !req.soajs.inputmaskData.password) {
				return res.jsonp(req.soajs.buildResponse({"code": 451, "msg": config.errors[451]}));
			}
			mongo.findOne(oauthUsersColName, {
				"tId": req.soajs.inputmaskData.id,
				"userId": req.soajs.inputmaskData.userId,
				"_id": {$ne: req.soajs.inputmaskData.uId}
			}, function (err, tenantOauthUser) {
				if (err) {
					return res.jsonp(req.soajs.buildResponse({"code": 447, "msg": config.errors[447]}));
				}
				if (tenantOauthUser) {
					return res.jsonp(req.soajs.buildResponse({"code": 448, "msg": config.errors[448]}));
				}

				mongo.findOne(oauthUsersColName, {
					"tId": req.soajs.inputmaskData.id,
					"_id": req.soajs.inputmaskData.uId
				}, function (error, tenantOauthUser) {
					if (err || !tenantOauthUser) {
						return res.jsonp(req.soajs.buildResponse({"code": 447, "msg": config.errors[447]}));
					}

					if (req.soajs.inputmaskData.userId) {
						tenantOauthUser.userId = req.soajs.inputmaskData.userId;
					}
					if (req.soajs.inputmaskData.password) {
						var hasher = new Hasher(config.hasher);
						tenantOauthUser.password = hasher.hashSync(req.soajs.inputmaskData.password);
					}

					mongo.save(oauthUsersColName, tenantOauthUser, function (error) {
						if (error) {
							return res.jsonp(req.soajs.buildResponse({"code": 451, "msg": config.errors[451]}));
						}
						return res.jsonp(req.soajs.buildResponse(null, "tenant oauth user updated successful"));
					});
				});
			});
		});
	},

	"deleteApplication": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			if (err) {
				return res.jsonp(req.soajs.buildResponse({"code": 438, "msg": config.errors[438]}));
			}

			checkCanEdit(mongo, req, function (err) {
				if (err) {
					return res.jsonp(req.soajs.buildResponse({"code": err, "msg": config.errors[err]}));
				}

				if (req.soajs.inputmaskData.appId === req.soajs.tenant.application.appId) {
					return res.jsonp(req.soajs.buildResponse({"code": 463, "msg": config.errors[463]}));
				}
				var criteria = {'_id': req.soajs.inputmaskData.id};
				mongo.findOne(colName, criteria, function (error, tenantRecord) {
					if (error || !tenantRecord) {
						return res.jsonp(req.soajs.buildResponse({"code": 432, "msg": config.errors[432]}));
					}

					for (var i = 0; i < tenantRecord.applications.length; i++) {
						if (tenantRecord.applications[i].appId.toString() === req.soajs.inputmaskData.appId) {
							var keysArr = tenantRecord.applications[i].keys;
							break;
						}
					}
					removeDashboardExtKeysFromApplication(mongo, keysArr, tenantRecord.code, function (error) {
						if (error) {
							return res.jsonp(req.soajs.buildResponse({"code": 443, "msg": config.errors[443]}));
						} else {
							var x = getRequestedSubElementsPositions(tenantRecord, req);
							if (x.found) {
								tenantRecord.applications.splice(x.position[0], 1);
								saveTenantRecordAndExit(mongo, tenantRecord, config, req, res, 432, "tenant application delete successful");
							} else {
								return res.jsonp(req.soajs.buildResponse({"code": 432, "msg": config.errors[432]}));
							}
						}
					});
				});
			});
		});
	},

	"listApplication": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			if (err) {
				return res.jsonp(req.soajs.buildResponse({"code": 438, "msg": config.errors[438]}));
			}
			mongo.findOne(colName, {'_id': req.soajs.inputmaskData.id}, function (error, tenantRecord) {
				if (error || !tenantRecord) {
					return res.jsonp(req.soajs.buildResponse({"code": 431, "msg": config.errors[431]}));
				}
				return res.jsonp(req.soajs.buildResponse(null, tenantRecord.applications));
			});
		});
	},

	"addApplication": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			if (err) {
				return res.jsonp(req.soajs.buildResponse({"code": 438, "msg": config.errors[438]}));
			}

			checkCanEdit(mongo, req, function (err) {
				if (err) {
					return res.jsonp(req.soajs.buildResponse({"code": err, "msg": config.errors[err]}));
				}

				var criteria = {'_id': req.soajs.inputmaskData.id};
				req.soajs.inputmaskData.productCode = req.soajs.inputmaskData.productCode.toUpperCase();
				req.soajs.inputmaskData.packageCode = req.soajs.inputmaskData.packageCode.toUpperCase();
				checkifProductAndPackageExist(req.soajs.inputmaskData.productCode, req.soajs.inputmaskData.packageCode, mongo, function (error, infoRecord) {
					if (error) {
						return res.jsonp(req.soajs.buildResponse({"code": 429, "msg": config.errors[429]}));
					}

					if (infoRecord === false) {
						return res.jsonp(req.soajs.buildResponse({"code": 434, "msg": config.errors[434]}));
					}

					mongo.findOne(colName, criteria, function (error, tenantRecord) {
						if (error || !tenantRecord) {
							return res.jsonp(req.soajs.buildResponse({"code": 429, "msg": config.errors[429]}));
						}

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
	},

	"updateApplication": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			if (err) {
				return res.jsonp(req.soajs.buildResponse({"code": 438, "msg": config.errors[438]}));
			}

			checkCanEdit(mongo, req, function (err) {
				if (err) {
					return res.jsonp(req.soajs.buildResponse({"code": err, "msg": config.errors[err]}));
				}

				var criteria = {'_id': req.soajs.inputmaskData.id};
				req.soajs.inputmaskData.productCode = req.soajs.inputmaskData.productCode.toUpperCase();
				req.soajs.inputmaskData.packageCode = req.soajs.inputmaskData.packageCode.toUpperCase();
				checkifProductAndPackageExist(req.soajs.inputmaskData.productCode, req.soajs.inputmaskData.packageCode, mongo, function (error, infoRecord) {
					if (error) {
						return res.jsonp(req.soajs.buildResponse({"code": 429, "msg": config.errors[429]}));
					}

					if (infoRecord === false) {
						return res.jsonp(req.soajs.buildResponse({"code": 434, "msg": config.errors[434]}));
					}

					mongo.findOne(colName, criteria, function (error, tenantRecord) {
						if (error || !tenantRecord) {
							return res.jsonp(req.soajs.buildResponse({"code": 430, "msg": config.errors[430]}));
						}

						var found = false;
						for (var i = 0; i < tenantRecord.applications.length; i++) {
							if (tenantRecord.applications[i].product === req.soajs.inputmaskData.productCode) {
								if (tenantRecord.applications[i].package === req.soajs.inputmaskData.productCode + '_' + req.soajs.inputmaskData.packageCode) {
									if (tenantRecord.applications[i].appId.toString() === req.soajs.inputmaskData.appId) {
										tenantRecord.applications[i].product = req.soajs.inputmaskData.productCode;
										tenantRecord.applications[i].package = req.soajs.inputmaskData.productCode + '_' + req.soajs.inputmaskData.packageCode;
										tenantRecord.applications[i].description = req.soajs.inputmaskData.description;
										if(req.soajs.inputmaskData._TTL){
											tenantRecord.applications[i]._TTL = req.soajs.inputmaskData._TTL * 3600 * 1000;
										}
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
						if (!found) {
							return res.jsonp(req.soajs.buildResponse({"code": 431, "msg": config.errors[431]}));
						}
						else {
							saveTenantRecordAndExit(mongo, tenantRecord, config, req, res, 430, "tenant application update successful");
						}
					});
				});
			});
		});
	},

	"getTenantAcl": function (config, mongo, req, res) {
		var packageName, packageDescription, accessLevels;

		mongo.findOne(colName, {'_id': mongo.ObjectId(req.soajs.inputmaskData.id)}, function(error, tenantRecord){
			if(error){
				return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]}));
			}

			doesTenantAccessDashboard(tenantRecord, function(error){
				if(error){
					return res.jsonp(req.soajs.buildResponse({"code": error.code, "msg": error.msg }));
				}
				if(!packageName){
					packageName = req.soajs.tenant.application.package;
				}
				proceedWithAcl(packageName);
			});
		});

		function doesTenantAccessDashboard(tenantRecord, cb){
			var keys = [];
			if(tenantRecord.applications){
				tenantRecord.applications.forEach(function(oneApplication){
					if(oneApplication.keys){
						oneApplication.keys.forEach(function(oneKey){
							if(oneKey.extKeys){
								oneKey.extKeys.forEach(function(oneExtKey){
									keys.push(oneExtKey.extKey);
								});
							}
						});
					}
				});
			}

			if(keys.length === 0){
				return cb({"code": 600, "msg": config.errors[600]})
			}

			checkKeyAccess(tenantRecord.code, keys, 0, function(error, response){
				if(error){
					return cb({"code": 600, "msg": config.errors[600]});
				}
				if(response === false){
					return cb(null, null);
				}

				//get the package for this extKey
				tenantRecord.applications.forEach(function(oneApplication){
					if(oneApplication.keys){
						oneApplication.keys.forEach(function(oneKey){
							if(oneKey.extKeys){
								oneKey.extKeys.forEach(function(oneExtKey){
									if(oneExtKey.extKey === response){
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

		function checkKeyAccess(tenantCode, keys, counter, cb){
			mongo.findOne(dbKeysColl, {"code": tenantCode, "key": keys[counter]}, function(error, record){
				if(error){ return cb(error); }
				if(record){ return cb(null, keys[counter]); }

				counter++;
				if(counter === keys.length){
					return cb(null, false);
				}
				else{
					checkKeyAccess(tenantCode, keys, counter, cb);
				}
			})
		}

		function proceedWithAcl(packageName){
			mongo.findOne("products", {
				'code': req.soajs.tenant.application.product,
				"packages.code": packageName
			}, function (error, productRecord) {
				if (error || !productRecord) {
					return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]}));
				}

				productRecord.packages.forEach(function (onePackage) {
					if (onePackage.code === packageName) {
						accessLevels = onePackage.acl;
						packageDescription = onePackage.description;
					}
				});
				var servicesNames = Object.keys(accessLevels);
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
		}

		function getServicesAndTheirAPIs(servicesNames, cb) {
			var criteria = (servicesNames.length > 0) ? {'name': {$in: servicesNames}} : {};
			mongo.find('services', criteria, function (err, records) {
				if (err) {
					return cb({"code": 600, "msg": config.errors[600]});
				}
				return cb(null, records);
			});
		}
	},

	"createApplicationKey": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			if (err) {
				return res.jsonp(req.soajs.buildResponse({"code": 438, "msg": config.errors[438]}));
			}
			checkCanEdit(mongo, req, function (err) {
				if (err) {
					return res.jsonp(req.soajs.buildResponse({"code": err, "msg": config.errors[err]}));
				}

				var criteria = {'_id': req.soajs.inputmaskData.id};
				mongo.findOne(colName, criteria, function (error, tenantRecord) {
					if (error || !tenantRecord) {
						return res.jsonp(req.soajs.buildResponse({"code": 436, "msg": config.errors[436]}));
					}

					var x = getRequestedSubElementsPositions(tenantRecord, req);
					if (x.found) {
						var provision = require("soajs/modules/soajs.provision");
						provision.init(req.soajs.registry.coreDB.provision, req.soajs.log);
						provision.generateInternalKey(function (error, internalKey) {
							if (error) {
								return res.jsonp(req.soajs.buildResponse({"code": 436, "msg": config.errors[436]}));
							}

							tenantRecord.applications[x.position[0]].keys.push({
								"key": internalKey,
								"extKeys": [],
								"config": {}
							});
							saveTenantRecordAndExit(mongo, tenantRecord, config, req, res, 436, "application key add successful");
						});
					} else {
						return res.jsonp(req.soajs.buildResponse({"code": 436, "msg": config.errors[436]}));
					}
				});
			});
		});
	},

	"getApplicationKeys": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			if (err) {
				return res.jsonp(req.soajs.buildResponse({"code": 438, "msg": config.errors[438]}));
			}
			mongo.findOne(colName, {'_id': req.soajs.inputmaskData.id}, function (error, tenantRecord) {
				if (error || !tenantRecord) {
					return res.jsonp(req.soajs.buildResponse({"code": 435, "msg": config.errors[435]}));
				}
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
	},

	"deleteApplicationKey": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			if (err) {
				return res.jsonp(req.soajs.buildResponse({"code": 438, "msg": config.errors[438]}));
			}

			checkCanEdit(mongo, req, function (err) {
				if (err) {
					return res.jsonp(req.soajs.buildResponse({"code": err, "msg": config.errors[err]}));
				}

				if (req.soajs.inputmaskData.key === req.soajs.tenant.key.iKey) {
					return res.jsonp(req.soajs.buildResponse({"code": 464, "msg": config.errors[464]}));
				}
				var criteria = {'_id': req.soajs.inputmaskData.id};
				mongo.findOne(colName, criteria, function (error, tenantRecord) {
					if (error || !tenantRecord) {
						return res.jsonp(req.soajs.buildResponse({"code": 437, "msg": config.errors[437]}));
					}

					for (var i = 0; i < tenantRecord.applications.length; i++) {
						for (var j = 0; j < tenantRecord.applications[i].keys.length; j++) {
							if (tenantRecord.applications[i].keys[j].key === req.soajs.inputmaskData.key) {
								var extKeysArr = tenantRecord.applications[i].keys[j].extKeys;
								break;
							}
						}
					}
					removeDashboardExtKeysFromKey(mongo, extKeysArr, tenantRecord.code, function (error) {
						if (error) {
							return console.log (error);
						}
						var x = getRequestedSubElementsPositions(tenantRecord, req);
						if (x.found) {
							tenantRecord.applications[x.position[0]].keys.splice(x.position[1], 1);
							saveTenantRecordAndExit(mongo, tenantRecord, config, req, res, 437, "application key remove successful");
						} else {
							return res.jsonp(req.soajs.buildResponse({"code": 437, "msg": config.errors[437]}));
						}
					});
				});
			});
		});
	},

	"listApplicationExtKeys": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			if (err) {
				return res.jsonp(req.soajs.buildResponse({"code": 438, "msg": config.errors[438]}));
			}
			mongo.findOne(colName, {'_id': req.soajs.inputmaskData.id}, function (error, tenantRecord) {
				if (error || !tenantRecord) {
					return res.jsonp(req.soajs.buildResponse({"code": 442, "msg": config.errors[442]}));
				}

				var x = getRequestedSubElementsPositions(tenantRecord, req);

				if (x.found) {
					//mark ext keys with dashboard access before replying
					var extKeys = tenantRecord.applications[x.position[0]].keys[x.position[1]].extKeys;
					mongo.find(dbKeysColl, function (error, dbKeys) {
						if (error) {
							return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]}));
						}

						extKeys.forEach (function (extKeyObj) {
							for (var i = 0; i < dbKeys.length; i++) {
								if (extKeyObj.extKey === dbKeys[i].key) {
									extKeyObj.dashboardAccess = true;
									break;
								}
							}
						});

						return res.jsonp(req.soajs.buildResponse(null, extKeys));
					});
				} else {
					return res.jsonp(req.soajs.buildResponse(null, []));
				}
			});
		});
	},

	"addApplicationExtKeys": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			if (err) {
				return res.jsonp(req.soajs.buildResponse({"code": 438, "msg": config.errors[438]}));
			}
			checkCanEdit(mongo, req, function (err) {
				if (err) {
					return res.jsonp(req.soajs.buildResponse({"code": err, "msg": config.errors[err]}));
				}

				var criteria = {'_id': req.soajs.inputmaskData.id};
				mongo.findOne(colName, criteria, function (error, tenantRecord) {
					if (error || !tenantRecord) {
						return res.jsonp(req.soajs.buildResponse({"code": 440, "msg": config.errors[440]}));
					}

					var x = getRequestedSubElementsPositions(tenantRecord, req);
					if (x.found) {
						var provision = require("soajs/modules/soajs.provision");
						provision.init(req.soajs.registry.coreDB.provision, req.soajs.log);
						provision.generateExtKey(req.soajs.inputmaskData.key, req.soajs.servicesConfig.key, function (error, extKeyValue) {
							if (error) {
								return res.jsonp(req.soajs.buildResponse({"code": 440, "msg": config.errors[440]}));
							}

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
							mongo.findOne (prodColName, criteria, function (error, productRecord) {
								if (error || !productRecord) {
									return res.jsonp(req.soajs.buildResponse({"code": 440, "msg": config.errors[440]}));
								}

								if(productRecord.locked) {
									mongo.count (dbKeysColl, {'code': tenantRecord.code}, function (error, count) {
										if (error) {
											return res.jsonp(req.soajs.buildResponse({"code": 440, "msg": config.errors[440]}));
										}

										if (count === 0) {
											var dbKey = { 'code': tenantRecord.code, 'key': extKeyValue };
											mongo.save (dbKeysColl, dbKey, function (error) {
												if (error) {
													return res.jsonp(req.soajs.buildResponse({"code": 440, "msg": config.errors[440]}));
												}

												saveTenantRecordAndExit(mongo, tenantRecord, config, req, res, 440, "tenant application ext key add successful");
											});
										} else {
											saveTenantRecordAndExit(mongo, tenantRecord, config, req, res, 440, "tenant application ext key add successful");
										}
									});
								} else {
									saveTenantRecordAndExit(mongo, tenantRecord, config, req, res, 440, "tenant application ext key add successful");
								}
							});
						});
					} else {
						return res.jsonp(req.soajs.buildResponse({"code": 440, "msg": config.errors[440]}));
					}
				});
			});
		});
	},

	"updateApplicationExtKeys": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			if (err) {
				return res.jsonp(req.soajs.buildResponse({"code": 438, "msg": config.errors[438]}));
			}
			checkCanEdit(mongo, req, function (err) {
				if (err) {
					return res.jsonp(req.soajs.buildResponse({"code": err, "msg": config.errors[err]}));
				}

				var criteria = {'_id': req.soajs.inputmaskData.id};
				mongo.findOne(colName, criteria, function (error, tenantRecord) {
					if (error || !tenantRecord) {
						return res.jsonp(req.soajs.buildResponse({"code": 441, "msg": config.errors[441]}));
					}

					var x = getRequestedSubElementsPositions(tenantRecord, req);
					if (x.found) {
						if (req.soajs.inputmaskData.expDate) {
							tenantRecord.applications[x.position[0]].keys[x.position[1]].extKeys[x.position[2]].expDate = new Date(req.soajs.inputmaskData.expDate).getTime() + config.expDateTTL;
						}
						tenantRecord.applications[x.position[0]].keys[x.position[1]].extKeys[x.position[2]].device = req.soajs.inputmaskData.device;
						tenantRecord.applications[x.position[0]].keys[x.position[1]].extKeys[x.position[2]].geo = req.soajs.inputmaskData.geo;

						saveTenantRecordAndExit(mongo, tenantRecord, config, req, res, 441, "tenant application ext key update successful");
					} else {
						return res.jsonp(req.soajs.buildResponse({"code": 441, "msg": config.errors[441]}));
					}
				});
			});
		});
	},

	"deleteApplicationExtKeys": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			if (err) {
				return res.jsonp(req.soajs.buildResponse({"code": 438, "msg": config.errors[438]}));
			}
			checkCanEdit(mongo, req, function (err) {
				if (err) {
					return res.jsonp(req.soajs.buildResponse({"code": err, "msg": config.errors[err]}));
				}

				if (req.soajs.inputmaskData.extKey === req.soajs.tenant.key.eKey) {
					return res.jsonp(req.soajs.buildResponse({"code": 465, "msg": config.errors[465]}));
				}
				var criteria = {'_id': req.soajs.inputmaskData.id};
				mongo.findOne(colName, criteria, function (error, tenantRecord) {
					if (error || !tenantRecord) {
						return res.jsonp(req.soajs.buildResponse({"code": 443, "msg": config.errors[443]}));
					}

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
						if (error) {
							return console.log (error);
						}
						var x = getRequestedSubElementsPositions(tenantRecord, req);
						if (x.found) {
							tenantRecord.applications[x.position[0]].keys[x.position[1]].extKeys.splice(x.position[2], 1);
							saveTenantRecordAndExit(mongo, tenantRecord, config, req, res, 443, "tenant application ext key delete successful");
						} else {
							return res.jsonp(req.soajs.buildResponse({"code": 443, "msg": config.errors[443]}));
						}
					});
				});
			});
		});
	},

	"updateApplicationConfig": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			if (err) {
				return res.jsonp(req.soajs.buildResponse({"code": 438, "msg": config.errors[438]}));
			}
			req.soajs.inputmaskData.envCode = req.soajs.inputmaskData.envCode.toUpperCase();
			checkCanEdit(mongo, req, function (err) {
				if (err) {
					return res.jsonp(req.soajs.buildResponse({"code": err, "msg": config.errors[err]}));
				}

				var criteria = {'_id': req.soajs.inputmaskData.id};
				mongo.findOne(colName, criteria, function (error, tenantRecord) {
					if (error || !tenantRecord) {
						return res.jsonp(req.soajs.buildResponse({"code": 445, "msg": config.errors[445]}));
					}

					checkIfEnvironmentExists(mongo, req.soajs.inputmaskData.envCode, function (error, exists) {
						if (error) {
							return res.jsonp(req.soajs.buildResponse({"code": 445, "msg": config.errors[445]}));
						}

						if (!exists) {
							return res.jsonp(req.soajs.buildResponse({"code": 446, "msg": config.errors[446]}));
						}

						var x = getRequestedSubElementsPositions(tenantRecord, req);
						if (x.found) {
							tenantRecord.applications[x.position[0]].keys[x.position[1]].config[req.soajs.inputmaskData.envCode.toLowerCase()] = req.soajs.inputmaskData.config;
							if (Object.keys(tenantRecord.applications[x.position[0]].keys[x.position[1]].config[req.soajs.inputmaskData.envCode.toLowerCase()]).length === 0)
								delete tenantRecord.applications[x.position[0]].keys[x.position[1]].config[req.soajs.inputmaskData.envCode.toLowerCase()];
							saveTenantRecordAndExit(mongo, tenantRecord, config, req, res, 445, "tenant application configuration update successful");
						} else {
							return res.jsonp(req.soajs.buildResponse({"code": 445, "msg": config.errors[445]}));
						}
					});
				});
			});
		});
	},

	"listApplicationConfig": function (config, mongo, req, res) {
		validateId(mongo, req, function (err) {
			if (err) {
				return res.jsonp(req.soajs.buildResponse({"code": 438, "msg": config.errors[438]}));
			}
			mongo.findOne(colName, {'_id': req.soajs.inputmaskData.id}, function (error, tenantRecord) {
				if (error || !tenantRecord) {
					return res.jsonp(req.soajs.buildResponse({"code": 444, "msg": config.errors[444]}));
				}

				var x = getRequestedSubElementsPositions(tenantRecord, req);

				if (x.found) {
					return res.jsonp(req.soajs.buildResponse(null, tenantRecord.applications[x.position[0]].keys[x.position[1]].config));
				} else {
					return res.jsonp(req.soajs.buildResponse(null, {}));
				}
			});
		});
	},

	"permissionsGet": function (config, mongo, req, res) {
		if (!req.soajs.session) {
			req.soajs.log.error('req.soajs.session is undefined');
			return res.jsonp(req.soajs.buildResponse({"code": 601, "msg": config.errors[601]}));
		}
		if (!req.soajs.session.getUrac()) {
			req.soajs.log.error('req.soajs.session.getUrac is undefined');
			return res.jsonp(req.soajs.buildResponse({"code": 601, "msg": config.errors[601]}));
		}

		mongo.find(envColName, {}, {"code": 1}, function(err, records) {
			if(err) { return res.jsonp(req.soajs.buildResponse({"code": 402, "msg": config.errors[402]})); }

			var envCode = (req.soajs.inputmaskData && req.soajs.inputmaskData.envCode) ? req.soajs.inputmaskData.envCode.toLowerCase() : null;
			var ACL = req.soajs.session.getAcl();
			if (ACL) {
				return res.json(req.soajs.buildResponse(null, {"acl": ACL, "environments": records}));
			}

			var tenant = req.soajs.tenant;
			if (tenant.application.acl) {
				ACL = tenant.application.acl;
			}
			else {
				ACL = tenant.application.package_acl;
			}

			return res.jsonp(req.soajs.buildResponse(null, {"acl": ACL, "environments": records}));
		});
	},

	"extKeyGet": function (config, mongo, req, res) {
		if (!req.soajs.session) {
			req.soajs.log.error('req.soajs.session is undefined');
			return res.jsonp(req.soajs.buildResponse({"code": 601, "msg": config.errors[601]}));
		}
		if (!req.soajs.session.getUrac()) {
			req.soajs.log.error('req.soajs.session.getUrac is undefined');
			return res.jsonp(req.soajs.buildResponse({"code": 601, "msg": config.errors[601]}));
		}

		var tenant = req.soajs.session.getUrac().tenant;
		findExtKey(tenant, function (error, extKey) {
			if (error) {
				return res.json(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]}));
			}

			if (!extKey) {
				return res.json(req.soajs.buildResponse({"code": 609, "msg": config.errors[609]}));
			}

			doRoaming(extKey);
		});


		function doRoaming(extKey) {
			req.soajs.roaming.roamExtKey(extKey, {}, function (error) {
				if (error) {
					req.soajs.log.error(error);
					return res.json(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]}));
				}
				return res.json(req.soajs.buildResponse(null, {extKey: extKey}));
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
			if (err) {
				return res.jsonp(req.soajs.buildResponse({"code": 422, "msg": config.errors[422]}));
			}
			return res.jsonp(req.soajs.buildResponse(null, records));
		});
	}
};