'use strict';
var colName = "products";
var envName = "environment";
function validateId(mongo, req, cb) {
	try {
		req.soajs.inputmaskData.id = mongo.ObjectId(req.soajs.inputmaskData.id);
		return cb(null);
	} catch(e) {
		return cb(e);
	}
}

function checkCanEdit(mongo, req, cb) {
	var myProduct;
	var myUrac = req.soajs.session.getUrac();
	if(myUrac && myUrac.tenant.id === req.soajs.tenant.id){
		myProduct = req.soajs.tenant.application.product;
	}

	var criteria1 = { '_id': req.soajs.inputmaskData.id};
	mongo.findOne(colName, criteria1, function(error, record) {
		if(error) { return cb(600); }
		//if i am the owner of the product
		if(record && myProduct && record.code === myProduct){ return cb(null, {}); }
		// return error msg that this record is locked
		else if(record && record.locked){ return cb(501); }
		//i am not the owner and the product is not locked
		else{ return cb(null,{}); }
	});
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

module.exports = {
	"delete": function(config, mongo, req, res) {
		validateId(mongo, req, function(err) {
			checkIfError(req, res, {config: config, error: err, code: 409}, function () {
				checkCanEdit(mongo, req, function(err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						var criteria = { '_id': req.soajs.inputmaskData.id};
						mongo.findOne(colName, criteria, function (error, productRecord) {
							checkIfError(req, res, {config: config, error: error, code: 414}, function () {
								if (productRecord) {
									checkIfError(req, res, {config: config, error: req.soajs.tenant.application.product === productRecord.code, code: 466}, function () {
										mongo.remove(colName, criteria, function(error) {
											checkIfError(req, res, {config: config, error: error, code: 414}, function () {
												return res.jsonp(req.soajs.buildResponse(null, "product delete successful"));
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
	},

	"list": function(config, mongo, req, res) {
		mongo.find(colName, function(err, records) {
			checkIfError(req, res, {config: config, error: err, code: 412}, function () {
				return res.jsonp(req.soajs.buildResponse(null, records));
			});
		});
	},

	"add": function(config, mongo, req, res) {
		var record = {
			"code": req.soajs.inputmaskData.code.toUpperCase(),
			"name": req.soajs.inputmaskData.name,
			"description": req.soajs.inputmaskData.description,
			"packages": []
		};

		mongo.count(colName, {'code': record.code}, function(error, count) {
			checkIfError(req, res, {config: config, error: error, code: 410}, function () {
				checkIfError(req, res, {config: config, error: count > 0, code: 413}, function () {
					mongo.insert(colName, record, function(err) {
						checkIfError(req, res, {config: config, error: err, code: 410}, function () {
							return res.jsonp(req.soajs.buildResponse(null, "product add successful"));
						});
					});
				});
			});
		});

	},

	"update": function(config, mongo, req, res) {
		validateId(mongo, req, function(err) {
			checkIfError(req, res, {config: config, error: err, code: 409}, function () {
				var s = {
					'$set': {
						'description': req.soajs.inputmaskData.description,
						'name': req.soajs.inputmaskData.name
					}
				};
				checkCanEdit(mongo, req, function(err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						var criteria = { '_id': req.soajs.inputmaskData.id};
						mongo.update(colName, criteria, s, {'upsert': false, 'safe': true}, function(err, data) {
							checkIfError(req, res, {config: config, error: err, code: 411}, function () {
								return res.jsonp(req.soajs.buildResponse(null, "product update successful"));
							});
						});
					});
				});
			});
		});
	},

	"get": function(config, mongo, req, res) {
		validateId(mongo, req, function(err) {
			checkIfError(req, res, {config: config, error: err, code: 409}, function () {
				mongo.findOne(colName, {"_id": req.soajs.inputmaskData.id}, function(err, data) {
					checkIfError(req, res, {config: config, error: err, code: 412}, function () {
						return res.jsonp(req.soajs.buildResponse(null, data));
					});
				});
			});
		});
	},

	"deletePackage": function(config, mongo, req, res) {
		validateId(mongo, req, function(err) {
			checkIfError(req, res, {config: config, error: err, code: 409}, function () {
				req.soajs.inputmaskData.code = req.soajs.inputmaskData.code.toUpperCase();
				checkCanEdit(mongo, req, function(err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						mongo.findOne(colName, {"_id": req.soajs.inputmaskData.id}, function(error, productRecord) {
							checkIfError(req, res, {config: config, error: error, code: 419}, function () {
								//prevent operator from deleting the packge he is currently using, reply with error
								checkIfError(req, res, {
									config: config,
									error: productRecord.code + '_' + req.soajs.inputmaskData.code === req.soajs.tenant.application.package,
									code: 467
								}, function () {
									var found = false;
									for(var i = 0; i < productRecord.packages.length; i++) {
										if(productRecord.packages[i].code === productRecord.code + '_' + req.soajs.inputmaskData.code) {
											productRecord.packages.splice(i, 1);
											found = true;
											break;
										}
									}
									checkIfError(req, res, {config: config, error: !found, code: 419}, function () {
										mongo.save(colName, productRecord, function(error) {
											checkIfError(req, res, {config: config, error: error, code: 419}, function () {
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

	"getPackage": function(config, mongo, req, res) {
		mongo.findOne(colName, {"code": req.soajs.inputmaskData.productCode}, function(err, product) {
			checkIfError(req, res, {config: config, error: err || !product, code: 460}, function () {
				var pck ={};
				var found= false;
				for(var i = 0; i < product.packages.length; i++)
				{
					if(product.packages[i].code === req.soajs.inputmaskData.packageCode) {
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

	"listPackage": function(config, mongo, req, res) {
		validateId(mongo, req, function(err) {
			checkIfError(req, res, {config: config, error: err, code: 409}, function () {
				mongo.findOne(colName, {"_id": req.soajs.inputmaskData.id}, function(err, productRecords) {
					checkIfError(req, res, {config: config, error: err, code: 417}, function () {
						return res.jsonp(req.soajs.buildResponse(null, productRecords.packages));
					});
				});
			});
		});
	},

	"addPackage": function(config, mongo, req, res) {
		validateId(mongo, req, function(err) {
			checkIfError(req, res, {config: config, error: err, code: 409}, function () {
				req.soajs.inputmaskData.code = req.soajs.inputmaskData.code.toUpperCase();
				checkCanEdit(mongo, req, function(err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						var criteria = { '_id': req.soajs.inputmaskData.id};
						mongo.findOne(colName, criteria, function(error, productRecord) {
							checkIfError(req, res, {config: config, error: error || !productRecord, code: 415}, function () {
								var prefix = productRecord.code + '_';

								for(var i = 0; i < productRecord.packages.length; i++) {
									if(productRecord.packages[i].code === prefix + req.soajs.inputmaskData.code) {
										return res.jsonp(req.soajs.buildResponse({"code": 418, "msg": config.errors[418]}));
									}
								}
								mongo.find(envName, {}, {"fields":{"code": 1}}, function(error, environments){
									if(error || !environments){ return res.jsonp(req.soajs.buildResponse({"code": 402, "msg": config.errors[402]})); }

									var status = false;
									var postedEnvs = Object.keys(req.soajs.inputmaskData.acl);
									for(var i =0; i < environments.length; i++){
										if(postedEnvs.indexOf(environments[i].code.toLowerCase()) !== -1){
											status = true;
											break;
										}
									}

									if(!status){
										return res.json(req.soajs.buildResponse({"code": 405, "msg": config.errors[405]}));
									}
									
									var newPackage = {
										"code": prefix + req.soajs.inputmaskData.code,
										"name": req.soajs.inputmaskData.name,
										"description": req.soajs.inputmaskData.description,
										"acl": req.soajs.inputmaskData.acl,
										"_TTL": req.soajs.inputmaskData._TTL * 3600 * 1000
									};
									productRecord.packages.push(newPackage);
	
									mongo.save(colName, productRecord, function(error) {
										checkIfError(req, res, {config: config, error: error, code: 415}, function () {
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
	},

	"updatePackage": function(config, mongo, req, res) {
		validateId(mongo, req, function(err) {
			checkIfError(req, res, {config: config, error: err, code: 409}, function () {
				req.soajs.inputmaskData.code = req.soajs.inputmaskData.code.toUpperCase();
				checkCanEdit(mongo, req, function(err) {
					checkIfError(req, res, {config: config, error: err, code: err}, function () {
						var criteria = { '_id': req.soajs.inputmaskData.id};
						mongo.findOne(colName, criteria, function(error, productRecord) {
							checkIfError(req, res, {config: config, error: error || !productRecord, code: 416}, function () {
								mongo.find(envName, {}, {"fields":{"code": 1}}, function(error, environments){
									checkIfError(req, res, {config: config, error: error || !environments, code: 402}, function () {
										var status = false;
										var postedEnvs = Object.keys(req.soajs.inputmaskData.acl);
										for(var i =0; i < environments.length; i++){
											if(postedEnvs.indexOf(environments[i].code.toLowerCase()) !== -1){
												status = true;
												break;
											}
										}

										if(!status){
											return res.json(req.soajs.buildResponse({"code": 405, "msg": config.errors[405]}));
										}

										var prefix = productRecord.code + '_';

										var found = false;
										for(var i = 0; i < productRecord.packages.length; i++) {
											if(productRecord.packages[i].code === prefix + req.soajs.inputmaskData.code) {
												productRecord.packages[i].name = req.soajs.inputmaskData.name;
												productRecord.packages[i].description = req.soajs.inputmaskData.description;
												productRecord.packages[i]._TTL = req.soajs.inputmaskData._TTL * 3600 * 1000;
												productRecord.packages[i].acl = req.soajs.inputmaskData.acl;
												found = true;
												break;
											}
										}

										checkIfError(req, res, {config: config, error: !found, code: 416}, function () {
											mongo.save(colName, productRecord, function(error) {
												checkIfError(req, res, {config: config, error: error, code: 416}, function () {
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