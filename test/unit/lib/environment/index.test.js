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

	describe("testing removeCert", function () {
		
		it("Success removeCert", function (done) {
			mongoStub.findEntry = function (soajs, opts, cb) {
				cb(null, {
					_id: '111',
					metadata: {
						env: {
							dev: ["some"]
						}
					}
				});
			};
			
			req.soajs.inputmaskData.id = '111';
			req.soajs.inputmaskData.env = 'dev';
			
			environment.removeCert({}, req, res, function (error, body) {
				assert.ok(body);
				done();
			});
		});
		
	});
	
});