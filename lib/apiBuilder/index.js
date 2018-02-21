'use strict';
var fs = require("fs");

let endpointsCollection = 'api_builder_endpoints';
let servicesCollection = 'api_builder_services';
let originalServicesCollection = 'services';

var utils = require('../../utils/apiBuilder/utils.js');

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
		return mainCb({"code": (data && data.code) ? data.code : 404, "msg": msg});
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
		
		function saveServiceRecord(record) {
			
			let newServicesRecord = {
				"name": record.serviceName,
				"group": record.serviceGroup,
				"epId": record._id,
				"port": record.servicePort,
				"swagger": record.swaggerInput ? record.swaggerInput !== "" : false,
				"requestTimeout": record.requestTimeout,
				"requestTimeoutRenewal": record.requestTimeoutRenewal,
				"src": {
					"provider": "github",
					"owner": "soajs",
					"repo": "soajs.epg"
				},
				"versions": {
					[(record.serviceVersion).toString()]: {
						"oauth": record.oauth,
						"extKeyRequired": record.extKeyRequired,
						"urac": false,
						"urac_Profile": false,
						"urac_ACL": false,
						"provision_ACL": false,
						"apis": []
					}
				}
			};
			
			let opts2 = {
				collection: originalServicesCollection,
				record: newServicesRecord
			};
			
			BL.model.insertEntry(req.soajs, opts2, function (error, serviceRecord) {
				checkReturnError(req, cbMain, {code: 600, error: error, config: config}, function () {
					return cbMain(null, record);
				});
			});
			
		}
		
		function createEp(record, createEpCb) {
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
								return createEpCb(items[0]);
							});
						});
					});
				});
			});
		}
		
		if (input.swaggerInput) {
			utils.generateSchemaFromSwagger(input.swaggerInput, record, function (error, output) {
				checkReturnError(req, cbMain, {code: 400, error: error, config: config}, function () {
					
					//todo: check the output if it exists
					record.schema = output.schema;
					record.errors = output.errors;
					createEp(record, saveServiceRecord);
				});
			});
		} else {
			record.schema = {};
			record.errors = {};
			createEp(record, saveServiceRecord);
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
			
			//todo: replace with find one
			BL.model.findEntries(req.soajs, opts, function (error, records) {
				checkReturnError(req, cbMain, {code: 600, error: error, config: config}, function () {
					
					//todo: check if records exists
					let reformattedRecord = records[0];
					
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
					
					//todo: check if dbRecord exists
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
					//todo: check if dbRecord exists
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
								//todo: check if originalRecord Exists
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
										
										//todo: check if records exists
										if (mainType !== 'endpoints') {
											return cbMain(null, records);
										}
										
										// now update the service record
										let reformattedServiceRecord = {
											"name": input.serviceName,
											"group": input.serviceGroup,
											"epId": id,
											"port": input.servicePort,
											"swagger": false,
											"requestTimeout": input.requestTimeout,
											"requestTimeoutRenewal": input.requestTimeoutRenewal,
											"src": {
												"provider": "github",
												"owner": "soajs",
												"repo": "soajs.epg"
											},
											"versions": {
												[(input.serviceVersion).toString()]: {
													"oauth": input.oauth,
													"extKeyRequired": input.extKeyRequired,
													"urac": false,
													"urac_Profile": false,
													"urac_ACL": false,
													"provision_ACL": false,
													"apis": utils.generateApisFromSchema(originalRecord.schema)
												}
											}
										};
										
										let updatedServiceRecord = {
											"$set": reformattedServiceRecord
										};
										
										let conditionsService2 = {
											"epId": id
										};
										
										let opts2 = {
											collection: originalServicesCollection,
											conditions: conditionsService2,
											fields: updatedServiceRecord,
											options: {upsert: true, safe: true}
										};
										
										BL.model.updateEntry(req.soajs, opts2, function (error, record) {
											checkReturnError(req, cbMain, {
												code: 600,
												error: error,
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
	
	"updateImfv": function (config, req, res, cbMain) {
		
		let mainType = req.soajs.inputmaskData.mainType;
		let collection = mainType === 'endpoints' ? endpointsCollection : servicesCollection;
		
		let input = req.soajs.inputmaskData;
		
		let schemaKey = input.schemaKey;
		let routeKey = input.routeKey;
		let newImfv = input.newImfv;
		
		let endpointId = BL.model.validateCustomId(req.soajs, input.endpointId);
		if (!endpointId) {
			let error = {
				code: 407,
				msg: 'Invalid Id!'
			};
			return cbMain(error);
		}
		checkReturnError(req, cbMain, {code: 701, error: !endpointId, config: config}, function () {
			let conditions = {
				_id: endpointId
			};
			
			let opts = {
				collection,
				conditions
			};
			
			//todo: replace with findOne
			BL.model.findEntries(req.soajs, opts, function (error, records) {
				checkReturnError(req, cbMain, {code: 600, error: error, config: config}, function () {
					//todo: check if record exists
					let reformattedRecord = records[0];
					
					reformattedRecord.schema[schemaKey][routeKey].imfv.custom = newImfv;
					
					let updatedRecord = {
						"$set": reformattedRecord
					};
					
					// return res.soajs.returnAPIResponse(req, res, {code: null, error: null, data: records});
					
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
	},
	
	"updateSchemas": function (config, req, res, cbMain) {
		
		let mainType = req.soajs.inputmaskData.mainType;
		let collection = mainType === 'endpoints' ? endpointsCollection : servicesCollection;
		
		let input = req.soajs.inputmaskData;
		
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
							let updateServices = function (epRecord) {
								let updatedRecord = {
									"$set": {
										"versions": {
											[(epRecord.serviceVersion).toString()]: {
												"oauth": epRecord.oauth,
												"extKeyRequired": epRecord.extKeyRequired,
												"urac": epRecord.urac || false,
												"urac_Profile": epRecord.urac_Profile || false,
												"urac_ACL": epRecord.urac_ACL || false,
												"provision_ACL": epRecord.provision_ACL || false,
												"apis": utils.generateApisFromSchema(epRecord.schema)
											}
										}
									}
								};
								
								let opts2 = {
									collection: originalServicesCollection,
									conditions: {
										epId: epRecord._id
									},
									fields: updatedRecord,
									options: {upsert: true, safe: true}
								};
								
								BL.model.updateEntry(req.soajs, opts2, function (error, records) {
									checkReturnError(req, cbMain, {
										code: 600,
										error: error,
										config: config
									}, function () {
										return cbMain(null, epRecord);
									});
								});
								
							};
							
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
										if (mainType === 'endpoints') {
											updateServices(newRecord);
										} else {
											return cbMain(null, records);
										}
									});
								});
							};
							
							let reformattedRecord = record;
							
							if (schemas) {
								reformattedRecord.schema = schemas;
								
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
								
								utils.generateSchemaFromSwagger(swagger, record, function (error, output) {
									checkReturnError(req, cbMain, {
										code: 402,
										error: error,
										config: config
									}, function () {
										
										//todo: check if output exists
										reformattedRecord.schema = output.schema;
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
	
	"delete": function (config, req, res, cbMain) {
		
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
