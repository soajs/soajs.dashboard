'use strict';
var BL = {
	model: null,
	"test": function (config, req, res) {
		
		
		/**
		 var msg = "";
		 var data = {
			"deleted": true,
			"test": 123
		};
		 
		 var miniSchema = {
			"required": false,
			"type": "number"
		};
		 var x = new req.soajs.validator.Validator();
		 
		 
		 x.addSchema(miniSchema, "test");
		 var status = x.validate(data, miniSchema);
		 if (!status.valid) {
			x
			status.errors.forEach(function (err) {
				msg = msg + err.stack + ". ";
			});
			console.log(JSON.stringify(msg, null, 2));// 2del
		}
		 console.log(JSON.stringify(status, null, 2));// 2del
		 
		 */
		console.log(JSON.stringify("*************************", null, 2));// 2del
		console.log(JSON.stringify("*************************", null, 2));// 2del
		console.log(JSON.stringify("*************************", null, 2));// 2del
		
		
		var data = req.soajs.inputmaskData.data;
		console.log(JSON.stringify("--------", null, 2));// 2del
		console.log(JSON.stringify(data.input, null, 2), "\n\r", JSON.stringify(data.imfv));// 2del
		console.log(JSON.stringify("--------", null, 2));// 2del
		
		console.log(JSON.stringify("Elements", null, 2));// 2del
		
		var myValidator = new req.soajs.validator.Validator();
		var imfv = data.imfv;
		console.log(JSON.stringify(imfv, null, 2));// 2del
		Object.keys(imfv).forEach(function (key) {
			var val = imfv[key];
			
			console.log(JSON.stringify("Now validating ", null, 2), key, " with ");// 2del
			console.log(JSON.stringify(val, null, 2));// 2del
			
			if (data.input[key]) {
				console.log(key, "exists and equal to ", data.input[key]);// 2del
				var status = myValidator.validate(data.input[key], val.validation);
				if (!status.valid) {
					status.errors.forEach(function (err) {
						msg = msg + err.stack + ". ";
					});
					console.log(JSON.stringify(msg, null, 2));// 2del
				}
			}
			
			
		});
		
		
		// return res.jsonp(req.soajs.buildResponse({code: 0, error: msg}, null));
		/*
		 console.log(JSON.stringify("-------- now validate ----------", null, 2));// 2del
		 
		 var status = myValidator.validate(data.input, data.imfv);
		 if (!status.valid) {
		 status.errors.forEach(function (err) {
		 msg = msg + err.stack + ". ";
		 });
		 console.log(JSON.stringify(msg, null, 2));// 2del
		 return res.jsonp(req.soajs.buildResponse({code: 0, error: msg}, null));
		 }
		 console.log(JSON.stringify(status, null, 2));// 2del
		 
		 */
		
		
		return res.jsonp(req.soajs.buildResponse(null, {"test": true}));
	}
};
/**
 * no need for a model or db connection for this api to work
 * @type {{init: module.exports.init}}
 */
module.exports = {
	"init": function (modelName, cb) {
		return cb(null, BL);
	}
};