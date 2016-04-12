'use strict';
var colName = 'services';

module.exports = {
	"list": function (config, mongo, req, res) {
		var criteria = ((req.soajs.inputmaskData.serviceNames) && (req.soajs.inputmaskData.serviceNames.length > 0)) ? {'name': {$in: req.soajs.inputmaskData.serviceNames}} : {};
		mongo.find(colName, criteria, function (error, records) {
			return (error && req.soajs.log.error(error)) ? res.jsonp(req.soajs.buildResponse({"code": 600, "msg": error})) : res.jsonp(req.soajs.buildResponse(null, records));
		});
	}
};