'use strict';
module.exports = {
	"env": "dashboard", //it's only used to get the deployer cluster
	"name": "logstash",
	"variables": [],
	"labels": {
		"soajs.content": "true",
		"soajs.service.name": "logstash",
		"soajs.service.group": "elk",
		"soajs.service.label": "logstash"
	},
	"command": {
		"cmd": ["bash"],
		"args": ["-c", "chown logstash:logstash /conf/logstash.conf; logstash -f /conf/logstash.conf"]
	},
	"deployConfig": {
		"image": "soajstest/logstash",
		"workDir": "/",
		"memoryLimit": 209715200,
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

