'use strict';
var colName = 'services';

module.exports = {

	"list": function (config, mongo, req, res) {
		var criteria = {};
		if ((req.soajs.inputmaskData.serviceNames) && (req.soajs.inputmaskData.serviceNames.length > 0)) {
			criteria = {'name': {$in: req.soajs.inputmaskData.serviceNames}};
		}

		mongo.find(colName, criteria, function (err, records) {
			if (err) {
				req.soajs.log.error(err);
				return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": err}));
			}
			return res.jsonp(req.soajs.buildResponse(null, records));
		});
	}
};