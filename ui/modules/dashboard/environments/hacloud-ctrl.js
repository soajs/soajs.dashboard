"use strict";

var environmentsApp = soajsApp.components;
environmentsApp.controller('hacloudCtrl', ['$scope', '$cookies', '$timeout', 'hacloudSrv', 'deploySrv', 'injectFiles', function ($scope, $cookies, $timeout, hacloudSrv, deploySrv, injectFiles) {
	$scope.$parent.isUserLoggedIn();

	$scope.certsLink = "http://dashboard.soajs.org:" + location.port + "/#/environments-platforms";

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);

    $scope.nodes = {};
	$scope.services = {};

	$scope.listNodes = function () {
        hacloudSrv.listNodes($scope);
    };

    $scope.addNode = function () {
        hacloudSrv.addNode($scope);
    };

    $scope.removeNode = function (nodeId) {
        hacloudSrv.removeNode($scope, nodeId);
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
	
    $scope.updateNode = function (node, type, newStatus) {
        hacloudSrv.updateNode($scope, node, type, newStatus);
    };

	$scope.deployNewEnv = function () {
		deploySrv.deployEnvironment($scope, $scope.envCode, true);
	};

	$scope.deployNewService = function () {
		hacloudSrv.deployNewService($scope);
	};

	$scope.listServices = function () {
		hacloudSrv.listServices($scope);
		$scope.listNginxServices($scope, $scope.envCode);
	};

	$scope.deleteService = function (serviceName, serviceVersion) {
		hacloudSrv.deleteService($scope, serviceName, serviceVersion);
	};

	$scope.scaleService = function (serviceInfo, serviceVersion) {
		hacloudSrv.scaleService($scope, serviceInfo, serviceVersion);
	};

	$scope.listNginxServices = function () {
		hacloudSrv.listNginxHosts($scope, $scope.envCode);
	};

	$scope.reloadServiceRegistry = function (source, service) {
		hacloudSrv.reloadServiceRegistry($scope, source, service);
	};

	$scope.loadServiceProvision = function (source, service) {
		hacloudSrv.loadServiceProvision($scope, source, service);
	};

	$scope.awarenessStat = function (source, service) {
		hacloudSrv.awarenessStat($scope, source, service);
	};

	$scope.executeHeartbeatTest = function (env, oneHost) {
		hacloudSrv.executeHeartbeatTest($scope, env, oneHost);
	};

	$scope.hostLogs = function (taskName) {
		hacloudSrv.hostLogs($scope, taskName);
	};

	$scope.checkCerts = function(env) {
		hacloudSrv.checkCerts($scope, env);
	}

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
