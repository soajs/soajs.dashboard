"use strict";
const errorFile = require("../../errors.js");
let cache = {};

function checkIfSupported(options, cb, fcb) {
    let isSupported = ((options.strategy[options.function] && typeof (options.strategy[options.function]) === 'function') ? true : false);

    if (isSupported) return fcb();
    else return cb({
        "error": "error",
        "code": 970,
        "msg": errorFile[970]
    });
}

function getStrategy(options, cb) {
    checkCache(options, (error, strategy) => {
        if (strategy) return cb(null, strategy);

        let path = __dirname + "/strategies/" + options.strategy + ".js";

        checkStrategy(path, (error) => {
            if (error) return cb(error);

            try {
                cache[options.strategy] = require(path);
            }
            catch (e) {
                console.log("Error");
                console.log(e);
                return cb(e);
            }

            return cb(null, cache[options.strategy]);
        });
    });

    function checkCache(options, cb) {
        if (cache[options.strategy]) {
            return cb(null, cache[options.strategy]);
        }

        return cb();
    }

    function checkStrategy(path, cb) {
        fs.access(path, fs.constants.F_OK | fs.constants.R_OK, cb);
    }
}

module.exports = {
    /**
     * Generate a travis token from a Github token
     * @param opts
     * @param cb
     */
    generateToken (options, cb) {
        getStrategy(options, (error, strategy) => {
            utils.checkError(error, 969, cb, () => {
                checkIfSupported({strategy: strategy, function: 'generateToken'}, cb, () => {
                    strategy.generateToken(options, cb);
                });
            });
        });
    },

    /**
     * Lists all repos or a specific repo for a repo owner
     * @param opts
     * @param cb
     */
    listRepos (options, cb) {
        getStrategy(options, (error, strategy) => {
            utils.checkError(error, 969, cb, () => {
                checkIfSupported({strategy: strategy, function: 'listRepos'}, cb, () => {
                    strategy.listRepos(options, cb);
                });
            });
        });
    },
};


