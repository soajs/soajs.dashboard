"use strict";

function getGitDriver (config) {
    var gitDriver;

    try {
        gitDriver = require(__dirname + "/gitProviders/" + config.provider + ".js");
    }
    catch (e) {
        gitDriver = null;
    }

    return gitDriver;
}

var git = {

    "login": function (data, mongo, options, cb) {
        var driver = getGitDriver({provider: options.provider});
        if (!driver) {
            return cb ({message: 'Git driver does not exist'});
        }

        driver.login(data, mongo, options, cb);
    },

    "logout": function (data, mongo, options, cb) {
        var driver = getGitDriver({provider: options.provider});
        if (!driver) {
            return cb ({message: 'Git driver does not exist'});
        }

        driver.logout(data, mongo, options, cb);
    },

    "getRepos": function (data, mongo, options, cb) {
        var driver = getGitDriver({provider: options.provider});
        if (!driver) {
            return cb ({message: 'Git driver does not exist'});
        }

        driver.getRepos(data, mongo, options, cb);
    },

    "getBranches": function (data, mongo, options, cb) {
        var driver = getGitDriver({provider: options.provider});
        if (!driver) {
            return cb ({message: 'Git driver does not exist'});
        }

        driver.getBranches(data, mongo, options, cb);
    },

    "getContent": function (options, cb) {
        var driver = getGitDriver({provider: options.provider});
        if (!driver) {
            return cb ({message: 'Git driver does not exist'});
        }

        driver.getContent(options, cb);
    }
};

module.exports = git;
