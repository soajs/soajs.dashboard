"use strict";

let commonContentSchema = {
	"type": "object",
	"required": false,
	"properties": {
		"data": {
			"type": "array",
			"items": {
				"type": "object",
				"required": true
			},
			"minItems": 1,
			"uniqueItems": true
		}
	}
};

module.exports = {
	"type": "object",
	"required": true,
	"properties": {
		"name": {"type": "string", "required": true},
		"description": {"type": "string", "required": true},
		"link": {"type": "string", "required": false, "format": "uri"},
		"content": {
			"type": "object",
			"required": false,
			"properties":{
				"recipes": {
					"type": "object",
					"required": false,
					"properties":{
						"ci": {
							"type": "array",
							"required": false,
							"items": {
								"type": "object",
								"required": true
							},
							"minItems": 1,
							"uniqueItems": true
						},
						"deployment": {
							"type": "array",
							"required": false,
							"items": {
								"type": "object",
								"required": true
							},
							"minItems": 1,
							"uniqueItems": true
						}
					}
				},
				"endpoints": commonContentSchema,
				"custom_registry": commonContentSchema,
				"productization": commonContentSchema,
				"tenant": commonContentSchema,
				"secrets": commonContentSchema,
			}
		},
		"deploy": {
			"type": "object",
			"required": false,
			"properties": {
				"database": {
					"type": "object",
					"required": false
				},
				"deployment": {
					"type": "object",
					"required": false
				}
			}
		},
	}
};