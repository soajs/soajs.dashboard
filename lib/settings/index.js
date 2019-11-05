'use strict';

const fs = require('fs');
const async = require('async');
const request = require('request');

const utils = require("../../utils/utils.js");

function checkIfError(req, mainCb, data, cb) {
	utils.checkErrorReturn(req.soajs, mainCb, data, cb);
}

const BL = {
	model: null,
	
	"get": function (config, req, res, versionModel, cb) {
		let opts = {};
		//link to config
		opts.conditions = {
			type: "release"
		};
		versionModel.findEntry(req.soajs, BL.model, opts, function (error, record) {
			checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
				if (!record) {
					var requestOptions = {
						'uri': config.console.version,
						'json': true
					};
					request.get(requestOptions, function (err, response, body) {
						checkIfError(req, cb, {config: config, error: error, code: 630}, function () {
							async.each(body.releases, (oneRelease, callback) => {
								if (oneRelease.repositories){
									async.each(oneRelease.repositories, (repository, call) => {
										if (repository && repository.repo && body.serviceLabels){
											repository.label = body.serviceLabels[repository.repo].label;
											repository.service = body.serviceLabels[repository.repo].service;
										}
										return call();
									}, callback);
								}
								
							}, () => {
								delete body.serviceLabels;
								body.type = "release";
								opts = {
									fields: {
										'$set': body
									},
									conditions: {
										type: "release"
									},
									options: {
										upsert: true
									}
								};
								versionModel.updateEntry(req.soajs, BL.model, opts, function (error) {
									checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
										return cb(null, body);
									});
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
		let opts = {};
		opts.conditions = {
			type: "release"
		};
		versionModel.findEntry(req.soajs, BL.model, opts, function (error, record) {
			checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
				var requestOptions = {
					'uri': config.console.version,
					'json': true
				};
				request.get(requestOptions, function (err, response, body) {
					checkIfError(req, cb, {config: config, error: error, code: 630}, function () {
						async.each(body.releases, (oneRelease, callback) => {
							if (oneRelease.repositories){
								async.each(oneRelease.repositories, (repository, call) => {
									if (repository && repository.repo && body.serviceLabels){
										repository.label = body.serviceLabels[repository.repo].label;
										repository.service = body.serviceLabels[repository.repo].service;
									}
									return call();
								}, callback);
							}
							
						}, () => {
							delete body.serviceLabels;
							body.type = "release";
							opts = {
								fields: {
									'$set': body
								},
								conditions: {
									type: "release"
								},
								options: {
									upsert: true
								}
							};
							if (!record) {
								//change and update and upsert true
								versionModel.updateEntry(req.soajs, BL.model, opts, function (error) {
									checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
										return cb(null, {
											update: false
										});
									});
								});
							} else {
								return cb(null, {
									update: record.latest !== body.latest
								});
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
