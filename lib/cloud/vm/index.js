'use strict';
const fs = require("fs");
const utils = require("../../../utils/utils.js");
const async = require("async");
const infraColname = 'infra';

function checkIfError(soajs, mainCb, data, cb) {
	utils.checkErrorReturn(soajs, mainCb, data, cb);
}

var BL = {
	model: null,
	
	/**
	 * List all deployed virtual machines by account
	 *
	 * @param  {Object}   config
	 * @param  {Object}   soajs
	 * @param  {Object}   deployer
	 * @param  {Function} cbMain
	 */
	"listVMs": function (config, soajs, deployer, cbMain) {
		
		let result = {};
		async.auto({
			"getEnvironment": (mCb) =>{
				utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env.toUpperCase(), (error, envRecord) => {
					checkIfError(soajs, mCb, { config: config, error: error || !envRecord, code: 600 }, mCb);
				});
			},
			"getInfras": (mCb) => {
				let opts = {
					collection: infraColname,
					conditions: {
						"technologies": {$in: ["vm"]}
					}
				};
				BL.model.findEntries(soajs, opts, function (err, infraRecords) {
					checkIfError(soajs, mCb, {config: config, error: err, code: 600}, () => {
						checkIfError(soajs, mCb, {config: config, error: !infraRecords, code: 600}, () => {
							return mCb(null, infraRecords);
						});
					});
				});
			},
			"callDeployer": ["getEnvironment", "getInfras", (info, mCb) => {
				let options = { soajs: soajs, env: soajs.inputmaskData.env.toLowerCase() };
				async.eachSeries(info.getInfras, (oneInfra, vCb) => {
					options.infra = oneInfra;
					deployer.execute({ type: "infra", name: oneInfra.name, technology: "vm" }, 'listServices', options, (error, vms) => {
						checkIfError(soajs, vCb, {config: config, error: error}, () => {
							if (!result[oneInfra.name]) {
								result[oneInfra.name] = {
									list: [],
									label: oneInfra.label
								};
							}
							result[oneInfra.name].list = result[oneInfra.name].list.concat(vms);
							return vCb(null, true);
						});
					});
				}, mCb);
			}]
		}, (error) => {
			checkIfError(soajs, cbMain, {config: config, error: error}, () => {
				return cbMain(null, result);
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
		function requireModel(filePath, cb) {
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
