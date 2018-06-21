'use strict';
const async = require("async");

const utils = require("../../../utils/utils.js");
const helper = require("./helper.js");
const infraColname = 'infra';

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
	 * @param deployer
	 * @param cbMain
	 */
	deployVM: (config, req, soajs, BL, deployer, cbMain) =>{
		async.auto({
			"getEnvironment": (mCb) =>{
				if(!soajs.inputmaskData.env){
					return mCb();
				}
				utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env.toUpperCase(), (error, envRecord) => {
					checkIfError(soajs, mCb, { config: config, error: error || !envRecord, code: 600 }, mCb);
				});
			},
			"getInfras": (mCb) => {
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
			"callDeployer": ["getEnvironment", "getInfras", (info, mCb) => {
				let options = {
					soajs: soajs,
					infra: info.getInfras,
					registry: info.getEnvironment,
					params: {}
				};
				deployer.execute({ type: "infra", name: info.getInfras.name, technology: "vm" }, 'apply', options, (error, vms) => {
					checkIfError(soajs, mCb, {config: config, error: error}, () => {
						return mCb(null, true);
					});
				});
			}]
		}, (error, result) => {
			checkIfError(soajs, cbMain, {config: config, error: error}, () => {
				return cbMain(null, { "name": "layerName", "infraId": "infra._id.toString()" });
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
	
	updateVM: (config, req, soajs, BL, deployer, cbMain) =>{},
	
	destroyVM: (config, req, soajs, BL, deployer, cbMain) =>{
		
		console.log("destroy VM method");
		return cbMain(null, true);
	},
};

module.exports = vmLayerModule;