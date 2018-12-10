'use strict';
var colName = "products";
var envName = "environment";
var tenantCol = "tenants";

var fs = require('fs');

function validateId(soajs, cb) {
	BL.model.validateId(soajs, cb);
}

function checkCanEdit(soajs, cb) {
	var opts = {};
	opts.collection = colName;
	opts.conditions = {};
	if (soajs.inputmaskData.id) {
		opts.conditions = { '_id': soajs.inputmaskData.id };
	}
	else if (soajs.inputmaskData.code) {
		opts.conditions = { 'code': soajs.inputmaskData.code };
	}
	BL.model.findEntry(soajs, opts, function (error, record) {
		if (error) {
			return cb(600);
		}
		if (soajs.tenant.locked) {
			return cb(null, {});
		}
		else {
			if (record && record.locked) {
				return cb(501);
			}
			else {
				return cb(null, {});
			}
		}
	});
}

function checkReturnError(req, mainCb, data, cb) {
	if (data.error) {
		if (typeof (data.error) === 'object' && (data.error.message || data.error.msg)) {
			req.soajs.log.error(data.error);
		}
		return mainCb({ "code": data.code, "msg": data.config.errors[data.code] });
	} else {
		if (cb) {
			return cb();
		}
	}
}

var BL = {
	model: null,
	
	"delete": function (config, req, res, cb) {
		var errorData = {};
		if (!req.soajs.inputmaskData.id && !req.soajs.inputmaskData.code) {
			return cb({ "code": 470, "msg": config.errors[470] });
		}
		if (req.soajs.inputmaskData.code) {
			deleteProduct(cb);
		}
		else {
			validateId(req.soajs, function (err) {
				errorData = {
					config: config,
					error: err,
					code: 409
				};
				checkReturnError(req, cb, errorData, function () {
					deleteProduct(cb);
				});
			});
		}
		
		function deleteProduct(cb) {
			checkCanEdit(req.soajs, function (err) {
				errorData.error = err;
				errorData.code = err;
				errorData.config = config;
				checkReturnError(req, cb, errorData, function () {
					var opts = {};
					opts.collection = colName;
					
					if (req.soajs.inputmaskData.id) {
						opts.conditions = { '_id': req.soajs.inputmaskData.id };
					}
					
					if (req.soajs.inputmaskData.code) {
						opts.conditions = { 'code': req.soajs.inputmaskData.code };
					}
					
					BL.model.findEntry(req.soajs, opts, function (error, productRecord) {
						errorData.error = error;
						errorData.code = 414;
						checkReturnError(req, cb, errorData, function () {
							errorData.error = !productRecord;
							errorData.code = req.soajs.inputmaskData.id ? 409 : 468; // invalid id / code
							checkReturnError(req, cb, errorData, function () {
								errorData.error = req.soajs.tenant.application.product === productRecord.code;
								errorData.code = 466;
								checkReturnError(req, cb, errorData, function () {
									opts = {};
									opts.collection = colName;
									
									if (req.soajs.inputmaskData.id) {
										opts.conditions = { '_id': req.soajs.inputmaskData.id };
									}
									
									if (req.soajs.inputmaskData.code) {
										opts.conditions = { 'code': req.soajs.inputmaskData.code };
									}
									
									BL.model.removeEntry(req.soajs, opts, function (error) {
										errorData.error = error;
										errorData.code = 414;
										checkReturnError(req, cb, errorData, function () {
											return cb(null, "product delete successful");
										});
									});
								});
							});
						});
					});
				});
			});
		}
	},
	
	"list": function (config, req, res, cb) {
		var opts = {
			collection: colName,
			conditions: {
				code:  { $ne: 'DSBRD' }
			}
		};
		
		BL.model.findEntries(req.soajs, opts, function (err, records) {
			checkReturnError(req, cb, { config: config, error: err, code: 412 }, function () {
				return cb(null, records);
			});
		});
	},
	
	"listConsole": function (config, req, res, cb) {
		var opts = {
			collection: colName,
			conditions: {
				code: 'DSBRD'
			}
		};
		
		BL.model.findEntries(req.soajs, opts, function (err, records) {
			checkReturnError(req, cb, { config: config, error: err, code: 412 }, function () {
				return cb(null, records);
			});
		});
	},
	
	"add": function (config, req, res, cb) {
		var opts = {};
		opts.collection = colName;
		var record = {
			"code": req.soajs.inputmaskData.code.toUpperCase(),
			"name": req.soajs.inputmaskData.name,
			"description": req.soajs.inputmaskData.description,
			"packages": []
		};
		opts.conditions = { 'code': record.code };
		BL.model.countEntries(req.soajs, opts, function (error, count) {
			checkReturnError(req, cb, { config: config, error: error, code: 410 }, function () {
				checkReturnError(req, cb, {
					config: config,
					error: count > 0,
					code: 413
				}, function () {
					opts = {};
					opts.collection = colName;
					opts.record = record;
					BL.model.insertEntry(req.soajs, opts, function (err, productRecord) {
						checkReturnError(req, cb, {
							config: config,
							error: err,
							code: 410
						}, function () {
							return cb(null, productRecord[0]._id);
						});
					});
				});
			});
		});
		
	},
	
	"update": function (config, req, res, cb) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkReturnError(req, cb, { config: config, error: err, code: 409 }, function () {
				var s = {
					'$set': {
						'description': req.soajs.inputmaskData.description,
						'name': req.soajs.inputmaskData.name
					}
				};
				checkCanEdit(req.soajs, function (err) {
					checkReturnError(req, cb, {
						config: config,
						error: err,
						code: err
					}, function () {
						opts.collection = colName;
						opts.conditions = { '_id': req.soajs.inputmaskData.id };
						opts.fields = s;
						opts.options = { 'upsert': false, 'safe': true };
						BL.model.updateEntry(req.soajs, opts, function (err, data) {
							checkReturnError(req, cb, {
								config: config,
								error: err,
								code: 411
							}, function () {
								return cb(null, "product update successful");
							});
						});
					});
				});
			});
		});
	},
	
	"get": function (config, req, res, cb) {
		var opts = {
			collection: colName
		};
		if (req.soajs.inputmaskData.id) {
			validateId(req.soajs, function (err) {
				checkReturnError(req, cb, {
					config: config,
					error: err,
					code: 409
				}, function () {
					opts.conditions = { "_id": req.soajs.inputmaskData.id };
					getData();
				});
			});
		} else if (req.soajs.inputmaskData.productCode) {
			opts.conditions = { "code": req.soajs.inputmaskData.productCode };
			getData();
		} else {
			return cb({ "code": 409, "msg": config.errors[409] });
		}
		function getData() {
			BL.model.findEntry(req.soajs, opts, function (err, data) {
				checkReturnError(req, cb, {
					config: config,
					error: err,
					code: 412
				}, function () {
					return cb(null, data);
				});
			});
		}
	},
	
	"deletePackage": function (config, req, res, cb) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkReturnError(req, cb, { config: config, error: err, code: 409 }, function () {
				req.soajs.inputmaskData.code = req.soajs.inputmaskData.code.toUpperCase();
				checkCanEdit(req.soajs, function (err) {
					checkReturnError(req, cb, {
						config: config,
						error: err,
						code: err
					}, function () {
						opts.collection = colName;
						opts.conditions = { "_id": req.soajs.inputmaskData.id };
						BL.model.findEntry(req.soajs, opts, function (error, productRecord) {
							checkReturnError(req, cb, {
								config: config,
								error: error,
								code: 419
							}, function () {
								//prevent operator from deleting the packge he is currently using, reply with error
								checkReturnError(req, cb, {
									config: config,
									error: productRecord.code + '_' + req.soajs.inputmaskData.code === req.soajs.tenant.application.package,
									code: 467
								}, function () {
									var found = false;
									for (var i = 0; i < productRecord.packages.length; i++) {
										if (productRecord.packages[i].code === productRecord.code + '_' + req.soajs.inputmaskData.code) {
											productRecord.packages.splice(i, 1);
											found = true;
											break;
										}
									}
									checkReturnError(req, cb, {
										config: config,
										error: !found,
										code: 419
									}, function () {
										opts = {};
										opts.collection = colName;
										opts.record = productRecord;
										BL.model.saveEntry(req.soajs, opts, function (error) {
											checkReturnError(req, cb, {
												config: config,
												error: error,
												code: 419
											}, function () {
												return cb(null, "product package delete successful");
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
	
	"getPackage": function (config, req, res, cb) {
		var opts = {};
		opts.collection = colName;
		opts.conditions = { "code": req.soajs.inputmaskData.productCode };
		BL.model.findEntry(req.soajs, opts, function (err, product) {
			checkReturnError(req, cb, {
				config: config,
				error: err || !product,
				code: 460
			}, function () {
				var pck = {};
				var found = false;
				for (var i = 0; i < product.packages.length; i++) {
					if (product.packages[i].code === req.soajs.inputmaskData.packageCode) {
						pck = product.packages[i];
						found = true;
						break;
					}
				}
				checkReturnError(req, cb, {
					config: config,
					error: !found,
					code: 461
				}, function () {
					return cb(null, pck);
				});
			});
		});
	},
	
	"listPackage": function (config, req, res, cb) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkReturnError(req, cb, { config: config, error: err, code: 409 }, function () {
				opts.collection = colName;
				opts.conditions = { "_id": req.soajs.inputmaskData.id };
				BL.model.findEntry(req.soajs, opts, function (err, productRecords) {
					checkReturnError(req, cb, {
						config: config,
						error: err,
						code: 417
					}, function () {
						return cb(null, productRecords.packages);
					});
				});
			});
		});
	},
	
	"addPackage": function (config, req, res, cb) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkReturnError(req, cb, { config: config, error: err, code: 409 }, function () {
				req.soajs.inputmaskData.code = req.soajs.inputmaskData.code.toUpperCase();
				checkCanEdit(req.soajs, function (err) {
					checkReturnError(req, cb, {
						config: config,
						error: err,
						code: err
					}, function () {
						opts.collection = colName;
						opts.conditions = { '_id': req.soajs.inputmaskData.id };
						req.soajs.log.warn(opts);
						BL.model.findEntry(req.soajs, opts, function (error, productRecord) {
							checkReturnError(req, cb, {
								config: config,
								error: error || !productRecord,
								code: 415
							}, function () {
								var prefix = productRecord.code + '_';
								for (var i = 0; i < productRecord.packages.length; i++) {
									if (productRecord.packages[i].code === prefix + req.soajs.inputmaskData.code) {
										return cb({ "code": 418, "msg": config.errors[418] });
									}
								}
								opts = {};
								opts.collection = envName;
								opts.fields = { "code": 1 };
								
								opts.conditions = {};
								if (!productRecord.locked) {
									opts.conditions = {
										code: { $ne: process.env.SOAJS_ENV.toUpperCase() }
									};
									delete req.soajs.inputmaskData.acl[process.env.SOAJS_ENV.toLowerCase()];
								}
								BL.model.findEntries(req.soajs, opts, function (error, environments) {
									checkReturnError(req, cb, {
										config: config,
										error: error || !environments,
										code: 402
									}, function () {
										if (JSON.stringify(req.soajs.inputmaskData.acl) !== "{}") {
											var status = false;
											var postedEnvs = Object.keys(req.soajs.inputmaskData.acl);
											for (var i = 0; i < environments.length; i++) {
												if (postedEnvs.indexOf(environments[i].code.toLowerCase()) !== -1) {
													status = true;
													break;
												}
											}
											
											if (!status) {
												return cb({ "code": 405, "msg": config.errors[405] });
											}
										}
										
										var newPackage = {
											"code": prefix + req.soajs.inputmaskData.code,
											"name": req.soajs.inputmaskData.name,
											"description": req.soajs.inputmaskData.description,
											"acl": req.soajs.inputmaskData.acl,
											"_TTL": req.soajs.inputmaskData._TTL * 3600 * 1000
										};
										productRecord.packages.push(newPackage);
										
										opts = {};
										opts.collection = colName;
										opts.record = productRecord;
										BL.model.saveEntry(req.soajs, opts, function (error) {
											checkReturnError(req, cb, {
												config: config,
												error: error,
												code: 415
											}, function () {
												return cb(null, "product package add successful");
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
	
	"updatePackage": function (config, req, res, cb) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkReturnError(req, cb, { config: config, error: err, code: 409 }, function () {
				req.soajs.inputmaskData.code = req.soajs.inputmaskData.code.toUpperCase();
				checkCanEdit(req.soajs, function (err) {
					checkReturnError(req, cb, { config: config, error: err, code: err }, function () {
						opts.collection = colName;
						opts.conditions = { '_id': req.soajs.inputmaskData.id };
						BL.model.findEntry(req.soajs, opts, function (error, productRecord) {
							checkReturnError(req, cb, {
								config: config,
								error: error || !productRecord,
								code: 416
							}, function () {
								opts = {};
								opts.collection = envName;
								opts.fields = { "code": 1 };
								opts.conditions = {};
								if (!productRecord.locked) {
									opts.conditions = {
										code: { $ne: process.env.SOAJS_ENV.toUpperCase() }
									};
									delete req.soajs.inputmaskData.acl[process.env.SOAJS_ENV.toLowerCase()];
								}
								BL.model.findEntries(req.soajs, opts, function (error, environments) {
									checkReturnError(req, cb, {
										config: config,
										error: error || !environments,
										code: 402
									}, function () {
										var status = false;
										var postedEnvs = Object.keys(req.soajs.inputmaskData.acl);
										if (postedEnvs.length === 0) {
											status = true;
										}
										else {
											for (var i = 0; i < environments.length; i++) {
												if (postedEnvs.indexOf(environments[i].code.toLowerCase()) !== -1) {
													status = true;
													break;
												}
											}
										}
										
										if (!status) {
											return cb({
												"code": 405, "msg": config.errors[405]
											});
										}
										
										var prefix = productRecord.code + '_';
										
										var found = false;
										for (var i = 0; i < productRecord.packages.length; i++) {
											if (productRecord.packages[i].code === prefix + req.soajs.inputmaskData.code) {
												productRecord.packages[i].name = req.soajs.inputmaskData.name;
												productRecord.packages[i].description = req.soajs.inputmaskData.description;
												productRecord.packages[i]._TTL = req.soajs.inputmaskData._TTL * 3600 * 1000;
												productRecord.packages[i].acl = req.soajs.inputmaskData.acl;
												found = true;
												break;
											}
										}
										
										if (!found) {
											return cb({
												"code": 416, "msg": config.errors[416]
											});
										}
										opts = {};
										opts.collection = colName;
										opts.record = productRecord;
										BL.model.saveEntry(req.soajs, opts, function (error) {
											checkReturnError(req, cb, {
												config: config,
												error: error,
												code: 416
											}, function () {
												return cb(null, "product package update successful");
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