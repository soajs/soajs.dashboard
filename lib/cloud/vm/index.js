'use strict';
const fs = require("fs");
const utils = require("../../../utils/utils.js");
const async = require("async");
const infraColname = 'infra';
const vmLayersColName = 'vm_layers';
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
			"getVmTemplates": (mCb) => {
				let opts = {
					collection: vmLayersColName,
					conditions: {
						error: { $exists: 0 }
					}
				};
				if (soajs.inputmaskData.env){
					opts.conditions.env = soajs.inputmaskData.env.toLowerCase();
				}
				BL.model.findEntries(soajs, opts, function (err, getVmTemplates) {
					checkIfError(soajs, mCb, {config: config, error: err, code: 600}, () => {
						return mCb(null, getVmTemplates);
					});
				});
			},
			"callDeployer": ["getEnvironment", "getInfras", (info, mCb) => {
				let options = {
					soajs: soajs,
					env: soajs.inputmaskData.env,
					infra: info.getInfras,
					params: {
						group: soajs.inputmaskData.group || soajs.inputmaskData.env
					}
				};
				deployer.execute({ type: "infra", name: info.getInfras.name, technology: "vm" }, 'listServices', options, (error, vms) => {
					checkIfError(soajs, mCb, {config: config, error: error}, () => {
						return mCb(null, vms);
					});
				});
			}]
		}, (error, result) => {
			checkIfError(soajs, cbMain, {config: config, error: error}, () => {
				async.each(result.callDeployer, function(vm, mCB) {
					async.each(result.getVmTemplates, function(template, tCb) {
						if (vm.layer === template.layerName && vm.labels && vm.labels['soajs.template.id'] && template.templateId === vm.labels['soajs.template.id']){
							vm.template = {
								input: template.input ? JSON.parse(template.input) : null,
								infraCodeTemplate: template.infraCodeTemplate,
								id: template._id
							};
						}
						tCb();
					}, mCB);
				}, function() {
					return cbMain(null, {[result.getInfras.name]: result.callDeployer});
				});
			});
		});
	},

	/**
	 * Execute a command inside a running virtual machine
	 *
	 * This functions takes its arguments either from
	 *  - soajs.inputmaskData.recipe (catalog recipe)
	 *  - soajs.inputmaskData.opts
	 *      --command => array
	 *      --args ==> array
	 *      --env environment variables array
	 * A command property must be provided!
	 * This function will not wait for the execution of the command
	 * @param  {Object}   config
	 * @param  {Object}   soajs
	 * @param  {Object}   deployer
	 * @param  {Function} cbMain
	 */
	"runCommand": function (config, soajs, deployer, cbMain) {

		let options = {
			infra: soajs.inputmaskData.infra,
			soajs: soajs,
			params : {
				group: soajs.inputmaskData.group,
				vmName: soajs.inputmaskData.vmName,
				region: soajs.inputmaskData.region,
			},
		};

		if (soajs.inputmaskData.catalog && soajs.inputmaskData.catalog.recipe && soajs.inputmaskData.catalog.recipe.buildOptions && soajs.inputmaskData.catalog.recipe.buildOptions.cmd){

			if (soajs.inputmaskData.catalog.recipe.buildOptions.cmd.env ){
				options.params.env = [];
				for (let key in soajs.inputmaskData.catalog.recipe.buildOptions.cmd.env) {
					if (soajs.inputmaskData.catalog.recipe.buildOptions.cmd.env.hasOwnProperty(key)) {
						options.params.env.push({
							key: soajs.inputmaskData.catalog.recipe.buildOptions.cmd.env[key].value || soajs.inputmaskData.catalog.recipe.buildOptions.cmd.env[key].default
						});
					}
				}
			}

			if (soajs.inputmaskData.catalog.recipe.buildOptions.cmd.deploy ){
				if (soajs.inputmaskData.catalog.recipe.buildOptions.cmd.deploy.command){
					options.params.command = (soajs.inputmaskData.catalog.recipe.buildOptions.cmd.deploy.command
						&& Array.isArray(soajs.inputmaskData.catalog.recipe.buildOptions.cmd.deploy.command)
							&& soajs.inputmaskData.catalog.recipe.buildOptions.cmd.deploy.command.length > 0 )? soajs.inputmaskData.catalog.recipe.buildOptions.cmd.deploy.command : null;
				}
				if (soajs.inputmaskData.catalog.recipe.buildOptions.cmd.deploy.args){
					options.params.args = soajs.inputmaskData.catalog.recipe.buildOptions.cmd.deploy.args
					&& Array.isArray(soajs.inputmaskData.catalog.recipe.buildOptions.cmd.deploy.args)
					&& soajs.inputmaskData.catalog.recipe.buildOptions.cmd.deploy.args.length > 0 ? soajs.inputmaskData.catalog.recipe.buildOptions.cmd.deploy.args : [];
				}
			}
		}

		let counter = 0;
		let max = 40;
		function runCommandRecursive (){
			soajs.log.debug("Executing command in vm instance: ", soajs.inputmaskData.vmName);
			deployer.execute({ type: "infra", name: options.infra.name, technology: 'vm' }, 'runCommand', options, (error, res) => {
				if (error){
					soajs.log.error(error);
					if (error.code && error.code === 766){
						if (counter < max ){
							counter ++;
							setTimeout(runCommandRecursive, 30000);
						}
					}
				}
				else{
					soajs.log.debug("Command " + options.params.command + " executed on: " + soajs.inputmaskData.vmName);
				}
			});
		}

		checkIfError(soajs, cbMain, {config: config, error: !options.params.command ? {error: !options.params.command, message: 'No command was provided!'}: null }, () => {
			runCommandRecursive();
			return cbMain(null, true);
		});
	},
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
