"use strict";

let commonContentSchema = {
	"type": "object",
	"required": false,
	"additionalProperties": false,
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

let commonDeploySchema = {
	"type": "object",
	"required": false,
	"additionalProperties": false,
	"properties": {
		"pre": {
			"type": "object",
			"additionalProperties": {
				"type": "object",
				"required": true
			}
		},
		"steps": {
			"type": "object",
			"additionalProperties": {
				"type": "object",
				"required": true
			}
		},
		"post": {
			"type": "object",
			"additionalProperties": {
				"type": "object",
				"required": true
			}
		},
	}
};

let templateRestrictionSchema = {
	"type": "object",
	"required": false,
	"properties": {
		"deployment": {
			"type": "array",
			"items": {
				"type": "string",
				"enum": ["container", "vm", "manual"]
			},
			"required": false,
			"uniqueItems": true
		},
		"driver": {
			"type": "array",
			"items": {
				"type": "string" //container.docker | container.kubernetes ....
			},
			"required": false,
			"uniqueItems": true
		},
		"infra": {
			"type": "array",
			"items": {
				"type": "string"
			},
			"required": false,
			"uniqueItems": true
		}
	},
	"additionalProperties": false
};

module.exports = {
	"type": "object",
	"required": true,
	"properties": {
		"name": {"type": "string", "required": true},
		"description": {"type": "string", "required": true},
		"logo": {"type": "string", "required": false},
		"link": {"type": "string", "required": false, "format": "uri"},
		"reusable" : {"type": "boolean", "required": false},
		"content": {
			"type": "object",
			"required": false,
			"additionalProperties": false,
			"properties": {
				"recipes": {
					"type": "object",
					"required": false,
					"additionalProperties": false,
					"properties": {
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
				"daemonGroups": commonContentSchema,
				"deployments": {
					"type": "object",
					"required": false,
					"additionalProperties": false,
					"properties": {
						"repo": {
							"type": "object",
							"required": false,
							"additionalProperties": {
								"type": "object",
								"required": true
							}
						},
						"resources": {
							"type": "object",
							"required": false,
							"additionalProperties": {
								"type": "object",
								"required": true
							}
						}
					}
				}
			}
		},
		"restriction": templateRestrictionSchema,
		"deploy": {
			"type": "object",
			"required": false,
			"additionalProperties": false,
			"properties": {
				"database": commonDeploySchema,
				"deployments": commonDeploySchema
			}
		}
	},
	"additionalProperties": false
};
