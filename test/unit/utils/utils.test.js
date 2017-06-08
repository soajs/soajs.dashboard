"use strict";
var assert = require("assert");
var helper = require("../../helper.js");
var utils = helper.requireModule('./utils/utils.js');

var soajs = {
	log: {
		debug: function (data) {
			
		},
		error: function (data) {
			
		},
		info: function (data) {
			
		}
	}
};

describe("testing utils utils.js", function () {
	
	describe("testing checkErrorReturn", function () {
		var data = {
			config: {
				errors: {}
			},
			error: {
				code: 100,
				msg: ''
			}
		};
		var mainCb = function (data) {
			return data;
		};
		it("Fail 1", function (done) {
			utils.checkErrorReturn(soajs, mainCb, data);
			done();
		});
	});
	
	describe("testing buildDeployerOptions", function () {
		var BL = {
			model: {}
		};
		var envRecord = {};
		it("Fail 1", function (done) {
			var options = utils.buildDeployerOptions(envRecord, soajs, BL);
			done();
		});
		
		it("Fail 2", function (done) {
			envRecord = {
				deployer: {}
			};
			var options = utils.buildDeployerOptions(envRecord, soajs, BL);
			done();
		});
		
		it("Fail 3", function (done) {
			envRecord = {
				deployer: {
					test: 'manual'
				}
			};
			var options = utils.buildDeployerOptions(envRecord, soajs, BL);
			done();
		});
		
		it("Fail 4", function (done) {
			envRecord = {
				deployer: {
					type: 'manual'
				}
			};
			var options = utils.buildDeployerOptions(envRecord, soajs, BL);
			done();
		});
	});
});