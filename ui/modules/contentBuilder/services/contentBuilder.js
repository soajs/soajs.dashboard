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

	function viewEntry(currentScope, params) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/cb/get",
			"params": params
		}, function(error, response) {
			if(error) {
				currentScope.$parent.displayAlert("danger", error.message);
			}
			else {
				$modal.open({
					templateUrl: "serviceInfoBox.html",
					size: 'lg',
					backdrop: true,
					keyboard: true,
					controller: function($scope, $modalInstance) {
						$scope.data = response;
						$scope.twoCols = {col1: [], col2: []};
						var count = 0;
						for(var i in $scope.data.genericService.config.schema.commonFields) {
							count++;
							if(count % 2 === 0) {
								$scope.twoCols.col2.push({'l': i, 'v': $scope.data.genericService.config.schema.commonFields[i]});
							}
							else {
								$scope.twoCols.col1.push({'l': i, 'v': $scope.data.genericService.config.schema.commonFields[i]});
							}
						}

						if(Object.keys($scope.data.soajsService.db.config).length === 0) {
							delete $scope.data.soajsService.db.config;
						}

						for(var api in $scope.data.soajsService.apis) {
							if($scope.data.soajsService.apis.hasOwnProperty(api)) {
								for(var stepName in $scope.data.soajsService.apis[api].workflow) {
									if($scope.data.soajsService.apis[api].workflow.hasOwnProperty(stepName)) {
										$scope.data.soajsService.apis[api].workflow[stepName] = $scope.data.soajsService.apis[api].workflow[stepName].replace(/\\n/g,"<br />");
									}
								}
							}
						}
						for(var i =0; i< $scope.data.soajsUI.form.add.length; i++){
							$scope.data.soajsUI.form.add[i].print = JSON.stringify($scope.data.soajsUI.form.add[i], null, 2);
						}

						for(var i =0; i< $scope.data.soajsUI.form.update.length; i++){
							$scope.data.soajsUI.form.update[i].print = JSON.stringify($scope.data.soajsUI.form.update[i], null, 2);
						}

						setTimeout(function() {highlightMyCode()}, 500);
						$scope.ok = function() {
							$modalInstance.dismiss('ok');
						};
					}
				});
			}
		});
	}

	return {
		'listEntries': listEntries,
		'printEntries': printEntries,
		'viewEntry': viewEntry
	}
}]);