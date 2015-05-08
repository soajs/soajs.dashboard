"use strict";

/*
 * check if user has access to the requested route
 */
function checkApiHasAccess(aclObject, serviceName, routePath, userGroups) {
	/// get acl of the service name
	var system = aclObject[serviceName];

	var api = (system && system.apis ? system.apis[routePath] : null);

	if(!api && system && system.apisRegExp && Object.keys(system.apisRegExp).length) {
		for(var jj = 0; jj < system.apisRegExp.length; jj++) {
			if(system.apisRegExp[jj].regExp && routePath.match(system.apisRegExp[jj].regExp)) {
				api = system.apisRegExp[jj];
			}
		}
	}

	//return true;
	var apiRes = null;
	if(system && system.access) {
		if(system.access instanceof Array) {
			var checkAPI = false;
			if(userGroups) {
				for(var ii = 0; ii < userGroups.length; ii++) {
					if(system.access.indexOf(userGroups[ii]) !== -1) {
						checkAPI = true;
					}
				}
			}
			if(!checkAPI) {
				return false;
			}
		}

		apiRes = api_checkPermission(system, userGroups, api);
		return (apiRes) ? true : false;
	}

	if(api || (system && ('restricted' === system.apisPermission))) {
		apiRes = api_checkPermission(system, userGroups, api);
		return (apiRes) ? true : false;
	}
	else {
		return true;
	}

	function api_checkPermission(system, userGroups, api) {
		if('restricted' === system.apisPermission) {
			if(!api) { return false; }
			return api_checkAccess(api.access, userGroups);
		}
		if(!api) { return true; }

		return api_checkAccess(api.access, userGroups);

		function api_checkAccess(apiAccess, userGroups) {
			if(!apiAccess) { return true; }

			if(apiAccess instanceof Array) {
				if(!userGroups) { return false; }

				var found = false;
				for(var ii = 0; ii < userGroups.length; ii++) {
					if(apiAccess.indexOf(userGroups[ii]) !== -1) {
						found = true;
						break;
					}
				}
				return found;
			}
			else {
				return true;
			}
		}
	}
}

/**
 * build the access permissions of a module fron permissionsObj
 */
function constructModulePermissions(scope, access, permissionsObj) {
	for(var permission in permissionsObj) {
		if(Array.isArray(permissionsObj[permission])) {
			access[permission] = scope.buildPermittedOperation(permissionsObj[permission][0], permissionsObj[permission][1]);
		}
		else if(typeof(permissionsObj[permission]) === 'object') {
			access[permission] = {};
			constructModulePermissions(scope, access[permission], permissionsObj[permission]);
		}
	}
}
/*
 common function calls ngDataAPI angular service to connect and send/get data to api
 */
function getSendDataFromServer(ngDataApi, options, callback) {
	var apiOptions = {
		url: apiConfiguration.domain + options.routeName,
		headers: {
			'Content-Type': 'application/json',
			'key': apiConfiguration.key
		}
	};

	if(options.jsonp) {
		apiOptions.jsonp = true;
	}

	if(options.params) {
		apiOptions.params = options.params;
	}

	if(options.data) {
		apiOptions.data = options.data;
	}

	if(options.method) {
		apiOptions.method = options.method;
	}

	if(options.headers) {
		for(var i in options.headers) {
			if(options.headers.hasOwnProperty(i)) {
				apiOptions.headers[i] = options.headers[i];
			}
		}
	}
	
	ngDataApi[options.method](apiOptions, callback);
	
}

/*
 common function mostyly used by grids. loops over all selected records and calls getSendDataFromServer to send/get data to api
 */
function multiRecordUpdate(ngDataApi, $scope, opts, callback) {
	var err = 0, valid = [];
	var referenceKeys = [];
	var fieldName = (opts.override && opts.override.fieldName) ? opts.override.fieldName : "_id";
	var token = (opts.override && opts.override.fieldName) ? "%" + opts.override.fieldName + "%" : "%id%";
	var method = opts.method || 'get';
	for(var i = $scope.grid.rows.length - 1; i >= 0; i--) {
		if($scope.grid.rows[i].selected) {
			referenceKeys.push($scope.grid.rows[i][fieldName]);
		}
	}

	performUpdate(referenceKeys, 0, function() {
		if(err > 0) {
			$scope.$parent.displayAlert('danger', opts.msg.error);
		}

		if(err < referenceKeys.length) {
			$scope.$parent.displayAlert('success', opts.msg.success);
		}
		if(callback) { callback(valid); }
	});

	function performUpdate(referenceKeys, counter, cb) {

		if(opts.params) {
			for(var i in opts.params) {
				if(opts.params[i] === token) {
					opts.params[i] = referenceKeys[counter];
					if(opts.override && opts.override.fieldReshape) {
						opts.params[i] = opts.override.fieldReshape(opts.params[i]);
					}
				}
			}
		}

		if(opts.data) {
			for(var i in opts.data) {
				if(opts.data[i] === token) {
					opts.data[i] = referenceKeys[counter];
					if(opts.override && opts.override.fieldReshape) {
						opts.data[i] = opts.override.fieldReshape(opts.data[i]);
					}
				}
			}
		}

		getSendDataFromServer(ngDataApi, {
			"method": method,
			"routeName": opts.routeName,
			"params": opts.params,
			"data": opts.data
		}, function(error, response) {
			if(error || !response) {
				err++;
			}
			else {
				valid.push(referenceKeys[counter]);
			}

			counter++;
			if(counter < referenceKeys.length) {
				performUpdate(referenceKeys, counter, cb);
			}
			else {
				return cb();
			}
		});
	}
}

/**
 * takes a date and returns xx ago...
 */
function getTimeAgo(date) {

	var seconds = Math.floor((new Date().getTime() - date) / 1000);

	var interval = Math.floor(seconds / 31536000);

	if(interval > 1) {
		return interval + " years";
	}
	interval = Math.floor(seconds / 2592000);
	if(interval > 1) {
		return interval + " months";
	}
	interval = Math.floor(seconds / 86400);
	if(interval > 1) {
		return interval + " days";
	}
	interval = Math.floor(seconds / 3600);
	if(interval > 1) {
		return interval + " hours";
	}
	interval = Math.floor(seconds / 60);
	if(interval > 1) {
		return interval + " minutes";
	}
	return Math.floor(seconds) + " seconds";
}

/**
 * Fixes the values of the ACL object
 */
function prepareAclObjToSave($scope, aclPriviledges){
	var aclObj={};
	var valid = true;
	var propt, grpCodes, ap, code;
	for(propt in aclPriviledges.services)
	{
		if( aclPriviledges.services.hasOwnProperty( propt ))
		{
			var s = angular.copy(aclPriviledges.services[propt]);

			if(s.include===true)
			{
				aclObj[propt]={};
				aclObj[propt].apis={};

				if(s.accessType==='private'){
					aclObj[propt].access=true;
				}
				else if(s.accessType==='public'){
					aclObj[propt].access=false;
				}
				else if(s.accessType==='groups')
				{
					aclObj[propt].access=[];
					grpCodes = aclPriviledges.services[propt].grpCodes;
					if(grpCodes)
					{
						for(code in grpCodes)
						{
							if(grpCodes.hasOwnProperty(code))
							{
								aclObj[propt].access.push(code);
							}
						}
					}
					if(aclObj[propt].access.length==0)
					{
						$scope.$parent.displayAlert('danger', 'You need to choose at least one group when the access type is set to Groups');
						return {'valid': false } ;
					}
				}

				if(s.apisRestrictPermission ===true ){
					aclObj[propt].apisPermission ='restricted';
				}

				if(s.apis)
				{
					for(ap in s.apis){
						if( s.apis.hasOwnProperty(ap)){
							var api = s.apis[ap];
							if( ( s.apisRestrictPermission=== true && api.include===true) || (!s.apisRestrictPermission ) )
							{
								/// need to also check for the default api if restricted
								aclObj[propt].apis[ap]={};
								if(api.accessType==='private'){
									aclObj[propt].apis[ap].access=true;
								}
								else if(api.accessType==='public'){
									aclObj[propt].apis[ap].access=false;
								}
								else if(api.accessType==='groups'){
									aclObj[propt].apis[ap].access=[];
									grpCodes = aclPriviledges.services[propt].apis[ap].grpCodes;

									if(grpCodes)
									{
										for(code in grpCodes)
										{
											if(grpCodes.hasOwnProperty(code)){
												aclObj[propt].apis[ap].access.push(code);
											}
										}
									}
									if(aclObj[propt].apis[ap].access.length==0)
									{
										$scope.$parent.displayAlert('danger', 'You need to choose at least one group when the access type is set to Groups');
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

function prepareViewAclObj($scope, aclPriviledges){
	var s, propt;
	console.log( aclPriviledges );
	for(propt in aclPriviledges.services)
	{
		if( aclPriviledges.services.hasOwnProperty( propt )){
			s = aclPriviledges.services[propt];
			console.log(s);
			s.include =true;
			s.collapse = false;
			if(s.access){
				if( s.access===true){
					s.accessType = 'private';
				}
				else if( s.access===false){
					s.accessType = 'public';
				}
				else if(Array.isArray(s.access)){
					s.accessType = 'groups';
					s.grpCodes={};
					s.access.forEach(function( c ) {
						s.grpCodes[c]=true;
					});
				}
			}
			else{
				s.accessType = 'public';
			}
			if(s.apisPermission==='restricted'){
				s.apisRestrictPermission = true;
			}
			var ap;
			if(s.apis){
				for(ap in s.apis)
				{
					if( s.apis.hasOwnProperty( ap )) {
						s.apis[ap].include = true;
						s.apis[ap].accessType = 'clear';
						if(s.apis[ap].access == true) {
							s.apis[ap].accessType = 'private';
						}
						else if(s.apis[ap].access === false) {
							s.apis[ap].accessType = 'public';
						}
						else {
							if(Array.isArray(s.apis[ap].access)) {
								s.apis[ap].accessType = 'groups';
								s.apis[ap].grpCodes = {};
								s.apis[ap].access.forEach(function(c) {
									s.apis[ap].grpCodes[c] = true;
								});
							}
						}
					}
				}
			}

		}
	}



}