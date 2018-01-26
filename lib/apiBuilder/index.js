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
		if (typeof (data.error) === 'object' && (data.error.message || data.error.msg)) {
			req.soajs.log.error(data.error);
		}
		return mainCb({"code": data.code, "msg": data.config.errors[data.code]});
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
			if (error) {
				let err = {
					code: 400,
					msg: error.toString()
				};
				return cbMain(err);
			} else {
				return cbMain(null, {records});
			}
		});
	},
	
	"get": function (config, req, res, cbMain) {
		let mainType = req.soajs.inputmaskData.mainType;
		let collection = mainType === 'endpoints' ? endpointsCollection : servicesCollection;
		
		let id = BL.model.validateCustomId(req.soajs, req.soajs.inputmaskData.id);
		if (!id) {
			let error = {
				code: 407,
				msg: 'Invalid Id!'
			};
			return cbMain(error);
		}
		
		let conditions = {
			_id: id
		};
		
		let opts = {
			collection,
			conditions
		};
		
		BL.model.findEntry(req.soajs, opts, function (error, record) {
			if (error) {
				let err = {
					code: 400,
					msg: error.toString()
				};
				return cbMain(err);
			} else {
				return cbMain(null, record);
			}
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
			if (error) {
				let err = {
					code: 400,
					msg: error.toString()
				};
				return cbMain(err);
			} else {
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
			}
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
			serviceGroup: input.serviceGroup,
			serviceName: input.serviceName,
			servicePort: input.servicePort,
			serviceVersion: input.serviceVersion,
			requestTimeout: input.requestTimeout,
			requestTimeoutRenewal: input.requestTimeoutRenewal,
			authentications: input.authentications,
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
				"versions": {}
			};
			
			let opts2 = {
				collection: originalServicesCollection,
				record: newServicesRecord
			};
			
			BL.model.insertEntry(req.soajs, opts2, function (error, serviceRecord) {
				if (error) {
					req.soajs.log.error(error);
					let err = {
						code: 400,
						msg: error.toString()
					};
					return cbMain(err);
				} else {
					return cbMain(null, record);
				}
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
				if (error) {
					let err = {
						code: 400,
						msg: error.toString()
					};
					return cbMain(err);
				} else {
					if (serviceRecordIsAlreadyAdded) {
						let err = {
							code: 411,
							msg: "Failed. A service with the same port/name is already created!"
						};
						return cbMain(err);
					} else {
						let opts2 = {
							collection,
							record
						};
						
						BL.model.insertEntry(req.soajs, opts2, function (error, items) {
							if (error) {
								req.soajs.log.error(error);
								let err = {
									code: 400,
									msg: error.toString()
								};
								return cbMain(err);
							} else {
								return createEpCb(items[0]);
							}
						});
					}
				}
			});
		}
		
		if (input.swaggerInput) {
			utils.generateSchemaFromSwagger(input.swaggerInput, record, function (error, output) {
				if (error) {
					return cbMain(error);
				} else {
					record.schema = output.schema;
					record.errors = output.errors;
					createEp(record, saveServiceRecord);
				}
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
		if (!endpointId) {
			let error = {
				code: 407,
				msg: 'Invalid Id!'
			};
			return cbMain(error);
		}
		
		let conditions = {
			_id: endpointId
		};
		
		let opts = {
			collection,
			conditions
		};
		
		BL.model.findEntries(req.soajs, opts, function (error, records) {
			if (error) {
				let err = {
					code: 400,
					msg: error.toString()
				};
				return cbMain(err);
			} else {
				
				let reformattedRecord = records[0];
				
				let schemaKey = req.soajs.inputmaskData.schemaKey;
				let routeKey = req.soajs.inputmaskData.routeKey;
				let newAthentication = req.soajs.inputmaskData.authentication;
				
				reformattedRecord.schema[schemaKey][routeKey]._authorization = newAthentication;
				
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
					if (error) {
						let err = {
							code: 400,
							msg: error.toString()
						};
						return cbMain(err);
					} else {
						return cbMain(null, records);
					}
				});
				
			}
		});
	},
	
	"convertSwaggerToImfv": function (config, req, res, cbMain) {
		let swagger = req.soajs.inputmaskData.swagger;
		
		// todo: send params in imfv
		
		let record = {
			serviceGroup: "epp",
			serviceName: 'example',
			servicePort: 1111,
			serviceVersion: 1,
			prerequisites: {}
		};
		
		utils.generateSchemaFromSwagger(swagger, record, function (error, output) {
			if (error) {
				return cbMain(error);
			} else {
				return cbMain(null, output);
				
			}
		});
	},
	
	"convertImfvToSwagger": function (config, req, res, cbMain) {
		let schema = req.soajs.inputmaskData.schema;
		
		utils.generateSwaggerFromSchema(schema, function (error, output) {
			if (error) {
				return cbMain(error);
			} else {
				return cbMain(null, output);
			}
		});
	},
	
	"edit": function (config, req, res, cbMain) {
		
		let input = req.soajs.inputmaskData;
		
		let mainType = req.soajs.inputmaskData.mainType;
		let collection = mainType === 'endpoints' ? endpointsCollection : servicesCollection;
		
		let id = BL.model.validateCustomId(req.soajs, input.id);
		if (!id) {
			let error = {
				code: 407,
				msg: 'Invalid Id!'
			};
			return cbMain(error);
		}
		
		let conditions = {
			_id: id
		};
		
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
			authentications: input.authentications,
			prerequisites: {},
			swaggerInput: input.swaggerInput
		};
		
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
			if (error) {
				let err = {
					code: 400,
					msg: error.toString()
				};
				return cbMain(err);
			} else {
				return cbMain(null, records);
			}
		});
		
		// utils.generateSchemaFromSwagger(input.swaggerInput, reformattedRecord, function (error, output) {
		//
		// 	if (error) {
		// 		return res.soajs.returnAPIResponse(req, res, {code: error.code, error: error, data: null});
		// 	} else {
		//
		// 		reformattedRecord.schema = output.schema;
		// 		reformattedRecord.errors = output.errors;
		//
		// 		let updatedRecord = {
		// 			"$set": reformattedRecord
		// 		};
		//
		// 		var options = {};
		// 		req.soajs.mongo[database].update(collection, conditions, updatedRecord, options, false, function (error, records) {
		// 			if (error) {
		// 				return res.soajs.returnAPIResponse(req, res, {code: error.code, error: error, data: null});
		// 			} else {
		// 				return res.soajs.returnAPIResponse(req, res, {code: null, error: null, data: records});
		// 			}
		// 		});
		//
		// 	}
		// });
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
		
		let conditions = {
			_id: endpointId
		};
		
		let opts = {
			collection,
			conditions
		};
		
		BL.model.findEntries(req.soajs, opts, function (error, records) {
			if (error) {
				let err = {
					code: 400,
					msg: error.toString()
				};
				return cbMain(err);
			} else {
				
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
					if (error) {
						let err = {
							code: 400,
							msg: error.toString()
						};
						return cbMain(err);
					} else {
						return cbMain(null, records);
					}
				});
				
			}
		});
	},
	
	"updateSchemas": function (config, req, res, cbMain) {
		
		let mainType = req.soajs.inputmaskData.mainType;
		let collection = mainType === 'endpoints' ? endpointsCollection : servicesCollection;
		
		let input = req.soajs.inputmaskData;
		
		let schemas = input.schemas;
		
		let endpointId = BL.model.validateCustomId(req.soajs, input.endpointId);
		if (!endpointId) {
			let error = {
				code: 407,
				msg: 'Invalid Id!'
			};
			return cbMain(error);
		}
		
		let conditions = {
			_id: endpointId
		};
		
		let opts = {
			collection,
			conditions
		};
		
		BL.model.findEntries(req.soajs, opts, function (error, records) {
			if (error) {
				let err = {
					code: 400,
					msg: error.toString()
				};
				return cbMain(err);
			} else {
				
				let reformattedRecord = records[0];
				
				reformattedRecord.schema = schemas;
				
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
					if (error) {
						let err = {
							code: 400,
							msg: error.toString()
						};
						return cbMain(err);
					} else {
						return cbMain(null, records);
					}
				});
				
			}
		});
	},
	
	"delete": function (config, req, res, cbMain) {
		
		let mainType = req.soajs.inputmaskData.mainType;
		let collection = mainType === 'endpoints' ? endpointsCollection : servicesCollection;
		
		let id = BL.model.validateCustomId(req.soajs, req.soajs.inputmaskData.id);
		if (!id) {
			let error = {
				code: 407,
				msg: 'Invalid Id!'
			};
			return cbMain(error);
		}
		
		let conditions = {
			_id: id
		};
		
		let opts = {
			collection,
			conditions
		};
		
		
		BL.model.removeEntry(req.soajs, opts, function (error, records) {
			if (error) {
				let err = {
					code: 400,
					msg: error.toString()
				};
				return cbMain(err);
			} else {
				// delete service record
				let opts2 = {
					collection: originalServicesCollection,
					conditions: {
						epId: id
					}
				};
				
				BL.model.removeEntry(req.soajs, opts2, function (error, serviceRemoveResponse) {
					if (error) {
						let err = {
							code: 400,
							msg: error.toString()
						};
						return cbMain(err);
					} else {
						return cbMain(null, records);
					}
				});
			}
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
