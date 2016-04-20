"use strict";

function getGitDriver (config) {
    var gitDriver = require("./gitProviders/" + config.provider + ".js");
    return gitDriver;
}

var git = {

    "login": function (mongo, options, cb) {
        var driver = getGitDriver({provider: options.provider});
        driver.login(mongo, options, cb);
    },

    "logout": function (mongo, options, cb) {
        var driver = getGitDriver({provider: options.provider});
        driver.logout(mongo, options, cb);
    },

    "getRepos": function (mongo, options, cb) {
        var driver = getGitDriver({provider: options.provider});
        driver.getRepos(mongo, options, cb);
    },

    "getBranches": function (mongo, options, cb) {
        var driver = getGitDriver({provider: options.provider});
        driver.getBranches(mongo, options, cb);
    },

    "getContent": function (options, cb) {
        var driver = getGitDriver({provider: options.provider});
        driver.getContent(options, cb);
    }
};

module.exports = git;
