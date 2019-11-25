"use strict";
const assert = require('assert');
const request = require("request");

const Mongo = require("soajs.core.modules").mongo;
const dbConfig = require("./db.config.test.js");

let dashboardConfig = dbConfig();
dashboardConfig.name = "core_provision";

const mongo = new Mongo(dashboardConfig);

const extKey = 'aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac';
let mockServers = null;
let mock = require('./test-service-mock');

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

describe("DASHBOARD UC-1 Integration Tests:", function () {
	let _id;
	
	
	before(function (done) {
		mongo.findOne('git_accounts', {owner: 'soajs'}, function (error, result) {
			assert.ifError(error);
			_id = result._id;
			setTimeout(function () {
				done();
			}, 100);
		});
	});
	
	it("insert host", function (done) {
		let host = {
			env: "dev",
			ip: "127.0.0.1",
			name: "httpmethods",
			version: "1",
			port: 4010
		};
		mongo.insert('hosts', host, function (error, result) {
			setTimeout(function () {
				done();
			}, 500);
		});
	});
	it("reload controller registry", function (done) {
		let params = {
			"uri": "http://127.0.0.1:5000/reloadRegistry",
			"headers": {
				"content-type": "application/json"
			},
			"json": true
		};
		request["get"](params, function (error, response) {
			assert.ifError(error);
			assert.ok(response);
			setTimeout(function () {
				let params = {
					"uri": "http://127.0.0.1:5000/awarenessStat",
					"headers": {
						"content-type": "application/json"
					},
					"json": true
				};
				request["get"](params, function (error, response) {
					assert.ifError(error);
					assert.ok(response);
					setTimeout(function () {
						done();
					}, 1000);
				});
			}, 1000);
		});
	});
	it("success - activate repo ", function (done) {
		let params = {
			form: {
				"provider": "github",
				"owner": "soajs",
				"repo": "soajs.test.httpmethods",
				"project": null,
				"configBranch": "master",
				"git": {"branches": [{"name": "master", "active": true}]}
			},
			qs: {
				"id": _id.toString(),
				"provider": "github"
			}
		};
		executeMyRequest(params, 'gitAccounts/repo/activate', 'post', function (response) {
			mongo.findOne('services', {'name': "httpmethods"}, function (error, result) {
				assert.ifError(error);
				assert.deepEqual(result.versions["1"].apis, [
					{
						l: "Some Sum",
						v: "/testPost",
						m: "post",
						group: "test"
					},
					{
						l: "Some Sum",
						v: "/testPut",
						m: "put",
						group: "test"
					},
					{
						l: "Some Sum",
						v: "/testGet",
						m: "get",
						group: "test"
					},
					{
						l: "Some Sum",
						v: "/testPatch",
						m: "patch",
						group: "test"
					},
					{
						l: "Some Sum",
						v: "/testHead",
						m: "head",
						group: "test"
					},
					{
						l: "Some Sum",
						v: "/testDelete",
						m: "delete",
						group: "test"
					},
					{
						l: "Some Sum",
						v: "/testOther",
						m: "options",
						group: "test"
					}
				]);
				done();
			});
		});
	});
	it("success - start express service", function (done) {
		mock.startServer(null, function (servers) {
			mockServers = servers;
		});
		setTimeout(function () {
			done();
		}, 10000);
	});
	it("reload controller registry", function (done) {
		let params = {
			"uri": "http://127.0.0.1:5000/reloadRegistry",
			"headers": {
				"content-type": "application/json"
			},
			"json": true
		};
		request["get"](params, function (error, response) {
			assert.ifError(error);
			assert.ok(response);
			setTimeout(function () {
				let params = {
					"uri": "http://127.0.0.1:5000/awarenessStat",
					"headers": {
						"content-type": "application/json"
					},
					"json": true
				};
				request["get"](params, function (error, response) {
					assert.ifError(error);
					assert.ok(response);
					setTimeout(function () {
						done();
					}, 1000);
				});
			}, 1000);
		});
	});
	it("Test get method", function (done) {
		let options = {
			uri: 'http://127.0.0.1:4000/httpmethods/testGet',
			headers: {
				'Content-Type': 'application/json',
				key: extKey,
			},
			"qs": {
				access_token: "cfb209a91b23896820f510aadbf1f4284b512123"
			},
			'json': true
		};
		request['get'](options, (error, response) => {
			assert.ifError(error);
			assert.ok(response);
			assert.deepEqual(response.body.data.method, 'GET');
			done();
		});
	});
	it("Test post method", function (done) {
		let options = {
			uri: 'http://127.0.0.1:4000/httpmethods/testPost',
			headers: {
				'Content-Type': 'application/json',
				key: extKey
			},
			"qs": {
				access_token: "cfb209a91b23896820f510aadbf1f4284b512123"
			},
			'json': true
		};
		request['post'](options, (error, response) => {
			assert.ifError(error);
			assert.ok(response);
			assert.deepEqual(response.body.data.method, 'POST');
			done();
		});
	});
	it("Test put method", function (done) {
		let options = {
			uri: 'http://127.0.0.1:4000/httpmethods/testPut',
			headers: {
				'Content-Type': 'application/json',
				key: extKey
			},
			"qs": {
				access_token: "cfb209a91b23896820f510aadbf1f4284b512123"
			},
			'json': true
		};
		request['put'](options, (error, response) => {
			assert.ifError(error);
			assert.ok(response.body);
			assert.deepEqual(response.body.data.method, 'PUT');
			done();
		});
	});
	it("Test delete method", function (done) {
		let options = {
			uri: 'http://127.0.0.1:4000/httpmethods/testDelete',
			headers: {
				'Content-Type': 'application/json',
				key: extKey
			},
			"qs": {
				access_token: "cfb209a91b23896820f510aadbf1f4284b512123"
			},
			'json': true
		};
		request['delete'](options, (error, response) => {
			assert.ifError(error);
			assert.ok(response.body);
			assert.deepEqual(response.body.data.method, 'DELETE');
			done();
		});
	});
	it("Test patch method", function (done) {
		let options = {
			uri: 'http://127.0.0.1:4000/httpmethods/testPatch',
			headers: {
				'Content-Type': 'application/json',
				key: extKey
			},
			"qs": {
				access_token: "cfb209a91b23896820f510aadbf1f4284b512123"
			},
			'json': true
		};
		request['patch'](options, (error, response) => {
			assert.ifError(error);
			assert.ok(response.body);
			assert.deepEqual(response.body.data.method, 'PATCH');
			done();
		});
	});
	it("Test head method", function (done) {
		let options = {
			uri: 'http://127.0.0.1:4000/httpmethods/testHead',
			headers: {
				'Content-Type': 'application/json',
				key: extKey
			},
			"qs": {
				access_token: "cfb209a91b23896820f510aadbf1f4284b512123"
			},
			'json': true
		};
		request['head'](options, (error, response) => {
			assert.ifError(error);
			assert.ok(response);
			done();
		});
	});
	it("Test other method", function (done) {
		let options = {
			uri: 'http://127.0.0.1:4000/httpmethods/testOther',
			headers: {
				'Content-Type': 'application/json',
				key: extKey
			},
			"qs": {
				access_token: "cfb209a91b23896820f510aadbf1f4284b512123"
			},
			'json': true
		};
		request['options'](options, (error, response) => {
			assert.ok(response);
			assert.ifError(error);
			done();
		});
	});
	
	after((done) => {
		mock.killServer(mockServers);
		done();
	});
});
