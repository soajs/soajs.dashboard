"use strict";

var environmentsApp = soajsApp.components;
environmentsApp.controller('hacloudCtrl', ['$scope', '$cookies', '$timeout', 'hacloudSrv', 'injectFiles', function ($scope, $cookies, $timeout, hacloudSrv, injectFiles) {
	$scope.$parent.isUserLoggedIn();

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

    $scope.updateNode = function (node, type, newStatus) {
        hacloudSrv.updateNode($scope, node, type, newStatus);
    };

	$scope.deployNewService = function () {
		hacloudSrv.deployNewService($scope);
	};

	$scope.listServices = function () {
		hacloudSrv.listServices($scope);
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

	// if ($scope.access.listNodes) {
		injectFiles.injectCss('modules/dashboard/environments/environments.css');
		$scope.envCode = $cookies.getObject("myEnv").code;

		$scope.listNodes();
		$scope.listServices();
	// }
}]);
