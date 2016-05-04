"use strict";

soajsApp.service('ngDataApi', ['$http', '$cookies', '$localStorage', function ($http, $cookies, $localStorage) {

	function returnAPIError(scope, opts, status, headers, config, cb) {
		console.log("Error: ngDataApi->" + opts.api);
		console.log(status, headers, config);
		return cb(new Error("Unable Fetching data from " + config.url));
	}

	function returnAPIResponse(scope, response, config, cb) {
		if (config.responseType === 'arraybuffer' && response) {
			return cb(null, response);
		}
		else if (response && response.result === true) {
			if (response.soajsauth && $cookies.get('soajs_auth')) {
				$cookies.put("soajs_auth", response.soajsauth);
			}
			var resp = {};
			for (var i in response) {
				resp[i] = response[i];
			}

			if (typeof(resp.data) !== 'object') {
				resp.data = {};
			}
			resp.data.soajsauth = resp.soajsauth;
			return cb(null, resp.data);
		}
		else {
			// if (response.errors.codes[0] === 132) {
			// 	$cookies.remove('soajs_auth');
			// 	$localStorage.acl_access = null;
			// 	scope.$parent.enableInterface = false;
			// 	scope.$parent.isUserLoggedIn();
			// 	scope.$parent.go("/login");
			// }

			var str = '';
			for (var i = 0; i < response.errors.details.length; i++) {
				str += "Error[" + response.errors.details[i].code + "]: " + response.errors.details[i].message;
			}
			var errorObj = {
				message: str,
				codes: response.errors.codes,
				details: response.errors.details
			};
			if (response.errors.codes && response.errors.codes[0]) {
				errorObj.code = response.errors.codes[0];
			}
			return cb(errorObj);
		}
	}

	function executeRequest(scope, opts, cb) {
		var config = {
			url: opts.url,
			method: opts.method,
			params: opts.params || {},
			xsrfCookieName: opts.cookie || "",
			cache: opts.cache || false,
			timeout: opts.timeout || 60000,
			responseType: opts.responseType || 'json',
			headers: opts.headers || {},
			data: opts.data || {},
			json: true
		};

		if (opts.proxy) {
			config.params['__envauth'] = $cookies.getObject('soajs_envauth')[$cookies.getObject('myEnv').code.toLowerCase().replace(/\"/g, '')];
		}

		var soajsAuthCookie = $cookies.get('soajs_auth');
		if (soajsAuthCookie && soajsAuthCookie.indexOf("Basic ") !== -1) {
			config.headers.soajsauth = soajsAuthCookie.replace(/\"/g, '');
		}

		if (opts.headers.key) {
			config.headers.key = opts.headers.key;
		}
		else if ($cookies.get("soajs_dashboard_key")) {
			config.headers.key = $cookies.get("soajs_dashboard_key").replace(/\"/g, '');
		}
		else {
			config.headers.key = apiConfiguration.key;
		}

		if (opts.proxy) {
			if (!config.params.__env || !config.params.__envauth) {
				var envauth = $cookies.get('soajs_envauth').replace(/\"/g, '');
				var env = $cookies.getObject('myEnv').code.replace(/\"/g, '');
				config.params.__envauth = envauth[env.toLowerCase()];
				config.params.__env = env.toUpperCase();
			}
		}

		if (opts.jsonp === true) {
			config.url += (config.url.indexOf('?') === -1) ? '?' : '&';
			config.url += "callback=JSON_CALLBACK";
			config.method = (config.method.toLowerCase() === 'get') ? 'jsonp' : config.method;
		}

		$http(config).success(function (response, status, headers, config) {
			returnAPIResponse(scope, response, config, cb);
		}).error(function (errData, status, headers, config) {
			returnAPIError(scope, opts, status, headers, config, cb);
		});
	}

	function getData(scope, opts, cb) {
		opts.method = 'GET';
		opts.api = 'getData';
		executeRequest(scope, opts, cb);
	}

	function sendData(scope, opts, cb) {
		opts.method = 'POST';
		opts.api = 'sendData';
		executeRequest(scope, opts, cb);
	}

	return {
		'get': getData,
		'send': sendData
	};
}]);

soajsApp.service('isUserLoggedIn', ['$cookies', '$localStorage', function ($cookies, $localStorage) {
	return function () {
		if ($localStorage.soajs_user && $cookies.get('soajs_auth')) {
			return true;
		}
		else {
			$cookies.remove('soajs_auth');
			$localStorage.soajs_user = null;
			return false;
		}
	}
}]);

soajsApp.service('checkApiHasAccess', function () {

	return function (aclObject, serviceName, routePath, userGroups, callback) {
		var environments = Object.keys(aclObject);
		return validateAccess(environments, 0, callback);

		function validateAccess(environments, i, cb) {
			var envCode = environments[i].toLowerCase();
			if (!aclObject[envCode] || !aclObject[envCode][serviceName]) {
				i++;
				if (i === environments.length) {
					return cb(false);
				}
				else {
					validateAccess(environments, i, cb);
				}
			}
			else {
				var system = aclObject[envCode][serviceName];
				var access = checkSystem(system) || false;
				return cb(access);
			}
		}

		function checkSystem(system) {
			var api = (system && system.apis ? system.apis[routePath] : null);

			if (!api && system && system.apisRegExp && Object.keys(system.apisRegExp).length) {
				for (var jj = 0; jj < system.apisRegExp.length; jj++) {
					if (system.apisRegExp[jj].regExp && routePath.match(system.apisRegExp[jj].regExp)) {
						api = system.apisRegExp[jj];
						break;
					}
				}
			}
			if (system && system.access) {
				if (Array.isArray(system.access)) {
					var checkAPI = false;
					if (userGroups) {
						for (var ii = 0; ii < userGroups.length; ii++) {
							if (system.access.indexOf(userGroups[ii]) !== -1) {
								checkAPI = true;
								break;
							}
						}
					}
					if (!checkAPI) {
						return false;
					}
				}
				return api_checkPermission(system, userGroups, api);
			}

			if (api || (system && (system.apisPermission === 'restricted'))) {
				return api_checkPermission(system, userGroups, api);
			}
			else {
				return true;
			}
		}

		function api_checkPermission(system, userGroups, api) {
			if ('restricted' === system.apisPermission) {
				if (!api) {
					return false;
				}
				return api_checkAccess(api.access, userGroups);
			}
			if (!api) {
				return true;
			}

			return api_checkAccess(api.access, userGroups);
		}

		function api_checkAccess(apiAccess, userGroups) {
			if (!apiAccess) {
				return true;
			}

			if (apiAccess instanceof Array) {
				if (!userGroups) {
					return false;
				}

				var found = false;
				for (var ii = 0; ii < userGroups.length; ii++) {
					if (apiAccess.indexOf(userGroups[ii]) !== -1) {
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
});

soajsApp.service("injectFiles", function () {

	function injectCss(filePath) {
		var csstag = "<link rel='stylesheet' type='text/css' href='" + filePath + "' />";
		jQuery("head").append(csstag);
	}

	return {
		'injectCss': injectCss
	}
});