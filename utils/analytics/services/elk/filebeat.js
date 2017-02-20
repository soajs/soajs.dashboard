'use strict';
module.exports = {
	"env": "%env%",
	"name": "%env%-filebeat",
	"variables": [
		"SOAJS_ENV=%env%",
		"SOAJS_LOGSTASH_HOST=logstash",
		"SOAJS_LOGSTASH_PORT=12202"
	],
	"labels": {
		"soajs.content": "true",
		"soajs.service.name": "filebeat", //"%env%-filebeat"??
		"soajs.service.group": "elk",
		"soajs.service.label": "%env%-filebeat"
	},
	"command": {
		"cmd": ["bash"],
		"args": ["-c", "filebeat -e -d '*' -c /etc/filebeat/filebeat.yml"]
	},
	"deployConfig": {
		"image": "soajstest/filebeat",
		"workDir": "/",
		"memoryLimit": 209715200,
		"network": "soajsnet",
		"ports": [
			{
				"isPublished": true,
				"published": 12202,
				"target": 12202
			}
		],
		"replication": {
			"mode": "global"
		},
		"restartPolicy": {
			"condition": "on-failure",
			"maxAttempts": 15
		}
	}
};
