"use strict";
const assert = require("assert");
const helper = require("../../../../helper.js");
const utils = helper.requireModule('./utils/drivers/ci/index.js');

describe("testing ci index.js", function () {
	
	describe("testing addEnvVar", function () {
		
		it("Call Travis addEnvVar", function (done) {
			let options = {
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
			let options = {
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
			let options = {
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
			let options = {
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
			let options = {
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
			let options = {
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
			let options = {
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
			let options = {
				log: {
					debug: function () {
					}
				},
				params: {},
				settings: {
					"repo": "myrepo"
				},
				driver: 'drone',
				hook: {}
			};
			utils.setHook(options, function (error, body) {
				assert.ok(error);
				done();
			});
		});
		
	});
	
	describe("testing listSettings", function () {
		
		it("Call Travis listSettings", function (done) {
			let options = {
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
		
	});
	
	describe("testing updateSettings", function () {
		
		it("Call Travis updateSettings", function (done) {
			let options = {
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
			let options = {
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
			let options = {
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
		
	});
	
	describe("testing listEnvVars", function () {
		
		it("Call Travis listEnvVars", function (done) {
			let options = {
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
			let options = {
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
			let options = {
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
			let options = {
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
			let options = {
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
			let options = {
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