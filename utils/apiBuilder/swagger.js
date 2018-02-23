"use strict";
var fs = require("fs");
var async = require("async");
var yamljs = require("yamljs");
var Validator = require('jsonschema').Validator;
var schema = require("./schema");

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
 *
 * @param inObj String ex: body
 */
function convertSource(key, inObj) {
	let source = inObj; // body, headers, path : keep it as is
	
	if (inObj === 'params') {
		source = "query";
	}
	if (inObj === 'path') {
		source = "params";
	}
	
	return [`${key}.${source}`];
}

/**
 *
 * @param item
 * @param level : if root (1) : set in validation
 * @returns {*}
 */
function convertItem(item, level) {
	let output = {};
	let outputKey = '';
	console.log("uuuuu item");
	console.log(JSON.stringify(item, null, 2));
	console.log("uuuuu item");
	
	if (!item) {
		return undefined;
	}
	
	if (item.name) {
		outputKey = item.name;
	}
	
	if (item.required) {
		output.required = item.required;
	}
	
	if (item.in) {
		if (!item.name) {
			console.log('how could it be???!! .in and !.name !!!');
			process.exit();
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
		
		workOn.type = item.type;
		if (item.type === 'object') {
			if (item.properties) {
				let newLevel = level + 1;
				let propertiesKeys = Object.keys(item.properties);
				workOn.properties = {};
				propertiesKeys.forEach(function (eachProp) {
					console.log("------- XONVERTING ITEM XXXXX");
					console.log(item.properties[eachProp]);
					workOn.properties[eachProp] = convertItem(item.properties[eachProp], newLevel);
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
					console.log("ffffff");
					console.log(item.items.properties);
					let propertiesKeys = Object.keys(item.items.properties);
					workOn.items.properties = {};
					propertiesKeys.forEach(function (eachProp) {
						workOn.items.properties[eachProp] = convertItem(item.items.properties[eachProp], newLevel);
					});
				}
			}
		}
	}
	
	if (item.schema) {
		if (!output.validation) {
			output.validation = {};
		}
		
		output.validation.type = item.schema.type;
		
		if (item.schema.required) {
			// todoz convert shit
		}
		
		if (item.schema.properties) {
			let newLevel = level + 1;
			let propertiesKeys = Object.keys(item.schema.properties);
			output.validation.properties = {};
			propertiesKeys.forEach(function (eachProp) {
				output.validation.properties[eachProp] = convertItem(item.schema.properties[eachProp], newLevel);
			});
		}
	}
	
	console.log("uuuuu output");
	console.log(JSON.stringify(output, null, 2));
	console.log("uuuuu output");
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
			let newItem = convertItem(eachParam, 1);
			
			if (eachParam.name) {
				output.custom[eachParam.name] = newItem;
			} else {
				console.log("really ???? oh waw!");
				process.exit();
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
		}
		catch (e) {
			return callback({"code": 851, "msg": e.message});
		}
		
		try {
			swagger.validateYaml(jsonAPISchema);
		}
		catch (e) {
			return callback({"code": 173, "msg": e.message});
		}
		
		context.yaml = jsonAPISchema;
		
		swagger.preMapApisValidation(jsonAPISchema, function (errorDescription) {
			if (errorDescription) {
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
					
					var check = myValidator.validate(context.soajs.config, schema);
					if (check.valid) {
						return callback(null, true);
					}
					else {
						var errMsgs = [];
						check.errors.forEach(function (oneError) {
							errMsgs.push(oneError.stack);
						});
						
						return callback({"code": 172, "msg": new Error(errMsgs.join(" - ")).message});
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
					throw new Error("Please enter a summary for API " + oneMethod + ": " + onePath + " you want to build.");
				}
			}
		}
	},
	
	/**
	 * clone a javascript object with type casting
	 * @param obj
	 * @returns {*}
	 */
	"cloneObj": function (obj) {
		if (typeof obj !== "object" || obj === null) {
			return obj;
		}
		
		if (obj instanceof Date) {
			return new Date(obj.getTime());
		}
		
		if (obj instanceof RegExp) {
			return new RegExp(obj);
		}
		
		if (obj instanceof Array && Object.keys(obj).every(function (k) {
				return !isNaN(k);
			})) {
			return obj.slice(0);
		}
		var _obj = {};
		for (var attr in obj) {
			if (Object.hasOwnProperty.call(obj, attr)) {
				_obj[attr] = swagger.cloneObj(obj[attr]);
			}
		}
		return _obj;
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
		
		console.log("zzzz ------------------------------------------------------");
		console.log(JSON.stringify(yamlJson, null, 2));
		console.log("zzzz ------------------------------------------------------");
		console.log("zzzz ------------------------------------------------------");
		console.log("zzzz ------------------------------------------------------");
		
		let paths = yamlJson.paths;
		let definitions = yamlJson.definitions;
		let parameters = yamlJson.parameters;
		
		let convertedDefinitions = {};
		let convertedParameters = {};
		
		// convert definitions first
		if (definitions) {
			let definitionsKeys = Object.keys(definitions);
			definitionsKeys.forEach(function (eachDef) {
				convertedDefinitions[eachDef] = convertItem(definitions[eachDef], 1); // 1 ??? definitions should never have schema -=-=-=-=-=
			});
		}
		
		// convert parameters then
		if (parameters) {
			let parametersKeys = Object.keys(parameters);
			parametersKeys.forEach(function (eachParam) {
				convertedParameters[eachParam] = convertItem(parameters[eachParam], 1);
			});
			all_apis.commonFields = convertedParameters;
		}
		
		console.log("zzzz ------------------------------------------------------ you you you ");
		console.log(JSON.stringify(convertedParameters, null, 2));
		console.log("zzzz ------------------------------------------------------ you you you ");
		
		
		let pathsKeys = Object.keys(paths);
		pathsKeys.forEach(function (eachPath) {
			let methods = paths[eachPath];
			let methodsKeys = Object.keys(methods);
			
			methodsKeys.forEach(function (eachMethod) {
				let apiData = methods[eachMethod];
				
				if (!all_apis[eachMethod]) {
					all_apis[eachMethod] = {};
				}
				
				all_apis[eachMethod][eachPath] = {
					_apiInfo: {}
				};
				let newSoajsApi = all_apis[eachMethod][eachPath];
				
				let params = apiData.parameters;
				
				newSoajsApi._apiInfo.group = apiData.tags ? apiData.tags[0] : "";
				newSoajsApi._apiInfo.l = apiData.summary;
				newSoajsApi.imfv = convertParams(convertedDefinitions, convertedParameters, params);
				
			});
		});
		
		
		console.log("----- output ----");
		console.log(all_apis);
		console.log("----- output ----");
		
		return cb({"schema": all_apis, "errors": all_errors});
	}
};

module.exports = swagger;