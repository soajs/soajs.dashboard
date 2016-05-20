"use strict";
var multiTenantService = soajsApp.components;
multiTenantService.service('aclHelper', function () {

	function prepareAclObjToSave(aclFill) {
		var acl = {};
		var valid = true;
		var serviceName, grpCodes, apiName, code, env;
		for (env in aclFill) {
			acl[env.toLowerCase()] = {};
			var aclObj = acl[env.toLowerCase()];
			for (serviceName in aclFill[env]) {
				if (aclFill[env].hasOwnProperty(serviceName)) {
					var service = angular.copy(aclFill[env][serviceName]);

					if (service.include === true) {
						aclObj[serviceName] = {};
						aclObj[serviceName].apis = {};

						if (service.accessType === 'private') {
							aclObj[serviceName].access = true;
						}
						else if (service.accessType === 'public') {
							aclObj[serviceName].access = false;
						}
						else if (service.accessType === 'groups') {
							aclObj[serviceName].access = [];
							grpCodes = aclFill[env][serviceName].grpCodes;
							if (grpCodes) {
								for (code in grpCodes) {
									if (grpCodes.hasOwnProperty(code)) {
										aclObj[serviceName].access.push(code);
									}
								}
							}
							if (aclObj[serviceName].access.length == 0) {
								return {'valid': false};
							}
						}

						if (service.apisRestrictPermission === true) {
							aclObj[serviceName].apisPermission = 'restricted';
						}

						if (service.apis) {
							for (apiName in service.apis) {
								if (service.apis.hasOwnProperty(apiName)) {
									var api = service.apis[apiName];
									if ((service.apisRestrictPermission === true && api.include === true) || !service.apisRestrictPermission) {
										/// need to also check for the default api if restricted
										aclObj[serviceName].apis[apiName] = {};
										if (api.accessType === 'private') {
											aclObj[serviceName].apis[apiName].access = true;
										}
										else if (api.accessType === 'public') {
											aclObj[serviceName].apis[apiName].access = false;
										}
										else if (api.accessType === 'groups') {
											aclObj[serviceName].apis[apiName].access = [];
											grpCodes = aclFill[env][serviceName].apis[apiName].grpCodes;

											if (grpCodes) {
												for (code in grpCodes) {
													if (grpCodes.hasOwnProperty(code)) {
														aclObj[serviceName].apis[apiName].access.push(code);
													}
												}
											}
											if (aclObj[serviceName].apis[apiName].access.length == 0) {
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
		return {'valid': valid, 'data': acl};
	}

	function fillAcl(currentScope) {
		var parentAcl = currentScope.currentApplication.parentPckgAcl;
		var envCodes = currentScope.environments_codes;
		var tenantAcl = currentScope.currentApplication.acl;
		currentScope.currentApplication.servicesEnv = {};
		var servicesEnv = {};
		var acl;
		var count = 0;
		var myAcl = {};
		var servNamesNew = [];
		var servNamesOld = [];

		if (tenantAcl) {
			acl = tenantAcl;
		}
		else {
			acl = parentAcl;
		}
		envCodes.forEach(function (oneEnv) {
			if (acl[oneEnv.code.toLowerCase()] && (!acl[oneEnv.code.toLowerCase()].access && !acl[oneEnv.code.toLowerCase()].apis && !acl[oneEnv.code.toLowerCase()].apisRegExp && !acl[oneEnv.code.toLowerCase()].apisPermission)) {
				for (var envCode in parentAcl) {
					envCode = envCode.toLowerCase();
					count++;
					if (acl[envCode]) {
						myAcl[envCode.toUpperCase()] = acl[envCode];
					}
					servNamesNew = Object.keys(parentAcl[envCode]);
					if (servNamesOld.length === 0) {
						servNamesOld = servNamesNew;
					}
					else {
						for (var i = 0; i < servNamesNew.length; i++) {
							var ct = 0;
							for (var j = 0; j < servNamesOld.length; j++) {
								if (servNamesOld[j] === servNamesNew[i]) {
									ct = 1;
									break;
								}
							}
							if (ct === 0) {
								servNamesOld.push(servNamesNew[i]);
							}
						}
					}
				}
			}
		});

		if (count === 0) {
			//old
			servNamesOld = Object.keys(acl);
			myAcl[envCodes[0].code.toUpperCase()] = acl;
			envCodes.forEach(function (oneEnv) {
				if (oneEnv.code !== envCodes[0].code) {
					myAcl[oneEnv.code.toUpperCase()] = angular.copy(myAcl[envCodes[0].code]);
				}
			});
			currentScope.msg.type = 'warning';
			currentScope.msg.msg = translation.warningMsgAcl[LANG];
		}

		envCodes.forEach(function (oneEnv) {
			servicesEnv[oneEnv.code.toUpperCase()] = {};
			for (var s in parentAcl[oneEnv.code.toLowerCase()]) {
				servicesEnv[oneEnv.code.toUpperCase()][s] = {};
			}
		});

		currentScope.currentApplication.serviceNames = servNamesOld;
		currentScope.currentApplication.aclFill = myAcl;
		currentScope.currentApplication.servicesEnv = servicesEnv;
	}

	function prepareServices(currentScope) {
		var service = {};
		var services = currentScope.currentApplication.services;
		var envCodes = currentScope.environments_codes;
		var parentAcl = currentScope.currentApplication.parentPckgAcl;
		for (var i = 0; i < services.length; i++) {
			service = services[i];
			service.fixList = groupApisForDisplay(service.apisList, 'group');
			var newList;
			envCodes.forEach(function (oneEnv) {
				var parentEnvAcl = parentAcl[oneEnv.code.toLowerCase()][service.name];
				if (currentScope.currentApplication.servicesEnv[oneEnv.code.toUpperCase()][service.name]) {
					if (parentEnvAcl && (parentEnvAcl.apisPermission === 'restricted')) {
						newList = [];
						service.forceRestricted = true;
						for (var i = 0; i < service.apisList.length; i++) {
							var v = service.apisList[i].v;
							if (parentEnvAcl.apis) {
								if (parentEnvAcl.apis[v]) {
									newList.push(service.apisList[i]);
								}
							}
						}
						service.fixList = groupApisForDisplay(service.apisList, 'group');
					}
					currentScope.currentApplication.servicesEnv[oneEnv.code.toUpperCase()][service.name] = angular.copy(service);
				}
			});
		}
	}

	function prepareViewAclObj(aclFill) {

		for (var lowerCase in aclFill) {
			var upperCase = lowerCase.toUpperCase();
			if (upperCase !== lowerCase) {
				aclFill[upperCase] = aclFill[lowerCase];
				delete aclFill[lowerCase];
			}
		}
		var service, propt, env;

		for (env in aclFill) {
			for (propt in aclFill[env]) {
				if (aclFill[env].hasOwnProperty(propt)) {
					service = aclFill[env][propt];

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
					var ap;
					if (service.apis) {
						for (ap in service.apis) {
							if (service.apis.hasOwnProperty(ap)) {
								service.apis[ap].include = true;
								service.apis[ap].accessType = 'clear';
								if (service.apis[ap].access == true) {
									service.apis[ap].accessType = 'private';
								}
								else if (service.apis[ap].access === false) {
									service.apis[ap].accessType = 'public';
								}
								else {
									if (Array.isArray(service.apis[ap].access)) {
										service.apis[ap].accessType = 'groups';
										service.apis[ap].grpCodes = {};
										service.apis[ap].access.forEach(function (c) {
											service.apis[ap].grpCodes[c] = true;
										});
									}
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
		var defaultGroupName = 'General';
		for (var i = 0; i < apisArray.length; i++) {
			if (apisArray[i][groupName]) {
				defaultGroupName = apisArray[i][groupName];
			}

			if (!result[defaultGroupName]) {
				result[defaultGroupName] = {};
				result[defaultGroupName].apis = [];
			}

			if (apisArray[i].groupMain === true) {
				result[defaultGroupName]['defaultApi'] = apisArray[i].v;
			}

			result[defaultGroupName].apis.push(apisArray[i]);
		}
		return result;
	}

	function checkForGroupDefault(aclFill, service, grp, val, myApi) {
		var defaultApi = service.fixList[grp]['defaultApi'];
		if (myApi.groupMain === true) {
			if (aclFill[service.name].apis) {
				if ((aclFill[service.name].apis[defaultApi]) && aclFill[service.name].apis[defaultApi].include !== true) {
					val.apis.forEach(function (one) {
						if (aclFill[service.name].apis[one.v]) {
							aclFill[service.name].apis[one.v].include = false;
						}
					});

				}
			}
		}
	}

	function applyRestriction(aclFill, service) {
		if (aclFill[service.name].apisRestrictPermission === true) {
			var grpLabel;
			for (grpLabel in service.fixList) {
				if (service.fixList.hasOwnProperty(grpLabel)) {
					var defaultApi = service.fixList[grpLabel]['defaultApi'];
					if (defaultApi) {
						if (aclFill[service.name].apis) {
							var apisList = service.fixList[grpLabel]['apis'];
							if ((!aclFill[service.name].apis[defaultApi]) || aclFill[service.name].apis[defaultApi].include !== true) {
								apisList.forEach(function (oneApi) {
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
});