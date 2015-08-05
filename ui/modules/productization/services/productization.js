"use strict";
var productizationService = soajsApp.components;
productizationService.service('aclHelpers', function(){

	function groupApisForDisplay(apisArray, apiGroupName) {
		var result = {} ;
		var apiDefaultGroupName = 'General' ;
		var len = apisArray.length;
		if (len ==0 ){
			return result;
		}
		for(var i=0; i<len; i++){
			if(apisArray[i][apiGroupName]){
				apiDefaultGroupName = apisArray[i][apiGroupName];
			}

			if(!result[apiDefaultGroupName]){
				result[apiDefaultGroupName]={};
				result[apiDefaultGroupName].apis=[];
			}

			if(apisArray[i].groupMain === true ){
				result[apiDefaultGroupName]['defaultApi'] =apisArray[i].v;
			}
			result[apiDefaultGroupName].apis.push(apisArray[i]);
		}

		if( !result[apiDefaultGroupName]['defaultApi'] ){
			result[apiDefaultGroupName]['enableAll']=true;
		}
		return result;
	}

	function fillAcl(aclFill){
		for(var propt in aclFill){
			if(aclFill.hasOwnProperty(propt)){
				var service = aclFill[propt];
				service.include =true;
				service.collapse = false;

				if(service.access){
					if( service.access===true){
						service.accessType = 'private';
					}
					else if( service.access===false){
						service.accessType = 'public';
					}
					else if( Array.isArray(service.access) && (service.access.indexOf('administrator')>-1 )){
						service.accessType = 'admin';
					}
				}
				else{
					service.accessType = 'public';
				}

				if(service.apisPermission==='restricted'){
					service.apisRestrictPermission = true;
				}
				if(service.apis){
					for(var ap in service.apis){
						if(service.apis.hasOwnProperty(ap)) {
							service.apis[ap].include = true;
							service.apis[ap].accessType = 'clear';

							if(service.apis[ap].access == true) {
								service.apis[ap].accessType = 'private';
							}
							else if(service.apis[ap].access === false) {
								service.apis[ap].accessType = 'public';
							}
							else {
								if(Array.isArray(service.apis[ap].access) && (service.apis[ap].access.indexOf('administrator') > -1)) {
									service.apis[ap].accessType = 'admin';
								}
							}
						}
					}
				}
			}
		}
	}

	function applyPermissionRestriction(scope,service){
		if( scope.aclFill[service.name].apisRestrictPermission===true ){
			for(var grpLabel in service.fixList ){
				if(service.fixList.hasOwnProperty(grpLabel)){
					var defaultApi = service.fixList[grpLabel]['defaultApi'];
					if(defaultApi){
						if( scope.aclFill[service.name].apis ){
							var apisList = service.fixList[grpLabel]['apis'];
							if ((!scope.aclFill[service.name].apis[defaultApi]) || scope.aclFill[service.name].apis[defaultApi].include !== true){
								apisList.forEach(function( oneApi ) {
									if(scope.aclFill[service.name].apis[oneApi.v]){
										scope.aclFill[service.name].apis[oneApi.v].include=false;
									}
								});
							}
						}
					}
				}
			}
		}
	}

	function checkForGroupDefault(scope, service,grp,val,myApi){
		var defaultApi = service.fixList[grp]['defaultApi'];
		if(myApi.groupMain===true){
			if( scope.aclFill[service.name] && scope.aclFill[service.name].apis ) {
				if ((scope.aclFill[service.name].apis[defaultApi]) && scope.aclFill[service.name].apis[defaultApi].include !== true) {
					val.apis.forEach(function( one ) {
						if(scope.aclFill[service.name].apis[one.v]){
							scope.aclFill[service.name].apis[one.v].include=false;
						}
					});
				}
			}
		}
	}

	function constructAclFromPost(aclFill){
		var aclObj= {};
		for(var propt in aclFill){
			if(aclFill.hasOwnProperty(propt)){
				var s = angular.copy(aclFill[propt]);

				if(s.include===true){
					aclObj[propt]={};
					aclObj[propt].apis={};

					if(s.accessType==='private'){
						aclObj[propt].access=true;
					}
					else if(s.accessType==='admin'){
						aclObj[propt].access= ['administrator'];
					}
					else{
						aclObj[propt].access=false;
					}

					if(s.apisRestrictPermission ===true ){
						aclObj[propt].apisPermission ='restricted';
					}

					if(s.apis){
						for(var ap in s.apis){
							if(s.apis.hasOwnProperty(ap)){
								var api = s.apis[ap];

								if( ( s.apisRestrictPermission=== true && api.include===true) || (!s.apisRestrictPermission ) ) {
									/// need to also check for the default api if restricted
									aclObj[propt].apis[ap]={};
									if(api.accessType==='private'){
										aclObj[propt].apis[ap].access=true;
									}
									else if(api.accessType==='public'){
										aclObj[propt].apis[ap].access=false;
									}
									else if(api.accessType==='admin'){
										aclObj[propt].apis[ap].access=['administrator'];
									}
								}
							}
						}
					}
				}
			}
		}
		return aclObj;
	}

	return {
		'groupApisForDisplay': groupApisForDisplay,
		'fillAcl': fillAcl,
		'applyPermissionRestriction': applyPermissionRestriction,
		'checkForGroupDefault': checkForGroupDefault,
		'constructAclFromPost': constructAclFromPost
	}
});