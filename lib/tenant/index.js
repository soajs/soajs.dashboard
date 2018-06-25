'use strict';
var colName = "tenants";
var oauthUsersColName = "oauth_urac";
var prodColName = "products";
var envColName = "environment";

var soajs = require("soajs");
var soajsUtils = soajs.utils;
var Hasher = soajs.hasher;
var Auth = soajs.authorization;

var request = require("request");
var async = require("async");

var fs = require('fs');

var utils = require("../../utils/utils.js");

function checkReturnError(req, mainCb, data, cb) {
	if (data.error && data.code) {
		if (data.extraDetails) {
			req.soajs.log.error(data.extraDetails);
		}
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

function validateId(soajs, cb) {
	BL.model.validateId(soajs, cb);
}

function validateUid(soajs, cb) {
	BL.model.validateCustomId(soajs, soajs.inputmaskData.uId, cb);
}

function checkCanEdit(soajs, cb) {
	var myUrac;
	if (soajs.uracDriver && soajs.uracDriver.getProfile()) {
		myUrac = soajs.uracDriver.getProfile();
	}
	
	//checking if i can update other tenants
	var opts = {};
	opts.conditions = {};
	
	if(soajs.inputmaskData.id){
		//i can update my tenant
		if (myUrac && myUrac.tenant.id.toString() === soajs.inputmaskData.id.toString()) {
			return cb(null, {});
		}
		
		opts.conditions = { '_id': soajs.inputmaskData.id, 'locked': true };
	}
	else if(soajs.inputmaskData.code){
		
		//i can update my tenant
		if (myUrac && myUrac.tenant.code.toUpperCase() === soajs.inputmaskData.code.toUpperCase()) {
			return cb(null, {});
		}
		
		opts.conditions = { 'code': soajs.inputmaskData.code, 'locked': true };
	}
	
	opts.collection = colName;
	BL.model.findEntry(soajs, opts, function (error, record) {
		if (error) {
			return cb(600);
		}
		
		//i cannot update root tenant
		if (record) {
			return cb(501);
		}
		
		//tenant is not root, i can update it
		return cb(null, {});
	});
}

function checkifProductAndPackageExist(soajs, productCode, packageCode, cb) {
	var opts = {};
	opts.collection = prodColName;
	opts.conditions = { 'code': productCode };
	BL.model.findEntry(soajs, opts, function (error, productRecord) {
		if (error) {
			return cb(error);
		}
		if (!productRecord) {
			return cb(null, false);
		}

		for (var i = 0; i < productRecord.packages.length; i++) {
			if (productRecord.packages[i].code === productCode + '_' + packageCode) {
				return cb(null, { 'product': productRecord, 'package': productRecord.packages[i] });
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
	return { 'found': found, 'position': position };
}

function saveTenantRecordAndExit(tenantRecord, config, req, code, msg, cb) {
	var opts = {};
	opts.collection = colName;
	
	let currentAppId = tenantRecord.currentAppId ? tenantRecord.currentAppId.toString() : null;
	delete tenantRecord.currentAppId;
	
	opts.record = tenantRecord;
	let currentKeyId = tenantRecord.currentKeyId;
	delete tenantRecord.currentKeyId;
	BL.model.saveEntry(req.soajs, opts, function (error) {
		checkReturnError(req, cb, { config: config, error: error, code: code }, function () {
			var response = {};
			
			if (currentAppId) {
				response.appId = currentAppId;
				tenantRecord.applications.forEach(function (oneApp) {
					if (oneApp.appId.toString() === currentAppId) {
						if (oneApp.keys[0]) {
							response.key = oneApp.keys[0].key;
							
							if (oneApp.keys[0].extKeys[0]) {
								response.extKey = oneApp.keys[0].extKeys[0].extKey;
							}
						}
					}
				});
			}
			else {
				if (tenantRecord.applications[0]) {
					response.appId = tenantRecord.applications[0].appId.toString();
					if (tenantRecord.applications[0].keys[0]) {
						response.key = tenantRecord.applications[0].keys[0].key;
						
						if (tenantRecord.applications[0].keys[0].extKeys[0]) {
							response.extKey = tenantRecord.applications[0].keys[0].extKeys[0].extKey;
						}
					}
				}
			}
			
			if(currentKeyId){
				response.key = currentKeyId.toString();
			}
			
			return cb(null, response);
		});
	});
}

var BL = {
	model: null,

	"delete": function (config, req, res, cb) {
		var opts = {};
		
		if(!req.soajs.inputmaskData.id && !req.soajs.inputmaskData.code){
			return cb({ "code": 470, "msg": config.errors[470] });
		}
		
		validateId(req.soajs, function (error) {
			var errorData = {
				config: config,
				error: error,
				code: req.soajs.inputmaskData.id?438:452
			};
			
			if (error && req.soajs.inputmaskData.code) {
				delete errorData.error; // if tenant code provided, ignore id check
			}
			
			checkReturnError(req, cb, errorData, function () {
				checkCanEdit(req.soajs, function (err) {
					checkReturnError(req, cb, { config: config, error: err, code: err }, function () {
						//prevent operator from deleting the tenant he is logged in with
						if (req.soajs.inputmaskData.id && req.soajs.inputmaskData.id.toString() === req.soajs.tenant.id) {
							return cb({ "code": 462, "msg": config.errors[462] });
						}
						//get tenant code from collection before deleting, delete tenant, then delete dbKey if it exists
						opts.collection = colName;
						
						if(req.soajs.inputmaskData.id){
							opts.conditions = { '_id': req.soajs.inputmaskData.id};
						}
						
						if(req.soajs.inputmaskData.code){
							opts.conditions = { 'code': req.soajs.inputmaskData.code};
						}
						
						opts.options = null;
						opts.fields = { 'code': 1 };
						BL.model.findEntry(req.soajs, opts, function (error, record) {
							checkReturnError(req, cb, { config: config, error: error, code: 422 }, function () {
								checkReturnError(req, cb, {
									config: config,
									error: !record,
									code: req.soajs.inputmaskData.id?438:452
								}, function () {
									var tCode = record.code;
									opts.collection = colName;
									
									if(req.soajs.inputmaskData.id){
										opts.conditions = { '_id': req.soajs.inputmaskData.id, 'locked': { $ne: true } };
									}
									
									if(req.soajs.inputmaskData.code){
										opts.conditions = { 'code': req.soajs.inputmaskData.code, 'locked': { $ne: true } };
									}
									
									opts.fields = null;
									BL.model.removeEntry(req.soajs, opts, function (error) {
										checkReturnError(req, cb, {
											config: config,
											error: error,
											code: 424
										}, function () {
											return cb(null, "tenant delete successful");
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

	"list": function (config, req, res, cb) {
		var opts = {};
		opts.collection = colName;
		if (req.soajs.inputmaskData.type) {
			if (Object.hasOwnProperty.call(req.soajs.inputmaskData, "negate") && req.soajs.inputmaskData.negate === true) {
				opts.conditions = { 'type': { $ne: req.soajs.inputmaskData.type } };
			}
			else {
				opts.conditions = { 'type': req.soajs.inputmaskData.type };
			}
		}

		opts.options = { "sort": { "name": 1 } };
		BL.model.findEntries(req.soajs, opts, function (err, records) {
			checkReturnError(req, cb, { config: config, error: err, code: 422 }, function () {
				//generate oauth authorization if needed.
				records.forEach(function (oneTenant) {
					if (oneTenant.oauth && oneTenant.oauth.secret && oneTenant.oauth.secret !== '') {
						oneTenant.oauth.authorization = Auth.generate(oneTenant._id, oneTenant.oauth.secret);
					}
					else {
						oneTenant.oauth.authorization = "No Authorization Enabled, update tenant and set an 'oAuth Secret' to enable token generation.";
					}
				});
				return cb(null, records);
			});
		});
	},

	"add": function (config, req, res, cb) {
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
		opts.conditions = { '$or': [{ 'code': record.code }, { 'name': record.name }] };

		BL.model.countEntries(req.soajs, opts, function (error, count) {
			checkReturnError(req, cb, { config: config, error: error, code: 420 }, function () {
				checkReturnError(req, cb, {
					config: config,
					extraDetails: "Tenant code exists or Tenant name exists",
					error: count > 0, code: 423
				}, function () {
					opts = {};
					opts.collection = colName;
					opts.record = record;
					BL.model.insertEntry(req.soajs, opts, function (err, data) {
						checkReturnError(req, cb, { config: config, error: err || !data, code: 420 }, function () {
							return cb(null, { 'id': data[0]._id.toString() });
						});
					});
				});
			});
		});
	},

	"update": function (config, req, res, cb) {
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
			checkReturnError(req, cb, { config: config, error: err, code: 438 }, function () {
				checkCanEdit(req.soajs, function (err) {
					checkReturnError(req, cb, { config: config, error: err, code: err }, function () {
						opts.collection = colName;
						opts.conditions = { '_id': req.soajs.inputmaskData.id };
						opts.fields = s;
						opts.options = { 'upsert': false, 'safe': true };
						BL.model.updateEntry(req.soajs, opts, function (err) {
							checkReturnError(req, cb, { config: config, error: err, code: 421 }, function () {
								return cb(null, "tenant update successful");
							});
						});
					});
				});
			});
		});
	},

	"get": function (config, req, res, cb) {
		var opts = {};
		
		if(!req.soajs.inputmaskData.id && !req.soajs.inputmaskData.code){
			return cb({ "code": 470, "msg": config.errors[470] });
		}
		
		validateId(req.soajs, function (err) {
			
			let errorData = {
				config: config,
				error: err,
				code: req.soajs.inputmaskData.id?438:452
			};
			
			if (err && req.soajs.inputmaskData.code) {
				delete errorData.error; // if product code provided, ignore id check
			}
			
			checkReturnError(req, cb, errorData, function () {
				opts.collection = colName;
				
				if(req.soajs.inputmaskData.id){
					opts.conditions = { '_id': req.soajs.inputmaskData.id};
				}
				
				if(req.soajs.inputmaskData.code){
					opts.conditions = { 'code': req.soajs.inputmaskData.code};
				}
				
				BL.model.findEntry(req.soajs, opts, function (err, data) {
					checkReturnError(req, cb, { config: config, error: err, code: req.soajs.inputmaskData.id?438:452 }, function () {
						//generate oauth authorization if needed.
						if (data && data.oauth && data.oauth.secret && data.oauth.secret !== '') {
							data.oauth.authorization = "Basic " + new Buffer(data._id.toString() + ":" + data.oauth.secret).toString('base64');
						}
						return cb(null, data);
					});
				});
			});
		});
	},

	"deleteOAuth": function (config, req, res, cb) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkReturnError(req, cb, { config: config, error: err, code: 438 }, function () {
				checkCanEdit(req.soajs, function (err) {
					checkReturnError(req, cb, { config: config, error: err, code: err }, function () {
						opts.collection = colName;
						opts.conditions = { '_id': req.soajs.inputmaskData.id };
						opts.fields = { '$set': { 'oauth': {} } };
						opts.options = { 'upsert': false, 'safe': true };
						BL.model.updateEntry(req.soajs, opts, function (error) {
							checkReturnError(req, cb, { config: config, error: error, code: 428 }, function () {
								return cb(null, "tenant OAuth delete successful");
							});
						});
					});
				});
			});
		});
	},

	"getOAuth": function (config, req, res, cb) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkReturnError(req, cb, { config: config, error: err, code: 438 }, function () {
				opts.collection = colName;
				opts.conditions = { "_id": req.soajs.inputmaskData.id };
				BL.model.findEntry(req.soajs, opts, function (err, tenantRecords) {
					checkReturnError(req, cb, {
						config: config,
						error: err || !tenantRecords,
						code: 427
					}, function () {
						return cb(null, tenantRecords.oauth);
					});
				});
			});
		});
	},

	"saveOAuth": function (config, code, msg, req, res, cb) {
		validateId(req.soajs, function (err) {
			checkReturnError(req, cb, { config: config, error: err, code: 438 }, function () {
				checkCanEdit(req.soajs, function (err) {
					checkReturnError(req, cb, { config: config, error: err, code: err }, function () {
						
						let findOpts = {
							collection: colName,
							conditions: { '_id': req.soajs.inputmaskData.id }
						};
						BL.model.findEntry(req.soajs, findOpts, function (error, tenantRecord) {
							checkReturnError(req, cb, {
								config: config,
								error: error || !tenantRecord,
								code: code
							}, function () {
								tenantRecord.oauth = {
									"secret": req.soajs.inputmaskData.secret,
									"redirectURI": req.soajs.inputmaskData.redirectURI,
									"grants": ["password", "refresh_token"]
								};
								
								let useUrac = (req.soajs.inputmaskData.oauthType === 'urac');
								
								async.each(tenantRecord.applications, (oneApplication, vCb) => {
									
									BL.model.findEntry(req.soajs, {
										collection: prodColName,
										conditions: {code: oneApplication.product }
									}, (error, product) => {
										checkReturnError(req, vCb, { config: config, error: error, code: code }, () => {
											let allowedEnvs = [];
											product.packages.forEach((onePackage) => {
												if(onePackage.code === oneApplication.package){
													allowedEnvs = Object.keys(onePackage.acl);
												}
											});
											
											oneApplication.keys.forEach(function (key) {
												
												for (let configEnv in key.config) {
													let env = key.config[configEnv];
													if (useUrac) {
														if (!env.oauth) {
															env.oauth = {};
														}
														key.config[configEnv].oauth.loginMode = 'urac';
													} else { // mini urac
														if (env && env.oauth && env.oauth.loginMode === 'urac') {
															delete key.config[configEnv].oauth.loginMode;
														}
													}
												}
												allowedEnvs.forEach((oneEnv) => {
													if(!key.config[oneEnv] && useUrac){
														key.config[oneEnv] = {
															oauth: {
																loginMode: 'urac'
															}
														};
													}
												});
											});
											
											return vCb();
										});
									});
								}, (error) => {
									checkReturnError(req, cb, { config: config, error: error, code: code }, () => {
										let updateOpts = {
											collection: colName,
											record: tenantRecord
										};
										
										BL.model.saveEntry(req.soajs, updateOpts, function (error) {
											checkReturnError(req, cb, { config: config, error: error, code: code }, () => {
												return cb(null, msg);
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

	"getOAuthUsers": function (config, req, res, cb) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkReturnError(req, cb, { config: config, error: err, code: 438 }, function () {
				opts.collection = oauthUsersColName;
				opts.conditions = { "tId": req.soajs.inputmaskData.id };
				BL.model.findEntries(req.soajs, opts, function (err, tenantOauthUsers) {
					checkReturnError(req, cb, { config: config, error: err, code: 447 }, function () {
						return cb(null, tenantOauthUsers);
					});
				});
			});
		});
	},

	"deleteOAuthUsers": function (config, req, res, cb) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkReturnError(req, cb, { config: config, error: err, code: 438 }, function () {
				validateUid(req.soajs, function (err, uId) {
					checkReturnError(req, cb, { config: config, error: err || !uId, code: 439 }, function () {
						req.soajs.inputmaskData.uId = uId;
						opts.collection = oauthUsersColName;
						opts.conditions = { "tId": req.soajs.inputmaskData.id, "_id": req.soajs.inputmaskData.uId };
						BL.model.removeEntry(req.soajs, opts, function (err) {
							checkReturnError(req, cb, { config: config, error: err, code: 450 }, function () {
								return cb(null, "tenant oauth user removed successful");
							});
						});
					});
				});
			});
		});
	},

	"addOAuthUsers": function (config, req, res, cb) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkReturnError(req, cb, { config: config, error: err, code: 438 }, function () {
				opts.collection = oauthUsersColName;
				opts.conditions = { "tId": req.soajs.inputmaskData.id, "userId": req.soajs.inputmaskData.userId };
				BL.model.findEntry(req.soajs, opts, function (err, tenantOauthUser) {
					checkReturnError(req, cb, { config: config, error: err, code: 447 }, function () {
						checkReturnError(req, cb, {
							config: config,
							error: tenantOauthUser,
							code: 448
						}, function () {
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
								checkReturnError(req, cb, {
									config: config,
									error: error,
									code: 449
								}, function () {
									return cb(null, "tenant oauth user added successful");
								});
							});
						});
					});
				});
			});
		});
	},

	"updateOAuthUsers": function (config, req, res, cb) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkReturnError(req, cb, { config: config, error: err, code: 438 }, function () {
				validateUid(req.soajs, function (err, uId) {
					checkReturnError(req, cb, { config: config, error: err || !uId, code: 439 }, function () {
						req.soajs.inputmaskData.uId = uId;
						checkReturnError(req, cb, {
							config: config,
							error: !req.soajs.inputmaskData.userId && !req.soajs.inputmaskData.password,
							code: 451
						}, function () {
							opts.collection = oauthUsersColName;
							opts.conditions = {
								"tId": req.soajs.inputmaskData.id,
								"userId": req.soajs.inputmaskData.userId,
								"_id": { $ne: req.soajs.inputmaskData.uId }
							};
							BL.model.findEntry(req.soajs, opts, function (err, tenantOauthUser) {
								checkReturnError(req, cb, { config: config, error: err, code: 439 }, function () {
									checkReturnError(req, cb, {
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
											checkReturnError(req, cb, {
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
													checkReturnError(req, cb, {
														config: config,
														error: error,
														code: 451
													}, function () {
														return cb(null, "tenant oauth user updated successful");
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

	"deleteApplication": function (config, req, res, cb) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkReturnError(req, cb, { config: config, error: err, code: 438 }, function () {
				checkCanEdit(req.soajs, function (err) {
					checkReturnError(req, cb, { config: config, error: err, code: err }, function () {
						checkReturnError(req, cb, {
							config: config,
							error: req.soajs.inputmaskData.appId === req.soajs.tenant.application.appId,
							code: 463
						}, function () {
							opts.collection = colName;
							opts.conditions = { '_id': req.soajs.inputmaskData.id };
							BL.model.findEntry(req.soajs, opts, function (error, tenantRecord) {
								checkReturnError(req, cb, {
									config: config,
									error: error || !tenantRecord,
									code: 432
								}, function () {
									var x = getRequestedSubElementsPositions(tenantRecord, req);
									checkReturnError(req, cb, {
										config: config,
										error: !x.found,
										code: 432
									}, function () {
										tenantRecord.applications.splice(x.position[0], 1);
										saveTenantRecordAndExit(tenantRecord, config, req, 432, "tenant application delete successful", cb);
									});
								});
							});
						});
					});
				});
			});
		});
	},

	"listApplication": function (config, req, res, cb) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkReturnError(req, cb, { config: config, error: err, code: 438 }, function () {
				opts.collection = colName;
				opts.conditions = { '_id': req.soajs.inputmaskData.id };
				BL.model.findEntry(req.soajs, opts, function (error, tenantRecord) {
					checkReturnError(req, cb, {
						config: config,
						error: error || !tenantRecord,
						code: 431
					}, function () {
						return cb(null, tenantRecord.applications);
					});
				});
			});
		});
	},

	"addApplication": function (config, req, res, cb) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkReturnError(req, cb, { config: config, error: err, code: 438 }, function () {
				checkCanEdit(req.soajs, function (err) {
					checkReturnError(req, cb, { config: config, error: err, code: err }, function () {
						opts.collection = colName;
						opts.conditions = { '_id': req.soajs.inputmaskData.id };
						req.soajs.inputmaskData.productCode = req.soajs.inputmaskData.productCode.toUpperCase();
						req.soajs.inputmaskData.packageCode = req.soajs.inputmaskData.packageCode.toUpperCase();
						checkifProductAndPackageExist(req.soajs, req.soajs.inputmaskData.productCode, req.soajs.inputmaskData.packageCode, function (error, infoRecord) {
							checkReturnError(req, cb, { config: config, error: error, code: 429 }, function () {
								checkReturnError(req, cb, {
									config: config,
									error: !infoRecord,
									code: 434
								}, function () {
									BL.model.findEntry(req.soajs, opts, function (error, tenantRecord) {
										checkReturnError(req, cb, {
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
											tenantRecord.currentAppId = newApplication.appId;
											saveTenantRecordAndExit(tenantRecord, config, req, 433, "tenant application add successful", cb);
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

	"updateApplication": function (config, req, res, cb) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkReturnError(req, cb, { config: config, error: err, code: 438 }, function () {
				checkCanEdit(req.soajs, function (err) {
					checkReturnError(req, cb, { config: config, error: err, code: err }, function () {
						opts.collection = colName;
						opts.conditions = { '_id': req.soajs.inputmaskData.id };
						req.soajs.inputmaskData.productCode = req.soajs.inputmaskData.productCode.toUpperCase();
						req.soajs.inputmaskData.packageCode = req.soajs.inputmaskData.packageCode.toUpperCase();
						checkifProductAndPackageExist(req.soajs, req.soajs.inputmaskData.productCode, req.soajs.inputmaskData.packageCode, function (error, infoRecord) {
							checkReturnError(req, cb, { config: config, error: error, code: 429 }, function () {
								checkReturnError(req, cb, {
									config: config,
									error: !infoRecord,
									code: 434
								}, function () {
									BL.model.findEntry(req.soajs, opts, function (error, tenantRecord) {
										checkReturnError(req, cb, {
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
											checkReturnError(req, cb, {
												config: config,
												error: !found,
												code: 431
											}, function () {
												saveTenantRecordAndExit(tenantRecord, config, req, 430, "tenant application update successful", cb);
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

	"getTenantAcl": function (config, req, res, cbMain) {
		var packageName = req.soajs.tenant.application.package;
		var packageDescription, accessLevels;
		var appAcl;
		var opts = {};
		BL.model.validateId(req.soajs, function (error, resId) {
			opts.collection = colName;
			opts.conditions = { '_id': resId };
			BL.model.findEntry(req.soajs, opts, function (error, tenantRecord) {
				checkReturnError(req, cbMain, { config: config, error: error, code: 600 }, function () {
					doesTenantAccessDashboard(tenantRecord);
					proceedWithAcl();
				});
			});
		});

		function doesTenantAccessDashboard(tenantRecord) {
			if (tenantRecord.applications) {
				tenantRecord.applications.forEach(function (oneApplication) {
					if (oneApplication.keys) {
						oneApplication.keys.forEach(function (oneKey) {
							if (oneKey.extKeys) {
								oneKey.extKeys.forEach(function (oneExtKey) {

									//find the extKey that has dashboardAccess and env=DASHBOARD
									if (oneExtKey.env === process.env.SOAJS_ENV.toUpperCase() && oneExtKey.dashboardAccess) {

										//check if application acl overrides the default
										packageName = oneApplication.package;
										if (oneApplication.acl && Object.keys(oneApplication.acl).length > 0) {
											appAcl = oneApplication.acl;
										}
									}
								});
							}
						});
					}
				});
			}
		}

		function proceedWithAcl() {
			opts = {};
			opts.collection = prodColName;
			opts.conditions = { 'code': req.soajs.tenant.application.product, "packages.code": packageName };
			BL.model.findEntry(req.soajs, opts, function (error, productRecord) {
				checkReturnError(req, cbMain, {
					config: config,
					error: error || !productRecord,
					code: 600
				}, function () {
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
						checkReturnError(req, cbMain, { config: config, error: error, code: error }, function () {
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
							return cbMain(null, data);
						});
					});

				});
			});
		}

		function getServicesAndTheirAPIs(servicesNames, cb) {
			opts.collection = "services";
			opts.conditions = (servicesNames.length > 0) ? { 'name': { $in: servicesNames } } : {};
			BL.model.findEntries(req.soajs, opts, function (err, records) {
				if (err) {
					return cb(600);
				}
				return cb(null, records);
			});
		}
	},

	"createApplicationKey": function (config, coreProvision, req, res, cb) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkReturnError(req, cb, { config: config, error: err, code: 438 }, function () {
				checkCanEdit(req.soajs, function (err) {
					checkReturnError(req, cb, { config: config, error: err, code: err }, function () {
						opts.collection = colName;
						opts.conditions = { '_id': req.soajs.inputmaskData.id };
						BL.model.findEntry(req.soajs, opts, function (error, tenantRecord) {
							checkReturnError(req, cb, {
								config: config,
								error: error || !tenantRecord,
								code: 436
							}, function () {
								var x = getRequestedSubElementsPositions(tenantRecord, req);
								checkReturnError(req, cb, {
									config: config,
									error: !x.found,
									code: 436
								}, function () {
									coreProvision.generateInternalKey(function (error, internalKey) {
										checkReturnError(req, cb, {
											config: config,
											error: error,
											code: 436
										}, function () {
											tenantRecord.applications[x.position[0]].keys.push({
												"key": internalKey,
												"extKeys": [],
												"config": {}
											});
											
											tenantRecord.currentAppId = tenantRecord.applications[x.position[0]].appId;
											tenantRecord.currentKeyId = internalKey;
											saveTenantRecordAndExit(tenantRecord, config, req, 436, "application key add successful", cb);
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

	"getApplicationKeys": function (config, req, res, cb) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkReturnError(req, cb, { config: config, error: err, code: 438 }, function () {
				opts.collection = colName;
				opts.conditions = { '_id': req.soajs.inputmaskData.id };
				BL.model.findEntry(req.soajs, opts, function (error, tenantRecord) {
					checkReturnError(req, cb, {
						config: config,
						error: error || !tenantRecord,
						code: 435
					}, function () {
						var keys = [];
						//find the application
						tenantRecord.applications.forEach(function (oneApplication) {
							if (oneApplication.appId.toString() === req.soajs.inputmaskData.appId) {
								keys = oneApplication.keys;
							}
						});
						return cb(null, keys);
					});
				});
			});
		});
	},

	"deleteApplicationKey": function (config, req, res, cb) {
		validateId(req.soajs, function (err) {
			checkReturnError(req, cb, { config: config, error: err, code: 438 }, function () {
				checkCanEdit(req.soajs, function (err) {
					checkReturnError(req, cb, { config: config, error: err, code: err }, function () {
						checkReturnError(req, cb, {
							config: config,
							error: req.soajs.inputmaskData.key === req.soajs.tenant.key.iKey,
							code: 464
						}, function () {
							var opts = {};
							opts.collection = colName;
							opts.conditions = { '_id': req.soajs.inputmaskData.id };
							BL.model.findEntry(req.soajs, opts, function (error, tenantRecord) {
								checkReturnError(req, cb, {
									config: config,
									error: error || !tenantRecord,
									code: 437
								}, function () {
									var x = getRequestedSubElementsPositions(tenantRecord, req);
									checkReturnError(req, cb, {
										config: config,
										error: !x.found,
										code: 437
									}, function () {
										tenantRecord.applications[x.position[0]].keys.splice(x.position[1], 1);
										saveTenantRecordAndExit(tenantRecord, config, req, 437, "application key remove successful", cb);
									});
								});
							});
						});
					});
				});
			});
		});
	},

	"listApplicationExtKeys": function (config, req, res, cb) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkReturnError(req, cb, { config: config, error: err, code: 438 }, function () {
				opts.collection = colName;
				opts.conditions = { '_id': req.soajs.inputmaskData.id };
				BL.model.findEntry(req.soajs, opts, function (error, tenantRecord) {
					checkReturnError(req, cb, {
						config: config,
						error: error || !tenantRecord,
						code: 442
					}, function () {
						var x = getRequestedSubElementsPositions(tenantRecord, req);
						if (x.found) {
							var extKeys = tenantRecord.applications[x.position[0]].keys[x.position[1]].extKeys;
							return cb(null, extKeys);
						} else {
							return cb(null, []);
						}
					});
				});
			});
		});
	},
	
	// todo: check
	"addApplicationExtKeys": function (config, soajsCore, req, res, cb) {
		//validate tenant id, and user access
		validateId(req.soajs, function (err) {
			checkReturnError(req, cb, { config: config, error: err, code: 438 }, function () {
				checkCanEdit(req.soajs, function (err) {
					checkReturnError(req, cb, { config: config, error: err, code: err }, function () {
						utils.getEnvironment(req.soajs, BL.model, req.soajs.inputmaskData.env.toUpperCase(), function (error, envRecord) {
							checkReturnError(req, cb, {
								config: config,
								error: error || !envRecord,
								code: error ? 600 : 446
							}, function () {
								loadTenantAndRegistry(envRecord);
							});
						});
					});
				});
			});
		});
		
		/**
		 * load tenant and environment information
		 */
		function loadTenantAndRegistry(envRecord) {
			var opts = {
				collection: colName,
				conditions: { '_id': req.soajs.inputmaskData.id }
			};
			
			BL.model.findEntry(req.soajs, opts, function (error, tenantRecord) {
				checkReturnError(req, cb, {
					config: config,
					error: error || !tenantRecord,
					code: 440
				}, function () {
					getKeyInTenant(tenantRecord, envRecord);
				});
			});
		}
		
		/**
		 * Get the key in tenant record that matches input
		 * @param {Object} tenantRecord
		 */
		function getKeyInTenant(tenantRecord, envRecord) {
			var x = getRequestedSubElementsPositions(tenantRecord, req);
			checkReturnError(req, cb, { config: config, error: !x.found, code: 440 }, function () {
				//get the product of the application from x
				var opts = {
					collection: prodColName,
					conditions: { 'code': tenantRecord.applications[x.position[0]].product }
				};
				
				BL.model.findEntry(req.soajs, opts, function (error, productRecord) {
					checkReturnError(req, cb, {
						config: config,
						error: error || !productRecord,
						code: 440
					}, function () {
						//if product is locked
						if (productRecord.locked) {
							// keys might have dashboardAccess: true
							//only one extKey per env has dashboardAccess: true
							generateDashboardExtKeyAndLeave(x, tenantRecord, envRecord, tenantRecord.applications[x.position[0]], true);
						}
						else {
							// if environment is dashboard
							if (req.soajs.inputmaskData.env.toUpperCase() === process.env.SOAJS_ENV.toUpperCase()) {
								// return error
								return cb({ code: "440", msg: config.errors["440"] });
							}
							else {
								// simply create ext key for environment
								//none of the extkeys has dashboardAccess: true
								let locked = false;
								if(Object.hasOwnProperty.call(req.soajs.inputmaskData, 'dashboardAccess')){
									locked = req.soajs.inputmaskData.dashboardAccess;
								}
								generateDashboardExtKeyAndLeave(x, tenantRecord, envRecord, tenantRecord.applications[x.position[0]], locked);
							}
						}
					});
				});
			});
		}
		
		/**
		 * Generate and save External key
		 * @param {Array} x
		 * @param {Object} tenantRecord
		 * @param {Boolean} productLocked
		 */
		function generateDashboardExtKeyAndLeave(x, tenantRecord, envRecord, application, productLocked) {
			//init a new coreProvision to generate ext key
			soajsCore.key.generateExternalKey(req.soajs.inputmaskData.key, {
				id: tenantRecord._id,
				code: tenantRecord.code,
				locked: tenantRecord.locked || false
			}, {
				product: application.product,
				package: application.package,
				appId: application.appId.toString(),
			}, envRecord.services.config.key, function (error, extKeyValue) {
				checkReturnError(req, cb, { config: config, error: error, code: 440 }, function () {
					var newExtKey = {
						"extKey": extKeyValue,
						"device": req.soajs.inputmaskData.device,
						"geo": req.soajs.inputmaskData.geo,
						"env": req.soajs.inputmaskData.env.toUpperCase(),
						"dashboardAccess": productLocked,
						"expDate": (req.soajs.inputmaskData.expDate) ? new Date(req.soajs.inputmaskData.expDate).getTime() + config.expDateTTL : null
					};
					
					//only one env can have dashboard access true.
					tenantRecord.applications[x.position[0]].keys[x.position[1]].extKeys.forEach(function (oneExtKey) {
						if (oneExtKey.env === req.soajs.inputmaskData.env.toUpperCase()) {
							if (productLocked && oneExtKey.dashboardAccess) {
								delete newExtKey.dashboardAccess;
							}
						}
					});
					tenantRecord.applications[x.position[0]].keys[x.position[1]].extKeys.push(newExtKey);
					tenantRecord.currentAppId = tenantRecord.applications[x.position[0]].appId;
					saveTenantRecordAndExit(tenantRecord, config, req, 440, "tenant application ext key add successful", cb);
				});
			});
		}
	},

	"updateApplicationExtKeys": function (config, req, res, cb) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkReturnError(req, cb, { config: config, error: err, code: 438 }, function () {
				checkCanEdit(req.soajs, function (err) {
					checkReturnError(req, cb, { config: config, error: err, code: err }, function () {
						opts.collection = colName;
						opts.conditions = { '_id': req.soajs.inputmaskData.id };
						BL.model.findEntry(req.soajs, opts, function (error, tenantRecord) {
							checkReturnError(req, cb, {
								config: config,
								error: error || !tenantRecord,
								code: 441
							}, function () {
								var x = getRequestedSubElementsPositions(tenantRecord, req);
								checkReturnError(req, cb, {
									config: config,
									error: !x.found,
									code: 441
								}, function () {
									if (req.soajs.inputmaskData.expDate) {
										tenantRecord.applications[x.position[0]].keys[x.position[1]].extKeys[x.position[2]].expDate = new Date(req.soajs.inputmaskData.expDate).getTime() + config.expDateTTL;
									}
									else {
										tenantRecord.applications[x.position[0]].keys[x.position[1]].extKeys[x.position[2]].expDate = null;
									}
									tenantRecord.applications[x.position[0]].keys[x.position[1]].extKeys[x.position[2]].device = req.soajs.inputmaskData.device;
									tenantRecord.applications[x.position[0]].keys[x.position[1]].extKeys[x.position[2]].geo = req.soajs.inputmaskData.geo;

									saveTenantRecordAndExit(tenantRecord, config, req, 441, "tenant application ext key update successful", cb);
								});
							});
						});
					});
				});
			});
		});
	},

	"deleteApplicationExtKeys": function (config, req, res, cb) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkReturnError(req, cb, { config: config, error: err, code: 438 }, function () {
				checkCanEdit(req.soajs, function (err) {
					checkReturnError(req, cb, { config: config, error: err, code: err }, function () {
						checkReturnError(req, cb, {
							config: config,
							error: req.soajs.inputmaskData.extKey === req.soajs.tenant.key.eKey && req.soajs.inputmaskData.extKeyEnv.toUpperCase() === process.env.SOAJS_ENV.toUpperCase(),
							code: 465
						}, function () {
							opts.collection = colName;
							opts.conditions = { '_id': req.soajs.inputmaskData.id };
							BL.model.findEntry(req.soajs, opts, function (error, tenantRecord) {
								checkReturnError(req, cb, {
									config: config,
									error: error || !tenantRecord,
									code: 443
								}, function () {
									var x = getRequestedSubElementsPositions(tenantRecord, req);
									checkReturnError(req, cb, {
										config: config,
										error: !x.found,
										code: 443
									}, function () {
										tenantRecord.applications[x.position[0]].keys[x.position[1]].extKeys.splice(x.position[2], 1);
										saveTenantRecordAndExit(tenantRecord, config, req, 443, "tenant application ext key delete successful", cb);
									});
								});
							});
						});
					});
				});
			});
		});
	},

	"updateApplicationConfig": function (config, req, res, cb) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkReturnError(req, cb, { config: config, error: err, code: 438 }, function () {
				req.soajs.inputmaskData.envCode = req.soajs.inputmaskData.envCode.toUpperCase();
				checkCanEdit(req.soajs, function (err) {
					checkReturnError(req, cb, { config: config, error: err, code: err }, function () {
						opts.collection = colName;
						opts.conditions = { '_id': req.soajs.inputmaskData.id };
						BL.model.findEntry(req.soajs, opts, function (error, tenantRecord) {
							checkReturnError(req, cb, {
								config: config,
								error: error || !tenantRecord,
								code: 445
							}, function () {
								checkIfEnvironmentExists(req.soajs, function (error, exists) {
									checkReturnError(req, cb, {
										config: config,
										error: error,
										code: 445
									}, function () {
										checkReturnError(req, cb, {
											config: config,
											error: !exists,
											code: 446
										}, function () {
											var x = getRequestedSubElementsPositions(tenantRecord, req);
											checkReturnError(req, cb, {
												config: config,
												error: !x.found,
												code: 445
											}, function () {
												tenantRecord.applications[x.position[0]].keys[x.position[1]].config[req.soajs.inputmaskData.envCode.toLowerCase()] = req.soajs.inputmaskData.config;
												if (Object.keys(tenantRecord.applications[x.position[0]].keys[x.position[1]].config[req.soajs.inputmaskData.envCode.toLowerCase()]).length === 0) {
													delete tenantRecord.applications[x.position[0]].keys[x.position[1]].config[req.soajs.inputmaskData.envCode.toLowerCase()];
												}
												saveTenantRecordAndExit(tenantRecord, config, req, 445, "tenant application configuration update successful", cb);
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

		function checkIfEnvironmentExists(soajs, cb) {
			opts.collection = envColName;
			opts.conditions = { 'code': soajs.inputmaskData.envCode };
			BL.model.findEntry(req.soajs, opts, cb);
		}
	},

	"listApplicationConfig": function (config, req, res, cb) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkReturnError(req, cb, { config: config, error: err, code: 438 }, function () {
				opts.collection = colName;
				opts.conditions = { '_id': req.soajs.inputmaskData.id };
				BL.model.findEntry(req.soajs, opts, function (error, tenantRecord) {
					checkReturnError(req, cb, {
						config: config,
						error: error || !tenantRecord,
						code: 444
					}, function () {
						var x = getRequestedSubElementsPositions(tenantRecord, req);
						
						if (x.found) {
							return cb(null, tenantRecord.applications[x.position[0]].keys[x.position[1]].config);
						} else {
							return cb(null, {});
						}
					});
				});
			});
		});
	},

	"listDashboardKeys": function (config, req, res, cb) {
		// remove function ?
		var opts = {
			collection: colName
		};
		opts.conditions = { "code": req.soajs.tenant.code };
		BL.model.findEntry(req.soajs, opts, function (err, tenantRecord) {
			checkReturnError(req, cb, { config: config, error: err || !tenantRecord, code: 422 }, function () {
				var keys = [];
				tenantRecord.applications.forEach(function (oneApplication) {
					oneApplication.keys.forEach(function (oneKey) {
						oneKey.extKeys.forEach(function (oneExtKey) {
							if (oneExtKey.dashboardAccess) {
								keys.push(oneExtKey.extKey);
							}
						});
					});
				});
				return cb(null, keys);
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
