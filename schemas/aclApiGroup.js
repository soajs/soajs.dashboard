"use strict";

const apiGroup = {"type": "array", "items": {"type": "string", "required": true}, "required": false};

const aclApi = {
	"type": "array",
	"minItems": 1,
	"items": {
		"type": "object",
		"required": false,
		"properties": {
			"access": {"type": "boolean", "required": false},
			"version": {"type": "string", "required": false},
			"apisPermission": {
				"type": "string", "enum": ["restricted"], "required": false
			},
			"get": apiGroup,
			"post": apiGroup,
			"put": apiGroup,
			"delete": apiGroup,
			"head": apiGroup,
			"options": apiGroup,
			"other": apiGroup,
			"additionalProperties": false
		},
		"additionalProperties": false
	},
	"required": false
};

module.exports = aclApi;