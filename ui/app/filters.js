"use strict";
soajsApp.filter('filterPicker', function($filter) {
	return function(value, filterName) {
		return $filter(filterName)(value);
	}
});

soajsApp.filter('TTL', function() { return function(value) { return value / 3600; } });

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