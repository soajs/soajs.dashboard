'use strict';

const fs = require("fs");
const async = require('async');

const utils = require("../../../utils/utils.js");

function checkIfError(soajs, mainCb, data, cb) {
	utils.checkErrorReturn(soajs, mainCb, data, cb);
}

let infraColname = 'infra';
const BL = {
	model: null,

	/**
	 * Get logs of a container
	 *
	 * @param {Object} config
	 * @param {Object} soajs
	 * @param {Object} deployer
	 * @param {Function} cbMain
	 */
	"streamLogs": function (config, soajs, deployer, cbMain) {
		if((!soajs.inputmaskData.technology || soajs.inputmaskData.technology=== '' ) && !soajs.inputmaskData.taskId){
			return cbMain({code : 173, msg: "Invalid or Missing taskId in parameters!"});
		}
		
		async.auto({
			"getEnvironment": (mCb) =>{
				utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env.toUpperCase(), (error, envRecord) => {
					checkIfError(soajs, mCb, { config: config, error: error || !envRecord, code: 600 }, () => {
						return mCb(null, envRecord);
					});
				});
				
			},
			"getInfra": (mCb) =>{
				//if infra id provided, use it
				//else pull based on env code
				if (soajs.inputmaskData.infraId) {
					soajs.inputmaskData.id = soajs.inputmaskData.infraId;
					BL.model.validateId(soajs, (err) => {
						checkIfError(soajs, mCb, {config: config, error: err, code: 490}, () => {
							let opts = {
								collection: infraColname,
								conditions: {
									_id: soajs.inputmaskData.id
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
				}
				else {
					let opts = {
						collection: infraColname,
						conditions: {
							"deployments.environments": {"$in": [soajs.inputmaskData.env.toUpperCase()]}
						}
					};
					BL.model.findEntry(soajs, opts, function (err, infraRecord) {
						checkIfError(soajs, mCb, {config: config, error: err, code: 600}, () => {
							checkIfError(soajs, mCb, {config: config, error: !infraRecord, code: 600}, () => {
								return mCb(null, infraRecord);
							});
						});
					});
				}
			},
			"callDeployer": ["getEnvironment", "getInfra", (info, mCb) =>{
				let options = utils.buildDeployerOptions(info.getEnvironment, soajs, BL);
				options.infra = info.getInfra;
				//need to supply the stack if infra has more than drivers
				options.infra.stack = utils.getDeploymentFromInfra(options.infra, info.getEnvironment.code)[0];
				
				let technology = soajs.inputmaskData.technology || options.strategy;
				options.params = {
					id: soajs.inputmaskData.serviceId,
					taskId: soajs.inputmaskData.taskId,
					follow: soajs.inputmaskData.follow,
					filter: soajs.inputmaskData.filter || ""
				};
				
				deployer.execute({type: "infra", name: info.getInfra.name, technology: technology}, 'getContainerLogs', options, mCb);
				// TODO: handle logs Streaming once UI supports it
				// if(soajs.inputmaskData.follow) {
				// 	logs.on('data', (data) => {
				// 		console.log('---------------------------');
				// 		console.log(data.toString());
				// 		console.log('---------------------------');
				// 	});
				// }
				// else {
				// 	return cbMain(null, logs);
				// }
			}]
		}, (error, results) => {
			checkIfError(soajs, cbMain, { config: config, error: error, code: (error && error.code) ? error.code : 600 }, function () {
				return cbMain(null, results.callDeployer);
			});
		});
	},

	/**
	 * Perform a maintenance operation on a deployed SOAJS service
	 *
	 * @param {Object} config
	 * @param {Object} soajs
	 * @param {Object} deployer
	 * @param {Function} cbMain
	 */
	"maintenance": function (config, soajs, deployer, cbMain) {
		async.auto({
			"checkIfServiceOrDaemon": (mCb) =>{
				if(['service','daemon'].indexOf(soajs.inputmaskData.type) === -1){
					return mCb();
				}
				
				let serviceName = soajs.inputmaskData.serviceName;
				if(soajs.inputmaskData.type === 'daemon' && serviceName.indexOf("-") !== -1){
					serviceName = serviceName.split("-")[0];
				}
				let opts = {
					collection: (soajs.inputmaskData.type === 'service') ? 'services' : 'daemons',
					conditions: {
						name: serviceName
					}
				};
				BL.model.findEntry(soajs, opts, mCb);
			},
			"getEnvironment": (mCb) =>{
				utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env.toUpperCase(), (error, envRecord) => {
					checkIfError(soajs, mCb, { config: config, error: error || !envRecord, code: 600 }, () => {
						return mCb(null, envRecord);
					});
				});
			},
			"getInfra": (mCb) =>{
				//if infra id provided, use it
				//else pull based on env code
				if (soajs.inputmaskData.infraId) {
					soajs.inputmaskData.id = soajs.inputmaskData.infraId;
					BL.model.validateId(soajs, (err) => {
						checkIfError(soajs, mCb, {config: config, error: err, code: 490}, () => {
							let opts = {
								collection: infraColname,
								conditions: {
									_id: soajs.inputmaskData.id
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
				}
				else {
					let opts = {
						collection: infraColname,
						conditions: {
							"deployments.environments": {"$in": [soajs.inputmaskData.env.toUpperCase()]}
						}
					};
					BL.model.findEntry(soajs, opts, function (err, infraRecord) {
						checkIfError(soajs, mCb, {config: config, error: err, code: 600}, () => {
							checkIfError(soajs, mCb, {config: config, error: !infraRecord, code: 600}, () => {
								return mCb(null, infraRecord);
							});
						});
					});
				}
			},
			"callDeployer": ["checkIfServiceOrDaemon", "getEnvironment", "getInfra", (info, mCb) =>{
				let options = utils.buildDeployerOptions(info.getEnvironment, soajs, BL);
				options.infra = info.getInfra;
				//need to supply the stack if infra has more than drivers
				options.infra.stack = utils.getDeploymentFromInfra(options.infra, info.getEnvironment.code)[0];
				let technology = soajs.inputmaskData.technology || options.strategy;
				options.params = {
					toEnv: soajs.inputmaskData.env,
					id: soajs.inputmaskData.serviceId,
					network: config.network,
					operation: soajs.inputmaskData.operation,
					serviceName: soajs.inputmaskData.serviceName
				};
				
				if(info.checkIfServiceOrDaemon && info.checkIfServiceOrDaemon.port){
					options.params.maintenancePort = info.checkIfServiceOrDaemon.port + info.getEnvironment.services.config.ports.maintenanceInc;
				}
				
				soajs.log.info(`Maintenance operation ${soajs.inputmaskData.operation} started!`);
				deployer.execute({ type: "infra", name: info.getInfra.name, technology: technology }, 'maintenance', options, mCb);
			}]
		}, (error, results) => {
			checkIfError(soajs, cbMain, { config: config, error: error, code: (error && error.code) ? error.code : 600 }, function () {
				return cbMain(null, results.callDeployer);
			});
		});
	},
	
	/**
	 * Perform a maintenance operation on a deployed SOAJS service
	 *
	 * @param {Object} config
	 * @param {Object} soajs
	 * @param {Object} deployer
	 * @param {Function} cbMain
	 */
	"maintenanceVM": function (config, soajs, deployer, cbMain) {
		async.auto({
			"getEnvironment": (mCb) =>{
				utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env.toUpperCase(), (error, envRecord) => {
					checkIfError(soajs, mCb, { config: config, error: error || !envRecord, code: 600 }, () => {
						return mCb(null, envRecord);
					});
				});
			},
			"getInfra": ["getEnvironment", (results, mCb) => {
				checkIfError(soajs, mCb, {
					config: config,
					error: !results.getEnvironment.restriction || !Object.keys(results.getEnvironment.restriction).length > 0,
					code: 520
				}, () => {
					soajs.inputmaskData.id = Object.keys(results.getEnvironment.restriction)[0];
					BL.model.validateId(soajs, (err) => {
						checkIfError(soajs, mCb, {config: config, error: err, code: 490}, () => {
							let opts = {
								collection: infraColname,
								conditions: {
									_id: soajs.inputmaskData.id
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
				});
			}]
		}, (error, result) => {
			checkIfError(soajs, cbMain, {
				config: config,
				error: error,
				code: (error && error.code) ? error.code : 600
			}, () => {
				let infraId = Object.keys(result.getEnvironment.restriction)[0];
				checkIfError(soajs, cbMain, {
					config: config,
					error: !result.getEnvironment.restriction[infraId]
						|| !Object.keys(result.getEnvironment.restriction[infraId]).length > 0,
					code: 520
				}, () => {
					let region = Object.keys(result.getEnvironment.restriction[infraId])[0];
					checkIfError(soajs, cbMain, {
						config: config,
						error: !result.getEnvironment.restriction[infraId][region]
							|| !Object.keys(result.getEnvironment.restriction[infraId][region]).length > 0,
						code: 520
					}, () => {
						let options = {
							infra: result.getInfra,
							env: soajs.inputmaskData.env,
							technology: soajs.inputmaskData.technology || 'vm',
							params: {
								vmName: soajs.inputmaskData.vmName,
								group: result.getEnvironment.restriction[infraId][region].group,
								region: region,
								id: soajs.inputmaskData.instanceId
							},
							soajs: soajs
						};
						soajs.log.info(`VM Maintenance operation ${soajs.inputmaskData.operation} started!`);
						deployer.execute({
							type: "infra",
							name: result.getInfra.name,
							technology: "vm"
						}, soajs.inputmaskData.operation, options, (err, res) => {
							if (err) {
								soajs.log.error(err);
							}
							else {
								soajs.log.info(`Operation ${res.name}: ${res.status} at ${res.endTime}`);
							}
						});
					});
				});
				return cbMain(null, true);
			});
		});
	},
	
	/**
	 * Get virtual machine journalctl logs
	 *
	 * @param {Object} config
	 * @param {Object} soajs
	 * @param {Object} deployer
	 * @param {Function} cbMain
	 */
	"getLogVM": function (config, soajs, deployer, cbMain) {
		async.auto({
			"getEnvironment": (mCb) => {
				utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env.toUpperCase(), (error, envRecord) => {
					checkIfError(soajs, mCb, { config: config, error: error || !envRecord, code: 600 }, () => {
						return mCb(null, envRecord);
					});
				});
			},
			"getInfra": ["getEnvironment", (results, mCb) => {
				checkIfError(soajs, mCb, {
					config: config,
					error: !results.getEnvironment.restriction || !Object.keys(results.getEnvironment.restriction).length > 0,
					code: 520
				}, () => {
					soajs.inputmaskData.id = Object.keys(results.getEnvironment.restriction)[0];
					BL.model.validateId(soajs, (err) => {
						checkIfError(soajs, mCb, {config: config, error: err, code: 490}, () => {
							let opts = {
								collection: infraColname,
								conditions: {
									_id: soajs.inputmaskData.id
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
				});
			}]
		}, (error, result) => {
			checkIfError(soajs, cbMain, {config: config, error: error}, () => {
				let infraId = Object.keys(result.getEnvironment.restriction)[0];
				checkIfError(soajs, cbMain, {
					config: config,
					error: !result.getEnvironment.restriction[infraId]
						|| !Object.keys(result.getEnvironment.restriction[infraId]).length > 0
						|| !result.getEnvironment.restriction[infraId][Object.keys(result.getEnvironment.restriction[infraId])[0]],
					code: 520
				}, () => {
					let infraRecord = result.getInfra;
					let options = {
						soajs: soajs,
						infra: infraRecord,
						env: soajs.inputmaskData.env,
						params: {
							group: result.getEnvironment.restriction[infraId][Object.keys(result.getEnvironment.restriction[infraId])[0]].group,
							vmName: soajs.inputmaskData.vmName.toLowerCase()
						}
					};
					
					if (soajs.inputmaskData.numberOfLines) {
						options.params.numberOfLines = soajs.inputmaskData.numberOfLines;
					}
					deployer.execute({
						type: "infra",
						name: infraRecord.name,
						technology: soajs.inputmaskData.technology
					}, 'getLogs', options, (error, logs) => {
						checkIfError(soajs, cbMain, {config: config, error: error}, () => {
							return cbMain(null, logs);
						});
					});
				});
			});
		});
	}
	
	
};

module.exports = {
	"init": function (modelName, cb) {
		let modelPath;

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
			fs.exists(filePath, (exists) => {
				if (!exists) {
					return cb(new Error("Requested Model Not Found!"));
				}

				BL.model = require(filePath);
				return cb(null, BL);
			});
		}
	}
};
