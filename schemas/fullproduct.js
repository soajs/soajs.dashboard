module.exports = {
	"type":"object",
	"required": true,
	"additionalProperties": false,
	"properties":{
		"code": {"required": true, "type": "string", "format": "alphanumeric", "minLength": 4, "maxLength": 6},
		"name": {"required": true, "type": "string"},
		"description": {"required": true, "type": "string"},
		"packages":{
			"type": "array",
			"uniqueItems": true,
			"minItems": 1,
			"items":{
				"type": "object",
				"additionalProperties": false,
				"properties":{
					"code": {"required": true, "type": "string", "format": "alphanumeric", "minLength": 4, "maxLength": 5},
					"name": {"required": true, "type": "string"},
					"description": {"required": true, "type": "string"},
					"_TTL": {"type": "number", "min": 1, "required": true},
					"acl": {"type": "object", "required": true}
				}
			}
		}
	}
};