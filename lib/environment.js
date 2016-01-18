'use strict';
var colName = "environment";
var tenantColName = "tenants";

function validateId(mongo, req, cb) {
	try {
		req.soajs.inputmaskData.id = mongo.ObjectId(req.soajs.inputmaskData.id);
		return cb(null);
	} catch(e) {
		return cb(e);
	}
}

function checkIfError(req, res, data, cb) {
	if (data.error) {
		if (typeof (data.error) === 'object' && data.error.message) {
			req.soajs.log.error(data.error);
		}

		return res.jsonp(req.soajs.buildResponse({"code": data.code, "msg": data.config.errors[data.code]}));
	} else {
		if (cb) return cb();
	}
}

module.exports = {
	"add": function(config, mongo, req, res) {
		switch(req.soajs.inputmaskData.services.config.session.proxy) {
			case "true":
				req.soajs.inputmaskData.services.config.session.proxy = true;
				break;
			case "false":
				req.soajs.inputmaskData.services.config.session.proxy = false;
				break;
			case "undefined":
				delete req.soajs.inputmaskData.services.config.session.proxy;
				break;
		}

		var type = req.soajs.inputmaskData.deployer.type;
		if(type !== 'manual'){
			var driver = req.soajs.inputmaskData.deployer[type].selected.split(".");
			checkIfError(req, res, {
				config: config,
				error: !req.soajs.inputmaskData.deployer[type][driver[0]][driver[1]] || JSON.stringify(req.soajs.inputmaskData.deployer[type][driver[0]][driver[1]]) === '{}',
				code: 407
			});
		}

		req.soajs.inputmaskData.code = req.soajs.inputmaskData.code.toUpperCase();
		var record = {
			"code": req.soajs.inputmaskData.code,
			"domain": req.soajs.inputmaskData.domain,
			"profile": config.workDir + "soajs/FILES/profiles/" + req.soajs.inputmaskData.profile + ".js",
			"deployer": req.soajs.inputmaskData.deployer,
			"description": req.soajs.inputmaskData.description,
			"services": req.soajs.inputmaskData.services,
			"port": req.soajs.inputmaskData.port,
			"dbs": {
				"clusters": {},
				"config": {},
				"databases": {}
			}
		};


		mongo.count(colName, {'code': record.code}, function(error, count) {
			checkIfError(req, res, {config: config, error: error, code: 400}, function () {
				checkIfError(req, res, {config: config, error: count > 0, code: 403}, function () {
					mongo.insert(colName, record, function(err, data) {
						checkIfError(req, res, {config: config, error: err, code: 400}, function () {
							return res.jsonp(req.soajs.buildResponse(null, data));
						});
					});
				});
			});
		});
	},

	"delete": function(config, mongo, req, res) {
		validateId(mongo, req, function(err) {
			checkIfError(req, res, {config: config, error: err, code: 405}, function () {
				var criteria1 = {
					'_id': req.soajs.inputmaskData.id, 'locked': true
				};
				mongo.findOne(colName, criteria1, function(error, record) {
					checkIfError(req, res, {config: config, error: error, code: 404}, function () {
						checkIfError(req, res, {config: config, error: record, code: 500}, function () { // return error msg that this record is locked
							var criteria = {
								'_id': req.soajs.inputmaskData.id, 'locked': {$ne: true}
							};
							mongo.remove(colName, criteria, function(error) {
								checkIfError(req, res, {config: config, error: error, code: 404}, function () {
									return res.jsonp(req.soajs.buildResponse(null, "environment delete successful"));
								});
							});
						});
					});
				});
			});
		});
	},

	"update": function(config, mongo, req, res) {
		validateId(mongo, req, function(err) {
			checkIfError(req, res, {config: config, error: err, code: 405}, function () {
				switch(req.soajs.inputmaskData.services.config.session.proxy) {
					case "true":
						req.soajs.inputmaskData.services.config.session.proxy = true;
						break;
					case "false":
						req.soajs.inputmaskData.services.config.session.proxy = false;
						break;
					case "undefined":
						delete req.soajs.inputmaskData.services.config.session.proxy;
						break;
				}

				var type = req.soajs.inputmaskData.deployer.type;
				if(type !== 'manual'){
					var driver = req.soajs.inputmaskData.deployer[type].selected.split(".");
					checkIfError(req, res, {
						config: config,
						error: !req.soajs.inputmaskData.deployer[type][driver[0]][driver[1]] || JSON.stringify(req.soajs.inputmaskData.deployer[type][driver[0]][driver[1]]) === '{}',
						code: 407
					});
				}

				var s = {
					'$set': {
						"port": req.soajs.inputmaskData.port,
						"domain": req.soajs.inputmaskData.domain,
						"deployer": req.soajs.inputmaskData.deployer,
						"description": req.soajs.inputmaskData.description,
						"services": req.soajs.inputmaskData.services,
						"profile": config.profileLocation + req.soajs.inputmaskData.profile + ".js"
					}
				};
				mongo.update(colName, {"_id": req.soajs.inputmaskData.id}, s, {'upsert': false, 'safe': true}, function(err, data) {
					checkIfError(req, res, {config: config, error: err, code: 401}, function () {
						return res.jsonp(req.soajs.buildResponse(null, "environment update successful"));
					});
				});
			});
		});
	},

	"list": function(config, mongo, req, res, cb) {
		mongo.find(colName, function(err, records) {
			checkIfError(req, res, {config: config, error: err, code: 402}, function () {
				if(cb && typeof(cb) === 'function') {
					return cb(records);
				}
				else {
					return res.jsonp(req.soajs.buildResponse(null, records));
				}
			});
		});
	},

	"keyUpdate": function(config, mongo, req,res){
		var provision = require("soajs/modules/soajs.provision");
		provision.init(req.soajs.registry.coreDB.provision, req.soajs.log);
		var position = [];
		var newKey;

		validateId(mongo, req, function(err) {
			checkIfError(req, res, {config: config, error: err, code: 405}, function () {
				//get tenant record
				mongo.findOne(tenantColName, {'_id': mongo.ObjectId(req.soajs.tenant.id) }, function(error, tenantRecord){
					checkIfError(req, res, {config: config, error: error || !tenantRecord, code: 438}, function () {
						//generate new key
						generateNewKey(provision, tenantRecord, function(error){
							checkIfError(req, res, {config: config, error: error, code: error}, function () {
								//update tenant
								updateTenantRecord(tenantRecord, function(error){
									checkIfError(req, res, {config: config, error: error, code: error}, function () {
										//generate external key
										generateNewExtKey(provision, tenantRecord, function(error){
											if(error){ rollback(tenantRecord, error); }
											//update tenant
											updateTenantRecord(tenantRecord, function(error){
												checkIfError(req, res, {config: config, error: error, code: error}, function () {
													//update environment
													updateEnvironment(function(error){
														checkIfError(req, res, {config: config, error: error, code: error}, function () {
															provision.loadProvision(function(loaded) {
																return res.jsonp(req.soajs.buildResponse(null, {'newKey': newKey.extKeys[0].extKey}));
															});
														});
													})
												});
											});
										});
									});
								});
							});
						});
					});
				});
			});
		});

		function rollback(tenantRecord, error){
			for(var key=0; key< tenantRecord.applications[position[0]].keys.length; key++){
				if(tenantRecord.applications[position[0]].keys[key].key === newKey.key){
					tenantRecord.applications[position[0]].keys.splice(key,1);
				}
			}

			updateTenantRecord(tenantRecord, function(error){
				checkIfError(req, res, {config: config, error: error, code: 406});
			});
		}

		function updateTenantRecord(tenantRecord, cb){
			mongo.save(tenantColName, tenantRecord, function(error){
				if(error) { return cb(436); }
				return cb(null, true);
			});
		}

		function generateNewKey(provision, tenantRecord, cb){
			for(var app =0; app < tenantRecord.applications.length; app++){
				if(tenantRecord.applications[app].appId.toString() === req.soajs.tenant.application.appId){
					position.push(app);

					//get old key configuration
					for(var key =0; key < tenantRecord.applications[app].keys.length; key++){
						if(tenantRecord.applications[app].keys[key].key === req.soajs.tenant.key.iKey){
							position.push(key);
							provision.generateInternalKey(function(error, internalKey) {
								if(error) { return cb(436); }

								newKey = {
									"key": internalKey,
									"config": tenantRecord.applications[app].keys[key].config,
									"extKeys": []
								};

								tenantRecord.applications[app].keys.push(newKey);
								return cb(null, true);
							});
						}
					}
				}
			}
		}

		function generateNewExtKey(provision, tenantRecord, cb){
			var app = position[0];
			var key = position[1];
			var internalKey = newKey.key;

			//get old ext key security and expDate
			for(var extKey=0; extKey < tenantRecord.applications[app].keys[key].extKeys.length; extKey++){
				if(tenantRecord.applications[app].keys[key].extKeys[extKey].extKey === req.soajs.tenant.key.eKey){

					var newExtKey ={
						device : tenantRecord.applications[app].keys[key].extKeys[extKey].device,
						geo : tenantRecord.applications[app].keys[key].extKeys[extKey].geo,
						expDate : tenantRecord.applications[app].keys[key].extKeys[extKey].expDate
					};
					provision.generateExtKey(internalKey, {
						algorithm: req.soajs.inputmaskData.algorithm,
						password: req.soajs.inputmaskData.password
					}, function(error, extKeyValue) {
						if(error) { return cb(440); }

						newExtKey.extKey = extKeyValue;
						newKey.extKeys.push(newExtKey);
						tenantRecord.applications[app].keys[key].extKeys.push(newExtKey);
						return cb(null, true);
					});
				}
			}
		}

		function updateEnvironment(cb){
			var s = {
				'$set': {
					"services.config.key.algorithm": req.soajs.inputmaskData.algorithm,
					"services.config.key.password": req.soajs.inputmaskData.password
				}
			};
			mongo.update(colName, {"_id": req.soajs.inputmaskData.id}, s, {'upsert': false, 'safe': true}, function(err) {
				if(err) { return cb(406); }
				return cb(null, true);
			});
		}
	},

	"listDbs": function(config, mongo, req, res) {
		mongo.findOne(colName, {'code': req.soajs.inputmaskData.env.toUpperCase()}, function(err, envRecord) {
			checkIfError (req, res, {config: config, error: err, code: 402}, function () {
				return res.jsonp(req.soajs.buildResponse(null, envRecord.dbs));
			});
		});
	},

	"addDb": function(config, mongo, req, res) {
		if(req.soajs.inputmaskData.name === 'session') {
			if(!req.soajs.inputmaskData.sessionInfo || JSON.stringify(req.soajs.inputmaskData.sessionInfo) === '{}') {
				return res.jsonp(req.soajs.buildResponse({"code": 507, "msg": config.errors[507]}));
			}
		}
		mongo.findOne(colName, {'code': req.soajs.inputmaskData.env.toUpperCase()}, function(err, envRecord) {
			checkIfError(req, res, {config: config, error: err || !envRecord, code: 402}, function () {
				var clusters = Object.keys(envRecord.dbs.clusters);
				checkIfError(req, res, {config: config, error: clusters.indexOf(req.soajs.inputmaskData.cluster) === -1, code: 502}, function () {
					//check if this is the session
					if(req.soajs.inputmaskData.name === 'session') {
						checkIfError(req, res, {
							config: config,
							error: envRecord.dbs.config.session && JSON.stringify(envRecord.dbs.config.session) !== '{}',
							code: 510
						}, function () {
							envRecord.dbs.config.session = {
								'cluster': req.soajs.inputmaskData.cluster,
								'name': req.soajs.inputmaskData.sessionInfo.dbName,
								'store': req.soajs.inputmaskData.sessionInfo.store,
								'collection': req.soajs.inputmaskData.sessionInfo.collection,
								'stringify': req.soajs.inputmaskData.sessionInfo.stringify,
								'expireAfter': req.soajs.inputmaskData.sessionInfo.expireAfter
							};

							mongo.save(colName, envRecord, function(err) {
								checkIfError(req, res, {config: config, error: err, code: 503}, function () {
									return res.jsonp(req.soajs.buildResponse(null, "environment database added successful"));
								});
							});
						});
					}
					else {
						checkIfError(req, res, {config: config, error: envRecord.dbs.databases[req.soajs.inputmaskData.name], code: 509}, function () {
							//otherwise
							envRecord.dbs.databases[req.soajs.inputmaskData.name] = {
								'cluster': req.soajs.inputmaskData.cluster,
								'tenantSpecific': req.soajs.inputmaskData.tenantSpecific || false
							};

							mongo.save(colName, envRecord, function(err) {
								checkIfError(req, res, {config: config, error: err, code: 503}, function () {
									return res.jsonp(req.soajs.buildResponse(null, "environment database added successful"));
								});
							});
						});
					}
				});
			});
		});
	},

	"updateDb": function(config, mongo, req, res) {
		if(req.soajs.inputmaskData.name === 'session') {
			if(!req.soajs.inputmaskData.sessionInfo || JSON.stringify(req.soajs.inputmaskData.sessionInfo) === '{}') {
				return res.jsonp(req.soajs.buildResponse({"code": 507, "msg": config.errors[507]}));
			}
		}
		mongo.findOne(colName, {'code': req.soajs.inputmaskData.env.toUpperCase()}, function(err, envRecord) {
			checkIfError(req, res, {config: config, error: err || !envRecord, code: 402}, function () {
				var clusters = Object.keys(envRecord.dbs.clusters);
				checkIfError(req, res, {config: config, error: clusters.indexOf(req.soajs.inputmaskData.cluster) === -1, code: 502}, function () {
					//check if this is the session
					if(req.soajs.inputmaskData.name === 'session') {
						checkIfError(req, res, {config: config, error: !envRecord.dbs.config.session, code: 511}, function () {
							envRecord.dbs.config.session = {
								'cluster': req.soajs.inputmaskData.cluster,
								'name': req.soajs.inputmaskData.sessionInfo.dbName,
								'store': req.soajs.inputmaskData.sessionInfo.store,
								'collection': req.soajs.inputmaskData.sessionInfo.collection,
								'stringify': req.soajs.inputmaskData.sessionInfo.stringify,
								'expireAfter': req.soajs.inputmaskData.sessionInfo.expireAfter
							};
							mongo.save(colName, envRecord, function(err) {
								checkIfError(req, res, {config: config, error: err, code: 513}, function () {
									return res.jsonp(req.soajs.buildResponse(null, "environment database updated successful"));
								});
							});
						});
					}
					else {
						checkIfError(req, res, {config: config, error: !envRecord.dbs.databases[req.soajs.inputmaskData.name], code: 512}, function () {
							//otherwise
							envRecord.dbs.databases[req.soajs.inputmaskData.name] = {
								'cluster': req.soajs.inputmaskData.cluster,
								'tenantSpecific': req.soajs.inputmaskData.tenantSpecific || false
							};
							mongo.save(colName, envRecord, function(err) {
								checkIfError(req, res, {config: config, error: err, code: 513}, function () {
									return res.jsonp(req.soajs.buildResponse(null, "environment database updated successful"));
								});
							});
						});
					}
				});
			});
		});
	},

	"deleteDb": function(config, mongo, req, res) {
		mongo.findOne(colName, {'code': req.soajs.inputmaskData.env.toUpperCase()}, function(err, envRecord) {
			checkIfError(req, res, {config: config, error: err || !envRecord, code: 402}, function () {
				if(req.soajs.inputmaskData.name === 'session') {
					checkIfError(req, res, {config: config, error: !envRecord.dbs.config.session, code: 511}, function () {
						delete envRecord.dbs.config.session;

						mongo.save(colName, envRecord, function(err) {
							checkIfError(req, res, {config: config, error: err, code: 514}, function () {
								return res.jsonp(req.soajs.buildResponse(null, "environment database removed successful"));
							});
						});
					});
				}
				else {
					checkIfError(req, res, {config: config, error: !envRecord.dbs.databases[req.soajs.inputmaskData.name], code: 512}, function () {
						delete envRecord.dbs.databases[req.soajs.inputmaskData.name];

						mongo.save(colName, envRecord, function(err) {
							checkIfError(req, res, {config: config, error: err, code: 514}, function () {
								return res.jsonp(req.soajs.buildResponse(null, "environment database removed successful"));
							});
						});
					});
				}
			});
		});
	},

	"updateDbsPrefix": function(config, mongo, req, res) {
		var prefix = {"dbs.config.prefix": req.soajs.inputmaskData.prefix};
		mongo.update(colName, {'code': req.soajs.inputmaskData.env.toUpperCase()}, {"$set": prefix}, {'upsert': false, 'safe': true}, function(err) {
			checkIfError(req, res, {config: config, error: err, code: 402}, function () {
				return res.jsonp(req.soajs.buildResponse(null, "environment Database prefix update successful"));
			});

			/*if(err) { return res.jsonp(req.soajs.buildResponse({"code": 402, "msg": config.errors[402]})); }
			return res.jsonp(req.soajs.buildResponse(null, "environment Database prefix update successful"));*/
		});
	},

	"listClusters": function(config, mongo, req, res) {
		mongo.findOne(colName, {'code': req.soajs.inputmaskData.env.toUpperCase()}, function(err, envRecord) {
			checkIfError(req, res, {config: config, error: err, code: 402}, function () {
				return res.jsonp(req.soajs.buildResponse(null, envRecord.dbs.clusters));
			});
		});
	},

	"addCluster": function(config, mongo, req, res) {
		mongo.findOne(colName, {'code': req.soajs.inputmaskData.env.toUpperCase()}, function(err, envRecord) {
			checkIfError(req, res, {config: config, error: err || !envRecord, code: 402}, function () {
				var clusters = Object.keys(envRecord.dbs.clusters);
				checkIfError(req, res, {config: config, error: clusters.indexOf(req.soajs.inputmaskData.name) !== -1, code: 504}, function () {
					envRecord.dbs.clusters[req.soajs.inputmaskData.name] = req.soajs.inputmaskData.cluster;

					mongo.save(colName, envRecord, function(err) {
						checkIfError(req, res, {config: config, error: err, code: 505}, function () {
							return res.jsonp(req.soajs.buildResponse(null, "environment cluster added successful"));
						});
					});
				});
			});
		});
	},

	"updateCluster": function(config, mongo, req, res) {
		mongo.findOne(colName, {'code': req.soajs.inputmaskData.env.toUpperCase()}, function(err, envRecord) {
			checkIfError(req, res, {config: config, error: err || !envRecord, code: 402}, function () {
				var clusters = Object.keys(envRecord.dbs.clusters);
				checkIfError(req, res, {config: config, error: clusters.indexOf(req.soajs.inputmaskData.name) === -1, code: 502}, function () {
					envRecord.dbs.clusters[req.soajs.inputmaskData.name] = req.soajs.inputmaskData.cluster;

					mongo.save(colName, envRecord, function(err) {
						checkIfError(req, res, {config: config, error: err, code: 506}, function () {
							return res.jsonp(req.soajs.buildResponse(null, "environment cluster updated successful"));
						});
					});
				});
			});
		});
	},

	"deleteCluster": function(config, mongo, req, res) {
		mongo.findOne(colName, {'code': req.soajs.inputmaskData.env.toUpperCase()}, function(error, envRecord) {
			checkIfError(req, res, {config: config, error: error || !envRecord, code: 402}, function () {
				checkIfError(req, res, {config: config, error: !envRecord.dbs.clusters[req.soajs.inputmaskData.name], code: 508}, function () {
					delete envRecord.dbs.clusters[req.soajs.inputmaskData.name];

					mongo.save(colName, envRecord, function(err) {
						checkIfError(req, res, {config: config, error: err, code: 402}, function () {
							return res.jsonp(req.soajs.buildResponse(null, "environment cluster removed successful"));
						});
					});
				});
			});
		});
	}
};