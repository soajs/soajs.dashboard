module.exports = {
	"type": "object",
	"required": true,
	"additionalProperties": false,
	"properties": {
		"code": {"required": true, "type": "string", "format": "alphanumeric", "minLength": 3, "maxLength": 4},
		"type": {"type": "string", "enum": ["admin", "product", "client"]},
		"tag": {"type": "string"},
		"name": {"required": true, "type": "string"},
		"description": {"required": true, "type": "string"},
		"oauth": {
			"anyOf": [
				{
					"type": "object",
					"additionalProperties": false,
					"properties": {
						"secret": {"required": true, "type": "string"},
						"redirectURI": {"required": true, "type": "string"},
						"grants": {
							"type": "array",
							"items": {"type": "string"},
							"minItems": 1,
							"uniqueItems": true
						}
					}
				},
				{"type": "null"}
			]
		},
		"applications": {
			"type": "array",
			"uniqueItems": true,
			"minItems": 1,
			"items": {
				"type": "object",
				"additionalProperties": false,
				"properties": {
					"product": {
						"required": true,
						"type": "string",
						"format": "alphanumeric",
						"minLength": 4,
						"maxLength": 5
					},
					"package": {"required": true, "type": "string", "pattern": "[A-Z0-9_]+"},
					"description": {"required": true, "type": "string"},
					"_TTL": {"type": "number", "min": 1, "required": true},
					"keys": {
						"type": "array",
						"uniqueItems": true,
						"minItems": 1,
						"items": {
							"type": "object",
							"additionalProperties": false,
							"properties": {
								"key": {"required": false, "type": "string"},
								"extKeys": {
									"type": "array",
									"uniqueItems": true,
									"minItems": 1,
									"items": {
										"type": "object",
										"additionalProperties": false,
										"properties": {
											"device": {"anyOf": [{"type": "object"}, {"type": "null"}]},
											"geo": {"anyOf": [{"type": "object"}, {"type": "null"}]},
											"expDate": {"anyOf": [{"type": "string"}, {"type": "null"}]},
											"dashboardAccess": {"type": "boolean"},
										}
									}
								},
								"config": {"type": "object"}
							}
						}
					}
				}
			}
		}
	}
};