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
		"image": "soajsorg/filebeat",
		"workDir": "/",
		"network": "soajsnet",
		"replication": {
			"mode": "global",
			"replicas": 1
		},
		"volume": [
			{
				"Type": "volume",
				"ReadOnly": false,
				"Source": "soajs-filebeat",
				"Target": "/usr/share/filebeat/bin/data"
			},
			{
				"Type": "volume",
				"ReadOnly": false,
				"Source": "soajs_log_volume",
				"Target": "/var/log/soajs/"
			}],
		"restartPolicy": {
			"condition": "on-failure",
			"maxAttempts": 15
		}
	}
};
