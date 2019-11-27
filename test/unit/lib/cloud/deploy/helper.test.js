"use strict";
const assert = require("assert");
const helper = require("../../../../helper.js");
const helpers = helper.requireModule('./lib/cloud/deploy/helper.js');
const config = helper.requireModule('./config.js');

let mongoStub = {
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
	},
	switchConnection: function (soajs) {
		return {
			"test": ''
		};
	}
};
let deployer = helper.deployer;

describe("testing lib/cloud/deploy/helper.js", function () {
	let soajs = {
		log: {
			debug: function (data) {
			
			},
			error: function (data) {
			
			},
			info: function (data) {
			
			}
		},
		// uracDriver: {},
		inputmaskData: {},
		tenant: {}
	};
	let BL = {
		model: mongoStub
	};
	
	let context = {
		variables: {},
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
		let repo;
		beforeEach(() => {
		
		});
		it("Success getGitRecord", function (done) {
			helpers.getGitRecord(soajs, repo, BL, function (error, body) {
				done();
			});
		});
		
	});
	
	describe("getDashDbInfo", function () {
		let registry = {
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
			coreDB: {
				provision: {
					"servers": [],
					"credentials": {}
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
		
		it("Success getDashDbInfo", function (done) {
			soajs.registry = registry;
			helpers.getDashDbInfo(soajs, BL, function (error, body) {
				done();
			});
		});
		
	});
	
	describe("deployContainer", function () {
		before(() => {
			let envRecord = {
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
				serviceCmd: ["-c"],
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
								SOAJS_ENV: {type: 'computed', value: '$SOAJS_ENV'},
								SOAJS_PROFILE: {
									type: 'static',
									value: '/opt/soajs/FILES/profiles/profile.js'
								},
								SOAJS_SRV_AUTOREGISTERHOST: {type: 'static', value: 'true'},
								SOAJS_SRV_MEMORY: {type: 'computed', value: '$SOAJS_SRV_MEMORY'},
								SOAJS_GC_NAME: {type: 'computed', value: '$SOAJS_GC_NAME'},
								SOAJS_GC_VERSION: {type: 'computed', value: '$SOAJS_GC_VERSION'},
								SOAJS_GIT_BRANCH: {type: 'computed', value: '$SOAJS_GIT_BRANCH'},
								SOAJS_GIT_COMMIT: {type: 'computed', value: '$SOAJS_GIT_COMMIT'},
								SOAJS_HA_NAME: {type: 'computed', value: '$SOAJS_HA_NAME'},
								SOAJS_MONGO_AUTH_DB: {type: 'computed', value: '$SOAJS_MONGO_AUTH_DB'},
								SOAJS_MONGO_SSL: {type: 'computed', value: '$SOAJS_MONGO_SSL'},
								SOAJS_DEPLOY_ACC: {type: 'static', value: 'true'},
								NEW_VAR: {
									type: 'userInput'
								},
								NEW2_VAR: {
									type: 'userInput', default: '123'
								}
							},
							cmd: {
								deploy: {
									command: "ls",
									args: ["-c", "ls", "xyz"]
									
								}
							}
						}
					},
					v: 1
				}
			};
			mongoStub.findEntry = function (soajs, opts, cb) {
				cb(null, envRecord);
			};
		});
	});
});
