"use strict";

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
					"name": "DAAS Service Recipe1",
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
		
		"daemonGroups": {
			"data": [{
				"groupName": "test",
				"daemon": "helloDaemon",
				"status": 1,
				"processing": "parallel",
				"interval": 1800000,
				"order": ["test"],
				"solo": false,
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
		
		"endpoints": {
			"data": [
				{
					"type": "service",
					"models": {
						"path": "ToBeSetInEp",
						"name": "soap"
					},
					"injection": true,
					"serviceGroup": "soapEp",
					"serviceName": "test",
					"servicePort": 1111,
					"serviceVersion": 1,
					"requestTimeout": 50,
					"requestTimeoutRenewal": 5,
					"authentications": [
						{
							"name": "None",
							"category": "N/A"
						},
						{
							"name": "soap",
							"category": "soapbasicauth",
							"isDefault": true
						}
					],
					"prerequisites": {},
					"swaggerInput": "",
					"schema": {
						"post": {
							"/GetDatabases": {
								"_apiInfo": {
									"l": "List the databases available on the MI Server.",
									"group": "granta_group"
								},
								"imfv": {
									"commonFields": [],
									"custom": {}
								}
							},
							"/GetTables": {
								"_apiInfo": {
									"l": "List the tables contained in a particular MI Database.",
									"group": "granta_group"
								},
								"imfv": {
									"commonFields": [],
									"custom": {
										"tableFilter": {
											"required": false,
											"source": [
												"params.tableFilter",
												"query.tableFilter",
												"body.tableFilter"
											],
											"validation": {
												"type": "string",
												"enum": [
													"NoFilter",
													"MaterialsTablesOnly",
													"ProcessesTablesOnly",
													"SubstancesTablesOnly",
													"LegislationsTablesOnly",
													"TransportTypesTablesOnly",
													"RegionsTablesOnly",
													"EndOfLifeOptionsTablesOnly",
													"EnergyConversionOptionsTablesOnly",
													"CoatingsTablesOnly",
													"PartsTablesOnly",
													"InHouseTablesOnly",
													"SequenceSpecificationsTablesOnly",
													"ElementsTablesOnly",
													"UniverseTablesOnly",
													"ProducersTablesOnly",
													"ShapeTablesOnly",
													"ReferenceTablesOnly",
													"MobileUseTypesTablesOnly"
												]
											}
										},
										"dbKey": {
											"required": false,
											"source": [
												"params.dbKey",
												"query.dbKey",
												"body.dbKey"
											],
											"validation": {
												"type": "string"
											}
										},
										"attributeSelectors": {
											"required": false,
											"source": [
												"params.attributeSelectors",
												"query.attributeSelectors",
												"body.attributeSelectors"
											],
											"validation": {
												"type": "string"
											}
										}
									}
								}
							}
						}
					},
					"errors": {
						"400": "invalid input",
						"401": "invalid id",
						"402": "store is empty"
					},
					"defaultAuthentication": "Granta"
				},
				{
					"type": "service",
					"models": {
						"path": "setInEndpoint",
						"name": "rest"
					},
					"injection": true,
					"serviceGroup": "books",
					"serviceName": "test2",
					"servicePort": 1112,
					"serviceVersion": 1,
					"requestTimeout": 30,
					"requestTimeoutRenewal": 5,
					"oauth": true,
					"extKeyRequired": true,
					"authentications": [
						{
							"name": "None",
							"category": "N/A",
							"isDefault": true
						}
					],
					"defaultAuthentication": "None",
					"prerequisites": {},
					"swaggerInput": "swagger: '2.0'\ninfo:\n    version: 1.0.0\n    title: magazines\nhost: localhost\nbasePath: /magazines\nschemes:\n    - http\npaths:\n    /list:\n        get:\n            tags:\n                - magazines\n            summary: 'get all magazines'\n            operationId: getallmagazines\n            parameters:\n                -\n                    name: start\n                    required: true\n                    in: query\n                    type: integer\n                -\n                    name: limit\n                    required: true\n                    in: query\n                    type: integer\n    /:\n        get:\n            tags:\n                - magazines\n            summary: 'get one magazine'\n            operationId: getonemagazine\n            parameters:\n                -\n                    $ref: '#/parameters/id'\n        post:\n            tags:\n                - magazines\n            summary: 'Add a new magazine'\n            operationId: Addanewmagazine\n            parameters:\n                -\n                    $ref: '#/parameters/data'\n        delete:\n            tags:\n                - magazines\n            summary: 'delete magazine'\n            operationId: deletemagazine\n            parameters:\n                -\n                    $ref: '#/parameters/id'\n        put:\n            tags:\n                - magazines\n            summary: 'Update an existing magazine'\n            operationId: Updateanexistingmagazine\n            parameters:\n                -\n                    $ref: '#/parameters/id'\n                -\n                    $ref: '#/parameters/data'\nparameters:\n    id:\n        name: id\n        required: true\n        in: path\n        type: string\n    data:\n        name: data\n        required: true\n        in: body\n        schema:\n            type: object\n            properties:\n                title:\n                    type: string\n                number:\n                    type: integer\n                date:\n                    type: string\n            required:\n                - title\n                - number\n                - date\n",
					"schema": {
						"commonFields": {
							"id": {
								"required": true,
								"source": [
									"params.id"
								],
								"validation": {
									"type": "string"
								}
							},
							"data": {
								"required": true,
								"source": [
									"body.data"
								],
								"validation": {
									"type": "object",
									"properties": {
										"title": {
											"required": true,
											"type": "string"
										},
										"number": {
											"required": true,
											"type": "integer"
										},
										"date": {
											"required": true,
											"type": "string"
										}
									}
								}
							}
						},
						"get": {
							"/list": {
								"_apiInfo": {
									"group": "magazines",
									"l": "get all magazines"
								},
								"imfv": {
									"custom": {
										"start": {
											"required": true,
											"source": [
												"query.start"
											],
											"validation": {
												"type": "integer"
											}
										},
										"limit": {
											"required": true,
											"source": [
												"query.limit"
											],
											"validation": {
												"type": "integer"
											}
										}
									}
								}
							},
							"/": {
								"_apiInfo": {
									"l": "get one magazine",
									"group": "magazines"
								},
								"imfv": {
									"commonFields": [
										"id"
									],
									"custom": {}
								}
							}
						},
						"post": {
							"/": {
								"_apiInfo": {
									"group": "magazines",
									"l": "Add a new magazine"
								},
								"imfv": {
									"custom": {},
									"commonFields": [
										"data"
									]
								}
							}
						},
						"delete": {
							"/": {
								"_apiInfo": {
									"group": "magazines",
									"l": "delete magazine"
								},
								"imfv": {
									"custom": {},
									"commonFields": [
										"id"
									]
								}
							}
						},
						"put": {
							"/": {
								"_apiInfo": {
									"group": "magazines",
									"l": "Update an existing magazine"
								},
								"imfv": {
									"custom": {},
									"commonFields": [
										"id",
										"data"
									]
								}
							}
						}
					},
					"errors": {}
				}
			]
		},
		
		"productization": {
			"data": [
				{
					"code": "DSBRD",
					"name": "Portal Product",
					"description": "Portal Product Description",
					"packages": [
						{
							"code": "DSBRD_USER",
							"name": "Basic Package",
							"description": "Basic Package Description",
							"TTL": 6 * 36000 * 1000,
							"acl": {
								"oauth": {},
								"urac": {},
								"daas": {}
							}
						}
					]
				},
				{
					"code": "DSBRD1",
					"name": "Portal Product",
					"description": "Portal Product Description",
					"packages": [
						{
							"code": "PRTAL_USER",
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
							"code": "PRTAL_MAIN",
							"name": "Main Package",
							"description": "Main Package Description",
							"TTL": 6 * 3600 * 1000,
							"acl": {/*...*/}
						},
						{
							"code": "PRTAL_USER1",
							"name": "Main Package",
							"description": "Main Package Description",
							"TTL": 6 * 3600 * 1000,
							"acl": {/*...*/}
						}
					]
				},
				{
					"code": "TEST",
					"name": "Portal Product",
					"description": "Portal Product Description",
					"packages": [
						{
							"code": "TEST_USER",
							"name": "Basic Package",
							"description": "Basic Package Description",
							"TTL": 6 * 36000 * 1000,
							"acl": {
								"oauth": {/*...*/},
								"urac": {/*...*/},
								"daas": {/*...*/}
							}
						}
					]
				},
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
							"product": "DSBRD",
							"package": "DSBRD_DEFLT",
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
						},
						{
							"product": "DSBRD1",
							"package": "DSBRD1_fail",
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
						},
						{
							"product": "Fail",
							"package": "TEST_USER",
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
				},
				{
					"code": "TEST",
					"name": "TEST Tenant",
					"description": "TEST Tenant Description",
					"oauth": {/*...*/},
					"applications": [
						{
							"product": "DSBRD",
							"package": "DSBRD_DEFLT",
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
						},
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
		
		"deployments": {
			"repo": {
				"my_service": {
					"label": "My Custom Made Service",
					"name": "test",
					"type": "daemon",
					"group": "test12",
					"category": "soajs",
					"deploy": {
						"recipes": {
							"available": ["DAAS Service Recipe1"], //reduce available recipes to what is restricted by this list
							"default": 'DAAS Service Recipe1'
						},
						"memoryLimit": 500,
						"mode": "replicated",
						"replicas": 1,
						"cpu": 0.5
					},
					"gitSource": {
						"owner": 'test',
						"provider": 'test',
						"repo": 'test/test',
					},
					"strategy": "update"
				},
				"service": {
					"label": "My Custom Made Service",
					"name": "test1",
					"type": "daemon",
					"group": "test",
					"category": "soajs",
					"deploy": {
						"recipes": {
							"available": ["DAAS Service Recipe1"], //reduce available recipes to what is restricted by this list
							"default": 'DAAS Service Recipe1'
						},
						"memoryLimit": 500,
						"mode": "replicated",
						"replicas": 1,
						"cpu": 0.5
					},
					"gitSource": {
						"owner": 'test',
						"provider": 'test',
						"repo": 'test/test',
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
							"available": ["DAAS Service Recipe1"],
							"default": "DAAS Service Recipe1"
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
							}
						},
						{
							"name": "ciConfig2",
							"locked": true,
							"plugged": false,
							"shared": true,
							"value": {
								"test": true
							}
						},
						{
							"name": "ciConfig3",
							"locked": true,
							"plugged": false,
							"shared": true,
							"value": {
								"test": true
							}
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
				}
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
					"status": {
						"done": true,
						"data": [
							{
								"db": "mongo id of this resource"
							}
						]
					}
				}
			}
		},
		
		"deployments": {
			"pre": {
				"infra.cluster.deploy": {
					"imfv": [
						{
							"command": {
								"method": "post",
								"routeName": "/bridge/executeDriver",
								"data": {
									"type": "infra",
									"name": "google",
									"driver": "google",
									"command": "deployCluster",
									"project": "demo",
									"options": {
										"region": "us-east1-b",
										"workernumber": 3,
										"workerflavor": "n1-standard-2",
										"regionLabel": "us-east1-b",
										"technology": "kubernetes",
										"envCode": "PORTAL"
									}
								}
							},
							"check": {
								"id": {
									"type": "string",
									"required": true
								}
							}
						},
						{
							"recursive": {
								"max": 5,
								"delay": 300
							},
							"check": {
								"id": {
									"type": "string",
									"required": true
								},
								"ip": {
									"type": "string",
									"required": true
								}
							},
							"command": {
								"method": "post",
								"routeName": "/bridge/executeDriver",
								"data": {
									"type": "infra",
									"name": "google",
									"driver": "google",
									"command": "getDeployClusterStatus",
									"project": "demo",
									"options": {
										"envCode": "PORTAL"
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
							"dns": {"a": "b"}
						},
						"rollback": {
							"command": {
								"method": "post",
								"routeName": "/bridge/executeDriver",
								"params": {},
								"data": {
									"type": "infra",
									"name": "google",
									"driver": "google",
									"command": "deleteCluster",
									"project": "demo",
									"options": {
										"envCode": "PORTAL",
										"force": true
									}
								}
							}
						}
					}
				}
			},
			"steps": {
				
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
								"options": {
									"deployConfig": {
										"replication": {
											"mode": "replicated",
											"replicas": 1
										},
										"memoryLimit": 524288000
									},
									"custom": {
										"sourceCode": {},
										"name": "localmongo",
										"type": "cluster"
									},
									"recipe": "5ab4d65bc261bdb38a9fe363",
									"env": "DEV"
								},
								"deploy": true,
								"type": "custom"
							}
						}
					],
					"status": {
						"done": true,
						"data": [
							{
								"id": "deployment service id of this resource",
								"db": "mongo id of this resource",
								"mode": "replicated"
							}
						]
					}
				},
				
				"deployments.repo.controller": {
					"imfv": [
						{
							"name": "controller",
							"options": {
								"deployConfig": {
									"replication": {
										"mode": "replicated",
										"replicas": 1
									},
									"memoryLimit": 524288000
								},
								"gitSource": {
									"owner": "soajs",
									"repo": "soajs.controller",
									"branch": "master",
									"commit": "12345"
								},
								"custom": {
									"sourceCode": {},
									"name": "controller",
									"type": "service"
								},
								"recipe": "5ab4d65bc261bdb38a9fe363",
								"env": "DEV"
							},
							"deploy": true,
							"type": "custom"
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
							"options": {
								"deployConfig": {
									"replication": {
										"mode": "replicated",
										"replicas": 1
									},
									"memoryLimit": 524288000
								},
								"gitSource": {
									"owner": "soajs",
									"repo": "soajs.urac",
									"branch": "master",
									"commit": "67890"
								},
								"custom": {
									"sourceCode": {},
									"name": "urac",
									"type": "service"
								},
								"recipe": "5ab4d65bc261bdb38a9fe363",
								"env": "DEV"
							},
							"deploy": true,
							"type": "custom"
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
								"options": {
									"deployConfig": {
										"replication": {
											"mode": "global"
										},
										"memoryLimit": 524288000
									},
									"custom": {
										"sourceCode": {},
										"secrets": [
											{
												"name": "private-key-cert",
												"mountPath": "/etc/nginx/ssl",
												"type": "certificate"
											},
											{
												"name": "fullchain-cert",
												"mountPath": "/etc/nginx/ssl",
												"type": "certificate"
											}
										],
										"name": "mynginx",
										"type": "server"
									},
									"recipe": "5ab4d65bc261bdb38a9fe363",
									"env": "DEV"
								},
								"deploy": true,
								"type": "custom"
							}
						}
					],
					"status": {
						"done": true,
						"data": [
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
							"recursive": {
								"max": 5,
								"delay": 300
							},
							"check": {
								"dns": {
									"type": "object",
									"required": true
								},
								"ip": {
									"type": "string",
									"required": true
								}
							},
							"command": {
								"method": "post",
								"routeName": "/bridge/executeDriver",
								"data": {
									"type": "infra",
									"name": "google",
									"driver": "google",
									"command": "getDNSInfo",
									"project": "demo",
									"options": {
										"envCode": "PORTAL"
									}
								}
							}
						}
					],
					"status": {
						"done": true,
						"data": {
							"ip": "kaza",
							"dns": {"a": "b"}
						}
					}
				}
			}
		}
	}
};

module.exports = template;