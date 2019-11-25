"use strict";
const assert = require("assert");
const helper = require("../../../helper.js");
const utils = helper.requireModule('./lib/environment/status.js');
const statusUtils = helper.requireModule("./lib/environment/statusUtils");
const sinon = require('sinon');

function stubStatusUtils(error) {
	sinon
		.stub(statusUtils, 'custom_registry')
		.yields(error, true);
	sinon
		.stub(statusUtils, 'products')
		.yields(error, true);
	sinon
		.stub(statusUtils, 'tenants')
		.yields(error, true);
	sinon
		.stub(statusUtils, 'secrets')
		.yields(error, true);
	sinon
		.stub(statusUtils, 'repos')
		.yields(error, true);
	sinon
		.stub(statusUtils, 'resources')
		.yields(error, true);
}

let timer = 500;
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
					validate: function () {
						return {
							errors: []
						};
					}
				};
			}
		}
	}
};
let mongoStub = {
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
	},
	removeEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	closeConnection: function (soajs) {
		return true;
	}
};
let BL = {
	model: mongoStub
};
let config = {};
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
				'deployments__dot__repo__dot__controller': {
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
				'deployments__dot__resources__dot__nginx': {
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
	}
};
let errorTemplate = {
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
		"database": {
			"pre": {
				"custom_registry": {}
			},
			"steps": {
				"productization": {
					"ui": {
						"readOnly": true
					}
				},
				"tenant": {
					"ui": {
						"readOnly": true
					}
				}
			},
			"post": {
				"deployments__dot__resources__dot__external": {}
			}
		},
		"deployments": {
			"pre": {},
			"steps": {
				"secrets": {
					"mike": {}
				},
				"deployments__dot__repo__dot__controller": {},
				"deployments__dot__resources__dot__nginx": {}
			},
			"post": {}
		}
	}
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
	profile: ''
};

describe("testing lib/environment/status.js", function () {
	
	describe("testing validateDeploymentInputs", function () {
		it("Success", function (done) {
			stubStatusUtils(null);
			utils.validateDeploymentInputs(req, BL, config, environmentRecord, JSON.parse(JSON.stringify(template)), {_id: 123}, function (err, body) {
				assert.ok(body);
				sinon.restore(statusUtils);
				done();
			});
		});
		
		it("Errors", function (done) {
			stubStatusUtils(null);
			utils.validateDeploymentInputs(req, BL, config, environmentRecord, JSON.parse(JSON.stringify(errorTemplate)), {_id: 123}, function (err, body) {
				assert.ok(err);
				sinon.restore(statusUtils);
				done();
			});
		});
	});
	
	describe("testing resumeDeployment", function () {
		it("Success", function (done) {
			stubStatusUtils(null);
			req.soajs.inputmaskData = {
				resume: true
			};
			utils.resumeDeployment(req, BL, config, environmentRecord, JSON.parse(JSON.stringify(template)), {_id: 123}, function (err, body) {
				setTimeout(() => {
					assert.ok(body);
					sinon.restore(statusUtils);
					done();
				}, timer);
			});
		});
		
		it("Error", function (done) {
			stubStatusUtils(true);
			req.soajs.inputmaskData = {
				resume: true
			};
			BL.model.saveEntry = function (soajs, opts, cb) {
				cb(true, true);
			};
			
			utils.resumeDeployment(req, BL, config, environmentRecord, JSON.parse(JSON.stringify(template)), {_id: 123}, function (err, body) {
				setTimeout(() => {
					assert.ok(body);
					sinon.restore(statusUtils);
					done();
				}, timer);
			});
		});
	});
	
	describe("testing checkProgress", function () {
		it("Success", function (done) {
			stubStatusUtils(null);
			req.soajs.inputmaskData = {};
			utils.checkProgress(req, BL, config, environmentRecord, JSON.parse(JSON.stringify(template)), {_id: 123}, function (err, body) {
				setTimeout(() => {
					assert.ok(body);
					sinon.restore(statusUtils);
					done();
				}, timer);
			});
		});
		it.skip("Success", function (done) {
			stubStatusUtils(null);
			req.soajs.inputmaskData = {
				rollback: true
			};
			utils.checkProgress(req, BL, config, environmentRecord, JSON.parse(JSON.stringify(template)), {_id: 123}, function (err, body) {
				setTimeout(() => {
					assert.ok(body);
					sinon.restore(statusUtils);
					done();
				}, timer);
			});
		});
	});
});