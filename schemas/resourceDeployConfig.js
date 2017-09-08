'use strict';

module.exports = {
	"recipe": {
		"type": "string", "required": true,
	},
	"deployConfig": {
		"type": "object",
		"required": true,
		"properties": {
			"memoryLimit": {"required": false, "type": "number", "default": 209715200},
			"cpuLimit": {"required": false, "type": "string"},
			"isKubernetes": {"required": false, "type": "boolean"},
			"replication": {
				"required": true,
				"type": "object",
				"properties": {
					"mode": {
						"required": true,
						"type": "string",
						"enum": ['replicated', 'global', 'deployment', 'daemonset']
					},
					"replicas": {"required": false, "type": "number"}
				}
			}
		}
	},
	"autoScale": {
		"type": "object",
		"required": false,
		"properties": {
			"replicas": {
				"required": true,
				"type": "object",
				"properties": {
					"min": {"required": true, "type": "integer", "min": 1},
					"max": {"required": true, "type": "integer", "min": 1}
				},
				"additionalProperties": false
			},
			"metrics": {
				"required": true,
				"type": "object",
				"properties": {
					"cpu": {
						"required": true,
						"type": "object",
						"properties": {
							"percent": {"required": true, "type": "number"}
						},
						"additionalProperties": false
					}
				},
				"additionalProperties": false
			}
		},
		"additionalProperties": false
	},
	"custom": {
		"type": "object",
		"required": false,
		"properties": {
			"image": {
				"type": "object",
				"required": false,
				"properties": {
					"prefix": {"required": false, "type": "string"},
					"name": {"required": false, "type": "string"},
					"tag": {"required": false, "type": "string"},
				}
			},
			"env": {
				"type": "object",
				"required": false,
				"additionalProperties": {"type": "string"}
			},
			"type": {
				"required": true,
				"type": "string"
			},
			"name": {
				"required": true,
				"type": "string"
			}
		}
	}
};
