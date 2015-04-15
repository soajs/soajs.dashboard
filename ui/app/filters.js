"use strict";
soajsApp.filter('filterPicker', function($filter) {
	return function(value, filterName) {
		return $filter(filterName)(value);
	}
});

soajsApp.filter('TTL', function() {
	return function(value) {
		//check if value is in milliseconds
		value = value / 3600;
		if(value.toString().length > 3) { //why ??
			value = value / 1000;
		}
		return value;
	}
});

soajsApp.filter('toTrustedHtml', ['$sce', function($sce) {
	return function(text) {
		return $sce.trustAsHtml(text);
	};
}]);

soajsApp.filter('trimmed', function() {
	return function(value) {
		if(value.length > 170) {
			value = value.slice(0, 170) + " ...";
		}
		return value;
	};
});
soajsApp.filter('trimmed100', function() {
	return function(value) {
		if(value.length > 100) {
			value = value.slice(0, 100) + " ...";
		}
		return value;
	};
});