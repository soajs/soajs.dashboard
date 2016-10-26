"use strict";
var assert = require('assert');
var shell = require('shelljs');
var helper = require("../helper.js");
var sampleData = require("soajs.mongodb.data/modules/dashboard");
var dashboard, controller, urac;

var soajs = require('soajs');
var Mongo = soajs.mongo;
var dbConfig = require("./db.config.test.js");
var dashboardConfig = dbConfig();
dashboardConfig.name = "core_provision";
var mongo = new Mongo(dashboardConfig);


describe("importing sample data", function () {

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
				"services.config.logger.level": "fatal",
				"services.config.logger.formatter.outputMode": "short"
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

	after(function (done) {
		//todo: never change process.env.SOAJS_ENV_WORKDIR to /opt/, contents of the directory will be deleted.
		process.env.SOAJS_ENV_WORKDIR = __dirname + "/";
		console.log('test data imported.');
		controller = require("soajs.controller");
		setTimeout(function () {
			urac = require("soajs.urac");
			dashboard = helper.requireModule('./index');
			setTimeout(function () {
				require("./soajs.dashboard.locked.test.js");
				require("./soajs.dashboard.test.tenants.js");
				require("./soajs.dashboard.test.js");
				require("./soajs.dashboard.test.services.js");
				// require("./soajs.contentbuilder.test.js");
				// require("./soajs.hostsdeploy.test.js");
				 require("./soajs.uploadCertificate.test.js");
				// require("./soajs.dashboard.test.gitAccounts.js");
				done();
			}, 1000);
		}, 2000);
	});
});
