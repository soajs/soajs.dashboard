'use strict';
var async = require('async');
var BL = {
	model: null,
	"test": function (config, req, res) {
		
		
		console.log(JSON.stringify("*************************", null, 2));// 2del
		console.log(JSON.stringify("*************************", null, 2));// 2del
		console.log(JSON.stringify("*************************", null, 2));// 2del
		
		
		var data = req.soajs.inputmaskData.data;
		var myValidator = new req.soajs.validator.Validator();
		var imfv = data.imfv;
		var errorCount = 0 ;
		var msg =[];
		
		
		/*
		async.forEachOfSeries(imfv, function(value, key, cb) {
			console.log(key + " are " + value);
		});
		*/
		 
		Object.keys(imfv).forEach(function (key) {
			var val = imfv[key];
			if (data.input[key]) {
				var status = myValidator.validate(data.input[key], val.validation);
				if (!status.valid) {
					status.errors.forEach(function (err) {
						msg[errorCount]=  err.stack.replace("instance",key) + ". ]n]r";
					});
					errorCount++;
				}
			}
			else {
				if( val.required && val.required ==true){
					// error the instance is required in imfv but not found in data
					msg[errorCount]= key +" is required"+ ". \n\r";
					errorCount++;
				}
			}
			
		});
		if( errorCount > 0){
			console.log(JSON.stringify("we have errors", null, 2));// 2del
			console.log(JSON.stringify(msg, null, 2));// 2del
			// return res.jsonp(req.soajs.buildResponse({code: errorCount, error: msg}, null));
		}
		 
		console.log(JSON.stringify("*************************", null, 2));// 2del
		console.log(JSON.stringify("*************************", null, 2));// 2del
		console.log(JSON.stringify("*************************", null, 2));// 2del
		return res.jsonp(req.soajs.buildResponse(null,imfv));
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