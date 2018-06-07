"use strict";
var assert = require("assert");
var helper = require("../../../../helper.js");
var helpers = helper.requireModule('./lib/cloud/infra/helper.js');
var config = helper.requireModule('./config.js');

var mongoStub = {
	getDb: function () {
		return {
			ObjectId: function (id) {
				return 123;
			}
		};
	},
	checkForMongo: function (soajs) {
		return true;
	},
	validateId: function (soajs, cb) {
		return cb(null, soajs.inputmaskData.id);
	},
	findEntry: function (soajs, opts, cb) {
		cb(null, {});
	},
	removeEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	saveEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	switchConnection: function (soajs) {
	}
};

var deployer = helper.deployer;

describe("testing lib/cloud/infra/helper.js", function () {
	var soajs = {
		validator: {
			Validator: function () {
				return {
					validate: function (boolean) {
						if (boolean) {
							//valid
							return {
								errors: []
							};
						}
						else {
							//invalid
							return {
								errors: [{error: 'msg'}]
							};
						}
					}
				};
			}
		},
		registry: {
			coreDB: {
				provision: {}
			}
		},
		log: {
			debug: function (data) {
				
			},
			error: function (data) {
				
			},
			info: function (data) {
				
			}
		},
		// uracDriver: {},
		inputmaskData: {},
		tenant: {}
	};
	var BL = {
		model: mongoStub
	};
	
	describe("getCommonData", function () {
		var cbMain = function () {
			
		};
		
		it("Fail - getCommonData - Driver undefined Configuration not found!", function (done) {
			helpers.getCommonData(config, soajs, BL, function (error, body) {
				assert.equal(error.msg, 'Driver undefined Configuration not found!');
				done();
			});
		});
		
		it("Success getCommonData", function (done) {
			soajs.inputmaskData.bypassInfoCheck = true;
			soajs.inputmaskData.envCode = 'dev';
			soajs.inputmaskData.id = '123';
			
			helpers.getCommonData(config, soajs, BL, cbMain, function (error, body) {
				done();
			});
		});
		
	});
	
	describe("getClusterEnvironments", function () {
		
		let options = {
			id: 123,
			previousEnvironment : 'DEV'
		};
		
		it("Success getClusterEnvironments", function (done) {
			let infra = {
				deployments: [
					{
						id: 123
					}]
			};
			
			helpers.getClusterEnvironments(infra, options);
			done();
		});
		
		it("Success getClusterEnvironments", function (done) {
			
			let infra = {
				deployments: [
					{
						id: 321,
						environments : ['DEV']
					}]
			};
			
			helpers.getClusterEnvironments(infra, options);
			done();
		});
		
	});
	
});
