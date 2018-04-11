"use strict";
var async = require("async");
var helper = require("../../../../helper.js");
var config = require("../../../../../config.js");
var utils = helper.requireModule('./lib/environment/drivers/products.js');

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
	},
	removeEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	closeConnection: function (soajs) {
		return true;
	}
};
var BL = {
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
		}
	},
	resources: {
		module: {}
	},
	products: {
		module: {}
	}
};
var template = {
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
			pre: {},
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
			post: {}
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

var lib = {
	initBLModel: function (module, modelName, cb) {
		return cb(null, {
			add: function (context, req, data, cb) {
				return cb(null, true);
			},
			get: function (context, req, data, cb) {
				return cb(null, {
					name: "1",
					_id: "1",
					code: "1"
				});
			},
			delete: function (context, req, data, cb) {
				return cb(null, true);
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
				return cb(true);
			},
			addResource: function (context, req, data, cb) {
				return cb(null, {_id: "1"});
			},
			setConfig: function (context, req, data, cb) {
				return cb(null, true);
			},
			updatePackage: function (context, req, data, cb) {
				return cb(null, true);
			},
			addPackage: function (context, req, data, cb) {
				return cb(null, true);
			},
			getPackage: function (context, req, data, cb) {
				return cb(null, {
					_id: "1",
					name: "1",
					description: "1",
					_TTL: "1",
					code: "1",
					acl: {}
				});
			},
			
			deleteResource: function (context, req, data, cb) {
				return cb(true);
			},
		});
	},
	checkReturnError: function (req, {}, {}, cb) {
		return cb(null, true);
	}
};
var context = {};
describe("testing products.js", function () {
	
	describe("testing validate", function () {
		
		it("fail does not support deploying Products", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: {content: {}},
				config: config,
				errors: [],
				opts: {
					stage: 'database',
					group: 'steps',
					stepPath: 'productization',
					section: 'productization'
				}
			};
			utils.validate(req, context, lib, async, BL, 'mongo', function (err, body) {
				done();
			})
		});
		
		it("success", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				config: config,
				errors: [],
				opts: {
					stage: 'database',
					group: 'steps',
					stepPath: 'productization',
					section: 'productization'
				}
			};
			utils.validate(req, context, lib, async, BL, 'mongo', function (err, body) {
				done();
			})
		});
	});
	
	describe("testing deploy", function () {
		
		it("success products already deployed", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				config: config,
				errors: [],
				opts: {
					stage: 'database',
					group: 'steps',
					stepPath: 'productization',
					section: 'productization'
				}
			};
			context.template.deploy.database.steps["productization"].status = {
				done: true
			};
			utils.deploy(req, context, lib, async, BL, 'mongo', function (err, body) {
				done();
			})
		});
		
		it("success products with a status", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				config: config,
				errors: [],
				opts: {
					stage: 'database',
					group: 'steps',
					stepPath: 'productization',
					section: 'productization'
				}
			};
			context.template.deploy.database.steps["productization"].status = {
				done: false
			};
			utils.deploy(req, context, lib, async, BL, 'mongo', function (err, body) {
				done();
			})
		});
		
		it("success products with Product entry already created", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				config: config,
				errors: [],
				opts: {
					stage: 'database',
					group: 'steps',
					stepPath: 'productization',
					section: 'productization'
				}
			};
			context.template.deploy.database.steps["productization"].status = {
				done: false,
				data: [
					{
						name: "MIKE"
					},
					{
						name: "noMike"
					}
				]
			};
			utils.deploy(req, context, lib, async, BL, 'mongo', function (err, body) {
				done();
			})
		});
		
		it("success products with no entries", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				config: config,
				errors: [],
				opts: {
					stage: 'database',
					group: 'steps',
					stepPath: 'productization',
					section: 'productization'
				}
			};
			context.template.content.productization.data = [];
			utils.deploy(req, context, lib, async, BL, 'mongo', function (err, body) {
				done();
			})
		});
		
		it("success products with a package", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				config: config,
				errors: [],
				opts: {
					stage: 'database',
					group: 'steps',
					stepPath: 'productization',
					section: 'productization'
				}
			};
			utils.deploy(req, context, lib, async, BL, 'mongo', function (err, body) {
				done();
			})
		});
		
		it("success products with no package found", function (done) {
			lib = {
				initBLModel: function (module, modelName, cb) {
					return cb(null, {
						add: function (context, req, data, cb) {
							return cb(null, true);
						},
						get: function (context, req, data, cb) {
							return cb(null, {
								name: "1",
								_id: "1",
								code: "1"
							});
						},
						delete: function (context, req, data, cb) {
							return cb(null, true);
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
							return cb(true);
						},
						addResource: function (context, req, data, cb) {
							return cb(null, {_id: "1"});
						},
						setConfig: function (context, req, data, cb) {
							return cb(null, true);
						},
						updatePackage: function (context, req, data, cb) {
							return cb(null, true);
						},
						addPackage: function (context, req, data, cb) {
							return cb(null, true);
						},
						getPackage: function (context, req, data, cb) {
							return cb(null, null);
						},
						deleteResource: function (context, req, data, cb) {
							return cb(true);
						},
					});
				},
				checkReturnError: function (req, {}, {}, cb) {
					return cb(null, true);
				}
			};
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				config: config,
				errors: [],
				opts: {
					stage: 'database',
					group: 'steps',
					stepPath: 'productization',
					section: 'productization'
				}
			};
			utils.deploy(req, context, lib, async, BL, 'mongo', function (err, body) {
				done();
			})
		});
		
		it("success products with no product found", function (done) {
			lib = {
				initBLModel: function (module, modelName, cb) {
					return cb(null, {
						add: function (context, req, data, cb) {
							return cb(null, "555");
						},
						get: function (context, req, data, cb) {
							if (req.soajs.inputmaskData.id === "555") {
								return cb(null, {
									_id: "2",
									name: "2",
									description: "2",
									_TTL: "2",
									code: "2",
									acl: {}
								});
							} else {
								return cb(null, null);
							}
						},
						delete: function (context, req, data, cb) {
							return cb(null, true);
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
							return cb(true);
						},
						addResource: function (context, req, data, cb) {
							return cb(null, {_id: "1"});
						},
						setConfig: function (context, req, data, cb) {
							return cb(null, true);
						},
						updatePackage: function (context, req, data, cb) {
							return cb(null, true);
						},
						addPackage: function (context, req, data, cb) {
							return cb(null, true);
						},
						getPackage: function (context, req, data, cb) {
							return cb(null, null);
						},
						deleteResource: function (context, req, data, cb) {
							return cb(true);
						},
					});
				},
				checkReturnError: function (req, {}, {}, cb) {
					return cb(null, true);
				}
			};
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				config: config,
				errors: [],
				opts: {
					stage: 'database',
					group: 'steps',
					stepPath: 'productization',
					section: 'productization'
				}
			};
			utils.deploy(req, context, lib, async, BL, 'mongo', function (err, body) {
				done();
			})
		});
		
	});
	
	describe("testing rollback", function () {
		
		it("success products no status", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				config: config,
				errors: [],
				opts: {
					stage: 'database',
					group: 'steps',
					stepPath: 'productization',
					section: 'productization'
				}
			};
			delete context.template.deploy.database.steps["productization"].status;
			utils.rollback(req, context, lib, async, BL, 'mongo', function (err, body) {
				done();
			})
		});
		
		it("success products not done", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				config: config,
				errors: [],
				opts: {
					stage: 'database',
					group: 'steps',
					stepPath: 'productization',
					section: 'productization'
				}
			};
			context.template.deploy.database.steps["productization"].status = {
				done: false
			};
			utils.rollback(req, context, lib, async, BL, 'mongo', function (err, body) {
				done();
			})
		});
		
		it("success products ", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				config: config,
				errors: [],
				opts: {
					stage: 'database',
					group: 'steps',
					stepPath: 'productization',
					section: 'productization'
				}
			};
			context.template.deploy.database.steps["productization"].status = {
				done: true
			};
			utils.rollback(req, context, lib, async, BL, 'mongo', function (err, body) {
				done();
			})
		});
		
		it("success products with no entries", function (done) {
			context.template.content.productization.data = [];
			utils.rollback(req, context, lib, async, BL, 'mongo', function (err, body) {
				done();
			})
		});
		
		it("success products with no product", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				config: config,
				errors: [],
				opts: {
					stage: 'database',
					group: 'steps',
					stepPath: 'productization',
					section: 'productization'
				}
			};
			context.template.deploy.database.steps["productization"].status = {
				done: true
			};
			lib = {
				initBLModel: function (module, modelName, cb) {
					return cb(null, {
						add: function (context, req, data, cb) {
							return cb(null, true);
						},
						get: function (context, req, data, cb) {
							return cb(null, {
								"_id": "1",
								"code": "TPROD",
								"name": "Test Product",
								"description": "this is a description for test product",
								"packages": [
									{
										"code": "TPROD_BASIC",
										"name": "basic package",
										"description": "this is a description for test product basic package",
										"acl": {
											"urac": {}
										},
										"_TTL": 86400000
									},
									{
										"code": "TPROD_EXAMPLE03",
										"name": "example03 package",
										"description": "this is a description for test product example03 package",
										"acl": {
											"urac": {},
											"example03": {}
										},
										"_TTL": 86400000
									}
								]
							});
						},
						delete: function (context, req, data, cb) {
							return cb(null, true);
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
							return cb(true);
						},
						addResource: function (context, req, data, cb) {
							return cb(null, {_id: "1"});
						},
						setConfig: function (context, req, data, cb) {
							return cb(null, true);
						},
						updatePackage: function (context, req, data, cb) {
							return cb(null, true);
						},
						addPackage: function (context, req, data, cb) {
							return cb(null, true);
						},
						getPackage: function (context, req, data, cb) {
							return cb(null, {
								_id: "1",
								name: "1",
								description: "1",
								_TTL: "1",
								code: "1",
								acl: {}
							});
						},
						
						deleteResource: function (context, req, data, cb) {
							return cb(true);
						},
					});
				},
				checkReturnError: function (req, {}, {}, cb) {
					return cb(null, true);
				}
			};
			mongoStub = {
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
					cb(true, true);
				},
				removeEntry: function (soajs, opts, cb) {
					cb(true, true);
				},
				closeConnection: function (soajs) {
					return true;
				}
			};
			BL = {
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
					}
				},
				resources: {
					module: {}
				},
				products: {
					module: {}
				}
			};
			utils.rollback(req, context, lib, async, BL, 'mongo', function (err, body) {
				done();
			})
		});
		
		it("success products with no product and no acl", function (done) {
			context = {
				BL: BL,
				environmentRecord: environmentRecord,
				template: JSON.parse(JSON.stringify(template)),
				config: config,
				errors: [],
				opts: {
					stage: 'database',
					group: 'steps',
					stepPath: 'productization',
					section: 'productization'
				}
			};
			context.template.deploy.database.steps["productization"].status = {
				done: true
			};
			lib = {
				initBLModel: function (module, modelName, cb) {
					return cb(null, {
						add: function (context, req, data, cb) {
							return cb(null, true);
						},
						get: function (context, req, data, cb) {
							return cb(null, {
								"_id": "1",
								"code": "TPROD",
								"name": "Test Product",
								"description": "this is a description for test product",
								"packages": [
									{
										"code": "TPROD_BASIC",
										"name": "basic package",
										"description": "this is a description for test product basic package",
										"acl": {},
										"_TTL": 86400000
									},
									{
										"code": "TPROD_EXAMPLE03",
										"name": "example03 package",
										"description": "this is a description for test product example03 package",
										"acl": {},
										"_TTL": 86400000
									}
								]
							});
						},
						delete: function (context, req, data, cb) {
							return cb(null, true);
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
							return cb(true);
						},
						addResource: function (context, req, data, cb) {
							return cb(null, {_id: "1"});
						},
						setConfig: function (context, req, data, cb) {
							return cb(null, true);
						},
						updatePackage: function (context, req, data, cb) {
							return cb(null, true);
						},
						addPackage: function (context, req, data, cb) {
							return cb(null, true);
						},
						getPackage: function (context, req, data, cb) {
							return cb(null, {
								_id: "1",
								name: "1",
								description: "1",
								_TTL: "1",
								code: "1",
								acl: {}
							});
						},
						
						deleteResource: function (context, req, data, cb) {
							return cb(true);
						},
					});
				},
				checkReturnError: function (req, {}, {}, cb) {
					return cb(null, true);
				}
			};
			mongoStub = {
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
					cb(true, true);
				},
				removeEntry: function (soajs, opts, cb) {
					cb(true, true);
				},
				closeConnection: function (soajs) {
					return true;
				}
			};
			BL = {
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
					}
				},
				resources: {
					module: {}
				},
				products: {
					module: {}
				}
			};
			utils.rollback(req, context, lib, async, BL, 'mongo', function (err, body) {
				done();
			})
		});
	})
});