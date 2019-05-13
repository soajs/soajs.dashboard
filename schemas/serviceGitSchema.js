let schema = {
	"type": "object",
	"required": true,
	"properties": {
		"type": {
			"type": "string",
			"enum": ["service", "daemon"],
			"required": true
		},
		"serviceVersion": {
			"oneOf": [
				{
					"type": "number",
					"required": true
				},
				{
					"type": "string",
					"required": true
				}
			]
		},
		"serviceName": {"type": "string", "minLength": "3", "required": true, "pattern": /^[a-z0-9\-]+$/},
		"serviceGroup": {"type": "string", "minLength": "3", "required": true},
		"servicePort": {"type": "integer", "min": 4100, "required": true},
		"prerequisites": {"type": "object", "required": false},
		"maintenance": {
			"type": "object",
			"required": true,
			"properties": {
				"port": {
					"type": "object",
					"required": true
				},
				"readiness": {
					"type": "string",
					"required": true
				}
			},"additionalProperties": false
		},
		"requestTimeout": {"type": "integer", "min": 10, "required": false},
		"requestTimeoutRenewal": {"type": "integer", "max": 10, "required": false},
		"extKeyRequired": {"type": "boolean", "required": false},
		"session": {"type": "boolean", "required": false},
		"oauth": {"type": "boolean", "required": false},
		"urac": {"type": "boolean", "required": false},
		"urac_Profile": {"type": "boolean", "required": false},
		"urac_ACL": {"type": "boolean", "required": false},
		"provision_ACL": {"type": "boolean", "required": false},
		"multitenant": {"type": "boolean", "required": false},
		"description": {"type": "string", "required": false},
		"program": {"type": "array", "required": false},
		"tab": {
			"type": "object",
			"properties": {
				"main": {"type": "string", "required": true},
				"sub": {"type": "string", "required": true}
			},
			"required": false
		},
		"attributes": {
			"type": "object",
			"properties": {
				"clients": {"type": "array", "required": true},
				"backend": {"type": "array", "required": true}
			},
			"required": false
		}
	}
};

module.exports = schema;