"use strict";
const assert = require("assert");
const helper = require("../../../helper.js");
const apiBuilderIndex = helper.requireModule('./lib/apiBuilder/index.js');

let mongoStub = {
	checkForMongo: function (soajs) {
		return true;
	},
	validateId: function (soajs, cb) {
		return cb(null, soajs.inputmaskData.id);
	},
	findEntries: function (soajs, opts, cb) {
		if (opts.collection === 'environment') {
			let environments = [
				{
					"code": "DASHBOARD"
				}, {
					"code": "DEV"
				}
			];
			cb(null, environments);
		} else {
			// todo if needed
		}
	},
	findEntry: function (soajs, opts, cb) {
		if (opts.collection === 'services') {
			let originalServiceRecord = {
				name: 'test',
				src: {
					repo: 'test',
					owner: 'test'
				}
			};
			cb(null, originalServiceRecord);
		} else {
			cb(); // todo if needed
		}

	},
	updateEntry: function (soajs, opts, cb) {
		cb(null, true);
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
	validateCustomId: function (soajs) {
		return true;
	},
	countEntries: function (soajs) {
		return true;
	}
};

let config = {
	errors: {}
};
let req = {
	soajs: {
		inputmaskData: {},
		log: {
			error: function (input) {
				console.log(input);
			}
		}
	}
};
let res = {};
let cloudBL = {
	listServices: function (config, soajs, deployer, cb) {
		let deployedServices = [
			{
				labels: {
					'service.repo': 'test',
					'service.owner': 'test',
					'soajs.service.name': 'test'
				}
			}
		];
		cb(null, deployedServices);
	}
};
let deployer = {};

describe("API Builder Index File", function () {
	let apiBuilder;

	let oldValueOfSOAJS_DEPLOY_HA;

	before(function (done) {
		oldValueOfSOAJS_DEPLOY_HA = process.env.SOAJS_DEPLOY_HA;
		process.env.SOAJS_DEPLOY_HA = 'docker';

		apiBuilderIndex.init('mongo', function (error, body) {
			assert.ok(body);
			apiBuilder = body;
			apiBuilder.model = mongoStub;
			done();
		});
	});

	after(function (done) {
		if (oldValueOfSOAJS_DEPLOY_HA) {
			process.env.SOAJS_DEPLOY_HA = oldValueOfSOAJS_DEPLOY_HA;
		} else {
			delete process.env.SOAJS_DEPLOY_HA;
		}
		done();
	});

	describe("Delete Function", function () {
		it("Fail - Service test is deployed in environment DASHBOARD", function (done) {
			apiBuilder.delete(config, req, res, cloudBL, deployer, function (error, output) {
				assert.equal(error.code, 766);
			});

			done();
		});

	});
});