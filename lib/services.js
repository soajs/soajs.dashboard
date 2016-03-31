'use strict';
var colName = 'services';
var fs = require('fs');
var formidable = require('formidable');
var util = require('util');
var unzip = require('unzip2');
var ncp = require('ncp').ncp;
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');

function checkIfError(req, res, data, flag, cb) {
    if (data.error) {
        if (typeof (data.error) === 'object' && data.error.message) {
            req.soajs.log.error(data.error);
        }
        if (flag && flag["fs-unlink"] && data.fs && data.filePath) {
            data.fs.unlinkSync(data.filePath);
        }

        if (!flag || !flag["no-reply"]) {
            return res.jsonp(req.soajs.buildResponse({"code": data.code, "msg": data.config.errors[data.code]}));
        }
    } else {
        if (cb) return cb();
    }
}

module.exports = {

    "list": function (config, mongo, req, res) {
        var criteria = ((req.soajs.inputmaskData.serviceNames) && (req.soajs.inputmaskData.serviceNames.length > 0)) ? {'name': {$in: req.soajs.inputmaskData.serviceNames}} : {};
        mongo.find(colName, criteria, function (err, records) {
            checkIfError(req, res, {config: config, error: err, code: 600}, null, function () {
                return res.jsonp(req.soajs.buildResponse(null, records));
            });
        });
    }
};