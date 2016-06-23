"use strict";

var uracDEVApp = soajsApp.components;
uracDEVApp.controller("uracListTenantsCtrl", ['$scope', 'ngDataApi', '$cookies', '$timeout', '$modal', 'injectFiles',
	function ($scope, ngDataApi, $cookies, $timeout, $modal, injectFiles) {
		$scope.$parent.isUserLoggedIn();
		$scope.access = {};
		$scope.selectedEnv = $scope.$parent.currentSelectedEnvironment.toUpperCase();

		$scope.listTenants = function () {
			overlayLoading.show();
			var opts = {
				"routeName": "/dashboard/tenant/list",
				"method": "get",
				"params": {
					//"type": "client"
				}
			};
			getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
				overlayLoading.hide();
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
				}
				else {
					$scope.tenants = response;
				}
			});

		};
		
		$scope.changeCode = function (tenant) {
			var newCode = tenant.code;
			$cookies.put('urac_merchant_key', tenant.applications[0].keys[0].extKeys[0].extKey);
			if (newCode && newCode !== '') {
				$scope.code = newCode.toString();
				$cookies.put('urac_merchant', newCode);
				$scope.$parent.go('/urac-management/members');
			}
		};

		$scope.listTenants();
		
	}]);

uracDEVApp.controller('uracMembersCtrl', ['$scope', '$cookies', '$localStorage', function ($scope, $cookies, $localStorage) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, membersConfig.permissions);

	$scope.userCookie = $localStorage.soajs_user;
}]);

uracDEVApp.controller('tenantMembersCtrl', ['$scope', '$cookies', 'membersHelper', function ($scope, $cookies, membersHelper) {
	//$scope.key = $cookies.get('urac_merchant_key');

	$scope.members = angular.extend($scope);
	$scope.members.access = $scope.$parent.access;

	$scope.$parent.$on('reloadMembers', function (event) {
		$scope.members.listMembers($scope);
	});

	$scope.members.listMembers = function () {
		membersHelper.listMembers($scope.members, membersConfig);
	};

	$scope.members.addMember = function () {
		membersHelper.addMember($scope.members, membersConfig, true);
	};

	$scope.members.editAcl = function (data) {
		membersHelper.editAcl($scope.members, data);
	};

	$scope.members.editMember = function (data) {
		membersHelper.editMember($scope.members, membersConfig, data, true)
	};

	$scope.members.activateMembers = function () {
		membersHelper.activateMembers($scope.members);
	};

	$scope.members.deactivateMembers = function () {
		membersHelper.deactivateMembers($scope.members);
	};

	//call default method
	setTimeout(function () {
		if ($scope.members.access.adminUser.list) {
			$scope.members.listMembers($scope);
		}
	}, 200);

}]);

uracDEVApp.controller('tenantGroupsCtrl', ['$scope', '$cookies', 'groupsHelper', function ($scope, $cookies, groupsHelper) {
	//$scope.key = $cookies.get('urac_merchant_key');
	$scope.groups = angular.extend($scope);
	$scope.groups.access = $scope.$parent.access;

	$scope.groups.listGroups = function () {
		groupsHelper.listGroups($scope.groups, groupsConfig);
	};

	$scope.groups.addGroup = function () {
		groupsHelper.addGroup($scope.groups, groupsConfig, true);
	};

	$scope.groups.editGroup = function (data) {
		groupsHelper.editGroup($scope.groups, groupsConfig, data, true);
	};

	$scope.groups.deleteGroups = function () {
		groupsHelper.deleteGroups($scope.groups);
	};

	$scope.groups.delete1Group = function (data) {
		groupsHelper.delete1Group($scope.groups, data, true);
	};

	$scope.groups.assignUsers = function (data) {
		groupsHelper.assignUsers($scope.groups, groupsConfig, data, {'name': 'reloadMembers', params: {}}, true);
	};

	setTimeout(function () {
		if ($scope.groups.access.adminGroup.list) {
			$scope.groups.listGroups();
		}
	}, 200);

}]);