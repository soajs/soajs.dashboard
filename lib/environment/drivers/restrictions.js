"use strict";
const async = require("async");
const schema = require("../../../schemas/restrictions.js");
const soajsUtils = require("soajs").utils;

let lib = {
	"validate": (validator, template, schema, cbMain) => {
		let myValidator = new validator.Validator();
		let status = myValidator.validate(template, schema);
		
		if (!status.valid) {
			let errors = {
				code: 173,
				message: []
			};
			status.errors.forEach(function (err) {
				errors.message.push(err.stack);
			});
			
			if(errors.message.length > 0){
				errors.message = errors.message.join(" - ");
			}
			
			return cbMain(errors);
		}
		else {
			return cbMain(null, true);
		}
	},
	
	"validateEnvironmentRestrictions": (req, templateUsed, cbMain) => {
		
		req.soajs.log.debug("Validating Schema for Environment of type:", req.soajs.inputmaskData.data.envType);
		
		let inputmaskData = soajsUtils.cloneObj(req.soajs.inputmaskData);
		inputmaskData.template.content = soajsUtils.cloneObj(templateUsed.content);
		
		switch(req.soajs.inputmaskData.data.envType) {
			case "manual":
				lib.validate(req.soajs.validator, inputmaskData, schema.manual, cbMain);
				break;
			case "container":
				lib.validate(req.soajs.validator, inputmaskData, schema.container, cbMain);
				break;
			case "singleInfra":
				async.each(schema.singleInfra.oneOf, (oneSchema, vCb) => {
					let testSchema = {
						"type": "object",
						"required": true
					};
					for(let i in oneSchema){
						testSchema[i] = JSON.parse(JSON.stringify(oneSchema[i]));
					}
					lib.validate(req.soajs.validator, inputmaskData, testSchema, vCb);
				}, (error) => {
					return cbMain(error, true);
				});
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