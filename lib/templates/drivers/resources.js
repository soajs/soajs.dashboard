"use strict";

const driver = {
	
	"check": function (req, context, lib, async, BL, callback) {
		//validate if ci schema is valid
		let template = context.template;
		
		let schema = {
			type: 'object',
			properties: {
				"label": {"type": "string", "required": true},
				"type": {"type": "string", "required": true},
				"category": {"type": "string", "required": true},
				"ui": {"type": "string", "required": false},
				"deploy": {"anyOf": [{"type": "object"}, {"type": "null"}]}
			}
		};
		
		let myValidator = new req.soajs.validator.Validator();
		
		//check if name exists
		if (template.content && template.content.deployments && template.content.deployments.resources && Object.keys(template.content.deployments.resources).length > 0) {
			let resources = Object.keys(template.content.deployments.resources);
			async.eachSeries(resources, (resourceName, cb) => {
				
				let oneResource = template.content.deployments.resources[resourceName];
				let status = myValidator.validate(oneResource, schema);
				if (!status.valid) {
					status.errors.forEach(function (err) {
						context.errors.push({
							code: 173,
							msg: `<b>${resourceName}</b>: ` + err.stack,
							group: "Resources"
						})
					});
				}
				return cb(null, true);
				
			}, callback);
		} else {
			return callback();
		}
	}
};

module.exports = driver;