"use strict";
const assert = require('assert');
const request = require("request");

const extKey = 'aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac';

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

let params = {};

describe("Testing Infra Functionality", function () {
	
	describe("Testing Infra GET", function () {
		
		it("success", function (done) {
			params = {
				"qs": {}
			};
			
			executeMyRequest(params, "infra", 'get', function (result) {
				assert.ok(result.data);
				done();
			});
		});
		
	});
	
	describe("Testing Add Infra", function () {
		
		it("Faill to add", function (done) {
			
			params = {
				"qs": {},
				"form": {
					"label": "label",
					"name": "name",
					"api": {}
				}
			};
			
			executeMyRequest(params, "infra", 'post', function (result) {
				// console.log(JSON.stringify(result));
				assert.ok(result.errors);
				done();
			});
		});
	});
	
	describe("Testing Edit Infra", function () {
		
		it("Edit - invalid Id", function (done) {
			
			params = {
				"qs": {
					"id": "123"
				},
				"form": {
					"api": {}
				}
			};
			
			executeMyRequest(params, "infra", 'put', function (result) {
				// console.log(JSON.stringify(result));
				assert.ok(result.errors);
				done();
			});
		});
	});
	
	describe("Testing Infra/cluster GET", function () {
		
		it("Invalid ID", function (done) {
			params = {
				"qs": {
					"id": "123",
					"envCode": "DEV"
				}
			};
			
			executeMyRequest(params, "infra/cluster", 'get', function (result) {
				// console.log(JSON.stringify(result));
				assert.ok(result.errors);
				done();
			});
		});
		
	});
	
	describe("Testing Scale cluster", function () {
		
		it("Invalid Id", function (done) {
			params = {
				"qs": {
					"id": "123",
					"envCode": "DEV"
				},
				"form": {
					"number": 2
				}
			};
			
			executeMyRequest(params, "infra/cluster/scale", 'post', function (result) {
				// console.log(JSON.stringify(result));
				assert.ok(result.errors);
				done();
			});
		});
		
	});
	
	describe("Testing Infra/deployment Delete", function () {
		
		it("Fail - invalid Id", function (done) {
			params = {
				"qs": {
					"id": "abc",
					"deploymentId": "123"
				}
			};
			
			executeMyRequest(params, "infra/deployment", 'delete', function (result) {
				assert.ok(result.errors);
				done();
			});
		});
		
	});
	
	describe("Testing Infra/template Post", function () {
		
		it("Fail - Id", function (done) {
			params = {
				"qs": {
					"id": "old"
				},
				"form": {
					template: {
						location: "",
						content: "",
						textMode: true,
						driver: "",
						technology: 'vm',
						name: 'test',
						description: 'test',
						display: "",
						imfv: "",
						inputs: "",
						tags: ""
					}
				}
			};
			
			executeMyRequest(params, "infra/template", 'post', function (result) {
				assert.ok(result.errors);
				done();
			});
		});
		//TODO
		it("Fail - Add", function (done) {
			params = {
				"qs": {
					"id": "5b9b7e733c2054eec725e719"
				},
				"form": {
					template: {
						location: "",
						content: "",
						textMode: true,
						driver: "",
						technology: 'vm',
						name: 'test',
						description: 'test',
						display: "",
						imfv: "",
						inputs: "",
						tags: ""
					}
				}
			};
			
			executeMyRequest(params, "infra/template", 'post', function (result) {
				// console.log(JSON.stringify(result));
				assert.ok(result.errors);
				done();
			});
		});
		
	});
	
	describe("Testing Infra/template Delete", function () {
		
		it("fail - delete", function (done) {
			params = {
				"qs": {
					"id": "5b9b7e733c2054eec725e719",
					"templateId": "htlocal3roszjc7aiclc",
					"templateName": "htlocal3roszjc7aiclc"
				}
			};
			
			executeMyRequest(params, "infra/template", 'delete', function (result) {
				// console.log(JSON.stringify(result));
				done();
			});
		});
		
	});
	
	describe("Testing Infra/template/upload", function () {
		
		it("Fail to upload", function (done) {
			params = {
				"qs": {},
				"form": {
					"name": "123"
				}
			};
			
			executeMyRequest(params, "infra/template/upload", 'post', function (result) {
				// console.log(JSON.stringify(result));
				assert.ok(result.errors);
				done();
			});
		});
		
	});
	
	describe("Testing Infra/template/download", function () {
		
		it("Fail to download", function (done) {
			params = {
				"qs": {
					"id": "123",
					"templateId": "123"
				}
			};
			
			executeMyRequest(params, "infra/template/download", 'get', function (result) {
				assert.ok(result.errors);
				done();
			});
		});
		
	});
	
	describe("Testing Update Infra/template", function () {
		
		it("Fail - update", function (done) {
			params = {
				"qs": {
					"id": "abc"
				},
				"form": {
					"template": {
						location: "",
						content: "",
						textMode: true,
						driver: "",
						technology: 'vm',
						name: 'test',
						description: 'test',
						display: "",
						imfv: "",
						inputs: "",
						tags: ""
					}
				}
			};
			
			executeMyRequest(params, "infra/template", 'put', function (result) {
				// console.log(JSON.stringify(result));
				assert.ok(result.errors);
				done();
			});
		});
		
	});
	
	describe("Testing Get Infra/extras", function () {
		
		it("Fail - Id", function (done) {
			params = {
				"qs": {
					"id": "123"
				}
			};
			
			executeMyRequest(params, "infra/extras", 'get', function (result) {
				// console.log(JSON.stringify(result));
				assert.ok(result.errors);
				done();
			});
		});
		
	});
	
	describe("Testing Add Infra/extras", function () {
		
		it("Failed", function (done) {
			params = {
				"qs": {
					"infraId": "123",
					"technology": ""
				},
				"form": {
					"params": {}
				}
			};
			
			executeMyRequest(params, "infra/extras", 'post', function (result) {
				// console.log(JSON.stringify(result));
				assert.ok(result.errors);
				done();
			});
		});
		
	});
	
	describe("Testing Edit Infra/extras", function () {
		
		it("Failed", function (done) {
			params = {
				"qs": {
					"infraId": "123",
					"technology": ""
				},
				"form": {
					"params": {}
				}
			};
			
			executeMyRequest(params, "infra/extras", 'put', function (result) {
				// console.log(JSON.stringify(result));
				assert.ok(result.errors);
				done();
			});
		});
		
	});
	
	describe("Testing Delete Infra/extras", function () {
		
		it("Failed", function (done) {
			params = {
				"qs": {
					"section": "group",
					"infraId": "123",
					"technology": ""
				}
			};
			
			executeMyRequest(params, "infra/extras", 'delete', function (result) {
				assert.ok(result.errors);
				done();
			});
		});
		
	});
	
	describe("Testing Delete Infra", function () {
		
		it("Failed", function (done) {
			
			params = {
				"qs": {
					"id": "5b9b7e733c2054eec725e719"
				}
			};
			
			executeMyRequest(params, "infra", 'delete', function (result) {
				// console.log(JSON.stringify(result));
				assert.ok(result);
				done();
			});
		});
	});
	
});
