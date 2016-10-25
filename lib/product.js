'use strict';
var colName = "products";
var envName = "environment";

var fs = require('fs');

function validateId(soajs, cb) {
	BL.model.validateId(soajs, cb);
}

function checkCanEdit(soajs, cb) {
	var myProduct;
	var myUrac = soajs.session.getUrac();
	if (myUrac && myUrac.tenant.id === soajs.tenant.id) {
		myProduct = soajs.tenant.application.product;
	}
	
	var opts = {};
	opts.collection = colName;
	opts.conditions = {'_id': soajs.inputmaskData.id};
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
		else {
			return cb(null, {});
		}
	});
}

function checkIfError(req, res, data, cb) {
	if (data.error) {
		if (typeof (data.error) === 'object' && (data.error.message || data.error.msg)) {
			req.soajs.log.error(data.error);
		}

		return res.jsonp(req.soajs.buildResponse({"code": data.code, "msg": data.config.errors[data.code]}));
	} else {
		if (cb) return cb();
	}
}

var BL = {
	model : null,

	"delete": function (config, req, res) {
		validateId(req.soajs, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 409}, function () {
				checkCanEdit(req.soajs, function (err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						var opts = {};
						opts.collection = colName;
						opts.conditions = {'_id': req.soajs.inputmaskData.id};
						BL.model.findEntry(req.soajs, opts, function (error, productRecord) {
							checkIfError(req, res, {config: config, error: error, code: 414}, function () {
								checkIfError(req, res, {config: config, error: !productRecord, code: 409}, function () {
									checkIfError(req, res, {
										config: config,
										error: req.soajs.tenant.application.product === productRecord.code,
										code: 466
									}, function () {
										opts = {};
										opts.collection = colName;
										opts.conditions = {'_id': req.soajs.inputmaskData.id};
										BL.model.removeEntry(req.soajs, opts, function (error) {
											checkIfError(req, res, {
												config: config,
												error: error,
												code: 414
											}, function () {
												return res.jsonp(req.soajs.buildResponse(null, "product delete successful"));
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
		BL.model.findEntries(req.soajs, opts, function (err, records) {
			checkIfError(req, res, {config: config, error: err, code: 412}, function () {
				return res.jsonp(req.soajs.buildResponse(null, records));
			});
		});
	},

	"add": function (config, req, res) {
		var opts = {};
		opts.collection = colName;
		var record = {
			"code": req.soajs.inputmaskData.code.toUpperCase(),
			"name": req.soajs.inputmaskData.name,
			"description": req.soajs.inputmaskData.description,
			"packages": []
		};
		opts.conditions = {'code': record.code};
		BL.model.countEntries(req.soajs, opts, function (error, count) {
			checkIfError(req, res, {config: config, error: error, code: 410}, function () {
				checkIfError(req, res, {config: config, error: count > 0, code: 413}, function () {
					opts = {};
					opts.collection = colName;
					opts.record = record;
					BL.model.insertEntry(req.soajs, opts, function (err) {
						checkIfError(req, res, {config: config, error: err, code: 410}, function () {
							return res.jsonp(req.soajs.buildResponse(null, "product add successful"));
						});
					});
				});
			});
		});

	},

	"update": function (config, req, res) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 409}, function () {
				var s = {
					'$set': {
						'description': req.soajs.inputmaskData.description,
						'name': req.soajs.inputmaskData.name
					}
				};
				checkCanEdit(req.soajs, function (err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						opts.collection = colName;
						opts.conditions = {'_id': req.soajs.inputmaskData.id};
						opts.fields = s;
						opts.options = {'upsert': false, 'safe': true};
						BL.model.updateEntry(req.soajs, opts, function (err, data) {
							checkIfError(req, res, {config: config, error: err, code: 411}, function () {
								return res.jsonp(req.soajs.buildResponse(null, "product update successful"));
							});
						});
					});
				});
			});
		});
	},

	"get": function (config, req, res) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 409}, function () {
				opts.collection = colName;
				opts.conditions = {"_id": req.soajs.inputmaskData.id}
				BL.model.findEntry(req.soajs, opts, function (err, data) {
					checkIfError(req, res, {config: config, error: err, code: 412}, function () {
						return res.jsonp(req.soajs.buildResponse(null, data));
					});
				});
			});
		});
	},

	"deletePackage": function (config, req, res) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 409}, function () {
				req.soajs.inputmaskData.code = req.soajs.inputmaskData.code.toUpperCase();
				checkCanEdit(req.soajs, function (err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						opts.collection = colName;
						opts.conditions = {"_id": req.soajs.inputmaskData.id};
						BL.model.findEntry(req.soajs, opts, function (error, productRecord) {
							checkIfError(req, res, {config: config, error: error, code: 419}, function () {
								//prevent operator from deleting the packge he is currently using, reply with error
								checkIfError(req, res, {
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
									checkIfError(req, res, {config: config, error: !found, code: 419}, function () {
										opts = {};
										opts.collection = colName;
										opts.record = productRecord;
										BL.model.saveEntry(req.soajs, opts, function (error) {
											checkIfError(req, res, {
												config: config,
												error: error,
												code: 419
											}, function () {
												return res.jsonp(req.soajs.buildResponse(null, "product package delete successful"));
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

	"getPackage": function (config, req, res) {
		var opts = {};
		opts.collection = colName;
		opts.conditions = {"code": req.soajs.inputmaskData.productCode};
		BL.model.findEntry(req.soajs, opts, function (err, product) {
			checkIfError(req, res, {config: config, error: err || !product, code: 460}, function () {
				var pck = {};
				var found = false;
				for (var i = 0; i < product.packages.length; i++) {
					if (product.packages[i].code === req.soajs.inputmaskData.packageCode) {
						pck = product.packages[i];
						found = true;
						break;
					}
				}
				checkIfError(req, res, {config: config, error: !found, code: 461}, function () {
					return res.jsonp(req.soajs.buildResponse(null, pck));
				});
			});
		});
	},

	"listPackage": function (config, req, res) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 409}, function () {
				opts.collection = colName;
				opts.conditions = {"_id": req.soajs.inputmaskData.id};
				BL.model.findEntry(req.soajs, opts, function (err, productRecords) {
					checkIfError(req, res, {config: config, error: err, code: 417}, function () {
						return res.jsonp(req.soajs.buildResponse(null, productRecords.packages));
					});
				});
			});
		});
	},

	"addPackage": function (config, req, res) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 409}, function () {
				req.soajs.inputmaskData.code = req.soajs.inputmaskData.code.toUpperCase();
				checkCanEdit(req.soajs, function (err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						opts.collection = colName;
						opts.conditions = {'_id': req.soajs.inputmaskData.id};
						BL.model.findEntry(req.soajs, opts, function (error, productRecord) {
							checkIfError(req, res, {
								config: config,
								error: error || !productRecord,
								code: 415
							}, function () {
								var prefix = productRecord.code + '_';

								for (var i = 0; i < productRecord.packages.length; i++) {
									if (productRecord.packages[i].code === prefix + req.soajs.inputmaskData.code) {
										return res.jsonp(req.soajs.buildResponse({
											"code": 418,
											"msg": config.errors[418]
										}));
									}
								}
								opts = {};
								opts.collection = envName;
								opts.conditions = {};
								opts.fields = {"code": 1};
								BL.model.findEntries(req.soajs, opts, function (error, environments) {
									checkIfError(req, res, {config: config, error: error || !environments, code: 402}, function () {
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
												return res.json(req.soajs.buildResponse({
													"code": 405,
													"msg": config.errors[405]
												}));
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
											checkIfError(req, res, {
												config: config,
												error: error,
												code: 415
											}, function () {
												return res.jsonp(req.soajs.buildResponse(null, "product package add successful"));
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

	"updatePackage": function (config, req, res) {
		var opts = {};
		validateId(req.soajs, function (err) {
			checkIfError(req, res, {config: config, error: err, code: 409}, function () {
				req.soajs.inputmaskData.code = req.soajs.inputmaskData.code.toUpperCase();
				checkCanEdit(req.soajs, function (err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						opts.collection = colName;
						opts.conditions = {'_id': req.soajs.inputmaskData.id};
						BL.model.findEntry(req.soajs, opts, function (error, productRecord) {
							checkIfError(req, res, {
								config: config,
								error: error || !productRecord,
								code: 416
							}, function () {
								opts = {};
								opts.collection = envName;
								opts.conditions = {};
								opts.fields = {"code": 1};
								BL.model.findEntries(req.soajs, opts, function (error, environments) {
									checkIfError(req, res, {
										config: config,
										error: error || !environments,
										code: 402
									}, function () {
										var status = false;
										var postedEnvs = Object.keys(req.soajs.inputmaskData.acl);
										for (var i = 0; i < environments.length; i++) {
											if (postedEnvs.indexOf(environments[i].code.toLowerCase()) !== -1) {
												status = true;
												break;
											}
										}

										if (!status) {
											return res.json(req.soajs.buildResponse({
												"code": 405,
												"msg": config.errors[405]
											}));
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

										checkIfError(req, res, {config: config, error: !found, code: 416}, function () {
											opts = {};
											opts.collection = colName;
											opts.record = productRecord;
											BL.model.saveEntry(req.soajs, opts, function (error) {
												checkIfError(req, res, {
													config: config,
													error: error,
													code: 416
												}, function () {
													return res.jsonp(req.soajs.buildResponse(null, "product package update successful"));
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