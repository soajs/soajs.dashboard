"use strict";
var environmentsApp = soajsApp.components;
environmentsApp.controller('environmentCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', function($scope, $timeout, $modal, ngDataApi) {
	$scope.$parent.isUserLoggedIn();

	$scope.listEnvironments = function() {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment/list"
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.grid = {
					rows: response
				};
			}
		});
	};

	$scope.listHosts = function(env) {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/hosts/list",
			"params": {"env": env}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				for(var i = 0; i < $scope.grid.rows.length; i++) {
					if($scope.grid.rows[i]['code'] === env){
						$scope.grid.rows[i].hosts = response;
					}
				}
			}
		});
	};

	$scope.addEnvironment = function() {
		var options = {
			timeout: $timeout,
			form: environmentConfig.form,
			name: 'addEnvironment',
			label: 'Add New Environment',
			actions: [
				{
					'type': 'submit',
					'label': 'Submit',
					'btn': 'primary',
					'action': function(formData) {
						formData.ips = formData.ips.replace(/ /g, '');
						var postData = {
							'code': formData.code,
							'description': formData.description,
							'ips': formData.ips.split(",")
						};

						getSendDataFromServer(ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/environment/add",
							"data": postData
						}, function(error, response) {
							if(error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', 'Environment Added Successfully.');
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.$parent.$emit('reloadEnvironments', {});
								$scope.listEnvironments();
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

	$scope.editEnvironment = function(data) {
		var formConfig = angular.copy(environmentConfig.form);
		formConfig.entries[0].type = 'readonly';
		var myData = angular.copy(data);
		myData.ips = myData.ips.join(",");
		var options = {
			timeout: $timeout,
			form: formConfig,
			'name': 'editEnvironment',
			'label': 'Edit Environment',
			'data': myData,
			'actions': [
				{
					'type': 'submit',
					'label': 'Submit',
					'btn': 'primary',
					'action': function(formData) {
						formData.ips = formData.ips.replace(/ /g, '');
						var postData = {
							'description': formData.description,
							'ips': formData.ips.split(",")
						};

						getSendDataFromServer(ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/environment/update",
							"params": {"id": data['_id']},
							"data": postData
						}, function(error, response) {
							if(error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', 'Environment Updated Successfully.');
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listEnvironments();
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

	$scope.removeEnvironment = function(row) {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment/delete",
			"params": {"id": row['_id']}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				if(response) {
					$scope.$parent.displayAlert('success', "Selected Environment has been removed.");
					$scope.listEnvironments();
				}
				else {
					$scope.$parent.displayAlert('danger', "Unable to remove selected Environment.");
				}
			}
		});
	};

	$scope.loadConfiguration = function(row) {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/registry/list",
			"params": {"env": row['code']}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				console.log(response);
			}
		});
	};

	//default operation
	$scope.listEnvironments();

}]);
