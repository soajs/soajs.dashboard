'use strict';
var colName = 'services';
var envColName = 'environment';

var fs = require('fs');
var async = require('async');

var utils = require("../../utils/utils.js");

function checkIfError(req, mainCb, data, cb) {
	utils.checkErrorReturn(req.soajs, mainCb, data, cb);
}

var BL = {
	model: null,

	"list": function (config, req, res, serviceModel, cb) {
		var opts = {};
		opts.conditions = ((req.soajs.inputmaskData.serviceNames) && (req.soajs.inputmaskData.serviceNames.length > 0)) ? { 'name': { $in: req.soajs.inputmaskData.serviceNames } } : {};
		serviceModel.findEntries(req.soajs, BL.model, opts, function (error, records) {
			if (error) {
				req.soajs.log.error(error);
				return cb({ code: 600, msg: error });
			}

			if (!req.soajs.inputmaskData.includeEnvs) {
				return cb(null, { records: records });
			}
			
			opts.collection = envColName;
			opts.conditions = {};
			BL.model.findEntries(req.soajs, opts, function (error, envRecords) {
				if (error) {
					req.soajs.log.error(error);
					return cb({ code: 600, msg: error });
				}

				async.map(envRecords, function (oneEnv, callback) {
					return callback(null, oneEnv.code.toLowerCase());
				}, function (error, envCodes) {
					return cb(null, { records: records, envs: envCodes });
				});
			});
		});
	},

	"updateSettings": function (config, req, res, cb) {
		BL.model.validateId(req.soajs, function (error) {
			checkIfError(req, cb, { config: config, error: error, code: 701 }, function () {
				var opts = {};
				opts.collection = colName;
				opts.conditions = { _id: req.soajs.inputmaskData.id };
				opts.fields = {
					$set: {
						[`versions.${req.soajs.inputmaskData.version}.${req.soajs.inputmaskData.env.toLowerCase()}`]: req.soajs.inputmaskData.settings
					}
				};
				opts.options = { upsert: true };
				BL.model.updateEntry(req.soajs, opts, function (error) {
					checkIfError(req, cb, { config: config, error: error, code: 600 }, function () {
						return cb(null, true);
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
