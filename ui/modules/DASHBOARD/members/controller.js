"use strict";
var membersApp = soajsApp.components;
membersApp.controller('mainMembersCtrl', ['$scope', '$cookieStore', function ($scope, $cookieStore) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, membersConfig.permissions);

	$scope.userCookie = $cookieStore.get('soajs_user');
}]);

membersApp.controller('membersCtrl', ['$scope', 'membersHelper', function ($scope, membersHelper) {
	$scope.key = apiConfiguration.key;
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
	if ($scope.members.access.adminUser.list) {
		$scope.members.listMembers($scope);
	}

}]);

membersApp.controller('groupsCtrl', ['$scope', 'groupsHelper', function ($scope, groupsHelper) {
	$scope.key = apiConfiguration.key;
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

	$scope.groups.listGroups();
}]);

membersApp.controller('tenantsCtrl', ['$scope', '$timeout', '$routeParams', 'ngDataApi', function ($scope, $timeout, $routeParams, ngDataApi) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, membersConfig.permissions);

	$scope.users = {};
	$scope.groups = {};

	$scope.getAllUsersGroups = function () {
		function arrGroupByTenant(arr) {
			var result = {};
			for (var i = 0; i < arr.length; i++) {
				var group;
				if (arr[i].tenant.id) {
					group = arr[i].tenant.id;
				}
				if (group) {
					if (!result[group]) {
						result[group] = {};
						result[group].list = [];
					}
					result[group].list.push(arr[i]);
				}
			}
			return result;
		}

		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/urac/admin/all"
		}, function (error, response) {
			if (error) {
				overlayLoading.hide();
				$scope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
			}
			else {
				$scope.users = arrGroupByTenant(response.users);
				$scope.groups = arrGroupByTenant(response.groups);
				overlayLoading.hide();
			}
		});
	};

	$scope.listTenants = function () {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/tenant/list"
		}, function (error, response) {
			if (error) {
				overlayLoading.hide();
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				$scope.tenantsList = response;
				$scope.getAllUsersGroups();
			}
		});
	};

	if ($scope.access.adminAll) {
		$scope.listTenants();
	}

}]);

membersApp.controller('tenantMembersCtrl', ['$scope', 'membersHelper', '$timeout', function ($scope, membersHelper, $timeout) {

	$scope.tenantMembers = angular.extend($scope);

	$scope.tenantMembers.initialize = function (tenantRecord) {
		$scope.tenantMembers.tenant = tenantRecord;
		$scope.tenantMembers.tId = tenantRecord['_id'];

		$timeout(function () {
			if ($scope.tenantMembers.users && $scope.tenantMembers.users[$scope.tenantMembers.tId]) {
				var myUsers = $scope.tenantMembers.users[$scope.tenantMembers.tId].list;
				membersHelper.printMembers($scope.tenantMembers, membersConfig, myUsers);
			}
		}, 1000);
	};

	$scope.tenantMembers.listMembers = function () {
		membersHelper.listMembers($scope.tenantMembers, membersConfig, function (response) {
			membersHelper.printMembers($scope.tenantMembers, membersConfig, response);
		});
	};

	$scope.tenantMembers.addMember = function () {
		membersHelper.addMember($scope.tenantMembers, membersConfig, false);
	};

	$scope.tenantMembers.editAcl = function (data) {
		membersHelper.editAcl($scope.tenantMembers, data);
	};

	$scope.tenantMembers.editMember = function (data) {
		membersHelper.editMember($scope.tenantMembers, membersConfig, data, false);
	};

	$scope.tenantMembers.activateMembers = function () {
		membersHelper.activateMembers($scope.tenantMembers);
	};

	$scope.tenantMembers.deactivateMembers = function () {
		membersHelper.deactivateMembers($scope.tenantMembers);
	};

	$scope.tenantMembers.$parent.$on('reloadTenantMembers', function (event, args) {
		$scope.tenantMembers.listMembers();
	});

}]);

membersApp.controller('tenantGroupsCtrl', ['$scope', 'groupsHelper', '$timeout', function ($scope, groupsHelper, $timeout) {

	$scope.tenantGroups = angular.extend($scope);
	$scope.tenantGroups.initialize = function (tenantRecord) {
		$scope.tenantGroups.tenant = tenantRecord;
		$scope.tenantGroups.tId = tenantRecord['_id'];

		$timeout(function () {
			if ($scope.tenantGroups.groups && $scope.tenantGroups.groups[$scope.tenantGroups.tId]) {
				var myGroups = $scope.tenantGroups.groups[$scope.tenantGroups.tId].list;
				groupsHelper.printGroups($scope.tenantGroups, groupsConfig, myGroups);
			}
		}, 1000);
	};

	$scope.tenantGroups.listGroups = function () {
		groupsHelper.listGroups($scope.tenantGroups, groupsConfig, function (response) {
			groupsHelper.printGroups($scope.tenantGroups, groupsConfig, response);
		});
	};

	$scope.tenantGroups.editGroup = function (data) {
		groupsHelper.editGroup($scope.tenantGroups, groupsConfig, data, false);
	};

	$scope.tenantGroups.addGroup = function () {
		groupsHelper.addGroup($scope.tenantGroups, groupsConfig, false);
	};

	$scope.tenantGroups.deleteGroups = function () {
		groupsHelper.deleteGroups($scope.tenantGroups);
	};

	$scope.tenantGroups.delete1Group = function (data) {
		groupsHelper.delete1Group($scope.tenantGroups, data, false);
	};

	$scope.tenantGroups.assignUsers = function (data) {
		groupsHelper.assignUsers($scope.tenantGroups, groupsConfig, data, {
			'name': 'reloadTenantMembers',
			params: {'name': 'tIdReload', 'params': $scope.tenantGroups.tId}
		});
	};

}]);

membersApp.controller('memberAclCtrl', ['$scope', '$routeParams', 'ngDataApi', '$cookieStore', 'membersAclHelper', '$route', function ($scope, $routeParams, ngDataApi, $cookieStore, membersAclHelper, $route) {
	$scope.key = apiConfiguration.key;
	$scope.$parent.isUserLoggedIn();
	$scope.msg = {};
	$scope.user = {};
	$scope.tenantApp = {};
	$scope.allGroups = [];
	$scope.pckName = '';
	$scope.environments_codes = [];

	$scope.userCookie = $cookieStore.get('soajs_user');

	$scope.minimize = function (application, service, oneEnv) {
		application.aclFill[oneEnv][service.name].collapse = true;
	};

	$scope.expand = function (application, service, oneEnv) {
		application.aclFill[oneEnv][service.name].collapse = false;
	};
	//TODO: need more work
	$scope.selectService = function (application, service, oneEnv) {
		if (application.services) {
			application.services.forEach(function (oneService) {
				if (oneService.name === service.name) {
					if (oneService.include) {
						if (service.forceRestricted) {
							oneService.apisRestrictPermission = true;
						}
						application.aclFill[oneEnv][service.name].collapse = false;
					} else {
						application.aclFill[oneEnv][service.name].collapse = true;
					}
				}
			});
		}
	};

	$scope.getEnvironments = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment/list",
			"params": {"short": true}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				$scope.environments_codes = response;
				$scope.getTenantAppInfo();
			}
		});
	};

	$scope.openApi = function (application, serviceName, oneEnv) {
		var status = false;
		for (var oneService in application.aclFill[oneEnv]) {
			if (oneService === serviceName) {
				if (application.aclFill[oneEnv][oneService].include && !application.aclFill[oneEnv][oneService].collapse) {
					status = true;
				}
			}
		}
		return status;
	};

	$scope.checkForGroupDefault = function (aclFill, service, grp, val, myApi) {
		membersAclHelper.checkForGroupDefault(aclFill, service, grp, val, myApi);
	};

	$scope.applyRestriction = function (aclFill, service) {
		membersAclHelper.applyRestriction(aclFill, service);
	};

	$scope.getTenantAppInfo = function () {
		getUserGroupInfo(function () {
			getSendDataFromServer($scope, ngDataApi, {
				"method": "send",
				"headers": {
					"key": $scope.key
				},
				"routeName": "/dashboard/tenant/acl/get",
				"params": {"id": $scope.user.tenant.id}
			}, function (error, response) {
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
				}
				else {
					$scope.tenantApp = response;
					$scope.tenantApp.applications.forEach(function (oneApplication) {
						if ($scope.user.config && $scope.user.config.packages && $scope.user.config.packages[oneApplication.package]) {
							if ($scope.user.config.packages[oneApplication.package].acl) {
								oneApplication.parentPackageAcl = angular.copy($scope.user.config.packages[oneApplication.package].acl);
							}
						}
						membersAclHelper.renderPermissionsWithServices($scope, oneApplication);
						overlayLoading.hide();

					});
					delete $scope.tenantApp.services;
				}
			});
		});

		function getUserGroupInfo(cb) {
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				"headers": {
					"key": $scope.key
				},
				"routeName": "/urac/admin/getUser",
				"params": {"uId": $routeParams.uId}
			}, function (error, response) {
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
				}
				else {
					$scope.user = response;
					getSendDataFromServer($scope, ngDataApi, {
						"method": "get",
						"routeName": "/urac/admin/group/list",
						"params": {'tId': $scope.user.tenant.id}
					}, function (error, response) {
						if (error) {
							$scope.$parent.displayAlert("danger", error.code, true, 'urac', error.message);
						}
						else {
							response.forEach(function (grpObj) {
								$scope.allGroups.push(grpObj.code);
							});
							cb();
						}
					});
				}
			});
		}
	};

	$scope.clearUserAcl = function () {
		var postData = $scope.user;

		if (typeof(postData.config) !== 'object') {
			postData.config = {};
		}

		if (typeof(postData.config.packages) !== 'object') {
			postData.config.packages = {};
		}

		$scope.tenantApp.applications.forEach(function (oneApplication) {
			if (postData.config.packages[oneApplication.package]) {
				if (postData.config.packages[oneApplication.package].acl) {
					delete postData.config.packages[oneApplication.package].acl;
				}
			}
		});
		getSendDataFromServer($scope, ngDataApi, {
			"method": "send",
			"headers": {
				"key": $scope.key
			},
			"routeName": "/urac/admin/editUser",
			"params": {"uId": $scope.user['_id']},
			"data": postData
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
			}
			else {
				$route.reload();
				$scope.msg.type = '';
				$scope.msg.msg = '';
				$scope.$parent.displayAlert('success', translation.userAclDeletedSuccessfully[LANG]);
			}
		});
	};

	$scope.saveUserAcl = function () {
		var postData = $scope.user;
		if (typeof(postData.config) !== 'object') {
			postData.config = {};
		}
		if (typeof(postData.config.packages) !== 'object') {
			postData.config.packages = {};
		}

		var counter = 0;
		$scope.tenantApp.applications.forEach(function (oneApplication) {
			var tmpObj = {services: oneApplication.aclFill};
			var result = membersAclHelper.prepareAclObjToSave(tmpObj);
			if (result.valid) {

				var packageName = oneApplication.package;
				if (!postData.config.packages[packageName]) {
					postData.config.packages[packageName] = {};
				}
				if (!postData.config.packages[packageName].acl) {
					postData.config.packages[packageName].acl = {};
				}
				postData.config.packages[packageName].acl = result.data;
				counter++;
			}
			else {
				$scope.$parent.displayAlert('danger', translation.needToChooseGroupAccessTypeSetGroups[LANG]);
			}
		});
		if (counter === $scope.tenantApp.applications.length) {
			getSendDataFromServer($scope, ngDataApi, {
				"method": "send",
				"headers": {
					"key": $scope.key
				},
				"routeName": "/urac/admin/editUser",
				"params": {"uId": $scope.user['_id']},
				"data": postData
			}, function (error) {
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
				}
				else {
					$scope.msg.type = '';
					$scope.msg.msg = '';
					$scope.$parent.displayAlert('success', translation.ACLUpdatedSuccessfully[LANG]);
				}
			});
		}
	};
	//call default method
	overlayLoading.show(function () {
		$scope.getEnvironments();
	});

}]);