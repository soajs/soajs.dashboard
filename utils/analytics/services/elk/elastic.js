'use strict';

var annotation = [
	{
		"name": "sysctl",
		"image": "busybox",
		"imagePullPolicy": "IfNotPresent",
		"command": ["sysctl", "-w", "vm.max_map_count=262144"],
		"securityContext": {
			"privileged": true
		}
	}
];
module.exports = {
	"env": "dashboard",
	"name": "soajs-analytics-elasticsearch",
	"variables": [],
	"labels": {
		"soajs.service.type": "elk",
		"soajs.service.name": "soajs-analytics-elasticsearch",
		"soajs.service.group": "elk",
		"soajs.service.label": "soajs-analytics-elasticsearch",
		"soajs.service.mode": "replicated"
	},
	"deployConfig": {
		"image": "elasticsearch:alpine",
		"memoryLimit": 2000000000,
		"network": "soajsnet",
		"ports": [
			{
				"isPublished": true,
				"published": 9200,
				"target": 9200
			}
		],
		"annotations": {
			"pod.beta.kubernetes.io/init-containers": JSON.stringify(annotation)
		},
		"volume": {
			"type": "volume",
			"readOnly": false,
			"source": "elasticsearch-volume",
			"target": "/usr/share/elasticsearch/data"
		},
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
