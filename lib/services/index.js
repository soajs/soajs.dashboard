'use strict';
var colName = 'services';
var favColName = 'favorite';
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
	},
	
	"getFavorites": function (config, req, res, cb) {
		//check if user is logged in
		checkIfError(req, cb, { config: config, error: !req.soajs.urac, code: 601 }, function () {
			let opts = {};
			opts.collection = favColName;
			if (req.soajs.urac.username !== req.soajs.inputmaskData.username){
				return cb(null, {});
			}
			opts.conditions = { type: req.soajs.inputmaskData.type, "userid": req.soajs.urac._id.toString() };
			BL.model.findEntry(req.soajs, opts, function (error, record) {
				checkIfError(req, cb, { config: config, error: error, code: 600 }, function () {
					return cb(null, record);
				});
			});
		});
	},
	
	"setFavorite": function (config, req, res, serviceModel, cb) {
		let opts = {};
		opts.conditions = {
			name: req.soajs.inputmaskData.service
		};
		serviceModel.findEntry(req.soajs, BL.model, opts, function (error, records) {
			checkIfError(req, cb, { config: config, error: error, code: 600 }, function () {
				//check if service
				checkIfError(req, cb, { config: config, error: !records, code: 604 }, function () {
					//check if user is logged in
					checkIfError(req, cb, { config: config, error: !req.soajs.urac || !req.soajs.urac._id, code: 601 }, function () {
						let opts = {};
						opts.collection = favColName;
						opts.conditions = { type: 'apiCatalog', "userid": req.soajs.urac._id.toString() };
						opts.fields = {
							$set: {
								"type": req.soajs.inputmaskData.type,
								"userid": req.soajs.urac._id.toString()
							},
							$addToSet :{
								"favorites": req.soajs.inputmaskData.service
							}
						};
						opts.options = { upsert: true };
						BL.model.updateEntry(req.soajs, opts, function (error) {
							checkIfError(req, cb, { config: config, error: error, code: 600 }, function () {
								return cb(null, req.soajs.inputmaskData.service + "is set as favorite!");
							});
						});
					});
					
				});
			});
		});
	},
	
	"deleteFavorite": function (config, req, res, serviceModel, cb) {
		
		let opts = {};
		opts.conditions = {
			name: req.soajs.inputmaskData.service
		};
		serviceModel.findEntry(req.soajs, BL.model, opts, function (error, records) {
			checkIfError(req, cb, { config: config, error: error, code: 600 }, function () {
				//check if service
				checkIfError(req, cb, { config: config, error: !records, code: 604 }, function () {
					//check if user is logged in
					checkIfError(req, cb, { config: config, error: !req.soajs.urac || !req.soajs.urac._id, code: 601 }, function () {
						let opts = {};
						opts.collection = favColName;
						opts.conditions = { type: req.soajs.inputmaskData.type, "userid": req.soajs.urac._id.toString() };
						opts.fields = {
							$pull :{
								"favorites": { $in: [ req.soajs.inputmaskData.service ] }
							}
						};
						opts.options = { upsert: false };
						BL.model.updateEntry(req.soajs, opts, function (error) {
							checkIfError(req, cb, { config: config, error: error, code: 600 }, function () {
								return cb(null, req.soajs.inputmaskData.service + "is removed from favorites!");
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
