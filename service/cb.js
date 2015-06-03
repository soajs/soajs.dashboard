"use strict";
var collectionName = "gc";

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

	var types = ['add','update'];
	types.forEach(function(formType){
		var formConfig = config.soajsUI.form[formType];

		for(var j = 0; j < formConfig.length; j++) {
			for(var field in formConfig[j]) {
				if(formConfig[j][field].req) {
					formConfig[j][field].required = formConfig[j][field].req;
					delete formConfig[j][field].req;
				}
			}
		}
	});


}

module.exports = {

	"list": function(config, mongo, req, res) {
		var fields = {"id": 1, "name": 1, "ts": 1, "modified": 1, "v": 1};
		mongo.find(collectionName, {$query: {}, $orderby: {"ts": -1, "v": -1}}, fields, function(error, response) {
			if(error) { return res.json(req.soajs.buildResponse({'code': 600, 'msg': config.errors['600']})); }
			return res.json(req.soajs.buildResponse(null, response));
		});
	},

	"get": function(config, mongo, req, res) {
		validateId(mongo, req, function(error) {
			if(error) { return res.json(req.soajs.buildResponse({'code': 701, 'msg': config.errors['701']})); }

			var condition = {"_id": req.soajs.inputmaskData.id};
			if(req.soajs.inputmaskData.version && req.soajs.inputmaskData.version !== '') {
				condition['v'] = req.soajs.inputmaskData.version;
			}
			mongo.findOne(collectionName, condition, function(error, response) {
				if(error) { return res.json(req.soajs.buildResponse({'code': 600, 'msg': config.errors['600']})); }
				if(!response) { return res.json(req.soajs.buildResponse({'code': 702, 'msg': config.errors['702']})); }

				return res.json(req.soajs.buildResponse(null, response));
			});
		});
	},

	"revisions": function(config, mongo, req, res) {
		mongo.getCollection(collectionName + "_versioning", function(error, collection) {
			if(error) { return res.json(req.soajs.buildResponse({'code': 600, 'msg': config.errors['600']})); }
			var aggCondition = [
				{
					$group: {
						'name': "$name",
						'versions': {
							$addToSet: "$v"
						}
					}
				},
				{
					$sort: {
						'name': 1
					}
				}
			];
			collection.aggregate(aggCondition, function(error, result) {
				if(error) { return res.json(req.soajs.buildResponse({'code': 600, 'msg': config.errors['600']})); }
				return res.json(req.soajs.buildResponse(null, result));
			});
		});
	},

	"add": function(config, mongo, req, res) {

		//loop through req.soajs.inputmaskData.config and transform "req" to "required"
		mapPostedConfig(req.soajs.inputmaskData.config);
		req.soajs.inputmaskData.name = req.soajs.inputmaskData.name.toLowerCase().trim().replace(/\s+/g,'_');

		var record = {
			'name': req.soajs.inputmaskData.name,
			'author': req.soajs.session.getUrac().username,
			'genericService': req.soajs.inputmaskData.config.genericService,
			'soajsService': req.soajs.inputmaskData.config.soajsService,
			'soajsUI': req.soajs.inputmaskData.config.soajsUI
		};

		mongo.findOne(collectionName, {'name': record.name}, function(error, response){
			if(error) { return res.json(req.soajs.buildResponse({'code': 600, 'msg': config.errors['600']})); }
			if(response){ return res.json(req.soajs.buildResponse({'code': 700, 'msg': config.errors['700']})); }

			mongo.insert(collectionName, record, true, function(error) {
				if(error) { return res.json(req.soajs.buildResponse({'code': 600, 'msg': config.errors['600']})); }
				return res.json(req.soajs.buildResponse(null, true));
			})
		});
	},

	"update": function(config, mongo, req, res) {
		validateId(mongo, req, function(error) {
			if(error) { return res.json(req.soajs.buildResponse({'code': 701, 'msg': config.errors['701']})); }

			//loop through req.soajs.inputmaskData.config and transform "req" to "required"
			mapPostedConfig(req.soajs.inputmaskData.config);

			mongo.findOne(collectionName, {'_id': req.soajs.inputmaskData.id}, function(error, oneServiceConfig){
				if(error) { return res.json(req.soajs.buildResponse({'code': 600, 'msg': config.errors['600']})); }
				if(!oneServiceConfig) { return res.json(req.soajs.buildResponse({'code': 702, 'msg': config.errors['702']})); }


				oneServiceConfig.modified = new Date().getTime();
				//check if the object inputs configuration have changed

				//check if the workflow has changed

				//if change, update with versioning

				//if not change, update without versioning
			});
		});
	}
};