'use strict';

var utils = require('../../utils/utils.js');

var colName = 'catalogs';
var fs = require('fs');
var async = require('async');

function checkIfError(req, mainCb, data, cb) {
	utils.checkErrorReturn(req.soajs, mainCb, data, cb);
}

function validateId(soajs, cb) {
	BL.model.validateId(soajs, cb);
}

var BL = {
	model: null,

	"list": function (config, req, cb) {
		var opts = {};
		opts.collection = colName;
		if (Object.hasOwnProperty.call(req.soajs.inputmaskData, 'version') && req.soajs.inputmaskData.version) {
			opts.collection = colName + "_versioning";
		}

		BL.model.findEntries(req.soajs, opts, function (error, records) {
			checkIfError(req, cb, { config: config, error: error, code: 600 }, function () {
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

		if (req.soajs.inputmaskData.catalog.sourceCode) {
			if (req.soajs.inputmaskData.catalog.sourceCode.config && req.soajs.inputmaskData.catalog.sourceCode.config.label) {
				// only when configuration and its label exist consider
				if (req.soajs.inputmaskData.catalog.sourceCode.config.repository) {
					// if repository is selected, a beanch must be selected too
					if (!req.soajs.inputmaskData.catalog.sourceCode.config.branch) {

						return cb({ error: config.errors[791], code: 791 });
					}
				}
			}
			if (req.soajs.inputmaskData.catalog.sourceCode.custom && req.soajs.inputmaskData.catalog.sourceCode.custom.label) {

				// custom repos should only be available for resources of types: server,  daemon or
				// other
				var allowedTypes = ['server', 'daemon', 'other'];


				if( !allowedTypes.indexOf( req.soajs.inputmaskData.catalog.type) ){

					return cb({ error: config.errors[792], code: 792 });
				}
				// force a default type if not selected
				if (!req.soajs.inputmaskData.catalog.sourceCode.custom.type) {

					req.soajs.inputmaskData.catalog.sourceCode.custom.type="other";
				}


			}

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
			BL.model.insertEntry(req.soajs, opts, function (error, record) {
				checkIfError(req, cb, { config: config, error: error, code: 600 }, function () {
					return cb(null, record[0]._id);
				});
			});
		}
	},

	"edit": function (config, req, cb) {
		validateId(req.soajs, function (error) {
			checkIfError(req, cb, { config: config, error: error, code: 701 }, function () {
				var opts = {
					collection: colName,
					conditions: { _id: req.soajs.inputmaskData.id },
					versioning: true
				};

				BL.model.findEntry(req.soajs, opts, function (error, record) {
					checkIfError(req, cb, { config: config, error: error, code: 600 }, function () {
						checkIfError(req, cb, { config: config, error: !record, code: 950 }, function () {
							checkIfError(req, cb, { config: config, error: record.locked, code: 951 }, function () {
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
				checkIfError(req, cb, { config: config, error: error, code: 952 }, function () {
					return cb(null, true);
				});
			});
		}
	},

	"delete": function (config, req, cb) {

		validateId(req.soajs, function (error) {
			checkIfError(req, cb, { config: config, error: error, code: 701 }, function () {
				var opts = {
					collection: colName,
					conditions: { _id: req.soajs.inputmaskData.id }
				};

				if (Object.hasOwnProperty.call(req.soajs.inputmaskData, 'version')) {
					opts.collection = colName + "_versioning";
					opts.conditions = {
						refId: req.soajs.inputmaskData.id,
						v: req.soajs.inputmaskData.version
					};
				}

				BL.model.findEntry(req.soajs, opts, function (error, record) {
					checkIfError(req, cb, { config: config, error: error, code: 600 }, function () {
						checkIfError(req, cb, { config: config, error: !record, code: 950 }, function () {
							checkIfError(req, cb, { config: config, error: record.locked, code: 951 }, function () {
								BL.model.removeEntry(req.soajs, opts, function (error) {
									checkIfError(req, cb, { config: config, error: error, code: 953 }, function () {

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

	"get": function (config, req, cb) {
		validateId(req.soajs, function (error) {
			checkIfError(req, cb, { config: config, error: error, code: 701 }, function () {
				var opts = {
					collection: colName,
					conditions: { _id: req.soajs.inputmaskData.id }
				};

				if (Object.hasOwnProperty.call(req.soajs.inputmaskData, 'version')) {
					opts.collection = colName + "_versioning";
					opts.conditions = {
						refId: req.soajs.inputmaskData.id,
						v: req.soajs.inputmaskData.version
					};
				}

				BL.model.findEntry(req.soajs, opts, function (error, record) {
					checkIfError(req, cb, { config: config, error: error, code: 600 }, function () {
						checkIfError(req, cb, { config: config, error: !record, code: 950 }, function () {
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
	},

	"upgrade": function (config, req, cb) {
		async.series({
			"catalogs": (mCb) => {
				let opts = {};
				opts.collection = colName;
				BL.model.findEntries(req.soajs, opts, (error, records) => {
					checkIfError(req, mCb, { config: config, error: error, code: 600 }, () => {
						async.eachSeries(records, (oneRecord, callback) => {
							migrateOneRecord(opts, oneRecord, true, callback);
						}, mCb);
					});
				});
			},
			'delay': (mCb) => {
				setTimeout(()=> {
					mCb();
				}, 100);
			},
			"archives": (mCb) => {
				let opts = {};
				opts.collection = colName + "_versioning";
				BL.model.findEntries(req.soajs, opts, (error, records) => {
					checkIfError(req, mCb, { config: config, error: error, code: 600 }, () => {
						async.eachSeries(records, (oneRecord, callback) => {
							migrateOneRecord(opts, oneRecord, false, callback);
						}, mCb);
					});
				});

			}
		}, (error) => {
			checkIfError(req, cb, { config: config, error: error, code: 600 }, () => {
				return cb(null, true);
			});
		});

		function migrateOneRecord(opts, oneRecord, versioning, callback) {
			switch (oneRecord.type) {
				case 'soajs':
					switch (oneRecord.subtype) {
						case 'service':
							oneRecord.type = 'service';
							oneRecord.subtype = 'soajs';
							break;
						case 'daemon':
							oneRecord.type = 'daemon';
							oneRecord.subtype = 'soajs';
							break;
						case 'nodejs':
							oneRecord.type = 'service';
							oneRecord.subtype = 'nodejs';
							break;
						case 'java':
							oneRecord.type = 'service';
							oneRecord.subtype = 'java';
							break;
						default:
							oneRecord.type = 'service';
							oneRecord.subtype = 'other';
							break;
					}
					break;
				case 'service':
					if (!oneRecord.subtype) {
						oneRecord.subtype = 'other';
					}
					break;
				case 'nginx':
					oneRecord.type = 'server';
					oneRecord.subtype = 'nginx';
					break;
				case 'database':
				case 'mongo':
					oneRecord.type = 'cluster';
					oneRecord.subtype = 'mongo';
					break;
				case 'es':
					oneRecord.type = 'cluster';
					oneRecord.subtype = 'elasticsearch';
					break;
				case 'server':
				case 'cluster':
				case 'cdn':
				case 'system':
				case 'other':
					//do nothing
					break;
				default:
					oneRecord.type = 'other';
					break;
			}
			opts.record = oneRecord;
			opts.versioning = versioning;
			BL.model.saveEntry(req.soajs, opts, callback);
		}
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
