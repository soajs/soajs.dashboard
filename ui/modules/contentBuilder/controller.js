"use strict";
var contentBuilderApp = soajsApp.components;
contentBuilderApp.controller("contentBuilderCtrl", ['$scope', 'cbHelper', function($scope, cbHelper) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, cbConfig.permissions);

	$scope.listServices = function() {
		cbHelper.listEntries($scope, cbConfig, function(data) {
			var groups = {};
			data.forEach(function(oneRecord) {
				if(!groups[oneRecord.name]) {
					groups[oneRecord.name] = [];
				}

				groups[oneRecord.name].push(oneRecord);
			});

			$scope.revisions = groups;
		});
	};

	if($scope.access.servicesRevisions) {
		$scope.listServices();
	}
}]);

contentBuilderApp.controller("contentBuilderActiveCtrl", ['$scope', 'cbHelper', function($scope, cbHelper) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, cbConfig.permissions);

	$scope.listServices = function() {
		cbHelper.listEntries($scope, cbConfig);
	};

	$scope.viewService = function(data) {
		console.log(data);
	};

	$scope.addService = function() {
		console.log("open wizard!");
	};

	$scope.editService = function(data) {
		console.log(data);
	};

	if($scope.access.listServices) {
		$scope.listServices();
	}
}]);

contentBuilderApp.controller("contentBuilderRevisionsCtrl", ['$scope', 'cbHelper', function($scope, cbHelper) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, cbConfig.permissions);

	$scope.assingRevisionsToGrid = function(versionsRecords){
		$scope.rows = versionsRecords;
		cbHelper.printEntries($scope, $scope.rows, cbConfig.grid.revisions, true);
	};

	$scope.viewService = function(data) {
		console.log(data);
	};
}]);