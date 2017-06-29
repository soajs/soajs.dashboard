"use strict";
const fs = require('fs');

function getStrategy(options, cb) {
	let path = __dirname + "/" + options.driver + "/index.js";

	checkStrategy(path, (error) => {
		if (error) return cb(error);
		return cb(null, require(path));
	});

	function checkStrategy(path, cb) {
		fs.access(path, fs.constants.F_OK | fs.constants.R_OK, cb);
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
	 * @param opts
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
	 * @param opts
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
	 * @param opts
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
	 * @param opts
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
	 * @param opts
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
	 * @param opts
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
	 * @param opts
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
	 * @param opts
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
	
	getFileName(options, cb){
		getStrategy(options, (error, strategy) => {
			checkError(error, 969, cb, () => {
				strategy.getFileName(cb);
			});
		});
	}
};
