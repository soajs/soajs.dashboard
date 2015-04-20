"use strict";
var assert = require('assert');
var shell = require('shelljs');
var helper = require("../helper.js");
var sampleData = require("soajs.mongodb.data/modules/dashboard");
var dashboard, controller;

describe("importing sample data", function() {

	it("do import", function(done) {
		shell.pushd(sampleData.dir);
		shell.exec("chmod +x " + sampleData.shell, function(code) {
			assert.equal(code, 0);
			shell.exec(sampleData.shell, function(code) {
				assert.equal(code, 0);
				shell.popd();
				done();
			});
		});
	});

	after(function(done) {
		console.log('test data imported.');
		controller = require("soajs.controller");
		dashboard = helper.requireModule('./service/index');

		setTimeout(function() {
			console.log('starting tests ....');
			done();
		}, 6000);
	});
});