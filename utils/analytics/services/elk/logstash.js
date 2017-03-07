'use strict';
module.exports = {
	"env": "%env%",
	"name": "%env%-logstash",
	"variables": [],
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
		"args": ["-c", "chown logstash:logstash /conf/logstash.conf; logstash -f /conf/logstash.conf"]
	},
	"deployConfig": {
		"image": "soajstest/logstash",
		"workDir": "/",
		"memoryLimit": 1000000000,
		"network": "soajsnet",
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

