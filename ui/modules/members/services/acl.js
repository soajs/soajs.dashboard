"use strict";
var membersAclService = soajsApp.components;
membersAclService.service('membersAclHelper', [function () {

	function prepareViewAclObj(aclFill) {
		var service, serviceName;
		for (serviceName in aclFill) {
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
		}
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
		var aclObj = oneApplication.app_acl || oneApplication.parentPackageAcl;
		var count = 0;
		var myAcl = {};
		var envCodes = currentScope.environments_codes;
		envCodes.forEach(function (oneEnv) {
			if (aclObj[oneEnv.code.toLowerCase()] && (!aclObj[oneEnv.code.toLowerCase()].access && !aclObj[oneEnv.code.toLowerCase()].apis && !aclObj[oneEnv.code.toLowerCase()].apisRegExp && !aclObj[oneEnv.code.toLowerCase()].apisPermission)) {
				for (var envCode in aclObj) {
					envCode = envCode.toLowerCase();
					count++;
					myAcl[envCode.toUpperCase()] = aclObj[envCode];
					for (var serviceName in myAcl[envCode.toUpperCase()]) {
						if (myAcl[envCode.toUpperCase()].hasOwnProperty(serviceName)) {
							for (var i = 0; i < currentScope.tenantApp.services.length; i++) {
								if (currentScope.tenantApp.services[i].name === serviceName) {
									if (myAcl[oneEnv.code.toUpperCase()] && myAcl[oneEnv.code.toUpperCase()][serviceName]) {
										myAcl[oneEnv.code.toUpperCase()][serviceName].name = currentScope.tenantApp.services[i].name;
										myAcl[oneEnv.code.toUpperCase()][serviceName].apiList = currentScope.tenantApp.services[i].apis;
										//break;
									}
								}
							}
							if (myAcl[oneEnv.code.toUpperCase()] && myAcl[oneEnv.code.toUpperCase()][serviceName]) {
								var newList;
								if ((aclObj[envCode][serviceName]) && (aclObj[envCode][serviceName].apisPermission === 'restricted')) {
									newList = [];
									myAcl[oneEnv.code.toUpperCase()][serviceName].forceRestricted = true;

									for (var apiInfo = 0; apiInfo < myAcl[oneEnv.code.toUpperCase()][serviceName].apiList.length; apiInfo++) {
										if (aclObj[envCode][serviceName].apis) {
											if (aclObj[envCode][serviceName].apis[myAcl[oneEnv.code.toUpperCase()][serviceName].apiList[apiInfo].v]) {
												newList.push(myAcl[oneEnv.code.toUpperCase()][serviceName].apiList[apiInfo]);
											}
										}
									}
									myAcl[oneEnv.code.toUpperCase()][serviceName].fixList = groupApisForDisplay(newList, 'group');
								}
								else {
									newList = myAcl[oneEnv.code.toUpperCase()][serviceName].apiList;
									if (newList) {
										myAcl[oneEnv.code.toUpperCase()][serviceName].fixList = groupApisForDisplay(newList, 'group');
									}
								}
							}
						}
					}

					oneApplication.aclFill = myAcl;
				}
				prepareViewAclObj(oneApplication.aclFill[oneEnv.code.toUpperCase()]);
			}
		});
		if (count === 0) {
			myAcl[envCodes[0].code.toUpperCase()] = aclObj;
			for (var serviceName in myAcl[envCodes[0].code.toUpperCase()]) { //wrong
				if (myAcl[envCodes[0].code.toUpperCase()].hasOwnProperty(serviceName)) {
					for (var i = 0; i < currentScope.tenantApp.services.length; i++) {
						if (currentScope.tenantApp.services[i].name === serviceName) {
							myAcl[envCodes[0].code.toUpperCase()][serviceName].name = currentScope.tenantApp.services[i].name;
							myAcl[envCodes[0].code.toUpperCase()][serviceName].apiList = currentScope.tenantApp.services[i].apis;
							break;
						}
					}
					if (myAcl[envCodes[0].code][serviceName]) {
						var newList;
						if ((myAcl[envCodes[0].code.toUpperCase()][serviceName]) && (myAcl[envCodes[0].code.toUpperCase()][serviceName].apisPermission === 'restricted')) {
							newList = [];
							myAcl[envCodes[0].code.toUpperCase()][serviceName].forceRestricted = true;

							for (var apiInfo = 0; apiInfo < myAcl[envCodes[0].code.toUpperCase()][serviceName].apiList.length; apiInfo++) {
								if (myAcl[envCodes[0].code.toUpperCase()][serviceName].apis) {
									if (myAcl[envCodes[0].code.toUpperCase()][serviceName].apis[myAcl[envCodes[0].code.toUpperCase()][serviceName].apiList[apiInfo].v]) {
										newList.push(myAcl[envCodes[0].code.toUpperCase()][serviceName].apiList[apiInfo]);
									}
								}
							}

							myAcl[envCodes[0].code.toUpperCase()][serviceName].fixList = groupApisForDisplay(newList, 'group');
						}
						else {
							newList = currentScope.tenantApp.services[i].apis;
							if (newList) {
								myAcl[envCodes[0].code.toUpperCase()][serviceName].fixList = groupApisForDisplay(newList, 'group');
							}
						}

						prepareViewAclObj(myAcl[envCodes[0].code.toUpperCase()]);

					}
				}
			}
			oneApplication.aclFill = myAcl;
			envCodes.forEach(function (oneEnv) {
				if (oneEnv.code !== envCodes[0].code) {
					myAcl[oneEnv.code.toUpperCase()] = angular.copy(myAcl[envCodes[0].code]);
					prepareViewAclObj(oneApplication.aclFill[oneEnv.code.toUpperCase()]);
				}
			});

		}

		if (count === 0) {
			currentScope.msg.type = 'warning';
			currentScope.msg.msg = translation.warningMsgAcl[LANG];
		}
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