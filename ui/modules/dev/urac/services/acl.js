"use strict";
var membersAclService = soajsApp.components;

membersAclService.service('memAclModuleDevHelper', ['aclDrawHelpers', function (aclDrawHelpers) {
	
	function prepareViewAclObj(aclFill, parentAcl, services) {
		var serviceName;
		for (serviceName in parentAcl) {
			if (aclFill.hasOwnProperty(serviceName)) {
				aclDrawHelpers.fillServiceAccess(aclFill[serviceName], services[serviceName]);
				aclDrawHelpers.fillServiceApiAccess(aclFill[serviceName], services[serviceName]);
				applyRestriction(aclFill, services[serviceName]);
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
	
	function groupApisForDisplay(apisArray, groupName) {
		return aclDrawHelpers.groupApisForDisplay(apisArray, groupName);
	}
	
	function checkForGroupDefault(aclFill, service, grp, val, myApi) {
		aclDrawHelpers.checkForGroupDefault(aclFill, service, grp, val, myApi);
	}
	
	function applyRestriction(aclFill, service) {
		aclDrawHelpers.applyApiRestriction(aclFill, service);
	}
	
	function renderPermissionsWithServices(currentScope, oneApplication) {
		var envCodes = currentScope.environments_codes;
		var aclObj = oneApplication.acl || oneApplication.parentPackageAcl;
		
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
				prepareViewAclObj(oneApplication.aclFill[oneEnv.code.toUpperCase()], aclObj[oneEnv.code.toLowerCase()], oneApplication.services[oneEnv.code.toUpperCase()]);
			}
		});
		return;
	}
	
	function prepareAclObjToSave(aclPriviledges) {
		var aclObj = {};
		var valid = true;
		var envCode;
		for (envCode in aclPriviledges.services) {
			aclObj[envCode.toLowerCase()] = {};
			var aclEnvObj = aclObj[envCode.toLowerCase()];
			var aclEnvFill = aclPriviledges.services[envCode];
			if (!aclDrawHelpers.prepareSaveObject(aclEnvFill, aclEnvObj).valid) {
				return {'valid': false, 'data': aclObj};
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