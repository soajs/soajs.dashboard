'use strict';

var fs = require("fs");
var utils = require("../../../utils/utils.js");

function checkIfError(soajs, mainCb, data, cb) {
	utils.checkErrorReturn(soajs, mainCb, data, cb);
}
var infraColname = 'infra';
var BL = {
	model: null,

	/**
	 * Get logs of a container
	 *
	 * @param {Object} config
	 * @param {Object} SOAJS
	 * @param {Callback} cbMain
	 */
	"streamLogs": function (config, soajs, deployer, cbMain) {
		utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env.toUpperCase(), function (error, envRecord) {
			checkIfError(soajs, cbMain, {
				config: config,
				error: error || !envRecord,
				code: 600
			}, function () {
				checkIfError(soajs, cbMain, {
					config: config,
					error: !envRecord.deployer.type || !envRecord.deployer.selected || envRecord.deployer.type === 'manual',
					code: 743
				}, function () {
					var options = utils.buildDeployerOptions(envRecord, soajs, BL);
					checkIfError(soajs, cbMain, { config: config, error: !options, code: 600 }, function () {
						options.params = {
							id: soajs.inputmaskData.serviceId,
							taskId: soajs.inputmaskData.taskId,
							follow: soajs.inputmaskData.follow
						};
						deployer.execute({'type': 'container', 'driver': options.strategy}, 'getContainerLogs', options, (error, logs) =>{
							checkIfError(soajs, cbMain, { config: config, error: error }, function () {
								// if(soajs.inputmaskData.follow) {
								// 	//TODO: handle stream
								// 	logs.on('data', (data) => {
								// 		console.log('---------------------------');
								// 		console.log(data.toString());
								// 		console.log('---------------------------');
								// 	});
								// }
								// else {
								// 	return cbMain(null, logs);
								// }
								return cbMain(null, logs);
							});
						});
					});
				});
			});
		});

	},

	/**
	 * Perform a maintenance operation on a deployed SOAJS service
	 *
	 * @param {Object} config
	 * @param {Object} SOAJS
	 * @param {Callback} cbMain
	 */
	"maintenance": function (config, soajs, deployer, cbMain) {
		var dbCollection = '';
		if (soajs.inputmaskData.type === 'service') dbCollection = 'services';
		else if (soajs.inputmaskData.type === 'daemon') dbCollection = 'daemons';
		var opts = {
			collection: dbCollection,
			conditions: {
				name: soajs.inputmaskData.serviceName
			}
		};
		BL.model.findEntry(soajs, opts, function (error, record) {
			checkIfError(soajs, cbMain, { config: config, error: error, code: 600 }, function () {
				checkIfError(soajs, cbMain, {
					config: config,
					error: !record,
					code: 795
				}, function () {
					utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env.toUpperCase(), function (error, envRecord) {
						checkIfError(soajs, cbMain, {
							config: config,
							error: error || !envRecord,
							code: 600
						}, function () {
							checkIfError(soajs, cbMain, {
								config: config,
								error: !envRecord.deployer.type || !envRecord.deployer.selected || envRecord.deployer.type === 'manual',
								code: 743
							}, function () {
								var options = utils.buildDeployerOptions(envRecord, soajs, BL);
								options.params = {
									toEnv: soajs.inputmaskData.env,
									id: soajs.inputmaskData.serviceId,
									network: config.network,
									maintenancePort: record.port + envRecord.services.config.ports.maintenanceInc,
									operation: soajs.inputmaskData.operation
								};
								deployer.execute({'type': 'container', 'driver': options.strategy}, 'maintenance', options, (error, result) =>{
									checkIfError(soajs, cbMain, { config: config, error: error }, function () {
										return cbMain(null, result);
									});
								});
							});
						});
					});
				});
			});
		});
	},

	/**
	 * maintenance operation to VM
	 * start - stop - restart
	 *
	 * @param  {Object}   config
	 * @param  {Object}   soajs
	 * @param  {Object}   deployer
	 * @param  {Function} cbMain
	 */
	"maintenanceVM": function (config, soajs, deployer, cbMain) {
		utils.getEnvironment(soajs, BL.model, soajs.inputmaskData.env.toUpperCase(), function (error, envRecord) {
			checkIfError(soajs, cbMain, {
				config: config,
				error: error || !envRecord,
				code: 600
			}, function () {
				checkIfError(soajs, cbMain, {
					config: config,
					error: !envRecord.deployer.type || !envRecord.deployer.selected,
					code: 743
				}, function () {
					soajs.inputmaskData.id = soajs.inputmaskData.infraAccountId;
					BL.model.validateId(soajs, function (err) {
						checkIfError(soajs, cbMain, { config: config, error: err, code: 490 }, function () {
							let opts = {
								collection: infraColname,
								conditions: {
									_id: soajs.inputmaskData.id
								}
							};
							BL.model.findEntry(soajs, opts, function (err, infraRecord) {
								checkIfError(soajs, cbMain, { config: config, error: err, code: 600 }, function () {
									checkIfError(soajs, cbMain, {
										config: config,
										error: !infraRecord,
										code: 490
									}, function () {
										var options = utils.buildDeployerOptions(envRecord, soajs, BL, {technology: 'vm'});
										options.params = {
											location: soajs.inputmaskData.location,
											infraAccountId: soajs.inputmaskData.infraAccountId,
											vmName: soajs.inputmaskData.name
										};
										options.infra = {
											api: infraRecord.api
										};
										function maintenance(){
											deployer.execute({
												type: "infra",
												name: infraRecord.name,
												technology: "vm"
											}, soajs.inputmaskData.operation, options, (error) => {
												if (error) {
													soajs.log.error(error);
												}
												else {
													soajs.log.info(`Maintenance operation ${soajs.inputmaskData.operation} done!`);
												}
											});
										}
										soajs.log.info(`Maintenance operation ${soajs.inputmaskData.operation} started!`);
										maintenance();
										return cbMain(null, true);
									});
								});
							});
						});
					});
				});
			});
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
