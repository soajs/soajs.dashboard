"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");
var utils = helper.requireModule('./lib/daemons/index.js');

describe("testing lib/daemons/index.js", function () {
	
	var daemon;
	var req = {
		soajs: {
			inputmaskData: {},
			registry :{
				coreDB :{
					provision : {}
				}
			}
		}
	};
	var res = {};
	
	it("Init model", function (done) {
		
		utils.init('mongo', function (error, body) {
			assert.ok(body);
			daemon = body;
			done();
		});
	});
	
	describe("addGroupConfig", function () {
		
		it("Success type cron", function (done) {
			req.soajs.inputmaskData = {
				type: 'cron',
				"groupName": "test group config 1",
				"daemon": "orderDaemon",
				"status": 0,
				"solo": true,
				"processing": "parallel",
				"jobs": {},
				"order": []
			};
			
			daemon.addGroupConfig({}, req, res, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
		
		it("Success type once", function (done) {
			req.soajs.inputmaskData = {
				type: 'once',
				timeZone: '',
				"groupName": "test group config 1",
				"daemon": "orderDaemon",
				"status": 0,
				"solo": true,
				"processing": "parallel",
				"jobs": {},
				"order": []
			};
			
			daemon.addGroupConfig({}, req, res, function (error, body) {
				// assert.ok(body);
				done();
			});
		});
		
		it("Fail", function (done) {
			req.soajs.inputmaskData = {
				"groupName": "test group config 1",
				"daemon": "orderDaemon",
				"status": 0,
				"solo": true,
				"processing": "parallel",
				"jobs": {},
				"order": []
			};
			
			daemon.addGroupConfig({}, req, res, function (error, body) {
				assert.ok(error);
				done();
			});
		});
		
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
	
});