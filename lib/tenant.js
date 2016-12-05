'use strict';
var colName = "tenants";
var oauthUsersColName = "oauth_urac";
var prodColName = "products";
var envColName = "environment";
var dbKeysColl = "dashboard_extKeys";

var soajs = require("soajs");
var Hasher = soajs.hasher;
var Auth = soajs.authorization;

var request = require("request");
var async = require("async");
var objectHash = require("object-hash");

var fs = require('fs');

function checkIfError(req, res, data, cb) {
	if (data.error) {
		if (typeof (data.error) === 'object' && (data.error.message || data.error.msg)) {
			req.soajs.log.error(data.error);
		}
		if (data.code) {
			return res.jsonp(req.soajs.buildResponse({"code": data.code, "msg": data.config.errors[data.code]}));
		}

	} else {
		if (cb) return cb();
	}
}

function validateId(soajs, cb) {
	BL.model.validateId(soajs, cb);
}

function validateUid(soajs, cb){
	BL.model.validateCustomId(soajs, soajs.inputmaskData.uId, cb);
}

function checkCanEdit(soajs, cb) {
	var myUrac = soajs.session.getUrac();
	if (myUrac && myUrac.tenant.id.toString() === soajs.inputmaskData.id.toString()) {
		return cb(null, {});
	}
	else {
		var opts = {};
		opts.conditions = {'_id': soajs.inputmaskData.id, 'locked': true};
		opts.collection = colName;
		BL.model.findEntry(soajs, opts, function (error, record) {
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

function checkifProductAndPackageExist(soajs, productCode, packageCode, cb) {
	var opts = {};
	opts.collection = prodColName;
	opts.conditions = {'code': productCode};
	BL.model.findEntry(soajs, opts, function (error, productRecord) {
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
						if (req.soajs.inputmaskData.extKey && req.soajs.inputmaskData.extKeyEnv) {
							//find the ext key
							for (var k = 0; k < tenantRecord.applications[i].keys[j].extKeys.length; k++) {
								if (tenantRecord.applications[i].keys[j].extKeys[k].extKey === req.soajs.inputmaskData.extKey && tenantRecord.applications[i].keys[j].extKeys[k].env === req.soajs.inputmaskData.extKeyEnv) {
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

function saveTenantRecordAndExit(tenantRecord, config, req, res, code, msg) {
	var opts = {};
	opts.collection = colName;
	opts.record = tenantRecord;
	BL.model.saveEntry(req.soajs, opts, function (error) {
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

function removeDashboardExtKey(req, extKey, code, cb) {
	if (!extKey)
		return cb();

	var opts = {};
	opts.collection = dbKeysColl;
	opts.conditions = {'code': code, 'key': extKey.extKey, 'env': extKey.env};
	BL.model.removeEntry(req.soajs, opts, cb);
}

function removeDashboardExtKeysFromKey(req, extKeysArr, code, cb) {
	if (!extKeysArr || extKeysArr.length === 0)
		return cb();

	async.each(extKeysArr, function (extKeyObj, callback) {
		removeDashboardExtKey(req, extKeyObj, code, function (error, data) {
			return callback(error, data || null);
		});
	}, cb);
}

var BL = {
	model: null,

	"delete": function (config, req, res) {
		var opts = {};
		validateId(req.soajs, function (error) {
			checkIfError(req, res, {config: config, error: error, code: 438}, function () {
				checkCanEdit(req.soajs, function (err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						//prevent operator from deleting the tenant he is logged in with
						if (req.soajs.inputmaskData.id.toString() === req.soajs.tenant.id) {
							return res.jsonp(req.soajs.buildResponse({"code": 462, "msg": config.errors[462]}));
						}
						//get tenant code from collection before deleting, delete tenant, then delete dbKey if it exists
						opts.collection = colName;
						opts.conditions = {'_id': req.soajs.inputmaskData.id};
						opts.options = null;
						opts.fields = {'code': 1};
						BL.model.findEntry(req.soajs, opts, function (error, record) {
							checkIfError(req, res, {config: config, error: error, code: 422}, function () {
								checkIfError(req, res, {config: config, error: !record, code: 438}, function () {
									var tCode = record.code;
									opts.collection = colName;
									opts.conditions = {'_id': req.soajs.inputmaskData.id, 'locked': {$ne: true}};
									opts.fields = null;
									BL.model.removeEntry(req.soajs, opts, function (error) {
										checkIfError(req, res, {config: config, error: error, code: 424}, function () {
											opts.collection = dbKeysColl;
											opts.conditions = {'code': tCode}
											BL.model.removeEntry(req.soajs, opts, function (error) {
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

	"list": function (config, req, res) {
		var opts = {};
		opts.collection = colName;
		if (req.soajs.inputmaskData.type){
			if(Object.hasOwnProperty.call(req.soajs.inputmaskData, "negate") && req.soajs.inputmaskData.negate === true){
				opts.conditions = {'type' : {$ne: req.soajs.inputmaskData.type}};
			}
			else{
				opts.conditions = {'type' : req.soajs.inputmaskData.type};
			}
		}
		
		opts.options = {"sort": {"name": 1}};
		BL.model.findEntries(req.soajs, opts, function (err, records) {
			checkIfError(req, res, {config: config, error: err, code: 422}, function () {
				//generate oauth authorization if needed.
				records.forEach(function (oneTenant) {
					if (oneTenant.oauth && oneTenant.oauth.secret && oneTenant.oauth.secret !== '') {
						oneTenant.oauth.authorization = Auth.generate(oneTenant._id, oneTenant.oauth.secret);
					}
					else {
						oneTenant.oauth.authorization = "No Authorization Enabled, update tenant and set an 'oAuth Secret' to enable token generation.";
					}
				});
				return res.jsonp(req.soajs.buildResponse(null, records));
			});
		});
	},

	"add": function (config, req, res) {
		req.soajs.inputmaskData.code = req.soajs.inputmaskData.code.toUpperCase();

		var record = {
			"type": req.soajs.inputmaskData.type,
			"code": req.soajs.inputmaskData.code,
			"name": req.soajs.inputmaskData.name,
			"description": req.soajs.inputmaskData.description,
			"oauth": {},
			"applications": []
		};

		if (req.soajs.inputmaskData.tag)
			record.tag = req.soajs.inputmaskData.tag;

		var opts = {};
		opts.collection = colName;
		opts.conditions = {'$or': [{'code': record.code}, {'name': record.name}]};

		BL.model.countEntries(req.soajs, opts, function (error, count) {
			checkIfError(req, res, {config: config, error: error, code: 420}, function () {
				checkIfError(req, res, {config: config, error: count > 0, code: 423}, function () {
					opts = {};
					opts.collection = colName;
					opts.record = record;
					BL.model.insertEntry(req.soajs, opts, function (err, data) {
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
				if(error){
					req.soajs.log.error(error);
				}
				else{
					req.soajs.log.error(body.errors);
				}
				checkIfError(req, res, {config: config, error: error});
				opts = {};
				opts.collection = colName;
				opts.conditions = {'code': record.code};
				BL.model.removeEntry(req.soajs, opts, function (error) {
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

	"update": function (config, req, res) {
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
		var opts = {};
		validateId(req.soajs, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				checkCanEdit(req.soajs, function (err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						opts.collection = colName;
						opts.conditions = {'_id': req.soajs.inputmaskData.id};
						opts.fields = s;
						opts.options = {'upsert': false, 'safe': true};
						BL.model.updateEntry(req.soajs, opts, function (err) {
							checkIfError(req, res, {config: config, error: err, code: 421}, function () {
								return res.jsonp(req.soajs.buildResponse(null, "tenant update successful"));
							});
						});
					});
				});
			});
		});
	},

	"get": function (config, req, res, cb) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				opts.collection = colName;
				opts.conditions = {"_id": req.soajs.inputmaskData.id};
				BL.model.findEntry(req.soajs, opts, function (err, data) {
					checkIfError(req, res, {config: config, error: err || !data, code: 438}, function () {
						//generate oauth authorization if needed.
						if (data.oauth && data.oauth.secret && data.oauth.secret !== '') {
							data.oauth.authorization = "Basic " + new Buffer(data._id.toString() + ":" + data.oauth.secret).toString('base64');
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

	"deleteOAuth": function (config, req, res) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				checkCanEdit(req.soajs, function (err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						opts.collection = colName;
						opts.conditions = {'_id': req.soajs.inputmaskData.id};
						opts.fields = {'$set': {'oauth': {}}};
						opts.options = {'upsert': false, 'safe': true};
						BL.model.updateEntry(req.soajs, opts, function (error) {
							checkIfError(req, res, {config: config, error: error, code: 428}, function () {
								return res.jsonp(req.soajs.buildResponse(null, "tenant OAuth delete successful"));
							});
						});
					});
				});
			});
		});
	},

	"getOAuth": function (config, req, res) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				opts.collection = colName;
				opts.conditions = {"_id": req.soajs.inputmaskData.id};
				BL.model.findEntry(req.soajs, opts, function (err, tenantRecords) {
					checkIfError(req, res, {config: config, error: err || !tenantRecords, code: 427}, function () {
						return res.jsonp(req.soajs.buildResponse(null, tenantRecords.oauth));
					});
				});
			});
		});
	},

	"saveOAuth": function (config, code, msg, req, res) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				checkCanEdit(req.soajs, function (err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						var s = {
							'$set': {
								oauth: {
									"secret": req.soajs.inputmaskData.secret,
									"redirectURI": req.soajs.inputmaskData.redirectURI,
									"grants": ["password", "refresh_token"]
								}
							}
						};
						opts.collection = colName;
						opts.conditions = {'_id': req.soajs.inputmaskData.id};
						opts.fields = s;
						opts.options = {'upsert': false,'safe': true};
						BL.model.updateEntry(req.soajs, opts, function (error, tenantRecord) {
							checkIfError(req, res, {config: config,error: error || !tenantRecord,code: code}, function () {
								return res.jsonp(req.soajs.buildResponse(null, msg));
							});
						});
					});
				});
			});
		});
	},

	"getOAuthUsers": function (config, req, res) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				opts.collection = oauthUsersColName;
				opts.conditions = {"tId": req.soajs.inputmaskData.id};
				BL.model.findEntries(req.soajs, opts, function (err, tenantOauthUsers) {
					checkIfError(req, res, {config: config, error: err, code: 447}, function () {
						return res.jsonp(req.soajs.buildResponse(null, tenantOauthUsers));
					});
				});
			});
		});
	},

	"deleteOAuthUsers": function (config, req, res) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
			validateUid(req.soajs, function (err, uId) {
				checkIfError(req, res, {config: config, error: err || !uId, code: 439}, function () {
					req.soajs.inputmaskData.uId = uId;
					opts.collection = oauthUsersColName;
					opts.conditions = {"tId": req.soajs.inputmaskData.id, "_id": req.soajs.inputmaskData.uId};
					BL.model.removeEntry(req.soajs, opts, function (err) {
						checkIfError(req, res, {config: config, error: err, code: 450}, function () {
							return res.jsonp(req.soajs.buildResponse(null, "tenant oauth user removed successful"));
						});
					});
				});
			});
		});
		});
	},

	"addOAuthUsers": function (config, req, res) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				opts.collection = oauthUsersColName;
				opts.conditions = {"tId": req.soajs.inputmaskData.id,"userId": req.soajs.inputmaskData.userId};
				BL.model.findEntry(req.soajs, opts, function (err, tenantOauthUser) {
					checkIfError(req, res, {config: config, error: err, code: 447}, function () {
						checkIfError(req, res, {config: config, error: tenantOauthUser, code: 448}, function () {
							Hasher.init(config.hasher);
							var newPassword = Hasher.hash(req.soajs.inputmaskData.password);
							var oauthUserRecord = {
								"userId": req.soajs.inputmaskData.userId,
								"password": newPassword,
								"tId": req.soajs.inputmaskData.id,
								"keys": null
							};
							opts = {};
							opts.collection = oauthUsersColName;
							opts.record = oauthUserRecord;
							BL.model.insertEntry(req.soajs, opts, function (error) {
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

	"updateOAuthUsers": function (config, req, res) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				validateUid(req.soajs, function (err, uId) {
					checkIfError(req, res, {config: config, error: err || !uId, code: 439}, function () {
						req.soajs.inputmaskData.uId = uId;
						checkIfError(req, res, {
							config: config,
							error: !req.soajs.inputmaskData.userId && !req.soajs.inputmaskData.password,
							code: 451
						}, function () {
							opts.collection = oauthUsersColName;
							opts.conditions = {
								"tId": req.soajs.inputmaskData.id,
								"userId": req.soajs.inputmaskData.userId,
								"_id": {$ne: req.soajs.inputmaskData.uId}
							};
							BL.model.findEntry(req.soajs, opts, function (err, tenantOauthUser) {
								checkIfError(req, res, {config: config, error: err, code: 439}, function () {
									checkIfError(req, res, {
										config: config,
										error: tenantOauthUser,
										code: 448
									}, function () {
										opts = {};
										opts.collection = oauthUsersColName;
										opts.conditions = {
											"tId": req.soajs.inputmaskData.id,
											"_id": req.soajs.inputmaskData.uId
										};
										BL.model.findEntry(req.soajs, opts, function (error, tenantOauthUser) {
											checkIfError(req, res, {
												config: config,
												error: error || !tenantOauthUser,
												code: 447
											}, function () {
												if (req.soajs.inputmaskData.userId) {
													tenantOauthUser.userId = req.soajs.inputmaskData.userId;
												}
												if (req.soajs.inputmaskData.password) {
													Hasher.init(config.hasher);
													tenantOauthUser.password = Hasher.hash(req.soajs.inputmaskData.password);
												}
												opts = {};
												opts.collection = oauthUsersColName;
												opts.record = tenantOauthUser;
												BL.model.saveEntry(req.soajs, opts, function (error) {
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
			});
		});
	},

	"deleteApplication": function (config, req, res) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				checkCanEdit(req.soajs, function (err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						checkIfError(req, res, {
							config: config,
							error: req.soajs.inputmaskData.appId === req.soajs.tenant.application.appId,
							code: 463
						}, function () {
							opts.collection = colName;
							opts.conditions = {'_id': req.soajs.inputmaskData.id};
							BL.model.findEntry(req.soajs, opts, function (error, tenantRecord) {
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
									removeDashboardExtKeysFromApplication(req, keysArr, tenantRecord.code, function (error) {
										checkIfError(req, res, {config: config, error: error, code: 443}, function () {
											var x = getRequestedSubElementsPositions(tenantRecord, req);
											checkIfError(req, res, {
												config: config,
												error: !x.found,
												code: 432
											}, function () {
												tenantRecord.applications.splice(x.position[0], 1);
												saveTenantRecordAndExit( tenantRecord, config, req, res, 432, "tenant application delete successful");
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

		function removeDashboardExtKeysFromApplication(req, keysArr, code, cb) {
			if (!keysArr || keysArr.length === 0)
				return cb();

			async.each(keysArr, function (key, callback) {
				removeDashboardExtKeysFromKey(req, key.extKeys, code, function (error, data) {
					return callback(error, data);
				});
			}, function (error, data) {
				return cb(error, data);
			});
		}
	},

	"listApplication": function (config, req, res) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				opts.collection = colName;
				opts.conditions = {'_id': req.soajs.inputmaskData.id};
				BL.model.findEntry(req.soajs, opts, function (error, tenantRecord) {
					checkIfError(req, res, {config: config, error: error || !tenantRecord, code: 431}, function () {
						return res.jsonp(req.soajs.buildResponse(null, tenantRecord.applications));
					});
				});
			});
		});
	},

	"addApplication": function (config, req, res) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				checkCanEdit(req.soajs, function (err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						opts.collection = colName;
						opts.conditions = {'_id': req.soajs.inputmaskData.id};
						req.soajs.inputmaskData.productCode = req.soajs.inputmaskData.productCode.toUpperCase();
						req.soajs.inputmaskData.packageCode = req.soajs.inputmaskData.packageCode.toUpperCase();
						checkifProductAndPackageExist(req.soajs, req.soajs.inputmaskData.productCode, req.soajs.inputmaskData.packageCode, function (error, infoRecord) {
							checkIfError(req, res, {config: config, error: error, code: 429}, function () {
								checkIfError(req, res, {config: config, error: !infoRecord, code: 434}, function () {
									BL.model.findEntry(req.soajs, opts, function (error, tenantRecord) {
										checkIfError(req, res, {
											config: config,
											error: error || !tenantRecord,
											code: 429
										}, function () {
											var newApplication = {
												"product": req.soajs.inputmaskData.productCode,
												"package": req.soajs.inputmaskData.productCode + '_' + req.soajs.inputmaskData.packageCode,
												"appId": BL.model.generateId(req.soajs),
												"description": req.soajs.inputmaskData.description,
												"_TTL": req.soajs.inputmaskData._TTL * 3600 * 1000, // 24 hours
												"keys": []
											};
											if (req.soajs.inputmaskData.acl) {
												newApplication.acl = req.soajs.inputmaskData.acl;
											}
											tenantRecord.applications.push(newApplication);
											saveTenantRecordAndExit( tenantRecord, config, req, res, 433, "tenant application add successful");
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

	"updateApplication": function (config, req, res) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				checkCanEdit(req.soajs, function (err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						opts.collection = colName;
						opts.conditions = {'_id': req.soajs.inputmaskData.id};
						req.soajs.inputmaskData.productCode = req.soajs.inputmaskData.productCode.toUpperCase();
						req.soajs.inputmaskData.packageCode = req.soajs.inputmaskData.packageCode.toUpperCase();
						checkifProductAndPackageExist(req.soajs, req.soajs.inputmaskData.productCode, req.soajs.inputmaskData.packageCode, function (error, infoRecord) {
							checkIfError(req, res, {config: config, error: error, code: 429}, function () {
								checkIfError(req, res, {config: config, error: !infoRecord, code: 434}, function () {
									BL.model.findEntry(req.soajs, opts, function (error, tenantRecord) {
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
												saveTenantRecordAndExit( tenantRecord, config, req, res, 430, "tenant application update successful");
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

	"getTenantAcl": function (config, req, res) {
		var packageName, packageDescription, accessLevels;
		var appAcl;
		var opts = {};
		BL.model.validateId(req.soajs, function(error, resId){
			opts.collection = colName;
			opts.conditions = {'_id': resId};
			BL.model.findEntry(req.soajs, opts, function (error, tenantRecord) {
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
				return cb(600);
			}

			checkKeyAccess(tenantRecord.code, keys, 0, function (error, response) {
				if (error) {
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
										if (oneApplication.acl) {
											if (JSON.stringify(oneApplication.acl) !== "{}") {
												appAcl = oneApplication.acl;
											}
										}
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
			opts.collection = dbKeysColl;
			opts.conditions = {"code": tenantCode, "key": keys[counter]};
			BL.model.findEntry(req.soajs, opts, function (error, record) {
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
			opts.collection = "products";
			opts.conditions = {'code': req.soajs.tenant.application.product,"packages.code": packageName};
			BL.model.findEntry(req.soajs, opts, function (error, productRecord) {
				checkIfError(req, res, {config: config, error: error || !productRecord, code: 600}, function () {
					productRecord.packages.forEach(function (onePackage) {
						if (onePackage.code === packageName) {
							accessLevels = onePackage.acl;
							packageDescription = onePackage.description;
						}
					});
					var servicesNames = [];
					for (var sN in accessLevels) {
						if (Object.hasOwnProperty.call(accessLevels[sN], 'access') || accessLevels[sN].apis || accessLevels[sN].apisRegExp || accessLevels[sN].apisPermission) {
							servicesNames.push(sN);
						}
						else {
							servicesNames = servicesNames.concat(Object.keys(accessLevels[sN]));
						}
					}
					//var servicesNames = Object.keys(accessLevels);
					getServicesAndTheirAPIs(servicesNames, function (error, servicesInfo) {
						checkIfError(req, res, {config: config, error: error, code: error}, function () {
							var data = {
								"services": servicesInfo,
								"applications": [
									{
										'package': packageName,
										'description': packageDescription,
										'parentPackageAcl': accessLevels
									}
								]
							};
							if (appAcl) {
								data.applications[0].app_acl = appAcl;
							}
							return res.jsonp(req.soajs.buildResponse(null, data));
						});
					});

				});
			});
		}

		function getServicesAndTheirAPIs(servicesNames, cb) {
			opts.collection = "services";
			opts.conditions = (servicesNames.length > 0) ? {'name': {$in: servicesNames}} : {};
			BL.model.findEntries(req.soajs, opts, function (err, records) {
				if (err) {
					return cb(600);
				}
				return cb(null, records);
			});
		}
	},

	"createApplicationKey": function (config, provision, req, res) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				checkCanEdit(req.soajs, function (err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						opts.collection = colName;
						opts.conditions = {'_id': req.soajs.inputmaskData.id};
						BL.model.findEntry(req.soajs, opts, function (error, tenantRecord) {
							checkIfError(req, res, {
								config: config,
								error: error || !tenantRecord,
								code: 436
							}, function () {
								var x = getRequestedSubElementsPositions(tenantRecord, req);
								checkIfError(req, res, {config: config, error: !x.found, code: 436}, function () {
									provision.init(req.soajs.registry.coreDB.provision, req.soajs.log);
									provision.generateInternalKey(function (error, internalKey) {
										checkIfError(req, res, {config: config, error: error, code: 436}, function () {
											tenantRecord.applications[x.position[0]].keys.push({
												"key": internalKey,
												"extKeys": [],
												"config": {}
											});
											saveTenantRecordAndExit( tenantRecord, config, req, res, 436, "application key add successful");
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

	"getApplicationKeys": function (config, req, res) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				opts.collection = colName;
				opts.conditions = {'_id': req.soajs.inputmaskData.id};
				BL.model.findEntry(req.soajs, opts, function (error, tenantRecord) {
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

	"deleteApplicationKey": function (config, req, res) {
		validateId(req.soajs, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				checkCanEdit(req.soajs, function (err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						checkIfError(req, res, {
							config: config,
							error: req.soajs.inputmaskData.key === req.soajs.tenant.key.iKey,
							code: 464
						}, function () {
							var opts = {};
							opts.collection = colName;
							opts.conditions = {'_id': req.soajs.inputmaskData.id};
							BL.model.findEntry(req.soajs, opts, function (error, tenantRecord) {
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
									removeDashboardExtKeysFromKey(req, extKeysArr, tenantRecord.code, function (error) {
										checkIfError(req, res, {config: config, error: error, code: 600}, function () {
											var x = getRequestedSubElementsPositions(tenantRecord, req);
											checkIfError(req, res, {
												config: config,
												error: !x.found,
												code: 437
											}, function () {
												tenantRecord.applications[x.position[0]].keys.splice(x.position[1], 1);
												saveTenantRecordAndExit( tenantRecord, config, req, res, 437, "application key remove successful");
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

	"listApplicationExtKeys": function (config, req, res) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				opts.collection = colName;
				opts.conditions = {'_id': req.soajs.inputmaskData.id};
				BL.model.findEntry(req.soajs, opts, function (error, tenantRecord) {
					checkIfError(req, res, {config: config, error: error || !tenantRecord, code: 442}, function () {
						var x = getRequestedSubElementsPositions(tenantRecord, req);
						if (x.found) {
							//mark ext keys with dashboard access before replying
							var extKeys = tenantRecord.applications[x.position[0]].keys[x.position[1]].extKeys;
							opts = {};
							opts.collection = dbKeysColl;
							opts.conditions = {};
							BL.model.findEntries(req.soajs, opts, function (error, dbKeys) {
								checkIfError(req, res, {config: config, error: error, code: 600}, function () {
									extKeys.forEach(function (extKeyObj) {
										for (var i = 0; i < dbKeys.length; i++) {
											if (extKeyObj.extKey === dbKeys[i].key && extKeyObj.env === dbKeys[i].env) {
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

	"addApplicationExtKeys": function (config, provision, coreRegistry, req, res) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				checkCanEdit(req.soajs, function (err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						opts.collection = envColName;
						opts.conditions = {code: req.soajs.inputmaskData.env.toUpperCase()};
						BL.model.countEntries(req.soajs, opts, function (error, count) {
							checkIfError(req, res, {config: config, error: error, code: 600}, function () {
								checkIfError(req, res, {config: config,error: (count === 0 && req.soajs.inputmaskData.env !== 'all'),code: 446}, function () {
									opts = {};
									opts.collection = colName;
									opts.conditions = {'_id': req.soajs.inputmaskData.id};
									BL.model.findEntry(req.soajs, opts, function (error, tenantRecord) {
										checkIfError(req, res, {config: config,error: error || !tenantRecord,code: 440}, function () {
											var x = getRequestedSubElementsPositions(tenantRecord, req);
											checkIfError(req, res, {config: config,error: !x.found,code: 440}, function () {
												provision.init(req.soajs.registry.coreDB.provision, req.soajs.log);
												//check if env === current env or no in order to select encryption pass phrase
												if (req.soajs.inputmaskData.env.toUpperCase() === process.env.SOAJS_ENV.toUpperCase()) {
													//proceed normally
													validEnv(provision, x, tenantRecord);
												} else if (req.soajs.inputmaskData.env.toUpperCase() !== process.env.SOAJS_ENV.toUpperCase() || req.soajs.inputmaskData.env === 'all') {
													getAclFromTenantApp(tenantRecord, function (error, aclObj, productLocked) {
														//check if acl is not an empty object, if yes return error
														checkIfError(req, res, {config: config,error: error || !aclObj || (aclObj && Object.keys(aclObj).length === 0),code: 443}, function () {
															var acl = aclObj;
															var env = req.soajs.inputmaskData.env;
															opts = {};
															opts.collection = "environment";
															opts.conditions = {};
															opts.fields = {"code": 1,"dbs": 1};
															//find existing environments
															BL.model.findEntries(req.soajs, opts, function (error, dbEnvs) {
																checkIfError(req, res, {config: config,error: error,code: 440}, function () {
																	var existingEnvs = [];
																	var valid = true;
																	//push the envs into the existing Envs array
																	pushEnvs(existingEnvs, dbEnvs, valid);
																	checkIfError(req, res, {config: config,error: !valid,code: 706}, function () {
																		var type = "old";
																		var aclKeys = Object.keys(acl);
																		//check if envCode is in db, then this is a new acl schema, else, it is an old schema
																		checkEnvCodeInDb(existingEnvs, aclKeys, acl, type);
																		saveTenant(type, coreRegistry, provision, env, tenantRecord, productLocked, x, acl);
																	});
																});
															});
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
				});
			});
		});
		function validEnv(provision, x, tenantRecord){
			generateAndSaveExtKey(provision, req.soajs.inputmaskData.key, req.soajs.servicesConfig.key, req.soajs.inputmaskData.env.toUpperCase(), x, tenantRecord, null, function (error) {
				checkIfError(req, res, {config: config,error: error,code: 440}, function () {
					saveTenantRecordAndExit( tenantRecord, config, req, res, 440, "tenant application ext key add successful");
				});
			});
		}

		function pushEnvs(existingEnvs, dbEnvs, valid){
			dbEnvs.forEach(function (oneEnv) {
				if (!oneEnv.dbs || !oneEnv.dbs.config || !oneEnv.dbs.config.session || !oneEnv.dbs.clusters) {
					valid = false;
				}
				existingEnvs.push(oneEnv.code.toLowerCase());
			});
		}

		function checkEnvCodeInDb(existingEnvs, aclKeys, acl, type){
			for (var itt = 0; itt < aclKeys.length; itt++) {
				var envCode = aclKeys[itt];
				if (Object.keys(acl[envCode]).length === 0) {
					if (existingEnvs.indexOf(envCode) !== -1) {
						type = "new";
						break;
					}
				}
				else if (acl[envCode].access === undefined && !acl[envCode].apis && !acl[envCode].apisRegExp && !acl[envCode].apisPermission) {
					type = "new";
					break;
				}
			}
		}

		function saveTenant(type, coreRegistry, provision, env, tenantRecord, productLocked, x, acl) {
			if (type === 'new' && env !== 'all') { //applicable only if new acl and not trying to add new tenant
				//new acl
				checkIfError(req, res, {
					config: config,
					error: Object.keys(acl).indexOf(env.toLowerCase()) === -1,//env does not exist in new acl, return error
					code: 740
				}, function () {
					//env exists in acl, create ext key using encryption of selected env
					coreRegistry.loadByEnv({"envCode": env}, function (error, reg) {
						checkIfError(req, res, {config: config, error: error, code: 440}, function () {
							// var envKeyConfig = reg.serviceConfig.key;
							var envKeyConfig = (reg.serviceConfig) ? reg.serviceConfig.key : reg.ENV_schema.services.config.key;
							//use this key config to generate ext key
							generateAndSaveExtKey(provision, req.soajs.inputmaskData.key, envKeyConfig, env.toUpperCase(), x, tenantRecord, productLocked, function (error) {
								checkIfError(req, res, {config: config, error: error, code: 440}, function () {
									saveTenantRecordAndExit(tenantRecord, config, req, res, 440, "tenant application ext key add successful");
								});
							});
						});
					});
				});
			} else { //applicable only if old acl or add new tenant
				generateExtKeysForAllEnvs(provision, req.soajs.inputmaskData.key, x, tenantRecord, productLocked, function (error) {
					checkIfError(req, res, {config: config, error: error, code: 440}, function () {
						saveTenantRecordAndExit(tenantRecord, config, req, res, 440, "tenant application ext key add successful");
					});
				});
			}
		}

		function generateAndSaveExtKey(provision, key, keyConfig, env, x, tenantRecord, productLocked, cb) {

			provision.generateExtKey(key, keyConfig, function (error, extKeyValue) {
				if (error) {
					return cb(error);
				}
				var newExtKey = {
					"extKey": extKeyValue,
					"device": req.soajs.inputmaskData.device,
					"geo": req.soajs.inputmaskData.geo,
					"env": env
				};
				if (req.soajs.inputmaskData.expDate) {
					newExtKey.expDate = new Date(req.soajs.inputmaskData.expDate).getTime() + config.expDateTTL;
				}
				//push new extKey
				tenantRecord.applications[x.position[0]].keys[x.position[1]].extKeys.push(newExtKey);

				//if application uses a locked product, add external key to dashboard_extKeys collection
				if (productLocked !== null) { //we already made a db call to products collection and know if product is locked
					addAsDbKeyIfApplicable(extKeyValue, productLocked, tenantRecord.code, env, cb);
				} else { //db call to products collection not yet made
					opts = {};
					opts.collection = prodColName;
					opts.conditions = {'code': tenantRecord.applications[x.position[0]].product};
					opts.fields = {"locked": 1};
					BL.model.findEntry(req.soajs, opts, function (error, productRecord) {
						if (error) {
							return cb(error);
						}

						productLocked = productRecord.locked;
						addAsDbKeyIfApplicable(extKeyValue, productLocked, tenantRecord.code, env, cb);
					});
				}
			});
		}

		function generateExtKeysForAllEnvs(provision, key, x, tenantRecord, productLocked, cb) {
			opts = {};
			opts.collection = "environment";
			opts.conditions = {};
			opts.fields = {'code': 1, 'services.config.key': 1};
			BL.model.findEntries(req.soajs, opts, function (error, envRecords) {
				if (error) {
					return cb(error);
				}
				var envKeysConfigArr = [];
				envRecords.forEach(function (oneEnv) {
					envKeysConfigArr.push({
						'algorithm': oneEnv.services.config.key.algorithm,
						'password': oneEnv.services.config.key.password,
						'env': oneEnv.code.toUpperCase() //not required to generate key, only used to specify key's environment
					});
				});
				async.each(envKeysConfigArr, function (keyConfig, cb) {
					generateAndSaveExtKey(provision, key, keyConfig, keyConfig.env, x, tenantRecord, productLocked, function (error, result) {
						return cb(error, result);
					});
				}, function (error, result) {
					return cb(error, result);
				});
			});
		}

		function addAsDbKeyIfApplicable(extKeyValue, productLocked, tenantCode, env, cb) {
			if (productLocked) {
				opts = {};
				opts.collection = dbKeysColl;
				opts.conditions = {'code': tenantCode, 'env': env};
				BL.model.countEntries(req.soajs, opts, function (error, count) {
					if (error) {
						return cb(error);
					}

					if (count === 0) {
						opts.collection = dbKeysColl;
						var dbKey = {
							'code': tenantCode,
							'key': extKeyValue,
							'env': env
						};
						opts.record = dbKey;
						BL.model.saveEntry(req.soajs, opts, function (error) {
							if (error) {
								return cb(error);
							}
							return cb(null, true);
						});
					} else {
						return cb(null, true);
					}
				});
			} else {
				return cb(null, true);
			}
		}

		function getAclFromTenantApp(tenantRecord, cb) {
			var packageCode, acl;
			for (var i = 0; i < tenantRecord.applications.length; i++) {
				if (tenantRecord.applications[i].appId.toString() === req.soajs.inputmaskData.appId) {
					acl = tenantRecord.applications[i].acl;
					packageCode = tenantRecord.applications[i].package;
					break;
				}
			}

			if (!packageCode) {
				return cb({'message': "Specified tenant application not found"});
			}

			if (!acl) { //no custom acl set in the tenant's application
				return getAclFromPackage(packageCode, cb);
			}

			return cb(null, acl);
		}

		function getAclFromPackage(packageCode, cb) {
			var acl, productLocked;
			opts.collection = prodColName;
			opts.conditions = {'packages.code': packageCode};
			opts.fields = {'locked': 1,'packages.$': 1};
			BL.model.findEntry(req.soajs, opts, function (error, productRecord) {
				if (error) {
					return cb(error);
				}

				if (productRecord.packages && productRecord.packages[0] && productRecord.packages[0].acl) {
					acl = productRecord.packages[0].acl;
				} else {
					acl = {};
				}
				productLocked = productRecord.locked;

				return cb(null, acl, productLocked);
			});
		}
	},

	"updateApplicationExtKeys": function (config, req, res) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				checkCanEdit(req.soajs, function (err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						opts.collection = colName;
						opts.conditions = {'_id': req.soajs.inputmaskData.id};
						BL.model.findEntry(req.soajs, opts, function (error, tenantRecord) {
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
									else {
										tenantRecord.applications[x.position[0]].keys[x.position[1]].extKeys[x.position[2]].expDate = null;
									}
									tenantRecord.applications[x.position[0]].keys[x.position[1]].extKeys[x.position[2]].device = req.soajs.inputmaskData.device;
									tenantRecord.applications[x.position[0]].keys[x.position[1]].extKeys[x.position[2]].geo = req.soajs.inputmaskData.geo;

									saveTenantRecordAndExit( tenantRecord, config, req, res, 441, "tenant application ext key update successful");
								});
							});
						});
					});
				});
			});
		});
	},

	"deleteApplicationExtKeys": function (config, req, res) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				checkCanEdit(req.soajs, function (err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						checkIfError(req, res, {
							config: config,
							error: req.soajs.inputmaskData.extKey === req.soajs.tenant.key.eKey && req.soajs.inputmaskData.extKeyEnv.toUpperCase() === process.env.SOAJS_ENV.toUpperCase(),
							code: 465
						}, function () {
							opts.collection = colName;
							opts.conditions = {'_id': req.soajs.inputmaskData.id};
							BL.model.findEntry(req.soajs, opts, function (error, tenantRecord) {
								checkIfError(req, res, {
									config: config,
									error: error || !tenantRecord,
									code: 443
								}, function () {
									var extKey = {
										extKey: req.soajs.inputmaskData.extKey,
										env: req.soajs.inputmaskData.extKeyEnv
									};
									removeDashboardExtKey(req, extKey, tenantRecord.code, function (error) {
										checkIfError(req, res, {config: config, error: error, code: 600}, function () {
											var x = getRequestedSubElementsPositions(tenantRecord, req);
											checkIfError(req, res, {
												config: config,
												error: !x.found,
												code: 443
											}, function () {
												tenantRecord.applications[x.position[0]].keys[x.position[1]].extKeys.splice(x.position[2], 1);
												saveTenantRecordAndExit( tenantRecord, config, req, res, 443, "tenant application ext key delete successful");
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

	"updateApplicationConfig": function (config, req, res) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				req.soajs.inputmaskData.envCode = req.soajs.inputmaskData.envCode.toUpperCase();
				checkCanEdit(req.soajs, function (err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						opts.collection = colName;
						opts.conditions = {'_id': req.soajs.inputmaskData.id};
						BL.model.findEntry(req.soajs, opts, function (error, tenantRecord) {
							checkIfError(req, res, {
								config: config,
								error: error || !tenantRecord,
								code: 445
							}, function () {
								checkIfEnvironmentExists( req.soajs, function (error, exists) {
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
												saveTenantRecordAndExit( tenantRecord, config, req, res, 445, "tenant application configuration update successful");
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

		function checkIfEnvironmentExists( soajs, cb) {
			opts.collection = envColName;
			opts.conditions = {'code': soajs.inputmaskData.envCode};
			BL.model.findEntry(req.soajs, opts, cb);
		}
	},

	"listApplicationConfig": function (config, req, res) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 438}, function () {
				opts.collection = colName;
				opts.conditions = {'_id': req.soajs.inputmaskData.id};
				BL.model.findEntry(req.soajs, opts, function (error, tenantRecord) {
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

	"permissionsGet": function (config, req, res) {
		var opts = {};
		var dashCluster = {
			"servers": req.soajs.registry.coreDB.session.servers,
			"credentials": req.soajs.registry.coreDB.session.credentials,
			"URLParam": req.soajs.registry.coreDB.session.URLParam,
			"extraParam": req.soajs.registry.coreDB.session.extraParam
		};
		dashCluster = objectHash(dashCluster);
		var dashDb = req.soajs.registry.coreDB.session.name;
		var dashColl = req.soajs.registry.coreDB.session.collection;

		var sessionObj = req.soajs.session.getSERVICE();
		if (!sessionObj) {
			sessionObj = {};
		}

		checkIfError(req, res, {
			config: config,
			error: !req.soajs.session || !req.soajs.session.getUrac(),
			code: 601
		}, function () {
			if (req.soajs.inputmaskData.envCode) {
				var ACL = getUserAclPerEnv(req.soajs.inputmaskData.envCode);
				return res.jsonp(req.soajs.buildResponse(null, {"acl": ACL}));
			}
			else {
				getUserAllAclPerKey(function (info) {
					var data = {
						"acl": info.ACL,
						"environments": info.environments
					};

					if (info.type === 'new') {
						loginEverywhere(data, info);
					}
					else {
						data.environments.forEach(function (oneEnv) {
							delete oneEnv.dbs;
						});
						return res.jsonp(req.soajs.buildResponse(null, data));
					}
				});
			}
		});

		function loginEverywhere(data, info) {
			async.mapLimit(info.environments, info.environments.length, loginToEnvViaRoaming, function (error, envauth) {
				var auth = {};
				envauth.forEach(function (oneEntry) {
					if (typeof(oneEntry) === 'object') {
						auth[oneEntry.envTo] = oneEntry.soajsauth;
					}
				});

				if (Object.keys(auth).length > 0) {
					sessionObj.envAuth = auth;
					req.soajs.session.setSERVICE(sessionObj);
					data["envauth"] = auth;
				}

				data.environments.forEach(function (oneEnv) {
					delete oneEnv.dbs;
				});

				return res.json(req.soajs.buildResponse(null, data));
			});
		}

		function getUserAclPerEnv(envCode) {
			if (sessionObj.envAuth && Array.isArray(Object.keys(sessionObj.envAuth)) && Object.keys(sessionObj.envAuth).length > 0) {
				var ACL = req.soajs.session.getAclAllEnv();
				if (!ACL) {
					var tenant = req.soajs.tenant;
					ACL = (tenant.application.acl_all_env) ? tenant.application.acl_all_env : tenant.application.package_acl_all_env;
				}
				return ACL[envCode.toLowerCase()];
			}
			else {
				//old system acl schema
				var ACL = req.soajs.session.getAcl();
				if (!ACL) {
					var tenant = req.soajs.tenant;
					ACL = (tenant.application.acl) ? tenant.application.acl : tenant.application.package_acl;
				}
				return ACL;
			}
		}

		function getUserAllAclPerKey(cb) {
			var ACL = req.soajs.session.getAclAllEnv();
			if (!ACL) {
				var tenant = req.soajs.tenant;
				ACL = (tenant.application.acl_all_env) ? tenant.application.acl_all_env : tenant.application.package_acl_all_env;
			}
			opts.collection = envColName;
			opts.conditions = {};
			opts.options = null;
			opts.fields = {'code': 1, '_id': 0};
			var environments = Object.keys(ACL);
			var aclType;
			var envCodes = [];
			BL.model.findEntries(req.soajs, opts, function (error, envCodesRecords) {
				checkIfError(req, res, {config: config, error: error, code: 600}, function () {
					envCodesRecords.forEach(function (oneEnv) {
						envCodes.push(oneEnv.code);
					});

					for (var i = environments.length - 1; i >= 0; i--) {
						if (envCodes.indexOf(environments[i].toUpperCase()) !== -1 && !ACL[environments[i]].access && !ACL[environments[i]].apis && !ACL[environments[i]].apisRegExp && !ACL[environments[i]].apisPermission) {
							environments[i] = environments[i].toUpperCase();
							aclType = 'new';
						}
						else {
							environments = [];
							aclType = 'old';
							break;
						}
					}

					if (aclType === 'new' && req.soajs.session.getUrac().tenant.code === req.soajs.tenant.code) {
						envCodesRecords.forEach(function (oneEnv) {
							if (environments.indexOf(oneEnv.code) === -1) {
								environments.push(oneEnv.code.toUpperCase());
							}
						});

					}
					opts = {}
					if (environments.length > 0) {
						opts.conditions= {"code": {"$in": environments}};
					}
					opts.collection = envColName;
					opts.fields = {"code": 1, "deployer": 1, "dbs": 1};
					BL.model.findEntries(req.soajs, opts, function (err, records) {
						checkIfError(req, res, {config: config, error: err, code: 902}, function () {
							return cb({"ACL": ACL, "environments": records, 'type': aclType});
						});
					});
				});
			});
		}

		function loginToEnvViaRoaming(envRecord, cb) {
			if (envRecord.code.toUpperCase() === process.env.SOAJS_ENV.toUpperCase()) {
				return cb(null, true);
			}
			if (!envRecord.dbs || !envRecord.dbs.config || !envRecord.dbs.config.session || !envRecord.dbs.config.session.cluster) {
				return cb(null, true);
			}

			var clusterName = envRecord.dbs.config.session.cluster;
			var envCluster = objectHash(envRecord.dbs.clusters[clusterName]);
			var envDb = envRecord.dbs.config.session.name;
			var envColl = envRecord.dbs.config.session.collection;

			if (envCluster === dashCluster && dashDb === envDb && dashColl === envColl) {
				return cb(null, true);
			}

			/*
			 1- get the session
			 2- get the cluster of the session
			 3- use object-hash and compare if the session cluster of remote env is not the same as local env
			 4- if no diff, return cb(null, true)
			 5- else resume and roam ( diff clusters are involved )
			 */
			req.soajs.roaming.roamEnv(envRecord.code.toLowerCase(), {}, function (error, response) {
				if (error) {
					req.soajs.log.error(error);
				}
				return cb(null, response);
			});
		}
	},

	"extKeyGet": function (config, req, res) {
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
			var opts = {};
			opts.collection = "dashboard_extKeys";
			opts.conditions = {"env": {$exists: 1}};

			BL.model.findEntry(req.soajs, opts, function (error, record) {
				if (error) {

					return cb(error);
				}

				opts.conditions = {"code": tenant.code};
				if (record) {
					opts.conditions["env"] = "DASHBOARD";
				}
				BL.model.findEntry(req.soajs, opts, function (error, record) {
					if (error || !record) {
						return cb(error);
					}
					return cb(null, record.key);
				});
			});
		}
	},

	"listDashboardKeys": function (config, req, res) {
		var opts = {};
		opts.collection = dbKeysColl;
		opts.conditions = {};
		BL.model.findEntries(req.soajs, opts, function (err, records) {
			checkIfError(req, res, {config: config, error: err, code: 422}, function () {
				return res.jsonp(req.soajs.buildResponse(null, records));
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
