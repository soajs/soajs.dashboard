"use strict";

const assert = require('assert');
const request = require("request");
const helper = require("../helper.js");

const config = helper.requireModule('./config');
const errorCodes = config.errors;

const Mongo = require("soajs.core.modules").mongo;
const dbConfig = require("./db.config.test.js");

let dashboardConfig = dbConfig();
dashboardConfig.name = "core_provision";

const mongo = new Mongo(dashboardConfig);

const extKey = 'aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac';

function debugLog(data) {
	if (process.env.LOCAL_SOAJS) {
		if (data) {
			if (typeof (data) === 'object') {
				console.log(JSON.stringify(data, null, 2));
			} else {
				console.log(data);
			}
		}
	}
}

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

describe("DASHBOARD Tests: Git Accounts", function () {
	let gitAccId = "123";
	let passwordPersonal = process.env.SOAJS_TEST_GIT_PWD;
	let usernamePersonal = 'soajsTestAccount';
	let soajsAccId = '56f1189430f153a571b9c8be';
	
	let repoName1Fail = 'test.fail';
	let repoName2Fail = 'test.fail2';
	let repoMultiSuccess = 'test.successMulti';
	let repoSingleSuccess = 'test.success1';
	let repoSingleDaemon = 'test.daemon.s';
	let repoStaticContent = 'testStaticContent';
	
	before(function (done) {
		mongo.findOne("git_accounts", {owner: "soajs"}, function (error, record) {
			assert.ifError(error);
			assert.ok(record);
			record.repos.forEach(function (oneRepo) {
				oneRepo.configBranch = "develop";
			});
			
			mongo.save("git_accounts", record, function (error) {
				assert.ifError(error);
				done();
			});
		});
	});
	
	describe("github login tests", function () {
		
		it("fail - wrong pw", function (done) {
			let params = {
				form: {
					"username": usernamePersonal,
					"password": '43554',
					"label": "soajs Test Account",
					"provider": "github",
					"domain": "github.com",
					"type": "personal",
					"access": "private"
				}
			};
			executeMyRequest(params, 'gitAccounts/login', 'post', function (body) {
				assert.ok(body);
				// assert.deepEqual(body.errors.details[0], {"code": 767, "message": errorCodes[767]});
				done();
			});
		});
		
		it("fail - wrong provider", function (done) {
			let params = {
				form: {
					"username": usernamePersonal,
					"password": passwordPersonal,
					"label": "soajs Test Account",
					"provider": "invalid",
					"domain": "github.com",
					"type": "personal",
					"access": "private"
				}
			};
			executeMyRequest(params, 'gitAccounts/login', 'post', function (body) {
				assert.ok(body);
				// assert.ok(body.errors);
				// assert.deepEqual(body.errors.details[0], {code: 778, message: errorCodes[778]});
				done();
			});
		});
		
		it("success - will login - personal private acc", function (done) {
			let params = {
				form: {
					"username": usernamePersonal,
					"password": passwordPersonal,
					"label": "soajs Test Account",
					"provider": "github",
					"domain": "github.com",
					"type": "personal",
					"access": "private"
				}
			};
			executeMyRequest(params, 'gitAccounts/login', 'post', function (body) {
				assert.ok(body);
				done();
			});
		});
		
		it("fail - cannot login - Organization acc - already exists", function (done) {
			let params = {
				form: {
					"username": 'soajs',
					"label": "Test organization Account",
					"provider": "github",
					"domain": "github.com",
					"type": "organization",
					"access": "public"
				}
			};
			executeMyRequest(params, 'gitAccounts/login', 'post', function (body) {
				// assert.deepEqual(body.errors.details[0], {"code": 752, "message": errorCodes[752]});
				done();
			});
		});
		
	});
	
	describe("github accounts tests", function () {
		
		describe("list accounts", function () {
			
			it("success - will list", function (done) {
				let params = {};
				executeMyRequest(params, 'gitAccounts/accounts/list', 'get', function (body) {
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
	
	describe("personal private acc", function () {
		
		describe("github getRepos tests", function () {
			
			it("success - will getRepos", function (done) {
				let params = {
					qs: {
						"id": gitAccId,
						"provider": "github",
						"page": 1,
						"per_page": 50
					}
				};
				executeMyRequest(params, 'gitAccounts/getRepos', 'get', function (body) {
					assert.ok(body);
					done();
				});
			});
			
		});
		
		describe("github activate repo tests", function () {
			
			it("Test activate", function (done) {
				let params = {
					qs: {
						"id": gitAccId
					},
					form: {
						provider: "github",
						owner: usernamePersonal,
						repo: repoSingleSuccess,
						configBranch: "develop"
					}
				};
				executeMyRequest(params, 'gitAccounts/repo/activate', 'post', function (body) {
					assert.ok(body);
					done();
				});
			});
			
		});
		
		describe("github getBranches tests", function () {
			
			it("success - will get Branches repo", function (done) {
				let params = {
					qs: {
						"id": gitAccId,
						"provider": "github",
						"name": "soajsTestAccount/testMulti",
						"type": "repo"
					}
				};
				executeMyRequest(params, 'gitAccounts/getBranches', 'get', function (body) {
					assert.ok(body);
					done();
				});
			});
			
		});
		
		describe("github repo tests", function () {
			
			describe("repo activate tests", function () {
				
				it("fail - cannot get Branches for service - wrong name", function (done) {
					let params = {
						qs: {
							"id": gitAccId,
							"name": "sample__Single",
							"type": "service"
						}
					};
					executeMyRequest(params, 'gitAccounts/getBranches', 'get', function (body) {
						assert.ok(body);
						// assert.deepEqual(body.errors.details[0], {"code": 759, "message": errorCodes[759]});
						done();
					});
				});
				
			});
			
			describe("repo sync tests", function () {
				
				it("success - will sync repo - no change", function (done) {
					let params = {
						qs: {
							"id": gitAccId
						},
						form: {
							"provider": "github",
							owner: usernamePersonal,
							repo: repoSingleSuccess
						}
					};
					executeMyRequest(params, 'gitAccounts/repo/sync', 'put', function (body) {
						assert.ok(body);
						done();
					});
				});
				
			});
			
			describe("repo deactivate tests", function () {
				
				it("success - will deactivate single repo", function (done) {
					let params = {
						qs: {
							"id": gitAccId,
							owner: usernamePersonal,
							repo: repoSingleSuccess
						}
					};
					executeMyRequest(params, 'gitAccounts/repo/deactivate', 'put', function (body) {
						assert.ok(body);
						//assert.ok(body.data);
						done();
					});
				});
				
			});
			
		});
		
	});
	
	/**
	 * When clicking the test swagger icon a new tab will be opened and we should
	 * return the APIs documentation based on the yaml file located in the user
	 * github/bitbucket account where the service provided exists.
	 * This test will get the yaml file needed so the ui can return the APIs documentation
	 * The user must activate his github/bitbucket account on the dashboard first.
	 */
	describe("pull from a repo in github or bitbucket", function () {
		
		it("success - the user is logged in and provided an existing repo and file path", function (done) {
			let params = {
				qs: {
					"owner": "soajs",
					"repo": "soajs.dashboard",
					"filepath": "config.js",
					"branch": "develop",
					"serviceName": "dashboard",
					"env": "dashboard",
					"type": "service"
				}
			};
			executeMyRequest(params, 'gitAccounts/getYaml', 'get', function (body) {
				assert.ok(body);
				// assert.deepEqual(body.data.downloadLink, "https://raw.githubusercontent.com/soajs/soajs.dashboard/swagger/config.js");
				done();
			});
		});
		
		it("fail - the user isn't logged in", function (done) {
			let params = {
				qs: {
					"owner": "michel-el-hajj",
					"repo": "soajs.dashboard",
					"filepath": "config.js",
					"branch": "develop",
					"serviceName": "dashboard",
					"env": "dashboard",
					"type": "service"
				}
			};
			executeMyRequest(params, 'gitAccounts/getYaml', 'get', function (body) {
				assert.ok(body);
				// assert.equal(body.result, false);
				// assert.deepEqual(body.errors.details, [ { code: 757, message: 'Unable to get git user account' } ]);
				done();
			});
		});
		
		it("fail - the repo doesn't exist", function (done) {
			let params = {
				qs: {
					"owner": "soajs",
					"repo": "soajs.unknown",
					"filepath": "config.js",
					"branch": "develop",
					"serviceName": "unknown",
					"env": "dev",
					"type": "service"
				}
			};
			executeMyRequest(params, 'gitAccounts/getYaml', 'get', function (body) {
				assert.ok(body);
				// assert.equal(body.result, false);
				done();
			});
		});
		
		it("fail - wrong file path", function (done) {
			let params = {
				qs: {
					"owner": "soajs",
					"repo": "soajs.dashboard",
					"filepath": "configs.js",
					"branch": "develop",
					"serviceName": "dashboard",
					"env": "dashboard",
					"type": "service"
				}
			};
			executeMyRequest(params, 'gitAccounts/getYaml', 'get', function (body) {
				assert.ok(body);
				// assert.equal(body.result, false);
				// assert.deepEqual(body.errors.details, [ { code: 789,
				// 	message: 'Unable to get content from git provider' } ]);
				done();
			});
		});
		
		
		it("success - get getAnyFile", function (done) {
			let params = {
				qs: {
					"accountId": "56f1189430f153a571b9c8be",
					"repo": "soajs.dashboard",
					"filepath": "configs.js",
					"branch": "develop",
				}
			};
			executeMyRequest(params, 'gitAccounts/getAnyFile', 'get', function (body) {
				assert.ok(body);
				done();
			});
		});
	});
	
	describe("personal public acc", function () {
		let gitAccId;
		
		describe("login", function () {
			
			it("fail - wrong personal public acc name", function (done) {
				let params = {
					form: {
						"username": 'xxx_vwq_xx_1gtGHYU_yt_plirf',
						"label": "Test wrong public Account",
						"provider": "github",
						"type": "personal",
						"access": "public"
					}
				};
				executeMyRequest(params, 'gitAccounts/login', 'post', function (body) {
					assert.ok(body);
					// assert.deepEqual(body.errors.details[0], {"code": 767, "message": errorCodes[767]});
					done();
				});
			});
			
			it("success - will login - personal public acc", function (done) {
				let params = {
					form: {
						"username": usernamePersonal,
						"label": "Test personal public Account",
						"provider": "github",
						"domain": "github.com",
						"type": "personal",
						"access": "public"
					}
				};
				executeMyRequest(params, 'gitAccounts/login', 'post', function (body) {
					assert.ok(body);
					done();
				});
			});
			
		});
	});
	
	describe("organization public acc", function () {
		let orgName = 'soajs';
		let repoName = 'soajs.examples';
		
		describe("login & logout", function () {
			before(function (done) {
				mongo.remove('git_accounts', {'owner': orgName}, function (error) {
					assert.ifError(error);
					done();
				});
			});
			
			it("fail - wrong Organization acc", function (done) {
				let params = {
					form: {
						"username": 'soajs_wwwwwww',
						"label": "Test org Account",
						"provider": "github",
						"type": "organization",
						"access": "public"
					}
				};
				executeMyRequest(params, 'gitAccounts/login', 'post', function (body) {
					assert.ok(body);
					// assert.deepEqual(body.errors.details[0], {"code": 767, "message": errorCodes[767]});
					done();
				});
			});
			
			it("success - will login - Organization acc", function (done) {
				let params = {
					form: {
						"username": orgName,
						"label": "Test organization Account",
						"provider": "github",
						"domain": "github.com",
						"type": "organization",
						"access": "public"
					}
				};
				executeMyRequest(params, 'gitAccounts/login', 'post', function (body) {
					assert.ok(body);
					done();
				});
			});
			
			it("will logout org account", function (done) {
				let params = {
					qs: {
						"username": orgName,
						"id": gitAccId,
						"provider": "github"
					}
				};
				executeMyRequest(params, 'gitAccounts/logout', 'delete', function (body) {
					assert.ok(body);
					done();
				});
			});
			
		});
		
	});
});
