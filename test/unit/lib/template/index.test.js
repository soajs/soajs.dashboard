"use strict";

const sinon = require('sinon');
const assert = require("assert");
let fs = require("fs"); //todo: check unused
const helper = require("../../../helper.js");
const utils = helper.requireModule('./lib/templates/index.js');
const mongoModel = helper.requireModule('./models/mongo.js');
let helpers = helper.requireModule('./lib/templates/helper.js');
let template = require('./schema/indexTemplate.js');
let counter = 0;
let context = {
	errors: ["testing"]
};

function contextFunction(req, test, context, lib, cb) {
	context.errors.push('errrors');
	return cb();
}

function stubStatusUtils() {
	sinon.stub(helpers, 'parse')
		.yields(null, true);
	
	sinon.stub(helpers, 'fetchDataFromDB')
		.yields(null, true);
	
	sinon.stub(helpers, 'mergeToTemplate')
		.yields(null, true);
	
	sinon.stub(helpers, 'populateTemplate');
	
	sinon.stub(helpers, 'checkMandatoryTemplateSchema')
		.yields(null, true);
	
	sinon.stub(helpers, 'checkDuplicate')
		.yields(contextFunction);
	
	sinon.stub(helpers, 'saveContent')
		.yields(null, true);
	
	sinon.stub(helpers, 'generateDeploymentTemplate')
		.yields(null, true);
	
	sinon.stub(helpers, 'cleanUp')
		.yields(null, true);
}


let templates;

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
					validate: function (boolean) {
						if (boolean) {
							//valid
							return {
								errors: []
							};
						} else {
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

let res = {
	'writeHead': function (ts, opts) {
	},
	
	'on': function (data) {
	},
	
	'once': function (data) {
	},
	
	'emit': function (data) {
	},
	
	'write': function (data) {
	},
	
	'end': function (data) {
	},
	
};

let config = {
	errors: {},
	HA: {
		blacklist: []
	}
};

let mongoStub = {
	checkForMongo: function (soajs) {
		return true;
	},
	validateId: function (soajs, cb) {
		return cb(null, soajs.inputmaskData.id);
	},
	findEntry: function (soajs, opts, cb) {
		if (opts.collection === 'templates') {
			template.deploy.deployments.pre = {
				"infra__dot__cluster__dot__deploy": {
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
					]
				},
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
			};
			cb(null, template);
		}
		cb(null, {
			metadata: {}
		});
	},
	
	findEntries: function (soajs, opts, cb) {
		if (opts.conditions && opts.conditions.name) {
			cb(null, []);
		}
		cb(null, [template]);
	},
	countEntries: function (soajs, opts, cb) {
		cb(null, 0);
	},
	getDb: function (data) {
		return {
			ObjectId: function () {
				return data;
			}
		};
	},
	removeEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	updateEntry: function (soajs, opts, cb) {
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

it("Init template model", function (done) {
	
	utils.init('mongo', function (error, body) {
		assert.ok(body);
		templates = body;
		templates.model = mongoModel;
		done();
	});
});

describe("testing index.js", function () {
	
	beforeEach(() => {
		templates.model = mongoStub;
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
	
	describe("testing index", function () {
		
		it("getTemplates", function (done) {
			req.soajs.inputmaskData.fullList = {};
			templates.getTemplates(config, req, res, function (error, body) {
				assert.ok(body);
				// sinon.restore(status);
				done();
			});
		});
		
		it("deleteTemplate", function (done) {
			req.soajs.inputmaskData.fullList = {};
			templates.deleteTemplate(config, req, res, function (error, body) {
				assert.ok(body);
				// sinon.restore(status);
				done();
			});
		});
		
		it("upgradeTemplates", function (done) {
			templates.upgradeTemplates(config, req, res, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
		it("import", function (done) {
			stubStatusUtils();
			context = {
				errors: ["testing"]
			};
			templates.import(config, req, res, {}, function (error, body) {
				// assert.ok(body);
				sinon.restore(helpers);
				done();
			});
		});
		
		it("correct", function (done) {
			stubStatusUtils();
			req.soajs.inputmaskData.correction = {};
			req.soajs.inputmaskData.id = '1233';
			templates.correct(config, req, res, {}, function (error, body) {
				// assert.ok(body);
				sinon.restore(helpers);
				done();
			});
		});
		
		it("export", function (done) {
			stubStatusUtils();
			req.soajs.inputmaskData.ci = [];
			req.soajs.inputmaskData.deployment = [];
			req.soajs.inputmaskData.endpoints = [];
			
			templates.export(config, req, res, {}, function (error, body) {
				// assert.ok(body);
				sinon.restore(helpers);
				done();
			});
		});
		
		it("download", function (done) {
			req.soajs.inputmaskData.id = '111';
			req.soajs.servicesConfig = {
				dashboard: {
					HA: {
						blacklist: ["test", "test1"]
					}
				}
			};
			
			templates.download(config, req, res, {}, function (error, body) {
				counter++;
				if (counter === 2) {
					done();
				}
			});
		});
	});
	
});
