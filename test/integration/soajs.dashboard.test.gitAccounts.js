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
	var repoSingleDaemon = 'test.daemon.s';
	var repoStaticContent = 'testStaticContent';

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
			executeMyRequest(params, 'gitAccounts/login', 'post', function (body) {
				assert.ok(body);
				assert.deepEqual(body.errors.details[0], {"code": 767, "message": errorCodes[767]});
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
			executeMyRequest(params, 'gitAccounts/login', 'post', function (body) {
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
			executeMyRequest(params, 'gitAccounts/login', 'post', function (body) {
				assert.deepEqual(body.errors.details[0], {"code": 752, "message": errorCodes[752]});
				done();
			});
		});

	});

	describe("github accounts tests", function () {

		describe("list accounts", function () {

			it("success - will list", function (done) {
				var params = {};
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
				var params = {
					qs: {
						"id": gitAccId,
						"provider": "github",
						"page": 1,
						"per_page": 50
					}
				};
				executeMyRequest(params, 'gitAccounts/getRepos', 'get', function (body) {
					assert.ok(body.data);
					done();
				});
			});

		});

		describe("github getBranches tests", function () {

			it("success - will get Branches repo", function (done) {
				var params = {
					qs: {
						"id": gitAccId,
						"provider": "github",
						"name": "soajsTestAccount/testMulti",
						"type": "repo"
					}
				};
				executeMyRequest(params, 'gitAccounts/getBranches', 'get', function (body) {
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
					executeMyRequest(params, 'gitAccounts/repo/activate', 'post', function (body) {
						assert.deepEqual(body.errors.details[0], {"code": 761, "message": errorCodes[761]});
						done();
					});
				});

				it("fail 2 - will not activate repo", function (done) {
					// missing config info
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
					executeMyRequest(params, 'gitAccounts/repo/activate', 'post', function (body) {
						assert.deepEqual(body.errors.details[0], {"code": 761, "message": errorCodes[761]});
						done();
					});
				});

				it("fail 3 - will not activate repo", function (done) {
					// Missing multi repository config data
					var params = {
						qs: {
							"id": gitAccId
						},
						form: {
							provider: "github",
							owner: usernamePersonal,
							repo: 'test.MultiEmpty',
							configBranch: "master"
						}
					};
					executeMyRequest(params, 'gitAccounts/repo/activate', 'post', function (body) {
						assert.deepEqual(body.errors.details[0], {"code": 761, "message": errorCodes[761]});
						done();
					});
				});

				it("fail to activate personal multi repo", function (done) {
					// inject service with port 3002
					var srv = {
						"name": "testService",
						"port": 3002,
						"requestTimeout": 30,
						"requestTimeoutRenewal": 5,
						"src": {
							"provider": "github",
							"owner": "ownerName",
							"repo": "testRepoName"
						},
						"versions": {
							"1": {
								"extKeyRequired": true,
								"apis": []
							}
						}
					};

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
					mongo.insert("services", srv, function (error) {
						executeMyRequest(params, 'gitAccounts/repo/activate', 'post', function (body) {
							assert.equal(body.result, false);
							assert.deepEqual(body.errors.details[0], {"code": 762, "message": errorCodes[762]});
							mongo.remove('services', {'name': 'testService'}, function (error) {
								assert.ifError(error);
								done();
							});
						});
					});
				});

				it("success - will activate single service repo", function (done) {
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
					executeMyRequest(params, 'gitAccounts/repo/activate', 'post', function (body) {
						assert.ok(body.data);
						done();
					});
				});

				it("success - will activate single static repo", function (done) {
					var params = {
						qs: {
							"id": gitAccId
						},
						form: {
							provider: "github",
							owner: usernamePersonal,
							repo: repoStaticContent,
							configBranch: "master"
						}
					};
					executeMyRequest(params, 'gitAccounts/repo/activate', 'post', function (body) {
						assert.ok(body.data);
						done();
					});
				});

				it("success - will activate single daemon repo", function (done) {
					var params = {
						qs: {
							"id": gitAccId
						},
						form: {
							provider: "github",
							owner: usernamePersonal,
							repo: repoSingleDaemon,
							configBranch: "master"
						}
					};
					executeMyRequest(params, 'gitAccounts/repo/activate', 'post', function (body) {
						assert.ok(body.data);
						done();
					});
				});

				it("success - will activate multi repo", function (done) {
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
					executeMyRequest(params, 'gitAccounts/repo/activate', 'post', function (body) {
						assert.ok(body.data);
						done();
					});
				});

				it("fail - cannot activate again personal multi repo", function (done) {
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
					executeMyRequest(params, 'gitAccounts/repo/activate', 'post', function (body) {
						assert.equal(body.result, false);
						assert.deepEqual(body.errors.details[0], {"code": 762, "message": errorCodes[762]});
						done();
					});
				});

				it("fail - cannot get Branches for service - wrong name", function (done) {
					var params = {
						qs: {
							"id": gitAccId,
							"name": "sample__Single",
							"type": "service"
						}
					};
					executeMyRequest(params, 'gitAccounts/getBranches', 'get', function (body) {
						assert.deepEqual(body.errors.details[0], {"code": 759, "message": errorCodes[759]});
						done();
					});
				});

				it("success - will get Branches for service", function (done) {
					var params = {
						qs: {
							"id": gitAccId,
							"name": "sampleSuccessSingle",
							"type": "service"
						}
					};
					executeMyRequest(params, 'gitAccounts/getBranches', 'get', function (body) {
						assert.ok(body.data);
						done();
					});
				});

				it("success - will get Branches for daemon", function (done) {
					var params = {
						qs: {
							"id": gitAccId,
							"name": "singleDaemon1",
							"type": "daemon"
						}
					};
					executeMyRequest(params, 'gitAccounts/getBranches', 'get', function (body) {
						assert.ok(body.data);
						done();
					});
				});

				it("success - will get Branches for static", function (done) {
					var params = {
						qs: {
							"id": gitAccId,
							"name": "SampleTest4",
							"type": "static"
						}
					};
					executeMyRequest(params, 'gitAccounts/getBranches', 'get', function (body) {
						assert.ok(body.data);
						done();
					});
				});

				it("fail - cant logout active account", function (done) {
					var params = {
						qs: {
							"username": usernamePersonal,
							"password": passwordPersonal,
							"id": gitAccId,
							"provider": "github"
						}
					};
					executeMyRequest(params, 'gitAccounts/logout', 'get', function (body) {
						assert.equal(body.result, false);
						assert.deepEqual(body.errors.details[0], {"code": 754, "message": errorCodes[754]});
						done();
					});
				});

			});

			describe("repo sync tests", function () {

				it("success - will sync repo - no change", function (done) {
					var params = {
						qs: {
							"id": gitAccId,
							"provider": "github"
						},
						form: {
							owner: usernamePersonal,
							repo: repoSingleSuccess
						}
					};
					executeMyRequest(params, 'gitAccounts/repo/sync', 'post', function (body) {
						assert.ok(body.data);
						done();
					});
				});

				it("success - will sync single repo - change", function (done) {
					mongo.findOne('git_accounts', {'owner': usernamePersonal}, function (error, record) {
						assert.ok(record);
						assert.ok(record.repos);
						record.repos.forEach(function (repo) {
							if (repo.name === usernamePersonal + '/' + repoSingleSuccess) {
								repo.configSHA = '931837a2e79e0f7c9e6ff288326c38dbac1bf021';
							}
						});
						mongo.save("git_accounts", record, function (error) {
							assert.ifError(error);
							var params = {
								qs: {
									"id": gitAccId,
									"provider": "github"
								},
								form: {
									owner: usernamePersonal,
									repo: repoSingleSuccess
								}
							};
							executeMyRequest(params, 'gitAccounts/repo/sync', 'post', function (body) {
								assert.ok(body.data);
								done();
							});
						});

					});

				});

				it("success - will sync multi repo - add", function (done) {
					mongo.findOne('git_accounts', {'owner': usernamePersonal}, function (error, record) {
						assert.ok(record);
						assert.ok(record.repos);
						record.repos.forEach(function (repo) {
							if (repo.name === usernamePersonal + '/' + repoMultiSuccess) {
								repo.configSHA.splice(0, 1);
							}
						});
						mongo.save("git_accounts", record, function (error) {
							assert.ifError(error);
							var params = {
								qs: {
									"id": gitAccId,
									"provider": "github"
								},
								form: {
									owner: usernamePersonal,
									repo: repoMultiSuccess
								}
							};
							executeMyRequest(params, 'gitAccounts/repo/sync', 'post', function (body) {
								assert.ok(body.data);
								done();
							});
						});

					});


				});

				it("fail - sync repo - remove", function (done) {
					mongo.findOne('git_accounts', {'owner': usernamePersonal}, function (error, record) {
						assert.ok(record);
						assert.ok(record.repos);
						record.repos.forEach(function (repo) {
							if (repo.name === usernamePersonal + '/' + repoMultiSuccess) {
								repo.configSHA = [];
								repo.configSHA[0] = {
									"contentType": "service",
									"contentName": "sampleFake11",
									"path": "/sampleFake11/config.js",
									"sha": "95b14565e3fdd0048e351493056025a7020ea561"
								};
							}
						});
						var host = {
							env: "dev",
							name: "sampleFake11",
							ip: "127.0.0.1",
							version: 1
						};
						mongo.insert("hosts", host, function (error) {
							mongo.save("git_accounts", record, function (error) {
								assert.ifError(error);
								var params = {
									qs: {
										"id": gitAccId,
										"provider": "github"
									},
									form: {
										owner: usernamePersonal,
										repo: repoMultiSuccess
									}
								};
								executeMyRequest(params, 'gitAccounts/repo/sync', 'post', function (body) {
									assert.deepEqual(body.errors.details[0], {"code": 768, "message": errorCodes[768]});
									done();
								});
							});
						});
					});
				});

				it("success - will sync repo - remove", function (done) {
					mongo.findOne('git_accounts', {'owner': usernamePersonal}, function (error, record) {
						assert.ok(record);
						assert.ok(record.repos);
						record.repos.forEach(function (repo) {
							if (repo.name === usernamePersonal + '/' + repoMultiSuccess) {
								repo.configSHA = [];
								repo.configSHA[0] = {
									"contentType": "service",
									"contentName": "sampleFake1",
									"path": "/sampleFake1/config.js",
									"sha": "95b14565e3fdd0048e351493056025a7020ea561"
								};

								repo.configSHA[1] = {
									"contentType": "daemon",
									"contentName": "sampleFake2",
									"path": "/sampleFake2/config.js",
									"sha": "15b14565e3fdd0048e351493056025a7020ea561"
								};

								repo.configSHA[repo.configSHA.length] = {
									"contentType": "static",
									"contentName": "sampleFake3",
									"path": "/sampleFake3/config.js",
									"sha": "15b14565e3fdd0048e351493056025a7020ea567"
								};
							}
						});
						mongo.save("git_accounts", record, function (error) {
							assert.ifError(error);
							var params = {
								qs: {
									"id": gitAccId,
									"provider": "github"
								},
								form: {
									owner: usernamePersonal,
									repo: repoMultiSuccess
								}
							};
							executeMyRequest(params, 'gitAccounts/repo/sync', 'post', function (body) {
								assert.ok(body.data);
								done();
							});
						});
					});
				});

				it("success - will sync multi repo - change", function (done) {

					mongo.findOne('git_accounts', {'owner': usernamePersonal}, function (error, record) {
						assert.ok(record);
						assert.ok(record.repos);
						record.repos.forEach(function (repo) {
							if (repo.name === usernamePersonal + '/' + repoMultiSuccess) {
								repo.configSHA.forEach(function (service) {
									service.sha = '6cbeae3ed88e9e3296e05fd52a48533ba53c0931';
								});
							}
						});
						mongo.save("git_accounts", record, function (error) {
							assert.ifError(error);
							var params = {
								qs: {
									"id": gitAccId,
									"provider": "github"
								},
								form: {
									owner: usernamePersonal,
									repo: repoMultiSuccess
								}
							};
							executeMyRequest(params, 'gitAccounts/repo/sync', 'post', function (body) {
								assert.ok(body.data);
								done();
							});
						});

					});

				});

				it("fail - out of sync repo", function (done) {
					var serviceName = 'sampleSuccessSingle';
					mongo.update("services", {'name': serviceName}, {
						"$set": {
							"port": 9000
						}
					}, function (error) {
						assert.ifError(error);

						mongo.findOne('git_accounts', {'owner': usernamePersonal}, function (error, record) {
							assert.ok(record);
							assert.ok(record.repos);
							record.repos.forEach(function (repo) {
								if (repo.name === usernamePersonal + '/' + repoSingleSuccess) {
									repo.configSHA = '911837a2e79e0f7c9e6ff288326c38dbac1bf021';
								}
							});
							mongo.save("git_accounts", record, function (error) {
								assert.ifError(error);
								var params = {
									qs: {
										"id": gitAccId,
										"provider": "github"
									},
									form: {
										owner: usernamePersonal,
										repo: repoSingleSuccess
									}
								};
								executeMyRequest(params, 'gitAccounts/repo/sync', 'post', function (body) {
									assert.ok(body.data);
									assert.equal(body.data.status, 'outOfSync');
									done();
								});
							});

						});

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
					executeMyRequest(params, 'gitAccounts/repo/deactivate', 'get', function (body) {
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
					executeMyRequest(params, 'gitAccounts/repo/deactivate', 'get', function (body) {
						assert.ok(body.data);
						done();
					});
				});

				it("success - will deactivate static repo", function (done) {
					var params = {
						qs: {
							"id": gitAccId,
							owner: usernamePersonal,
							repo: repoStaticContent
						}
					};
					executeMyRequest(params, 'gitAccounts/repo/deactivate', 'get', function (body) {
						assert.ok(body.data);
						done();
					});
				});

				it("success - will deactivate daemon repo", function (done) {
					var params = {
						qs: {
							"id": gitAccId,
							owner: usernamePersonal,
							repo: repoSingleDaemon
						}
					};
					executeMyRequest(params, 'gitAccounts/repo/deactivate', 'get', function (body) {
						assert.ok(body.data);
						done();
					});
				});

			});

		});

	});

	describe("github logout tests", function () {

		it("fail - logout - invalid id", function (done) {
			var params = {
				qs: {
					"username": usernamePersonal,
					"password": passwordPersonal,
					"id": '1332742364',
					"provider": "github"
				}
			};
			executeMyRequest(params, 'gitAccounts/logout', 'get', function (body) {
				assert.ok(body);
				assert.deepEqual(body.errors.details[0], {"code": 701, "message": errorCodes[701]});
				done();
			});
		});

		it("success - will logout personal private acc", function (done) {
			var params = {
				qs: {
					"username": usernamePersonal,
					"password": passwordPersonal,
					"id": gitAccId,
					"provider": "github"
				}
			};
			executeMyRequest(params, 'gitAccounts/logout', 'get', function (body) {
				assert.ok(body.data);
				done();
			});
		});

		it("fail - logout again personal acc", function (done) {
			var params = {
				qs: {
					"username": usernamePersonal,
					"password": passwordPersonal,
					"id": gitAccId,
					"provider": "github"
				}
			};
			executeMyRequest(params, 'gitAccounts/logout', 'get', function (body) {
				assert.ok(body);
				assert.deepEqual(body.errors.details[0], {"code": 753, "message": errorCodes[753]});
				done();
			});
		});

	});

	describe("personal public acc", function () {
		var gitAccId;

		describe("login", function () {

			it("fail - wrong personal public acc name", function (done) {
				var params = {
					form: {
						"username": 'xxx_vwq_xx_1gtGHYU_yt_plirf',
						"label": "Test wrong public Account",
						"provider": "github",
						"type": "personal",
						"access": "public"
					}
				};
				executeMyRequest(params, 'gitAccounts/login', 'post', function (body) {
					assert.deepEqual(body.errors.details[0], {"code": 767, "message": errorCodes[767]});
					done();
				});
			});

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
				executeMyRequest(params, 'gitAccounts/login', 'post', function (body) {
					assert.equal(body.result, true);
					mongo.findOne('git_accounts', {'owner': usernamePersonal}, function (error, record) {
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

				it("success - will activate single repo", function (done) {
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
					executeMyRequest(params, 'gitAccounts/repo/activate', 'post', function (body) {
						assert.ok(body.data);
						done();
					});
				});

				it("success - will activate multi repo", function (done) {
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
					executeMyRequest(params, 'gitAccounts/repo/activate', 'post', function (body) {
						assert.ok(body.data);
						done();
					});
				});

				it("fail - cant logout active acc", function (done) {
					var params = {
						qs: {
							"username": usernamePersonal,
							"password": passwordPersonal,
							"id": gitAccId,
							"provider": "github"
						}
					};
					executeMyRequest(params, 'gitAccounts/logout', 'get', function (body) {
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
							"id": gitAccId,
							"provider": "github"
						},
						form: {
							owner: usernamePersonal,
							repo: repoSingleSuccess
						}
					};
					executeMyRequest(params, 'gitAccounts/repo/sync', 'post', function (body) {
						assert.ok(body.data);
						done();
					});
				});

			});

			describe("repo deactivate tests", function () {

				it("fail - deactivate multi repo", function (done) {
					var host = {
						env: "dev",
						name: "sampleSuccess1",
						ip: "127.0.0.1",
						version: 1
					};
					mongo.insert("hosts", host, function (error) {
						var params = {
							qs: {
								"id": gitAccId,
								owner: usernamePersonal,
								repo: repoMultiSuccess
							}
						};
						executeMyRequest(params, 'gitAccounts/repo/deactivate', 'get', function (body) {
							assert.equal(body.errors.codes[0], 766);
							mongo.remove("hosts", {name: "sampleSuccess1"}, function (error) {
								done();
							});
						});
					});
				});

			});

		});
	});

	describe("organization public acc", function () {
		var orgName = 'soajs';
		var repoName = 'soajs.examples';

		describe("repo tests", function () {

			describe("repo activate and getRepos", function () {

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
					executeMyRequest(params, 'gitAccounts/repo/activate', 'post', function (body) {
						assert.ok(body.data);
						done();
					});
				});

				it("success - will getRepos again", function (done) {
					var params = {
						qs: {
							"id": soajsAccId,
							"page": 1,
							"per_page": 50,
							"provider": "github"
						}
					};
					executeMyRequest(params, 'gitAccounts/getRepos', 'get', function (body) {
						assert.ok(body.data);
						done();
					});
				});

			});

			describe("repo deactivate tests", function () {

				it("fail - cannot deactivate urac repo - running service", function (done) {
					var params = {
						qs: {
							"id": soajsAccId,
							owner: orgName,
							repo: 'soajs.urac'
						}
					};
					executeMyRequest(params, 'gitAccounts/repo/deactivate', 'get', function (body) {
						assert.deepEqual(body.errors.details[0], {"code": 766, "message": errorCodes[766]});
						done();
					});
				});

			});

		});

		describe("login & logout", function () {
			before(function (done) {
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
				executeMyRequest(params, 'gitAccounts/login', 'post', function (body) {
					assert.ok(body);
					assert.deepEqual(body.errors.details[0], {"code": 767, "message": errorCodes[767]});
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
				executeMyRequest(params, 'gitAccounts/login', 'post', function (body) {
					assert.ok(body.result);
					mongo.findOne('git_accounts', {'owner': orgName}, function (error, record) {
						assert.ifError(error);
						assert.ok(record);
						gitAccId = record._id.toString();
						done();
					});
				});
			});

			it("will logout org account", function (done) {
				var params = {
					qs: {
						"username": orgName,
						"id": gitAccId,
						"provider": "github"
					}
				};
				executeMyRequest(params, 'gitAccounts/logout', 'get', function (body) {
					assert.ok(body.data);
					done();
				});
			});

		});

	});

	describe("Test cb", function () {
		var soajsauth;
		var cbConfig = {
			"genericService": {
				"config": {
					"errors": {
						"400": "Database Error",
						"401": "Invalid Page Id Provided"
					},
					"schema": {
						"commonFields": {
							"id": {
								"source": [
									"query.id"
								],
								"validation": {
									"_type": "string"
								},
								"req": true
							},
							"title": {
								"source": [
									"body.title"
								],
								"validation": {
									"_type": "string"
								},
								"req": true
							},
							"content": {
								"source": [
									"body.content"
								],
								"validation": {
									"_type": "string"
								},
								"req": true
							}
						},
						"/list": {
							"_apiInfo": {
								"l": "List Entries",
								"group": "Pages",
								"groupMain": true
							}
						},
						"/add": {
							"_apiInfo": {
								"l": "Add Page",
								"group": "Pages"
							},
							"commonFields": [
								"title",
								"content"
							]
						},
						"/update": {
							"_apiInfo": {
								"l": "Update Page",
								"group": "Pages"
							},
							"commonFields": [
								"title",
								"content",
								"id"
							]
						},
						"/get": {
							"_apiInfo": {
								"l": "Get One Page",
								"group": "Pages"
							},
							"commonFields": [
								"id"
							]
						},
						"/delete": {
							"_apiInfo": {
								"l": "Delete Page",
								"group": "Pages"
							},
							"commonFields": [
								"id"
							]
						}
					},
					"serviceName": "gc_myservice",
					"servicePort": 4500,
					"requestTimeout": 30,
					"requestTimeoutRenewal": 5,
					"awareness": false,
					"extKeyRequired": true
				},
				"options": {
					"multitenant": true,
					"security": true,
					"session": true,
					"acl": true,
					"oauth": false
				}
			},
			"soajsService": {
				"db": {
					"config": {
						"DEV": {
							"gc_myservice": {
								"tenantSpecific": true,
								"cluster": "cluster1"
							}
						}
					},
					"multitenant": true,
					"collection": "data"
				},
				"apis": {
					"/list": {
						"method": "get",
						"mw": {
							"code": 400
						},
						"type": "list",
						"workflow": {}
					},
					"/add": {
						"method": "post",
						"mw": {
							"code": 400,
							"model": "add"
						},
						"type": "add",
						"workflow": {}
					},
					"/update": {
						"method": "post",
						"mw": {
							"code": 401,
							"model": "update"
						},
						"type": "update",
						"workflow": {}
					},
					"/get": {
						"method": "get",
						"mw": {
							"code": 401
						},
						"type": "get",
						"workflow": {}
					},
					"/delete": {
						"method": "get",
						"mw": {
							"code": 401
						},
						"type": "delete",
						"workflow": {}
					}
				}
			},
			"soajsUI": {
				"list": {
					"columns": [
						{
							"label": "Title",
							"name": "title",
							"field": "fields.title",
							"filter": []
						}
					],
					"defaultSortField": "title",
					"defaultSortASC": false
				},
				"form": {
					"add": [
						{
							"name": "title",
							"label": "Title",
							"placeholder": "My Page ...",
							"tooltip": "Enter the title of the page",
							"_type": "text",
							"req": true
						},
						{
							"name": "content",
							"label": "Content",
							"placeholder": "",
							"tooltip": "",
							"_type": "editor",
							"req": true
						}
					],
					"update": [
						{
							"name": "content",
							"label": "Content",
							"placeholder": "",
							"tooltip": "",
							"_type": "editor",
							"req": true
						}
					]
				}
			}
		};

		before(function (done) {
			var options = {
				uri: 'http://localhost:4001/login',
				headers: {
					'Content-Type': 'application/json',
					key: extKey
				},
				body: {
					"username": "user1",
					"password": "123456"
				},
				json: true
			};
			request.post(options, function (error, response, body) {
				assert.ifError(error);
				assert.ok(body);
				soajsauth = body.soajsauth;
				mongo.remove('gc', {}, function (error) {
					assert.ifError(error);
					mongo.remove('gc_versioning', {}, function (error) {
						assert.ifError(error);
						mongo.remove('services', {'name': 'gc_myservice'}, function (error) {
							assert.ifError(error);
							done();
						});
					});
				});
			});
		});

		it("fail - add content builder", function (done) {
			var params = {
				headers: {
					'soajsauth': soajsauth
				},
				form: {
					'name': 'gc_myservice',
					'config': cbConfig
				}
			};
			executeMyRequest(params, 'cb/add', 'post', function (body) {
				assert.equal(body.errors.codes[0], 757);
				done();
			});
		});
	});

});
