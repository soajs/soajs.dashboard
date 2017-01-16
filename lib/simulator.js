'use strict';
var async = require('async');
var typeOf = require('typeof');
var BL = {
	model: null,
	/**
	 *
	 * Takes data from the request in the form of object containing data.imfv and data.input
	 * where data.input will be the parameters sent to api under test and
	 * data.imfv be the schema of the api being checked.
	 * @param config
	 * @param req
	 * @param res
	 */
	"test": function (config, req, res) {

		var data = req.soajs.inputmaskData.data;
		var myValidator = new req.soajs.validator.Validator();
		var imfv = data.imfv;
		var errorCount = 0 ;
		var msg =[];

		Object.keys(imfv).forEach(function (key) {
			var val = imfv[key];
			if (data.input[key]) {
				var status = myValidator.validate(data.input[key], val.validation);
				if (!status.valid) {
					status.errors.forEach(function (err) {
						msg[errorCount]=  err.stack.replace("instance",key) + ".";
					});
					errorCount++;
				}
			}
			else {
				if( val.required && val.required ==true){
					// error the instance is required in imfv but not found in data
					msg[errorCount]= key +" is required"+ ".";
					errorCount++;
				}
			}
			// Validating the default value of the given instance
			if( val.default ){
				var status = myValidator.validate(val.default, val.validation);
				if (!status.valid) {
					status.errors.forEach(function (err) {
						msg[errorCount]=  err.stack.replace("instance","Default value of " + key) + ".";
					});
					errorCount++;
				}
			}
			if( !val.source ){
				msg[errorCount]=  key + " has no source";
				errorCount++;
			}
			else{
				if( typeOf(val.source) != "array"){
					msg[errorCount]=  key + " should have a source of type array";
					errorCount++;
				}
				else if( !val.source[0] ){
					msg[errorCount]=  key + " should have at least one source";
					errorCount++;
				}
			}
		});
			
		if( errorCount > 0){
			return res.jsonp(req.soajs.buildResponse({"code": 850, "msg": JSON.stringify(msg)}, null));
		}
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