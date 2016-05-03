"use strict";
var dahsboardApp = soajsApp.components;
dahsboardApp.controller('dahsboardCtrl', ['$scope','injectFiles', function($scope, injectFiles) {
	$scope.$parent.isUserLoggedIn(true);

	//$scope.access = {};
	//constructModulePermissions($scope, $scope.access, configDashbrd.permissions);

	injectFiles.injectCss('modules/DASHBOARD/home/home.css');
}]);

dahsboardApp.controller('helpPageCtrl', ['$scope', function($scope) {
	$scope.$parent.isUserLoggedIn(true);
	// $scope.access = {};
	// constructModulePermissions($scope, $scope.access, configDashbrd.permissions);
}]);