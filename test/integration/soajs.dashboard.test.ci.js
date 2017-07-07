"use strict";
var fs = require('fs');
var assert = require('assert');
var request = require("request");
var helper = require("../helper.js");

var Mongo = require("soajs.core.modules").mongo;
var dbConfig = require("./db.config.test.js");

var dashboardConfig = dbConfig();
dashboardConfig.name = "core_provision";
var mongo = new Mongo(dashboardConfig);

var config = helper.requireModule('./config');
var extKey = 'aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac';

var repoToUse = {
	id: '1234'
};

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

describe("DASHBOARD TESTS: Continuous integration", function () {
	var configData = {
		"config": {
			"driver": "travis",
			"settings": {
				"domain": "api.travis-ci.org",
				"owner": "soajsTestAccount"
				// "gitToken": process.env.SOAJS_TEST_GIT_TOKEN
			},
			"recipe": ""
		}
	};

	it("Success - list Accounts", function (done) {
		var params = {};
		
		mongo.insert("git_accounts", {
			"label": "Test Account",
			"owner": "beaver",
			"provider": "github",
			"domain": "github.com",
			"type": "organization",
			"access": "public",
			"repos": []
		}, function(error){
			assert.ifError(error);
			
			executeMyRequest(params, 'ci', 'get', function (body) {
				assert.ok(body.data);
				assert.ok(body.result);
				done();
			});
		});
	});
	
	it("Success - list Accounts with variables", function (done) {
		var params = {
			qs: {
				variables: true
			}
		};
		
		executeMyRequest(params, 'ci', 'get', function (body) {
			assert.ok(body.data);
			assert.ok(body.result);
			done();
		});
	});
	
	it("Success - list Accounts for specific owner", function (done) {
		var params = {
			qs: {
				owner: "soajs",
				variables: true
			}
		};
		
		executeMyRequest(params, 'ci', 'get', function (body) {
			assert.ok(body.data);
			assert.ok(body.result);
			done();
		});
	});
	
	
	it("Success - list Providers", function (done) {
		
		mongo.insert("cicd", [
			{
				"provider": "travis",
				"type": "account",
				"owner": "soajs",
				"domain": "api.travis-ci.org",
				"gitToken": "myGitToken",
				"ciToken": "1234"
			},
			{
				"provider": "travis",
				"type": "recipe",
				"name": "My Custom Recipe",
				"recipe": "sudo something",
				"sha": "1234"
			}
		], function(error){
			assert.ifError(error);
			
			var params = {};
			executeMyRequest(params, 'ci/providers', 'get', function (body) {
				assert.ok(body.data);
				assert.ok(body.result);
				done();
			});
		});
	});
	
	it("Success - list Providers for specific provider", function (done) {
		
		mongo.insert("cicd", {
			"owner": "soajs",
			"provider": "drone",
			"domain": "github.com",
			"type": "account",
			"gitToken": "myGitToken",
			"ciToken": "1234"
		}, function(error) {
			assert.ifError(error);
			
			var params = {
				qs: {
					provider: 'travis'
				}
			};
			
			executeMyRequest(params, 'ci/providers', 'get', function (body) {
				assert.ok(body.data);
				assert.ok(body.result);
				done();
			});
		});
	});
	
	it("Success - list Providers for specific owner", function (done) {
		var params = {
			qs: {
				owner: "soajs"
			}
		};
		
		executeMyRequest(params, 'ci/providers', 'get', function (body) {
			assert.ok(body.data);
			assert.ok(body.result);
			done();
		});
	});
	
	
	
	it("Success - deactivate provider", function (done) {
		var params = {
			form: {
				owner: "soajs",
				provider: "drone"
			}
		};
		
		executeMyRequest(params, 'ci/provider', 'put', function (body) {
			assert.ok(body.data);
			assert.ok(body.result);
			done();
		});
	});
	
	it.skip("success - activate provider", function(done){
		
	});
	
	
	it.skip("success = add new recipe", function(done){
		
	});
	
	it.skip("success = add new recipe", function(done){
		
	});
	
	it.skip("success = edit recipe", function(done){
		
	});
	
	it.skip("success = delete recipe", function(done){
		
	});

	it.skip("Success - download recipe", function (done) {
		// var options = {
		// 	uri: 'http://localhost:4000/dashboard/ci/recipe/download',
		// 	headers: {
		// 		'Content-Type': 'application/json',
		// 		'Accept': 'application/zip',
		// 		key: extKey
		// 	},
		// 	json: true
		// };
		// request.get(options).pipe(fs.createWriteStream("./ci.zip")).on('close', function () {
		// 	fs.exists("./ci.zip", function (exists) {
		// 		assert.equal(exists, true);
		// 		done();
		// 	});
		// });
	});
	
	it.skip("success - download script", function(done){
		
	});

	it.skip("Success - Enable Repo", function (done) {
		// var params = {
		// 	"qs": {
		// 		"id": repoToUse.id,
		// 		"enable": true
		// 	}
		// };
		//
		// executeMyRequest(params, 'ci/status', 'get', function (body) {
		// });
		// done();
	});
	
	it.skip("Success - get repo settings", function (done) {
		// var params = {
		// 	"qs": {
		// 		"id": 12464664
		// 	}
		// };
		//
		// executeMyRequest(params, 'ci/settings', 'get', function (body) {
		// 	// assert.ok(body.result);
		// });
		// done();
	});

	it.skip("Success - change repo settings", function (done) {
		// var params = {
		// 	"qs": {
		// 		"id": 12464664
		// 	},
		// 	"form": {
		// 		"port": 80,
		// 		"settings": {
		// 			build_pull_requests: false,
		// 			build_pushes: true,
		// 			builds_only_with_travis_yml: true,
		// 			maximum_number_of_builds: 0
		// 		},
		// 		"variables": {
		// 			"var1": "val1",
		// 			"var2": "val2"
		// 		}
		// 	}
		// };
		//
		// executeMyRequest(params, 'ci/settings', 'put', function (body) {
		// 	// assert.ok(body.data);
		// 	// assert.ok(body.result);
		// });
		// done();
	});

	it.skip("Success - getRepoYamlFile", function (done) {
		// var params = {
		// 	"qs": {
		// 		"port": 80
		// 	}
		// };
		// executeMyRequest(params, 'ci/sync', 'get', function (body) {
		// 	// assert.ok(body.result);
		// 	// assert.ok(body.data);
		// });
		// done();
	});
});