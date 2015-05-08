"use strict";
var settingsApp = soajsApp.components;
settingsApp.controller('settingsCtrl', ['$scope', '$timeout', '$modal', '$routeParams', '$compile', 'ngDataApi', function($scope, $timeout, $modal, $routeParams, $compile, ngDataApi) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, settingsConfig.permissions);

	$scope.oAuthUsers=[];

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
				if($scope.tenant.oauth.secret) {
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
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/settings/tenant/oauth/users/list",
			"params": { }
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				if(response.length > 0) {
					$scope.oAuthUsers = response;
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
				$scope.$parent.displayAlert('danger', error.message, id);
			}
			else {
				$scope.$parent.displayAlert('success', 'Application Key Removed Successfully.', id);
				$scope.listKeys( app.appId);
			}
		});
		if(event && event.stopPropagation){
			event.stopPropagation();
		}
	};

	$scope.getProds = function() {
		$scope.availablePackages = [];
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/product/list"
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				var prods = [];
				var len = response.length;
				var v, i;
				var p = {};
				for(v = 0; v < len; v++) {
					p = response[v];
					var ll = p.packages.length;
					for(i = 0; i < ll; i++) {
						prods.push({'pckCode': p.packages[i].code, 'prodCode': p.code, 'v': p.packages[i].code, 'l': p.packages[i].code, 'acl': p.packages[i].acl});
					}
				}
				$scope.availablePackages = prods;
			}
		});
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

	$scope.addOauthUser = function() {
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
						var postData = {
							'userId': formData.userId,
							'password': formData.password
						};
						getSendDataFromServer(ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/settings/tenant/oauth/users/add",
							"data": postData,
							"params": {}
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

	$scope.addTenantApplication = function() {
		var formConfig = angular.copy(settingsConfig.form.application);
		formConfig.entries.forEach(function(oneEn) {
			if(oneEn.type==='select'){
				oneEn.value[0].selected=true;
			}
			if(oneEn.name==='package')
			{
				oneEn.type="select";
				oneEn.value = $scope.availablePackages;
			}
			if(oneEn.name==='product'){
				oneEn.name='Prod';
			}
		});

		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'addApplication',
			label: 'Add New Application',
			sub: true,
			actions: [
				{
					'type': 'submit',
					'label': 'Add Application',
					'btn': 'primary',
					'action': function(formData) {

						var postData = {
							'description': formData.description,
							'_TTL': Array.isArray(formData._TTL) ? formData._TTL.join("") : formData._TTL
						};
						if(formData.package && (typeof(formData.package)=='string')){
							var productCode = formData.package.split("_")[0];
							var packageCode = formData.package.split("_")[1];
							postData.productCode = productCode;
							postData.packageCode = packageCode;
							getSendDataFromServer(ngDataApi, {
								"method": "send",
								"routeName": "/dashboard/settings/tenant/application/add",
								"data": postData
							}, function(error) {
								if(error) {
									$scope.form.displayAlert('danger', error.message);
								}
								else {
									$scope.$parent.displayAlert('success', 'Application Added Successfully.');
									$scope.modalInstance.close();
									$scope.form.formData = {};
									$scope.reloadApplications();
								}
							});
						}
						else{
							$scope.form.displayAlert('danger', "Choose a package.");
						}
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

		var entries = formConfig.entries.splice(0, 1);

		buildFormWithModal($scope, $modal, options);
	};
	$scope.editAppAcl = function(appId) {
		var tenId = $scope.tenant['_id'];
		$scope.$parent.go("/settings/"+tenId+"/editAcl/" + appId );
	};
	$scope.editTenantApplication = function( data) {
		var formConfig = angular.copy(settingsConfig.form.application);
		var recordData = angular.copy(data);
		recordData._TTL = recordData._TTL / 3600000;

		formConfig.entries[1].type = "html";
		formConfig.entries[0].type = "html";
		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'editApplication',
			label: 'Edit Application',
			data: recordData,
			actions: [
				{
					'type': 'submit',
					'label': 'Edit Application',
					'btn': 'primary',
					'action': function(formData) {
						var packageCode = formData.package.split("_")[1];
						var postData = {
							'productCode': formData.product,
							'packageCode': formData.package,
							'description': formData.description,
							'_TTL': Array.isArray(formData._TTL) ? formData._TTL.join("") : formData._TTL
						};

						postData.packageCode = packageCode;
						postData.acl = recordData.acl;
						getSendDataFromServer(ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/settings/tenant/application/update",
							"data": postData,
							"params": {"appId": data.appId}
						}, function(error) {
							if(error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', 'Application Updated Successfully.');
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.reloadApplications();
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

	$scope.reloadApplications = function() {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/settings/tenant/application/list"
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.tenant.applications = response;
			}
		});
	};

	$scope.removeTenantApplication = function( appId) {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/settings/tenant/application/delete",
			"params": {"appId": appId}
		}, function(error) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', "Selected Application has been removed.");
				$scope.reloadApplications();
			}
		});
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

	if($scope.access.product.list){
		$scope.getProds();
	}
	if($scope.access.environment.list){
		$scope.getEnvironments();
	}
	$scope.getTenant( true );

}]);