"use strict";
const sinon = require('sinon');
var assert = require("assert");
var helper = require("../../../helper.js");
var utils = helper.requireModule('./lib/environment/index.js');
var mongoModel = helper.requireModule('./models/mongo.js');
var status = helper.requireModule('./lib/environment/status.js');
function stubStatusUtils() {
	sinon
		.stub(status, 'validateDeploymentInputs')
		.yields(null, true);
	sinon
		.stub(status, 'resumeDeployment')
		.yields(null, true);
	sinon
		.stub(status, 'checkProgress')
		.yields(null, true);
	sinon
		.stub(status, 'rollbackDeployment')
		.yields(null, true);
}
var environment;

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

var input =  {
	data:
		{
			code: 'MIKE',
			description: 'mike env',
			sensitive: false,
			tKeyPass: 'sadf asdf asdf as',
			apiPrefix: 'mike-api',
			sitePrefix: 'mike-site',
			domain: 'soajs.local',
			deploy:
				{
					previousEnvironment: "last"
				},
			templateId: '5ac39208c29b8c2e3fd9279a',
			soajsFrmwrk: true,
			cookiesecret: 1,
			sessionName: 2,
			sessionSecret: 3,
		},
	template:
		{
			deploy:
				{
					database:
						{
							pre:
								{
									custom_registry:
										{
											imfv:
												[{
													name: 'ciConfig',
													locked: true,
													plugged: false,
													shared: true,
													value: {test1: true}
												},
													{
														name: 'ciConfig2',
														locked: true,
														plugged: false,
														shared: true,
														value: {test2: true}
													},
													{
														name: 'ciConfig3',
														locked: true,
														plugged: false,
														shared: true,
														value: {test3: true}
													}]
										}
								},
							steps:
								{
									productization: {ui: {readOnly: true}},
									tenant: {ui: {readOnly: true}}
								},
							post:
								{
									'deployments.resources.external':
										{
											imfv:
												[{
													name: 'external',
													type: 'cluster',
													category: 'mongo',
													locked: false,
													shared: false,
													plugged: false,
													config: {username: 'username', password: 'pwd'}
												}]
										}
								}
						},
					deployments:
						{
							pre: {},
							steps:
								{
									secrets: {
										imfv: [{
											name: 'mike',
											type: 'Generic',
											data: 'something in secret'
										}]
									},
									'deployments.repo.controller':
										{
											imfv:
												[{
													name: 'controller',
													options:
														{
															deployConfig:
																{
																	replication: {
																		mode: 'replicated',
																		replicas: 1
																	},
																	memoryLimit: 524288000
																},
															gitSource:
																{
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
												}]
										},
									'deployments.resources.nginx':
										{
											imfv:
												[{
													name: 'nginx',
													type: 'server',
													category: 'nginx',
													locked: false,
													shared: false,
													plugged: false,
													config: null,
													deploy:
														{
															options:
																{
																	deployConfig: {
																		replication: {mode: 'global'},
																		memoryLimit: 524288000
																	},
																	custom:
																		{
																			sourceCode: {},
																			secrets:
																				[{
																					name: 'mike',
																					mountPath: '/etc/soajs/certs',
																					type: 'certificate'
																				}],
																			name: 'mynginx',
																			type: 'server'
																		},
																	recipe: '5ab4d65bc261bdb38a9fe363',
																	env: 'MIKE'
																},
															deploy: true,
															type: 'custom'
														}
												}]
										}
								},
							post: {}
						}
				}
		}

}

var res = {};
var config = {
	"errors": {}
};
var deployer = {
	listServices: function (options, cb) {
		var services = [];
		
		return cb(null, services);
	},
	createNameSpace: function (options, cb) {
		return cb(null, true);
	},
	execute: function (in1, in2, in3, cb) {
		return cb(null, {});
	}
};
var mongoStub = {
	checkForMongo: function (soajs) {
		return true;
	},
	validateId: function (soajs, cb) {
		return cb(null, soajs.inputmaskData.id);
	},
	findEntry: function (soajs, opts, cb) {
		cb(null, {
			metadata: {}
		});
	},
	findEntries: function (soajs, opts, cb) {
		cb(null, [input.template]);
	},
	countEntries: function (soajs, opts, cb) {
		cb(null, 0);
	},
	getDb: function (data) {
		return {
			ObjectId: function () {
				return data;
			}
		}
	},
	removeEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	insertEntry: function (soajs, opts, cb) {
		cb(null, [{
			_id: 1,
			code: "code"
		}]);
	},
	saveEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	initConnection: function (soajs) {
		return true;
	},
	closeConnection: function (soajs) {
		return true;
	},
	switchConnection: function (soajs) {
	}
};

it("Init environment model", function (done) {

	utils.init('mongo', function (error, body) {
		assert.ok(body);
		environment = body;
		environment.model = mongoModel;
		done();
	});
});

describe("testing index.js", function () {

	beforeEach(() => {
		environment.model = mongoStub;
	});

	afterEach(function (done) {
		done();
	});

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

	});

	describe("testing add environment", function () {

		it("Success add", function (done) {
			req.soajs.inputmaskData = input;
			stubStatusUtils();
			mongoStub.findEntry = function (soajs, opts, cb) {
				cb(null, {
					template: {
						"name": "SOAJS Microservices Environment",
						"description": "This template will create an environment with SOAJS API Gateway configured, deployed & ready to use. You can leverage this environment to deploy microservices.",
						"link": "https://soajsorg.atlassian.net/wiki/spaces/DSBRD/pages/400588803/SOAJS+Microservices+Environment",
						"logo": "modules/dashboard/templates/images/soajs.png",
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
								}
							}
						}
					},
					"deployer": {
						"type": "container",
						"selected": "container.kubernetes.local",
						"container": {
							"docker": {
								"local": {
									"socketPath": "/var/run/docker.sock"
								},
								"remote": {
									"nodes": []
								}
							},
							"kubernetes": {
								"local": {
									"namespace": {
										"default": "test",
										"perService": false
									}
								},
								"remote": {
									"nodes": []
								}
							}
						}
					}
				});
			};
 			req.soajs.validator = {
				Validator: function () {
					return {
						validate: function (boolean) {
							return {
								valid: true,
								errors: []
							};
						}
					};
				}
			};
			environment.add(config, req, res, function (error, body) {
				assert.ok(body);
				sinon.restore(status);
				done();
			});
		});

		it("Success add previous", function (done) {
			req.soajs.inputmaskData = input;
			req.soajs.inputmaskData.data.soajsFrmwrk = true;
			req.soajs.inputmaskData.data.cookiesecret = 1;
			req.soajs.inputmaskData.data.sessionName = 2;
			req.soajs.inputmaskData.data.sessionSecret = 3;
			req.soajs.inputmaskData.data.deploy = {
				previousEnvironment: "last"
			};
			stubStatusUtils();
			environment.add(config, req, res, function (error, body) {
				assert.ok(body);
				sinon.restore(status);
				done();
			});
		});

		it("Fail validating inputs", function (done) {
			req.soajs.inputmaskData = input;
			sinon
				.stub(status, 'validateDeploymentInputs')
				.yields(true);
			sinon
				.stub(status, 'resumeDeployment')
				.yields(null, true);
			sinon
				.stub(status, 'checkProgress')
				.yields(null, true);
			sinon
				.stub(status, 'rollbackDeployment')
				.yields(null, true);
			environment.model.removeEntry = function (soajs, opts, cb) {
				cb(true);
			};
			environment.add(config, req, res, function (error, body) {
				assert.ok(error);
				sinon.restore(status);
				done();
			});
		});

	});

	describe("testing getDeploymentStatus", function () {

		it("Success environment has been deployment - activate", function (done) {
			req.soajs.inputmaskData = {
				code: 'MIKE',
				rollback: true,
				activate: true,
				resume: true,
			};
			environment.model.findEntry = function (soajs, opts, cb) {
				cb(null, {
					pending: true,
					error: true
				});
			};
			environment.getDeploymentStatus(config, req, res, function (error, body) {
				assert.ok(body);
				done();
			});
		});

		it("Success environment has been deployment - activate", function (done) {
			req.soajs.inputmaskData = {
				code: 'MIKE',
				rollback: true,
				activate: false,
				resume: true,
			};
			stubStatusUtils();
			environment.getDeploymentStatus(config, req, res, function (error, body) {
				assert.ok(body);
				sinon.restore(status);
				done();
			});
		});

		it("Success ", function (done) {
			req.soajs.inputmaskData = {
				code: 'MIKE',
				rollback: true,
				activate: true,
				resume: true,
			};
			environment.getDeploymentStatus(config, req, res, function (error, body) {
				assert.ok(body);
				done();
			});
		});

		it("Success with id", function (done) {
			req.soajs.inputmaskData = {
				id: '1234',
				rollback: true,
				activate: true,
				resume: true,
			};
			environment.getDeploymentStatus(config, req, res, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		it("Success with rollback", function (done) {
			req.soajs.inputmaskData = {
				id: '1234',
				rollback: true,
				activate: true,
				resume: true,
			};
			environment.getDeploymentStatus(config, req, res, function (error, body) {
				assert.ok(body);
				done();
			});
		});

	});

	describe("testing Update deployer configuration", function () {

		it("Success removeCert", function (done) {
			mongoStub.findEntry = function (soajs, opts, cb) {
				cb(null, {
					"code": "QA",
					"description":  "this is the QA environment",
					"deployer": {
						"type": "container",
						"selected": "container.kubernetes.local",
						"container": {
							"docker": {
								"local": {
									"socketPath": "/var/run/docker.sock"
								},
								"remote": {
									"nodes": []
								}
							},
							"kubernetes": {
								"local": {
                                    "namespace": {
                                    	"default": "test",
										"perService": false
									}
								},
								"remote": {
									"nodes": []
								}
							}
						}
					},
					"dbs": {
						"clusters": {
							"cluster1": {
								"servers": [
									{
										"host": "127.0.0.1",
										"port": 27017
									}
								],
								"credentials": null,
								"URLParam": {
									"connectTimeoutMS": 0,
									"socketTimeoutMS": 0,
									"maxPoolSize": 5,
									"wtimeoutMS": 0,
									"slaveOk": true
								},
								"extraParam": {
									"db": {
										"native_parser": true
									},
									"server": {
										"auto_reconnect": true
									}
								}
							}
						},
						"config": {
							"prefix": "",
							"session": {
								"cluster": "cluster1",
								"name": "core_session",
								"store": {},
								"collection": "sessions",
								"stringify": false,
								"expireAfter": 1209600000
							}
						},
						"databases": {
							"urac": {
								"cluster": "cluster1",
								"tenantSpecific": true
							}
						}
					},
					"services": {
						"controller": {
							"maxPoolSize": 100,
							"authorization": true,
							"requestTimeout": 30,
							"requestTimeoutRenewal": 0
						},
						"config": {
							"awareness": {
								"healthCheckInterval": 500,
								"autoRelaodRegistry": 300000,
								"maxLogCount": 5,
								"autoRegisterService": true
							},
							"agent": {
								"topologyDir": "/opt/soajs/"
							},
							"key": {
								"algorithm": "aes256",
								"password": "soajs key lal massa"
							},
							"logger": {
								"src": true,
								"level": "fatal",
								"formatter": {
									"outputMode": "short"
								}
							},
							"cors": {
								"enabled": true,
								"origin": "*",
								"credentials": "true",
								"methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
								"headers": "key,soajsauth,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type",
								"maxage": 1728000
							},
							"oauth": {
								"grants": [
									"password",
									"refresh_token"
								],
								"accessTokenLifetime": 7200,
								"refreshTokenLifetime": 1209600,
								"debug": false
							},
							"ports": {
								"controller": 4000,
								"maintenanceInc": 1000,
								"randomInc": 100
							},
							"cookie": {
								"secret": "this is a secret sentence"
							},
							"session": {
								"name": "soajsID",
								"secret": "this is antoine hage app server",
								"rolling": false,
								"unset": "keep",
								"cookie": {
									"path": "/",
									"httpOnly": true,
									"secure": false,
									"domain": "soajs.com",
									"maxAge": null
								},
								"resave": false,
								"saveUninitialized": false
							}
						}
					}
				});
			};
			mongoStub.saveEntry = function (soajs, opts, cb) {
				cb(null, true);
			};

			req.soajs.inputmaskData.env = 'qa';
			req.soajs.inputmaskData.driver = 'local';
			req.soajs.inputmaskData.config = {
					namespace :{
						default : 'soajs',
						perService: false
					}
			};
			
			environment.updateDeployerConfig(config, req, deployer, function (error, body) {
				assert.ok(body);
				done();
			});
		});

	});

});
