"use strict";

function getGitDriver (config) {
    var gitDriver = require(__dirname + "/gitProviders/" + config.provider + ".js");
    return gitDriver;
}

var git = {

    "login": function (data, mongo, options, cb) {
        var driver = getGitDriver({provider: options.provider});
        driver.login(data, mongo, options, cb);
    },

    "logout": function (data, mongo, options, cb) {
        var driver = getGitDriver({provider: options.provider});
        driver.logout(data, mongo, options, cb);
    },

    "getRepos": function (data, mongo, options, cb) {
        var driver = getGitDriver({provider: options.provider});
        driver.getRepos(data, mongo, options, cb);
    },

    "getBranches": function (data, mongo, options, cb) {
        var driver = getGitDriver({provider: options.provider});
        driver.getBranches(data, mongo, options, cb);
    },

    "getContent": function (options, cb) {
        var driver = getGitDriver({provider: options.provider});
        driver.getContent(options, cb);
    }
};

module.exports = git;
