"use strict";
var collectionName = "gc";
var gitCollection = "git_accounts";

var async = require("async");
var objecthash = require("object-hash");

var fs = require('fs');

function validateId(soajs, cb) {
	BL.model.validateId(soajs, cb);
}

function checkReturnError(req, mainCb, data, cb) {
	if (data.error) {
		if (typeof (data.error) === 'object' && (data.error.message || data.error.msg)) {
			req.soajs.log.error(data.error);
		}
		return mainCb({"code": data.code, "msg": data.config.errors[data.code]});
	}
	else {
		if (cb) {
			return cb();
		}
	}
}

function mapPostedConfig(config) {
	var commonFields = config.genericService.config.schema.commonFields;
	for (var i in commonFields) {
		if (Object.hasOwnProperty.call(commonFields, i)) {
			if (Object.hasOwnProperty.call(commonFields[i], 'req')) {
				commonFields[i].required = commonFields[i].req;
				delete commonFields[i].req;
			}
		}
	}
	
	['add', 'update'].forEach(function (formType) {
		var formConfig = config.soajsUI.form[formType];
		
		for (var j = 0; j < formConfig.length; j++) {
			for (var field in formConfig[j]) {
				if (Object.hasOwnProperty.call(formConfig[j], field)) {
					if (field === 'req') {
						formConfig[j].required = formConfig[j]['req'];
						delete formConfig[j]['req'];
					}
					
					if (field === '_type') {
						formConfig[j].type = formConfig[j]['_type'];
						delete formConfig[j]['_type'];
					}
				}
			}
		}
	});
}

function compareIMFV(oldIMFV, newIMFV) {
	if (Object.keys(oldIMFV).length !== Object.keys(newIMFV).length) {
		return true;
	}
	for (var input in newIMFV) {
		if (oldIMFV[input]) {
			var hash1 = objecthash(oldIMFV[input]);
			var hash2 = objecthash(newIMFV[input]);
			if (hash1 !== hash2) {
				return true;
			}
		}
	}
	return false;
}

var t = {
    "commonFields": {
        "id": {"source": ["query.id"], "validation": {"type": "string"}, "required": true},
        "title": {"source": ["body.title"], "validation": {}, "required": true}
    },
    "/list": {"_apiInfo": {"l": "List Entries", "group": "news"}}
}

function compareAPISFields(oldAPIs, newAPIs) {

	for (var route in newAPIs) {
		if (Object.hasOwnProperty.call(newAPIs, route)) {
			if (route === 'commonFields') {
				continue;
			}
			if (oldAPIs[route]) {
                var oldFields = oldAPIs[route].commonFields;
                var newFields = newAPIs[route].commonFields;
				//compare fields
				if (oldFields && newFields) {
					if (oldFields.length !== newFields.length || !oldFields.every(function (u, i) {
							return u === newFields[i];
						})) {
						return true;
					}
				}
			}
		}
	}
	return false;
}

function compareAPIs(oldAPIs, newAPIs) {
	for (var route in newAPIs) {
		if (oldAPIs[route]) {
			if ((oldAPIs[route].type !== newAPIs[route].type) || (oldAPIs[route].method !== newAPIs[route].method)) {
				return true;
			}
			
			if (Object.keys(oldAPIs[route].workflow).length !== Object.keys(newAPIs[route].workflow).length) {
				return true;
			}
			else {
				for (var wfStep in newAPIs[route].workflow) {
					if (Object.hasOwnProperty.call(newAPIs[route].workflow, wfStep)) {
						var hash1 = objecthash(oldAPIs[route].workflow[wfStep]);
						var hash2 = objecthash(newAPIs[route].workflow[wfStep]);
						if (hash1 !== hash2) {
							return true;
						}
					}
				}
			}
		}
	}
	return false;
}

function compareUI(oldUI, newUI) {
	var columnHash1, columnHash2;
	
	if (oldUI.list.columns.length !== newUI.list.columns.length) {
		return true;
	}
	for (var column = 0; column < newUI.list.columns.length; column++) {
		columnHash1 = objecthash(newUI.list.columns[column]);
		columnHash2 = objecthash(oldUI.list.columns[column]);
		if (columnHash1 !== columnHash2) {
			return true;
		}
	}
	
	if (oldUI.form.add.length !== newUI.form.add.length) {
		return true;
	}
	for (var field = 0; field < newUI.form.add.length; field++) {
		columnHash1 = objecthash(newUI.form.add[field]);
		columnHash2 = objecthash(oldUI.form.add[field]);
		if (columnHash1 !== columnHash2) {
			return true;
		}
	}
	
	if (oldUI.form.update.length !== newUI.form.update.length) {
		return true;
	}
	field = 0;
	for (field; field < newUI.form.update.length; field++) {
		columnHash1 = objecthash(newUI.form.update[field]);
		columnHash2 = objecthash(oldUI.form.update[field]);
		if (columnHash1 !== columnHash2) {
			return true;
		}
	}
	return false;
}

function extractAPIsList(schema) {
	var excluded = ['commonFields'];
	var apiList = [];
	for (var route in schema) {
		if (Object.hasOwnProperty.call(schema, route)) {
			if (excluded.indexOf(route) !== -1) {
				continue;
			}
			
			var oneApi = {
				'l': schema[route]._apiInfo.l,
				'v': route
			};
			
			if (schema[route]._apiInfo.group) {
				oneApi.group = schema[route]._apiInfo.group;
			}
			
			if (schema[route]._apiInfo.groupMain) {
				oneApi.groupMain = schema[route]._apiInfo.groupMain;
			}
			
			apiList.push(oneApi);
		}
	}
	return apiList;
}

function checkIfGCisAService(config, condition, GCDBRecord, version, req, cb) {
	var opts = {};
	opts.collection = "services";
	opts.conditions = condition;
	BL.model.findEntry(req.soajs, opts, function (error, oneRecord) {
		if (error) {
			//return cb({'code': 600, 'msg': config.errors['600']});
			return cb(600);
		}
		
		if (oneRecord) {
			//return cb({'code': 704, 'msg': config.errors['704']});
			return cb(704);
		}
		opts = {};
		opts.collection = gitCollection;
		opts.conditions = {"repos.name": "soajs/soajs.gcs"};
		opts.fields = {"owner": 1, "provider": 1};
		BL.model.findEntry(req.soajs, opts, function (error, gitResponse) {
			if (error) {
				req.soajs.log.error(error);
				return cb(600);
			}
			
			if (!gitResponse) {
				req.soajs.log.error('No gitResponse');
				return cb(757);
			}
			
			var serviceGCDoc = {
				'$set': {
					'port': req.soajs.inputmaskData.config.genericService.config.servicePort,
					"requestTimeout": req.soajs.inputmaskData.config.genericService.config.requestTimeout,
					"requestTimeoutRenewal": req.soajs.inputmaskData.config.genericService.config.requestTimeoutRenewal,
					"src": {
						"provider": gitResponse.provider,
						"owner": gitResponse.owner,
						"repo": "soajs.gcs"
					},
					"version": version,
					"versions": {}
				}
			};
			
			serviceGCDoc['$set'].versions[version] = {
				'extKeyRequired': req.soajs.inputmaskData.config.genericService.config.extKeyRequired,
				"awareness": req.soajs.inputmaskData.config.genericService.config.awareness || false,
				"apis": extractAPIsList(req.soajs.inputmaskData.config.genericService.config.schema)
			};
			var queryCondition = {
				'name': req.soajs.inputmaskData.config.genericService.config.serviceName,
				'gcId': GCDBRecord._id.toString()
			};
			opts = {};
			opts.collection = "services";
			opts.conditions = queryCondition;
			opts.fields = serviceGCDoc;
			opts.options = {'upsert': true};
			BL.model.updateEntry(req.soajs, opts, function (error) {
				if (error) {
					//return cb({'code': 600, 'msg': config.errors['600']});
					return cb(600);
				}
				return cb(null, true);
			});
		});
	});
}

var BL = {
	
	model: null,
	
	"list": function (config, req, res, cbk) {
		
		var fields = {
			"id": 1,
			"name": 1,
			"ts": 1,
			"author": 1,
			"modified": 1,
			"v": 1,
			"genericService.config.servicePort": 1
		};
		if (req.soajs.inputmaskData.port) {
			fields['genericService.config.servicePort'] = 1;
		}
		
		var opts = {};
		opts.collection = collectionName;
		opts.conditions = {};
		opts.fields = fields;
		opts.options = {"$sort": {"ts": -1, "v": -1}};
		BL.model.findEntries(req.soajs, opts, function (error, response) {
			checkReturnError(req, cbk, {config: config, error: error, code: 600}, function () {
				return cbk(null, response);
			});
		});
	},
	
	"get": function (config, req, res, cbk) {
		var opts = {};
		validateId(req.soajs, function (error) {
			checkReturnError(req, cbk, {config: config, error: error, code: 701}, function () {
				var condition = {"_id": req.soajs.inputmaskData.id};
				var suffix = "";
				if (req.soajs.inputmaskData.version && req.soajs.inputmaskData.version !== '') {
					condition = {
						'refId': req.soajs.inputmaskData.id,
						'v': req.soajs.inputmaskData.version
					};
					suffix = "_versioning";
				}
				opts.collection = collectionName + suffix;
				opts.conditions = condition;
				BL.model.findEntry(req.soajs, opts, function (error, response) {
					checkReturnError(req, cbk, {config: config, error: error, code: 600}, function () {
						checkReturnError(req, cbk, {config: config, error: !response, code: 702}, function () {
							return cbk(null, response);
						});
					});
				});
			});
		});
	},
	
	"revisions": function (config, req, res, cbk) {
		var opts = {};
		var fields = {"refId": 1, "name": 1, "author": 1, "modified": 1, "v": 1};
		opts.collection = collectionName + "_versioning";
		opts.conditions = {};
		opts.fields = fields;
		opts.options = {$sort: {'v': -1}};
		BL.model.findEntries(req.soajs, opts, function (error, response) {
			checkReturnError(req, cbk, {config: config, error: error, code: 600}, function () {
				return cbk(null, response);
			});
		});
	},
	
	"add": function (config, req, res, cbk) {
		
		//loop through req.soajs.inputmaskData.config and transform "req" to "required"
		mapPostedConfig(req.soajs.inputmaskData.config);
		req.soajs.inputmaskData.name = req.soajs.inputmaskData.name.toLowerCase().trim().replace(/\s+/g, '_');
		
		var record = {
			'name': req.soajs.inputmaskData.name,
			'genericService': req.soajs.inputmaskData.config.genericService,
			'soajsService': req.soajs.inputmaskData.config.soajsService,
			'soajsUI': req.soajs.inputmaskData.config.soajsUI
		};
		
		if (req.soajs.uracDriver) {
			record['author'] = req.soajs.uracDriver.getProfile().username;
		}
		
		var opts = {};
		opts.collection = collectionName;
		opts.conditions = {'name': record.name};
		BL.model.findEntry(req.soajs, opts, function (error, response) {
			checkReturnError(req, cbk, {config: config, error: error, code: 600}, function () {
				checkReturnError(req, cbk, {config: config, error: response, code: 700}, function () {
					opts = {};
					opts.collection = collectionName;
					opts.record = record;
					opts.versioning = true;
					BL.model.insertEntry(req.soajs, opts, function (error, dbRecord) {
						checkReturnError(req, cbk, {config: config, error: error, code: 600}, function () {
							checkIfGCisAService(config, {
								$or: [
									{'port': req.soajs.inputmaskData.config.genericService.config.servicePort},
									{'name': req.soajs.inputmaskData.config.genericService.config.serviceName}
								]
							}, dbRecord[0], 1, req, function (error) {
								if (error) {
									opts = {};
									opts.collection = collectionName;
									opts.conditions = {'name': record.name};
									BL.model.removeEntry(req.soajs, opts, function (err) {
										req.soajs.log.error(err);
										return cbk({
											'code': error,
											'msg': config.errors[error]
										});
									});
								}
								else {
									return cbk(null, true);
								}
							});
						});
					});
				});
			});
		});
	},
	
	"update": function (config, req, res, cbk) {
		var opts = {};
		validateId(req.soajs, function (error) {
			checkReturnError(req, cbk, {config: config, error: error, code: 701}, function () {
				//loop through req.soajs.inputmaskData.config and transform "req" to "required"
				mapPostedConfig(req.soajs.inputmaskData.config);
				opts.collection = collectionName;
				opts.conditions = {'_id': req.soajs.inputmaskData.id};
				BL.model.findEntry(req.soajs, opts, function (error, oldServiceConfig) {
					checkReturnError(req, cbk, {config: config, error: error, code: 600}, function () {
						checkReturnError(req, cbk, {
							config: config,
							error: !oldServiceConfig,
							code: 702
						}, function () {
							//check if the IMFV configuration have changed
							var oldIMFV = oldServiceConfig.genericService.config.schema.commonFields;
							var newIMFV = req.soajs.inputmaskData.config.genericService.config.schema.commonFields;
							var newVersion = compareIMFV(oldIMFV, newIMFV);
							var gcV = oldServiceConfig.v;
							if (!newVersion) {
								//check if apis inputs have changed
								var oldAPIFields = oldServiceConfig.genericService.config.schema;
								var newAPIFields = req.soajs.inputmaskData.config.genericService.config.schema;


                                console.log(JSON.stringify("----", null, 2)); // #ja #2del
                                console.log(JSON.stringify(oldAPIFields, null ,2)); // #ja #2del
                                console.log(JSON.stringify("xxxxxxxx", null, 2)); // #ja #2del
                                console.log(JSON.stringify(newAPIFields, null ,2)); // #ja #2del

                                console.log(JSON.stringify("xxxxxxxx", null, 2)); // #ja #2del

								newVersion = compareAPISFields(oldAPIFields, newAPIFields);
								if (!newVersion) {
									//check if apis workflow have changed
									var oldAPIWF = oldServiceConfig.soajsService.apis;
									var newAPIWF = req.soajs.inputmaskData.config.soajsService.apis;
									newVersion = compareAPIs(oldAPIWF, newAPIWF);
									if (!newVersion) {
										//check if ui is different
										var oldAPIUI = oldServiceConfig.soajsUI;
										var newAPIUI = req.soajs.inputmaskData.config.soajsUI;
										newVersion = compareUI(oldAPIUI, newAPIUI);
									}
								}
							}
							
							if (newVersion) {
								gcV++;
							}
							
							checkIfGCisAService(config, {
								'$and': [
									{
										'$or': [
											{'port': req.soajs.inputmaskData.config.genericService.config.servicePort},
											{'name': req.soajs.inputmaskData.config.genericService.config.serviceName}
										]
									},
									{
										'gcId': {'$ne': req.soajs.inputmaskData.id.toString()}
									}
								]
							}, oldServiceConfig, gcV, req, function (error) {
								checkReturnError(req, cbk, {
									config: config,
									error: error,
									code: error
								}, function () {
									var updateArgs = [
										collectionName,
										{'_id': req.soajs.inputmaskData.id},
										{
											'$set': {
												'genericService': req.soajs.inputmaskData.config.genericService,
												'soajsService': req.soajs.inputmaskData.config.soajsService,
												'soajsUI': req.soajs.inputmaskData.config.soajsUI,
												'modified': new Date().getTime()
											}
										},
										function (error) {
											checkReturnError(req, cbk, {
												config: config,
												error: error,
												code: 600
											}, function () {
												return cbk(null, true);
											});
										}
									];
									opts = {};
									opts.collection = updateArgs[0];
									opts.conditions = updateArgs[1];
									opts.fields = updateArgs[2];
									opts.versioning = false;
									if (newVersion) {
										opts.versioning = true;
										BL.model.updateEntry(req.soajs, opts, updateArgs[3]);
									}
									else {
										BL.model.updateEntry(req.soajs, opts, updateArgs[3]);
									}
								});
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
		
		modelPath = __dirname + "/../models/" + modelName + ".js";
		
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