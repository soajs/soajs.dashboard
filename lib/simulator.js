'use strict';
var BL = {
	model: null,
	"test": function (config, req, res) {
		console.log(JSON.stringify(config, null, 2));// 2del
		return res.jsonp(req.soajs.buildResponse(null, null));
	},
	"validate": function (data, schema, req, res) {
		var result = new req.soajs.validator.Validator();
		result.validate(data, schema);
		req.soajs.log.debug(result);
		return res.jsonp(req.soajs.buildResponse(null, result));
	}
};
/**
 * no need for a model or db connection for this api to work
 * @type {{init: module.exports.init}}
 */
module.exports = {
	"init": function (modelName , cb) {
		return cb(null, BL);
	}
};