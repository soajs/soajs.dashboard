"use strict";
var assert = require("assert");
var helper = require("../../../../helper.js");
var utils = helper.requireModule('./lib/cloud/deploy/index.js');
var deploy;
var config = helper.requireModule('./config');
var req = {
	soajs: {
		registry: {
			coreDB: {
				provision: {}
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
		validator: {
			Validator: function () {
				return {
					validate: function (boolean) {
						if (boolean) {
							//valid
							return {
								errors: []
							};
						}
						else {
							//invalid
							return {
								errors: [{error: 'msg'}]
							};
						}
					}
				};
			}
		}
	}
};
// BL.model.validateCustomId
var mongoStub = {
	checkForMongo: function (soajs) {
		return true;
	},
	validateCustomId: function (soajs, id, cb) {
		return cb(null, id);
	},
	validateId: function (soajs, cb) {
		return cb(null, soajs.inputmaskData.id);
	},
	findEntries: function (soajs, opts, cb) {
		cb(null, []);
	},
	findEntry: function (soajs, opts, cb) {
		cb(null, {});
	},
	updateEntry: function (soajs, opts, cb) {
		cb(null, {});
	},
	removeEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	saveEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	switchConnection: function(soajs) {}
};

var deployer = helper.deployer;

var envRecord = {
	_id: '',
	code: 'DEV',
	dbs: {
		clusters: {
			clusterName: {
				credentials: {},
				"servers": [
					{
						"host": "localhost",
						"port": 9200
					}
				]
			}
		},
		config: {
			session: {
				cluster: "clusterName"
			}
		}
	},
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
	services: {
		config: {

		}
	},
	deployments: [
		{
			"technology": "docker",
			"options": {
				"zone": "local"
			},
			"environments": [
				"DCKR"
			],
			"loadBalancers": {},
			"name": "htlocalmggdiohh06wiu",
			"id": "htlocalmggdiohh06wiu"
		}
	]
};

describe("testing lib/cloud/deploy/index.js", function () {

	describe("testing init", function () {

		it("No Model Requested", function (done) {
			utils.init(null, function (error, body) {
				assert.ok(error);
				done();
			});
		});

		it("Model Name not found", function (done) {
			utils.init('anyName', function (error, body) {
				assert.ok(error);
				done();
			});
		});

		it("Init", function (done) {
			utils.init('mongo', function (error, body) {
				assert.ok(body);
				deploy = body;
				deploy.model = mongoStub;
				done();
			});
		});

	});

	// "deployService": function (config, soajs, registry, deployer, cbMain) {
	describe("deployService", function () {

		it("Fail deployService ports mismatch", function (done) {
			mongoStub.findEntry = function (soajs, opts, cb) {
				var catalogRecord = {
					"_id": '12',
					"name": "serviceCatalog",
					"type": "soajs",
					"description": "This is a test catalog for deploying service instances",
					"recipe": {
						"deployOptions": {
							"image": {
								"prefix": "soajstest",
								"name": "soajs",
								"tag": "latest"
							},
							"ports" : [
								{
									"name" : "http",
									"target" : 80,
									"isPublished" : true,
									"published" : 80,
									"preserveClientIP" : true
								},
								{
									"name" : "https",
									"target" : 443,
									"isPublished" : true,
									"preserveClientIP" : true
								}
							]
						},
						"buildOptions": {
							"settings": {
								"accelerateDeployment": true
							},
							"env": {
								"SOAJS_SRV_AUTOREGISTERHOST": {
									"type": "static",
									"value": "true"
								}
							},
							"cmd": {
								"deploy": {
									"command": [
										"bash",
										"-c"
									],
									"args": [
										"node index.js -T service"
									]
								}
							}
						}
					}
				};

				var tenantRecord = {
					"_id": '551286bce603d7e01ab1688e',
					"oauth": {},
					"locked": true,
					"code": "DBTN",
					"name": "Dashboard Tenant",
					"description": "This is the main dashboard tenant",
					"applications": [
						{
							"product": "DSBRD",
							"package": "DSBRD_MAIN",
							"appId": '5512926a7a1f0e2123f638de',
							"description": "this is the main application for the dashboard tenant",
							"_TTL": 604800000,
							"keys": [
								{
									"key": "38145c67717c73d3febd16df38abf311",
									"extKeys": [
										{
											"expDate": 1503058746824,
											"extKey": "9b96ba56ce934ded56c3f21ac9bdaddc8ba4782b7753cf07576bfabcace8632eba1749ff1187239ef1f56dd74377aa1e5d0a1113de2ed18368af4b808ad245bc7da986e101caddb7b75992b14d6a866db884ea8aee5ab02786886ecf9f25e974",
											"device": null,
											"geo": null,
											"dashboardAccess": true,
											"env": "DASHBOARD"
										}
									],
									"config": {
										"dashboard": {
											"urac": {
												"tokenExpiryTTL": 172800000
											}
										}
									}
								}
							]
						}
					]
				};

				if (opts.collection === 'catalogs') {
					return cb(null, catalogRecord);
				}
				if(opts.collection === 'tenants'){
					return cb(null, tenantRecord);
				}

				if(opts.collection === 'cicd'){
					return cb({
						code : 400,
						msg : 'error test'
					});
				}

				return cb(null, envRecord);
			};

			req.soajs.registry = envRecord;
			req.soajs.registry.coreDB = {
				provision: {
					"servers": [],
					"credentials": {}
				}
			};

			req.soajs.inputmaskData = {
				deployConfig: {
					replication: {
						mode: ""
					}
				},
				recipe: {
					_id: '123456'
				},
				custom: {}
			};
			req.soajs.inputmaskData.env = 'dev';
			req.soajs.inputmaskData.type = 'service';
			req.soajs.inputmaskData.serviceName = 'test';

			deployer = {
				execute: function(driverOptions, method, methodOptions, cb) {
					if (method === 'manageResources'){
						return cb(null, true);
					}
					else {
						return cb(null, {
							service : {
								labels : {
									'soajs.service.type' : 'service'
								}
							}
						});
					}
				}
			};

			deploy.deployService(config, req, deployer, function (error, body) {
				assert.ok(error);
				done();
			});
		});

		// todo: xxxxxx
		it.skip("Fail deployService port outside range", function (done) {
			mongoStub.findEntry = function (soajs, opts, cb) {
				var catalogRecord = {
					"_id": '12',
					"name": "serviceCatalog",
					"type": "soajs",
					"description": "This is a test catalog for deploying service instances",
					"recipe": {
						"deployOptions": {
							"image": {
								"prefix": "soajstest",
								"name": "soajs",
								"tag": "latest"
							},
							"ports" : [
								{
									"name" : "http",
									"target" : 80,
									"isPublished" : true,
									"published" : 5000,
									"preserveClientIP" : true
								}
							]
						},
						"buildOptions": {
							"settings": {
								"accelerateDeployment": true
							},
							"env": {
								"SOAJS_SRV_AUTOREGISTERHOST": {
									"type": "static",
									"value": "true"
								}
							},
							"cmd": {
								"deploy": {
									"command": [
										"bash",
										"-c"
									],
									"args": [
										"node index.js -T service"
									]
								}
							}
						}
					}
				};

				var tenantRecord = {
					"_id": '551286bce603d7e01ab1688e',
					"oauth": {},
					"locked": true,
					"code": "DBTN",
					"name": "Dashboard Tenant",
					"description": "This is the main dashboard tenant",
					"applications": [
						{
							"product": "DSBRD",
							"package": "DSBRD_MAIN",
							"appId": '5512926a7a1f0e2123f638de',
							"description": "this is the main application for the dashboard tenant",
							"_TTL": 604800000,
							"keys": [
								{
									"key": "38145c67717c73d3febd16df38abf311",
									"extKeys": [
										{
											"expDate": 1503058746824,
											"extKey": "9b96ba56ce934ded56c3f21ac9bdaddc8ba4782b7753cf07576bfabcace8632eba1749ff1187239ef1f56dd74377aa1e5d0a1113de2ed18368af4b808ad245bc7da986e101caddb7b75992b14d6a866db884ea8aee5ab02786886ecf9f25e974",
											"device": null,
											"geo": null,
											"dashboardAccess": true,
											"env": "DASHBOARD"
										}
									],
									"config": {
										"dashboard": {
											"urac": {
												"tokenExpiryTTL": 172800000
											}
										}
									}
								}
							]
						}
					]
				};

				if (opts.collection === 'catalogs') {
					return cb(null, catalogRecord);
				}
				if(opts.collection === 'tenants'){
					return cb(null, tenantRecord);
				}

				let kubeEnvRecord = JSON.parse(JSON.stringify(envRecord, null, 2));
				kubeEnvRecord.deployer.selected = "container.kubernetes.local";
				return cb(null, kubeEnvRecord);
			};

			req.soajs.registry = envRecord;
			req.soajs.registry.coreDB = {
				provision: {
					"servers": [],
					"credentials": {}
				}
			};

			req.soajs.inputmaskData = {
				deployConfig: {
					replication: {
						mode: ""
					}
				},
				recipe: {
					_id: '123456'
				},
				custom: {}
			};

			deployer = {
				execute: function(driverOptions, method, methodOptions, cb) {
					if (method === 'manageResources'){
						return cb(null, true);
					}
					else {
						return cb(null, {
							service : {
								labels : {
									'soajs.service.type' : 'service'
								}
							}
						});
					}
				}
			};

			req.soajs.inputmaskData.env = 'dev';
			req.soajs.inputmaskData.type = 'service';
			req.soajs.inputmaskData.serviceName = 'test';

			deploy.deployService(config, req, deployer, function (error, body) {
				assert.ok(error);
				done();
			});
		});

		it("Success deployService. soajs", function (done) {
			mongoStub.findEntry = function (soajs, opts, cb) {
				var catalogRecord = {
					"_id": '12',
					"name": "serviceCatalog",
					"type": "soajs",
					"description": "This is a test catalog for deploying service instances",
					"recipe": {
						"deployOptions": {
							"image": {
								"prefix": "soajstest",
								"name": "soajs",
								"tag": "latest"
							},
							"sourceCode" : {
								"configuration" : {
									"repo" : "soajsTestAccount/custom-configuration",
									"branch" : "master",
									"owner" : "soajsTestAccount",
									"commit" : "e61063e026d4b904bf254b176d9f2c0034b62cbf"
								}
							}
						},
						"buildOptions": {
							"settings": {
								"accelerateDeployment": true
							},
							"env": {
								"SOAJS_SRV_AUTOREGISTERHOST": {
									"type": "static",
									"value": "true"
								}
							},
							"cmd": {
								"deploy": {
									"command": [
										"bash",
										"-c"
									],
									"args": [
										"node index.js -T service"
									]
								}
							}
						}
					}
				};

				var tenantRecord = {
					"_id": '551286bce603d7e01ab1688e',
					"oauth": {},
					"locked": true,
					"code": "DBTN",
					"name": "Dashboard Tenant",
					"description": "This is the main dashboard tenant",
					"applications": [
						{
							"product": "DSBRD",
							"package": "DSBRD_MAIN",
							"appId": '5512926a7a1f0e2123f638de',
							"description": "this is the main application for the dashboard tenant",
							"_TTL": 604800000,
							"keys": [
								{
									"key": "38145c67717c73d3febd16df38abf311",
									"extKeys": [
										{
											"expDate": 1503058746824,
											"extKey": "9b96ba56ce934ded56c3f21ac9bdaddc8ba4782b7753cf07576bfabcace8632eba1749ff1187239ef1f56dd74377aa1e5d0a1113de2ed18368af4b808ad245bc7da986e101caddb7b75992b14d6a866db884ea8aee5ab02786886ecf9f25e974",
											"device": null,
											"geo": null,
											"dashboardAccess": true,
											"env": "DASHBOARD"
										}
									],
									"config": {
										"dashboard": {
											"urac": {
												"tokenExpiryTTL": 172800000
											}
										}
									}
								}
							]
						}
					]
				};

				if (opts.collection === 'catalogs') {
					return cb(null, catalogRecord);
				}
				if(opts.collection === 'tenants'){
					return cb(null, tenantRecord);
				}
				return cb(null, envRecord);
			};

			req.soajs.registry = envRecord;
			req.soajs.registry.coreDB = {
                provision: {
                    "servers": [],
                    "credentials": {}
                }
            };

			req.soajs.inputmaskData = {
				deployConfig: {
					replication: {
						mode: ""
					}
				},
				recipe: {
					_id: '123456'
				},
				custom: {}
			};
			req.soajs.inputmaskData.env = 'dev';
			req.soajs.inputmaskData.type = 'service';
			req.soajs.inputmaskData.serviceName = 'test';

			deploy.deployService(config, req, deployer, function (error, body) {
				assert.ok(body);
				done();
			});
		});

		it("Success deployService VM", function (done) {
			mongoStub.findEntry = function (soajs, opts, cb) {
				var catalogRecord = {
					"_id": "123456",
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
									"name": "mongo",
									"target": 27017,
									"isPublished": true,
									"published": 27017
								},
								{
									"name": "ssh",
									"target": 22,
									"isPublished": true,
									"published": 22
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
										"sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 2930ADAE8CAF5059EE73BB4B58712A2291FA4AD5\n",
										"echo \"deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.6 multiverse\" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.6.list\n",
										"sudo echo never > /sys/kernel/mm/transparent_hugepage/enabled\n",
										"sudo echo never > /sys/kernel/mm/transparent_hugepage/defrag\n",
										"sudo grep -q -F 'transparent_hugepage=never' /etc/default/grub || echo 'transparent_hugepage=never' >> /etc/default/grub\n",
										"sudo apt-get -y update\n",
										"sudo bash -c \"sudo echo net.ipv4.tcp_keepalive_time = 120 >> /etc/sysctl.conf\"\n",
										"sudo apt-get install -y mongodb-org\n",
										"sudo mkdir -p /data/db/\n",
										"sudo sed -i -e 's/bindIp: 127.0.0.1/bindIp: 0.0.0.0/g' /etc/mongod.conf\n",
										"sudo service mongod restart\n"
									]
								}
							}
						}
					}
				};

				var tenantRecord = {
					"_id": '551286bce603d7e01ab1688e',
					"oauth": {},
					"locked": true,
					"code": "DBTN",
					"name": "Dashboard Tenant",
					"description": "This is the main dashboard tenant",
					"applications": [
						{
							"product": "DSBRD",
							"package": "DSBRD_MAIN",
							"appId": '5512926a7a1f0e2123f638de',
							"description": "this is the main application for the dashboard tenant",
							"_TTL": 604800000,
							"keys": [
								{
									"key": "38145c67717c73d3febd16df38abf311",
									"extKeys": [
										{
											"expDate": 1503058746824,
											"extKey": "9b96ba56ce934ded56c3f21ac9bdaddc8ba4782b7753cf07576bfabcace8632eba1749ff1187239ef1f56dd74377aa1e5d0a1113de2ed18368af4b808ad245bc7da986e101caddb7b75992b14d6a866db884ea8aee5ab02786886ecf9f25e974",
											"device": null,
											"geo": null,
											"dashboardAccess": true,
											"env": "DASHBOARD"
										}
									],
									"config": {
										"dashboard": {
											"urac": {
												"tokenExpiryTTL": 172800000
											}
										}
									}
								}
							]
						}
					]
				};

				if (opts.collection === 'catalogs') {
					return cb(null, catalogRecord);
				}
				if(opts.collection === 'tenants'){
					return cb(null, tenantRecord);
				}
				let vmEnvRecord = JSON.parse(JSON.stringify(envRecord, null, 2));
				vmEnvRecord.restriction = {
					"1231231":{
						"eastus": {
							group: "grouptest",
							network: "networktest"
						}
					}
				};
				return cb(null, vmEnvRecord);
			};

			req.soajs.registry = envRecord;
			req.soajs.registry.coreDB = {
                provision: {
                    "servers": [],
                    "credentials": {}
                }
            };

			req.soajs.inputmaskData = {
				deployConfig: {
					replication: {
						mode: ""
					},
					type: "vm"
				},
				recipe: {
					_id: '123456'
				},
				custom: {}
			};
			req.soajs.inputmaskData.env = 'dev';
			req.soajs.inputmaskData.type = 'service';
			req.soajs.inputmaskData.serviceName = 'test';
			req.soajs.inputmaskData.infraId = '123';

			deploy.deployService(config, req, deployer, function (error, body) {
				assert.ok(body);
				done();
			});
		});

		it("Success redeployService VM redeploy action", function (done) {
			mongoStub.findEntry = function (soajs, opts, cb) {
				var catalogRecord = {
					"_id": "123456",
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
									"name": "mongo",
									"target": 27017,
									"isPublished": true,
									"published": 27017
								},
								{
									"name": "ssh",
									"target": 22,
									"isPublished": true,
									"published": 22
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
										"sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 2930ADAE8CAF5059EE73BB4B58712A2291FA4AD5\n",
										"echo \"deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.6 multiverse\" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.6.list\n",
										"sudo echo never > /sys/kernel/mm/transparent_hugepage/enabled\n",
										"sudo echo never > /sys/kernel/mm/transparent_hugepage/defrag\n",
										"sudo grep -q -F 'transparent_hugepage=never' /etc/default/grub || echo 'transparent_hugepage=never' >> /etc/default/grub\n",
										"sudo apt-get -y update\n",
										"sudo bash -c \"sudo echo net.ipv4.tcp_keepalive_time = 120 >> /etc/sysctl.conf\"\n",
										"sudo apt-get install -y mongodb-org\n",
										"sudo mkdir -p /data/db/\n",
										"sudo sed -i -e 's/bindIp: 127.0.0.1/bindIp: 0.0.0.0/g' /etc/mongod.conf\n",
										"sudo service mongod restart\n"
									]
								}
							}
						}
					}
				};

				var tenantRecord = {
					"_id": '551286bce603d7e01ab1688e',
					"oauth": {},
					"locked": true,
					"code": "DBTN",
					"name": "Dashboard Tenant",
					"description": "This is the main dashboard tenant",
					"applications": [
						{
							"product": "DSBRD",
							"package": "DSBRD_MAIN",
							"appId": '5512926a7a1f0e2123f638de',
							"description": "this is the main application for the dashboard tenant",
							"_TTL": 604800000,
							"keys": [
								{
									"key": "38145c67717c73d3febd16df38abf311",
									"extKeys": [
										{
											"expDate": 1503058746824,
											"extKey": "9b96ba56ce934ded56c3f21ac9bdaddc8ba4782b7753cf07576bfabcace8632eba1749ff1187239ef1f56dd74377aa1e5d0a1113de2ed18368af4b808ad245bc7da986e101caddb7b75992b14d6a866db884ea8aee5ab02786886ecf9f25e974",
											"device": null,
											"geo": null,
											"dashboardAccess": true,
											"env": "DASHBOARD"
										}
									],
									"config": {
										"dashboard": {
											"urac": {
												"tokenExpiryTTL": 172800000
											}
										}
									}
								}
							]
						}
					]
				};

				if (opts.collection === 'catalogs') {
					return cb(null, catalogRecord);
				}
				if(opts.collection === 'tenants'){
					return cb(null, tenantRecord);
				}
				let vmEnvRecord = JSON.parse(JSON.stringify(envRecord, null, 2));
				vmEnvRecord.restriction = {
					"1231231":{
						"eastus": {
							group: "grouptest",
							network: "networktest"
						}
					}
				};
				return cb(null, vmEnvRecord);
			};

			req.soajs.registry = envRecord;
			req.soajs.registry.coreDB = {
                provision: {
                    "servers": [],
                    "credentials": {}
                }
            };

			req.soajs.inputmaskData = {
				deployConfig: {
					replication: {
						mode: ""
					},
					type: "vm"
				},
				recipe: {
					_id: '123456'
				},
				custom: {}
			};
			req.soajs.inputmaskData.env = 'dev';
			req.soajs.inputmaskData.type = 'service';
			req.soajs.inputmaskData.serviceName = 'test';
			req.soajs.inputmaskData.action = 'redeploy';
			req.soajs.inputmaskData.infraId = '123';

			deploy.redeployService(config, req, deployer, function (error, body) {
				assert.ok(body);
				done();
			});
		});

		it("Success redeployService VM redeploy action", function (done) {
			mongoStub.findEntry = function (soajs, opts, cb) {
				var catalogRecord = {
					"_id": "123456",
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
									"name": "mongo",
									"target": 27017,
									"isPublished": true,
									"published": 27017
								},
								{
									"name": "ssh",
									"target": 22,
									"isPublished": true,
									"published": 22
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
										"sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 2930ADAE8CAF5059EE73BB4B58712A2291FA4AD5\n",
										"echo \"deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.6 multiverse\" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.6.list\n",
										"sudo echo never > /sys/kernel/mm/transparent_hugepage/enabled\n",
										"sudo echo never > /sys/kernel/mm/transparent_hugepage/defrag\n",
										"sudo grep -q -F 'transparent_hugepage=never' /etc/default/grub || echo 'transparent_hugepage=never' >> /etc/default/grub\n",
										"sudo apt-get -y update\n",
										"sudo bash -c \"sudo echo net.ipv4.tcp_keepalive_time = 120 >> /etc/sysctl.conf\"\n",
										"sudo apt-get install -y mongodb-org\n",
										"sudo mkdir -p /data/db/\n",
										"sudo sed -i -e 's/bindIp: 127.0.0.1/bindIp: 0.0.0.0/g' /etc/mongod.conf\n",
										"sudo service mongod restart\n"
									]
								}
							}
						}
					}
				};

				var tenantRecord = {
					"_id": '551286bce603d7e01ab1688e',
					"oauth": {},
					"locked": true,
					"code": "DBTN",
					"name": "Dashboard Tenant",
					"description": "This is the main dashboard tenant",
					"applications": [
						{
							"product": "DSBRD",
							"package": "DSBRD_MAIN",
							"appId": '5512926a7a1f0e2123f638de',
							"description": "this is the main application for the dashboard tenant",
							"_TTL": 604800000,
							"keys": [
								{
									"key": "38145c67717c73d3febd16df38abf311",
									"extKeys": [
										{
											"expDate": 1503058746824,
											"extKey": "9b96ba56ce934ded56c3f21ac9bdaddc8ba4782b7753cf07576bfabcace8632eba1749ff1187239ef1f56dd74377aa1e5d0a1113de2ed18368af4b808ad245bc7da986e101caddb7b75992b14d6a866db884ea8aee5ab02786886ecf9f25e974",
											"device": null,
											"geo": null,
											"dashboardAccess": true,
											"env": "DASHBOARD"
										}
									],
									"config": {
										"dashboard": {
											"urac": {
												"tokenExpiryTTL": 172800000
											}
										}
									}
								}
							]
						}
					]
				};

				if (opts.collection === 'catalogs') {
					return cb(null, catalogRecord);
				}
				if(opts.collection === 'tenants'){
					return cb(null, tenantRecord);
				}
				let vmEnvRecord = JSON.parse(JSON.stringify(envRecord, null, 2));
				vmEnvRecord.restriction = {
					"1231231":{
						"eastus": {
							group: "grouptest",
							network: "networktest"
						}
					}
				};
				return cb(null, vmEnvRecord);
			};

			req.soajs.registry = envRecord;
			req.soajs.registry.coreDB = {
                provision: {
                    "servers": [],
                    "credentials": {}
                }
            };

			req.soajs.inputmaskData = {
				deployConfig: {
					replication: {
						mode: ""
					},
					type: "vm"
				},
				recipe: {
					_id: '123456'
				},
				custom: {}
			};
			req.soajs.inputmaskData.env = 'dev';
			req.soajs.inputmaskData.type = 'service';
			req.soajs.inputmaskData.serviceName = 'test';
			req.soajs.inputmaskData.action = 'rebuild';
			req.soajs.inputmaskData.infraId = '123';

			deploy.redeployService(config, req, deployer, function (error, body) {
				assert.ok(body);
				done();
			});
		});

		it("Success deploy Nginx server", function (done) {
			mongoStub.findEntry = function (soajs, opts, cb) {
				var catalogRecord = {
					"_id": '12',
					"name": "serviceCatalog",
					"type": "server",
					"subtype": "nginx",
					"description": "This is a test catalog for deploying an nginx instances",
					"recipe": {
						"deployOptions": {
							"image": {
								"prefix": "soajstest",
								"name": "nginx",
								"tag": "latest"
							},
							"ports" : [
								{
									"name" : "http",
									"target" : 80,
									"isPublished" : true,
									"published" : 80,
									"preserveClientIP" : true
								},
								{
									"name" : "https",
									"target" : 443,
									"isPublished" : true,
									"published" : 443,
									"preserveClientIP" : true
								}
							]
						},
						"buildOptions": {
							"settings": {
								"accelerateDeployment": true
							},
							"env": {
								"SOAJS_SRV_AUTOREGISTERHOST": {
									"type": "static",
									"value": "true"
								},
								"SOAJS_NX_API_HTTPS": {
									"type": "static",
									"value": "true"
								}
							},
							"cmd": {
								"deploy": {
									"command": [
										"bash",
										"-c"
									],
									"args": [
										"node index.js -T nginx"
									]
								}
							}
						}
					}
				};

				var tenantRecord = {
					"_id": '551286bce603d7e01ab1688e',
					"oauth": {},
					"locked": true,
					"code": "DBTN",
					"name": "Dashboard Tenant",
					"description": "This is the main dashboard tenant",
					"applications": [
						{
							"product": "DSBRD",
							"package": "DSBRD_MAIN",
							"appId": '5512926a7a1f0e2123f638de',
							"description": "this is the main application for the dashboard tenant",
							"_TTL": 604800000,
							"keys": [
								{
									"key": "38145c67717c73d3febd16df38abf311",
									"extKeys": [
										{
											"expDate": 1503058746824,
											"extKey": "9b96ba56ce934ded56c3f21ac9bdaddc8ba4782b7753cf07576bfabcace8632eba1749ff1187239ef1f56dd74377aa1e5d0a1113de2ed18368af4b808ad245bc7da986e101caddb7b75992b14d6a866db884ea8aee5ab02786886ecf9f25e974",
											"device": null,
											"geo": null,
											"dashboardAccess": true,
											"env": "DASHBOARD"
										}
									],
									"config": {
										"dashboard": {
											"urac": {
												"tokenExpiryTTL": 172800000
											}
										}
									}
								}
							]
						}
					]
				};

				if (opts.collection === 'catalogs') {
					return cb(null, catalogRecord);
				}
				if(opts.collection === 'tenants'){
					return cb(null, tenantRecord);
				}
				return cb(null, envRecord);
			};

			req.soajs.registry = envRecord;
			req.soajs.registry.coreDB = {
				provision: {
					"servers": [],
					"credentials": {}
				}
			};

			req.soajs.inputmaskData = {
				deployConfig: {
					replication: {
						mode: ""
					}
				},
				recipe: {
					_id: '123456'
				},
				custom: {}
			};
			req.soajs.inputmaskData.env = 'dev';
			req.soajs.inputmaskData.type = 'service';
			req.soajs.inputmaskData.serviceName = 'test';

			deployer.inspectService = function (opts, cb) {
				return cb(null, {
					"service": {
						"id": "dashboard-nginx",
						"version": "1157",
						"name": "dashboard-nginx",
						"namespace": "soajs",
						"labels": {
						},
						"env": [
							"SOAJS_NX_API_HTTPS: true",
							"SOAJS_NX_SITE_HTTPS: true"
						],
						"resources": {
							"limits": {}
						},
						"ports": [
							{
								"protocol": "TCP",
								"target": 80,
								"published": 30080,
								"preserveClientIP": true
							},
							{
								"protocol": "TCP",
								"target": 443,
								"published": 30443,
								"preserveClientIP": true
							}
						]
					},
					"tasks": [
						{
							"id": "dashboard-nginx-j9qdc",
							"version": "1155",
							"name": "dashboard-nginx-j9qdc",
							"ref": {
								"service": {
									"name": "dashboard-nginx",
									"id": "dashboard-nginx"
								},
								"node": {
									"id": "minikube"
								},
								"container": {
									"id": "312eb18f3e0abf010ddba97e74e9a34be9c0105f97b0e5396a78f18237871d5a"
								}
							},
							"status": {
								"ts": "2018-04-18T11:43:18Z",
								"state": "running"
							}
						}
					]
				});
			};

			deploy.deployService(config, req, deployer, function (error, body) {
				assert.ok(body);
				done();
			});
		});
	});

	describe("testing deploy plugin", function() {

		before("init", function(done) {
			deployer.manageResources = function(options, cb) {
				return cb(null, true);
			};

			var envRecord = {
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
			mongoStub.findEntry = function (soajs, opts, cb) {
				cb(null, envRecord);
			};

			done();
		});

		it("success - deploy heapster plugin", function(done) {
			req.soajs.inputmaskData = {
				env: 'dev',
				plugin: 'heapster'
			};

			deploy.deployPlugin(config, req.soajs, deployer, function(error, result) {
				assert.ok(result);
				done();
			});
		});

	});
});
