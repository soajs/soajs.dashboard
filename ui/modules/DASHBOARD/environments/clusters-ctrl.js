"use strict";

var environmentsApp = soajsApp.components;
environmentsApp.controller('clustersCtrl', ['$scope', '$cookies', 'envClusters', function ($scope, $cookies, envClusters) {

	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);

	$scope.listClusters = function (env) {
		envClusters.listClusters($scope, env);
	};

	$scope.addCluster = function (env) {
		envClusters.addCluster($scope, env);
	};

	$scope.editCluster = function (env, name, data) {
		envClusters.editCluster($scope, env, name, data);
	};

	$scope.removeCluster = function (env, name) {
		envClusters.removeCluster($scope, env, name);
	};

	//default operation
	if ($scope.access.clusters.list) {
		$scope.envCode = $cookies.getObject("myEnv").code;
		$scope.listClusters($scope.envCode);
	}
}]);