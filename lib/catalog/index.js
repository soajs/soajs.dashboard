'use strict';

var utils = require('../../utils/utils.js');

var colName = 'catalogs';
var fs = require('fs');
var async = require('async');

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
        if(Object.hasOwnProperty.call(req.soajs.inputmaskData, 'version') && req.soajs.inputmaskData.version){
        	opts.collection = colName + "_versioning";
        }
        BL.model.findEntries(req.soajs, opts, function (error, records) {
            checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
                async.map(records, function (oneRecord, callback) {
                    if (oneRecord.recipe.deployOptions && oneRecord.recipe.deployOptions.labels) {
                        utils.normalizeKeyValues(oneRecord.recipe.deployOptions.labels, config.tokens.dotToken, config.tokens.dotValue, function (error, updatedRecord) {
                            oneRecord.recipe.deployOptions.labels = updatedRecord;
                            return callback(null, oneRecord);
                        });
                    }
                    else {
                        return callback(null, oneRecord);
                    }
                }, cb);
            });
        });
	},

    "add": function (config, req, cb) {
        if (req.soajs.inputmaskData.catalog.locked) {
            // do not allow user to lock a record
            delete req.soajs.inputmaskData.catalog.locked;
        }

        if (req.soajs.inputmaskData.catalog.recipe &&
            req.soajs.inputmaskData.catalog.recipe.deployOptions &&
            req.soajs.inputmaskData.catalog.recipe.deployOptions.labels) {

            var recipeLabels = req.soajs.inputmaskData.catalog.recipe.deployOptions.labels;
            utils.normalizeKeyValues(recipeLabels, config.tokens.dotRegexString, config.tokens.dotToken, function (error, updatedRecord) {
                req.soajs.inputmaskData.catalog.recipe.deployOptions.labels = updatedRecord;
                return save();
            });
        }
        else {
            return save();
        }

        function save() {
            var opts = {
            	collection: colName,
    	        versioning: true,
    	        record: req.soajs.inputmaskData.catalog
            };
            BL.model.insertEntry(req.soajs, opts, function (error) {
                checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
                    return cb(null, true);
                });
            });
        }
    },

    "edit": function (config, req, cb) {
        validateId(req.soajs, function (error) {
            checkIfError(req, cb, {config: config, error: error, code: 701}, function () {
                var opts = {
                	collection: colName,
	                conditions: { _id: req.soajs.inputmaskData.id },
	                versioning: true
                };

                BL.model.findEntry(req.soajs, opts, function (error, record) {
                    checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
                        checkIfError(req, cb, {config: config, error: !record, code: 950}, function () {
                            checkIfError(req, cb, {config: config, error: record.locked, code: 951}, function () {
                                if (req.soajs.inputmaskData.catalog.locked) {
                                    // do not allow user to lock a record
                                    delete req.soajs.inputmaskData.catalog.locked;
                                }

                                if (req.soajs.inputmaskData.catalog.recipe &&
                                    req.soajs.inputmaskData.catalog.recipe.deployOptions &&
                                    req.soajs.inputmaskData.catalog.recipe.deployOptions.labels) {

                                    var recipeLabels = req.soajs.inputmaskData.catalog.recipe.deployOptions.labels;
                                    utils.normalizeKeyValues(recipeLabels, config.tokens.dotRegexString, config.tokens.dotToken, function (error, updatedRecord) {
                                        req.soajs.inputmaskData.catalog.recipe.deployOptions.labels = updatedRecord;
                                        return save(opts);
                                    });
                                }
                                else {
                                    return save(opts);
                                }
                            });
                        });
                    });
                });
            });
        });

        function save(opts) {
            opts.fields = { $set: req.soajs.inputmaskData.catalog };
            BL.model.updateEntry(req.soajs, opts, function (error) {
                checkIfError(req, cb, {config: config, error: error, code: 952}, function () {
                    return cb(null, true);
                });
            });
        }
    },

    "delete": function (config, req, cb) {
        validateId(req.soajs, function (error) {
            checkIfError(req, cb, {config: config, error: error, code: 701}, function () {
                var opts = {
                	collection: colName,
	                conditions : { _id: req.soajs.inputmaskData.id }
                };

	            if(Object.hasOwnProperty.call(req.soajs.inputmaskData, 'version')){
		            opts.collection = colName + "_versioning";
		            opts.conditions = {
			            refId: req.soajs.inputmaskData.id,
			            v: req.soajs.inputmaskData.version
		            };
	            }

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
				var opts = {
					collection: colName,
					conditions: { _id: req.soajs.inputmaskData.id }
				};

				if(Object.hasOwnProperty.call(req.soajs.inputmaskData, 'version')){
					opts.collection = colName + "_versioning";
					opts.conditions = {
						refId: req.soajs.inputmaskData.id,
						v: req.soajs.inputmaskData.version
					};
				}

				BL.model.findEntry(req.soajs, opts, function (error, record) {
					checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
						checkIfError(req, cb, {config: config, error: !record, code: 950}, function () {
                            if (record.recipe.deployOptions && record.recipe.deployOptions.labels) {
                                utils.normalizeKeyValues(record.recipe.deployOptions.labels, config.tokens.dotToken, config.tokens.dotValue, function (error, updatedRecord) {
                                    record.recipe.deployOptions.labels = updatedRecord;
                                    return cb(null, record);
                                });
                            }
                            else {
                                return cb(null, record);
                            }
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
