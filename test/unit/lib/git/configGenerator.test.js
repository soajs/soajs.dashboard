"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");
var helpers = helper.requireModule('./lib/git/configGenerator.js');

describe("testing helper git.js", function () {
    it("Bad config path", function(done){
       var configPath = "bad path";
       var yamlPath = __dirname + "/../../../uploads/generateConfigBadYamlFile.yml";
        helpers.generate(configPath, yamlPath, function(err, res){
            assert.ok(err);
            assert.deepEqual(err, {
                "code": 983,
                "msg": "Bad syntax found in the config file."
            });
        });
        done();
    });

    it("No Yaml file", function(done){
        var configPath = __dirname + "/../../../uploads/generateConfigConfigFile.js";
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

    it("Bad Yaml file", function(done){
        var configPath = __dirname + "/../../../uploads/generateConfigConfigFile.js";
        var yamlPath = __dirname + "/../../../uploads/generateConfigBadYamlFile.yml";
        helpers.generate(configPath, yamlPath, function(err, res){
            assert.ok(err);
            assert.deepEqual(err, {
                code: 985,
                msg: 'Yaml file was converted to a string'
            });
        });
        done();
    });

    it("Empty Yaml file", function(done){
        var configPath = __dirname + "/../../../uploads/generateConfigConfigFile.js";
        var yamlPath = __dirname + "/../../../uploads/generateConfigEmptyYamlFile.yml";
        helpers.generate(configPath, yamlPath, function(err, res){
            assert.ok(err);
            assert.deepEqual(err, {
                code: 985,
                msg: 'Cannot read property \'paths\' of null'
            });
        });
        done();
    });
});