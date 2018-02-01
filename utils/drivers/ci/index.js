"use strict";
const fs = require('fs');

function getStrategy(options, cb) {
	let path = __dirname + "/" + options.driver + "/index.js";

	checkStrategy(path, (error) => {
		if (error) return cb(error);
		return cb(null, require(path));
	});

	function checkStrategy(path, cb) {
		// using (fs.constants || fs) for Node compatibility issues
		// fs.constants was introduced in Node V6.3.0 only
		// refer to https://github.com/nodejs/node/issues/8044
		fs.access(path, (fs.constants || fs).F_OK | (fs.constants || fs).R_OK, cb);
	}
}

function checkError(error, code, cb, fcB) {
	if (error) {
		return cb({code: code, message: error.message});
	} else {
		if (fcB) return fcB();
	}
}

module.exports = {
	/**
	 * Generate a travis token from a Github token
	 * @param options
	 * @param cb
	 */
	generateToken (options, cb) {
		getStrategy(options, (error, strategy) => {
			checkError(error, 969, cb, () => {
				strategy.generateToken(options, cb);
			});
		});
	},

	/**
	 * Lists all repos or a specific repo for a repo owner
	 * @param options
	 * @param cb
	 */
	listRepos (options, cb) {
		getStrategy(options, (error, strategy) => {
			checkError(error, 969, cb, () => {
				strategy.listRepos(options, cb);
			});
		});
	},

	/**
	 * Lists all environment variables available for a repo
	 * @param options
	 * @param cb
	 */
	listEnvVars (options, cb) {
		getStrategy(options, (error, strategy) => {
			checkError(error, 969, cb, () => {
				strategy.listEnvVars(options, cb);
			});
		});
	},

    /**
	 * Update all environment variables available for a repo
	 * @param options
	 * @param cb
	 */
	ensureRepoVars (options, cb) {
		getStrategy(options, (error, strategy) => {
			checkError(error, 969, cb, () => {
				strategy.ensureRepoVars(options, cb);
			});
		});
	},

	/**
	 * Add an environment variable to a repo
	 * @param options
	 * @param cb
	 */
	addEnvVar (options, cb) {
		getStrategy(options, (error, strategy) => {
			checkError(error, 969, cb, () => {
				strategy.addEnvVar(options, cb);
			});
		});
	},

	/**
	 * LUpdate an environment variable for a repo
	 * @param options
	 * @param cb
	 */
	updateEnvVar (options, cb) {
		getStrategy(options, (error, strategy) => {
			checkError(error, 969, cb, () => {
				strategy.updateEnvVar(options, cb);
			});
		});
	},

	/**
	 * Delete an environment variable from a repo
	 * @param options
	 * @param cb
	 */
	deleteEnvVar (options, cb) {
		getStrategy(options, (error, strategy) => {
			checkError(error, 969, cb, () => {
				strategy.deleteEnvVar(options, cb);
			});
		});
	},

	/**
	 * Enables/desables a repo
	 * @param options
	 * @param cb
	 */
	setHook (options, cb) {
		getStrategy(options, (error, strategy) => {
			checkError(error, 969, cb, () => {
				strategy.setHook(options, cb);
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
				strategy.listSettings(options, cb);
			});
		});
	},

	/**
	 * Function that updates general settings of a travis repo
	 * @param  {Object}   options
	 * @param  {Function} cb
	 *
	 */
	updateSettings(options, cb) {
		getStrategy(options, (error, strategy) => {
			checkError(error, 969, cb, () => {
				strategy.updateSettings(options, cb);
			});
		});
	},
	
	/**
	 * Get File
	 * @param  {Object}   options
	 * @param  {Function} cb
	 *
	 */
	getFileName(options, cb){
		getStrategy(options, (error, strategy) => {
			checkError(error, 969, cb, () => {
				strategy.getFileName(cb);
			});
		});
	},
	
	/**
	 * Return Build Logs of a Repo
	 * @param  {Object}   options
	 * @param  {Function} cb
	 *
	 */
	getRepoBuilds(options, cb){
		getStrategy(options, (error, strategy) => {
			checkError(error, 969, cb, () => {
				strategy.getRepoBuilds(options, cb);
			});
		});
	}
};
