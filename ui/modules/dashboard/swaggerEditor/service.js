"use strict";
var swaggerEditorSrv = soajsApp.components;

swaggerEditorSrv.service('swaggerEditorSrv',['$timeout', function ($timeout) {
	
	function swaggerService(){
		
	}
	function buildSwaggerForm(currentScope) {
		var count = 0;
		var infoForm = swaggerEditorConfig.form;
		infoForm.entries.forEach(function (entry) {
				if (entry.name === 'dbs') {
					entry.entries = [];
					var oneClone = angular.copy(dbForm.db);
					for (var i = 0; i < oneClone.length; i++) {
						oneClone[i].name = oneClone[i].name.replace("%count%", count);
					}
					entry.entries = entry.entries.concat(oneClone);
					count++;
				}
				
				if (entry.name === 'addDb') {
					entry.onAction = function (id, data, form) {
						var oneClone = angular.copy(dbForm.db);
						form.entries.forEach(function (entry) {
							if (entry.name === 'dbs' && entry.type === 'group') {
								for (var i = 0; i < oneClone.length; i++) {
									oneClone[i].name = oneClone[i].name.replace("%count%", count);
								}
								entry.entries = entry.entries.concat(oneClone);
							}
						});
						count++;
					};
				}
			});
			buildForm(currentScope,null, infoForm);
		}
	return {
		'swaggerService': swaggerService,
		'buildSwaggerForm': buildSwaggerForm
	}
}]);

swaggerEditorSrv.service('swaggerClient', ["$q", "$http", "swaggerModules", "$cookies", function($q, $http, swaggerModules, $cookies) {
	/**
	 * format API explorer response before display
	 */
	function formatResult(deferred, response) {
		var query = '',
			data = response.data,
			config = response.config;
		
		if (config.params) {
			var parts = [];
			for (var key in config.params) {
				parts.push(key + '=' + encodeURIComponent(config.params[key]));
			}
			if (parts.length > 0) {
				query = '?' + parts.join('&');
			}
		}
		deferred.resolve({
			url: config.url + query,
			response: {
				body: data ? (angular.isString(data) ? data : angular.toJson(data, true)) : 'no content',
				status: response.status,
				headers: angular.toJson(response.headers(), true)
			}
		});
	}
	
	function extractValidation (commonFields, tempInput, inputObj){
		
		//if param is in common field ( used for objects only )
		if(tempInput.schema && tempInput.schema['$ref']){
			inputObj.validation = getIMFVfromCommonFields(commonFields, tempInput.schema['$ref']);
		}
		//if param is a combination of array and common field
		else if(tempInput.schema && tempInput.schema.type === 'array' && tempInput.schema.items['$ref']){
			inputObj.validation = {
				"type": "array",
				"items": getIMFVfromCommonFields(commonFields, tempInput.schema.items['$ref'])
			};
		}
		//if param is not a common field
		else{
			inputObj.validation = tempInput;
		}
	}
	
	function getIMFVfromCommonFields (commonFields, source){
		var commonFieldInputName = source.toLowerCase().split("/");
		commonFieldInputName = commonFieldInputName[commonFieldInputName.length -1];
		return commonFields[commonFieldInputName].validation;
	}
	
	function populateCommonFields(commonFields){
		//loop in all common fields
		for(var oneCommonField in commonFields){
			recursiveMapping(commonFields[oneCommonField].validation);
		}
		
		//loop through one common field recursively constructing and populating all its children imfv
		function recursiveMapping(source){
			if(source.type === 'array'){
				if(source.items['$ref'] || source.items.type === 'object'){
					source.items = mapSimpleField(source.items);
				}
				else if(source.items.type === 'object'){
					recursiveMapping(source.items);
				}
			}
			else if(source.type === 'object'){
				for(var property in source.properties){
					if(source.properties[property]['$ref']){
						source.properties[property] = mapSimpleField(source.properties[property]);
					}
					else if(source.properties[property].type ==='object' || source.properties[property].type ==='array'){
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
		function mapSimpleField(oneField){
			if(oneField['$ref']){
				return getIMFVfromCommonFields(commonFields, oneField['$ref']);
			}
		}
	}
	
	/**
	 * override the default swagger operation
	 */
	function overrideDefaultInputs(definitions, operation, values){
		var oldParams = angular.copy(operation.parameters);
		var oldValues = angular.copy(values);
		
		operation.parameters = [];
		values = {};
		
		//extract common fields
		var commonFields = {};
		if(definitions && Object.keys(definitions).length > 0){
			for(var onecommonInput in definitions){
				commonFields[onecommonInput.toLowerCase()] = {
					"validation": definitions[onecommonInput]
				};
			}
			populateCommonFields(commonFields);
		}
		
		//define new parameter for api
		var customBody = {
			"input": {},
			"imfv": {}
		};
		
		oldParams.forEach(function(swaggerParam){
			var sourcePrefix = swaggerParam.in;
			if(sourcePrefix === 'path'){
				sourcePrefix = "params";
			}
			if(sourcePrefix === 'header'){
				sourcePrefix = "headers";
			}
			var inputObj = {
				"required": swaggerParam.required,
				"source": [sourcePrefix + "." + swaggerParam.name],
				"validation": {}
			};
			
			extractValidation(commonFields, swaggerParam, inputObj);
			
			customBody.imfv[swaggerParam.name] = inputObj;
			customBody.input[swaggerParam.name] = JSON.parse(oldValues[swaggerParam.name]);
		});
		
		operation.parameters.push(customBody);
		
		// {
		// 	"data" : {
		// 		"input":{
		// 			"type":"object",
		// 			"properties":{
		// 				"body":{
		// 					"name":"cersei",
		// 					"status":"cat"
		// 				}
		// 			}
		// 		},
		// 		"imfv":{
		// 			"body":{
		// 				"required":true,
		// 				"source":["body.body"],
		// 				"validation":{}
		//			}
		// 		}
		// 	}
		// }
		// "data": {
		// 	"input": {
		// 		"number": 10
		// 	},
		// 	"imfv": {
		// 		"number": {
		// 			"source": ["body.number"],
		// 				"required": true,
		// 				"validation": {
		// 				"type": "number"
		// 			}
		// 		}
		// 	}
		// }		console.log("after");
		console.log(operation);
		console.log(values);
	}
	
	/**
	 * Send API explorer request
	 */
	this.send = function(swagger, operation, values) {
		var oldParams = angular.copy(operation.parameters);
		var oldValues = angular.copy(values);
		
		/**
		 * call custom method to override the defaults
		 */
		overrideDefaultInputs(swagger.definitions, operation, values);
		
		var deferred = $q.defer(),
			query = {},
			headers = {
				"Accept" : "application/json",
				"Content-Type": "application/json"
			},
			path = '/dashboard/swagger/simulate';
		
		/**
		 * hook the headers
		 */
		if ($cookies.get("soajs_dashboard_key")) {
			headers.key = $cookies.get("soajs_dashboard_key").replace(/\"/g, '');
		}
		else {
			headers.key = apiConfiguration.key;
		}
		
		var soajsAuthCookie = $cookies.get('soajs_auth');
		if (soajsAuthCookie && soajsAuthCookie.indexOf("Basic ") !== -1) {
			headers.soajsauth = soajsAuthCookie.replace(/\"/g, '');
		}
		
		// build request
		var options = {
				method: "post",
				url: apiConfiguration.domain + path,
				headers: headers,
				data: {
					"data": operation.parameters[0]
				},
				params: query
			},
			callback = function(response) {
				// execute modules
				var response = {
					data: response.data,
					status: response.status,
					headers: response.headers,
					config: response.config
				};
				swaggerModules
					.execute(swaggerModules.AFTER_EXPLORER_LOAD, response)
					.then(function() {
						formatResult(deferred, response);
						operation.parameters = oldParams;
						values = oldValues;
					});
			};

		// execute modules
		swaggerModules
			.execute(swaggerModules.BEFORE_EXPLORER_LOAD, options)
			.then(function() {
				// send request
				$http(options)
					.then(callback)
					.catch(callback);
			});

		return deferred.promise;
	};
}]);