/**
 * Created by ragheb on 4/28/17.
 */
'use strict';
module.exports = {
	"env": "dashboard",
	"name": "soajs-metricbeat",
	"variables": [
		'ELASTICSEARCH_URL=soajs-analytics-elasticsearch%esNameSpace%:9200' //add support for kubernetes (add namespace)
	],
	"labels": {
		"soajs.content": "true",
		"soajs.service.type": "elk",
		"soajs.service.name": "soajs-metricbeat",
		"soajs.service.group": "elk",
		"soajs.service.label": "soajs-metricbeat",
		"soajs.service.mode": "global"
	},
	"deployConfig": {
		"image": "soajstest/metricbeat",
		"memoryLimit": 500000000,
		"network": "soajsnet",
		"replication": {
			"mode": "global",
			"replicas":1
		},
		"volume": {
			"type": "bind",
			"readOnly": true,
			"source": "docker-sock",
			"target": "/var/run/docker.sock"
		},
		"restartPolicy": {
			"condition": "any",
			"maxAttempts": 15
		}
	}
};


