'use strict';
const fs = require("fs");
const async = require("async");
const hash = require('object-hash');

const utils = require("../../../utils/utils.js");
const helper = require("./helper.js");
const templates = require("./templates.js");
const clusters = require("./cluster.js");
let colName = "infra";

function checkIfError(soajs, mainCb, data, cb) {
	utils.checkErrorReturn(soajs, mainCb, data, cb);
}

function validateId(soajs, cb) {
	BL.model.validateId(soajs, cb);
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

		if (soajs.inputmaskData.envCode) {
			opts.conditions = {"deployments.environments": {"$in": [soajs.inputmaskData.envCode.toUpperCase()]}};
		}

		if (soajs.inputmaskData.technology) {
			opts.conditions = {"deployments.technology": soajs.inputmaskData.technology};
		}

		BL.model.findEntries(soajs, opts, function (err, records) {
			checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, function () {

				//todo: call the drivers to get the regions for each provider before returning the response
				async.mapSeries(records, (oneInfra, mCb) => {

					let options = {
						soajs: soajs,
						env: process.env.SOAJS_ENV.toLowerCase(),
						model: BL.model
					};
					options.infra = oneInfra;

					async.auto({
						"getRegions": (vCb) => {
							//get resion api info by calling deployer
							deployer.execute({
								'type': 'infra',
								'driver': oneInfra.name,
								'technology': 'cluster'
							}, 'getRegions', options, (error, regions) => {
								checkIfError(soajs, vCb, {config: config, error: error, code: 600}, function () {
									oneInfra.regions = regions.regions;
									oneInfra.templatesTypes = oneInfra.templates;
									return vCb();
								});
							});
						},
						"getLocalTemplates": ['getRegions', (info, vCb) => {
							if (!oneInfra.templatesTypes || oneInfra.templatesTypes.indexOf('local') === -1) {
								return vCb();
							}

							oneInfra.templates = [];
							let opts = {
								collection: "templates",
								conditions: {
									"type": "_infra",
									"infra": oneInfra._id.toString()
								}
							};
							BL.model.findEntries(soajs, opts, function (error, records) {
								checkIfError(soajs, vCb, {config: config, error: error, code: 600}, function () {
									oneInfra.templates = records;
									return vCb();
								});
							});
						}],
						"getRemoteTemplates": ['getRegions', (info, vCb) => {
							if (!oneInfra.templatesTypes || oneInfra.templatesTypes.indexOf('external') === -1) {
								return vCb();
							}

							oneInfra.templates = [];
							//get resion api info by calling deployer
							deployer.execute({
								'type': 'infra',
								'driver': oneInfra.name,
								'technology': 'cluster'
							}, 'getFiles', options, (error, templates) => {
								checkIfError(soajs, vCb, {config: config, error: error, code: 600}, function () {
									if(!templates || templates.length === 0){
										return vCb();
									}

									let templateInputs = {};
									async.eachSeries(templates, (oneTemplate, fCb) => {
										if (oneTemplate.type && oneTemplate.type === 'inputsAndDisplay') {
											options.params = {id: oneTemplate.id};
											deployer.execute({
												'type': 'infra',
												'driver': oneInfra.name,
												'technology': 'cluster'
											}, 'downloadFile', options, (error, response) => {
												checkIfError(soajs, fCb, {
													config: config,
													error: error,
													code: 600
												}, function () {
													let tempFilePath = __dirname + "/" + oneTemplate.name;
													if(tempFilePath.indexOf(".json") === -1){
														tempFilePath += ".json";
													}

													let tempFile = fs.createWriteStream(tempFilePath, {"encoding": "utf8"});
													response.stream.pipe(tempFile);

													tempFile.on('error', (error) => {
														return fCb(error);
													});

													tempFile.on('close', () => {
														try {
															if (require.resolve(tempFilePath)) {
																delete require.cache[require.resolve(tempFilePath)];
															}
															let inputs = require(tempFilePath);
															templateInputs[oneTemplate.tags.template] = inputs;
														}
														catch (e) {
															soajs.log.error(e);
														}
														//clean up
														fs.unlink(tempFilePath, (error) => {
															if(error){
																soajs.log.error(error);
															}
															return fCb();
														});
													});
												});
											});
										}
										else {
											return fCb();
										}
									}, (error) => {
										checkIfError(soajs, vCb, {
											config: config,
											error: error,
											code: (error && error.code) ? error.code : 600
										}, () => {
											async.each(templates, (oneTemplate, lCb) => {
												if (oneTemplate.type && oneTemplate.type === 'template') {
													let myTemplate = {
														_id: oneTemplate.id,
														name: oneTemplate.name,
														description: oneTemplate.description,
														location: "external",
														tags: oneTemplate.tags
													};

													if(templateInputs && templateInputs[oneTemplate.id]){
														myTemplate.inputs = templateInputs[oneTemplate.id].inputs;
														myTemplate.display = templateInputs[oneTemplate.id].display;
													}

													oneInfra.templates.push(myTemplate);

												}
												return lCb();
											}, vCb);
										});
									});
								});
							});
						}]
					}, mCb);
				}, (error) => {
					checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
						return cbMain(null, records);
					});
				});
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
			checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
				async.each(infraProviders, (oneProvider, mCb) => {
					if (oneProvider.label === soajs.inputmaskData.label) {
						return mCb(new Error("Another Provider with the same name exists!"));
					}
					else if (hash(oneProvider.api) === hash(soajs.inputmaskData.api)) {
						return mCb(new Error("Another Provider with the same configuration exists!"));
					}
					else {
						return mCb();
					}
				}, (error) => {
					checkIfError(soajs, cbMain, {config: config, error: error, code: 173}, function () {
						//authenticate api info by calling deployer
						let options = {
							soajs: soajs,
							env: process.env.SOAJS_ENV.toLowerCase(),
							model: BL.model
						};

						let technology = 'cluster';
						let driverName = soajs.inputmaskData.name;
						if (['docker', 'kubernetes'].indexOf(soajs.inputmaskData.name) !== -1) {
							technology = soajs.inputmaskData.name;
							driverName = 'local';
						}

						options.infra = {
							name: driverName,
							api: soajs.inputmaskData.api,
							stack: {
								technology: technology
							}
						};

						deployer.execute({
							'type': 'infra',
							'driver': driverName,
							'technology': 'cluster'
						}, 'authenticate', options, (error) => {
							checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {

								deployer.execute({
									'type': 'infra',
									'driver': driverName,
									'technology': 'cluster'
								}, 'getExtras', options, (error, extras) => {
									checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {

										//insert provider record
										let opts = {
											collection: colName,
											record: {
												api: options.infra.api,
												name: driverName,
												technologies: extras.technologies,
												templates: extras.templates,
												label: soajs.inputmaskData.label,
												deployments: []
											}
										};
										BL.model.insertEntry(soajs, opts, function (err, records) {
											checkIfError(soajs, cbMain, {
												config: config,
												error: err,
												code: 600
											}, function () {
												return cbMain(null, records);
											});
										});
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
	 * Modify infra provider connection
	 * @param config
	 * @param soajs
	 * @param deployer
	 * @param cbMain
	 */
	"modify": function (config, soajs, deployer, cbMain) {
		//check id if valid
		validateId(soajs, function (err) {
			checkIfError(soajs, cbMain, {config: config, error: err, code: 490}, function () {

				//get record
				let opts = {
					collection: colName,
					conditions: {
						_id: soajs.inputmaskData.id
					}
				};
				BL.model.findEntry(soajs, opts, function (err, record) {
					checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, function () {

						//authenticate api info by calling deployer
						let options = {
							soajs: soajs,
							env: process.env.SOAJS_ENV.toLowerCase(),
							model: BL.model
						};

						let technology = (record.name === 'local') ? record.technologies[0] : 'cluster';
						options.infra = {
							name: record.name,
							api: soajs.inputmaskData.api,
							stack: {
								technology: technology
							}
						};

						let driverName = record.name;
						deployer.execute({
							'type': 'infra',
							'driver': driverName,
							'technology': 'cluster'
						}, 'authenticate', options, (error) => {
							checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {

								deployer.execute({
									'type': 'infra',
									'driver': driverName,
									'technology': 'cluster'
								}, 'getExtras', options, (error, extras) => {
									checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
										//update provider
										record.api = options.infra.api;
										record.technologies = extras.technologies;
										record.templates = extras.templates;

										let opts = {
											collection: colName,
											conditions: {
												_id: soajs.inputmaskData.id
											},
											record: record
										};
										BL.model.saveEntry(soajs, opts, function (err) {
											checkIfError(soajs, cbMain, {
												config: config,
												error: err,
												code: 600
											}, function () {
												updateEnvironmentsUsingThisInfra(record);
											});
										});
									});
								});
							});
						});
					});
				});
			});
		});
		
		function updateEnvironmentsUsingThisInfra(infraRecord){
			if(infraRecord.name !== 'local'){ return cbMain(null, true); }
			if(infraRecord.deployments.length === 0){ return cbMain(null, true); }
			
			async.each(infraRecord.deployments, (oneDeployment, mCb) => {
				BL.model.findEntries(soajs, {
					collection: "environment",
					conditions: { "code": {$in: oneDeployment.environments }}
				}, (error, environments) => {
					checkIfError(soajs, mCb, {config: config, error: error, code: 600 }, () => {
						async.each(environments, (oneEnvRecord, eCb) => {
							soajs.log.debug("Updating Deployer Configuration for environment:", oneEnvRecord.code);
							let deployerInfo = oneEnvRecord.deployer.selected.split('.');
							oneEnvRecord.deployer[deployerInfo[0]][deployerInfo[1]][deployerInfo[2]].auth.token = infraRecord.api.token;
							oneEnvRecord.deployer[deployerInfo[0]][deployerInfo[1]][deployerInfo[2]].nodes = infraRecord.api.ipaddress;
							BL.model.saveEntry(soajs, {collection: "environment", record: oneEnvRecord }, eCb);
						}, mCb);
					});
				});
			}, (error) => {
				checkIfError(soajs, cbMain, {config: config, error: error, code: (error) ? error.code : 600 }, () => {
					return cbMain(null, true);
				});
			});
		}
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
			checkIfError(soajs, cbMain, {config: config, error: err, code: 490}, function () {

				//get provider record
				let opts = {
					collection: colName,
					conditions: {
						_id: soajs.inputmaskData.id
					}
				};
				BL.model.findEntry(soajs, opts, function (err, record) {
					checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, function () {

						//check that deployments is empty
						checkIfError(soajs, cbMain, {
							config: config,
							error: (record.deployments.length > 0),
							code: 491
						}, function () {

							//remove provider record
							let opts = {
								collection: colName,
								conditions: {
									_id: soajs.inputmaskData.id
								}
							};
							BL.model.removeEntry(soajs, opts, function (err) {
								checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, function () {
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
	 * @param req
	 * @param soajs
	 * @param deployer
	 * @param cbMain
	 */
	"removeDeployment": function (config, req, soajs, deployer, cbMain) {
		//validate id
		validateId(soajs, function (err) {
			checkIfError(soajs, cbMain, {config: config, error: err, code: 490}, function () {

				//get provider record
				let opts = {
					collection: colName,
					conditions: {
						_id: soajs.inputmaskData.id
					}
				};
				BL.model.findEntry(soajs, opts, function (err, InfraRecord) {
					checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, function () {

						//get deployment record
						let deploymentDetails;
						for (let i = InfraRecord.deployments.length - 1; i >= 0; i--) {
							if (InfraRecord.deployments[i].id === soajs.inputmaskData.deploymentId) {
								deploymentDetails = InfraRecord.deployments[i];
							}
						}

						//call driver and trigger delete deployment
						let options = {
							soajs: soajs,
							env: process.env.SOAJS_ENV.toLowerCase(),
							model: BL.model
						};
						options.infra = InfraRecord;
						options.infra.stack = deploymentDetails;
						deployer.execute({
							'type': 'infra',
							'driver': InfraRecord.name,
							'technology': 'cluster'
						}, 'deleteCluster', options, (error) => {
							checkIfError(soajs, cbMain, {
								config: config,
								error: error && error.code !== 'MissingRequiredParameter',
								code: 600
							}, function () {
								//remove deployment from record and update provider
								for (let i = InfraRecord.deployments.length - 1; i >= 0; i--) {
									if (InfraRecord.deployments[i].id === soajs.inputmaskData.deploymentId) {
										InfraRecord.deployments.splice(i, 1);
									}
								}
								delete InfraRecord.stack;
								let opts = {
									collection: colName,
									record: InfraRecord
								};
								BL.model.saveEntry(soajs, opts, function (err) {
									checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, function () {
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
	
	/**
	 * Create new Cluster at infra
	 * @param config
	 * @param req
	 * @param soajs
	 * @param deployer
	 * @param cbMain
	 */
	"deployCluster": function (config, req, soajs, deployer, cbMain) {
		clusters.deployCluster(config, req, soajs, BL, deployer, cbMain);
	},
	
	/**
	 * Get Cluster Status from infra
	 * @param config
	 * @param req
	 * @param soajs
	 * @param deployer
	 * @param cbMain
	 */
	"getDeployClusterStatus": function (config, req, soajs, deployer, cbMain) {
		clusters.getDeployClusterStatus(config, req, soajs, BL, deployer, cbMain);
	},
	
	/**
	 * Get Cluster DNS information
	 * @param config
	 * @param req
	 * @param soajs
	 * @param deployer
	 * @param cbMain
	 */
	"getDNSInfo": function (config, req, soajs, deployer, cbMain) {
		clusters.getDNSInfo(config, req, soajs, BL, deployer, cbMain);
	},
	
	/**
	 * get infra supported regions
	 * @param config
	 * @param soajs
	 * @param deployer
	 * @param cbMain
	 */
	"getRegions": function (config, soajs, deployer, cbMain) {

		helper.getCommonData(config, soajs, BL, cbMain, (InfraRecord, environmentRecord, info) => {

			let stack = info[0];
			let options = utils.buildDeployerOptions(environmentRecord, soajs, BL);
			options.infra = InfraRecord;
			options.infra.stack = stack;

			deployer.execute({
				'type': 'infra',
				'driver': InfraRecord.name,
				'technology': 'cluster'
			}, 'getRegions', options, (error, response) => {
				checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
					return cbMain(null, response);
				});
			});
		});
	},
	
	/**
	 * scale deployed cluster
	 * @param config
	 * @param soajs
	 * @param deployer
	 * @param cbMain
	 */
	"scaleCluster": function (config, soajs, deployer, cbMain) {
		clusters.scaleCluster(config, soajs, BL, deployer, cbMain);
	},
	
	/**
	 * get cluster details
	 * @param config
	 * @param soajs
	 * @param deployer
	 * @param cbMain
	 */
	"getCluster": function (config, soajs, deployer, cbMain) {
		clusters.getCluster(config, soajs, BL, deployer, cbMain);
	},
	
	/**
	 * Update Deployed Cluster
	 * @param config
	 * @param soajs
	 * @param deployer
	 * @param cbMain
	 */
	"updateCluster": function (config, soajs, deployer, cbMain) {
		clusters.updateCluster(config, soajs, BL, deployer, cbMain);
	},
	
	/**
	 * publish ports at infra
	 * @param config
	 * @param soajs
	 * @param deployer
	 * @param cbMain
	 */
	"publishPorts": function (config, soajs, deployer, cbMain) {
		helper.getCommonData(config, soajs, BL, cbMain, (InfraRecord, environmentRecord, info) => {

			let stack = info[0];
			let options = utils.buildDeployerOptions(environmentRecord, soajs, BL);
			options.infra = InfraRecord;
			options.infra.stack = stack;
			options.params = {
				info: info,
				name: soajs.inputmaskData.name,
				type: soajs.inputmaskData.type,
				version: soajs.inputmaskData.version,
				ports: soajs.inputmaskData.ports,
				envCode: soajs.inputmaskData.envCode,
				soajs_project: soajs.inputmaskData.soajs_project || 'local'
			};

			deployer.execute({
				'type': 'infra',
				'driver': InfraRecord.name,
				'technology': 'cluster'
			}, 'publishPorts', options, (error, response) => {
				checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
					delete InfraRecord.stack;
					BL.model.saveEntry(soajs, {
						collection: "infra",
						record: InfraRecord
					}, (error) => {
						checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, () => {
							return cbMain(null, true);
						});
					});
				});
			});
		});
	},
	
	/**
	 * remove environment from deployment. if deployment has no more environments, remove deployment.
	 * @param config
	 * @param req
	 * @param soajs
	 * @param deployer
	 * @param cbMain
	 */
	"removeEnvFromDeployment": function (config, req, soajs, deployer, cbMain) {
		BL.model.findEntry(soajs, {
			collection: "infra",
			conditions: {"deployments.environments": {"$in": [soajs.inputmaskData.envCode]}}
		}, (error, infraProvider) => {
			checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
				checkIfError(soajs, cbMain, {config: config, error: !infraProvider, code: 600}, function () {
					let deleteDeployment;
					let deleteInfra;
					infraProvider.deployments.forEach((oneDeployment) => {
						if (oneDeployment.environments && Array.isArray(oneDeployment.environments) && oneDeployment.environments.length > 0) {
							for (let i = oneDeployment.environments.length - 1; i >= 0; i--) {
								if (oneDeployment.environments[i] === soajs.inputmaskData.envCode.toUpperCase()) {
									oneDeployment.environments.splice(i, 1);
								}

								if (oneDeployment.environments.length === 0) {
									deleteDeployment = oneDeployment;
									deleteInfra = infraProvider;
								}
							}
						}
					});

					BL.model.saveEntry(soajs, {collection: "infra", record: infraProvider}, (error) => {
						checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {
							if (deleteDeployment) {
								//call driver and trigger delete deployment
								let options = {
									soajs: soajs,
									env: process.env.SOAJS_ENV.toLowerCase(),
									model: BL.model
								};
								options.infra = infraProvider;
								options.infra.stack = deleteDeployment;
								soajs.log.debug("Removing Cluster from Provider");
								deployer.execute({
									'type': 'infra',
									'driver': infraProvider.name,
									'technology': 'cluster'
								}, 'deleteCluster', options, (error) => {
									checkIfError(soajs, cbMain, {config: config, error: error, code: 600}, function () {

										//remove deployment from record

										for (let depIndex = infraProvider.deployments.length - 1; depIndex >= 0; depIndex--) {
											if (infraProvider.deployments[depIndex].id === deleteDeployment.id) {
												infraProvider.deployments.splice(depIndex, 1);
											}
										}
										delete infraProvider.stack;
										BL.model.saveEntry(soajs, {
											collection: "infra",
											record: infraProvider
										}, (error) => {
											checkIfError(soajs, cbMain, {
												config: config,
												error: error,
												code: 600
											}, function () {
												return cbMain(null, true);
											});
										});
									});
								});
							}
							else {
								return cbMain(null, true);
							}
						});
					});
				});
			});
		});
	},

	/**
	 * removes an infra as code template from the database
	 * @param config
	 * @param soajs
	 * @param deployer
	 * @param cbMain
	 */
	"removeTemplate": function (config, soajs, deployer, cbMain) {
		templates.removeTemplate(config, soajs, deployer, BL, cbMain);
	},

	/**
	 * stores a new infra as code template locally in the database for the given infra provider
	 * @param config
	 * @param soajs
	 * @param cbMain
	 */
	"addTemplate": function (config, soajs, cbMain) {
		templates.addTemplate(config, soajs, BL, cbMain);
	},

	/**
	 * update an infra as code template that is stored locally
	 * @param config
	 * @param soajs
	 * @param cbMain
	 */
	"updateTemplate": function (config, soajs, cbMain) {
		templates.updateTemplate(config, soajs, BL, cbMain);
	},

	/**
	 * Uploads a template to the remote infra provider CDN
	 * @param config
	 * @param req
	 * @param soajs
	 * @param deployer
	 * @param cbMain
	 */
	"uploadTemplate": function (config, req, soajs, deployer, cbMain) {
		templates.uploadTemplate(config, soajs, BL, deployer, cbMain);
	},
	
	/**
	 * Method that generates a file from the posted body inputs and sends it to the cloostro driver to store it on remote location
	 * @param config
	 * @param req
	 * @param soajs
	 * @param deployer
	 * @param cbMain
	 */
	"uploadTemplateInputsFile": function (config, req, soajs, deployer, cbMain) {
		templates.uploadTemplateInputsFile(config, soajs, BL, deployer, cbMain);
	},

	/**
	 * Downloads a template from the remote infra provider CDN
	 * @param config
	 * @param soajs
	 * @param deployer
	 * @param res
	 * @param cbMain
	 */
	"downloadTemplate": function (config, soajs, deployer, res, cbMain) {
		templates.downloadTemplate(config, soajs, BL, deployer, res, cbMain);
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
