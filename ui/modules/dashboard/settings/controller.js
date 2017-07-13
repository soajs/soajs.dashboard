"use strict";
var settingsApp = soajsApp.components;
settingsApp.controller('settingsCtrl', ['$scope', '$timeout', '$modal', '$routeParams', '$compile', 'ngDataApi', '$cookies', 'injectFiles', function ($scope, $timeout, $modal, $routeParams, $compile, ngDataApi, $cookies, injectFiles) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, settingsConfig.permissions);

	$scope.oAuthUsers = {};
	$scope.oAuthUsers.list = [];
	$scope.availableEnv = [];
	$scope.packagesAcl = {};
	$scope.currentEnv = $cookies.getObject('myEnv').code.toLowerCase();

	$scope.getTenant = function (first) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/settings/tenant/get"
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				getSendDataFromServer($scope, ngDataApi, {
					"method": "get",
					"routeName": "/dashboard/tenant/db/keys/list"
				}, function (error, tenantDbKeys) {
					if (error) {
						$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
					} else {
						$scope.markTenantDashboardAccess(response.tenant, tenantDbKeys, function (tenant) {
							$scope.tenant = tenant;
							
							// set oauth data
							var data = $scope.tenant;
							var oAuth = data.oauth;
							if (oAuth.secret) {
								data.secret = oAuth.secret;
							}
							data.oauthType = $scope.getTenantLoginMode(data);
							
							$scope.availableEnv = []; // reset available env
							response.environments.forEach(function (oneEnv) {
								$scope.availableEnv.push(oneEnv.code.toLowerCase());
							});
							
							if (first && first == true) {
								$scope.listOauthUsers();
							}

							var counter = 0;
							$scope.getPackageAcl($scope.tenant.applications, counter);
						});
					}
				});
			}
		});
	};

	$scope.markTenantDashboardAccess = function (oneTenant, tenantDbKeys, callback) {
		for (var i = 0; i < tenantDbKeys.length; i++) {
			if (oneTenant.code === tenantDbKeys[i].code) {
				if (!oneTenant.dashboardAccess) {
					oneTenant.dashboardAccess = true;
				}
				for (var j = 0; j < oneTenant.applications.length; j++) {
					for (var k = 0; k < oneTenant.applications[j].keys.length; k++) {
						for (var l = 0; l < oneTenant.applications[j].keys[k].extKeys.length; l++) {
							if (oneTenant.applications[j].keys[k].extKeys[l].extKey === tenantDbKeys[i].key && oneTenant.applications[j].keys[k].extKeys[l].env === tenantDbKeys[i].env) {
								oneTenant.applications[j].dashboardAccess = true;
								oneTenant.applications[j].keys[k].dashboardAccess = true;
								oneTenant.applications[j].keys[k].extKeys[l].dashboardAccess = true;
							}
						}
					}
				}
			}
		}
		return callback(oneTenant);
	};

	$scope.getPackageAcl = function (apps, counter) {
		var tenantApp = apps[counter];
		tenantApp.showKeys = true;
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/product/packages/get",
			"params": {
				"productCode": tenantApp.product,
				"packageCode": tenantApp.package
			}
		}, function (error, packageInfo) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.packagesAcl[tenantApp.package]= {
					acl: packageInfo.acl,
					type: ''
				};
				//check if old or new acl and mark it
				if (packageInfo.acl && typeof (packageInfo.acl) === 'object') {
					if (packageInfo.acl[$scope.currentEnv] && (!packageInfo.acl[$scope.currentEnv].apis && !packageInfo.acl[$scope.currentEnv].apisRegExp && !packageInfo.acl[$scope.currentEnv].apisPermission)) {
						$scope.packagesAcl[tenantApp.package]['type'] = 'new';
					} else {
						$scope.packagesAcl[tenantApp.package]['type'] = 'old';
					}
				} else {
					$scope.packagesAcl[tenantApp.package] = null;
				}

				counter++;
				if (counter !== apps.length) {
					$scope.getPackageAcl(apps, counter);
				}
			}
		});
	};

	$scope.clearOauth = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "delete",
			"routeName": "/dashboard/settings/tenant/oauth/delete",
			"params": {}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', translation.TenantOAuthDeletedSuccessfully[LANG]);
				$scope.getTenant();
			}
		});
	};
	
	$scope.getTenantLoginMode = function (tenant) {
		// set loginMode to urac or mini urac from the first env available
		var loginMode;
		var found = false;
		for (var i = 0; !found && tenant.applications && i < tenant.applications.length; i++) {
			var keys = tenant.applications[i].keys;
			for (var j = 0; !found && keys && j < keys.length; j++) {
				var envs = Object.keys(keys[j].config);
				for (var k = 0; !found && envs && k < envs.length; k++) {
					var oauth = keys[j].config[envs[k]].oauth;
					if (oauth && oauth.loginMode === 'urac') {
						loginMode = 'urac';
					} else {
						loginMode = 'miniurac';
					}
					found = true;
				}
			}
		}
		return loginMode;
	};
	
	$scope.turnOffOAuth = function(){
		var data = $scope.tenant;
		var postData = {
			'secret': '',
			'oauthType': 'off',
			'availableEnv' : $scope.availableEnv
		};
		
		getSendDataFromServer($scope, ngDataApi, {
			"method": "put",
			"routeName": "/dashboard/settings/tenant/oauth/update",
			"data": postData,
			"params": {"id": data['_id']}
		}, function (error) {
			
			if (error) {
				$scope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', translation.TenantInfoUpdatedSuccessfully[LANG]);
				$scope.getTenant(true);
			}
		});
	};
	
	$scope.updateOAuth = function(){
		var formConfig = angular.copy(settingsConfig.form.updateOauth);
		formConfig.timeout = $timeout;
		
		var data = $scope.tenant;
		
		var keys = Object.keys(data);
		
		for (var i = 0; i < formConfig.entries.length; i++) {
			keys.forEach(function (inputName) {
				if (formConfig.entries[i].name === inputName) {
					if (inputName === 'oauthType') {
						for (var j = 0; j < formConfig.entries[i].value.length; j++) {
							if (formConfig.entries[i].value[j].v === data[inputName]) {
								formConfig.entries[i].value[j].selected = true;
							}
						}
					} else {
						formConfig.entries[i].value = data[inputName];
					}
				}
			});
		}
		// on edit end
		
		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'updateOAuth',
			label: translation.editTenantOauth[LANG],
			data: {},
			actions: [
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						$scope.modalInstance.dismiss('cancel');
						$scope.form.formData = {};
					}
				},
				{
					'type': 'submit',
					'label': translation.updateOAuth[LANG],
					'btn': 'primary',
					'action': function (formData) {
						
						var postData = {
							'secret': formData.secret,
							'oauthType': formData.oauthType,
							'availableEnv' : $scope.availableEnv
						};
						
						getSendDataFromServer($scope, ngDataApi, {
							"method": "put",
							"routeName": "/dashboard/settings/tenant/oauth/update",
							"data": postData,
							"params": {"id": data['_id']}
						}, function (error) {
							
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', translation.TenantInfoUpdatedSuccessfully[LANG]);
								$scope.modalInstance.close();
								
								$scope.getTenant(true);
							}
						});
					}
				}
			]
		};
		
		buildFormWithModal($scope, $modal, options);
	};

	$scope.saveTenant = function () {
		var postData = {
			'name': $scope.tenant.name,
			'description': $scope.tenant.description,
			'type': $scope.tenant.type
		};
		getSendDataFromServer($scope, ngDataApi, {
			"method": "put",
			"routeName": "/dashboard/settings/tenant/update",
			"data": postData,
			"params": {"id": $scope.tenant['_id']}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', translation.TenantInfoUpdatedSuccessfully[LANG]);
				$scope.getTenant();
			}
		});
	};

	$scope.openKeys = function (app) {
		app.showKeys = true;
	};

	$scope.closeKeys = function (app) {
		app.showKeys = false;
	};

	$scope.removeAppKey = function (app, key, event) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "delete",
			"routeName": "/dashboard/settings/tenant/application/key/delete",
			"params": {"appId": app.appId, "key": key}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', translation.applicationKeyRemovedSuccessfully[LANG]);
				$scope.listKeys(app.appId);
			}
		});
		if (event && event.stopPropagation) {
			event.stopPropagation();
		}
	};

	$scope.editMyOauthUser = function (user) {
		user.password = null;
		user.confirmPassword = null;
		var options = {
			timeout: $timeout,
			form: settingsConfig.form.oauthUserUpdate,
			name: 'updateUser',
			label: translation.updateUser[LANG],
			data: user,
			actions: [
				{
					'type': 'submit',
					'label': translation.updateoAuthUser[LANG],
					'btn': 'primary',
					'action': function (formData) {
						var postData = {
							'userId': formData.userId
						};
						if (formData.password && formData.password != '') {
							if (formData.password === formData.confirmPassword) {
								postData.password = formData.password;
							} else {
								$scope.form.displayAlert('danger', translation.passwordConfirmFieldsNotMatch[LANG]);
								return;
							}
						}

						getSendDataFromServer($scope, ngDataApi, {
							"method": "put",
							"routeName": "/dashboard/settings/tenant/oauth/users/update",
							"data": postData,
							"params": {'uId': user['_id']}
						}, function (error) {
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', translation.userUpdatedSuccessfully[LANG]);
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listOauthUsers();
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						$scope.modalInstance.dismiss('cancel');
						$scope.form.formData = {};
					}
				}
			]
		};

		buildFormWithModal($scope, $modal, options);
	};

	$scope.addThisOauthUser = function () {
		var options = {
			timeout: $timeout,
			form: settingsConfig.form.oauthUser,
			name: 'addUser',
			label: translation.addNewoAuthUser[LANG],
			data: {
				'userId': null,
				'user_password': null
			},
			actions: [
				{
					'type': 'submit',
					'label': translation.addoAuthUser[LANG],
					'btn': 'primary',
					'action': function (formData) {
						if (formData.user_password !== formData.confirmPassword) {
							$scope.form.displayAlert('danger', translation.passwordConfirmFieldsNotMatch[LANG]);
							return;
						}
						var postData = {
							'userId': formData.userId,
							'password': formData.user_password
						};

						getSendDataFromServer($scope, ngDataApi, {
							"method": "post",
							"routeName": "/dashboard/settings/tenant/oauth/users/add",
							"data": postData
						}, function (error) {
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', translation.userAddedSuccessfully[LANG]);
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listOauthUsers();
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						$scope.modalInstance.dismiss('cancel');
						$scope.form.formData = {};
					}
				}
			]
		};
		buildFormWithModal($scope, $modal, options);
	};

	$scope.listOauthUsers = function () {
		if ($scope.access.tenant.oauth.users.list) {
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/settings/tenant/oauth/users/list",
				"params": {}
			}, function (error, response) {
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
				}
				else {
					$scope.oAuthUsers.list = response;
				}
			});
		}
	};

	$scope.removeTenantOauthUser = function (user) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "delete",
			"routeName": "/dashboard/settings/tenant/oauth/users/delete",
			"params": {'uId': user['_id']}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', translation.userDeletedSuccessfully[LANG]);
				$scope.listOauthUsers();
			}
		});
	};

	$scope.editTenantOauthUser = function (user) {
		user.password = null;
		user.confirmPassword = null;
		var options = {
			timeout: $timeout,
			form: settingsConfig.form.oauthUserUpdate,
			name: 'updateUser',
			label: translation.updateUser[LANG],
			data: user,
			actions: [
				{
					'type': 'submit',
					'label': translation.updateoAuthUser[LANG],
					'btn': 'primary',
					'action': function (formData) {
						var postData = {
							'userId': formData.userId,
							'password': formData.password
						};
						getSendDataFromServer($scope, ngDataApi, {
							"method": "put",
							"routeName": "/dashboard/settings/tenant/oauth/users/update",
							"data": postData,
							"params": {'uId': user['_id']}
						}, function (error) {
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', translation.userUpdatedSuccessfully[LANG]);
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listOauthUsers();
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						$scope.modalInstance.dismiss('cancel');
						$scope.form.formData = {};
					}
				}
			]
		};

		buildFormWithModal($scope, $modal, options);
	};

	$scope.addNewKey = function (appId) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "post",
			"routeName": "/dashboard/settings/tenant/application/key/add",
			"params": {"appId": appId}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', translation.applicationKeyAddedSuccessfully[LANG]);
				$scope.listKeys(appId);
			}
		});
	};

	$scope.emptyConfiguration = function (appId, key, env) {
		var configObj = {};
		var postData = {
			'envCode': env,
			'config': configObj
		};

		getSendDataFromServer($scope, ngDataApi, {
			"method": "put",
			"routeName": "/dashboard/settings/tenant/application/key/config/update",
			"data": postData,
			"params": {"appId": appId, "key": key}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', translation.keyConfigurationUpdatedSuccessfully[LANG]);
				$scope.reloadConfiguration(appId, key);
			}
		});

	};

	$scope.updateConfiguration = function (appId, key, env, value) {
		var data = {};
		if (value) {
			data.config = angular.copy (value);
		}
		if (env) {
			data.envCode = env;
		}
		var options = {
			timeout: $timeout,
			form: settingsConfig.form.keyConfig,
			name: 'updatekeyConfig',
			label: translation.updateKeyConfiguration[LANG],
			data: data,
			actions: [
				{
					'type': 'submit',
					'label': translation.submit[LANG],
					'btn': 'primary',
					'action': function (formData) {
						var configObj = (formData.config) ? formData.config : {};

						var postData = {
							'envCode': formData.envCode,
							'config': configObj
						};

						getSendDataFromServer($scope, ngDataApi, {
							"method": "put",
							"routeName": "/dashboard/settings/tenant/application/key/config/update",
							"data": postData,
							"params": {"appId": appId, "key": key}
						}, function (error) {
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', translation.keyConfigurationUpdatedSuccessfully[LANG]);
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.reloadConfiguration(appId, key);
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						$scope.modalInstance.dismiss('cancel');
						$scope.form.formData = {};
					}
				}
			]
		};

		buildFormWithModal($scope, $modal, options);
	};

	$scope.addNewExtKey = function (appId, key, packageCode) {
		var formConfig = angular.copy(settingsConfig.form.extKey);
		if ($scope.packagesAcl[packageCode] !== null) {
			formConfig.entries.forEach(function (oneFormField) {
				if(oneFormField.name === 'environment') {
					var list = [];

					if ($scope.packagesAcl[packageCode].type === 'new') {
						//new acl, display envs available in acl only
						Object.keys($scope.packagesAcl[packageCode].acl).forEach(function(envCode) {
							list.push({"v": envCode, "l": envCode, "selected": (envCode === $scope.currentEnv)});
						});
					} else {
						//old acl, display available envs
						$scope.availableEnv.forEach(function(envCode) {
							list.push({"v": envCode, "l": envCode, "selected": (envCode === $scope.currentEnv)});
						});
					}

					oneFormField.value = list;
				}
			});
		}
		//if package has emtpy acl, nothing will be displayed in environments dropdown
		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'addExtKey',
			label: translation.addNewExternalKey[LANG],
			sub: true,
			actions: [
				{
					'type': 'submit',
					'label': translation.submit[LANG],
					'btn': 'primary',
					'action': function (formData) {
						var deviceObj = (formData.device) ? formData.device : {};
						var geoObj = (formData.geo) ? formData.geo : {};

						var postData = {
							'expDate': formData.expDate,
							'device': deviceObj,
							'geo': geoObj,
							'env': formData.environment
						};

						getSendDataFromServer($scope, ngDataApi, {
							"method": "post",
							"routeName": "/dashboard/settings/tenant/application/key/ext/add",
							"data": postData,
							"params": {"appId": appId, "key": key}
						}, function (error) {
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', translation.externalKeyAddedSuccessfully[LANG]);
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listExtKeys(appId, key);
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						$scope.modalInstance.dismiss('cancel');
						$scope.form.formData = {};
					}
				}]
		};

		buildFormWithModal($scope, $modal, options);
	};

	$scope.editExtKey = function (appId, data, key) {
		var dataForm = angular.copy(data);
		if (data.geo) {
			dataForm.geo = angular.copy (data.geo);
		}
		if (data.device) {
			dataForm.device = angular.copy (data.device);
		}

		var formConfig = angular.copy(settingsConfig.form.extKey);
		for (var i = 0; i < formConfig.entries.length; i++) {
			if (formConfig.entries[i].name === 'environment') {
				formConfig.entries.splice(i, 1);
				break;
			}
		}

		formConfig.entries.unshift({
			'name': 'extKey',
			'label': translation.externalKeyValue[LANG],
			'type': 'textarea',
			'rows': 3,
			'required': false
		});
		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'editExtKey',
			label: translation.editExternalKey[LANG],
			sub: true,
			data: dataForm,
			actions: [
				{
					'type': 'submit',
					'label': translation.submit[LANG],
					'btn': 'primary',
					'action': function (formData) {
						var deviceObj = (formData.device) ? formData.device : {};
						var geoObj = (formData.geo) ? formData.geo : {};

						var postData = {
							'device': deviceObj,
							'geo': geoObj,
							'extKey': data.extKey
						};
						if (formData.expDate) {
							postData.expDate = new Date(formData.expDate).toISOString();
						}

						getSendDataFromServer($scope, ngDataApi, {
							"method": "put",
							"routeName": "/dashboard/settings/tenant/application/key/ext/update",
							"data": postData,
							"params": {"appId": appId, "key": key, "extKeyEnv": data.env}
						}, function (error) {
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', translation.externalKeyUpdatedSuccessfully[LANG]);
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listExtKeys(appId, key);
							}
						});

					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						$scope.modalInstance.dismiss('cancel');
						$scope.form.formData = {};
					}
				}]
		};
		buildFormWithModal($scope, $modal, options);
	};

	$scope.removeExtKey = function (appId, data, key) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "post",
			"routeName": "/dashboard/settings/tenant/application/key/ext/delete",
			"data": {'extKey': data.extKey, 'extKeyEnv': data.env},
			"params": {"appId": appId, "key": key}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', translation.externalKeyRemovedSuccessfully[LANG]);
				$scope.listExtKeys(appId, key);
			}
		});
	};

	$scope.listExtKeys = function (appId, key) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/settings/tenant/application/key/ext/list",
			"params": {"appId": appId, "key": key}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {

				var apps = $scope.tenant.applications;
				for (var j = 0; j < apps.length; j++) {

					if (apps[j].appId === appId) {
						var app = apps[j];
						var keys = app.keys;
						for (var v = 0; v < keys.length; v++) {

							if (keys[v].key === key) {
								delete response['soajsauth'];
								var extKeys = keys[v].extKeys;
								for (var k = 0; k < extKeys.length; k++) {
									if (extKeys[k].dashboardAccess && extKeys[k].dashboardAccess === true) {
										for (var l = 0; l < response.length; l++) {
											if (response[l].extKey === extKeys[k].extKey) {
												response[l]['dashboardAccess'] = true;
												break;
											}
										}
									}
								}
								$scope.tenant.applications[j].keys[v].extKeys = response;
							}
						}
						break;
					}
				}

			}
		});
	};

	$scope.listKeys = function (appId) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/settings/tenant/application/key/list",
			"params": {"appId": appId}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				delete response['soajsauth'];
				var apps = $scope.tenant.applications;
				for (var j = 0; j < apps.length; j++) {

					if (apps[j].appId === appId) {
						$scope.tenant.applications[j].keys = response;
						break;
					}
				}

			}
		});
	};

	$scope.reloadConfiguration = function (appId, key) {
		$scope.currentApplicationKey = key;

		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/settings/tenant/application/key/config/list",
			"params": {"appId": appId, "key": key}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				if (JSON.stringify(response) !== '{}') {
					delete response['soajsauth'];

					var apps = $scope.tenant.applications;
					for (var j = 0; j < apps.length; j++) {
						if (apps[j].appId === appId) {
							var app = apps[j];
							var keys = app.keys;
							for (var v = 0; v < keys.length; v++) {
								if (keys[v].key === key) {
									$scope.tenant.applications[j].keys[v].config = response;
								}
							}
							break;
						}
					}
				}
			}
		});
	};

	$scope.getTenant(true);
	injectFiles.injectCss("modules/dashboard/settings/settings.css");

}]);
