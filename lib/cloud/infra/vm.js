'use strict';
const async = require("async");

const utils = require("../../../utils/utils.js");
const helper = require("./helper.js");

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
	deployVM: (config, req, soajs, deployer, cbMain) =>{
		
		
		return cbMain(null, { "name": "layerName", "infraId": "infra._id.toString()" });
	},
	
	/**
	 * run one atomic operation to check if the vm layer has been created
	 * @param config
	 * @param req
	 * @param soajs
	 * @param deployer
	 * @param cbMain
	 */
	getDeployVMStatus: (config, req, soajs, deployer, cbMain) =>{
		
		//check if the db record that has the vm layer template, infra, layername and state file exists
		//if yes, return it's details as response
		
		return cbMain(null, { "name": "layerName", "infraId": "infra._id.toString()", "inputs": {}, "template": "template name that was used" });
	},
	
	updateVM: (config, req, soajs, deployer, cbMain) =>{},
	
	destroyVM: (config, req, soajs, deployer, cbMain) =>{},
};

module.exports = vmLayerModule;