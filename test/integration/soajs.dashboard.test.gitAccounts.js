"use strict";
var assert = require('assert');
var request = require("request");
var soajs = require('soajs');
var util = require('soajs/lib/utils');
var helper = require("../helper.js");
var dashboard;

var config = helper.requireModule('./config');
var errorCodes = config.errors;

var Mongo = soajs.mongo;
var dbConfig = require("./db.config.test.js");

var dashboardConfig = dbConfig();
dashboardConfig.name = "core_provision";
var mongo = new Mongo(dashboardConfig);

var extKey = 'aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac';

function executeMyRequest(params, apiPath, method, cb) {
	requester(apiPath, method, params, function (error, body) {
		assert.ifError(error);
		assert.ok(body);
		return cb(body);
	});

	function requester(apiName, method, params, cb) {
		var options = {
			uri: 'http://localhost:4000/dashboard/' + apiName,
			headers: {
				'Content-Type': 'application/json',
				key: extKey
			},
			json: true
		};

		if (params.headers) {
			for (var h in params.headers) {
				if (params.headers.hasOwnProperty(h)) {
					options.headers[h] = params.headers[h];
				}
			}
		}

		if (params.form) {
			options.body = params.form;
		}

		if (params.qs) {
			options.qs = params.qs;
		}

		request[method](options, function (error, response, body) {
			assert.ifError(error);
			assert.ok(body);
			return cb(null, body);
		});
	}
}

describe("DASHBOARD UNIT Tests: Git Accounts", function () {
	var gitAccId;
	var passwordPersonal = 'test2016';
	var usernamePersonal = 'soajsTestAccount';

	describe("github login tests", function () {

		it("success - will login personal private acc", function (done) {
			var params = {
				form: {
					"username": usernamePersonal,
					"password": passwordPersonal,
					"label": "soajs Test Account",
					"provider": "github",
					"type": "personal",
					"access": "private"
				}
			};
			executeMyRequest(params, 'github/login', 'post', function (body) {
				assert.ok(body.result);
				done();
			});
		});

		it.skip("success - will login personal public acc", function (done) {
			var params = {
				form: {
					"username": '',
					"password": '',
					"label": "Test personal public Account",
					"provider": "github",
					"type": "personal",
					"access": "public"
				}
			};
			executeMyRequest(params, 'github/login', 'post', function (body) {
				assert.ok(body.result);
				done();
			});
		});

		it.skip("success - will login  Organization acc", function (done) {
			var params = {
				form: {
					"username": '',
					"password": '',
					"label": "Test organization Account",
					"provider": "github",
					"type": "organization",
					"access": "public"
				}
			};
			executeMyRequest(params, 'github/login', 'post', function (body) {
				assert.ok(body.result);
				done();
			});
		});

	});

	describe("github accounts tests", function () {

		describe("list accounts", function () {

			it("success - will list", function (done) {
				var params = {};
				executeMyRequest(params, 'github/accounts/list', 'get', function (body) {
					assert.ok(body.result);
					assert.ok(body.data);
					body.data.forEach(function (repo) {
						if (repo.owner === usernamePersonal) {
							gitAccId = repo._id.toString();
						}
					});
					done();
				});
			});
		});

	});

	describe("github getRepos tests", function () {

		it("success - will getRepos", function (done) {
			var params = {
				qs: {
					"id": gitAccId
				}
			};
			executeMyRequest(params, 'github/getRepos', 'get', function (body) {
				assert.ok(body.data);
				done();
			});
		});

	});

	describe("github getBranches tests", function () {

		it("success - will getBranches", function (done) {
			var params = {
				qs: {
					"id": gitAccId,
					"name": "soajsTestAccount/testMulti",
					"type": "repo"
				}
			};
			executeMyRequest(params, 'github/getBranches', 'get', function (body) {
				assert.ok(body.data);
				done();
			});
		});

	});

	describe("github repo tests", function () {

		describe("repo activate tests", function () {

			it("success - will activate repo", function (done) {
				var params = {
					qs: {
						"id": gitAccId
					},
					form: {
						provider: "github",
						owner: usernamePersonal,
						repo: "testMulti",
						configBranch: "master"
					}
				};
				executeMyRequest(params, 'github/repo/activate', 'post', function (body) {
					console.log(body);
					assert.ok(body.data);
					done();
				});
			});

			it("fail - cant logout active acc", function (done) {
				var params = {
					qs: {
						"username": usernamePersonal,
						"password": passwordPersonal,
						"id": gitAccId
					}
				};
				executeMyRequest(params, 'github/logout', 'get', function (body) {
					console.log(body);
					assert.equal(body.result, false);
					assert.deepEqual(body.errors.details[0], {"code": 754, "message": errorCodes[754]});
					done();
				});
			});

		});


		describe("repo sync tests", function () {

			it("success - will sync repo", function (done) {
				var params = {
					qs: {
						"id": gitAccId
					},
					form: {
						owner: usernamePersonal,
						repo: "testMulti"
					}
				};
				executeMyRequest(params, 'github/repo/sync', 'post', function (body) {
					console.log(body);
					assert.ok(body.data);
					done();
				});
			});

		});

		describe("repo deactivate tests", function () {

			it("success - will deactivate repo", function (done) {
				var params = {
					qs: {
						"id": gitAccId,
						owner: usernamePersonal,
						repo: "testMulti"
					}
				};
				executeMyRequest(params, 'github/repo/deactivate', 'get', function (body) {
					console.log(body);
					assert.ok(body.data);
					done();
				});
			});

		});

	});

	describe("github logout tests", function () {

		it("success - will logout personal acc", function (done) {
			var params = {
				qs: {
					"username": usernamePersonal,
					"password": passwordPersonal,
					"id": gitAccId
				}
			};
			executeMyRequest(params, 'github/logout', 'get', function (body) {
				console.log(body);
				assert.ok(body.data);
				done();
			});
		});
	});

});