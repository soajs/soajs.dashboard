"use strict";
var assert = require('assert');
var shell = require('shelljs');
var helper = require("../helper.js");
var sampleData = require("soajs.mongodb.data/modules/dashboard");
var dashboard, controller, urac, oauth;

var Mongo = require('soajs.core.modules').mongo;
var dbConfig = require("./db.config.test.js");
var dashboardConfig = dbConfig();
dashboardConfig.name = "core_provision";
var mongo = new Mongo(dashboardConfig);


describe("importing sample data", function () {

	it("drop previous db", (done) => {
		mongo.dropDatabase(() => {
			done();
		});
	});
	
	it("do import", function (done) {
		shell.pushd(sampleData.dir);
		shell.exec("chmod +x " + sampleData.shell, function (code) {
			assert.equal(code, 0);
			shell.exec(sampleData.shell, function (code) {
				assert.equal(code, 0);
				shell.popd();
				done();
			});
		});
	});

	it("update environment before starting service", function (done) {
		var setDoc = {
			"$set": {
				"services.config.logger.level": (process.env.SOAJS_DEBUG_LOGS) ? "debug" : "fatal",
				"services.config.logger.formatter.outputMode": (process.env.SOAJS_DEBUG_LOGS) ? "long" : "short"
			},
			"$unset": {
				"services.config.logger.src": ""
			}
		};
		mongo.update('environment', {'code': 'DEV'}, setDoc, {
			"multi": false,
			"upsert": false,
			"safe": true
		}, function (error) {
			assert.ifError(error);
			done();
		});
	});

	it("update requestTimeout", function (done) {
		var setDoc = {
			"$set": {
				"requestTimeout": 70
			}
		};
		mongo.update('services', {'name': 'dashboard'}, setDoc,
			{"multi": false, "upsert": false, "safe": true}, function (error) {
				assert.ifError(error);
				done();
			});
	});
	
	it("Start Services", function (done) {
		//todo: never change process.env.SOAJS_ENV_WORKDIR to /opt/, contents of the directory will be deleted.
		process.env.SOAJS_ENV_WORKDIR = __dirname + "/";
		console.log('test data imported.');
		controller = require("soajs.controller");
		setTimeout(function () {
			urac = require("soajs.urac");
			oauth = require("soajs.oauth");
			dashboard = helper.requireModule('./index');
			setTimeout(function () {
				done();
			}, 20000);
		}, 6000);
	});
	
	it("Update hosts entries", (done) => {
		mongo.update('hosts', {'name': 'dashboard'}, {$set: {"port": 8003}}, {"multi": true, "safe": true}, function (error) {
			assert.ifError(error);
			
			mongo.update('hosts', {'name': 'urac'}, {$set: {"port": 8001}}, {"multi": true, "safe": true}, function (error) {
				assert.ifError(error);
				
				mongo.update('hosts', {'name': 'oauth'}, {$set: {"port": 8002}}, {"multi": true, "safe": true}, function (error) {
					assert.ifError(error);
					
					mongo.update('hosts', {'name': 'controller'}, {$set: {"port": 4000}}, {"multi": true, "safe": true}, function (error) {
						assert.ifError(error);
						done();
					});
				});
			});
		});
	});
	
	
	it("reload controller registry", function (done) {
		var params = {
			"uri": "http://127.0.0.1:5000/reloadRegistry",
			"headers": {
				"content-type": "application/json"
			},
			"json": true
		};
		helper.requester("get", params, function (error, response) {
			assert.ifError(error);
			assert.ok(response);
			
			var params = {
				"uri": "http://127.0.0.1:5000/awarenessStat",
				"headers": {
					"content-type": "application/json"
				},
				"json": true
			};
			helper.requester("get", params, function (error, response) {
				assert.ifError(error);
				assert.ok(response);
				
				setTimeout(function () {
					done();
				}, 500);
			});
		});
	});
	
	after(function (done) {
		setTimeout(function () {
			require("./soajs.templates.test.js");
			require("./soajs.infra.test.js");
			require("./soajs.dashboard.test.swagger.js");
			require("./soajs.dashboard.locked.test.js");
			require("./soajs.dashboard.test.tenants.js");
			require("./soajs.dashboard.test.js");
			require("./soajs.dashboard.test.services.js");
			require("./soajs.customRegistry.test.js");
			require("./soajs.resources.test.js");
			require("./soajs.catalog.test.js");
			require("./soajs.hostsdeploy.test.js");
			require("./soajs.dashboard.test.secrets.js");
			require("./soajs.dashboard.test.ci.js");
			require("./soajs.cd.test.js");
			require("./soajs.dashboard.test.gitAccounts.js");
			require("./soajs.dashboard.test.apiBuilder.js");
			done();
		}, 100);
	});
});
