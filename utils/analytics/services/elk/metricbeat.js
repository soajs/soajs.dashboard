/**
 * Created by ragheb on 4/28/17.
 */
'use strict';
module.exports = {
	"env": "%env%",
	"name": "%env%-metricbeat",
	"variables": [
		"SOAJS_ENV=%env%",
		'ELASTICSEARCH_URL=soajs-analytics-elasticsearch:9200' //add support for kubernetes (add namespace)
	],
	"labels": {
		"soajs.content": "true",
		"soajs.env.code": "%env%",
		"soajs.service.type": "elk",
		"soajs.service.name": "%env%-metricbeat",
		"soajs.service.group": "elk",
		"soajs.service.label": "%env%-metricbeat"
	},
	"deployConfig": {
		"image": "metricbeat-docker",
		//"workDir": "/",
		"memoryLimit": 1000000000,
		"network": "soajsnet",
		"replication": {
			"mode": "replicated",
			"replicas":1
		},
		"volume": {
			"type": "bind",
			"readOnly": true,
			"source": "/var/run/docker.sock",
			"target": "/var/run/docker.sock"
		},
		"restartPolicy": {
			"condition": "any",
			"maxAttempts": 15
		}
	}
};


