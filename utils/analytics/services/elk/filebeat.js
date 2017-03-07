'use strict';
module.exports = {
	"env": "%env%",
	"name": "%env%-filebeat",
	"variables": [
		"SOAJS_ENV=%env%",
		'SOAJS_LOGSTASH_HOST=%env%-logstash',
		'SOAJS_LOGSTASH_PORT=12201'
	],
	"labels": {
		"soajs.content": "true",
		"soajs.service.name": "%env%-filebeat", //"%env%-filebeat"??
		"soajs.service.group": "elk",
		"soajs.service.label": "%env%-filebeat",
		"soajs.env.code": "%env%",
		"soajs.service.type": "elk"
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
				"published": 12201,
				"target": 12201
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
