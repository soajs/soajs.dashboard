'use strict';
var soajsUtils = require("soajs").utils;
var async = require('async');
var tenantsColName = 'tenants';
var infraColName = 'infra';

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
				
				if(data.error.value && data.error.value.json && data.error.value.json.message){
					data.error.msg = data.error.value.json.message;
				}
				return mainCb({ "code": data.error.code, "msg": data.error.msg });
			}
			
			let msg = data.config.errors[data.code];
			if(data.error.message && typeof data.error.message === 'string'){
				msg = data.error.message;
			}
			if(!msg && data.error.msg && typeof data.error.msg === 'string'){
				msg = data.error.msg;
			}
			return mainCb({ "code": (data && data.code) ? data.code : 404 , "msg": msg });
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
	buildDeployerOptions: function (envRecord, soajs, BL, deployment) {
		var options = {};
		var envDeployer = envRecord.deployer;

		if (!envDeployer) return null;
		if (Object.keys(envDeployer).length === 0) return null;
		if (!envDeployer.type || !envDeployer.selected) return null;
		
		if (envDeployer.type === 'manual' && (!deployment || deployment.technology !== 'vm')) {
			return null;
		}
		else {
			var selected = envDeployer.selected.split('.');
			if(selected && selected.length > 0){
				options.strategy = selected[1];
				options.driver = selected[1] + '.' + selected[2];
			}
			else{
				options.driver = envDeployer.type;
			}
			
			options.env = envRecord.code.toLowerCase();
			
			if (options.strategy === 'kubernetes' && soajs.inputmaskData.namespace) {
				//if a namespace is specified, add user set namespace to override the registry config
				options.namespace = soajs.inputmaskData.namespace;
			}
			
			for (var i = 0; i < selected.length; i++) {
				envDeployer = envDeployer[selected[i]];
			}
		}
		
		options.deployerConfig = envDeployer;
		
		var serviceConfig = soajsUtils.cloneObj(envRecord.services.config);
		envRecord.coreDB = soajsUtils.cloneObj(soajs.registry.coreDB);
		
		var switchedConnection = BL.model.switchConnection(soajs);
		if (switchedConnection) {
			if (typeof  switchedConnection === 'object' && Object.keys(switchedConnection).length > 0) {
				envRecord.coreDB.provision = soajsUtils.cloneObj(switchedConnection);
			}
		}
		envRecord.serviceConfig = serviceConfig;
		delete envRecord.coreDB.registryLocation;
		
		options.soajs = soajs;
		options.soajs.registry = envRecord;
		options.model = BL.model;
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
			if (key.match(replacementRegex)) {
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
	checkIfOwner: function (soajs, model, cb) {
		var uracRecord = soajs.urac;
		if (!soajs.urac || !soajs.urac.tenant) {
			soajs.log.error('Urac tenant not found');
			return cb(null, false);
		}

		var opts = {
			collection: tenantsColName,
			conditions: {
				code: uracRecord.tenant.code.toUpperCase()
			}
		};

		model.findEntry(soajs, opts, function (error, tenantRecord) {
			if (error) {
				return cb(error);
			}
			if (tenantRecord && tenantRecord.locked && uracRecord.groups.indexOf('owner') !== -1) {
				return cb(null, true);
			}

			return cb(null, false);
		});
	}
};
