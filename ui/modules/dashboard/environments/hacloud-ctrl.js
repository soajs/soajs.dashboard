"use strict";

var environmentsApp = soajsApp.components;
environmentsApp.controller('hacloudCtrl', ['$scope', '$cookies', '$timeout', 'nodeSrv', 'hacloudSrv', 'deploySrv', 'injectFiles', function ($scope, $cookies, $timeout, nodeSrv, hacloudSrv, deploySrv, injectFiles) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);

	var autoRefreshTimeoutInstance;

    $scope.nodes = {};
	$scope.services = {};

	$scope.namespaceConfig = {
		defaultValue: {
			id: undefined, //setting id to undefined in order to force angular to display all fields, => All Namespaces
			name: '--- All Namespaces ---'
		}
	};

	$scope.waitMessage = {
		type: "",
		message: "",
		close: function () {
			$scope.waitMessage.message = '';
			$scope.waitMessage.type = '';
		}
	};

	$scope.refreshIntervals = [
		{
			v: 5,
			l: '5 Seconds'
		},
		{
			v: 10,
			l: '10 Seconds'
		},
		{
			v: 30,
			l: '30 Seconds'
		},
		{
			v: 60,
			l: '1 Minute'
		},
		{
			v: 300,
			l: '5 Minutes'
		},
		{
			v: 600,
			l: '10 Minutes'
		},
		{
			v: 1800,
			l: '30 Minutes',
			selected: true
		},
		{
			v: 3600,
			l: '1 Hour'
		}
	];
	$scope.selectedInterval = {
		v: 1800,
		l: '30 Minutes',
		selected: true
	};

	if($cookies.getObject('selectedInterval')){
		$scope.selectedInterval = $cookies.getObject('selectedInterval');
	}

	$scope.changeSectionType = function(sectionType){
		$scope.sectionType = sectionType;
	};

	$scope.changeInterval = function(oneInt){
		$scope.refreshIntervals.forEach(function(oneInterval){
			if(oneInterval.v === oneInt.v){
				if(oneInt.v !== $scope.selectedInterval.v){
					$scope.selectedInterval = oneInt;
					$cookies.putObject('selectedInterval', oneInt);
					//force reload autoRefresh
					$scope.autoRefresh();
				}
			}
		});
	};

	$scope.autoRefresh = function(){
		var tValue = $scope.selectedInterval.v * 1000;
		autoRefreshTimeoutInstance = $timeout(function(){
			$scope.getSettings();
			$scope.listServices(function(){
				$scope.autoRefresh();
			});
		}, tValue);
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

	$scope.listNamespaces = function (cb) {
		hacloudSrv.listNamespaces($scope, cb);
	};

	$scope.deleteService = function (service, groupName) {
		hacloudSrv.deleteService($scope, service, groupName);
	};

	$scope.scaleService = function (service, groupName) {
		hacloudSrv.scaleService($scope, service, groupName);
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

	$scope.executeAwarenessTest = function (service) {
		hacloudSrv.executeAwarenessTest($scope, service);
	};

	$scope.loadDaemonStats = function(service){
		hacloudSrv.loadDaemonStats($scope, service);
	};

	$scope.loadDaemonGroupConfig = function(service){
		hacloudSrv.loadDaemonGroupConfig($scope, service);
	};

	$scope.hostLogs = function (task) {
		hacloudSrv.hostLogs($scope, task);
	};

	$scope.metrics = function (task, serviceName, type, shipper, mode) {
		hacloudSrv.metrics($scope, task, serviceName, type, shipper, mode);
	};

	$scope.getSettings = function () {
		hacloudSrv.getSettings($scope);
	};

	$scope.activateAnalytics = function () {
		hacloudSrv.activateAnalytics($scope);
		$timeout(function(){
			$scope.listServices(function(){
				$scope.getSettings();
			});
		}, 30000);
	};

	$scope.deactivateAnalytics = function () {
		hacloudSrv.deactivateAnalytics($scope);
		$timeout(function(){
			$scope.listServices(function(){});
		}, 5000);
	};

	$scope.showHideFailures = function(service){
		service.tasks.forEach(function(oneTask){
			if(Object.hasOwnProperty.call(oneTask, 'hideIt')){
				oneTask.hideIt = !oneTask.hideIt;
			}
		});
	};

	$scope.checkHeapster = function() {
		hacloudSrv.checkHeapster($scope);
	};

	$scope.deployHeapster = function(){
		deploySrv.deployHeapster($scope);
	};

	$scope.autoScale = function (service) {
		hacloudSrv.autoScale($scope, service);
	};

	$scope.envAutoScale = function () {
		hacloudSrv.envAutoScale($scope);
	};

	$scope.numToArray = function(num) {
		return new Array(num);
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
		$scope.getSettings();
		$scope.listServices(function(){
			$scope.listNamespaces(function () {
				$scope.checkHeapster();
				$scope.autoRefresh();
			});
		});
	}

	$scope.$on("$destroy", function(){
		$timeout.cancel(autoRefreshTimeoutInstance);
	});
}]);

environmentsApp.filter('bytesToGbytes', function () {
	return function (number) {
		number = number / 1024 / 1024 / 1024;
		return number.toFixed(2);
	};
});

environmentsApp.filter('capitalizeFirst', function () {
	return function (string) {
		return string.charAt(0).toUpperCase() + string.substring(1);
	};
});
