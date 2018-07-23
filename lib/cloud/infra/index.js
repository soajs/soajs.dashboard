'use strict';
const fs = require("fs");
const async = require("async");
const hash = require('object-hash');

const utils = require("../../../utils/utils.js");
const helper = require("./helper.js");
const templates = require("./templates.js");
const clusters = require("./cluster.js");
const vms = require("./vm.js");
const extras = require("./extras.js");

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
	 * @param {Object} soajs
	 * @param {function} deployer
	 * @param {function} cbMain
	 */
	"list": function (config, soajs, deployer, cbMain) {
		let opts = {
			collection: colName
		};

		if(soajs.inputmaskData.id){
			soajs.inputmaskData.id = new BL.model.validateCustomId(soajs, soajs.inputmaskData.id);
			opts.conditions = { "_id" : soajs.inputmaskData.id };
		}
		else{
			if (soajs.inputmaskData.envCode) {
				opts.conditions = {"deployments.environments": {"$in": [soajs.inputmaskData.envCode.toUpperCase()]}};
			}
	
			if (soajs.inputmaskData.technology) {
				opts.conditions = {"deployments.technology": soajs.inputmaskData.technology};
			}
		}
		soajs.log.info(opts);
		BL.model.findEntries(soajs, opts, function (err, records) {
			checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, function () {
				if(records.length===0){
					soajs.log.info('No Infra records found');
				}
				//call the drivers to get the regions for each provider before returning the response
				async.mapSeries(records, (oneInfra, mCb) => {

					let options = {
						soajs: soajs,
						env: process.env.SOAJS_ENV.toLowerCase(),
						model: BL.model
					};
					options.infra = oneInfra;
					oneInfra.templatesTypes = oneInfra.templates;
					async.auto({
						"getRegions": (vCb) => {
							if(soajs.inputmaskData.exclude && soajs.inputmaskData.exclude.indexOf("regions") !== -1){
								return vCb();
							}
							//get resion api info by calling deployer
							deployer.execute({
								'type': 'infra',
								'driver': oneInfra.name,
								'technology': 'cluster'
							}, 'getRegions', options, (error, regions) => {
								checkIfError(soajs, vCb, {config: config, error: error, code: 600}, function () {
									oneInfra.regions = regions.regions;
									return vCb();
								});
							});
						},
						"getGroups": (vCb) => {
							if(soajs.inputmaskData.exclude && soajs.inputmaskData.exclude.indexOf("groups") !== -1){
								return vCb();
							}
							//get groups available for this infra (if applicable)
							deployer.execute({
								'type': 'infra',
								'driver': oneInfra.name,
								'technology': 'vm'
							}, 'listGroups', options, (error, groups) => {
								if(error) {
									if(error.source ==='driver' && error.code === 519){
										soajs.log.debug(error);
									}
									else{
										soajs.log.error(error);
									}
									groups = [];
								}

								oneInfra.groups = groups;
								return vCb();
							});
						},
						"getLocalTemplates": ['getRegions', (info, vCb) => {
							if(soajs.inputmaskData.exclude && soajs.inputmaskData.exclude.indexOf("templates") !== -1){
								return vCb();
							}
							templates.getLocalTemplates(soajs, config, BL, oneInfra, vCb);
						}],
						"getRemoteTemplates": ['getRegions', (info, vCb) => {
							if(soajs.inputmaskData.exclude && soajs.inputmaskData.exclude.indexOf("templates") !== -1){
								return vCb();
							}
							templates.getRemoteTemplates(soajs, config, BL, oneInfra, deployer, options, vCb);
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
	 * Get One Activated Infra Provider
	 * @param config
	 * @param soajs
	 * @param deployer
	 * @param cbMain
	 */
	"get": function(config, soajs, deployer, cbMain) {
		BL.list(config, soajs, deployer, (error, data) =>{
			if(data){
				data = data[0];
			}
			return cbMain(error, data);
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
					else if (oneProvider.api && soajs.inputmaskData.api && hash(oneProvider.api) === hash(soajs.inputmaskData.api)) {
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
												drivers: extras.drivers,
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
										record.drivers = extras.drivers;

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
								
								let environmentsAffected = [];
								let technology = '';
								//remove deployment from record and update provider
								for (let i = InfraRecord.deployments.length - 1; i >= 0; i--) {
									if (InfraRecord.deployments[i].id === soajs.inputmaskData.deploymentId) {
										technology = InfraRecord.deployments[i].technology;
										environmentsAffected = environmentsAffected.concat(InfraRecord.deployments[i].environments);
										InfraRecord.deployments.splice(i, 1);
									}
								}
								delete InfraRecord.stack;
								let opts = {
									collection: colName,
									record: InfraRecord
								};
								BL.model.saveEntry(soajs, opts, (err) => {
									checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, () => {
										
										if(environmentsAffected.length === 0){
											return cbMain(null, true);
										}
										
										opts = {
											collection: 'environment',
											options: {
												safe: true,
												upsert: false,
												multi: true
											},
											conditions: {
												code: { $in: environmentsAffected }
											},
											fields: {
												$set: {
													"deployer.type": "manual",
													"deployer.selected": "manual"
												}
											}
										};
										BL.model.updateEntry(soajs, opts, (err) => {
											checkIfError(soajs, cbMain, {config: config, error: err, code: 600}, () => {
												return cbMain(null, true);
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
	 * remove environment from deployment. if deployment has no more environments, remove deployment.
	 * @param config
	 * @param req
	 * @param soajs
	 * @param deployer
	 * @param cbMain
	 */
	"removeEnvFromDeployment": function (config, req, soajs, deployer, cbMain) {
		clusters.removeEnvFromDeployment(config, req, soajs, BL, deployer, cbMain);
	},

	/**
	 * removes an infra as code template from the database
	 * @param config
	 * @param soajs
	 * @param deployer
	 * @param cbMain
	 */
	"removeTemplate": function (config, soajs, deployer, cbMain) {
		templates.removeTemplate(config, soajs, BL, deployer, cbMain);
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
		templates.uploadTemplate(config, req, soajs, BL, deployer, cbMain);
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
		templates.uploadTemplateInputsFile(config, req, soajs, BL, deployer, cbMain);
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
	},


	/**
	 * VM Layer Management Operations
	 */

	/**
	 * Create new vm layer at infra
	 * @param config
	 * @param req
	 * @param soajs
	 * @param deployer
	 * @param cbMain
	 */
	"deployVM": function (config, req, soajs, deployer, cbMain) {
		vms.deployVM(config, soajs, BL, deployer, cbMain);
	},

	/**
	 * Update vm layer at infra
	 * @param config
	 * @param req
	 * @param soajs
	 * @param deployer
	 * @param cbMain
	 */
	"updateVM": function (config, req, soajs, deployer, cbMain) {
		vms.updateVM(config, soajs, BL, deployer, cbMain);
	},

	/**
	 * Get vm layer Status from infra
	 * @param config
	 * @param req
	 * @param soajs
	 * @param deployer
	 * @param cbMain
	 */
	"getDeployVMStatus": function (config, req, soajs, deployer, cbMain) {
		vms.getDeployVMStatus(config, soajs, BL, deployer, cbMain);
	},

	/**
	 * destroys a vm layer
	 * @param config
	 * @param req
	 * @param soajs
	 * @param deployer
	 * @param cbMain
	 */
	"destroyVM": function (config, req, soajs, deployer, cbMain) {
		vms.destroyVM(config, soajs, BL, deployer, cbMain);
	},

	/**
	 * Get extra components for an infra provider
	 * @param  {Object} 	config
	 * @param  {Object} 	req
	 * @param  {Object} 	soajs
	 * @param  {Object} 	BL
	 * @param  {Object} 	deployer
	 * @param  {Function} 	cbMain
	 * @return {void}
	 */
	"getExtras": function(config, req, soajs, deployer, cbMain) {
		extras.getExtras(config, req, soajs, BL, deployer, cbMain);
	},

	/**
	 * Create a components for an infra provider
	 * @param  {Object} 	config
	 * @param  {Object} 	req
	 * @param  {Object} 	soajs
	 * @param  {Object} 	deployer
	 * @param  {Function} 	cbMain
	 * @return {void}
	 */
	"createExtras": function(config, req, soajs, deployer, cbMain) {
		extras.createExtras(config, req, soajs, BL, deployer, cbMain);
	},

	/**
	 * Update a components for an infra provider
	 * @param  {Object} 	config
	 * @param  {Object} 	req
	 * @param  {Object} 	soajs
	 * @param  {Object} 	deployer
	 * @param  {Function} 	cbMain
	 * @return {void}
	 */
	"updateExtras": function(config, req, soajs, deployer, cbMain) {
		extras.updateExtras(config, req, soajs, BL, deployer, cbMain);
	},

	/**
	 * Delete a components for an infra provider
	 * @param  {Object} 	config
	 * @param  {Object} 	req
	 * @param  {Object} 	soajs
	 * @param  {Object} 	deployer
	 * @param  {Function} 	cbMain
	 * @return {void}
	 */
	"deleteExtras": function(config, req, soajs, deployer, cbMain) {
		extras.deleteExtras(config, req, soajs, BL, deployer, cbMain);
	},

    "onboardVM": function(config, req, soajs, deployer, cbMain) {
        vms.onBoardVM(config, soajs, BL, deployer, cbMain);
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
