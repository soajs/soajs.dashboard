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

		function getInfra(cb) {
			BL.model.validateId(soajs, (error) => {
				checkIfError(soajs, cb, {config, error, code: 490}, () => {
					let opts = {
						collection: infraColName,
						conditions: {_id: soajs.inputmaskData.id}
					};
					BL.model.findEntry(soajs, opts, (error, infraRecord) => {
						checkIfError(soajs, cb, {config, error: error || !infraRecord, code: 600}, () => {
							
							if(infraRecord.technologies.includes('vm')){
								return cb(null, infraRecord);
							}
							else{
								let params = {};
								let technology = 'cluster';
								let driverName = infraRecord.name;
								if (driverName === 'local') {
									technology = infraRecord.technologies[0];
									params.technology = {};
									params.technology = technology;
								}
								
								deployer.execute({
									'type': 'infra',
									'driver': infraRecord.name,
									'technology': 'cluster'
								}, 'getExtras', {
									soajs: soajs,
									infra: infraRecord,
									env: process.env.SOAJS_ENV.toLowerCase(),
									params: params
								}, (error, extras) => {
									checkIfError(soajs, cb, {config: config, error: error, code: 600}, function () {
										if(!extras.technologies.includes('vm') && (infraRecord.name !== 'google' || (infraRecord.name === 'google' && soajs.inputmaskData.extras && soajs.inputmaskData.extras[0] &&  soajs.inputmaskData.extras[0] !== 'networks'))){
											//infra has no support for vm
											return cb({code: 601, msg: "This infra provider has no support for Vitural Machine Technology"});
										}
										else{
											//update infra record and return it
											infraRecord.technologies = extras.technologies;
											infraRecord.drivers = extras.drivers;
											infraRecord.templates = extras.templates;
											infraRecord.override = extras.override;
											
											BL.model.saveEntry(soajs, {
												collection: infraColName,
												record: infraRecord
											}, (error) => {
												checkIfError(soajs, cb, {config: config, error: error, code: 600}, function () {
													return cb(null, infraRecord);
												});
											});
										}
									});
								});
							}
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
					env: process.env.SOAJS_ENV.toLowerCase(),
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

				//NOTE this validation might no longer be necessary since IMFV for drivers has been moved to drivers
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

				deployer.validateInputs(options, mapping.schemaName, 'list', (error, response) => {
					checkIfError(soajs, callback, {config, error, code: (error && error.code) ? error.code : 173}, () => {
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
			getInfra: getInfra,
			getExtraComponents: ['getInfra', getExtraComponents]
		}, (error, results) => {
			checkIfError(soajs, cbMain, {config, error, code: (error && error.code) ? error.code : 600}, () => {
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

		function getInfra(cb) {
			BL.model.validateCustomId(soajs, soajs.inputmaskData.infraId, (error, id) => {
				checkIfError(soajs, cb, {config, error, code: 490}, () => {
					let opts = {
						collection: infraColName,
						conditions: {_id: id}
					};
					BL.model.findEntry(soajs, opts, (error, infraRecord) => {
                        // remove this check in next sprint
                        if (soajs.inputmaskData.technology === 'vm' && soajs.inputmaskData.params && soajs.inputmaskData.params.section === 'network') {
                            if (infraRecord && infraRecord.name !== 'google' && infraRecord.technologies && infraRecord.technologies.indexOf('vm') === -1) {
                                infraRecord = null
                            }
                        }
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
					env: process.env.SOAJS_ENV.toLowerCase(),
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
			getInfra,
			validateSection,
		}, (error, results) => {
			checkIfError(soajs, cbMain, {config, error, code: 600}, () => {
				let options = {
					soajs: soajs,
					infra: results.getInfra,
					env: process.env.SOAJS_ENV.toLowerCase(),
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
		
		function getInfra(cb) {
			BL.model.validateCustomId(soajs, soajs.inputmaskData.infraId, (error, id) => {
				checkIfError(soajs, cb, {config, error, code: 490}, () => {
					let opts = {
						collection: infraColName,
						conditions: {_id: id}
					};
					BL.model.findEntry(soajs, opts, (error, infraRecord) => {
                        // remove this check in next sprint
                        if (soajs.inputmaskData.technology === 'vm' && soajs.inputmaskData.params && soajs.inputmaskData.params.section === 'network') {
                            if (infraRecord && infraRecord.name !== 'google' && infraRecord.technologies && infraRecord.technologies.indexOf('vm') === -1) {
                                infraRecord = null
                            }
                        }
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
					input.params = {};
					if(soajs.inputmaskData.group) input.params.group = soajs.inputmaskData.group;
					if(soajs.inputmaskData.region) input.params.region = soajs.inputmaskData.region;
					if(soajs.inputmaskData.name) input.params.name = soajs.inputmaskData.name;
					if(soajs.inputmaskData.id) input.params.id = soajs.inputmaskData.id;
					break;
				case 'loadBalancer':
					input.command = 'deleteLoadBalancer';
					input.params = {};
					if(soajs.inputmaskData.group) input.params.group = soajs.inputmaskData.group;
					if(soajs.inputmaskData.region) input.params.region = soajs.inputmaskData.region;
					if(soajs.inputmaskData.name) input.params.name = soajs.inputmaskData.name;
					break;
				case 'publicIp':
					input.command = 'deletePublicIp';
					input.params = {};
					if(soajs.inputmaskData.group) input.params.group = soajs.inputmaskData.group;
					if(soajs.inputmaskData.region) input.params.region = soajs.inputmaskData.region;
					if(soajs.inputmaskData.name) input.params.name = soajs.inputmaskData.name;
					break;
				case 'securityGroup':
					input.command = 'deleteSecurityGroup';
					input.params = {};
					if(soajs.inputmaskData.group) input.params.group = soajs.inputmaskData.group;
					if(soajs.inputmaskData.region) input.params.region = soajs.inputmaskData.region;
					if(soajs.inputmaskData.name) input.params.name = soajs.inputmaskData.name;
					if(soajs.inputmaskData.id) input.params.id = soajs.inputmaskData.id;
					break;
				case 'keyPair':
					input.command = 'deleteKeyPair';
					input.params = {};
					if(soajs.inputmaskData.group) input.params.group = soajs.inputmaskData.group;
					if(soajs.inputmaskData.region) input.params.region = soajs.inputmaskData.region;
					if(soajs.inputmaskData.name) input.params.name = soajs.inputmaskData.name;
					break;
				case 'certificate':
					input.command = 'deleteCertificate';
					input.params = {};
					if(soajs.inputmaskData.group) input.params.group = soajs.inputmaskData.group;
					if(soajs.inputmaskData.region) input.params.region = soajs.inputmaskData.region;
					if(soajs.inputmaskData.name) input.params.name = soajs.inputmaskData.name;
					if(soajs.inputmaskData.id) input.params.id = soajs.inputmaskData.id;
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
				getInfra,
				validateSection,
			}, (error, results) => {
				checkIfError(soajs, cbMain, {config, error, code: 600}, () => {
					let options = {
						soajs: soajs,
						infra: results.getInfra,
						env: process.env.SOAJS_ENV.toLowerCase(),
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
									soajs.log.info(`Deleting ${soajs.inputmaskData.section} ${soajs.inputmaskData.name || soajs.inputmaskData.id} finished!`)
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
