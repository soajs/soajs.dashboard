"use strict";
var assert = require("assert");
var helper = require("../../../../helper.js");
var utils = helper.requireModule('./utils/drivers/ci/index.js');

describe("testing ci index.js", function () {
	
	describe("testing addEnvVar", function () {
		
		it("Call Travis addEnvVar", function (done) {
			var options = {
				log: {
					debug: function () {
					}
				},
				params: {},
				settings: {},
				driver: 'travis'
			};
			utils.addEnvVar(options, function (error, body) {
				assert.ok(error);
				done();
			});
		});
		
		it("Call Drone addEnvVar", function (done) {
			var options = {
				log: {
					debug: function () {
					}
				},
				params: {},
				settings: {},
				driver: 'drone'
			};
			utils.addEnvVar(options, function (error, body) {
				assert.ok(error);
				done();
			});
		});
		
	});
	
	describe("testing updateEnvVar", function () {
		
		it("Call Travis updateEnvVar", function (done) {
			var options = {
				log: {
					debug: function () {
					}
				},
				params: {},
				settings: {},
				driver: 'travis'
			};
			utils.updateEnvVar(options, function (error, body) {
				assert.ok(error);
				done();
			});
		});
		
		it("Call Drone updateEnvVar", function (done) {
			var options = {
				log: {
					debug: function () {
					}
				},
				params: {},
				settings: {},
				driver: 'drone'
			};
			utils.updateEnvVar(options, function (error, body) {
				assert.ok(error);
				done();
			});
		});
		
	});
	
	describe("testing deleteEnvVar", function () {
		
		it("Call Travis deleteEnvVar", function (done) {
			var options = {
				log: {
					debug: function () {
					}
				},
				params: {},
				settings: {},
				driver: 'travis'
			};
			utils.deleteEnvVar(options, function (error, body) {
				done();
			});
		});
		
		it("Call Drone deleteEnvVar", function (done) {
			var options = {
				log: {
					debug: function () {
					}
				},
				params: {},
				settings: {},
				driver: 'drone'
			};
			utils.deleteEnvVar(options, function (error, body) {
				done();
			});
		});
		
	});
	
	describe("testing setHook", function () {
		
		it("Call Travis setHook", function (done) {
			var options = {
				log: {
					debug: function () {
					}
				},
				params: {},
				settings: {},
				driver: 'travis'
			};
			utils.setHook(options, function (error, body) {
				assert.ok(error);
				done();
			});
		});
		
		it("Call Drone setHook", function (done) {
			var options = {
				log: {
					debug: function () {
					}
				},
				params: {},
				settings: {},
				driver: 'drone'
			};
			utils.setHook(options, function (error, body) {
				assert.ok(error);
				done();
			});
		});
		
	});
	
	describe("testing listSettings", function () {
		
		it("Call Travis listSettings", function (done) {
			var options = {
				log: {
					debug: function () {
					}
				},
				params: {},
				settings: {},
				driver: 'travis'
			};
			utils.listSettings(options, function (error, body) {
				assert.ok(error);
				done();
			});
		});
		
		it("Call Drone listSettings", function (done) {
			var options = {
				log: {
					debug: function () {
					}
				},
				params: {},
				settings: {},
				driver: 'drone'
			};
			utils.listSettings(options, function (error, body) {
				assert.ok(error);
				done();
			});
		});
		
	});
	
	describe("testing updateSettings", function () {
		
		it("Call Travis updateSettings", function (done) {
			var options = {
				log: {
					debug: function () {
					}
				},
				params: {},
				settings: {},
				driver: 'travis'
			};
			utils.updateSettings(options, function (error, body) {
				assert.ok(error);
				done();
			});
		});
		
		it("Call Drone updateSettings", function (done) {
			var options = {
				log: {
					debug: function () {
					}
				},
				params: {},
				settings: {},
				driver: 'drone'
			};
			utils.updateSettings(options, function (error, body) {
				assert.ok(error);
				done();
			});
		});
		
	});
	
	describe("testing generateToken", function () {
		
		it("Call Travis generateToken", function (done) {
			var options = {
				log: {
					debug: function () {
					}
				},
				params: {},
				settings: {},
				driver: 'travis'
			};
			utils.generateToken(options, function (error, body) {
				assert.ok(error);
				done();
			});
		});
		
		it("Call Drone generateToken", function (done) {
			var options = {
				log: {
					debug: function () {
					}
				},
				params: {},
				settings: {},
				driver: 'drone'
			};
			utils.generateToken(options, function (error, body) {
				assert.ok(error);
				done();
			});
		});
		
	});
	
	describe("testing listEnvVars", function () {
		
		it("Call Travis listEnvVars", function (done) {
			var options = {
				log: {
					debug: function () {
					}
				},
				params: {},
				settings: {},
				driver: 'travis'
			};
			utils.listEnvVars(options, function (error, body) {
				assert.ok(error);
				done();
			});
		});
		
		it("Call Drone listEnvVars", function (done) {
			var options = {
				log: {
					debug: function () {
					}
				},
				params: {},
				settings: {},
				driver: 'drone'
			};
			utils.listEnvVars(options, function (error, body) {
				assert.ok(error);
				done();
			});
		});
		
	});
	
	describe("testing listRepos", function () {
		
		it("Call Travis listRepos", function (done) {
			var options = {
				log: {
					debug: function () {
					}
				},
				params: {},
				settings: {},
				driver: 'travis'
			};
			utils.listRepos(options, function (error, body) {
				assert.ok(error);
				done();
			});
		});
		
		it("Call Drone listRepos", function (done) {
			var options = {
				log: {
					debug: function () {
					}
				},
				params: {},
				settings: {},
				driver: 'drone'
			};
			utils.listRepos(options, function (error, body) {
				assert.ok(error);
				done();
			});
		});
		
	});
	
	describe("testing ensureRepoVars", function () {
		
		it("Call Travis ensureRepoVars", function (done) {
			var options = {
				log: {
					debug: function () {
					}
				},
				params: {},
				settings: {},
				driver: 'travis'
			};
			utils.ensureRepoVars(options, function (error, body) {
				done();
			});
		});
		
		it("Call Drone ensureRepoVars", function (done) {
			var options = {
				log: {
					debug: function () {
					}
				},
				params: {},
				settings: {},
				driver: 'drone'
			};
			utils.ensureRepoVars(options, function (error, body) {
				done();
			});
		});
		
	});
	
});