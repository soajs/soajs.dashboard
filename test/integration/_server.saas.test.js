"use strict";

const assert = require('assert');
const shell = require('shelljs');
const helper = require("../helper.js");
const sampleData = require("soajs.mongodb.data/modules/dashboard");

let dashboard, controller, urac, oauth;

const Mongo = require('soajs.core.modules').mongo;
const dbConfig = require("./db.config.test.js");

let dashboardConfig = dbConfig();
dashboardConfig.name = "core_provision";

const mongo = new Mongo(dashboardConfig);


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
		let setDoc = {
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
		let setDoc = {
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
			}, 2000);
		}, 2000);
	});
	
	it("reload controller registry", function (done) {
		let params = {
			"uri": "http://127.0.0.1:5000/reloadRegistry",
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
	
	after(function (done) {
		setTimeout(function () {
			require("./soajs.dashboard.test.saas.js");
			done();
		}, 100);
	});
});
