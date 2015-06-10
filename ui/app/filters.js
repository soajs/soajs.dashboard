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

soajsApp.filter('fulldate', function() {
	return function(text) {
		if(!text) { return ''; }
		return new Date(text).toISOString();
	};
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

soajsApp.filter('label', function() {
	return function(value) {
		return value.replace(/([A-Z])/g, ' $1').replace(/^./, function(str) { return str.toUpperCase(); });
	};
});

soajsApp.filter('object', ['$sce', function($sce) {
	function stringifyCamelNotation(value) {
		return value.replace(/([A-Z])/g, ' $1').replace(/^./, function(str) { return str.toUpperCase(); });
	}

	function iterateAndPrintObj(obj) {
		var string = '';
		for(var i in obj) {
			if(obj.hasOwnProperty(i)) {
				if(Array.isArray(obj[i])) {
					string += "<b>" + stringifyCamelNotation(i) + "</b>:&nbsp;";
					var t = [];
					for(var e = 0; e < obj[i].length; e++) {
						if(typeof(obj[i][e]) === 'object') {
							t.push('<span class="noWrap">' + iterateAndPrintObj(obj[i][e]).replace(/<br \/>/g, " ") + '</span>');
						}
						else {
							t.push(obj[i][e]);
						}
					}
					string += t + "<br />";
				}
				else if(typeof(obj[i]) === 'object') {
					string += iterateAndPrintObj(obj[i]);
				}
				else {
					string += "<b>" + stringifyCamelNotation(i) + "</b>:&nbsp;" + obj[i] + "<br />";
				}
			}
		}
		return string;
	}

	return function(obj) {
		if(typeof(obj) === 'object') {
			var txt = iterateAndPrintObj(obj);
			return $sce.trustAsHtml(txt);
		}
		else {
			return obj;
		}
	};
}]);

function highlightMyCode() {
	hljs.configure({"tabReplace": "    "});
	jQuery('pre code').each(function(i, block) {
		var parentId = jQuery(block).parent().attr('id');
		hljs.highlightBlock(block);
	});
}