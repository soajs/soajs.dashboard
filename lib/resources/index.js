'use strict';

const fs = require('fs');
const async = require('async');
const hash = require('object-hash');
const deployer = require("soajs.core.drivers");
const soajsLib = require("soajs.core.libs");
let deployModule = require("../cloud/deploy/index.js");
const utils = require("../../utils/utils.js");
var dbModel = "mongo";

const resourcesColName = 'resources';
const cdColName = 'cicd';

function detectDashboardCluster(record, config) {
	if (record.name === config.dashboardClusterResourceName && record.type === 'cluster' && record.category === 'mongo' && record.plugged && record.shared) {
		return true;
	}

	return false;
}

function checkIfError(soajs, mainCb, data, cb) {
	utils.checkErrorReturn(soajs, mainCb, data, cb);
}

function initBLModel(req, res, BLModule, modelName, cb) {
	BLModule.init(modelName, function (error, BL) {
		if (error) {
			req.soajs.log.error(error);
			return res.json(req.soajs.buildResponse({"code": 407, "msg": config.errors[407]}));
		}
		else {
			return cb(BL);
		}
	});
}

var BL = {
	model: null,

	/**
	 * List all available resources that belong to or shared with an environment
	 * @param  {Object}   config
	 * @param  {Object}   req
	 * @param  {Object}   res
	 * @param  {Object}   serviceBL
	 * @param  {Function} cb
	 *
	 */
	listResources: function (config, req, res, serviceBL, cb) {
		let deployedServices = [];
		let deployConfig = [];

		async.series({
			"getServices": (mCb) => {
				if (req.soajs.inputmaskData.envType !== 'manual') {
					serviceBL.listServices(config, req.soajs, deployer, function (error, services) {
						checkIfError(req.soajs, cb, {config: config, error: error}, function () {
							deployedServices = services;
							return mCb();
						});
					})
				} else {
					return mCb();
				}
			},
			"getCdRecords": (mCb) => {
				BL.getConfig(config, req, res, function (error, records) {
					checkIfError(req.soajs, cb, {config: config, error: error}, function () {
						deployConfig = records;
						return mCb();
					});
				});
			},
			"getResources": (mCb) => {
				var opts = {
					collection: resourcesColName,
					conditions: {
						$or: [
							{
								created: req.soajs.inputmaskData.env.toUpperCase()
							},
							{
								created: {$ne: req.soajs.inputmaskData.env.toUpperCase()},
								shared: {$eq: true},
								sharedEnv: {$exists: false}
							},
							{
								created: {$ne: req.soajs.inputmaskData.env.toUpperCase()},
								shared: {$eq: true},
								sharedEnv: {$exists: true},
								['sharedEnv.' + req.soajs.inputmaskData.env.toUpperCase()]: {$exists: true, $eq: true}
							}
						]
					}
				};
				BL.model.findEntries(req.soajs, opts, mCb);
			}
		}, (error, result) => {
			checkIfError(req.soajs, cb, {config: config, error: error}, function () {
				utils.checkIfOwner(req.soajs, BL.model, function (error, isOwner) {
					checkIfError(req.soajs, cb, {config: config, error: error}, function () {
						let resources = result.getResources;
						async.map(result.getResources, function (oneResource, callback) {
							async.series({
								"updatePermission": (fCb) => {
									var permission = true;
									//let authorized = !!(isOwner || (req.soajs.urac.groups.indexOf(resourceRecord.author) !== -1));
									// if (!authorized) {
									// 	if (req.soajs.urac && req.soajs.urac.groupsConfig) {
									// 		req.soajs.log.debug(req.soajs.urac.groupsConfig);
									// 		if (req.soajs.urac.groupsConfig.allowedResources) {
									// 			if (Object.keys(req.soajs.urac.groupsConfig.allowedResources).length > 0) {
									// 				authorized = !!(req.soajs.urac.groupsConfig.allowedResources.indexOf(resourceRecord.author) !== -1);
									// 			}
									// 		}
									// 	}
									// }
									// if (isOwner || (req.soajs.urac.groups.indexOf(oneResource.author) !== -1) || (!oneResource.locked)) {
									// 	permission = true;
									// }

									oneResource.permission = permission;

									if (detectDashboardCluster(oneResource, config)) {
										oneResource.sensitive = true;
									}
									return fCb();
								},
								"markDeployed": (fCb) => {
									if (deployConfig && deployConfig[req.soajs.inputmaskData.env.toUpperCase()]) {
										if (deployConfig[req.soajs.inputmaskData.env.toUpperCase()][oneResource.name]) {
											var resourceConfig = deployConfig[req.soajs.inputmaskData.env.toUpperCase()][oneResource.name];
											if (!resourceConfig.deploy) return;
											if (!resourceConfig.options || !resourceConfig.options.recipe) return;

											oneResource.canBeDeployed = true;
											oneResource.deployOptions = deployConfig[req.soajs.inputmaskData.env.toUpperCase()][oneResource.name].options;

											if (deployConfig[req.soajs.inputmaskData.env.toUpperCase()][oneResource.name].status && oneResource.deployOptions.deployConfig.type === 'vm') {
												if (!oneResource.instance) {
													oneResource.isDeployed = true;
													oneResource.instance = {
														id: oneResource.name
													};
													oneResource.status = deployConfig[req.soajs.inputmaskData.env.toUpperCase()][oneResource.name].status;
													
													if(deployConfig[req.soajs.inputmaskData.env.toUpperCase()][oneResource.name].statusMsg){
														oneResource.statusMsg = deployConfig[req.soajs.inputmaskData.env.toUpperCase()][oneResource.name].statusMsg;
													}
												}
											}
										}
									}
									async.forEach(deployedServices, (deployedService, dCb) => {
										if (deployedService.labels && deployedService.labels['soajs.resource.id'] === oneResource._id.toString()) {
											oneResource.isDeployed = true;
											oneResource.instance = deployedService;
										}
										else if (deployedService.name === oneResource.name && deployedService.labels["soajs.service.technology"] === "vm") {
											oneResource.isDeployed = true;
											oneResource.instance = deployedService;
											oneResource.canBeDeployed = true;
											if (deployConfig && deployConfig[req.soajs.inputmaskData.env.toUpperCase()] && deployConfig[req.soajs.inputmaskData.env.toUpperCase()][oneResource.name]) {
												oneResource.deployOptions = deployConfig[req.soajs.inputmaskData.env.toUpperCase()][oneResource.name].options;
												oneResource.status = deployConfig[req.soajs.inputmaskData.env.toUpperCase()][oneResource.name].status;
												
												if(deployConfig[req.soajs.inputmaskData.env.toUpperCase()][oneResource.name].statusMsg){
													oneResource.statusMsg = deployConfig[req.soajs.inputmaskData.env.toUpperCase()][oneResource.name].statusMsg;
												}
											}
										}
										return dCb();
									});
									return fCb();
								}
							}, () => {
								return callback(null, oneResource);
							});
						}, () => {
							return cb(null, resources);
						});
					});
				});
			});
		});
	},

	/**
	 * Get one resource
	 * @param  {Object}   config
	 * @param  {Object}   req
	 * @param  {Object}   res
	 * @param  {Function} cb
	 *
	 */
	getResource: function (config, req, res, cb) {
		if (req.soajs.inputmaskData.id) {
			BL.model.validateId(req.soajs, function (error) {
				checkIfError(req.soajs, cb, {config: config, error: error, code: 701}, function () {
					return findResource({_id: req.soajs.inputmaskData.id});
				});
			});
		}
		else if (req.soajs.inputmaskData.name) {
			return findResource({name: req.soajs.inputmaskData.name});
		}
		else {
			return cb({code: 502, msg: config.errors[502]});
		}


		function findResource(query) {
			var opts = {
				collection: resourcesColName,
				conditions: query
			};

			BL.model.findEntry(req.soajs, opts, function (error, resource) {
				checkIfError(req.soajs, cb, {config: config, error: error, code: 600}, function () {
					checkIfError(req.soajs, cb, {config: config, error: !resource, code: 508}, function () {
						if (detectDashboardCluster(resource, config)) {
							resource.sensitive = true;
						}

						return cb(null, resource);
					});
				});
			});
		}
	},

	/**
	 * Upgrade resources in requested environment to the latest version
	 * @param  {Object}   config
	 * @param  {Object}   req
	 * @param  {Object}   res
	 * @param  {Function} cb
	 *
	 */
	upgradeResources: function (config, req, res, cb) {
		var combo = {
			collection: 'environment',
			conditions: {
				code: req.soajs.inputmaskData.env.toUpperCase()
			}
		};
		BL.model.findEntry(req.soajs, combo, (error, envRecord) => {
			checkIfError(req.soajs, cb, {config: config, error: error, code: 600}, () => {
				if (envRecord.dbs.clusters) {
					if (Object.keys(envRecord.dbs.clusters).length > 0) {
						let clusters = envRecord.dbs.clusters;
						migrateClusters(clusters, () => {
							delete envRecord.dbs.clusters;
							BL.model.saveEntry(req.soajs, {collection: 'environment', record: envRecord}, (error) => {
								checkIfError(req.soajs, cb, {config: config, error: error, code: 600}, () => {
									return cb(null, true);
								});
							});
						});
					}
					//minor fix in env record schema
					else {
						delete envRecord.dbs.clusters;
						BL.model.saveEntry(req.soajs, {collection: 'environment', record: envRecord}, (error) => {
							checkIfError(req.soajs, cb, {config: config, error: error, code: 600}, () => {
								return cb(null, true);
							});
						});
					}
				}
				//nothing to upgrade
				else {
					return cb(null, true);
				}
			});
		});

		function migrateClusters(clusters, mCb) {
			let clusterNames = Object.keys(clusters);
			async.each(clusterNames, (oneClusterName, cCb) => {
				BL.model.findEntry(req.soajs, {
					collection: resourcesColName,
					conditions: {
						name: oneClusterName,
						type: 'cluster',
						created: req.soajs.inputmaskData.env.toUpperCase()
					}
				}, (error, resource) => {
					if (error || resource) {
						return cCb(error);
					}

					//create cluster and continue
					let oneCluster = {
						collection: resourcesColName,
						record: {
							name: oneClusterName,
							type: 'cluster',
							created: req.soajs.inputmaskData.env.toUpperCase(),
							author: req.soajs.urac.groups[0],
							config: clusters[oneClusterName],
							plugged: true,
							category: (oneClusterName === config.dashboardClusterResourceName) ? 'mongo' : 'other'
						}
					};

					if (oneClusterName === config.dashboardClusterResourceName) {
						oneCluster.record.shared = true;
						//oneCluster.record.locked = true;
					}
					BL.model.insertEntry(req.soajs, oneCluster, cCb);
				});
			}, (error) => {
				checkIfError(req.soajs, cb, {config: config, error: error, code: 600}, () => {
					return mCb();
				});
			});
		}
	},

	/**
	 * Add a new resource
	 * @param  {Object}   config
	 * @param  {Object}   req
	 * @param  {Object}   res
	 * @param  {Function} cb
	 *
	 */
	addResource: function (config, req, res, cb) {
		var opts = {
			collection: resourcesColName,
			conditions: {
				name: req.soajs.inputmaskData.resource.name,
				type: req.soajs.inputmaskData.resource.type,
				category: req.soajs.inputmaskData.resource.category,
				created: req.soajs.inputmaskData.env.toUpperCase()
			}
		};

		if (req.soajs.inputmaskData.resource.name === config.dashboardClusterResourceName && req.soajs.inputmaskData.resource.type === 'cluster' && req.soajs.inputmaskData.resource.category === 'mongo') {
			return cb({code: 989, msg: config.errors[989]});
		}

		BL.model.countEntries(req.soajs, opts, function (error, count) {
			checkIfError(req.soajs, cb, {config: config, error: error, code: 600}, function () {
				checkIfError(req.soajs, cb, {config: config, error: count > 0, code: 504}, function () {
					opts.conditions = {};
					opts.record = req.soajs.inputmaskData.resource;

					opts.record.created = req.soajs.inputmaskData.env.toUpperCase();
					opts.record.author = req.soajs.urac.groups[0];
					BL.model.insertEntry(req.soajs, opts, function (error, result) {
						checkIfError(req.soajs, cb, {config: config, error: error, code: 600}, function () {
							return cb(null, result[0]);
						});
					});
				});
			});
		});
	},

	/**
	 * Add or Edit new resource
	 * @param  {Object}   config
	 * @param  {Object}   req
	 * @param  {Object}   res
	 * @param  {Object}   serviceBL
	 * @param  {Function} mainCb
	 */
	addEditResource: function (config, req, res, serviceBL, mainCb) {
		let isOnEdit = req.soajs.inputmaskData.id !== 'new';
		let returnedResult = {};
		async.auto({
			"addEditResource": (cb) => {
				if (isOnEdit) {
					if(req.soajs.inputmaskData.deployType == 'saveAndRebuild' && (!req.soajs.inputmaskData.config || !req.soajs.inputmaskData.config.deploy)){
						//error
						return cb({code: 172, msg: "Unable to rebuild resource, missing deployment inputs"});
					}
					BL.updateResource(config, req, res, cb);
				} else {
					if(req.soajs.inputmaskData.deployType == 'saveAndDeploy' && (!req.soajs.inputmaskData.config || !req.soajs.inputmaskData.config.deploy)){
						//error
						return cb({code: 172, msg: "Unable to deploy resource, missing deployment inputs"});
					}
					BL.addResource(config, req, res, cb);
				}
			},
			"configUpdate": ['addEditResource', (info, cb) => {
				if (!isOnEdit) { // on new
					let idOnNew = info.addEditResource._id.toString();
					returnedResult["id"] = idOnNew;
					req.soajs.inputmaskData.id = idOnNew;
					if (req.soajs.inputmaskData.deployType && req.soajs.inputmaskData.deployType !== 'save') {
						if(!req.soajs.inputmaskData.custom){
							req.soajs.inputmaskData.custom = {};
						}
						req.soajs.inputmaskData.custom.resourceId = idOnNew;
					}
				}
				req.soajs.inputmaskData.resourceName = req.soajs.inputmaskData.resource.name;

				if(req.soajs.inputmaskData.config){
					if( req.soajs.inputmaskData.deployType == 'save' &&
						isOnEdit &&
						req.soajs.inputmaskData.config &&
						req.soajs.inputmaskData.config.options &&
						req.soajs.inputmaskData.config.options.deployConfig &&
						req.soajs.inputmaskData.config.options.deployConfig.type === 'vm'
					){
						return cb(null, true);
					}
					else{
						BL.setConfig(config, req, res, cb);
					}
				}else{
					cb(null,true);
				}
			}],
			"deployService": ['addEditResource', 'configUpdate', (info, cb) => {
				if (req.soajs.inputmaskData.deployType && req.soajs.inputmaskData.deployType !== 'save') {
					initBLModel(req, res, deployModule, dbModel, function (deployBL) {
						if (req.soajs.inputmaskData.config && req.soajs.inputmaskData.config.deploy && req.soajs.inputmaskData.deployType === 'saveAndDeploy') {
							if(!req.soajs.inputmaskData.recipe || req.soajs.inputmaskData.recipe === '') {
								return cb({code: 172, msg: 'Missing catalog deployment recipe input'});
							}

							let inputmaskData = soajsLib.utils.cloneObj(req.soajs.inputmaskData); // copy input mask data, since deploy service is removing it
							req.soajs.inputmaskData = inputmaskData.config.options;
							if(inputmaskData.wizard){
								req.soajs.inputmaskData.wizard = inputmaskData.wizard;
							}
							
							//needed in saas mode
							if(inputmaskData.soajs_project){
								req.soajs.inputmaskData.soajs_project = inputmaskData.soajs_project;
							}
							
							req.soajs.inputmaskData.env = inputmaskData.env;
							req.soajs.inputmaskData.custom.resourceId = inputmaskData.custom.resourceId;
							req.soajs.inputmaskData.custom.env = inputmaskData.custom.env;
							if (inputmaskData.vms){
								req.soajs.inputmaskData.vms = inputmaskData.vms;
							}
							if (inputmaskData.config.options.deployConfig && inputmaskData.config.options.deployConfig.vmConfiguration
								&& inputmaskData.config.options.deployConfig.vmConfiguration.group ){
								req.soajs.inputmaskData.group = inputmaskData.config.options.deployConfig.vmConfiguration.group;
							}
							if (inputmaskData.config.options.deployConfig && inputmaskData.config.options.deployConfig
								&& inputmaskData.config.options.deployConfig.region ){
								req.soajs.inputmaskData.region = inputmaskData.config.options.deployConfig.region;
							}
							if (inputmaskData.config.options.deployConfig && inputmaskData.config.options.deployConfig.vmConfiguration
								&& inputmaskData.config.options.deployConfig.vmConfiguration.securityGroups ){
								req.soajs.inputmaskData.securityGroups = inputmaskData.config.options.deployConfig.vmConfiguration.securityGroups;
							}
							if (inputmaskData.config.options.deployConfig && inputmaskData.config.options.deployConfig.infra){
								req.soajs.inputmaskData.infraId = inputmaskData.config.options.deployConfig.infra;
							}
							if (req.soajs.inputmaskData.custom.env ){
								req.soajs.inputmaskData.custom.env = inputmaskData.custom.env;
							}
							
							deployBL.deployService(config, req, deployer, function (deployError, result) {
								if (deployError && !isOnEdit) {
									req.soajs.inputmaskData = soajsLib.utils.cloneObj(inputmaskData); // restore input mask data
									req.soajs.inputmaskData.envCode = req.soajs.inputmaskData.resource.created;
									req.soajs.inputmaskData.config = {
										deploy: false
									};
									
									BL.deleteResource(config, req, res, serviceBL, (error) => {
										checkIfError(req.soajs, cb, {config: config, error: error}, () => {
											return cb({"code": deployError.code, "msg": deployError.message || deployError.msg}); // return deploy error (not delete success/error)
										});
									});
								} else {
									if(result && result.service){
										returnedResult["depId"] = result.service.id;
									}

									//need to update cicd set status to ready
									let opts = {collection: cdColName, conditions: {type: 'resource'}};
									BL.model.findEntry(req.soajs, opts, function (error, record) {
										checkIfError(req.soajs, cb, {config: config, error: error}, () => {
											if(inputmaskData.config.options.deployConfig.type !== 'vm'){
												if(record && record[inputmaskData.env.toUpperCase()] && record[inputmaskData.env.toUpperCase()][inputmaskData.resourceName]){
													record[inputmaskData.env.toUpperCase()][inputmaskData.resourceName].status = 'ready';
													delete record[inputmaskData.env.toUpperCase()][inputmaskData.resourceName].statusMsg;
												}
											}

											opts.record = record;
											BL.model.saveEntry(req.soajs, opts, (error) => {
												checkIfError(req.soajs, cb, {config: config, error: error}, () => {
													return cb();
												});
											});
										});
									});
								}
							});
						}
						else if (req.soajs.inputmaskData.deployType === 'saveAndRebuild') {
							if(!req.soajs.inputmaskData.recipe || req.soajs.inputmaskData.recipe === '') {
								return cb({code: 172, msg: 'Missing catalog deployment recipe input'});
							}

							deployBL.redeployService(config, req, deployer, cb);
						}
						else {
							return cb();
						}
					});
				}
				else {
					return cb();
				}
			}]
		}, (error) => {
			checkIfError(req.soajs, mainCb, {config: config, error: error, code: (error && error.code) ? error.code : 600 }, () => {
				return mainCb(null, returnedResult);
			});
		});
	},

	/**
	 * Delete a resource
	 * @param  {Object}   config
	 * @param  {Object}   req
	 * @param  {Object}   res
	 * @param  {Object}   serviceBL
	 * @param  {Function} cb
	 *
	 */
	deleteResource: function (config, req, res, serviceBL, cb) {
		let originalEnv = req.soajs.inputmaskData.env;

		async.series({
			"deleteInstance": (mCb) => {
				if (req.soajs.inputmaskData.serviceId && req.soajs.inputmaskData.name) {
					serviceBL.deleteService(config, req, deployer, function (error) {
						checkIfError(req.soajs, cb, {config: config, error: error}, function () {
							return mCb();
						});
					});
				} else {
					return mCb();
				}
			},
			"deleteDeployConfig": (mCb) => {
				if (req.soajs.inputmaskData.resourceName && req.soajs.inputmaskData.config) {

					req.soajs.inputmaskData.env = req.soajs.inputmaskData.envCode;

					BL.setConfig(config, req, res, function (error) {
						checkIfError(req.soajs, cb, {config: config, error: error}, function () {
							return mCb();
						});
					});
				} else {
					return mCb();
				}
			},
			"deleteResource": (mCb) => {
				req.soajs.inputmaskData.env = originalEnv; // restore env variable

				BL.model.validateId(req.soajs, function (error) {
					checkIfError(req.soajs, cb, {config: config, error: error, code: 701}, function () {
						var opts = {
							collection: resourcesColName,
							conditions: {
								_id: req.soajs.inputmaskData.id
							}
						};
						BL.model.findEntry(req.soajs, opts, function (error, resourceRecord) {
							checkIfError(req.soajs, cb, {config: config, error: error, code: 600}, function () {
								checkIfError(req.soajs, cb, {
									config: config,
									error: !resourceRecord,
									code: 508
								}, function () {
									utils.checkIfOwner(req.soajs, BL.model, function (error, isOwner) {
										checkIfError(req.soajs, cb, {
											config: config,
											error: error,
											code: 600
										}, function () {
											checkIfError(req.soajs, cb, {
												config: config,
												error: detectDashboardCluster(resourceRecord, config),
												code: 989
											}, function () {
												let authorized = !!(isOwner || (req.soajs.urac.groups.indexOf(resourceRecord.author) !== -1));
												// if (!authorized) {
												// 	if (req.soajs.urac && req.soajs.urac.groupsConfig) {
												// 		req.soajs.log.debug(req.soajs.urac.groupsConfig);
												// 		if (req.soajs.urac.groupsConfig.allowedResources) {
												// 			if (Object.keys(req.soajs.urac.groupsConfig.allowedResources).length > 0) {
												// 				authorized = !!(req.soajs.urac.groupsConfig.allowedResources.indexOf(resourceRecord.author) !== -1);
												// 			}
												// 		}
												// 	}
												// }
												// checkIfError(req.soajs, cb, {
												// 	config: config,
												// 	error: !authorized,
												// 	code: 506
												// }, function () {
													checkIfError(req.soajs, cb, {
														config: config,
														error: (req.soajs.inputmaskData.env.toUpperCase() !== resourceRecord.created),
														code: 505
													}, function () {
														BL.model.removeEntry(req.soajs, opts, function (error) {
															checkIfError(req.soajs, cb, {
																config: config,
																error: error,
																code: 600
															}, function () {
																return cb(null, true);
															});
														});
													});
												});
											// });
										});
									});
								});
							});
						});
					});
				});
				return mCb;
			}
		});
	},

	/**
	 * Update a resource
	 * @param  {Object}   config
	 * @param  {Object}   req
	 * @param  {Object}   res
	 * @param  {Function} cb
	 *
	 */
	updateResource: function (config, req, res, cb) {
		BL.model.validateId(req.soajs, function (error) {
			checkIfError(req.soajs, cb, {config: config, error: error, code: 701}, function () {
				var opts = {
					collection: resourcesColName,
					conditions: {_id: req.soajs.inputmaskData.id}
				};
				BL.model.findEntry(req.soajs, opts, function (error, resourceRecord) {
					checkIfError(req.soajs, cb, {config: config, error: error, code: 600}, function () {
						checkIfError(req.soajs, cb, {config: config, error: !resourceRecord, code: 508}, function () {
							utils.checkIfOwner(req.soajs, BL.model, function (error, isOwner) {
								checkIfError(req.soajs, cb, {config: config, error: error, code: 600}, function () {
									//let authorized = !!(isOwner || (req.soajs.urac.groups.indexOf(resourceRecord.author) !== -1));
									// if (!authorized) {
									// 	if (req.soajs.urac && req.soajs.urac.groupsConfig) {
									// 		req.soajs.log.debug(req.soajs.urac.groupsConfig);
									// 		if (req.soajs.urac.groupsConfig.allowedResources) {
									// 			if (Object.keys(req.soajs.urac.groupsConfig.allowedResources).length > 0) {
									// 				authorized = !!(req.soajs.urac.groupsConfig.allowedResources.indexOf(resourceRecord.author) !== -1);
									// 			}
									// 		}
									// 	}
									// }
									// checkIfError(req.soajs, cb, {
									// 	config: config,
									// 	error: !authorized,
									// 	code: 506
									// }, function () {
										checkIfError(req.soajs, cb, {
											config: config,
											error: (req.soajs.inputmaskData.env.toUpperCase() !== resourceRecord.created),
											code: 505
										}, function () {
											// force original author, environment, and name
											req.soajs.inputmaskData.resource.name = resourceRecord.name;
											req.soajs.inputmaskData.resource.created = resourceRecord.created;
											req.soajs.inputmaskData.resource.author = resourceRecord.author;

											if (req.soajs.inputmaskData.resource.sharedEnv && Object.keys(req.soajs.inputmaskData.resource.sharedEnv).length === 0) {
												delete req.soajs.inputmaskData.resource.sharedEnv;
											}
											if (resourceRecord.locked){
												req.soajs.inputmaskData.resource.locked = resourceRecord.locked;
											}
											opts = {
												collection: resourcesColName,
												conditions: {_id: req.soajs.inputmaskData.id},
												fields: req.soajs.inputmaskData.resource,
												options: {upsert: true, safe: true}
											};

											if (detectDashboardCluster(resourceRecord, config)) {
												var newResourceConfig = req.soajs.inputmaskData.resource.config;

												delete resourceRecord.config;
												delete resourceRecord._id;
												delete req.soajs.inputmaskData.resource.config;

												if (hash(resourceRecord) !== hash(req.soajs.inputmaskData.resource)) {
													return cb({code: 989, msg: config.errors[989]});
												}

												if (newResourceConfig && newResourceConfig.credentials) {
													if (newResourceConfig.credentials.username === "" || newResourceConfig.credentials.password === "") {
														newResourceConfig.credentials = {};
													}
												}

												opts.fields = {
													$set: {
														config: newResourceConfig
													}
												};
											}

											BL.model.updateEntry(req.soajs, opts, function (error, result) {
												checkIfError(req.soajs, cb, {
													config: config,
													error: error,
													code: 600
												}, function () {
													return cb(null, result);
												});
											});
										});
									});
								// });
							});
						});
					});
				});
			});
		});
	},

	getConfig: function (config, req, res, cb) {
		var opts = {
			collection: cdColName,
			conditions: {type: 'resource'}
		};

		BL.model.findEntry(req.soajs, opts, function (error, resourceRecord) {
			checkIfError(req.soajs, cb, {config: config, error: error, code: 600}, function () {
				return cb(null, resourceRecord || {});
			});
		});
	},

	setConfig: function (config, req, res, cb) {
		var opts = {collection: cdColName, conditions: {type: 'resource'}};
		BL.model.findEntry(req.soajs, opts, function (error, record) {
			checkIfError(req.soajs, cb, {config: config, error: error, code: 600}, function () {
				if (!record) {
					record = {type: 'resource'};
				}

				if (!record[req.soajs.inputmaskData.env.toUpperCase()]) {
					record[req.soajs.inputmaskData.env.toUpperCase()] = {};
				}

				if (!record[req.soajs.inputmaskData.env.toUpperCase()][req.soajs.inputmaskData.resourceName]) {
					record[req.soajs.inputmaskData.env.toUpperCase()][req.soajs.inputmaskData.resourceName] = {};
				}

				if (req.soajs.inputmaskData.config.status) {
					record[req.soajs.inputmaskData.env.toUpperCase()][req.soajs.inputmaskData.resourceName].status = req.soajs.inputmaskData.config.status;
				}

				if (req.soajs.inputmaskData.config.deploy && req.soajs.inputmaskData.config.options && Object.keys(req.soajs.inputmaskData.config.options).length > 0) {
					record[req.soajs.inputmaskData.env.toUpperCase()][req.soajs.inputmaskData.resourceName] = req.soajs.inputmaskData.config;
				}
				else {
					delete record[req.soajs.inputmaskData.env.toUpperCase()][req.soajs.inputmaskData.resourceName];
				}

				opts = {collection: cdColName, record: record};
				BL.model.saveEntry(req.soajs, opts, function (error) {
					checkIfError(req.soajs, cb, {config: config, error: error, code: 600}, function () {
						return cb(null, true);
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
		modelPath = __dirname + "/../../models/" + modelName + ".js";
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
