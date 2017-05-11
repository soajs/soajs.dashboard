"use strict";

const travis = require("../strategyFunctions/travis.js");

const engine = {
    'generateToken': function(options, cb){
        travis.generateToken(options, cb);
    },

    'listRepos': function(options, cb){
        travis.listRepos(options, cb);
    },
};

module.exports = engine;