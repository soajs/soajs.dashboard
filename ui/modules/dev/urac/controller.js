"use strict";

var uracApp = soajsApp.components;
uracApp.controller("uracListTenantsModuleDevCtrl", ['$scope', 'ngDataApi', '$cookies', '$localStorage', function ($scope, ngDataApi, $cookies, $localStorage) {
	$scope.$parent.isUserLoggedIn();
	$scope.access = {};
	$scope.selectedEnv = $scope.$parent.currentSelectedEnvironment.toUpperCase();
	constructModulePermissions($scope, $scope.access, usersModuleDevConfig.permissions);
	
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
			var obj = {
				name: tenant.name,
				code: tenant.code,
				id: tenant._id || tenant.id
			};
			$scope.code = newCode.toString();
			$cookies.putObject('urac_merchant', obj);
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

uracApp.controller('uracMembersModuleDevCtrl', ['$scope', '$cookies', '$localStorage', function ($scope, $cookies, $localStorage) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, usersModuleDevConfig.permissions);
	
	$scope.tName = $cookies.getObject('urac_merchant').name;
	$scope.userCookie = $localStorage.soajs_user;
}]);

uracApp.controller('tenantMembersModuleDevCtrl', ['$scope', '$cookies', 'tenantMembersModuleDevHelper', function ($scope, $cookies, tenantMembersModuleDevHelper) {
	$scope.members = angular.extend($scope);
	$scope.members.access = $scope.$parent.access;
	
	$scope.$parent.$on('reloadTenantMembers', function (event) {
		$scope.members.listMembers($scope);
	});
	
	$scope.members.listMembers = function () {
		tenantMembersModuleDevHelper.listMembers($scope.members, usersModuleDevConfig);
	};
	
	$scope.members.addMember = function () {
		tenantMembersModuleDevHelper.addMember($scope.members, usersModuleDevConfig, true);
	};
	
	$scope.members.editAcl = function (data) {
		tenantMembersModuleDevHelper.editAcl($scope.members, data);
	};
	
	$scope.members.editMember = function (data) {
		tenantMembersModuleDevHelper.editMember($scope.members, usersModuleDevConfig, data, true)
	};
	
	$scope.members.activateMembers = function () {
		tenantMembersModuleDevHelper.activateMembers($scope.members);
	};
	
	$scope.members.deactivateMembers = function () {
		tenantMembersModuleDevHelper.deactivateMembers($scope.members);
	};
	
	//call default method
	setTimeout(function () {
		if ($scope.members.access.adminUser.list) {
			$scope.members.listMembers($scope);
		}
	}, 200);
	
}]);

uracApp.controller('tenantGroupsModuleDevCtrl', ['$scope', '$cookies', 'tenantGroupsModuleDevHelper', function ($scope, $cookies, tenantGroupsModuleDevHelper) {
	$scope.groups = angular.extend($scope);
	$scope.groups.access = $scope.$parent.access;
	
	$scope.groups.listGroups = function () {
		tenantGroupsModuleDevHelper.listGroups($scope.groups, groupsModuleDevConfig);
	};
	
	$scope.groups.addGroup = function () {
		tenantGroupsModuleDevHelper.addGroup($scope.groups, groupsModuleDevConfig, true);
	};
	
	$scope.groups.editGroup = function (data) {
		tenantGroupsModuleDevHelper.editGroup($scope.groups, groupsModuleDevConfig, data, true);
	};
	
	$scope.groups.deleteGroups = function () {
		tenantGroupsModuleDevHelper.deleteGroups($scope.groups);
	};
	
	$scope.groups.delete1Group = function (data) {
		tenantGroupsModuleDevHelper.delete1Group($scope.groups, data, true);
	};
	
	$scope.groups.assignUsers = function (data) {
		tenantGroupsModuleDevHelper.assignUsers($scope.groups, groupsModuleDevConfig, data, {
			'name': 'reloadTenantMembers',
			params: {}
		});
	};
	
	setTimeout(function () {
		if ($scope.groups.access.adminGroup.list) {
			$scope.groups.listGroups();
		}
	}, 200);
	
}]);

uracApp.controller('tokensModuleDevCtrl', ['$scope', '$cookies', function ($scope, $cookies) {


}]);

uracApp.controller('uracAclModuleDevCtrl', ['$scope', '$routeParams', 'ngDataApi', '$cookies', 'memAclModuleDevHelper', '$route', '$localStorage',
	function ($scope, $routeParams, ngDataApi, $cookies, memAclModuleDevHelper, $route, $localStorage) {
		$scope.$parent.isUserLoggedIn();
		$scope.msg = {};
		$scope.user = {};
		$scope.tenantApp = {};
		$scope.allGroups = [];
		$scope.pckName = '';
		$scope.environments_codes = [];
		$scope.uracModuleDev = uracModuleDev;
		
		var tCode = $cookies.getObject('urac_merchant').code;
		$scope.selectedEnv = $scope.$parent.currentSelectedEnvironment.toUpperCase();
		$scope.userCookie = $localStorage.soajs_user;
		
		$scope.minimize = function (application, service, oneEnv) {
			application.aclFill[oneEnv][service.name].collapse = true;
		};
		
		$scope.expand = function (application, service, oneEnv) {
			application.aclFill[oneEnv][service.name].collapse = false;
		};
		//TODO: need more work
		$scope.selectService = function (application, service, oneEnv) {
			if (application.aclFill[oneEnv][service.name]) {
				if (application.aclFill[oneEnv][service.name].include) {
					if (application.aclFill[oneEnv][service.name].forceRestricted) {
						application.aclFill[oneEnv][service.name].apisRestrictPermission = true;
					}
					application.aclFill[oneEnv][service.name].collapse = false;
				}
				else {
					application.aclFill[oneEnv][service.name].collapse = true;
				}
			}
		};
		
		$scope.getEnvironments = function () {
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/environment/list",
				"params": {"short": true}
			}, function (error, response) {
				if (error) {
					overlayLoading.hide();
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
			memAclModuleDevHelper.checkForGroupDefault(aclFill, service, grp, val, myApi);
		};
		
		$scope.applyRestriction = function (aclFill, service) {
			memAclModuleDevHelper.applyRestriction(aclFill, service);
		};
		
		$scope.getTenantAppInfo = function () {
			function getServices(cb) {
				var serviceNames;
				//var serviceNames = $scope.currentApplication.serviceNames;
				var opts = {
					"method": "send",
					"routeName": "/dashboard/services/list"
				};
				if (serviceNames) {
					opts.data = {"serviceNames": serviceNames}
				}
				getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
					if (error) {
						$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
					}
					else {
						$scope.tenantApp.services = response;
					}
					cb();
				});
			}
			
			function getPackage(oneApplication, cb) {
				var opts = {
					"method": "get",
					"routeName": "/dashboard/product/packages/get",
					"params": {
						"packageCode": oneApplication.package,
						"productCode": oneApplication.product
					}
				};
				
				getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
					if (error) {
						$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
					}
					else {
						oneApplication.parentPackageAcl = response.acl;
					}
					if (cb) {
						cb();
					}
				});
			}
			
			getUserGroupInfo(function () {
				var opts = {
					"method": "get",
					"routeName": "/dashboard/tenant/get",
					"params": {
						"id": $cookies.getObject('urac_merchant').id
					}
				};
				
				getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
					if (error) {
						overlayLoading.hide();
						$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
					}
					else {
						$scope.tenantApp = response;
						var apps = [];
						for (var j = response.applications.length - 1; 0 <= j; j--) {
							if (apps.indexOf(response.applications[j].package) === -1) {
								apps.push(response.applications[j].package);
							}
							else {
								response.applications.splice(j, 1);
							}
						}
						getServices(function () {
							$scope.tenantApp.applications.forEach(function (oneApplication) {
								if ($scope.user.config && $scope.user.config.packages && $scope.user.config.packages[oneApplication.package]) {
									if ($scope.user.config.packages[oneApplication.package].acl) {
										oneApplication.userPackageAcl = angular.copy($scope.user.config.packages[oneApplication.package].acl);
									}
								}
								if (!Object.hasOwnProperty.call(oneApplication, 'acl')) {
									getPackage(oneApplication, function () {
										memAclModuleDevHelper.renderPermissionsWithServices($scope, oneApplication);
									});
								}
								else {
									memAclModuleDevHelper.renderPermissionsWithServices($scope, oneApplication);
								}
								overlayLoading.hide();
							});
						});
						//delete $scope.tenantApp.services;
					}
				});
			});
			
			function getUserGroupInfo(cb) {
				var opts = {
					"method": "get",
					"proxy": true,
					"routeName": "/urac/owner/admin/getUser",
					"params": {
						"uId": $routeParams.uId,
						"tCode": tCode,
						"__env": $scope.selectedEnv
					}
				};
				getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
					if (error) {
						overlayLoading.hide();
						$scope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
					}
					else {
						$scope.user = response;
						getSendDataFromServer($scope, ngDataApi, {
							"method": "get",
							"proxy": true,
							"routeName": "/urac/owner/admin/group/list",
							"params": {
								"tCode": tCode,
								"__env": $scope.selectedEnv
							}
						}, function (error, response) {
							if (error) {
								overlayLoading.hide();
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
			
			if (typeof(postData.config) === 'object') {
				if (typeof(postData.config.packages) === 'object') {
					$scope.tenantApp.applications.forEach(function (oneApplication) {
						if (postData.config.packages[oneApplication.package]) {
							if (postData.config.packages[oneApplication.package].acl) {
								delete postData.config.packages[oneApplication.package].acl;
							}
						}
					});
				}
				else {
					postData.config.packages = {};
				}
			}
			else {
				postData.config = {};
			}
			
			overlayLoading.show();
			var opts = {
				"method": "send",
				"routeName": "/urac/owner/admin/editUserConfig",
				"proxy": true,
				"params": {
					"tCode": tCode,
					"__env": $scope.selectedEnv,
					"uId": $scope.user['_id']
				},
				"data": postData
			};
			
			getSendDataFromServer($scope, ngDataApi, opts, function (error) {
				overlayLoading.hide();
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
				}
				else {
					$scope.msg.type = '';
					$scope.msg.msg = '';
					$scope.$parent.displayAlert('success', translation.userAclDeletedSuccessfully[LANG]);
					$route.reload();
				}
			});
		};
		
		$scope.saveUserAcl = function () {
			var postData = $scope.user;
			if (typeof(postData.config) === 'object') {
				if (typeof(postData.config.packages) !== 'object') {
					postData.config.packages = {};
				}
			}
			else {
				postData.config = {
					packages: {}
				};
			}
			
			var counter = 0;
			var appsDone = [];
			$scope.tenantApp.applications.forEach(function (oneApplication) {
				var tmpObj = {
					'services': oneApplication.aclFill
				};
				var result = memAclModuleDevHelper.prepareAclObjToSave(tmpObj);
				if (result.valid) {
					var packageName = oneApplication.package;
					if (!postData.config.packages[packageName]) {
						postData.config.packages[packageName] = {};
					}
					if (!postData.config.packages[packageName].acl) {
						postData.config.packages[packageName].acl = {};
					}
					if (appsDone.indexOf(packageName) === -1) {
						postData.config.packages[packageName].acl = result.data;
					}
					
					appsDone.push(packageName);
					counter++;
				}
				else {
					$scope.$parent.displayAlert('danger', translation.needToChooseGroupAccessTypeSetGroups[LANG]);
				}
			});
			
			if (counter === $scope.tenantApp.applications.length) {
				overlayLoading.show();
				var opts = {
					"method": "send",
					"routeName": "/urac/owner/admin/editUserConfig",
					"proxy": true,
					"params": {
						"tCode": tCode,
						"__env": $scope.selectedEnv,
						"uId": $scope.user['_id']
					},
					"data": postData
				};
				
				getSendDataFromServer($scope, ngDataApi, opts, function (error) {
					overlayLoading.hide();
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