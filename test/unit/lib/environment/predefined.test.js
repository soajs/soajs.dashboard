"use strict";
const sinon = require('sinon');
var assert = require("assert");
var helper = require("../../../helper.js");
var utils = helper.requireModule('./lib/environment/predefinedSteps.js');
var statusUtils = helper.requireModule("./lib/environment/statusUtils.js");
function stubStatusUtils(error) {
	sinon
		.stub(statusUtils, 'custom_registry')
		.yields(error, true);
	sinon
		.stub(statusUtils, 'products')
		.yields(error, true);
	sinon
		.stub(statusUtils, 'tenants')
		.yields(error, true);
	sinon
		.stub(statusUtils, 'secrets')
		.yields(error, true);
	sinon
		.stub(statusUtils, 'repos')
		.yields(error, true);
	sinon
		.stub(statusUtils, 'resources')
		.yields(error, true);
	sinon
		.stub(statusUtils, 'thirdPartStep')
		.yields(error, true);
}

var req = {};
var context = {};
describe("testing predefinedSteps.js", function () {
	
	describe("testing custom_registry", function () {
		
		it("Success custom_registry validate", function (done) {
			stubStatusUtils();
			utils.custom_registry.validate(req, context, function (error, body) {
				assert.ok(body);
				sinon.restore(statusUtils);
				done();
			});
		});
		
		it("Success custom_registry deploy", function (done) {
			stubStatusUtils();
			utils.custom_registry.deploy(req, context, function (error, body) {
				assert.ok(body);
				sinon.restore(statusUtils);
				done();
			});
		});
		
		it("Success custom_registry rollback", function (done) {
			stubStatusUtils();
			utils.custom_registry.rollback(req, context, function (error, body) {
				assert.ok(body);
				sinon.restore(statusUtils);
				done();
			});
		});
	});
	
	describe("testing productization", function () {
		
		it("Success productization deploy", function (done) {
			stubStatusUtils();
			utils.productization.deploy(req, context, function (error, body) {
				assert.ok(body);
				sinon.restore(statusUtils);
				done();
			});
		});
		
		it("Success productization rollback", function (done) {
			stubStatusUtils();
			utils.productization.rollback(req, context, function (error, body) {
				assert.ok(body);
				sinon.restore(statusUtils);
				done();
			});
		});
	});
	
	describe("testing tenants", function () {
		
		it("Success tenants deploy", function (done) {
			stubStatusUtils();
			utils.tenants.deploy(req, context, function (error, body) {
				assert.ok(body);
				sinon.restore(statusUtils);
				done();
			});
		});
		
		
		it("Success tenants rollback", function (done) {
			stubStatusUtils();
			utils.tenants.rollback(req, context, function (error, body) {
				assert.ok(body);
				sinon.restore(statusUtils);
				done();
			});
		});
	});
	
	describe("testing secrets", function () {
		
		it("Success secrets validate", function (done) {
			stubStatusUtils();
			utils.secrets.validate(req, context, function (error, body) {
				assert.ok(body);
				sinon.restore(statusUtils);
				done();
			});
		});
		
		it("Success secrets deploy", function (done) {
			stubStatusUtils();
			utils.secrets.deploy(req, context, function (error, body) {
				assert.ok(body);
				sinon.restore(statusUtils);
				done();
			});
		});
		
		it("Success secrets rollback", function (done) {
			stubStatusUtils();
			utils.secrets.rollback(req, context, function (error, body) {
				assert.ok(body);
				sinon.restore(statusUtils);
				done();
			});
		});
	});
	
	describe("testing repo", function () {
		
		it("Success repo validate", function (done) {
			stubStatusUtils();
			utils.repo.validate(req, context, function (error, body) {
				assert.ok(body);
				sinon.restore(statusUtils);
				done();
			});
		});
		
		it("Success repo deploy", function (done) {
			stubStatusUtils();
			utils.repo.deploy(req, context, function (error, body) {
				assert.ok(body);
				sinon.restore(statusUtils);
				done();
			});
		});
		
		it("Success repo rollback", function (done) {
			stubStatusUtils();
			utils.repo.rollback(req, context, function (error, body) {
				assert.ok(body);
				sinon.restore(statusUtils);
				done();
			});
		});
	});
	
	describe("testing resources", function () {
		
		it("Success resources validate", function (done) {
			stubStatusUtils();
			utils.resources.validate(req, context, function (error, body) {
				assert.ok(body);
				sinon.restore(statusUtils);
				done();
			});
		});
		
		it("Success resources deploy", function (done) {
			stubStatusUtils();
			utils.resources.deploy(req, context, function (error, body) {
				assert.ok(body);
				sinon.restore(statusUtils);
				done();
			});
		});
		
		it("Success resources rollback", function (done) {
			stubStatusUtils();
			utils.resources.rollback(req, context, function (error, body) {
				assert.ok(body);
				sinon.restore(statusUtils);
				done();
			});
		});
	});
	
	describe("testing thirdPartStep", function () {
		
		it("Success thirdPartStep validate", function (done) {
			stubStatusUtils();
			utils.thirdPartStep.validate(req, context, function (error, body) {
				assert.ok(body);
				sinon.restore(statusUtils);
				done();
			});
		});
		
		it("Success thirdPartStep deploy", function (done) {
			stubStatusUtils();
			utils.thirdPartStep.deploy(req, context, function (error, body) {
				assert.ok(body);
				sinon.restore(statusUtils);
				done();
			});
		});
		
		it("Success thirdPartStep rollback", function (done) {
			stubStatusUtils();
			utils.thirdPartStep.rollback(req, context, function (error, body) {
				assert.ok(body);
				sinon.restore(statusUtils);
				done();
			});
		});
	});
});