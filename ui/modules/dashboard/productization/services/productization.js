"use strict";
var productizationService = soajsApp.components;
productizationService.service('aclHelpers', ['aclDrawHelpers', function (aclDrawHelpers) {
	
	function groupApisForDisplay(apisArray, apiGroupName) {
		return aclDrawHelpers.groupApisForDisplay(apisArray, apiGroupName);
	}
	
	function fillAcl(currentScope) {
		var count = 0;
		var myAcl = {};
		var envCodes = currentScope.environments_codes;
		var aclFill = currentScope.aclFill;
		envCodes.forEach(function (oneEnv) {
			if (aclFill[oneEnv.code.toLowerCase()]) {
				if (objectIsEnv(aclFill[oneEnv.code.toLowerCase()])) {
					count++;
					myAcl[oneEnv.code.toUpperCase()] = aclFill[oneEnv.code.toLowerCase()];
					propagateAcl(currentScope, myAcl[oneEnv.code.toUpperCase()]);
				}
			}
		});
		
		if (count === 0) {
			//old schema
			myAcl[envCodes[0].code.toUpperCase()] = aclFill;
			propagateAcl(currentScope, myAcl[envCodes[0].code.toUpperCase()]);
			envCodes.forEach(function (oneEnv) {
				if (oneEnv.code !== envCodes[0].code) {
					myAcl[oneEnv.code.toUpperCase()] = angular.copy(myAcl[envCodes[0].code]);
				}
			});
			currentScope.msg.type = 'warning';
			currentScope.msg.msg = translation.warningMsgAcl[LANG];
		}
		currentScope.aclFill = myAcl;
		
		overlayLoading.hide();
	}
	
	function propagateAcl(currentScope, aclFill) {
		for (var serviceName in aclFill) {
			if (aclFill.hasOwnProperty(serviceName)) {
				var currentService = {};
				for (var x = 0; x < currentScope.allServiceApis.length; x++) {
					if (currentScope.allServiceApis[x].name === serviceName) {
						currentService = currentScope.allServiceApis[x];
						break;
					}
				}
				aclDrawHelpers.fillServiceAccess(aclFill[serviceName], currentService);
				aclDrawHelpers.fillServiceApiAccess(aclFill[serviceName], currentService);
				aclDrawHelpers.applyApiRestriction(aclFill, currentService);
			}
		}
	}
	
	function applyPermissionRestriction(scope, envCode, service) {
		var aclFill = scope.aclFill[envCode];
		aclDrawHelpers.applyApiRestriction(aclFill, service);
	}
	
	function checkForGroupDefault(scope, envCode, service, grp, val, myApi) {
		var aclFill = scope.aclFill[envCode];
		aclDrawHelpers.checkForGroupDefault(aclFill, service, grp, val, myApi);
	}
	
	function constructAclFromPost(aclFill) {
		var aclObj = {};
		for (var envCode in aclFill) {
			aclObj[envCode.toLowerCase()] = {};
			var result = aclFromPostPerEnv(aclFill[envCode.toUpperCase()], aclObj[envCode.toLowerCase()]);
			if (!result.valid) {
				return result;
			}
			if (Object.keys(aclObj[envCode.toLowerCase()]).length === 0) {
				delete aclObj[envCode.toLowerCase()];
			}
		}
		if (result.valid) {
			result.data = aclObj;
		}
		return result;
	}
	
	function aclFromPostPerEnv(aclEnvFill, aclEnvObj) {
		if (!aclDrawHelpers.prepareSaveObject(aclEnvFill, aclEnvObj).valid) {
			return {'valid': false, 'data': aclEnvObj};
		}
		
		return {'valid': true, 'data': aclEnvObj};
	}
	
	return {
		'groupApisForDisplay': groupApisForDisplay,
		'fillAcl': fillAcl,
		'applyPermissionRestriction': applyPermissionRestriction,
		'checkForGroupDefault': checkForGroupDefault,
		'constructAclFromPost': constructAclFromPost
	}
}]);