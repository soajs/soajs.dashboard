"use strict";

var uracApp = soajsApp.components;
uracApp.controller("uracListTenantsModuleQaCtrl", ['$scope', 'ngDataApi', '$cookies', '$localStorage', function ($scope, ngDataApi, $cookies, $localStorage) {
	$scope.$parent.isUserLoggedIn();
	$scope.access = {};
	$scope.selectedEnv = $scope.$parent.currentSelectedEnvironment.toUpperCase();
	var permissions = {
		"listTenants": ['dashboard', '/tenant/list', 'get']
	};
	constructModulePermissions($scope, $scope.access, permissions);

	$scope.listTenants = function () {
		overlayLoading.show();
		var opts = {
			"routeName": "/dashboard/tenant/list",
			"method": "get",
			"params": {
				"type": "admin",
				"negate": true
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
		if ($cookies.getObject('urac_merchant') && $cookies.getObject('urac_merchant').code) {
			$scope.$parent.go('/urac-management/members');
		}
		else {
			$scope.listTenants();
		}
	}
	else {
		var user = $localStorage.soajs_user;
		$scope.changeCode(user.tenant);
	}

}]);

uracApp.controller('uracMembersModuleQaCtrl', ['$scope', '$cookies', '$localStorage', function ($scope, $cookies, $localStorage) {
	$scope.$parent.isUserLoggedIn();
	$scope.access = {};
	$scope.selectedEnv = $scope.$parent.currentSelectedEnvironment.toUpperCase();
	constructModulePermissions($scope, $scope.access, usersModuleQaConfig.permissions, $scope.selectedEnv);

	$scope.access.owner = {};
	var permissions = {
		"listTenants": ['dashboard', '/tenant/list', 'get']
	};
	constructModulePermissions($scope, $scope.access.owner, permissions);

	$scope.tName = $cookies.getObject('urac_merchant').name;
	$scope.userCookie = $localStorage.soajs_user;
	$scope.backToList = function () {
		$cookies.remove('urac_merchant');
		$scope.$parent.go('/urac-management');
	};
}]);

uracApp.controller('tenantMembersModuleQaCtrl', ['$scope', 'ngDataApi', '$cookies', 'tenantMembersModuleQaHelper',
	function ($scope, ngDataApi, $cookies, tenantMembersModuleQaHelper) {
		$scope.startLimit = 0;
		$scope.totalCount = 0;
		$scope.endLimit = usersModuleQaConfig.apiEndLimit;
		$scope.keywords;

		$scope.members = angular.extend($scope);
		$scope.members.access = $scope.$parent.access;

		$scope.$parent.$on('reloadTenantMembers', function (event) {
			$scope.members.listMembers(true);
		});

		$scope.members.getMore = function (startLimit) {
			$scope.members.startLimit = startLimit;
			$scope.members.listMembers(false);
		};

		$scope.members.countMembers = function (cb) {
			var opts = {
				"method": "get",
				"routeName": "/urac/owner/admin/users/count",
				"proxy": true,
				"params": {
					"tCode": $cookies.getObject('urac_merchant').code,
					"__env": $scope.members.currentSelectedEnvironment.toUpperCase()
				}
			};
			if ($scope.keywords) {
				opts.params.keywords = $scope.keywords;
			}
			getSendDataFromServer($scope.members, ngDataApi, opts, function (error, response) {
				if (error) {
					overlayLoading.hide();
					$scope.members.$parent.displayAlert("danger", error.code, true, 'urac', error.message);
				}
				else {
					$scope.members.totalCount = response.count;
					$scope.members.totalPagesActive = Math.ceil($scope.members.totalCount / $scope.endLimit);
				}
				cb();
			});

		};

		$scope.members.listMembers = function (firstCall) {
			if (firstCall) {
				$scope.members.pageActive = 1;
				$scope.members.countMembers(function () {
					tenantMembersModuleQaHelper.listMembers($scope.members, usersModuleQaConfig.users, firstCall);
				});
			}
			else {
				tenantMembersModuleQaHelper.listMembers($scope.members, usersModuleQaConfig.users, firstCall);
			}

		};

		$scope.members.refresh = function () {
			$scope.members.startLimit = 0;
			$scope.members.listMembers(true);
		};

		$scope.members.addMember = function () {
			tenantMembersModuleQaHelper.addMember($scope.members, usersModuleQaConfig.users, true);
		};

		$scope.members.editAcl = function (data) {
			//tenantMembersModuleQaHelper.editAcl($scope.members, data);
			$scope.members.$parent.go('/urac-management/' + data._id + '/editUserAcl');
		};

		$scope.members.editMember = function (data) {
			tenantMembersModuleQaHelper.editMember($scope.members, usersModuleQaConfig.users, data, true)
		};

		$scope.members.activateMembers = function () {
			tenantMembersModuleQaHelper.activateMembers($scope.members);
		};

		$scope.members.deactivateMembers = function () {
			tenantMembersModuleQaHelper.deactivateMembers($scope.members);
		};

		//call default method
		setTimeout(function () {
			if ($scope.members.access.adminUser.list) {
				$scope.members.listMembers(true);
			}
		}, 50);

	}]);

uracApp.controller('tenantGroupsModuleQaCtrl', ['$scope', '$cookies', 'tenantGroupsModuleQaHelper', function ($scope, $cookies, tenantGroupsModuleQaHelper) {
	$scope.groups = angular.extend($scope);
	$scope.groups.access = $scope.$parent.access;

	$scope.groups.listGroups = function () {
		tenantGroupsModuleQaHelper.listGroups($scope.groups, usersModuleQaConfig.groups);
	};

	$scope.groups.addGroup = function () {
		tenantGroupsModuleQaHelper.addGroup($scope.groups, usersModuleQaConfig.groups, true);
	};

	$scope.groups.editGroup = function (data) {
		tenantGroupsModuleQaHelper.editGroup($scope.groups, usersModuleQaConfig.groups, data, true);
	};

	$scope.groups.deleteGroups = function (data) {
		tenantGroupsModuleQaHelper.deleteGroups($scope.groups);
	};

	$scope.groups.delete1Group = function (data) {
		tenantGroupsModuleQaHelper.delete1Group($scope.groups, data, true);
	};

	$scope.groups.assignUsers = function (data) {
		tenantGroupsModuleQaHelper.assignUsers($scope.groups, usersModuleQaConfig.groups, data, {
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

uracApp.controller('tokensModuleQaCtrl', ['$scope', 'ngDataApi', '$cookies', 'tokensModuleQaHelper', function ($scope, ngDataApi, $cookies, tokensModuleQaHelper) {
	$scope.startLimit = 0;
	$scope.totalCount = 0;
	$scope.endLimit = usersModuleQaConfig.apiEndLimit;
	$scope.increment = usersModuleQaConfig.apiEndLimit;
	$scope.showNext = true;
	$scope.pageActive = 1;

	$scope.tokens = angular.extend($scope);
	$scope.tokens.access = $scope.$parent.access;

	$scope.getPrev = function () {
		$scope.tokens.startLimit = $scope.tokens.startLimit - $scope.tokens.increment;
		if (0 <= $scope.tokens.startLimit) {
			$scope.tokens.listTokens(false);
			$scope.tokens.showNext = true;
			$scope.tokens.pageActive--;
		}
		else {
			$scope.tokens.pageActive = 1;
			$scope.tokens.startLimit = 0;
		}
	};

	$scope.getNext = function () {
		var startLimit = $scope.tokens.startLimit + $scope.tokens.increment;
		if (startLimit < $scope.tokens.totalCount) {
			$scope.tokens.startLimit = startLimit;
			$scope.tokens.listTokens();
			$scope.tokens.pageActive++;
		}
		else {
			$scope.tokens.showNext = false;
		}
	};

	$scope.getEnd = function () {
		var startLimit = ($scope.tokens.totalPagesActive - 1) * $scope.tokens.endLimit;
		if (startLimit < $scope.tokens.totalCount) {
			$scope.tokens.startLimit = startLimit;
			$scope.tokens.listTokens();
			$scope.tokens.pageActive = $scope.tokens.totalPagesActive;
		}
		else {
			$scope.tokens.showNext = false;
		}
	};

	$scope.tokens.listTokens = function (firstCall) {
		if (firstCall) {
			$scope.tokens.startLimit = 0;
			$scope.tokens.pageActive = 1;
		}
		tokensModuleQaHelper.listTokens($scope.tokens, tokensModuleQaConfig, firstCall);
	};

	$scope.tokens.deleteTokens = function () {
		tokensModuleQaHelper.deleteTokens($scope.tokens);
	};

	$scope.tokens.delete1Token = function (data) {
		tokensModuleQaHelper.delete1Token($scope.tokens, data, true);
	};

	setTimeout(function () {
		if ($scope.tokens.access.adminUser.list) {
			$scope.tokens.listTokens(true);
		}
	}, 200);

}]);

uracApp.controller('uracAclModuleQaCtrl', ['$scope', '$routeParams', 'ngDataApi', '$cookies', 'memAclModuleQaHelper', '$route', '$localStorage',
	function ($scope, $routeParams, ngDataApi, $cookies, memAclModuleQaHelper, $route, $localStorage) {
		$scope.$parent.isUserLoggedIn();
		$scope.msg = {};
		$scope.user = {};
		$scope.tenantApp = {};
		$scope.allGroups = [];
		$scope.pckName = '';
		$scope.environments_codes = [];
		$scope.uracModuleQa = uracModuleQa;

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
			memAclModuleQaHelper.checkForGroupDefault(aclFill, service, grp, val, myApi);
		};

		$scope.applyRestriction = function (aclFill, service) {
			memAclModuleQaHelper.applyRestriction(aclFill, service);
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
						$scope.tenantApp.services = response.records;
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
										memAclModuleQaHelper.renderPermissionsWithServices($scope, oneApplication);
									});
								}
								else {
									memAclModuleQaHelper.renderPermissionsWithServices($scope, oneApplication);
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
				var result = memAclModuleQaHelper.prepareAclObjToSave(tmpObj);
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
