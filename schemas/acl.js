"use strict";

var apisObject = {
	"type": "object",
	"required": false,
	"patternProperties": {
		"^[_a-z\/][_a-zA-Z0-9\/:]*$": { //pattern to match an api route
			"type": "object",
			"required": true,
			"properties": {
				"access": {"type": "boolean", "required": false},
				"group:": {"type": "string", "required": false}
			}
		}
	}
};

var aclMethod = {
	"type": "object",
	"required": false,
	"properties": {
		"apis": apisObject
	}
};
var acl = {
	'source': ['body.acl'],
	'required': false,
	'validation': {
		"type": "object",
		"patternProperties": {
			"^[a-zA-Z0-9]{3,4}$": {
				"type": "object",
				"patternProperties": {
					"^[^\W\.]+$": {
						"type": "object",
						"required": false,
						"patternProperties": {
							".+": {
								"type": "object",
								"required": false,
								"properties": {
									"access": {"type": "boolean", "required": false},
									"apisPermission": {
										"type": "string", "enum": ["restricted"], "required": false
									},
									"apis": apisObject,
									"get": aclMethod,
									"post": aclMethod,
									"put": aclMethod,
									"delete": aclMethod,
									"head": aclMethod,
									"options": aclMethod,
									"other": aclMethod,
									"apisRegExp": {
										"type": "array",
										"required": false,
										"minItems": 1,
										"items": {
											"type": "object",
											"properties": {
												"regExp": {
													"type": "pattern",
													"required": true,
													"pattern": /\.+/
												},
												"access": {"type": "boolean", "required": false}
											},
											"additionalProperties": false
										}
									},
									"additionalProperties": false
								},
								"additionalProperties": false
							}
						},
						"additionalProperties": false
					}
				},
				"additionalProperties": false
			}
		},
		"additionalProperties": false
	}
};

module.exports = acl;