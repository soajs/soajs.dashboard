'use strict';
const async = require("async");

const utils = require("../../../utils/utils.js");
const infraColname = 'infra';
const templateColName = 'template';
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
	deployVM: (config, req, soajs, BL, deployer, cbMain) => {
		async.auto({
			"getEnvironment": (mCb) => {
				utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env.toUpperCase(), (error, envRecord) => {
					checkIfError(soajs, mCb, {config: config, error: error || !envRecord, code: 600}, mCb);
				});
			},
			"getInfra": (mCb) => {
				soajs.inputmaskData.id = soajs.inputmaskData.infraId;
				BL.model.validateId(soajs, (err) => {
					checkIfError(soajs, mCb, {config: config, error: err, code: 490}, () => {
						let opts = {
							collection: infraColname,
							conditions: {
								_id: soajs.inputmaskData.id,
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
					infra: info.getInfras,
					registry: result.getEnvironment,
					params: {
						template: result.getInfraCodeTemplate,
						input: soajs.inputmaskData.data.specs
					}
				};
				let method = "deployCluster";
				if (soajs.inputmaskData.modify) {
					options.params.templateState = result.getInfraCodeTemplateState;
					delete soajs.inputmaskData.modify;
					method = "updateCluster"
				}
				deployer.execute({
					type: "infra",
					name: info.getInfras.name,
					technology: soajs.inputmaskData.technology || "vm"
				}, method, options, (error, response) => {
					checkIfError(soajs, cbMain, {config: config, error: error}, () => {
						let opts = {
							collection: templateStateColName,
							versioning: true
						};
						if (soajs.inputmaskData.modify) {
							opts.conditions = {
								layerName: soajs.inputmaskData.data.layerName,
								infraId: soajs.inputmaskData.infraId,
							};
							opts.fields = {
								$set: {
									templateState: response.stateFileData
								}
							};
							opts.options = {'upsert': false, 'safe': true};
							BL.model.updateEntry(soajs, opts, function (err, templateName) {
								checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, () => {
									checkIfError(soajs, cbMain, {
										config: config,
										error: !templateName,
										code: 600
									}, cbMain);
								});
							});
						}
						else {
							opts.record = {
								layerName: soajs.inputmaskData.layerName,
								infraCodeTemplate: soajs.inputmaskData.infraCodeTemplate,
								templateState: response.stateFileData,
								input: soajs.inputmaskData.specs,
								env: soajs.inputmaskData.env.toLowerCase()
							};
							BL.model.insertEntry(soajs, opts, function (err, templateName) {
								checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, () => {
									checkIfError(soajs, cbMain, {
										config: config,
										error: !templateName,
										code: 600
									}, cbMain);
								});
							});
						}
					});
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
	getDeployVMStatus: (config, req, soajs, BL, deployer, cbMain) => {
		let opts = {
			collection: templateStateColName,
			conditions: {
				name: soajs.inputmaskData.layerName,
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
					"inputs": templateState.input,
					"templateState": templateState.templateState,
					"env": templateState.env
				});
			});
		});
	},
	
	updateVM: (config, req, soajs, BL, deployer, cbMain) => {
		soajs.inputmaskData.modify = true;
		vmLayerModule.deployVM(config, req, soajs, BL, deployer, cbMain)
	},
	
	destroyVM: (config, req, soajs, BL, deployer, cbMain) => {
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
				soajs.inputmaskData.id = soajs.inputmaskData.infraId;
				BL.model.validateId(soajs, (err) => {
					checkIfError(soajs, mCb, {config: config, error: err, code: 490}, () => {
						let opts = {
							collection: infraColname,
							conditions: {
								_id: soajs.inputmaskData.id,
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
					checkIfError(soajs, cbMain, {config: config, error: error}, () => {
						let opts = {
							collection: templateStateColName,
							conditions: {
								layerName: soajs.inputmaskData.layerName,
								infraId: soajs.inputmaskData.infraId,
							}
						};
						BL.model.removeEntry(soajs, opts, function (err, templateName) {
							checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, () => {
								checkIfError(soajs, cbMain, {
									config: config,
									error: !templateName,
									code: 600
								}, cbMain);
							});
						});
					});
				});
				return cbMain(null, true);
			});
		});
	},
};

module.exports = vmLayerModule;