"use strict";

function api_checkAccess(apiAccess, user){
	if (!apiAccess){
		return true;
	}

	if (!user){
		return false;
	}

	if (apiAccess instanceof Array)
	{
		var userGroups = user.groups;
		if (!userGroups){
			return false;
		}
		var found = false;
		for (var ii = 0; ii < userGroups.length; ii++)
		{
			if (apiAccess.indexOf(userGroups[ii]) !== -1)
			{
				found= true;
				break;
			}
		}
		return found;
	}
	else{
		return true;
	}
}

function api_checkPermission(system, user, api){
	if ('restricted' === system.apisPermission) {
		if (!api){
			return false;
		}
		return api_checkAccess(api.access, user);
	}
	if (!api){
		return true;
	}

	var c= api_checkAccess(api.access, user);
	return c;
}

function checkApiHasAccess($scope, aclObject, serviceName, routePath, user){
	/// get acl of the service name
	var system = aclObject[serviceName] ;

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
		if( user )
		{
			if(system.access instanceof Array) {
				var checkAPI = false;
				var userGroups = user.groups;
				if(userGroups)
				{
					for(var ii = 0; ii < userGroups.length; ii++)
					{
						if(system.access.indexOf(userGroups[ii]) !== -1){
							checkAPI = true;
						}

					}
				}
				if(!checkAPI){
					return false;
				}

			}
		}
		else {
			if(!api || api.access){
				return false;
			}
		}
		apiRes = api_checkPermission(system, user, api);
		return apiRes;
	}

	if(api || (system && ('restricted' === system.apisPermission))) {
		apiRes = api_checkPermission(system,user, api);
		if(apiRes){
			return true;
		}
		else{
			return false;
		}

	}
	else{
		return true;
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