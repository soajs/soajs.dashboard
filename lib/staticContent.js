'use strict';
var colName = 'staticContent';

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

    "list": function (config, mongo, req, res) {
        var criteria = ((req.soajs.inputmaskData.staticContentNames) && (req.soajs.inputmaskData.staticContentNames.length > 0)) ? {'name': {'$in': req.soajs.inputmaskData.staticContentNames}} : {};
        mongo.find(colName, criteria, function (error, records) {
            checkIfError(req, res, {config: config, error: error, code: 742}, function () {
                return res.jsonp(req.soajs.buildResponse(null, records));
            });
        });
    }
};