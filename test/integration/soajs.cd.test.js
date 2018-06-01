"use strict";
var assert = require('assert');
var request = require("request");
var shell = require("shelljs");
var helper = require("../helper.js");

var Mongo = require("soajs.core.modules").mongo;
var dbConfig = require("./db.config.test.js");
var dashboardConfig = dbConfig();
dashboardConfig.name = "core_provision";
var mongo = new Mongo(dashboardConfig);

var extKey = 'aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac';
var access_token;

function executeMyRequest (params, apiPath, method, cb) {
	requester(apiPath, method, params, function (error, body) {
		assert.ifError(error);
		assert.ok(body);
		return cb(body);
	});

	function requester (apiName, method, params, cb) {
		var options = {
			uri: 'http://localhost:4000/dashboard/' + apiName,
			headers: {
				key: extKey
			},
			json: true
		};

		if (params.headers) {
			for (var h in params.headers) {
				if (params.headers.hasOwnProperty(h)) {
					options.headers[ h ] = params.headers[ h ];
				}
			}
		}

		if (params.timeout) {
			options.timeout = params.timeout;
		}

		if (params.form) {
			options.body = params.form;
		}

		if (params.qs) {
			options.qs = params.qs;
		}

		if (params.formData) {
			options.formData = params.formData;
		}
		request[ method ](options, function (error, response, body) {
			//maintenance tests have a timeout set to avoid travis errors
			//if timeout is exceeded, return cb() without checking for error since this is expected behavior
			if (error && error.code && error.code === 'ESOCKETTIMEDOUT') {
				return cb(null, 'ESOCKETTIMEDOUT');
			}

			assert.ifError(error);
			assert.ok(body);
			return cb(null, body);
		});
	}
}

function getServices (env, cb) {
	var params = {
		qs: {
			access_token: access_token,
			env: env
		}
	};
	executeMyRequest(params, "cloud/services/list", "get", function (body) {
		assert.ifError(body.errors);
		var services = body.data;
		return cb(services);
	});
}

function deleteService (options, cb) {
	var params = {
		"qs": {
			access_token: access_token,
			env: options.env,
			serviceId: options.id,
			mode: options.mode
		}
	};
	return executeMyRequest(params, "cloud/services/delete", 'delete', cb);
}

describe("testing hosts deployment", function () {
	var soajsauth, recipesInfo;
	var Authorization;

	before(function (done) {
		process.env.SOAJS_ENV_WORKDIR = process.env.APP_DIR_FOR_CODE_COVERAGE;
		console.log("***************************************************************");
		console.log("* Setting CD functionality");
		console.log("***************************************************************");

		var options1 = {
			uri: 'http://localhost:4000/oauth/authorization',
			headers: {
				'Content-Type': 'application/json',
				'key': extKey
			},
			json: true
		};

		request.get(options1, function (error, response, body) {
			assert.ifError(error);
			assert.ok(body);
			Authorization = body.data;

			var options = {
				uri: 'http://localhost:4000/oauth/token',
				headers: {
					'Content-Type': 'application/json',
					key: extKey,
					Authorization: Authorization
				},
				body: {
					"username": "user1",
					"password": "123456",
					"grant_type": "password"
				},
				json: true
			};
			request.post(options, function (error, response, body) {
				assert.ifError(error);
				assert.ok(body);
				access_token = body.access_token;

				var validDeployerRecord = {
					"type": "container",
					"selected": "container.docker.local",
					"container": {
						"docker": {
							"local": {},
							"remote": {}
						}
					}
				};
				mongo.remove("ledger", {}, function(error){
					assert.ifError(error);
					mongo.update("environment", {}, {
						"$set": {
							"deployer": validDeployerRecord,
							"profile": __dirname + "/../profiles/profile.js"
						}
					}, { multi: true }, function (error) {
						assert.ifError(error);
						done();
					});
				});
			});
		});

	});

	before("Perform cleanup of any previous services deployed", function (done) {
		console.log('Deleting previous deployments ...');
		shell.exec('docker service rm $(docker service ls -q) && docker rm -f $(docker ps -qa)');
		setTimeout(function(){
			done();
		}, 1500);
	});

	before('create dashboard environment record', function (done) {
		var dashEnv = {
			"code": "DASHBOARD",
			"domain": "soajs.org",
			"locked": true,
			"port": 80,
			"profile": "/opt/soajs/FILES/profiles/profile.js",
			"deployer": {
				"type": "container",
				"selected": "container.docker.local",
				"container": {
					"docker": {
						"local": {},
						"remote": {}
					}
				}
			},
			"description": "this is the Dashboard environment",
			"dbs": {
				"clusters": {
					"dash_cluster": {
						"servers": [
							{
								"host": "127.0.0.1",
								"port": 27017
							}
						],
						"credentials": null,
						"URLParam": {
							"connectTimeoutMS": 0,
							"socketTimeoutMS": 0,
							"maxPoolSize": 5,
							"wtimeoutMS": 0,
							"slaveOk": true
						},
						"extraParam": {
							"db": {
								"native_parser": true
							},
							"server": {
								"auto_reconnect": true
							}
						}
					}
				},
				"config": {
					"prefix": "",
					"session": {
						"cluster": "dash_cluster",
						"name": "core_session",
						"store": {},
						"collection": "sessions",
						"stringify": false,
						"expireAfter": 1209600000
					}
				},
				"databases": {
					"urac": {
						"cluster": "dash_cluster",
						"tenantSpecific": true
					}
				}
			},
			"services": {
				"controller": {
					"maxPoolSize": 100,
					"authorization": true,
					"requestTimeout": 30,
					"requestTimeoutRenewal": 0
				},
				"config": {
					"awareness": {
						"healthCheckInterval": 5000,
						"autoRelaodRegistry": 3600000,
						"maxLogCount": 5,
						"autoRegisterService": true
					},
					"agent": {
						"topologyDir": "/opt/soajs/"
					},
					"key": {
						"algorithm": "aes256",
						"password": "soajs key lal massa"
					},
					"logger": {
						"level": "fatal",
						"formatter": {
							"outputMode": "short"
						}
					},
					"cors": {
						"enabled": true,
						"origin": "*",
						"credentials": "true",
						"methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
						"headers": "key,soajsauth,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type",
						"maxage": 1728000
					},
					"oauth": {
						"grants": [
							"password",
							"refresh_token"
						],
						"debug": false
					},
					"ports": {
						"controller": 4000,
						"maintenanceInc": 1000,
						"randomInc": 100
					},
					"cookie": {
						"secret": "this is a secret sentence"
					},
					"session": {
						"name": "soajsID",
						"secret": "this is antoine hage app server",
						"cookie": {
							"path": "/",
							"httpOnly": true,
							"secure": false,
							"maxAge": null
						},
						"resave": false,
						"saveUninitialized": false,
						"rolling": false,
						"unset": "keep"
					}
				}
			}
		};
		var updateField = {
			"$set": dashEnv
		};
		mongo.update("environment", {"code": "DASHBOARD"}, updateField, {
			"upsert": true,
			"multi": false
		}, function (error) {
			assert.ifError(error);
			done();
		});
	});

	after(function (done) {
		mongo.closeDb();
		console.log('Deleting deployments and cleaning up...');
		shell.exec('docker service rm $(docker service ls -q) && docker rm -f $(docker ps -qa)');
		setTimeout(function(){
			done();
		}, 1500);
	});

	describe("testing service deployment", function () {

		function mimicCall(token, version, cb){
			var options = {
				qs: {
					deploy_token: token
				},
				form: {
					owner: 'soajs',
					repo: 'soajs.controller',
					branch: 'master',
					commit: '1fea60a6d26efd7fcbaeeb95d52fc651d6c3eba5',
					ciProvider: 'travis',
					services: [{serviceName: 'controller'}]
				}
			};

			if(version){
				options.form.services[0].serviceVersion = version;
			}

			executeMyRequest(options, "cd/deploy", "post", function (body) {
				cb(body);
			});
		}

		function configureCD(config, cb){
			var options = {
				qs: {
					access_token: access_token
				},
				form: {
					"config": config
				}
			};

			executeMyRequest(options, "cd/", "post", function (body) {
				return cb(body);
			});
		}

		it("update catalog recipe", function(done){
			var recipes = [
				{
					"name": "soajsCatalog",
					"type": "service",
					"subtype": "soajs",
					"description": "This is a test catalog for deploying service instances",
					"recipe": {
						"deployOptions": {
							"image": {
								"prefix": "soajsorg",
								"name": "soajs",
								"tag": "latest"
							}
						},
						"buildOptions": {
							"settings": {
								"accelerateDeployment": true
							},
							"env": {
								"NODE_ENV": {
									"type": "static",
									"value": "production"
								},
								"SOAJS_ENV": {
									"type": "computed",
									"value": "$SOAJS_ENV"
								},
								"SOAJS_PROFILE": {
									"type": "static",
									"value": "/opt/soajs/FILES/profiles/profile.js"
								},
								"SOAJS_SRV_AUTOREGISTERHOST": {
									"type": "static",
									"value": "true"
								},
								"SOAJS_SRV_MEMORY": {
									"type": "computed",
									"value": "$SOAJS_SRV_MEMORY"
								},
								"SOAJS_GC_NAME": {
									"type": "computed",
									"value": "$SOAJS_GC_NAME"
								},
								"SOAJS_GC_VERSION": {
									"type": "computed",
									"value": "$SOAJS_GC_VERSION"
								},
								"SOAJS_GIT_OWNER": {
									"type": "computed",
									"value": "$SOAJS_GIT_OWNER"
								},
								"SOAJS_GIT_BRANCH": {
									"type": "computed",
									"value": "$SOAJS_GIT_BRANCH"
								},
								"SOAJS_GIT_COMMIT": {
									"type": "computed",
									"value": "$SOAJS_GIT_COMMIT"
								},
								"SOAJS_GIT_REPO": {
									"type": "computed",
									"value": "$SOAJS_GIT_REPO"
								},
								"SOAJS_GIT_TOKEN": {
									"type": "computed",
									"value": "$SOAJS_GIT_TOKEN"
								},
								"SOAJS_DEPLOY_HA": {
									"type": "computed",
									"value": "$SOAJS_DEPLOY_HA"
								},
								"SOAJS_HA_NAME": {
									"type": "computed",
									"value": "$SOAJS_HA_NAME"
								},
								"SOAJS_MONGO_NB": {
									"type": "computed",
									"value": "$SOAJS_MONGO_NB"
								},
								"SOAJS_MONGO_PREFIX": {
									"type": "computed",
									"value": "$SOAJS_MONGO_PREFIX"
								},
								"SOAJS_MONGO_RSNAME": {
									"type": "computed",
									"value": "$SOAJS_MONGO_RSNAME"
								},
								"SOAJS_MONGO_AUTH_DB": {
									"type": "computed",
									"value": "$SOAJS_MONGO_AUTH_DB"
								},
								"SOAJS_MONGO_SSL": {
									"type": "computed",
									"value": "$SOAJS_MONGO_SSL"
								},
								"SOAJS_MONGO_IP": {
									"type": "computed",
									"value": "$SOAJS_MONGO_IP_N"
								},
								"SOAJS_MONGO_PORT": {
									"type": "computed",
									"value": "$SOAJS_MONGO_PORT_N"
								}
							},
							"cmd": {
								"deploy": {
									"command": [
										"bash",
										"-c"
									],
									"args": [
										"node helper.js -T service"
									]
								}
							}
						}
					},
					v:1,
					ts: new Date().getTime()
				},
				{
					"name": "soajsCatalog2",
					"type": "server",
					"subtype": "nginx",
					"description": "This is a test catalog for deploying service instances",
					"recipe": {
						"deployOptions": {
							"image": {
								"prefix": "soajsorg",
								"name": "nginx",
								"tag": "1.0.x"
							},
							"ports": [
								{
									"name": "http",
									"target": 80,
									"isPublished": true,
									"published": 81
								},
								{
									"name": "https",
									"target": 443,
									"isPublished": true,
									"published": 444
								}
							]
						},
						"buildOptions": {
							"settings": {
								"accelerateDeployment": true
							},
							"env": {
								"SOAJS_ENV": {
									"type": "computed",
									"value": "$SOAJS_ENV"
								},
								"SOAJS_NX_DOMAIN": {
									"type": "computed",
									"value": "$SOAJS_NX_DOMAIN"
								},
								"SOAJS_NX_API_DOMAIN": {
									"type": "computed",
									"value": "$SOAJS_NX_API_DOMAIN"
								},
								"SOAJS_NX_SITE_DOMAIN": {
									"type": "computed",
									"value": "$SOAJS_NX_SITE_DOMAIN"
								},

								"SOAJS_NX_CONTROLLER_NB": {
									"type": "computed",
									"value": "$SOAJS_NX_CONTROLLER_NB"
								},
								"SOAJS_NX_CONTROLLER_IP": {
									"type": "computed",
									"value": "$SOAJS_NX_CONTROLLER_IP_N"
								},
								"SOAJS_NX_CONTROLLER_PORT": {
									"type": "computed",
									"value": "$SOAJS_NX_CONTROLLER_PORT"
								},

								"SOAJS_DEPLOY_HA": {
									"type": "computed",
									"value": "$SOAJS_DEPLOY_HA"
								},
								"SOAJS_HA_NAME": {
									"type": "computed",
									"value": "$SOAJS_HA_NAME"
								}

							},
							"cmd": {
								"deploy": {
									"command": [
										"bash",
										"-c"
									],
									"args": [
										"node helper.js -T nginx"
									]
								}
							}
						}
					},
					v:1,
					ts: new Date().getTime()
				},
				{
					"name": "soajsCatalog3",
					"type": "service",
					"subtype": "soajs",
					"description": "This is a test catalog for deploying service instances",
					"recipe": {
						"deployOptions": {
							"image": {
								"prefix": "soajsorg",
								"name": "soajs",
								"tag": "1.0.x-1.0.x"
							}
						},
						"buildOptions": {
							"settings": {
								"accelerateDeployment": true
							},
							"env": {
								"NODE_ENV": {
									"type": "static",
									"value": "production"
								},
								"SOAJS_ENV": {
									"type": "computed",
									"value": "$SOAJS_ENV"
								},
								"SOAJS_PROFILE": {
									"type": "static",
									"value": "/opt/soajs/FILES/profiles/profile.js"
								},
								"SOAJS_SRV_AUTOREGISTERHOST": {
									"type": "static",
									"value": "true"
								},
								"SOAJS_SRV_MEMORY": {
									"type": "computed",
									"value": "$SOAJS_SRV_MEMORY"
								},
								"SOAJS_GC_NAME": {
									"type": "computed",
									"value": "$SOAJS_GC_NAME"
								},
								"SOAJS_GC_VERSION": {
									"type": "computed",
									"value": "$SOAJS_GC_VERSION"
								},
								"SOAJS_GIT_OWNER": {
									"type": "computed",
									"value": "$SOAJS_GIT_OWNER"
								},
								"SOAJS_GIT_BRANCH": {
									"type": "computed",
									"value": "$SOAJS_GIT_BRANCH"
								},
								"SOAJS_GIT_COMMIT": {
									"type": "computed",
									"value": "$SOAJS_GIT_COMMIT"
								},
								"SOAJS_GIT_REPO": {
									"type": "computed",
									"value": "$SOAJS_GIT_REPO"
								},
								"SOAJS_GIT_TOKEN": {
									"type": "computed",
									"value": "$SOAJS_GIT_TOKEN"
								},
								"SOAJS_DEPLOY_HA": {
									"type": "computed",
									"value": "$SOAJS_DEPLOY_HA"
								},
								"SOAJS_HA_NAME": {
									"type": "computed",
									"value": "$SOAJS_HA_NAME"
								},
								"SOAJS_MONGO_NB": {
									"type": "computed",
									"value": "$SOAJS_MONGO_NB"
								},
								"SOAJS_MONGO_PREFIX": {
									"type": "computed",
									"value": "$SOAJS_MONGO_PREFIX"
								},
								"SOAJS_MONGO_RSNAME": {
									"type": "computed",
									"value": "$SOAJS_MONGO_RSNAME"
								},
								"SOAJS_MONGO_AUTH_DB": {
									"type": "computed",
									"value": "$SOAJS_MONGO_AUTH_DB"
								},
								"SOAJS_MONGO_SSL": {
									"type": "computed",
									"value": "$SOAJS_MONGO_SSL"
								},
								"SOAJS_MONGO_IP": {
									"type": "computed",
									"value": "$SOAJS_MONGO_IP_N"
								},
								"SOAJS_MONGO_PORT": {
									"type": "computed",
									"value": "$SOAJS_MONGO_PORT_N"
								}
							},
							"cmd": {
								"deploy": {
									"command": [
										"bash",
										"-c"
									],
									"args": [
										"node helper.js -T service"
									]
								}
							}
						}
					},
					v:1,
					ts: new Date().getTime()
				}
			];
			mongo.insert('catalogs', recipes, function(error, response){
				assert.ifError(error);
				recipesInfo = response;
				done();
			});
		});

		it("success - deploy 1 service using catalog 1", function (done) {
			var params = {
				qs: {
					access_token: access_token
				},
				"form": {
					env: 'stg',
					custom: {
						type: 'service',
						name: 'controller'
					},
					recipe: recipesInfo[0]._id.toString(),
					gitSource: {
						owner: 'soajs',
						repo: 'soajs.controller',
						branch: 'master',
						commit: '67a61db0955803cddf94672b0192be28f47cf280'
					},
					deployConfig: {
						memoryLimit: 209715200,
						replication: {
							mode: 'replicated',
							replicas: 1
						}
					},
					infraId : '5af57221c32d1309b7d43ab6'
				}
			};
			executeMyRequest(params, "cloud/services/soajs/deploy", "post", function (body) {
				
				assert.ok(body.result);
				assert.ok(body.data);
				setTimeout(function(){
					done();
				}, 1000);
			});
		});

		it.skip("success - deploy 1 service using catalog2", function (done) {
			var params = {
				qs: {
					access_token: access_token
				},
				"form": {
					env: 'stg',
					custom: {
						type: 'nginx',
						name: 'nginx'
					},
					recipe: recipesInfo[1]._id.toString(),
					deployConfig: {
						memoryLimit: 209715200,
						replication: {
							mode: 'replicated',
							replicas: 1
						}
					}
				}
			};
			executeMyRequest(params, "cloud/services/soajs/deploy", "post", function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				setTimeout(function(){
					done();
				}, 700);
			});
		});

		it.skip("success - deploy 1 service using catalog3", function (done) {
			var params = {
				qs: {
					access_token: access_token
				},
				"form": {
					env: 'stg',
					custom: {
						type: 'service',
						name: 'urac',
					},
					recipe: recipesInfo[2]._id.toString(),
					gitSource: {
						owner: 'soajs',
						repo: 'soajs.urac',
						branch: 'develop',
						commit: '4470c1cd2bc2aef867ffecf26c02602df19e1f3a'
					},
					deployConfig: {
						memoryLimit: 209715200,
						replication: {
							mode: 'replicated',
							replicas: 1
						}
					}
				}
			};
			executeMyRequest(params, "cloud/services/soajs/deploy", "post", function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				done();
			});
		});

		it.skip("mimic call to cd/deploy, nothing should happen", function(done){
			mimicCall("myGitToken", null, function(body){
				assert.equal(body.result, true);
				assert.ok(body.data);
				done();
			});
		});

		it.skip("fail - mimic call for cd/deploy of controller in dev", function(done){
			mimicCall("invalid", null, function(body){
				assert.equal(body.result, false);
				assert.ok(body.errors);
				done();
			});
		});

		it.skip("mimic call for cd/deploy of controller in dev", function(done){
			mimicCall("myGitToken", null, function(body){
				assert.equal(body.result, true);
				assert.ok(body.data);
				done();
			});
		});

		it("configure cd again with specific entry for controller", function(done){
			configureCD({
				"env": "STG",
				"serviceName": "controller",
				"default": {
					"branch": "master",
					"strategy": "notify"
				}
			}, function(body){
				assert.ok(body.result);
				assert.ok(body.data);
				done();
			});
		});

		it.skip("mimic call for cd/deploy of controller in dev again", function(done){
			mimicCall("myGitToken", null, function(body){
				assert.equal(body.result, true);
				assert.ok(body.data);
				done();
			});
		});

		it("configure cd again with specific version for controller", function(done){
			configureCD({
				"env": "STG",
				"serviceName": "controller",
				"version": {
					"v": "v1",
					"branch": "master",
					"strategy": "notify"
				}
			}, function(body){
				assert.ok(body.result);
				assert.ok(body.data);
				done();
			});
		});

		it.skip("mimic call for cd/deploy of controller in dev again", function(done){
			mimicCall("myGitToken", 1, function(body){
				assert.equal(body.result, true);
				assert.ok(body.data);
				done();
			});
		});

		it("get ledger", function(done){
			var options = {
				qs: {
					deploy_token: access_token,
					env: 'stg'
				}
			};

			executeMyRequest(options, "cd/ledger", "get", function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				done();
				// var list = body.data;
				// if(Array.isArray(list) && list.length === 0){
				// 	done();
				// }
				// else{
				// 	var options = {
				// 		qs: {
				// 			deploy_token: access_token
				// 		},
				// 		form: {
				// 			data: {
				// 				id: list[0]._id
				// 			}
				// 		}
				// 	};
				//
				// 	executeMyRequest(options, "cd/ledger/read", "put", function (body) {
				// 		assert.ok(body.result);
				// 		assert.ok(body.data);
				// 		done();
				// 	});
				// }
			});
		});

		it("mark all ledger entries as read", function(done){
			var options = {
				qs: {
					deploy_token: access_token
				},
				form: {
					data: {
						all: true
					}
				}
			};

			executeMyRequest(options, "cd/ledger/read", "put", function (body) {
				assert.ok(body.result);
				done();
			});
		});

		it("trigger catalog update", function(done){
			mongo.update('catalogs', {'name': "soajsCatalog"}, {$set:{v: 2, ts: new Date().getTime()}}, function(error){
				assert.ifError(error);
				done();
			});
		});

		it.skip("get updates", function(done){
			var options = {
				qs: {
					deploy_token: access_token,
					env: 'stg'
				}
			};

			executeMyRequest(options, "cd/updates", "get", function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				done();
			});
		});

		it("configure cd for automatic controller update", function(done){
			configureCD({
				"env": "STG",
				"serviceName": "controller",
				"version": {
					"v": "v2",
					"branch": "master",
					"strategy": "update"
				}
			}, function(body){
				assert.ok(body.result);
				assert.ok(body.data);
				done();
			});
		});

		it.skip("mimic call for cd/deploy of controller in dev again", function(done){
			mimicCall("myGitToken", 1, function(body){
				assert.equal(body.result, true);
				assert.ok(body.data);
				done();
			});
		});

		//todo: need to trigger get action api, redeploy and rebuild
		it.skip("calling take action on redeploy", function(done){
			var options = {
				qs: {
					deploy_token: access_token,
					env: 'stg'
				}
			};

			executeMyRequest(options, "cd/ledger", "get", function (body) {
				assert.ok(body.result);
				assert.ok(body.data);

				var list = body.data;
				var oneUpdate;
				for(var i =0; i < list.length; i++){
					if(list[i].notify && !list[i].manual){
						oneUpdate = list[i];
						break;
					}
				}

				var options = {
					// qs: {
					// 	deploy_token: access_token
					// },
					// form:{
					// 	data:{
					// 		id: oneUpdate._id.toString()
					// 	}
					// }
					form: {
						env: 'dev',
						data: {
							id: oneUpdate._id.toString(),
							action: 'update'
						}
					}
				};
				executeMyRequest(options, "cd/action", "put", function (body) {
					done();
				});
			});
		});

		it.skip("calling take action on rebuild", function(done){
			getServices('stg', function(list){
				var lastEntry = list[list.length -1];
				var options = {
					qs: {
						deploy_token: access_token
					},
					form:{
						data:{
							"env": 'stg',
							"action": 'rebuild',
							"mode": lastEntry.labels['soajs.service.mode'],
							"serviceId": lastEntry.id,
							"serviceName": lastEntry.name,
							"serviceVersion": 1
						}
					}
				};

				executeMyRequest(options, "cd/action", "put", function (body) {
					done();
				});
			});
		});

		it("get CD", function (done) {
			executeMyRequest({}, "cd", "get", function (body) {
				assert.ok(body);
				done();
			});
		});

		it("pause CD", function (done) {
			var params = {
				form: {
					"config": {
						"env": "STG",
						"pause": true
					}
				}
			};

			executeMyRequest(params, "cd/pause", "post", function (body) {
				assert.ok(body);
				done();
			});
		});
	});
});
