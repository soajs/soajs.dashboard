"use strict";
var membersApp = soajsApp.components;
membersApp.controller('membersCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', function($scope, $timeout, $modal, ngDataApi) {
	$scope.$parent.isUserLoggedIn();

	$scope.listMembers = function() {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/urac/admin/listUsers"
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert("danger", error.message);
			}
			else {
				
				var options = {
					grid: membersConfig.grid,
					data: response,
					defaultSortField: 'username',
					left: [{
						'label': 'Edit',
						'icon': 'edit',
						'handler': 'editMember'
					}],
					top: [{
						'label': 'Activate',
						'msg': "Are you sure you want to activate the selected member(s)?",
						'handler': 'activateMembers'
					},
						{
							'label': 'Deactivate',
							'msg': "Are you sure you want to deactivate the selected member(s)?",
							'handler': 'deactivateMembers'
						}]
				};

				buildGrid($scope, options);
			}
		});
	};

	$scope.addMember = function() {
		var options = {
			timeout: $timeout,
			form: membersConfig.form,
			name: 'addMember',
			label: 'Add New Member',
			actions: {
				submit: function(formData) {
					var postData = {
						'username': formData.username,
						'firstName': formData.firstName,
						'lastName': formData.lastName,
						'email': formData.email
					};

					getSendDataFromServer(ngDataApi, {
						"method": "send",
						"routeName": "/urac/admin/addUser",
						"data": postData
					}, function(error, response) {
						if(error) {
							$scope.form.displayAlert('danger', error.message);
						}
						else {
							$scope.$parent.displayAlert('success', 'Member Added Successfully.');
							$scope.modalInstance.close();
							$scope.form.formData = {};
							$scope.listMembers();
						}
					});
				},
				cancel: function() {
					$scope.modalInstance.dismiss('cancel');
					$scope.form.formData = {};
				}
			}
		};

		buildFormWithModal($scope, $modal, options);
	};

	$scope.editMember = function(data) {
		var config = angular.copy(membersConfig.form);
		config.entries.push({
			'name': 'status',
			'label': 'Status',
			'type': 'radio',
			'value': [{'v': 'approved'}, {'v': 'active'}, {'v': 'inactive'}],
			'tooltip': 'Select the status of the user'
		});

		var options = {
			timeout: $timeout,
			form: config,
			'name': 'editMember',
			'label': 'Edit Member',
			'data': data,
			'actions': {
				submit: function(formData) {
					var postData = {
						'username': formData.username,
						'firstName': formData.firstName,
						'lastName': formData.lastName,
						'email': formData.email,
						'status': (Array.isArray(formData.status)) ? formData.status.join(",") : formData.status
					};

					getSendDataFromServer(ngDataApi, {
						"method": "send",
						"routeName": "/urac/admin/editUser",
						"params": {"uId": data['_id']},
						"data": postData
					}, function(error, response) {
						if(error) {
							$scope.form.displayAlert('danger', error.message);
						}
						else {
							$scope.$parent.displayAlert('success', 'Member Updated Successfully.');
							$scope.modalInstance.close();
							$scope.form.formData = {};
							$scope.listMembers();
						}
					});
				},
				cancel: function() {
					$scope.modalInstance.dismiss('cancel');
					$scope.form.formData = {};
				}
			}
		};
		buildFormWithModal($scope, $modal, options);
	};

	$scope.activateMembers = function() {
		var config = {
			'routeName': "/urac/admin/changeUserStatus",
			"params": {'uId': '%id%', 'status': 'active'},
			'msg': {
				'error': 'one or more of the selected Member(s) status was not updated.',
				'success': 'Selected Member(s) has been activated.'
			}
		};

		multiRecordUpdate(ngDataApi, $scope, config, function(valid) {
			$scope.listMembers();
		});
	};

	$scope.deactivateMembers = function() {
		var config = {
			'routeName': "/urac/admin/changeUserStatus",
			"params": {'uId': '%id%', 'status': 'inactive'},
			'msg': {
				'error': 'one or more of the selected Member(s) status was not updated.',
				'success': 'Selected Member(s) has been deactivated.'
			}
		};

		multiRecordUpdate(ngDataApi, $scope, config, function(valid) {
			$scope.listMembers();
		});
	};

	//call default method
	$scope.listMembers();
}]);