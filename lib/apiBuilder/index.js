'use strict';
const fs = require("fs");
const async = require("async");
const yamljs = require("yamljs");

let endpointsCollection = 'api_builder_endpoints';
let servicesCollection = 'api_builder_services';
let passThroughCollection = 'api_builder_passThroughs';
let originalServicesCollection = 'services';

var utils = require('../../utils/apiBuilder/utils.js');

var soajsLib = require("soajs.core.libs");

/**
 * function that returns an invalid api response if data.error exists
 * else it returns a callback and doesn't break the execution
 * @param req
 * @param mainCb
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
	} else {
		if (cb) {
			return cb();
		}
	}
}

function fillOptionsSrc(record, oneVersion, key) {
	record.src.urls.push({
		version: key,
		url: oneVersion.url
	});
	delete oneVersion.url;
	if (oneVersion.swagger) {
		if (oneVersion.swagger.swaggerInputType === 'text') {
			record.src.swagger.push({
				version: key,
				content: {
					type: oneVersion.swagger.swaggerInputType,
					content: oneVersion.swagger.swaggerInput
				}
			});
		} else if (oneVersion.swagger.swaggerInputType === 'url') {
			record.src.swagger.push({
				version: key,
				content: {
					type: oneVersion.swagger.swaggerInputType,
					content: oneVersion.swagger.swaggerInput,
					url: oneVersion.swagger.url
				}
			});
		} else if (oneVersion.swagger.swaggerInputType === 'git') {
			record.src.swagger.push({
				version: key,
				content: {
					type: oneVersion.swagger.swaggerInputType,
					content: oneVersion.swagger.swaggerInput,
					git: oneVersion.swagger.git
				}
			});
		}
		delete oneVersion.swagger;
	}
	
	if (!oneVersion.oauth) {
		oneVersion.oauth = false;
	}
	if (!oneVersion.extKeyRequired) {
		oneVersion.extKeyRequired = true;
	}
	if (!oneVersion.urac) {
		oneVersion.urac = false;
	}
	if (!oneVersion.urac_Profile) {
		oneVersion.urac_Profile = false;
	}
	if (!oneVersion.urac_ACL) {
		oneVersion.urac_ACL = false;
	}
	if (!oneVersion.provision_ACL) {
		oneVersion.provision_ACL = false;
	}
	if (!oneVersion.tenant_Profile) {
		oneVersion.tenant_Profile = false;
	}
	if (oneVersion.soaVersion){
		if (!record.src.soaVersion){
			record.src.soaVersion = [];
		}
		record.src.soaVersion.push({
			version : key,
			content : {
				git : oneVersion.soaVersion.git,
				type: oneVersion.soaVersion.type,
				content: oneVersion.soaVersion.content
			}
		});
		delete oneVersion.soaVersion;
	}
}

var BL = {
	model: null,
	
	"list": function (config, req, res, apiModule, cbMain) {
		let mainType = req.soajs.inputmaskData.mainType;
		let collection;
		let opts = {
			conditions: {}
		};
		if (mainType === 'passThroughs') {
			apiModule.findEntries(req.soajs, BL.model, opts, function (error, records) {
				checkReturnError(req, cbMain, {code: 600, error: error, config: config}, function () {
					return cbMain(null, {records});
				});
			});
		} else {
			if (mainType === 'endpoints') {
				collection = endpointsCollection;
			} else {
				collection = servicesCollection;
			}
			opts.collection = collection;
			BL.model.findEntries(req.soajs, opts, function (error, records) {
				checkReturnError(req, cbMain, {code: 600, error: error, config: config}, function () {
					return cbMain(null, {records});
				});
			});
		}
	},
	
	"publish": function (config, req, res, apiModule, cbMain) {
		let collection;
		
		if (req.soajs.inputmaskData.mainType === 'endpoints') {
			collection = endpointsCollection;
		} else if (req.soajs.inputmaskData.mainType === 'passThroughs') {
			collection = passThroughCollection;
		}
		let endpointId = BL.model.validateCustomId(req.soajs, req.soajs.inputmaskData.endpointId);
		
		function getEndpoint() {
			let conditions = {
				_id: endpointId
			};
			
			let opts = {
				collection,
				conditions
			};
			
			if (req.soajs.inputmaskData.mainType === 'passThroughs') {
				apiModule.findEntry(req.soajs, BL.model, opts, function (error, originalEndpoint) {
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
			} else {
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
			
			
			let reformattedRecord = {
				"name": originalEndpoint.serviceName,
				"group": originalEndpoint.serviceGroup,
				"epId": originalEndpoint._id,
				"port": originalEndpoint.servicePort,
				"requestTimeout": originalEndpoint.requestTimeout,
				"requestTimeoutRenewal": originalEndpoint.requestTimeoutRenewal,
			};
			if (originalEndpoint.program) {
				reformattedRecord.program = originalEndpoint.program;
			}
			
			if (originalEndpoint.description) {
				reformattedRecord.description = originalEndpoint.description;
			}
			
			if (originalEndpoint.tab) {
				reformattedRecord.tab = originalEndpoint.tab;
			}
			if (originalEndpoint.tags) {
				reformattedRecord.tags = originalEndpoint.tags;
			}
			
			if (originalEndpoint.attributes) {
				reformattedRecord.attributes = originalEndpoint.attributes;
			}
			
			if (req.soajs.inputmaskData.mainType !== 'passThroughs') {
				reformattedRecord.swagger = originalEndpoint.swaggerInput ? originalEndpoint.swaggerInput !== "" : false;
				let apis = utils.generateApisFromSchema(originalEndpoint.schema);
				
				if (apis.length === 0) {
					return cbMain({
						"code": 923,
						"msg": config.errors[923]
					});
				}
				if (req.soajs.inputmaskData.mainType === 'endpoints') {
					reformattedRecord.src = {
						"provider": "github",
						"owner": "soajs",
						"repo": "soajs.epg"
					};
				}
				reformattedRecord.versions = {
					[(originalEndpoint.serviceVersion).toString()]: {
						"oauth": originalEndpoint.oauth,
						"extKeyRequired": originalEndpoint.extKeyRequired,
						"urac": false,
						"urac_Profile": false,
						"urac_ACL": false,
						"tenant_Profile": false,
						"provision_ACL": false,
						"apis": apis
					}
				}
			} else {
				reformattedRecord.versions = originalEndpoint.versions;
				for (let v in reformattedRecord.versions) {
					reformattedRecord.versions[v].apis = utils.generateApisFromSchema(reformattedRecord.versions[v].schema);
					if (reformattedRecord.versions[v].apis.length === 0) {
						return cbMain({
							"code": 923,
							"msg": config.errors[923]
						});
					}
					if (originalEndpoint.src.swagger && originalEndpoint.src.swagger.length > 0) {
						try {
							let swagger = originalEndpoint.src.swagger.find(function(element) {
								return element.version === v;
							});
							reformattedRecord.versions[v].swagger = JSON.stringify(JSON.parse(swagger.content.content));
						}
						catch (e) {
							try {
								let swagger = originalEndpoint.src.swagger.find(function(element) {
									return element.version === v;
								});
								reformattedRecord.versions[v].swagger = JSON.stringify(yamljs.parse(swagger.content.content));
							}
							catch (e) {
								req.soajs.log.error(e);
							}
						}
					}
					
					if (originalEndpoint.src.soaVersion && originalEndpoint.src.soaVersion.length > 0) {
						try {
							let soa = originalEndpoint.src.soaVersion.find(function(element) {
								return element.version === v;
							});
							reformattedRecord.versions[v].soa = soa.content.content;
						}
						catch (e) {
							req.soajs.log.error(e);
						}
					}
					
					delete reformattedRecord.versions[v].schema;
					delete reformattedRecord.versions[v].errors;
				}
				reformattedRecord.src = {};
				if (originalEndpoint.src) {
					reformattedRecord.src = {
						"provider": originalEndpoint.src.provider,
						"urls": originalEndpoint.src.urls,
					};
					if (originalEndpoint.src.url){
						reformattedRecord.src.simulateUrl = originalEndpoint.src.url;
					}
				} else {
					return cbMain({
						"code": 924,
						"msg": config.errors[924]
					});
				}
			}
			reformattedRecord.swagger = true;
			if (originalEndpoint.maintenance) {
				reformattedRecord.maintenance = {};
				reformattedRecord.maintenance = originalEndpoint.maintenance
			}
			
			
			let refVersions = Object.keys(reformattedRecord.versions);
			refVersions.forEach((oneVersion) => {
				let newVersion = soajsLib.version.sanitize(oneVersion);
				reformattedRecord.versions[soajsLib.version.sanitize(oneVersion)] = reformattedRecord.versions[oneVersion];
				if (oneVersion !== newVersion) {
					delete reformattedRecord.versions[oneVersion];
				}
			});
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
	
	"get": function (config, req, res, apiModule, cbMain) {
		let mainType = req.soajs.inputmaskData.mainType;
		let collection;
		if (mainType === 'endpoints') {
			collection = endpointsCollection;
		} else if (mainType === 'passThroughs') {
			collection = passThroughCollection;
		} else {
			collection = servicesCollection;
		}
		let id = BL.model.validateCustomId(req.soajs, req.soajs.inputmaskData.id);
		checkReturnError(req, cbMain, {code: 701, error: !id, config: config}, function () {
			let conditions = {
				_id: id
			};
			
			let opts = {
				collection,
				conditions
			};
			if (mainType === 'passThroughs') {
				apiModule.findEntry(req.soajs, BL.model, opts, function (error, record) {
					checkReturnError(req, cbMain, {code: 600, error: error, config: config}, function () {
						return cbMain(null, record);
					});
				});
			} else {
				BL.model.findEntry(req.soajs, opts, function (error, record) {
					checkReturnError(req, cbMain, {code: 600, error: error, config: config}, function () {
						return cbMain(null, record);
					});
				});
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
		let collection;
		if (mainType === 'endpoints') {
			collection = endpointsCollection;
		} else if (mainType === 'passThroughs') {
			collection = passThroughCollection;
		} else {
			collection = servicesCollection;
		}
		
		let input = req.soajs.inputmaskData;
		let created = new Date().getTime();
		
		let record = {
			created,
			type: "service",
			injection: true,
			serviceGroup: input.serviceGroup,
			serviceName: input.serviceName,
			servicePort: input.servicePort,
			requestTimeout: input.requestTimeout ? input.requestTimeout : 30,
			requestTimeoutRenewal: input.requestTimeoutRenewal ?input.requestTimeoutRenewal : 5
		};
		
		if (input.program) {
			record.program = input.program;
		}
		
		if (input.description) {
			record.description = input.description;
		}
		
		if (input.tab) {
			record.tab = input.tab;
		}
		
		if (input.tags) {
			record.tags = input.tags;
		}
		
		if (input.attributes) {
			record.attributes = input.attributes;
		}
		
		if (mainType !== 'passThroughs') {
			prepareNonPassThroughRecord(record, input);
		} else {
			preparePassThroughRecord(record, input);
		}
		
		function sanitize (record) {
			if (record.versions && Object.keys(record.versions).length > 0){
				for (let version in record.versions) {
					if (record.versions.hasOwnProperty(version)
						&& record.versions[version]
						&& record.versions[version].schema){
						for (let rest in record.versions[version].schema){
							let newRest = {};
							if (record.versions[version].schema.hasOwnProperty(rest) && record.versions[version].schema[rest]){
								let newRoute;
								for (let route in record.versions[version].schema[rest]){
									if (record.versions[version].schema[rest].hasOwnProperty(route) && record.versions[version].schema[rest][route]){
										newRoute = route;
										if (route.indexOf(".") !== -1){
											newRoute = route.replace(".", "__dot__");
										}
										if (record.versions[version].schema[rest][route]
											&& record.versions[version].schema[rest][route].imfv
											&& Object.keys(record.versions[version].schema[rest][route].imfv).length > 0){
											for (let imfv in record.versions[version].schema[rest][route].imfv){
												let custom = {};
												if (record.versions[version].schema[rest][route].imfv.hasOwnProperty(imfv)
													&& record.versions[version].schema[rest][route].imfv[imfv]){
													let newParams;
													for (let param in record.versions[version].schema[rest][route].imfv[imfv]){
														if (record.versions[version].schema[rest][route].imfv[imfv].hasOwnProperty(param)){
															newParams= param;
															if (param.indexOf(".") !== -1){
																newParams = param.replace(".", "__dot__");
															}
														}
														custom[newParams] = record.versions[version].schema[rest][route].imfv[imfv][param];
													}
												}
												delete record.versions[version].schema[rest][route].imfv[imfv];
												record.versions[version].schema[rest][route].imfv[imfv] = custom;
											}
										}
									}
									newRest[newRoute] = record.versions[version].schema[rest][route];
								}
								delete record.versions[version].schema[rest];
								record.versions[version].schema[rest] = newRest;
							}
							
						}
					}
				}
			}
		}
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
						sanitize(record);
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
		
		function prepareNonPassThroughRecord (record, input){
			record.serviceVersion = input.serviceVersion;
			record.oauth = input.oauth;
			record.models = {
				path: "setInEndpoint",
				name: input.epType
			};
			record.extKeyRequired = input.extKeyRequired;
			record.authentications = input.authentications;
			record.defaultAuthentication = input.defaultAuthentication;
			record.swaggerInput = input.swaggerInput;
			record.prerequisites = {};
			if (input.import) {
				record.schema = input.schema || input.schemas;
				record.errors = input.errors;
				createEp(record);
			} else if (input.swaggerInput) {
				utils.generateSchemaFromSwagger(input.swaggerInput, record, mainType, function (error, output) {
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
		}
		
		function preparePassThroughRecord(record, input) {
			record.versions = input.versions;
			if (input.path && input.port) {
				record.maintenance = {
					port: {
						type: "custom",
						value: input.port
					},
					readiness: input.path
				}
			} else {
				record.maintenance = {
					port: {
						type: "inherit"
					},
					readiness: "/heartbeat"
				}
			}
			record.src = {
				"provider": "endpoint",
				"urls": [],
				"swagger": [],
				"soaVersion": []
			};
			if (input.simulateUrl) {
				record.src.url = input.simulateUrl;
			}
			if (input.soa){
				record.src.soa = input.soa;
			}
			async.forEachOf(record.versions, function (oneVersion, key, callback) {
				if (oneVersion.swagger && oneVersion.swagger.swaggerInput) {
					utils.generateSchemaFromSwagger(oneVersion.swagger.swaggerInput, record, mainType, function (error, output) {
						if (error) {
							return callback(error);
						}
						if (output) {
							delete record.schema;
							delete record.errors;
							record.versions[key].schema = output.schema;
							record.versions[key].errors = output.errors;
						}
						
						fillOptionsSrc(record, oneVersion, key);
						return callback();
					});
				} else {
					fillOptionsSrc(record, oneVersion, key);
					record.versions[key].schema = {};
					record.versions[key].errors = {};
					return callback();
				}
			}, function (err) {
				checkReturnError(req, cbMain, {code: 400, error: err, config: config}, function () {
					if (record.versions) {
						let versions = Object.keys(record.versions);
						
						versions.forEach((oneVersion) => {
							let newVersion = soajsLib.version.sanitize(oneVersion);
							record.versions[soajsLib.version.sanitize(oneVersion)] = record.versions[oneVersion];
							if (oneVersion !== newVersion) {
								delete record.versions[oneVersion];
							}
						});
					}
					createEp(record);
				});
			});
		}
	},
	
	"authenticationUpdate": function (config, req, res, cbMain) {
		let mainType = req.soajs.inputmaskData.mainType;
		let collection;
		if (mainType === 'endpoints') {
			collection = endpointsCollection;
		} else if (mainType === 'passThroughs') {
			collection = passThroughCollection;
		} else {
			collection = servicesCollection;
		}
		
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
		let collection;
		if (mainType === 'endpoints') {
			collection = endpointsCollection;
		} else if (mainType === 'passThroughs') {
			collection = passThroughCollection;
		} else {
			collection = servicesCollection;
		}
		
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
						
						utils.generateSchemaFromSwagger(swagger, record, mainType, function (error, output) {
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
		let collection;
		if (mainType === 'endpoints') {
			collection = endpointsCollection;
		} else if (mainType === 'passThroughs') {
			collection = passThroughCollection;
		} else {
			collection = servicesCollection;
		}
		
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
	
	"edit": function (config, req, res, apiModule, cbMain) {
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
			let collection;
			let mainType = req.soajs.inputmaskData.mainType;
			if (mainType === 'passThroughs') {
				collection = passThroughCollection
			} else {
				if (mainType === 'services') {
					collection = servicesCollection;
				} else if (mainType === 'endpoints') {
					collection = endpointsCollection;
				}
			}
			BL.model.findEntry(req.soajs, optsService1, function (error, serviceRecordIsAlreadyAdded) {
				checkReturnError(req, cbMain, {code: 600, error: error, config: config}, function () {
					checkReturnError(req, cbMain, {
						code: 920,
						error: serviceRecordIsAlreadyAdded,
						config: config
					}, function () {
						let conditions = {
							_id: id
						};
						
						function findEntryInCollection(cb) {
							let opts = {
								conditions
							};
							if (mainType === 'passThroughs') {
								apiModule.findEntries(req.soajs, BL.model, opts, cb);
							} else {
								opts.collection = collection;
								BL.model.findEntry(req.soajs, opts, cb);
							}
						}
						
						// get original record to get schemas => to update services apis
						findEntryInCollection(function (error, originalRecord) {
							checkReturnError(req, cbMain, {code: 600, error: error, config: config}, function () {
								checkReturnError(req, cbMain, {
									code: 921,
									error: !originalRecord,
									config: config
								}, function () {
									let reformattedRecord = {
										serviceName: input.serviceName,
										serviceGroup: input.serviceGroup,
										servicePort: input.servicePort,
										requestTimeout: input.requestTimeout,
										requestTimeoutRenewal: input.requestTimeoutRenewal
									};
									
									if (mainType !== 'passThroughs') {
										prepareNonPassThroughRecord (reformattedRecord, input);
									}
									else {
										preparePassThroughRecord (reformattedRecord, input);
									}
									
									function prepareNonPassThroughRecord (reformattedRecord, input) {
										reformattedRecord.models = {
											path: "setInEndpoint",
											name: input.epType
										};
										reformattedRecord.serviceVersion = input.serviceVersion;
										reformattedRecord.serviceVersion = input.serviceVersion;
										reformattedRecord.oauth = input.oauth || false;
										reformattedRecord.extKeyRequired = input.extKeyRequired || false;
										reformattedRecord.authentications = input.authentications;
										reformattedRecord.defaultAuthentication = input.defaultAuthentication;
										reformattedRecord.prerequisites = {};
										
										if (mainType === 'services') {
											delete reformattedRecord.authentications;
											delete reformattedRecord.defaultAuthentication;
											delete reformattedRecord.swaggerInput;
											
											reformattedRecord.urac = input.urac || false;
											reformattedRecord.urac_Profile = input.urac_Profile || false;
											reformattedRecord.urac_ACL = input.urac_ACL || false;
											reformattedRecord.tenant_Profile = input.urac_ACL || false;
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
												} else {
													reformattedRecord.models.name = "es";
												}
											}
										}
										sanitize(reformattedRecord);
										let updatedRecord = {
											"$set": reformattedRecord
										};
										let opts2 = {
											collection,
											conditions,
											fields: updatedRecord,
											options: {upsert: true, safe: true}
										};
										
										updateRecord(opts2);
									}
									
									function preparePassThroughRecord(reformattedRecord, input) {
										reformattedRecord.versions = input.versions;
										if (input.path && input.port) {
											reformattedRecord.maintenance = {
												port: {
													type: "custom",
													value: input.port
												},
												readiness: input.path
											}
										}
										reformattedRecord.src = {
											"provider": "endpoint",
											"urls": [],
											"swagger": []
										};
										if (input.simulateUrl) {
											reformattedRecord.src.url = input.simulateUrl;
										}
										async.forEachOf(reformattedRecord.versions, function (oneVersion, key, callback) {
											if (oneVersion.swagger && oneVersion.swagger.swaggerInput) {
												utils.generateSchemaFromSwagger(oneVersion.swagger.swaggerInput, reformattedRecord, mainType, function (error, output) {
													if (error) {
														return callback(error);
													}
													if (output) {
														delete reformattedRecord.schema;
														delete reformattedRecord.errors;
														reformattedRecord.versions[key].schema = output.schema;
														reformattedRecord.versions[key].errors = output.errors;
													}
													
													fillOptionsSrc(reformattedRecord, oneVersion, key);
													return callback();
												});
											} else {
												fillOptionsSrc(reformattedRecord, oneVersion, key);
												reformattedRecord.versions[key].schema = {};
												reformattedRecord.versions[key].errors = {};
												return callback();
											}
										}, function (err) {
											checkReturnError(req, cbMain, {
												code: 400,
												error: err,
												config: config
											}, function () {
												if (reformattedRecord.versions) {
													let versions = Object.keys(reformattedRecord.versions);
													versions.forEach((oneVersion) => {
														let newVersion = soajsLib.version.sanitize(oneVersion);
														reformattedRecord.versions[soajsLib.version.sanitize(oneVersion)] = reformattedRecord.versions[oneVersion];
														if (oneVersion !== newVersion) {
															delete reformattedRecord.versions[oneVersion];
														}
													});
												}
												sanitize(reformattedRecord);
												let updatedRecord = {
													"$set": reformattedRecord
												};
												let opts2 = {
													collection,
													conditions,
													fields: updatedRecord,
													options: {upsert: true, safe: true}
												};
												
												updateRecord(opts2);
											});
										});
									}
									
									function sanitize (record) {
										if (record.versions && Object.keys(record.versions).length > 0){
											for (let version in record.versions) {
												if (record.versions.hasOwnProperty(version)
													&& record.versions[version]
													&& record.versions[version].schema){
													for (let rest in record.versions[version].schema){
														let newRest = {};
														if (record.versions[version].schema.hasOwnProperty(rest) && record.versions[version].schema[rest]){
															let newRoute;
															for (let route in record.versions[version].schema[rest]){
																if (record.versions[version].schema[rest].hasOwnProperty(route) && record.versions[version].schema[rest][route]){
																	newRoute = route;
																	if (route.indexOf(".") !== -1){
																		newRoute = route.replace(".", "__dot__");
																	}
																	if (record.versions[version].schema[rest][route]
																		&& record.versions[version].schema[rest][route].imfv
																		&& Object.keys(record.versions[version].schema[rest][route].imfv).length > 0){
																		for (let imfv in record.versions[version].schema[rest][route].imfv){
																			let custom = {};
																			if (record.versions[version].schema[rest][route].imfv.hasOwnProperty(imfv)
																				&& record.versions[version].schema[rest][route].imfv[imfv]){
																				let newParams;
																				for (let param in record.versions[version].schema[rest][route].imfv[imfv]){
																					if (record.versions[version].schema[rest][route].imfv[imfv].hasOwnProperty(param)){
																						newParams= param;
																						if (param.indexOf(".") !== -1){
																							newParams = param.replace(".", "__dot__");
																						}
																					}
																					custom[newParams] = record.versions[version].schema[rest][route].imfv[imfv][param];
																				}
																			}
																			delete record.versions[version].schema[rest][route].imfv[imfv];
																			record.versions[version].schema[rest][route].imfv[imfv] = custom;
																		}
																	}
																}
																newRest[newRoute] = record.versions[version].schema[rest][route];
															}
															delete record.versions[version].schema[rest];
															record.versions[version].schema[rest] = newRest;
														}
														
													}
												}
											}
										}
									}
									
									function updateRecord(opts2) {
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
									}
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
								
							} else {
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
								utils.generateSchemaFromSwagger(swagger, record, mainType, function (error, output) {
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
		let collection;
		if (mainType === 'endpoints') {
			collection = endpointsCollection;
		} else if (mainType === 'passThroughs') {
			collection = passThroughCollection;
		} else {
			collection = servicesCollection;
		}
		
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
				} else {
					checkWhereServiceisDeployed(originalServiceRecord);
				}
			});
		});
		
		function checkWhereServiceisDeployed(originalServiceRecord) {
			if (mainType === 'passThroughs') {
				deleteFromServicesAndFromApiBuilder();
			} else {
				//if cloud container deployment
				if (process.env.SOAJS_DEPLOY_HA) {
					BL.model.findEntries(req.soajs, {
						collection: "environment",
						fields: {"code": 1}
					}, (error, environments) => {
						checkReturnError(req, cbMain, {code: 600, error: error, config: config}, function () {
							if (!environments || environments.length === 0) {
								deleteFromServicesAndFromApiBuilder();
							} else {
								async.eachSeries(environments, (oneEnvironment, vCb) => {
									req.soajs.inputmaskData.env = oneEnvironment.code;
									cloudBL.listServices(config, req.soajs, deployer, function (error, deployedServices) {
										if (error || !deployedServices || deployedServices.length === 0) {
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
										} else {
											return vCb();
										}
									});
								}, (error) => {
									checkReturnError(req, cbMain, {
										code: 766,
										error: error,
										config: config
									}, function () {
										deleteFromServicesAndFromApiBuilder();
									});
								});
							}
						});
					});
				} else {
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
							} else {
								deleteFromServicesAndFromApiBuilder();
							}
						});
					});
				}
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
