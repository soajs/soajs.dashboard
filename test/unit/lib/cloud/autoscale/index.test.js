"use strict";
var assert = require("assert");
var helper = require("../../../../helper.js");
var utils = helper.requireModule('./lib/cloud/autoscale/index.js');

var autoscale = {};
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
		inputmaskData: {}
	}
};

var mongoStub = {
	findEntry: function (soajs, opts, cb) {
		var entry = {};
		if(opts.collection === 'environment' && opts.conditions && opts.conditions.code === 'DEV') {
			entry = {
				_id: '',
				code: 'DEV',
				dbs: {},
				deployer: {
					"type": "container",
					"selected": "container.kubernetes.local",
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
								"nginxDeployType": "NodePort",
								"namespace": {
									"default": "soajs",
									"perService": false
								},
								"auth": {
									"token": "ACCESS_TOKEN"
								}
							},
							"remote": {
								"nginxDeployType": "NodePort",
								"namespace": {
									"default": "soajs",
									"perService": false
								},
								"auth": {
									"token": "ACCESS_TOKEN"
								}
							}
						}
					}
				},
				services: {
					config :{

					}
				}
			};
		}

		cb(null, entry);
	},
	saveEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	switchConnection: function (soajs) {

	}
};

var deployer = helper.deployer;

describe("testing lib/cloud/autoscale/index.js", function() {
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
				autoscale = body;
				autoscale.model = mongoStub;
				done();
			});
		});
	});

	describe("testing set", function() {

		before("init", function(done) {
			req.soajs.inputmaskData.env = 'dev';
			req.soajs.inputmaskData.services = [
				{ id: 'srv1', type: 'deployment' },
				{ id: 'srv2', type: 'deployment' },
				{ id: 'srv3', type: 'deployment' }
			];
			req.soajs.inputmaskData.autoscaler = {
				replicas: {
					min: 1,
					max: 5
				},
				metrics: {
					cpu: {
						percent: 90
					}
				}
			};

			deployer.getAutoscaler = function(options, cb) {
				var autoscaler = {};
				if(options.params.id === 'srv1') {
					//srv1 autoscaler identical to the one provided as input
					autoscaler = {
						replicas: {
							min: 1,
							max: 5
						},
						metrics: {
							cpu: {
								percent: 90
							}
						}
					};
				}
				else if(options.params.id === 'srv2') {
					//srv2 autoscaler is custom
					autoscaler = {
						replicas: {
							min: 2,
							max: 10
						},
						metrics: {
							cpu: {
								percent: 75
							}
						}
					};
				}
				else if(options.params.id === 'srv3') {
					//srv3 does not have an autoscaler
					autoscaler = {};
				}

				return cb(null, autoscaler);
			};

			done();
		});

		it("success - update autoscalers", function(done) {
			req.soajs.inputmaskData.action = 'update';
			deployer = {
				execute: function(driverOptions, method, methodOptions, cb) {
					if (method === 'getAutoscaler'){
						return cb(null, {
							replicas: {
								min: 1,
								max: 3
							},
							metrics: {
								cpu: {
									percent: 50
								}
							}
						});
					}
					else if (method === 'updateAutoscaler') {
						return cb(null, true);
					}
					else if (method === 'createAutoscaler') {
						return cb(null, true);
					}
					else if (method === 'deleteAutoscaler') {
						return cb(null, true);
					}
				},
			}
			autoscale.set(config, req.soajs, deployer, function(error) {
				assert.ifError(error);
				done();
			});
		});

		it("success - turn off autoscalers", function(done) {
			req.soajs.inputmaskData.action = 'turnOff';
			autoscale.set(config, req.soajs, deployer, function(error) {
				assert.ifError(error);
				done();
			});
		});

		it("fail - update autoscalers, driver error", function(done) {
			deployer = {
				execute: function(driverOptions, method, methodOptions, cb) {
					if (method === 'getAutoscaler'){
						return cb(null, {
							replicas: {
								min: 1,
								max: 3
							},
							metrics: {
								cpu: {
									percent: 50
								}
							}
						});
					}
					else if (method === 'updateAutoscaler') {
						return cb({code: 677, error: "Unable to update autoscaler"}, 677);
					}
					else if (method === 'createAutoscaler') {
						return cb(null, true);
					}
					else if (method === 'deleteAutoscaler') {
						return cb(null, true);
					}
				},
			}

			req.soajs.inputmaskData.action = 'update';
			autoscale.set(config, req.soajs, deployer, function(error) {
				assert.ok(error);
				assert.deepEqual(error.code, 677);
				done();
			});
		});

		it("fail - turn off autoscalers, driver error", function(done) {
			deployer = {
				execute: function(driverOptions, method, methodOptions, cb) {
					if (method === 'getAutoscaler'){
						return cb(null, {
							replicas: {
								min: 1,
								max: 3
							},
							metrics: {
								cpu: {
									percent: 50
								}
							}
						});
					}
					else if (method === 'deleteAutoscaler') {
						return cb({code: 678, error: "Unable to delete autoscaler"}, 678);
					}
				},
			}

			req.soajs.inputmaskData.action = 'turnOff';
			autoscale.set(config, req.soajs, deployer, function(error) {
				assert.ok(error);
				assert.deepEqual(error.code, 678);
				done();
			});
		});

	});

	describe("testing updateEnvAutoscaleConfig", function() {

		it("success - will update environment autoscale config and set deployer record", function(done) {
			mongoStub.findEntry = function(soajs, opts, cb) {
				var entry = {
					_id: '',
					code: 'DEV',
					dbs: {},
					deployer: {
						"type": "container",
						"selected": "container.kubernetes.local"
					}
				};

				cb(null, entry);
			};

			req.soajs.inputmaskData.env = 'dev';
			req.soajs.inputmaskData.autoscale = {
				replicas: {
					min: 3,
					max: 10
				},
				metrics: {
					cpu: {
						percent: 95
					}
				}
			};
			autoscale.updateEnvAutoscaleConfig(config, req.soajs, function(error, result) {
				assert.ok(result);
				done();
			});
		});

		it("success - will update environment autoscale config", function(done) {
			mongoStub.findEntry = function(soajs, opts, cb) {
				var entry = {
					_id: '',
					code: 'DEV',
					dbs: {},
					deployer: {
						"type": "container",
						"selected": "container.kubernetes.local",
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
									"nginxDeployType": "NodePort",
									"namespace": {
										"default": "soajs",
										"perService": false
									},
									"auth": {
										"token": "ACCESS_TOKEN"
									}
								},
								"remote": {
									"nginxDeployType": "NodePort",
									"namespace": {
										"default": "soajs",
										"perService": false
									},
									"auth": {
										"token": "ACCESS_TOKEN"
									}
								}
							}
						}
					}
				};

				cb(null, entry);
			};

			req.soajs.inputmaskData.env = 'dev';
			req.soajs.inputmaskData.autoscale = {
				replicas: {
					min: 3,
					max: 10
				},
				metrics: {
					cpu: {
						percent: 95
					}
				}
			};

			autoscale.updateEnvAutoscaleConfig(config, req.soajs, function(error, result) {
				assert.ok(result);
				done();
			});
		});

	});
});
