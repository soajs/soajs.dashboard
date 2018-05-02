let template = {
	
	"name": "My Custom Template",
	"description": "bla bla bla",
	"link": "",
	
	"content": {
		"recipes": {
			"ci": [
				{
					"name": "Java Recipe",
					"provider": "travis",
					"type": "recipe",
					"locked": true,
					"recipe": "language: java\nsudo: false\ninstall: true\njdk: oraclejdk8\nafter_success:\n    - 'node ./soajs.cd.js'\n"
				}
			],
			"deployment": [
				{
					"name": "DAAS Service Recipe",
					"recipe": {
						"deployOptions": {},
						"buildOptions": {}
					},
					"type": "service",
					"subtype": "soajs",
					"technology": "kubernetes",
					"description": "This is the service catalog recipe used to deploy the core services in the dashboard environment."
				}
			]
		},
		
		"custom_registry": {
			"data": [
				{
					"name": "ciConfig",
					"value": {
						"apiPrefix": "cloud-api",
						"domain": "herrontech.com",
						"protocol": "https",
						"port": 443
					}
				},
				{
					"name": "ciConfig2",
					"value": "string value here ..."
				},
				{
					"name": "ciConfig3",
					"value": {
						"apiPrefix": "dashboard-api",
						"domain": "soajs.org",
						"protocol": "https",
						"port": 443
					}
				}
			]
		},
		
		"productization": {
			"data": [
				{
					"code": "PORTAL",
					"name": "Portal Product",
					"description": "Portal Product Description",
					"packages": [
						{
							"code": "BASIC",
							"name": "Basic Package",
							"description": "Basic Package Description",
							"TTL": 6 * 36000 * 1000,
							"acl": {
								"oauth": {/*...*/},
								"urac": {/*...*/},
								"daas": {/*...*/}
							}
						},
						{
							"code": "MAIN",
							"name": "Main Package",
							"description": "Main Package Description",
							"TTL": 6 * 3600 * 1000,
							"acl": {/*...*/}
						}
					]
				}
			]
		},
		
		"tenant": {
			"data": [
				{
					"code": "PRTL",
					"name": "Portal Tenant",
					"description": "Portal Tenant Description",
					"oauth": {/*...*/},
					"applications": [
						{
							"product": "PRTAL",
							"package": "PRTAL_MAIN",
							"description": "Portal main application",
							"_TTL": 7 * 24 * 3600 * 1000,
							"acl": {/***/},
							"keys": [
								{
									"extKeys": [
										{
											"device": {},
											"geo": {},
											"dashboardAccess": false,
											"expDate": null
										}
									],
									"config": {/***/}
								}
							]
						},
						{
							"product": "PRTAL",
							"package": "PRTAL_USER",
							"description": "Portal Logged In user Application",
							"_TTL": 7 * 24 * 3600 * 1000,
							"acl": {/***/},
							"keys": [
								{
									"extKeys": [
										{
											"device": {},
											"geo": {},
											"dashboardAccess": true,
											"expDate": null
										}
									],
									"config": {/***/}
								}
							]
						}
					]
				}
			]
		},
		
		"secrets": {
			"data": [
				{
					"name": "nginx-certs",
					"namespace": "soajs"
				}
			]
		},

		"daemonGroups" : {
			"data" : [{
				"groupName" : "test",
                "daemon": "helloDaemon",
                "status": 1,
				"processing" : "parallel",
                "interval": 1800000,
				"order": ["test"],
				"solo" : false,
                "jobs": {
                    "hello": {
                        "type": "global",
                        "serviceConfig": {
                            "mike": "test"
                        },
                        "tenantExtKeys": []
                    }
                }
            }]
		},
		
		"deployments": {
			"repo": {
				"controller": {
					"label": "SOAJS API Gateway",
					"name": "controller",
					"type": "service",
					"category": "soajs",
					"deploy": {
						"recipes": {
							"available": ["SOAJS Controller Recipe"], //reduce available recipes to what is restricted by this list
						},
						"memoryLimit": 500,
						"mode": "replicated",
						"replicas": 1,
						"cpu": 0.5
					},
				},
				"urac": {
					"label": "User Registration & ACL",
					"name": "urac",
					"type": "service",
					"category": "soajs",
					"deploy": {
						"recipes": ["SOAJS Service Recipe"],
						"memoryLimit": 500,
						"mode": "replicated",
						"replicas": 1,
						"cpu": 0.5
					}
				},
				"my_service": {
					"label": "My Custom Made Service",
					"name": "test",
					"type": "daemon",
					"group" : "test",
					"category": "soajs",
					"deploy": {
						"recipes": ["SOAJS Service Recipe"],
						"memoryLimit": 500,
						"mode": "replicated",
						"replicas": 1,
						"cpu": 0.5
					},
					"strategy": "update"
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
							"available": ["Nginx Recipe with SSL", "Nginx Recipe"],
							"default": "Nginx Recipe with SSL"
						},
						"memoryLimit": 500,
						"mode": "global",
						"cpu": 0.5,
						"secrets": "nginx-certs"
					}
				},
				"external": {
					"label": "External Mongo",
					"type": "cluster",
					"category": "mongo",
					"limit": 2, //define how many resources you want
					"ui": "${REF:resources/drivers/cluster/mongo}",
					"deploy": null
				},
				"local": {
					"label": "Local Mongo",
					"limit": 3, //define how many resources you want
					"ui": "${REF:resources/drivers/cluster/mongo}",
					"type": "cluster",
					"category": "mongo",
					"deploy": {
						"recipes": "MongoDB Recipe",
						"memoryLimit": 500,
						"mode": "replicated",
						"replicas": 1,
						"cpu": 0.5
					}
				}
			}
		}
	},
	
	"deploy": {
		"database": {
			"pre": {
				"custom_registry": {
					"imfv": [
						{
							"name": "ciConfig",
							"locked": true,
							"plugged": false,
							"shared": true,
							"value": {
								"test": true
							},
						},
						{
							"name": "ciConfig2",
							"locked": true,
							"plugged": false,
							"shared": true,
							"value": {
								"test": true
							},
						},
						{
							"name": "ciConfig3",
							"locked": true,
							"plugged": false,
							"shared": true,
							"value": {
								"test": true
							},
						}
					],
					"status": {
						"done": true,
						"data": [
							{
								"name": "ciConfig"
							},
							{
								"name": "ciConfig2"
							},
							{
								"name": "ciConfig3"
							}
						]
					}
				},
			},
			"steps": {
				"productization": {
					"ui": {
						"readonly": true
					}
				},
				
				"tenant": {
					"ui": {
						"readonly": true
					}
				}
			},
			"post": {
				"deployments.resources.external": {
					"imfv": [
						{
							"name": "localmongo",
							"type": "cluster",
							"category": "mongo",
							"locked": false,
							"shared": false,
							"plugged": false,
							"config": {
								"username": "username",
								"password": "pwd"
							}
						}
					],
					"status":{
						"done": true,
						"data":[
							{
								"db": "mongo id of this resource"
							}
						]
					}
				},
			}
		},
		
		"deployments": {
			"pre": {
				"infra.cluster.deploy": {
					"imfv" : [
						{
							"command":{
								"method" : "post",
								"routeName" : "/bridge/executeDriver",
								"data" : {
									"type" : "infra",
									"name" : "google",
									"driver" : "google",
									"command" : "deployCluster",
									"project" : "demo",
									"options" : {
										"region" : "us-east1-b",
										"workernumber" : 3,
										"workerflavor" : "n1-standard-2",
										"regionLabel" : "us-east1-b",
										"technology" : "kubernetes",
										"envCode" : "PORTAL"
									}
								}
							},
							"check" : {
								"id" : {
									"type" : "string",
									"required": true
								}
							}
						},
						{
							"recursive" : {
								"max" : 5,
								"delay": 300
							},
							"check" : {
								"id" : {
									"type" : "string",
									"required": true
								},
								"ip" : {
									"type" : "string",
									"required": true
								}
							},
							"command": {
								"method" : "post",
								"routeName" : "/bridge/executeDriver",
								"data" : {
									"type" : "infra",
									"name" : "google",
									"driver" : "google",
									"command" : "getDeployClusterStatus",
									"project" : "demo",
									"options" : {
										"envCode" : "PORTAL"
									}
								}
							}
						}
					],
					"status": {
						"done": true,
						"data": {
							"id": "kaza",
							"ip": "kaza",
							"dns": { "a":"b" }
						},
						"rollback" : {
							"command":{
								"method" : "post",
								"routeName" : "/bridge/executeDriver",
								"params": {},
								"data" : {
									"type" : "infra",
									"name" : "google",
									"driver" : "google",
									"command" : "deleteCluster",
									"project" : "demo",
									"options" : {
										"envCode" : "PORTAL",
										"force" : true
									}
								}
							}
						}
					},
				}
			},
			"steps": {
				"deployments.secrets.nginx": {
					"imfv": [
						{
							"name": "nginx-certs",
							"namespace": "soajs",
							"type": "Generic",
							"data": "something in secret",
						}
					],
					"status": {
						"done": true,
						"data": [
							{
								"name": "nginx-certs",
								"namespace": "soajs"
							}
						]
					}
				},
				
				"deployments.resources.local": {
					"imfv": [
						{
							"name": "localmongo",
							"type": "cluster",
							"category": "mongo",
							"locked": false,
							"shared": false,
							"plugged": false,
							"config": {
								"username": "username",
								"password": "pwd"
							},
							"deploy": {
								"options" : {
									"deployConfig" : {
										"replication" : {
											"mode" : "replicated",
											"replicas" : 1
										},
										"memoryLimit" : 524288000
									},
									"custom" : {
										"sourceCode" : {
										
										},
										"name" : "localmongo",
										"type" : "cluster"
									},
									"recipe" : "5ab4d65bc261bdb38a9fe363",
									"env" : "DEV"
								},
								"deploy" : true,
								"type" : "custom"
							}
						}
					],
					"status":{
						"done": true,
						"data":[
							{
								"id": "deployment service id of this resource",
								"db": "mongo id of this resource",
								"mode" : "replicated"
							}
						]
					}
				},
				
				"deployments.repo.controller": {
					"imfv": [
						{
							"name": "controller",
							"options" : {
								"deployConfig" : {
									"replication" : {
										"mode" : "replicated",
										"replicas" : 1
									},
									"memoryLimit" : 524288000
								},
								"gitSource" : {
									"owner" : "soajs",
									"repo" : "soajs.controller",
									"branch" : "master",
									"commit" : "12345"
								},
								"custom" : {
									"sourceCode" : {
									
									},
									"name" : "controller",
									"type" : "service"
								},
								"recipe" : "5ab4d65bc261bdb38a9fe363",
								"env" : "DEV"
							},
							"deploy" : true,
							"type" : "custom"
						}
					],
					"status": {
						"done": true,
						"data": [
							{
								"id": "1234abcd",
								"mode": "replicated"
							}
						] //array of IDs
					}
				},
				
				"deployments.repo.urac": {
					"imfv": [
						{
							"name": "urac",
							"options" : {
								"deployConfig" : {
									"replication" : {
										"mode" : "replicated",
										"replicas" : 1
									},
									"memoryLimit" : 524288000
								},
								"gitSource" : {
									"owner" : "soajs",
									"repo" : "soajs.urac",
									"branch" : "master",
									"commit" : "67890"
								},
								"custom" : {
									"sourceCode" : {
									
									},
									"name" : "urac",
									"type" : "service"
								},
								"recipe" : "5ab4d65bc261bdb38a9fe363",
								"env" : "DEV"
							},
							"deploy" : true,
							"type" : "service"
						}
					],
					"status": {
						"done": true,
						"data": [
							{
								"id": "1234abcd",
								"mode": "replicated"
							}
						] //array of IDs
					}
				},
				
				"deployments.resources.nginx": {
					"imfv": [
						{
							"name": "mynginx",
							"type": "server",
							"category": "nginx",
							"locked": false,
							"shared": false,
							"plugged": false,
							"config": null,
							"deploy": {
								"options" : {
									"deployConfig" : {
										"replication" : {
											"mode" : "global"
										},
										"memoryLimit" : 524288000
									},
									"custom" : {
										"sourceCode" : {
										
										},
										"secrets": [
											{
												"name": "private-key-cert",
												"mountPath": "/etc/nginx/ssl",
												"type":"certificate"
											},
											{
												"name": "fullchain-cert",
												"mountPath": "/etc/nginx/ssl",
												"type":"certificate"
											}
										],
										"name" : "mynginx",
										"type" : "server"
									},
									"recipe" : "5ab4d65bc261bdb38a9fe363",
									"env" : "DEV"
								},
								"deploy" : true,
								"type" : "custom"
							}
						}
					],
					"status":{
						"done": true,
						"data":[
							{
								"id": "deployment service id of this resource",
								"mode": "global"
							}
						]
					}
				}
			},
			"post": {
				"infra.dns": {
					"imfv": [
						{
							"recursive" : {
								"max" : 5,
								"delay": 300
							},
							"check" : {
								"dns" : {
									"type" : "object",
									"required": true
								},
								"ip" : {
									"type" : "string",
									"required": true
								}
							},
							"command": {
								"method" : "post",
								"routeName" : "/bridge/executeDriver",
								"data" : {
									"type" : "infra",
									"name" : "google",
									"driver" : "google",
									"command" : "getDNSInfo",
									"project" : "demo",
									"options" : {
										"envCode" : "PORTAL"
									}
								}
							}
						}
					],
					"status": {
						"done": true,
						"data": {
							"ip": "kaza",
							"dns": { "a":"b" }
						}
					},
				}
			}
		}
	}
};