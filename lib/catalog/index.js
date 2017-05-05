'use strict';

var colName = 'catalogs';
var fs = require('fs');

function checkIfError(req, mainCb, data, cb) {
    if (data.error) {
        if (typeof (data.error) === 'object' && (data.error.message || data.error.msg)) {
            req.soajs.log.error(data.error);
        }

        return mainCb({"code": data.code, "msg": data.config.errors[data.code]});
    } else {
        if (cb) return cb();
    }
}

function validateId(soajs, cb) {
    BL.model.validateId(soajs, cb);
}

var BL = {
	model : null,

	"list": function (config, req, cb) {
        var opts = {};
        opts.collection = colName;
        BL.model.findEntries(req.soajs, opts, function (error, records) {
            checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
                return cb(null, records);
            });
        });
	},

    "add": function (config, req, cb) {
	    //NOTE: version 1 does not manually validate recipe. Validation takes place at the IMFV level
        if (req.soajs.inputmaskData.catalog.locked) {
            // do not allow user to lock a record
            delete req.soajs.inputmaskData.catalog.locked;
        }

        var opts = {};
        opts.collection = colName;
        opts.record = req.soajs.inputmaskData.catalog;
        BL.model.insertEntry(req.soajs, opts, function (error) {
            checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
                return cb(null, true);
            });
        });
    },

    "edit": function (config, req, cb) {
        validateId(req.soajs, function (error) {
            checkIfError(req, cb, {config: config, error: error, code: 701}, function () {
                var opts = {};
                opts.collection = colName;
                opts.conditions = { _id: req.soajs.inputmaskData.id };
                BL.model.findEntry(req.soajs, opts, function (error, record) {
                    checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
                        checkIfError(req, cb, {config: config, error: !record, code: 950}, function () {
                            checkIfError(req, cb, {config: config, error: record.locked, code: 951}, function () {
                                if (req.soajs.inputmaskData.catalog.locked) {
                                    // do not allow user to lock a record
                                    delete req.soajs.inputmaskData.catalog.locked;
                                }
                                
                                opts.fields = { $set: req.soajs.inputmaskData.catalog };
                                BL.model.updateEntry(req.soajs, opts, function (error) {
                                    checkIfError(req, cb, {config: config, error: error, code: 952}, function () {
                                        return cb(null, true);
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    },

    "delete": function (config, req, cb) {
        validateId(req.soajs, function (error) {
            checkIfError(req, cb, {config: config, error: error, code: 701}, function () {
                var opts = {};
                opts.collection = colName;
                opts.conditions = { _id: req.soajs.inputmaskData.id };
                BL.model.findEntry(req.soajs, opts, function (error, record) {
                    checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
                        checkIfError(req, cb, {config: config, error: !record, code: 950}, function () {
                            checkIfError(req, cb, {config: config, error: record.locked, code: 951}, function () {
                                BL.model.removeEntry(req.soajs, opts, function (error) {
                                    checkIfError(req, cb, {config: config, error: error, code: 953}, function () {
                                        return cb(null, true);
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    },
	
	"get": function(config, req, cb){
		validateId(req.soajs, function (error) {
			checkIfError(req, cb, {config: config, error: error, code: 701}, function () {
				var opts = {};
				opts.collection = colName;
				opts.conditions = { _id: req.soajs.inputmaskData.id };
				BL.model.findEntry(req.soajs, opts, function (error, record) {
					checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
						checkIfError(req, cb, {config: config, error: !record, code: 950}, function () {
							return cb(null, record);
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
