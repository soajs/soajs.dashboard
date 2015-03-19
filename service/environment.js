'use strict';

var colName = "environment";

function validateId(mongo, req, cb) {
  try {
    req.soajs.inputmaskData.id = mongo.ObjectId(req.soajs.inputmaskData.id);
    return cb(null);
  } catch(e) {
    return cb(e);
  }
}

module.exports = {
  "add": function(config, mongo, req, res) {
    var record = {
      "code": req.soajs.inputmaskData.code,
      "description": req.soajs.inputmaskData.description,
      "ips": req.soajs.inputmaskData.ips
    };

    mongo.count(colName, {'code': record.code}, function(error, count) {
      if(error) { return res.jsonp(req.soajs.buildResponse({"code": 400, "msg": config.errors[400]})); }

      if(count > 0) { return res.jsonp(req.soajs.buildResponse({"code": 403, "msg": config.errors[403]})); }

      mongo.insert(colName, record, function(err) {
        if(err) { return res.jsonp(req.soajs.buildResponse({"code": 400, "msg": config.errors[400]})); }
        return res.jsonp(req.soajs.buildResponse(null, "environment add successful"));
      });
    });
  },

  "delete": function(config, mongo, req, res) {
    validateId(mongo, req, function(err) {
      if(err) { return res.jsonp(req.soajs.buildResponse({"code": 405, "msg": config.errors[405]})); }

      mongo.remove(colName, {"_id": req.soajs.inputmaskData.id}, function(error) {
        if(error) { return res.jsonp(req.soajs.buildResponse({"code": 404, "msg": config.errors[404]})); }
        return res.jsonp(req.soajs.buildResponse(null, "environment delete successful"));
      });
    });
  },

  "update": function(config, mongo, req, res) {
    validateId(mongo, req, function(err) {
      if(err) { return res.jsonp(req.soajs.buildResponse({"code": 405, "msg": config.errors[405]})); }
      var s = {
        '$set': {
          'description': req.soajs.inputmaskData.description,
          'ips': req.soajs.inputmaskData.ips
        }
      };
      mongo.update(colName, {"_id": req.soajs.inputmaskData.id}, s, {'upsert': false, 'safe': true}, function(err, data) {
        if(err) { return res.jsonp(req.soajs.buildResponse({"code": 401, "msg": config.errors[401]})); }
        return res.jsonp(req.soajs.buildResponse(null, "environment update successful"));
      });
    });
  },

  "list": function(config, mongo, req, res) {
    mongo.find(colName, function(err, records) {
      if(err) { return res.jsonp(req.soajs.buildResponse({"code": 402, "msg": config.errors[402]})); }
      return res.jsonp(req.soajs.buildResponse(null, records));
    });
  }
};