"use strict";

var config = {
	"type": "object",
	"required": true,
	"properties": {
		"serviceName": {"type": "string", "minLength": "3", "required": true},
		"servicePort": {"type": "integer", "min": 4100, "required": true},
		"requestTimeout": {"type": "integer", "min": 10},
		"requestTimeoutRenewal": {"type": "integer", "max": 10},
		"extKeyRequired": {"type": "boolean"},
		"awareness": {"type": "boolean"},
		"errors": {
			"type": "object",
			"required": true,
			"patternProperties": {
				"^[0-9]+$": {"type": "string", "required": true, "minLength": 5}
			}
		},
		"schema": {
			"type": "object",
			"required": true,
			"properties": {
				"commonFields": {
					"type": "object",
					"additionalProperties": {
						"type": "object",
						"properties": {
							"required": {"type": "boolean", "required": true},
							"source": {"type": "array", "minItems": 1, "items": {"type": "string"}, "required": true},
							"validation": {
								"type": "object",
								"required": true,
								"additionalProperties": true
							}
						}
					}
				},
				"patternProperties": {
					"^\/[a-zA-Z0-9_\.\-]+$": {
						"type": "object",
						"properties": {
							"_apiInfo": {
								"requried": true,
								"type": "object",
								"properties": {
									"l": {"type": "string", "requried": true},
									"group": {"type": "string", "requried": true},
									"groupMain": {"type": "boolean"}
								}
							},
							"commonFields": {"type": "array", "minItems": 1, "items": {"type": "string"}},
							"additionalProperties": {
								"type": "object",
								"properties": {
									"required": {"type": "boolean", "required": true},
									"source": {"type": "array", "minItems": 1, "items": {"type": "string"}, "required": true},
									"validation": {
										"type": "object",
										"required": true,
										"additionalProperties": true
									}
								}
							}
						}
					}
				}
			}
		}
	}
};

var versionNbr = "^(\\*|[0-9]+(\\.(\\*|[0-9]+))+|[0-9]+(\\.[0-9]+)+(\\-[a-z]+(\\.[0-9]+(\\.)*)*))$";
var pckg = {
	"type": "object",
	"required": true,
	"properties": {
		"name": {"type": "string", "required": true},
		"description": {"type": "string", "required": true},
		"version": {
			"type": "string",
			"required": true,
			"pattern": versionNbr
		},
		"author": {
			"type": "object",
			"required": true,
			"properties": {
				"name": {"type": "string", "required": true},
				"email": {"type": "string", "required": true, "format": "email"},
				"additionalProperties": true
			}
		},
		"repository": {
			"type": "object",
			"required": true,
			"properties": {
				"type": {"type": "string", "required": true},
				"url": {"type": "string", "required": true},
				"additionalProperties": true
			}
		},
		"license": {"type": "string", "required": true},
		"engines": {
			"type": "object",
			"required": true,
			"properties": {
				"node": {"type": "string", "required": true},
				"additionalProperties": true
			}
		},
		"scripts": {
			"type": "object",
			"required": false,
			"properties": {
				"test": {"type": "string", "required": true},
				"additionalProperties": true
			}
		},
		"devDependencies": {
			"type": "object",
			"required": false,
			"additionalProperties": {
				"type": "string",
				"required": true,
				"pattern": versionNbr
			}
		},
		"dependencies": {
			"type": "object",
			"required": true,
			"additionalProperties": {
				"type": "string",
				"required": true,
				"pattern": versionNbr
			}
		}

	}
};

module.exports = {
	"config": config,
	"package": pckg
};