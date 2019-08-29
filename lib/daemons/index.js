'use strict';
var colName = "daemons";
var grpConfCol = "daemon_grpconf";

var async = require("async");
var fs = require('fs');

function validateId(soajs, cb) {
	BL.model.validateId(soajs, cb);
}

function checkReturnError(req, mainCb, data, cb) {
	if (data.error) {
		if (typeof (data.error) === 'object' && (data.error.message || data.error.msg)) {
			req.soajs.log.error(data.error);
		}
		return mainCb({ "code": data.code, "msg": data.config.errors[data.code] });
	} else {
		if (cb) {
			return cb();
		}
	}
}

var helpers = require("./helper.js");

var BL = {
	model: null,

	"list": function (config, req, res, cb) {
		var opts = {};
		opts.collection = colName;
		opts.conditions = ((req.soajs.inputmaskData.daemonNames) && (req.soajs.inputmaskData.daemonNames.length > 0)) ? { 'name': { $in: req.soajs.inputmaskData.daemonNames } } : {};
		opts.options = {
			sort: {
				name : 1
			}
		};
		BL.model.findEntries(req.soajs, opts, function (error, records) {
			var data = { config: config, error: error, code: 718 };
			checkReturnError(req, cb, data, function () {
				if (req.soajs.inputmaskData.getGroupConfigs) {
					async.map(records, function (daemonRecord, cb) {
						opts = {};
						opts.collection = grpConfCol;
						opts.conditions = { 'daemon': daemonRecord.name };
						opts.fields = { "daemonConfigGroup": 1, "_id": 0 };
						BL.model.findEntries(req.soajs, opts, function (error, grpConfs) {
							daemonRecord.grpConf = grpConfs;
							cb(error, daemonRecord);
						});
					}, function (error) {
						checkReturnError(req, cb, {
							config: config,
							error: error,
							code: 600
						}, function () {
							return cb(null, records);
						});
					});
				} else {
					return cb(null, records);
				}
			});
		});
	},

	"listGroupConfig": function (config, req, res, cb) {
		var opts = {};
		opts.collection = grpConfCol;
		opts.conditions = ((req.soajs.inputmaskData.grpConfNames) && (req.soajs.inputmaskData.grpConfNames.length > 0)) ? { 'name': { $in: req.soajs.inputmaskData.grpConfNames } } : {};
		BL.model.findEntries(req.soajs, opts, function (error, records) {
			var data = { config: config, error: error, code: 719 };
			checkReturnError(req, cb, data, function () {

				records.forEach(function (oneRecord) {
					if (oneRecord.cronConfig && oneRecord.extra) {
						oneRecord.cronConfig.cronTimeDate = oneRecord.cronConfig.cronTime;
						oneRecord.type = 'once';
						delete oneRecord.cronConfig.cronTime;
					}
				});
				return cb(null, records);
			});
		});
	},

	"addGroupConfig": function (config, req, res, cb) {
		var opts = {};
		if (req.soajs.inputmaskData.type === "cronJob"){
			if (!req.soajs.inputmaskData.cronTime){
				return cb({ "code": 173, "msg": "Invalid Daemon Time Configration." });
			}
		}
		else if (!req.soajs.inputmaskData.interval && (!req.soajs.inputmaskData.timeZone && (!req.soajs.inputmaskData.cronTime || !req.soajs.inputmaskData.cronTimeDate) )) {
			return cb({ "code": 173, "msg": "Invalid Daemon Time Configration." });
		}

		var criteria = {
			'daemonConfigGroup': req.soajs.inputmaskData.groupName,
			'daemon': req.soajs.inputmaskData.daemon,
			'status': req.soajs.inputmaskData.status,
			'jobs': req.soajs.inputmaskData.jobs,
			'solo': req.soajs.inputmaskData.solo
		};
		if (req.soajs.inputmaskData.type !== "cronJob"){
			criteria.order =  req.soajs.inputmaskData.order;
			criteria.processing =  req.soajs.inputmaskData.processing;
		}
		try {
			helpers.validateCronTime(req.soajs, criteria);
		}
		catch (e) {
			return cb({ "code": 173, "msg": e.message });
		}
		if (req.soajs.inputmaskData.type === "cronJob" && req.soajs.inputmaskData.concurrencyPolicy){
			if (!criteria.cronConfig){
				criteria.cronConfig = {};
			}
			criteria.cronConfig.concurrencyPolicy = req.soajs.inputmaskData.concurrencyPolicy;
		}
		opts.collection = grpConfCol;
		opts.conditions = {
			"daemonConfigGroup": req.soajs.inputmaskData.groupName,
			"daemon": req.soajs.inputmaskData.daemon
		};
		BL.model.countEntries(req.soajs, opts, function (error, count) {
			var data = { config: config, error: error, code: 717 };
			checkReturnError(req, cb, data, function () {
				if (count > 0) {
					return cb({ "code": 714, "msg": config.errors[714] });
				}
				opts = {};
				opts.collection = grpConfCol;
				opts.record = criteria;
				BL.model.insertEntry(req.soajs, opts, function (error, result) {
					data = { config: config, error: error || !result, code: 717 };
					checkReturnError(req, cb, data, function () {
						return cb(null, true);
					});
				});
			});
		});
	},

	"updateGroupConfig": function (config, req, res, cb) {
		if (req.soajs.inputmaskData.type === "cronJob"){
			if (!req.soajs.inputmaskData.cronTime){
				return cb({ "code": 173, "msg": "Invalid Daemon Time Configration." });
			}
		}
		else if (!req.soajs.inputmaskData.interval && (!req.soajs.inputmaskData.timeZone && (!req.soajs.inputmaskData.cronTime || !req.soajs.inputmaskData.cronTimeDate) )) {
			return cb({ "code": 173, "msg": "Invalid Daemon Time Configration." });
		}
		var document = {
			'daemonConfigGroup': req.soajs.inputmaskData.groupName,
			'daemon': req.soajs.inputmaskData.daemon,
			'status': req.soajs.inputmaskData.status,
			'jobs': req.soajs.inputmaskData.jobs,
			'solo': req.soajs.inputmaskData.solo
		};
		if (req.soajs.inputmaskData.type !== "cronJob"){
			document.order =  req.soajs.inputmaskData.order;
			document.processing =  req.soajs.inputmaskData.processing;
		}
		try {
			helpers.validateCronTime(req.soajs, document);
		}
		catch (e) {
			return cb({ "code": 173, "msg": e.message });
		}
		if (req.soajs.inputmaskData.type === "cronJob" && req.soajs.inputmaskData.concurrencyPolicy){
			if (!document.cronConfig){
				document.cronConfig = {};
			}
			document.cronConfig.concurrencyPolicy = req.soajs.inputmaskData.concurrencyPolicy;
		}
		var opts = {};
		validateId(req.soajs, function (error) {
			var data = { config: config, error: error, code: 701 };
			checkReturnError(req, cb, data, function () {
				var criteria = { '_id': req.soajs.inputmaskData.id };
				var update = {
					'$set': document
				};
				opts.collection = grpConfCol;
				opts.conditions = criteria;
				opts.fields = update;
				BL.model.updateEntry(req.soajs, opts, function (error, result) {
					data = { config: config, error: error || !result, code: 715 };
					checkReturnError(req, cb, data, function () {
						return cb(null, true);
					});
				});
			});
		});
	},

	"deleteGroupConfig": function (config, req, res, cloudBL, deployer, cb) {

		validateId(req.soajs, function (error) {
			checkReturnError(req, cb, { config: config, error: error, code: 701 }, function () {
				var opts = {};
				opts.collection = grpConfCol;
				opts.conditions = { '_id': req.soajs.inputmaskData.id };
				BL.model.findEntry(req.soajs, opts, function (error, record) {
					checkReturnError(req, cb, {config: config, error: error || !record, code: 716}, function () {

						if(process.env.SOAJS_DEPLOY_HA){
							helpers.checkIfGroupIsDeployed(config, record, req, BL, cloudBL, deployer, checkReturnError, cb, function(){
								//do remove
								doRemove();
							});
						}
						else {
							//do remove
							doRemove();
						}
					});
				});
			});
		});

		function doRemove(){
			var opts = {};
			opts.collection = grpConfCol;
			opts.conditions = { '_id': req.soajs.inputmaskData.id };
			BL.model.removeEntry(req.soajs, opts, function (error, result) {
				var data = { config: config, error: error || !result, code: 716 };
				checkReturnError(req, cb, data, function () {
					return cb(null, true);
				});
			});
		}
	},

	"updateServiceConfig": function (config, req, res, cb) {
		var opts = {};
		validateId(req.soajs, function (error) {
			var data = { config: config, error: error, code: 701 };
			checkReturnError(req, cb, data, function () {
				opts.collection = grpConfCol;
				opts.conditions = { _id: req.soajs.inputmaskData.id };
				BL.model.findEntry(req.soajs, opts, function (error, group) {
					data = { config: config, error: error || !group, code: 725 };
					checkReturnError(req, cb, data, function () {
						helpers.searchForJob(req.soajs.inputmaskData.jobName, group.jobs, function (error, job) {
							data = { config: config, error: error || !job, code: 724 };
							checkReturnError(req, cb, data, function () {
								group.jobs[job].serviceConfig[req.soajs.inputmaskData.env] = req.soajs.inputmaskData.config;
								if (Object.keys(group.jobs[job].serviceConfig[req.soajs.inputmaskData.env]).length === 0) {
									delete group.jobs[job].serviceConfig[req.soajs.inputmaskData.env];
								}
								opts = {};
								opts.collection = grpConfCol;
								opts.record = group;
								BL.model.saveEntry(req.soajs, opts, function (error) {
									data = { config: config, error: error, code: 720 };
									checkReturnError(req, cb, data, function () {
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

	"listServiceConfig": function (config, req, res, cb) {
		var opts = {};
		validateId(req.soajs, function (error) {
			var data = { config: config, error: error, code: 701 };
			checkReturnError(req, cb, data, function () {
				opts.collection = grpConfCol;
				opts.conditions = { _id: req.soajs.inputmaskData.id };
				BL.model.findEntry(req.soajs, opts, function (error, group) {
					data = { config: config, error: error || !group, code: 725 };
					checkReturnError(req, cb, data, function () {
						helpers.searchForJob(req.soajs.inputmaskData.jobName, group.jobs, function (error, job) {
							data = { config: config, error: error || !job, code: 724 };
							checkReturnError(req, cb, data, function () {
								return cb(null, group.jobs[job].serviceConfig);
							});
						});
					});
				})
			});
		});
	},

	"updateTenantExtKeys": function (config, req, res, cb) {
		var opts = {};
		validateId(req.soajs, function (error) {
			var data = { config: config, error: error, code: 701 };
			checkReturnError(req, cb, data, function () {
				opts.collection = grpConfCol;
				opts.conditions = { _id: req.soajs.inputmaskData.id };
				BL.model.findEntry(req.soajs, opts, function (error, group) {
					data = { config: config, error: error || !group, code: 725 };
					checkReturnError(req, cb, data, function () {
						helpers.searchForJob(req.soajs.inputmaskData.jobName, group.jobs, function (error, job) {
							data = { config: config, error: error || !job, code: 724 };
							checkReturnError(req, cb, data, function () {
								group.jobs[job].tenantExtKeys = req.soajs.inputmaskData.tenantExtKeys;
								group.jobs[job].tenantsInfo = req.soajs.inputmaskData.tenantsInfo;
								opts = {};
								opts.collection = grpConfCol;
								opts.record = group;
								BL.model.saveEntry(req.soajs, opts, function (error) {
									data = { config: config, error: error, code: 722 };
									checkReturnError(req, cb, data, function () {
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

	"listTenantExtKeys": function (config, req, res, cb) {
		var opts = {};
		validateId(req.soajs, function (error) {
			var data = { config: config, error: error, code: 701 };
			checkReturnError(req, cb, data, function () {
				opts.collection = grpConfCol;
				opts.conditions = { _id: req.soajs.inputmaskData.id };
				BL.model.findEntry(req.soajs, opts, function (error, group) {
					data = { config: config, error: error || !group, code: 725 };
					checkReturnError(req, cb, data, function () {
						helpers.searchForJob(req.soajs.inputmaskData.jobName, group.jobs, function (error, job) {
							data = { config: config, error: error || !job, code: 724 };
							checkReturnError(req, cb, data, function () {
								return cb(null, group.jobs[job].tenantsInfo);
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
