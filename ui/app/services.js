"use strict";

soajsApp.service('ngDataApi', ['$http', '$cookieStore', '$localStorage', function($http, $cookieStore, $localStorage) {

	function returnAPIError(scope, opts, status, headers, config, cb) {
		console.log("Error: ngDataApi->" + opts.api);
		console.log(status, headers, config);
		return cb(new Error("Unable Fetching data from " + config.url));
	}

	function returnAPIResponse(scope, response, cb) {
		if(response && response.result === true) {
			if(response.soajsauth && $cookieStore.get('soajs_auth')) {
				$cookieStore.put("soajs_auth", response.soajsauth);
			}
			var resp = {};
			for(var i in response){
				resp[i] = response[i];
			}

			if(typeof(resp.data)!== 'object'){
				resp.data = {};
			}
			resp.data.soajsauth = resp.soajsauth;
			return cb(null, resp.data);
		}
		else {
			if(response.errors.codes[0] === 132){
				$cookieStore.remove('soajs_auth');
				$cookieStore.remove('soajs_user');
				$localStorage.acl_access = null;
				scope.$parent.enableInterface = false;
				scope.$parent.isUserLoggedIn();
				scope.$parent.go("/login");
			}

			var str = '';
			for(var i = 0; i < response.errors.details.length; i++) {
				str += "Error[" + response.errors.details[i].code + "]: " + response.errors.details[i].message;
			}
			return cb(new Error(str));
		}
	}

	function executeRequest(scope, opts, cb) {
		var config = {
			url: opts.url,
			method: opts.method,
			params:         opts.params || '',
			xsrfCookieName: opts.cookie || "",
			cache:          opts.cache || false,
			timeout:        opts.timeout || 60000,
			responseType:   opts.responseType || 'json',
			headers:        opts.headers || {},
			data:           opts.data || {},
			json: true
		};

		var soajsAuthCookie = $cookieStore.get('soajs_auth');
		if(soajsAuthCookie && soajsAuthCookie.indexOf("Basic ") !== -1) {
			config.headers.soajsauth = soajsAuthCookie;
		}

		if(opts.jsonp === true) {
			config.url += (config.url.indexOf('?') === -1) ? '?' : '&';
			config.url += "callback=JSON_CALLBACK";
			config.method = (config.method.toLowerCase() === 'get') ? 'jsonp' : config.method;
		}

		$http(config).success(function(response, status, headers, config) {
			returnAPIResponse(scope, response, cb);
		}).error(function(errData, status, headers, config) {
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

soajsApp.service('isUserLoggedIn', ['$cookieStore', function($cookieStore){
	return function(){
		if($cookieStore.get('soajs_user') && $cookieStore.get('soajs_auth')){
			return true;
		}
		else{
			$cookieStore.remove('soajs_auth');
			$cookieStore.remove('soajs_user');
			return false;
		}
	}
}]);