'use strict';

const async = require("async");

const utils = require("../../../utils/utils.js");
const infraColName = 'infra';

function checkIfError(soajs, mainCb, data, cb) {
	utils.checkErrorReturn(soajs, mainCb, data, cb);
}

const extras = {

	/**
	 * Get extra components for an infra provider
	 * @param  {Object}    config
	 * @param  {Object}    req
	 * @param  {Object}    soajs
	 * @param  {Object}    BL
	 * @param  {Object}    deployer
	 * @param  {Function}    cbMain
	 * @return {void}
	 */
	getExtras: (config, req, soajs, BL, deployer, cbMain) => {
		console.log('popopopo',soajs.inputmaskData);
		function getEnvironment(cb) {
			if(!soajs.inputmaskData.envCode) {
				soajs.inputmaskData.envCode = process.env.SOAJS_ENV || 'dev';
			}
			utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.envCode.toUpperCase(), (error, envRecord) => {
				checkIfError(soajs, cb, {config: config, error: error || !envRecord, code: 600}, cb);
			});
		}

		function getInfra(cb) {
			BL.model.validateId(soajs, (error) => {
				checkIfError(soajs, cb, {config, error, code: 490}, () => {
					let opts = {
						collection: infraColName,
						conditions: {_id: soajs.inputmaskData.id, technologies: {$in: ['vm']}}
					};
					BL.model.findEntry(soajs, opts, (error, infraRecord) => {
						checkIfError(soajs, cb, {config, error: error || !infraRecord, code: 600}, () => {
							return cb(null, infraRecord);
						});
					});
				});
			});
		}

		function getExtraComponents(info, cb) {
			if (!soajs.inputmaskData.extras || (Array.isArray(soajs.inputmaskData.extras) && soajs.inputmaskData.extras.length === 0)) {
				soajs.inputmaskData.extras = config.infraExtrasList;
			}

			let output = {};
			async.each(soajs.inputmaskData.extras, (oneExtra, callback) => {
				let mapping = config.extrasFunctionMapping[oneExtra];
				let options = {
					soajs: soajs,
					infra: info.getInfra,
					registry: info.getEnvironment,
					params: {}
				};

				if(soajs.inputmaskData.group) {
					options.params.group = soajs.inputmaskData.group;
				}

				if(soajs.inputmaskData.region) {
					options.params.region = soajs.inputmaskData.region;
				}

				if (mapping.specialInput) {
					options.params = Object.assign(options.params, mapping.specialInput);
				}

				if(mapping.requiredInput && Array.isArray(mapping.requiredInput) && mapping.requiredInput.length > 0) {
					let missingInput = [];
					mapping.requiredInput.forEach((oneInput) => {
						if(soajs.inputmaskData[oneInput]) {
							options.params[oneInput] = soajs.inputmaskData[oneInput];
						}
						else {
							missingInput.push(oneInput);
						}
					});

					if(missingInput.length > 0) {
						return callback({ code: 172, message: `Missing required field(s) ${missingInput.toString()} for extra type: ${oneExtra}`});
					}
				}

				deployer.validateInputs(options, soajs.inputmaskData.section, 'list', (error, response) => {
					checkIfError(soajs, cbMain, {config, error, code: (error && error.code) ? error.code : 173}, () => {
						deployer.execute({
							type: 'infra',
							name: info.getInfra.name,
							technology: soajs.inputmaskData.technology || 'vm'
						}, mapping.functionName, options, (error, response) => {
							if (error) {
								// do not stop execution if one of the extras returned an error, return empty array instead
								soajs.log.error(error);
								response = [];
							}
							output[oneExtra] = response;
							return callback();
						});
					});
				});
			}, (error) => {
				checkIfError(soajs, cb, { config, error: error, code: (error && error.code) ? error.code : 600 }, () => {
					return cb(null, output);
				});
			});
		}

		async.auto({
			getEnvironment,
			getInfra,
			getExtraComponents: ['getEnvironment', 'getInfra', getExtraComponents]
		}, (error, results) => {
			checkIfError(soajs, cbMain, {config, error, code: 600}, () => {
				return cbMain(null, results.getExtraComponents);
			});
		});
	},

	/**
	 * Create a components for an infra provider
	 * @param  {Object}    config
	 * @param  {Object}    req
	 * @param  {Object}    soajs
	 * @param  {Object}    BL
	 * @param  {Object}    deployer
	 * @param  {Function}    cbMain
	 * @return {void}
	 */
	createExtras: (config, req, soajs, BL, deployer, cbMain) => {
		soajs.inputmaskData.envCode = soajs.inputmaskData.envCode ? soajs.inputmaskData.envCode.toUpperCase() : process.env.SOAJS_ENV;
		function getEnvironment(cb) {
			utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.envCode.toUpperCase(), (error, envRecord) => {
				checkIfError(soajs, cb, {config: config, error: error || !envRecord, code: 600}, cb);
			});
		}

		function getInfra(cb) {
			BL.model.validateCustomId(soajs, soajs.inputmaskData.infraId, (error, id) => {
				checkIfError(soajs, cb, {config, error, code: 490}, () => {
					let opts = {
						collection: infraColName,
						conditions: {_id: id, technologies: {$in: ['vm']}}
					};
					BL.model.findEntry(soajs, opts, (error, infraRecord) => {
						checkIfError(soajs, cb, {config, error: error || !infraRecord, code: 600}, () => {
							return cb(null, infraRecord);
						});
					});
				});
			});
		}

		function validateSection(cb) {
			let input = {};
			switch (soajs.inputmaskData.params.section) {
				case 'group':
					input.command = 'createGroup';
					input.params = soajs.inputmaskData.params;
					input.params.group = soajs.inputmaskData.params.name;
					break;
				case 'network':
					input.command = 'createNetwork';
					input.params = soajs.inputmaskData.params;
					break;
				case 'loadBalancer':
					input.command = 'createLoadBalancer';
					input.params = soajs.inputmaskData.params;
					break;
				case 'publicIp':
					input.command = 'createPublicIp';
					input.params = soajs.inputmaskData.params;
					break;
				case 'securityGroup':
					input.command = 'createSecurityGroup';
					input.params = soajs.inputmaskData.params;
					break;
				case 'keyPair':
					input.command = 'createKeyPair';
					input.params = soajs.inputmaskData.params;
					break;
				case 'certificate':
					input.command = 'createCertificate';
					input.params = soajs.inputmaskData.params;
					break;
				default:
					input = null;
			}
			//incase it was called internally
			checkIfError(soajs, cb, {
				config: config,
				error: !input ? {message: "Validation failed for field: section -> The parameter 'section' failed due to: instance is not one of enum values: group, network, loadBalancer, publicIp, securityGroup"} : null,
				code: 173
			}, () => {
				return cb(null, input);
			});
		}

		async.auto({
			getEnvironment,
			getInfra,
			validateSection,
		}, (error, results) => {
			if (error) {
				console.log(error)
			}
			checkIfError(soajs, cbMain, {config, error, code: 600}, () => {
				let options = {
					soajs: soajs,
					infra: results.getInfra,
					registry: results.getEnvironment,
					params: results.validateSection.params
				};
				deployer.validateInputs(options, soajs.inputmaskData.params.section, 'add', (error, response) => {
					checkIfError(soajs, cbMain, {config, error, code: (error && error.code) ? error.code : 173}, () => {
						deployer.execute({
							type: 'infra',
							name: results.getInfra.name,
							technology: soajs.inputmaskData.technology || 'vm'
						}, results.validateSection.command, options, (error, output) => {
							if (error) {
								soajs.log.error(error);
							}
							else {
								soajs.log.info(`Creating ${soajs.inputmaskData.params.section} ${soajs.inputmaskData.params.name} finished!`)
							}

							if(soajs.inputmaskData.waitResponse) {
								return cbMain(null, output);
							}
						});

						if(!soajs.inputmaskData.waitResponse) {
							return cbMain(null, true);
						}
					});
				});
			});
		});
	},

	/**
	 * Update a components for an infra provider
	 * @param  {Object}    config
	 * @param  {Object}    req
	 * @param  {Object}    soajs
	 * @param  {Object}    BL
	 * @param  {Object}    deployer
	 * @param  {Function}    cbMain
	 * @return {void}
	 */
	updateExtras: (config, req, soajs, BL, deployer, cbMain) => {
		soajs.inputmaskData.envCode = soajs.inputmaskData.envCode ? soajs.inputmaskData.envCode.toUpperCase() : process.env.SOAJS_ENV;
		function getEnvironment(cb) {
			utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.envCode.toUpperCase(), (error, envRecord) => {
				checkIfError(soajs, cb, {config: config, error: error || !envRecord, code: 600}, cb);
			});
		}

		function getInfra(cb) {
			BL.model.validateCustomId(soajs, soajs.inputmaskData.infraId, (error, id) => {
				checkIfError(soajs, cb, {config, error, code: 490}, () => {
					let opts = {
						collection: infraColName,
						conditions: {_id: id, technologies: {$in: ['vm']}}
					};
					BL.model.findEntry(soajs, opts, (error, infraRecord) => {
						checkIfError(soajs, cb, {config, error: error || !infraRecord, code: 600}, () => {
							return cb(null, infraRecord);
						});
					});
				});
			});
		}

		function validateSection(cb) {
			let input = {};
			switch (soajs.inputmaskData.params.section) {
				case 'group':
					input.command = 'updateGroup';
					input.params = soajs.inputmaskData.params;
					input.params.group = soajs.inputmaskData.params.name;
					break;
				case 'network':
					input.command = 'updateNetwork';
					input.params = soajs.inputmaskData.params;
					break;
				case 'loadBalancer':
					input.command = 'updateLoadBalancer';
					input.params = soajs.inputmaskData.params;
					break;
				case 'publicIp':
					input.command = 'updatePublicIp';
					input.params = soajs.inputmaskData.params;
					break;
				case 'securityGroup':
					input.command = 'updateSecurityGroup';
					input.params = soajs.inputmaskData.params;
					break;
				default:
					input = null
			}
			//incase it was called internally
			checkIfError(soajs, cb, {
				config: config,
				error: !input ? {message: "Validation failed for field: section -> The parameter 'section' failed due to: instance is not one of enum values: group, network, loadBalancer, publicIp, securityGroup"} : null,
				code: 173
			}, () => {
				return cb(null, input);
			});
		}

		async.auto({
			getEnvironment,
			getInfra,
			validateSection,
		}, (error, results) => {
			checkIfError(soajs, cbMain, {config, error, code: 600}, () => {
				let options = {
					soajs: soajs,
					infra: results.getInfra,
					registry: results.getEnvironment,
					params: results.validateSection.params
				};
				deployer.validateInputs(options, soajs.inputmaskData.params.section, 'update', (error, response) => {
					checkIfError(soajs, cbMain, {config, error, code: (error && error.code) ? error.code : 173}, () => {
						deployer.execute({
							type: 'infra',
							name: results.getInfra.name,
							technology: soajs.inputmaskData.technology || 'vm'
						}, results.validateSection.command, options, (error) => {
							if (error) {
								soajs.log.error(error);
							}
							else {
								soajs.log.info(`Updating ${soajs.inputmaskData.params.section} ${soajs.inputmaskData.params.name} finished!`)
							}

							if(soajs.inputmaskData.waitResponse) {
								return cbMain(null, output);
							}
						});

						if(!soajs.inputmaskData.waitResponse) {
							return cbMain(null, true);
						}
					});
				});
			});
		});
	},

	/**
	 * Delete a components for an infra provider
	 * @param  {Object}    config
	 * @param  {Object}    req
	 * @param  {Object}    soajs
	 * @param  {Object}    BL
	 * @param  {Object}    deployer
	 * @param  {Function}    cbMain
	 * @return {void}
	 */
	deleteExtras: (config, req, soajs, BL, deployer, cbMain) => {
		soajs.inputmaskData.envCode = soajs.inputmaskData.envCode ? soajs.inputmaskData.envCode.toUpperCase() : process.env.SOAJS_ENV;
		function getEnvironment(cb) {
			utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.envCode.toUpperCase(), (error, envRecord) => {
				checkIfError(soajs, cb, {config: config, error: error || !envRecord, code: 600}, cb);
			});
		}

		function getInfra(cb) {
			BL.model.validateCustomId(soajs, soajs.inputmaskData.infraId, (error, id) => {
				checkIfError(soajs, cb, {config, error, code: 490}, () => {
					let opts = {
						collection: infraColName,
						conditions: {_id: id, technologies: {$in: ['vm']}}
					};
					BL.model.findEntry(soajs, opts, (error, infraRecord) => {
						checkIfError(soajs, cb, {config, error: error || !infraRecord, code: 600}, () => {
							return cb(null, infraRecord);
						});
					});
				});
			});
		}

		function validateSection(cb) {
			let input = {};
			switch (soajs.inputmaskData.section) {
				case 'group':
					input.command = 'deleteGroup';
					input.params = {
						group: soajs.inputmaskData.name
					};
					break;
				case 'network':
					input.command = 'deleteNetwork';
					input.params = {
						group: soajs.inputmaskData.group,
						region: soajs.inputmaskData.region,
						name: soajs.inputmaskData.name,
					};
					break;
				case 'loadBalancer':
					input.command = 'deleteLoadBalancer';
					input.params = {
						group: soajs.inputmaskData.group,
						region: soajs.inputmaskData.region,
						name: soajs.inputmaskData.name,
					};
					break;
				case 'publicIp':
					input.command = 'deletePublicIp';
					input.params = {
						group: soajs.inputmaskData.group,
						region: soajs.inputmaskData.region,
						name: soajs.inputmaskData.name,
					};
					break;
				case 'securityGroup':
					input.command = 'deleteSecurityGroup';
					input.params = {
						group: soajs.inputmaskData.group,
						region: soajs.inputmaskData.region,
						name: soajs.inputmaskData.name,
					};
					break;
				case 'keyPair':
					input.command = 'deleteKeyPair';
					input.params = {
						group: soajs.inputmaskData.group,
						region: soajs.inputmaskData.region,
						name: soajs.inputmaskData.name,
					};
					break;
				case 'certificate':
					input.command = 'deleteCertificate';
					input.params = {
						group: soajs.inputmaskData.group,
						region: soajs.inputmaskData.region,
						name: soajs.inputmaskData.name,
						id: soajs.inputmaskData.id
					};
					break;
				default:
					input = null;
			}
			//incase it was called internally
			checkIfError(soajs, cb, {
				config: config,
				error: !input ? {message: "Validation failed for field: section -> The parameter 'section' failed due to: instance is not one of enum values: group, network, loadBalancer, publicIp, securityGroup, keyPair, certificate"} : null,
				code: 173
			}, () => {
				return cb(null, input);
			});
		}

		checkIfError(soajs, cbMain, {
			config: config,
			error: soajs.inputmaskData.section !== "group" && (!soajs.inputmaskData.name && !soajs.inputmaskData.id) ? {message: "Missing required field: name, id"} : null,
			code: 172
		}, () => {
			async.auto({
				getEnvironment,
				getInfra,
				validateSection,
			}, (error, results) => {
				checkIfError(soajs, cbMain, {config, error, code: 600}, () => {
					let options = {
						soajs: soajs,
						infra: results.getInfra,
						registry: results.getEnvironment,
						params: results.validateSection.params
					};
					deployer.validateInputs(options, soajs.inputmaskData.section, 'remove', (error, response) => {
						checkIfError(soajs, cbMain, {config, error, code: (error && error.code) ? error.code : 173}, () => {
							deployer.execute({
								type: 'infra',
								name: results.getInfra.name,
								technology: soajs.inputmaskData.technology || 'vm'
							}, results.validateSection.command, options, (error) => {
								if (error) {
									soajs.log.error(error)
								}
								else {
									soajs.log.info(`Deleting ${soajs.inputmaskData.section} ${soajs.inputmaskData.name} finished!`)
								}
							});
							return cbMain(null, true);
						});
					});
				});
			});
		});
	},
};

module.exports = extras;
