"use strict";
var assert = require("assert");
var nock = require("nock");
var sinon = require('sinon');
var helper = require("../../../helper.js");
var statusRollback = helper.requireModule("./lib/environment/statusRollback");
var productBL = helper.requireModule("./lib/product/index.js");
var config = {};
var environmentRecord = {
	_id: '5a58d942ace01a5325fa3e4c',
	code: 'DASHBORAD',
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
var mongoStub = {
	findEntry: function (soajs, opts, cb) {
		cb(null, {
			"productize": {},
			"cluster": {},
			"controller": {},
			"urac": {},
			"oauth": {},
			"nginx": {},
			"user": {}
		});
	},
	updateEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	saveEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	findEntries: function (soajs, opts, cb) {
		cb(null,[{
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
					"PORTAL" : [
						"docker.remote"
					]
				}
			},
			"md5" : "5a1b6d7a70fd47f44c4de0096203d719"
		}, {
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
					"DEV" : [
						"docker.remote"
					]
				}
			},
			"md5" : "5a1b6d7a70fd47f44c4de0096203d719"
		}]);
	},
	removeEntry: function (req, context, cb) {
		cb(null, true);
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
		"deployPortal" : true,
		"project": {
			"name": "demo"
		}
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
					"routeName" : "/test/test",
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
					"routeName" : "/test/test",
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
				"routeName" : "/test/test",
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
					"test": "demo"
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
				"routeName" : "/test/test",
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
						"name" : "test",
						"label" : "test Id",
						"type" : "string",
						"value" : "",
						"tooltip" : "Enter your Google test Id",
						"fieldMsg" : "Google Cloud allows deployment within already created tests only. Enter the Google test Name you which to use for your deployments.",
						"required" : true
					},
					{
						"name" : "token",
						"label" : "Token",
						"type" : "jsoneditor",
						"height" : "200px",
						"value" : "",
						"tooltip" : "Enter the token associated with this test",
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
				"routeName" : "/test/test",
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
		}
	}
};
var BL = {
	model: mongoStub,
	removeCert: function (context, req, {}, cb) {
		cb(null, true);
	},
	
};
var context = {
	BL: BL,
	template: template,
	schemaOptions: ['productize','cluster','controller','urac','oauth','nginx','user'],
	environmentRecord: environmentRecord
};

describe("testing statusRollback.js", function () {
	before(function() {
		//mock productBL
		sinon
			.stub(statusRollback, 'initBLModel')
			.yields(null, {
				delete: function (context, req, {}, cb){
					cb(null, true);
				},
				deleteService: function  (context, req, deployer, cb){
					cb(null, true);
				}
			});
	});

	after(function() {
		sinon.restore(statusRollback);
	});
	
	it("Success removeProduct with id", function (done) {
		statusRollback.removeProduct(req, context,  function (err) {
			done();
		})
	});
	it("Success removeProduct with tenant", function (done) {
		delete context.template.productize._id;
		statusRollback.removeProduct(req, context,  function (err) {
			done();
		})
	});
	it("Success removeCertificates with none", function (done) {
		delete context.template.productize.tenant;
		statusRollback.removeProduct(req, context,  function (err) {
			done();
		})
	});
	
	it("Success removeService", function (done) {
		statusRollback.removeService(req, context, "controller", function (err) {
			done();
		})
	});
	it("Success removeService with no id", function (done) {
		statusRollback.removeService(req, context, "urac", function (err) {
			done();
		})
	});
	
	it("Success removeController", function (done) {
		statusRollback.removeController(req, context, function (err) {
			done();
		})
	});
	
	it("Success removeUrac", function (done) {
		statusRollback.removeUrac(req, context, function (err) {
			done();
		})
	});
	
	it("Success removeOauth", function (done) {
		statusRollback.removeOauth(req, context, function (err) {
			done();
		})
	});
	
	it("Success removeNginx", function (done) {
		statusRollback.removeNginx(req, context, function (err) {
			done();
		})
	});
	describe("removeCatalog", function () {
		before(function() {
			sinon.restore(statusRollback);
			//mock productBL
			sinon
				.stub(statusRollback, 'initBLModel')
				.yields(null, {
					delete: function (context, req, cb){
						cb(null, true);
					}
				});
		});
		after(function() {
			sinon.restore(statusRollback);
			sinon
				.stub(statusRollback, 'initBLModel')
				.yields(null, {
					delete: function (context, req, {}, cb){
						cb(null, true);
					},
					deleteService: function  (context, req, deployer, cb){
						cb(null, true);
					}
				});
		});
		it("Success with recipe", function (done) {
			statusRollback.removeCatalog(req, context, function (err) {
				done();
			})
		});
		it("Success with no recipe", function (done) {
			delete context.template.nginx.recipe;
			statusRollback.removeCatalog(req, context, function (err) {
				done();
			})
		});
	});
	
	it("Success removeCluster local with serviceId", function (done) {
		statusRollback.removeCluster(req, context, function (err) {
			done();
		})
	});
	
	it("Success removeCluster local with no serviceId", function (done) {
		delete context.template.cluster.serviceId;
		statusRollback.removeCluster(req, context, function (err) {
			done();
		})
	});
	
	it("Success removeCluster external", function (done) {
		context.template.cluster = {
			"external" : {
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
		};
		statusRollback.removeCluster(req, context, function (err) {
			done();
		})
	});
	
	it("Success removeCluster none", function (done) {
		context.template.cluster = {};
		statusRollback.removeCluster(req, context, function (err) {
			done();
		})
	});
	
	it("Success redirectTo3rdParty user no roll back", function (done) {
		statusRollback.redirectTo3rdParty(req, context, "user", function (err) {
			done();
		})
	});
	
	it("Success redirectTo3rdParty user ", function (done) {
		nock('http://soajs.dashboard:4000')
			.post('/test/test?access_token=access_token&test=demo&soajs_project=demo',
				{ type: 'infra',
				name: 'google',
				driver: 'google',
				command: 'getDeployClusterStatus',
				options: { envCode: 'PORTAL' } })
			.reply(200, {
				result: true
			});
		
		statusRollback.redirectTo3rdParty(req, context, "infra", function (err) {
			done();
		})
	});
	
	it("fail redirectTo3rdParty no test ", function (done) {
		delete context.template["infra"].wf.rollback.params;
		nock('http://soajs.dashboard:4000')
			.post('/test/test?access_token=access_token&test=demo&soajs_project=demo',
				{ type: 'infra',
					name: 'google',
					driver: 'google',
					command: 'getDeployClusterStatus',
					options: { envCode: 'PORTAL' } })
			.reply(200, {
				result: true,
				data: {
					type: "string",
					id: {}
				}
			});
		
		statusRollback.redirectTo3rdParty(req, context, "infra", function (err) {
			done();
		})
	});
	
	it("Success redirectTo3rdParty user recursive ", function (done) {
		nock('http://soajs.dashboard:4000')
			.post('/test/test?access_token=access_token&test=demo',
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
		context.template["infra"].wf.rollback = [{
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
			"routeName" : "/test/test",
			"data" : {
				"type" : "infra",
				"name" : "google",
				"driver" : "google",
				"command" : "getDeployClusterStatus",
				"options" : {
					"envCode" : "PORTAL"
				}
			},
			"params": {
				"test": "demo"
			}
		}];
		
		statusRollback.redirectTo3rdParty(req, context, "infra", function (err) {
			done();
		})
	});
	
	it("Success redirectTo3rdParty user recursive no id", function (done) {
		nock('http://soajs.dashboard:4000')
			.post('/test/test?access_token=access_token&test=demo&soajs_project=demo',
				{ type: 'infra',
					name: 'google',
					driver: 'google',
					command: 'getDeployClusterStatus',
					options: { envCode: 'PORTAL' } })
			.reply(200, {
				result: true,
				data: {
				
				}
			});
		context.template["infra"].wf.rollback = [{
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
			"routeName" : "/test/test",
			"data" : {
				"type" : "infra",
				"name" : "google",
				"driver" : "google",
				"command" : "getDeployClusterStatus",
				"options" : {
					"envCode" : "PORTAL"
				}
			},
			"params": {
				"test": "demo"
			}
		}];
		
		statusRollback.redirectTo3rdParty(req, context, "infra", function (err) {
			done();
		})
	});
	
	it("fail redirectTo3rdParty no options ", function (done) {
		context.template["infra"].wf.rollback = {};
		nock('http://soajs.dashboard:4000')
			.post('/test/test?access_token=access_token&test=demo&soajs_project=demo',
				{ type: 'infra',
					name: 'google',
					driver: 'google',
					command: 'getDeployClusterStatus',
					options: { envCode: 'PORTAL' } })
			.reply(200, {
				result: true,
				data: {
					type: "string",
					id: {}
				}
			});
		
		statusRollback.redirectTo3rdParty(req, context, "infra", function (err) {
			done();
		})
	});
	
	describe("initBLModel", function () {
		before(function () {
			sinon.restore(statusRollback);
		});
		it("Success", function (done) {
			let BLModule = {
				init: function (model, cb) {
					cb(null, true)
				}
			};
			statusRollback.initBLModel(BLModule, "mongo", function (err) {
				done();
			});
		});
	});
});