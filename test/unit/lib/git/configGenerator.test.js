"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");
var helpers = helper.requireModule('./lib/git/configGenerator.js');

describe("testing helper git.js", function () {
    it("Fail - Bad config path", function(done){
       var configPath = "bad path";
       var yamlPath = __dirname + "/../../../uploads/generateConfigFiles/badYamlFile.yml";
        helpers.generate(configPath, yamlPath, function(err, res){
            assert.ok(err);
            assert.deepEqual(err, {
                "code": 983,
                "msg": "Bad syntax found in the config file."
            });
        });
        done();
    });

    it("Fail - Cannot parse Yaml file", function(done){
        var configPath = __dirname + "/../../../uploads/generateConfigFiles/configFile.js";
        var yamlPath =  __dirname + "/../../../uploads/valid.tar";
        helpers.generate(configPath, yamlPath, function(err, res){
            assert.ok(err);
            assert.deepEqual(err, {
                code: 984,
                msg: 'Unable to parse.'
            });
        });
        done();
    });

    it("Fail - Bad Yaml file", function(done){
        var configPath = __dirname + "/../../../uploads/generateConfigFiles/configFile.js";
        var yamlPath = __dirname + "/../../../uploads/generateConfigFiles/badYamlFile.yml";
        helpers.generate(configPath, yamlPath, function(err, res){
            assert.ok(err);
            assert.deepEqual(err, {
                code: 985,
                msg: 'Yaml file was converted to a string'
            });
        });
        done();
    });

    it("Fail - Empty Yaml file", function(done){
        var configPath = __dirname + "/../../../uploads/generateConfigFiles/configFile.js";
        var yamlPath = __dirname + "/../../../uploads/generateConfigFiles/emptyYamlFile.yml";
        helpers.generate(configPath, yamlPath, function(err, res){
            assert.ok(err);
            assert.deepEqual(err, {
                code: 985,
                msg: 'Cannot read property \'paths\' of null'
            });
        });
        done();
    });

    it("Fail - No summary for API", function(done){
        var configPath = __dirname + "/../../../uploads/generateConfigFiles/configFile.js";
        var yamlPath = __dirname + "/../../../uploads/generateConfigFiles/noSummary.yml";
        helpers.generate(configPath, yamlPath, function(err, res){
           assert.ok(err);
            assert.deepEqual(err, {
                code: 985,
                msg: 'Please enter a summary for API oneMethod: onePath you want to build.'
            });
        });
        done();
    });

    it("Success - config file generated", function(done){
        var configPath = __dirname + "/../../../uploads/generateConfigFiles/configFile.js";
        var yamlPath = __dirname + "/../../../uploads/generateConfigFiles/validYamlFile.yml";
        helpers.generate(configPath, yamlPath, function(err, res){
            assert.ok(res)
        });
        done();
    });
});