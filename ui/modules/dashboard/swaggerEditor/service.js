"use strict";
var swaggerEditorSrv = soajsApp.components;

swaggerEditorSrv.service('swaggerEditorSrv',['$timeout', 'ngDataApi', function ($timeout, ngDataApi) {
	
	function generateService(currentScope){
		var extKeyRequired = false;
		if(Array.isArray(currentScope.form.formData.extKeyRequired)){
			extKeyRequired = (currentScope.form.formData.extKeyRequired[0] === 'true');
		}
		else{
			extKeyRequired = (currentScope.form.formData.extKeyRequired === 'true');
		}
		
		var oauth = false;
		if(Array.isArray(currentScope.form.formData.oauth)){
			oauth = (currentScope.form.formData.oauth[0] === 'true');
		}
		else{
			oauth = (currentScope.form.formData.oauth === 'true');
		}
		
		var session = false;
		if(Array.isArray(currentScope.form.formData.session)){
			session = (currentScope.form.formData.session[0] === 'true');
		}
		else{
			session = (currentScope.form.formData.session === 'true');
		}
		
		var dbs = [];
		for(var i =0; i < currentScope.form.formData.dbCount; i++){
			var dbObj = {
				prefix: currentScope.form.formData['prefix' + i],
				name: currentScope.form.formData['name' + i]
			};
			
			if(Array.isArray(currentScope.form.formData['model' + i])){
				dbObj.model = currentScope.form.formData['model' + i][0];
			}
			else{
				dbObj.model= currentScope.form.formData['model' + i];
			}
			
			if(dbObj.model === 'mongo'){
				dbObj['multitenant'] = (currentScope.form.formData['multitenant' + i] === 'true');
			}
			
			dbs.push(dbObj);
		}
		var yaml = currentScope.schemaCode.trim();
		
		if(yaml === ''){
			currentScope.$parent.displayAlert('danger', 172, true, 'dashboard', 'No YAML Code Found');
			return false;
		}
		
		var serviceName = '';
		if(currentScope.form.formData.serviceName){
			serviceName = currentScope.form.formData.serviceName.trim();
		}
		if(serviceName === ''){
			currentScope.$parent.displayAlert('danger', 172, true, 'dashboard', 'Missing required field : service name');
			return false;
		}
		
		var serviceGroup = '';
		if(currentScope.form.formData.serviceGroup){
			serviceGroup = currentScope.form.formData.serviceGroup.trim();
		}
		if(serviceGroup === ''){
			currentScope.$parent.displayAlert('danger', 172, true, 'dashboard', 'Missing required field : service group');
			return false;
		}
		
		var servicePort = '';
		if(currentScope.form.formData.servicePort){
			servicePort = currentScope.form.formData.servicePort;
		}
		if(servicePort === ''){
			currentScope.$parent.displayAlert('danger', 172, true, 'dashboard', 'Missing required field : service port');
			return false;
		}
		
		var serviceVersion = '';
		if(currentScope.form.formData.serviceVersion){
			serviceVersion = currentScope.form.formData.serviceVersion;
		}
		if(serviceVersion === ''){
			currentScope.$parent.displayAlert('danger', 172, true, 'dashboard', 'Missing required field : service version');
			return false;
		}
		
		var requestTimeout = '';
		if(Object.hasOwnProperty.call(currentScope.form.formData, "requestTimeout")){
			requestTimeout = currentScope.form.formData.requestTimeout;
		}
		if(requestTimeout === ''){
			currentScope.$parent.displayAlert('danger', 172, true, 'dashboard', 'Missing required field : requestTimeout');
			return false;
		}
		
		var requestTimeoutRenewal = '';
		if(Object.hasOwnProperty.call(currentScope.form.formData, "requestTimeoutRenewal")){
			requestTimeoutRenewal = currentScope.form.formData.requestTimeoutRenewal;
		}
		if(requestTimeoutRenewal === ''){
			currentScope.$parent.displayAlert('danger', 172, true, 'dashboard', 'Missing required field : requestTimeoutRenewal');
			return false;
		}
		
		var options = {
			"method": "send",
			"routeName": "/dashboard/swagger/generate",
			"headers": {
				"Accept": "application/zip"
			},
			"responseType": 'arraybuffer',
			"data": {
				"data": {
					"service": {
						"serviceName": serviceName,
						"serviceGroup": serviceGroup,
						"servicePort": servicePort,
						"serviceVersion": serviceVersion,
						"requestTimeout": requestTimeout,
						"requestTimeoutRenewal": requestTimeoutRenewal,
						"extKeyRequired": extKeyRequired,
						"oauth": oauth,
						"session": session,
						"dbs": dbs
					},
					"yaml": yaml
				}
			}
		};
		
		getSendDataFromServer(currentScope, ngDataApi, options, function (error, response) {
			if (error) {
				currentScope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				openSaveAsDialog(currentScope.form.formData.serviceName + ".zip", response, "application/zip");
			}
		});
	}
	
	function buildSwaggerForm(currentScope) {
		var count = 0;
		var infoForm = swaggerEditorConfig.form;
		infoForm.timeout = $timeout;
		infoForm.entries.forEach(function (entry) {
				if (entry.name === 'dbs') {
					entry.entries = [];
					var oneClone = angular.copy(dbForm.db);
					var mtRef;
					for (var i = 0; i < oneClone.length; i++) {
						oneClone[i].name = oneClone[i].name.replace("%count%", count);
						if(oneClone[i].name === "multitenant" + count){
							mtRef = oneClone[i];
						}
						if(oneClone[i].name === "model" + count){
							oneClone[i].onAction = function (id, data, form) {
								mtRef.disabled = (data === "es");
							}
						}
					}
					entry.entries = entry.entries.concat(oneClone);
					count++;
				}
				
				if (entry.name === 'addDb') {
					entry.onAction = function (id, data, form) {
						var oneClone = angular.copy(dbForm.db);
						var mtRef;
						form.entries.forEach(function (entry) {
							if (entry.name === 'dbs' && entry.type === 'group') {
								for (var i = 0; i < oneClone.length; i++) {
									oneClone[i].name = oneClone[i].name.replace("%count%", count);
									
									if(oneClone[i].name === "multitenant" + count){
										mtRef = oneClone[i];
									}
									if(oneClone[i].name === "model" + count){
										oneClone[i].onAction = function (id, data, form) {
											mtRef.disabled = (data === "es");
										}
									}
								}
								entry.entries = entry.entries.concat(oneClone);
							}
						});
						count++;
						form.formData.dbCount = count;
					};
				}
			});
			
			buildForm(currentScope,null, infoForm, function(){
				currentScope.form.formData.dbCount = count;
			});
		}
	return {
		'generateService': generateService,
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
		else if (tempInput.schema && tempInput.schema.properties && tempInput.schema.properties.items && tempInput.schema.properties.items.type === 'array' && tempInput.schema.properties.items.items['$ref']) {
			inputObj.validation = {
				"type": "array",
				"items": getIMFVfromCommonFields(commonFields, tempInput.schema.properties.items.items['$ref'])
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
	
	function populateCommonFields(commonFields, cb){
		//loop in all common fields
		for(var oneCommonField in commonFields){
			recursiveMapping(commonFields[oneCommonField].validation);
		}
		return cb();
		
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
			else{
				return oneField;
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
		
		//extract common fields
		var commonFields = {};
		if(definitions && Object.keys(definitions).length > 0){
			for(var onecommonInput in definitions){
				commonFields[onecommonInput.toLowerCase()] = {
					"validation": definitions[onecommonInput]
				};
			}
			populateCommonFields(commonFields, function(){
				resumeE();
			});
		}
		else{
			resumeE();
		}
		
		function resumeE(){
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
				
				if(typeof(oldValues[swaggerParam.name]) === 'string' && oldValues[swaggerParam.name] !== '' && (inputObj.validation.type === 'object' || inputObj.validation.type === 'array')){
					try{
						customBody.input[swaggerParam.name] = JSON.parse(oldValues[swaggerParam.name]);
					}
					catch(e){
						customBody.input[swaggerParam.name] = oldValues[swaggerParam.name];
					}
				}
				else{
					customBody.input[swaggerParam.name] = oldValues[swaggerParam.name];
				}
			});
			
			operation.parameters.push(customBody);
		}
	}
	
	/**
	 * Send API explorer request
	 */
	this.send = function(swagger, operation, values) {
		var oldParams = angular.copy(operation.parameters);
		var oldValues = angular.copy(values);
		
		var deferred = $q.defer(),
			query = {},
			headers = {
				"Accept" : "application/json",
				"Content-Type": "application/json"
			},
			path = '/dashboard/swagger/simulate';
		
		/**
		 * call custom method to override the defaults
		 */
		overrideDefaultInputs(swagger.definitions, operation, values);
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