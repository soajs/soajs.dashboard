"use strict";
const assert = require("assert");
const helper = require("../../../helper.js");
const helpers = helper.requireModule('./lib/daemons/helper.js');

let config = {};

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
	findEntries: function (soajs, opts, cb) {
		let entries = [
			{
				code: 'DEV'
			}
		];
		
		return cb(null, entries);
	},
	removeEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	saveEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	insertEntry: function (soajs, opts, cb) {
		cb(null, true);
	}
};

let BL = {
	model: mongoStub
};

let cloudBL = {
	
	listServices: function (config, soajs, deployer, cb) {
		deployer.listServices({}, function (error, services) {
			return cb(null, services);
		});
	}
	
};

let deployer = {
	
	listServices: function (options, cb) {
		let services = [
			{
				env: [
					'SOAJS_DAEMON_GRP_CONF=testDaemonGroup'
				]
			}
		];
		
		return cb(null, services);
	}
	
};

let req = {
	soajs: {
		inputmaskData: {}
	}
};

function checkReturnError(req, mainCb, data, cb) {
	return cb();
}

function mainCb() {
}

describe("testing lib/daemons/helper.js", function () {
	let soajs = {
		inputmaskData: {
			"timeZone": "America/Los_Angeles",
			"cronTime": "*/5	*	*	*	*",
			"cronTimeDate": "2030-05-26T11:51:07.547Z"
		},
		tenant: {}
	};
	
	describe("validateCronTime ()", function () {
		let criteria = {};
		
		beforeEach(() => {
		
		});
		
		it("Success type cron", function (done) {
			soajs.inputmaskData.type = 'cron';
			criteria = {
				cronConfig: {
					"timeZone": "America/Los_Angeles",
					"cronTime": "*/5	*	*	*	*"
				},
				type: 'cron',
				"groupName": "test group config 1",
				"daemon": "orderDaemon",
				"status": 0,
				"solo": true,
				"processing": "parallel",
				"jobs": {},
				"order": []
			};
			
			helpers.validateCronTime(soajs, criteria);
			done();
		});
		
		it("Success type once", function (done) {
			soajs.inputmaskData.type = 'once';
			criteria = {
				cronConfig: {
					"timeZone": "America/Los_Angeles",
					"cronTime": "*/5	*	*	*	*"
				},
				type: 'once',
				"groupName": "test group config 1",
				"daemon": "orderDaemon",
				"status": 0,
				"solo": true,
				"processing": "parallel",
				"jobs": {},
				"order": []
			};
			
			helpers.validateCronTime(soajs, criteria);
			done();
		});
		
	});
	
	describe("testing checkIfGroupIsDeployed", function () {
		let daemonGroupRecord = {
			daemonConfigGroup: 'testDaemonGroup'
		};
		
		it("success - will get one deployed daemon", function (done) {
			helpers.checkIfGroupIsDeployed(config, daemonGroupRecord, req, BL, cloudBL, deployer, checkReturnError, mainCb, function () {
				done();
			});
		});
		
		it("success - will not find any deployed daemons", function (done) {
			deployer.listServices = function (options, cb) {
				let services = [
					{
						env: [
							'SOAJS_DAEMON_GRP_CONF=invalidDaemonGroup'
						]
					}
				];
				return cb(null, services);
			};
			
			helpers.checkIfGroupIsDeployed(config, daemonGroupRecord, req, BL, cloudBL, deployer, checkReturnError, mainCb, function () {
				done();
			});
		});
		
		
	});
	
});
