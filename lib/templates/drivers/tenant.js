"use strict";

const driver = {
	
	"check": function (req, context, lib, async, BL, callback) {
		//validate if ci schema is valid
		let template = context.template;
		let schema = require("../../../schemas/fulltenant");
		let myValidator = new req.soajs.validator.Validator();
		
		//check if name exists
		if (template.content && template.content.tenant && template.content.recipes.tenant.data && Array.isArray(template.content.recipes.tenant.data) && template.content.recipes.tenant.data.length > 0) {
			let tenants = template.content.recipes.tenant.data;
			async.eachSeries(tenants, (oneTenant, cb) => {
				let status = myValidator.validate(oneTenant, schema);
				if (!status.valid) {
					status.errors.forEach(function (err) {
						context.errors.push({code: 173, msg: err.stack})
					});
					return cb();
				}
			}, callback);
		} else {
			return callback();
		}
	},
	
};

module.exports = driver;