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

module.exports = {
	"delete": function(config, mongo, req, res) {
		validateId(mongo, req, function(err) {
			if(err) { return res.jsonp(req.soajs.buildResponse({"code": 409, "msg": config.errors[409]})); }
			checkCanEdit(mongo, req, function(err) {
				if(err) { return res.jsonp(req.soajs.buildResponse({"code": err, "msg": config.errors[err]})); }

				var criteria = { '_id': req.soajs.inputmaskData.id};
				mongo.findOne(colName, criteria, function (error, productRecord) {
					if(error) { return res.jsonp(req.soajs.buildResponse({"code": 414, "msg": config.errors[414]})); }
					if (productRecord) {
						if (req.soajs.tenant.application.product === productRecord.code) {
							//do not allow operator to delete product he is currently using, reply with error
							return res.jsonp(req.soajs.buildResponse({"code": 466, "msg": config.errors[466]}));
						}

						mongo.remove(colName, criteria, function(error) {
							if(error) { return res.jsonp(req.soajs.buildResponse({"code": 414, "msg": config.errors[414]})); }
							return res.jsonp(req.soajs.buildResponse(null, "product delete successful"));
						});
					}
				});
			});
		});
	},

	"list": function(config, mongo, req, res) {
		mongo.find(colName, function(err, records) {
			if(err) { return res.jsonp(req.soajs.buildResponse({"code": 412, "msg": config.errors[412]})); }
			return res.jsonp(req.soajs.buildResponse(null, records));
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
			if(error) { return res.jsonp(req.soajs.buildResponse({"code": 410, "msg": config.errors[410]})); }

			if(count > 0) { return res.jsonp(req.soajs.buildResponse({"code": 413, "msg": config.errors[413]})); }

			mongo.insert(colName, record, function(err) {
				if(err) { return res.jsonp(req.soajs.buildResponse({"code": 410, "msg": config.errors[410]})); }
				return res.jsonp(req.soajs.buildResponse(null, "product add successful"));
			});
		});

	},

	"update": function(config, mongo, req, res) {
		validateId(mongo, req, function(err) {
			if(err) { return res.jsonp(req.soajs.buildResponse({"code": 409, "msg": config.errors[409]})); }
			var s = {
				'$set': {
					'description': req.soajs.inputmaskData.description,
					'name': req.soajs.inputmaskData.name
				}
			};
			checkCanEdit(mongo, req, function(err) {
				if(err) { return res.jsonp(req.soajs.buildResponse({"code": err, "msg": config.errors[err]})); }

				var criteria = { '_id': req.soajs.inputmaskData.id};
				mongo.update(colName, criteria, s, {'upsert': false, 'safe': true}, function(err, data) {
					if(err) { return res.jsonp(req.soajs.buildResponse({"code": 411, "msg": config.errors[411]})); }
					return res.jsonp(req.soajs.buildResponse(null, "product update successful"));
				});
			});
		});
	},

	"get": function(config, mongo, req, res) {
		validateId(mongo, req, function(err) {
			if(err) { return res.jsonp(req.soajs.buildResponse({"code": 409, "msg": config.errors[409]})); }

			mongo.findOne(colName, {"_id": req.soajs.inputmaskData.id}, function(err, data) {
				if(err) { return res.jsonp(req.soajs.buildResponse({"code": 412, "msg": config.errors[412]})); }
				return res.jsonp(req.soajs.buildResponse(null, data));
			});
		});
	},

	"deletePackage": function(config, mongo, req, res) {
		validateId(mongo, req, function(err) {
			if(err) { return res.jsonp(req.soajs.buildResponse({"code": 409, "msg": config.errors[409]})); }
			req.soajs.inputmaskData.code = req.soajs.inputmaskData.code.toUpperCase();

			checkCanEdit(mongo, req, function(err) {
				if(err) { return res.jsonp(req.soajs.buildResponse({"code": err, "msg": config.errors[err]})); }

				mongo.findOne(colName, {"_id": req.soajs.inputmaskData.id}, function(error, productRecord) {
					if(error) {return res.jsonp(req.soajs.buildResponse({"code": 419, "msg": config.errors[419]})); }

					if (productRecord.code + '_' + req.soajs.inputmaskData.code === req.soajs.tenant.application.package) {
						//prevent operator from deleting the packge he is currently using, reply with error
						return res.jsonp(req.soajs.buildResponse({"code": 467, "msg": config.errors[467]}));
					}
					var found = false;
					for(var i = 0; i < productRecord.packages.length; i++) {
						if(productRecord.packages[i].code === productRecord.code + '_' + req.soajs.inputmaskData.code) {
							productRecord.packages.splice(i, 1);
							found = true;
							break;
						}
					}

					if(found) {
						mongo.save(colName, productRecord, function(error) {
							if(error) { return res.jsonp(req.soajs.buildResponse({"code": 419, "msg": config.errors[419]})); }
							return res.jsonp(req.soajs.buildResponse(null, "product package delete successful"));
						});
					} else {
						return res.jsonp(req.soajs.buildResponse({"code": 419, "msg": config.errors[419]}));
					}
				});
			});
		});
	},

	"getPackage": function(config, mongo, req, res) {
		mongo.findOne(colName, {"code": req.soajs.inputmaskData.productCode}, function(err, product) {
			if(err || !product) { return res.jsonp(req.soajs.buildResponse({"code": 460, "msg": config.errors[460]})); }
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
			if(found){
				return res.jsonp(req.soajs.buildResponse(null, pck));
			}else{
				return res.jsonp(req.soajs.buildResponse({"code": 461, "msg": config.errors[461]}));
			}
		});
	},

	"listPackage": function(config, mongo, req, res) {
		validateId(mongo, req, function(err) {
			if(err) { return res.jsonp(req.soajs.buildResponse({"code": 409, "msg": config.errors[409]})); }
			mongo.findOne(colName, {"_id": req.soajs.inputmaskData.id}, function(err, productRecords) {
				if(err) { return res.jsonp(req.soajs.buildResponse({"code": 417, "msg": config.errors[417]})); }
				return res.jsonp(req.soajs.buildResponse(null, productRecords.packages));
			});
		});
	},

	"addPackage": function(config, mongo, req, res) {
		validateId(mongo, req, function(err) {
			if(err) { return res.jsonp(req.soajs.buildResponse({"code": 409, "msg": config.errors[409]})); }
			req.soajs.inputmaskData.code = req.soajs.inputmaskData.code.toUpperCase();

			checkCanEdit(mongo, req, function(err) {
				if(err) { return res.jsonp(req.soajs.buildResponse({"code": err, "msg": config.errors[err]})); }

				var criteria = { '_id': req.soajs.inputmaskData.id};
				mongo.findOne(colName, criteria, function(error, productRecord) {
					if(error || !productRecord) { return res.jsonp(req.soajs.buildResponse({"code": 415, "msg": config.errors[415]})); }

					var prefix = productRecord.code + '_';

					for(var i = 0; i < productRecord.packages.length; i++) {
						if(productRecord.packages[i].code === prefix + req.soajs.inputmaskData.code) {
							return res.jsonp(req.soajs.buildResponse({"code": 418, "msg": config.errors[418]}));
						}
					}

					mongo.findOne(envName, {}, {"fields":{"code": 1}}, function(error, environments){
						if(error || !environments){ return res.jsonp(req.soajs.buildResponse({"code": 402, "msg": config.errors[402]})); }

						var postedEnvs = Object.keys(req.soajs.inputmaskData.acl);
						for(var i =0; i < environments.length; i++){
							if(postedEnvs.indexOf(environments[i].code.toLowerCase()) === -1){
								return res.json(req.soajs.buildResponse({"code": 405, "msg": config.errors[405]}));
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

						mongo.save(colName, productRecord, function(error) {
							if(error) { return res.jsonp(req.soajs.buildResponse({"code": 415, "msg": config.errors[415]})); }
							return res.jsonp(req.soajs.buildResponse(null, "product package add successful"));
						});
					});
				});
			});
		});
	},

	"updatePackage": function(config, mongo, req, res) {
		validateId(mongo, req, function(err) {
			if(err) { return res.jsonp(req.soajs.buildResponse({"code": 409, "msg": config.errors[409]})); }
			req.soajs.inputmaskData.code = req.soajs.inputmaskData.code.toUpperCase();

			checkCanEdit(mongo, req, function(err) {
				if(err) { return res.jsonp(req.soajs.buildResponse({"code": err, "msg": config.errors[err]})); }

				var criteria = { '_id': req.soajs.inputmaskData.id};
				mongo.findOne(colName, criteria, function(error, productRecord) {
					if(error || !productRecord) { return res.jsonp(req.soajs.buildResponse({"code": 416, "msg": config.errors[416]})); }

					mongo.findOne(envName, {}, {"fields":{"code": 1}}, function(error, environments){
						if(error || !environments){ return res.jsonp(req.soajs.buildResponse({"code": 402, "msg": config.errors[402]})); }

						var postedEnvs = Object.keys(req.soajs.inputmaskData.acl);
						for(var i =0; i < environments.length; i++){
							if(postedEnvs.indexOf(environments[i].code) === -1){
								return res.json(req.soajs.buildResponse({"code": 405, "msg": config.errors[405]}));
							}
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

						if(!found) {
							return res.jsonp(req.soajs.buildResponse({"code": 416, "msg": config.errors[416]}));
						} else {
							mongo.save(colName, productRecord, function(error) {
								if(error) { return res.jsonp(req.soajs.buildResponse({"code": 416, "msg": config.errors[416]})); }
								return res.jsonp(req.soajs.buildResponse(null, "product package update successful"));
							});
						}
					});
				});
			});
		});
	}
};