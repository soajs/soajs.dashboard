'use strict';

const fs = require('fs');
const _ = require('lodash');
const request = require('request');

const utils = require("../../utils/utils.js");

function checkIfError(req, mainCb, data, cb) {
	utils.checkErrorReturn(req.soajs, mainCb, data, cb);
}

var BL = {
	model: null,
	
	"get": function (config, req, res, versionModel, cb) {
		var opts = {};
		opts.conditions = {
			latest: { $exists: true }
		};
		versionModel.findEntry(req.soajs, BL.model, opts, function (error, record) {
			checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
				if (!record) {
					var requestOptions = {
						'uri': 'https://raw.githubusercontent.com/soajs/soajs.installer.versions/master/versions.json',
						'json': true
					};
					request.get(requestOptions, function (err, response, body) {
						checkIfError(req, cb, {config: config, error: error, code: 630}, function () {
							delete body.serviceLabels;
							opts = {
								record : body
							};
							versionModel.insertEntry(req.soajs, BL.model, opts, function (error) {
								checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
									return cb(null, body);
								});
							});
						});
					});
				} else {
					return cb(null, record);
				}
			});
		});
	},
	"check": function (config, req, res, versionModel, cb) {
		var opts = {};
		opts.conditions = {
			latest: { $exists: true }
		};
		versionModel.findEntry(req.soajs, BL.model, opts, function (error, record) {
			checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
				var requestOptions = {
					'uri': 'https://raw.githubusercontent.com/soajs/soajs.installer.versions/master/versions.json',
					'json': true
				};
				request.get(requestOptions, function (err, response, body) {
					checkIfError(req, cb, {config: config, error: error, code: 630}, function () {
						delete body.serviceLabels;
						opts = {
							record : body
						};
						if (!record) {
							versionModel.insertEntry(req.soajs, BL.model, opts, function (error) {
								checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
									return cb(null, {
										update: false
									});
								});
							});
						}
						else {
							return cb(null, {
								update: record.latest !== body.latest
							});
						}
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
