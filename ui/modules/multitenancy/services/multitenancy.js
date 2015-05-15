"use strict";
var multiTenantService = soajsApp.components;
multiTenantService.service('aclHelper', function(){

	function prepareAclObjToSave(aclFill){
		var aclObj={};
		var valid = true;
		var serviceName, grpCodes, apiName, code;
		for(serviceName in aclFill){
			if(aclFill.hasOwnProperty( serviceName )){
				var service = angular.copy(aclFill[serviceName]);

				if(service.include===true){
					aclObj[serviceName]={};
					aclObj[serviceName].apis={};

					if(service.accessType==='private'){
						aclObj[serviceName].access=true;
					}
					else if(service.accessType==='public'){
						aclObj[serviceName].access=false;
					}
					else if(service.accessType==='groups'){
						aclObj[serviceName].access=[];
						grpCodes = aclFill[serviceName].grpCodes;
						if(grpCodes){
							for(code in grpCodes){
								if(grpCodes.hasOwnProperty(code)){
									aclObj[serviceName].access.push(code);
								}
							}
						}
						if(aclObj[serviceName].access.length==0){
							return {'valid': false } ;
						}
					}

					if(service.apisRestrictPermission ===true ){
						aclObj[serviceName].apisPermission ='restricted';
					}

					if(service.apis){
						for(apiName in service.apis){
							if(service.apis.hasOwnProperty(apiName)){
								var api = service.apis[apiName];
								if((service.apisRestrictPermission=== true && api.include===true) || !service.apisRestrictPermission){
									/// need to also check for the default api if restricted
									aclObj[serviceName].apis[apiName]={};
									if(api.accessType==='private'){
										aclObj[serviceName].apis[apiName].access=true;
									}
									else if(api.accessType==='public'){
										aclObj[serviceName].apis[apiName].access=false;
									}
									else if(api.accessType==='groups'){
										aclObj[serviceName].apis[apiName].access=[];
										grpCodes = aclFill[serviceName].apis[apiName].grpCodes;

										if(grpCodes){
											for(code in grpCodes){
												if(grpCodes.hasOwnProperty(code)){
													aclObj[serviceName].apis[apiName].access.push(code);
												}
											}
										}
										if(aclObj[serviceName].apis[apiName].access.length==0){
											return {'valid': false } ;
										}
									}
								}
							}
						}
					}
				}
			}
		}
		return {'valid': valid, 'data':aclObj } ;
	}

	function prepareViewAclObj(aclFill){
		var service, propt;

		for(propt in aclFill){
			if(aclFill.hasOwnProperty(propt)){
				service = aclFill[propt];

				service.include =true;
				service.collapse = false;
				if(service.access){
					if( service.access===true){
						service.accessType = 'private';
					}
					else if( service.access===false){
						service.accessType = 'public';
					}
					else if(Array.isArray(service.access)){
						service.accessType = 'groups';
						service.grpCodes={};
						service.access.forEach(function( c ) {
							service.grpCodes[c]=true;
						});
					}
				}
				else{
					service.accessType = 'public';
				}
				if(service.apisPermission==='restricted'){
					service.apisRestrictPermission = true;
				}
				var ap;
				if(service.apis){
					for(ap in service.apis){
						if( service.apis.hasOwnProperty( ap )) {
							service.apis[ap].include = true;
							service.apis[ap].accessType = 'clear';
							if(service.apis[ap].access == true) {
								service.apis[ap].accessType = 'private';
							}
							else if(service.apis[ap].access === false) {
								service.apis[ap].accessType = 'public';
							}
							else {
								if(Array.isArray(service.apis[ap].access)) {
									service.apis[ap].accessType = 'groups';
									service.apis[ap].grpCodes = {};
									service.apis[ap].access.forEach(function(c) {
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

	function groupApisForDisplay(apisArray, groupName) {
		var result = {} ;
		var defaultGroupName = 'General' ;
		for(var i=0; i<apisArray.length; i++){
			if(apisArray[i][groupName]){
				defaultGroupName = apisArray[i][groupName];
			}

			if(!result[defaultGroupName]){
				result[defaultGroupName]={};
				result[defaultGroupName].apis=[];
			}

			if(apisArray[i].groupMain === true ){
				result[defaultGroupName]['defaultApi'] =apisArray[i].v;
			}

			result[defaultGroupName].apis.push(apisArray[i]);
		}
		return result;
	}

	function checkForGroupDefault(aclFill, service, grp, val, myApi) {
		var defaultApi = service.fixList[grp]['defaultApi'];
		if(myApi.groupMain === true) {
			if(aclFill[service.name].apis) {
				if((aclFill[service.name].apis[defaultApi]) && aclFill[service.name].apis[defaultApi].include !== true) {
					val.apis.forEach(function(one) {
						if(aclFill[service.name].apis[one.v]) {
							aclFill[service.name].apis[one.v].include = false;
						}
					});

				}
			}
		}
	}

	function applyRestriction(aclFill, service) {
		if(aclFill[service.name].apisRestrictPermission === true) {
			var grpLabel;
			for(grpLabel in service.fixList) {
				if(service.fixList.hasOwnProperty(grpLabel)) {
					var defaultApi = service.fixList[grpLabel]['defaultApi'];
					if(defaultApi) {
						if(aclFill[service.name].apis) {
							var apisList = service.fixList[grpLabel]['apis'];
							if((!aclFill[service.name].apis[defaultApi]) || aclFill[service.name].apis[defaultApi].include !== true) {
								apisList.forEach(function(oneApi) {
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
	}

	return {
		'prepareAclObjToSave': prepareAclObjToSave,
		'prepareViewAclObj': prepareViewAclObj,
		'groupApisForDisplay': groupApisForDisplay,
		'checkForGroupDefault': checkForGroupDefault,
		'applyRestriction': applyRestriction
	}
});