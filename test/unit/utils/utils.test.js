"use strict";
const assert = require("assert"); //todo: check unused
const helper = require("../../helper.js");
const utils = helper.requireModule('./utils/utils.js');

let soajs = {
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
		let data = {
			config: {
				errors: {}
			},
			error: {
				code: 100,
				msg: ''
			}
		};
		let mainCb = function (data) {
			return data;
		};
		it("Fail 1", function (done) {
			utils.checkErrorReturn(soajs, mainCb, data);
			done();
		});
	});
	
	describe("testing buildDeployerOptions", function () {
		let BL = {
			model: {}
		};
		let envRecord = {};
		it("Fail 1", function (done) {
			let options = utils.buildDeployerOptions(envRecord, soajs, BL);
			done();
		});
		
		it("Fail 2", function (done) {
			envRecord = {
				deployer: {}
			};
			let options = utils.buildDeployerOptions(envRecord, soajs, BL);
			done();
		});
		
		it("Fail 3", function (done) {
			envRecord = {
				deployer: {
					test: 'manual'
				}
			};
			let options = utils.buildDeployerOptions(envRecord, soajs, BL);
			done();
		});
		
		it("Fail 4", function (done) {
			envRecord = {
				deployer: {
					type: 'manual'
				}
			};
			let options = utils.buildDeployerOptions(envRecord, soajs, BL);
			done();
		});
	});
});