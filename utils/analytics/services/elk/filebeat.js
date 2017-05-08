'use strict';
module.exports = {
	"env": "%env%",
	"name": "%env%-filebeat",
	"variables": [
		"SOAJS_ENV=%env%",
		'SOAJS_LOGSTASH_HOST=%env%-logstash%logNameSpace%',
		'SOAJS_LOGSTASH_PORT=12201'
	],
	"labels": {
		"soajs.content": "true",
		"soajs.service.name": "%env%-filebeat",
		"soajs.service.group": "elk",
		"soajs.service.label": "%env%-filebeat",
		"soajs.env.code": "%env%",
		"soajs.service.type": "elk",
		"soajs.service.mode": "global"
	},
	"command": {
		"cmd": ["bash"],
		"args": ["-c", "/usr/share/filebeat/bin/filebeat -e -c /etc/filebeat/filebeat.yml"]
	},
	"deployConfig": {
		"image": "soajstest/filebeat",
		"workDir": "/",
		"memoryLimit": 524288000,
		"network": "soajsnet",
		"replication": {
			"mode": "global",
			"replicas":1
		},
		"volume": {
			"type": "volume",
			"readOnly": false,
			"source": "soajs-filebeat",
			"target": "/usr/share/filebeat/bin/data"
		},
		"restartPolicy": {
			"condition": "on-failure",
			"maxAttempts": 15
		}
	}
};
