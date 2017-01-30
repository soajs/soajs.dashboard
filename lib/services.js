'use strict';
var colName = 'services';
var fs = require('fs');

var BL = {
	model : null,

	"list": function (config, req, res) {
		var opts = {};
		opts.collection = colName;
		opts.conditions = ((req.soajs.inputmaskData.serviceNames) && (req.soajs.inputmaskData.serviceNames.length > 0)) ? {'name': {$in: req.soajs.inputmaskData.serviceNames}} : {};
		BL.model.findEntries(req.soajs, opts, function (error, records) {
			return (error && req.soajs.log.error(error)) ? res.jsonp(req.soajs.buildResponse({"code": 600, "msg": error})) : res.jsonp(req.soajs.buildResponse(null, records));
		});
	}
};

module.exports = {
	"init": function (modelName, cb) {
		var modelPath;

		if (!modelName) {
			return cb(new Error("No Model Requested!"));
		}
		modelPath = __dirname + "/../models/" + modelName + ".js";
		return requireModel(modelPath, cb);
		/**
		 * checks if model file exists, requires it and returns it.
		 * @param filePath
		 * @param cb
		 */
		function requireModel(filePath, cb) {
			//check if file exist. if not return error
			fs.exists(filePath, function (exists) {
				if (!exists) {
					return cb(new Error("Requested Model Not Found!"));
				}

				BL.model = require(filePath);
				return cb(null, BL);
			});
		}
	}
};