"use strict";
let assert = require('assert');
let request = require("request");
let helper = require("../helper.js");
let fs = require("fs");

let extKey = 'aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac';

let Mongo = require("soajs.core.modules").mongo;
let dbConfig = require("./db.config.test.js");
let dashboardConfig = dbConfig();
dashboardConfig.name = "core_provision";
let mongo = new Mongo(dashboardConfig);

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

describe("DASHBOARD TESTS: API Builder", function () {
	
	let sampleID = '';
	let sampleEndpointID = '';
	let ImfvSchema;
	let swaggerInput = fs.readFileSync(__dirname + "/swagger-no-response.test.yaml", "utf8").toString();
	
	it("Success - will list endpoints", function (done) {
		let params = {
			qs: {
				mainType: "services"
			}
		};
		executeMyRequest(params, 'apiBuilder/list', 'get', function (body) {
			sampleID = body.data.records[0]._id;
			ImfvSchema = body.data.records[0].schema;
			assert.ok(body.data);
			done();
		});
	});
	
	it("Success - will list endpoints", function (done) {
		let params = {
			qs: {
				mainType: "endpoints"
			}
		};
		executeMyRequest(params, 'apiBuilder/list', 'get', function (body) {
			assert.ok(body.data);
			done();
		});
	});
	
	it("Success - will get endpoint", function (done) {
		let params = {
			qs: {
				mainType: "services",
				id: sampleID,
			}
		};
		executeMyRequest(params, 'apiBuilder/get', 'get', function (body) {
			assert.ok(body.data);
			done();
		});
	});
	
	it("Success - will add services 1", function (done) {
		let params = {
			form: {
				mainType: "services",
				serviceName: "testservice1",
				serviceGroup: "testGroup1",
				servicePort: 1337,
				serviceVersion: "1",
				requestTimeout: 1,
				requestTimeoutRenewal: 1,
				epType: "rest",
				defaultAuthentication: "testSoapResource",
				oauth: true,
				extKeyRequired: true,
				swaggerInput: swaggerInput,
				authentications: [{"name": "None", "category": "N/A"}, {
					"name": "testSoapResource",
					"category": "soapbasicauth",
					"isDefault": true
				}]
			}
		};
		executeMyRequest(params, 'apiBuilder/add', 'post', function (body) {
			assert.deepEqual(body.result, true);
			assert.ok(body.data);
			done();
		});
	});
	
	it("Success - will add services 2", function (done) {
		let params = {
			form: {
				"mainType": "passThroughs",
				"serviceName": "test",
				"serviceGroup": "group",
				"servicePort": 5555,
				"requestTimeout": 30,
				"requestTimeoutRenewal": 5,
				"path": "/test",
				"port": 6666,
				"versions": {
					"1": {
						"url": "/sdsd",
						"oauth": true,
						"extKeyRequired": false,
						"urac": true,
						"urac_Profile": true,
						"provision_ACL": false,
						"swagger": {
							"swaggerInput": "swagger: \"2.0\"\ninfo:\n  version: \"1.0.0\"\n  title: express demo\nhost: dev-api.mydomain.com\nbasePath: /express\nschemes:\n  - http\npaths:\n  /tidbit/hello:\n    get:\n      tags:\n        - hello\n      summary: Hello World\n      parameters:\n        - name: username\n          in: query\n          required: true\n          type: string\n        - name: lastname\n          in: query\n          required: true\n          type: string",
							"swaggerInputType": "text"
						}
					}
				}
			}
		};
		executeMyRequest(params, 'apiBuilder/add', 'post', function (body) {
			assert.deepEqual(body.result, true);
			assert.ok(body.data);
			done();
		});
	});
	
	
	it("Success - will list endpoints", function (done) {
		let params = {
			qs: {
				mainType: "passThroughs"
			}
		};
		executeMyRequest(params, 'apiBuilder/list', 'get', function (body) {
			assert.ok(body.data);
			done();
		});
	});
	
	it("Success - will add endpoint 2", function (done) {
		let params = {
			form: {
				mainType: "endpoints",
				serviceName: "testservice2",
				serviceGroup: "testGroup2",
				servicePort: 1347,
				serviceVersion: "1",
				requestTimeout: 2,
				requestTimeoutRenewal: 2,
				epType: "rest",
			}
		};
		executeMyRequest(params, 'apiBuilder/add', 'post', function (body) {
			assert.deepEqual(body.result, true);
			sampleEndpointID = body.data._id;
			assert.ok(body.data);
			done();
		});
	});
	
	it("Fail - try to publish without schemas", function (done) {
		let params = {
			qs: {
				mainType: "endpoints",
				endpointId: sampleEndpointID
			}
		};
		executeMyRequest(params, 'apiBuilder/publish', 'get', function (body) {
			assert.equal(body.errors.codes[0], 923);
			done();
		});
	});
	
	
	it("Success - will edit endpoint", function (done) {
		let params = {
			form: {
				id: sampleID,
				mainType: "services",
				serviceName: "newtesttervice",
				serviceGroup: "newTestGroup",
				servicePort: 6666,
				serviceVersion: "1",
				requestTimeout: 1,
				requestTimeoutRenewal: 1,
				epType: "rest",
				defaultAuthentication: "testSoapResource",
				oauth: true,
				extKeyRequired: true,
				authentications: [{"name": "None", "category": "N/A"}, {
					"name": "testSoapResource",
					"category": "soapbasicauth",
					"isDefault": true
				}]
			}
		};
		executeMyRequest(params, 'apiBuilder/edit', 'put', function (body) {
			assert.deepEqual(body.result, true);
			assert.ok(body.data);
			done();
		});
	});
	
	it("Success - will get getResources", function (done) {
		let params = {};
		
		executeMyRequest(params, 'apiBuilder/getResources', 'get', function (body) {
			assert.ok(body.data);
			done();
		});
	});
	
	it("Success - will update route authentication method", function (done) {
		let params = {
			qs: {
				mainType: "services",
				endpointId: sampleID,
				schemaKey: "post",
				routeKey: "/pet",
				authentication: "testSoapResource" //false
			}
		};
		executeMyRequest(params, 'apiBuilder/authentication/update', 'post', function (body) {
			assert.ok(body.data);
			done();
		});
	});
	
	it("Success - will convert Swagger string to an IMFV SOAJS object", function (done) {
		let params = {
			qs: {
				mainType: "services",
				id: sampleID
			},
			form: {
				swagger: swaggerInput
			}
		};
		executeMyRequest(params, 'apiBuilder/convertSwaggerToImfv', 'post', function (body) {
			assert.ok(body.data);
			done();
		});
	});
	
	it("Success - will convert IMFV SOAJS object to a Swagger string", function (done) {
		let params = {
			qs: {
				mainType: "services",
				id: sampleID
			},
			form: {
				schema: ImfvSchema
			}
		};
		executeMyRequest(params, 'apiBuilder/convertImfvToSwagger', 'post', function (body) {
			assert.ok(body.data);
			done();
		});
	});
	
	it("Success - will update endpoint's schemas 1", function (done) {
		let params = {
			qs: {
				mainType: "endpoints",
				endpointId: sampleEndpointID,
				
			},
			form: {
				schemas: ImfvSchema,
				swagger: swaggerInput
			}
		};
		executeMyRequest(params, 'apiBuilder/updateSchemas', 'put', function (body) {
			assert.ok(body.data);
			done();
		});
	});
	
	it("Success - Publish endpoint", function (done) {
		let params = {
			qs: {
				mainType: "endpoints",
				endpointId: sampleEndpointID
			}
		};
		executeMyRequest(params, 'apiBuilder/publish', 'get', function (body) {
			assert.ok(body);
			done();
		});
	});
	
	it("Success - will add services 2", function (done) {
		let params = {
			form: {
				"mainType": "passThroughs",
				"serviceName": "test",
				"serviceGroup": "group",
				"servicePort": 5555,
				"requestTimeout": 30,
				"requestTimeoutRenewal": 5,
				"path": "/test",
				"port": 6666,
				"versions": {
					"1": {
						"url": "/sdsd",
						"oauth": true,
						"extKeyRequired": false,
						"urac": true,
						"urac_Profile": true,
						"provision_ACL": false,
						"swagger": {
							"swaggerInput": "swagger: \"2.0\"\ninfo:\n  version: \"1.0.0\"\n  title: express demo\nhost: dev-api.mydomain.com\nbasePath: /express\nschemes:\n  - http\npaths:\n  /tidbit/hello:\n    get:\n      tags:\n        - hello\n      summary: Hello World\n      parameters:\n        - name: username\n          in: query\n          required: true\n          type: string\n        - name: lastname\n          in: query\n          required: true\n          type: string",
							"swaggerInputType": "text"
						}
					}
				}
			}
		};
		executeMyRequest(params, 'apiBuilder/add', 'post', function (body) {
			console.log(JSON.stringify(body, null, 2))
			assert.deepEqual(body.result, true);
			sampleEndpointID = body.data._id;
			assert.ok(body.data);
			done();
		});
	});
	
	it("Success - Publish endpoint", function (done) {
		let params = {
			qs: {
				mainType: "passThroughs",
				endpointId: sampleEndpointID
			}
		};
		executeMyRequest(params, 'apiBuilder/publish', 'get', function (body) {
			assert.ok(body);
			done();
		});
	});
	
	it("Success - will get endpoint", function (done) {
		let params = {
			qs: {
				mainType: "passThroughs",
				id: sampleEndpointID,
			}
		};
		executeMyRequest(params, 'apiBuilder/get', 'get', function (body) {
			assert.ok(body.data);
			done();
		});
	});
	
	it("Success - will update endpoint's schemas 2", function (done) {
		let params = {
			qs: {
				mainType: "services",
				endpointId: sampleID,
			},
			form: {
				swagger: swaggerInput
			}
		};
		executeMyRequest(params, 'apiBuilder/updateSchemas', 'put', function (body) {
			assert.ok(body.data);
			done();
		});
	});
	it("Success - will update endpoint's schemas 3", function (done) {
		let params = {
			qs: {
				mainType: "services",
				endpointId: sampleID,
			},
			form: {
				schemas: ImfvSchema,
			}
		};
		executeMyRequest(params, 'apiBuilder/updateSchemas', 'put', function (body) {
			assert.ok(body.data);
			done();
		});
	});
	it("fail - update endpoint's schemas 4", function (done) {
		let params = {
			qs: {
				mainType: "services",
				endpointId: sampleID,
			}
		};
		executeMyRequest(params, 'apiBuilder/updateSchemas', 'put', function (body) {
			assert.ok(body.errors);
			done();
		});
	});
	
	it("Success - will delete endpoint", function (done) {
		let params = {
			qs: {
				mainType: "services",
				id: sampleID
			}
		};
		executeMyRequest(params, 'apiBuilder/delete', 'delete', function (body) {
			assert.ok(body.data);
			done();
		});
	});
	
});
