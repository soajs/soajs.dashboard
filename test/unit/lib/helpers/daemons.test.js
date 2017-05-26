"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");
var helpers = helper.requireModule('./lib/helpers/daemons.js');

describe("testing helper daemons.js", function () {
	var soajs = {
		inputmaskData: {
			timeZone: '',
			cronTime: ''
		},
		tenant: {}
	};
	
	describe.skip("validateCronTime ()", function () {
		var criteria = {
			type: 'cron',
			"groupName": "test group config 1",
			"daemon": "orderDaemon",
			"status": 0,
			"solo": true,
			"processing": "parallel",
			"jobs": {},
			"order": []
		};
		beforeEach(() => {

		});
		
		it("Success type cron", function (done) {
			// "timeZone": req.soajs.inputmaskData.timeZone,
			// "cronTime": req.soajs.inputmaskData.cronTime

			criteria = {
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
		});

		it("Success type once", function (done) {
			// req.soajs.inputmaskData.timeZone
			criteria = {
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
		});

	});
	
});