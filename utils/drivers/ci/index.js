"use strict";
const fs = require('fs');
const errorFile = require("../../errors.js");

let cache = {};

function checkIfSupported(options, cb, fcb) {
    let isSupported = ((options.driver[options.function] && typeof (options.driver[options.function]) === 'function') ? true : false);

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

        let path = __dirname + "/strategies/" + options.driver + ".js";

        checkStrategy(path, (error) => {
            if (error) return cb(error);

            try {
                cache[options.driver] = require(path);
            }
            catch (e) {
                console.log("Error");
                console.log(e);
                return cb(e);
            }

            return cb(null, cache[options.driver]);
        });
    });

    function checkCache(options, cb) {
        if (cache[options.driver]) {
            return cb(null, cache[options.driver]);
        }

        return cb();
    }

    function checkStrategy(path, cb) {
        fs.access(path, fs.constants.F_OK | fs.constants.R_OK, cb);
    }
}

function checkError(error, code, cb, fcB){
	if (error) {
		return cb({code: code, message: error.message });
	} else {
		if (fcB) return fcB();
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
            checkError(error, 969, cb, () => {
                checkIfSupported({driver: strategy, function: 'generateToken'}, cb, () => {
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
            checkError(error, 969, cb, () => {
                checkIfSupported({driver: strategy, function: 'listRepos'}, cb, () => {
                    strategy.listRepos(options, cb);
                });
            });
        });
    },
};


