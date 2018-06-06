"use strict";

const assert = require('assert');
var request = require("request");

var helper = require("../helper.js");
var utils = require("soajs.core.libs").utils;

var config = helper.requireModule('./config');
var errors = config.errors;

var Mongo = require("soajs.core.modules").mongo;
var dbConfig = require("./db.config.test.js");

var dashboardConfig = dbConfig();
dashboardConfig.name = "core_provision";
var mongo = new Mongo(dashboardConfig);

const extKey_owner = '9b96ba56ce934ded56c3f21ac9bdaddc8ba4782b7753cf07576bfabcace8632eba1749ff1187239ef1f56dd74377aa1e5d0a1113de2ed18368af4b808ad245bc7da986e101caddb7b75992b14d6a866db884ea8aee5ab02786886ecf9f25e974';
const extKey_user1 = 'aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac';

var params = {}, access_token_owner = '', access_token_user1 = '';
var sampleResourceCopy = {}, sampleResourceCopyId = '';
var sampleResource = {
    "name" : "cluster1",
    "type" : "cluster",
    "category" : "mongo",
    "locked" : true,
    "plugged" : true,
    "shared" : true,
    "config" : {
        "servers" : [
            {
                "host" : "127.0.0.1",
                "port" : 27017
            }
        ],
        "credentials" : {

        },
        "URLParam" : {
            "connectTimeoutMS" : 0,
            "socketTimeoutMS" : 0,
            "maxPoolSize" : 5,
            "wtimeoutMS" : 0,
            "slaveOk" : true
        },
        "extraParam" : {
            "db" : {
                "native_parser" : true,
                "bufferMaxEntries" : 0
            },
            "server" : {

            }
        },
        "streaming" : {

        }
    }
};
var sampleResource2 = {
	"name" : "example",
	"type" : "cluster",
	"category" : "mongo",
	"locked" : false,
	"plugged" : false,
	"shared" : false,
	"config" : {
		"servers" : [
			{
				"host" : "127.0.0.1",
				"port" : 27017
			}
		],
		"credentials" : {
			
		},
		"URLParam" : {
			"connectTimeoutMS" : 0,
			"socketTimeoutMS" : 0,
			"maxPoolSize" : 5,
			"wtimeoutMS" : 0,
			"slaveOk" : true
		},
		"extraParam" : {
			"db" : {
				"native_parser" : true,
				"bufferMaxEntries" : 0
			},
			"server" : {
				
			}
		},
		"streaming" : {
			
		}
	}
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
                key: extKey_owner
            },
            json: true
        };

        if(params.qs && params.qs.access_token) {
            if(params.qs.access_token === access_token_user1) {
                options.headers.key = extKey_user1;
            }
        }

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

describe("Testing Resources Functionality", function() {

    before("Login", function(done) {
        var authOptions = {
            uri: 'http://localhost:4000/oauth/authorization',
            headers: {
                'Content-Type': 'application/json',
                'key': extKey_owner
            },
            json: true
        };

        var tokenOptions = {
            uri: 'http://localhost:4000/oauth/token',
            headers: {
                'Content-Type': 'application/json',
                'key': extKey_owner,
                'Authorization': ''
            },
            body: {
                "username": "owner",
                "password": "123456",
                "grant_type": "password"
            },
            json: true
        };

        login(authOptions, tokenOptions, function(error, tokenInfo) {
            access_token_owner = tokenInfo.access_token;

            authOptions.headers.key = extKey_user1;
            tokenOptions.headers.key = extKey_user1;
            tokenOptions.body.username = 'user1';
            login(authOptions, tokenOptions, function(error, tokenInfo) {
                access_token_user1 = tokenInfo.access_token;

                done();
            });
        });

        function login(authOptions, tokenOptions, cb) {
            request.get(authOptions, function (error, response, body) {
                assert.ifError(error);
                assert.ok(body);
                tokenOptions.headers.Authorization = body.data;

                request.post(tokenOptions, function (error, response, body) {
                    assert.ifError(error);
                    assert.ok(body);
                    assert.ok(body.access_token);

                    return cb(null, body);
                });
            });
        }
    });

    before("Cleanup", function(done) {
        mongo.remove('resources', {}, function(error) {
            assert.ifError(error);

            mongo.remove('cicd', { type: 'resource' }, function(error) {
                assert.ifError(error);

                done();
            });
        });
    });

    describe("Testing add resource", function() {

        before('Clone sample resource record', function(done) {
            sampleResourceCopy = utils.cloneObj(sampleResource);
            done();
        });

        it("success - will add resource cluster1 by owner", function(done) {
            params = {
                qs: {
                    access_token: access_token_owner
                },
                form: {
                    env: 'dev',
                    resource: sampleResourceCopy,
	                deployType : "save"
                }
            };

            executeMyRequest(params, 'resources/new', 'post', function(body) {
                assert.ok(body.result);
                assert.ok(body.data);
                assert.ok(body.data.id);
                done();
            });
        });

        it("fail - resource with the same name/type/category already exists", function(done) {
            params = {
                qs: {
                    access_token: access_token_owner
                },
                form: {
                    env: 'dev',
                    resource: sampleResourceCopy,
	                deployType : "save"
                }
            };

            executeMyRequest(params, 'resources/new', 'post', function(body) {
                assert.ok(body.errors);
                assert.deepEqual(body.errors.details[0], { code: 504, message: errors[504] });
                done();
            });
        });

        it("success - will add resource cluster2 by user1", function(done) {
            sampleResourceCopy.name = 'cluster2';
            sampleResourceCopy.shared = false;

            params = {
                qs: {
                    access_token: access_token_user1
                },
                form: {
                    env: 'dev',
                    resource: sampleResourceCopy,
	                deployType : "save"
                }
            };

            executeMyRequest(params, 'resources/new', 'post', function(body) {
                assert.ok(body.result);
                assert.ok(body.data);
                assert.ok(body.data.id);
                done();
            });
        });

        it.skip("fail - adding resource record with additional parameters", function(done) { // additional properties currently turned off, for vm
            sampleResourceCopy.invalidInput = { test: true };

            params = {
                qs: {
                    access_token: access_token_owner
                },
                form: {
                    env: 'dev',
                    resource: sampleResourceCopy,
	                deployType : "save"
                }
            };

            executeMyRequest(params, 'resources/new', 'post', function(body) {
                assert.ok(body.errors);
                assert.deepEqual(body.errors.details[0], { code: 173, message: 'Validation failed for field: resource -> The parameter \'resource\' failed due to: instance additionalProperty \"invalidInput\" exists in instance when not allowed' });
                done();
            });
        });

    });
	
	describe("Testing add/edit resource, deploy and list deployed", function() {
		
		let sample2Id;
		
		before(function (done) {
			
			mongo.update('environment', {code: 'DEV'}, {
				'$set': {
					"deployer": {
						"manual": {
							"nodes": ""
						},
						"container": {
							"docker": {
								"local": {
									"socketPath": "/var/run/docker.sock"
								},
								"remote": {
									"apiPort": 443,
									"nodes": "127.0.0.1",
									"apiProtocol": "https",
									"auth": {
										"token": ""
									}
								}
							},
							"kubernetes": {
								"local": {
									"nodes": "",
									"namespace": {
										"default": "soajs",
										"perService": false
									},
									"auth": {
										"token": ""
									}
								},
								"remote": {
									"nodes": "",
									"namespace": {
										"default": "soajs",
										"perService": false
									},
									"auth": {
										"token": ""
									}
								}
							}
						},
						"type": "container",
						"selected": "container.docker.local"
					}
				}
			}, function (error) {
				assert.ifError(error);
				done();
			});
		});
		
		it("success - will add resource", function (done) {
			params = {
				qs: {
					access_token: access_token_owner
				},
				form: {
					env: 'dev',
					resource: sampleResource2,
					deployType: "saveAndDeploy",
					recipe : '59034e43c69a1b962fc62212', // nginxCatalog
					config: {
						deploy: true,
						options: {
							custom: {
								type : 'resource',
								name: sampleResource2.name,
								loadBalancer: true,
								"sourceCode": {}
							},
							recipe : '59034e43c69a1b962fc62212', // nginxCatalog
							deployConfig : {
								memoryLimit : 209715200,
								replication : {
									mode : 'global'
								}
							},
						}
					},
					custom: {
						type : 'resource',
						name: sampleResource2.name,
						loadBalancer: true,
						"sourceCode": {}
					}
				}
			};
			
			executeMyRequest(params, 'resources/new', 'post', function (body) {
				console.log(JSON.stringify(body, null, 2));
				assert.ok(body);
				assert.ok(body.data);
				assert.ok(body.data.id);
				
				sample2Id = body.data.id;
				
				done();
			});
		});
		
		it("success - will edit resource", function (done) {
			
			sampleResource2.locked = true;
			
			params = {
				qs: {
					access_token: access_token_owner
				},
				form: {
					env: 'dev',
					resource: sampleResource2,
					deployType: "saveAndDeploy",
					recipe : '59034e43c69a1b962fc62212', // nginxCatalog
					deployConfig : {
						memoryLimit : 209715200,
						replication : {
							mode : 'global'
						}
					},
					custom: {
						type : 'test'
					}
				}
			};
			
			executeMyRequest(params, 'resources/'+sample2Id, 'post', function (body) {
				assert.ok(body);
				done();
			});
		});
		
		it("success - will list deployed resources ", function(done) {
			params = {
				qs: {
					access_token: access_token_owner,
					env: 'dev',
					envType : 'container'
				}
			};
			
			executeMyRequest(params, 'resources', 'get', function(body) {
				assert.ok(body);
				console.log(JSON.stringify(body, null, 2));
				// assert.ok(body.data);
				// body.data.forEach(function(oneResource) {
				// 	if(oneResource.name === 'example'){
				// 		assert.ok(oneResource.isDeployed);
				// 	}
				// });
				done();
			});
		});
		
		it("success - will delete deployed resource", function(done) {
			params = {
				qs: {
					env: 'dev',
					id: sample2Id,
					access_token: access_token_owner
				}
			};
			
			executeMyRequest(params, 'resources', 'delete', function(body) {
				assert.ok(body);
				done();
			});
		});
		
	});
		
		describe("Testing get resource", function() {

        before("get cluster1 id from resources collection", function(done) {
            mongo.findOne('resources', { name: 'cluster1' }, function(error, resourceRecord) {
                assert.ifError(error);
                sampleResourceCopy = resourceRecord;
                sampleResourceCopyId = resourceRecord._id.toString();
                done();
            });
        });

        it("success - get cluster1 record by id", function(done) {
            params = {
                qs: {
                    access_token: access_token_owner,
                    env: 'dev',
                    id: sampleResourceCopyId
                }
            };

            executeMyRequest(params, 'resources/get', 'get', function(body) {
                assert.ok(body.result);
                assert.ok(body.data);
                assert.ok(body.data._id);
                assert.equal(body.data.name, 'cluster1');
                done();
            });
        });

        it("success - get cluster1 record by name", function(done) {
            params = {
                qs: {
                    access_token: access_token_owner,
                    env: 'dev',
                    name: 'cluster1'
                }
            };

            executeMyRequest(params, 'resources/get', 'get', function(body) {
                assert.ok(body.result);
                assert.ok(body.data);
                assert.ok(body.data._id);
                assert.equal(body.data.name, 'cluster1');
                done();
            });
        });

        it("fail - no id or name of resource provided", function(done) {
            params = {
                qs: {
                    access_token: access_token_owner,
                    env: 'dev'
                }
            };

            executeMyRequest(params, 'resources/get', 'get', function(body) {
                assert.ok(body.errors);
                assert.deepEqual(body.errors.details[0], { code: 502, message: errors[502] });
                done();
            });
        });

    });

    describe("Testing update resource", function() {

        before('Get sample resource record', function(done) {
            mongo.findOne('resources', { name: 'cluster1' }, function(error, resourceRecord) {
                assert.ifError(error);
                assert.ifError(!resourceRecord);
                sampleResourceCopy = resourceRecord;
                sampleResourceCopyId = resourceRecord._id.toString();
                delete sampleResourceCopy._id;
                delete sampleResourceCopy.created;
                delete sampleResourceCopy.author;
                done();
            });
        });

        it("success - will update resource", function(done) {
            params = {
                qs: {
                    access_token: access_token_owner,
                    env: 'dev',
                    id: sampleResourceCopyId
                },
                form: {
                    resource: sampleResourceCopy
                }
            };

            executeMyRequest(params, 'resources/update', 'put', function(body) {
                assert.ok(body.result);
                assert.ok(body.data);
                done();
            });
        });

        it("fail - trying to update resource in an environment different from the one it was created in", function(done) {
            params = {
                qs: {
                    access_token: access_token_owner,
                    env: 'dashboard',
                    id: sampleResourceCopyId
                },
                form: {
                    resource: sampleResourceCopy
                }
            };

            executeMyRequest(params, 'resources/update', 'put', function(body) {
                assert.ok(body.errors);
                assert.deepEqual(body.errors.details[0], { code: 505, message: errors[505] });
                done();
            });
        });

        it("fail - trying to update resource owned by owner as user1", function(done) {
            params = {
                qs: {
                    access_token: access_token_user1,
                    env: 'dev',
                    id: sampleResourceCopyId
                },
                form: {
                    resource: sampleResourceCopy
                }
            };

            executeMyRequest(params, 'resources/update', 'put', function(body) {
                assert.ok(body.errors);
                assert.deepEqual(body.errors.details[0], { code: 506, message: errors[506] });
                done();
            });
        });

    });

    describe("Testing list resources", function() {

        it("success - will list resources as owner, get permission set to true for cluster1 and cluster2", function(done) {
            params = {
                qs: {
                    access_token: access_token_owner,
                    env: 'dev',
	                envType : 'manual'
                }
            };

            executeMyRequest(params, 'resources', 'get', function(body) {
                assert.ok(body.result);
                assert.ok(body.data);
                assert.equal(body.data.length, 2);
                body.data.forEach(function(oneResource) {
                    assert.ok(oneResource.permission);
                });
                done();
            });
        });

        it("success - will list resources as user1, get permission set to true only for cluster2", function(done) {
            params = {
                qs: {
                    access_token: access_token_user1,
                    env: 'dev',
	                envType : 'manual'
                }
            };

            executeMyRequest(params, 'resources', 'get', function(body) {
                assert.ok(body.result);
                assert.ok(body.data);
                assert.equal(body.data.length, 2);
                body.data.forEach(function(oneResource) {
                    if(oneResource.name === 'cluster1') {
                        assert.equal(oneResource.permission, false);
                    }
                    else if (oneResource.name === 'cluster2') {
                        assert.ok(oneResource.permission);
                    }
                });
                done();
            });
        });

        it("success - will list resources in dashboard env as owner, get only get shared resources from dev env", function(done) {
            params = {
                qs: {
                    access_token: access_token_owner,
                    env: 'dashboard',
	                envType : 'manual'
                }
            };

            executeMyRequest(params, 'resources', 'get', function(body) {
                assert.ok(body.result);
                assert.ok(body.data);
                assert.equal(body.data.length, 1);
                assert.equal(body.data[0].created, 'DEV');
                assert.ok(body.data[0].shared);
                done();
            });
        });

        it("fail - missing required field", function(done) {
            params = {
                qs: {
                    access_token: access_token_owner,
	                envType : 'manual'
                }
            };

            executeMyRequest(params, 'resources', 'get', function(body) {
                assert.ok(body.errors);
                assert.deepEqual(body.errors.details[0], { code: 172, message: 'Missing required field: env' });
                done();
            });
        });

    });

    describe("Testing delete resource", function() {

        before("Add cluster3 to resources collection", function(done) {
            sampleResourceCopy = utils.cloneObj(sampleResource);
            sampleResourceCopy.name = 'cluster3';
            params = {
                qs: {
                    access_token: access_token_owner
                },
                form: {
                    env: 'dev',
                    resource: sampleResourceCopy,
	                deployType : "save"
                }
            };

            executeMyRequest(params, 'resources/new', 'post', function(body) {
                assert.ok(body.result);
                assert.ok(body.data);
                assert.ok(body.data.id);

                mongo.findOne('resources', { name: 'cluster3' }, function(error, resourceRecord) {
                    assert.ifError(error);
                    sampleResourceCopyId = resourceRecord._id.toString();
                    done();
                });
            });
        });

        it("fail - missing required params", function(done) {
            params = {
                qs: {
                    env: 'dev',
                    access_token: access_token_owner
                }
            };

            executeMyRequest(params, 'resources', 'delete', function(body) {
                assert.ok(body.errors);
                assert.deepEqual(body.errors.details[0], { code: 172, message: 'Missing required field: id' });
                done();
            });
        });

        it("fail - trying to delete resource in an environment different from the one it was created in", function(done) {
            params = {
                qs: {
                    env: 'dashboard',
                    id: sampleResourceCopyId,
                    access_token: access_token_owner
                }
            };

            executeMyRequest(params, 'resources', 'delete', function(body) {
                assert.ok(body.errors);
                assert.deepEqual(body.errors.details[0], { code: 505, message: errors[505] });
                done();
            });
        });

        it("fail - trying to delete as user1 a resource created by owner", function(done) {
            params = {
                qs: {
                    env: 'dev',
                    id: sampleResourceCopyId,
                    access_token: access_token_user1
                }
            };

            executeMyRequest(params, 'resources', 'delete', function(body) {
                assert.ok(body.errors);
                assert.deepEqual(body.errors.details[0], { code: 506, message: errors[506] });
                done();
            });
        });

        it("success - will delete resource cluster3 as owner", function(done) {
            params = {
                qs: {
                    env: 'dev',
                    id: sampleResourceCopyId,
                    access_token: access_token_owner
                }
            };

            executeMyRequest(params, 'resources', 'delete', function(body) {
                assert.ok(body.result);
                assert.ok(body.data);
                done();
            });
        });

    });

    describe("Testing upgrade resources", function() {

        it("success - will upgrade resources", function(done) {
            params = {
                qs: {
                    access_token: access_token_owner,
                    env: 'dev'
                }
            };

            executeMyRequest(params, 'resources/upgrade', 'get', function(body) {
                assert.ok(body.result);
                assert.ok(body.data);
                done()
            });
        });

    });

    describe("Testing get resources deploy config", function() {

        it("success - will get deploy configuration for resources", function(done) {
            params = {
                qs: {
                    access_token: access_token_owner
                }
            };

            executeMyRequest(params, 'resources/config', 'get', function(body) {
                assert.ok(body.result);
                assert.ok(body.data);
                done()
            });
        });

    });

    describe("Testing update resources deploy config", function() {

        it("success - will add deploy config for cluster1", function(done) {
            params = {
                qs: {
                    access_token: access_token_owner
                },
                form: {
                    env: 'dev',
                    resourceName: 'cluster1',
                    config: {
                        deploy: true,
                        options: {
                            recipe: '5aafcf3689111c3b2fd7518d',
                            deployConfig: {
                                replication: {
                                    mode: 'replicated',
                                    replicas: 1
                                }
                            },
                            custom: {
	                            "image" : {
		                            "name" : "nginx",
		                            "prefix" : "soajsorg",
		                            "tag" : "latest"
	                            },
	                            name: 'testserver',
                                type: 'resource',
	                            "sourceCode" : {
		                            "configuration" : {
			                            "repo" : "soajsTestAccount/custom-configuration",
			                            "branch" : "master",
			                            "owner" : "soajsTestAccount",
			                            "commit" : "e61063e026d4b904bf254b176d9f2c0034b62cbf"
		                            },
		                            "custom" : {
			                            "repo" : "soajsTestAccount/test.successMulti",
			                            "branch" : "master",
			                            "owner" : "soajsTestAccount",
			                            "path" : "/sample4/",
			                            "commit" : "d0f80dc4fe46d354035cb95b317feac69b83b876",
			                            "subName" : "sampletest4"
		                            }
	                            }
                            }
                        }
                    }
                }
            };

            executeMyRequest(params, 'resources/config/update', 'put', function(body) {
                assert.ok(body.result);
                assert.ok(body.data);
                done()
            });
        });

        it("fail - missing required params", function(done) {
            params = {
                qs: {
                    access_token: access_token_owner
                },
                form: {
                    env: 'dev',
                    resourceName: 'cluster1'
                }
            };

            executeMyRequest(params, 'resources/config/update', 'put', function(body) {
                assert.ok(body.errors);
                assert.deepEqual(body.errors.details[0], { code: 172, message: 'Missing required field: config' });
                done()
            });
        });

    });

    describe("Testing list/add/edit/delete for dash_cluster", function() {

        before("add dash_cluster to resources collection", function(done) {
            sampleResourceCopy = utils.cloneObj(sampleResource);
            sampleResourceCopy.name = 'dash_cluster';
            sampleResourceCopy.created = 'DEV';
            sampleResourceCopy.author = 'owner';

            mongo.insert('resources', sampleResourceCopy, function(error, record) {
                assert.ifError(error);
                sampleResourceCopyId = record[0]._id.toString();
                done();
            });
        });

        it("fail - trying to add a cluster resource of type mongo called dash_cluster", function(done) {
            sampleResourceCopy = utils.cloneObj(sampleResource);
            sampleResourceCopy.name = 'dash_cluster';

            params = {
                qs: {
                    access_token: access_token_owner
                },
                form: {
                    env: 'dev',
                    resource: sampleResourceCopy,
	                deployType : "save"
                }
            };

            executeMyRequest(params, 'resources/new', 'post', function(body) {
                assert.ok(body.errors);
                assert.deepEqual(body.errors.details[0], { code: 989, message: errors[989] });
                done();
            });
        });

        it('fail - trying to update/unplug dash_cluster', function (done) {
            sampleResourceCopy = utils.cloneObj(sampleResource);
            sampleResourceCopy.name = 'dash_cluster';
            sampleResourceCopy.plugged = false;

            params = {
                qs: {
                    access_token: access_token_owner,
                    env: 'dev',
                    id: sampleResourceCopyId
                },
                form: {
                    resource: sampleResourceCopy
                }
            };

            executeMyRequest(params, 'resources/update', 'put', function(body) {
                assert.ok(body.errors);
                assert.deepEqual(body.errors.details[0], { code: 989, message: errors[989] });
                done();
            });
        });

        it('success - trying to update driver configuration for dash_cluster', function (done) {
            sampleResourceCopy = utils.cloneObj(sampleResource);
            sampleResourceCopy.name = 'dash_cluster';
            sampleResourceCopy.config.test = true;

            params = {
                qs: {
                    access_token: access_token_owner,
                    env: 'dev',
                    id: sampleResourceCopyId
                },
                form: {
                    resource: sampleResourceCopy
                }
            };

            executeMyRequest(params, 'resources/update', 'put', function(body) {
                assert.ok(body.result);
                assert.ok(body.data);
                done();
            });
        });

        it('fail - trying to delete dash_cluster', function (done) {
            params = {
                qs: {
                    access_token: access_token_owner,
                    env: 'dev',
                    id: sampleResourceCopyId
                }
            };

            executeMyRequest(params, 'resources', 'delete', function(body) {
                assert.ok(body.errors);
                assert.deepEqual(body.errors.details[0], { code: 989, message: errors[989] });
                done();
            });
        });

        it('success - list resources will mark dash_cluster as sensitive', function (done) {
            params = {
                qs: {
                    access_token: access_token_owner,
                    env: 'dev',
	                envType : 'manual'
                }
            };

            executeMyRequest(params, 'resources', 'get', function(body) {
                assert.ok(body.result);
                assert.ok(body.data);

                for(var i = 0; i < body.data.length; i++) {
                    if(body.data[i].name === 'dash_cluster') {
                        assert.ok(body.data[i].sensitive)
                        break;
                    }
                }
                done();
            });
        });

        it('success - get dash_cluster resource marked as sensitive', function (done) {
            params = {
                qs: {
                    access_token: access_token_owner,
                    env: 'dev',
                    name: 'dash_cluster'
                }
            };

            executeMyRequest(params, 'resources/get', 'get', function(body) {
                assert.ok(body.result);
                assert.ok(body.data);
                assert.ok(body.data.sensitive);
                done();
            });
        });

    });
});

describe("Testing Databases Functionality", function () {

    describe("add environment db", function () {
        it("success - will add a db", function (done) {
            var params = {
                qs: {
                    access_token: access_token_owner,
                    env: "dev"
                },
                form: {
                    'name': 'urac_2',
                    'tenantSpecific': true,
                    'cluster': 'cluster1'
                }
            };
            executeMyRequest(params, 'environment/dbs/add', 'post', function (body) {
                assert.ok(body.data);
                done();
            });
        });

        it('success - will add session db', function (done) {
            var params = {
                qs: {
                    access_token: access_token_owner,
                    env: "dev"
                },
                form: {
                    'name': 'session',
                    'cluster': 'cluster1',
                    'sessionInfo': {
                        "cluster": "cluster1",
                        "dbName": "core_session",
                        'store': {},
                        "collection": "sessions",
                        'stringify': false,
                        'expireAfter': 1000 * 60 * 60 * 24 * 14 // 2 weeks
                    }
                }
            };
            executeMyRequest(params, 'environment/dbs/add', 'post', function (body) {
                assert.ok(body.data);
                done();
            });
        });

        it("success - wil add a db and set tenantSpecific to false by default", function (done) {
            var params = {
                qs: {
                    access_token: access_token_owner,
                    env: "dev"
                },
                form: {
                    'name': 'testDb',
                    'cluster': 'cluster1'
                }
            };
            executeMyRequest(params, 'environment/dbs/add', 'post', function (body) {
                assert.ok(body.data);

                mongo.findOne("environment", {'code': 'DEV'}, function (error, envRecord) {
                    assert.ifError(error);
                    assert.ok(envRecord);
                    assert.ok(envRecord.dbs.databases['testDb']);
                    assert.equal(envRecord.dbs.databases['testDb'].tenantSpecific, false);

                    //clean db record, remove testDb
                    delete envRecord.dbs.databases['testDb'];
                    mongo.save("environment", envRecord, function (error, result) {
                        assert.ifError(error);
                        assert.ok(result);
                        done();
                    });
                });
            });
        });

        it('fail - missing params', function (done) {
            var params = {
                qs: {
                    access_token: access_token_owner,
                    env: "dev"
                },
                form: {
                    'cluster': 'cluster1'
                }
            };
            executeMyRequest(params, 'environment/dbs/add', 'post', function (body) {
                assert.deepEqual(body.errors.details[0], { "code": 172, "message": "Missing required field: name" });
                done();
            });
        });

        it('fail - invalid cluster provided', function (done) {
            var params = {
                qs: {
                    access_token: access_token_owner,
                    env: "dev"
                },
                form: {
                    'name': 'urac',
                    'tenantSpecific': true,
                    'cluster': 'invalid'
                }
            };
            executeMyRequest(params, 'environment/dbs/add', 'post', function (body) {
                assert.deepEqual(body.errors.details[0], { "code": 502, "message": errors[502] });
                done();
            });
        });

        it('fail - invalid session params', function (done) {
            var params = {
                qs: {
                    access_token: access_token_owner,
                    env: "dev"
                },
                form: {
                    'name': 'session',
                    'cluster': 'cluster1'
                }
            };
            executeMyRequest(params, 'environment/dbs/add', 'post', function (body) {
                assert.deepEqual(body.errors.details[0], { "code": 507, "message": errors[507] });
                done();
            });
        });

        it('fail - database already exist', function (done) {
            var params = {
                qs: {
                    access_token: access_token_owner,
                    env: "dev"
                },
                form: {
                    'name': 'urac',
                    'tenantSpecific': true,
                    'cluster': 'cluster1'
                }
            };
            executeMyRequest(params, 'environment/dbs/add', 'post', function (body) {
                assert.deepEqual(body.errors.details[0], { "code": 509, "message": errors[509] });
                done();
            });
        });

        it('fail - session already exist', function (done) {
            var params = {
                qs: {
                    access_token: access_token_owner,
                    env: "dev"
                },
                form: {
                    'name': 'session',
                    'cluster': 'cluster1',
                    'sessionInfo': {
                        "cluster": "cluster1",
                        "dbName": "core_session",
                        'store': {},
                        "collection": "sessions",
                        'stringify': false,
                        'expireAfter': 1000 * 60 * 60 * 24 * 14 // 2 weeks
                    }
                }
            };
            executeMyRequest(params, 'environment/dbs/add', 'post', function (body) {
                assert.deepEqual(body.errors.details[0], { "code": 510, "message": errors[510] });
                done();
            });
        });

        it('mongo - testing database content', function (done) {
            mongo.find('environment', {'code': 'DEV'}, {}, function (error, records) {
                assert.ifError(error);
                assert.ok(records);
                assert.ok(records[0].dbs.databases.urac);
                assert.ok(records[0].dbs.config.session);
                done();
            });
        });
    });

    describe("update environment db", function () {
        it("success - will update a db and set tenantSpecific to false by default", function (done) {
            var params = {
                qs: {
                    access_token: access_token_owner,
                    env: "dev"
                },
                form: {
                    'name': 'urac',
                    'cluster': 'cluster1'
                }
            };
            executeMyRequest(params, 'environment/dbs/update', 'put', function (body) {
                assert.ok(body.data);
                done();
            });
        });

        it("success - will update a db", function (done) {
            var params = {
                qs: {
                    access_token: access_token_owner,
                    env: "dev"
                },
                form: {
                    'name': 'urac',
                    'tenantSpecific': true,
                    'cluster': 'cluster1'
                }
            };
            executeMyRequest(params, 'environment/dbs/update', 'put', function (body) {
                assert.ok(body.data);
                done();
            });
        });

        it('success - will update session db', function (done) {
            var params = {
                qs: {
                    access_token: access_token_owner,
                    env: "dev"
                },
                form: {
                    'name': 'session',
                    'cluster': 'cluster1',
                    'sessionInfo': {
                        "cluster": "cluster1",
                        "dbName": "core_session",
                        'store': {},
                        "collection": "sessions",
                        'stringify': false,
                        'expireAfter': 1000 * 60 * 60 * 24 * 14 // 2 weeks
                    }
                }
            };
            executeMyRequest(params, 'environment/dbs/update', 'put', function (body) {
                assert.ok(body.data);
                done();
            });
        });

        it('fail - missing params', function (done) {
            var params = {
                qs: {
                    access_token: access_token_owner,
                    env: "dev"
                },
                form: {
                    'cluster': 'cluster1'
                }
            };
            executeMyRequest(params, 'environment/dbs/update', 'put', function (body) {
                assert.deepEqual(body.errors.details[0], {
                    "code": 172,
                    "message": "Missing required field: name"
                });
                done();
            });
        });

        it('fail - invalid cluster provided', function (done) {
            var params = {
                qs: {
                    access_token: access_token_owner,
                    env: "dev"
                },
                form: {
                    'name': 'urac',
                    'tenantSpecific': true,
                    'cluster': 'invalid'
                }
            };
            executeMyRequest(params, 'environment/dbs/update', 'put', function (body) {
                assert.deepEqual(body.errors.details[0], { "code": 502, "message": errors[502] });
                done();
            });
        });

        it('fail - invalid session params', function (done) {
            var params = {
                qs: {
                    access_token: access_token_owner,
                    env: "dev"
                },
                form: {
                    'name': 'session',
                    'cluster': 'cluster1'
                }
            };
            executeMyRequest(params, 'environment/dbs/update', 'put', function (body) {
                assert.deepEqual(body.errors.details[0], { "code": 507, "message": errors[507] });
                done();
            });
        });

        it('fail - database does not exist', function (done) {
            var params = {
                qs: {
                    access_token: access_token_owner,
                    env: "dev"
                },
                form: {
                    'name': 'invalid',
                    'tenantSpecific': true,
                    'cluster': 'cluster1'
                }
            };
            executeMyRequest(params, 'environment/dbs/update', 'put', function (body) {
                assert.deepEqual(body.errors.details[0], { "code": 512, "message": errors[512] });
                done();
            });
        });

        it('fail - session does not exist', function (done) {
            var params = {
                qs: {
                    access_token: access_token_owner,
                    env: "dev"
                },
                form: {
                    'name': 'session',
                    'cluster': 'cluster1',
                    'sessionInfo': {
                        "cluster": "cluster1",
                        "dbName": "core_session",
                        'store': {},
                        "collection": "sessions",
                        'stringify': false,
                        'expireAfter': 1000 * 60 * 60 * 24 * 14 // 2 weeks
                    }
                }
            };
            var tmp = {};
            mongo.findOne('environment', {'code': 'DEV'}, function (error, record) {
                assert.ifError(error);
                tmp = utils.cloneObj(record.dbs.session);
                delete record.dbs.session;

                mongo.save('environment', record, function (error) {
                    assert.ifError(error);
                    executeMyRequest(params, 'environment/dbs/update', 'put', function (body) {
                        assert.deepEqual(body.errors.details[0], { "code": 511, "message": errors[511] });

                        record.dbs.session = tmp;
                        mongo.save('environment', record, function (error) {
                            assert.ifError(error);
                            done();
                        });
                    });
                });
            });
        });

        it('mongo - testing database content', function (done) {
            mongo.find('environment', {'code': 'DEV'}, {}, function (error, records) {
                assert.ifError(error);
                assert.ok(records);
                assert.ok(records[0].dbs.databases.urac);
                assert.ok(records[0].dbs.session);
                done();
            });
        });
    });

    describe("delete environment db", function () {
        it('fail - missing params', function (done) {
            var params = {
                qs: {
                    access_token: access_token_owner,
                    env: "dev"
                }
            };
            executeMyRequest(params, 'environment/dbs/delete', 'delete', function (body) {
                assert.deepEqual(body.errors.details[0], {
                    "code": 172,
                    "message": "Missing required field: name"
                });
                done();
            });
        });

        it('fail - invalid database name', function (done) {
            var params = {
                qs: {
                    access_token: access_token_owner,
                    "env": "dev",
                    "name": "invalid"
                }
            };
            executeMyRequest(params, 'environment/dbs/delete', 'delete', function (body) {
                assert.deepEqual(body.errors.details[0], { "code": 512, "message": errors[512] });
                done();
            });
        });

        it('fail - session does not exist', function (done) {
            var params = {
                qs: {
                    access_token: access_token_owner,
                    "env": "dev",
                    "name": "session"
                }
            };
            var tmp = {};
            mongo.findOne('environment', {'code': 'DEV'}, function (error, record) {
                assert.ifError(error);
                tmp = utils.cloneObj(record.dbs.session);
                delete record.dbs.session;

                mongo.save('environment', record, function (error) {
                    assert.ifError(error);

                    executeMyRequest(params, 'environment/dbs/delete', 'delete', function (body) {
                        assert.deepEqual(body.errors.details[0], { "code": 511, "message": errors[511] });

                        record.dbs.session = tmp;
                        mongo.save('environment', record, function (error) {
                            assert.ifError(error);
                            done();
                        });
                    });
                });
            });
        });

        it('success - delete database', function (done) {
            var params = {
                qs: {
                    access_token: access_token_owner,
                    "env": "dev",
                    "name": "urac"
                }
            };
            executeMyRequest(params, 'environment/dbs/delete', 'delete', function (body) {
                assert.ok(body.data);
                done();
            });
        });

        it('success - delete session', function (done) {
            var params = {
                qs: {
                    access_token: access_token_owner,
                    "env": "dev",
                    "name": "session"
                }
            };
            executeMyRequest(params, 'environment/dbs/delete', 'delete', function (body) {
                assert.ok(body.data);
                done();
            });
        });

        it('mongo - testing database', function (done) {
            mongo.findOne('environment', {'code': "DEV"}, function (error, record) {
                assert.ifError(error);
                assert.ok(record);
                assert.deepEqual(record.dbs.databases, {
                    "urac_2": {
                        "prefix": null,
                        "cluster": "cluster1",
                        "tenantSpecific": true
                    }
                });
                done();
            });
        });
    });

    describe("list environment dbs", function () {
        before("clean env record", function (done) {
            mongo.update('environment', {code: 'DEV'}, {
                '$set': {
                    'dbs.databases': {},
                    'dbs.session': {}
                }
            }, function (error) {
                assert.ifError(error);
                done();
            });
        });

        it('success - no session and no databases', function (done) {
            var params = {
                qs: {
                    access_token: access_token_owner,
                    'env': 'dev'
                }
            };
            executeMyRequest(params, 'environment/dbs/list', 'get', function (body) {
                assert.ok(body.data);
                assert.equal(JSON.stringify(body.data.databases), '{}');
                assert.equal(JSON.stringify(body.data.session), '{}');
                done();
            });
        });

        it('success - add session db', function (done) {
            var params = {
                qs: {
                    access_token: access_token_owner,
                    env: "dev"
                },
                form: {
                    'name': 'session',
                    'cluster': 'cluster1',
                    'sessionInfo': {
                        "cluster": "cluster1",
                        "dbName": "core_session",
                        'store': {},
                        "collection": "sessions",
                        'stringify': false,
                        'expireAfter': 1000 * 60 * 60 * 24 * 14 // 2 weeks
                    }
                }
            };
            executeMyRequest(params, 'environment/dbs/add', 'post', function (body) {
                assert.ok(body.data);
                done();
            });
        });

        it('success - add urac db', function (done) {
            var params = {
                qs: {
                    access_token: access_token_owner,
                    env: "dev"
                },
                form: {
                    'name': 'urac',
                    'tenantSpecific': true,
                    'cluster': 'cluster1'
                }
            };
            executeMyRequest(params, 'environment/dbs/add', 'post', function (body) {
                assert.ok(body.data);
                done();
            });
        });

        it('success - yes session and yes databases', function (done) {
            var params = {
                qs: {
                    access_token: access_token_owner,
                    'env': 'dev'
                }
            };
            executeMyRequest(params, 'environment/dbs/list', 'get', function (body) {
                assert.ok(body.data);
                assert.deepEqual(body.data.databases, {
                    'urac': {
                        'prefix': null,
                        'cluster': 'cluster1',
                        'tenantSpecific': true
                    }
                });
                assert.deepEqual(body.data.session, {
                    'prefix': null,
                    "cluster": "cluster1",
                    "name": "core_session",
                    'store': {},
                    "collection": "sessions",
                    'stringify': false,
                    'expireAfter': 1000 * 60 * 60 * 24 * 14
                });
                done();
            });
        });
    });

    describe("update environment db prefix", function () {
        it("success - add db prefix", function (done) {
            var params = {
                qs: {
                    access_token: access_token_owner,
                    env: "dev"
                },
                form: {
                    'prefix': 'soajs_'
                }
            };
            executeMyRequest(params, 'environment/dbs/updatePrefix', 'put', function (body) {
                assert.ok(body.data);

                mongo.findOne('environment', {'code': 'DEV'}, function (error, envRecord) {
                    assert.ifError(error);
                    assert.equal(envRecord.dbs.config.prefix, 'soajs_');
                    done();
                });
            });
        });

        it("success - empty db prefix", function (done) {
            var params = {
                qs: {
                    access_token: access_token_owner,
                    env: "dev"
                },
                form: {
                    'prefix': ''
                }
            };
            executeMyRequest(params, 'environment/dbs/updatePrefix', 'put', function (body) {
                assert.ok(body.data);

                mongo.findOne('environment', {'code': 'DEV'}, function (error, envRecord) {
                    assert.ifError(error);
                    assert.equal(envRecord.dbs.config.prefix, '');
                    done();
                });
            });
        });
    });

});

describe.skip("mongo check db", function () {

    it('asserting environment record', function (done) {
        mongo.findOne('environment', {"code": "DEV"}, function (error, record) {
            assert.ifError(error);
            assert.ok(record);
            delete record._id;
            delete record.deployer;
            delete record.profile;
            if(record.services && record.services.config && record.services.config.session) {
                delete record.services.config.session.proxy;
            }
            
            assert.deepEqual(record, {
	            "code": "DEV",
	            "locked": true,
	            "description": "this is the DEV environment",
	            "dbs": {
		            "config": {
			            "prefix": ""
		            },
		            "databases": {
			            "urac": {
				            "prefix": null,
				            "cluster": "cluster1",
				            "tenantSpecific": true
			            }
		            },
		            "session": {
			            "prefix": null,
			            "cluster": "cluster1",
			            "name": "core_session",
			            "store": {},
			            "collection": "sessions",
			            "stringify": false,
			            "expireAfter": 1209600000
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
				            "healthCheckInterval": 500,
				            "autoRelaodRegistry": 300000,
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
				            "accessTokenLifetime": 7200,
				            "refreshTokenLifetime": 1209600,
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
				            "rolling": false,
				            "unset": "keep",
				            "cookie": {
					            "path": "/",
					            "httpOnly": true,
					            "secure": false,
					            "domain": "soajs.com",
					            "maxAge": null
				            },
				            "resave": false,
				            "saveUninitialized": false
			            }
		            }
	            }
            });
            done();
        });
    });

});

after(function(done) {
    mongo.closeDb();
    done();
});
