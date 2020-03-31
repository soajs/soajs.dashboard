'use strict';

module.exports = {
	"recipe": {
		"type": "string", "required": true,
	},
	"deployConfig": {
		"type": "object",
		"required": true,
		"properties": {
			"memoryLimit": {"required": false, "type": "string"},
			"cpuLimit": {"required": false, "type": "string"},
			"isKubernetes": {"required": false, "type": "boolean"},
			"replication": {
				"required": false,
				"type": "object",
				"properties": {
					"mode": {
						"required": true,
						"type": "string",
						"enum": ['replicated', 'global', 'deployment', 'daemonset']
					},
					"replicas": {"required": false, "type": "number", "minimum": 1}
				}
			},
			"region": {"required": false, "type": "string"},
			"infra": {"required": false, "type": "string"},
			"type": {"required": true, "type": "string", "enum": ["container", "vm"], "default": "container"},
			"vmConfiguration": {
				"required": false,
				"type": "object",
				"properties": {
					"vmLayer": {"required": true, "type": "string"},
					//"group": {"required": false, "type": "string"} --> used by Azure
					//"region": {"required": false, "type": "string"} --> used by AWS
				}
			},
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
			"sourceCode" : {
				"type": "object",
				"required": false,
				"properties" : {
					"configuration" : {
						"type": "object",
						"required": false,
						"properties" : {
							"repo" : {"type": "string", "required": true},
							"branch" : {"type": "string", "required": true},
							"commit" : {"type": "string", "required": false},
							"path" : {"type": "string", "required": false}
						}
					},
					"custom" : {
						"type": "object",
						"required": false,
						"properties" : {
							"repo" : {"type": "string", "required": true},
							"branch" : {"type": "string", "required": true},
							"commit" : {"type": "string", "required": false},
							"path" : {"type": "string", "required": false}
						}
					}
				}
			},
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
				"required": false
			},
			"type": {
				"required": true,
				"type": "string"
			},
			"name": {
				"required": true,
				"type": "string"
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
