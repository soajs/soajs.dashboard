'use strict';
var BL = {
	model: null,
	"test": function (config, req, res) {
		
		var msg ="";
		/** woring version **/
		var data = "xx";
		var schema = {"type": "number"};
		var x =  new req.soajs.validator.Validator();
		var status = x.validate(data, schema);
		if (!status.valid) {
			status.errors.forEach(function (err) {
				msg = msg + err.stack + ". ";
			});
			console.log(JSON.stringify(msg, null, 2));// 2del
		}
		console.log(JSON.stringify(status, null, 2));// 2del
		
		console.log(JSON.stringify("*************************", null, 2));// 2del
		console.log(JSON.stringify("*************************", null, 2));// 2del
		console.log(JSON.stringify("*************************", null, 2));// 2del
		
		var data = {
			"deleted": "xxx"
		};
		var schema = {
			"imfv": {
				"custom": {
					"deleted": {
						"required": false,
						"validation": {
							"type": "boolean"
						}
					}
				}
			}
		};
		
		
		var miniSchema =	{
			"required": false,
			"validation": {
				"type": "boolean"
			}
			};
		var x =  new req.soajs.validator.Validator();
		
	
		
		
		var status = x.validate(data, schema);
		if (!status.valid) {
			status.errors.forEach(function (err) {
				msg = msg + err.stack + ". ";
			});
			console.log(JSON.stringify(msg, null, 2));// 2del
		}
		console.log(JSON.stringify(status, null, 2));// 2del
		
		
		
		console.log(JSON.stringify("*************************", null, 2));// 2del
		console.log(JSON.stringify("*************************", null, 2));// 2del
		console.log(JSON.stringify("*************************", null, 2));// 2del
		
		
		var data = req.soajs.inputmaskData.data;
		console.log(JSON.stringify("--------", null, 2));// 2del
		console.log(JSON.stringify(data.input, null, 2) , "<br>", JSON.stringify(data.imfv) );// 2del
		console.log(JSON.stringify("--------", null, 2));// 2del
		var myValidator = new req.soajs.validator.Validator();
		var status = myValidator.validate(data.input, data.imfv);
		if (!status.valid) {
			status.errors.forEach(function (err) {
				msg = msg + err.stack + ". ";
			});
			console.log(JSON.stringify(msg, null, 2));// 2del
			return res.jsonp(req.soajs.buildResponse({code: 0, error: msg}, null));
		}
		console.log(JSON.stringify(status, null, 2));// 2del
		return res.jsonp(req.soajs.buildResponse(null, {"test" :true}));
	}
};
/**
 * no need for a model or db connection for this api to work
 * @type {{init: module.exports.init}}
 */
module.exports = {
	"init": function (modelName , cb) {
		return cb(null, BL);
	}
};