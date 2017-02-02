"use strict";

var environmentsApp = soajsApp.components;
environmentsApp.controller('hacloudCtrl', ['$scope', '$cookies', '$timeout', 'nodeSrv', 'hacloudSrv', 'deploySrv', 'injectFiles', function ($scope, $cookies, $timeout, nodeSrv, hacloudSrv, deploySrv, injectFiles) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);

    $scope.nodes = {};
	$scope.services = {};

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

	$scope.showHideContent = function (service) {
		service.expanded = !service.expanded;
	};

	$scope.showHideGroupContent = function (groupName) {
		$scope.groups[groupName].showContent = !$scope.groups[groupName].showContent;
	};

	$scope.checkCerts = function(env) {
		nodeSrv.checkCerts($scope, env);
	};

	$scope.listNodes = function () {
		nodeSrv.listNodes($scope);
    };

    $scope.addNode = function () {
	    nodeSrv.addNode($scope);
    };

    $scope.removeNode = function (nodeId) {
	    nodeSrv.removeNode($scope, nodeId);
    };

    $scope.updateNode = function (node, type, newStatus) {
	    nodeSrv.updateNode($scope, node, type, newStatus);
    };

	$scope.deployNewEnv = function () {
		deploySrv.deployEnvironment($scope);
	};

	$scope.deployNewService = function () {
		deploySrv.deployNewService($scope);
	};

	$scope.listServices = function (cb) {
		hacloudSrv.listServices($scope, cb);
	};

	$scope.deleteService = function (service) {
		hacloudSrv.deleteService($scope, service);
	};

	$scope.scaleService = function (service) {
		hacloudSrv.scaleService($scope, service);
	};

	$scope.redeployService = function (service) {
		hacloudSrv.redeployService($scope, service);
	};

	$scope.rebuildService = function (service, type) {
		hacloudSrv.rebuildService($scope, service, type);
	};

	$scope.inspectService = function (service) {
		hacloudSrv.inspectService($scope, service);
	};

	$scope.reloadServiceRegistry = function (service) {
		hacloudSrv.reloadServiceRegistry($scope, service);
	};

	$scope.loadServiceProvision = function (service) {
		hacloudSrv.loadServiceProvision($scope, service);
	};

	$scope.executeHeartbeatTest = function (service) {
		hacloudSrv.executeHeartbeatTest($scope, service);
	};

	$scope.loadDaemonStat = function(service){
		hacloudSrv.loadDaemonStat($scope, service);
	};

	$scope.loadDaemonGroupConfig = function(service){
		hacloudSrv.loadDaemonGroupConfig($scope, service);
	};

	$scope.hostLogs = function (task) {
		hacloudSrv.hostLogs($scope, task);
	};
	
	$scope.showHideFailures = function(service){
		service.tasks.forEach(function(oneTask){
			if(Object.hasOwnProperty.call(oneTask, 'hideIt')){
				oneTask.hideIt = !oneTask.hideIt;
			}
		});
	};

	injectFiles.injectCss('modules/dashboard/environments/environments.css');
	$scope.envCode = $cookies.getObject("myEnv").code;
	$scope.envDeployer = $cookies.getObject("myEnv").deployer;
	$scope.envPlatform = $scope.envDeployer.selected.split('.')[1];

	if ($scope.access.hacloud.nodes.list) {
		$scope.listNodes();
		$scope.certsExist = true;
		$scope.checkCerts($scope.envCode);
	}
	if ($scope.access.listHosts) {
		$scope.listServices();
	}

}]);

environmentsApp.filter('bytesToGbytes', function () {
	return function (number) {
		number = number / 1024 / 1024 / 1024;
		return number.toFixed(2);
	}
});

environmentsApp.filter('capitalizeFirst', function () {
	return function (string) {
		return string.charAt(0).toUpperCase() + string.substring(1);
	}
});
