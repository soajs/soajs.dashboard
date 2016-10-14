"use strict";
var multiTenantService = soajsApp.components;
multiTenantService.service('aclHelper', function () {

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

	function prepareViewAclObj(currentScope, aclFill) {
		var services=currentScope.currentApplication.services;
		for (var lowerCase in aclFill) {
			var upperCase = lowerCase.toUpperCase();
			if (upperCase !== lowerCase) {
				aclFill[upperCase] = aclFill[lowerCase];
				delete aclFill[lowerCase];
			}
		}
		var service, propt, env;

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

		for (env in aclFill) {
			for (propt in aclFill[env]) {
				if (aclFill[env].hasOwnProperty(propt)) {
					service = aclFill[env][propt];
					service.include = true;
					service.collapse = false;

					var currentService;
					for (var x = 0; x < services.length; x++) {
						if (services[x].name === propt) {
							currentService = services[x];
							break;
						}
					}

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
					if (!service.get && !service.post && !service.put && !service.delete) {
						if (currentService) {
							grpByMethod(service, currentService.fixList);
						}
					}

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
									if (parentEnvAcl[service.apisList[j].m].apis[v]) {
										newList.push(service.apisList[j]);
									}
								}
							}
							else {
								if (parentEnvAcl.apis) {
									if (parentEnvAcl.apis[v]) {
										newList.push(service.apisList[j]);
									}
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
											if (aclObj[serviceName].apis[apiName].access.length === 0) {
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