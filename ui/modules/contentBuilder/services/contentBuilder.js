"use strict";
var contentBuilderService = soajsApp.components;
contentBuilderService.service('cbHelper', ['ngDataApi', '$timeout', '$modal', function(ngDataApi, $timeout, $modal) {

	function listEntries(currentScope, moduleConfig, callback) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": (callback && typeof(callback) === 'function') ? "/dashboard/cb/listRevisions" : "/dashboard/cb/list",
			"params": {}
		}, function(error, response) {
			if(error) {
				currentScope.$parent.displayAlert("danger", error.message);
			}
			else {
				if(callback && typeof(callback) === 'function') {
					return callback(response);
				}
				else {
					printEntries(currentScope, response, moduleConfig.grid.active);
				}
			}
		});
	}

	function printEntries(currentScope, response, grid, viewOnly) {
		var options = {
			data: response,
			grid: grid,
			defaultSortField: grid.defaultSortField,
			left: [],
			top: []
		};

		if(currentScope.access.getService) {
			options.left.push({
				'label': 'View',
				'icon': 'search',
				'handler': 'viewService'
			});
		}

		if(currentScope.access.updateService && !viewOnly) {
			options.left.push({
				'label': 'Edit',
				'icon': 'pencil2',
				'handler': 'editService'
			});
		}
		buildGrid(currentScope, options);
	}

	return {
		'listEntries': listEntries,
		'printEntries': printEntries
	}
}]);