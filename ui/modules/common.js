"use strict";

function checkApiHasAccess($scope, serviceName, routePath){

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

