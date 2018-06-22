'use strict';
const async = require("async");

const utils = require("../../../utils/utils.js");
const infraColname = 'infra';
const templateColName = 'templates';
const templateStateColName = 'vm_layers';

function checkIfError(soajs, mainCb, data, cb) {
	utils.checkErrorReturn(soajs, mainCb, data, cb);
}

const vmLayerModule = {
	
	/**
	 * call cloostro and pass the template and inputs to create the vm layer
	 * @param config
	 * @param req
	 * @param soajs
	 * @param BL
	 * @param deployer
	 * @param cbMain
	 */
	deployVM: (config, soajs, BL, deployer, cbMain) => {
		async.auto({
			"getEnvironment": (mCb) => {
				soajs.log.info("get environment record");
				utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env.toUpperCase(), (error, envRecord) => {
					checkIfError(soajs, mCb, {config: config, error: error || !envRecord, code: 600}, mCb);
				});
			},
			"getInfra": (mCb) => {
				BL.model.validateCustomId(soajs, soajs.inputmaskData.infraId, (err, id) => {
					checkIfError(soajs, mCb, {config: config, error: err, code: 490}, () => {
						let opts = {
							collection: infraColname,
							conditions: {
								_id: id,
								technologies: {$in: ["vm"]}
							}
						};
						BL.model.findEntry(soajs, opts, function (err, infraRecord) {
							checkIfError(soajs, mCb, {config: config, error: err, code: 600}, () => {
								checkIfError(soajs, mCb, {
									config: config,
									error: !infraRecord,
									code: 600
								}, () => {
									return mCb(null, infraRecord);
								});
							});
						});
					});
				});
			},
			"getInfraCodeTemplate": (mCb) => {
				soajs.log.info("get template record");
				let opts = {
					collection: templateColName,
					conditions: {
						name: soajs.inputmaskData.infraCodeTemplate // todo check this
					}
				};
				BL.model.findEntry(soajs, opts, function (err, templateName) {
					checkIfError(soajs, mCb, {config: config, error: err, code: 600}, () => {
						checkIfError(soajs, mCb, {
							config: config,
							error: !templateName,
							code: 600
						}, () => {
							return mCb(null, templateName);
						});
					});
				});
			},
			"getInfraCodeTemplateState": (mCb) => {
				if (!soajs.inputmaskData.modify) {
					return mCb(null, true);
				}
				soajs.log.info("get template state record");
				let opts = {
					collection: templateStateColName,
					conditions: {
						layerName: soajs.inputmaskData.layerName,
						infraId: soajs.inputmaskData.infraId
					}
				};
				BL.model.findEntry(soajs, opts, function (err, templateState) {
					checkIfError(soajs, mCb, {config: config, error: err, code: 600}, () => {
						checkIfError(soajs, mCb, {
							config: config,
							error: !templateState,
							code: 600
						}, () => {
							return mCb(null, templateState);
						});
					});
				});
			}
		}, (error, result) => {
			checkIfError(soajs, cbMain, {config: config, error: error}, () => {
				let options = {
					soajs: soajs,
					infra: result.getInfra,
					registry: result.getEnvironment,
					params: {
						template: result.getInfraCodeTemplate,
						input: soajs.inputmaskData.specs
					}
				};
				options.params.input.layerName = soajs.inputmaskData.layerName;
				options.params.input.region = soajs.inputmaskData.region;
				let method = "deployCluster";
				if (soajs.inputmaskData.modify) {
					options.params.templateState = JSON.parse(result.getInfraCodeTemplateState.templateState);
					delete soajs.inputmaskData.modify;
					method = "updateCluster"
				}
				deployer.execute({
					type: "infra",
					name: result.getInfra.name,
					technology: soajs.inputmaskData.technology || "vm"
				}, method, options, (error, response) => {
					soajs.log.info(response);
					if (error) {
						soajs.log.error(error)
					}
					let opts = {
						collection: templateStateColName,
						versioning: true
					};
					if (soajs.inputmaskData.modify) {
						opts.conditions = {
							layerName: soajs.inputmaskData.layerName,
							infraId: soajs.inputmaskData.infraId,
						};
						opts.fields = {
							$set: {
								templateState: JSON.stringify(response.stateFileData, null, 2)
							}
						};
						opts.options = {'upsert': false, 'safe': true};
						BL.model.updateEntry(soajs, opts, function (error) {
							
							if (error) {
								soajs.log.error(error);
							}
							else {
								soajs.log.info("Template state record update!");
							}
						});
					}
					else {
						opts.record = {
							infraId: soajs.inputmaskData.infraId.toString(),
							layerName: soajs.inputmaskData.layerName,
							infraCodeTemplate: soajs.inputmaskData.infraCodeTemplate,
							input: JSON.stringify(soajs.inputmaskData.specs, null, 2),
							env: soajs.inputmaskData.env.toLowerCase()
						};
						if (response.stateFileData) {
							opts.record.templateState = JSON.stringify(response.stateFileData, null, 2);
						}
						BL.model.insertEntry(soajs, opts, function (error) {
							if (error) {
								soajs.log.error(error);
							}
							else {
								soajs.log.info("Template state record created!");
							}
						});
					}
				});
				return cbMain(null, {"name": soajs.inputmaskData.layerName, "infraId": soajs.inputmaskData.infraId});
			});
		});
	},
	
	/**
	 * run one atomic operation to check if the vm layer has been created
	 * @param config
	 * @param req
	 * @param soajs
	 * @param deployer
	 * @param cbMain
	 */
	getDeployVMStatus: (config, soajs, BL, deployer, cbMain) => {
		let opts = {
			collection: templateStateColName,
			conditions: {
				layerName: soajs.inputmaskData.layerName,
				infraId: soajs.inputmaskData.infraId
			}
		};
		BL.model.findEntry(soajs, opts, function (err, templateState) {
			checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, () => {
				if (!templateState) {
					return cbMain(null, null);
				}
				return cbMain(null, {
					"name": templateState.layerName,
					"infraId": templateState.infraId,
					"inputs": templateState.input ? JSON.parse(templateState.input): null,
					"templateState": templateState.templateState ? JSON.parse(templateState.templateState): null,
					"env": templateState.env
				});
			});
		});
	},
	
	updateVM: (config, soajs, BL, deployer, cbMain) => {
		soajs.inputmaskData.modify = true;
		vmLayerModule.deployVM(config, req, soajs, BL, deployer, cbMain)
	},
	
	destroyVM: (config, soajs, BL, deployer, cbMain) => {
		async.auto({
			"getEnvironment": (mCb) => {
				if (!soajs.inputmaskData.env) {
					return mCb();
				}
				utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env.toUpperCase(), (error, envRecord) => {
					checkIfError(soajs, mCb, {config: config, error: error || !envRecord, code: 600}, mCb);
				});
			},
			"getInfra": (mCb) => {
				BL.model.validateCustomId(soajs, soajs.inputmaskData.infraId, (err, id) => {
					checkIfError(soajs, mCb, {config: config, error: err, code: 490}, () => {
						let opts = {
							collection: infraColname,
							conditions: {
								_id: id,
								"technologies": {$in: ["vm"]}
							}
						};
						BL.model.findEntry(soajs, opts, function (err, infraRecord) {
							checkIfError(soajs, mCb, {config: config, error: err, code: 600}, () => {
								checkIfError(soajs, mCb, {
									config: config,
									error: !infraRecord,
									code: 600
								}, () => {
									return mCb(null, infraRecord);
								});
							});
						});
					});
				});
			},
			"getInfraCodeTemplateState": (mCb) => {
				let opts = {
					collection: templateColName,
					conditions: {
						layerName: soajs.inputmaskData.layerName,
						infraId: soajs.inputmaskData.infraId
					}
				};
				if (soajs.inputmaskData.env) {
					opts.conditions.env = soajs.inputmaskData.env.toLowerCase()
				}
				BL.model.findEntry(soajs, opts, function (err, templateName) {
					checkIfError(soajs, mCb, {config: config, error: err, code: 600}, () => {
						checkIfError(soajs, mCb, {
							config: config,
							error: !templateName,
							code: 600
						}, () => {
							return mCb(null, templateName);
						});
					});
				});
			},
			"getInfraCodeTemplate": ['getInfraCodeTemplateState', (info, mCb) => {
				let opts = {
					collection: templateStateColName,
					conditions: {
						layerName: soajs.inputmaskData.layerName,
						infraCodeTemplate: info.getInfraCodeTemplateState.infraCodeTemplate,
					}
				};
				if (soajs.inputmaskData.env) {
					opts.conditions.env = soajs.inputmaskData.env.toLowerCase()
				}
				BL.model.findEntry(soajs, opts, function (err, templateState) {
					checkIfError(soajs, mCb, {config: config, error: err, code: 600}, () => {
						checkIfError(soajs, mCb, {
							config: config,
							error: !templateState,
							code: 600
						}, () => {
							return mCb(null, templateState);
						});
					});
				});
			}],
		}, (error, result) => {
			checkIfError(soajs, cbMain, {config: config, error: error}, () => {
				let options = {
					soajs: soajs,
					infra: info.getInfras,
					registry: result.getEnvironment,
					params: {
						template: result.getInfraCodeTemplate.template,
						templateState: result.getInfraCodeTemplateState.templateState,
						layerName: result.getInfraCodeTemplateState.layerName,
					}
				};
				deployer.execute({
					type: "infra",
					name: info.getInfras.name,
					technology: soajs.inputmaskData.technology || "vm"
				}, 'deleteCluster', options, (error) => {
					if (error) {
						soajs.log.error(error)
					}
					let opts = {
						collection: templateStateColName,
						conditions: {
							layerName: soajs.inputmaskData.layerName,
							infraId: soajs.inputmaskData.infraId,
						}
					};
					BL.model.removeEntry(soajs, opts, function (error) {
						if (error) {
							soajs.log.error(error);
						}
						else {
							soajs.log.info("Template state record deleted!");
						}
					});
				});
			});
			return cbMain(null, true);
		});
	},
};

module.exports = vmLayerModule;