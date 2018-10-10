"use strict";
const schema = require("../../../schemas/restrictions.js");

let lib = {
	"validate": (validator, template, schema, cbMain) => {
		let myValidator = new validator.Validator();
		let status = myValidator.validate(template, schema);
		if (!status.valid) {
			let errors = [];
			status.errors.forEach(function (err) {
				errors.push({
					code: 173,
					msg: err.stack
				});
			});
			return cbMain(errors);
		}
		else {
			return cbMain(null, true);
		}
	},
	
	"validateEnvironmentRestrictions": (req, cbMain) => {
		switch(req.soajs.inputmaskData.data.envType) {
			case "manual":
				lib.validate(req.soajs.validator, req.soajs.inputmaskData, schema.manual, cbMain);
				break;
			case "container":
				lib.validate(req.soajs.validator, req.soajs.inputmaskData, schema.container, cbMain);
				break;
			case "singleInfra":
				lib.validate(req.soajs.validator, req.soajs.inputmaskData, schema.singleInfra, cbMain);
				break;
			default:
				return cbMain(new Error({
					code: 400,
					msg: "Invalid EnvType!"
				}))
		}
	}
};

module.exports = lib;