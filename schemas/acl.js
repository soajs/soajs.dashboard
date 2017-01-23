"use strict";
var accessSchema = {
	"oneOf": [
		{"type": "boolean", "required": false},
		{"type": "array", "minItems": 1, "items": {"type": "string", "required": true}, "required": false}
	]
};

var acl = {
	'source': ['body.acl'],
	'required': false,
	'validation': {
		"type": "object",
		"patternProperties": {
			"^[a-zA-Z0-9]{4}$": {
				"type": "object",
				"additionalProperties": {
					"type": "object",
					"required": false,
					"properties": {
						"access": accessSchema,
						"apisPermission": {
							"type": "string", "enum": ["restricted"], "required": false
						},
						"apis": {
							"type": "object",
							"required": false,
							"patternProperties": {
								"^[_a-z\/][_a-zA-Z0-9\/:]*$": { //pattern to match an api route
									"type": "object",
									"required": true,
									"properties": {
										"access": accessSchema
									},
									"additionalProperties": false
								}
							}
						},
						"get": {
							"type": "object",
							"required": false
						},
						"post": {
							"type": "object",
							"required": false
						},
						"put": {
							"type": "object",
							"required": false
						},
						"delete": {
							"type": "object",
							"required": false
						},
						"apisRegExp": {
							"type": "array",
							"required": false,
							"minItems": 1,
							"items": {
								"type": "object",
								"properties": {
									"regExp": {"type": "pattern", required: true, "pattern": /\.+/},
									"access": accessSchema
								},
								"additionalProperties": false
							}
						}
					},
					"additionalProperties": false
				}
			}
		}
	}
};

module.exports = acl;