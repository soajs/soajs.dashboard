"use strict";
var groupsApp = soajsApp.components;
groupsApp.controller('groupsCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', function($scope, $timeout, $modal, ngDataApi) {
	$scope.$parent.isUserLoggedIn();

	$scope.access=
	{
		adminGroup:{
			add : $scope.buildPermittedOperation('urac', '/admin/group/add'),
			edit : $scope.buildPermittedOperation('urac', '/admin/group/edit'),
			delete : $scope.buildPermittedOperation('urac', '/admin/group/delete'),
			addUsers : $scope.buildPermittedOperation('urac', '/admin/group/addUsers')
		}
	};

	$scope.listGroups = function() {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/urac/admin/group/list"
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert("danger", error.message);
			}
			else {
				var options = {
					grid: groupsConfig.grid,
					data: response,
					defaultSortField: 'code',
					left: [],
					top: []
				};
				if($scope.access.adminGroup.addUsers)
				{
					options.left.push({
						'label': 'Link Users to Group',
						'icon': 'link',
						'handler': 'assignUsers'
					});
				}

				if($scope.access.adminGroup.edit)
				{
					options.left.push({
						'label': 'Edit',
						'icon': 'pencil2',
						'handler': 'editGroup'
					});
				}
				if($scope.access.adminGroup.delete)
				{
					options.top.push({
						'label': 'Delete',
						'msg': "Are you sure you want to delete the selected group(s)?",
						'handler': 'deleteGroups'
					});

					options.left.push({
						'label': 'Delete',
						'icon': 'cross',
						'msg': "Are you sure you want to delete this group?",
						'handler': 'delete1Group'
					});
				}

				buildGrid($scope, options);
			}
		});
	};

	$scope.addGroup = function() {
		var config = angular.copy(groupsConfig.form);

		var options = {
			timeout: $timeout,
			form: config,
			name: 'addGroup',
			label: 'Add New Group',
			actions: [
				{
					'type': 'submit',
					'label': 'Add Group',
					'btn': 'primary',
					'action': function(formData) {
						var postData = {
							'name': formData.name,
							'code': formData.code,
							'description': formData.description
						};

						getSendDataFromServer(ngDataApi, {
							"method": "send",
							"routeName": "/urac/admin/group/add",
							"data": postData
						}, function(error, response) {
							if(error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', 'Group Added Successfully.');
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listGroups();
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

	$scope.editGroup = function(data) {
		var config = angular.copy(groupsConfig.form);

		config.entries[0].type = 'readonly';
		var options = {
			timeout: $timeout,
			form: config,
			'name': 'editGroup',
			'label': 'Edit Group',
			'data': data,
			'actions': [
				{
					'type': 'submit',
					'label': 'Edit Group',
					'btn': 'primary',
					'action': function(formData) {
						var postData = {
							'name': formData.name,
							'description': formData.description
						};

						getSendDataFromServer(ngDataApi, {
							"method": "send",
							"routeName": "/urac/admin/group/edit",
							"params": {"gId": data['_id']},
							"data": postData
						}, function(error, response) {
							if(error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', 'Group Updated Successfully.');
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listGroups();
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

	$scope.deleteGroups = function() {
		var config = {
			'routeName': "/urac/admin/group/delete",
			"params": {'gId': '%id%'},
			'msg': {
				'error': 'one or more of the selected Groups(s) status was not deleted.',
				'success': 'Selected Groups(s) has been deleted.'
			}
		};

		multiRecordUpdate(ngDataApi, $scope, config, function(valid) {
			$scope.listGroups();
		});
	};
	$scope.delete1Group = function(data) {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/urac/admin/group/delete",
			"params": {"gId": data._id}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', "Selected group has been removed.");
				$scope.listGroups();
			}
		});
	};
	$scope.assignUsers = function(data) {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/urac/admin/listUsers",
			"params": {}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				var len = response.length;
				var value = [];
				var sel = false;
				for(var x = 0; x < len; x++) {
					sel = false;
					if((response[x].groups) && response[x].groups.indexOf(data.code) > -1) {
						sel = true;
					}
					value.push({
						'v': response[x].username,
						'lb': response[x].username + '(' + response[x].firstName + ' ' + response[x].lastName + ')',
						'selected': sel
					});
				}

				var config = angular.copy(groupsConfig.users);
				config.entries[0].value = value;
				
				var options = {
					timeout: $timeout,
					form: config,
					name: 'addGroup',
					label: 'Add Users to Group: ' + data.name,
					'msgs': {},
					actions: [
						{
							'type': 'submit',
							'label': 'Assing Users',
							'btn': 'primary',
							'action': function(formData) {
								var postData = {
									'groupCode': data.code,
									'users': formData.users
								};
								getSendDataFromServer(ngDataApi, {
									"method": "send",
									"routeName": "/urac/admin/group/addUsers",
									"data": postData
								}, function(error, response) {
									if(error) {
										$scope.form.displayAlert('danger', error.message);
									}
									else {
										$scope.$parent.displayAlert('success', 'User(s) Added Successfully.');
										$scope.modalInstance.close();
										$scope.form.formData = {};
										$scope.listGroups();
										$scope.$parent.$emit('reloadMembers', {});
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
		});
	};
	
	//call default method
	$scope.listGroups();
}]);