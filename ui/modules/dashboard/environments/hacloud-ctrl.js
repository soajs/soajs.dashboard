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

	$scope.listServices = function () {
		hacloudSrv.listServices($scope);
	};

	// if ($scope.access.listNodes) {
		injectFiles.injectCss('modules/dashboard/environments/environments.css');
		$scope.envCode = $cookies.getObject("myEnv").code;

		$scope.listNodes();
		$scope.listServices();
	// }
}]);
