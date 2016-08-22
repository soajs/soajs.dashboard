"use strict";

var uracApp = soajsApp.components;
uracApp.controller("uracListTenantsDevCtrl", ['$scope', 'ngDataApi', '$cookies', '$localStorage', function ($scope, ngDataApi, $cookies, $localStorage) {
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
			var obj = {
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

uracApp.controller('uracMembersDevCtrl', ['$scope', '$cookies', '$localStorage', function ($scope, $cookies, $localStorage) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, membersConfig.permissions);

	$scope.userCookie = $localStorage.soajs_user;
}]);

uracApp.controller('tenantMembersDevCtrl', ['$scope', '$cookies', 'tenantMembersHelper', function ($scope, $cookies, tenantMembersHelper) {
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

uracApp.controller('tenantGroupsDevCtrl', ['$scope', '$cookies', 'tenantGroupsHelper', function ($scope, $cookies, tenantGroupsHelper) {
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

uracApp.controller('uracAclModuleDevCtrl', ['$scope', '$routeParams', 'ngDataApi', '$cookies', 'memAclModuleDevHelper', '$route', '$localStorage',
	function ($scope, $routeParams, ngDataApi, $cookies, memAclModuleDevHelper, $route, $localStorage) {
		$scope.key = apiConfiguration.key;
		$scope.$parent.isUserLoggedIn();
		$scope.msg = {};
		$scope.user = {};
		$scope.tenantApp = {};
		$scope.allGroups = [];
		$scope.pckName = '';
		$scope.environments_codes = [];

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
					// for (var x = 0; x < response.length; x++) {
					// 	if (response[x].apis) {
					// 		response[x].apisList = response[x].apis;
					// 	}
					// 	else {
					// 		if (response[x].versions) {
					// 			var v = returnLatestVersion(response[x].versions);
					// 			if (response[x].versions[v]) {
					// 				response[x].apisList = response[x].versions[v].apis;
					// 			}
					// 		}
					// 	}
					// }
					//
					//$scope.currentApplication.services = response;
					cb();
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
						getServices(function () {
							$scope.tenantApp.applications.forEach(function (oneApplication) {
								if ($scope.user.config && $scope.user.config.packages && $scope.user.config.packages[oneApplication.package]) {
									if ($scope.user.config.packages[oneApplication.package].acl) {
										oneApplication.userPackageAcl = angular.copy($scope.user.config.packages[oneApplication.package].acl);
										//oneApplication.parentPackageAcl = angular.copy($scope.user.config.packages[oneApplication.package].acl);
									}
								}
								memAclModuleDevHelper.renderPermissionsWithServices($scope, oneApplication);
								overlayLoading.hide();
								//delete $scope.tenantApp.services;
							});
						});

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
				"routeName": "/urac/admin/editUserConfig",
				"proxy": true,
				"params": {
					"tCode": tCode,
					"__env": $scope.selectedEnv,
					"uId": $scope.user['_id']
				},
				"data": postData
			};
			if ($scope.key) {
				opts.headers = {
					"key": $scope.key
				};
			}
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
			$scope.tenantApp.applications.forEach(function (oneApplication) {
				var tmpObj = {services: oneApplication.aclFill};
				var result = memAclModuleDevHelper.prepareAclObjToSave(tmpObj);
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
				overlayLoading.show();
				var opts = {
					"method": "send",
					"routeName": "/urac/admin/editUserConfig",
					"proxy": true,
					"params": {
						"tCode": tCode,
						"__env": $scope.selectedEnv,
						"uId": $scope.user['_id']
					},
					"data": postData
				};
				if ($scope.key) {
					opts.headers = {
						"key": $scope.key
					};
				}
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