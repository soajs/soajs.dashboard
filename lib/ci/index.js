'use strict';

var fs = require('fs');
var path = require('path');
var EasyZip = require('easy-zip').EasyZip;

var colName = 'ci';

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

    /**
     * Function that gets CI config and list of repository available via CI drivers
     * @param  {Object}             config
     * @param  {Request Object}     req
     * @param  {Function}           cb
     *
     */
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

    /**
     * Function that saves CI config
     * @param  {Object}             config
     * @param  {Request Object}     req
     * @param  {Function}           cb
     *
     */
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

    /**
     * Function that deletes CI config from data store
     * @param  {Object}             config
     * @param  {Request Object}     req
     * @param  {Function}           cb
     *
     */
    deleteConfig: function (config, req, cb) {
        var opts = { collection: colName, conditions: {} };
        BL.model.removeEntry(req.soajs, opts, function (error) {
            checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
                return cb(null, true);
            });
        });
    },

    /**
     * Function that streams CI recipe
     * @param  {Object}             config
     * @param  {Request Object}     req
     * @param  {Function}           cb
     *
     */
    downloadRecipe: function (config, req, res, cb) {
        var opts = { collection: colName };
        BL.model.findEntries(req.soajs, opts, function (error, records) {
            checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
                checkIfError(req, cb, {config: config, error: !records || records.length === 0, code: 955}, function () {
                    var driver = records[0].driver, recipe = records[0].recipe;
                    var ciTmpl = path.join(config.templates.path, 'ci/');

                    var zipPath = path.join(ciTmpl, 'ci.zip');
                    var recipePath = path.join(ciTmpl, driver + '.yaml');
                    var scriptPath = path.join(ciTmpl, 'cd.sh');

                    fs.writeFile(recipePath, recipe, function (error) {
                        checkIfError(req, cb, {config: config, error: error, code: 956}, function () {
                            var zip = new EasyZip();
                            var files = [
                                { source: scriptPath, target: 'cd.sh' },
                                { source: recipePath, target: driver + '.yaml' }
                            ];
                            zip.batchAdd(files, function () {
                                zip.writeToFile(zipPath);
                                var zipStat = fs.statSync(zipPath);
                                var readStrem = fs.createReadStream(zipPath);
                                res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Length': zipStat.size });
                                readStrem.pipe(res);
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
