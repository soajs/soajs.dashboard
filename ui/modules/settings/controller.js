"use strict";
var settingsApp = soajsApp.components;
settingsApp.controller('settingsCtrl', ['$scope', '$timeout', '$modal', '$routeParams', '$compile', 'ngDataApi', function($scope, $timeout, $modal, $routeParams, $compile, ngDataApi) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, tenantConfig.permissions);

	$scope.listTenants = function() {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/tenant/list"
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				var l = response.length;
				for (var x=0; x<l; x++){
					if(response[x].locked && response[x].locked==true )
					{
						$scope.tenant =  response[x];
						break;
					}
				}

			}
		});
	};

	$scope.editTenant = function(data) {
		var formConfig = angular.copy(tenantConfig.form.tenantEdit);
		formConfig.timeout = $timeout;

		var oAuth = data.oauth;
		if(oAuth.secret) {
			data.secret = oAuth.secret;
		}
		/*
		 if(oAuth.redirectURI) {
		 data.redirectURI = oAuth.redirectURI;
		 }
		 */
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
							"params": {"id": data['_id']}
						}, function(error) {
							if(error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								if(formData.secret) {
									var oAuthData = {
										'secret': formData.secret
										//'redirectURI': formData.redirectURI
									};
									getSendDataFromServer(ngDataApi, {
										"method": "send",
										"routeName": "/dashboard/tenant/oauth/update",
										"data": oAuthData,
										"params": {"id": data['_id']}
									}, function(error) {
										if(error) {
											$scope.form.displayAlert('danger', error.message);
										}
										else {
											$scope.$parent.displayAlert('success', 'Tenant Info Updated Successfully.');
											$scope.modalInstance.close();
											$scope.form.formData = {};
											$scope.listTenants();
										}
									});

								}
								else {
									$scope.$parent.displayAlert('success', 'Tenant Updated Successfully.');
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
					'action': function() {
						getSendDataFromServer(ngDataApi, {
							"method": "get",
							"routeName": "/dashboard/tenant/oauth/delete",
							"params": {"id": data['_id']}
						}, function(error) {
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


	$scope.listTenants();


}]);