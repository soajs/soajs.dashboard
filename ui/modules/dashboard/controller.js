"use strict";
var dahsboardApp = soajsApp.components;
dahsboardApp.controller('dahsboardCtrl', ['$scope', '$timeout', 'ngDataApi', function($scope, $timeout, ngDataApi) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, configDashbrd.permissions);
}]);

dahsboardApp.controller('tenantsCtrl', ['$scope', '$timeout', 'ngDataApi', function($scope, $timeout, ngDataApi) {
	$scope.listTenants = function() {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/tenant/list"
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				var options = {
					grid: configDashbrd.grid.tenants,
					data: response,
					//defaultSortField: 'product',
					left: [],
					top: []
				};
				buildGrid($scope, options);
			}
		});
	};

	$scope.listTenants();
}]);

dahsboardApp.controller('productsCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', function($scope, $timeout, $modal, ngDataApi) {
	$scope.list = function() {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/product/list"
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				var options = {
					grid: configDashbrd.grid.products,
					data: response
				};
				buildGrid($scope, options);
			}
		});
	};
	$scope.list();
}]);

dahsboardApp.controller('environmentsCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', function($scope, $timeout, $modal, ngDataApi) {
	$scope.list = function() {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment/list"
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				var options = {
					grid: configDashbrd.grid.environments,
					data: response
				};
				buildGrid($scope, options);
			}
		});
	};
	$scope.list();
}]);


dahsboardApp.controller('helpPageCtrl', ['$scope', function($scope) {
	$scope.$parent.isUserLoggedIn(true);
}]);