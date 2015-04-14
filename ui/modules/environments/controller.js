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
				var options = {
					grid: environmentConfig.grid,
					data: response,
					defaultSortField: 'code',
					left: [{
						'label': 'Edit',
						'icon': 'edit',
						'handler': 'editEnvironment'
					},
						//{
						//	'label': 'Analytics',
						//	'icon': 'analytics',
						//	'handler': 'openAnalyticsPage'
						//},
						{
							'label': 'Remove',
							'icon': 'remove',
							'msg': "Are you sure you want to remove this environment?",
							'handler': 'removeEnvironment'
						}],
					top: [{
						'label': 'Remove',
						'msg': "Are you sure you want to remove the selected environment(s)?",
						'handler': 'removeMultipleEnvironments'
					}]
				};

				buildGrid($scope, options);
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
					'type': 'cancel',
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

	//$scope.openAnalyticsPage = function(data) {
	//	data.ips = data.ips.join(",");
	//
	//	var ips = [];
	//	data.ips = data.ips.split(",");
	//	for(var x = 0; x < data.ips.length; x++) {
	//		ips.push({'v': data.ips[x]});
	//	}
	//
	//	var options = {
	//		timeout: $timeout,
	//		form: environmentConfig.analytics,
	//		'name': 'analyticsEnvironment',
	//		'label': 'Run Environment Analytics Operations',
	//		'data': {
	//			'code': data.code,
	//			'ips': ips
	//		},
	//
	//		'actions': [
	//			{
	//				'type': 'submit',
	//				'label': 'Perform Maintenance',
	//				'btn': 'primary',
	//				'action': function(formData) {
	//					console.log(formData);
	//					if(!formData.ips || (Array.isArray(formData.ips) && formData.ips.length === 0) || formData.ips ===''){
	//						$scope.form.displayAlert('danger', 'Please choose an IP address.');
	//					}
	//					else{
	//
	//					}
	//					//
	//					//$scope.modalInstance.close();
	//					//$scope.form.formData = {};
	//				}
	//			},
	//			{
	//				'type': 'reset',
	//				'label': 'Cancel',
	//				'btn': 'danger',
	//				'action': function() {
	//					$scope.modalInstance.dismiss('cancel');
	//					$scope.form.formData = {};
	//				}
	//			}
	//		]
	//	};
	//	buildFormWithModal($scope, $modal, options);
	//};

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

	$scope.removeMultipleEnvironments = function() {
		var config = {
			'routeName': "/dashboard/environment/delete",
			"params": {'id': '%id%'},
			'msg': {
				'error': 'one or more of the selected Environment(s) status was not removed.',
				'success': 'Selected Environment(s) has been removed.'
			}
		};

		multiRecordUpdate(ngDataApi, $scope, config, function(valid) {
			$scope.listEnvironments();
		});
	};

	//default operation
	$scope.listEnvironments();

}]);
