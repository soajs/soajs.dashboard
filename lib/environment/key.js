"use strict";

var colName = "environment";
var tenantColName = "tenants";

var async = require('async');

const config = require("../../config.js");

function checkCanEdit(soajs, BL, cb) {
	
	let locked = soajs.tenant.locked;
	
	let opts = {};
	opts.collection = colName;
	opts.conditions = { '_id': soajs.inputmaskData.id };
	BL.model.findEntry(soajs, opts, function (error, envRecord) {
		if (error) {
			return cb(600);
		}
		
		//i am root
		if(locked){
			return cb(null, {});
		}
		else{
			//i am not root but this is a locked environment
			if(envRecord && envRecord.locked){
				return cb(501);
			}
			//i am not root and this is not a locked environment
			else{
				return cb(null, {});
			}
		}
	});
}

function checkReturnError(req, mainCb, data, cb) {
	if (data.error) {
		if (typeof (data.error) === 'object') {
			req.soajs.log.error(data.error);
		}
		if (!data.config){
			data.config = config;
		}
		let message = data.config.errors[data.code];
		if(!message && data.error.message){
			message = data.error.message;
		}
		return mainCb({ "code": data.code, "msg": message });
	} else {
		if (cb) {
			return cb();
		}
	}
}

function validateId(soajs, BL, cb) {
	BL.model.validateId(soajs, cb);
}

const keyModule = {
	"keyUpdate": function (config, soajsCore, req, res, BL, cbMain) {
		var opts = {};
		checkCanEdit(req.soajs, BL, function (error) {
			checkReturnError(req, cbMain, { config: config, error: error, code: error }, function () {
				validateId(req.soajs, BL, function (err) {
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
												req.soajs.inputmaskData.envCode = envRecord.code;
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
								soajsCore.key.generateExternalKey(oneKey.key, {
									id: oneTenant._id,
									code: oneTenant.code,
									locked: oneTenant.locked || false
								}, {
									product: oneApp.product,
									package: oneApp.package,
									appId: oneApp.appId.toString(),
								}, envRecord.services.config.key, function (error, newExtKey) {
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
							let data = true;
							if (envRecord.code.toUpperCase() === process.env.SOAJS_ENV.toUpperCase()) {
								data = { 'newKeys': newKeys };
							}
							return cbMain(null, data);
						});
					});
				});
			});
		}
	}
};

module.exports = keyModule;