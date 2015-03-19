'use strict';
var colName = "products";
function validateId(mongo, req, cb) {
  try {
    req.soajs.inputmaskData.id = mongo.ObjectId(req.soajs.inputmaskData.id);
    return cb(null);
  } catch(e) {
    return cb(e);
  }
}

module.exports = {
  "delete": function(config, mongo, req, res) {
    validateId(mongo, req, function(err) {
      if(err) { return res.jsonp(req.soajs.buildResponse({"code": 409, "msg": config.errors[409]})); }
      mongo.remove(colName, {"_id": req.soajs.inputmaskData.id}, function(error) {
        if(error) { return res.jsonp(req.soajs.buildResponse({"code": 414, "msg": config.errors[414]})); }
        return res.jsonp(req.soajs.buildResponse(null, "product delete successful"));
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
      mongo.update(colName, {"_id": req.soajs.inputmaskData.id}, s, {'upsert': false, 'safe': true}, function(err, data) {
        if(err) { return res.jsonp(req.soajs.buildResponse({"code": 411, "msg": config.errors[411]})); }
        return res.jsonp(req.soajs.buildResponse(null, "product update successful"));
      });
    });
  },

  "get": function(config, mongo, req, res){
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
      mongo.findOne(colName, {"_id": req.soajs.inputmaskData.id}, function(error, productRecord) {
        if(error) { return res.jsonp(req.soajs.buildResponse({"code": 419, "msg": config.errors[419]})); }

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
      mongo.findOne(colName, {"_id": req.soajs.inputmaskData.id}, function(error, productRecord) {
        if(error || !productRecord) { return res.jsonp(req.soajs.buildResponse({"code": 415, "msg": config.errors[415]})); }

        var prefix = productRecord.code + '_';

        for(var i = 0; i < productRecord.packages.length; i++) {
          if(productRecord.packages[i].code === prefix + req.soajs.inputmaskData.code) {
            return res.jsonp(req.soajs.buildResponse({"code": 418, "msg": config.errors[418]}));
          }
        }

        var newPackage = {
          "code": prefix + req.soajs.inputmaskData.code,
          "name": req.soajs.inputmaskData.name,
          "description": req.soajs.inputmaskData.description,
          "acl": req.soajs.inputmaskData.acl,
          "_TTL": req.soajs.inputmaskData._TTL * 3600
        };
        productRecord.packages.push(newPackage);

        mongo.save(colName, productRecord, function(error) {
          if(error) { return res.jsonp(req.soajs.buildResponse({"code": 415, "msg": config.errors[415]})); }
          return res.jsonp(req.soajs.buildResponse(null, "product package add successful"));
        });
      });
    });
  },

  "updatePackage": function(config, mongo, req, res) {
    validateId(mongo, req, function(err) {
      if(err) { return res.jsonp(req.soajs.buildResponse({"code": 409, "msg": config.errors[409]})); }
      req.soajs.inputmaskData.code = req.soajs.inputmaskData.code.toUpperCase();
      mongo.findOne(colName, {"_id": req.soajs.inputmaskData.id}, function(error, productRecord) {
        if(error || !productRecord) { return res.jsonp(req.soajs.buildResponse({"code": 416, "msg": config.errors[416]})); }

        var prefix = productRecord.code + '_';

        var found = false;
        for(var i = 0; i < productRecord.packages.length; i++) {
          if(productRecord.packages[i].code === prefix + req.soajs.inputmaskData.code) {
            productRecord.packages[i].name = req.soajs.inputmaskData.name;
            productRecord.packages[i].description = req.soajs.inputmaskData.description;
            productRecord.packages[i]._TTL = req.soajs.inputmaskData._TTL * 3600;
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
  }
};