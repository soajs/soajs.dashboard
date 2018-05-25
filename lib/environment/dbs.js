"use strict";

var colName = "environment";

const config = require("../../config.js");

function checkReturnError(req, mainCb, data, cb) {
	if (data.error) {
		if (typeof (data.error) === 'object') {
			req.soajs.log.error(data.error);
		}
		if (!data.config){
			data.config = config;
		}
		let message = data.config.errors[data.code];
		if(!message && data.error.message){
			message = data.error.message;
		}
		return mainCb({ "code": data.code, "msg": message });
	} else {
		if (cb) {
			return cb();
		}
	}
}

const databaseModule = {
	
	"listDbs": function (config, req, res, BL, cbMain) {
		var opts = {};
		opts.collection = colName;
		opts.conditions = { 'code': req.soajs.inputmaskData.env.toUpperCase() };
		BL.model.findEntry(req.soajs, opts, function (err, envRecord) {
			checkReturnError(req, cbMain, {
				config: config,
				error: err || !envRecord,
				code: 402
			}, function () {
				return cbMain(null, envRecord.dbs);
			});
		});
	},
	
	"addDb": function (config, req, res, BL, cbMain) {
		if (req.soajs.inputmaskData.name === 'session') {
			if (!req.soajs.inputmaskData.sessionInfo || JSON.stringify(req.soajs.inputmaskData.sessionInfo) === '{}') {
				return cbMain({ "code": 507, "msg": config.errors[507] });
			}
		}
		var opts = {};
		opts.collection = colName;
		opts.conditions = { 'code': req.soajs.inputmaskData.env.toUpperCase() };
		
		//check in old schema
		BL.model.findEntry(req.soajs, opts, function (err, envRecord) {
			checkReturnError(req, cbMain, {
				config: config,
				error: err || !envRecord,
				code: 402
			}, function () {
				//check in resources
				BL.model.findEntry(req.soajs, {
					collection: 'resources',
					conditions: {
						'name': req.soajs.inputmaskData.cluster,
						'$or': [
							{
								created: req.soajs.inputmaskData.env.toUpperCase()
							},
							{
								created: { $ne: req.soajs.inputmaskData.env.toUpperCase() },
								shared: { $eq: true },
								sharedEnv: { $exists: false }
							},
							{
								created: { $ne: req.soajs.inputmaskData.env.toUpperCase() },
								shared: { $eq: true },
								sharedEnv: { $exists: true },
								['sharedEnv.' + req.soajs.inputmaskData.env.toUpperCase()]: { $exists: true, $eq: true }
							}
						]
					}
				}, function (error, resource) {
					checkReturnError(req, cbMain, {
						config: config,
						error: error || !resource,
						code: 502
					}, function () {
						//check if this is the session
						if (req.soajs.inputmaskData.name === 'session') {
							checkReturnError(req, cbMain, {
								config: config,
								error: envRecord.dbs.session && JSON.stringify(envRecord.dbs.session) !== '{}',
								code: 510
							}, function () {
								envRecord.dbs.session = {
									'prefix': req.soajs.inputmaskData.prefix,
									'cluster': req.soajs.inputmaskData.cluster,
									'name': req.soajs.inputmaskData.sessionInfo.dbName,
									'store': req.soajs.inputmaskData.sessionInfo.store,
									'collection': req.soajs.inputmaskData.sessionInfo.collection,
									'stringify': req.soajs.inputmaskData.sessionInfo.stringify,
									'expireAfter': req.soajs.inputmaskData.sessionInfo.expireAfter
								};
								opts = {};
								opts.collection = colName;
								opts.record = envRecord;
								BL.model.saveEntry(req.soajs, opts, function (err) {
									checkReturnError(req, cbMain, {
										config: config,
										error: err,
										code: 503
									}, function () {
										return cbMain(null, "environment database added successful");
									});
								});
							});
						}
						else {
							checkReturnError(req, cbMain, {
								config: config,
								error: envRecord.dbs.databases[req.soajs.inputmaskData.name],
								code: 509
							}, function () {
								//otherwise
								envRecord.dbs.databases[req.soajs.inputmaskData.name] = {
									'prefix': req.soajs.inputmaskData.prefix,
									'cluster': req.soajs.inputmaskData.cluster,
									'tenantSpecific': req.soajs.inputmaskData.tenantSpecific || false
								};
								opts = {};
								opts.collection = colName;
								opts.record = envRecord;
								BL.model.saveEntry(req.soajs, opts, function (err) {
									checkReturnError(req, cbMain, {
										config: config,
										error: err,
										code: 503
									}, function () {
										return cbMain(null, "environment database added successful");
									});
								});
							});
						}
					});
				});
			});
		});
	},
	
	"updateDb": function (config, req, res, BL, cbMain) {
		if (req.soajs.inputmaskData.name === 'session') {
			if (!req.soajs.inputmaskData.sessionInfo || JSON.stringify(req.soajs.inputmaskData.sessionInfo) === '{}') {
				return cbMain({ "code": 507, "msg": config.errors[507] });
			}
		}
		var opts = {};
		opts.collection = colName;
		opts.conditions = { 'code': req.soajs.inputmaskData.env.toUpperCase() };
		BL.model.findEntry(req.soajs, opts, function (err, envRecord) {
			checkReturnError(req, cbMain, {
				config: config,
				error: err || !envRecord,
				code: 402
			}, function () {
				BL.model.findEntry(req.soajs, {
					collection: 'resources',
					conditions: {
						'name': req.soajs.inputmaskData.cluster,
						'$or': [
							{
								created: req.soajs.inputmaskData.env.toUpperCase()
							},
							{
								created: { $ne: req.soajs.inputmaskData.env.toUpperCase() },
								shared: { $eq: true },
								sharedEnv: { $exists: false }
							},
							{
								created: { $ne: req.soajs.inputmaskData.env.toUpperCase() },
								shared: { $eq: true },
								sharedEnv: { $exists: true },
								['sharedEnv.' + req.soajs.inputmaskData.env.toUpperCase()]: { $exists: true, $eq: true }
							}
						]
					}
				}, function (error, resource) {
					checkReturnError(req, cbMain, {
						config: config,
						error: error || !resource,
						code: 502
					}, function () {
						//check if this is the session
						if (req.soajs.inputmaskData.name === 'session') {
							checkReturnError(req, cbMain, {
								config: config,
								error: (!envRecord.dbs.session && !envRecord.dbs.config.session),
								code: 511
							}, function () {
								//remove old
								delete envRecord.dbs.config.session;
								
								//add new
								envRecord.dbs.session = {
									'cluster': req.soajs.inputmaskData.cluster,
									'name': req.soajs.inputmaskData.sessionInfo.dbName,
									'store': req.soajs.inputmaskData.sessionInfo.store,
									'collection': req.soajs.inputmaskData.sessionInfo.collection,
									'stringify': req.soajs.inputmaskData.sessionInfo.stringify,
									'expireAfter': req.soajs.inputmaskData.sessionInfo.expireAfter
								};
								
								if (req.soajs.inputmaskData.prefix && req.soajs.inputmaskData.prefix !== '') {
									envRecord.dbs.session['prefix'] = req.soajs.inputmaskData.prefix;
								}
								
								opts = {};
								opts.collection = colName;
								opts.record = envRecord;
								BL.model.saveEntry(req.soajs, opts, function (err) {
									checkReturnError(req, cbMain, {
										config: config,
										error: err,
										code: 513
									}, function () {
										return cbMain(null, "environment database updated successful");
									});
								});
							});
						}
						else {
							checkReturnError(req, cbMain, {
								config: config,
								error: !envRecord.dbs.databases[req.soajs.inputmaskData.name],
								code: 512
							}, function () {
								//otherwise
								envRecord.dbs.databases[req.soajs.inputmaskData.name] = {
									'cluster': req.soajs.inputmaskData.cluster,
									'tenantSpecific': req.soajs.inputmaskData.tenantSpecific || false
								};
								
								if (req.soajs.inputmaskData.prefix && req.soajs.inputmaskData.prefix !== '') {
									envRecord.dbs.databases[req.soajs.inputmaskData.name]['prefix'] = req.soajs.inputmaskData.prefix;
								}
								
								opts = {};
								opts.collection = colName;
								opts.record = envRecord;
								BL.model.saveEntry(req.soajs, opts, function (err) {
									checkReturnError(req, cbMain, {
										config: config,
										error: err,
										code: 513
									}, function () {
										return cbMain(null, "environment database updated successful");
									});
								});
							});
						}
					});
				});
			});
		});
	},
	
	"deleteDb": function (config, req, res, BL, cbMain) {
		var opts = {};
		opts.collection = colName;
		opts.conditions = { 'code': req.soajs.inputmaskData.env.toUpperCase() };
		BL.model.findEntry(req.soajs, opts, function (err, envRecord) {
			checkReturnError(req, cbMain, {
				config: config,
				error: err || !envRecord,
				code: 402
			}, function () {
				if (req.soajs.inputmaskData.name === 'session') {
					checkReturnError(req, cbMain, {
						config: config,
						error: (!envRecord.dbs.session && !envRecord.dbs.config.session),
						code: 511
					}, function () {
						delete envRecord.dbs.config.session;
						delete envRecord.dbs.session;
						opts = {};
						opts.collection = colName;
						opts.record = envRecord;
						BL.model.saveEntry(req.soajs, opts, function (err) {
							checkReturnError(req, cbMain, {
								config: config,
								error: err,
								code: 514
							}, function () {
								return cbMain(null, "environment database removed successful");
							});
						});
					});
				}
				else {
					checkReturnError(req, cbMain, {
						config: config,
						error: !envRecord.dbs.databases[req.soajs.inputmaskData.name],
						code: 512
					}, function () {
						delete envRecord.dbs.databases[req.soajs.inputmaskData.name];
						opts = {};
						opts.collection = colName;
						opts.record = envRecord;
						BL.model.saveEntry(req.soajs, opts, function (err) {
							checkReturnError(req, cbMain, {
								
								config: config,
								error: err,
								code: 514
							}, function () {
								return cbMain(null, "environment database removed successful");
							});
						});
					});
				}
			});
		});
	},
	
	"updateDbsPrefix": function (config, req, res, BL, cbMain) {
		var prefix = { "dbs.config.prefix": req.soajs.inputmaskData.prefix };
		var opts = {};
		opts.collection = colName;
		opts.conditions = { 'code': req.soajs.inputmaskData.env.toUpperCase() };
		opts.fields = { "$set": prefix };
		opts.options = { 'upsert': false, 'safe': true };
		BL.model.updateEntry(req.soajs, opts, function (err) {
			checkReturnError(req, cbMain, { config: config, error: err, code: 402 }, function () {
				return cbMain(null, "environment Database prefix update successful");
			});
		});
	}
};

module.exports = databaseModule;