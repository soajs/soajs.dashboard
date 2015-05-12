"use strict";
var settingsApp = soajsApp.components;
settingsApp.controller('settingsCtrl', ['$scope', '$timeout', '$modal', '$routeParams', '$compile', 'ngDataApi', function($scope, $timeout, $modal, $routeParams, $compile, ngDataApi) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, settingsConfig.permissions);

	$scope.oAuthUsers={};
	$scope.oAuthUsers.list=[];

	$scope.getTenant = function(first) {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/settings/tenant/get"
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.tenant =  response;
				if(first && first==true){
					$scope.listOauthUsers();
				}

			}
		});
	};

	$scope.clearOauth = function(){
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/settings/tenant/oauth/delete",
			"params": { }
		}, function(error) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', 'Tenant OAuth Deleted Successfully.');
				$scope.getTenant();
			}
		});
	};

	$scope.saveTenant = function(){
		var postData = {
			'name': $scope.tenant.name,
			'description': $scope.tenant.description
		};
		getSendDataFromServer(ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/settings/tenant/update",
			"data": postData,
			"params": {"id": $scope.tenant['_id']}
		}, function(error) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				if($scope.tenant.oauth.secret && $scope.access.tenant.oauth.update) {
					var oAuthData = {
						'secret': $scope.tenant.oauth.secret
					};
					getSendDataFromServer(ngDataApi, {
						"method": "send",
						"routeName": "/dashboard/settings/tenant/oauth/update",
						"data": oAuthData,
						"params": { }
					}, function(error) {
						if(error) {
							$scope.form.displayAlert('danger', error.message);
						}
						else {
							$scope.$parent.displayAlert('success', 'Tenant Info Updated Successfully.');
							$scope.getTenant();
						}
					});
				}
				else {
					$scope.$parent.displayAlert('success', 'Tenant Updated Successfully.');
					//$scope.getTenant();
				}
			}
		});
	};

	$scope.openKeys = function( app) {
		app.showKeys = true;
	};

	$scope.closeKeys = function( app) {
		app.showKeys = false;
	};

	$scope.removeAppKey = function(app, key, event) {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/settings/tenant/application/key/delete",
			"params": {"id": id, "appId": app.appId, "key": key}
		}, function(error) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', 'Application Key Removed Successfully.');
				$scope.listKeys( app.appId);
			}
		});
		if(event && event.stopPropagation){
			event.stopPropagation();
		}
	};

	$scope.getEnvironments = function() {
		$scope.availableEnv = [];
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment/list"
		}, function(error, response) {
			if(error) {
				console.log('Error: '+error.message);
			}
			else {
				response.forEach(function(oneEnv) {
					$scope.availableEnv.push(oneEnv.code.toLowerCase());
				});
			}
		});
	};

	$scope.editMyOauthUser = function(user) {
		user.password = null;
		user.confirmPassword = null;
		var options = {
			timeout: $timeout,
			form: settingsConfig.form.oauthUserUpdate,
			name: 'updateUser',
			label: 'Update User',
			data: user,
			actions: [
				{
					'type': 'submit',
					'label': 'Update oAuth User',
					'btn': 'primary',
					'action': function(formData) {
						var postData = {
							'userId': formData.userId
						};
						if(formData.password && formData.password!= '' ){
							if(formData.password === formData.confirmPassword){
								postData.password	= formData.password;
							}else{
								$scope.form.displayAlert('danger', 'Password and Confirm Password fields do not match.');
								return;
							}
						}

						getSendDataFromServer(ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/settings/tenant/oauth/users/update",
							"data": postData,
							"params": {'uId': user['_id']}
						}, function(error) {
							if(error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', 'User Updated Successfully.');
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listOauthUsers();
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': 'Cancel',
					'btn': 'danger',
					'action': function() {
						$scope.modalInstance.dismiss('cancel');
						$scope.form.formData = {};
					}
				}
			]
		};

		buildFormWithModal($scope, $modal, options);
	};

	$scope.addThisOauthUser = function() {
		var options = {
			timeout: $timeout,
			form: settingsConfig.form.oauthUser,
			name: 'addUser',
			label: 'Add New oAuth User',
			data: {
				'userId':null,
				'user_password': null
			},
			actions: [
				{
					'type': 'submit',
					'label': 'Add oAuth User',
					'btn': 'primary',
					'action': function(formData) {
						if(formData.user_password !== formData.confirmPassword){
							$scope.form.displayAlert('danger', 'Password and Confirm Password fields do not match.');
							return;
						}
						var postData = {
							'userId': formData.userId,
							'password': formData.user_password
						};

						getSendDataFromServer(ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/settings/tenant/oauth/users/add",
							"data": postData
						}, function(error) {
							if(error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', 'User Added Successfully.');
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listOauthUsers();
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': 'Cancel',
					'btn': 'danger',
					'action': function() {
						$scope.modalInstance.dismiss('cancel');
						$scope.form.formData = {};
					}
				}
			]
		};
		buildFormWithModal($scope, $modal, options);
	};

	$scope.listOauthUsers = function() {
		if($scope.access.tenant.oauth.users.list){
			getSendDataFromServer(ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/settings/tenant/oauth/users/list",
				"params": { }
			}, function(error, response) {
				if(error) {
					$scope.$parent.displayAlert('danger', error.message);
				}
				else {
					$scope.oAuthUsers.list = response;
				}
			});
		}
	};

	$scope.removeTenantOauthUser = function(user) {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/settings/tenant/oauth/users/delete",
			"params": { 'uId': user['_id']}
		}, function(error) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', 'User Deleted Successfully.');
				$scope.listOauthUsers();
			}
		});
	};

	$scope.editTenantOauthUser = function(user) {
		user.password = null;
		user.confirmPassword = null;
		var options = {
			timeout: $timeout,
			form: settingsConfig.form.oauthUserUpdate,
			name: 'updateUser',
			label: 'Update User',
			data: user,
			actions: [
				{
					'type': 'submit',
					'label': 'Update oAuth User',
					'btn': 'primary',
					'action': function(formData) {
						var postData = {
							'userId': formData.userId,
							'password': formData.password
						};
						getSendDataFromServer(ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/settings/tenant/oauth/users/update",
							"data": postData,
							"params": { 'uId': user['_id']}
						}, function(error) {
							if(error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', 'User Updated Successfully.');
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listOauthUsers();
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': 'Cancel',
					'btn': 'danger',
					'action': function() {
						$scope.modalInstance.dismiss('cancel');
						$scope.form.formData = {};
					}
				}
			]
		};

		buildFormWithModal($scope, $modal, options);
	};

	$scope.addNewKey = function( appId) {
		getSendDataFromServer(ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/settings/tenant/application/key/add",
			"params": {"appId": appId}
		}, function(error) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', 'Application Key Added Successfully.');
				$scope.listKeys( appId);
			}
		});
	};

	$scope.emptyConfiguration = function( appId, key, env) {
		var configObj = {};
		var postData = {
			'envCode': env,
			'config': configObj
		};

		getSendDataFromServer(ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/settings/tenant/application/key/config/update",
			"data": postData,
			"params": { "appId": appId, "key": key}
		}, function(error) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', 'Key Configuration Updated Successfully.');
				$scope.reloadConfiguration(appId, key);
			}
		});

	};

	$scope.updateConfiguration = function( appId, key, env, value) {
		var data = {};
		if(value) {
			data.config = JSON.stringify(value, null, "\t");
		}
		if(env) {
			data.envCode = env;
		}
		var options = {
			timeout: $timeout,
			form: settingsConfig.form.keyConfig,
			name: 'updatekeyConfig',
			label: 'Update Key Configuration',
			labels: {
				submit: 'Update'
			},
			data: data,
			sub: true,
			actions: [
				{
					'type': 'submit',
					'label': 'Submit',
					'btn': 'primary',
					'action': function(formData) {
						var configObj;
						if(formData.config && (formData.config != "")) {
							try {
								configObj = JSON.parse(formData.config);
							}
							catch(e) {
								$scope.form.displayAlert('danger', 'Error: Invalid Config Json object ');
								return;
							}
						}
						else {
							configObj = {};
						}

						var postData = {
							'envCode': formData.envCode,
							'config': configObj
						};

						getSendDataFromServer(ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/settings/tenant/application/key/config/update",
							"data": postData,
							"params": {"appId": appId, "key": key}
						}, function(error) {
							if(error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', 'Key Configuration Updated Successfully.');
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.reloadConfiguration( appId, key);
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': 'Cancel',
					'btn': 'danger',
					'action': function() {
						$scope.modalInstance.dismiss('cancel');
						$scope.form.formData = {};
					}
				}]

		};

		buildFormWithModal($scope, $modal, options);
	};

	$scope.addNewExtKey = function( appId, key) {
		var options = {
			timeout: $timeout,
			form: settingsConfig.form.extKey,
			name: 'addExtKey',
			label: 'Add New External Key',
			sub: true,
			actions: [
				{
					'type': 'submit',
					'label': 'Submit',
					'btn': 'primary',
					'action': function(formData) {
						var deviceObj, geoObj;
						if(formData.device && (formData.device != "")) {
							try {
								deviceObj = JSON.parse(formData.device);
							}
							catch(e) {
								$scope.form.displayAlert('danger', 'Error: Invalid device Json object ');
								return;
							}
						}
						else {
							deviceObj = {};
						}
						if(formData.geo && (formData.geo != "")) {
							try {
								geoObj = JSON.parse(formData.geo);
							}
							catch(e) {
								$scope.form.displayAlert('danger', 'Error: Invalid geo Json object ');
								return;
							}
						}
						else {
							geoObj = {};
						}

						var postData = {
							'expDate': formData.expDate,
							'device': deviceObj,
							'geo': geoObj
						};


						getSendDataFromServer(ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/settings/tenant/application/key/ext/add",
							"data": postData,
							"params": { "appId": appId, "key": key}
						}, function(error) {
							if(error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', 'External Key Added Successfully.');
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listExtKeys( appId, key);
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': 'Cancel',
					'btn': 'danger',
					'action': function() {
						$scope.modalInstance.dismiss('cancel');
						$scope.form.formData = {};
					}
				}]
		};

		buildFormWithModal($scope, $modal, options);
	};

	$scope.editExtKey = function( appId, data, key) {
		var dataForm = angular.copy(data);
		if(data.geo) { dataForm.geo = JSON.stringify(data.geo, null, "\t"); }
		if(data.device) { dataForm.device = JSON.stringify(data.device, null, "\t"); }

		var formConfig = angular.copy(settingsConfig.form.extKey);
		formConfig.entries.unshift({
			'name': 'extKey',
			'label': 'External Key Value',
			'type': 'textarea',
			'rows': 3,
			'required': false
		});
		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'editExtKey',
			label: 'Edit External Key',
			sub: true,
			data: dataForm,
			actions: [
				{
					'type': 'submit',
					'label': 'Submit',
					'btn': 'primary',
					'action': function(formData) {
						var geoObj, deviceObj;
						if(formData.device && (formData.device != "")) {
							try {
								deviceObj = JSON.parse(formData.device);
							}
							catch(e) {
								$scope.form.displayAlert('danger', 'Error: Invalid device Json object ');
								return;
							}
						}
						else {
							deviceObj = {};
						}
						if(formData.geo && (formData.geo != "")) {
							try {
								geoObj = JSON.parse(formData.geo);
							}
							catch(e) {
								$scope.form.displayAlert('danger', 'Error: Invalid geo Json object ');
								return;
							}
						}
						else {
							geoObj = {};
						}

						var postData = {
							'device': deviceObj,
							'geo': geoObj,
							'extKey': data.extKey
						};
						if(formData.expDate) {
							postData.expDate = new Date(formData.expDate).toISOString();
						}

						getSendDataFromServer(ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/settings/tenant/application/key/ext/update",
							"data": postData,
							"params": {"appId": appId, "key": key}
						}, function(error) {
							if(error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', 'External Key Updated Successfully.');
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listExtKeys( appId, key);
							}
						});

					}
				},
				{
					'type': 'reset',
					'label': 'Cancel',
					'btn': 'danger',
					'action': function() {
						$scope.modalInstance.dismiss('cancel');
						$scope.form.formData = {};
					}
				}]
		};
		buildFormWithModal($scope, $modal, options);
	};

	$scope.removeExtKey = function( appId, data, key) {
		getSendDataFromServer(ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/settings/tenant/application/key/ext/delete",
			"data": {'extKey': data.extKey},
			"params": { "appId": appId, "key": key}
		}, function(error) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', 'External Key Removed Successfully.');
				$scope.modalInstance.close();
				$scope.form.formData = {};
				$scope.listExtKeys( appId, key);
			}
		});
	};

	$scope.listExtKeys = function( appId, key) {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/settings/tenant/application/key/ext/list",
			"params": { "appId": appId, "key": key}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {

				var apps = $scope.tenant.applications;
				for(var j = 0; j < apps.length; j++) {

					if(apps[j].appId === appId) {
						var app = apps[j];
						var keys = app.keys;
						for(var v = 0; v < keys.length; v++) {

							if(keys[v].key === key) {
								delete response['soajsauth'];
								$scope.tenant.applications[j].keys[v].extKeys = response;
							}
						}
						break;
					}
				}

			}
		});
	};

	$scope.listKeys = function(appId) {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/settings/tenant/application/key/list",
			"params": { "appId": appId}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				delete response['soajsauth'];
				var apps = $scope.tenant.applications;
				for(var j = 0; j < apps.length; j++) {

					if(apps[j].appId === appId) {
						$scope.tenant.applications[j].keys = response;
						break;
					}
				}

			}
		});
	};

	$scope.reloadConfiguration = function(appId, key) {
		$scope.currentApplicationKey = key;

		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/settings/tenant/application/key/config/list",
			"params": { "appId": appId, "key": key}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				if(JSON.stringify(response) !== '{}') {
					delete response['soajsauth'];

					var apps = $scope.tenant.applications;
					for(var j = 0; j < apps.length; j++) {
						if(apps[j].appId === appId) {
							var app = apps[j];
							var keys = app.keys;
							for(var v = 0; v < keys.length; v++) {
								if(keys[v].key === key) {
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

	if($scope.access.environment.list){
		$scope.getEnvironments();
	}
	$scope.getTenant( true );

}]);