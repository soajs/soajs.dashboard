"use strict";
var membersApp = soajsApp.components;
membersApp.controller('membersCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', function($scope, $timeout, $modal, ngDataApi) {
	console.log('apiConfiguration');
	console.log(apiConfiguration);
	$scope.key = apiConfiguration.key;
	$scope.$parent.isUserLoggedIn();

	$scope.$parent.$on('reloadMembers', function(event, args) {
		$scope.listMembers();
	});
	
	$scope.listMembers = function() {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/urac/admin/listUsers"
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert("danger", error.message);
			}
			else {
				var len = response.length;
				var usersRecords = [];
				for(var x = 0; x < len; x++) {
					if(response[x].groups) {
						response[x].grpsArr = response[x].groups.join(', ');
					}
					else {
						response[x].grpsArr = '';
					}
				}
				
				var options = {
					grid: membersConfig.grid,
					data: response,
					defaultSortField: 'username',
					left: [
						{
							'label': 'Edit',
							'icon': 'pencil2',
							'handler': 'editMember'
						},
						{
							'label': 'Edit ACL',
							'icon': 'unlocked',
							'handler': 'editAcl'
						}],
					top: [
						{
						'label': 'Activate',
						'msg': "Are you sure you want to activate the selected member(s)?",
						'handler': 'activateMembers'
						},
						{
							'label': 'Deactivate',
							'msg': "Are you sure you want to deactivate the selected member(s)?",
							'handler': 'deactivateMembers'
						}
					]
				};

				buildGrid($scope, options);
			}
		});
	};

	$scope.addMember = function() {
		var config = angular.copy(membersConfig.form);
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/urac/admin/group/list",
			"data": {}
		}, function(error, response) {
			if(error) {
				$scope.form.displayAlert('danger', error.message);
			}
			else {
				var len = response.length;
				var grps = [];
				for(var x = 0; x < len; x++) {
					grps.push({'v': response[x].code, 'lb': response[x].name, 'selected': false});
				}
				config.entries.push({
					'name': 'groups',
					'label': 'Groups',
					'type': 'checkbox',
					'value': grps,
					'tooltip': 'Assign groups'
				});
				var options = {
					timeout: $timeout,
					form: config,
					name: 'addMember',
					label: 'Add New Member',
					actions: [
						{
							'type': 'submit',
							'label': 'Add Member',
							'btn': 'primary',
							'action': function(formData) {
								var postData = {
									'username': formData.username,
									'firstName': formData.firstName,
									'lastName': formData.lastName,
									'email': formData.email,
									'groups': formData.groups
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

	$scope.editAcl = function(data) {
		console.log(data._id);
		$scope.$parent.go('/members/'+data._id+'/editUserAcl');
	};
	$scope.editMember = function(data) {
		console.log(data);
		var config = angular.copy(membersConfig.form);
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/urac/admin/group/list",
			"data": {}
		}, function(error, response) {
			if(error) {
				$scope.form.displayAlert('danger', error.message);
			}
			else {
				var len = response.length;
				var grps = [];
				if(data.groups) {
					var datagroups = data.groups;
				} else {
					var datagroups = [];
				}
				var sel = false;
				for(var x = 0; x < len; x++) {
					sel = false;
					if(datagroups.indexOf(response[x].code) > -1) {
						sel = true;
					}
					grps.push({'v': response[x].code, 'lb': response[x].name, 'selected': sel});
				}
				config.entries.push({
					'name': 'groups',
					'label': 'Groups',
					'type': 'checkbox',
					'value': grps,
					'tooltip': 'Assign groups'
				});
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
					'actions': [
						{
							'type': 'submit',
							'label': 'Edit Member',
							'btn': 'primary',
							'action': function(formData) {
								var postData = {
									'username': formData.username,
									'firstName': formData.firstName,
									'lastName': formData.lastName,
									'email': formData.email,
									'groups': formData.groups,
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


membersApp.controller('memberAclCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', function($scope, $timeout, $modal, ngDataApi) {
	console.log('apiConfiguration');
	console.log(apiConfiguration);
	$scope.key = apiConfiguration.key;
	$scope.$parent.isUserLoggedIn();


	$scope.saveMember = function(data) {
		console.log(data);
		var config = angular.copy(membersConfig.form);
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/urac/admin/group/list",
			"data": {}
		}, function(error, response) {
			if(error) {
				$scope.form.displayAlert('danger', error.message);
			}
			else {
				var len = response.length;
				var grps = [];
				if(data.groups) {
					var datagroups = data.groups;
				} else {
					var datagroups = [];
				}
				var sel = false;
				for(var x = 0; x < len; x++) {
					sel = false;
					if(datagroups.indexOf(response[x].code) > -1) {
						sel = true;
					}
					grps.push({'v': response[x].code, 'lb': response[x].name, 'selected': sel});
				}
				config.entries.push({
					'name': 'groups',
					'label': 'Groups',
					'type': 'checkbox',
					'value': grps,
					'tooltip': 'Assign groups'
				});
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
					'actions': [
						{
							'type': 'submit',
							'label': 'Edit Member',
							'btn': 'primary',
							'action': function(formData) {
								var postData = {
									'username': formData.username,
									'firstName': formData.firstName,
									'lastName': formData.lastName,
									'email': formData.email,
									'groups': formData.groups,
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

	$scope.getServices = function() {
		getSendDataFromServer(ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/services/list",
			"data": { "serviceNames":["oauth","urac", "dashboard" ] }
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				response.forEach(function(serv) {
					serv.fixList = $scope.groupBy( serv.apis , 'group');
				});

				$scope.allServiceApis = response;

				$scope.getAllGroups();
			}
		});
	};

	$scope.getAllGroups= function(){
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/urac/admin/group/list"
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert("danger", error.message);
			}
			else {
				response.forEach(function( grpObj ) {
					$scope.allGroups.push(grpObj.code);
				});
				$scope.openForm();
			}
		});
	};

	$scope.groupBy = function(arr, f) {
		var result = {} ;
		var l = arr.length;
		var g = 'General' ;
		for(var i=0; i<l; i++)
		{
			if(arr[i][f])
			{
				g = arr[i][f];
			}
			if(!result[g])
			{
				result[g]={};
				result[g].apis=[];
			}
			if(arr[i].groupMain === true ){
				result[g]['defaultApi'] =arr[i].v;
			}
			result[g].apis.push(arr[i]);
		}
		return result;
	};

	//call default method
	$scope.listMembers();
}]);