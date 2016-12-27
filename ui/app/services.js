"use strict";

soajsApp.service('ngDataApi', ['$http', '$cookies', '$localStorage', 'Upload', function ($http, $cookies, $localStorage, Upload) {
	
	function returnAPIError(scope, opts, status, headers, config, cb) {
		console.log("Error: ngDataApi->" + opts.api);
		console.log(status, headers, config);
		return cb(new Error("Unable Fetching data from " + config.url));
	}
	
	function returnAPIResponse(scope, response, config, cb) {
		if (config.responseType === 'arraybuffer' && response) {
			if (response.result === false) {
				var str = '';
				for (var i = 0; i < response.errors.details.length; i++) {
					str += "Error[" + response.errors.details[i].code + "]: " + response.errors.details[i].message;
				}
				var errorObj = {
					message: str,
					codes: response.errors.codes,
					details: response.errors.details
				};
				if (response.errors.codes && response.errors.codes[0]) {
					errorObj.code = response.errors.codes[0];
				}
				return cb(errorObj);
			}
			else {
				return cb(null, response);
			}
		}
		else if (response && response.result === true) {
			if (response.soajsauth && $cookies.get('soajs_auth')) {
				$cookies.put("soajs_auth", response.soajsauth);
			}
			var resp = {};
			for (var i in response) {
				resp[i] = response[i];
			}
			
			if (typeof(resp.data) !== 'object') {
				resp.data = {};
			}
			resp.data.soajsauth = resp.soajsauth;
			return cb(null, resp.data);
		}
		else {
			// if (response.errors.codes[0] === 132) {
			// 	$cookies.remove('soajs_auth');
			// 	$localStorage.acl_access = null;
			// 	scope.$parent.enableInterface = false;
			// 	scope.$parent.isUserLoggedIn();
			// 	scope.$parent.go("/login");
			// }
			
			var str = '';
			for (var i = 0; i < response.errors.details.length; i++) {
				str += "Error[" + response.errors.details[i].code + "]: " + response.errors.details[i].message;
			}
			var errorObj = {
				message: str,
				codes: response.errors.codes,
				details: response.errors.details
			};
			if (response.errors.codes && response.errors.codes[0]) {
				errorObj.code = response.errors.codes[0];
			}
			return cb(errorObj);
		}
	}
	
	function executeRequest(scope, opts, cb) {
		var config = {
			url: opts.url,
			method: opts.method,
			params: opts.params || {},
			xsrfCookieName: opts.cookie || "",
			cache: opts.cache || false,
			timeout: opts.timeout || 60000,
			responseType: opts.responseType || 'json',
			headers: opts.headers || {},
			data: opts.data || {},
			json: true
		};
		
		if (opts.proxy) {
			config.params['__envauth'] = $cookies.getObject('soajs_envauth')[$cookies.getObject('myEnv').code.toLowerCase().replace(/\"/g, '')];
		}
		
		var soajsAuthCookie = $cookies.get('soajs_auth');
		if (soajsAuthCookie && soajsAuthCookie.indexOf("Basic ") !== -1) {
			config.headers.soajsauth = soajsAuthCookie.replace(/\"/g, '');
		}
		
		if (opts.headers.key) {
			config.headers.key = opts.headers.key;
		}
		else if ($cookies.get("soajs_dashboard_key")) {
			config.headers.key = $cookies.get("soajs_dashboard_key").replace(/\"/g, '');
		}
		else {
			config.headers.key = apiConfiguration.key;
		}
		
		if (opts.proxy) {
			if (!config.params.__env || !config.params.__envauth) {
				var envauth = $cookies.getObject('soajs_envauth');
				var env = $cookies.getObject('myEnv').code;
				config.params.__envauth = envauth[env.toLowerCase()];
				config.params.__env = env.toUpperCase();
			}
		}
		
		if (opts.jsonp === true) {
			config.url += (config.url.indexOf('?') === -1) ? '?' : '&';
			config.url += "callback=JSON_CALLBACK";
			config.method = (config.method.toLowerCase() === 'get') ? 'jsonp' : config.method;
		}
		
		if (opts.upload) {
			config.progress = {
				value: 0
			};
			if (opts.file) {
				config.file = opts.file;
			}
			else {
				console.log('Missing File for Upload');
			}
			Upload.upload(config).progress(function (evt) {
				var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
				config.progress.value = progressPercentage;
			}).success(function (response, status, headers, config) {
				returnAPIResponse(scope, response, config, cb);
			}).error(function (data, status, header, config) {
				returnAPIError(scope, opts, status, headers, config, cb);
			});
		}
		else {
			$http(config).success(function (response, status, headers, config) {
				returnAPIResponse(scope, response, config, cb);
			}).error(function (errData, status, headers, config) {
				returnAPIError(scope, opts, status, headers, config, cb);
			});
		}
		
	}
	
	function getData(scope, opts, cb) {
		opts.method = 'GET';
		opts.api = 'getData';
		executeRequest(scope, opts, cb);
	}
	
	function sendData(scope, opts, cb) {
		opts.method = 'POST';
		opts.api = 'sendData';
		executeRequest(scope, opts, cb);
	}
	
	function putData(scope, opts, cb) {
		opts.method = 'PUT';
		opts.api = 'putData';
		executeRequest(scope, opts, cb);
	}
	
	function delData(scope, opts, cb) {
		opts.method = 'DELETE';
		opts.api = 'delData';
		executeRequest(scope, opts, cb);
	}
	
	return {
		'get': getData,
		'send': sendData,
		'post': sendData,
		'put': putData,
		'del': delData,
		'delete': delData
	};
}]);

soajsApp.service('isUserLoggedIn', ['$cookies', '$localStorage', function ($cookies, $localStorage) {
	return function () {
		if ($localStorage.soajs_user && $cookies.get('soajs_auth')) {
			return true;
		}
		else {
			$cookies.remove('soajs_auth');
			$localStorage.soajs_user = null;
			return false;
		}
	}
}]);

soajsApp.service('checkApiHasAccess', function () {
	
	return function (aclObject, serviceName, routePath, method, userGroups, callback) {
		var environments = Object.keys(aclObject);
		return validateAccess(environments, 0, callback);
		
		function validateAccess(environments, i, cb) {
			var envCode = environments[i].toLowerCase();
			
			if (!aclObject[envCode] || !aclObject[envCode][serviceName]) {
				i++;
				if (i === environments.length) {
					return cb(false);
				}
				else {
					validateAccess(environments, i, cb);
				}
			}
			else {
				var system = aclObject[envCode][serviceName];
				if (system) {
					var access = checkSystem(system);
					return cb(access);
				}
				else {
					return cb(false);
				}
			}
		}
		
		function checkSystem(system) {
			function getAclObj(aclObj) {
				if (aclObj && (aclObj.apis || aclObj.apisRegExp)) {
					return aclObj;
				}
				if (method) {
					if (aclObj[method] && typeof aclObj[method] === "object") {
						var newAclObj = {};
						if (aclObj.hasOwnProperty('access')) {
							newAclObj.access = aclObj.access;
						}
						if (aclObj[method].hasOwnProperty('apis')) {
							newAclObj.apis = aclObj[method].apis;
						}
						if (aclObj[method].hasOwnProperty('apisRegExp')) {
							newAclObj.apisRegExp = aclObj[method].apisRegExp;
						}
						if (aclObj[method].hasOwnProperty('apisPermission')) {
							newAclObj.apisPermission = aclObj[method].apisPermission;
						}
						else if (aclObj.hasOwnProperty('apisPermission')) {
							newAclObj.apisPermission = aclObj.apisPermission;
						}
						return newAclObj;
					}
					else {
						return aclObj;
					}
				}
				else {
					return aclObj;
				}
			}
			
			system = getAclObj(system);
			
			var api = (system && system.apis ? system.apis[routePath] : null);
			
			if (!api && system && system.apisRegExp && Object.keys(system.apisRegExp).length) {
				for (var jj = 0; jj < system.apisRegExp.length; jj++) {
					if (system.apisRegExp[jj].regExp && routePath.match(system.apisRegExp[jj].regExp)) {
						api = system.apisRegExp[jj];
						break;
					}
				}
			}
			if (Object.hasOwnProperty.call(system, 'access')) {
				if (Array.isArray(system.access)) {
					var checkAPI = false;
					if (userGroups) {
						for (var ii = 0; ii < userGroups.length; ii++) {
							if (system.access.indexOf(userGroups[ii]) !== -1) {
								checkAPI = true;
								break;
							}
						}
					}
					if (!checkAPI) {
						return false;
					}
				}
				return api_checkPermission(system, userGroups, api);
			}
			
			if (api || (system && system.apisPermission === 'restricted')) {
				return api_checkPermission(system, userGroups, api);
			}
			else {
				return true;
			}
		}
		
		function api_checkPermission(system, userGroups, api) {
			if ('restricted' === system.apisPermission) {
				if (!api) {
					return false;
				}
				return api_checkAccess(api.access, userGroups);
			}
			if (!api) {
				return true;
			}
			
			return api_checkAccess(api.access, userGroups);
		}
		
		function api_checkAccess(apiAccess, userGroups) {
			if (!apiAccess) {
				return true;
			}
			
			if (apiAccess instanceof Array) {
				if (!userGroups) {
					return false;
				}
				
				var found = false;
				for (var ii = 0; ii < userGroups.length; ii++) {
					if (apiAccess.indexOf(userGroups[ii]) !== -1) {
						found = true;
						break;
					}
				}
				return found;
			}
			else {
				return true;
			}
		}
	}
});

soajsApp.service("injectFiles", function () {
	
	function injectCss(filePath) {
		var csstag = "<link rel='stylesheet' type='text/css' href='" + filePath + "' />";
		jQuery("head").append(csstag);
	}
	
	return {
		'injectCss': injectCss
	}
});

soajsApp.service("aclDrawHelpers", function () {
	
	function groupApisForDisplay(apisArray, apiGroupName) {
		var result = {};
		var defaultGroupName = 'General';
		var len = apisArray.length;
		if (len == 0) {
			return result;
		}
		for (var i = 0; i < len; i++) {
			if (apisArray[i][apiGroupName]) {
				defaultGroupName = apisArray[i][apiGroupName];
			}
			
			if (!result[defaultGroupName]) {
				result[defaultGroupName] = {};
				result[defaultGroupName].apis = [];
				if (apisArray[i].m) {
					result[defaultGroupName].apisRest = {};
				}
			}
			if (!apisArray[i].m) {
				//apisArray[i].m = 'all';
			}
			if (apisArray[i].m) {
				if (!result[defaultGroupName].apisRest[apisArray[i].m]) {
					result[defaultGroupName].apisRest[apisArray[i].m] = [];
				}
				result[defaultGroupName].apisRest[apisArray[i].m].push(apisArray[i]);
			}
			if (apisArray[i].groupMain === true) {
				result[defaultGroupName]['defaultApi'] = apisArray[i].v;
			}
			result[defaultGroupName].apis.push(apisArray[i]);
		}
		
		return result;
	}
	
	function applyApiRestriction(aclFill, service) {
		if (service.name) {
			var aclService = aclFill[service.name];
		}
		if (aclService && aclService.apisRestrictPermission === true) {
			for (var grpLabel in service.fixList) {
				if (service.fixList.hasOwnProperty(grpLabel)) {
					var defaultApi = service.fixList[grpLabel]['defaultApi'];
					if (defaultApi) {
						var found = false;
						if (service.fixList[grpLabel].apisRest) {
							for (var m in service.fixList[grpLabel].apisRest) {
								if (aclService[m] && aclService[m].apis[defaultApi] && aclService[m].apis[defaultApi].include === true) {
									found = true;
									break;
								}
							}
							if (!found) {
								for (var m in service.fixList[grpLabel].apisRest) {
									if (aclService[m]) {
										service.fixList[grpLabel].apisRest[m].forEach(function (oneApi) {
											if (aclService[m].apis[oneApi.v]) {
												aclService[m].apis[oneApi.v].include = false;
											}
										});
									}
								}
							}
						}
						else if (aclService.apis) {
							if ((!aclService.apis[defaultApi]) || aclService.apis[defaultApi].include !== true) {
								service.fixList[grpLabel]['apis'].forEach(function (oneApi) {
									if (aclService.apis[oneApi.v]) {
										aclService.apis[oneApi.v].include = false;
									}
								});
							}
						}
						service.fixList[grpLabel].defaultIncluded = found;
					}
				}
			}
		}
	}
	
	function checkForGroupDefault(aclFill, service, grp, val, myApi) {
		var defaultApi = service.fixList[grp]['defaultApi'];
		var found = true;
		if (myApi.groupMain === true) {
			if (val.apisRest && myApi.m) {
				if (aclFill[service.name][myApi.m].apis) {
					if (aclFill[service.name][myApi.m].apis[defaultApi] && aclFill[service.name][myApi.m].apis[defaultApi].include !== true) {
						found = false;
						for (var m in val.apisRest) {
							if (aclFill[service.name][m]) {
								val.apisRest[m].forEach(function (one) {
									if (aclFill[service.name][m].apis[one.v]) {
										aclFill[service.name][m].apis[one.v].include = false;
									}
								});
							}
						}
					}
				}
			}
			else if (aclFill[service.name].apis) {
				if ((aclFill[service.name].apis[defaultApi]) && aclFill[service.name].apis[defaultApi].include !== true) {
					found = false;
					val.apis.forEach(function (one) {
						if (aclFill[service.name].apis[one.v]) {
							aclFill[service.name].apis[one.v].include = false;
						}
					});
				}
			}
			service.fixList[grp].defaultIncluded = found;
		}
	}
	
	function fillServiceAccess(service, currentService) {
		service.include = true;
		service.collapse = false;
		if (service.access) {
			if (service.access === true) {
				service.accessType = 'private';
			}
			else if (service.access === false) {
				service.accessType = 'public';
			}
			else if (Array.isArray(service.access)) {
				service.accessType = 'groups';
				service.grpCodes = {};
				service.access.forEach(function (c) {
					service.grpCodes[c] = true;
				});
			}
		}
		else {
			service.accessType = 'public';
		}
		if (service.apisPermission === 'restricted') {
			service.apisRestrictPermission = true;
		}
	}
	
	function fillApiAccess(apis) {
		for (var apiName in apis) {
			if (apis.hasOwnProperty(apiName)) {
				apis[apiName].include = true;
				apis[apiName].accessType = 'clear';
				if (apis[apiName].access == true) {
					apis[apiName].accessType = 'private';
				}
				else if (apis[apiName].access === false) {
					apis[apiName].accessType = 'public';
				}
				else {
					if (Array.isArray(apis[apiName].access)) {
						apis[apiName].accessType = 'groups';
						apis[apiName].grpCodes = {};
						apis[apiName].access.forEach(function (c) {
							apis[apiName].grpCodes[c] = true;
						});
					}
				}
			}
		}
	}
	
	function fillServiceApiAccess(service, currentService) {
		function grpByMethod(service, fixList) {
			var byMethod = false;
			for (var grp in fixList) {
				if (fixList[grp].apisRest) {
					byMethod = true;
					for (var method in fixList[grp].apisRest) {
						if (!service[method]) {
							service[method] = {
								apis: {}
							};
						}
						fixList[grp].apisRest[method].forEach(function (api) {
							if (service.apis) {
								if (service.apis[api.v]) {
									service[method].apis[api.v] = service.apis[api.v];
								}
							}
						});
					}
				}
			}
			if (byMethod) {
				delete service.apis;
			}
		}
		
		if (!service.get && !service.post && !service.put && !service.delete) {
			grpByMethod(service, currentService.fixList);
		}
		
		if (service.get || service.post || service.put || service.delete) {
			for (var method in service) {
				if (service[method].apis) {
					fillApiAccess(service[method].apis);
				}
			}
		}
		else if (service.apis) {
			fillApiAccess(service.apis);
		}
	}
	
	function prepareSaveObject(aclEnvFill, aclEnvObj) {
		var code, grpCodes;
		
		for (var serviceName in aclEnvFill) {
			if (aclEnvFill.hasOwnProperty(serviceName)) {
				var service = angular.copy(aclEnvFill[serviceName]);
				if (service.include === true) {
					aclEnvObj[serviceName] = {};
					
					if (service.accessType === 'private') {
						aclEnvObj[serviceName].access = true;
					}
					else if (service.accessType === 'public') {
						aclEnvObj[serviceName].access = false;
					}
					else if (service.accessType === 'groups') {
						aclEnvObj[serviceName].access = [];
						grpCodes = aclEnvFill[serviceName].grpCodes;
						if (grpCodes) {
							for (code in grpCodes) {
								if (grpCodes.hasOwnProperty(code)) {
									aclEnvObj[serviceName].access.push(code);
								}
							}
						}
						if (aclEnvObj[serviceName].access.length == 0) {
							return {'valid': false};
						}
					}
					
					if (service.apisRestrictPermission === true) {
						aclEnvObj[serviceName].apisPermission = 'restricted';
					}
					
					if (service.get || service.post || service.put || service.delete) {
						for (var method in service) {
							if (service[method].apis) {
								aclEnvObj[serviceName][method] = {
									apis: {}
								};
								
								for (var apiName in service[method].apis) {
									if (service[method].apis.hasOwnProperty(apiName)) {
										var api = service[method].apis[apiName];
										if (( service.apisRestrictPermission === true && api.include === true) || !service.apisRestrictPermission) {
											/// need to also check for the default api if restricted
											aclEnvObj[serviceName][method].apis[apiName] = {};
											if (api.accessType === 'private') {
												aclEnvObj[serviceName][method].apis[apiName].access = true;
											}
											else if (api.accessType === 'public') {
												aclEnvObj[serviceName][method].apis[apiName].access = false;
											}
											else if (api.accessType === 'groups') {
												aclEnvObj[serviceName][method].apis[apiName].access = [];
												grpCodes = aclEnvFill[serviceName][method].apis[apiName].grpCodes;
												if (grpCodes) {
													for (code in grpCodes) {
														if (grpCodes.hasOwnProperty(code)) {
															aclEnvObj[serviceName][method].apis[apiName].access.push(code);
														}
													}
												}
												if (aclEnvObj[serviceName][method].apis[apiName].access.length === 0) {
													return {'valid': false};
												}
											}
										}
									}
								}
							}
						}
					}
					if (service.apis) {
						aclEnvObj[serviceName].apis = {};
						for (apiName in service.apis) {
							if (service.apis.hasOwnProperty(apiName)) {
								var api = service.apis[apiName];
								if (( service.apisRestrictPermission === true && api.include === true) || !service.apisRestrictPermission) {
									/// need to also check for the default api if restricted
									aclEnvObj[serviceName].apis[apiName] = {};
									if (api.accessType === 'private') {
										aclEnvObj[serviceName].apis[apiName].access = true;
									}
									else if (api.accessType === 'public') {
										aclEnvObj[serviceName].apis[apiName].access = false;
									}
									else if (api.accessType === 'groups') {
										aclEnvObj[serviceName].apis[apiName].access = [];
										grpCodes = aclEnvFill[serviceName].apis[apiName].grpCodes;
										if (grpCodes) {
											for (code in grpCodes) {
												if (grpCodes.hasOwnProperty(code)) {
													aclEnvObj[serviceName].apis[apiName].access.push(code);
												}
											}
										}
										if (aclEnvObj[serviceName].apis[apiName].access.length === 0) {
											return {'valid': false};
										}
									}
								}
							}
						}
					}
				}
			}
		}
		return {'valid': true};
	}
	
	return {
		'fillServiceAccess': fillServiceAccess,
		'fillServiceApiAccess': fillServiceApiAccess,
		'fillApiAccess': fillApiAccess,
		'groupApisForDisplay': groupApisForDisplay,
		'checkForGroupDefault': checkForGroupDefault,
		'applyApiRestriction': applyApiRestriction,
		'prepareSaveObject': prepareSaveObject
	}
});