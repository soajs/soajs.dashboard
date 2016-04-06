"use strict";
var assert = require('assert');
var request = require("request");
var soajs = require('soajs');
var helper = require("../helper.js");

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
	var soajsAccId = '56f1189430f153a571b9c8be';

	var repoName1Fail = 'test.fail';
	var repoName2Fail = 'test.fail2';
	var repoMultiSuccess = 'test.successMulti';
	var repoSingleSuccess = 'test.success1';

	describe("github login tests", function () {

		it("fail - wrong pw", function (done) {
			var params = {
				form: {
					"username": usernamePersonal,
					"password": '43554',
					"label": "soajs Test Account",
					"provider": "github",
					"type": "personal",
					"access": "private"
				}
			};
			executeMyRequest(params, 'github/login', 'post', function (body) {
				console.log(body);
				assert.ok(body);
				assert.deepEqual(body.errors.details[0], {"code": 763, "message": errorCodes[763]});
				done();
			});
		});

		it("success - will login - personal private acc", function (done) {
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

		it("fail - cannot login - Organization acc - already exists", function (done) {
			var params = {
				form: {
					"username": 'soajs',
					"label": "Test organization Account",
					"provider": "github",
					"type": "organization",
					"access": "public"
				}
			};
			executeMyRequest(params, 'github/login', 'post', function (body) {
				console.log(body);
				assert.deepEqual(body.errors.details[0], {"code": 752, "message": errorCodes[752]});
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

	describe("personal private acc", function () {

		describe("github getRepos tests", function () {

			it("success - will getRepos", function (done) {
				var params = {
					qs: {
						"id": gitAccId
					}
				};
				executeMyRequest(params, 'github/getRepos', 'get', function (body) {
					//console.log(body);
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

				it("fail - will not activate repo", function (done) {
					var params = {
						qs: {
							"id": gitAccId
						},
						form: {
							provider: "github",
							owner: usernamePersonal,
							repo: repoName1Fail,
							configBranch: "master"
						}
					};
					executeMyRequest(params, 'github/repo/activate', 'post', function (body) {
						console.log(body);
						assert.deepEqual(body.errors.details[0], {"code": 761, "message": errorCodes[761]});
						done();
					});
				});

				it("success - will activate personal repo", function (done) {
					var params = {
						qs: {
							"id": gitAccId
						},
						form: {
							provider: "github",
							owner: usernamePersonal,
							repo: repoSingleSuccess,
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
							repo: repoSingleSuccess
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
							repo: repoSingleSuccess
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

	});

	describe.skip("github logout tests", function () {

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

		it("fail logout personal acc", function (done) {
			var params = {
				qs: {
					"username": usernamePersonal,
					"password": passwordPersonal,
					"id": gitAccId
				}
			};
			executeMyRequest(params, 'github/logout', 'get', function (body) {
				console.log(body);
				assert.ok(body);
				assert.deepEqual(body.errors.details[0], {"code": 753, "message": errorCodes[753]});
				done();
			});
		});

	});

	describe.skip("personal public acc", function () {
		var gitAccId;

		describe("login", function () {

			it("success - will login - personal public acc", function (done) {
				var params = {
					form: {
						"username": usernamePersonal,
						"label": "Test personal public Account",
						"provider": "github",
						"type": "personal",
						"access": "public"
					}
				};
				executeMyRequest(params, 'github/login', 'post', function (body) {
					console.log(body);
					assert.equal(body.result, true);
					mongo.findOne('git_accounts', {'owner': usernamePersonal}, function (error, record) {
						//console.log(record);
						assert.ifError(error);
						assert.ok(record);
						gitAccId = record._id.toString();
						done();
					});
				});
			});

		});

		describe("github repo tests", function () {

			describe("repo activate tests", function () {

				it("fail 1 - will not activate repo", function (done) {
					var params = {
						qs: {
							"id": gitAccId
						},
						form: {
							provider: "github",
							owner: usernamePersonal,
							repo: repoName1Fail,
							configBranch: "master"
						}
					};
					executeMyRequest(params, 'github/repo/activate', 'post', function (body) {
						console.log(body);
						assert.deepEqual(body.errors.details[0], {"code": 761, "message": errorCodes[761]});
						done();
					});
				});

				it.skip("fail 2 - will not activate repo", function (done) {
					var params = {
						qs: {
							"id": gitAccId
						},
						form: {
							provider: "github",
							owner: usernamePersonal,
							repo: repoName2Fail,
							configBranch: "master"
						}
					};
					executeMyRequest(params, 'github/repo/activate', 'post', function (body) {
						console.log(body);
						assert.deepEqual(body.errors.details[0], {"code": 761, "message": errorCodes[761]});
						done();
					});
				});

				it.skip("success - will activate single repo", function (done) {
					var params = {
						qs: {
							"id": gitAccId
						},
						form: {
							provider: "github",
							owner: usernamePersonal,
							repo: repoSingleSuccess,
							configBranch: "master"
						}
					};
					executeMyRequest(params, 'github/repo/activate', 'post', function (body) {
						console.log(body);
						assert.ok(body.data);
						done();
					});
				});

				it.skip("success - will activate multi repo", function (done) {
					var params = {
						qs: {
							"id": gitAccId
						},
						form: {
							provider: "github",
							owner: usernamePersonal,
							repo: repoMultiSuccess,
							configBranch: "master"
						}
					};
					executeMyRequest(params, 'github/repo/activate', 'post', function (body) {
						console.log(body);
						assert.ok(body.data);
						done();
					});
				});

				it.skip("fail - cant logout active acc", function (done) {
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

			describe.skip("repo sync tests", function () {

				it("success - will sync repo", function (done) {
					var params = {
						qs: {
							"id": gitAccId
						},
						form: {
							owner: usernamePersonal,
							repo: repoSingleSuccess
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

				it("success - will deactivate single repo", function (done) {
					var params = {
						qs: {
							"id": gitAccId,
							owner: usernamePersonal,
							repo: repoSingleSuccess
						}
					};
					executeMyRequest(params, 'github/repo/deactivate', 'get', function (body) {
						console.log(body);
						assert.ok(body.data);
						done();
					});
				});

				it("success - will deactivate multi repo", function (done) {
					var params = {
						qs: {
							"id": gitAccId,
							owner: usernamePersonal,
							repo: repoMultiSuccess
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
	});

	describe("organization public acc", function () {
		var orgName = 'soajs';

		var repoName = 'soajs.examples';

		describe("github repo tests", function () {

			describe("repo activate tests", function () {

				it("success org - will activate repo", function (done) {
					var params = {
						qs: {
							"id": soajsAccId
						},
						form: {
							provider: "github",
							owner: orgName,
							repo: repoName,
							configBranch: "develop"
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
							"username": orgName,
							"id": soajsAccId
						}
					};
					executeMyRequest(params, 'github/logout', 'get', function (body) {
						assert.equal(body.result, false);
						assert.deepEqual(body.errors.details[0], {"code": 754, "message": errorCodes[754]});
						done();
					});
				});

			});

			describe("repo sync tests", function () {

				it("success - will sync repo - org", function (done) {
					var params = {
						qs: {
							"id": soajsAccId
						},
						form: {
							owner: orgName,
							repo: repoName
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

				it("success - will deactivate repo - org", function (done) {
					var params = {
						qs: {
							"id": soajsAccId,
							owner: orgName,
							repo: repoName
						}
					};
					executeMyRequest(params, 'github/repo/deactivate', 'get', function (body) {
						console.log(body);
						assert.ok(body.data);
						done();
					});
				});

				it("fail - will try deactivate urac repo - org", function (done) {
					var params = {
						qs: {
							"id": soajsAccId,
							owner: orgName,
							repo: 'soajs.urac'
						}
					};
					executeMyRequest(params, 'github/repo/deactivate', 'get', function (body) {
						console.log(body);
						assert.deepEqual(body.errors.details[0], {"code": 766, "message": errorCodes[766]});
						done();
					});
				});

			});

		});

		describe("login", function () {
			// logout first
			it("clear org account", function (done) {
				mongo.remove('git_accounts', {'owner': orgName}, function (error) {
					assert.ifError(error);
					done();
				});
			});

			it("fail - wrong Organization acc", function (done) {
				var params = {
					form: {
						"username": 'soajs_wwwwwww',
						"label": "Test org Account",
						"provider": "github",
						"type": "organization",
						"access": "public"
					}
				};
				executeMyRequest(params, 'github/login', 'post', function (body) {
					console.log(body);
					assert.ok(body);
					assert.deepEqual(body.errors.details[0], {"code": 763, "message": errorCodes[763]});
					done();
				});
			});

			it("success - will login - Organization acc", function (done) {
				var params = {
					form: {
						"username": orgName,
						"label": "Test organization Account",
						"provider": "github",
						"type": "organization",
						"access": "public"
					}
				};
				executeMyRequest(params, 'github/login', 'post', function (body) {
					console.log(body);
					assert.ok(body.result);
					mongo.findOne('git_accounts', {'owner': orgName}, function (error, record) {
						console.log(record);
						assert.ifError(error);
						assert.ok(record);
						gitAccId = record._id.toString();
						done();
					});
				});
			});

			// activate the urac, then try to deactivate
			it.skip("success - will activate oauth repo - org", function (done) {
				var params = {
					qs: {
						"id": gitAccId
					},
					form: {
						provider: "github",
						owner: orgName,
						repo: 'soajs.oauth',
						configBranch: "develop"
					}
				};
				console.log(params);
				executeMyRequest(params, 'github/repo/activate', 'get', function (body) {
					console.log(body);
					assert.ok(body.data);
					done();
				});
			});

			it.skip("success - will try deactivate oauth repo - org", function (done) {
				var params = {
					qs: {
						"id": gitAccId,
						owner: orgName,
						repo: 'soajs.oauth'
					}
				};
				executeMyRequest(params, 'github/repo/deactivate', 'get', function (body) {
					console.log(body);
					assert.ok(body.data);
					done();
				});
			});

			it("will logout org account", function (done) {
				var params = {
					qs: {
						"username": orgName,
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

});