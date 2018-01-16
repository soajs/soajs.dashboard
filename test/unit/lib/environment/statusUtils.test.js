"use strict";
var assert = require("assert");
var sinon = require('sinon');
var nock = require("nock");
var helper = require("../../../helper.js");
var statusUtils = helper.requireModule("./lib/environment/statusUtils.js");
var config = {};
var environmentRecord = {
	_id: '5a58d942ace01a5325fa3e4c',
	code: 'PORTAL',
	deployer: {
		"type": "container",
		"selected": "container.docker.local",
		"container": {
			"docker": {
				"local": {
					"socketPath": "/var/run/docker.sock"
				},
				"remote": {
					"nodes": ""
				}
			},
			"kubernetes": {
				"local": {
					"nginxDeployType": "",
					"namespace": {},
					"auth": {
						"token": ""
					}
				},
				"remote": {
					"nginxDeployType": "",
					"namespace": {},
					"auth": {
						"token": ""
					}
				}
			}
		}
	},
	dbs: {
		clusters: {
			oneCluster: {
				servers: {}
			}
		},
		config: {
			session: {
				cluster: 'oneCluster'
			}
		}
	},
	services: {},
	profile: ''
};
var portalTenant = {
	"_id":"5a1ef39a6b4472002538edd5",
	"type": "client",
	"code": "PRTL",
	"name": "Portal Tenant",
	"description": "Portal Tenant that uses the portal product and its packages",
	"oauth": {
		"secret": "soajs beaver",
		"redirectURI": null,
		"grants": [
			"password",
			"refresh_token"
		]
	},
	"applications": [
		{
			"product": "PRTAL",
			"package": "PRTAL_MAIN",
			"appId": '5a3a38da80334fde7cd9116a',
			"description": "Portal main application",
			"_TTL": 604800000,
			"keys": [
				{
					"key": "2d3d09b8ae1c1093bc85704b8efa97cd",
					"extKeys": [
						{
							"extKey": "506407523000d55bad57fdf257416bcab922c40fb2d83ee90db014d21afa1ede683ca36a44d59f4ae53caf579badd9fef6d2621ba25e7d8dee1eb414cfe833710254812efe5d74dbc74ab89f4f8b955dafe05a196e1e0c6cd17c4bace076001d",
							"device": null,
							"geo": null,
							"env": "PORTAL",
							"dashboardAccess": false,
							"expDate": null
						}
					],
					"config": {
						"portal": {
							"oauth": {
								"loginMode": "urac"
							},
							"commonFields": {
								"mail": {
									"from": "me@localhost.com",
									"transport": {
										"type": "sendmail",
										"options": {}
									}
								}
							},
							"urac": {
								"hashIterations": 1024,
								"seedLength": 32,
								"link": {
									"addUser": "http://portal.soajs.org:80/#/setNewPassword",
									"changeEmail": "http://portal.soajs.org:80/#/changeEmail/validate",
									"forgotPassword": "http://portal.soajs.org:80/#/resetPassword",
									"join": "http://portal.soajs.org:80/#/join/validate"
								},
								"tokenExpiryTTL": 172800000,
								"validateJoin": true,
								"mail": {
									"join": {
										"subject": "Welcome to SOAJS",
										"path": "/opt/soajs/node_modules/soajs.urac/mail/urac/join.tmpl"
									},
									"forgotPassword": {
										"subject": "Reset Your Password at SOAJS",
										"path": "/opt/soajs/node_modules/soajs.urac/mail/urac/forgotPassword.tmpl"
									},
									"addUser": {
										"subject": "Account Created at SOAJS",
										"path": "/opt/soajs/node_modules/soajs.urac/mail/urac/addUser.tmpl"
									},
									"changeUserStatus": {
										"subject": "Account Status changed at SOAJS",
										"path": "/opt/soajs/node_modules/soajs.urac/mail/urac/changeUserStatus.tmpl"
									},
									"changeEmail": {
										"subject": "Change Account Email at SOAJS",
										"path": "/opt/soajs/node_modules/soajs.urac/mail/urac/changeEmail.tmpl"
									}
								}
							}
						}
					}
				}
			]
		},
		{
			"product": "PRTAL",
			"package": "PRTAL_USER",
			"appId": '5a3a38da80334fde7cd9116b',
			"description": "Portal user application",
			"_TTL": 604800000,
			"keys": [
				{
					"key": "2f59e80a3b3a58e86fb8acda493dcfaa",
					"extKeys": [
						{
							"extKey": "506407523000d55bad57fdf257416bca07b508b32df58119f4cfc46f93dc2b0e91a9002c97de9cfef71c2ca5705f018cb54d025c61b399e725fd9e7ae1a21e1592e0d79a3d840d0a67c16ab10b198fc6ee8d709ed5e91fabc105c3d4291aac3a",
							"device": null,
							"geo": null,
							"env": "PORTAL",
							"dashboardAccess": true,
							"expDate": null
						},
						{
							"extKey": "2861f21e23e890e12257e20ad18562065d10a3a803ee4a91c820e2ef584983388be54ec484e3622dac029361bc6e35b6be7f2c92e2e85f9e851947312f2b34fb3a3309364215f17e0b2eb277e6b8ce6fd16a7cd3f7aed9e62fd19677d7c3f079",
							"device": {},
							"geo": {},
							"env": "DEV",
							"dashboardAccess": true,
							"expDate": null
						}
					],
					"config": {
						"portal": {
							"oauth": {
								"loginMode": "urac"
							},
							"commonFields": {
								"mail": {
									"from": "me@localhost.com",
									"transport": {
										"type": "sendmail",
										"options": {}
									}
								}
							},
							"urac": {
								"hashIterations": 1024,
								"seedLength": 32,
								"link": {
									"addUser": "http://portal.soajs.org:80/#/setNewPassword",
									"changeEmail": "http://portal.soajs.org:80/#/changeEmail/validate",
									"forgotPassword": "http://portal.soajs.org:80/#/resetPassword",
									"join": "http://portal.soajs.org:80/#/join/validate"
								},
								"tokenExpiryTTL": 172800000,
								"validateJoin": true,
								"mail": {
									"join": {
										"subject": "Welcome to SOAJS",
										"path": "/opt/soajs/node_modules/soajs.urac/mail/urac/join.tmpl"
									},
									"forgotPassword": {
										"subject": "Reset Your Password at SOAJS",
										"path": "/opt/soajs/node_modules/soajs.urac/mail/urac/forgotPassword.tmpl"
									},
									"addUser": {
										"subject": "Account Created at SOAJS",
										"path": "/opt/soajs/node_modules/soajs.urac/mail/urac/addUser.tmpl"
									},
									"changeUserStatus": {
										"subject": "Account Status changed at SOAJS",
										"path": "/opt/soajs/node_modules/soajs.urac/mail/urac/changeUserStatus.tmpl"
									},
									"changeEmail": {
										"subject": "Change Account Email at SOAJS",
										"path": "/opt/soajs/node_modules/soajs.urac/mail/urac/changeEmail.tmpl"
									}
								}
							}
						}
					}
				}
			]
		}
	],
	"tag": "portal"
};
var mongoStub = {
	findEntry: function (soajs, opts, cb) {
		cb(null, portalTenant);
	},
	getDb: function (soajs) {
		return {
			getMongoDB: function (cb) {
				cb(null, 'core_provision')
			}
		}
	},
};

var template = {
	"code": "DASHBOARD",
	"ready": false,
	"type": "PORTAL",
	"error": null,
	"gi" : {
		"code" : "PORTAL",
		"description" : "asdafas f",
		"sensitive" : false,
		"tKeyPass" : "as fsf saf asf",
		"username" : "portal",
		"password" : "password",
		"email" : "portal@me.local",
		"apiPrefix" : "portal-api",
		"sitePrefix" : "portal",
		"domain" : "soajs.local",
		"deployPortal" : true
	},
	"deploy" : {
		"certificates": [
			{
				"_id" : "5a1ef39a6b4472002538edd5",
				"filename" : "ca.pem",
				"contentType" : "binary/octet-stream",
				"length" : 1789,
				"chunkSize" : 261120,
				"uploadDate" : "2017-11-29T17:51:23.010+0000",
				"aliases" : null,
				"metadata" : {
					"platform" : "docker",
					"certType" : "ca",
					"env" : {
						"DASHBOARD" : [
							"docker.remote"
						]
					}
				},
				"md5" : "5a1b6d7a70fd47f44c4de0096203d719"
			}
		],
		"deployment" : {
			"docker" : {
				"dockerremote" : true,
				"nodes" : "192.168.99.100",
				"apiPort" : "2376"
			}
		},
		"selectedDriver" : "docker"
	},
	"cluster" : {
		"local" : {
			"servers" : [
				{
					"host" : "portaldemo",
					"port" : 27017
				}
			],
			"URLParam" : {
				"bufferMaxEntries" : 0,
				"maxPoolSize" : 5
			},
			"name" : "portaldemo"
		},
		"type" : "local",
		"serviceId" : "serviceId"
	},
	"controller" : {
		"_id": "1",
		"deploy" : true,
		"mode" : "deployment",
		"number" : 1,
		"memory" : 500,
		"catalog" : "5a395452ff55c80032b9029e",
		"branch" : "master",
		"commit" : "91acc4abee56ee5d1fedf271f590dde82be7abc6",
		"catalogName" : "SOAJS Controller Recipe - Kubernetes"
	},
	"urac" : {
		"deploy" : true,
		"mode" : "deployment",
		"number" : 1,
		"memory" : 500,
		"catalog" : "5a58921bcbfd9b38d0b36b3c",
		"branch" : "master",
		"commit" : "6de10951c49562e6e0c3ceb463d224c6770656e0",
		"catalogName" : "SOAJS Service Recipe - Kubernetes"
	},
	"oauth" : {
		"deploy" : true,
		"mode" : "deployment",
		"number" : 1,
		"memory" : 500,
		"catalog" : "5a58921bcbfd9b38d0b36b3c",
		"branch" : "master",
		"commit" : "52256e68fb0f1f14daa5acce57ff9ca2424af715",
		"catalogName" : "SOAJS Service Recipe - Kubernetes"
	},
	"nginx" : {
		"deploy" : true,
		"mode" : "daemonset",
		"memory" : 500,
		"norecipe" : true,
		"http" : 80,
		"ssl" : true,
		"https" : 443,
		"remoteCertificates" : {
			"chain" : "-----BEGIN CERTIFICATE-----\nMIIE/zCCAuegAwIBAgIJAMSgo+sIbZQlMA0GCSqGSIb3DQnQNfc1powVRZTr+mvKkGE1PrLtVZwI9H9j3L36hRLe1QktT8=\n-----END CERTIFICATE-----\n",
			"privateKey" : "-----BEGIN RSA PRIVATE KEY-----\nMIIJKAIBAAKCAgEAt+Hx8YOpfw47243HYCUNJrqqgynjsmF9U1oeBy3jivKkzvjkNJCJ0QA1EsfJBD7NGFzweDfVuiKSuLQj9FUpP\nb1CydxWirSH4WqAz6/xngWKHFKpcFr8NdFF1PuDtYxcUO3KBPz0QTzx2qek=\n-----END RSA PRIVATE KEY-----\n"
		},
		"customSSL" : {
			"secret" : {
				"env" : {
					"SOAJS_NX_SSL_CERTS_LOCATION" : {
						"type" : "static",
						"value" : "/etc/soajs/ssl/"
					},
					"SOAJS_NX_SSL_SECRET" : {
						"type" : "static",
						"value" : "ht-nginx-portal"
					}
				},
				"volume" : {
					"name" : "nginx-certs-volume",
					"secret" : {
						"secretName" : "ht-nginx-portal"
					}
				},
				"volumeMounts" : {
					"mountPath" : "/etc/soajs/ssl/",
					"name" : "nginx-certs-volume",
					"readOnly" : true
				}
			}
		},
		"recipe": "recipe"
	},
	"productize" : {
		"_id" : "5a5c6c7ce099c64ba5ced784",
		"extKey" : "06f35213d3da92960233b80d90377991c6609b54f377b13c6851ef614bc068a63759e56aa1e413d11881fe2881496422b26978c9d416b27af79cc1e3ec6d442fb4c8201ec540efc283276f586a57209ea1e480631170d11a73c3c85c4095045d",
		"tenant" : "5a5c6c7ce099c64ba5ced785"
	},
	"user": {
		"wf": {
			"rollback": 1
		}
	},
	"infra" : {
		"position" : 2,
		"wf" : {
			"modifyTemplateStatus" : true,
			"deploy" : [
				{
					"method" : "post",
					"routeName" : "/bridge/executeDriver",
					"data" : {
						"type" : "infra",
						"name" : "google",
						"driver" : "google",
						"command" : "deployCluster",
						"options" : {
							"region" : "asia-east1-c",
							"workernumber" : 1,
							"workerflavor" : "n1-standard-2",
							"regionLabel" : "asia-east1-c",
							"technology" : "kubernetes",
							"envCode" : "PORTAL",
							"nginx" : {
								"deploy" : true,
								"mode" : "daemonset",
								"memory" : 500,
								"norecipe" : true,
								"http" : 80,
								"ssl" : true,
								"https" : 443,
								"remoteCertificates" : {
									"chain" : "-----BEGIN CERTIFICATE-----\nMIIE/zCCAuegAwIBAgIJAMSgo+snQNfc1powVRZTr+mvKkGE1PrLtVZwI9H9j3L36hRLe1QktT8=\n-----END CERTIFICATE-----\n",
									"privateKey" : "-----BEGIN RSA PRIVATE KEY-----\nMIIJKAIBAAKCAgEAt+b1CydxWirSH4WqAz6/xngWKHFKpcFr8NdFF1PuDtYxcUO3KBPz0QTzx2qek=\n-----END RSA PRIVATE KEY-----\n"
								},
								"customSSL" : {
									"secret" : {
										"env" : {
											"SOAJS_NX_SSL_CERTS_LOCATION" : {
												"type" : "static",
												"value" : "/etc/soajs/ssl/"
											},
											"SOAJS_NX_SSL_SECRET" : {
												"type" : "static",
												"value" : "ht-nginx-portal"
											}
										},
										"volume" : {
											"name" : "nginx-certs-volume",
											"secret" : {
												"secretName" : "ht-nginx-portal"
											}
										},
										"volumeMounts" : {
											"mountPath" : "/etc/soajs/ssl/",
											"name" : "nginx-certs-volume",
											"readOnly" : true
										}
									}
								}
							}
						}
					}
				},
				{
					"recursive" : {
						"id" : {
							"type" : "string"
						},
						"ip" : {
							"type" : "string"
						}
					},
					"check" : {
						"id" : {
							"type" : "string"
						},
						"ip" : {
							"type" : "string"
						}
					},
					"method" : "post",
					"routeName" : "/bridge/executeDriver",
					"data" : {
						"type" : "infra",
						"name" : "google",
						"driver" : "google",
						"command" : "getDeployClusterStatus",
						"options" : {
							"envCode" : "PORTAL"
						}
					}
				}
			],
			"rollback" : {
				"method" : "post",
				"routeName" : "/bridge/executeDriver",
				"data" : {
					"type" : "infra",
					"name" : "google",
					"driver" : "google",
					"command" : "deleteCluster",
					"options" : {
						"envCode" : "PORTAL",
						"force" : true
					}
				},
				"params": {
					"project": "demo"
				}
			},
			"status" : {
				"recursive" : {
					"id" : {
						"type" : "string"
					},
					"ip" : {
						"type" : "string"
					}
				},
				"check" : {
					"id" : {
						"type" : "string"
					},
					"ip" : {
						"type" : "string"
					}
				},
				"method" : "post",
				"routeName" : "/bridge/executeDriver",
				"data" : {
					"type" : "infra",
					"name" : "google",
					"driver" : "google",
					"command" : "getDeployClusterStatus",
					"options" : {
						"envCode" : "PORTAL"
					}
				}
			}
		}
	},
	"selectedInfraProvider" : {
		"provider" : {
			"name" : "google",
			"label" : "Google Cloud",
			"image" : "https://cloud.google.com/_static/images/cloud/cloud_64dp.png",
			"docker" : false,
			"kubernetes" : true
		},
		"grid" : {
			"columns" : [
				{
					"label" : "Id/Name",
					"field" : "id"
				},
				{
					"label" : "Zone",
					"field" : "zone"
				},
				{
					"label" : "Network",
					"field" : "network"
				},
				{
					"label" : "Node Pool Id",
					"field" : "nodePoolId"
				},
				{
					"label" : "Environments",
					"field" : "environments"
				}
			]
		},
		"form" : {
			"account" : {
				"entries" : [
					{
						"name" : "project",
						"label" : "Project Id",
						"type" : "string",
						"value" : "",
						"tooltip" : "Enter your Google Project Id",
						"fieldMsg" : "Google Cloud allows deployment within already created projects only. Enter the Google Project Name you which to use for your deployments.",
						"required" : true
					},
					{
						"name" : "token",
						"label" : "Token",
						"type" : "jsoneditor",
						"height" : "200px",
						"value" : "",
						"tooltip" : "Enter the token associated with this project",
						"fieldMsg" : "Tokens allow you to communicate with Google Cloud APIs to manage your deployments. Generate a Key Token in Google Cloud IAM / Service Accounts section and copy it here.",
						"required" : true
					}
				]
			},
			"scale" : {
				"kubernetes" : {
					"entries" : [
						{
							"name" : "number",
							"label" : "Worker Node(s)",
							"type" : "number",
							"value" : 0,
							"tooltip" : "Enter the number of Worker Node(s) to scale your deployment to",
							"fieldMsg" : "Google Cloud only supports scaling the worker nodes in Kubernetes, enter the number you wish to scale to.",
							"placeholder" : "1",
							"required" : true
						}
					]
				}
			},
			"deploy" : {
				"kubernetes" : {
					"grid" : {
						"columns" : {
							"region" : {
								"label" : "Region",
								"fields" : [
									{
										"name" : "region",
										"label" : "Region"
									}
								]
							},
							"workernodes" : {
								"label" : "Worker Node(s)",
								"fields" : [
									{
										"name" : "workerflavor",
										"label" : "Flavor"
									},
									{
										"name" : "workernumber",
										"label" : "Number"
									}
								]
							}
						}
					},
					"entries" : [
						{
							"name" : "region",
							"label" : "Select a Region",
							"type" : "select",
							"value" : [
							
							],
							"tooltip" : "Select Deployment Region",
							"required" : true,
							"fieldMsg" : "Google Cloud deployments are based on regions; Regions differ in type & price of machines as well as data transfer charges."
						},
						{
							"name" : "workernodes",
							"label" : "Worker Nodes",
							"type" : "group",
							"entries" : [
								{
									"name" : "workernumber",
									"label" : "Number",
									"type" : "number",
									"value" : 1,
									"placeholder" : "1",
									"tooltip" : "Enter how many Worker node machine(s) you want to deploy",
									"required" : true,
									"fieldMsg" : "Specify how many Work node machine(s) you want your deployment to include upon creation."
								},
								{
									"name" : "workerflavor",
									"label" : "Machine Type",
									"type" : "select",
									"value" : [
										{
											"v" : "n1-standard-2",
											"l" : "N1 Standard 2 / 2 vCPUs x 7.5 GiB",
											"selected" : true,
											"group" : "General Purpose"
										},
										{
											"v" : "n1-standard-4",
											"l" : "N1 Standard 4 / 4 vCPUs x 15 GiB",
											"group" : "General Purpose"
										},
										{
											"v" : "n1-standard-8",
											"l" : "N1 Standard 8 / 8 vCPUs x 30 GiB",
											"group" : "General Purpose"
										},
										{
											"v" : "n1-standard-16",
											"l" : "N1 Standard 16 / 16 vCPUs x 60 GiB",
											"group" : "General Purpose"
										},
										{
											"v" : "n1-highcpu-4",
											"l" : "N1 HighCPU 4 / 4 vCPUs x 3.6 GiB",
											"group" : "Compute Optimized"
										},
										{
											"v" : "n1-highcpu-8",
											"l" : "N1 HighCPU 8 / 8 vCPUs x 7.2 GiB",
											"group" : "Compute Optimized"
										},
										{
											"v" : "n1-highcpu-16",
											"l" : "N1 HighCPU 16 / 16 vCPUs x 14.4 GiB",
											"group" : "Compute Optimized"
										},
										{
											"v" : "n1-highmem-2",
											"l" : "N1 HighMEM 2 / 2 vCPUs x 13 GiB",
											"group" : "Memory Optimized"
										},
										{
											"v" : "n1-highmem-4",
											"l" : "N1 HighMEM 4 / 4 vCPUs x 26 GiB",
											"group" : "Memory Optimized"
										},
										{
											"v" : "n1-highmem-8",
											"l" : "N1 HighMEM 8 / 8 vCPUs x 52 GiB",
											"group" : "Memory Optimized"
										},
										{
											"v" : "n1-highmem-16",
											"l" : "N1 HighMEM 16 / 16 vCPUs x 104 GiB",
											"group" : "Memory Optimized"
										}
									],
									"tooltip" : "Pick the Flavor of your worker node machine(s)",
									"required" : true,
									"fieldMsg" : "Pick a Machine flavor from CPU & RAM to apply to all your worker node machine(s)."
								}
							]
						}
					],
					"nginx" : {
						"name" : "ssl",
						"label" : "Nginx SSL Certificates",
						"type" : "accordion",
						"entries" : [
							{
								"label" : "Full Chain",
								"fieldMsg" : "Provide your Full Chain Certificate to use for Nginx SSL support.",
								"name" : "chain",
								"directive" : "modules/dashboard/environments/directives/files/cert.tmpl",
								"required" : false
							},
							{
								"label" : "Private Key",
								"fieldMsg" : "Provide your Key Certificate to use for Nginx SSL support.",
								"name" : "privateKey",
								"directive" : "modules/dashboard/environments/directives/files/cert.tmpl",
								"required" : false
							}
						]
					}
				},
				"docker" : {
					"entries" : [
					
					]
				}
			}
		},
		"deploy" : {
			"region" : "asia-east1-c",
			"workernumber" : 1,
			"workerflavor" : "n1-standard-2",
			"regionLabel" : "asia-east1-c",
			"technology" : "kubernetes",
			"envCode" : "PORTAL",
			"nginx" : {
				"deploy" : true,
				"mode" : "daemonset",
				"memory" : 500,
				"norecipe" : true,
				"http" : 80,
				"ssl" : true,
				"https" : 443,
				"remoteCertificates" : {
					"chain" : "-----BEGIN CERTIFICATE-----\nMIIE/zCCAuegAwIBAgIJAMSgo\nQNfc1powVRZTr+mvKkGE1PrLtVZwI9H9j3L36hRLe1QktT8=\n-----END CERTIFICATE-----\n",
					"privateKey" : "-----BEGIN RSA PRIVATE KEY-----\nMIIJKAIBAAKCAgEAnb1CydxWirSH4WqAz6/xngWKHFKpcFr8NdFF1PuDtYxcUO3KBPz0QTzx2qek=\n-----END RSA PRIVATE KEY-----\n"
				},
				"customSSL" : {
					"secret" : {
						"env" : {
							"SOAJS_NX_SSL_CERTS_LOCATION" : {
								"type" : "static",
								"value" : "/etc/soajs/ssl/"
							},
							"SOAJS_NX_SSL_SECRET" : {
								"type" : "static",
								"value" : "ht-nginx-portal"
							}
						},
						"volume" : {
							"name" : "nginx-certs-volume",
							"secret" : {
								"secretName" : "ht-nginx-portal"
							}
						},
						"volumeMounts" : {
							"mountPath" : "/etc/soajs/ssl/",
							"name" : "nginx-certs-volume",
							"readOnly" : true
						}
					}
				}
			}
		}
	},
	"dns" : {
		"wf" : {
			"status" : {
				"check" : {
					"id" : {
						"type" : "string"
					},
					"dns" : {
						"type" : "object"
					}
				},
				"method" : "post",
				"routeName" : "/bridge/executeDriver",
				"data" : {
					"type" : "infra",
					"name" : "google",
					"driver" : "google",
					"command" : "getDNSInfo",
					"options" : {
						"envCode" : "PORTAL"
					}
				}
			}
		}
	}
};
var req = {
	headers : {
		soajsauth : "soajsauth",
		key: "key"
	},
	query: {
		access_token: "access_token"
	},
	soajs: {
		registry: {
			coreDB: {
				provision: {
					name: 'core_provision',
					prefix: '',
					servers: [
						{host: '127.0.0.1', port: 27017}
					],
					credentials: null,
					streaming: {
						batchSize: 10000,
						colName: {
							batchSize: 10000
						}
					},
					URLParam: {
						maxPoolSize: 2, bufferMaxEntries: 0
					},
					registryLocation: {
						l1: 'coreDB',
						l2: 'provision',
						env: 'dev'
					},
					timeConnected: 1491861560912
				}
			},
			services: {
				controller: {
					port: 4000
				}
			}
		},
		log: {
			debug: function (data) {
			
			},
			error: function (data) {
			
			},
			info: function (data) {
			
			}
		},
		inputmaskData: {},
		awareness: {
			getHost: function (service, cb){
				cb("soajs.dashboard");
			}
		},
		mongoDb:{
			mongodb:{}
		}
	}
};
var BL = {
	model: mongoStub,
	removeCert: function (context, req, {}, cb) {
		cb(null, true);
	},
	addDb: function (context, req, {}, cb) {
		cb(null);
	}
	
};
var context = {
	BL: BL,
	template: template,
	environmentRecord: environmentRecord,
	config: config
};

function stubStatusUtils() {
	sinon
		.stub(statusUtils, 'initBLModel')
		.yields(null, {
			add: function (context, req, {}, cb) {
				cb(null, {id: '5a5879533c5415080690b7f4'});
			},
			addPackage: function (context, req, {}, cb) {
				cb(null, true);
			},
			addApplication: function (context, req, {}, cb) {
				cb(null, {appId: '5a5879533c5415080690b7f4'});
			},
			addApplicationExtKeys: function (context, provision, req, {}, cb) {
				cb(null, {extKey: '506407523000d55bad57fdf257416bcab922c40fb2d83ee90db014d21afa1ede683ca36a44d59f4ae53caf579badd9fef6d2621ba25e7d8dee1eb414cfe833710254812efe5d74dbc74ab89f4f8b955dafe05a196e1e0c6cd17c4bace076001d'});
			},
			updateApplicationConfig: function (context, req, {}, cb) {
				cb(null, true);
			},
			addResource: function (context, req, {}, cb) {
				cb(null, {_id: '5a5879533c5415080690b7f4'});
			},
			saveOAuth: function (context, code, msg, req, obj, cb) {
				cb(null);
			},
			saveConfig: function (context, req, helper, cb) {
				cb(null);
			},
			deployService: function (context, soajs, deployer, cb) {
				cb(null, {id: '5a5879533c5415080690b7f4'});
			}
		});
}

describe("testing statusUtils.js", function () {
	before(function () {
		nock('http://soajs.dashboard:4000')
			.post('/bridge/executeDriver?access_token=access_token',
				{ type: 'infra',
					name: 'google',
					driver: 'google',
					command: 'getDeployClusterStatus',
					options: { envCode: 'PORTAL' } })
			.reply(200, {
				result: true,
				data: {
					type: "string",
					id: "string"
				}
			});
		stubStatusUtils();
	});
	
	after(function () {
		sinon.restore(statusUtils);
	});
	it("Success uploadCertificates", function (done) {
		statusUtils.uploadCertificates(req, context, function (err) {
			done();
		})
	});
	
	it("Success productize", function (done) {
		statusUtils.productize(req, context, function (err) {
			done();
		})
	});
	
	it("Success handleClusters", function (done) {
		statusUtils.handleClusters(req, context, function (err) {
			done();
		})
	});
	
	it("Success deployservice", function (done) {
		statusUtils.deployservice(req, context, "nginx", 1, function (err) {
			done();
		})
	});
	
	it("Success deployController", function (done) {
		statusUtils.deployController(req, context, function (err) {
			done();
		})
	});
	
	it("Success deployUrac", function (done) {
		statusUtils.deployUrac(req, context, function (err) {
			done();
		})
	});
	
	it("Success deployOauth", function (done) {
		statusUtils.deployOauth(req, context, function (err) {
			done();
		})
	});
	
	it("Success createNginxRecipe", function (done) {
		sinon.restore(statusUtils);
		sinon
			.stub(statusUtils, 'initBLModel')
			.yields(null, {
				add: function (context, req, cb) {
					cb(null, '5a5879533c5415080690b7f4');
				}
			});
		
		statusUtils.createNginxRecipe(req, context, function (err) {
			sinon.restore(statusUtils);
			stubStatusUtils();
			done();
		});
	});
	
	it("Success deployNginx", function (done) {
		statusUtils.deployNginx(req, context, function (err) {
			done();
		})
	});
	
	it("Success createUserAndGroup", function (done) {
		statusUtils.createUserAndGroup(req, context, function (err) {
			done();
		})
	});
	
	it("Success redirectTo3rdPartyDeploy", function (done) {
		statusUtils.redirectTo3rdPartyDeploy(req, context,'infra', function (err) {
			done();
		})
	});
	
	it("Success redirectTo3rdPartyStatus", function (done) {
		statusUtils.redirectTo3rdPartyStatus(req, context,'infra', function (err) {
			done();
		})
	});
	
	it("Success initBLModel", function (done) {
		sinon.restore(statusUtils);
		let BLModule = {
			init: function (model, cb) {
				cb(null, true)
			}
		};
		statusUtils.initBLModel(BLModule, "mongo", function (err) {
			done();
		});
	});
	
});