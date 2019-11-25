"use strict";
const sinon = require('sinon');
const assert = require("assert");
const helper = require("../../../helper.js");
const statusUtils = helper.requireModule("./lib/environment/statusUtils.js");
const customReg = helper.requireModule("./lib/environment/drivers/customReg");
const products = helper.requireModule("./lib/environment/drivers/products");
const tenants = helper.requireModule("./lib/environment/drivers/tenants");
const secrets = helper.requireModule("./lib/environment/drivers/secrets");
const repos = helper.requireModule("./lib/environment/drivers/repos");
const resources = helper.requireModule("./lib/environment/drivers/resources");
const infra = helper.requireModule("./lib/environment/drivers/infra");

let req = {
	soajs: {
		registry: {},
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
let context = {};
let BLModule = {
	init: function (modelName, cb) {
		return cb(null, true);
	}
};
let modelName = {};
let data = {};
let mainCb = function (data) {
	return data;
};
describe("testing statusUtils.js", function () {
	
	describe("testing initBLModel", function () {
		
		it("Success", function (done) {
			statusUtils.initBLModel(BLModule, modelName, function (error, body) {
				assert.ok(body);
				done();
			});
		});
	});
	
	describe("testing checkReturnError", function () {
		
		it("Success", function (done) {
			statusUtils.checkReturnError(req, mainCb, data, function (error, body) {
				done();
			});
		});
		
		it("Success", function (done) {
			data = {
				error: {},
				config: {
					errors: {
						1: "error"
					}
				},
				code: "1"
			};
			statusUtils.checkReturnError(req, function () {
				done();
			}, data, function (error, body) {
				done();
			});
		});
	});
	
	describe("testing custom_registry", function () {
		
		it("Success", function (done) {
			sinon.stub(customReg, 'rollback').yields(null, true);
			statusUtils.custom_registry(req, context, "rollback", function (error, body) {
				sinon.restore(customReg);
				assert.ok(body);
				done();
			});
		});
	});
	
	describe("testing products", function () {
		
		it("Success", function (done) {
			sinon.stub(products, 'rollback').yields(null, true);
			statusUtils.products(req, context, "rollback", function (error, body) {
				sinon.restore(products);
				assert.ok(body);
				done();
			});
		});
	});
	
	describe("testing tenants", function () {
		
		it("Success", function (done) {
			sinon.stub(tenants, 'rollback').yields(null, true);
			statusUtils.tenants(req, context, "rollback", function (error, body) {
				sinon.restore(tenants);
				assert.ok(body);
				done();
			});
		});
	});
	
	describe("testing secrets", function () {
		
		it("Success", function (done) {
			sinon.stub(secrets, 'rollback').yields(null, true);
			statusUtils.secrets(req, context, "rollback", function (error, body) {
				sinon.restore(secrets);
				assert.ok(body);
				done();
			});
		});
	});
	
	describe("testing repos", function () {
		
		it("Success", function (done) {
			sinon.stub(repos, 'rollback').yields(null, true);
			statusUtils.repos(req, context, "rollback", function (error, body) {
				sinon.restore(repos);
				assert.ok(body);
				done();
			});
		});
	});
	
	describe("testing resources", function () {
		
		it("Success", function (done) {
			sinon.stub(resources, 'rollback').yields(null, true);
			statusUtils.resources(req, context, "rollback", function (error, body) {
				sinon.restore(resources);
				assert.ok(body);
				done();
			});
		});
	});
});