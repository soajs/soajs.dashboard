'use strict';

const fs = require('fs');
const async = require('async');
const utils = require("../../utils/utils.js");

const resourcesColName = 'resources';
const tenantsColName = 'tenants';

function checkIfOwner(soajs, cb) {
	var uracRecord = soajs.urac;
	var opts = {
		collection: tenantsColName,
		conditions: {
			code: uracRecord.tenant.code.toUpperCase()
		}
	};

	BL.model.findEntry(soajs, opts, function (error, tenantRecord) {
		if(error) return cb(error);

		if(tenantRecord && tenantRecord.locked && uracRecord.groups.indexOf('owner') !== -1) {
			return cb(null, true);
		}

		return cb(null, false);
	});
}

var BL = {
	model: null,

	/**
	 * List all available resources that belong to or shared with an environment
	 * @param  {Object}   config
	 * @param  {Object}   req
	 * @param  {Object}   res
	 * @param  {Function} cb
	 *
	 */
	listResources: function(config, req, res, cb) {
		var opts = {
			collection: resourcesColName,
			conditions: {
				$or: [
					{
						created: req.soajs.inputmaskData.env.toUpperCase()
					},
					{
						created: { $ne: req.soajs.inputmaskData.env.toUpperCase() },
						shared: { $eq: true },
						sharedEnv: { $exists: false }
					},
					{
						created: { $ne: req.soajs.inputmaskData.env.toUpperCase() },
						shared: { $eq: true },
						sharedEnv: { $exists: true },
						['sharedEnv.' + req.soajs.inputmaskData.env.toUpperCase()]: { $exists: true, $eq: true }
					}
				]
			}
		};

		BL.model.findEntries(req.soajs, opts, function (error, resources) {
			utils.checkErrorReturn(req.soajs, cb, { config: config, error: error, code: 600 }, function() {
				return cb(null, resources);
			});
		});
	},
	
	/**
	 * Upgrade resources in requested environment to the latest version
	 * @param  {Object}   config
	 * @param  {Object}   req
	 * @param  {Object}   res
	 * @param  {Function} cb
	 *
	 */
	upgradeResources: function(config, req, res, cb){
		BL.model.findEntry(req.soajs, {
			collection: 'environment',
			conditions:{
				code: req.soajs.inputmaskData.env.toUpperCase()
			}
		}, (error, envRecord) => {
			utils.checkErrorReturn(req.soajs, cb, { config: config, error: error, code: 600 }, () => {
				if(envRecord.dbs.clusters){
					if(Object.keys(envRecord.dbs.clusters).length > 0){
						let clusters = envRecord.dbs.clusters;
						migrateClusters(clusters, () => {
							delete envRecord.dbs.clusters;
							BL.model.saveEntry(req.soajs, {collection: 'environment', record: envRecord}, (error) => {
								utils.checkErrorReturn(req.soajs, cb, { config: config, error: error, code: 600 }, () => {
									return cb(null, true);
								});
							});
						});
					}
					//minor fix in env record schema
					else{
						delete envRecord.dbs.clusters;
						BL.model.saveEntry(req.soajs, {collection: 'environment', record: envRecord}, (error) => {
							utils.checkErrorReturn(req.soajs, cb, { config: config, error: error, code: 600 }, () => {
								return cb(null, true);
							});
						});
					}
				}
				//nothing to upgrade
				else{
					return cb(null, true);
				}
			});
		});
		
		function migrateClusters(clusters, mCb){
			let clusterNames = Object.keys(clusters);
			async.each(clusterNames, (oneClusterName, cCb) =>{
				BL.model.findEntry(req.soajs, {
					collection: resourcesColName,
					conditions: {
						name: oneClusterName,
						type: 'cluster',
						created: req.soajs.inputmaskData.env.toUpperCase()
					}
				}, (error, resource)=>{
					if(error || resource){
						return cCb(error);
					}
					
					//create cluster and continue
					BL.model.insertEntry(req.soajs, {
						collection: resourcesColName,
						record: {
							name: oneClusterName,
							type: 'cluster',
							created: req.soajs.inputmaskData.env.toUpperCase(),
							author: req.soajs.urac.username,
							config: clusters[clusterNames],
							plugged: true,
							category: 'custom'
						}
					}, cCb);
				});
			}, (error) =>{
				utils.checkErrorReturn(req.soajs, cb, { config: config, error: error, code: 600 }, () => {
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
	addResource: function(config, req, res, cb) {
		var opts = {
			collection: resourcesColName,
			conditions: {
				name: req.soajs.inputmaskData.resource.name
			}
		};

		BL.model.countEntries(req.soajs, opts, function (error, count) {
			utils.checkErrorReturn(req.soajs, cb, { config: config, error: error, code: 600 }, function() {
				utils.checkErrorReturn(req.soajs, cb, { config: config, error: count > 0, code: 504 }, function() {
					opts.conditions = {};
					opts.record = req.soajs.inputmaskData.resource;

					opts.record.created = req.soajs.inputmaskData.env.toUpperCase();
					opts.record.author = req.soajs.urac.username;
					BL.model.insertEntry(req.soajs, opts, function (error) {
						utils.checkErrorReturn(req.soajs, cb, { config: config, error: error, code: 600 }, function() {
							return cb(null, true);
						});
					});
				});
			});
		});
	},

	/**
	 * Delete a resource
	 * @param  {Object}   config
	 * @param  {Object}   req
	 * @param  {Object}   res
	 * @param  {Function} cb
	 *
	 */
	deleteResource: function(config, req, res, cb) {
		BL.model.validateId(req.soajs, function(error) {
			utils.checkErrorReturn(req.soajs, cb, { config: config, error: error, code: 701 }, function() {
				var opts = {
					collection: resourcesColName,
					conditions: {
						_id: req.soajs.inputmaskData.id
					}
				};
				BL.model.findEntry(req.soajs, opts, function (error, resourceRecord) {
					utils.checkErrorReturn(req.soajs, cb, { config: config, error: error, code: 600 }, function () {
						utils.checkErrorReturn(req.soajs, cb, { config: config, error: !resourceRecord, code: 508 }, function() {
							checkIfOwner(req.soajs, function (error, isOwner) {
								utils.checkErrorReturn(req.soajs, cb, { config: config, error: error, code: 600 }, function() {
									utils.checkErrorReturn(req.soajs, cb, {
										config: config,
										error: (!isOwner && (resourceRecord.author !== req.soajs.urac.username)),
										code: 506
									}, function() {
										BL.model.removeEntry(req.soajs, opts, function(error) {
											utils.checkErrorReturn(req.soajs, cb, { config: config, error: error, code: 600 }, function() {
												return cb(null, true);
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
	 * Update a resource
	 * @param  {Object}   config
	 * @param  {Object}   req
	 * @param  {Object}   res
	 * @param  {Function} cb
	 *
	 */
	updateResource: function(config, req, res, cb) {
		BL.model.validateId(req.soajs, function(error) {
			utils.checkErrorReturn(req.soajs, cb, { config: config, error: error, code: 701 }, function() {
				var opts = {
					collection: resourcesColName,
					conditions: { _id: req.soajs.inputmaskData.id }
				};
				BL.model.findEntry(req.soajs, opts, function (error, resourceRecord) {
					utils.checkErrorReturn(req.soajs, cb, { config: config, error: error, code: 600 }, function() {
						utils.checkErrorReturn(req.soajs, cb, { config: config, error: !resourceRecord, code: 508 }, function() {
							checkIfOwner(req.soajs, function (error, isOwner) {
								utils.checkErrorReturn(req.soajs, cb, { config: config, error: error, code: 600 }, function() {
									utils.checkErrorReturn(req.soajs, cb, {
										config: config,
										error: (!isOwner && (resourceRecord.author !== req.soajs.urac.username)),
										code: 506
									}, function() {
										// keep original author and environment (even if owner modified the record)
										req.soajs.inputmaskData.resource.created = resourceRecord.created;
										req.soajs.inputmaskData.resource.author = resourceRecord.author;
										opts = {
											collection: resourcesColName,
											conditions: { _id: req.soajs.inputmaskData.id },
											fields: req.soajs.inputmaskData.resource,
											options: { upsert: true, safe: true }
										};

										BL.model.updateEntry(req.soajs, opts, function(error) {
											utils.checkErrorReturn(req.soajs, cb, { config: config, error: error, code: 600 }, function() {
												return cb(null, true);
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
