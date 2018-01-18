"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");
var utils = helper.requireModule('./lib/environment/status.js');
var statusUtils = helper.requireModule("./lib/environment/statusUtils");
var statusRollback = helper.requireModule("./lib/environment/statusRollback");
var sinon = require('sinon');

var timer = 10000;
function stubStatusUtils() {
	
	sinon
		.stub(statusUtils, 'getAPIInfo')
		.withArgs(sinon.match.string).returns('http://test.local');
	sinon
		.stub(statusUtils, 'uploadCertificates')
		.yields(null, true);
	sinon
		.stub(statusUtils, 'productize')
		.yields(null, true);
	sinon
		.stub(statusUtils, 'deployClusterResource')
		.yields(null, true);
	sinon
		.stub(statusUtils, 'handleClusters')
		.yields(null, true);
	sinon
		.stub(statusUtils, 'deployservice')
		.yields(null, true);
	sinon
		.stub(statusUtils, 'deployController')
		.yields(null);
	sinon
		.stub(statusUtils, 'deployUrac')
		.yields(null, true);
	sinon
		.stub(statusUtils, 'deployOauth')
		.yields(null, true);
	sinon
		.stub(statusUtils, 'createNginxRecipe')
		.yields(null, true);
	sinon
		.stub(statusUtils, 'deployNginx')
		.yields(null, true);
	sinon
		.stub(statusUtils, 'createUserAndGroup')
		.yields(null, true);
	sinon
		.stub(statusUtils, 'redirectTo3rdPartyDeploy')
		.yields(null, true);
	sinon
		.stub(statusUtils, 'redirectTo3rdPartyStatus')
		.yields(null, true);
	sinon
		.stub(statusUtils, 'repeatCheckCall')
		.yields(null, true);
	sinon
		.stub(statusUtils, 'generateAndRunRequest')
		.yields(null, true);
	
//mock statusRollback
	sinon
		.stub(statusRollback, 'removeCertificates')
		.yields(null, true);
	sinon
		.stub(statusRollback, 'removeProduct')
		.yields(null, true);
	sinon
		.stub(statusRollback, 'removeController')
		.yields(null, true);
	sinon
		.stub(statusRollback, 'removeUrac')
		.yields(null, true);
	sinon
		.stub(statusRollback, 'removeOauth')
		.yields(null, true);
	sinon
		.stub(statusRollback, 'removeNginx')
		.yields(null, true);
	sinon
		.stub(statusRollback, 'removeCatalog')
		.yields(null, true);
	sinon
		.stub(statusRollback, 'removeCluster')
		.yields(null, true);
	sinon
		.stub(statusRollback, 'deleteResource')
		.yields(null, true);
	sinon
		.stub(statusRollback, 'redirectTo3rdParty')
		.yields(null, true);
	sinon
		.stub(statusRollback, 'repeatCheckCall')
		.yields(null, true);
	sinon
		.stub(statusRollback, 'generateAndRunRequest')
		.yields(null, true);
}
var req = {
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
		inputmaskData: {}
	}
};
var mongoStub = {
	findEntry: function (soajs, opts, cb) {
		cb(null, {
			"productize": {
				"modifyTemplateStatus": true
			},
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
	}
};
var BL = {
	model: mongoStub
};
var config = {};
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
		"certificates": [],
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
		"type" : "local"
	},
	"controller" : {
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
		}
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
var context = {
	BL: BL,
	template: template,
	schemaOptions: ['productize','cluster','controller','urac','oauth','nginx','user'],
	environmentRecord: environmentRecord
};
describe("testing status.js", function () {
	it("Success startDeployment case 1", function (done) {
		stubStatusUtils();
		utils.startDeployment(req,BL,config, environmentRecord,template,  function (err, body) {
			setTimeout(() => {
				assert.ok(body);
				sinon.restore(statusUtils);
				sinon.restore(statusRollback);
				done();
			}, timer);
			
		})
	});
	
	it("Success startDeployment case 2", function (done) {
		template.infra.position = 0;
		stubStatusUtils();
		utils.startDeployment(req,BL,config, environmentRecord,template,  function (err, body) {
			setTimeout(() => {
				assert.ok(body);
				sinon.restore(statusUtils);
				sinon.restore(statusRollback);
				done();
			}, timer);
		});
	});
	
	it("Success startDeployment case 3", function (done) {
		context.template.nginx.catalog = {};
		stubStatusUtils();
		utils.startDeployment(req,BL,config, environmentRecord,template,  function (err, body) {
			setTimeout(() => {
				assert.ok(body);
				sinon.restore(statusUtils);
				sinon.restore(statusRollback);
				done();
			}, timer);
		});
	});
	it("Success startDeployment case 4", function (done) {
		stubStatusUtils();
		context.BL.model.saveEntry = function (soajs, opts, cb) {
			cb(true);
		};
		utils.startDeployment(req,BL,config, environmentRecord,template,  function (err, body) {
			setTimeout(() => {
				assert.ok(body);
				sinon.restore(statusUtils);
				sinon.restore(statusRollback);
				context.BL.model.saveEntry = function (soajs, opts, cb) {
					cb(null, true);
				};
				done();
			}, timer);
		});
	});
	
	it("Success checkProgress case 1", function (done) {
		stubStatusUtils();
		utils.checkProgress(req,BL,config, environmentRecord,template,  function (err, body) {
			setTimeout(() => {
				assert.ok(body);
				sinon.restore(statusUtils);
				sinon.restore(statusRollback);
				done();
			}, timer);
		})
	});
	
	it("Success checkProgress  case 2", function (done) {
		stubStatusUtils();
		context.BL.model.updateEntry = function (soajs, opts, cb) {
			cb(true);
		};
		utils.checkProgress(req,BL,config, environmentRecord,template,  function (err, body) {
			setTimeout(() => {
				assert.ok(body);
				sinon.restore(statusUtils);
				sinon.restore(statusRollback);
				context.BL.model.updateEntry = function (soajs, opts, cb) {
					cb(null, true);
				};
				done();
			}, timer);
		})
	});
	
	it("Success rollbackDeployment case 1", function (done) {
		stubStatusUtils();
		req.soajs.inputmaskData.rollback = 1;
		utils.rollbackDeployment(req, context, function (err, body) {
			setTimeout(() => {
				assert.ok(body);
				sinon.restore(statusUtils);
				sinon.restore(statusRollback);
				done();
			}, timer);
		})
	});
	it("Success rollbackDeployment case 2", function (done) {
		stubStatusUtils();
		req.soajs.inputmaskData.rollback = 1;
		template.infra.position = 2;
		utils.rollbackDeployment(req, context, function (err, body) {
			setTimeout(() => {
				assert.ok(body);
				sinon.restore(statusUtils);
				sinon.restore(statusRollback);
				done();
			}, timer);
		})
	});
	it("Success rollbackDeployment case 3", function (done) {
		stubStatusUtils();
		req.soajs.inputmaskData.rollback = 0;
		delete template.user;
		delete template.infra;
		delete template.dns;
		utils.rollbackDeployment(req, context, function (err, body) {
			setTimeout(() => {
				assert.ok(body);
				sinon.restore(statusUtils);
				sinon.restore(statusRollback);
				done();
			}, timer);
		})
	});
});