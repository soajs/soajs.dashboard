"use strict";

var swaggerUtils = require("./swagger");

function firstCharToUpper(str) {
	//todo:
	return str;
}

function convertSource(arrayOfSources) {
	// todo: how to support many source? comma sepperated?
	let output = ""; // body
	if (arrayOfSources) {
		arrayOfSources.forEach(function (eachSource) {
			if (eachSource.includes('body')) {
				output += "body,";
			}
			if (eachSource.includes('headers')) {
				output += "headers,";
			}
			if (eachSource.includes('params')) { // params or headers?
				output += "path,";
			}
		})
	}
	
	if (output.length > 0) {
		output = output.substring(0, output.length - 1);
	}
	
	return output !== '' ? output : null;
}

function convertItem(key, object) {
	console.log('--- +++++++++++++++ +++++++++++++++ +++++++++++++++');
	console.log(key);
	console.log(JSON.stringify(object, null, 2));
	console.log('---');
	
	let schema = {};
	
	let output = {
		in: convertSource(object.source),
		name: key,
		description: object.description || '', // todo: support in inputmaskdata
		required: object.required
	};
	
	if (object.validation) {
		if (output.type !== 'object') {
			output.type = object.validation.type;
		} else {
			output.schema = {
				$ref: "#/definitions/" + firstCharToUpper(key) + "_" + 0 // todo: add counter
			};
			
			let definition = deduceDefinition();
			
		}
	}
	
	// schema $ref
	// type object.type
	// object.validation.type
	
	// "in": "body",
	// 	"name": "pet",
	// 	"description": "Pet object that needs to be added to the store",
	// 	"required": true,
	// 	"schema": {
	// 	"$ref": "#/definitions/Pet"
	// }
	
	console.log('------- output ----');
	console.log(output);
	console.log('-----------');
	
	
	return output;
}

function convertCustomImfv(soajsImfv) {
	let output = [];
	
	let customKeys = Object.keys(soajsImfv);
	customKeys.forEach(function (eachCustom) {
		let customKey = soajsImfv[eachCustom];
		let tempo = convertItem(eachCustom, customKey);
		output.push(tempo);
	});
	
	return output;
}

function deduceParamsFromCommonFields(commonFields) {
	let output = [];
	
	if (!commonFields) {
		return output;
	}
	
	let commonFieldsArray = Object.keys(commonFields);
	commonFieldsArray.forEach(function (eachCommon) {
		let commonField = commonFields[eachCommon];
		let tempo = convertItem(eachCommon, commonField);
		output.push(tempo);
	});
	
	return output;
}

var utils = {
	generateSchemaFromSwagger: function (yamlContent, config, callback) {
		
		//global object in this function to hold data that is juggled between functions
		var context = {
			yaml: null,
			soajs: {
				config
			}
		};
		
		/**
		 * parse the yaml and generate a config.js content from it
		 * @param cb
		 * @returns {*}
		 */
		function validateYaml(cb) {
			swaggerUtils.parseYaml(yamlContent, context, cb);
		}
		
		validateYaml(function (error) {
			let output = {
				schema: context.soajs.config.schema,
				errors: context.soajs.config.errors
			};
			
			if (error) {
				return callback(error);
			}
			return callback(null, output);
		});
	},
	
	generateSwaggerFromSchema: function (soajsImfvSchema, callback) {
		let output = {
			swagger: "2.0",
			info: {
				version: "1.0.0",
				title: "SOAJS Petstore"
			},
			host: "localhost",
			basePath: "/petstore",
			schemes: [
				"http"
			],
			responses: {},
			
			paths: {}, // route / method / ...
			parameters: {}, //
			definitions: {}
		};
		
		let soajsImfvSchemaKeys = Object.keys(soajsImfvSchema);
		
		soajsImfvSchemaKeys.forEach(function (schemaKey) {
			let schema = soajsImfvSchema[schemaKey];
			
			if (schemaKey === 'commonFields') {
				// let parameters = deduceParamsFromCommonFields(schema);
				// output.parameters = parameters;
			} else {
				let routesKeys = Object.keys(schema);
				routesKeys.forEach(function (routeKey) {
					let route = schema[routeKey];
					let custom = route.imfv.custom;
					let commonFields = route.imfv.commonFields;
					let routeParams = [];
					
					if (custom) {
						console.log('..............................');
						console.log(' ....... working on : ' + routeKey + ' [ ' + schemaKey + ']');
						console.log('..............................');
						routeParams = convertCustomImfv(custom);
					}
					
					if (commonFields) {
						// todo: commonFields
					}
					
					if (!output.paths[routeKey]) {
						output.paths[routeKey] = {};
					}
					
					output.paths[routeKey][schemaKey] = {
						tags: [],
						summary: 'test',
						operationId: 'whatdoumean',
						parameters: routeParams,
						responses: {}
					};
				});
				
				// todo: continue from here
				
			}
		});
		
		console.log("-------------------------");
		return callback(null, output);
	}
};

module.exports = utils;