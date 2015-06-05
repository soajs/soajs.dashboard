"use strict";
var assert = require('assert');
var request = require("request");
var soajs = require('soajs');
var util = require('soajs/lib/utils');
var helper = require("../helper.js");
var dashboard;

var config = helper.requireModule('./service/utils/config');
var errorCodes = config.errors;

var Mongo = soajs.mongo;
var dbConfig = require("./db.config.test.js");

var dashboardConfig = dbConfig();
dashboardConfig.name = "core_provision";
var mongo = new Mongo(dashboardConfig);

var extKey = '9b96ba56ce934ded56c3f21ac9bdaddc8ba4782b7753cf07576bfabcace8632eba1749ff1187239ef1f56dd74377aa1e5d0a1113de2ed18368af4b808ad245bc7da986e101caddb7b75992b14d6a866db884ea8aee5ab02786886ecf9f25e974';
function executeMyRequest(params, apiPath, method, cb) {
	requester(apiPath, method, params, function(error, body) {
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

		if(params.headers) {
			for(var h in params.headers) {
				if(params.headers.hasOwnProperty(h)) {
					options.headers[h] = params.headers[h];
				}
			}
		}

		if(params.form) {
			options.body = params.form;
		}

		if(params.qs) {
			options.qs = params.qs;
		}

		request[method](options, function(error, response, body) {
			assert.ifError(error);
			assert.ok(body);
			return cb(null, body);
		});
	}
}

describe("DASHBOARD CONTENT BUILDER TESTS", function() {
	var validSchema = require("./gc.schema.test");
	var soajsauth, cbId;
	var latestV = 13;
	var oldVTotal = 12;
	before(function(done) {
		mongo.remove('gc', {}, function(error) {
			assert.ifError(error);
			mongo.remove('gc_versioning', {}, function(error) {
				assert.ifError(error);
				done();
			});
		});
	});

	it("success - will login user", function(done) {
		var options = {
			uri: 'http://localhost:4001/login',
			headers: {
				'Content-Type': 'application/json',
				key: extKey
			},
			body: {
				"username": "owner",
				"password": "123456"
			},
			json: true
		};
		request.post(options, function(error, response, body) {
			assert.ifError(error);
			assert.ok(body);
			console.log(JSON.stringify(body));
			soajsauth = body.soajsauth;
			done();
		});
	});

	describe("add gc tests", function() {
		it("success - will add gc", function(done) {
			var params = {
				form: {
					'name': 'news',
					'config': validSchema
				},
				headers: {
					'soajsauth': soajsauth
				}
			};
			executeMyRequest(params, 'cb/add', 'post', function(body) {
				console.log(JSON.stringify(body));
				assert.ok(body.data);
				done();
			});
		});

		it('fail - missing params', function(done) {
			var params = {
				form: {
					"name": "news"
				},
				headers: {
					'soajsauth': soajsauth
				}
			};
			executeMyRequest(params, 'cb/add', 'post', function(body) {
				assert.deepEqual(body.errors.details[0], {"code": 172, "message": "Missing required field: config"});
				done();
			});
		});

		it('fail - gc exists', function(done) {
			var params = {
				form: {
					"name": "news",
					"config": validSchema
				},
				headers: {
					'soajsauth': soajsauth
				}
			};
			executeMyRequest(params, 'cb/add', 'post', function(body) {
				assert.deepEqual(body.errors.details[0], {"code": 700, "message": errorCodes[700]});
				done();
			});
		});

		it('mongo test', function(done) {
			mongo.findOne('gc', {'name': 'news'}, function(error, cbRecord) {
				assert.ifError(error);
				assert.ok(cbRecord);
				cbId = cbRecord._id.toString();
				done();
			});
		});
	});

	describe("update gc tests", function() {
		it("success - will update gc save version", function(done) {
			var params = {
				qs: {"id": cbId},
				form: {
					"config": validSchema
				},
				headers: {
					'soajsauth': soajsauth
				}
			};
			executeMyRequest(params, 'cb/update', 'post', function(body) {
				assert.ok(body.data);
				done();
			});
		});

		it("success - will update gc new version - imfv field change", function(done) {
			var validSchema2 = util.cloneObj(validSchema);
			validSchema2.genericService.config.schema.commonFields['status'] = {
				"req": true,
				"source": ['body.status'],
				"validation": {
					"type": "string",
					'enum': ['published', 'unpublished', 'restricted']
				}
			};
			var params = {
				qs: {"id": cbId},
				form: {
					"config": validSchema2
				},
				headers: {
					'soajsauth': soajsauth
				}
			};
			executeMyRequest(params, 'cb/update', 'post', function(body) {
				assert.ok(body.data);
				done();
			});
		});

		it("success - will update gc new version - imfv new field", function(done) {
			var validSchema3 = util.cloneObj(validSchema);
			validSchema3.genericService.config.schema.commonFields['summary'] = {
				"req": true,
				"source": ['body.summary'],
				"validation": {
					"type": "string"
				}
			};
			var params = {
				qs: {"id": cbId},
				form: {
					"config": validSchema3
				},
				headers: {
					'soajsauth': soajsauth
				}
			};
			executeMyRequest(params, 'cb/update', 'post', function(body) {
				assert.ok(body.data);
				done();
			});
		});

		it("success - will update gc new version - apis fields change", function(done) {
			var validSchema4 = util.cloneObj(validSchema);
			validSchema4.genericService.config.schema.commonFields['summary'] = {
				"req": true,
				"source": ['body.summary'],
				"validation": {
					"type": "string"
				}
			};
			validSchema4.genericService.config.schema['/add'].commonFields.push('summary');
			validSchema4.genericService.config.schema['/update'].commonFields.push('summary');
			var params = {
				qs: {"id": cbId},
				form: {
					"config": validSchema4
				},
				headers: {
					'soajsauth': soajsauth
				}
			};
			executeMyRequest(params, 'cb/update', 'post', function(body) {
				assert.ok(body.data);
				done();
			});
		});

		it("success - will update gc new version - apis wf change", function(done) {
			var validSchema5 = util.cloneObj(validSchema);
			validSchema5.genericService.config.schema.commonFields['summary'] = {
				"req": true,
				"source": ['body.summary'],
				"validation": {
					"type": "string"
				}
			};
			validSchema5.genericService.config.schema['/add'].commonFields.push('summary');
			validSchema5.genericService.config.schema['/update'].commonFields.push('summary');
			validSchema5.soajsService.apis['/list'].workflow['preExec'] = "req.soajs.log.debug(\"YOU HAVE REACHED THE LIST DATA API\");\nnext();";

			var params = {
				qs: {"id": cbId},
				form: {
					"config": validSchema5
				},
				headers: {
					'soajsauth': soajsauth
				}
			};
			executeMyRequest(params, 'cb/update', 'post', function(body) {
				assert.ok(body.data);
				done();
			});
		});

		it("success - will update gc new version - ui list columns added", function(done) {
			var validSchema6 = util.cloneObj(validSchema);
			validSchema6.genericService.config.schema.commonFields['summary'] = {
				"req": true,
				"source": ['body.summary'],
				"validation": {
					"type": "string"
				}
			};
			validSchema6.genericService.config.schema['/add'].commonFields.push('summary');
			validSchema6.genericService.config.schema['/update'].commonFields.push('summary');
			validSchema6.soajsService.apis['/list'].workflow['preExec'] = "req.soajs.log.debug(\"YOU HAVE REACHED THE LIST DATA API\");\nnext();";
			validSchema6.soajsUI.list.columns.push({
				'label': 'Summary',
				'field': 'fields.summary'
			});
			var params = {
				qs: {"id": cbId},
				form: {
					"config": validSchema6
				},
				headers: {
					'soajsauth': soajsauth
				}
			};
			executeMyRequest(params, 'cb/update', 'post', function(body) {
				assert.ok(body.data);
				done();
			});
		});

		it("success - will update gc new version - ui list columns changed", function(done) {
			var validSchema6 = util.cloneObj(validSchema);
			validSchema6.genericService.config.schema.commonFields['summary'] = {
				"req": true,
				"source": ['body.summary'],
				"validation": {
					"type": "string"
				}
			};
			validSchema6.genericService.config.schema['/add'].commonFields.push('summary');
			validSchema6.genericService.config.schema['/update'].commonFields.push('summary');
			validSchema6.soajsService.apis['/list'].workflow['preExec'] = "req.soajs.log.debug(\"YOU HAVE REACHED THE LIST DATA API\");\nnext();";
			validSchema6.soajsUI.list.columns.push({
				'label': 'Content Summary',
				'field': 'fields.summary'
			});
			var params = {
				qs: {"id": cbId},
				form: {
					"config": validSchema6
				},
				headers: {
					'soajsauth': soajsauth
				}
			};
			executeMyRequest(params, 'cb/update', 'post', function(body) {
				assert.ok(body.data);
				done();
			});
		});

		it("success - will update gc new version - ui form add new field", function(done) {
			var validSchema6 = util.cloneObj(validSchema);
			validSchema6.genericService.config.schema.commonFields['summary'] = {
				"req": true,
				"source": ['body.summary'],
				"validation": {
					"type": "string"
				}
			};
			validSchema6.genericService.config.schema['/add'].commonFields.push('summary');
			validSchema6.genericService.config.schema['/update'].commonFields.push('summary');
			validSchema6.soajsService.apis['/list'].workflow['preExec'] = "req.soajs.log.debug(\"YOU HAVE REACHED THE LIST DATA API\");\nnext();";
			validSchema6.soajsUI.list.columns.push({
				'label': 'Content Summary',
				'field': 'fields.summary'
			});
			validSchema6.soajsUI.form.add.push({
				'name': 'summary',
				'label': 'Summary',
				'_type': 'textarea',
				'placeholder': 'News Content Summary...',
				'value': '',
				'tooltip': 'Provide a summary to your news entry',
				'req': false
			});
			var params = {
				qs: {"id": cbId},
				form: {
					"config": validSchema6
				},
				headers: {
					'soajsauth': soajsauth
				}
			};
			executeMyRequest(params, 'cb/update', 'post', function(body) {
				assert.ok(body.data);
				done();
			});
		});

		it("success - will update gc new version - ui form add field changed", function(done) {
			var validSchema6 = util.cloneObj(validSchema);
			validSchema6.genericService.config.schema.commonFields['summary'] = {
				"req": true,
				"source": ['body.summary'],
				"validation": {
					"type": "string"
				}
			};
			validSchema6.genericService.config.schema['/add'].commonFields.push('summary');
			validSchema6.genericService.config.schema['/update'].commonFields.push('summary');
			validSchema6.soajsService.apis['/list'].workflow['preExec'] = "req.soajs.log.debug(\"YOU HAVE REACHED THE LIST DATA API\");\nnext();";
			validSchema6.soajsUI.list.columns.push({
				'label': 'Content Summary',
				'field': 'fields.summary'
			});
			validSchema6.soajsUI.form.add.push({
				'name': 'summary',
				'label': 'Summary',
				'_type': 'editor',
				'placeholder': 'News Content Summary...',
				'value': '',
				'tooltip': 'Provide a summary to your news entry',
				'req': false
			});
			var params = {
				qs: {"id": cbId},
				form: {
					"config": validSchema6
				},
				headers: {
					'soajsauth': soajsauth
				}
			};
			executeMyRequest(params, 'cb/update', 'post', function(body) {
				assert.ok(body.data);
				done();
			});
		});

		it("success - will update gc new version - ui form update new field", function(done) {
			var validSchema6 = util.cloneObj(validSchema);
			validSchema6.genericService.config.schema.commonFields['summary'] = {
				"req": true,
				"source": ['body.summary'],
				"validation": {
					"type": "string"
				}
			};
			validSchema6.genericService.config.schema['/add'].commonFields.push('summary');
			validSchema6.genericService.config.schema['/update'].commonFields.push('summary');
			validSchema6.soajsService.apis['/list'].workflow['preExec'] = "req.soajs.log.debug(\"YOU HAVE REACHED THE LIST DATA API\");\nnext();";
			validSchema6.soajsUI.list.columns.push({
				'label': 'Content Summary',
				'field': 'fields.summary'
			});
			validSchema6.soajsUI.form.add.push({
				'name': 'summary',
				'label': 'Summary',
				'_type': 'editor',
				'placeholder': 'News Content Summary...',
				'value': '',
				'tooltip': 'Provide a summary to your news entry',
				'req': false
			});
			validSchema6.soajsUI.form.update.push({
				'name': 'summary',
				'label': 'Summary',
				'_type': 'textarea',
				'placeholder': 'News Content Summary...',
				'value': '',
				'tooltip': 'Provide a summary to your news entry',
				'req': false
			});
			var params = {
				qs: {"id": cbId},
				form: {
					"config": validSchema6
				},
				headers: {
					'soajsauth': soajsauth
				}
			};
			executeMyRequest(params, 'cb/update', 'post', function(body) {
				assert.ok(body.data);
				done();
			});
		});

		it("success - will update gc new version - ui form update changed", function(done) {
			var validSchema6 = util.cloneObj(validSchema);
			validSchema6.genericService.config.schema.commonFields['summary'] = {
				"req": true,
				"source": ['body.summary'],
				"validation": {
					"type": "string"
				}
			};
			validSchema6.genericService.config.schema['/add'].commonFields.push('summary');
			validSchema6.genericService.config.schema['/update'].commonFields.push('summary');
			validSchema6.soajsService.apis['/list'].workflow['preExec'] = "req.soajs.log.debug(\"YOU HAVE REACHED THE LIST DATA API\");\nnext();";
			validSchema6.soajsUI.list.columns.push({
				'label': 'Content Summary',
				'field': 'fields.summary'
			});
			validSchema6.soajsUI.form.add.push({
				'name': 'summary',
				'label': 'Summary',
				'_type': 'editor',
				'placeholder': 'News Content Summary...',
				'value': '',
				'tooltip': 'Provide a summary to your news entry',
				'req': false
			});
			validSchema6.soajsUI.form.update.push({
				'name': 'summary',
				'label': 'Summary',
				'_type': 'editor',
				'placeholder': 'News Content Summary...',
				'value': '',
				'tooltip': 'Provide a summary to your news entry',
				'req': false
			});
			var params = {
				qs: {"id": cbId},
				form: {
					"config": validSchema6
				},
				headers: {
					'soajsauth': soajsauth
				}
			};
			executeMyRequest(params, 'cb/update', 'post', function(body) {
				assert.ok(body.data);
				done();
			});
		});

		it("success - will update gc new version - api wf type changed", function(done) {
			var validSchema6 = util.cloneObj(validSchema);
			var validSchema6 = util.cloneObj(validSchema);
			validSchema6.genericService.config.schema.commonFields['summary'] = {
				"req": true,
				"source": ['body.summary'],
				"validation": {
					"type": "string"
				}
			};
			validSchema6.genericService.config.schema['/add'].commonFields.push('summary');
			validSchema6.genericService.config.schema['/update'].commonFields.push('summary');
			validSchema6.soajsService.apis['/list'].type = "get";
			validSchema6.soajsService.apis['/list'].method = "post";
			validSchema6.soajsService.apis['/list'].workflow['preExec'] = "req.soajs.log.debug(\"YOU HAVE REACHED THE LIST DATA API\");\nnext();";
			validSchema6.soajsUI.list.columns.push({
				'label': 'Content Summary',
				'field': 'fields.summary'
			});
			validSchema6.soajsUI.form.add.push({
				'name': 'summary',
				'label': 'Summary',
				'_type': 'editor',
				'placeholder': 'News Content Summary...',
				'value': '',
				'tooltip': 'Provide a summary to your news entry',
				'req': false
			});
			validSchema6.soajsUI.form.update.push({
				'name': 'summary',
				'label': 'Summary',
				'_type': 'editor',
				'placeholder': 'News Content Summary...',
				'value': '',
				'tooltip': 'Provide a summary to your news entry',
				'req': false
			});

			var params = {
				qs: {"id": cbId},
				form: {
					"config": validSchema6
				},
				headers: {
					'soajsauth': soajsauth
				}
			};
			executeMyRequest(params, 'cb/update', 'post', function(body) {
				assert.ok(body.data);
				done();
			});
		});

		it("success - will update gc new version - api wf added new step", function(done) {
			var validSchema6 = util.cloneObj(validSchema);
			var validSchema6 = util.cloneObj(validSchema);
			validSchema6.genericService.config.schema.commonFields['summary'] = {
				"req": true,
				"source": ['body.summary'],
				"validation": {
					"type": "string"
				}
			};
			validSchema6.genericService.config.schema['/add'].commonFields.push('summary');
			validSchema6.genericService.config.schema['/update'].commonFields.push('summary');
			validSchema6.soajsService.apis['/list'].type = "get";
			validSchema6.soajsService.apis['/list'].method = "post";
			validSchema6.soajsService.apis['/list'].workflow['preExec'] = "req.soajs.log.debug(\"YOU HAVE REACHED THE LIST DATA API\");\nnext();";
			validSchema6.soajsService.apis['/list'].workflow['postExec'] = "req.soajs.log.debug(\"YOU ARE LEAVING THE LIST DATA API\");\nnext();";

			validSchema6.soajsUI.list.columns.push({
				'label': 'Content Summary',
				'field': 'fields.summary'
			});
			validSchema6.soajsUI.form.add.push({
				'name': 'summary',
				'label': 'Summary',
				'_type': 'editor',
				'placeholder': 'News Content Summary...',
				'value': '',
				'tooltip': 'Provide a summary to your news entry',
				'req': false
			});
			validSchema6.soajsUI.form.update.push({
				'name': 'summary',
				'label': 'Summary',
				'_type': 'editor',
				'placeholder': 'News Content Summary...',
				'value': '',
				'tooltip': 'Provide a summary to your news entry',
				'req': false
			});

			var params = {
				qs: {"id": cbId},
				form: {
					"config": validSchema6
				},
				headers: {
					'soajsauth': soajsauth
				}
			};
			executeMyRequest(params, 'cb/update', 'post', function(body) {
				assert.ok(body.data);
				done();
			});
		});

		it('fail - missing params', function(done) {
			var params = {
				qs: {"id": cbId},
				form: {},
				headers: {
					'soajsauth': soajsauth
				}
			};
			executeMyRequest(params, 'cb/update', 'post', function(body) {
				assert.deepEqual(body.errors.details[0], {"code": 172, "message": "Missing required field: config"});
				done();
			});
		});

		it('fail - invalid gc id provided', function(done) {
			var params = {
				qs: {"id": "aaaabbbbccc"},
				form: {
					"config": validSchema
				},
				headers: {
					'soajsauth': soajsauth
				}
			};
			executeMyRequest(params, 'cb/update', 'post', function(body) {
				assert.deepEqual(body.errors.details[0], {"code": 701, "message": errorCodes[701]});
				done();
			});
		});

		it('fail - invalid gc id provided', function(done) {
			var newCbId = cbId.toString();
			newCbId = newCbId.replace(newCbId[newCbId.length -1], newCbId[newCbId.length -2]);
			var params = {
				qs: {"id": newCbId},
				form: {
					"config": validSchema
				},
				headers: {
					'soajsauth': soajsauth
				}
			};
			executeMyRequest(params, 'cb/update', 'post', function(body) {
				assert.deepEqual(body.errors.details[0], {"code": 702, "message": errorCodes[702]});
				done();
			});
		});

		it('mongo test', function(done) {
			mongo.findOne('gc', {'name': 'news'}, function(error, cbRecord) {
				assert.ifError(error);
				assert.ok(cbRecord);
				assert.equal(cbRecord.v, latestV);
				mongo.find('gc_versioning', {'name': 'news'}, function(error, cbRecords) {
					assert.ifError(error);
					assert.equal(cbRecords.length, oldVTotal);
					done();
				});
			});
		});
	});

	describe("get gc tests", function() {
		it('fail - missing params', function(done) {
			var params = {
				qs: {},
				headers: {
					'soajsauth': soajsauth
				}
			};
			executeMyRequest(params, 'cb/get', 'get', function(body) {
				assert.deepEqual(body.errors.details[0], {"code": 172, "message": "Missing required field: id"});
				done();
			});
		});

		it('fail - invalid gc id provided', function(done) {
			var params = {
				qs: {'id': 'aaaabbcdddd'},
				headers: {
					'soajsauth': soajsauth
				}
			};
			executeMyRequest(params, 'cb/get', 'get', function(body) {
				assert.deepEqual(body.errors.details[0], {"code": 701, "message": errorCodes[701]});
				done();
			});
		});

		it('fail - gc not found', function(done) {
			var newCbId = cbId.toString();
			newCbId = newCbId.replace(newCbId[newCbId.length -1], newCbId[newCbId.length -2]);
			var params = {
				qs: {'id': newCbId},
				headers: {
					'soajsauth': soajsauth
				}
			};
			executeMyRequest(params, 'cb/get', 'get', function(body) {
				assert.deepEqual(body.errors.details[0], {"code": 702, "message": errorCodes[702]});
				done();
			});
		});

		it("success - will get gc", function(done) {
			var params = {
				qs: {'id': cbId},
				headers: {
					'soajsauth': soajsauth
				}
			};
			executeMyRequest(params, 'cb/get', 'get', function(body) {
				assert.ok(body.data);
				done();
			});
		});

		it("success - will get gc specific version", function(done) {
			var params = {
				qs: {'id': cbId, 'version': 1},
				headers: {
					'soajsauth': soajsauth
				}
			};
			executeMyRequest(params, 'cb/get', 'get', function(body) {
				assert.ok(body.data);
				done();
			});
		});

		it('mongo test', function(done) {
			mongo.findOne('gc', {'name': 'news'}, function(error, cbRecord) {
				assert.ifError(error);
				assert.ok(cbRecord);
				assert.equal(cbRecord.v, latestV);
				mongo.find('gc_versioning', {'name': 'news'}, function(error, cbRecords) {
					assert.ifError(error);
					assert.equal(cbRecords.length, oldVTotal);
					done();
				});
			});
		});
	});

	describe("list gc tests", function() {
		it("success - will get list", function(done) {
			executeMyRequest({
				headers: {
					'soajsauth': soajsauth
				}
			}, 'cb/list', 'get', function(body) {
				assert.ok(body.data);
				assert.equal(body.data.length, 1);
				done();
			});
		});
	});

	describe("list gc revisions tests", function() {
		it("success - will get list of revisions", function(done) {
			executeMyRequest({
				headers: {
					'soajsauth': soajsauth
				}
			}, 'cb/listRevisions', 'get', function(body) {
				assert.ok(body.data);
				done();
			});
		});
	});

});