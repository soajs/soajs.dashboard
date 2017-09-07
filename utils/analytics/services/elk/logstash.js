'use strict';
module.exports = {
	"env": "%env%",
	"name": "%env%-logstash",
	"variables": [
		'ELASTICSEARCH_URL=soajs-analytics-elasticsearch%esNameSpace%:9200'
	],
	"labels": {
		"soajs.content": "true",
		"soajs.env.code": "%env%",
		"soajs.service.type": "system",
		"soajs.service.subtype": "logstash",
		"soajs.service.name": "%env%-logstash",
		"soajs.service.group": "soajs-analytics",
		"soajs.service.label": "%env%-logstash",
		"soajs.service.mode": "replicated"
	},
	"command": {
		"cmd": ["bash"],
		"args": ["-c", "logstash -f /usr/share/logstash/config/logstash.conf"]
	},
	"deployConfig": {
		"image": "soajsorg/logstash",
		"workDir": "/",
		"network": "soajsnet",
		"ports": [
			{
				"isPublished": false,
				"published": 12201,
				"target": 12201
			}
		],
		"replication": {
			"mode": "replicated",
			"replicas": 1
		},
		"restartPolicy": {
			"condition": "any",
			"maxAttempts": 15
		}
	}
};
