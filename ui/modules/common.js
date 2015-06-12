"use strict";

/**
 * build the access permissions of a module from permissionsObj
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
function getSendDataFromServer($scope, ngDataApi, options, callback) {
	var apiOptions = {
		url: (options.url) ? options.url + options.routeName : apiConfiguration.domain + options.routeName,
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

	ngDataApi[options.method]($scope, apiOptions, callback);
	
}

/*
 common function mostyly used by grids. loops over all selected records and calls getSendDataFromServer to send/get data to api
 */
function multiRecordUpdate(ngDataApi, $scope, opts, callback) {
	var err = 0, valid = [];
	var referenceKeys = [];
	var options = angular.copy(opts);
	var fieldName = (opts.override && opts.override.fieldName) ? options.override.fieldName : "_id";
	var token = (opts.override && opts.override.fieldName) ? "%" + options.override.fieldName + "%" : "%id%";
	var method = options.method || 'get';
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
					options.params[i] = referenceKeys[counter];
					if(opts.override && opts.override.fieldReshape) {
						options.params[i] = opts.override.fieldReshape(opts.params[i]);
					}
				}
			}
		}

		if(opts.data) {
			for(var i in opts.data) {
				if(opts.data[i] === token) {
					options.data[i] = referenceKeys[counter];
					if(opts.override && opts.override.fieldReshape) {
						options.data[i] = opts.override.fieldReshape(opts.data[i]);
					}
				}
			}
		}
		getSendDataFromServer($scope, ngDataApi, {
			"method": method,
			"routeName": options.routeName,
			"params": options.params,
			"data": options.data,
			"url": options.url
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