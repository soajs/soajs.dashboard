"use strict";
var assert = require("assert");
var helper = require("../../../../helper.js");
var helpers = helper.requireModule('./lib/helpers/cloud/deploy.js');
var config = helper.requireModule('./config.js');

var mongoStub = {
	checkForMongo: function (soajs) {
		return true;
	},
	validateId: function (soajs, cb) {
		return cb(null, soajs.inputmaskData.id);
	},
	findEntry: function (soajs, opts, cb) {
		cb(null, {});
	},
	removeEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	saveEntry: function (soajs, opts, cb) {
		cb(null, true);
	}
};
var deployer = helper.deployer;

describe("testing deploy.js", function () {
	var soajs = {
		log: {
			debug: function (data) {
				console.log(data);
			},
			error: function (data) {
				console.log(data);
			},
			info: function (data) {
				console.log(data);
			}
		},
		// uracDriver: {},
		inputmaskData: {},
		tenant: {}
	};
	var BL = {
		model: mongoStub
	};
	var context = {
		catalog: {
			recipe: {
				deployOptions: {
					image: {
						name: "soajs",
						prefix: ""
					},
					voluming: {}
				},
				buildOptions: {
					env: {}
				}
			}
		}
	};
	describe("getGitRecord", function () {
		var repo;
		beforeEach(() => {
			
		});
		it("Success getGitRecord", function (done) {
			helpers.getGitRecord(soajs, repo, BL, function (error, body) {
				done();
			});
		});
		
	});
	
	describe("computeCatalogEnvVars", function () {
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
		beforeEach(() => {
			mongoStub.findEntry = function (soajs, opts, cb) {
				cb(null, envRecord);
			};
		});
		
		it("Fail computeCatalogEnvVars", function (done) {
			helpers.computeCatalogEnvVars(context, soajs, config, function (error, body) {
				done();
			});
		});
		
		it("Success computeCatalogEnvVars", function (done) {
			context = {
				variables: {
					'$SOAJS_ENV': "DEV"
				},
				catalog: {
					recipe: {
						deployOptions: {
							image: {
								name: "soajs",
								prefix: ""
							},
							voluming: {}
						},
						buildOptions: {
							env: {
								NODE_ENV: {
									type: 'static', value: 'production'
								},
								SOAJS_ENV: { type: 'computed', value: '$SOAJS_ENV' },
								SOAJS_PROFILE: {
									type: 'static',
									value: '/opt/soajs/FILES/profiles/profile.js'
								},
								SOAJS_SRV_AUTOREGISTERHOST: { type: 'static', value: 'true' },
								SOAJS_SRV_MEMORY: { type: 'computed', value: '$SOAJS_SRV_MEMORY' },
								SOAJS_GC_NAME: { type: 'computed', value: '$SOAJS_GC_NAME' },
								SOAJS_GC_VERSION: { type: 'computed', value: '$SOAJS_GC_VERSION' },
								SOAJS_GIT_BRANCH: { type: 'computed', value: '$SOAJS_GIT_BRANCH' },
								SOAJS_GIT_COMMIT: { type: 'computed', value: '$SOAJS_GIT_COMMIT' },
								SOAJS_HA_NAME: { type: 'computed', value: '$SOAJS_HA_NAME' },
								SOAJS_MONGO_AUTH_DB: { type: 'computed', value: '$SOAJS_MONGO_AUTH_DB' },
								SOAJS_MONGO_SSL: { type: 'computed', value: '$SOAJS_MONGO_SSL' },
								SOAJS_DEPLOY_ACC: { type: 'static', value: 'true' },
								NEW_VAR: {
									type: 'userInput'
								},
								NEW2_VAR: {
									type: 'userInput', default: '123'
								}
							}
						}
					}
				}
			};
			soajs.inputmaskData = {
				custom: {
					env: {
						NEW_VAR: "123"
					}
				}
			};
			helpers.computeCatalogEnvVars(context, soajs, config, function (error, body) {
				done();
			});
		});
		
	});
	
	describe("getDashDbInfo", function () {
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
		beforeEach(() => {
			mongoStub.findEntry = function (soajs, opts, cb) {
				cb(null, envRecord);
			};
		});
		it("Success getDashDbInfo", function (done) {
			helpers.getDashDbInfo(soajs, BL, function (error, body) {
				done();
			});
		});
		
	});
	
	describe("deployContainer", function () {
		before(() => {
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
							servers: {},
							credentials: {}
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
			soajs.inputmaskData = {
				custom: {
					env: {
						NEW_VAR: "123"
					}
				},
				deployConfig: {
					replication: {
						mode: ""
					}
				}
			};
			context = {
				options: {},
				name: 'urac',
				envRecord: envRecord,
				variables: {
					'$SOAJS_ENV': "DEV"
				},
				catalog: {
					_id: '12345',
					recipe: {
						deployOptions: {
							image: {
								name: "soajs",
								prefix: ""
							},
							voluming: {}
						},
						buildOptions: {
							env: {
								NODE_ENV: {
									type: 'static', value: 'production'
								},
								SOAJS_ENV: { type: 'computed', value: '$SOAJS_ENV' },
								SOAJS_PROFILE: {
									type: 'static',
									value: '/opt/soajs/FILES/profiles/profile.js'
								},
								SOAJS_SRV_AUTOREGISTERHOST: { type: 'static', value: 'true' },
								SOAJS_SRV_MEMORY: { type: 'computed', value: '$SOAJS_SRV_MEMORY' },
								SOAJS_GC_NAME: { type: 'computed', value: '$SOAJS_GC_NAME' },
								SOAJS_GC_VERSION: { type: 'computed', value: '$SOAJS_GC_VERSION' },
								SOAJS_GIT_BRANCH: { type: 'computed', value: '$SOAJS_GIT_BRANCH' },
								SOAJS_GIT_COMMIT: { type: 'computed', value: '$SOAJS_GIT_COMMIT' },
								SOAJS_HA_NAME: { type: 'computed', value: '$SOAJS_HA_NAME' },
								SOAJS_MONGO_AUTH_DB: { type: 'computed', value: '$SOAJS_MONGO_AUTH_DB' },
								SOAJS_MONGO_SSL: { type: 'computed', value: '$SOAJS_MONGO_SSL' },
								SOAJS_DEPLOY_ACC: { type: 'static', value: 'true' },
								NEW_VAR: {
									type: 'userInput'
								},
								NEW2_VAR: {
									type: 'userInput', default: '123'
								}
							}
						}
					}
				}
			};
			
			mongoStub.findEntry = function (soajs, opts, cb) {
				cb(null, envRecord);
			};
		});
		it("Success deployContainer", function (done) {
			console.log('deploy Container');
			console.log('deploy Container');
			helpers.deployContainer(config, context, soajs, deployer, BL, function (error, body) {
				done();
			});
		});
		
	});
});