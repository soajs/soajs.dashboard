"use strict";

/**
 * build the access permissions of a module from permissionsObj
 */
function constructModulePermissions(scope, access, permissionsObj, forceEnv) {
	var exclude = ['urac', 'dashboard'];
	for (var permission in permissionsObj) {
		if (Array.isArray(permissionsObj[permission])) {
			var env;
			if (forceEnv) {
				env = forceEnv;
			}
			else {
				env = 'dashboard';
				if (exclude.indexOf(permissionsObj[permission][0]) === -1) {
					env = scope.$parent.currentSelectedEnvironment.toLowerCase();
				}
			}
			
			env = env.toLowerCase();
			scope.buildPermittedEnvOperation(permissionsObj[permission][0], permissionsObj[permission][1], permissionsObj[permission][2], env, function (hasAccess) {
				access[permission] = hasAccess;
				if (!scope.$$phase) {
					scope.$apply();
				}
			});
		}
		else if (typeof(permissionsObj[permission]) === 'object') {
			access[permission] = {};
			constructModulePermissions(scope, access[permission], permissionsObj[permission], forceEnv);
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
			'Content-Type': 'application/json'
		}
	};
	
	var pathParams = options.routeName.split("/");
	var exclude = ['urac', 'dashboard', 'oauth'];
	if (exclude.indexOf(pathParams[1]) !== -1) {
		if (options.proxy && $scope.checkAuthEnvCookie()) {
			apiOptions.url = (options.url) ? options.url + "/proxy/redirect" : apiConfiguration.domain + "/proxy/redirect";
			apiOptions.url += "?proxyRoute=" + encodeURIComponent(options.routeName);
			apiOptions.proxy = true;
		}
	}
	else if ($scope.checkAuthEnvCookie()) {
		apiOptions.url = (options.url) ? options.url + "/proxy/redirect" : apiConfiguration.domain + "/proxy/redirect";
		apiOptions.url += "?proxyRoute=" + encodeURIComponent(options.routeName);
		apiOptions.proxy = true;
	}
	
	if (Object.hasOwnProperty.call(options, 'token')) {
		apiOptions.token = options.token;
	}
	else {
		apiOptions.token = true;
	}
	
	if (options.jsonp) {
		apiOptions.jsonp = true;
	}
	
	if (options.params) {
		apiOptions.params = options.params;
	}
	
	if (options.data) {
		apiOptions.data = options.data;
	}
	
	if (options.method) {
		apiOptions.method = options.method;
	}
	
	if (options.responseType) {
		apiOptions.responseType = options.responseType;
	}
	
	if (options.upload) {
		apiOptions.upload = options.upload;
		if (options.file) {
			apiOptions.file = options.file;
		}
	}
	
	if (options.headers) {
		for (var i in options.headers) {
			if (options.headers.hasOwnProperty(i)) {
				if (options.headers[i] === null) {
					delete apiOptions.headers[i];
				}
				else {
					apiOptions.headers[i] = options.headers[i];
				}
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
	var baseRoute = options.routeName;
	var method = options.method || 'get';
	var grid = $scope.grid;
	if (opts.grid) {
		grid = opts.grid;
	}
	for (var i = grid.rows.length - 1; i >= 0; i--) {
		if (grid.rows[i].selected) {
			referenceKeys.push(grid.rows[i][fieldName]);
		}
	}
	
	performUpdate(referenceKeys, 0, function () {
		if (err > 0) {
			$scope.$parent.displayAlert('danger', opts.msg.error);
		}
		if (err < referenceKeys.length) {
			$scope.$parent.displayAlert('success', opts.msg.success);
		}
		if (callback) {
			callback(valid);
		}
	});
	
	function performUpdate(referenceKeys, counter, cb) {
		var oneRoute = angular.copy(baseRoute);
		var oneValue = referenceKeys[counter];
		if (opts.routeParam) {
			oneRoute = oneRoute.replace(token, oneValue);
		}
		else {
			if (opts.params) {
				for (var i in opts.params) {
					if (opts.params[i] === token) {
						options.params[i] = referenceKeys[counter];
						if (opts.override && opts.override.fieldReshape) {
							options.params[i] = opts.override.fieldReshape(opts.params[i]);
						}
					}
				}
			}
			
			if (opts.data) {
				for (var i in opts.data) {
					if (opts.data[i] === token) {
						options.data[i] = referenceKeys[counter];
						if (opts.override && opts.override.fieldReshape) {
							options.data[i] = opts.override.fieldReshape(opts.data[i]);
						}
					}
				}
			}
		}
		
		var sendOptions = {
			"method": method,
			"headers": options.headers,
			"routeName": oneRoute,
			"params": options.params,
			"data": options.data,
			"url": options.url
		};
		
		if (opts.proxy) {
			sendOptions.proxy = opts.proxy;
		}
		
		getSendDataFromServer($scope, ngDataApi, sendOptions, function (error, response) {
			if (error || !response) {
				err++;
			}
			else {
				valid.push(referenceKeys[counter]);
			}
			
			counter++;
			if (counter < referenceKeys.length) {
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
	
	if (interval > 1) {
		return interval + " years";
	}
	interval = Math.floor(seconds / 2592000);
	if (interval > 1) {
		return interval + " months";
	}
	interval = Math.floor(seconds / 86400);
	if (interval > 1) {
		return interval + " days";
	}
	interval = Math.floor(seconds / 3600);
	if (interval > 1) {
		return interval + " hours";
	}
	interval = Math.floor(seconds / 60);
	if (interval > 1) {
		return interval + " minutes";
	}
	return Math.floor(seconds) + " seconds";
}

/**
 * creates a blob out of buffer data, and opens a dialog download box
 */
function openSaveAsDialog(filename, content, mediaType) {
	var blob = new Blob([content], {type: mediaType});
	var URL = window.URL || window.webkitURL;
	var objectUrl = URL.createObjectURL(blob);
	
	var a = document.createElement("a");
	document.body.appendChild(a);
	a.style = "display: none";
	a.href = objectUrl;
	a.download = filename;
	a.click();
}

function fixBackDrop() {
	var overlayHeight = jQuery(document).height();
	setTimeout(function () {
		jQuery(".modal-backdrop").css('height', overlayHeight + 'px');
	}, 20);
}

function getCodeMessage(code, service, orgMesg) {
	var msg = '';
	if (code) {
		if (errorCodes[service] && errorCodes[service][code]) {
			if (errorCodes[service][code][LANG]) {
				msg = errorCodes[service][code][LANG];
			}
			else {
				msg = errorCodes[service][code]['ENG'];
			}
		}
	}

	if (!msg) {
		if (orgMesg) {
			msg = orgMesg;
		}
	}
	return msg;
}

function returnLatestVersion(service) {
	function compareNumbers(a, b) {
		return b - a;
	}
	
	var keys = Object.keys(service);
	var keysInt = [];
	keys.forEach(function (key) {
		keysInt.push(parseInt(key));
	});
	// sort in descending order
	keysInt = keysInt.sort(compareNumbers);
	return keysInt[0].toString();
}

function objectIsEnv(obj) {
	if (obj) {
		if (JSON.stringify(obj) === '{}') {
			return false;
		}
		if (!Object.hasOwnProperty.call(obj, 'access') && !obj.apis && !obj.apisRegExp && !obj.apisPermission) {
			if (obj.get || obj.post || obj.put || obj.delete) {
				return false;
			}
			return true;
		}
	}
	return false;
}