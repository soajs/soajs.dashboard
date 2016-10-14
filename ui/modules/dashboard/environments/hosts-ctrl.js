"use strict";

var environmentsApp = soajsApp.components;
environmentsApp.controller('hostsCtrl', ['$scope', '$cookies', '$timeout', 'envHosts', 'deploySrv', 'injectFiles', function ($scope, $cookies, $timeout, envHosts, deploySrv, injectFiles) {
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
	
	$scope.deployEnvironment = function (envCode) {
		deploySrv.deployEnvironment($scope, envCode);
	};
	
	$scope.listHosts = function (env, noPopulate) {
		$scope.waitMessage.close();
		envHosts.listHosts($scope, env, noPopulate);
		$scope.listZombieContainers($scope.envCode);
	};
	
	$scope.listNginxHosts = function (env) {
		envHosts.listNginxHosts($scope, env);
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
	
	$scope.containerLogs = function (env, container) {
		envHosts.containerLogs($scope, env, container);
	};
	
	$scope.deleteContainer = function (env, container) {
		envHosts.deleteContainer($scope, env, container);
	};
	
	$scope.listZombieContainers = function (env) {
		envHosts.listZombieContainers($scope, env);
	};
	
	if ($scope.access.listHosts) {
		injectFiles.injectCss('modules/dashboard/environments/environments.css');
		$scope.envCode = $cookies.getObject("myEnv").code;
		//list nginx container, hosts, and zombie containers in parallel
		$scope.listNginxHosts($scope.envCode);
		$scope.listHosts($scope.envCode);
	}
}]);
