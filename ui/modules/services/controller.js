"use strict";
var servicesApp = soajsApp.components;
servicesApp.controller('servicesCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', function($scope, $timeout, $modal, ngDataApi) {
	$scope.$parent.isUserLoggedIn();

	$scope.listServices = function() {
		getSendDataFromServer(ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/services/list"
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				console.log(response);
				$scope.grid = {
					rows: response
				};
			}
		});
	};

	$scope.listServices();
}]);