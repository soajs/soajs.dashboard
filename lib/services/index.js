'use strict';
const colName = 'services';
const favColName = 'favorite';
const envColName = 'environment';

const fs = require('fs');
const async = require('async');

const utils = require("../../utils/utils.js");

const _ = require("lodash");

function checkIfError(req, mainCb, data, cb) {
	utils.checkErrorReturn(req.soajs, mainCb, data, cb);
}

var BL = {
	model: null,
	
	"list": function (config, req, res, serviceModel, cb) {
		var opts = {};
		opts.conditions = ((req.soajs.inputmaskData.serviceNames) && (req.soajs.inputmaskData.serviceNames.length > 0)) ? {'name': {$in: req.soajs.inputmaskData.serviceNames}} : {};
		serviceModel.findEntries(req.soajs, BL.model, opts, function (error, records) {
			if (error) {
				req.soajs.log.error(error);
				return cb({code: 600, msg: error});
			}
			
			if (!req.soajs.inputmaskData.includeEnvs) {
				return cb(null, {records: records});
			}
			
			opts.collection = envColName;
			let found = false;
			if (req.soajs.urac && req.soajs.urac.groups) {
				req.soajs.urac.groups.forEach((oneGroup) => {
					if (oneGroup === config.dashboardSuperUser.group) {
						found = true;
					}
				});
				
			}
			if (found) {
				opts.conditions = {};
			} else {
				let allowedEnvs = [];
				if (req.soajs.urac.groupsConfig && req.soajs.urac.groupsConfig.allowedEnvironments) {
					if (Object.keys(req.soajs.urac.groupsConfig.allowedEnvironments).length > 0) {
						allowedEnvs = Object.keys(req.soajs.urac.groupsConfig.allowedEnvironments)
					}
				}
				if (allowedEnvs.length === 0) {
					return cb(null, {records: records, envs: []});
				}
				opts.conditions = {
					code: {"$in": allowedEnvs}
				};
			}
			BL.model.findEntries(req.soajs, opts, function (error, envRecords) {
				if (error) {
					req.soajs.log.error(error);
					return cb({code: 600, msg: error});
				}
				
				async.map(envRecords, function (oneEnv, callback) {
					return callback(null, oneEnv.code.toLowerCase());
				}, function (error, envCodes) {
					return cb(null, {records: records, envs: envCodes});
				});
			});
		});
	},
	
	"updateSettings": function (config, req, res, cb) {
		BL.model.validateId(req.soajs, function (error) {
			checkIfError(req, cb, {config: config, error: error, code: 701}, function () {
				var opts = {};
				opts.collection = colName;
				opts.conditions = {_id: req.soajs.inputmaskData.id};
				opts.fields = {
					$set: {
						[`versions.${req.soajs.inputmaskData.version}.${req.soajs.inputmaskData.env.toLowerCase()}`]: req.soajs.inputmaskData.settings
					}
				};
				opts.options = {upsert: true};
				BL.model.updateEntry(req.soajs, opts, function (error) {
					checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
						return cb(null, true);
					});
				});
			});
		});
	},
	
	"getFavorites": function (config, req, res, cb) {
		//check if user is logged in
		checkIfError(req, cb, {config: config, error: !req.soajs.urac, code: 601}, function () {
			let opts = {};
			opts.collection = favColName;
			if (req.soajs.urac.username !== req.soajs.inputmaskData.username) {
				return cb(null, {});
			}
			opts.conditions = {type: req.soajs.inputmaskData.type, "userid": req.soajs.urac._id.toString()};
			BL.model.findEntry(req.soajs, opts, function (error, record) {
				checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
					return cb(null, record);
				});
			});
		});
	},
	
	"setFavorite": function (config, req, res, serviceModel, cb) {
		let opts = {};
		opts.conditions = {
			name: req.soajs.inputmaskData.service
		};
		serviceModel.findEntry(req.soajs, BL.model, opts, function (error, records) {
			checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
				//check if service
				checkIfError(req, cb, {config: config, error: !records, code: 604}, function () {
					//check if user is logged in
					checkIfError(req, cb, {
						config: config,
						error: !req.soajs.urac || !req.soajs.urac._id,
						code: 601
					}, function () {
						let opts = {};
						opts.collection = favColName;
						opts.conditions = {type: 'apiCatalog', "userid": req.soajs.urac._id.toString()};
						opts.fields = {
							$set: {
								"type": req.soajs.inputmaskData.type,
								"userid": req.soajs.urac._id.toString()
							},
							$addToSet: {
								"favorites": req.soajs.inputmaskData.service
							}
						};
						opts.options = {upsert: true};
						BL.model.updateEntry(req.soajs, opts, function (error) {
							checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
								return cb(null, req.soajs.inputmaskData.service + "is set as favorite!");
							});
						});
					});
					
				});
			});
		});
	},
	
	"deleteFavorite": function (config, req, res, serviceModel, cb) {
		
		let opts = {};
		opts.conditions = {
			name: req.soajs.inputmaskData.service
		};
		serviceModel.findEntry(req.soajs, BL.model, opts, function (error, records) {
			checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
				//check if service
				checkIfError(req, cb, {config: config, error: !records, code: 604}, function () {
					//check if user is logged in
					checkIfError(req, cb, {
						config: config,
						error: !req.soajs.urac || !req.soajs.urac._id,
						code: 601
					}, function () {
						let opts = {};
						opts.collection = favColName;
						opts.conditions = {type: req.soajs.inputmaskData.type, "userid": req.soajs.urac._id.toString()};
						opts.fields = {
							$pull: {
								"favorites": {$in: [req.soajs.inputmaskData.service]}
							}
						};
						opts.options = {upsert: false};
						BL.model.updateEntry(req.soajs, opts, function (error) {
							checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
								return cb(null, req.soajs.inputmaskData.service + "is removed from favorites!");
							});
						});
					});
					
				});
			});
		});
	},
	
	"dashboard": function (config, req, res, serviceModel, cb) {
		let opts = {};
		let conditions = {};
		if (Object.keys(req.soajs.inputmaskData).length > 0){
			conditions = {
				'$or': []
			};
		}
		if (req.soajs.inputmaskData.tags) {
			conditions['$or'].push({
				tags: {'$in': req.soajs.inputmaskData.tags}
			});
		}
		if (req.soajs.inputmaskData.programs) {
			conditions['$or'].push({
				program: {'$in': req.soajs.inputmaskData.programs}
			});
			if (req.soajs.inputmaskData.programs.indexOf('no program') !== -1) {
				conditions['$or'].push({
					'program': {
						'$in': req.soajs.inputmaskData.attributes.programs
					}
				});
			}
		}
		if (req.soajs.inputmaskData.attributes) {
			if (Object.keys(req.soajs.inputmaskData.attributes).length > 0) {
				for (let att in req.soajs.inputmaskData.attributes) {
					conditions['$or'].push({
						["attributes." + [att]]: {'$in': req.soajs.inputmaskData.attributes[att]}
					});
				}
			}
		}
		if (req.soajs.inputmaskData.keywords) {
			if (Object.keys(req.soajs.inputmaskData.keywords).length > 0) {
				if (req.soajs.inputmaskData.keywords.serviceName){
					conditions['$or'].push({
						name: req.soajs.inputmaskData.keywords.serviceName
					});
				}
				if (req.soajs.inputmaskData.keywords.serviceGroup){
					conditions['$or'].push({
						group: req.soajs.inputmaskData.keywords.serviceGroup
					});
				}
			}
		}
		opts.conditions = conditions;
		serviceModel.findEntries(req.soajs, BL.model, opts, function (error, services) {
			if (error) {
				req.soajs.log.error(error);
				return cb({code: 600, msg: error});
			}
			let response = {
				"data": [],
				"tags": [],
				"programs": [],
				"attributes": {
				}
			};
			
			for (let i = 0; i < services.length; i++) {
				if (services[i].name && services[i].group) {
					
					if (!services[i].program || !Array.isArray(services[i].program) || services[i].program.length === 0) {
						services[i].program = ["no program"];
					}
					response.programs = _.union(response.programs, services[i].program);
					let nbVersion = 0;
					let nbAPI = 0;
					let methods = {
						get: 0,
						post: 0,
						put: 0,
						delete: 0
					};
					if (services[i].versions) {
						for (let v in services[i].versions) {
							if (services[i].versions.hasOwnProperty(v)) {
								nbVersion++;
								if (services[i].versions[v].apis) {
									nbAPI = Math.max(nbAPI, services[i].versions[v].apis.length);
									if (nbAPI === services[i].versions[v].apis.length) {
										methods = {
											get: 0,
											post: 0,
											put: 0,
											delete: 0
										};
										services[i].versions[v].apis.forEach((oneApi) => {
											if (oneApi.m === "get") {
												methods.get++;
											}
											if (oneApi.m === "put") {
												methods.put++;
											}
											if (oneApi.m === "post") {
												methods.post++;
											}
											if (oneApi.m === "delete") {
												methods.delete++;
											}
										});
									}
								}
								
							}
						}
					}
					let serviceObj = {
						"name": services[i].name,
						"versions": nbVersion,
						"APIs": nbAPI,
						"methods": methods
					};
					let groupObj = {
						"name": services[i].group,
						"services": []
					};
					
					if (services[i].tags && Array.isArray(services[i].tags) && services[i].tags.length > 0) {
						response.tags = response.tags.concat(services[i].tags)
					}
					if (services[i].attributes) {
						for (let att in services[i].attributes) {
							if (services[i].attributes.hasOwnProperty(att)) {
								if (response.attributes[att])
									response.attributes[att] = response.attributes[att].concat(services[i].attributes[att]);
								else
									response.attributes[att] = services[i].attributes[att];
							}
						}
					}
					
					
					for (let p = 0; p < services[i].program.length; p++) {
						let programPOS = response.data.map(function (e) {
							return e.name;
						}).indexOf(services[i].program[p]);
						if (programPOS !== -1) {
							if (!response.data[programPOS].groups)
								response.data[programPOS].groups = [];
							let groupPOS = response.data[programPOS].groups.map(function (e) {
								return e.name;
							}).indexOf(services[i].group);
							if (groupPOS !== -1) {
								response.data[programPOS].groups[groupPOS].services.push(serviceObj);
							} else {
								groupObj.services.push(serviceObj);
								response.data[programPOS].groups.push(groupObj);
							}
						} else {
							let programObj = {
								"name": services[i].program[p],
								"groups": []
							};
							groupObj.services.push(serviceObj);
							programObj.groups.push(groupObj);
							response.data.push(programObj);
						}
					}
				}
			}
			return cb(null, response)
		});
	},
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
