"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");
var utils = helper.requireModule('./lib/resources/index.js');
let resources;
var config = helper.requireModule('./config.js');

var soajs = {
	registry: {
		name: 'dev',
		environment: 'dev',
		coreDB: {},
		serviceConfig: {
			awareness: {},
			ports: { controller: 4000, maintenanceInc: 1000, randomInc: 100 }
		},
		ports: {},
		deployer: {
			type: 'manual',
			selected: 'container.docker.local',
			container: { docker: {}, kubernetes: {} }
		},
		services: {}
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
		env: "dev"
	}
};
let req = {
	soajs: soajs
};
let res = {};
let stubMongo = {
	checkForMongo: function (soajs) {
		return true;
	},
	countEntries: function (soajs, opts, cb) {
		return cb(null, 1);
	},
	validateId: function (soajs, cb) {
		return cb(null, soajs.inputmaskData.id);
	},
	findEntry: function (soajs, opts, cb) {
		cb(null, { metadata: {} });
	},
	findEntries: function (soajs, opts, cb) {
		cb(null, []);
	},
	insertEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	removeEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	saveEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	distinctEntries: function (soajs, opts, cb) {
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

describe("testing resources/index.js", function () {

	describe("init ()", function () {
		
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
		
		it("Init model", function (done) {
			utils.init('mongo', function (error, body) {
				assert.ok(body);
				resources = body;
				resources.model = stubMongo;
				done();
			});
		});
	});
	
	
	describe("upgradeResources", function () {
		
		it("Success upgradeResources ", function (done) {
			stubMongo.findEntry = function (soajs, opts, cb) {
				return cb(null, {
					code: "dev",
					deployer: {},
					dbs: {
						clusters: {}
					}
				});
			};

			resources.upgradeResources(config, req, res, function (error, body) {
				assert.ok(body);
				done();
			});
		});
	});
	
});