"use strict";
var fs = require("fs");
var async = require("async");
var yamljs = require("yamljs");
var Validator = require('jsonschema').Validator;
var schema = require("./schema");
var passThroughsSchema = require("./passThrough-schema");

/**
 * reformat paths/keys having {} and convert them to :
 * @param paths
 */
function reformatPaths(paths) {
	let output = {};
	
	if (!paths) {
		return output;
	}
	
	let pathsKeys = Object.keys(paths);
	
	pathsKeys.forEach(function (eachKey) {
		let newKey = eachKey;
		
		if (eachKey.includes("{") && eachKey.includes("}")) {
			// replace : {params} by :params
			newKey = newKey.replace(new RegExp('{', 'g'), ':');
			newKey = newKey.replace(new RegExp('}', 'g'), '');
		}
		
		output[newKey] = paths[eachKey];
	});
	
	return output;
}

function mapSwaggerTypeToSoajsType(swaggerType) {
	let soajsType;
	
	switch (swaggerType) {
		case 'string' :
			soajsType = "string";
			break;
		case 'number' :
			soajsType = "integer";
			break;
		case 'integer' :
			soajsType = "integer";
			break;
		case 'boolean' :
			soajsType = "boolean";
			break;
		case 'array' :
			soajsType = "array";
			break;
		case 'object' :
			soajsType = "object";
			break;
		default:
			soajsType = swaggerType; // unmapped, keep as is
			break;
	}
	
	return soajsType;
}

function decodeReference(ref) {
	// todo: split and decode
	if (ref.includes('parameters')) {
		return 'parameters';
	}
	
	if (ref.includes('definitions')) {
		return 'definitions';
	}
	
	return '';
}

/**
 * swagger types : body, header, formData, query, path
 * soajs types : query, body, params, headers
 * @param inObj String ex: body
 */
function convertSource(key, inObj) {
	let source = inObj; // body, query : keep it as is
	
	if (inObj === 'header') {
		source = "headers";
	}
	if (inObj === 'formData') {
		source = "body";
	}
	if (inObj === 'path') {
		source = "params";
	}
	
	return [`${source}.${key}`];
}

/**
 *
 * @param mainDefinitions : coming null from fetch definitions
 * @param item
 * @param level : if root (1) : set in validation
 * @returns {*}
 */
function convertItem(mainDefinitions, item, level) {
	let output = {};
	let outputKey = '';
	
	if (!item) {
		return undefined;
	}
	
	if (item.name) {
		outputKey = item.name;
	}
	
	output.required = item.required || false;
	
	if (item.in) {
		if (!item.name) {
			// console.log('todo: could it ever happen??');
		}
		output.source = convertSource(item.name, item.in);
	}
	
	if (item.description) {
		output.description = item.description;
	}
	
	if (item.type) {
		let workOn = output;
		
		if (level === 1) { // root // work with validation
			output.validation = {};
			workOn = output.validation;
		}
		
		workOn.type = mapSwaggerTypeToSoajsType(item.type);
		if (item.type === 'object') {
			if (item.properties) {
				let newLevel = level + 1;
				let propertiesKeys = Object.keys(item.properties);
				workOn.properties = {};
				propertiesKeys.forEach(function (eachProp) {
					workOn.properties[eachProp] = convertItem(mainDefinitions, item.properties[eachProp], newLevel);
					workOn.properties[eachProp].required = (item.required && Array.isArray(item.required)) ? item.required.indexOf(eachProp) !== -1 : false;
				});
			}
		}
		
		if (item.type === 'array') {
			if (item.items) {
				
				workOn.items = {
					type: item.items.type
				};
				
				if (item.items.properties) {
					let newLevel = level + 1;
					let propertiesKeys = Object.keys(item.items.properties);
					workOn.items.properties = {};
					propertiesKeys.forEach(function (eachProp) {
						workOn.items.properties[eachProp] = convertItem(mainDefinitions, item.items.properties[eachProp], newLevel);
					});
				}
			}
		}
	}
	
	if (item.schema) {
		
		if (item.schema['$ref']) {
			let referenceType = decodeReference(item.schema['$ref']);
			
			if (referenceType === 'definitions') {
				let definitionKey = item.schema['$ref'].split('definitions/')[1];
				output.validation = mainDefinitions[definitionKey].validation;
				// todo: required from object
			}
			
		} else {
			if (!output.validation) {
				output.validation = {};
			}
			
			output.validation.type = mapSwaggerTypeToSoajsType(item.schema.type);
			
			if (item.schema.properties) { // object
				let newLevel = level + 1;
				let propertiesKeys = Object.keys(item.schema.properties);
				output.validation.properties = {};
				propertiesKeys.forEach(function (eachProp) {
					output.validation.properties[eachProp] = convertItem(mainDefinitions, item.schema.properties[eachProp], newLevel);
					output.validation.properties[eachProp].required = (item.schema.required && Array.isArray(item.schema.required)) ? item.schema.required.indexOf(eachProp) !== -1 : false;
				});
			}
			
			if (item.schema.type === 'array') {
				if (item.schema.items) {
					
					output.validation.items = {
						type: item.schema.items.type
					};
					
					if (item.schema.items.properties) { // array of object
						let newLevel = level + 1;
						let propertiesKeys = Object.keys(item.schema.items.properties);
						output.validation.items.properties = {};
						propertiesKeys.forEach(function (eachProp) {
							output.validation.items.properties[eachProp] = convertItem(mainDefinitions, item.schema.items.properties[eachProp], newLevel);
						});
					}
				}
			}
		}
	}
	
	return output;
}

/**
 *
 * @param parameters: array of objects
 *  {
    "$ref": "#/definitions/testInDef"
    }
 
 or
 
 {
    "name": "testDirect",
    "required": true,
    "in": "body",
    "description": "description description",
    "schema": {}
  }
 
 * @returns {{}}
 */
function convertParams(mainDefinitions, mainParameters, parameters) {
	let output = {
		custom: {},
		commonFields: []
	};
	
	if (!parameters) {
		return {
			custom: {}
		};
	}
	
	parameters.forEach(function (eachParam) {
		let paramKeys = Object.keys(eachParam);
		if (paramKeys.length === 1 && eachParam['$ref']) { // reference detected
			let referenceType = decodeReference(eachParam['$ref']);
			
			if (referenceType === 'definitions') {
				let definitionKey = eachParam['$ref'].split('definitions/')[1];
				output.custom[definitionKey] = mainDefinitions[definitionKey];
				// double check mainDef have it
			}
			if (referenceType === 'parameters') {
				let parameterKey = eachParam['$ref'].split('parameters/')[1];
				output.commonFields.push(parameterKey);
				// double check if mainparams have it
			}
			
		} else {
			let newItem = convertItem(mainDefinitions, eachParam, 1);
			
			if (eachParam.name) {
				output.custom[eachParam.name] = newItem;
			} else {
				// console.log('todo: could it ever happen??');
			}
		}
	});
	
	if (output.commonFields.length === 0) {
		delete output.commonFields;
	}
	
	return output;
}

var swagger = {
	
	/**
	 * parse the yaml and generate a config.js content from it
	 * @param cb
	 * @returns {*}
	 */
	"parseYaml": function (yamlContent, context, callback) {
		var jsonAPISchema;
		try {
			jsonAPISchema = yamljs.parse(yamlContent);
		} catch (e) {
			try {
				jsonAPISchema = JSON.parse(yamlContent);
			} catch (l) {
				return callback({"code": 851, "msg": e.message});
			}
		}
		try {
			swagger.validateYaml(jsonAPISchema);
		}
		catch (e) {
			return callback({ "code": 173, "msg": e.message });
		}

		context.yaml = jsonAPISchema;
		
		swagger.preMapApisValidation(jsonAPISchema, function (errorDescription) {
			if (errorDescription && context.soajs.mainType !== 'passThroughs') {
				let error = {
					code: 853,
					msg: errorDescription
				};
				return callback(error);
			} else {
				swagger.mapAPis(jsonAPISchema, function (response) {
					context.soajs.config.schema = response.schema;
					context.soajs.config.errors = response.errors;
					
					var myValidator = new Validator();
					let schemaToBeUsed = schema;
					if (context.soajs.config.versions){
						schemaToBeUsed = passThroughsSchema;
					}
					var check = myValidator.validate(context.soajs.config, schemaToBeUsed);
					if (check.valid) {
						return callback(null, true);
					}
					else {
						var errMsgs = [];
						check.errors.forEach(function (oneError) {
							errMsgs.push(oneError.stack);
						});
						
						return callback({ "code": 172, "msg": new Error(errMsgs.join(" - ")).message });
					}
				});
			}
		});
	},
	
	/**
	 * validate that parsed yaml content has the minimum required fields
	 * @param yamlJson
	 */
	"validateYaml": function (yamlJson) {
		if (typeof yamlJson !== 'object') {
			throw new Error("Yaml file was converted to a string");
		}
		
		if (!yamlJson.paths || Object.keys(yamlJson.paths).length === 0) {
			throw new Error("Yaml file is missing api schema");
		}
		
		//loop in path
		for (var onePath in yamlJson.paths) {
			//loop in methods
			for (var oneMethod in yamlJson.paths[onePath]) {
				if (!yamlJson.paths[onePath][oneMethod].summary || yamlJson.paths[onePath][oneMethod].summary === "") {
					if (yamlJson.paths[onePath][oneMethod].description && yamlJson.paths[onePath][oneMethod].description !== ""){
						yamlJson.paths[onePath][oneMethod].summary = yamlJson.paths[onePath][oneMethod].description;
					}
					else {
						yamlJson.paths[onePath][oneMethod].summary = "No summary [please add one]";
						//throw new Error("Please enter a summary for API " + oneMethod + ": " + onePath + " you want to build.");
					}
				}
			}
		}
	},
	
	/**
	 * check if apis have responses
	 *
	 * @param jsonAPISchema
	 * @param callback
	 * @returns {errorDescription/empty}
	 */
	preMapApisValidation: function (jsonAPISchema, callback) {
		let paths = jsonAPISchema.paths;
		
		if (paths) {
			let error;
			let apiKeys = Object.keys(paths);
			apiKeys.forEach(function (eachApi) {
				let methods = Object.keys(paths[eachApi]);
				methods.forEach(function (eachMethod) {
					let apiData = paths[eachApi][eachMethod];
					if (apiData.responses) {
						error = `Api responses are not supported by SOAJS framework, please remove them from [${eachMethod} ${eachApi}], otherwise, you cannot sync between swagger and the api builder. Only Global Responses are supported and treated as system error codes when generating services.`;
					}
				});
			});
			
			return callback(error);
		} else {
			callback();
		}
	},
	
	/**
	 * map apis to meet service configuraiton schema from a parsed swagger yaml json object
	 * @param yamlJson
	 * @param cb
	 * @returns {*}
	 */
	"mapAPis": function (yamlJson, cb) {
		
		let all_apis = {};
		let all_errors = {};
		
		let paths = reformatPaths(yamlJson.paths);
		let definitions = yamlJson.definitions;
		let parameters = yamlJson.parameters;
		
		let convertedDefinitions = {};
		let convertedParameters = {};
		
		// convert definitions first
		if (definitions) {
			let definitionsKeys = Object.keys(definitions);
			definitionsKeys.forEach(function (eachDef) {
				convertedDefinitions[eachDef] = convertItem(null, definitions[eachDef], 1); // 1 ??? definitions should never have schema -=-=-=-=-=
			});
		}
		
		// convert parameters then
		if (parameters) {
			let parametersKeys = Object.keys(parameters);
			parametersKeys.forEach(function (eachParam) {
				convertedParameters[eachParam] = convertItem(convertedDefinitions, parameters[eachParam], 1);
			});
			all_apis.commonFields = convertedParameters;
		}
		
		let pathsKeys = Object.keys(paths);
		pathsKeys.forEach(function (eachPath) {
			let pathFix = eachPath.toString();
			if (pathFix.indexOf('/') === -1) {
				pathFix = '/' + pathFix;
			}

			let methods = paths[eachPath];
			let methodsKeys = Object.keys(methods);
			
			methodsKeys.forEach(function (eachMethod) {
				let apiData = methods[eachMethod];
				
				if (!all_apis[eachMethod]) {
					all_apis[eachMethod] = {};
				}
				
				all_apis[eachMethod][pathFix] = {
					_apiInfo: {}
				};
				let newSoajsApi = all_apis[eachMethod][pathFix];
				
				let params = apiData.parameters;
				
				newSoajsApi._apiInfo.group = apiData.tags ? apiData.tags[0] : "";
				newSoajsApi._apiInfo.l = apiData.summary;
				newSoajsApi.imfv = convertParams(convertedDefinitions, convertedParameters, params);
			});
		});
		
		// todo: convert errors
		
		return cb({ "schema": all_apis, "errors": all_errors });
	}
};

module.exports = swagger;