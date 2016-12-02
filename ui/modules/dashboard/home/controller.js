"use strict";
var dahsboardApp = soajsApp.components;
dahsboardApp.controller('dahsboardCtrl', ['$scope','injectFiles', function($scope, injectFiles) {
	$scope.$parent.isUserLoggedIn(true);
	injectFiles.injectCss('modules/dashboard/home/home.css');
}]);

dahsboardApp.controller('helpPageCtrl', ['$scope', function($scope) {
	$scope.$parent.isUserLoggedIn(true);
}]);

dahsboardApp.controller('noEnvCtrl', ['$scope', 'injectFiles', function($scope, injectFiles) {
	$scope.$parent.isUserLoggedIn(true);
	$scope.gotoEnv = function(){
		$scope.$parent.go("#/environments");
	};
	injectFiles.injectCss('modules/dashboard/home/home.css');
}]);