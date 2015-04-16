"use strict";
var multiTenantApp = soajsApp.components;
multiTenantApp.controller('tenantCtrl', ['$scope', '$timeout', '$modal', '$routeParams','$compile','ngDataApi', function($scope, $timeout, $modal, $routeParams,$compile,ngDataApi) {
	$scope.$parent.isUserLoggedIn();
	var currentApp = null;
	$scope.viewKeys = function(id, app) {
		if (currentApp && ( currentApp['appId']!= app['appId'] ))
		{
			currentApp.showKeys = false;
		}
		if (app.showKeys)
			app.showKeys = false;
		else
			app.showKeys = true;	
		currentApp = app;
	};
	$scope.openKeys = function(id, app) {
		console.log('openKeys: ' + app['appId']);
		app.showKeys = true;	
	};
	$scope.closeKeys = function(id, app) {
		console.log('closeKeys: ' + app['appId']);
		app.showKeys = false;			
	};
	$scope.removeAppKey = function(id, app, key, event) {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/tenant/application/key/delete",
			"params": {"id": id, "appId": app.appId, "key": key}
		}, function(error, response) {
			if(error) {
				$scope.$parent.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.$parent.$parent.displayAlert('success', 'Application Key Removed Successfully.');
				//$scope.reloadApplications(id);
				for(var i = 0; i < app.keys.length; i++) {
					if( app.keys[i]['key'] === key) {							
						app.keys.splice(i, 1);
						break;
					}
				}			
			}
		});
		if(event && event.stopPropagation){						
			event.stopPropagation();			
		}			
	};
	
	$scope.getProds = function() {
		$scope.availablePackages =[];
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/product/list"
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				// options.form = formConfig;
				var prods = [];
				var len = response.length;
				var v, i;
				var p ={};
				for(v = 0; v < len ; v++){
					p= response[v];					
					var ll = p.packages.length;
					for(i = 0; i < ll ; i++){
						prods.push( {'pckCode':p.packages[i].code , 'prodCode':p.code , 'v':p.packages[i].code , 'l': p.packages[i].code } );
					}					
				}
				$scope.availablePackages = prods;				
			}
		});		
	};
	$scope.getEnvironments = function() {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment/list"
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				//soajsauth
				$scope.availableEnv =[];			
				response.forEach(function(oneEnv) {
					$scope.availableEnv.push(oneEnv.code);
				});				
			}
		});
	};
	
	$scope.listTenants = function() {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/tenant/list"
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.tenantsList = {
					rows: response
				};
				$scope.tenantsList.actions = {
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
	
	$scope.listOauthUsers = function(row, index) {
		console.log( 'index: '+ index);
		console.log( 'row: ' );
		console.log( row );
		
		console.log( '$scope.tenantsList.rows[index]: ' );
		console.log( $scope.tenantsList.rows[index] );
		
		var tId = row['_id'];
		if(!row.alreadyGotAuthUsers){
			getSendDataFromServer(ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/tenant/oauth/users/list",
				"params": {"id": tId }
			}, function(error, response) {
				if(error) {
					$scope.$parent.displayAlert('danger', error.message);
				}
				else {
					row.alreadyGotAuthUsers = true;				
					if(response.length>0)
					{					
						for(var i = 0; i < $scope.tenantsList.rows.length; i++) {
							if($scope.tenantsList.rows[i]['_id'] === tId) {							
								$scope.tenantsList.rows[i].oAuthUsers = response;
								break;
							}
						}
					}
				}
			});
		}
	};

	
	$scope.edit_Tenant = function(data) {
		var formConfig = angular.copy(tenantConfig.form.tenantEdit);
		//formConfig.entries[0].type = 'readonly';
		//formConfig.label = 'Edit Basic Tenant Information';
		formConfig.timeout = $timeout;
		
		var oAuth = data.oauth;
		console.log('oAuth: ');
		console.log(oAuth);
		if(oAuth.secret)
		data.secret = oAuth.secret;
		if(oAuth.redirectURI)
		data.redirectURI = oAuth.redirectURI;
		
		var keys = Object.keys(data);
		console.log('keys: ');
		console.log(keys);
		
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
									$scope.form.displayAlert('danger', error.message);
								}
								else {
									if(formData.secret)
									{
										var oAuthData = {
											'secret': formData.secret,
											'redirectURI': formData.redirectURI
										};
										getSendDataFromServer(ngDataApi, {
											"method": "send",
											"routeName": "/dashboard/tenant/oauth/update",
											"data": oAuthData,
											"params": {"id": data['_id'] }
										}, function(error, response) {
											if(error) {
												$scope.form.displayAlert('danger', error.message);
											}
											else {
												$scope.$parent.displayAlert('success', 'Tenant Info Upated Successfully.');
												$scope.modalInstance.close();
												$scope.form.formData = {};
												$scope.listTenants();
											}
										});
										
									}
									else{
										$scope.$parent.displayAlert('success', 'Tenant Upated Successfully.');
										$scope.modalInstance.close();
										$scope.form.formData = {};
										$scope.listTenants();
									}								
								}
							});
						}
					},					
					{
						'type': 'submit',
						'label': 'Delete oAuth Info',
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
	}
	$scope.editOauth = function(data) {
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
			form: tenantConfig.form.tenantAdd,
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

	$scope.editTenant = function() {};
	
	
	$scope.browseApplication = function(tId,data) {
		$scope.$parent.go("/multi-tenancy/" + tId + "/application/" + data.appId + "/keys");
	};
	
	$scope.reloadOauthUsers = function(tId) { 
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/tenant/oauth/users/list",
			"params": {"id": tId }
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				for(var i = 0; i < $scope.tenantsList.rows.length; i++) {
					if($scope.tenantsList.rows[i]['_id'] === tId) {							
						$scope.tenantsList.rows[i].oAuthUsers = response;
						break;
					}
				}
			}
		});
	};
	
	$scope.removeTenantOauthUser = function(tId, user) {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/tenant/oauth/users/delete",
			"params": {"id": tId, 'uId':user['_id']}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', 'User Deleted Successfully.');
				$scope.reloadOauthUsers(tId);
			}
		});
	};
	
	$scope.editTenantOauthUser = function(tId, user) {
		user.password=null;
		var options = {
			timeout: $timeout,
			form: tenantConfig.form.oauthUserUpdate,
			name: 'updateUser',
			label: 'Update User',
			sub: true,
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
							"routeName": "/dashboard/tenant/oauth/users/update",
							"data": postData,
							"params": {"id": tId, 'uId':user['_id']}
						}, function(error, response) {
							if(error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', 'User Added Successfully.');
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.reloadOauthUsers(tId);
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
	$scope.addOauthUser = function(tId) {
		var options = {
			timeout: $timeout,
			form: tenantConfig.form.oauthUser,
			name: 'addUser',
			label: 'Add New oAuth User',
			sub: true,
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
							"routeName": "/dashboard/tenant/oauth/users/add",
							"data": postData,
							"params": {"id": tId}
						}, function(error, response) {
							if(error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', 'User Added Successfully.');
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.reloadOauthUsers(tId);
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
	$scope.addTenantApplication = function(tId) { 
		var formConfig = angular.copy(tenantConfig.form.application);
		console.log(formConfig.entries[1]);
		
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
						console.log( formData );	
						
						var productCode = formData.package.split("_")[0];
						var packageCode = formData.package.split("_")[1];
						
						var postData = {
							// 'productCode': formData.product,
							// 'packageCode': formData.package,
							'description': formData.description,
							'_TTL': Array.isArray(formData._TTL) ? formData._TTL.join("") : formData._TTL
						};
						postData.productCode = productCode;
						postData.packageCode = packageCode;
						
						if(formData.acl && (formData.acl != "")) {
							try {
								var aclObj = JSON.parse(formData.acl);							
							}
							catch(e) {
								$scope.form.displayAlert('danger', 'Error: Invalid ACL Json object ');
								return;
							}
						}
						else {
							var aclObj = {};
						}	
						postData.acl = aclObj;
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
		
		//formConfig.entries[1].label="Product Package";
		formConfig.entries[1].type="select";
		formConfig.entries[1].value= $scope.availablePackages;
		formConfig = formConfig.entries.splice(0, 1);
		buildFormWithModal($scope, $modal, options);	
	};
	
	$scope.editTenantApplication = function(tId, data) {
		//console.log( data );	
		var formConfig = angular.copy(tenantConfig.form.application);
		var recordData = angular.copy(data);
		//recordData.package = recordData.package.split("_")[1];
		recordData._TTL = recordData._TTL / 3600;
		recordData.acl = (recordData.acl) ? JSON.stringify(recordData.acl, null, "\t") : "{\n}";
		//console.log( recordData );
		
		formConfig.entries[1].type= "html" ;
		formConfig.entries[0].type= "html" ;
		//formConfig.entries[1].value= $scope.availablePackages;
	
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
						//console.log( 'formData: ' );console.log( formData );
						
						if(formData.acl && (formData.acl != "")) {
							try {
								var aclObj = JSON.parse(formData.acl);							
							}
							catch(e) {
								$scope.form.displayAlert('danger', 'Error: Invalid ACL Json object ');
								return;
							}
						}
						else {
							var aclObj = {};
						}
						var productCode = formData.package.split("_")[0];
						var packageCode = formData.package.split("_")[1];
						
						//console.log( 'recordData: ' ); console.log( recordData );
						
						var postData = {
							'productCode': formData.product,
							'packageCode': formData.package,
							'description': formData.description,
							'_TTL': Array.isArray(formData._TTL) ? formData._TTL.join("") : formData._TTL
						};
						
						//postData.productCode = productCode;
						postData.packageCode = packageCode;
						
						postData.acl = aclObj;
						//console.log( 'postData: ' ); console.log( postData );
						
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
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/tenant/application/list",
			"params": {"id": tId }
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				for(var i = 0; i < $scope.tenantsList.rows.length; i++) {
					if($scope.tenantsList.rows[i]['_id'] === tId) {
						$scope.tenantsList.rows[i].applications = response;
						break;
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
				$scope.reloadApplications(Id);
			}
		});
	};
	
	$scope.openSubContent = function(key, index) {
		console.log('openSubContent ; index: '+ index);
	};
	
	$scope.addNewKey = function(tId, appId) {
		getSendDataFromServer(ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/tenant/application/key/add",
			"params": {"id": tId, "appId": appId}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', 'Application Key Added Successfully.');
				$scope.listKeys(tId, appId);
			}
		});
	};

	$scope.emptyConfiguration = function(tId, appId, key, env) {
		var configObj = {};	
		var postData = {
			'envCode': env,
			'config': configObj
		};

		getSendDataFromServer(ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/tenant/application/key/config/update",
			"data": postData,
			"params": {"id": tId, "appId": appId, "key": key}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', 'Key Configuration Updated Successfully.');
				$scope.reloadConfiguration( tId, appId, key );
			}
		});
	
	};
	
	$scope.updateConfiguration = function(tId, appId, key, env, value) {
		var data = {};
		if(value){
			data.config =  JSON.stringify(value, null, "\t");			
		}
		if(env){
			data.envCode= env;
		}
		console.log(data);
		var options = {
			timeout: $timeout,
			form: tenantConfig.form.keyConfig,
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
							"params": {"id": tId, "appId": appId, "key": key}
						}, function(error, response) {
							if(error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', 'Key Configuration Updated Successfully.');
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.reloadConfiguration( tId, appId, key );
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

	$scope.addNewExtKey = function(tId, appId, key) {
		console.log( 'addNewExtKey for key: '+ key);
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
						if(formData.device && (formData.device != "")) {
							try {
								var deviceObj = JSON.parse(formData.device);
							}
							catch(e) {
								$scope.form.displayAlert('danger', 'Error: Invalid device Json object ');
								return;
							}
						}
						else {
							var deviceObj = {};
						}
						if(formData.geo && (formData.geo != "")) {
							try {
								var geoObj = JSON.parse(formData.geo);
							}
							catch(e) {
								$scope.form.displayAlert('danger', 'Error: Invalid geo Json object ');
								return;
							}
						}
						else {
							var geoObj = {};
						}
						
						var postData = {
							'expDate': formData.expDate,
							'device': deviceObj,
							'geo': geoObj
						};
						
						
						getSendDataFromServer(ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/tenant/application/key/ext/add",
							"data": postData,
							"params": {"id": tId, "appId": appId, "key": key}
						}, function(error, response) {
							if(error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', 'External Key Added Successfully.');
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listExtKeys(tId, appId, key);
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

	$scope.editExtKey = function(tId, appId, data, key) {
		console.log('tId: ' + tId) ;
		console.log('appId: ' + appId) ;
		console.log('key: ' + key) ;

		var dataForm = angular.copy(data);
		if(data.geo) { dataForm.geo = JSON.stringify(data.geo, null, "\t"); }
		if(data.device) { dataForm.device = JSON.stringify(data.device, null, "\t"); }		
		
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
			data: dataForm,
			actions: [
				{
					'type': 'submit',
					'label': 'Submit',
					'btn': 'primary',
					'action': function(formData) {
						console.log( 'expDate: '+formData.expDate );
						if(formData.device && (formData.device != "")) {
							try {
								var deviceObj = JSON.parse(formData.device);
							}
							catch(e) {
								$scope.form.displayAlert('danger', 'Error: Invalid device Json object ');
								return;
							}
						}
						else {
							var deviceObj = {};
						}
						if(formData.geo && (formData.geo != "")) {
							try {
								var geoObj = JSON.parse(formData.geo);
							}
							catch(e) {
								$scope.form.displayAlert('danger', 'Error: Invalid geo Json object ');
								return;
							}
						}
						else {
							var geoObj = {};
						}

						var postData = {
							'device': deviceObj,
							'geo': geoObj,
							'extKey': data.extKey
						};
						if(formData.expDate){
							postData.expDate = new Date(formData.expDate).toISOString();
						}
						
						getSendDataFromServer(ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/tenant/application/key/ext/update",
							"data": postData,
							"params": {"id": tId, "appId": appId, "key": key}
						}, function(error, response) {
							if(error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', 'External Key Updated Successfully.');
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listExtKeys(tId, appId, key);
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

	$scope.removeExtKey = function(tId, appId, data, key) {
		getSendDataFromServer(ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/tenant/application/key/ext/delete",
			"data": {'extKey': data.extKey},
			"params": {"id": tId, "appId": appId, "key": key}
		}, function(error, response) {
			if(error) {
				$scope.form.displayAlert('danger', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', 'External Key Removed Successfully.');
				$scope.modalInstance.close();
				$scope.form.formData = {};
				$scope.listExtKeys(tId, appId, key);
			}
		});
	};

	$scope.listExtKeys = function(tId, appId, key, index) {
		console.log(' listExtKeys: ');
		console.log(' key: ' + key );
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/tenant/application/key/ext/list",
			"params": {"id": tId , "appId": appId, "key": key}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				console.log(response);
				
				for(var i = 0; i < $scope.tenantsList.rows.length; i++) {
					if($scope.tenantsList.rows[i]['_id'] === tId) 
					{
						console.log( $scope.tenantsList.rows[i] );
						
						var apps = $scope.tenantsList.rows[i].applications ;
						for(var j = 0; j < apps.length ; j++)
						{
							
							if ( apps[j].appId === appId )
							{
								var app = apps[j];
								console.log( ' ******** app: ');
								console.log(app);
								var keys = app.keys;
								for(var v = 0; v < keys.length ; v++){
									
									if( keys[v].key === key ){
										console.log(' key: ');
										console.log( keys[v] );
										
										console.log(' key.extKeys : ');
										console.log( keys[v].extKeys );
										delete response['soajsauth'];
										console.log(' *************** response:');
										console.log(response);
										console.log(' $scope.tenantsList.rows[i].applications[j].keys[v].extKeys: ');
										//$scope.tenantsList.rows[i].applications[j].keys[v]=
										console.log( $scope.tenantsList.rows[i].applications[j].keys[v].extKeys ) ;
										
										$scope.tenantsList.rows[i].applications[j].keys[v].extKeys = response;
									}
								}
								break;
								
							}
							
						}
						
					}
				}
				

			}
		});
	};
	
	$scope.listKeys = function(tId, appId, index) {
		
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/tenant/application/key/list",
			"params": {"id": tId , "appId": appId }
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				console.log(' listKeys, response: '); console.log(response);
				
				for(var i = 0; i < $scope.tenantsList.rows.length; i++) {
					if($scope.tenantsList.rows[i]['_id'] === tId) 
					{
						console.log( $scope.tenantsList.rows[i] );
						delete response['soajsauth'];
						var apps = $scope.tenantsList.rows[i].applications ;
						for(var j = 0; j < apps.length ; j++)
						{
							
							if ( apps[j].appId === appId )
							{
								var app = apps[j];
								console.log( ' ******** app: ');
								console.log(app);
								var keys = app.keys;
								
								$scope.tenantsList.rows[i].applications[j].keys  = response;
								
								
								break;
								
							}
							
						}
						
					}
				}
				

			}
		});
	};
	
	$scope.listConfiguration = function(tId, appId, key, index) {
		console.log('listConfiguration : tId: ' + tId) ;
		console.log('appId: ' + appId) ;
		console.log('key: ' + key) ;
		
		$scope.currentApplicationKey = key;
		$scope.currentApplicationKeyIndex = index;

		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/tenant/application/key/config/list",
			"params": {"id": tId, "appId": appId, "key": key}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				if(JSON.stringify(response) !== '{}') {}
				else {}
			}
		});
	};
	$scope.reloadConfiguration = function(tId, appId, key, index) {
		console.log('reloadConfiguration : tId: ' + tId) ;
		console.log('appId: ' + appId) ;
		console.log('key: ' + key) ;
		
		$scope.currentApplicationKey = key;
		$scope.currentApplicationKeyIndex = index;
		
		/*
		for(var i = 0; i < $scope.keys.length; i++) {
			if(i !== index) {
				var cfgElement = angular.element(document.getElementById("keyConfig" + i));
				cfgElement.html('');
				$compile(cfgElement.contents())($scope);
			}
		}
		*/
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/tenant/application/key/config/list",
			"params": {"id": tId, "appId": appId, "key": key}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				console.log('response'); console.log(response);

				if(JSON.stringify(response) !== '{}') 
				{
					delete response['soajsauth'];
									
					for(var i = 0; i < $scope.tenantsList.rows.length; i++) {
						if($scope.tenantsList.rows[i]['_id'] === tId) 
						{							
							var apps = $scope.tenantsList.rows[i].applications ;
							for(var j = 0; j < apps.length ; j++)
							{								
								if ( apps[j].appId === appId )
								{
									var app = apps[j];									
									var keys = app.keys;
									for(var v = 0; v < keys.length ; v++){										
										if( keys[v].key === key ){
											console.log( ' ******** key : ');
											console.log(  keys[v] );
											console.log( $scope.tenantsList.rows[i].applications[j].keys[v].config );
											$scope.tenantsList.rows[i].applications[j].keys[v].config = response;
											console.log( $scope.tenantsList.rows[i].applications[j].keys[v].config );
										}
									}
									break;
									
								}
								
							}
							
						}
					}
					
					
				}
				else {
					
				}
			}
		});
	};
	//default operation
	$scope.getProds();
	$scope.getEnvironments();
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
						if(formData.acl && (formData.acl != "")) {
							try {
								var aclObj = JSON.parse(formData.acl);							
							}
							catch(e) {
								$scope.form.displayAlert('danger', 'Error: Invalid ACL Json object ');
								return;
							}
						}
						else {
							var aclObj = {};
						}	
						var postData = {
							'productCode': formData.product,
							'packageCode': formData.package,
							'description': formData.description,
							'acl':aclObj,
							'_TTL': Array.isArray(formData._TTL) ? formData._TTL.join("") : formData._TTL
						};
						
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
					if(formData.acl && (formData.acl != "")) {
						try {
							var aclObj = JSON.parse(formData.acl);							
						}
						catch(e) {
							$scope.form.displayAlert('danger', 'Error: Invalid ACL Json object ');
							return;
						}
					}
					else {
						var aclObj = {};
					}	
					var postData = {
						'productCode': formData.product,
						'packageCode': formData.package,
						'description': formData.description,
						'acl' : aclObj,
						'_TTL': Array.isArray(formData._TTL) ? formData._TTL.join("") : formData._TTL
					};
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
				console.log(options);
				var extGrid = angular.element(document.getElementById('externalKeys' + index));
				$compile(extGrid.contents())($scope);
				$scope.currentApplicationKey = key;
				$scope.currentApplicationKeyIndex = index;
			}
		});
	};

	$scope.addNewExtKey = function() {
		console.log( 'addNewExtKey for key: '+ $scope.currentApplicationKey);
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
					if(formData.device && (formData.device != "")) {
						try {
							var deviceObj = JSON.parse(formData.device);
						}
						catch(e) {
							$scope.form.displayAlert('danger', 'Error: Invalid device Json object ');
							return;
						}
					}
					else {
						var deviceObj = {};
					}
					if(formData.geo && (formData.geo != "")) {
						try {
							var geoObj = JSON.parse(formData.geo);
						}
						catch(e) {
							$scope.form.displayAlert('danger', 'Error: Invalid geo Json object ');
							return;
						}
					}
					else {
						var geoObj = {};
					}	
					var postData = {
						'expDate': formData.expDate,
						'device': deviceObj,
						'geo': geoObj
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

		console.log( 'currentApplicationKey: '+$scope.currentApplicationKey );
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
					if(formData.device && (formData.device != "")) {
						try {
							var deviceObj = JSON.parse(formData.device);
						}
						catch(e) {
							$scope.form.displayAlert('danger', 'Error: Invalid device Json object ');
							return;
						}
					}
					else {
						var deviceObj = {};
					}
					if(formData.geo && (formData.geo != "")) {
						try {
							var geoObj = JSON.parse(formData.geo);
						}
						catch(e) {
							$scope.form.displayAlert('danger', 'Error: Invalid geo Json object ');
							return;
						}
					}
					else {
						var geoObj = {};
					}
					
					var postData = {
						'expDate': new Date(formData.expDate).toISOString(),
						'device': deviceObj,
						'geo': geoObj,
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