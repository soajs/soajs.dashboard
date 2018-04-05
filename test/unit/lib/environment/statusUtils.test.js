"use strict";
const sinon = require('sinon');
var assert = require("assert");
var helper = require("../../../helper.js");
var statusUtils = helper.requireModule("./lib/environment/statusUtils.js");
var customReg = helper.requireModule("./lib/environment/drivers/customReg");
var products = helper.requireModule("./lib/environment/drivers/products");
var tenants = helper.requireModule("./lib/environment/drivers/tenants");
var secrets = helper.requireModule("./lib/environment/drivers/secrets");
var repos = helper.requireModule("./lib/environment/drivers/repos");
var resources = helper.requireModule("./lib/environment/drivers/resources");
var infra = helper.requireModule("./lib/environment/drivers/infra");

var req = {
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
var context = {};
var BLModule = {
	init: function(modelName, cb){
		return cb(null, true);
	}
};
var modelName = {};
var data = {};
var mainCb = function(data){
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
				error : {
				
				},
				config :{
					errors: {
						1: "error"
					}
				},
				code: "1"
			};
			statusUtils.checkReturnError(req, function(){
				done()
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
	
	describe("testing thirdPartStep", function () {
		
		it("Success", function (done) {
			sinon.stub(infra, 'rollback').yields(null, true);
			statusUtils.thirdPartStep(req, context, "rollback", function (error, body) {
				sinon.restore(infra);
				assert.ok(body);
				done();
			});
		});
	});
	
});