"use strict";

var uracDEVApp = soajsApp.components;
uracDEVApp.controller("uracListTenantsCtrl", ['$scope', 'ngDataApi', '$cookies', '$localStorage', function ($scope, ngDataApi, $cookies, $localStorage) {
	$scope.$parent.isUserLoggedIn();
	$scope.access = {};
	$scope.selectedEnv = $scope.$parent.currentSelectedEnvironment.toUpperCase();
	constructModulePermissions($scope, $scope.access, membersConfig.permissions);

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
				for (var x = response.length - 1; x >= 0; x--) {
					if (response[x].type === 'admin') {
						response.splice(x, 1);
					}
				}
				$scope.tenants = response;
			}
		});

	};

	$scope.changeCode = function (tenant) {
		var newCode = tenant.code;
		if (newCode && newCode !== '') {
			$scope.code = newCode.toString();
			$cookies.put('urac_merchant', newCode);
			$scope.$parent.go('/urac-management/members');
		}
	};

	if ($scope.access.listTenants) {
		$scope.listTenants();
	}
	else {
		var user = $localStorage.soajs_user;
		$scope.changeCode(user.tenant);
	}

}]);

uracDEVApp.controller('uracMembersDevCtrl', ['$scope', '$cookies', '$localStorage', function ($scope, $cookies, $localStorage) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, membersConfig.permissions);

	$scope.userCookie = $localStorage.soajs_user;
}]);

uracDEVApp.controller('tenantMembersDevCtrl', ['$scope', '$cookies', 'tenantMembersHelper', function ($scope, $cookies, tenantMembersHelper) {
	$scope.members = angular.extend($scope);
	$scope.members.access = $scope.$parent.access;

	$scope.$parent.$on('reloadTenantMembers', function (event) {
		$scope.members.listMembers($scope);
	});

	$scope.members.listMembers = function () {
		tenantMembersHelper.listMembers($scope.members, membersConfig);
	};

	$scope.members.addMember = function () {
		tenantMembersHelper.addMember($scope.members, membersConfig, true);
	};

	$scope.members.editAcl = function (data) {
		tenantMembersHelper.editAcl($scope.members, data);
	};

	$scope.members.editMember = function (data) {
		tenantMembersHelper.editMember($scope.members, membersConfig, data, true)
	};

	$scope.members.activateMembers = function () {
		tenantMembersHelper.activateMembers($scope.members);
	};

	$scope.members.deactivateMembers = function () {
		tenantMembersHelper.deactivateMembers($scope.members);
	};

	//call default method
	setTimeout(function () {
		if ($scope.members.access.adminUser.list) {
			$scope.members.listMembers($scope);
		}
	}, 200);

}]);

uracDEVApp.controller('tenantGroupsDevCtrl', ['$scope', '$cookies', 'tenantGroupsHelper', function ($scope, $cookies, tenantGroupsHelper) {
	$scope.groups = angular.extend($scope);
	$scope.groups.access = $scope.$parent.access;

	$scope.groups.listGroups = function () {
		tenantGroupsHelper.listGroups($scope.groups, groupsConfig);
	};

	$scope.groups.addGroup = function () {
		tenantGroupsHelper.addGroup($scope.groups, groupsConfig, true);
	};

	$scope.groups.editGroup = function (data) {
		tenantGroupsHelper.editGroup($scope.groups, groupsConfig, data, true);
	};

	$scope.groups.deleteGroups = function () {
		tenantGroupsHelper.deleteGroups($scope.groups);
	};

	$scope.groups.delete1Group = function (data) {
		tenantGroupsHelper.delete1Group($scope.groups, data, true);
	};

	$scope.groups.assignUsers = function (data) {
		tenantGroupsHelper.assignUsers($scope.groups, groupsConfig, data, {'name': 'reloadTenantMembers', params: {}});
	};

	setTimeout(function () {
		if ($scope.groups.access.adminGroup.list) {
			$scope.groups.listGroups();
		}
	}, 200);

}]);