'use strict';

var utils = require('../../utils/utils.js');

var colName = 'catalogs';
var fs = require('fs');
var async = require('async');

function checkIfError(req, mainCb, data, cb) {
	utils.checkErrorReturn(req.soajs, mainCb, data, cb);
}

function validateId(soajs, cb) {
	BL.model.validateId(soajs, cb);
}

/**
 *  check the presence and configuration of source code attachment to a recipe
 * @param config
 * @param catalog
 * @param cb
 * @returns {*}
 */
function validateSourceCodeAttachment(config, catalog, cb) {
	if (catalog.recipe.deployOptions.sourceCode) {
		if (catalog.recipe.deployOptions.sourceCode.configuration) {
			
			if (!catalog.recipe.deployOptions.sourceCode.configuration.label) {
				return cb({error: config.errors[791], code: 791});
			}
			
			if (catalog.recipe.deployOptions.sourceCode.configuration.repo && !catalog.recipe.deployOptions.sourceCode.configuration.branch) {
				// if repository is selected, a branch must be selected too
				return cb({error: config.errors[791], code: 791});
			}
		}
		
		if (catalog.recipe.deployOptions.sourceCode.custom) {
			
			// custom repos should only be available for resources of types: server
			let allowedTypes = ['server']; //
			if (allowedTypes.indexOf(catalog.type) === -1) {
				return cb({error: config.errors[792], code: 792});
			}
			
			if (!catalog.recipe.deployOptions.sourceCode.custom.label || !catalog.recipe.deployOptions.sourceCode.custom.type) {
				return cb({error: config.errors[793], code: 793});
			}
			
			if (catalog.recipe.deployOptions.sourceCode.custom.repo && !catalog.recipe.deployOptions.sourceCode.custom.branch) {
				// if repository is selected, a branch must be selected too
				return cb({error: config.errors[793], code: 793});
			}
		}
	}
	return cb();
}

/**
 * function that validatest the the port configuration is correct
 * @param config
 * @param catalog
 * @param cb
 * @returns {*}
 */
function checkPorts(config, catalog, cb) {
	if (!catalog.recipe.deployOptions || !catalog.recipe.deployOptions.ports || catalog.recipe.deployOptions.ports.length === 0) {
		return cb();
	}
	if (catalog && catalog.restriction && catalog.restriction.deployment && catalog.restriction.deployment[0] && catalog.restriction.deployment[0] === 'vm') {
		return cb();
	}
	
	var type;
	var ports = catalog.recipe.deployOptions.ports;
	async.each(ports, function (onePort, callback) {
		/**
		 validate port schema
		 isPublished value should be provided
		 multiple port object schema is invalid
		 isPublished false ==> no published ports
		 isPublished true && published ==> nodeport
		 isPublished false && published ==> loadbalancer
		 */
		var temp;
		if (onePort.isPublished || onePort.published) {
			temp = onePort.published ? "nodeport" : "loadbalancer";
			if (!type) {
				type = temp;
			} else if (type !== temp) {
				return callback({invalidPorts: true});
			}
		}
		
		//if isPublished is set to false and published port is set delete published port
		if (!onePort.isPublished && onePort.published) {
			delete onePort.published;
		}
		
		if (!onePort.published) {
			return callback();
		}
		
		if (onePort.published && onePort.published < config.kubeNginx.minPort || onePort.published > config.kubeNginx.maxPort) {
			return callback({wrongPort: onePort});
		}
		return callback();
	}, function (error) {
		if (error) {
			if (error.wrongPort) {
				var errMsg = config.errors[824];
				return cb({"code": 824, "msg": errMsg});
			}
			if (error.invalidPorts) {
				return cb({"code": 826, "msg": config.errors[826]});
			}
		} else {
			return cb();
		}
	});
}

/**
 * function that checks that the volumes have the correct schemas
 * @param config
 * @param catalog
 * @param cb
 */
function checkVolumes(config, catalog, cb) {
	//check that volume is using the latest schema.
	
	//check that if volume is latest schema, docker has type in it if docker is present
	//checking if volumes have new schema and if docker is present with a type
	if (catalog.recipe && catalog.recipe.deployOptions && catalog.recipe.deployOptions.voluming) {
		if (!Array.isArray(catalog.recipe.deployOptions.voluming)) {
			return cb({code: '948', 'msg': config.errors['948']}); //old schema detected
		}
		
		if (catalog.recipe.deployOptions.voluming.length > 0) {
			let errorfound = false;
			catalog.recipe.deployOptions.voluming.forEach((oneVolume) => {
				if (oneVolume.docker && oneVolume.docker.volume && (!oneVolume.docker.volume.Type || oneVolume.docker.volume.Type === '')) {
					errorfound = true;
				}
			});
			
			if (errorfound) {
				return cb({'code': "949", "msg": config.errors['949']});
			}
		}
		return cb();
	} else return cb();
}

var BL = {
	model: null,
	
	"list": function (config, req, cb) {
		var opts = {};
		opts.collection = colName;
		if (Object.hasOwnProperty.call(req.soajs.inputmaskData, 'version') && req.soajs.inputmaskData.version) {
			opts.collection = colName + "_versioning";
		}
		
		if (Object.hasOwnProperty.call(req.soajs.inputmaskData, 'soajs')) {
			if (req.soajs.inputmaskData.soajs) {
				opts.conditions = {
					soajs: req.soajs.inputmaskData.soajs
				}
			} else {
				opts.conditions = {
					"$or": [
						{
							soajs: req.soajs.inputmaskData.soajs
						},
						{
							soajs: {$exists: false}
						}
					]
					
				}
			}
			
		}
		if (req.soajs.inputmaskData.skip || req.soajs.inputmaskData.limit) {
			opts.options = {};
			if (req.soajs.inputmaskData.skip) {
				opts.options.skip = req.soajs.inputmaskData.skip;
			}
			if (req.soajs.inputmaskData.limit) {
				opts.options.limit = req.soajs.inputmaskData.limit;
			}
		}
		BL.model.findEntries(req.soajs, opts, function (error, records) {
			checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
				async.map(records, function (oneRecord, callback) {
					if (oneRecord.recipe.deployOptions && oneRecord.recipe.deployOptions.labels) {
						utils.normalizeKeyValues(oneRecord.recipe.deployOptions.labels, config.tokens.dotToken, config.tokens.dotValue, function (error, updatedRecord) {
							oneRecord.recipe.deployOptions.labels = updatedRecord;
							return callback(null, oneRecord);
						});
					} else {
						return callback(null, oneRecord);
					}
				}, cb);
			});
		});
	},
	
	"add": function (config, req, cb) {
		if (req.soajs.inputmaskData.catalog.locked) {
			// do not allow user to lock a record
			delete req.soajs.inputmaskData.catalog.locked;
		}
		
		//validate recipes
		async.series({
			"checkSourCode": function (mCb) {
				validateSourceCodeAttachment(config, req.soajs.inputmaskData.catalog, mCb);
			},
			"checkPorts": function (mCb) {
				checkPorts(config, req.soajs.inputmaskData.catalog, mCb);
			},
			"checkVolumes": function (mCb) {
				checkVolumes(config, req.soajs.inputmaskData.catalog, mCb);
			}
		}, (error) => {
			checkIfError(req, cb, {config: config, error: error, code: (error) ? error.code : 701}, function () {
				if (req.soajs.inputmaskData.catalog.recipe && req.soajs.inputmaskData.catalog.recipe.deployOptions && req.soajs.inputmaskData.catalog.recipe.deployOptions.labels) {
					var recipeLabels = req.soajs.inputmaskData.catalog.recipe.deployOptions.labels;
					utils.normalizeKeyValues(recipeLabels, config.tokens.dotRegexString, config.tokens.dotToken, function (error, updatedRecord) {
						req.soajs.inputmaskData.catalog.recipe.deployOptions.labels = updatedRecord;
						return save();
					});
				} else {
					return save();
				}
			});
		});
		
		function save() {
			if (req.soajs.inputmaskData.catalog &&
				req.soajs.inputmaskData.catalog.recipe &&
				req.soajs.inputmaskData.catalog.recipe.deployOptions) {
				if (req.soajs.inputmaskData.catalog.recipe.deployOptions.readinessProbe &&
					typeof (req.soajs.inputmaskData.catalog.recipe.deployOptions.readinessProbe) === 'object' &&
					Object.keys(req.soajs.inputmaskData.catalog.recipe.deployOptions.readinessProbe).length === 0) {
					req.soajs.inputmaskData.catalog.recipe.deployOptions.readinessProbe = null;
				}
				if (req.soajs.inputmaskData.catalog.recipe.deployOptions.livenessProbe &&
					typeof (req.soajs.inputmaskData.catalog.recipe.deployOptions.livenessProbe) === 'object' &&
					Object.keys(req.soajs.inputmaskData.catalog.recipe.deployOptions.livenessProbe).length === 0) {
					req.soajs.inputmaskData.catalog.recipe.deployOptions.livenessProbe = null;
				}
			}
			var opts = {
				collection: colName,
				versioning: true,
				record: req.soajs.inputmaskData.catalog
			};
			BL.model.insertEntry(req.soajs, opts, function (error, record) {
				checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
					return cb(null, record[0]._id);
				});
			});
		}
	},
	
	"edit": function (config, req, cb) {
		
		//validate recipes
		async.series({
			"checkSourCode": function (mCb) {
				validateSourceCodeAttachment(config, req.soajs.inputmaskData.catalog, mCb);
			},
			"checkPorts": function (mCb) {
				checkPorts(config, req.soajs.inputmaskData.catalog, mCb);
			},
			"checkVolumes": function (mCb) {
				checkVolumes(config, req.soajs.inputmaskData.catalog, mCb);
			},
			"validateId": function (mCb) {
				validateId(req.soajs, mCb);
			}
		}, (error) => {
			checkIfError(req, cb, {config: config, error: error, code: (error) ? error.code : 701}, function () {
				var opts = {
					collection: colName,
					conditions: {_id: req.soajs.inputmaskData.id},
					versioning: true
				};
				
				BL.model.findEntry(req.soajs, opts, function (error, record) {
					checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
						checkIfError(req, cb, {config: config, error: !record, code: 950}, function () {
							checkIfError(req, cb, {config: config, error: record.locked, code: 951}, function () {
								if (req.soajs.inputmaskData.catalog.locked) {
									// do not allow user to lock a record
									delete req.soajs.inputmaskData.catalog.locked;
								}
								
								if (req.soajs.inputmaskData.catalog.recipe &&
									req.soajs.inputmaskData.catalog.recipe.deployOptions &&
									req.soajs.inputmaskData.catalog.recipe.deployOptions.labels) {
									
									var recipeLabels = req.soajs.inputmaskData.catalog.recipe.deployOptions.labels;
									utils.normalizeKeyValues(recipeLabels, config.tokens.dotRegexString, config.tokens.dotToken, function (error, updatedRecord) {
										req.soajs.inputmaskData.catalog.recipe.deployOptions.labels = updatedRecord;
										return save(opts);
									});
								} else {
									return save(opts);
								}
							});
						});
					});
				});
			});
		});
		
		function save(opts) {
			if (req.soajs.inputmaskData.catalog &&
				req.soajs.inputmaskData.catalog.recipe &&
				req.soajs.inputmaskData.catalog.recipe.deployOptions &&
				req.soajs.inputmaskData.catalog.recipe.deployOptions.readinessProbe &&
				typeof (req.soajs.inputmaskData.catalog.recipe.deployOptions.readinessProbe) === 'object' &&
				Object.keys(req.soajs.inputmaskData.catalog.recipe.deployOptions.readinessProbe).length === 0) {
				req.soajs.inputmaskData.catalog.recipe.deployOptions.readinessProbe = null;
			}
			opts.fields = {$set: req.soajs.inputmaskData.catalog};
			BL.model.updateEntry(req.soajs, opts, function (error) {
				checkIfError(req, cb, {config: config, error: error, code: 952}, function () {
					return cb(null, true);
				});
			});
		}
	},
	
	"delete": function (config, req, cb) {
		
		validateId(req.soajs, function (error) {
			checkIfError(req, cb, {config: config, error: error, code: 701}, function () {
				var opts = {
					collection: colName,
					conditions: {_id: req.soajs.inputmaskData.id}
				};
				
				if (Object.hasOwnProperty.call(req.soajs.inputmaskData, 'version')) {
					opts.collection = colName + "_versioning";
					opts.conditions = {
						refId: req.soajs.inputmaskData.id,
						v: req.soajs.inputmaskData.version
					};
				}
				
				BL.model.findEntry(req.soajs, opts, function (error, record) {
					checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
						checkIfError(req, cb, {config: config, error: !record, code: 950}, function () {
							checkIfError(req, cb, {config: config, error: record.locked, code: 951}, function () {
								BL.model.removeEntry(req.soajs, opts, function (error) {
									checkIfError(req, cb, {config: config, error: error, code: 953}, function () {
										
										return cb(null, true);
									});
								});
							});
						});
					});
				});
			});
		});
	},
	
	"get": function (config, req, cb) {
		validateId(req.soajs, function (error) {
			checkIfError(req, cb, {config: config, error: error, code: 701}, function () {
				var opts = {
					collection: colName,
					conditions: {_id: req.soajs.inputmaskData.id}
				};
				
				if (Object.hasOwnProperty.call(req.soajs.inputmaskData, 'version')) {
					opts.collection = colName + "_versioning";
					opts.conditions = {
						refId: req.soajs.inputmaskData.id,
						v: req.soajs.inputmaskData.version
					};
				}
				
				BL.model.findEntry(req.soajs, opts, function (error, record) {
					checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
						checkIfError(req, cb, {config: config, error: !record, code: 950}, function () {
							if (record.recipe.deployOptions && record.recipe.deployOptions.labels) {
								utils.normalizeKeyValues(record.recipe.deployOptions.labels, config.tokens.dotToken, config.tokens.dotValue, function (error, updatedRecord) {
									record.recipe.deployOptions.labels = updatedRecord;
									return cb(null, record);
								});
							} else {
								
								return cb(null, record);
							}
						});
					});
				});
			});
		});
	},
	
	"listSelected": function (config, req, cb) {
		let ids = req.soajs.inputmaskData.ids;
		let _ids = [];
		async.each(ids, function (id, callback) {
			BL.model.validateCustomId(req.soajs, id, (err, _id)=>{
				if(err){
					return callback (err);
				}
				_ids.push(_id);
				return callback();
			});
		}, function (error) {
			checkIfError(req, cb, {config: config, error: error, code: 701}, function () {
				let opts = {
					collection: colName,
					conditions: { _id: { $in: _ids } }
				};
				BL.model.findEntries(req.soajs, opts, function (error, records) {
					checkIfError(req, cb, {config: config, error: error, code: 600}, function () {
						async.map(records, function (oneRecord, callback) {
							if (oneRecord.recipe.deployOptions && oneRecord.recipe.deployOptions.labels) {
								utils.normalizeKeyValues(oneRecord.recipe.deployOptions.labels, config.tokens.dotToken, config.tokens.dotValue, function (error, updatedRecord) {
									oneRecord.recipe.deployOptions.labels = updatedRecord;
									return callback(null, oneRecord);
								});
							} else {
								return callback(null, oneRecord);
							}
						}, cb);
					});
				});
			});
		});
	},
	
	"upgrade": function (config, req, cb) {
		async.series({
			"catalogs": (mCb) => {
				let opts = {};
				opts.collection = colName;
				BL.model.findEntries(req.soajs, opts, (error, records) => {
					checkIfError(req, mCb, {config: config, error: error, code: 600}, () => {
						async.eachSeries(records, (oneRecord, callback) => {
							migrateOneRecord(opts, oneRecord, true, callback);
						}, mCb);
					});
				});
			},
			'delay': (mCb) => {
				setTimeout(() => {
					mCb();
				}, 100);
			},
			"archives": (mCb) => {
				let opts = {};
				opts.collection = colName + "_versioning";
				BL.model.findEntries(req.soajs, opts, (error, records) => {
					checkIfError(req, mCb, {config: config, error: error, code: 600}, () => {
						async.eachSeries(records, (oneRecord, callback) => {
							migrateOneRecord(opts, oneRecord, false, callback);
						}, mCb);
					});
				});
				
			}
		}, (error) => {
			checkIfError(req, cb, {config: config, error: error, code: 600}, () => {
				return cb(null, true);
			});
		});
		
		function migrateOneRecord(opts, oneRecord, versioning, callback) {
			
			//update git configuration
			delete oneRecord.recipe.deployOptions.specifyGitConfiguration;
			if (!oneRecord.recipe.deployOptions.sourceCode) {
				oneRecord.recipe.deployOptions.sourceCode = {};
			}
			
			
			//upgrade volumes
			if (oneRecord.recipe.deployOptions.voluming && oneRecord.recipe.deployOptions.voluming.volumes) {
				let voluming = [];
				if (oneRecord.recipe.deployOptions.voluming.volumeMounts) {
					//kubernetes
					for (let i = 0; i < oneRecord.recipe.deployOptions.voluming.volumes.length; i++) {
						let kubernetesVolume = {
							"kubernetes": {
								"volume": oneRecord.recipe.deployOptions.voluming.volumes[i],
								"volumeMount": oneRecord.recipe.deployOptions.voluming.volumeMounts[i]
							}
						};
						voluming.push(kubernetesVolume)
					}
				} else {
					//docker
					oneRecord.recipe.deployOptions.voluming.volumes.forEach((oneVolume) => {
						voluming.push({
							"docker": {
								"volume": oneVolume
							}
						})
					});
				}
				
				oneRecord.recipe.deployOptions.voluming = voluming;
			}
			
			//update catalog types
			switch (oneRecord.type) {
				case 'soajs':
					switch (oneRecord.subtype) {
						case 'service':
							oneRecord.type = 'service';
							oneRecord.subtype = 'soajs';
							break;
						case 'daemon':
							oneRecord.type = 'daemon';
							oneRecord.subtype = 'soajs';
							break;
						case 'nodejs':
							oneRecord.type = 'service';
							oneRecord.subtype = 'nodejs';
							break;
						case 'java':
							oneRecord.type = 'service';
							oneRecord.subtype = 'java';
							break;
						default:
							oneRecord.type = 'service';
							oneRecord.subtype = 'other';
							break;
					}
					break;
				case 'daemon':
				case 'service':
					if (!oneRecord.subtype) {
						oneRecord.subtype = 'other';
					}
					break;
				case 'nginx':
					oneRecord.type = 'server';
					oneRecord.subtype = 'nginx';
					break;
				case 'database':
				case 'mongo':
					oneRecord.type = 'cluster';
					oneRecord.subtype = 'mongo';
					break;
				case 'es':
					oneRecord.type = 'cluster';
					oneRecord.subtype = 'elasticsearch';
					break;
				case 'server':
				case 'cluster':
				case 'cdn':
				case 'system':
				case 'other':
					//do nothing
					break;
				default:
					oneRecord.type = 'other';
					break;
			}
			opts.record = oneRecord;
			opts.versioning = versioning;
			BL.model.saveEntry(req.soajs, opts, callback);
		}
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
