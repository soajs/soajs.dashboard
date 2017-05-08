'use strict';

module.exports = {

    /**
     * Check if error is available and return it in response, else return callback function
     *
     * @param {Object} soajs
     * @param {Object} data
     * @param {Response Object} res
     * @param {Callback Function} cb
     */
    checkIfError: function (soajs, res, data, cb) {
	    if (data.error) {
		    if (data.error.source === 'driver') {
			    soajs.log.error(data.error);
			    return res.jsonp(soajs.buildResponse({"code": data.error.code, "msg": data.error.msg}));
		    }

		    if (typeof (data.error) === 'object') {
			    soajs.log.error(data.error);
		    }

		    return res.jsonp(soajs.buildResponse({"code": data.code, "msg": data.config.errors[data.code]}));
	    } else {
		    if (cb) return cb();
	    }
    },

	/**
	 * Same as checkIfError; but with callback instead of res
	 *
	 * @param {Object} soajs
	 * @param {Callback Function} mainCb
	 * @param {Object} data
	 * @param {Callback Function} cb
	 */
	checkErrorReturn: function (soajs, mainCb, data, cb) {
		if (data.error) {
			if (data.error.source === 'driver') {
				soajs.log.error(data.error);
				return mainCb({"code": data.error.code, "msg": data.error.msg});
			}

			if (typeof (data.error) === 'object' && (data.error.message || data.error.msg)) {
				soajs.log.error(data.error);
			}

			return mainCb({"code": data.code, "msg": data.config.errors[data.code]});
		} else {
			if (cb) {
				return cb();
			}
		}
	},

    /**
     * Build an object that contains required values to be included when calling a soajs.core.drivers function
     *
     * @param {Object} envRecord
     * @param {Object} soajs
     * @returns {Object} options
     */
    buildDeployerOptions: function (envRecord, soajs, BL) {
        var options = {};
        var envDeployer = envRecord.deployer;

        if (!envDeployer) return null;
        if (Object.keys(envDeployer).length === 0) return null;
        if (!envDeployer.type || !envDeployer.selected) return null;
        if (envDeployer.type === 'manual') return null;

        var selected = envDeployer.selected.split('.');

        options.strategy = selected[1];
        options.driver = selected[1] + '.' + selected[2];
        options.env = envRecord.code.toLowerCase();

        for (var i = 0; i < selected.length; i++) {
            envDeployer = envDeployer[selected[i]];
        }

        options.deployerConfig = envDeployer;
        options.soajs = { registry: soajs.registry };
        options.model = BL.model;

        //switch strategy name to follow drivers convention
        if (options.strategy === 'docker') options.strategy = 'swarm';

        return options;
    },

    /**
     * Get an evironment record from data store
     *
     * @param {Object} soajs
     * @param {String} code
     * @param {Object} BL
     * @param {Callback Function} cb
     */
    getEnvironment: function (soajs, model, code, cb) {
        var opts = {
            collection: 'environment',
            conditions: { code: code.toUpperCase() }
        };

        model.findEntry(soajs, opts, cb);
    }
};
