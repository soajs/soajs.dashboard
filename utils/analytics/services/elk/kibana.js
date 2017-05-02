'use strict';
module.exports = {
	"env": "dashboard", //it's only used to get the deployer cluster
	"name": "kibana",
	"variables": [],
	"labels": {
		"soajs.content": "true",
		"soajs.service.name": "kibana",
		"soajs.service.group": "elk",
		"soajs.service.label": "kibana"
	},
	"command": {
		"cmd": ["kibana"]
	},
	"deployConfig": {
		"version": "5.3.0",
		"image": "kibana:5.3.0",
		"workDir": "/",
		"memoryLimit": 209715200,
		"network": "soajsnet",
		"ports": [
			{
				"isPublished": true,
				"published": 32601,
				"target": 5601
			}
		],
		"replication": {
			"mode": "replicated",
			"replicas":1
		},
		"restartPolicy": {
			"condition": "any",
			"maxAttempts": 15
		}
	}
};

