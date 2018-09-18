var json2yaml = require('json2yaml');
let YAML = require("yamljs");

function mapSoajsTypeToSwaggerType(soajsType) {
	let swaggerType;
	
	switch (soajsType) {
		case 'string' :
			swaggerType = "string";
			break;
		case 'float' :
			swaggerType = "number";
			break;
		case 'integer' :
			swaggerType = "integer";
			break;
		case 'boolean' :
			swaggerType = "boolean";
			break;
		case 'array' :
			swaggerType = "array";
			break;
		case 'object' :
			swaggerType = "object";
			break;
		default:
			swaggerType = swaggerType; // unmapped, keep as is
			break;
	}
	
	return swaggerType;
}

var lib = {
	
	generateYaml: function (soajsImfvSchema, serviceRecord) {
		let output = {
			swagger: "2.0",
			info: {
				version: "1.0.0",
				title: serviceRecord.serviceName
			},
			host: "localhost",
			basePath: "/" + serviceRecord.serviceName,
			schemes: [
				"http"
			],
			
			paths: {} // route / method / ...
			// parameters: {} //common fields
			// definitions: {}
		};
		
		if (serviceRecord.responses) {
			output.responses = serviceRecord.responses;
		}
		
		let soajsImfvSchemaKeys = Object.keys(soajsImfvSchema);
		
		soajsImfvSchemaKeys.forEach(function (schemaKey) {
			let schema = soajsImfvSchema[schemaKey];
			
			if (schemaKey === 'commonFields') {
				let parameters = lib.deduceParamsFromCommonFields(schema);
				if (parameters && Object.keys(parameters).length > 0) {
					output.parameters = parameters;
				}
			}
			else {
				let routesKeys = Object.keys(schema);
				routesKeys.forEach(function (routeKey) {
					let route = schema[routeKey];
					
					if (route.imfv) {
						let custom = route.imfv.custom;
						let commonFields = route.imfv.commonFields;
						let routeParams = [];
						
						if (custom) {
							routeParams = lib.convertCustomImfv(custom);
						}
						
						if (commonFields) {
							commonFields.forEach(function (eachCom) {
								routeParams.push({
									"$ref": "#/parameters/" + eachCom
								});
							});
						}
						
						if (!output.paths[routeKey]) {
							output.paths[routeKey] = {};
						}
						
						output.paths[routeKey][schemaKey] = {
							tags: [(route && route._apiInfo && route._apiInfo.group) ? route._apiInfo.group.replace(/\s+/g, '') : ""],
							summary: (route && route._apiInfo) ? route._apiInfo.l : "",
							operationId: (route && route._apiInfo && route._apiInfo.l) ? route._apiInfo.l.replace(/\s+/g, '') : "",
							// responses: {
							// 	"200": {
							// 		"$ref": "#/responses/success"
							// 	}
							// } // todo: responses
						};
						
						if (routeParams && routeParams.length > 0) {
							output.paths[routeKey][schemaKey].parameters = routeParams;
						}
					}
				});
			}
		});
		return output;
	},
	
	/**
	 * swagger types : body, header, formData, query, path
	 * soajs types : query, body, params, headers
	 * @param arrayOfSources
	 * @returns {*}
	 */
	convertSource: function (arrayOfSources) {
		let output = ""; // body
		if (arrayOfSources) {
			arrayOfSources.forEach(function (eachSource) {
				if (eachSource.includes('body')) {
					output += "body,";
				}
				if (eachSource.includes('headers')) {
					output += "header,";
				}
				if (eachSource.includes('query')) {
					output += "query,";
				}
				if (eachSource.includes('params')) {
					output += "path,";
				}
			})
		}
		
		if (output.length > 0) {
			output = output.substring(0, output.length - 1);
		}
		
		return output !== '' ? output : null;
	},
	
	/**
	 *
	 * @param items
	 * @returns {array of required object ['xx','yyy']}
	 */
	convertRequired: function (items) {
		let output = [];
		
		if (!items) {
			return null;
		}
		
		let itemsKeys = Object.keys(items);
		itemsKeys.forEach(function (eachItem) {
			if (items[eachItem] && items[eachItem].required) {
				output.push(eachItem);
			}
		});
		
		if (output.length === 0) {
			return null;
		} else {
			return output;
		}
	},
	
	convertItem: function (key, object) {
		
		let output = {};
		
		if (!object) {
			return {};
		}
		
		if (object.validation) { // on root level
			output.name = key;
		}
		
		if (object.required && object.validation) { // todo: make sure u r not in a subobject, then u can add required
			output.required = object.required;
		}
		
		if (object.source) {
			output.in = lib.convertSource(object.source);
		}
		
		if (object.description) {
			output.description = object.description;
		}
		
		if (object.validation) {
			if (object.validation.type === 'object') {
				// definitions can be supported here!
				let properties = object.validation.properties;
				let required = lib.convertRequired(properties);
				
				output.schema = {
					type: "object",
					properties: {}
				};
				
				if (required) {
					output.schema.required = required;
				}
				
				if (properties) {
					let propertiesKeys = Object.keys(properties);
					propertiesKeys.forEach(function (eachProps) {
						output.schema.properties[eachProps] = lib.convertItem(eachProps, properties[eachProps]);
					});
				}
			} else if (object.validation.type === 'array') {
				
				output.schema = {
					type: "array",
					items: {}
				};
				
				let items = object.validation.items;
				if (items) {
					let itemsType = object.validation.items.type;
					let itemsProperties = object.validation.items.properties;
					
					output.schema.items.type = itemsType;
					
					if (itemsType === 'object' && itemsProperties) {
						output.schema.items.properties = {};
						let itemsKeys = Object.keys(itemsProperties);
						itemsKeys.forEach(function (eachItem) {
							output.schema.items.properties [eachItem] = lib.convertItem(eachItem, itemsProperties[eachItem]);
						});
					}
				}
			} else {
				output.type = mapSoajsTypeToSwaggerType(object.validation.type);
			}
		}
		
		if (object.type) {
			output.type = mapSoajsTypeToSwaggerType(object.type);
			if (object.type === 'object') {
				output.properties = {};
				
				let properties = object.properties;
				let required = lib.convertRequired(properties);
				
				if (required) {
					output.required = required;
				}
				
				if (properties) {
					let propertiesKeys = Object.keys(properties);
					propertiesKeys.forEach(function (eachProps) {
						output.properties[eachProps] = lib.convertItem(eachProps, properties[eachProps]);
					});
				}
			}
			
			if (object.type === 'array') {
				output.items = {};
				let items = object.items;
				if (items) {
					let itemsType = object.items.type;
					let itemsProperties = object.items.properties;
					
					output.items.type = itemsType;
					
					if (itemsType === 'object' && itemsProperties) {
						output.items.properties = {};
						let itemsKeys = Object.keys(itemsProperties);
						itemsKeys.forEach(function (eachItem) {
							output.items.properties [eachItem] = lib.convertItem(eachItem, itemsProperties[eachItem]);
						});
					}
				}
			}
		}
		
		return output;
	},
	
	convertCustomImfv: function (soajsImfv) {
		let output = [];
		
		let customKeys = Object.keys(soajsImfv);
		customKeys.forEach(function (eachCustom) {
			let customKey = soajsImfv[eachCustom];
			let tempo = lib.convertItem(eachCustom, customKey);
			output.push(tempo);
		});
		
		return output;
	},
	
	deduceParamsFromCommonFields: function (commonFields) {
		let output = {};
		
		if (!commonFields) {
			return output;
		}
		
		let commonFieldsArray = Object.keys(commonFields);
		commonFieldsArray.forEach(function (eachCommon) {
			let commonField = commonFields[eachCommon];
			let tempo = lib.convertItem(eachCommon, commonField);
			output[tempo.name] = tempo;
		});
		
		return output;
	}
	
};

module.exports = {
	/**
	 * parse the JSON and generate a Yaml from it
	 * @param cb
	 * @returns {*}
	 */
	"parseJson": function (mainType, soajsImfvSchema, serviceRecord, callback) {
		
		if (mainType !== 'endpoints') {
			try {
				let yamlJSON = YAML.parse(serviceRecord.swaggerInput);
				if (yamlJSON && yamlJSON.responses && Object.keys(yamlJSON.responses).length > 0) {
					serviceRecord.responses = yamlJSON.responses;
				}
			}
			catch (e) {
				console.log(e);
				return callback({"code": 851, "msg": e.message});
			}
		}
		
		let yamlObject = lib.generateYaml(soajsImfvSchema, serviceRecord);
		
		try {
			let yamlString = YAML.stringify(yamlObject, 20);
			
			return callback(null, yamlString);
		}
		catch (e) {
			console.log(e);
			return callback({"code": 851, "msg": e.message});
		}
	},
	
	/**
	 * detect multiple bodies
	 * detect multiple sources
	 *
	 * @param soajsImfvSchema : schema
	 * @param callback()
	 * @returns {errorDescription/empty}
	 */
	preParseValidation: function (schema, callback) {
		let error;
		if (schema) {
			let schemaKeys = Object.keys(schema);
			schemaKeys.forEach(function (eachSchemaKey) {
				let eachSchema = schema[eachSchemaKey];
				if (eachSchemaKey === 'commonFields') {
					let commonFieldsKeys = Object.keys(eachSchema);
					commonFieldsKeys.forEach(function (eachCommon) {
						let sources = eachSchema[eachCommon].source;
						if (sources && sources.length > 1) {
							error = `Swagger doesn't support multiple sources for inputs; detected inputs in common fields [${eachCommon}] with multiple sources. Please reduce sources to one for these inputs to sync with swagger`;
						}
					});
				}
				else {
					let apiKeys = Object.keys(eachSchema);
					apiKeys.forEach(function (eachApiKey) {
						let eachApi = eachSchema[eachApiKey];
						
						if (eachApi.imfv) {
							let custom = eachApi.imfv.custom;
							let commonFields = eachApi.imfv.commonFields;
							let bodySourceCount = 0;
							
							if (custom) {
								let customInputsKeys = Object.keys(custom);
								customInputsKeys.forEach(function (eachInputKey) {
									let eachInput = custom[eachInputKey];
									if (eachInput.source) {
										let sources = eachInput.source;
										sources.forEach(function (eachSource) {
											if (eachSource.includes('body.')) {
												bodySourceCount++;
											}
										});
										
										if (sources.length > 1) {
											error = `Swagger doesn't support multiple sources for inputs; detected in API [${eachSchemaKey} ${eachApiKey}] inputs [${eachInputKey}] with multiple sources. Please reduce sources to one for these inputs to sync with swagger`;
										}
									}
								});
							}
							
							if (commonFields) {
								commonFields.forEach(function (eachCommon) {
									let commonInput = schema.commonFields[eachCommon];
									if (commonInput) {
										let sources = commonInput.source;
										if(sources){
											sources.forEach(function (eachSource) {
												if (eachSource.includes('body.')) {
													bodySourceCount++;
												}
											});
										}
									}
								});
							}
							
							if (bodySourceCount > 1) {
								error = `Swagger doesn't support multiple inputs from body, detected in API [${eachSchemaKey} ${eachApiKey}] multiple inputs in bodies. Please consolidate these inputs under one input (type object) to sync with swagger.`;
							}
						}
					});
				}
			});
			
			return callback(error);
		} else {
			return callback();
		}
	}
};