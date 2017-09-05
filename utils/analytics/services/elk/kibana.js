'use strict';
module.exports = {
	"env": "dashboard", //it's only used to get the deployer cluster
	"name": "kibana",
	"variables": [
		'ELASTICSEARCH_URL=http://soajs-analytics-elasticsearch%esNameSpace%:9200' //add support for kubernetes (add namespace)
	],
	"labels": {
		"soajs.content": "true",
		"soajs.service.name": "kibana",
		"soajs.service.type": "system",
		"soajs.service.subtype": "kibana",
		"soajs.service.group": "elk",
		"soajs.service.label": "kibana",
		"soajs.service.mode": "replicated"
	},
	"deployConfig": {
		"version": "5.3.0",
		"image": "soajsorg/kibana",
		"workDir": "/",
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

