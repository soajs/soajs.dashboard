"use strict";

var swaggerUtils = require("./swagger");
var jsonUtils = require("./json");

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
	
	generateSwaggerFromSchema: function (soajsImfvSchema, serviceInfo, callback) {
		jsonUtils.preParseValidation(soajsImfvSchema, function (errorDescription) {
			if(errorDescription){
				return callback({"code": 852, "msg": errorDescription});
			}else{
				jsonUtils.parseJson(soajsImfvSchema, serviceInfo, callback);
			}
		});
	}
};

module.exports = utils;