"use strict";
var membersApp = soajsApp.components;
membersApp.controller('mainMembersCtrl', ['$scope', '$cookieStore', function($scope, $cookieStore) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, membersConfig.permissions);

	$scope.userCookie = $cookieStore.get('soajs_user');
}]);

membersApp.controller('membersCtrl', ['$scope', 'membersHelper', function($scope, membersHelper) {

	$scope.members = angular.extend($scope);
	$scope.members.access = $scope.$parent.access;
	$scope.$parent.$on('reloadMembers', function(event) {
		$scope.members.listMembers();
	});

	$scope.members.listMembers = function() {
		membersHelper.listMembers($scope.members, membersConfig);
	};

	$scope.members.addMember = function() {
		membersHelper.addMember($scope.members, membersConfig, true);
	};

	$scope.members.editAcl = function(data) {
		membersHelper.editAcl($scope.members, data);
	};

	$scope.members.editMember = function(data) {
		membersHelper.editMember($scope.members, membersConfig, data, true)
	};

	$scope.members.activateMembers = function() {
		membersHelper.activateMembers($scope.members);
	};

	$scope.members.deactivateMembers = function() {
		membersHelper.deactivateMembers($scope.members);
	};

	//call default method
	if($scope.members.access.adminUser.list) {
		$scope.members.listMembers();
	}

}]);

membersApp.controller('groupsCtrl', ['$scope', 'groupsHelper', function($scope, groupsHelper) {
	$scope.groups = angular.extend($scope);
	$scope.groups.access = $scope.$parent.access;
	$scope.groups.listGroups = function() {
		groupsHelper.listGroups($scope.groups, groupsConfig);
	};

	$scope.groups.addGroup = function() {
		groupsHelper.addGroup($scope.groups, groupsConfig);
	};

	$scope.groups.editGroup = function(data) {
		groupsHelper.editGroup($scope.groups, groupsConfig, data);
	};

	$scope.groups.deleteGroups = function() {
		groupsHelper.deleteGroups($scope.groups);
	};

	$scope.groups.delete1Group = function(data) {
		groupsHelper.delete1Group($scope.groups, data);
	};

	$scope.groups.assignUsers = function(data) {
		groupsHelper.assignUsers($scope.groups, groupsConfig, data, {'name': 'reloadMembers', params: {}});
	};

	$scope.groups.listGroups();
}]);

membersApp.controller('tenantsCtrl', ['$scope', '$timeout', '$routeParams', 'ngDataApi', function($scope, $timeout, $routeParams, ngDataApi) {
	$scope.users = {};
	$scope.groups = {};

	$scope.getAllUsersGroups = function() {
		function arrGroupByTenant(arr) {
			var result = {};
			for(var i = 0; i < arr.length; i++) {
				var group;
				if(arr[i].tenant.id) {
					group = arr[i].tenant.id;
				}
				if(group) {
					if(!result[group]) {
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
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.users = arrGroupByTenant(response.users);
				$scope.groups = arrGroupByTenant(response.groups);
			}
		});
	};

	$scope.listTenants = function() {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/tenant/list"
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.tenantsList = response;
				$scope.getAllUsersGroups();
			}
		});
	};

	$scope.listTenants();

}]);

membersApp.controller('tenantMembersCtrl', ['$scope', 'membersHelper', '$timeout', function($scope, membersHelper, $timeout) {

	$scope.tenantMembers = angular.extend($scope);

	$scope.tenantMembers.initialize = function(tenantRecord) {
		$scope.tenantMembers.tenant = tenantRecord;
		$scope.tenantMembers.tId = tenantRecord['_id'];

		$timeout(function() {
			if($scope.tenantMembers.users && $scope.tenantMembers.users[$scope.tenantMembers.tId]) {
				var myUsers = $scope.tenantMembers.users[$scope.tenantMembers.tId].list;
				membersHelper.printMembers($scope.tenantMembers, membersConfig, myUsers);
			}
		}, 1000);
	};

	$scope.tenantMembers.listMembers = function() {
		membersHelper.listMembers($scope.tenantMembers, membersConfig, function(response) {
			membersHelper.printMembers($scope.tenantMembers, membersConfig, response);
		});
	};

	$scope.tenantMembers.addMember = function() {
		membersHelper.addMember($scope.tenantMembers, membersConfig, false);
	};

	$scope.tenantMembers.editAcl = function(data) {
		membersHelper.editAcl($scope.tenantMembers, data);
	};

	$scope.tenantMembers.editMember = function(data) {
		membersHelper.editMember($scope.tenantMembers, membersConfig, data, false);
	};

	$scope.tenantMembers.activateMembers = function() {
		membersHelper.activateMembers($scope.tenantMembers);
	};

	$scope.tenantMembers.deactivateMembers = function() {
		membersHelper.deactivateMembers($scope.tenantMembers);
	};

	$scope.tenantMembers.$parent.$on('reloadTenantMembers', function(event, args) {
		$scope.tenantMembers.listMembers();
	});

}]);

membersApp.controller('tenantGroupsCtrl', ['$scope', 'groupsHelper', '$timeout', function($scope, groupsHelper, $timeout) {

	$scope.tenantGroups = angular.extend($scope);
	$scope.tenantGroups.initialize = function(tenantRecord) {
		$scope.tenantGroups.tenant = tenantRecord;
		$scope.tenantGroups.tId = tenantRecord['_id'];

		$timeout(function() {
			if($scope.tenantGroups.groups && $scope.tenantGroups.groups[$scope.tenantGroups.tId]) {
				var myGroups = $scope.tenantGroups.groups[$scope.tenantGroups.tId].list;
				groupsHelper.printGroups($scope.tenantGroups, groupsConfig, myGroups);
			}
		}, 1000);
	};

	$scope.tenantGroups.listGroups = function() {
		groupsHelper.listGroups($scope.tenantGroups, groupsConfig, function(response) {
			groupsHelper.printGroups($scope.tenantGroups, groupsConfig, response);
		});
	};

	$scope.tenantGroups.editGroup = function(data) {
		groupsHelper.editGroup($scope.tenantGroups, groupsConfig, data, false);
	};

	$scope.tenantGroups.addGroup = function() {
		groupsHelper.addGroup($scope.tenantGroups, groupsConfig, false);
	};

	$scope.tenantGroups.deleteGroups = function() {
		groupsHelper.deleteGroups($scope.tenantGroups);
	};

	$scope.tenantGroups.delete1Group = function(data) {
		groupsHelper.delete1Group($scope.tenantGroups);
	};

	$scope.tenantGroups.assignUsers = function(data) {
		groupsHelper.assignUsers($scope.groups, groupsConfig, data, {'name': 'reloadTenantMembers', params: {'name': 'tIdReload', 'params': $scope.tenantGroups.tId}});
	};

}]);

membersApp.controller('memberAclCtrl', ['$scope', '$routeParams', 'ngDataApi', '$cookieStore', 'membersAclHelper', function($scope, $routeParams, ngDataApi, $cookieStore, membersAclHelper) {
	$scope.key = apiConfiguration.key;
	$scope.$parent.isUserLoggedIn();

	$scope.user = {};
	$scope.tenantApp = {};
	$scope.allGroups = [];
	$scope.pckName = '';

	$scope.userCookie = $cookieStore.get('soajs_user');

	$scope.minimize = function(application, service) {
		application.aclFill[service.name].collapse = true;
	};

	$scope.expand = function(application, service) {
		application.aclFill[service.name].collapse = false;
	};

	$scope.selectService = function(application, service) {
		application.services.forEach(function(oneService) {
			if(oneService.name === service.name) {
				if(oneService.include) {
					if(service.forceRestricted) {
						oneService.apisRestrictPermission = true;
					}
					application.aclFill[service.name].collapse = false;
				} else {
					application.aclFill[service.name].collapse = true;
				}
			}
		});
	};

	$scope.openApi = function(application, serviceName) {
		var status = false;
		for(var oneService in application.aclFill) {
			if(oneService === serviceName) {
				if(application.aclFill[oneService].include && !application.aclFill[oneService].collapse) {
					status = true;
				}
			}
		}
		return status;
	};

	$scope.checkForGroupDefault = function(aclFill, service, grp, val, myApi){
		membersAclHelper.checkForGroupDefault(aclFill, service, grp, val, myApi);
	};

	$scope.applyRestriction = function(aclFill, service){
		membersAclHelper.applyRestriction(aclFill, service);
	};

	$scope.getTenantAppInfo = function() {
		getUserGroupInfo(function() {
			getSendDataFromServer($scope, ngDataApi, {
				"method": "send",
				"routeName": "/dashboard/tenant/acl/get",
				"params": { "id": $scope.user.tenant.id }
			}, function(error, response) {
				if(error) {
					$scope.$parent.displayAlert('danger', error.message);
				}
				else {
					$scope.tenantApp = response;
					$scope.tenantApp.applications.forEach(function(oneApplication) {
						if($scope.user.config && $scope.user.config.packages && $scope.user.config.packages[oneApplication.package]) {
							if($scope.user.config.packages[oneApplication.package].acl) {
								oneApplication.parentPackageAcl = angular.copy($scope.user.config.packages[oneApplication.package].acl);
							}
						}
						oneApplication.services = [];
						membersAclHelper.renderPermissionsWithServices($scope, oneApplication);
						membersAclHelper.prepareViewAclObj(oneApplication.aclFill);
					});
					delete $scope.tenantApp.services;
				}
			});
		});

		function getUserGroupInfo(cb) {
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				"routeName": "/urac/admin/getUser",
				"params": {"uId": $routeParams.uId}
			}, function(error, response) {
				if(error) {
					$scope.$parent.displayAlert('danger', error.message);
				}
				else {
					$scope.user = response;

					getSendDataFromServer($scope, ngDataApi, {
						"method": "get",
						"routeName": "/urac/admin/group/list",
						"params": {'tId': $scope.user.tenant.id}
					}, function(error, response) {
						if(error) {
							$scope.$parent.displayAlert("danger", error.message);
						}
						else {
							response.forEach(function(grpObj) {
								if($scope.user.groups.indexOf(grpObj.code)!== -1){
									$scope.allGroups.push(grpObj.code);
								}
							});
							cb();
						}
					});
				}
			});
		}
	};

	$scope.clearUserAcl = function() {
		var postData = $scope.user;

		if(typeof(postData.config) !== 'object') {
			postData.config = {};
		}

		if(typeof(postData.config.packages) !== 'object') {
			postData.config.packages = {};
		}

		$scope.tenantApp.applications.forEach(function(oneApplication){
			if(postData.config.packages[oneApplication.package]){
				delete postData.config.packages[oneApplication.package];
			}
		});

		getSendDataFromServer($scope, ngDataApi, {
			"method": "send",
			"routeName": "/urac/admin/editUser",
			"params": {"uId": $scope.user['_id']},
			"data": postData
		}, function(error) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', 'User Acl Deleted Successfully');
				$scope.getTenantAppInfo();
			}
		});
	};

	$scope.saveUserAcl = function() {
		var postData = $scope.user;
		if(typeof(postData.config) !== 'object') {
			postData.config = {};
		}
		if(typeof(postData.config.packages) !== 'object') {
			postData.config.packages = {};
		}

		var counter = 0;
		$scope.tenantApp.applications.forEach(function(oneApplication){
			var tmpObj ={ services: oneApplication.aclFill };
			var result = membersAclHelper.prepareAclObjToSave(tmpObj);
			if(result.valid){

				var packageName = oneApplication.package;
				if(!postData.config.packages[packageName]){
					postData.config.packages[packageName] ={};
				}
				if(!postData.config.packages[packageName].acl){
					postData.config.packages[packageName].acl ={};
				}
				postData.config.packages[packageName].acl = result.data;
				counter++;
			}
			else{
				$scope.$parent.displayAlert('danger', 'You need to choose at least one group when the access type is set to Groups');
			}
		});

		if(counter === $scope.tenantApp.applications.length){
			getSendDataFromServer($scope, ngDataApi, {
				"method": "send",
				"routeName": "/urac/admin/editUser",
				"params": {"uId": $scope.user['_id']},
				"data": postData
			}, function(error) {
				if(error) {
					$scope.$parent.displayAlert('danger', error.message);
				}
				else {
					$scope.$parent.displayAlert('success', 'Acl Updated Successfully');
				}
			});
		}
	};
	//call default method
	$scope.getTenantAppInfo();
}]);