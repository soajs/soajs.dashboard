'use strict';

var colName = 'ci';
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


var BL = {

    model: null,

    getConfig: function (config, req, cb) {
        var opts = { collection: colName };
        BL.model.findEntries(req.soajs, opts, function (error, records) {
            checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
                var response = { settings: {}, list: [] };
                if (!records || records.length === 0) {
                    return cb(null, response);
                }

                response.settings = records[0]; //NOTE: only one CI config entry can be found in the db
                response.list = []; //TODO: integrate with CI drivers

                return cb(null, response);
            });
        });
    },

    saveConfig: function (config, req, cb) {
        var opts = {
            collection: colName,
            conditions: {},
            fields: req.soajs.inputmaskData.config,
            options: { upsert: true }
        };
        BL.model.updateEntry(req.soajs, opts, function (error) {
            checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
                return cb(null, true);
            });
        });
    },

    deleteConfig: function (config, req, cb) {
        var opts = { collection: colName, conditions: {} };
        BL.model.removeEntry(req.soajs, opts, function (error) {
            checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
                return cb(null, true);
            });
        });
    },

    downloadRecipe: function (config, req, cb) {

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
