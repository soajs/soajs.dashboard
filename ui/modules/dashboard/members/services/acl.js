"use strict";
var membersAclService = soajsApp.components;
membersAclService.service('membersAclHelper', [function () {
	
	function objectIsEnv(obj) {
		if (obj) {
			if (JSON.stringify(obj) === '{}') {
				return false;
			}
			if (!Object.hasOwnProperty.call(obj, 'access') && !obj.apis && !obj.apisRegExp && !obj.apisPermission) {
				return true;
			}
		}
		return false;
	}
	
	function groupApisForDisplay(apisArray, groupName) {
		var result = {};
		var apiDefaultGroupName = 'General';
		for (var i = 0; i < apisArray.length; i++) {
			if (apisArray[i][groupName]) {
				apiDefaultGroupName = apisArray[i][groupName];
			}
			if (!result[apiDefaultGroupName]) {
				result[apiDefaultGroupName] = {};
				result[apiDefaultGroupName].apis = [];
			}
			if (apisArray[i].groupMain === true) {
				result[apiDefaultGroupName]['defaultApi'] = apisArray[i].v;
			}
			result[apiDefaultGroupName].apis.push(apisArray[i]);
		}
		return result;
	}
	
	function prepareViewAclObj(aclFill, parentAcl) {
		var service, serviceName;
		for (serviceName in parentAcl) {
			if (aclFill.hasOwnProperty(serviceName)) {
				service = aclFill[serviceName];
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

				if (service.apis) {
					for (var apiName in service.apis) {
						if (service.apis.hasOwnProperty(apiName)) {
							service.apis[apiName].include = true;
							service.apis[apiName].accessType = 'clear';
							if (service.apis[apiName].access == true) {
								service.apis[apiName].accessType = 'private';
							}
							else if (service.apis[apiName].access === false) {
								service.apis[apiName].accessType = 'public';
							}
							else {
								if (Array.isArray(service.apis[apiName].access)) {
									service.apis[apiName].accessType = 'groups';
									service.apis[apiName].grpCodes = {};
									service.apis[apiName].access.forEach(function (c) {
										service.apis[apiName].grpCodes[c] = true;
									});
								}
							}
						}
					}
				}
			}
			else {
				if (parentAcl[serviceName]) {
					if (parentAcl[serviceName].apisPermission === 'restricted') {
						aclFill[serviceName] = {
							include: false,
							forceRestricted: true,
							apisRestrictPermission: true,
							apisPermission: 'restricted'
						};
					}
				}
			}
		}
	}
	
	function checkForGroupDefault(aclFill, service, grp, val, myApi) {
		var defaultApi = service.fixList[grp]['defaultApi'];
		if (myApi.groupMain === true && aclFill[service.name].apis) {
			if ((aclFill[service.name].apis[defaultApi]) && aclFill[service.name].apis[defaultApi].include !== true) {
				val.apis.forEach(function (one) {
					if (aclFill[service.name].apis[one.v]) {
						aclFill[service.name].apis[one.v].include = false;
					}
				});
			}
		}
	}

	function applyRestriction(aclFill, service) {
		if (aclFill[service.name].apisRestrictPermission === true) {
			for (var grpLabel in service.fixList) {
				if (service.fixList.hasOwnProperty(grpLabel)) {
					var defaultApi = service.fixList[grpLabel]['defaultApi'];
					if (defaultApi && aclFill[service.name].apis) {
						if ((!aclFill[service.name].apis[defaultApi]) || aclFill[service.name].apis[defaultApi].include !== true) {
							service.fixList[grpLabel]['apis'].forEach(function (oneApi) {
								if (aclFill[service.name].apis[oneApi.v]) {
									aclFill[service.name].apis[oneApi.v].include = false;
								}
							});
						}
					}
				}
			}
		}
	}

	function renderPermissionsWithServices(currentScope, oneApplication) {
		var envCodes = currentScope.environments_codes;
		var aclObj = oneApplication.app_acl || oneApplication.parentPackageAcl;
		var oldSchema = true;
		for (var p in aclObj) {
			if (objectIsEnv(aclObj[p])) {
				oldSchema = false;
			}
		}
		if (oldSchema) {
			currentScope.msg.type = 'warning';
			currentScope.msg.msg = translation.warningMsgAcl[LANG];
			var newAcl = {};
			envCodes.forEach(function (oneEnv) {
				newAcl[oneEnv.code.toLowerCase()] = angular.copy(aclObj);
			});
			aclObj = newAcl;
		}

		if (oneApplication.userPackageAcl) {
			var customOldSchema = true;
			for (var prp in oneApplication.userPackageAcl) {
				if (objectIsEnv(oneApplication.userPackageAcl[prp])) {
					customOldSchema = false;
				}
			}
			if (customOldSchema) {
				oneApplication.userPackageAcl = angular.copy(aclObj);
			}
			else {
				currentScope.msg = {};
			}
		}
		else {
			oneApplication.userPackageAcl = angular.copy(aclObj);
		}
		var myAcl = {};
		oneApplication.services = {};

		oneApplication.aclFill = {};

		envCodes.forEach(function (oneEnv) {
			oneApplication.services[oneEnv.code.toUpperCase()] = {};
			if (objectIsEnv(aclObj[oneEnv.code.toLowerCase()])) {
				if (aclObj[oneEnv.code.toLowerCase()]) {
					var aclEnv = aclObj[oneEnv.code.toLowerCase()];
					for (var serviceName in aclEnv) {
						oneApplication.services[oneEnv.code.toUpperCase()][serviceName] = {};
					}
				}

				for (var envCode in aclObj) {
					envCode = envCode.toLowerCase();
					if (oneEnv.code === envCode.toUpperCase()) {
						myAcl[envCode.toUpperCase()] = aclObj[envCode];

						for (var serviceName in myAcl[envCode.toUpperCase()]) {
							var service = {};
							for (var i = 0; i < currentScope.tenantApp.services.length; i++) {
								if (currentScope.tenantApp.services[i].name === serviceName) {
									if (myAcl[oneEnv.code.toUpperCase()] && myAcl[oneEnv.code.toUpperCase()][serviceName]) {
										myAcl[oneEnv.code.toUpperCase()][serviceName].name = currentScope.tenantApp.services[i].name;
										if (currentScope.tenantApp.services[i].apis) {
											myAcl[oneEnv.code.toUpperCase()][serviceName].apiList = currentScope.tenantApp.services[i].apis;
										}
										if (currentScope.tenantApp.services[i].versions) {
											var v = returnLatestVersion(currentScope.tenantApp.services[i].versions);
											if (currentScope.tenantApp.services[i].versions[v]) {
												myAcl[oneEnv.code.toUpperCase()][serviceName].apiList = currentScope.tenantApp.services[i].versions[v].apis;
											}
										}

										service = currentScope.tenantApp.services[i];
										if (oneApplication.services[oneEnv.code.toUpperCase()][service.name]) {
											oneApplication.services[oneEnv.code.toUpperCase()][service.name] = service;
										}
										//break;
									}
								}
							}

							if (Object.hasOwnProperty.call(myAcl[envCode.toUpperCase()], serviceName)) {
								var newList;
								var apiList = myAcl[oneEnv.code.toUpperCase()][serviceName].apiList;
								if (oneApplication.userPackageAcl[oneEnv.code.toLowerCase()][serviceName] && myAcl[oneEnv.code.toUpperCase()][serviceName].apiList) {
									if ((aclObj[envCode][serviceName]) && (aclObj[envCode][serviceName].apisPermission === 'restricted')) {
										newList = [];
										oneApplication.userPackageAcl[oneEnv.code.toLowerCase()][serviceName].forceRestricted = true;

										for (var apiInfo = 0; apiInfo < apiList.length; apiInfo++) {
											if (aclObj[envCode][serviceName].apis) {
												if (aclObj[envCode][serviceName].apis[apiList[apiInfo].v]) {
													newList.push(apiList[apiInfo]);
												}
											}
										}
										oneApplication.userPackageAcl[oneEnv.code.toLowerCase()][serviceName].fixList = groupApisForDisplay(newList, 'group');
										service.fixList = groupApisForDisplay(newList, 'group');
									}
									else {
										newList = apiList;
										if (newList) {
											oneApplication.userPackageAcl[oneEnv.code.toLowerCase()][serviceName].fixList = groupApisForDisplay(newList, 'group');
											service.fixList = groupApisForDisplay(newList, 'group');
										}
									}
								}
								else {
									if ((aclObj[envCode][serviceName]) && (aclObj[envCode][serviceName].apisPermission === 'restricted')) {
										newList = [];
										for (var apiInfo = 0; apiInfo < apiList.length; apiInfo++) {
											if (aclObj[envCode][serviceName].apis) {
												if (aclObj[envCode][serviceName].apis[apiList[apiInfo].v]) {
													newList.push(apiList[apiInfo]);
												}
											}
										}
										service.fixList = groupApisForDisplay(newList, 'group');
									}
								}
							}
						}
					}
				}
				
				oneApplication.aclFill[oneEnv.code.toUpperCase()] = oneApplication.userPackageAcl[oneEnv.code.toLowerCase()];
				prepareViewAclObj(oneApplication.aclFill[oneEnv.code.toUpperCase()], aclObj[oneEnv.code.toLowerCase()]);
			}
		});
		return;
	}

	function prepareAclObjToSave(aclPriviledges) {
		var aclObj = {};
		var valid = true;
		var propt, grpCodes, apiName, code, envCode;
		for (envCode in aclPriviledges.services) {
			aclObj[envCode.toLowerCase()] = {};
			for (propt in aclPriviledges.services[envCode]) {
				if (aclPriviledges.services[envCode].hasOwnProperty(propt)) {
					var service = angular.copy(aclPriviledges.services[envCode][propt]);
					if (service.include === true) {
						aclObj[envCode.toLowerCase()][propt] = {};
						aclObj[envCode.toLowerCase()][propt].apis = {};
						if (service.accessType === 'private') {
							aclObj[envCode.toLowerCase()][propt].access = true;
						}
						else if (service.accessType === 'public') {
							aclObj[envCode.toLowerCase()][propt].access = false;
						}
						else if (service.accessType === 'groups') {
							aclObj[envCode.toLowerCase()][propt].access = [];
							grpCodes = aclPriviledges.services[envCode][propt].grpCodes;
							if (grpCodes) {
								for (code in grpCodes) {
									if (grpCodes.hasOwnProperty(code)) {
										aclObj[envCode.toLowerCase()][propt].access.push(code);
									}
								}
							}
							if (aclObj[envCode.toLowerCase()][propt].access.length == 0) {
								return {'valid': false};
							}
						}

						if (service.apisRestrictPermission === true) {
							aclObj[envCode.toLowerCase()][propt].apisPermission = 'restricted';
						}

						if (service.apis) {
							for (apiName in service.apis) {
								if (service.apis.hasOwnProperty(apiName)) {
									var api = service.apis[apiName];
									if (( service.apisRestrictPermission === true && api.include === true) || !service.apisRestrictPermission) {
										/// need to also check for the default api if restricted
										aclObj[envCode.toLowerCase()][propt].apis[apiName] = {};
										if (api.accessType === 'private') {
											aclObj[envCode.toLowerCase()][propt].apis[apiName].access = true;
										}
										else if (api.accessType === 'public') {
											aclObj[envCode.toLowerCase()][propt].apis[apiName].access = false;
										}
										else if (api.accessType === 'groups') {
											aclObj[envCode.toLowerCase()][propt].apis[apiName].access = [];
											grpCodes = aclPriviledges.services[envCode][propt].apis[apiName].grpCodes;
											if (grpCodes) {
												for (code in grpCodes) {
													if (grpCodes.hasOwnProperty(code)) {
														aclObj[envCode.toLowerCase()][propt].apis[apiName].access.push(code);
													}
												}
											}
											if (aclObj[envCode.toLowerCase()][propt].apis[apiName].access.length == 0) {
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
		}
		return {'valid': valid, 'data': aclObj};
	}

	return {
		'applyRestriction': applyRestriction,
		'checkForGroupDefault': checkForGroupDefault,
		'prepareViewAclObj': prepareViewAclObj,
		'renderPermissionsWithServices': renderPermissionsWithServices,
		'prepareAclObjToSave': prepareAclObjToSave
	}
}]);