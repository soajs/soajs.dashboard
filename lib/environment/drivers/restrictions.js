"use strict";
const schema = require("../../../schemas/restrictions.js");

let lib = {
	"validate": (validator, schema, cbMain) => {
		let myValidator = new validator.Validator();
		let status = myValidator.validate(template, schema);
		if (!status.valid) {
			let errors = [];
			status.errors.forEach(function (err) {
				errors.push({
					code: 173,
					msg: `Template ${req.soajs.inputmaskData.template.name}: ` + err.stack
				});
			});
			return cbMain(errors);
		}
		else {
			return cbMain(null, true);
		}
	},
	
	"validateEnvironmentRestrictions": (req, cbMain) => {
		
		switch(req.soajs.inputmaskData.envType) {
			case "manual":
				lib.validate(req.soajs.validator, schema.manual, cbMain);
				break;
			case "container":
				lib.validate(req.soajs.validator, schema.container, cbMain);
				break;
			case "singleInfra":
				lib.validate(req.soajs.validator, schema.singleInfra, cbMain);
				break;
		}
		return cbMain();
	}
};

module.exports = lib;