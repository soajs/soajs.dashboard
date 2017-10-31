'use strict';
var colName = "products";
var envName = "environment";

var fs = require('fs');

function validateId(soajs, cb) {
	BL.model.validateId(soajs, cb);
}

function checkCanEdit(soajs, cb) {
	var myProduct;
	var myUrac;
	if (soajs.uracDriver && soajs.uracDriver.getProfile()) {
		myUrac = soajs.uracDriver.getProfile();
	}
	if (myUrac && myUrac.tenant.id === soajs.tenant.id) {
		myProduct = soajs.tenant.application.product;
	}
	var opts = {};
	opts.collection = colName;
	opts.conditions = { '_id': soajs.inputmaskData.id };
	BL.model.findEntry(soajs, opts, function (error, record) {
		if (error) {
			return cb(600);
		}
		//if i am the owner of the product
		if (record && myProduct && record.code === myProduct) {
			return cb(null, {});
		}
		// return error msg that this record is locked
		else if (record && record.locked) {
			return cb(501);
		}
		//i am not the owner and the product is not locked
		return cb(null, {});
	});
}

function checkReturnError(req, mainCb, data, flag, cb) {
	if (data.error) {
		if (typeof (data.error) === 'object' && (data.error.message || data.error.msg)) {
			req.soajs.log.error(data.error);
		}
		if (flag) {
			BL.model.closeConnection(req.soajs);
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
		BL.model.initConnection(req.soajs);
		validateId(req.soajs, function (err) {
			var errorData = { config: config, error: err, code: 409 };
			checkReturnError(req, cb, errorData, true, function () {
				checkCanEdit(req.soajs, function (err) {
					errorData.error = err;
					errorData.code = err;
					checkReturnError(req, cb, errorData, true, function () {
						var opts = {};
						opts.collection = colName;
						opts.conditions = { '_id': req.soajs.inputmaskData.id };
						BL.model.findEntry(req.soajs, opts, function (error, productRecord) {
							errorData.error = error;
							errorData.code = 414;
							checkReturnError(req, cb, errorData, true, function () {
								errorData.error = !productRecord;
								errorData.code = 409;
								checkReturnError(req, cb, errorData, true, function () {
									errorData.error = req.soajs.tenant.application.product === productRecord.code;
									errorData.code = 466;
									checkReturnError(req, cb, errorData, true, function () {
										opts = {};
										opts.collection = colName;
										opts.conditions = { '_id': req.soajs.inputmaskData.id };
										BL.model.removeEntry(req.soajs, opts, function (error) {
											BL.model.closeConnection(req.soajs);
											errorData.error = error;
											errorData.code = 414;
											checkReturnError(req, cb, errorData, false, function () {
												return cb(null, "product delete successful");
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
	
	"list": function (config, req, res, cb) {
		BL.model.initConnection(req.soajs);
		var opts = {
			collection: colName
		};
		if (!req.soajs.tenant.locked) {
			opts.conditions = {
				locked: { '$ne': true }
			};
		}
		BL.model.findEntries(req.soajs, opts, function (err, records) {
			BL.model.closeConnection(req.soajs);
			checkReturnError(req, cb, { config: config, error: err, code: 412 }, false, function () {
				return cb(null, records);
			});
		});
	},
	
	"add": function (config, req, res, cb) {
		BL.model.initConnection(req.soajs);
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
			checkReturnError(req, cb, { config: config, error: error, code: 410 }, true, function () {
				checkReturnError(req, cb, {
					
					config: config,
					error: count > 0,
					code: 413
				}, true, function () {
					opts = {};
					opts.collection = colName;
					opts.record = record;
					BL.model.insertEntry(req.soajs, opts, function (err) {
						BL.model.closeConnection(req.soajs);
						checkReturnError(req, cb, {
							
							config: config,
							error: err,
							code: 410
						}, false, function () {
							return cb(null, "product add successful");
						});
					});
				});
			});
		});
		
	},
	
	"update": function (config, req, res, cb) {
		BL.model.initConnection(req.soajs);
		var opts = {};
		validateId(req.soajs, function (err) {
			checkReturnError(req, cb, { config: config, error: err, code: 409 }, true, function () {
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
					}, true, function () {
						opts.collection = colName;
						opts.conditions = { '_id': req.soajs.inputmaskData.id };
						opts.fields = s;
						opts.options = { 'upsert': false, 'safe': true };
						BL.model.updateEntry(req.soajs, opts, function (err, data) {
							BL.model.closeConnection(req.soajs);
							checkReturnError(req, cb, {
								
								config: config,
								error: err,
								code: 411
							}, false, function () {
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
			BL.model.initConnection(req.soajs);
			validateId(req.soajs, function (err) {
				checkReturnError(req, cb, {
					
					config: config,
					error: err,
					code: 409
				}, true, function () {
					opts.conditions = { "_id": req.soajs.inputmaskData.id };
					getData();
				});
			});
		} else if (req.soajs.inputmaskData.productCode) {
			BL.model.initConnection(req.soajs);
			opts.conditions = { "code": req.soajs.inputmaskData.productCode };
			getData();
		} else {
			return cb({ "code": 409, "msg": config.errors[409] });
		}
		function getData() {
			BL.model.findEntry(req.soajs, opts, function (err, data) {
				BL.model.closeConnection(req.soajs);
				checkReturnError(req, cb, {
					
					config: config,
					error: err,
					code: 412
				}, false, function () {
					return cb(null, data);
				});
			});
		}
	},
	
	"deletePackage": function (config, req, res, cb) {
		BL.model.initConnection(req.soajs);
		var opts = {};
		validateId(req.soajs, function (err) {
			checkReturnError(req, cb, { config: config, error: err, code: 409 }, false, function () {
				req.soajs.inputmaskData.code = req.soajs.inputmaskData.code.toUpperCase();
				checkCanEdit(req.soajs, function (err) {
					checkReturnError(req, cb, {
						config: config,
						error: err,
						code: err
					}, false, function () {
						opts.collection = colName;
						opts.conditions = { "_id": req.soajs.inputmaskData.id };
						BL.model.findEntry(req.soajs, opts, function (error, productRecord) {
							checkReturnError(req, cb, {
								config: config,
								error: error,
								code: 419
							}, false, function () {
								//prevent operator from deleting the packge he is currently using, reply with error
								checkReturnError(req, cb, {
									config: config,
									error: productRecord.code + '_' + req.soajs.inputmaskData.code === req.soajs.tenant.application.package,
									code: 467
								}, true, function () {
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
									}, true, function () {
										opts = {};
										opts.collection = colName;
										opts.record = productRecord;
										BL.model.saveEntry(req.soajs, opts, function (error) {
											BL.model.closeConnection(req.soajs);
											checkReturnError(req, cb, {
												config: config,
												error: error,
												code: 419
											}, false, function () {
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
		BL.model.initConnection(req.soajs);
		var opts = {};
		opts.collection = colName;
		opts.conditions = { "code": req.soajs.inputmaskData.productCode };
		BL.model.findEntry(req.soajs, opts, function (err, product) {
			BL.model.closeConnection(req.soajs);
			checkReturnError(req, cb, {
				
				config: config,
				error: err || !product,
				code: 460
			}, false, function () {
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
				}, false, function () {
					return cb(null, pck);
				});
			});
		});
	},
	
	"listPackage": function (config, req, res, cb) {
		BL.model.initConnection(req.soajs);
		var opts = {};
		validateId(req.soajs, function (err) {
			checkReturnError(req, cb, { config: config, error: err, code: 409 }, true, function () {
				opts.collection = colName;
				opts.conditions = { "_id": req.soajs.inputmaskData.id };
				BL.model.findEntry(req.soajs, opts, function (err, productRecords) {
					BL.model.closeConnection(req.soajs);
					checkReturnError(req, cb, {
						
						config: config,
						error: err,
						code: 417
					}, false, function () {
						return cb(null, productRecords.packages);
					});
				});
			});
		});
	},
	
	"addPackage": function (config, req, res, cb) {
		BL.model.initConnection(req.soajs);
		var opts = {};
		validateId(req.soajs, function (err) {
			checkReturnError(req, cb, { config: config, error: err, code: 409 }, true, function () {
				req.soajs.inputmaskData.code = req.soajs.inputmaskData.code.toUpperCase();
				checkCanEdit(req.soajs, function (err) {
					checkReturnError(req, cb, {
						
						config: config,
						error: err,
						code: err
					}, true, function () {
						opts.collection = colName;
						opts.conditions = { '_id': req.soajs.inputmaskData.id };
						BL.model.findEntry(req.soajs, opts, function (error, productRecord) {
							checkReturnError(req, cb, {
								config: config,
								error: error || !productRecord,
								code: 415
							}, true, function () {
								var prefix = productRecord.code + '_';
								
								for (var i = 0; i < productRecord.packages.length; i++) {
									if (productRecord.packages[i].code === prefix + req.soajs.inputmaskData.code) {
										BL.model.closeConnection(req.soajs);
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
									}, true, function () {
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
												BL.model.closeConnection(req.soajs);
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
											BL.model.closeConnection(req.soajs);
											checkReturnError(req, cb, {
												config: config,
												error: error,
												code: 415
											}, false, function () {
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
		BL.model.initConnection(req.soajs);
		var opts = {};
		validateId(req.soajs, function (err) {
			checkReturnError(req, cb, { config: config, error: err, code: 409 }, true, function () {
				req.soajs.inputmaskData.code = req.soajs.inputmaskData.code.toUpperCase();
				checkCanEdit(req.soajs, function (err) {
					checkReturnError(req, cb, { config: config, error: err, code: err }, true, function () {
						opts.collection = colName;
						opts.conditions = { '_id': req.soajs.inputmaskData.id };
						BL.model.findEntry(req.soajs, opts, function (error, productRecord) {
							checkReturnError(req, cb, {
								config: config,
								error: error || !productRecord,
								code: 416
							}, true, function () {
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
									}, true, function () {
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
											BL.model.closeConnection(req.soajs);
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
											BL.model.closeConnection(req.soajs);
											return cb({
												"code": 416, "msg": config.errors[416]
											});
										}
										opts = {};
										opts.collection = colName;
										opts.record = productRecord;
										BL.model.saveEntry(req.soajs, opts, function (error) {
											BL.model.closeConnection(req.soajs);
											checkReturnError(req, cb, {
												config: config,
												error: error,
												code: 416
											}, false, function () {
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