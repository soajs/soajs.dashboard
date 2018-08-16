'use strict';
const async = require("async");

const utils = require("../../../utils/utils.js");
const infraColname = 'infra';
const templateColName = 'templates';
const templateStateColName = 'vm_layers';
const vmModule = require("../vm/index.js");
const templates = require('./templates.js');

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
					checkIfError(soajs, mCb, { config: config, error: error || !envRecord, code: 600 }, function () {
						return mCb(null, envRecord);
					});
				});
			},
			"getInfra": (mCb) => {
				BL.model.validateCustomId(soajs, soajs.inputmaskData.infraId, (err, id) => {
					checkIfError(soajs, mCb, { config: config, error: err, code: 490 }, () => {
						let opts = {
							collection: infraColname,
							conditions: {
								_id: id,
								technologies: { $in: ["vm"] }
							}
						};
						BL.model.findEntry(soajs, opts, function (err, infraRecord) {
							checkIfError(soajs, mCb, { config: config, error: err, code: 600 }, () => {
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
			"getInfraCodeTemplate": ['getInfra', (info, mCb) => {
				soajs.log.info("get template record");
				let opts = {
					collection: templateColName,
					conditions: {
						name: soajs.inputmaskData.infraCodeTemplate // todo check this
					}
				};
				BL.model.findEntry(soajs, opts, function (err, templateData) {
					checkIfError(soajs, mCb, { config: config, error: err, code: 600 }, () => {
						if(templateData) {
							return mCb(null, templateData);
						}

						// if the template was not found locally, check if it's external
						soajs.inputmaskData.returnRawData = true;
						soajs.inputmaskData.id = soajs.inputmaskData.infraId;
						soajs.inputmaskData.templateId = soajs.inputmaskData.infraCodeTemplate;
						templates.downloadTemplate(config, soajs, BL, deployer, {}, (error, templateData) => {
							checkIfError(soajs, mCb, { config: config, error: error, code: 600 }, () => {
								checkIfError(soajs, mCb, { config: config, error: !templateData, code: 482 }, () => {
									//restoring inputmaskData.id to avoid confusion
									soajs.inputmaskData.id = inputmaskDataClone.id;
									return mCb(null, templateData);
								});
							});
						})
					});
				});
			}],
			"validateinfraCodeTemplate": ["getInfraCodeTemplate", (info, mCb) => {
				if (!info.getInfraCodeTemplate.imfv) {
					return mCb();
				}

				let imfv;
				try {
					imfv = (typeof info.getInfraCodeTemplate.imfv === 'string') ? JSON.parse(info.getInfraCodeTemplate.imfv) : info.getInfraCodeTemplate.imfv;
				}
				catch (e) {
					soajs.log.error(e);
					return mCb();
				}

				if (Object.keys(imfv).length === 0) {
					return mCb();
				}

				let myValidator = new soajs.validator.Validator();
				let status = myValidator.validate(soajs.inputmaskData.specs, imfv);
				soajs.log.debug(status);
				if (!status.valid) {
					let errors = [];
					status.errors.forEach(function (err) {
						errors.push(err.stack);
					});
					return mCb({ code: 173, msg: errors.join(" - ") });
				}
				else return mCb(null, true);
			}],
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
					checkIfError(soajs, mCb, { config: config, error: err, code: 600 }, () => {
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
			checkIfError(soajs, cbMain, {
				config: config,
				error: error,
				code: (error && error.code) ? error.code : 600
			}, () => {
				let options = {
					soajs: soajs,
					infra: result.getInfra,
					registry: result.getEnvironment,
					params: {
						template: result.getInfraCodeTemplate,
						input: soajs.inputmaskData.specs,
						layerName: soajs.inputmaskData.layerName
					}
				};
				options.params.input.layerName = soajs.inputmaskData.layerName;
				options.params.input.region = soajs.inputmaskData.region;
				let method = "deployCluster";
				let update = false;
				if (soajs.inputmaskData.modify) {
					update = true;
					options.params.templateState = result.getInfraCodeTemplateState.templateState ? JSON.parse(result.getInfraCodeTemplateState.templateState) : null;
					method = "updateCluster"
				}
				checkIfError(soajs, cbMain, {
					config: config,
					error: update && !options.params.templateState,
					code: 495
				}, () => {
					// VM layer was successfully deployed
					// template state file was not found and an error message was inserted instead
					// no modification to vm layer is allowed
					// code and message will be supplied by the driver
					// error debug was preserved inside template state file templateState.error.debug
					let errorCheck = update && options.params.templateState && options.params.templateState.error && options.params.templateState.error.code === 730;
					checkIfError(soajs, cbMain, {
						config: config,
						error: errorCheck,
						code: errorCheck ? options.params.templateState.error.code : null,
						message: errorCheck ? options.params.templateState.error.msg : null
					}, () => {
						let opts = {
							collection: templateStateColName,
							versioning: true
						};
						async.auto({
							"createVMLayerRecord": (mCb) => {
								if (soajs.inputmaskData.modify) {
									return mCb(null, { "_id": BL.model.validateCustomId(soajs, soajs.inputmaskData.id) });
								}

								opts.record = {
									infraId: inputmaskDataClone.infraId.toString(),
									layerName: inputmaskDataClone.layerName,
									infraCodeTemplate: inputmaskDataClone.infraCodeTemplate,
									input: JSON.stringify(inputmaskDataClone.specs, null, 2),
									env: inputmaskDataClone.env.toLowerCase()
								};
								if (result.getInfraCodeTemplate && result.getInfraCodeTemplate._id){
									opts.record.templateId =  result.getInfraCodeTemplate._id.toString();
								}

								BL.model.countEntries(soajs, {
									collection: templateStateColName,
									conditions: {
										error: {$exists: 0},
										infraId: inputmaskDataClone.infraId.toString(),
										layerName: inputmaskDataClone.layerName,
									}
								}, (error, count) => {
									if(error){
										return mCb(error);
									}

									if(count > 0){
										return mCb({code:499, msg:"Virtual Machine Layer already exists!"});
									}

									BL.model.insertEntry(soajs, opts, (error, response) => {
										return mCb(error, (response) ? response[0] : null);
									});
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

									if (response && response.stateFileData) {
										opts.fields.$set.templateState = JSON.stringify(response.stateFileData, null, 2);
									}
									if (response && response.render) {
										opts.fields.$set.renderedTemplate = response.render;
									}

									if (error) {
										opts.fields.$set.error = {
											code: error.code,
											message: error.message || error.value || error.msg
										};
									}

									opts.options = { 'upsert': false, 'safe': true, 'multi': false };
									BL.model.updateEntry(soajs, opts, function (error) {
										if (error) {
											soajs.log.error(error);
										}
										else {
											soajs.log.info("Template state record update!");
										}

										if (!inputmaskDataClone.wizard) {
											BL.model.closeConnection(soajs);
										}
									});
								});

								return mCb();
							}]
						}, (error, result) => {
							checkIfError(soajs, cbMain, { config: config, error: error, code: 600 }, () => {
								return cbMain(null, {
									"id": result.createVMLayerRecord ? result.createVMLayerRecord._id.toString() : null,
									"name": inputmaskDataClone.layerName,
									"infraId": inputmaskDataClone.infraId
								});
							});
						});
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
			checkIfError(soajs, cbMain, { config: config, error: err, code: 600 }, () => {
				if (!dbRecord) {
					return cbMain(null, null);
				}

				if (dbRecord.error) {
					let e = new Error(dbRecord.error.code + " => " + dbRecord.error.message);
					return cbMain(e);
				}

				if (!dbRecord.templateState) {
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
							checkIfError(soajs, cbMain, { config: config, error: err, code: 600 }, () => {
								if (vmRecords && typeof vmRecords === 'object' && Object.keys(vmRecords).length > 0) {
									let myVMs = [];
									async.each(vmRecords[Object.keys(vmRecords)[0]], (oneVm, cb) => {
										if (oneVm.name && oneVm.layer === soajs.inputmaskData.layerName) {

											let myVMInstance = {};
											myVMInstance.name = oneVm.name;
											if(oneVm.ip.length > 0){
												oneVm.ip.forEach((oneVMIP) => {
													if(oneVMIP.type === 'public'){
														myVMInstance.ip = oneVMIP.address;
													}
												});
											}

											myVMs.push(myVMInstance);
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
					checkIfError(soajs, mCb, { config: config, error: error || !envRecord, code: 600 }, mCb);
				});
			},
			"getInfra": (mCb) => {
				BL.model.validateCustomId(soajs, soajs.inputmaskData.infraId, (err, id) => {
					checkIfError(soajs, mCb, { config: config, error: err, code: 490 }, () => {
						let opts = {
							collection: infraColname,
							conditions: {
								_id: id,
								"technologies": { $in: ["vm"] }
							}
						};
						BL.model.findEntry(soajs, opts, function (err, infraRecord) {
							checkIfError(soajs, mCb, { config: config, error: err, code: 600 }, () => {
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
						// layerName: soajs.inputmaskData.layerName,
						infraId: soajs.inputmaskData.infraId
					}
				};
				if (soajs.inputmaskData.env) {
					opts.conditions.env = soajs.inputmaskData.env.toLowerCase()
				}
				BL.model.findEntry(soajs, opts, function (err, templateName) {
					checkIfError(soajs, mCb, { config: config, error: err, code: 600 }, () => {
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
					checkIfError(soajs, mCb, { config: config, error: err, code: 600 }, () => {
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
			checkIfError(soajs, cbMain, { config: config, error: error }, () => {

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
							if (!inputmaskDataClone.wizard) {
								BL.model.closeConnection(soajs);
							}
							return mCb();
						});
					},
					"removeVMLayer": (mCb) => {
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

	onBoardVM: (config, soajs, BL, deployer, cbMain) => {
		let id = '';
		soajs.log.info('Start on Board VM with release: ', soajs.inputmaskData.release);
		async.auto({
			"getEnvironment": (mCb) => {
				if (!soajs.inputmaskData.env) {
					return mCb();
				}
				utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env.toUpperCase(), (error, envRecord) => {
					checkIfError(soajs, mCb, { config: config, error: error || !envRecord, code: 600 }, () => {
						return mCb(null, envRecord)
					});
				});
			},

			"getInfra": (mCb) => {
				BL.model.validateCustomId(soajs, soajs.inputmaskData.infraId, (err, id) => {
					checkIfError(soajs, mCb, { config: config, error: err, code: 490 }, () => {
						let opts = {
							collection: infraColname,
							conditions: {
								_id: id,
								"technologies": { $in: ["vm"] }
							}
						};
						BL.model.findEntry(soajs, opts, function (err, infraRecord) {
							checkIfError(soajs, mCb, { config: config, error: err, code: 600 }, () => {
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
			"checkImageCompatibility": (mCb) => {
				//check for image
				//if we are releasing don't check
				if(!soajs.inputmaskData.image || soajs.inputmaskData.release){
					return mCb(null, true);
				}
				let images = [];
				let valid = true;
				//loop over the all the images and check if one is incompatible
				if (soajs.inputmaskData.image) {
					soajs.inputmaskData.image.forEach(function (oneImage) {
						if (images.length === 0) {
							images.push(oneImage.prefix + oneImage.name + oneImage.version);
						}
						else {
							valid = images.indexOf(oneImage.prefix + oneImage.name + oneImage.version) !== -1;
							images.push(oneImage.prefix + oneImage.name + oneImage.version);
						}
					});
					checkIfError(soajs, mCb, {config: config, error: !valid, code: 622}, mCb);
				}
				else {
					return mCb(null, true);
				}

			},
		}, (error, results) => {
			checkIfError(soajs, cbMain, { config: config, error: error }, () => {
				let options = {
					soajs: soajs,
					infra: results.getInfra,
					registry: results.getEnvironment,
					params: {
						setVmNameAsLabel: false,
						vmNames: soajs.inputmaskData.names,
						group: soajs.inputmaskData.group,
						labels: {}
					}
				};
				if (!soajs.inputmaskData.release) {
					options.params.setVmNameAsLabel = true;
					options.params.labels = {
						'soajs.env.code': soajs.inputmaskData.env.toUpperCase(),
						'soajs.layer.name': soajs.inputmaskData.layerName,
						'soajs.network.name': soajs.inputmaskData.networkName,
						"soajs.onBoard" : "true"
					}
				}

				//soajs.log.info('Execute');
				//soajs.log.info(options.params);
				deployer.execute({
					type: 'infra',
					name: results.getInfra.name,
					technology: soajs.inputmaskData.technology || 'vm'
				}, 'updateVmLabels', options, (error, result) => {
					if (error) {
						soajs.log.error(error);
					}
					id = result;
				});
				return cbMain(null, true);
			});
		});
	},
};

module.exports = vmLayerModule;
