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

    /**
     * Lists all environment variables available for a repo
     * @param opts
     * @param cb
     */
    listEnvVars (options, cb) {
        getStrategy(options, (error, strategy) => {
            checkError(error, 969, cb, () => {
                checkIfSupported({driver: strategy, function: 'listEnvVars'}, cb, () => {
                    strategy.listEnvVars(options, cb);
                });
            });
        });
    },

    /**
     * Add an environment variable to a repo
     * @param opts
     * @param cb
     */
    addEnvVar (options, cb) {
        getStrategy(options, (error, strategy) => {
            checkError(error, 969, cb, () => {
                checkIfSupported({driver: strategy, function: 'addEnvVar'}, cb, () => {
                    strategy.listRepos(addEnvVar, cb);
                });
            });
        });
    },

    /**
     * LUpdate an environment variable for a repo
     * @param opts
     * @param cb
     */
    updateEnvVar (options, cb) {
        getStrategy(options, (error, strategy) => {
            checkError(error, 969, cb, () => {
                checkIfSupported({driver: strategy, function: 'updateEnvVar'}, cb, () => {
                    strategy.updateEnvVar(options, cb);
                });
            });
        });
    },

    /**
     * Delete an environment variable from a repo
     * @param opts
     * @param cb
     */
    deleteEnvVar (options, cb) {
        getStrategy(options, (error, strategy) => {
            checkError(error, 969, cb, () => {
                checkIfSupported({driver: strategy, function: 'deleteEnvVar'}, cb, () => {
                    strategy.deleteEnvVar(options, cb);
                });
            });
        });
    },

    /**
     * Lists the state of each repo
     * @param opts
     * @param cb
     */
    listHooks (options, cb) {
        getStrategy(options, (error, strategy) => {
            checkError(error, 969, cb, () => {
                checkIfSupported({driver: strategy, function: 'listHooks'}, cb, () => {
                    strategy.listHooks(options, cb);
                });
            });
        });
    },

    /**
     * Enables/desables a repo
     * @param opts
     * @param cb
     */
    setHook (options, cb) {
        getStrategy(options, (error, strategy) => {
            checkError(error, 969, cb, () => {
                checkIfSupported({driver: strategy, function: 'setHook'}, cb, () => {
                    strategy.setHook(options, cb);
                });
            });
        });
    },

    /**
	 * Function that lists general settings of a travis repo
	 * @param  {Object}   options
	 * @param  {Function} cb
	 *
	 */
    listSettings(options, cb) {
        getStrategy(options, (error, strategy) => {
            checkError(error, 969, cb, () => {
                checkIfSupported({driver: strategy, function: 'listSettings'}, cb, () => {
                    strategy.listSettings(options, cb);
                });
            });
        });
    }
};
