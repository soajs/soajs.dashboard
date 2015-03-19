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
					}, {
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
			actions: {
				submit: function(formData) {
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
				},
				cancel: function() {
					$scope.modalInstance.dismiss('cancel');
					$scope.form.formData = {};
				}
			}
		};

		buildFormWithModal($scope, $modal, options);
	};

	$scope.editEnvironment = function(data) {
		data.ips = data.ips.join(",");
		var options = {
			timeout: $timeout,
			form: environmentConfig.form,
			'name': 'editEnvironment',
			'label': 'Edit Environment',
			'data': data,
			'actions': {
				submit: function(formData) {
					var postData = {
						'code': formData.code,
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
				},
				cancel: function() {
					$scope.modalInstance.dismiss('cancel');
					$scope.form.formData = {};
				}
			}
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
