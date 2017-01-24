"use strict";
var soajsUtils = require("soajs/lib/utils");

var lib = {
	"extractValidation": function (commonFields, oneInput, tempInput, inputObj) {
		
		//if param is in common field ( used for objects only )
		if (oneInput.schema && oneInput.schema['$ref']) {
			inputObj.validation = lib.getIMFVfromCommonFields(commonFields, oneInput.schema['$ref']);
		}
		//if param is a combination of array and common field
		else if (oneInput.schema && oneInput.schema.type === 'array' && oneInput.schema.items['$ref']) {
			inputObj.validation = {
				"type": "array",
				"items": lib.getIMFVfromCommonFields(commonFields, oneInput.schema.items['$ref'])
			};
		}
		else if (oneInput.schema && oneInput.schema.properties && oneInput.schema.properties.items && oneInput.schema.properties.items.type === 'array' && oneInput.schema.properties.items.items['$ref']) {
			inputObj.validation = {
				"type": "array",
				"items": lib.getIMFVfromCommonFields(commonFields, oneInput.schema.properties.items.items['$ref'])
			};
		}
		//if param is not a common field
		else {
			inputObj.validation = tempInput;
		}
	},
	
	"getIMFVfromCommonFields": function (commonFields, source) {
		var commonFieldInputName = source.toLowerCase().split("/");
		commonFieldInputName = commonFieldInputName[commonFieldInputName.length - 1];
		return commonFields[commonFieldInputName].validation;
	},
	
	"populateCommonFields": function (commonFields) {
		//loop in all common fields
		for (var oneCommonField in commonFields) {
			recursiveMapping(commonFields[oneCommonField].validation);
		}
		
		//loop through one common field recursively constructing and populating all its children imfv
		function recursiveMapping(source) {
			if (source.type === 'array') {
				if (source.items['$ref'] || source.items.type === 'object') {
					source.items = mapSimpleField(source.items);
				}
				else if (source.items.type === 'object') {
					recursiveMapping(source.items);
				}
			}
			else if (source.type === 'object') {
				for (var property in source.properties) {
					if (source.properties[property]['$ref']) {
						source.properties[property] = mapSimpleField(source.properties[property]);
					}
					else if (source.properties[property].type === 'object' || source.properties[property].type === 'array') {
						recursiveMapping(source.properties[property]);
					}
				}
			}
			else {
				//map simple inputs if nay
				source = mapSimpleField(source);
			}
		}
		
		//if this input is a ref, get the ref and replace it.
		function mapSimpleField(oneField) {
			if (oneField['$ref']) {
				return lib.getIMFVfromCommonFields(commonFields, oneField['$ref']);
			}
			else{
				return oneField;
			}
		}
	}
};

var swagger = {
	
	"validateYaml": function (yamlJson) {
		if (typeof yamlJson !== 'object') {
			throw new Error("Yaml file was converted to a string");
		}
		
		if (!yamlJson.paths || Object.keys(yamlJson.paths).length === 0) {
			throw new Error("Yaml file is missing api schema");
		}
	},
	
	"mapConfig": function (serviceInfo) {
		var config = {
			"type": "service",
			"prerequisites": {
				"cpu": '',
				"memory": ''
			},
			"swagger": true,
			"dbs": serviceInfo.dbs,
			"serviceName": serviceInfo.serviceName,
			"serviceGroup": serviceInfo.serviceGroup,
			"serviceVersion": serviceInfo.serviceVersion,
			"servicePort": serviceInfo.servicePort,
			"requestTimeout": serviceInfo.requestTimeout,
			"requestTimeoutRenewal": serviceInfo.requestTimeoutRenewal,
			"extKeyRequired": serviceInfo.extKeyRequired,
			"oauth": serviceInfo.oauth,
			"session": serviceInfo.session,
			"errors": {},
			"schema": {}
		};
		
		return config;
	},
	
	"mapAPis": function (yamlJson, cb) {
		var apiPath = yamlJson.paths;
		var definitions = yamlJson.definitions;
		var commonFields = {};
		
		//extract common fields
		if (definitions && Object.keys(definitions).length > 0) {
			for (var onecommonInput in definitions) {
				commonFields[onecommonInput.toLowerCase()] = {
					"validation": definitions[onecommonInput]
				};
			}
			lib.populateCommonFields(commonFields);
		}
		
		//extract the methods
		var all_methods = [];
		var all_errors = {};
		for (var route in apiPath) {
			var methods = Object.keys(apiPath[route]);
			methods.forEach(function (oneMethod) {
				if (all_methods.indexOf(oneMethod.toLowerCase()) === -1) {
					all_methods.push(oneMethod.toLowerCase())
				}
				
				//collect the error codes while at it
				if (apiPath[route][oneMethod].responses && Object.keys(apiPath[route][oneMethod].responses).length > 0) {
					for (var errorCode in apiPath[route][oneMethod].responses) {
						var code = parseInt(errorCode, 10);
						if (!isNaN(code) && code !== 200) {
							all_errors[code] = apiPath[route][oneMethod].responses[errorCode].description;
						}
					}
				}
			});
		}
		
		//map the methods
		var all_apis = {};
		all_methods.forEach(function (oneMethod) {
			all_apis[oneMethod] = {};
		});
		
		//loop in apis again and map the api routes
		for (var route in apiPath) {
			
			var methods = Object.keys(apiPath[route]);
			methods.forEach(function (oneMethod) {
				
				if (apiPath[route][oneMethod]) {
					var soajsRoute = route.replace(/\{/g, ":").replace(/\}/g, "");
					
					var mwFile = soajsRoute.replace(/\\/g, "_").replace(/:/g, "_").replace(/\//g, "_").replace(/[_]{2,}/g, "_");
					mwFile = mwFile.toLowerCase();
					if (mwFile[0] === "_") {
						mwFile = mwFile.substring(1);
					}
					mwFile += "_" + oneMethod.toLowerCase() + ".js";
					
					all_apis[oneMethod.toLowerCase()][soajsRoute] = {
						"_apiInfo": {
							"l": apiPath[route][oneMethod].summary,
							"group": apiPath[route][oneMethod].tags[0]
						},
						"mw": '%dirname% + "/lib/mw/' + mwFile + '"'
					};
					
					//map the parameters
					
					if (apiPath[route][oneMethod].parameters && apiPath[route][oneMethod].parameters.length > 0) {
						for (var input in apiPath[route][oneMethod].parameters) {
							var oneInput = apiPath[route][oneMethod].parameters[input];
							var tempInput = soajsUtils.cloneObj(oneInput);
							var sourcePrefix = tempInput.in;
							if (sourcePrefix === 'path') {
								sourcePrefix = "params";
							}
							if (sourcePrefix === 'header') {
								sourcePrefix = "headers";
							}
							if (sourcePrefix === 'formData') {
								sourcePrefix = "body";
							}
							var inputObj = {
								"required": tempInput.required,
								"source": [sourcePrefix + "." + tempInput.name],
								"validation": {}
							};
							delete tempInput.required;
							delete tempInput.in;
							delete tempInput.name;
							delete tempInput.description;
							delete tempInput.collectionFormat; //todo: need to provide support for this later on
							
							lib.extractValidation(commonFields, oneInput, tempInput, inputObj);
							all_apis[oneMethod.toLowerCase()][soajsRoute][oneInput.name] = inputObj;
						}
					}
				}
			});
		}
		
		return cb({"schema": all_apis, "errors": all_errors});
	}
};

module.exports = swagger;