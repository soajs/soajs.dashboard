"use strict";
var assert = require("assert");
var helper = require("../../helper.js");
var models = helper.requireModule('./models/products.js');

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
var mongoStub = {
	checkForMongo: function (soajs) {
		return true;
	},
	validateId: function (soajs, cb) {
		return cb(null, soajs.inputmaskData.id);
	},
	findEntries: function (soajs, opts, cb) {
		cb(null, [{
			scope : {
				acl: {
					dev: {
						express: {
							2.3 :{
							
							}
						}
					}
				}
			}
		}]);
	},
	findEntry: function (soajs, opts, cb) {
		cb(null, {});
	},
	updateEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	countEntries: function (soajs, opts, cb) {
		cb(null, 0);
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
describe("testing models cicd.js", function () {
	var options = {};
	describe("testing findEntries", function () {
		it("success", function (done) {
			models.findEntries(soajs, mongoStub, options, function () {
				done();
			});
		});
		
		it("success", function (done) {
			mongoStub.findEntries= function (soajs, opts, cb) {
				cb(null, []);
			};
			models.findEntries(soajs, mongoStub, options, function () {
				done();
			});
		});
		
		it("fail", function (done) {
			mongoStub.findEntries= function (soajs, opts, cb) {
				cb(true);
			};
			models.findEntries(soajs, mongoStub, options, function () {
				done();
			});
		});
		
	});
	describe("testing findEntry", function () {
		it("success", function (done) {
			models.findEntry(soajs, mongoStub, options, function () {
				done();
			});
		});
		it("success", function (done) {
			mongoStub.findEntry= function (soajs, opts, cb) {
				cb(true);
			};
			models.findEntry(soajs, mongoStub, options, function () {
				done();
			});
		});
		
	});
	describe("testing removeEntry", function () {
		it("success", function (done) {
			models.removeEntry(soajs, mongoStub, options, function () {
				done();
			});
		});
	});
	describe("testing updateEntry", function () {
		it("success", function (done) {
			models.updateEntry(soajs, mongoStub, options, function () {
				done();
			});
		});
	});
	
	describe("testing sanitize", function () {
		it("success", function (done) {
			let acl  = {
				dev: {
					express: {
						2.3 :{
						
						}
					}
				}
			};
			models.sanitize(acl, function () {
				done();
			});
		});
	});
});