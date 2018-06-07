"use strict";
const colName = 'infra';
const utils = require("../../../utils/utils.js");

function checkIfError(soajs, mainCb, data, cb) {
	utils.checkErrorReturn(soajs, mainCb, data, cb);
}

function validateId(soajs, BL, cb) {
	BL.model.validateId(soajs, cb);
}

const helper = {
	"getCommonData": function(config, soajs, BL, cbMain, cb){
		//validate id
		validateId(soajs, BL, function (err) {
			checkIfError(soajs, cbMain, { config: config, error: err, code: 490 }, function () {
				//get provider record
				let opts = {
					collection: colName,
					conditions: {}
				};
				
				if(soajs.inputmaskData.id){
					opts.conditions._id = new BL.model.getDb(soajs).ObjectId(soajs.inputmaskData.id)
				}
				else{
					opts.conditions = {
						name: soajs.inputmaskData.driver
					}
				}
				
				BL.model.findEntry(soajs, opts, function (err, InfraRecord) {
					checkIfError(soajs, cbMain, { config: config, error: err, code: 600 }, function () {
						checkIfError(soajs, cbMain, { config: config, error: (!InfraRecord), code: 600 }, function () {
							let info = helper.getClusterEnvironments(InfraRecord, soajs.inputmaskData);
							if (!soajs.inputmaskData.bypassInfoCheck && (!info || info.length === 0)) {
								return cbMain({code: 404, msg: `Driver ${InfraRecord.name} Configuration not found!`});
							}
							
							BL.model.findEntry(soajs, {
								collection: "environment",
								conditions: {"code": soajs.inputmaskData.envCode.toUpperCase()}
							}, (error, environmentRecord) => {
								checkIfError(soajs, cbMain, { config: config, error: error, code: 600 }, function () {
									return cb(InfraRecord, environmentRecord, info);
								});
							});
						});
					});
				});
			});
		});
		
	},
	"getClusterEnvironments": function (infra, options) {
		//get stack entry from project record based on id or on env code that uses it
		let stack;
		let stackId = options.id;
		let envCode = options.previousEnvironment || options.envCode;
		if(envCode){
			envCode = envCode.toUpperCase();
		}
		
		let index = 0;
		if (infra.deployments) {
			for (let i = 0; i < infra.deployments.length; i++) {
				let oneStack = infra.deployments[i];
				if (stackId && oneStack.id && oneStack.id === stackId) {
					stack = oneStack;
					index = i;
					break;
				}
				else if (envCode && oneStack.environments.indexOf(envCode.toUpperCase()) !== -1) {
					stack = oneStack;
					index = i;
					break;
				}
			}
		}
		
		if (stack) {
			let environments = [];
			if (stack.environments) {
				stack.environments.forEach((oneEnv) => {
					environments.push({ code: oneEnv.toUpperCase() });
				});
			}
			return [stack, environments, index];
		}
		
		return [];
	}
};

module.exports = helper;