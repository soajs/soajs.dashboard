"use strict";
const async = require("async");
const helper = require("../../../../helper.js");
const config = require("../../../../../config.js");
const utils = helper.requireModule('./lib/environment/drivers/infra.js');
const nock = require('nock');
let req = {
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
					port: 80
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
		inputmaskData: {
			specs: {}
		},
		validator: {
			Validator: function () {
				return {
					validate: function () {
						return {
							errors: []
						};
					}
				};
			}
		},
		awareness: {
			getHost: function (service, cb) {
				return cb("dashboard.com");
			}
		}
	},
	headers: {
		key: "key",
		soajsauth: "auth",
	},
	query: {
		"access_token": "token"
		
	}
};
let mongoStub = {
	findEntry: function (soajs, opts, cb) {
		if (opts.collection === 'infra') {
			cb(null, {'_id': 123123});
		} else {
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
		}
	},
	updateEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	saveEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	removeEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	closeConnection: function (soajs) {
		return true;
	},
	validateCustomId: function (soajs, id) {
		return true;
	},
	onboardVM: function (soajs, id) {
		return true;
	}
};
let BL = {
	customRegistry: {
		module: {}
	},
	model: mongoStub,
	cd: {
		module: {}
	},
	cloud: {
		deploy: {
			module: {}
		},
		services: {
			module: {}
		},
		resources: {
			module: {}
		},
		infra: {
			module: {}
		}
	},
	resources: {
		module: {}
	}
};
let template = {
	"type": "_template",
	"name": "MGTT",
	"description": "Mike Generic Test Template",
	"link": "",
	"content": {
		"custom_registry": {
			"data": [
				{
					"name": "ciConfig",
					"value": {
						"apiPrefix": "cloud-api",
						"domain": "herrontech.com",
						"protocol": "https",
						"port": 443.0
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
						"port": 443.0
					}
				}
			]
		},
		"productization": {
			"data": [
				{
					"code": "MIKE",
					"name": "Mike Product",
					"description": "Mike Product Description",
					"packages": [
						{
							"code": "BASIC",
							"name": "Basic Package",
							"description": "Basic Package Description",
							"TTL": 2160000.0,
							"acl": {
								"oauth": {},
								"urac": {},
								"daas": {}
							}
						},
						{
							"code": "MAIN",
							"name": "Main Package",
							"description": "Main Package Description",
							"TTL": 2160000.0,
							"acl": {}
						}
					]
				}
			]
		},
		"tenant": {
			"data": [
				{
					"code": "MIKE",
					"name": "Mike Tenant",
					"description": "Mike Tenant Description",
					"applications": [
						{
							"product": "MIKE",
							"package": "MIKE_MAIN",
							"description": "Mike main application",
							"_TTL": 2160000.0,
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
									"config": {
										"a": "b"
									}
								}
							]
						},
						{
							"product": "MIKE",
							"package": "MIKE_USER",
							"description": "Mike Logged In user Application",
							"_TTL": 2160000.0,
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
									"config": {
										"c": "d"
									}
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
					"name": "mike"
				}
			]
		},
		"deployments": {
			"repo": {
				"controller": {
					"label": "SOAJS API Gateway",
					"name": "controller",
					"type": "service",
					"category": "soajs",
					"deploy": {
						"memoryLimit": 500.0,
						"mode": "replicated",
						"replicas": 1.0
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
						"memoryLimit": 500.0,
						"mode": "global",
						"secrets": "mike"
					}
				},
				"external": {
					"label": "External Mongo",
					"type": "cluster",
					"category": "mongo",
					"limit": 1.0,
					"ui": "${REF:resources/drivers/cluster/mongo}",
					"deploy": null
				}
			}
		}
	},
	"deploy": {
		database: {
			pre: {
				custom_registry: {
					imfv: [
						{
							name: 'ciConfig',
							locked: true,
							plugged: false,
							shared: true,
							value: {
								test1: true
							}
						},
						{
							name: 'ciConfig2',
							locked: true,
							plugged: false,
							shared: true,
							value: {
								test2: true
							}
						},
						{
							name: 'ciConfig3',
							locked: true,
							plugged: false,
							shared: true,
							value: {
								test3: true
							}
						}
					]
				}
			},
			steps: {
				productization: {
					ui: {
						readOnly: true
					}
				},
				tenant: {
					ui: {
						readOnly: true
					}
				}
			},
			post: {
				'deployments__dot__resources__dot__external': {
					imfv: [
						{
							name: 'external',
							type: 'cluster',
							category: 'mongo',
							locked: false,
							shared: false,
							plugged: false,
							config: {
								username: 'username',
								password: 'pwd'
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
		deployments: {
			pre: {
				"infra.cluster.deploy": {
					"imfv": [
						{
							"command": {
								"method": "post",
								"routeName": "/bridge/executeDriver", //change the path
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
					},
				}
			},
			steps: {
				secrets: {
					imfv: [
						{
							name: 'mike',
							type: 'Generic',
							data: 'something in secret'
						}
					]
				},
				'deployments.repo.controller': {
					imfv: [
						{
							name: 'controller',
							options: {
								deployConfig: {
									replication: {
										mode: 'replicated',
										replicas: 1
									},
									memoryLimit: 524288000
								},
								gitSource: {
									owner: 'soajs',
									repo: 'soajs.controller',
									branch: 'master',
									commit: '468588b0a89e55020f26b805be0ff02e0f31a7d8'
								},
								custom: {
									sourceCode: {},
									name: 'controller',
									type: 'service'
								},
								recipe: '5ab4d65bc261bdb38a9fe363',
								env: 'MIKE'
							},
							deploy: true,
							type: 'custom'
						}
					],
					"status": {}
					
				},
				'deployments.resources.nginx': {
					imfv: [
						{
							name: 'nginx',
							type: 'server',
							category: 'nginx',
							locked: false,
							shared: false,
							plugged: false,
							config: null,
							deploy: {
								options: {
									deployConfig: {
										replication: {
											mode: 'global'
										},
										memoryLimit: 524288000
									},
									custom: {
										sourceCode: {},
										secrets: [
											{
												name: 'mike',
												mountPath: '/etc/soajs/certs',
												type: 'certificate'
											}
										],
										name: 'mynginx',
										type: 'server'
									},
									recipe: '5ab4d65bc261bdb38a9fe363',
									env: 'MIKE'
								},
								deploy: true,
								type: 'custom'
							}
						}
					]
				}
			},
			post: {
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
					},
				}
			}
		}
	},
	soajs_project: "soajs_project"
};
let environmentRecord = {
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
	profile: '',
	"restriction": {
		"1231231": {
			"eastus": {
				group: "grouptest",
				network: "networktest"
			}
		}
	}
};
let infraRecord = {
	"_id": '5af2b621a0e17acc56000001',
	"name": "test",
	"technologies": [
		"test"
	],
	"templates": [
		"local"
	],
	"label": "test",
	"deployments": []
};


let lib = {
	initBLModel: function (module, modelName, cb) {
		return cb(null, {
			add: function (context, req, data, cb) {
				return cb(null, true);
			},
			delete: function (context, req, data, cb) {
				return cb(true);
			},
			saveConfig: function (context, req, data, cb) {
				return cb(null, true);
			},
			deployService: function (context, req, data, cb) {
				return cb(null, {
					service: {
						id: "1"
					}
				});
			},
			deleteService: function (context, req, data, cb) {
				return cb(null, true);
			},
			addResource: function (context, req, data, cb) {
				return cb(null, {_id: "1"});
			},
			setConfig: function (context, req, data, cb) {
				return cb(null, true);
			},
			deleteResource: function (context, req, data, cb) {
				return cb(true);
			},
			list: function (config, soajs, deployer, cb) {
				return cb(null, true);
			},
			activate: function (config, soajs, deployer, cb) {
				return cb(true);
			},
			modify: function (config, soajs, deployer, cb) {
				return cb(null, true);
			},
			deactivate: function (config, soajs, deployer, cb) {
				return cb(null, {
					service: {
						id: "1"
					}
				});
			},
			removeDeployment: function (config, soajs, deployer, cb) {
				return cb(null, true);
			},
			getDeployClusterStatus: function (config, soajs, req, deployer, cbMain) {
				return cbMain(null, true);
			},
			deployCluster: function (config, soajs, deployer, req, cb) {
				return cb(null, true);
			},
			
			scaleCluster: function (config, soajs, deployer, cb) {
				return cb(true);
			},
			removeEnvFromDeployment: function (config, soajs, req, deployer, cb) {
				return cb(true);
			},
			getCluster: function (config, soajs, deployer, cb) {
				return cb(true);
			},
			updateCluster: function (config, soajs, deployer, cb) {
				return cb(true);
			},
			getDNSInfo: function (config, req, soajs, deployer, cb) {
				return cb(true);
			},
			removeTemplate: function (config, soajs, deployer, cb) {
				return cb(true);
			},
			addTemplate: function (config, soajs, deployer, cb) {
				return cb(true);
			},
			updateTemplate: function (config, soajs, deployer, cb) {
				return cb(true);
			},
			uploadTemplate: function (config, soajs, deployer, cb) {
				return cb(true);
			},
			uploadTemplateInputsFile: function (config, soajs, deployer, cb) {
				return cb(true);
			},
			downloadTemplate: function (config, soajs, deployer, cb) {
				return cb(true);
			},
			getDeployVMStatus: function (config, req, soajs, deployer, cb) {
				return cb(true);
			},
			onboardVM: function (config, req, soajs, deployer, cb) {
				return cb(true);
			},
			destroyVM: function (config, req, soajs, deployer, cb) {
				return cb(true);
			},
			deployVM: function (config, req, soajs, deployer, cb) {
				return cb(true);
			},
			
		});
	},
	checkReturnError: function (req, {}, {}, cb) {
		return cb(null, true);
	}
};
let context = {};
describe("testing infra.js", function () {
	
	describe("testing validate", function () {
		
		it("success", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				infraProvider: JSON.parse(JSON.stringify(infraRecord)),
				config: config,
				errors: [],
				opts: {
					"stage": "deployments",
					"group": "pre",
					"stepPath": "infra.cluster.deploy",
					"section": [
						"infra",
						"cluster",
						"deploy"
					],
					"inputs": [
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
					]
				}
			};
			utils.validate(req, context, lib, async, BL, 'mongo', function (err, body) {
				done();
			});
		});
		
		it("success with errors", function (done) {
			req.soajs.validator = {
				Validator: function () {
					return {
						validate: function () {
							return {
								errors: [{err: "msg"}]
							};
						}
					};
				}
			};
			utils.validate(req, context, lib, async, BL, 'mongo', function (err, body) {
				done();
			});
		});
	});
	
	describe("testing deploy", function () {
		
		it("success infra already deployed", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				infraProvider: JSON.parse(JSON.stringify(infraRecord)),
				template: JSON.parse(JSON.stringify(template)),
				config: config,
				errors: [],
				opts: {
					"stage": "deployments",
					"group": "pre",
					"stepPath": "infra.cluster.deploy",
					"section": [
						"infra",
						"cluster",
						"deploy"
					],
					"inputs": [
						{
							"command": "getDeployClusterStatus",
							"check": {
								"id": {
									"type": "string",
									"required": true
								}
							}
						},
						{
							"recursive": {
								"max": 0,
								"delay": 0
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
							"command": "getDeployClusterStatus",
						}
					]
				}
			};
			context.template.deploy.deployments.pre["infra.cluster.deploy"].status = {
				done: true
			};
			
			utils.deploy(req, context, lib, async, BL, 'mongo', function (err, body) {
				done();
			});
		});
		
		it("success infra with error", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				infraProvider: JSON.parse(JSON.stringify(infraRecord)),
				config: config,
				errors: [],
				opts: {
					"stage": "deployments",
					"group": "pre",
					"stepPath": "infra.cluster.deploy",
					"section": [
						"infra",
						"cluster",
						"deploy"
					],
					"inputs": [
						{
							"command": "deployCluster",
							"check": {
								"id": {
									"type": "string",
									"required": true
								}
							}
						},
						{
							// "recursive": {
							// 	"max": 5,
							// 	"delay": 1
							// },
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
							"command": "deployCluster"
						}
					]
				}
			};
			nock("http://dashboard.com:80").post('/bridge/executeDriver?access_token=token&soajs_project=soajs_project', {
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
			}).reply(200, {
				result: true,
				data: {}
			});
			delete context.template.deploy.deployments.pre["infra.cluster.deploy"].status;
			utils.deploy(req, context, lib, async, BL, 'mongo', function (err, body) {
				nock.cleanAll();
				done();
			});
		});
		
		it("success infra without command", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				infraProvider: JSON.parse(JSON.stringify(infraRecord)),
				config: config,
				errors: [],
				opts: {
					"stage": "deployments",
					"group": "pre",
					"stepPath": "infra.cluster.deploy",
					"section": [
						"infra",
						"cluster",
						"deploy"
					],
					"inputs": [
						{
							"command": '',
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
							"command": 'deployCluster'
						}
					]
				}
			};
			nock("http://dashboard.com:80").post('/bridge/executeDriver?access_token=token&soajs_project=soajs_project', {
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
			}).reply(200, {
				result: true,
				data: false
			});
			delete context.template.deploy.deployments.pre["infra.cluster.deploy"].status;
			utils.deploy(req, context, lib, async, BL, 'mongo', function (err, body) {
				nock.cleanAll();
				done();
			});
		});
		
		it("success infra without response", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				infraProvider: JSON.parse(JSON.stringify(infraRecord)),
				config: config,
				errors: [],
				opts: {
					"stage": "deployments",
					"group": "pre",
					"stepPath": "infra.cluster.deploy",
					"section": [
						"infra",
						"cluster",
						"deploy"
					],
					"inputs": [
						{
							"command": "deployCluster",
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
									"command": "deployCluster",
									"project": "demo",
									"options": {
										"envCode": "PORTAL"
									}
								}
							}
						}
					]
				}
			};
			nock("http://dashboard.com:80").post('/bridge/executeDriver?access_token=token&soajs_project=soajs_project', {
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
			}).reply(200, {
				result: true,
				data: false
			});
			delete context.template.deploy.deployments.pre["infra.cluster.deploy"].status;
			utils.deploy(req, context, lib, async, BL, 'mongo', function (err, body) {
				nock.cleanAll();
				done();
			});
		});
		
		it("success infra with response", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				infraProvider: JSON.parse(JSON.stringify(infraRecord)),
				config: config,
				errors: [],
				opts: {
					"stage": "deployments",
					"group": "pre",
					"stepPath": "infra.cluster.deploy",
					"section": [
						"infra",
						"cluster",
						"deploy"
					],
					"inputs": [
						{
							"command": "deployCluster",
							"check": {
								"id": {
									"type": "string",
									"required": true
								}
							},
							"recursive": {
								"max": 1,
								"delay": 300
							},
						}
					]
				}
			};
			
			nock("http://dashboard.com:80").post('/bridge/executeDriver?access_token=token&soajs_project=soajs_project', {
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
			}).reply(200, {
				result: true,
				data: true
			});
			delete context.template.deploy.deployments.pre["infra.cluster.deploy"].status;
			utils.deploy(req, context, lib, async, BL, 'mongo', function (err, body) {
				nock.cleanAll();
				done();
			});
		});
		
		it("success infra with response case getDeployVMStatus", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				infraProvider: JSON.parse(JSON.stringify(infraRecord)),
				config: config,
				errors: [],
				opts: {
					"stage": "deployments",
					"group": "pre",
					"stepPath": "infra.cluster.deploy",
					"section": [
						"infra",
						"cluster",
						"deploy"
					],
					"inputs": [
						{
							"command": "getDeployVMStatus",
							"check": {
								"id": {
									"type": "string",
									"required": true
								}
							},
							"recursive": {
								"max": 1,
								"delay": 300
							},
							options: {
								params: ['test'],
								data: ['test']
							}
						},
					]
				}
			};
			delete context.template.deploy.deployments.pre["infra.cluster.deploy"].status;
			utils.deploy(req, context, lib, async, BL, 'mongo', function (err, body) {
				nock.cleanAll();
				done();
			});
		});
		
		it("success infra with response case onBoard", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				infraProvider: JSON.parse(JSON.stringify(infraRecord)),
				config: config,
				errors: [],
				opts: {
					"stage": "deployments",
					"group": "pre",
					"stepPath": "infra.cluster.deploy",
					"section": [
						"infra",
						"cluster",
						"deploy"
					],
					"inputs": [
						{
							"command": "onboardVM",
							"check": {
								"id": {
									"type": "string",
									"required": true
								}
							},
							"recursive": {
								"max": 1,
								"delay": 300
							},
							options: {
								params: ['test'],
								data: ['test']
							}
						},
					]
				}
			};
			context.infraProvider.command = 'onboardVM';
			delete context.template.deploy.deployments.pre["infra.cluster.deploy"].status;
			utils.deploy(req, context, lib, async, BL, 'mongo', function (err, body) {
				nock.cleanAll();
				done();
			});
		});
		
		it("success infra with response case dnsInfo", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				infraProvider: JSON.parse(JSON.stringify(infraRecord)),
				config: config,
				errors: [],
				opts: {
					"stage": "deployments",
					"group": "pre",
					"stepPath": "infra.cluster.deploy",
					"section": [
						"infra",
						"cluster",
						"deploy"
					],
					"inputs": [
						{
							"command": "getDNSInfo",
							"check": {
								"id": {
									"type": "string",
									"required": true
								}
							},
							"recursive": {
								"max": 1,
								"delay": 300
							},
							options: {
								params: ['test'],
								data: ['test']
							}
						},
					]
				}
			};
			delete context.template.deploy.deployments.pre["infra.cluster.deploy"].status;
			utils.deploy(req, context, lib, async, BL, 'mongo', function (err, body) {
				nock.cleanAll();
				done();
			});
		});
		
		it("success infra with response case deployVm", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				infraProvider: JSON.parse(JSON.stringify(infraRecord)),
				config: config,
				errors: [],
				opts: {
					"stage": "deployments",
					"group": "pre",
					"stepPath": "infra.cluster.deploy",
					"section": [
						"infra",
						"cluster",
						"deploy"
					],
					"inputs": [
						{
							"command": "deployVM",
							"check": {
								"id": {
									"type": "string",
									"required": true
								}
							},
							"recursive": {
								"max": 1,
								"delay": 300
							},
							options: {
								params: {'specs': {}},
								data: [{"test": 'test', "specs": {}}],
							}
						},
					]
				}
			};
			req.soajs.inputmaskData.specs = {
				layerName: ''
			};
			delete context.template.deploy.deployments.pre["infra.cluster.deploy"].status;
			utils.deploy(req, context, lib, async, BL, 'mongo', function (err, body) {
				nock.cleanAll();
				done();
			});
		});
		
		it("success infra with response case releaseVm", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				infraProvider: JSON.parse(JSON.stringify(infraRecord)),
				config: config,
				errors: [],
				opts: {
					"stage": "deployments",
					"group": "pre",
					"stepPath": "infra.cluster.deploy",
					"section": [
						"infra",
						"cluster",
						"deploy"
					],
					"inputs": [
						{
							"command": "releaseVM",
							"check": {
								"id": {
									"type": "string",
									"required": true
								}
							},
							"recursive": {
								"max": 1,
								"delay": 300
							},
							options: {
								params: ['test'],
								data: ['test']
							}
						},
					]
				}
			};
			context.infraProvider.command = 'onboardVM';
			delete context.template.deploy.deployments.pre["infra.cluster.deploy"].status;
			utils.deploy(req, context, lib, async, BL, 'mongo', function (err, body) {
				nock.cleanAll();
				done();
			});
		});
		
		it("success infra with response case destroyVm", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				infraProvider: JSON.parse(JSON.stringify(infraRecord)),
				config: config,
				errors: [],
				opts: {
					"stage": "deployments",
					"group": "pre",
					"stepPath": "infra.cluster.deploy",
					"section": [
						"infra",
						"cluster",
						"deploy"
					],
					"inputs": [
						{
							"command": "destroyVM",
							"check": {
								"id": {
									"type": "string",
									"required": true
								}
							},
							"recursive": {
								"max": 1,
								"delay": 300
							},
							options: {
								params: ['test'],
								data: ['test']
							}
						},
					]
				}
			};
			delete context.template.deploy.deployments.pre["infra.cluster.deploy"].status;
			utils.deploy(req, context, lib, async, BL, 'mongo', function (err, body) {
				nock.cleanAll();
				done();
			});
		});
		
		
		it("success infra ", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				infraProvider: JSON.parse(JSON.stringify(infraRecord)),
				config: config,
				errors: [],
				opts: {
					"stage": "deployments",
					"group": "pre",
					"stepPath": "infra.cluster.deploy",
					"section": [
						"infra",
						"cluster",
						"deploy"
					],
					"inputs": [
						{
							"command": "deployCluster",
							"check": {
								"id": {
									"type": "string",
									"required": true
								}
							},
							"recursive": {
								"max": 1,
								"delay": 300
							},
						}
					]
				}
			};
			nock("http://dashboard.com:80").post('/bridge/executeDriver?access_token=token&soajs_project=soajs_project', {
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
			}).reply(200, {
				result: true,
				data: true
			});
			req.soajs.validator = {
				Validator: function () {
					return {
						validate: function () {
							return {
								valid: true
							};
						}
					};
				}
			};
			delete context.template.deploy.deployments.pre["infra.cluster.deploy"].status;
			utils.deploy(req, context, lib, async, BL, 'mongo', function (err, body) {
				nock.cleanAll();
				done();
			});
		});
		
		it("success infra max count", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				infraProvider: JSON.parse(JSON.stringify(infraRecord)),
				config: config,
				errors: [],
				opts: {
					"stage": "deployments",
					"group": "pre",
					"stepPath": "infra.cluster.deploy",
					"section": [
						"infra",
						"cluster",
						"deploy"
					],
					"inputs": [
						{
							"command": "deployCluster",
							"check": {
								"id": {
									"type": "string",
									"required": true
								}
							},
							"recursive": {
								"max": 0,
								"delay": 300
							},
						}
					]
				}
			};
			nock("http://dashboard.com:80").post('/bridge/executeDriver?access_token=token&soajs_project=soajs_project', {
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
			}).reply(200, {
				result: true,
				data: false
			});
			req.soajs.validator = {
				Validator: function () {
					return {
						validate: function () {
							return {
								valid: true
							};
						}
					};
				}
			};
			delete context.template.deploy.deployments.pre["infra.cluster.deploy"].status;
			utils.deploy(req, context, lib, async, BL, 'mongo', function (err, body) {
				nock.cleanAll();
				done();
			});
		});
		
		it("success infra inputs object", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				infraProvider: JSON.parse(JSON.stringify(infraRecord)),
				config: config,
				errors: [],
				opts: {
					"stage": "deployments",
					"group": "pre",
					"stepPath": "infra.cluster.deploy",
					"section": [
						"infra",
						"cluster",
						"deploy"
					],
					"inputs":
						{
							"command": "deployCluster",
							"check": {
								"id": {
									"type": "string",
									"required": true
								}
							},
							"recursive": {
								"max": 5,
								"delay": 300
							},
						}
				}
			};
			nock("http://dashboard.com:80").post('/bridge/executeDriver?access_token=token&soajs_project=soajs_project', {
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
			}).reply(200, {
				result: true,
				data: false
			});
			delete context.template.deploy.deployments.pre["infra.cluster.deploy"].status;
			utils.deploy(req, context, lib, async, BL, 'mongo', function (err, body) {
				nock.cleanAll();
				done();
			});
		});
		
		it("success infra inputs empty", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				infraProvider: JSON.parse(JSON.stringify(infraRecord)),
				config: config,
				errors: [],
				opts: {
					"stage": "deployments",
					"group": "pre",
					"stepPath": "infra.cluster.deploy",
					"section": [
						"infra",
						"cluster",
						"deploy"
					],
					"inputs": []
				}
			};
			nock("http://dashboard.com:80").post('/bridge/executeDriver?access_token=token&soajs_project=soajs_project', {
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
			}).reply(200, {
				result: true,
				data: false
			});
			delete context.template.deploy.deployments.pre["infra.cluster.deploy"].status;
			utils.deploy(req, context, lib, async, BL, 'mongo', function (err, body) {
				nock.cleanAll();
				done();
			});
		});
		
		it("success infra no steps ", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				infraProvider: JSON.parse(JSON.stringify(infraRecord)),
				config: config,
				errors: [],
				opts: {
					"stage": "deployments",
					"group": "pre",
					"stepPath": "infra.cluster.deploy",
					"section": [
						"infra",
						"cluster",
						"deploy"
					],
					"inputs": [
						null
					]
				}
			};
			nock("http://dashboard.com:80").post('/bridge/executeDriver?access_token=token&soajs_project=soajs_project', {
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
			}).reply(200, {
				result: true,
				data: true
			});
			delete context.template.deploy.deployments.pre["infra.cluster.deploy"].status;
			utils.deploy(req, context, lib, async, BL, 'mongo', function (err, body) {
				nock.cleanAll();
				done();
			});
		});
		
	});
	
	describe("testing rollback", function () {
		it("success infra no status", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				infraProvider: JSON.parse(JSON.stringify(infraRecord)),
				config: config,
				errors: [],
				opts: {
					"stage": "deployments",
					"group": "pre",
					"stepPath": "infra.cluster.deploy",
					"section": [
						"infra",
						"cluster",
						"deploy"
					],
					"inputs": [
						{
							"command": "deployCluster",
							"check": {
								"id": {
									"type": "string",
									"required": true
								}
							},
							"recursive": {
								"max": 1,
								"delay": 300
							},
						}
					]
				}
			};
			delete context.template.deploy.deployments.pre["infra.cluster.deploy"].status;
			utils.rollback(req, context, lib, async, BL, 'mongo', function (err, body) {
				nock.cleanAll();
				done();
			});
		});
		
		it("success infra done false", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				infraProvider: JSON.parse(JSON.stringify(infraRecord)),
				config: config,
				errors: [],
				opts: {
					"stage": "deployments",
					"group": "pre",
					"stepPath": "infra.cluster.deploy",
					"section": [
						"infra",
						"cluster",
						"deploy"
					],
					"inputs": [
						{
							"command": "deployCluster",
							"check": {
								"id": {
									"type": "string",
									"required": true
								}
							},
							"recursive": {
								"max": 1,
								"delay": 300
							},
						}
					]
				}
			};
			context.template.deploy.deployments.pre["infra.cluster.deploy"].status = {
				done: false
			};
			
			utils.rollback(req, context, lib, async, BL, 'mongo', function (err, body) {
				nock.cleanAll();
				done();
			});
		});
		
		it("success infra rollback emtpy", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				infraProvider: JSON.parse(JSON.stringify(infraRecord)),
				config: config,
				errors: [],
				opts: {
					"stage": "deployments",
					"group": "pre",
					"stepPath": "infra.cluster.deploy",
					"section": [
						"infra",
						"cluster",
						"deploy"
					],
					"inputs": [
						{
							"command": "deployCluster",
							"check": {
								"id": {
									"type": "string",
									"required": true
								}
							},
							"recursive": {
								"max": 1,
								"delay": 300
							},
						}
					]
				}
			};
			context.template.deploy.deployments.pre["infra.cluster.deploy"].status = {
				done: true,
				rollback: {}
			};
			utils.rollback(req, context, lib, async, BL, 'mongo', function (err, body) {
				nock.cleanAll();
				done();
			});
		});
		
		it("success infra with rolback", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				infraProvider: JSON.parse(JSON.stringify(infraRecord)),
				config: config,
				errors: [],
				opts: {
					"stage": "deployments",
					"group": "pre",
					"stepPath": "infra.cluster.deploy",
					"section": [
						"infra",
						"cluster",
						"deploy"
					],
					"inputs": [
						{
							"command": "deployCluster",
							"check": {
								"id": {
									"type": "string",
									"required": true
								}
							},
							"recursive": {
								"max": 1,
								"delay": 300
							},
						}
					]
				}
			};
			nock("http://dashboard.com:80").post('/bridge/executeDriver?access_token=token&soajs_project=soajs_project', {
				"type": "infra",
				"name": "google",
				"driver": "google",
				"command": "deleteCluster",
				"project": "demo",
				"options": {
					"envCode": "PORTAL",
					"force": true
				}
			}).reply(200, {
				result: true,
				data: true
			});
			utils.rollback(req, context, lib, async, BL, 'mongo', function (err, body) {
				nock.cleanAll();
				done();
			});
		});
		
		it("success infra with bad rollback", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				infraProvider: JSON.parse(JSON.stringify(infraRecord)),
				config: config,
				errors: [],
				opts: {
					"stage": "deployments",
					"group": "pre",
					"stepPath": "infra.cluster.deploy",
					"section": [
						"infra",
						"cluster",
						"deploy"
					],
					"inputs": [
						{
							"command": "deployCluster",
							"check": {
								"id": {
									"type": "string",
									"required": true
								}
							},
							"recursive": {
								"max": 1,
								"delay": 300
							},
						}
					]
				}
			};
			nock("http://dashboard.com:80").post('/bridge/executeDriver?access_token=token&soajs_project=soajs_project', {
				"type": "infra",
				"name": "google",
				"driver": "google",
				"command": "deleteCluster",
				"project": "demo",
				"options": {
					"envCode": "PORTAL",
					"force": true
				}
			}).reply(200, {
				result: false,
				errors: {
					details: [{
						message: "err"
					}]
				}
			});
			context.template.deploy.deployments.pre["infra.cluster.deploy"].status.rollback = [template.deploy.deployments.pre["infra.cluster.deploy"].status.rollback];
			utils.rollback(req, context, lib, async, BL, 'mongo', function (err, body) {
				nock.cleanAll();
				done();
			});
		});
		
		it("success infra no rollback", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				infraProvider: JSON.parse(JSON.stringify(infraRecord)),
				config: config,
				errors: [],
				opts: {
					"stage": "deployments",
					"group": "pre",
					"stepPath": "infra.cluster.deploy",
					"section": [
						"infra",
						"cluster",
						"deploy"
					],
					"inputs": [
						{
							"command": "deployCluster",
							"check": {
								"id": {
									"type": "string",
									"required": true
								}
							},
							"recursive": {
								"max": 1,
								"delay": 300
							},
						}
					]
				}
			};
			nock("http://dashboard.com:80").post('/bridge/executeDriver?access_token=token&soajs_project=soajs_project', {
				"type": "infra",
				"name": "google",
				"driver": "google",
				"command": "deleteCluster",
				"project": "demo",
				"options": {
					"envCode": "PORTAL",
					"force": true
				}
			}).reply(200, {
				result: false,
				errors: {
					details: [{
						message: "err"
					}]
				}
			});
			context.template.deploy.deployments.pre["infra.cluster.deploy"].status.rollback = [];
			utils.rollback(req, context, lib, async, BL, 'mongo', function (err, body) {
				nock.cleanAll();
				done();
			});
		});
		
		it("success infra rollback null", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				infraProvider: JSON.parse(JSON.stringify(infraRecord)),
				config: config,
				errors: [],
				opts: {
					"stage": "deployments",
					"group": "pre",
					"stepPath": "infra.cluster.deploy",
					"section": [
						"infra",
						"cluster",
						"deploy"
					],
					"inputs": [
						{
							"command": "deployCluster",
							"check": {
								"id": {
									"type": "string",
									"required": true
								}
							},
							"recursive": {
								"max": 1,
								"delay": 300
							},
						}
					]
				}
			};
			nock("http://dashboard.com:80").post('/bridge/executeDriver?access_token=token&soajs_project=soajs_project', {
				"type": "infra",
				"name": "google",
				"driver": "google",
				"command": "deleteCluster",
				"project": "demo",
				"options": {
					"envCode": "PORTAL",
					"force": true
				}
			}).reply(200, {
				result: false,
				errors: {
					details: [{
						message: "err"
					}]
				}
			});
			context.template.deploy.deployments.pre["infra.cluster.deploy"].status.rollback = [null];
			utils.rollback(req, context, lib, async, BL, 'mongo', function (err, body) {
				nock.cleanAll();
				done();
			});
		});
		
		it("success infra no rollback", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				infraProvider: JSON.parse(JSON.stringify(infraRecord)),
				config: config,
				errors: [],
				opts: {
					"stage": "deployments",
					"group": "pre",
					"stepPath": "infra.cluster.deploy",
					"section": [
						"infra",
						"cluster",
						"deploy"
					],
					"inputs": [
						{
							"command": "deployCluster",
							"check": {
								"id": {
									"type": "string",
									"required": true
								}
							},
							"recursive": {
								"max": 1,
								"delay": 300
							},
						}
					]
				}
			};
			nock("http://dashboard.com:80").post('/bridge/executeDriver?access_token=token&soajs_project=soajs_project', {
				"type": "infra",
				"name": "google",
				"driver": "google",
				"command": "deleteCluster",
				"project": "demo",
				"options": {
					"envCode": "PORTAL",
					"force": true
				}
			}).reply(200, {
				result: false,
				errors: {
					details: [{
						message: "err"
					}]
				}
			});
			delete context.template.deploy.deployments.pre["infra.cluster.deploy"].status.rollback;
			utils.rollback(req, context, lib, async, BL, 'mongo', function (err, body) {
				nock.cleanAll();
				done();
			});
		});
	});
});
