"use strict";

function getGitDriver (config) {
    var gitDriver;

    try {
        gitDriver = require(__dirname + "/git/" + config.provider + ".js");
    }
    catch (e) {
        gitDriver = null;
    }

    return gitDriver;
}

var git = {

    "login": function (soajs, data, model, options, cb) {
        var driver = getGitDriver({provider: options.provider});
        if (!driver) {
            return cb ({code: 778, message: 'Git driver does not exist'});
        }

        driver.login(soajs, data, model, options, cb);
    },

    "logout": function (soajs, data, model, options, cb) {
        var driver = getGitDriver({provider: options.provider});
        if (!driver) {
            return cb ({code: 778, message: 'Git driver does not exist'});
        }

        driver.logout(soajs, data, model, options, cb);
    },

    "getRepos": function (soajs, data, model, options, cb) {
        var driver = getGitDriver({provider: options.provider});
        if (!driver) {
            return cb ({code: 778, message: 'Git driver does not exist'});
        }

        driver.getRepos(soajs, data, model, options, cb);
    },

    "getBranches": function (soajs, data, model, options, cb) {
        var driver = getGitDriver({provider: options.provider});
        if (!driver) {
            return cb ({code: 778, message: 'Git driver does not exist'});
        }

        driver.getBranches(soajs, data, model, options, cb);
    },

    "getJSONContent": function (soajs, data, model, options, cb) {
        var driver = getGitDriver({provider: options.provider});
        if (!driver) {
            return cb ({code: 778, message: 'Git driver does not exist'});
        }

        driver.getJSONContent(soajs, data, model, options, cb);
    },

    "getAnyContent": function (soajs, data, model, options, cb) {
        var driver = getGitDriver({provider: options.provider});
        if (!driver) {
            return cb ({code: 778, message: 'Git driver does not exist'});
        }

        driver.getAnyContent(soajs, data, model, options, cb);
    }
};

module.exports = git;
