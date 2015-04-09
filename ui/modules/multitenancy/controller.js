"use strict";
var multiTenantApp = soajsApp.components;
multiTenantApp.controller('tenantCtrl', ['$scope', '$timeout', '$modal', '$routeParams', 'ngDataApi', function($scope, $timeout, $modal, $routeParams, ngDataApi) {
	$scope.$parent.isUserLoggedIn();

	$scope.listTenants = function() {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/tenant/list"
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.grid = {
					rows: response
				};
				$scope.grid.actions = {
					'editTenant':{
						'label': 'Edit Tenant',
						'command': function(row) {
							$scope.edit_Tenant(row);
						}
					},
					'editoAuth': {
						'label': 'Edit Oauth',
						'command': function(row) {
							$scope.editOauth(row);
						}
					},	
					'edit': {
						'label': 'Edit',
						'command': function(row) {
							$scope.$parent.go("/multi-tenancy/edit/" + row._id);
						}
					},
					'delete': {
						'label': 'Remove',
						'commandMsg': "Are you sure you want to remove this tenant ?",
						'command': function(row) {
							$scope.removeTenant(row);
						}
					}
				};
			}
		});
	};
	
	$scope.edit_Tenant = function(data) {
		var formConfig = angular.copy(tenantConfig.form.tenant);
		formConfig.entries[0].type = 'readonly';
		formConfig.name = 'editTenant';
		formConfig.label = 'Edit Basic Tenant Information';
		formConfig.timeout = $timeout;

		var keys = Object.keys(data);
		for(var i = 0; i < formConfig.entries.length; i++) {
			keys.forEach(function(inputName) {
				if(formConfig.entries[i].name === inputName) {
					formConfig.entries[i].value = data[inputName];
				}
			});
		}
		
		var options = {
				timeout: $timeout,
				form: formConfig,
				name: 'editTenant',
				label: 'Edit Basic Tenant Information',
				data: {},
				actions: [
					{
						'type': 'submit',
						'label': 'Update Tenant',
						'btn': 'primary',
						'action': function(formData) {
							var postData = {
									'name': formData.name,
									'description': formData.description
								};
								getSendDataFromServer(ngDataApi, {
									"method": "send",
									"routeName": "/dashboard/tenant/update",
									"data": postData,
									"params": {"id": data['_id'] }
								}, function(error, response) {
									if(error) {
										$scope.$parent.displayAlert('danger', error.message);
									}
									else {
										$scope.$parent.displayAlert('success', 'Tenant Upated Successfully.');
										$scope.modalInstance.close();
										$scope.form.formData = {};
										$scope.listTenants();
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
		//$scope.$parent.$emit('listOAuth', {'tenantRecord': response.oauth});
		//$scope.$parent.$emit('listApplications', {'tenantRecord': response.applications});
	
	}
	$scope.editOauth = function(data) {
		console.log( data ) ; 
		var oAuth = data.oauth;
		
		var formConfig = angular.copy(tenantConfig.form.oauth);
		formConfig.name = 'editTenantOAuth';
		formConfig.label = 'Edit Tenant OAuth';
		formConfig.timeout = $timeout;
		formConfig.buttonLabels = {
			submit: 'Update',
			remove: 'Remove',
			cancel: 'Cancel'
		};
		
		var keys = Object.keys(oAuth);
		for(var i = 0; i < formConfig.entries.length; i++) {
			keys.forEach(function(inputName) {
				if(formConfig.entries[i].name === inputName) {
					formConfig.entries[i].value = oAuth[inputName];
				}
			});
		}
		
		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'editTenantOAuth',
			label: 'Edit Tenant OAuth',
			data: {},			
			actions: [
			{
				'type': 'submit',
				'label': 'Save oAuth',
				'btn': 'primary',
				'action': function(formData) {
					var postData = {
						'secret': formData.secret,
						'redirectURI': formData.redirectURI
					};										
					getSendDataFromServer(ngDataApi, {
						"method": "send",
						"routeName": "/dashboard/tenant/oauth/update",
						"data": postData,
						"params": {"id": data['_id'] }
					}, function(error, response) {
						if(error) {
							$scope.form.displayAlert('danger', error.message);
						}
						else {
							$scope.$parent.displayAlert('success', 'Tenant OAuth Upated Successfully.');
							$scope.modalInstance.close();
							$scope.form.formData = {};
							$scope.listTenants();
						}
					});				
				}
			},
			{
				'type': 'submit',
				'label': 'Delete oAuth',
				'btn': 'danger',
				'action': function(formData) {
					getSendDataFromServer(ngDataApi, {
						"method": "get",
						"routeName": "/dashboard/tenant/oauth/delete",						
						"params": {"id": data['_id'] }
					}, function(error, response) {
						if(error) {
							$scope.form.displayAlert('danger', error.message);
						}
						else {
							$scope.$parent.displayAlert('success', 'Tenant OAuth Deleted Successfully.');
							$scope.modalInstance.close();
							$scope.form.formData = {};
							$scope.listTenants();
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
	
	$scope.removeTenant = function(row) {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/tenant/delete",
			"params": {"id": row._id}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', "Tenant removed successfully.");
				$scope.listTenants();
			}
		});
	};

	$scope.addTenant = function() {
		var options = {
			timeout: $timeout,
			form: tenantConfig.form.tenant,
			type: 'tenant',
			name: 'addTenant',
			label: 'Add New Tenant',
			actions: [
				{
					'type': 'submit',
					'label': 'Add Tenant',
					'btn': 'primary',
					'action': function(formData) {

						var postData = {
							'code': formData.code,
							'name': formData.name,
							'description': formData.description
						};
						getSendDataFromServer(ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/tenant/add",
							"data": postData
						}, function(error, response) {
							if(error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', 'Tenant Added Successfully.');
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listTenants();
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

	$scope.editTenant = function() {
		var tenantId = $routeParams.id;
		if(!tenantId) {
			$scope.$parent.displayAlert('danger', 'Invalid Tenant Id Provided.');
			$scope.$parent.go("/multi-tenancy");
		}

		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/tenant/get",
			"params": {'id': tenantId}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
				$scope.$parent.go("/multi-tenancy");
			}
			else {
				var formConfig = angular.copy(tenantConfig.form.tenant);
				formConfig.entries[0].type = 'readonly';
				formConfig.name = 'editTenant';
				formConfig.label = 'Edit Basic Tenant Information';
				formConfig.timeout = $timeout;

				var keys = Object.keys(response);
				for(var i = 0; i < formConfig.entries.length; i++) {
					keys.forEach(function(inputName) {
						if(formConfig.entries[i].name === inputName) {
							formConfig.entries[i].value = response[inputName];
						}
					});
				}

				formConfig.actions = {};

				buildForm($scope, false, formConfig);
				$scope.$parent.$emit('listOAuth', {'tenantRecord': response.oauth});
				$scope.$parent.$emit('listApplications', {'tenantRecord': response.applications});
			}
		});
	};
	
	$scope.addTenantApplication = function(tId) {
		console.log( 'tId: ' + tId) ; 
		var options = {
			timeout: $timeout,
			form: tenantConfig.form.application,
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
							'productCode': formData.product,
							'packageCode': formData.package,
							'description': formData.description,
							'_TTL': Array.isArray(formData._TTL) ? formData._TTL.join("") : formData._TTL
						};
						if(formData.acl) {
							postData.acl = JSON.parse(formData.acl);
						}

						getSendDataFromServer(ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/tenant/application/add",
							"data": postData,
							"params": {"id": tId}
						}, function(error, response) {
							if(error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', 'Application Added Successfully.');
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.reloadApplications(tId);
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
	
	$scope.editTenantApplication = function(tId, data) {
		console.log( 'tId: ' + tId) ; 
		var formConfig = angular.copy(tenantConfig.form.application);
		var recordData = angular.copy(data);
		recordData.package = recordData.package.split("_")[1];
		recordData._TTL = recordData._TTL / 3600;
		recordData.acl = (recordData.acl) ? JSON.stringify(recordData.acl, null, "\t") : "{\n}";

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

						var postData = {
							'productCode': formData.product,
							'packageCode': formData.package,
							'description': formData.description,
							'_TTL': Array.isArray(formData._TTL) ? formData._TTL.join("") : formData._TTL
						};
						if(formData.acl) {
							postData.acl = JSON.parse(formData.acl);
						}

						getSendDataFromServer(ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/tenant/application/update",
							"data": postData,
							"params": {"id": tId, "appId": data.appId}
						}, function(error, response) {
							if(error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', 'Application Updated Successfully.');
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.reloadApplications(tId);
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
	
	$scope.reloadApplications = function(tId) {
		console.log( 'reloadApplications tId: ' + tId) ; 
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/tenant/application/list",
			"params": {"id": tId }
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				console.log( $scope.grid.rows );
				for(var i = 0; i < $scope.grid.rows.length; i++) {
					if($scope.grid.rows[i]['_id'] === tId) {
						$scope.grid.rows[i].applications = response;
					}
				}
			}
		});
	};
	
	$scope.removeTenantApplication = function(Id, appId) {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/tenant/application/delete",
			"params": {"id": Id, "appId": appId}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', "Selected Application has been removed.");
				//$scope.listTenants();
				$scope.reloadApplications(Id);
			}
		});
	};

	//default operation
	$scope.listTenants();
}]);

multiTenantApp.controller('tenantOauthCtrl', ['$scope', '$timeout', '$modal', '$routeParams', 'ngDataApi', function($scope, $timeout, $modal, $routeParams, ngDataApi) {
	$scope.$parent.isUserLoggedIn();

	$scope.$parent.$on('listOAuth', function(event, args) {
		$scope.printOAuthForm(args.tenantRecord);
	});

	$scope.printOAuthForm = function(oAuth) {};
}]);

multiTenantApp.controller('tenantApplicationsCtrl', ['$scope', '$timeout', '$modal', '$routeParams', 'ngDataApi', function($scope, $timeout, $modal, $routeParams, ngDataApi) {
	$scope.$parent.isUserLoggedIn();

	$scope.$parent.$on('listApplications', function(event, args) {
		$scope.listApplications(args.tenantRecord);
	});

	$scope.listApplications = function(applications) {
		//print the grid of packages
		var options = {
			grid: tenantConfig.grid.applications,
			data: applications,
			defaultSortField: 'product',
			left: [{
				'label': 'Browse',
				'icon': 'view',
				'handler': 'browseApplication'
			}, {
				'label': 'Edit',
				'icon': 'edit',
				'handler': 'editApplication'
			}, {
				'label': 'Remove',
				'icon': 'remove',
				'msg': "Are you sure you want to remove this application?",
				'handler': 'removeApplication'
			}],
			top: [{
				'label': 'Remove',
				'msg': "Are you sure you want to remove the selected application(s)?",
				'handler': 'removeMultipleApplications'
			}]
		};
		buildGrid($scope, options);
	};

	$scope.reloadApplications = function() {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/tenant/application/list",
			"params": {"id": $routeParams.id}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.listApplications(response);
			}
		});
	};

	$scope.addApplication = function() {
		var options = {
			timeout: $timeout,
			form: tenantConfig.form.application,
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
							'productCode': formData.product,
							'packageCode': formData.package,
							'description': formData.description,
							'_TTL': Array.isArray(formData._TTL) ? formData._TTL.join("") : formData._TTL
						};
						if(formData.acl) {
							postData.acl = JSON.parse(formData.acl);
						}

						getSendDataFromServer(ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/tenant/application/add",
							"data": postData,
							"params": {"id": $routeParams.id}
						}, function(error, response) {
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

	$scope.editApplication = function(data) {
		var formConfig = angular.copy(tenantConfig.form.application);
		var recordData = angular.copy(data);
		recordData.package = recordData.package.split("_")[1];
		recordData._TTL = recordData._TTL / 3600;
		recordData.acl = (recordData.acl) ? JSON.stringify(recordData.acl, null, "\t") : "{\n}";

		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'editApplication',
			label: 'Edit Application',
			data: recordData,
			actions: [
			{
				'type': 'submit',
				'label': 'Submit',
				'btn': 'primary',
				'action': function(formData) {

					var postData = {
						'productCode': formData.product,
						'packageCode': formData.package,
						'description': formData.description,
						'_TTL': Array.isArray(formData._TTL) ? formData._TTL.join("") : formData._TTL
					};
					if(formData.acl && (formData.acl != "")) {
						try {
							var aclObj = JSON.parse(formData.acl);
							postData.acl = aclObj;
						}
						catch(e) {
							$scope.form.displayAlert('danger', 'Error: Invalid ACL Json object ');
							return;
						}
					}
					
					getSendDataFromServer(ngDataApi, {
						"method": "send",
						"routeName": "/dashboard/tenant/application/update",
						"data": postData,
						"params": {"id": $routeParams.id, "appId": data.appId}
					}, function(error, response) {
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
			}]
		};

		buildFormWithModal($scope, $modal, options);
	};

	$scope.removeApplication = function(data) {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/tenant/application/delete",
			"params": {"id": $routeParams.id, "appId": data.appId}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', "Selected Application has been removed.");
				$scope.reloadApplications();
			}
		});
	};

	$scope.removeMultipleApplications = function() {
		var config = {
			'routeName': "/dashboard/tenant/application/delete",
			"params": {'id': $routeParams.id, 'appId': '%appId%'},
			"override": {
				"fieldName": "appId"
			},
			'msg': {
				'error': 'one or more of the selected Application(s) status was not removed.',
				'success': 'Selected Application(s) has been removed.'
			}
		};

		multiRecordUpdate(ngDataApi, $scope, config, function(valid) {
			$scope.reloadApplications();
		});
	};

	$scope.browseApplication = function(data) {
		$scope.$parent.go("/multi-tenancy/" + $routeParams.id + "/application/" + data.appId + "/keys");
	};
}]);

multiTenantApp.controller('tenantKeysCtrl', ['$scope', '$timeout', '$modal', '$routeParams', '$compile', 'ngDataApi', function($scope, $timeout, $modal, $routeParams, $compile, ngDataApi) {
	$scope.$parent.isUserLoggedIn();

	$scope.tenantId = $routeParams.id;

	$scope.listKeys = function() {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/tenant/application/key/list",
			"params": {"id": $routeParams.id, "appId": $routeParams.appId}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.keys = response;
			}
		});
	};

	$scope.addNewKey = function() {
		getSendDataFromServer(ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/tenant/application/key/add",
			"params": {"id": $routeParams.id, "appId": $routeParams.appId}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', 'Application Key Added Successfully.');
				$scope.listKeys();
			}
		});
	};

	$scope.removeKey = function(key) {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/tenant/application/key/delete",
			"params": {"id": $routeParams.id, "appId": $routeParams.appId, "key": key}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', 'Application Key Removed Successfully.');
				$scope.listKeys();
			}
		});
	};

	$scope.openSubContent = function(key, index) {
		var element = angular.element(document.getElementById("keyConfig" + index));
		if(element.html().toString() === '') { $scope.listConfiguration(key, index); }
	};

	$scope.listKeys();

	/*
	 key configuration
	 */
	$scope.listConfiguration = function(key, index) {
		$scope.currentApplicationKey = key;
		$scope.currentApplicationKeyIndex = index;

		for(var i = 0; i < $scope.keys.length; i++) {
			if(i !== index) {
				var cfgElement = angular.element(document.getElementById("keyConfig" + i));
				cfgElement.html('');
				$compile(cfgElement.contents())($scope);
			}
		}

		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/tenant/application/key/config/list",
			"params": {"id": $routeParams.id, "appId": $routeParams.appId, "key": key}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				if(JSON.stringify(response) !== '{}') {
					//reshape response
					$scope.boxes = [];
					var envs = Object.keys(response);
					envs.forEach(function(oneEnv) {
						if(oneEnv !== 'soajsauth') {
							$scope.boxes.push({
								'env': oneEnv,
								'config': response[oneEnv]
							});
						}
					});

					var cfgElement = angular.element(document.getElementById("keyConfig" + $scope.currentApplicationKeyIndex));
					cfgElement.html('<button class="btn btn-primary" ng-click="updateConfiguration();">Add New Configuration</button><br /><br /><div ng-repeat="box in boxes" class="entryBox blueBox"><b>{{box.env}} Environment</b>&nbsp;&nbsp;<a href="" ng-click="updateConfiguration(box);"><img ng-src="themes/{{$parent.themeToUse}}/img/edit.png" border="0" alt="Edit" /></a>');
					$compile(cfgElement.contents())($scope);
				}
				else {
					var cfgElement = angular.element(document.getElementById("keyConfig" + $scope.currentApplicationKeyIndex));
					cfgElement.html('<button class="btn btn-primary" ng-click="updateConfiguration();">Add New Configuration</button><br /><br /><div class="alert-warning alert ng-isolate-scope alert-warning alert-dismissable"><span class="ng-scope ng-binding">No Configuration detected. Click to add new configuration.</span></div>');
					$compile(cfgElement.contents())($scope);
				}
			}
		});
	};

	$scope.updateConfiguration = function(data) {
		var options = {
			timeout: $timeout,
			form: tenantConfig.form.keyConfig,
			name: 'updatekeyConfig',
			label: 'Update Key Configuration',
			labels: {
				submit: 'Update'
			},
			data: (data) ? {'config': JSON.stringify(data.config, null, "\t"), 'envCode': data.env} : {},
			sub: true,
			actions: [
				{
					'type': 'submit',
					'label': 'Submit',
					'btn': 'primary',
					'action': function(formData) {
						if(formData.config && (formData.config != "")) {
							try {
								var configObj = JSON.parse(formData.config);
							}
							catch(e) {
								$scope.form.displayAlert('danger', 'Error: Invalid Config Json object ');
								return;
							}
						}
						else {
							var configObj = {};
						}
						
						var postData = {
							'envCode': formData.envCode,
							'config': configObj
						};

						getSendDataFromServer(ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/tenant/application/key/config/update",
							"data": postData,
							"params": {"id": $routeParams.id, "appId": $routeParams.appId, "key": $scope.currentApplicationKey}
						}, function(error, response) {
							if(error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', 'Key Configuration Updated Successfully.');
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listConfiguration($scope.currentApplicationKey, $scope.currentApplicationKeyIndex);
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

	/*
	 external keys
	 */
	$scope.listExtKeys = function(key, index) {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/tenant/application/key/ext/list",
			"params": {"id": $routeParams.id, "appId": $routeParams.appId, "key": key}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				var options = {
					grid: tenantConfig.grid.extKeys,
					data: response,
					defaultSortField: 'expDate',
					left: [{
						'label': 'Edit',
						'icon': 'edit',
						'handler': 'editExtKey'
					}, {
						'label': 'Remove',
						'icon': 'remove',
						'msg': "Are you sure you want to remove this external key?",
						'handler': 'removeExtKey'
					}]
				};
				buildGrid($scope, options);
				var extGrid = angular.element(document.getElementById('externalKeys' + index));
				$compile(extGrid.contents())($scope);
				$scope.currentApplicationKey = key;
				$scope.currentApplicationKeyIndex = index;
			}
		});
	};

	$scope.addNewExtKey = function() {
		var options = {
			timeout: $timeout,
			form: tenantConfig.form.extKey,
			name: 'addExtKey',
			label: 'Add New External Key',
			sub: true,
			actions: [
			{
				'type': 'submit',
				'label': 'Submit',
				'btn': 'primary',
				'action': function(formData) {

					var postData = {
						'expDate': formData.expDate,
						'device': formData.device,
						'geo': formData.geo
					};

					getSendDataFromServer(ngDataApi, {
						"method": "send",
						"routeName": "/dashboard/tenant/application/key/ext/add",
						"data": postData,
						"params": {"id": $routeParams.id, "appId": $routeParams.appId, "key": $scope.currentApplicationKey}
					}, function(error, response) {
						if(error) {
							$scope.form.displayAlert('danger', error.message);
						}
						else {
							$scope.$parent.displayAlert('success', 'External Key Added Successfully.');
							$scope.modalInstance.close();
							$scope.form.formData = {};
							$scope.listExtKeys($scope.currentApplicationKey, $scope.currentApplicationKeyIndex);
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

	$scope.editExtKey = function(data) {

		if(data.geo) { data.geo = JSON.stringify(data.geo, null, "\t"); }
		if(data.device) { data.device = JSON.stringify(data.device, null, "\t"); }

		var formConfig = angular.copy(tenantConfig.form.extKey);
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
			data: data,
			actions: [
			{
				'type': 'submit',
				'label': 'Submit',
				'btn': 'primary',
				'action': function(formData) {

					var postData = {
						'expDate': new Date(formData.expDate).toISOString(),
						'device': formData.device,
						'geo': formData.geo,
						'extKey': data.extKey
					};

					getSendDataFromServer(ngDataApi, {
						"method": "send",
						"routeName": "/dashboard/tenant/application/key/ext/update",
						"data": postData,
						"params": {"id": $routeParams.id, "appId": $routeParams.appId, "key": $scope.currentApplicationKey}
					}, function(error, response) {
						if(error) {
							$scope.form.displayAlert('danger', error.message);
						}
						else {
							$scope.$parent.displayAlert('success', 'External Key Updated Successfully.');
							$scope.modalInstance.close();
							$scope.form.formData = {};
							$scope.listExtKeys($scope.currentApplicationKey, $scope.currentApplicationKeyIndex);
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

	$scope.removeExtKey = function(data) {
		getSendDataFromServer(ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/tenant/application/key/ext/delete",
			"data": {'extKey': data.extKey},
			"params": {"id": $routeParams.id, "appId": $routeParams.appId, "key": $scope.currentApplicationKey}
		}, function(error, response) {
			if(error) {
				$scope.form.displayAlert('danger', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', 'External Key Removed Successfully.');
				$scope.modalInstance.close();
				$scope.form.formData = {};
				$scope.listExtKeys($scope.currentApplicationKey, $scope.currentApplicationKeyIndex);
			}
		});
	};
}]);