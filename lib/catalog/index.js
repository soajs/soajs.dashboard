'use strict';

var colName = 'catalogs';
var fs = require('fs');

function checkIfError(req, res, data, cb) {
    if (data.error) {
        if (typeof (data.error) === 'object' && (data.error.message || data.error.msg)) {
            req.soajs.log.error(data.error);
        }

        return res.jsonp(req.soajs.buildResponse({"code": data.code, "msg": data.config.errors[data.code]}));
    } else {
        if (cb) return cb();
    }
}

function validateId(soajs, cb) {
    BL.model.validateId(soajs, cb);
}

var BL = {
	model : null,

	"list": function (config, req, res) {
        var opts = {};
        opts.collection = colName;
        BL.model.findEntries(req.soajs, opts, function (error, records) {
            checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                return res.jsonp(req.soajs.buildResponse(null, records));
            });
        });
	},

    "add": function (config, req, res) {
        //NOTE: version 1 does not manually validate recipe. Validation takes place at the IMFV level
        var opts = {};
        opts.collection = colName;
        opts.record = req.soajs.inputmaskData.catalog;
        BL.model.insertEntry(req.soajs, opts, function (error) {
            checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                return res.jsonp(req.soajs.buildResponse(null, true));
            });
        });
    },

    "edit": function (config, req, res) {
        validateId(req.soajs, function (error) {
            checkIfError(req, res, {config: config, error: error, code: 701}, function () {
                var opts = {};
                opts.collection = colName;
                opts.conditions = { _id: req.soajs.inputmaskData.id };
                BL.model.findEntry(req.soajs, opts, function (error, record) {
                    checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                        checkIfError(req, res, {config: config, error: !record, code: 1000}, function () {
                            checkIfError(req, res, {config: config, error: record.locked, code: 1001}, function () {
                                opts.fields = { $set: req.soajs.inputmaskData.catalog };
                                BL.model.updateEntry(req.soajs, opts, function (error) {
                                    checkIfError(req, res, {config: config, error: error, code: 1002}, function () {
                                        return res.jsonp(req.soajs.buildResponse(null, true));
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    },

    "delete": function (config, req, res) {
        validateId(req.soajs, function (error) {
            checkIfError(req, res, {config: config, error: error, code: 701}, function () {
                var opts = {};
                opts.collection = colName;
                opts.conditions = { _id: req.soajs.inputmaskData.id };
                BL.model.findEntry(req.soajs, opts, function (error, record) {
                    checkIfError(req, res, {config: config, error: error, code: 600}, function () {
                        checkIfError(req, res, {config: config, error: !record, code: 1000}, function () {
                            checkIfError(req, res, {config: config, error: record.locked, code: 1001}, function () {
                                BL.model.removeEntry(req.soajs, opts, function (error) {
                                    checkIfError(req, res, {config: config, error: error, code: 1003}, function () {
                                        return res.jsonp(req.soajs.buildResponse(null, true));
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    }

};

module.exports = {
	"init": function (modelName, cb) {
		var modelPath;

		if (!modelName) {
			return cb(new Error("No Model Requested!"));
		}
		modelPath = __dirname + "/../../models/" + modelName + ".js";
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
