"use strict";

var environmentsApp = soajsApp.components;
environmentsApp.controller('hostsCtrl', ['$scope', '$cookieStore', '$timeout', 'envHosts', 'deploySrv', function ($scope, $cookieStore, $timeout,  envHosts, deploySrv) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);

	$scope.waitMessage = {
		type: "",
		message: "",
		close: function () {
			$scope.waitMessage.message = '';
			$scope.waitMessage.type = '';
		}
	};

	$scope.generateNewMsg = function (env, type, msg) {
		$scope.waitMessage.type = type;
		$scope.waitMessage.message = msg;
		$timeout(function () {
			$scope.waitMessage.close();
		}, 7000);
	};

	$scope.closeWaitMessage = function (context) {
		if (!context) {
			context = $scope;
		}
		context.waitMessage.message = '';
		context.waitMessage.type = '';
	};

	$scope.deployEnvironment = function (envCode) {
		deploySrv.deployEnvironment($scope, envCode);
	};

	$scope.listHosts = function (env, noPopulate) {
		$scope.waitMessage.close();
		envHosts.listHosts($scope, env, noPopulate);
	};

	$scope.executeHeartbeatTest = function (env, oneHost) {
		envHosts.executeHeartbeatTest($scope, env, oneHost);
	};

	$scope.executeAwarenessTest = function (env, oneHost) {
		envHosts.executeAwarenessTest($scope, env, oneHost);
	};

	$scope.reloadRegistry = function (env, oneHost, cb) {
		envHosts.reloadRegistry($scope, env, oneHost, cb);
	};

	$scope.loadProvisioning = function (env, oneHost) {
		envHosts.loadProvisioning($scope, env, oneHost);
	};

	$scope.loadDaemonStats = function (env, oneHost) {
		envHosts.loadDaemonStats($scope, env, oneHost);
	};

	$scope.removeHost = function (env, serviceName, oneHost) {
		envHosts.removeHost($scope, env, serviceName, oneHost);
	};

	$scope.stopHost = function (env, serviceName, oneHost, serviceInfo) {
		envHosts.stopHost($scope, env, serviceName, oneHost, serviceInfo);
	};

	$scope.startHost = function (env, serviceName, oneHost, serviceInfo) {
		envHosts.startHost($scope, env, serviceName, oneHost, serviceInfo);
	};

	$scope.hostLogs = function (env, serviceName, oneHost, serviceInfo) {
		envHosts.hostLogs($scope, env, serviceName, oneHost, serviceInfo);
	};

	$scope.infoHost = function (env, serviceName, oneHost, serviceInfo) {
		envHosts.infoHost($scope, env, serviceName, oneHost, serviceInfo);
	};

	$scope.createHost = function (env, services) {
		envHosts.createHost($scope, env, services);
	};

	if ($scope.access.listHosts) {
		$scope.envCode = $cookieStore.get("myEnv").code;
		$scope.listHosts($scope.envCode);
	}
}]);

