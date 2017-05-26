"use strict";
var fs = require('fs');
var assert = require('assert');
var request = require("request");
var helper = require("../helper.js");

var config = helper.requireModule('./config');
var extKey = 'aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac';

var config = {
  "config": {
      "driver": "travis",
      "settings": {
          "domain": "api.travis-ci.org",
          "owner": "soajsTestAccount",
          "gitToken": "177231bdd9f3727ddbd3e8c5281bf95383e90426"
      },
      "recipe": "",
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

describe("DASHBOARD TESTS: Continuous integration", function (){

    it("Success - Save config (without recipe)", function(done){
        var params = {};
        params.form = config;

        executeMyRequest(params, 'ci', 'post', function (body) {
            assert.ok(body.data);
            assert.ok(body.result);
            done();
        });
    });

    it("Success - Save config (with recipe)", function(done){
    	
    	fs.readFile(__dirname + "/../uploads/.travis.yml", {"encoding": "utf8"}, function(error, data){
    		assert.ifError(error);
    		assert.ok(data);
    		
	        var params = {};
	        params.form = config;
	        params.form.config.recipe = data;
	        executeMyRequest(params, 'ci', 'post', function (body) {
	            assert.ok(body.data);
	            assert.ok(body.result);
	            done();
	        });
	    })
    });

    it("Success - get config", function(done){
        var params = {
            "qs": {
            	"port":80
            }
        };

        executeMyRequest(params, 'ci', 'get', function (body) {
        	console.log(JSON.stringify(body, null, 2));
            assert.ok(body.result);
            done();
        });
    });

    it("Success - download recipe", function(done){
	    var options = {
		    uri: 'http://localhost:4000/dashboard/ci/download',
		    headers: {
			    'Content-Type': 'application/json',
			    'Accept': 'application/zip',
			    key: extKey
		    },
		    json: true
	    };
		request.get(options).pipe(fs.createWriteStream("./ci.zip")).on('close', function(){
			fs.exists("./ci.zip", function(exists){
				assert.equal(exists, true);
				done();
			});
		});
    });

    it.skip("Success - Enable Repo", function(done){
        var params = {
            "qs": {
                "id": 12464664,
                "enable": true
            }
        };

        executeMyRequest(params, 'ci/status', 'get', function (body) {
            assert.ok(body.data);
            assert.ok(body.result);
            done();
        });
    });

    it.skip("Success - Disable Repo", function(done){
        var params = {
            "qs": {
                "id": 12464664,
                "enable": false
            }
        };

        executeMyRequest(params, 'ci/status', 'get', function (body) {
            assert.ok(body.data);
            assert.ok(body.result);
            done();
        });
    });

    it.skip("Success - get repo settings", function(done){
        var params = {
            "qs": {
                "id": 12464664
            }
        };

        executeMyRequest(params, 'ci/settings', 'get', function (body) {
            assert.ok(body.result);
            done();
        });
    });

    it.skip("Success - get repo settings", function(done){
        var params = {
            "qs": {
                "id": 12464664
            },
            "form":{
                "port": 30,
                "settings": {},
                "variables":{
                    "var1": "val1",
                    "var2": "val2"
                }
            }
        };

        executeMyRequest(params, 'ci/settings', 'put', function (body) {
            assert.ok(body.data);
            assert.ok(body.result);
           done();
        });
    });


    it.skip("Success - get repo settings", function(done){
        var params = {
            "form":{
                "port": 30,
            }
        };
        executeMyRequest(params, 'ci/sync', 'get', function (body) {
            console.log(JSON.stringify(body,null,2));
            done();
        });
    });
});