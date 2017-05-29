"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");
var helpers = helper.requireModule('./lib/helpers/daemons.js');

describe("testing helper daemons.js", function () {
	var soajs = {
		inputmaskData: {
			"timeZone": "America/Los_Angeles",
			"cronTime": "*/5	*	*	*	*",
			"cronTimeDate": "2019-05-26T11:51:07.547Z"
		},
		tenant: {}
	};
	
	describe("validateCronTime ()", function () {
		var criteria = {};

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
	
});