"use strict";
soajsApp.filter('filterPicker', function ($filter) {
	return function (value, filterName) {
		if (Array.isArray(filterName) && filterName.length === 0) {
			return value;
		}
		return $filter(filterName)(value);
	}
});

soajsApp.filter('TTL', function () {
	return function (value) {
		//check if value is in milliseconds
		value = value / 3600;
		if (value.toString().length > 3) { //why ??
			value = value / 1000;
		}
		return value;
	}
});

soajsApp.filter('prettyLocalDate', function () {
	return function (text) {
		if (!text) {
			return '';
		}
		return new Date(text).toLocaleString();
	};
});

soajsApp.filter('fulldate', function () {
	return function (text) {
		if (!text) {
			return '';
		}
		return new Date(text).toISOString();
	};
});

soajsApp.filter('toTrustedSrc', ['$sce', function ($sce) {
	return function (src) {
		return $sce.trustAsResourceUrl(src);
	};
}]);

soajsApp.filter('toTrustedHtml', ['$sce', function ($sce) {
	return function (text) {
		return $sce.trustAsHtml(text);
	};
}]);

soajsApp.filter('trimmed', ['$sce', function ($sce) {
	function hed(text) {
		return text.replace(/(<([^>]+)>)/ig, "").toString();
	}

	return function (value) {
		value = hed(value);
		if (value.length > 170) {
			value = value.slice(0, 170) + " ...";
		}
		return value;
	};
}]);

soajsApp.filter('trimmed100', ['$sce', function ($sce) {

	function hed(text) {
		return text.replace(/(<([^>]+)>)/ig, "").toString();
	}

	return function (value) {
		value = hed(value);
		if (value.length > 100) {
			value = value.slice(0, 100) + " ...";
		}
		return value;
	};
}]);

soajsApp.filter('label', function () {
	return function (value) {
		return value.replace(/([A-Z])/g, ' $1').replace(/^./, function (str) {
			return str.toUpperCase();
		});
	};
});

soajsApp.filter('object', ['$sce', function ($sce) {
	function stringifyCamelNotation(value) {
		if (translation[value] && translation[value][LANG]) {
			return translation[value][LANG];
		}
		return value.replace(/([A-Z])/g, ' $1').replace(/^./, function (str) {
			return str.toUpperCase();
		});
	}

	function iterateAndPrintObj(obj) {
		var string = '';
		for (var i in obj) {
			if (obj.hasOwnProperty(i)) {
				if (Array.isArray(obj[i])) {
					string += "<b>" + stringifyCamelNotation(i) + "</b>: <br/>";
					var t = [];
					for (var e = 0; e < obj[i].length; e++) {
						if (typeof(obj[i][e]) === 'object') {
							if (e === 0) {
								t.push('<span class="noWrap"> &nbsp; ' + iterateAndPrintObj(obj[i][e]).replace(/<br \/>/g, " ") + '</span>');
							}
							else {
								t.push('<br/><span class="noWrap"> &nbsp; ' + iterateAndPrintObj(obj[i][e]).replace(/<br \/>/g, " ") + '</span>');
							}
						}
						else {
							t.push(obj[i][e]);
						}
					}
					string += t + "<br />";
				}
				else if (typeof(obj[i]) === 'object') {
					string += iterateAndPrintObj(obj[i]);
					//string += (obj[i]);
				}
				else {
					if (i !== '$$hashKey') {
						string += "<b>" + stringifyCamelNotation(i) + "</b>:&nbsp;" + obj[i] + "<br />";
					}
				}
			}
		}
		return string;
	}

	return function (obj) {
		if (typeof(obj) === 'object') {
			var txt = iterateAndPrintObj(obj);
			return $sce.trustAsHtml(txt);
		}
		else {
			return obj;
		}
	};

}]);

soajsApp.filter('range', function () {
	return function (input, total) {
		total = parseInt(total);
		for (var i = 0; i < total; i++)
			input.push(i);
		return input;
	};
});

soajsApp.filter('tel', function () {
	return function (tel) {
		if (!tel) {
			return '';
		}

		var value = tel.toString().trim().replace(/^\+/, '');

		if (value.match(/[^0-9]/)) {
			return tel;
		}

		var country, city, number;

		switch (value.length) {
			case 1:
			case 2:
			case 3:
				city = value;
				break;

			default:
				city = value.slice(0, 3);
				number = value.slice(3);
		}

		if (number) {
			if (number.length > 3) {
				number = number.slice(0, 3) + '-' + number.slice(3, 7);
			}
			else {
				number = number;
			}

			return ("(" + city + ") " + number).trim();
		}
		else {
			return "(" + city;
		}

	};
});


soajsApp.filter('translateFields', [function () {
	return function (value, lang) {
		if (typeof(value) === 'undefined') {
			return '';
		}
		if (!lang) {
			lang = LANG;
		}
		if (lang) {
			if (translation[value] && translation[value][lang]) {
				return translation[value][lang];
			}
		}
		return value;
	}
}]);

function highlightMyCode() {
	hljs.configure({"tabReplace": "    "});
	jQuery('pre code').each(function (i, block) {
		hljs.highlightBlock(block);
	});
}