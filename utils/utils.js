'use strict';

var async = require('async');
var tenantsColName = 'tenants';

module.exports = {

	/**
	 * Check if error is available and return it in response, else return callback function
	 *
	 * @param {Object} soajs
	 * @param {Callback Function} mainCb
	 * @param {Object} data
	 * @param {Callback Function} cb
	 */
	checkErrorReturn: function (soajs, mainCb, data, cb) {
		if (data.error) {
			if (typeof (data.error) === 'object') {
				soajs.log.error(data.error);
			}

			if (data.error.source === 'driver') {
				return mainCb({"code": data.error.code, "msg": data.error.msg});
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
        // options.soajs = { registry: soajs.registry };
		//soajs.registry refers to dashboard env registry, using envRecord instead
		//normalizing serviceConfig object between registry and environment record
		if(envRecord.services && envRecord.services.config) {
			envRecord.serviceConfig = envRecord.services.config;
		}

		options.soajs = { registry: envRecord };
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
    },

	/**
	 * Function that replaces characters in object keys with alternatives
	 * @param  {Object}   record            The record that will be manipulated
	 * @param  {String}   regex             String used to build the regex
	 * @param  {String}   replacementString Replacement string
	 * @param  {Function} cb                Callback function
	 * @return {void}
	 */
	normalizeKeyValues: function (record, regex, replacementString, cb) {
		var updatedRecord = {};
		var replacementRegex = new RegExp(regex, 'g');
		async.eachOf(record, function (oneRecordEntry, key, callback) {
			if(key.match(replacementRegex)) {
				updatedRecord[key.replace(replacementRegex, replacementString)] = oneRecordEntry;
			}
			else {
				updatedRecord[key] = oneRecordEntry;
			}

			return callback();
		}, function () {
			return cb(null, updatedRecord);
		});
	},

	/**
	 * Function that checks if current logged in user belongs to group owner
	 * @param  {Object}   soajs
	 * @param  {Function} cb
	 * @return {void}
	 */
	checkIfOwner: function(soajs, model, cb) {
		var uracRecord = soajs.urac;
		var opts = {
			collection: tenantsColName,
			conditions: {
				code: uracRecord.tenant.code.toUpperCase()
			}
		};

		model.findEntry(soajs, opts, function (error, tenantRecord) {
			if(error) return cb(error);

			if(tenantRecord && tenantRecord.locked && uracRecord.groups.indexOf('owner') !== -1) {
				return cb(null, true);
			}

			return cb(null, false);
		});
	}
};
