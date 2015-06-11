"use strict";
var collectionName = "gc";
var objecthash = require("object-hash");

function validateId(mongo, req, cb) {
	try {
		req.soajs.inputmaskData.id = mongo.ObjectId(req.soajs.inputmaskData.id);
		return cb(null);
	} catch(e) {
		return cb(e);
	}
}

function mapPostedConfig(config) {
	var commonFields = config.genericService.config.schema.commonFields;
	for(var i in commonFields) {
		if(commonFields.hasOwnProperty(i)) {
			if(commonFields[i].req) {
				commonFields[i].required = commonFields[i].req;
				delete commonFields[i].req;
			}
		}
	}

	['add', 'update'].forEach(function(formType) {
		var formConfig = config.soajsUI.form[formType];

		for(var j = 0; j < formConfig.length; j++) {
			for(var field in formConfig[j]) {
				if(formConfig[j].hasOwnProperty(field)) {
					if(field === 'req') {
						formConfig[j].required = formConfig[j]['req'];
						delete formConfig[j]['req'];
					}

					if(field === '_type') {
						formConfig[j].type = formConfig[j]['_type'];
						delete formConfig[j]['_type'];
					}
				}
			}
		}
	});
}

function compareIMFV(oldIMFV, newIMFV) {
	if(Object.keys(oldIMFV).length !== Object.keys(newIMFV).length) {
		return true;
	}
	for(var input in newIMFV) {
		if(oldIMFV[input]) {
			var hash1 = objecthash(oldIMFV[input]);
			var hash2 = objecthash(newIMFV[input]);
			if(hash1 !== hash2) {
				return true;
			}
		}
	}
	return false;
}

function compareAPISFields(oldAPIs, newAPIs) {
	for(var route in newAPIs) {
		if(route === 'commonFields') {
			continue;
		}
		var oldFields = oldAPIs[route].commonFields;
		var newFields = newAPIs[route].commonFields;

		if(oldAPIs[route]) {
			//compare fields
			if(oldFields && newFields) {
				if(oldFields.length !== newFields.length || !oldFields.every(function(u, i) { return u === newFields[i]; })) {
					return true;
				}
			}
		}
	}
	return false;
}

function compareAPIs(oldAPIs, newAPIs) {
	for(var route in newAPIs) {
		if(oldAPIs[route]) {
			if((oldAPIs[route].type !== newAPIs[route].type) || (oldAPIs[route].method !== newAPIs[route].method)) {
				return true;
			}

			if(Object.keys(oldAPIs[route].workflow).length !== Object.keys(newAPIs[route].workflow).length) {
				return true;
			}
			else {
				for(var wfStep in newAPIs[route].workflow) {
					var hash1 = objecthash(oldAPIs[route].workflow[wfStep]);
					var hash2 = objecthash(newAPIs[route].workflow[wfStep]);
					if(hash1 !== hash2) {
						return true;
					}
				}
			}
		}
	}
	return false;
}

function compareUI(oldUI, newUI) {

	if(oldUI.list.columns.length !== newUI.list.columns.length) {
		return true;
	}
	for(var column = 0; column < newUI.list.columns.length; column++) {
		var columnHash1 = objecthash(newUI.list.columns[column]);
		var columnHash2 = objecthash(oldUI.list.columns[column]);
		if(columnHash1 !== columnHash2) {
			return true;
		}
	}

	if(oldUI.form.add.length !== newUI.form.add.length) {
		return true;
	}
	for(var field = 0; field < newUI.form.add.length; field++) {
		var columnHash1 = objecthash(newUI.form.add[field]);
		var columnHash2 = objecthash(oldUI.form.add[field]);
		if(columnHash1 !== columnHash2) {
			return true;
		}
	}

	if(oldUI.form.update.length !== newUI.form.update.length) {
		return true;
	}
	field = 0;
	for(field; field < newUI.form.update.length; field++) {
		var columnHash1 = objecthash(newUI.form.update[field]);
		var columnHash2 = objecthash(oldUI.form.update[field]);
		if(columnHash1 !== columnHash2) {
			return true;
		}
	}
	return false;
}

module.exports = {

	"list": function(config, mongo, req, res) {
		var fields = {"id": 1, "name": 1, "ts": 1, "author": 1, "modified": 1, "v": 1};
		mongo.find(collectionName, {$query: {}, $orderby: {"ts": -1, "v": -1}}, fields, function(error, response) {
			if(error) { return res.jsonp(req.soajs.buildResponse({'code': 600, 'msg': config.errors['600']})); }
			return res.jsonp(req.soajs.buildResponse(null, response));
		});
	},

	"get": function(config, mongo, req, res) {
		validateId(mongo, req, function(error) {
			if(error) { return res.jsonp(req.soajs.buildResponse({'code': 701, 'msg': config.errors['701']})); }

			var condition = {"_id": req.soajs.inputmaskData.id};
			var suffix = "";
			if(req.soajs.inputmaskData.version && req.soajs.inputmaskData.version !== '') {
				condition = {
					'refId': req.soajs.inputmaskData.id,
					'v': req.soajs.inputmaskData.version
				};
				suffix = "_versioning";
			}
			mongo.findOne(collectionName + suffix, condition, function(error, response) {
				if(error) { return res.jsonp(req.soajs.buildResponse({'code': 600, 'msg': config.errors['600']})); }
				if(!response) { return res.jsonp(req.soajs.buildResponse({'code': 702, 'msg': config.errors['702']})); }

				return res.jsonp(req.soajs.buildResponse(null, response));
			});
		});
	},

	"revisions": function(config, mongo, req, res) {
		var fields = {"refId": 1,"name": 1, "author": 1, "modified": 1, "v": 1};
		mongo.find(collectionName + "_versioning", {$query: {},$orderby: {'v': -1}}, fields, function(error, response) {
			if(error) { return res.jsonp(req.soajs.buildResponse({'code': 600, 'msg': config.errors['600']})); }
			return res.jsonp(req.soajs.buildResponse(null, response));
		});
	},

	"add": function(config, mongo, req, res) {

		//loop through req.soajs.inputmaskData.config and transform "req" to "required"
		mapPostedConfig(req.soajs.inputmaskData.config);
		req.soajs.inputmaskData.name = req.soajs.inputmaskData.name.toLowerCase().trim().replace(/\s+/g, '_');

		var record = {
			'name': req.soajs.inputmaskData.name,
			'author': req.soajs.session.getUrac().username,
			'genericService': req.soajs.inputmaskData.config.genericService,
			'soajsService': req.soajs.inputmaskData.config.soajsService,
			'soajsUI': req.soajs.inputmaskData.config.soajsUI
		};

		mongo.findOne(collectionName, {'name': record.name}, function(error, response) {
			if(error) { return res.jsonp(req.soajs.buildResponse({'code': 600, 'msg': config.errors['600']})); }
			if(response) { return res.jsonp(req.soajs.buildResponse({'code': 700, 'msg': config.errors['700']})); }

			mongo.insert(collectionName, record, true, function(error) {
				if(error) { return res.jsonp(req.soajs.buildResponse({'code': 600, 'msg': config.errors['600']})); }
				return res.jsonp(req.soajs.buildResponse(null, true));
			})
		});
	},

	"update": function(config, mongo, req, res) {
		validateId(mongo, req, function(error) {
			if(error) { return res.jsonp(req.soajs.buildResponse({'code': 701, 'msg': config.errors['701']})); }

			//loop through req.soajs.inputmaskData.config and transform "req" to "required"
			mapPostedConfig(req.soajs.inputmaskData.config);

			mongo.findOne(collectionName, {'_id': req.soajs.inputmaskData.id}, function(error, oldServiceConfig) {
				if(error) { return res.jsonp(req.soajs.buildResponse({'code': 600, 'msg': config.errors['600']})); }
				if(!oldServiceConfig) { return res.jsonp(req.soajs.buildResponse({'code': 702, 'msg': config.errors['702']})); }

				//check if the IMFV configuration have changed
				var oldIMFV = oldServiceConfig.genericService.config.schema.commonFields;
				var newIMFV = req.soajs.inputmaskData.config.genericService.config.schema.commonFields;
				var newVersion = compareIMFV(oldIMFV, newIMFV);
				if(!newVersion) {
					//check if apis inputs have changed
					var oldAPIFields = oldServiceConfig.genericService.config.schema;
					var newAPIFields = req.soajs.inputmaskData.config.genericService.config.schema;
					newVersion = compareAPISFields(oldAPIFields, newAPIFields);
					if(!newVersion) {
						//check if apis workflow have changed
						var oldAPIWF = oldServiceConfig.soajsService.apis;
						var newAPIWF = req.soajs.inputmaskData.config.soajsService.apis;
						newVersion = compareAPIs(oldAPIWF, newAPIWF);
						if(!newVersion) {
							//check if ui is different
							var oldAPIUI = oldServiceConfig.soajsUI;
							var newAPIUI = req.soajs.inputmaskData.config.soajsUI;
							newVersion = compareUI(oldAPIUI, newAPIUI);
						}
					}
				}

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
					function(error) {
						if(error) { return res.jsonp(req.soajs.buildResponse({'code': 600, 'msg': config.errors['600']})); }
						return res.jsonp(req.soajs.buildResponse(null, true));
					}
				];

				if(newVersion) {
					mongo.update(updateArgs[0], updateArgs[1], updateArgs[2], true, updateArgs[3]);
				}
				else {
					mongo.update(updateArgs[0], updateArgs[1], updateArgs[2], updateArgs[3]);
				}
			});
		});
	}
};