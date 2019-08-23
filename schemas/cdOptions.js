'use strict';

module.exports = {
    "recipe": {
		"type": "string", "required": true,
	},
	"gitSource": {
		"type": "object",
		"required": true,
		"properties": {
			"owner": {"required": true, "type": "string"},
			"repo": {"required": true, "type": "string"},
			"branch": {"required": true, "type": "string", "minLength": 1},
			"commit": {"required": false, "type": "string"}
		}
	},
	"deployConfig": {
		"type": "object",
		"required": true,
		"properties": {
			"memoryLimit": {"required": false, "type": "number", "default": 209715200},
			"cpuLimit": {"required": false, "type": "string"},
			"isKubernetes": {"required": false, "type": "boolean"}, //NOTE: only required in case of controller deployment
			"replication": {
				"required": true,
				"type": "object",
				"properties": {
					"mode": {
						"required": true,
						"type": "string",
						"enum": ['replicated', 'global', 'deployment', 'daemonset', 'cronJob']
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
			},
			"type": {
				"required": true,
				"type": "string"
			},
			"name": {
				"required": false,
				"type": "string"
			},
			"version": {
				"required": false,
				"type": "string"
			},
			"daemonGroup": {
				"required": false,
				"type": "string"
			},
			"gc": {
				"required": false,
				"type": "object",
				"properties": {
					"gcName": {"required": true, "type": "string"},
					"gcVersion": {"required": true, "type": "number"}
				}
			},
			"secrets": {
				"type": "array",
				"required": false,
				"items":{
					"type": "object",
					"required": true,
					"properties":{
						"name": {"type":"string", "required": true},
						"type": {"type":"string", "required": false},
						"mountPath": {"type":"string", "required": false}
					}
				}
			}
		}
	}
};
