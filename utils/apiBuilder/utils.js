"use strict";

var async = require("async");
var swaggerUtils = require("./swagger");

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
				// todo common fields
			} else {
				let routesKeys = Object.keys(schema);
				routesKeys.forEach(function (routeKey) {
					let route = schema[routeKey];
					let custom = route.imfv.custom;
					let routeParams = {};
					
					if (custom) {
						let customKeys = Object.keys(custom);
						customKeys.forEach(function (eachCustom) {
							let customKey = custom[eachCustom];
							
							routeParams[eachCustom] = customKey;
						});
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
		
		return callback(null, output);
	}
};

module.exports = utils;