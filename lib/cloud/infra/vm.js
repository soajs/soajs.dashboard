'use strict';
const async = require("async");

const utils = require("../../../utils/utils.js");
const helper = require("./helper.js");
const infraColname = 'infra';
const templateColName = 'template';
const templateStateColName = 'vm_layers';

function checkIfError(soajs, mainCb, data, cb) {
	utils.checkErrorReturn(soajs, mainCb, data, cb);
}

function initBLModel(BLModule, modelName, cb) {
	BLModule.init(modelName, cb);
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
	deployVM: (config, req, soajs, BL, deployer, cbMain) =>{
		async.auto({
			"getEnvironment": (mCb) =>{
				utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env.toUpperCase(), (error, envRecord) => {
					checkIfError(soajs, mCb, { config: config, error: error || !envRecord, code: 600 }, mCb);
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
						name: soajs.inputmaskData.data.infraCodeTemplate // todo check this
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
				if (!soajs.inputmaskData.modify){
					return mCb(null, true);
				}
				let opts = {
					collection: templateStateColName,
					conditions: {
						name: soajs.inputmaskData.data.name,
						infraCodeTemplate: soajs.inputmaskData.data.infraCodeTemplate,
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
						input : soajs.inputmaskData.data.specs
					}
				};
				if (soajs.inputmaskData.modify){
					options.params.templateState = result.getInfraCodeTemplateState;
					delete soajs.inputmaskData.modify;
				}
				deployer.execute({ type: "infra", name: info.getInfras.name, technology: soajs.inputmaskData.technology || "vm" }, 'deployCluster', options, (error, response) => {
					checkIfError(soajs, cbMain, {config: config, error: error}, () => {
						let opts = {
							collection: templateStateColName,
							versioning: true
						};
						//todo is status needed??
						if (soajs.inputmaskData.modify){
							opts.conditions = {
								name: soajs.inputmaskData.data.name,
								infraCodeTemplate: soajs.inputmaskData.data.infraCodeTemplate,
							};
							opts.fields = {
								$set : {
									templateState: response.stateFileData
								}
							};
							opts.options = { 'upsert': false, 'safe': true };
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
								name: soajs.inputmaskData.data.name,
								infraCodeTemplate: soajs.inputmaskData.data.infraCodeTemplate,
								templateState: response.stateFileData
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
				return cbMain(null, { "name": soajs.inputmaskData.data.name, "infraId": soajs.inputmaskData.infraId });
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
	getDeployVMStatus: (config, req, soajs, BL, deployer, cbMain) =>{
		
		//check if the db record that has the vm layer template, infra, layername and state file exists
		//if yes, return it's details as response
		console.log("get VM status method");
		return cbMain(null, { "name": "layerName", "infraId": "infra._id.toString()", "inputs": {}, "template": "template name that was used" });
	},
	
	updateVM: (config, req, soajs, BL, deployer, cbMain) =>{
		soajs.inputmaskData.modify = true;
		vmLayerModule.deployVM(config, req, soajs, BL, deployer, cbMain)
	},
	
	destroyVM: (config, req, soajs, BL, deployer, cbMain) =>{
		
		console.log("destroy VM method");
		return cbMain(null, true);
	},
};

module.exports = vmLayerModule;