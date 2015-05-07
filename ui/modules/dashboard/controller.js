"use strict";
var configDashbrd = {
		'grid': {
			'tenants': {
				search: false,
				recordsPerPageArray: [5, 10, 50, 100],
				'columns': [
					{'label': 'Code', 'field': 'code'},
					{'label': 'Name', 'field': 'name'},
					{'label': 'Description', 'field': 'description'}
				],
				'leftActions': [],
				'topActions': [],
				'defaultSortField': 'code',
				'defaultLimit': 5
			},
			'environments': {
				search: false,
				recordsPerPageArray: [5, 10, 50, 100],
				columns: [
					{label: 'Code', field: 'code'},
					{label: 'Description', field: 'description'},
					{label: 'IPs', field: 'ips'}
				],
				leftActions: [],
				topActions: [],
				'defaultSortField': '',
				'defaultLimit': 5
			
			},
			'products': {
				search: false,
				recordsPerPageArray: [5, 10, 50, 100],
				'columns': [
					{'label': 'Code', 'field': 'code'},
					{'label': 'Name', 'field': 'name'},
					{'label': 'Description', 'field': 'description'} 
				],
				'leftActions': [],
				'topActions': [],
				'defaultSortField': 'code',
				'defaultLimit': 5
			
			}
		},
		'form': {},
		'permissions':{
			'environment': ['dashboard', '/environment/list'],
			'tenant': ['dashboard', '/tenant/list'],
			'product': ['dashboard', '/product/list']
		}
	};

var dahsboardApp = soajsApp.components;
dahsboardApp.controller('dahsboardCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', function($scope, $timeout, $modal, ngDataApi) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, configDashbrd.permissions);
}]);

dahsboardApp.controller('tenantsCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', function($scope, $timeout, $modal, ngDataApi) {
	$scope.listTenants = function() {
		getSendDataFromServer(ngDataApi, {
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
		getSendDataFromServer(ngDataApi, {
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
		getSendDataFromServer(ngDataApi, {
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


dahsboardApp.controller('helpPageCtrl', ['$scope', 'ngDataApi', function($scope, ngDataApi) {
	$scope.$parent.isUserLoggedIn(true);
}]);