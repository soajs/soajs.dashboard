"use strict";
var membersAclService = soajsApp.components;
membersAclService.service('membersAclHelper', [function() {

	function prepareViewAclObj(aclFill) {
		var service, serviceName;

		for(serviceName in aclFill) {
			if(aclFill.hasOwnProperty(serviceName)) {
				service = aclFill[serviceName];

				service.include = true;
				service.collapse = false;
				if(service.access) {
					if(service.access === true) {
						service.accessType = 'private';
					}
					else if(service.access === false) {
						service.accessType = 'public';
					}
					else if(Array.isArray(service.access)) {
						service.accessType = 'groups';
						service.grpCodes = {};
						service.access.forEach(function(c) {
							service.grpCodes[c] = true;
						});
					}
				}
				else {
					service.accessType = 'public';
				}
				if(service.apisPermission === 'restricted') {
					service.apisRestrictPermission = true;
				}

				if(service.apis) {
					for(var apiName in service.apis) {
						if(service.apis.hasOwnProperty(apiName)) {
							service.apis[apiName].include = true;
							service.apis[apiName].accessType = 'clear';
							if(service.apis[apiName].access == true) {
								service.apis[apiName].accessType = 'private';
							}
							else if(service.apis[apiName].access === false) {
								service.apis[apiName].accessType = 'public';
							}
							else {
								if(Array.isArray(service.apis[apiName].access)) {
									service.apis[apiName].accessType = 'groups';
									service.apis[apiName].grpCodes = {};
									service.apis[apiName].access.forEach(function(c) {
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
		for(var i = 0; i < apisArray.length; i++) {
			if(apisArray[i][groupName]) {
				apiDefaultGroupName = apisArray[i][groupName];
			}
			if(!result[apiDefaultGroupName]) {
				result[apiDefaultGroupName] = {};
				result[apiDefaultGroupName].apis = [];
			}
			if(apisArray[i].groupMain === true) {
				result[apiDefaultGroupName]['defaultApi'] = apisArray[i].v;
			}
			result[apiDefaultGroupName].apis.push(apisArray[i]);
		}
		return result;
	}

	function checkForGroupDefault(aclFill, service, grp, val, myApi) {
		var defaultApi = service.fixList[grp]['defaultApi'];
		if(myApi.groupMain === true && aclFill[service.name].apis) {
			if((aclFill[service.name].apis[defaultApi]) && aclFill[service.name].apis[defaultApi].include !== true) {
				val.apis.forEach(function(one) {
					if(aclFill[service.name].apis[one.v]) {
						aclFill[service.name].apis[one.v].include = false;
					}
				});
			}
		}
	}

	function applyRestriction(aclFill, service) {
		if(aclFill[service.name].apisRestrictPermission === true) {
			for(var grpLabel in service.fixList) {
				if(service.fixList.hasOwnProperty(grpLabel)) {
					var defaultApi = service.fixList[grpLabel]['defaultApi'];
					if(defaultApi && aclFill[service.name].apis) {
						if((!aclFill[service.name].apis[defaultApi]) || aclFill[service.name].apis[defaultApi].include !== true) {
							service.fixList[grpLabel]['apis'].forEach(function(oneApi) {
								if(aclFill[service.name].apis[oneApi.v]) {
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
		var service;
		for(var serviceName in aclObj) {
			if(aclObj.hasOwnProperty(serviceName)) {
				for(var i = 0; i < currentScope.tenantApp.services.length; i++) {
					if(currentScope.tenantApp.services[i].name === serviceName) {
						service = currentScope.tenantApp.services[i];
						break;
					}
				}

				var newList;
				if((aclObj[serviceName]) && (aclObj[serviceName].apisPermission === 'restricted')) {
					newList = [];
					service.forceRestricted = true;

					for(var apiInfo = 0; apiInfo < service.apis.length; apiInfo++) {
						if(aclObj[serviceName].apis) {
							if(aclObj[serviceName].apis[service.apis[apiInfo].v]) {
								newList.push(service.apis[apiInfo]);
							}
						}
					}
					service.fixList = groupApisForDisplay(newList, 'group');
				}
				else {
					newList = aclObj[serviceName].apis;
					service.fixList = groupApisForDisplay(service.apis, 'group');
				}

				oneApplication.services.push(service);
				oneApplication.aclFill = aclObj;
			}
		}
	}

	function prepareAclObjToSave(aclPriviledges) {
		var aclObj = {};
		var valid = true;
		var propt, grpCodes, apiName, code;
		for(propt in aclPriviledges.services) {
			if(aclPriviledges.services.hasOwnProperty(propt)) {
				var service = angular.copy(aclPriviledges.services[propt]);
				if(service.include === true) {
					aclObj[propt] = {};
					aclObj[propt].apis = {};

					if(service.accessType === 'private') {
						aclObj[propt].access = true;
					}
					else if(service.accessType === 'public') {
						aclObj[propt].access = false;
					}
					else if(service.accessType === 'groups') {
						aclObj[propt].access = [];
						grpCodes = aclPriviledges.services[propt].grpCodes;
						if(grpCodes) {
							for(code in grpCodes) {
								if(grpCodes.hasOwnProperty(code)) {
									aclObj[propt].access.push(code);
								}
							}
						}
						if(aclObj[propt].access.length == 0) {
							return {'valid': false};
						}
					}

					if(service.apisRestrictPermission === true) {
						aclObj[propt].apisPermission = 'restricted';
					}

					if(service.apis) {
						for(apiName in service.apis) {
							if(service.apis.hasOwnProperty(apiName)) {
								var api = service.apis[apiName];
								if(( service.apisRestrictPermission === true && api.include === true) || !service.apisRestrictPermission) {
									/// need to also check for the default api if restricted
									aclObj[propt].apis[apiName] = {};
									if(api.accessType === 'private') {
										aclObj[propt].apis[apiName].access = true;
									}
									else if(api.accessType === 'public') {
										aclObj[propt].apis[apiName].access = false;
									}
									else if(api.accessType === 'groups') {
										aclObj[propt].apis[apiName].access = [];
										grpCodes = aclPriviledges.services[propt].apis[apiName].grpCodes;

										if(grpCodes) {
											for(code in grpCodes) {
												if(grpCodes.hasOwnProperty(code)) {
													aclObj[propt].apis[apiName].access.push(code);
												}
											}
										}
										if(aclObj[propt].apis[apiName].access.length == 0) {
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