"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");
var helpers = helper.requireModule('./lib/helpers/git.js');
var config = helper.requireModule('./config.js');

var mongoStub = {
	checkForMongo: function (soajs) {
		return true;
	},
	validateId: function (soajs, cb) {
		return cb(null, soajs.inputmaskData.id);
	},
	findEntry: function (soajs, opts, cb) {
		cb(null, { metadata: {} });
	},
	removeEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	saveEntry: function (soajs, opts, cb) {
		cb(null, true);
	}
};

describe("testing helper git.js", function () {
	var soajs = {
		// uracDriver: {},
		inputmaskData: {},
		tenant: {}
	};
	var req = {
		soajs: soajs
	};
	describe("comparePaths", function () {
		beforeEach(() => {
		});
		var remote = [];
		var local = [];
		it("Test 1: will remove", function (done) {
			remote = [ '/sample1', '/sample2', '/sample3', '/sample4' ];
			local = [
				{
					contentType: 'service',
					contentName: 'sampleFake1',
					path: '/sampleFake1/config.js',
					sha: '95b14565e3fdd0048e351493056025a7020ea561'
				},
				{
					contentType: 'daemon',
					contentName: 'sampleFake2',
					path: '/sampleFake2/config.js',
					sha: '15b14565e3fdd0048e351493056025a7020ea561'
				},
				{
					contentType: 'static',
					contentName: 'sampleFake3',
					path: '/sampleFake3/config.js',
					sha: '15b14565e3fdd0048e351493056025a7020ea567'
				}
			];
			soajs.inputmaskData = {
				id: '592d8b62448c393e25964d0b',
				provider: 'github',
				owner: 'soajsTestAccount',
				repo: 'test.successMulti'
			};
			helpers.comparePaths(req, config, remote, local, function (error, body) {
				done();
			});
		});

		it("Test 2: will sync", function (done) {
			remote = [ '/sample1', '/sample2', '/sample3', '/sample4' ];
			local = [
				{
					contentType: 'service',
					contentName: 'samplesuccess1',
					path: '/sample1/config.js',
					sha: '6cbeae3ed88e9e3296e05fd52a48533ba53c0931'
				},
				{
					contentType: 'service',
					contentName: 'samplesuccess2',
					path: '/sample2/config.js',
					sha: '6cbeae3ed88e9e3296e05fd52a48533ba53c0931'
				},
				{
					contentType: 'daemon',
					contentName: 'sampledaemonsuccess1',
					path: '/sample3/config.js',
					sha: '6cbeae3ed88e9e3296e05fd52a48533ba53c0931'
				},
				{
					contentType: 'static',
					contentName: 'sampletest4',
					path: '/sample4/config.js',
					sha: '6cbeae3ed88e9e3296e05fd52a48533ba53c0931'
				}
			];
			soajs.inputmaskData = {
				id: '592d8befa60dc176250235a8',
				provider: 'github',
				owner: 'soajsTestAccount',
				repo: 'test.successMulti'
			};
			helpers.comparePaths(req, config, remote, local, function (error, body) {
				done();
			});
		});

	});
	
});