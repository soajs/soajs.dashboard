"use strict";

const travis = require("../strategyFunctions/travis.js");

const engine = {
    'generateToken': function(options, cb){
        travis.generateToken(options, cb);
    },

    'listRepos': function(options, cb){
        travis.listRepos(options, cb);
    },

    'listEnvVars': function(options, cb){
        travis.listEnvVars(options, cb);
    },

    'addEnvVar': function(options, cb){
        travis.addEnvVar(options, cb);
    },

    'updateEnvVar': function(options, cb){
        travis.updateEnvVar(options, cb);
    },

    'deleteEnvVar': function(options, cb){
        travis.deleteEnvVar(options, cb);
    },

    'listHooks': function(options, cb){
        travis.listHooks(options, cb);
    },

    'setHook': function(options, cb){
        travis.setHook(options, cb);
    },

    'listSettings': function (options, cb) {
        travis.listSettings(options, cb);
    }
};

module.exports = engine;
