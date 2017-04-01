"use strict";
var multiTenantService = soajsApp.components;
multiTenantService.service('aclHelper', ['aclDrawHelpers', function (aclDrawHelpers) {
	
	function groupApisForDisplay(apisArray, apiGroupName) {
		return aclDrawHelpers.groupApisForDisplay(apisArray, apiGroupName);
	}
	
	function prepareViewAclObj(currentScope, aclFill) {
		var services = currentScope.currentApplication.servicesEnv;
		for (var lowerCase in aclFill) {
			var upperCase = lowerCase.toUpperCase();
			if (upperCase !== lowerCase) {
				aclFill[upperCase] = aclFill[lowerCase];
				delete aclFill[lowerCase];
			}
		}
		var service, serviceName;
		
		for (var env in aclFill) {
			for (serviceName in aclFill[env]) {
				if (aclFill[env].hasOwnProperty(serviceName)) {
					var currentService = {};
					if (services[env.toUpperCase()][serviceName]) {
						currentService = services[env.toUpperCase()][serviceName];
					}
					service = aclFill[env][serviceName];
					aclDrawHelpers.fillServiceAccess(service, currentService);
					aclDrawHelpers.fillServiceApiAccess(service, currentService);
					applyRestriction(aclFill[env], currentService);
				}
			}
		}
	}
	
	function fillAcl(currentScope) {
		var parentAcl = currentScope.currentApplication.parentPckgAcl;
		var envCodes = currentScope.environments_codes;
		var tenantAcl = currentScope.currentApplication.acl;
		currentScope.currentApplication.servicesEnv = {};
		var servicesEnv = {};
		var acl;
		var myAcl = {};
		var servNamesNew = [];
		var servNamesOld = [];
		
		var oldParentSchema = true;
		for (var p in parentAcl) {
			if (objectIsEnv(parentAcl[p])) {
				oldParentSchema = false;
			}
		}
		var oldAcl = false;
		if (tenantAcl) {
			acl = tenantAcl;
			var oldAppSchema = true;
			for (var p in tenantAcl) {
				if (objectIsEnv(tenantAcl[p])) {
					oldAppSchema = false;
				}
			}
			if (oldAppSchema) {
				oldAcl = true;
			}
		}
		else {
			acl = parentAcl;
			if (oldParentSchema) {
				oldAcl = true;
			}
		}
		
		if (oldAcl) {
			myAcl[envCodes[0].code.toUpperCase()] = acl;
			envCodes.forEach(function (oneEnv) {
				if (oneEnv.code !== envCodes[0].code) {
					myAcl[oneEnv.code.toUpperCase()] = angular.copy(myAcl[envCodes[0].code]);
				}
			});
			currentScope.msg.type = 'warning';
			currentScope.msg.msg = translation.warningMsgAcl[LANG];
		}
		else {
			envCodes.forEach(function (oneEnv) {
				envCode = oneEnv.code.toLowerCase();
				if (acl[envCode]) {
					myAcl[envCode.toUpperCase()] = acl[envCode];
				}
				else {
					myAcl[envCode.toUpperCase()] = {};
				}
			});
		}
		
		if (oldParentSchema) {
			servNamesOld = Object.keys(parentAcl);
		}
		else {
			for (var envCode in parentAcl) {
				envCode = envCode.toLowerCase();
				if (parentAcl && parentAcl[envCode]) {
					servNamesNew = Object.keys(parentAcl[envCode]);
					if (servNamesOld.length === 0) {
						servNamesOld = servNamesNew;
					}
					else {
						for (var i = 0; i < servNamesNew.length; i++) {
							if (servNamesOld.indexOf(servNamesNew[i]) === -1) {
								servNamesOld.push(servNamesNew[i]);
							}
						}
					}
				}
				else {
					console.log('Missing parentAcl of ' + envCode);
				}
			}
		}
		
		envCodes.forEach(function (oneEnv) {
			servicesEnv[oneEnv.code.toUpperCase()] = {};
			if (oldParentSchema) {
				for (var s in parentAcl) {
					servicesEnv[oneEnv.code.toUpperCase()][s] = {
						name: s
					};
				}
			}
			else {
				for (var s in parentAcl[oneEnv.code.toLowerCase()]) {
					servicesEnv[oneEnv.code.toUpperCase()][s] = {
						name: s
					};
				}
			}
		});
		
		currentScope.currentApplication.serviceNames = servNamesOld;
		currentScope.currentApplication.aclFill = myAcl;
		currentScope.currentApplication.servicesEnv = servicesEnv;
		if (oldParentSchema) {
			var newAcl = {};
			envCodes.forEach(function (oneEnv) {
				newAcl[oneEnv.code.toLowerCase()] = angular.copy(parentAcl);
			});
			parentAcl = newAcl;
			currentScope.currentApplication.parentPckgAcl = newAcl;
		}
	}
	
	function prepareServices(currentScope) {
		var service = {};
		var services = currentScope.currentApplication.services;
		var envCodes = currentScope.environments_codes;
		var parentAcl = currentScope.currentApplication.parentPckgAcl;
		for (var i = 0; i < services.length; i++) {
			if (services[i].apisList) {
				services[i].fixList = groupApisForDisplay(services[i].apisList, 'group');
				var newList;
				service = services[i];
				envCodes.forEach(function (oneEnv) {
					var parentEnvAcl = {};
					if (parentAcl[oneEnv.code.toLowerCase()]) {
						parentEnvAcl = parentAcl[oneEnv.code.toLowerCase()][service.name];
					}
					if (currentScope.currentApplication.servicesEnv[oneEnv.code.toUpperCase()][service.name]) {
						if (parentEnvAcl && (parentEnvAcl.apisPermission === 'restricted')) {
							newList = [];
							service.forceRestricted = true;
							for (var j = 0; j < service.apisList.length; j++) {
								var v = service.apisList[j].v;
								if (service.apisList[j].m) {
									if (parentEnvAcl[service.apisList[j].m]) {
										if (parentEnvAcl[service.apisList[j].m].apis && parentEnvAcl[service.apisList[j].m].apis[v]) {
											newList.push(service.apisList[j]);
										}
									}
								}
								if (parentEnvAcl.apis) {
									if (parentEnvAcl.apis[v]) {
										newList.push(service.apisList[j]);
									}
								}
							}
							service.fixList = groupApisForDisplay(newList, 'group');
						}
						currentScope.currentApplication.servicesEnv[oneEnv.code.toUpperCase()][service.name] = angular.copy(service);
					}
				});
			}
		}
	}
	
	function checkForGroupDefault(aclFill, service, grp, val, myApi) {
		aclDrawHelpers.checkForGroupDefault(aclFill, service, grp, val, myApi);
	}
	
	function applyRestriction(aclFill, service) {
		aclDrawHelpers.applyApiRestriction(aclFill, service);
	}
	
	function prepareAclObjToSave(aclFill) {
		var acl = {};
		var valid = true;
		var env;
		for (env in aclFill) {
			acl[env.toLowerCase()] = {};
			if (!aclDrawHelpers.prepareSaveObject(aclFill[env], acl[env.toLowerCase()]).valid) {
				return {'valid': false, 'data': acl};
			}
		}
		return {'valid': valid, 'data': acl};
	}
	
	return {
		'prepareServices': prepareServices,
		'prepareAclObjToSave': prepareAclObjToSave,
		'fillAcl': fillAcl,
		'prepareViewAclObj': prepareViewAclObj,
		'groupApisForDisplay': groupApisForDisplay,
		'checkForGroupDefault': checkForGroupDefault,
		'applyRestriction': applyRestriction
	}
}]);