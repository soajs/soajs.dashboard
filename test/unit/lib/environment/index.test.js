"use strict";
const sinon = require('sinon');
var assert = require("assert");
var helper = require("../../../helper.js");
var utils = helper.requireModule('./lib/environment/index.js');
var mongoModel = helper.requireModule('./models/mongo.js');

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
		inputmaskData: {}
	}
};

var res = {};
var config = {};
var deployer = {
	
	listServices: function (options, cb) {
		var services = [
		
		];
		
		return cb(null, services);
	},

    createNameSpace: function (options, cb) {
        return cb(null, true);
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
			cb(null, {metadata: {}});
		},
		removeEntry: function (soajs, opts, cb) {
			cb(null, true);
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

describe("testing environment.js", function () {
	
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