'use strict';
module.exports = {
	"env": "dashboard", //it's only used to get the deployer cluster
	"name": "elasticsearch",
	"variables": [],
	"labels": {
		"soajs.service.type": "elk",
		"soajs.service.name": "elasticsearch",
		"soajs.service.group": "elk",
		"soajs.service.label": "elasticsearch"
	},
	"command": {
		"cmd": ["bash -c /usr/share/elasticsearch/bin/plugin install delete-by-query; elasticsearch -Des.insecure.allow.root=true;"],
		//"cmd": ["elasticsearch"],
		"args": ["-Des.insecure.allow.root=true"]
	},
	"deployConfig": {
		"image": "elasticsearch:2.4.1",
		"workDir": "/",
		"memoryLimit": 524288000,
		"network": "soajsnet",
		"ports": [
			{
				"isPublished": true,
				"published": 9200,
				"target": 9200
			}
		],
		"volume": {
			"type": "volume",
			"readOnly": false,
			"source": "elasticsearch-volume",
			"target": "/usr/share/elasticsearch/data"
		},
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
