"use strict";

var environmentsApp = soajsApp.components;

environmentsApp.controller('databaseCtrl', ['$scope','$cookies', 'envDB', 'injectFiles', function ($scope, $cookies, envDB, injectFiles) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);

	$scope.listDatabases = function (env) {
		envDB.listDatabases($scope, env);
	};

	$scope.removeDatabase = function (env, name) {
		envDB.removeDatabase($scope, env, name);
	};

	$scope.addDatabase = function (env, session) {
		envDB.addDatabase($scope, env, session);
	};

	$scope.editDatabase = function (env, name, data) {
		envDB.editDatabase($scope, env, name, data);
	};

	$scope.updateDbPrefix = function (env, prefix) {
		envDB.updateDbPrefix($scope, env, prefix);
	};

	//default operation
	if ($scope.access.dbs.list) {
		$scope.envCode = $cookies.getObject("myEnv").code;
		$scope.listDatabases($scope.envCode);
	}
	injectFiles.injectCss('modules/dashboard/environments/environments.css');
}]);