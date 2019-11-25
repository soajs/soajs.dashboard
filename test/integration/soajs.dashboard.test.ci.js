"use strict";
const fs = require('fs');
const assert = require('assert');
const request = require("request");
const helper = require("../helper.js");
const nock = require("nock");
const Mongo = require("soajs.core.modules").mongo;
const dbConfig = require("./db.config.test.js");

let dashboardConfig = dbConfig();
dashboardConfig.name = "core_provision";
const mongo = new Mongo(dashboardConfig);

const config = helper.requireModule('./config');
const extKey = 'aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac';

let repoToUse = {
	id: '1234'
};

function executeMyRequest(params, apiPath, method, cb) {
	requester(apiPath, method, params, function (error, body) {
		assert.ifError(error);
		assert.ok(body);
		return cb(body);
	});
	
	function requester(apiName, method, params, cb) {
		let options = {
			uri: 'http://localhost:4000/dashboard/' + apiName,
			headers: {
				'Content-Type': 'application/json',
				key: extKey
			},
			json: true
		};
		
		if (params.headers) {
			for (let h in params.headers) {
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
	let configData = {
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
	
	let recipeRecord = {};
	
	before("clean data", function (done) {
		mongo.remove("cicd", {}, function (error) {
			assert.ifError(error);
			done();
		});
	});
	
	it("Success - list Accounts", function (done) {
		let params = {};
		
		mongo.insert("git_accounts", {
			"label": "Test Account",
			"owner": "beaver",
			"provider": "github",
			"domain": "github.com",
			"type": "organization",
			"access": "public",
			"repos": []
		}, function (error) {
			assert.ifError(error);
			
			executeMyRequest(params, 'ci', 'get', function (body) {
				assert.ok(body.data);
				assert.ok(body.result);
				done();
			});
		});
	});
	
	it.skip("Success - list Accounts with variables", function (done) {
		let params = {
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
	
	it.skip("Success - list Accounts for specific owner", function (done) {
		let params = {
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
	
	it("success - activate provider", function (done) {
		let params = {
			form: {
				domain: 'travis-ci.org',
				gitToken: 'myGitToken',
				owner: "soajs",
				provider: "travis"
			}
		};
		nock('https://travis-ci.org')
			.post('/auth/github',
				{
					github_token: 'myGitToken'
				})
			.reply(200, {
				access_token: 'accessToken'
			});
		executeMyRequest(params, 'ci/provider', 'post', function (body) {
			nock.cleanAll();
			assert.ok(body);
			done();
		});
	});
	
	
	it("Success - list Providers", function (done) {
		
		mongo.insert("cicd", [
			{
				"provider": "travis",
				"type": "recipe",
				"name": "My Custom Recipe",
				"recipe": "sudo something",
				"sha": "1234"
			}
		], function (error) {
			assert.ifError(error);
			
			let params = {};
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
		}, function (error) {
			assert.ifError(error);
			
			let params = {
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
		let params = {
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
		let params = {
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
	
	it("success - add new recipe", function (done) {
		let params = {
			form: {
				name: 'My Test Recipe',
				provider: "travis",
				recipe: "language: node_js\nnode_js: 6.9.5\nservices:\n    - mongodb\nenv:\n    - CXX=g++-4.8\nbranches:\n    only:\n        - master\naddons:\n    apt:\n        sources:\n            - ubuntu-toolchain-r-test\n        packages:\n            - g++-4.8\n    hosts:\n        - localhost\nbefore_install:\n    - 'sudo apt-get update && sudo apt-get install sendmail python make g++'\nbefore_script:\n    - 'npm install -g grunt-cli'\n    - 'sleep 10'\nscript:\n    - 'grunt coverage'\nafter_success:\n    - 'node ./soajs.cd.js'\n",
			}
		};
		
		executeMyRequest(params, 'ci/recipe', 'post', function (body) {
			assert.ok(body.data);
			assert.ok(body.result);
			done();
		});
	});
	
	it("success - get recipe record from database", function (done) {
		mongo.findOne('cicd', {type: 'recipe', name: 'My Test Recipe', provider: 'travis'}, function (error, recipe) {
			assert.ifError(error);
			recipeRecord = recipe;
			done();
		});
	});
	
	it("success - edit recipe", function (done) {
		let params = {
			qs: {
				id: recipeRecord._id.toString()
			},
			form: {
				name: 'My Edited Test Recipe',
				provider: "travis",
				recipe: "language: node_js\nnode_js: 6.9.5\nservices:\n    - mongodb\nenv:\n    - CXX=g++-4.8\nbranches:\n    only:\n        - master\naddons:\n    apt:\n        sources:\n            - ubuntu-toolchain-r-test\n        packages:\n            - g++-4.8\n    hosts:\n        - localhost\nbefore_install:\n    - 'sudo apt-get update && sudo apt-get install sendmail python make g++'\nbefore_script:\n    - 'npm install -g grunt-cli'\n    - 'sleep 10'\nscript:\n    - 'grunt coverage'\nafter_success:\n    - 'node ./soajs.cd.js'\n",
			}
		};
		
		executeMyRequest(params, 'ci/recipe', 'put', function (body) {
			assert.ok(body.data);
			assert.ok(body.result);
			done();
		});
	});
	
	it("Success - download recipe", function (done) {
		let options = {
			uri: 'http://localhost:4000/dashboard/ci/recipe/download',
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/zip',
				key: extKey
			},
			json: true,
			qs: {
				id: recipeRecord._id.toString()
			}
		};
		
		request.get(options).pipe(fs.createWriteStream("./ci.zip")).on('close', function () {
			fs.exists("./ci.zip", function (exists) {
				assert.equal(exists, true);
				done();
			});
		});
	});
	
	it("success - delete recipe", function (done) {
		let params = {
			qs: {
				id: recipeRecord._id.toString()
			}
		};
		
		executeMyRequest(params, 'ci/recipe', 'delete', function (body) {
			assert.ok(body.data);
			assert.ok(body.result);
			done();
		});
	});
	
	it("success - download script", function (done) {
		let options = {
			uri: 'http://localhost:4000/dashboard/ci/script/download',
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/zip',
				key: extKey
			},
			json: true
		};
		request.get(options).pipe(fs.createWriteStream("./soajs.cd.zip")).on('close', function () {
			fs.exists("./soajs.cd.zip", function (exists) {
				assert.equal(exists, true);
				done();
			});
		});
	});
	
	it("Success - Enable Repo", function (done) {
		let params = {
			"qs": {
				"id": repoToUse.id,
				"provider": "travis",
				"owner": "soajs",
				"enable": true
			}
		};
		
		executeMyRequest(params, 'ci/status', 'get', function (body) {
			assert.ok(body);
			done();
		});
	});
	
	it("Success - get repo settings", function (done) {
		let params = {
			"qs": {
				"id": 12464664,
				"provider": "travis",
				"owner": "soajs"
			}
		};
		
		executeMyRequest(params, 'ci/settings', 'get', function (body) {
			assert.ok(body);
			done();
		});
	});
	
	it("Success - change repo settings", function (done) {
		let params = {
			"qs": {
				"id": 12464664,
				"provider": "travis",
				"owner": "soajs"
			},
			"form": {
				"port": "80",
				"settings": {
					build_pull_requests: false,
					build_pushes: true,
					builds_only_with_travis_yml: true,
					maximum_number_of_builds: 0
				},
				"variables": {
					"var1": "val1",
					"var2": "val2"
				}
			}
		};
		
		executeMyRequest(params, 'ci/settings', 'put', function (body) {
			assert.ok(body);
			done();
		});
	});
	
	it("Success - getRepoYamlFile", function (done) {
		let params = {
			"qs": {
				"provider": "github",
				"repo": "soajs.dashboard",
				"branch": "develop",
				"owner": "soajs"
			}
		};
		executeMyRequest(params, 'ci/repo/remote/config', 'get', function (body) {
			assert.ok(body.result);
			done();
		});
	});
	
	it("Success - get latest build of repo per branch", function (done) {
		let params = {
			"qs": {
				"provider": "travis",
				"repo": "soajs.dashboard",
				"owner": "soajs"
			}
		};
		executeMyRequest(params, 'ci/repo/builds', 'get', function (body) {
			assert.ok(body);
			done();
		});
	});
});
