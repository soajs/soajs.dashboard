"use strict";

var swaggerUtils = require("./swagger");
var jsonUtils = require("./json");

var utils = {
	generateSchemaFromSwagger: function (yamlContent, config, mainType, callback) {
		
		//global object in this function to hold data that is juggled between functions
		var context = {
			yaml: null,
			soajs: {
				config,
				mainType
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
	
	generateSwaggerFromSchema: function (mainType, soajsImfvSchema, serviceInfo, callback) {
		jsonUtils.preParseValidation(soajsImfvSchema, function (errorDescription) {
			if(errorDescription){
				return callback({"code": 852, "msg": errorDescription});
			}else{
				jsonUtils.parseJson(mainType, soajsImfvSchema, serviceInfo, callback);
			}
		});
	},
	
	generateApisFromSchema : function (schema) {
		let output = [];
		let schemasKeys = Object.keys(schema);
		schemasKeys.forEach(function (eachSchema) {
			if (eachSchema !== 'commonFields') {
				let apisKeys = Object.keys(schema[eachSchema]);
				apisKeys.forEach(function (eachApi) {
					let apiData = schema[eachSchema][eachApi];
					let tempo = {
						"l": apiData._apiInfo.l,
						"v": eachApi,
						"m": eachSchema,
						"group": apiData._apiInfo.group
					};
					
					output.push(tempo);
				});
			}
		});
		return output;
	}
};

module.exports = utils;