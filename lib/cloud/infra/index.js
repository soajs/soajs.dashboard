'use strict';
const fs = require("fs");
const utils = require("../../../utils/utils.js");
const hash = require('object-hash');
let colName = "infra";

function checkIfError(soajs, mainCb, data, cb) {
	utils.checkErrorReturn(soajs, mainCb, data, cb);
}

var BL = {
	model: null,
	
	/**
	 * List Infra Providers
	 *
	 * @param {Object} config
	 * @param {Object} SOAJS
	 * @param {Drivers} Deployer
	 * @param {Callback} cbMain
	 */
	"list": function (config, soajs, deployer, cbMain) {
		let opts = {
			collection: colName
		};
		BL.model.findEntries(soajs, opts, function (err, records) {
			checkIfError(soajs, cbMain, { config: config, error: err, code: 600 }, function () {
				
				//todo: call the drivers to get the regions for each provider before returning the response
				
				return cbMain(null, records);
			});
		});
	},
	
	/**
	 * Connect new infra provider
	 * @param config
	 * @param soajs
	 * @param deployer
	 * @param cbMain
	 */
	"activate": function (config, soajs, deployer, cbMain) {
		
		//check if this provider already exists
		BL.list(config, soajs, deployer, (error, infraProviders) => {
			checkIfError(soajs, cbMain, { config: config, error: error, code: 600 }, function () {
				infraProviders.forEach((oneProvider) =>{
					if(oneProvider.label === soajs.inputmaskData.label){
						return cbMain({ "code": 173, "msg": "Another Provider with the same name exists!" });
					}
					
					if (hash(oneProvider.api) !== hash(soajs.inputmaskData.api)) {
						return cbMain({ "code": 173, "msg": "Another Provider with the same configuration exists!" });
					}
					
				});
				
				//todo: call driver and authenticate the api credentials
				
				//insert provider record
				let opts = {
					collection: colName,
					record: {
						api: soajs.inputmaskData.api,
						name: soajs.inputmaskData.name,
						label: soajs.inputmaskData.label
					}
				};
				BL.model.insertEntry(soajs, opts, function (err, records) {
					checkIfError(soajs, cbMain, { config: config, error: err, code: 600 }, function () {
						return cbMain(null, records);
					});
				});
			});
		});
	},
	
	/**
	 * Modify infra provider connection
	 * @param config
	 * @param soajs
	 * @param deployer
	 * @param cbMain
	 */
	"modify": function (config, soajs, deployer, cbMain) {
		//check id if valid
		validateId(soajs, function (err) {
			checkIfError(soajs, cbMain, { config: config, error: err, code: 490 }, function () {
				
				//get record
				let opts = {
					collection: colName,
					conditions: {
						_id: soajs.inputmaskData.id
					}
				};
				BL.model.findEntry(soajs, opts, function (err, record) {
					checkIfError(soajs, cbMain, { config: config, error: err, code: 600 }, function () {
						
						//todo: authenticate api info by calling deployer
						
						//update provider
						record.api = soajs.inputmaskData.api;
						let opts = {
							collection: colName,
							conditions: {
								_id: soajs.inputmaskData.id
							},
							record: record
						};
						BL.model.saveEntry(soajs, opts, function (err) {
							checkIfError(soajs, cbMain, { config: config, error: err, code: 600 }, function () {
								return cbMain(null, true);
							});
						});
					});
				});
			});
		});
	},
	
	/**
	 * Deactivate infra provider
	 * @param config
	 * @param soajs
	 * @param deployer
	 * @param cbMain
	 */
	"deactivate": function (config, soajs, deployer, cbMain) {
		//validate id
		validateId(soajs, function (err) {
			checkIfError(soajs, cbMain, { config: config, error: err, code: 490 }, function () {
				
				//get provider record
				let opts = {
					collection: colName,
					conditions: {
						_id: soajs.inputmaskData.id
					}
				};
				BL.model.findEntry(soajs, opts, function (err, record) {
					checkIfError(soajs, cbMain, { config: config, error: err, code: 600 }, function () {
						
						//check that deployments is empty
						checkIfError(soajs, cbMain, { config: config, error: (record.deployments.length > 0), code: 491 }, function () {
							
							//remove provider record
							let opts = {
								collection: colName,
								conditions: {
									_id: soajs.inputmaskData.id
								}
							};
							BL.model.removeEntry(soajs, opts, function (err) {
								checkIfError(soajs, cbMain, { config: config, error: err, code: 600 }, function () {
									return cbMain(null, true);
								});
							});
						});
					});
				});
			});
		});
	},
	
	/**
	 * remove deployment from infra provider
	 * @param config
	 * @param soajs
	 * @param deployer
	 * @param cbMain
	 */
	"removeDeployment": function (config, soajs, deployer, cbMain) {
		//validate id
		validateId(soajs, function (err) {
			checkIfError(soajs, cbMain, { config: config, error: err, code: 490 }, function () {
				
				//get provider record
				let opts = {
					collection: colName,
					conditions: {
						_id: soajs.inputmaskData.id
					}
				};
				BL.model.findEntry(soajs, opts, function (err, record) {
					checkIfError(soajs, cbMain, { config: config, error: err, code: 600 }, function () {
						
						//get deployment record
						let deploymentDetails;
						for(let i = record.deployments.length -1; i >=0; i--){
							if(record.deployments[i].id === soajs.inputmaskData.deploymentId){
								deploymentDetails = record.deployments[i];
							}
						}
						
						//todo: call driver and trigger delete deployment
						
						//remove deployment from record and update provider
						for(let i = record.deployments.length -1; i >=0; i--){
							if(record.deployments[i].id === soajs.inputmaskData.deploymentId){
								record.deployments.spice(i, 1);
							}
						}
						let opts = {
							collection: colName,
							record: record
						};
						BL.model.saveEntry(soajs, opts, function (err) {
							checkIfError(soajs, cbMain, { config: config, error: err, code: 600 }, function () {
								return cbMain(null, true);
							});
						});
					});
				});
			});
		});
	}
};

module.exports = {
	"init": function (modelName, cb) {
		var modelPath;
		
		if (!modelName) {
			return cb(new Error("No Model Requested!"));
		}
		
		modelPath = __dirname + "/../../../models/" + modelName + ".js";
		return requireModel(modelPath, cb);
		
		/**
		 * checks if model file exists, requires it and returns it.
		 * @param filePath
		 * @param cb
		 */
		function requireModel (filePath, cb) {
			//check if file exist. if not return error
			fs.exists(filePath, function (exists) {
				if (!exists) {
					return cb(new Error("Requested Model Not Found!"));
				}
				
				BL.model = require(filePath);
				return cb(null, BL);
			});
		}
	}
};
