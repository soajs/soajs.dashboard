"use strict";
var membersService = soajsApp.components;
membersService.service('membersHelper', ['ngDataApi', '$timeout', '$modal', function(ngDataApi, $timeout, $modal){

	function listMembers(currentScope, moduleConfig, callback) {
		var userCookie = currentScope.$parent.userCookie;
		var tenantId = (callback)? currentScope.tId: userCookie.tenant.id;
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"headers":{
				"key": currentScope.key
			},
			"routeName": "/urac/admin/listUsers",
			"params": {'tId': tenantId}
		}, function(error, response) {
			if(error) {
				currentScope.$parent.displayAlert("danger", error.message);
			}
			else {
				if(callback && typeof(callback) === 'function'){
					return callback(response);
				}
				else{
					printMembers(currentScope, moduleConfig, response);
				}
			}
		});
	}

	function printMembers(currentScope, moduleConfig, response){
		for(var x = 0; x < response.length; x++) {
			if(response[x].groups) {
				response[x].grpsArr = response[x].groups.join(', ');
			}
			else {
				response[x].grpsArr = '';
			}
		}

		var options = {
			grid: moduleConfig.grid,
			data: response,
			defaultSortField: 'username',
			left: [],
			top: []
		};

		if(currentScope.access.adminUser.editUser) {
			options.left.push({
				'label': 'Edit',
				'icon': 'pencil2',
				'handler': 'editMember'
			});
			options.left.push({
				'label': 'Edit ACL',
				'icon': 'unlocked',
				'handler': 'editAcl'
			});
		}
		if(currentScope.access.adminUser.changeStatusAccess) {
			options.top = [
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
			];

		}
		buildGrid(currentScope, options);
	}

	function addMember(currentScope, moduleConfig, useCookie) {
		var userCookie = currentScope.$parent.userCookie;
		var config = angular.copy(moduleConfig.form);
		var tenantId = (useCookie) ? userCookie.tenant.id: currentScope.tId;
		var tenantCode = (useCookie) ? userCookie.tenant.code: currentScope.tenant.code;

		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"headers":{
				"key": currentScope.key
			},
			"routeName": "/urac/admin/group/list",
			"params": {'tId': tenantId}
		}, function(error, response) {
			if(error) {
				currentScope.form.displayAlert('danger', error.message);
			}
			else {
				var grps = [];
				for(var x = 0; x < response.length; x++) {
					grps.push({'v': response[x].code, 'l': response[x].name, 'selected': false});
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
									'groups': formData.groups,
									'tId': tenantId,
									'tCode': tenantCode
								};

								getSendDataFromServer(currentScope, ngDataApi, {
									"method": "send",
									"headers":{
										"key": currentScope.key
									},
									"routeName": "/urac/admin/addUser",
									"data": postData
								}, function(error) {
									if(error) {
										currentScope.form.displayAlert('danger', error.message);
									}
									else {
										currentScope.$parent.displayAlert('success', 'Member Added Successfully.');
										currentScope.modalInstance.close();
										currentScope.form.formData = {};
										currentScope.listMembers();
									}
								});
							}
						},
						{
							'type': 'reset',
							'label': 'Cancel',
							'btn': 'danger',
							'action': function() {
								currentScope.modalInstance.dismiss('cancel');
								currentScope.form.formData = {};
							}
						}
					]
				};
				buildFormWithModal(currentScope, $modal, options);
			}
		});

	}

	function editAcl(currentScope, data) {
		currentScope.$parent.go('/members/' + data._id + '/editUserAcl');
	}

	function editMember(currentScope, moduleConfig, data, useCookie) {
		var userCookie = currentScope.$parent.userCookie;
		var config = angular.copy(moduleConfig.form);
		var tenantId = (useCookie) ? userCookie.tenant.id : currentScope.tId;
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"headers":{
				"key": currentScope.key
			},
			"routeName": "/urac/admin/group/list",
			"params": {'tId': tenantId}
		}, function(error, response) {
			if(error) {
				currentScope.form.displayAlert('danger', error.message);
			}
			else {
				var grps = [];
				var datagroups = [];
				if(data.groups) {
					datagroups = data.groups;
				}
				var sel = false;
				for(var x = 0; x < response.length; x++) {
					sel = datagroups.indexOf(response[x].code) > -1;
					grps.push({'v': response[x].code, 'l': response[x].name, 'selected': sel});
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
					'value': [{'v': 'pendingNew'}, {'v': 'active'}, {'v': 'inactive'}],
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
									'tId': tenantId,
									'status': (Array.isArray(formData.status)) ? formData.status.join(",") : formData.status
								};

								getSendDataFromServer(currentScope, ngDataApi, {
									"method": "send",
									"headers":{
										"key": currentScope.key
									},
									"routeName": "/urac/admin/editUser",
									"params": {"uId": data['_id']},
									"data": postData
								}, function(error) {
									if(error) {
										currentScope.form.displayAlert('danger', error.message);
									}
									else {
										currentScope.$parent.displayAlert('success', 'Member Updated Successfully.');
										currentScope.modalInstance.close();
										currentScope.form.formData = {};
										currentScope.listMembers();
									}
								});
							}
						},
						{
							'type': 'reset',
							'label': 'Cancel',
							'btn': 'danger',
							'action': function() {
								currentScope.modalInstance.dismiss('cancel');
								currentScope.form.formData = {};
							}
						}
					]
				};
				buildFormWithModal(currentScope, $modal, options);
			}
		});
	}

	function activateMembers(currentScope) {
		var config = {
			'routeName': "/urac/admin/changeUserStatus",
			"params": {'uId': '%id%', 'status': 'active'},
			'msg': {
				'error': 'one or more of the selected Member(s) status was not updated.',
				'success': 'Selected Member(s) has been activated.'
			}
		};

		multiRecordUpdate(ngDataApi, currentScope, config, function() {
			currentScope.listMembers();
		});
	}

	function deactivateMembers(currentScope) {
		var config = {
			'routeName': "/urac/admin/changeUserStatus",
			"params": {'uId': '%id%', 'status': 'inactive'},
			'msg': {
				'error': 'one or more of the selected Member(s) status was not updated.',
				'success': 'Selected Member(s) has been deactivated.'
			}
		};

		multiRecordUpdate(ngDataApi, currentScope, config, function() {
			currentScope.listMembers();
		});
	}

	return {
		'listMembers': listMembers,
		'printMembers': printMembers,
		'addMember': addMember,
		'editAcl': editAcl,
		'editMember': editMember,
		'activateMembers': activateMembers,
		'deactivateMembers': deactivateMembers
	};
}]);