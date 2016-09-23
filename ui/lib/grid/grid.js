"use strict";
var gridId = 1;
function getRandomString(len, charSet) {
	charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	var randomString = '';
	for (var i = 0; i < len; i++) {
		var randomPoz = Math.floor(Math.random() * charSet.length);
		randomString += charSet.substring(randomPoz, randomPoz + 1);
	}
	return randomString;
}

function buildGrid($scope, opts) {
	var gridConfig = opts.grid;
	gridConfig.defaultSortField = opts.defaultSortField || opts.grid.defaultSortField;
	gridConfig.defaultSortASC = opts.defaultSortASC || opts.grid.defaultSortASC;
	gridConfig.rows = opts.data;
	if (opts.gridId) {
		gridConfig.gridId = opts.gridId;
	}
	if (opts.left) {
		gridConfig.leftActions = [];
		opts.left.forEach(function (oneLeftAction) {
			gridConfig.leftActions.push({
				'label': oneLeftAction.label,
				'icon': oneLeftAction.icon,
				'commandMsg': oneLeftAction.msg || null,
				'command': function (row) {
					$scope[oneLeftAction.handler](row);
				}
			});
		});
	}
	if (opts.top) {
		gridConfig.topActions = [];
		opts.top.forEach(function (oneTopAction) {
			gridConfig.topActions.push({
				'label': oneTopAction.label,
				'commandMsg': oneTopAction.msg || null,
				'command': function (row) {
					$scope[oneTopAction.handler](row);
				}
			});
		});
	}
	if (opts.apiNavigation) {
		if (opts.grid.navigation.firsCall) {
			opts.grid.navigation.showNext = (opts.grid.navigation.totalCount > opts.grid.navigation.endLimit);
			opts.grid.navigation.pageActive = 1;
		}
		else {
			opts.grid.navigation.pageActive = (opts.grid.navigation.startLimit / opts.grid.navigation.endLimit) + 1;
			var nextLimit = opts.grid.navigation.startLimit + opts.grid.navigation.endLimit;
			if (opts.grid.navigation.totalCount <= nextLimit) {
				opts.grid.navigation.showNext = false;
			}
			else {
				opts.grid.navigation.showNext = true;
			}
		}
		
		gridConfig.apiNavigation = {};
		
		if (opts.apiNavigation.previous) {
			gridConfig.apiNavigation.previous = {
				'label': opts.apiNavigation.previous.label,
				'commandMsg': opts.apiNavigation.previous.msg || null,
				'command': function () {
					opts.grid.navigation.startLimit = opts.grid.navigation.startLimit - opts.grid.navigation.endLimit;
					if (0 <= opts.grid.navigation.startLimit) {
						$scope[opts.apiNavigation.previous.handler](opts.grid.navigation.startLimit);
						opts.grid.navigation.showNext = true;
						opts.grid.navigation.pageActive--;
					}
					else {
						opts.grid.navigation.pageActive = 1;
						opts.grid.navigation.startLimit = 0;
					}
				}
			};
		}
		if (opts.apiNavigation.next) {
			gridConfig.apiNavigation.next = {
				'label': opts.apiNavigation.next.label,
				'commandMsg': opts.apiNavigation.next.msg || null,
				'command': function () {
					var startLimit = opts.grid.navigation.startLimit + opts.grid.navigation.endLimit;
					if (startLimit < opts.grid.navigation.totalCount) {
						opts.grid.navigation.startLimit = startLimit;
						$scope[opts.apiNavigation.next.handler](startLimit);
						opts.grid.navigation.pageActive++;
					}
					else {
						opts.grid.navigation.showNext = false;
					}
				}
			};
		}
		if (opts.apiNavigation.last) {
			gridConfig.apiNavigation.last = {
				'label': opts.apiNavigation.last.label,
				'commandMsg': opts.apiNavigation.last.msg || null,
				'command': function () {
					var startLimit = (opts.grid.navigation.totalPagesActive - 1) * opts.grid.navigation.endLimit;
					if (startLimit < opts.grid.navigation.totalCount) {
						opts.grid.navigation.startLimit = startLimit;
						$scope[opts.apiNavigation.last.handler](startLimit);
						opts.grid.navigation.pageActive = opts.grid.navigation.totalPagesActive;
					}
					else {
						opts.grid.navigation.showNext = false;
					}
				}
			};
		}
	}
	constructGrid($scope, gridConfig);
	
	function constructGrid(context, configuration) {
		
		context.grid = {
			//thisGridId: gridId,
			navigation: configuration.navigation,
			themeToUse: themeToUse,
			columns: configuration.columns,
			topActions: configuration.topActions,
			apiNavigation: configuration.apiNavigation,
			leftActions: configuration.leftActions,
			original: configuration.rows,
			rows: configuration.rows,
			sortField: configuration.defaultSortField,
			reverse: configuration.defaultSortASC || false,
			recordsPerPageArray: configuration.recordsPerPageArray,
			search: (configuration.search === false) ? false : true
		};
		
		calculateRange(1, configuration.defaultLimit);
		
		context.$watch('grid.currentPage + grid.numPerPage', function () {
			calculateRange(context.grid.currentPage);
		});
		
		context.grid.changeSort = function (newValue) {
			context.grid.sortField = newValue;
			context.grid.reverse = !context.grid.reverse;
		};
		
		context.grid.changeLimitTo = function (newLimit) {
			calculateRange(context.grid.currentPage, newLimit);
		};
		
		context.grid.filterData = function (query) {
			if (query && query !== '' && query.length >= 3) {
				var filtered = [];
				for (var i = 0; i < context.grid.rows.length; i++) {
					for (var j = 0; j < context.grid.columns.length; j++) {
						if (context.grid.rows[i][context.grid.columns[j].field] && typeof(context.grid.rows[i][context.grid.columns[j].field]) == 'string') {
							if (context.grid.rows[i][context.grid.columns[j].field].toLowerCase().indexOf(query.toLowerCase()) !== -1) {
								filtered.push(context.grid.rows[i]);
								break;
							}
						}
					}
				}
				context.grid.rows = filtered;
			}
			else {
				context.grid.rows = context.grid.original;
			}
			calculateRange(context.grid.currentPage, context.grid.actualLimit);
			return query;
		};
		
		context.grid.selectAll = function () {
			angular.forEach(context.grid.filteredRows, function (item) {
				item.selected = true;
			});
		};
		
		context.grid.selectNone = function () {
			angular.forEach(context.grid.filteredRows, function (item) {
				item.selected = false;
			});
		};
		
		function calculateRange(currentPage, limit) {
			if (limit) {
				context.grid.actualLimit = limit;
			}
			
			context.grid.currentPage = currentPage;
			context.grid.itemsPerPage = (context.grid.rows.length >= context.grid.actualLimit) ? context.grid.actualLimit : context.grid.rows.length;
			context.grid.range = {
				begin: (context.grid.currentPage - 1) * context.grid.itemsPerPage,
				end: context.grid.itemsPerPage,
				lower: (context.grid.currentPage * context.grid.itemsPerPage) - context.grid.itemsPerPage,
				upper: context.grid.itemsPerPage
			};
			context.grid.range.upper += context.grid.range.lower;
			context.grid.range.end += context.grid.range.begin;
			
			context.grid.filteredRows = context.grid.rows.slice(context.grid.range.begin, context.grid.range.end);
			context.grid.totalPages = Math.ceil(context.grid.rows.length / context.grid.itemsPerPage);
			context.grid.maxPageSize = context.grid.rows.length / context.grid.filteredRows.length;
			context.grid.maxPageSize = (context.grid.maxPageSize > context.grid.totalPages) ? context.grid.totalPages : 3;
		}
	}
}

soajsApp.directive('nglist', function () {
	return {
		restrict: 'E',
		templateUrl: 'lib/grid/grid.tmpl',
		controllerAs: 'myGrid',
		controller: function ($scope) {
		}
	};
});