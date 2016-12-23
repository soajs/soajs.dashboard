"use strict";
var dahsboardApp = soajsApp.components;
dahsboardApp.controller('dahsboardCtrl', ['$scope', 'injectFiles', function ($scope, injectFiles) {
	$scope.$parent.isUserLoggedIn();
	injectFiles.injectCss('modules/dashboard/home/home.css');
}]);

dahsboardApp.controller('helpPageCtrl', ['$scope', function ($scope) {
	$scope.$parent.isUserLoggedIn(true);
}]);

dahsboardApp.controller('noEnvCtrl', ['$scope', 'injectFiles', function ($scope, injectFiles) {
	$scope.$parent.isUserLoggedIn();
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, configDashbrd.permissions);
	
	$scope.gotoEnv = function () {
		$scope.$parent.go("#/environments");
	};
	$scope.$parent.reRenderMenu('deployment');
	injectFiles.injectCss('modules/dashboard/home/home.css');
}]);