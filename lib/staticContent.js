'use strict';
var colName = 'staticContent';

module.exports = {
    "list": function (config, mongo, req, res) {
        var criteria = ((req.soajs.inputmaskData.staticContentNames) && (req.soajs.inputmaskData.staticContentNames.length > 0)) ? {'name': {'$in': req.soajs.inputmaskData.staticContentNames}} : {};
        mongo.find(colName, criteria, function (error, records) {
            return (error && req.soajs.log.error(error)) ? res.jsonp(req.soajs.buildResponse({"code": 742, "msg": config.errors[742]})) : res.jsonp(req.soajs.buildResponse(null, records));
        });
    }
};