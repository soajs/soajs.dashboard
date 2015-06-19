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

		req.soajs.inputmaskData.code = req.soajs.inputmaskData.code.toUpperCase();
		var record = {
			"code": req.soajs.inputmaskData.code,
			"description": req.soajs.inputmaskData.description,
			"services": req.soajs.inputmaskData.services,
			"dbs": {
				"clusters": {},
				"config": {},
				"databases": {}
			}
		};

		mongo.count(colName, {'code': record.code}, function(error, count) {
			if(error) { return res.jsonp(req.soajs.buildResponse({"code": 400, "msg": config.errors[400]})); }

			if(count > 0) { return res.jsonp(req.soajs.buildResponse({"code": 403, "msg": config.errors[403]})); }

			mongo.insert(colName, record, function(err) {
				if(err) { return res.jsonp(req.soajs.buildResponse({"code": 400, "msg": config.errors[400]})); }
				return res.jsonp(req.soajs.buildResponse(null, "environment add successful"));
			});
		});
	},

	"delete": function(config, mongo, req, res) {
		validateId(mongo, req, function(err) {
			if(err) { return res.jsonp(req.soajs.buildResponse({"code": 405, "msg": config.errors[405]})); }

			var criteria1 = {
				'_id': req.soajs.inputmaskData.id, 'locked': true
			};
			mongo.findOne(colName, criteria1, function(error, record) {
				if(error) { return res.jsonp(req.soajs.buildResponse({"code": 404, "msg": config.errors[404]})); }
				if(record) {
					// return error msg that this record is locked
					return res.jsonp(req.soajs.buildResponse({"code": 500, "msg": config.errors[500]}));
				}
				else {
					var criteria = {
						'_id': req.soajs.inputmaskData.id, 'locked': {$ne: true}
					};
					mongo.remove(colName, criteria, function(error) {
						if(error) { return res.jsonp(req.soajs.buildResponse({"code": 404, "msg": config.errors[404]})); }
						return res.jsonp(req.soajs.buildResponse(null, "environment delete successful"));
					});
				}
			});
		});
	},

	"update": function(config, mongo, req, res) {
		validateId(mongo, req, function(err) {
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
			if(err) { return res.jsonp(req.soajs.buildResponse({"code": 405, "msg": config.errors[405]})); }
			var s = {
				'$set': {
					"description": req.soajs.inputmaskData.description,
					"services": req.soajs.inputmaskData.services
				}
			};
			mongo.update(colName, {"_id": req.soajs.inputmaskData.id}, s, {'upsert': false, 'safe': true}, function(err, data) {
				if(err) { return res.jsonp(req.soajs.buildResponse({"code": 401, "msg": config.errors[401]})); }
				return res.jsonp(req.soajs.buildResponse(null, "environment update successful"));
			});
		});
	},

	"list": function(config, mongo, req, res, cb) {
		mongo.find(colName, function(err, records) {
			if(err) { return res.jsonp(req.soajs.buildResponse({"code": 402, "msg": config.errors[402]})); }
			if(cb && typeof(cb) === 'function') {
				return cb(records);
			}
			else {
				return res.jsonp(req.soajs.buildResponse(null, records));
			}
		});
	},

	"keyUpdate": function(config, mongo, req,res){
		var provision = require("soajs/modules/soajs.provision");
		provision.init(req.soajs.registry.coreDB.provision, req.soajs.log);
		var position = [];
		var newKey;

		validateId(mongo, req, function(err) {
			if(err) { return res.jsonp(req.soajs.buildResponse({"code": 405, "msg": config.errors[405]})); }

			//get tenant record
			mongo.findOne(tenantColName, {'_id': mongo.ObjectId(req.soajs.tenant.id) }, function(error, tenantRecord){
				if(error || !tenantRecord){ return res.jsonp(req.soajs.buildResponse({"code": 438, "msg": config.errors[438]})); }

				//generate new key
				generateNewKey(provision, tenantRecord, function(error){
					if(error) { return res.jsonp(req.soajs.buildResponse(error)); }

					//update tenant
					updateTenantRecord(tenantRecord, function(error){
						if(error) { return res.jsonp(req.soajs.buildResponse(error)); }

						//generate external key
						generateNewExtKey(provision, tenantRecord, function(error){
							if(error){ rollback(tenantRecord, error); }

							//update tenant
							updateTenantRecord(tenantRecord, function(error){
								if(error) { return res.jsonp(req.soajs.buildResponse(error)); }

								//update environment
								updateEnvironment(function(error){
									if(error) { return res.jsonp(req.soajs.buildResponse(error)); }

									provision.loadProvision(function(loaded) {
										return res.jsonp(req.soajs.buildResponse(null, {'newKey': newKey.extKeys[0].extKey}));
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
				if(error) { return res.jsonp(req.soajs.buildResponse(error)); }
				return res.jsonp(req.soajs.buildResponse({"code": 406, "msg": config.errors[406]}));
			});
		}

		function updateTenantRecord(tenantRecord, cb){
			mongo.save(tenantColName, tenantRecord, function(error){
				if(error) { return cb({"code": 436, "msg": config.errors[436] }); }
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
								if(error) { return cb({"code": 436, "msg": config.errors[436]}); }

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
						if(error) { return cb({"code": 440, "msg": config.errors[440]}); }

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
				if(err) { return cb({"code": 406, "msg": config.errors[406]}); }
				return cb(null, true);
			});
		}
	},

	"listDbs": function(config, mongo, req, res) {
		mongo.findOne(colName, {'code': req.soajs.inputmaskData.env.toUpperCase()}, function(err, envRecord) {
			if(err) { return res.jsonp(req.soajs.buildResponse({"code": 402, "msg": config.errors[402]})); }
			return res.jsonp(req.soajs.buildResponse(null, envRecord.dbs));
		});
	},

	"addDb": function(config, mongo, req, res) {

		if(req.soajs.inputmaskData.name === 'session') {
			if(!req.soajs.inputmaskData.sessionInfo || JSON.stringify(req.soajs.inputmaskData.sessionInfo) === '{}') {
				return res.jsonp(req.soajs.buildResponse({"code": 507, "msg": config.errors[507]}));
			}
		}

		mongo.findOne(colName, {'code': req.soajs.inputmaskData.env.toUpperCase()}, function(err, envRecord) {
			if(err || !envRecord) { return res.jsonp(req.soajs.buildResponse({"code": 402, "msg": config.errors[402]})); }

			var clusters = Object.keys(envRecord.dbs.clusters);
			if(clusters.indexOf(req.soajs.inputmaskData.cluster) === -1) { return res.jsonp(req.soajs.buildResponse({"code": 502, "msg": config.errors[502]})); }

			//check if this is the session
			if(req.soajs.inputmaskData.name === 'session') {
				if(envRecord.dbs.config.session && JSON.stringify(envRecord.dbs.config.session) !== '{}') {
					return res.jsonp(req.soajs.buildResponse({"code": 510, "msg": config.errors[510]}));
				}

				envRecord.dbs.config.session = {
					'cluster': req.soajs.inputmaskData.cluster,
					'name': req.soajs.inputmaskData.sessionInfo.dbName,
					'store': req.soajs.inputmaskData.sessionInfo.store,
					'collection': req.soajs.inputmaskData.sessionInfo.collection,
					'stringify': req.soajs.inputmaskData.sessionInfo.stringify,
					'expireAfter': req.soajs.inputmaskData.sessionInfo.expireAfter
				};
			}
			else {

				if(envRecord.dbs.databases[req.soajs.inputmaskData.name]) {
					return res.jsonp(req.soajs.buildResponse({"code": 509, "msg": config.errors[509]}));
				}

				//otherwise
				envRecord.dbs.databases[req.soajs.inputmaskData.name] = {
					'cluster': req.soajs.inputmaskData.cluster,
					'tenantSpecific': req.soajs.inputmaskData.tenantSpecific || false
				};
			}

			mongo.save(colName, envRecord, function(err) {
				if(err) { return res.jsonp(req.soajs.buildResponse({"code": 503, "msg": config.errors[503]})); }

				return res.jsonp(req.soajs.buildResponse(null, "environment database added successful"));
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
			if(err || !envRecord) { return res.jsonp(req.soajs.buildResponse({"code": 402, "msg": config.errors[402]})); }

			var clusters = Object.keys(envRecord.dbs.clusters);
			if(clusters.indexOf(req.soajs.inputmaskData.cluster) === -1) { return res.jsonp(req.soajs.buildResponse({"code": 502, "msg": config.errors[502]})); }

			//check if this is the session
			if(req.soajs.inputmaskData.name === 'session') {
				if(!envRecord.dbs.config.session) {
					return res.jsonp(req.soajs.buildResponse({"code": 511, "msg": config.errors[511]}));
				}

				envRecord.dbs.config.session = {
					'cluster': req.soajs.inputmaskData.cluster,
					'name': req.soajs.inputmaskData.sessionInfo.dbName,
					'store': req.soajs.inputmaskData.sessionInfo.store,
					'collection': req.soajs.inputmaskData.sessionInfo.collection,
					'stringify': req.soajs.inputmaskData.sessionInfo.stringify,
					'expireAfter': req.soajs.inputmaskData.sessionInfo.expireAfter
				};
			}
			else {

				if(!envRecord.dbs.databases[req.soajs.inputmaskData.name]) {
					return res.jsonp(req.soajs.buildResponse({"code": 512, "msg": config.errors[512]}));
				}

				//otherwise
				envRecord.dbs.databases[req.soajs.inputmaskData.name] = {
					'cluster': req.soajs.inputmaskData.cluster,
					'tenantSpecific': req.soajs.inputmaskData.tenantSpecific || false
				};
			}

			mongo.save(colName, envRecord, function(err) {
				if(err) { return res.jsonp(req.soajs.buildResponse({"code": 513, "msg": config.errors[513]})); }

				return res.jsonp(req.soajs.buildResponse(null, "environment database updated successful"));
			});
		});
	},

	"deleteDb": function(config, mongo, req, res) {

		mongo.findOne(colName, {'code': req.soajs.inputmaskData.env.toUpperCase()}, function(err, envRecord) {
			if(err || !envRecord) { return res.jsonp(req.soajs.buildResponse({"code": 402, "msg": config.errors[402]})); }

			if(req.soajs.inputmaskData.name === 'session') {
				if(!envRecord.dbs.config.session) {
					return res.jsonp(req.soajs.buildResponse({"code": 511, "msg": config.errors[511]}));
				}

				delete envRecord.dbs.config.session;
			}
			else {
				if(!envRecord.dbs.databases[req.soajs.inputmaskData.name]) {
					return res.jsonp(req.soajs.buildResponse({"code": 512, "msg": config.errors[512]}));
				}

				delete envRecord.dbs.databases[req.soajs.inputmaskData.name];
			}

			mongo.save(colName, envRecord, function(err) {
				if(err) { return res.jsonp(req.soajs.buildResponse({"code": 514, "msg": config.errors[514]})); }
				return res.jsonp(req.soajs.buildResponse(null, "environment database removed successful"));
			});
		});
	},

	"updateDbsPrefix": function(config, mongo, req, res) {
		var prefix = {"dbs.config.prefix": req.soajs.inputmaskData.prefix};
		mongo.update(colName, {'code': req.soajs.inputmaskData.env.toUpperCase()}, {"$set": prefix}, {'upsert': false, 'safe': true}, function(err) {
			if(err) { return res.jsonp(req.soajs.buildResponse({"code": 402, "msg": config.errors[402]})); }
			return res.jsonp(req.soajs.buildResponse(null, "environment Database prefix update successful"));
		});
	},

	"listClusters": function(config, mongo, req, res) {
		mongo.findOne(colName, {'code': req.soajs.inputmaskData.env.toUpperCase()}, function(err, envRecord) {
			if(err) { return res.jsonp(req.soajs.buildResponse({"code": 402, "msg": config.errors[402]})); }
			return res.jsonp(req.soajs.buildResponse(null, envRecord.dbs.clusters));
		});
	},

	"addCluster": function(config, mongo, req, res) {
		mongo.findOne(colName, {'code': req.soajs.inputmaskData.env.toUpperCase()}, function(err, envRecord) {
			if(err || !envRecord) { return res.jsonp(req.soajs.buildResponse({"code": 402, "msg": config.errors[402]})); }

			var clusters = Object.keys(envRecord.dbs.clusters);
			if(clusters.indexOf(req.soajs.inputmaskData.name) !== -1) { return res.jsonp(req.soajs.buildResponse({"code": 504, "msg": config.errors[504]})); }

			envRecord.dbs.clusters[req.soajs.inputmaskData.name] = req.soajs.inputmaskData.cluster;

			mongo.save(colName, envRecord, function(err) {
				if(err) { return res.jsonp(req.soajs.buildResponse({"code": 505, "msg": config.errors[505]})); }

				return res.jsonp(req.soajs.buildResponse(null, "environment cluster added successful"));
			});
		});
	},

	"updateCluster": function(config, mongo, req, res) {
		mongo.findOne(colName, {'code': req.soajs.inputmaskData.env.toUpperCase()}, function(err, envRecord) {
			if(err || !envRecord) { return res.jsonp(req.soajs.buildResponse({"code": 402, "msg": config.errors[402]})); }

			var clusters = Object.keys(envRecord.dbs.clusters);
			if(clusters.indexOf(req.soajs.inputmaskData.name) === -1) { return res.jsonp(req.soajs.buildResponse({"code": 502, "msg": config.errors[502]})); }

			envRecord.dbs.clusters[req.soajs.inputmaskData.name] = req.soajs.inputmaskData.cluster;

			mongo.save(colName, envRecord, function(err) {
				if(err) { return res.jsonp(req.soajs.buildResponse({"code": 506, "msg": config.errors[506]})); }

				return res.jsonp(req.soajs.buildResponse(null, "environment cluster updated successful"));
			});
		});
	},

	"deleteCluster": function(config, mongo, req, res) {
		mongo.findOne(colName, {'code': req.soajs.inputmaskData.env.toUpperCase()}, function(error, envRecord) {
			if(error || !envRecord) { return res.jsonp(req.soajs.buildResponse({"code": 402, "msg": config.errors[402]})); }

			if(!envRecord.dbs.clusters[req.soajs.inputmaskData.name]) {
				return res.jsonp(req.soajs.buildResponse({"code": 508, "msg": config.errors[508]}));
			}

			delete envRecord.dbs.clusters[req.soajs.inputmaskData.name];

			mongo.save(colName, envRecord, function(err) {
				if(err) { return res.jsonp(req.soajs.buildResponse({"code": 402, "msg": config.errors[402]})); }
				return res.jsonp(req.soajs.buildResponse(null, "environment cluster removed successful"));
			});
		});
	}
};