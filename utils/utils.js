'use strict';
const soajsUtils = require("soajs").utils;
const async = require('async');
const tenantsColName = 'tenants';
const config = require("../config");

let utils  = {

	/**
	 * Check if error is available and return it in response, else return callback function
	 *
	 * @param {Object} soajs
	 * @param {Function} mainCb
	 * @param {Object} data
	 * @param {Function} cb
	 */
	checkErrorReturn: function (soajs, mainCb, data, cb) {
		if (data.error) {
			if (typeof (data.error) === 'object') {
				if(data.error.source ==='driver' && data.error.code === 519){
					soajs.log.debug(data.error);
				}
				else{
					soajs.log.error(data.error);
				}
			}
			
			if (data.error.source === 'driver') {
				
				if(data.error.value && data.error.value.json && data.error.value.json.message){
					data.error.msg = data.error.value.json.message;
				}
				
				if(data.error.value && typeof(data.error.value) === 'string'){
					data.error.msg += " / " + data.error.value;
				}
				
				return mainCb({ "code": data.error.code, "msg": data.error.msg });
			}
			if(!data.config){
				data.config = config;
			}
			let msg = data.config.errors[data.code];
			if(data.error.message && typeof data.error.message === 'string'){
				msg = data.error.message;
			}
			if(data.error.msg && typeof data.error.msg === 'string'){
				msg = data.error.msg;
			}
			let code =(data && data.code) ? data.code : 404;
			if (data.error.code && typeof data.error.code === 'number'){
				code = data.error.code;
			}
			return mainCb({ "code": code , "msg": msg });
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
	 * @param {Object} BL
	 * @param {Object} deployment
	 * @returns {Object} options
	 */
	buildDeployerOptions: function (envRecord, soajs, BL, deployment) {
		var options = {};
		var envDeployer = envRecord.deployer;

		if (!envDeployer) return null;
		if (Object.keys(envDeployer).length === 0) return null;
		if (!envDeployer.type || !envDeployer.selected) return null;
		
		if (envDeployer.type === 'manual' && (!deployment || deployment.technology !== 'vm')) {
			options.env = process.env.SOAJS_ENV.toLowerCase();
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
			
			// if (options.strategy === 'kubernetes' && soajs.inputmaskData.namespace) {
			if (soajs.inputmaskData.namespace) {
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
		if(envRecord.coreDB && envRecord.coreDB.registryLocation){
			delete envRecord.coreDB.registryLocation;
		}
		
		options.soajs = soajs;
		options.soajs.registry = envRecord;
		options.model = BL.model;
		return options;
	},

	/**
	 * Get an evironment record from data store
	 *
	 * @param {Object} soajs
	 * @param {Object} model
	 * @param {String} code
	 * @param {Function} cb
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
	 * @param  {model}   soajs
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
	},
	
	/**
	 * Extract a deployment from an infra record based on the environment in it
	 * @param infra
	 * @param env
	 * @returns {*}
	 */
	getDeploymentFromInfra : (infra, env) =>{
		let infraStack, info, index;
		for (let i = 0; i < infra.deployments.length; i++) {
			let oneStack = infra.deployments[i];
			if (oneStack.environments.indexOf(env.toUpperCase()) !== -1) {
				infraStack = oneStack;
				index = i;
				break;
			}
		}
		
		if (!infraStack) {
			return null;
		}
		
		let environments = [];
		if (infraStack.environments) {
			infraStack.environments.forEach((oneEnv) => {
				environments.push({code: oneEnv.toUpperCase()});
			});
		}
		return [infraStack, environments, index];
	},
	
	accommodateDeployTemplateForMongo: (template, insert, cb) => {
		// if insert true remove the . and replace it with __dot__
		// if insert false replace __dot__ with .
		let target = "__dot__";
		let replacement = ".";
		let replaceRegex = /__dot__/g;
		if (insert) {
			target = ".";
			replacement = "__dot__";
			replaceRegex = /\./g;
		}
		let nothingToDeploy = true;
		//loop over stages
		async.forEachOf(template, function (stage, key, sectCB) {
			//loop over group
			async.forEachOf(stage, function (group, key, grCB) {
				//loop over section
				async.forEachOf(group, function (section, key, stCB) {
					nothingToDeploy = false;
					//replace the target with replacement if found
					if (key && key.indexOf(target) !== -1) {
						let newSection = key.replace(replaceRegex, replacement);
						group[newSection] = section;
						delete group[key];
						if (section && section.imfv && typeof section.imfv === "object"
							&& Object.keys(section.imfv.length > 0)) {
							//loop ever the imfv inside each section
							async.forEachOf(section.imfv, function (imfv, key, imCB) {
								if (imfv && imfv.options && imfv.options.data
									&& imfv.options.data.specs && imfv.options.data.specs.tags
									&& typeof imfv.options.data.specs.tags === 'object'
									&& Object.keys(imfv.options.data.specs.tags).length > 0) {
									//loop ever the tags inside each imfv
									async.forEachOf(imfv.options.data.specs.tags, function (tag, key, tagCB) {
										//replace the target with replacement if found
										if (key && key.indexOf(target) !== -1) {
											let newTag = key.replace(replaceRegex, replacement);
											imfv.options.data.specs.tags[newTag] = tag;
											delete imfv.options.data.specs.tags[key];
											return  tagCB();
										}
										else {
											return tagCB();
										}
									}, imCB)
								}
								else {
									return imCB();
								}
								
							}, stCB)
						}
						else {
							return stCB();
						}
					}
					else {
						return stCB();
					}
				}, grCB);
			}, sectCB);
		}, () => {
			return cb(null, nothingToDeploy);
		});
	}
};

module.exports = utils;