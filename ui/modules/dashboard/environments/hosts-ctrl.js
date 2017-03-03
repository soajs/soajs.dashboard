"use strict";

var environmentsApp = soajsApp.components;
environmentsApp.controller('hostsCtrl', ['$scope', '$cookies', '$timeout', 'envHosts', 'injectFiles', function ($scope, $cookies, $timeout, envHosts, injectFiles) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);

	$scope.groups = {};

	$scope.waitMessage = {
		type: "",
		message: "",
		close: function () {
			$scope.waitMessage.message = '';
			$scope.waitMessage.type = '';
		}
	};

	$scope.showHideContent = function (type) {
		if (type === 'nginx') {
			$scope.showNginxHosts = !$scope.showNginxHosts;
		}
		else if (type === 'controller') {
			$scope.showCtrlHosts = !$scope.showCtrlHosts;
		}
	};

	$scope.showHideGroupContent = function (groupName) {
		$scope.groups[groupName].showContent = !$scope.groups[groupName].showContent;
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
	
	$scope.getEnvironment = function (envCode, cb) {
		envHosts.getEnvironment($scope, envCode, cb);
	};
	
	$scope.listHosts = function (env, noPopulate) {
		$scope.waitMessage.close();
		$scope.getEnvironment(env, function(){
			envHosts.listHosts($scope, env, noPopulate);
		});
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

	if ($scope.access.listHosts) {
		injectFiles.injectCss('modules/dashboard/environments/environments.css');
		$scope.envCode = $cookies.getObject("myEnv").code;
		$scope.listHosts($scope.envCode);
	}
}]);
