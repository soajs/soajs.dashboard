'use strict';
var async = require('async');
var BL = {
	model: null,
	"test": function (config, req, res) {
		
		
		console.log(JSON.stringify("*************************", null, 2));// 2del
		console.log(JSON.stringify("*************************", null, 2));// 2del
		console.log(JSON.stringify("*************************", null, 2));// 2del
		
		
		var data = req.soajs.inputmaskData.data;
		//console.log(JSON.stringify("--------", null, 2));// 2del
		//console.log(JSON.stringify(data.input, null, 2), "\n\r", JSON.stringify(data.imfv));// 2del
		//console.log(JSON.stringify("--------", null, 2));// 2del
		
		//console.log(JSON.stringify("Elements", null, 2));// 2del
		
		var myValidator = new req.soajs.validator.Validator();
		var imfv = data.imfv;
		var errorCount = 0 ;
		var msg ="";
		
		
		/*
		async.forEachOfSeries(imfv, function(value, key, cb) {
			console.log(key + " are " + value);
		});
		*/
		 
		Object.keys(imfv).forEach(function (key) {
			var val = imfv[key];
			
			console.log(JSON.stringify("Now validating ", null, 2), key, " with ");// 2del
			console.log(JSON.stringify(val, null, 2));// 2del
			
			if (data.input[key]) {
				console.log(key, "exists and equal to ", data.input[key]);// 2del
				var status = myValidator.validate(data.input[key], val.validation);
				if (!status.valid) {
					status.errors.forEach(function (err) {
						msg = msg + err.stack.replace("instance",key) + ". ]n]r";
					});
					errorCount++;
					console.log(JSON.stringify(msg, null, 2));// 2del
				}
			}
			else {
				console.log(JSON.stringify(key , null, 2) , " is not in input");// 2del
				if( val.required && val.required ==true){
					// error the instance is required in imfv but not found in data
					console.log(JSON.stringify("but it is required", null, 2));// 2del
					msg = msg + key +" is required"+ ". \n\r";
					console.log(JSON.stringify(msg, null, 2));// 2del
					errorCount++;
				}
			}
			
		});
		if( errorCount > 0){
			console.log(JSON.stringify("we have errors", null, 2));// 2del
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