"use strict";


const apisObject = {
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

const granularAcl = {
	"type": "object",
	"required": false,
	"properties": {
		"apis": apisObject
	}
};

const apiGroup = {"type": "array", "items": {"type": "string", "required": true}, "required": false};

const acl = {
	'source': ['body.acl'],
	'required': false,
	'validation': {
		"type": "object",
		"patternProperties": {
			"^[a-zA-Z0-9]+$": {
				"type": "object",
				"patternProperties": {
					"^[^\W\.]+$": {
						"oneOf": [
							{
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
											"get": granularAcl,
											"post": granularAcl,
											"put": granularAcl,
											"delete": granularAcl,
											"head": granularAcl,
											"options": granularAcl,
											"other": granularAcl,
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
							},
							{
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
							}
						]
					}
				},
				"additionalProperties": false
			}
		},
		"additionalProperties": false
	}
};

module.exports = acl;


