'use strict';
const colName = "products";
const envName = "environment";

const fs = require('fs');
const async = require('async');
const _ = require('lodash');

function validateId(soajs, cb) {
	BL.model.validateId(soajs, cb);
}

function checkCanEdit(soajs, cb) {
	var opts = {};
	opts.collection = colName;
	opts.conditions = {};
	if (soajs.inputmaskData.id) {
		opts.conditions = {'_id': soajs.inputmaskData.id};
	} else if (soajs.inputmaskData.code) {
		opts.conditions = {'code': soajs.inputmaskData.code};
	}
	BL.model.findEntry(soajs, opts, function (error, record) {
		if (error) {
			return cb(600);
		}
		if (soajs.tenant.locked) {
			return cb(null, {});
		} else {
			if (record && record.locked) {
				return cb(501);
			} else {
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
		return mainCb({"code": data.code, "msg": data.config.errors[data.code]});
	} else {
		if (cb) {
			return cb();
		}
	}
}

function makeId(length) {
	let result = '';
	let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let charactersLength = characters.length;
	for (let i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}
	return result;
}

function calculateCode(codes, length) {
	let code = makeId(length);
	if (codes.indexOf(code) !== -1) {
		calculateCode(codes, length);
	} else {
		return code;
	}
}

var BL = {
	model: null,
	
	"delete": function (config, req, res, cb) {
		var errorData = {};
		if (!req.soajs.inputmaskData.id && !req.soajs.inputmaskData.code) {
			return cb({"code": 470, "msg": config.errors[470]});
		}
		if (req.soajs.inputmaskData.code) {
			deleteProduct(cb);
		} else {
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
						opts.conditions = {'_id': req.soajs.inputmaskData.id};
					}
					
					if (req.soajs.inputmaskData.code) {
						opts.conditions = {'code': req.soajs.inputmaskData.code};
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
										opts.conditions = {'_id': req.soajs.inputmaskData.id};
									}
									
									if (req.soajs.inputmaskData.code) {
										opts.conditions = {'code': req.soajs.inputmaskData.code};
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
	
	"list": function (config, req, res, productModel, cb) {
		var opts = {
			collection: colName,
			conditions: {
				code: {$ne: config.console.product}
			}
		};
		opts.options = {
			sort: {
				name: 1
			}
		};
		productModel.findEntries(req.soajs, BL.model, opts, function (err, records) {
			checkReturnError(req, cb, {config: config, error: err, code: 412}, function () {
				if (records.length === 0) {
					return cb(null, []);
				}
				async.each(records, (product, callback) => {
					if (product.packages.length > 0) {
						product.packages = _.orderBy(product.packages, ['name'], ['desc']);
					}
					return callback();
				}, () => {
					return cb(null, records);
				});
			});
		});
	},
	
	"listConsole": function (config, req, res, productModel, cb) {
		var opts = {
			collection: colName,
			conditions: {
				code: config.console.product
			}
		};
		opts.options = {
			sort: {
				name: 1
			}
		};
		productModel.findEntry(req.soajs, BL.model, opts, function (err, record) {
			checkReturnError(req, cb, {config: config, error: err, code: 412}, function () {
				if (record.packages.length > 0) {
					record.packages = _.orderBy(record.packages, ['name'], ['desc']);
				}
				return cb(null, record);
			});
		});
	},
	
	"add": function (config, req, res, cb) {
		var opts = {};
		opts.collection = colName;
		var record = {
			"code": req.soajs.inputmaskData.code ? req.soajs.inputmaskData.code.toUpperCase() : null,
			"name": req.soajs.inputmaskData.name,
			"description": req.soajs.inputmaskData.description,
			"scope": {
				"acl": {}
			},
			"packages": []
		};
		
		if (record.code) {
			opts.conditions = {'code': record.code};
		} else {
			opts.conditions = {};
		}
		BL.model.findEntries(req.soajs, opts, function (error, products) {
			checkReturnError(req, cb, {config: config, error: error, code: 410}, function () {
				checkReturnError(req, cb, {
					config: config,
					error: record.code && products.length > 0,
					code: 413
				}, function () {
					let codes = [];
					products.forEach((oneProduct) => {
						codes.push(oneProduct.code);
					});
					if (!record.code) {
						record.code = calculateCode(codes, 5);
					}
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
			checkReturnError(req, cb, {config: config, error: err, code: 409}, function () {
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
						opts.conditions = {'_id': req.soajs.inputmaskData.id};
						opts.fields = s;
						opts.options = {'upsert': false, 'safe': true};
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
	
	"updateScope": function (config, req, res, productModel, cb) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkReturnError(req, cb, {config: config, error: err, code: 409}, function () {
				productModel.sanitize(req.soajs.inputmaskData.scope, function () {
					var s = {
						'$set': {
							'scope': {
								acl: req.soajs.inputmaskData.scope
							}
						}
					};
					opts.collection = colName;
					opts.conditions = {'_id': req.soajs.inputmaskData.id};
					opts.fields = s;
					opts.options = {'upsert': false, 'safe': true};
					productModel.updateEntry(req.soajs, BL.model, opts, function (err) {
						checkReturnError(req, cb, {
							config: config,
							error: err,
							code: 411
						}, function () {
							return cb(null, "product scope update successful");
						});
					});
				});
			});
		});
	},
	
	"get": function (config, req, res, productModel, cb) {
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
					opts.conditions = {"_id": req.soajs.inputmaskData.id};
					getData();
				});
			});
		} else if (req.soajs.inputmaskData.productCode) {
			opts.conditions = {"code": req.soajs.inputmaskData.productCode};
			getData();
		} else {
			return cb({"code": 409, "msg": config.errors[409]});
		}
		
		function getData() {
			productModel.findEntry(req.soajs, BL.model, opts, function (err, data) {
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
			checkReturnError(req, cb, {config: config, error: err, code: 409}, function () {
				req.soajs.inputmaskData.code = req.soajs.inputmaskData.code.toUpperCase();
				checkCanEdit(req.soajs, function (err) {
					checkReturnError(req, cb, {
						config: config,
						error: err,
						code: err
					}, function () {
						opts.collection = colName;
						opts.conditions = {"_id": req.soajs.inputmaskData.id};
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
		opts.conditions = {"code": req.soajs.inputmaskData.productCode};
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
			checkReturnError(req, cb, {config: config, error: err, code: 409}, function () {
				opts.collection = colName;
				opts.conditions = {"_id": req.soajs.inputmaskData.id};
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
			checkReturnError(req, cb, {config: config, error: err, code: 409}, function () {
				req.soajs.inputmaskData.code = req.soajs.inputmaskData.code ? req.soajs.inputmaskData.code.toUpperCase() : null;
				checkCanEdit(req.soajs, function (err) {
					checkReturnError(req, cb, {
						config: config,
						error: err,
						code: err
					}, function () {
						opts.collection = colName;
						opts.conditions = {'_id': req.soajs.inputmaskData.id};
						req.soajs.log.warn(opts);
						BL.model.findEntry(req.soajs, opts, function (error, productRecord) {
							checkReturnError(req, cb, {
								config: config,
								error: error || !productRecord,
								code: 415
							}, function () {
								var prefix = productRecord.code + '_';
								
								if (req.soajs.inputmaskData.code) {
									for (var i = 0; i < productRecord.packages.length; i++) {
										if (productRecord.packages[i].code === prefix + req.soajs.inputmaskData.code) {
											return cb({"code": 418, "msg": config.errors[418]});
										}
									}
								}
								
								if (!req.soajs.inputmaskData.code) {
									let codes = [];
									productRecord.packages.forEach((onePack) => {
										codes.push(onePack.code);
									});
									req.soajs.inputmaskData.code = calculateCode(codes, 5);
								}
								
								opts = {};
								opts.collection = envName;
								opts.fields = {"code": 1};
								
								opts.conditions = {};
								if (!productRecord.locked) {
									opts.conditions = {
										code: {$ne: process.env.SOAJS_ENV.toUpperCase()}
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
												return cb({"code": 405, "msg": config.errors[405]});
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
												return cb(null, newPackage.code);
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
			checkReturnError(req, cb, {config: config, error: err, code: 409}, function () {
				req.soajs.inputmaskData.code = req.soajs.inputmaskData.code.toUpperCase();
				checkCanEdit(req.soajs, function (err) {
					checkReturnError(req, cb, {config: config, error: err, code: err}, function () {
						opts.collection = colName;
						opts.conditions = {'_id': req.soajs.inputmaskData.id};
						BL.model.findEntry(req.soajs, opts, function (error, productRecord) {
							checkReturnError(req, cb, {
								config: config,
								error: error || !productRecord,
								code: 416
							}, function () {
								opts = {};
								opts.collection = envName;
								opts.fields = {"code": 1};
								opts.conditions = {};
								if (!productRecord.locked) {
									opts.conditions = {
										code: {$ne: process.env.SOAJS_ENV.toUpperCase()}
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
										} else {
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
										
										var prefix = productRecord.code.toUpperCase() + '_';
										
										var found = false;
										for (var i = 0; i < productRecord.packages.length; i++) {
											if (productRecord.packages[i].code.toUpperCase() === prefix + req.soajs.inputmaskData.code) {
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
	},
	
	"purgeProduct": function (config, req, res, cb) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkReturnError(req, cb, {config: config, error: err, code: 409}, function () {
				opts.collection = colName;
				opts.conditions = {'_id': req.soajs.inputmaskData.id};
				BL.model.findEntry(req.soajs, opts, function (error, productRecord) {
					checkReturnError(req, cb, {
						config: config,
						error: error || !productRecord,
						code: 416
					}, function () {
						productRecord.scope = {
							acl: {}
						};
						for (var i = 0; i < productRecord.packages.length; i++) {
							productRecord.packages[i].acl = {};
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
								return cb(null, "product purged and updated successful");
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