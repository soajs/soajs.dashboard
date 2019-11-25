"use strict";

const assert = require('assert');
const request = require("request");

const helper = require("../helper.js");
const utils = require("soajs.core.libs").utils;

const config = helper.requireModule('./config');
const errors = config.errors;

const Mongo = require("soajs.core.modules").mongo;
const dbConfig = require("./db.config.test.js");

let dashboardConfig = dbConfig();
dashboardConfig.name = "core_provision";

const mongo = new Mongo(dashboardConfig);

const extKey_owner = '9b96ba56ce934ded56c3f21ac9bdaddc8ba4782b7753cf07576bfabcace8632eba1749ff1187239ef1f56dd74377aa1e5d0a1113de2ed18368af4b808ad245bc7da986e101caddb7b75992b14d6a866db884ea8aee5ab02786886ecf9f25e974';
const extKey_user1 = 'aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac';

let params = {}, access_token_owner = '', access_token_user1 = '';
let customRegCopy = {}, customRegCopyId = '';
let customRegRecord = {
	"name": "c1",
	"locked": true,
	"plugged": true,
	"shared": true,
	"value": "test custom registry entry"
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
				key: extKey_owner
			},
			json: true
		};
		
		if (params.qs && params.qs.access_token) {
			if (params.qs.access_token === access_token_user1) {
				options.headers.key = extKey_user1;
			}
		}
		
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

describe("Testing Custom Registry Functionality", function () {
	
	before("Login", function (done) {
		let authOptions = {
			uri: 'http://localhost:4000/oauth/authorization',
			headers: {
				'Content-Type': 'application/json',
				'key': extKey_owner
			},
			json: true
		};
		
		let tokenOptions = {
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
		
		login(authOptions, tokenOptions, function (error, tokenInfo) {
			access_token_owner = tokenInfo.access_token;
			
			authOptions.headers.key = extKey_user1;
			tokenOptions.headers.key = extKey_user1;
			tokenOptions.body.username = 'user1';
			login(authOptions, tokenOptions, function (error, tokenInfo) {
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
	
	before("Cleanup", function (done) {
		mongo.remove('custom_registry', {}, function (error) {
			assert.ifError(error);
			
			done();
		});
	});
	
	describe("Testing add custom registry entry", function () {
		
		before("Clone sample record", function (done) {
			customRegCopy = utils.cloneObj(customRegRecord);
			done();
		});
		
		it("success - will add new plugged entry as owner", function (done) {
			params = {
				qs: {
					access_token: access_token_owner
				},
				form: {
					env: 'dev',
					customRegEntry: customRegCopy
				}
			};
			
			executeMyRequest(params, 'customRegistry/add', 'post', function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				assert.ok(body.data._id);
				done();
			});
		});
		
		it("fail - entry with the same name is already plugged in environment", function (done) {
			params = {
				qs: {
					access_token: access_token_owner
				},
				form: {
					env: 'dev',
					customRegEntry: customRegCopy
				}
			};
			
			executeMyRequest(params, 'customRegistry/add', 'post', function (body) {
				assert.ok(body.errors);
				assert.deepEqual(body.errors.details[0], {code: 992, message: errors[992]});
				done();
			});
		});
		
		it("success - will add new unplugged entry as user1", function (done) {
			customRegCopy.name = 'c2';
			customRegCopy.plugged = false;
			
			params = {
				qs: {
					access_token: access_token_user1
				},
				form: {
					env: 'dev',
					customRegEntry: customRegCopy
				}
			};
			
			executeMyRequest(params, 'customRegistry/add', 'post', function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				assert.ok(body.data._id);
				done();
			});
		});
		
		it("success - entry with the same name is not plugged", function (done) {
			customRegCopy.plugged = true;
			
			params = {
				qs: {
					access_token: access_token_owner
				},
				form: {
					env: 'dev',
					customRegEntry: customRegCopy
				}
			};
			
			executeMyRequest(params, 'customRegistry/add', 'post', function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				assert.ok(body.data._id);
				done();
			});
		});
		
		it("fail - adding entry record with additional properties", function (done) {
			customRegCopy.invalidProperty = true;
			params = {
				qs: {
					access_token: access_token_owner
				},
				form: {
					env: 'dev',
					customRegEntry: customRegCopy
				}
			};
			
			executeMyRequest(params, 'customRegistry/add', 'post', function (body) {
				assert.ok(body.errors);
				assert.deepEqual(body.errors.details[0], {
					code: 173,
					message: 'Validation failed for field: customRegEntry -> The parameter \'customRegEntry\' failed due to: instance additionalProperty \"invalidProperty\" exists in instance when not allowed'
				});
				done();
			});
		});
		
	});
	
	describe("Testing get custom registry entry", function () {
		
		before("Get entry c1 record from custom_registry collection", function (done) {
			mongo.findOne('custom_registry', {name: 'c1'}, function (error, record) {
				assert.ifError(error);
				customRegCopy = record;
				customRegCopyId = record._id.toString();
				done();
			});
		});
		
		it("success - get c1 entry by id", function (done) {
			params = {
				qs: {
					access_token: access_token_owner,
					env: 'dev',
					id: customRegCopyId
				}
			};
			
			executeMyRequest(params, 'customRegistry/get', 'get', function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				assert.ok(body.data._id);
				assert.equal(body.data.name, 'c1');
				done();
			});
		});
		
		it("success - get c1 entry by name", function (done) {
			params = {
				qs: {
					access_token: access_token_owner,
					env: 'dev',
					name: 'c1'
				}
			};
			
			executeMyRequest(params, 'customRegistry/get', 'get', function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				assert.ok(body.data._id);
				assert.equal(body.data.name, 'c1');
				done();
			});
		});
		
		it("fail - no name or id provided", function (done) {
			params = {
				qs: {
					access_token: access_token_owner,
					env: 'dev'
				}
			};
			
			executeMyRequest(params, 'customRegistry/get', 'get', function (body) {
				assert.ok(body.errors);
				assert.deepEqual(body.errors.details[0], {code: 990, message: errors[990]});
				done();
			});
		});
		
	});
	
	describe("Testing update custom registry entry", function () {
		
		before("get user1's c2 custom registry record", function (done) {
			mongo.findOne('custom_registry', {name: 'c2', author: 'user1', plugged: false}, function (error, record) {
				assert.ifError(error);
				customRegCopy = record;
				customRegCopyId = record._id.toString();
				delete customRegCopy._id;
				delete customRegCopy.created;
				delete customRegCopy.author;
				done();
			});
		});
		
		it("success - will update user1's entry as owner", function (done) {
			customRegCopy.value = {test: true};
			params = {
				qs: {
					access_token: access_token_owner,
					env: 'dev',
					id: customRegCopyId
				},
				form: {
					customRegEntry: customRegCopy
				}
			};
			
			executeMyRequest(params, 'customRegistry/update', 'put', function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				done();
			});
		});
		
		it("fail - trying to plug an entry that will cause a conflict", function (done) {
			customRegCopy.plugged = true;
			params = {
				qs: {
					access_token: access_token_user1,
					env: 'dev',
					id: customRegCopyId
				},
				form: {
					customRegEntry: customRegCopy
				}
			};
			
			executeMyRequest(params, 'customRegistry/update', 'put', function (body) {
				assert.ok(body.errors);
				assert.deepEqual(body.errors.details[0], {code: 992, message: errors[992]});
				done();
			});
		});
		
		it("fail - trying to update entry owned by owner as user1", function (done) {
			mongo.findOne('custom_registry', {author: 'owner'}, function (error, record) {
				assert.ifError(error);
				assert.ok(record);
				let recordId = record._id.toString();
				delete record._id;
				delete record.created;
				delete record.author;
				
				params = {
					qs: {
						access_token: access_token_user1,
						env: 'dev',
						id: recordId
					},
					form: {
						customRegEntry: record
					}
				};
				
				executeMyRequest(params, 'customRegistry/update', 'put', function (body) {
					assert.ok(body.errors);
					assert.deepEqual(body.errors.details[0], {code: 994, message: errors[994]});
					done();
				});
			});
		});
		
		it("fail - trying to update entry in an environment different from the one it was created in", function (done) {
			params = {
				qs: {
					access_token: access_token_owner,
					env: 'dashboard',
					id: customRegCopyId
				},
				form: {
					customRegEntry: customRegCopy
				}
			};
			
			executeMyRequest(params, 'customRegistry/update', 'put', function (body) {
				assert.ok(body.errors);
				assert.deepEqual(body.errors.details[0], {code: 995, message: errors[995]});
				done();
			});
		});
		
	});
	
	describe("Testing list custom registry entries", function () {
		
		it("success - will list entries with pagination", function (done) {
			params = {
				qs: {
					access_token: access_token_owner,
					env: 'dev',
					start: 0,
					end: 2
				}
			};
			
			executeMyRequest(params, 'customRegistry/list', 'get', function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				assert.equal(body.data.count, 3);
				assert.equal(body.data.records.length, 2);
				done();
			});
		});
		
		it("success - will list entries as owner, get permission set to true for all entries", function (done) {
			params = {
				qs: {
					access_token: access_token_owner,
					env: 'dev'
				}
			};
			
			executeMyRequest(params, 'customRegistry/list', 'get', function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				body.data.records.forEach(function (oneEntry) {
					assert.ok(oneEntry.permission);
				});
				done();
			});
		});
		
		it("success - will list entries as user1, get permission set to true only for entries owned by user1", function (done) {
			params = {
				qs: {
					access_token: access_token_user1,
					env: 'dev'
				}
			};
			
			executeMyRequest(params, 'customRegistry/list', 'get', function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				body.data.records.forEach(function (oneEntry) {
					if (oneEntry.author === 'user1') {
						assert.ok(oneEntry.permission);
					} else if (oneEntry.author === 'owner') {
						assert.ok(!oneEntry.permission);
					}
				});
				done();
			});
		});
		
		it("success - will list entries in dashboard environment, get dev entries that are shared", function (done) {
			params = {
				qs: {
					access_token: access_token_owner,
					env: 'dashboard'
				}
			};
			
			executeMyRequest(params, 'customRegistry/list', 'get', function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				body.data.records.forEach(function (oneEntry) {
					assert.equal(oneEntry.created, 'DEV');
					assert.ok(oneEntry.shared);
				});
				done();
			});
		});
		
		it("fail - missing required fields", function (done) {
			params = {
				qs: {
					access_token: access_token_owner
				}
			};
			
			executeMyRequest(params, 'customRegistry/list', 'get', function (body) {
				assert.ok(body.errors);
				assert.deepEqual(body.errors.details[0], {code: 172, message: 'Missing required field: env'});
				done();
			});
		});
		
	});
	
	describe("Testing delete custom registry entry", function () {
		
		before("get owner's c1 custom registry record", function (done) {
			mongo.findOne('custom_registry', {name: 'c1', author: 'owner'}, function (error, record) {
				assert.ifError(error);
				customRegCopy = record;
				customRegCopyId = record._id.toString();
				done();
			});
		});
		
		it("fail - missing required params", function (done) {
			params = {
				qs: {
					access_token: access_token_owner,
					env: 'dev'
				}
			};
			
			executeMyRequest(params, 'customRegistry/delete', 'delete', function (body) {
				assert.ok(body.errors);
				assert.deepEqual(body.errors.details[0], {code: 172, message: 'Missing required field: id'});
				done();
			});
		});
		
		it("fail - trying to delete entry in an environment different from the one it was created it", function (done) {
			params = {
				qs: {
					access_token: access_token_owner,
					id: customRegCopyId,
					env: 'dashboard'
				}
			};
			
			executeMyRequest(params, 'customRegistry/delete', 'delete', function (body) {
				assert.ok(body.errors);
				assert.deepEqual(body.errors.details[0], {code: 995, message: errors[995]});
				done();
			});
		});
		
		it("fail - trying to delete owner's entry as user1", function (done) {
			params = {
				qs: {
					access_token: access_token_user1,
					id: customRegCopyId,
					env: 'dev'
				}
			};
			
			executeMyRequest(params, 'customRegistry/delete', 'delete', function (body) {
				assert.ok(body.errors);
				assert.deepEqual(body.errors.details[0], {code: 994, message: errors[994]});
				done();
			});
		});
		
		it('success - will delete entry', function (done) {
			params = {
				qs: {
					access_token: access_token_owner,
					id: customRegCopyId,
					env: 'dev'
				}
			};
			
			executeMyRequest(params, 'customRegistry/delete', 'delete', function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				done();
			});
		});
		
	});
	
	describe("Testing upgrade custom registry", function () {
		let oldCustomReg = {
			'c5': 'test',
			'c6': true,
			'c7': 120000,
			'c8': ['e1', 'e2', 'e3', 'e4'],
			'c9': {test: true}
		};
		
		before("update dev environment record, add old schema custom registry to it", function (done) {
			mongo.update('environment', {code: 'DEV'}, {$set: {custom: oldCustomReg}}, function (error) {
				assert.ifError(error);
				done();
			});
		});
		
		it("success - will upgrade dev environment custom registry", function (done) {
			params = {
				qs: {
					access_token: access_token_owner,
					env: 'dev'
				}
			};
			
			executeMyRequest(params, 'customRegistry/upgrade', 'put', function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				mongo.findOne('environment', {code: 'DEV'}, function (error, envRecord) {
					assert.ifError(error);
					assert.ok(envRecord);
					assert.ok(!envRecord.custom);
					done();
				});
			});
		});
		
		it('success - new custom registry entries are available', function (done) {
			mongo.find('custom_registry', {}, function (error, records) {
				assert.ifError(error);
				assert.ok(records);
				assert.ok(records.length > 0);
				records.forEach(function (oneRecord) {
					if (['c5', 'c6', 'c7', 'c8', 'c9'].indexOf(oneRecord.name) !== -1) {
						assert.ok(oneRecord.plugged);
						assert.ok(!oneRecord.shared);
						assert.ok(!oneRecord.locked);
						assert.equal(oneRecord.created, 'DEV');
						assert.equal(oneRecord.author, 'owner');
						assert.ok(oneRecord.value);
					}
				});
				done();
			});
		});
		
		it("success - will try to upgrade again, no changes since no old schema is detected", function (done) {
			params = {
				qs: {
					access_token: access_token_owner,
					env: 'dev'
				}
			};
			
			executeMyRequest(params, 'customRegistry/upgrade', 'put', function (body) {
				assert.ok(body.result);
				assert.ok(body.data);
				done();
			});
		});
		
	});
	
});
