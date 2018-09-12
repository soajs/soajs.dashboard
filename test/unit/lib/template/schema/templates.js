let template1 = {
	
	"name": "NGINX & SOAJS Microservices Environment",
	"description": "bla bla bla",
	"link": "",
	"restriction": {
		"allowInfraReuse": false,
		"deployment": [
			"container"
		]
	},
	"content": {
		"deployments": {
			"repo": {
				"controller": {
					"label": "SOAJS API Gateway",
					"name": "controller",
					"type": "service",
					"category": "soajs",
					"gitSource": {
						"provider": "github",
						"owner": "soajs",
						"repo": "soajs.controller"
					},
					"deploy": {
						"recipes": {
							"available": [],
							"default": "SOAJS API Gateway Recipe"
						},
						"memoryLimit": 500,
						"mode": "replicated",
						"replicas": 1
					}
				}
			},
			"resources": {
				"nginx": {
					"label": "Nginx",
					"type": "server",
					"category": "nginx",
					"ui": "${REF:resources/drivers/server/nginx}",
					"deploy": {
						"recipes": {
							"available": [],
							"default": "Nginx Recipe"
						},
						"memoryLimit": 300,
						"mode": "global"
					}
				}
			}
		}
	},
	
	"deploy": {
		"deployments": {
			"pre": {},
			"steps": {
				"deployments.repo.controller": {}
			},
			"post": {
				"deployments.resources.nginx": {}
			}
		}
	}
};

let template2 = {
	"name": "Mongo VM Template - Deploy",
	"type": "_template",
	"description": "This template allows you to deploy an environment with mongodb server running as a virtual machine.",
	"restriction": {
		"deployment": [
			"vm",
			"manual"
		],
		"infra": [
			"azure"
		]
	},
	"content": {
		"recipes": {
			"deployment": [
				{
					"name": "Mongo Recipe VM",
					"type": "cluster",
					"subtype": "mongo",
					"description": "This recipe allows you to deploy a mongo server in VM",
					"restriction": {
						"deployment": [
							"vm"
						],
						"infra": [
							"azure"
						]
					},
					"recipe": {
						"deployOptions": {
							"image": {
								"prefix": "Canonical",
								"name": "UbuntuServer",
								"tag": "17.10"
							},
							"sourceCode": {
								"configuration": {
									"label": "Attach Custom Configuration",
									"repo": "",
									"branch": "",
									"required": false
								}
							},
							"readinessProbe": {
								"httpGet": {
									"path": "/",
									"port": 27017
								},
								"initialDelaySeconds": 5,
								"timeoutSeconds": 2,
								"periodSeconds": 5,
								"successThreshold": 1,
								"failureThreshold": 3
							},
							"restartPolicy": {
								"condition": "any",
								"maxAttempts": 5
							},
							"container": {
								"network": "soajsnet",
								"workingDir": ""
							},
							"voluming": [],
							"ports": [
								{
									"name": "ssh",
									"target": 22,
									"isPublished": true,
									"published": 22
								},
								{
									"name": "mongo",
									"target": 27017,
									"isPublished": true,
									"published": 27017
								}
							],
							"certificates": "none"
						},
						"buildOptions": {
							"env": {},
							"cmd": {
								"deploy": {
									"command": [
										"#!/bin/bash"
									],
									"args": [
										"sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 2930ADAE8CAF5059EE73BB4B58712A2291FA4AD5\r\n echo \"deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.6 multiverse\" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.6.list\r\n sudo echo never > /sys/kernel/mm/transparent_hugepage/enabled\r\n sudo echo never > /sys/kernel/mm/transparent_hugepage/defrag\r\n sudo grep -q -F 'transparent_hugepage=never' /etc/default/grub || echo 'transparent_hugepage=never' >> /etc/default/grub\r\n sudo apt-get -y update\r\n sudo bash -c \"sudo echo net.ipv4.tcp_keepalive_time = 120 >> /etc/sysctl.conf\"\r\n sudo apt-get install -y mongodb-org\r\n sudo mkdir -p /data/db/\r\n sudo sed -i -e 's/bindIp: 127.0.0.1/bindIp: 0.0.0.0/g' /etc/mongod.conf\r\n sudo service mongod restart\r\n"
									]
								}
							}
						}
					}
				}
			]
		},
		"deployments": {
			"resources": {
				"mongo": {
					"label": "Mongo VM",
					"ui": "${REF:resources/drivers/cluster/mongo}",
					"type": "cluster",
					"category": "mongo",
					"deploy": {
						"recipes": {
							"default": "Mongo Recipe VM",
							"available": [
								"Mongo Recipe VM"
							]
						}
					},
					"config": {}
				}
			}
		}
	},
	"deploy": {
		"deployments": {
			"pre": {},
			"steps": {
				"deployments.resources.mongo": {}
			},
			"post": {}
		}
	}
};

module.exports = {
	test2: template2,
	test1: template1
};