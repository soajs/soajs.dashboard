'use strict';
const async = require("async");

const utils = require("../../../utils/utils.js");
const infraColname = 'infra';
const templateColName = 'templates';
const templateStateColName = 'vm_layers';
const vmModule = require("../vm/index.js");
function checkIfError(soajs, mainCb, data, cb) {
	utils.checkErrorReturn(soajs, mainCb, data, cb);
}
const dbModel = 'mongo';
const vmLayerModule = {

	/**
	 * call cloostro and pass the template and inputs to create the vm layer
	 * @param config
	 * @param soajs
	 * @param BL
	 * @param deployer
	 * @param cbMain
	 */
	deployVM: (config, soajs, BL, deployer, cbMain) => {
		let inputmaskDataClone = JSON.parse(JSON.stringify(soajs.inputmaskData));
		async.auto({
			"getEnvironment": (mCb) => {
				soajs.log.info("get environment record");
				utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env.toUpperCase(), (error, envRecord) => {
					checkIfError(soajs, mCb, {config: config, error: error || !envRecord, code: 600}, function() {
						return mCb(null, envRecord);
					});
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
				BL.model.findEntry(soajs, opts, function (err, dbRecord) {
					checkIfError(soajs, mCb, {config: config, error: err, code: 600}, () => {
						checkIfError(soajs, mCb, {
							config: config,
							error: !dbRecord,
							code: 600
						}, () => {
							return mCb(null, dbRecord);
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
				let update = false;
				if (soajs.inputmaskData.modify) {
					update = true;
					options.params.templateState = result.getInfraCodeTemplateState.templateState ? JSON.parse(result.getInfraCodeTemplateState.templateState): null;
					method = "updateCluster"
				}
				
				checkIfError(soajs, cbMain, {config: config, error: update &&!options.params.templateState, code: 495}, () => {
					
					let opts = {
						collection: templateStateColName,
						versioning: true
					};
					
					async.auto({
						"createVMLayerRecord": (mCb) => {
							if(soajs.inputmaskData.modify){
								return mCb(null, {"_id": BL.model.validateCustomId(soajs, soajs.inputmaskData.id) });
							}
							
							opts.record = {
								infraId: inputmaskDataClone.infraId.toString(),
								layerName: inputmaskDataClone.layerName,
								infraCodeTemplate: inputmaskDataClone.infraCodeTemplate,
								input: JSON.stringify(inputmaskDataClone.specs, null, 2),
								env: inputmaskDataClone.env.toLowerCase()
							};
							
							BL.model.insertEntry(soajs, opts, (error, response) => {
								return mCb(error, (response) ? response[0] : null);
							});
						},
						"deployModifyVMLayer": ["createVMLayerRecord", (info, mCb) => {
							deployer.execute({
								type: "infra",
								name: result.getInfra.name,
								technology: soajs.inputmaskData.technology || "vm"
							}, method, options, (error, response) => {
								if (error) {
									soajs.log.error(error)
								}

								opts.conditions = {
									_id: info.createVMLayerRecord._id
								};

								opts.fields = {
									$set: {}
								};

								if(response && response.stateFileData) {
									opts.fields.$set.templateState = JSON.stringify(response.stateFileData, null, 2);
								}
								if(response && response.render) {
									opts.fields.$set.renderedTemplate = response.render;
								}

								if(error){
									opts.fields.$set.record.error = {
										code: error.code,
										message: error.message || error.msg || error.value
									};
								}

								opts.options = {'upsert': false, 'safe': true, 'multi': false};
								BL.model.updateEntry(soajs, opts, function (error) {
									if (error) {
										soajs.log.error(error);
									}
									else {
										soajs.log.info("Template state record update!");
									}

									if(!inputmaskDataClone.wizard){
										BL.model.closeConnection(soajs);
									}
								});
							});

							return mCb();
						}]
					}, (error, result) => {
						return cbMain(error, {"id": result.createVMLayerRecord._id.toString(), "name": inputmaskDataClone.layerName, "infraId": inputmaskDataClone.infraId});
					});
				});
			});
		});
	},

	/**
	 * run one atomic operation to check if the vm layer has been created
	 * @param config
	 * @param soajs
	 * @param BL
	 * @param deployer
	 * @param cbMain
	 */
	getDeployVMStatus: (config, soajs, BL, deployer, cbMain) => {
		let opts = {
			collection: templateStateColName,
			conditions: {
				_id: BL.model.validateCustomId(soajs, soajs.inputmaskData.id),
				layerName: soajs.inputmaskData.layerName,
				infraId: soajs.inputmaskData.infraId
			}
		};
		BL.model.findEntry(soajs, opts, function (err, dbRecord) {
			checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, () => {
				if (!dbRecord) {
					return cbMain(null, null);
				}
				
				if(dbRecord.error){
					let e = new Error(dbRecord.error.code + " => " + dbRecord.error.message);
					return cbMain(e);
				}
				
				if(!dbRecord.templateState){
					return cbMain(null, null);
				}
				
				vmModule.init(dbModel, function (error, model) {
					checkIfError(soajs, cbMain, {
						config: config,
						error: error,
						code: 407
					}, () => {
						let group;
						let inputs;
						try {
							inputs = JSON.parse(dbRecord.input);
							group = inputs.group;
						}
						catch (e) {
							return cbMain(new Error("No input found in template record"));
						}
						soajs.inputmaskData.group = group;
						soajs.inputmaskData.env = dbRecord.env;
						model.listVMs(config, soajs, deployer, (err, vmRecords) => {
							checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, () => {
								if (vmRecords && typeof vmRecords === 'object' && Object.keys(vmRecords).length > 0) {
									let myVMs = [];
									async.each(vmRecords[Object.keys(vmRecords)[0]], (oneVm, cb) => {
										if(oneVm.name && oneVm.layer === soajs.inputmaskData.layerName){
											myVMs.push(oneVm.name);
										}
										return cb();
									}, function () {
										return cbMain(null, {
											"id": dbRecord._id.toString(),
											"name": dbRecord.layerName,
											"infraId": dbRecord.infraId,
											"inputs": inputs,
											"template": dbRecord.infraCodeTemplate,
											"env": dbRecord.env,
											"vms": myVMs
										});
									});
								}
							});
						});
					});
				});
			});
		});
	},
	
	/**
	 * call cloostro and pass the details needed to update a vm layer
	 * @param config
	 * @param soajs
	 * @param BL
	 * @param deployer
	 * @param cbMain
	 */
	updateVM: (config, soajs, BL, deployer, cbMain) => {
		soajs.inputmaskData.modify = true;
		vmLayerModule.deployVM(config, soajs, BL, deployer, cbMain)
	},
	
	/**
	 * call cloostro and pass the details needed to delete the vm layer
	 * @param config
	 * @param soajs
	 * @param BL
	 * @param deployer
	 * @param cbMain
	 */
	destroyVM: (config, soajs, BL, deployer, cbMain) => {
		let inputmaskDataClone = JSON.parse(JSON.stringify(soajs.inputmaskData));
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
					collection: templateStateColName,
					conditions: {
						_id: BL.model.validateCustomId(soajs, soajs.inputmaskData.id),
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
					collection: templateColName,
					conditions: {
						name: info.getInfraCodeTemplateState.infraCodeTemplate
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
			}],
		}, (error, result) => {
			checkIfError(soajs, cbMain, {config: config, error: error}, () => {
				
				async.parallel({
					"removeDBRecord": (mCb) => {
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
							if(!inputmaskDataClone.wizard){
								BL.model.closeConnection(soajs);
							}
							return mCb();
						});
					},
					"removeVMLayer": (mCb) =>{
						let options = {
							soajs: soajs,
							infra: result.getInfra,
							registry: result.getEnvironment,
							params: {
								template: result.getInfraCodeTemplateState.renderedTemplate,
								templateState: JSON.parse(result.getInfraCodeTemplateState.templateState),
								layerName: result.getInfraCodeTemplateState.layerName,
							}
						};
						deployer.execute({
							type: "infra",
							name: result.getInfra.name,
							technology: soajs.inputmaskData.technology || "vm"
						}, 'deleteCluster', options, (error) => {
							if (error) {
								soajs.log.error(error)
							}
							return mCb();
						});
					}
				});
				return cbMain(null, true);
			});
		});
	},
};

module.exports = vmLayerModule;
