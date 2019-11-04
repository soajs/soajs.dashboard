"use strict";

const assert = require('assert');
var request = require("request");

var Mongo = require("soajs.core.modules").mongo;
var dbConfig = require("./db.config.test.js");

var dashboardConfig = dbConfig();
dashboardConfig.name = "core_provision";
var mongo = new Mongo(dashboardConfig);

const extKey = 'aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac';

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
describe("Testing console version Functionality", function() {

    describe("Testing get console version", function(){
        it("Success - get version before insertion", function (done){
            executeMyRequest({}, "version", 'get', function (result) {
                assert.ok(result.data);
                assert.ok(result.result);
                done();
            });
        });
	
	    it("Success - get version after insertion", function (done){
		    executeMyRequest({}, "version", 'get', function (result) {
			    assert.ok(result.data);
			    assert.ok(result.result);
			    done();
		    });
	    });
    });
	
	describe("Testing check console version", function(){
		it("Success - get version before insertion", function (done){
			executeMyRequest({}, "version/check", 'get', function (result) {
				assert.ok(result.data);
				assert.ok(result.result);
				done();
			});
		});
		
		it("Success - get version after insertion", function (done){
			executeMyRequest({}, "version/check", 'get', function (result) {
				assert.ok(result.data);
				assert.ok(result.result);
				done();
			});
		});
	});

    after(function(done) {
        mongo.closeDb();
        done();
    });
});
