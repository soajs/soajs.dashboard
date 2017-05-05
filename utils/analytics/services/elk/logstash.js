'use strict';
module.exports = {
	"env": "%env%",
	"name": "%env%-logstash",
	"variables": [
		'ELASTICSEARCH_URL=soajs-analytics-elasticsearch:9200'
	],
	"labels": {
		"soajs.content": "true",
		"soajs.env.code": "%env%",
		"soajs.service.type": "elk",
		"soajs.service.name": "%env%-logstash",
		"soajs.service.group": "elk",
		"soajs.service.label": "%env%-logstash"
	},
	"command": {
		"cmd": ["bash"],
		"args": ["-c", "logstash -f /usr/share/logstash/config/logstash.conf"]
	},
	"deployConfig": {
		"image": "soajstest/logstash",
		"workDir": "/",
		"memoryLimit": "1000000000",
		"network": "deployment",
		"replication": {
			"mode": "global",
			"replicas":1
		},
		"restartPolicy": {
			"condition": "any",
			"maxAttempts": 15
		}
	}
};

