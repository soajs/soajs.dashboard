'use strict';
var fs = require("fs");
var async = require("async");

let endpointsCollection = 'api_builder_endpoints';
let servicesCollection = 'api_builder_services';
let originalServicesCollection = 'services';

var utils = require('../../utils/apiBuilder/utils.js');

var yamljs = require("yamljs");

/**
 * function that returns an invalid api response if data.error exists
 * else it returns a callback and doesn't break the execution
 * @param req
 * @param res
 * @param data
 * @param cb
 * @returns {*}
 */
function checkReturnError(req, mainCb, data, cb) {
	if (data.error) {
		req.soajs.log.error(data.error);
		
		let msg = data.config.errors[data.code];
		
		if (typeof (data.error) === 'object') {
			if (data.error.message && typeof data.error.message === 'string') {
				msg = data.error.message;
			}
			if (data.error.msg && typeof data.error.msg === 'string') {
				msg = data.error.msg;
			}
		}
		return mainCb({
			"code": (data && data.error && data.error.code) ? data.error.code : ((data && data.code) ? data.code : 404),
			"msg": msg
		});
	}
	else {
		if (cb) {
			return cb();
		}
	}
}


var BL = {
	model: null,
	
	"list": function (config, req, res, cbMain) {
		let mainType = req.soajs.inputmaskData.mainType;
		if(mainType === 'endpoints' && !process.env.SOAJS_SAAS){
			return cbMain(null, {records: []});
		}
		let collection = mainType === 'endpoints' ? endpointsCollection : servicesCollection;
		
		let opts = {
			collection,
			conditions: {}
		};
		
		BL.model.findEntries(req.soajs, opts, function (error, records) {
			checkReturnError(req, cbMain, {code: 600, error: error, config: config}, function () {
				return cbMain(null, {records});
			});
		});
	},
	
	"publish": function (config, req, res, cbMain) {
		// let mainType = req.soajs.inputmaskData.mainType;
		let collection = endpointsCollection;
		
		let endpointId = BL.model.validateCustomId(req.soajs, req.soajs.inputmaskData.endpointId);
		
		function getEndpoint() {
			let conditions = {
				_id: endpointId
			};
			
			let opts = {
				collection,
				conditions
			};
			
			BL.model.findEntry(req.soajs, opts, function (error, originalEndpoint) {
				checkReturnError(req, cbMain, {code: 600, error: error, config: config}, function () {
					checkReturnError(req, cbMain, {
						code: 921,
						error: !originalEndpoint,
						config: config
					}, function () {
						checkOnService(originalEndpoint);
					});
				});
			});
		}
		
		function checkOnService(originalEndpoint) {
			let conditionsService1 = {
				"$and": [
					{
						"epId": {"$ne": endpointId}
					},
					{
						"$or": [
							{
								"port": originalEndpoint.servicePort
							},
							{
								"name": originalEndpoint.serviceName
							}
						]
					}
				]
			};
			
			let optsService1 = {
				collection: originalServicesCollection,
				conditions: conditionsService1
			};
			
			BL.model.findEntry(req.soajs, optsService1, function (error, serviceRecordIsAlreadyUsed) {
				checkReturnError(req, cbMain, {code: 600, error: error, config: config}, function () {
					checkReturnError(req, cbMain, {
						code: 920,
						error: serviceRecordIsAlreadyUsed,
						config: config
					}, function () {
						addOrEditServices(originalEndpoint);
					});
				});
			});
		}
		
		function addOrEditServices(originalEndpoint) {
			
			let apis = utils.generateApisFromSchema(originalEndpoint.schema);
			
			if (apis.length === 0) {
				return cbMain({
					"code": 923,
					"msg": config.errors[923]
				});
			}
			
			let reformattedRecord = {
				"name": originalEndpoint.serviceName,
				"group": originalEndpoint.serviceGroup,
				"epId": originalEndpoint._id,
				"port": originalEndpoint.servicePort,
				"swagger": originalEndpoint.swaggerInput ? originalEndpoint.swaggerInput !== "" : false,
				"requestTimeout": originalEndpoint.requestTimeout,
				"requestTimeoutRenewal": originalEndpoint.requestTimeoutRenewal,
				"src": {
					"provider": "github",
					"owner": "soajs",
					"repo": "soajs.epg"
				},
				"versions": {
					[(originalEndpoint.serviceVersion).toString()]: {
						"oauth": originalEndpoint.oauth,
						"extKeyRequired": originalEndpoint.extKeyRequired,
						"urac": false,
						"urac_Profile": false,
						"urac_ACL": false,
						"provision_ACL": false,
						"apis": apis
					}
				}
			};
			
			let updatedRecord = {
				"$set": reformattedRecord
			};
			
			let conditions = {
				epId: endpointId
			};
			
			let opts2 = {
				collection: originalServicesCollection,
				conditions,
				fields: updatedRecord,
				options: {
					upsert: true,
					multi: false,
					safe: true
				}
			};
			
			BL.model.updateEntry(req.soajs, opts2, function (error, response) {
				checkReturnError(req, cbMain, {code: 600, error: error, config: config}, function () {
					return cbMain(null, response);
				});
			});
		}
		
		getEndpoint();
	},
	
	"get": function (config, req, res, cbMain) {
		let mainType = req.soajs.inputmaskData.mainType;
		let collection = mainType === 'endpoints' ? endpointsCollection : servicesCollection;
		
		let id = BL.model.validateCustomId(req.soajs, req.soajs.inputmaskData.id);
		checkReturnError(req, cbMain, {code: 701, error: !id, config: config}, function () {
			let conditions = {
				_id: id
			};
			
			let opts = {
				collection,
				conditions
			};
			
			BL.model.findEntry(req.soajs, opts, function (error, record) {
				checkReturnError(req, cbMain, {code: 600, error: error, config: config}, function () {
					return cbMain(null, record);
				});
			});
		});
	},
	
	"getResources": function (config, req, res, cbMain) {
		let conditions = {
			type: "authorization"
		};
		
		let opts = {
			collection: 'resources',
			conditions
		};
		
		BL.model.findEntries(req.soajs, opts, function (error, records) {
			checkReturnError(req, cbMain, {code: 600, error: error, config: config}, function () {
				// filter output
				let output = [];
				if (records) {
					records.forEach(function (res) {
						let temp = {
							_id: res._id,
							name: res.name,
							category: res.category
						};
						output.push(temp);
					});
				}
				
				return cbMain(null, output);
			});
		});
	},
	
	"add": function (config, req, res, cbMain) {
		let mainType = req.soajs.inputmaskData.mainType;
		let collection = mainType === 'endpoints' ? endpointsCollection : servicesCollection;
		
		let input = req.soajs.inputmaskData;
		
		let created = new Date().getTime();
		
		let record = {
			created,
			type: "service",
			models: {
				path: "setInEndpoint",
				name: input.epType
			},
			injection: true,
			serviceGroup: input.serviceGroup,
			serviceName: input.serviceName,
			servicePort: input.servicePort,
			serviceVersion: input.serviceVersion,
			requestTimeout: input.requestTimeout,
			requestTimeoutRenewal: input.requestTimeoutRenewal,
			oauth: input.oauth,
			extKeyRequired: input.extKeyRequired,
			authentications: input.authentications,
			defaultAuthentication: input.defaultAuthentication,
			prerequisites: {},
			swaggerInput: input.swaggerInput
		};
		
		function createEp(record) {
			let conditions = {
				"$or": [
					{
						"port": record.servicePort
					},
					{
						"name": record.serviceName
					}
				]
			};
			
			let opts = {
				collection: originalServicesCollection,
				conditions
			};
			
			BL.model.findEntry(req.soajs, opts, function (error, serviceRecordIsAlreadyAdded) {
				checkReturnError(req, cbMain, {code: 600, error: error, config: config}, function () {
					checkReturnError(req, cbMain, {
						code: 920,
						error: serviceRecordIsAlreadyAdded,
						config: config
					}, function () {
						let opts2 = {
							collection,
							record
						};
						BL.model.insertEntry(req.soajs, opts2, function (error, items) {
							checkReturnError(req, cbMain, {code: 600, error: error, config: config}, function () {
								return cbMain(null, items[0]);
							});
						});
					});
				});
			});
		}
		
		//input.import is set to true programmatically via the import template BL only
		if(input.import){
			record.schema = input.schema || input.schemas;
			record.errors = input.errors;
			createEp(record);
		}
		else if (input.swaggerInput) {
			utils.generateSchemaFromSwagger(input.swaggerInput, record, function (error, output) {
				checkReturnError(req, cbMain, {code: 400, error: error, config: config}, function () {
					if (output) {
						record.schema = output.schema;
						record.errors = output.errors;
					}
					
					createEp(record);
				});
			});
		} else {
			record.schema = {};
			record.errors = {};
			createEp(record);
		}
	},
	
	"authenticationUpdate": function (config, req, res, cbMain) {
		let mainType = req.soajs.inputmaskData.mainType;
		let collection = mainType === 'endpoints' ? endpointsCollection : servicesCollection;
		
		let endpointId = BL.model.validateCustomId(req.soajs, req.soajs.inputmaskData.endpointId);
		checkReturnError(req, cbMain, {code: 701, error: !endpointId, config: config}, function () {
			let conditions = {
				_id: endpointId
			};
			
			let opts = {
				collection,
				conditions
			};
			
			BL.model.findEntry(req.soajs, opts, function (error, reformattedRecord) {
				checkReturnError(req, cbMain, {code: 600, error: error, config: config}, function () {
					checkReturnError(req, cbMain, {code: 921, error: !reformattedRecord, config: config}, function () {
						let schemaKey = req.soajs.inputmaskData.schemaKey;
						let routeKey = req.soajs.inputmaskData.routeKey;
						let newAthentication = req.soajs.inputmaskData.authentication;
						
						reformattedRecord.schema[schemaKey][routeKey]._authorization = newAthentication || '';
						
						let updatedRecord = {
							"$set": reformattedRecord
						};
						
						let opts2 = {
							collection,
							conditions,
							fields: updatedRecord,
							options: {upsert: true, safe: true}
						};
						
						BL.model.updateEntry(req.soajs, opts2, function (error, records) {
							checkReturnError(req, cbMain, {code: 600, error: error, config: config}, function () {
								return cbMain(null, records);
							});
						});
					});
				});
			});
		});
	},
	
	"convertSwaggerToImfv": function (config, req, res, cbMain) {
		let swagger = req.soajs.inputmaskData.swagger;
		
		let mainType = req.soajs.inputmaskData.mainType;
		let collection = mainType === 'endpoints' ? endpointsCollection : servicesCollection;
		
		let id = BL.model.validateCustomId(req.soajs, req.soajs.inputmaskData.id);
		checkReturnError(req, cbMain, {code: 701, error: !id, config: config}, function () {
			// todo: send params in imfv
			BL.model.findEntry(req.soajs, {
				collection: collection,
				condition: {
					_id: id
				}
			}, (error, dbRecord) => {
				checkReturnError(req, cbMain, {code: 600, error: error, config: config}, function () {
					checkReturnError(req, cbMain, {code: 921, error: !dbRecord, config: config}, function () {
						let record = {
							serviceGroup: dbRecord.serviceGroup,
							serviceName: dbRecord.serviceName,
							servicePort: dbRecord.servicePort,
							serviceVersion: dbRecord.serviceVersion,
							prerequisites: dbRecord.prerequisites,
							requestTimeout: dbRecord.requestTimeout,
							requestTimeoutRenewal: dbRecord.requestTimeoutRenewal
						};
						
						utils.generateSchemaFromSwagger(swagger, record, function (error, output) {
							checkReturnError(req, cbMain, {code: 400, error: error, config: config}, function () {
								return cbMain(null, output);
							});
						});
					});
				});
			});
		});
	},
	
	"convertImfvToSwagger": function (config, req, res, cbMain) {
		let schema = req.soajs.inputmaskData.schema;
		
		let mainType = req.soajs.inputmaskData.mainType;
		let collection = mainType === 'endpoints' ? endpointsCollection : servicesCollection;
		
		let id = BL.model.validateCustomId(req.soajs, req.soajs.inputmaskData.id);
		checkReturnError(req, cbMain, {code: 701, error: !id, config: config}, function () {
			// todo: send params in imfv
			BL.model.findEntry(req.soajs, {
				collection: collection,
				conditions: {
					_id: id
				}
			}, (error, dbRecord) => {
				checkReturnError(req, cbMain, {code: 701, error: !id, config: config}, function () {
					checkReturnError(req, cbMain, {code: 921, error: !dbRecord, config: config}, function () {
						let record = {
							serviceGroup: dbRecord.serviceGroup,
							serviceName: dbRecord.serviceName,
							servicePort: dbRecord.servicePort,
							serviceVersion: dbRecord.serviceVersion,
							prerequisites: dbRecord.prerequisites,
							requestTimeout: dbRecord.requestTimeout,
							requestTimeoutRenewal: dbRecord.requestTimeoutRenewal,
							swaggerInput: dbRecord.swaggerInput
						};
						
						utils.generateSwaggerFromSchema(mainType, schema, record, cbMain);
					});
				});
			});
		});
	},
	
	"edit": function (config, req, res, cbMain) {
		let input = req.soajs.inputmaskData;
		
		let id = BL.model.validateCustomId(req.soajs, input.id);
		if (!id) {
			let error = {
				code: 407,
				msg: 'Invalid Id!'
			};
			return cbMain(error);
		}
		checkReturnError(req, cbMain, {code: 701, error: !id, config: config}, function () {
			let conditionsService1 = {
				"$and": [
					{
						"epId": {"$ne": id}
					},
					{
						"$or": [
							{
								"port": input.servicePort
							},
							{
								"name": input.serviceName
							}
						]
					}
				]
			};
			
			let optsService1 = {
				collection: originalServicesCollection,
				conditions: conditionsService1
			};
			
			BL.model.findEntry(req.soajs, optsService1, function (error, serviceRecordIsAlreadyAdded) {
				checkReturnError(req, cbMain, {code: 600, error: error, config: config}, function () {
					checkReturnError(req, cbMain, {
						code: 920,
						error: serviceRecordIsAlreadyAdded,
						config: config
					}, function () {
						let mainType = req.soajs.inputmaskData.mainType;
						let collection = mainType === 'endpoints' ? endpointsCollection : servicesCollection;
						
						let conditions = {
							_id: id
						};
						
						let opts = {
							collection,
							conditions
						};
						
						// get original record to get schemas => to update services apis
						BL.model.findEntry(req.soajs, opts, function (error, originalRecord) {
							checkReturnError(req, cbMain, {code: 600, error: error, config: config}, function () {
								checkReturnError(req, cbMain, {
									code: 921,
									error: !originalRecord,
									config: config
								}, function () {
									let reformattedRecord = {
										models: {
											path: "setInEndpoint",
											name: input.epType
										},
										serviceName: input.serviceName,
										serviceGroup: input.serviceGroup,
										servicePort: input.servicePort,
										serviceVersion: input.serviceVersion,
										requestTimeout: input.requestTimeout,
										requestTimeoutRenewal: input.requestTimeoutRenewal,
										oauth: input.oauth || false,
										extKeyRequired: input.extKeyRequired || false,
										authentications: input.authentications,
										defaultAuthentication: input.defaultAuthentication,
										prerequisites: {}
									};
									
									if (mainType !== 'endpoints') {
										delete reformattedRecord.authentications;
										delete reformattedRecord.defaultAuthentication;
										delete reformattedRecord.swaggerInput;
										
										reformattedRecord.urac = input.urac || false;
										reformattedRecord.urac_Profile = input.urac_Profile || false;
										reformattedRecord.urac_ACL = input.urac_ACL || false;
										reformattedRecord.provision_ACL = input.provision_ACL || false;
										reformattedRecord.session = input.session || false;
										
										if (input.dbs && input.dbs.length > 0) {
											reformattedRecord["dbs"] = input.dbs;
											reformattedRecord["models"] = {
												"path": '%dirname% + "/lib/models/"',
												"name": ""
											};
											
											let modelProps = Object.keys(input.dbs[0]);
											if (modelProps.indexOf("mongo") !== -1) {
												reformattedRecord.models.name = "mongo";
											}
											else {
												reformattedRecord.models.name = "es";
											}
										}
									}
									
									let updatedRecord = {
										"$set": reformattedRecord
									};
									
									let opts2 = {
										collection,
										conditions,
										fields: updatedRecord,
										options: {upsert: true, safe: true}
									};
									
									BL.model.updateEntry(req.soajs, opts2, function (error, records) {
										checkReturnError(req, cbMain, {
											code: 600,
											error: error,
											config: config
										}, function () {
											checkReturnError(req, cbMain, {
												code: 921,
												error: !records,
												config: config
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
	
	"updateSchemas": function (config, req, res, cbMain) {
		
		let mainType = req.soajs.inputmaskData.mainType;
		let collection = mainType === 'endpoints' ? endpointsCollection : servicesCollection;
		
		let input = req.soajs.inputmaskData;
		
		let convert = input.convert;
		let schemas = input.schemas;
		let swagger = input.swagger;
		
		checkReturnError(req, cbMain, {
			code: 922,
			error: (!schemas || schemas === "") && (!swagger || swagger === ""),
			config: config
		}, function () {
			let endpointId = BL.model.validateCustomId(req.soajs, input.endpointId);
			checkReturnError(req, cbMain, {code: 701, error: !endpointId, config: config}, function () {
				let conditions = {
					_id: endpointId
				};
				
				let opts = {
					collection,
					conditions
				};
				
				BL.model.findEntry(req.soajs, opts, function (error, record) {
					checkReturnError(req, cbMain, {code: 600, error: error, config: config}, function () {
						checkReturnError(req, cbMain, {code: 921, error: !record, config: config}, function () {
							let updateEndpoint = function (newRecord) {
								let updatedRecord = {
									"$set": newRecord
								};
								
								let opts2 = {
									collection,
									conditions,
									fields: updatedRecord,
									options: {upsert: true, safe: true}
								};
								
								BL.model.updateEntry(req.soajs, opts2, function (error, records) {
									checkReturnError(req, cbMain, {
										code: 600,
										error: error,
										config: config
									}, function () {
										return cbMain(null, records);
									});
								});
							};
							
							let reformattedRecord = record;
							
							if (schemas) {
								reformattedRecord.schema = schemas;
								
								if (convert) {
									let record = {
										serviceGroup: reformattedRecord.serviceGroup,
										serviceName: reformattedRecord.serviceName,
										servicePort: reformattedRecord.servicePort,
										serviceVersion: reformattedRecord.serviceVersion,
										prerequisites: reformattedRecord.prerequisites,
										requestTimeout: reformattedRecord.requestTimeout,
										requestTimeoutRenewal: reformattedRecord.requestTimeoutRenewal,
										swaggerInput: reformattedRecord.swaggerInput
									};
									
									utils.generateSwaggerFromSchema(mainType, schemas, record, function (error, yamlString) {
										checkReturnError(req, cbMain, {
											code: 402,
											error: error,
											config: config
										}, function () {
											reformattedRecord.swaggerInput = yamlString;
											updateEndpoint(reformattedRecord);
										});
									});
								} else {
									reformattedRecord.swaggerInput = "";
									updateEndpoint(reformattedRecord);
								}
								
							}
							else {
								reformattedRecord.swaggerInput = swagger;
								
								let record = {
									serviceGroup: reformattedRecord.serviceGroup,
									serviceName: reformattedRecord.serviceName,
									servicePort: reformattedRecord.servicePort,
									serviceVersion: reformattedRecord.serviceVersion,
									prerequisites: reformattedRecord.prerequisites,
									requestTimeout: reformattedRecord.requestTimeout,
									requestTimeoutRenewal: reformattedRecord.requestTimeoutRenewal
								};
								
								// forced to convert to soajs schema object
								utils.generateSchemaFromSwagger(swagger, record, function (error, output) {
									checkReturnError(req, cbMain, {
										code: 402,
										error: error,
										config: config
									}, function () {
										if (output) {
											reformattedRecord.schema = output.schema;
										}
										
										updateEndpoint(reformattedRecord);
									});
								});
							}
						});
					});
				});
			});
		});
	},
	
	"delete": function (config, req, res, cloudBL, deployer, cbMain) {
		let mainType = req.soajs.inputmaskData.mainType;
		let collection = mainType === 'endpoints' ? endpointsCollection : servicesCollection;
		
		let id = BL.model.validateCustomId(req.soajs, req.soajs.inputmaskData.id);
		
		let conditionsService = {
			"epId": id
		};
		
		let optsService = {
			collection: originalServicesCollection,
			conditions: conditionsService
		};
		
		BL.model.findEntry(req.soajs, optsService, function (error, originalServiceRecord) {
			checkReturnError(req, cbMain, {code: 600, error: error, config: config}, function () {
				if (!originalServiceRecord) {
					deleteFromServicesAndFromApiBuilder();
				}
				else {
					checkWhereServiceisDeployed(originalServiceRecord);
				}
			});
		});
		
		function checkWhereServiceisDeployed(originalServiceRecord) {
			
			//if cloud container deployment
			if (process.env.SOAJS_DEPLOY_HA) {
				BL.model.findEntries(req.soajs, {
					collection: "environment",
					fields: {"code": 1}
				}, (error, environments) => {
					checkReturnError(req, cbMain, {code: 600, error: error, config: config}, function () {
						if (!environments || environments.length === 0) {
							deleteFromServicesAndFromApiBuilder();
						}
						else {
							async.eachSeries(environments, (oneEnvironment, vCb) => {
								req.soajs.inputmaskData.env = oneEnvironment.code;
								cloudBL.listServices(config, req.soajs, deployer, function (error, deployedServices) {
									checkReturnError(req, cbMain, {
										config: config,
										error: error,
										code: 795
									}, function () {
										if (!deployedServices || deployedServices.length === 0) {
											return vCb();
										}
										
										//check if a service is using this repo
										let match = false;
										for (let i = 0; i < deployedServices.length; i++) {
											let oneService = deployedServices[i];
											if (oneService.labels['service.repo'] === originalServiceRecord.src.repo &&
												oneService.labels['service.owner'] === originalServiceRecord.src.owner &&
												oneService.labels['soajs.service.name'] === originalServiceRecord.name
											) {
												match = true;
												break;
											}
										}
										
										//service is deployed
										if (match) {
											return vCb(new Error(`Service ${originalServiceRecord.name} is deployed in environment ${oneEnvironment.code}`));
										}
										else {
											return vCb();
										}
									});
								});
							}, (error) => {
								checkReturnError(req, cbMain, {code: 766, error: error, config: config}, function () {
									deleteFromServicesAndFromApiBuilder();
								});
							});
						}
					});
				});
			}
			else {
				let opts = {
					collection: "hosts",
					conditions: {name: originalServicesCollection.name}
				};
				
				BL.model.countEntries(req.soajs, opts, function (error, count) {
					checkReturnError(req, cbMain, {code: 600, error: error, config: config}, function () {
						if (count > 0) {
							return cbMain({
								'code': 766,
								'message': `Service ${originalServicesCollection.name} is manually deployed!`
							});
						}
						else {
							deleteFromServicesAndFromApiBuilder();
						}
					});
				});
			}
		}
		
		function deleteFromServicesAndFromApiBuilder() {
			checkReturnError(req, cbMain, {code: 701, error: !id, config: config}, function () {
				let conditions = {
					_id: id
				};
				
				let opts = {
					collection,
					conditions
				};
				BL.model.removeEntry(req.soajs, opts, function (error, records) {
					checkReturnError(req, cbMain, {code: 600, error: error, config: config}, function () {
						let opts2 = {
							collection: originalServicesCollection,
							conditions: {
								epId: id
							}
						};
						BL.model.removeEntry(req.soajs, opts2, function (error, serviceRemoveResponse) {
							checkReturnError(req, cbMain, {code: 600, error: error, config: config}, function () {
								return cbMain(null, records);
							});
						});
					});
				});
			});
		}
		
		
	}
};

/**
 * no need for a model or db connection for this api to work
 * @type {{init: module.exports.init}}
 */
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
