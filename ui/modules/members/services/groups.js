"use strict";
var groupsService = soajsApp.components;
groupsService.service('groupsHelper', ['ngDataApi', '$timeout', '$modal', function(ngDataApi, $timeout, $modal){

	function listGroups(currentScope, groupsConfig, callback) {
		var userCookie = currentScope.$parent.userCookie;
		var tenantId = (callback)? currentScope.tId: userCookie.tenant.id;
		if(currentScope.access.adminGroup.list) {
			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "get",
                "forceDBKey": currentScope.forceDBKey,
				"routeName": "/urac/admin/group/list",
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
						printGroups(currentScope, groupsConfig, response);
					}
				}
			});
		}
	}

	function printGroups(currentScope, groupsConfig, response){
		var options = {
			grid: groupsConfig.grid,
			data: response,
			defaultSortField: 'code',
			left: [],
			top: []
		};
		if(currentScope.access.adminGroup.addUsers) {
			options.left.push({
				'label': 'Link Users to Group',
				'icon': 'link',
				'handler': 'assignUsers'
			});
		}

		if(currentScope.access.adminGroup.edit) {
			options.left.push({
				'label': 'Edit',
				'icon': 'pencil2',
				'handler': 'editGroup'
			});
		}
		if(currentScope.access.adminGroup.delete) {
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

		buildGrid(currentScope, options);
	}

	function addGroup(currentScope, groupsConfig, useCookie) {
		var userCookie = currentScope.$parent.userCookie;
		var config = angular.copy(groupsConfig.form);
		var tenantId = (useCookie) ? userCookie.tenant.id: currentScope.tId;
		var tenantCode = (useCookie) ? userCookie.tenant.code: currentScope.tenant.code;

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
							'description': formData.description,
							'tId': tenantId,
							'tCode': tenantCode
						};

						getSendDataFromServer(currentScope, ngDataApi, {
							"method": "send",
                            "forceDBKey": currentScope.forceDBKey,
							"routeName": "/urac/admin/group/add",
							"data": postData
						}, function(error) {
							if(error) {
								currentScope.form.displayAlert('danger', error.message);
							}
							else {
								currentScope.$parent.displayAlert('success', 'Group Added Successfully.');
								currentScope.modalInstance.close();
								currentScope.form.formData = {};
								currentScope.listGroups();
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

	function editGroup(currentScope, groupsConfig, data, useCookie) {
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

						getSendDataFromServer(currentScope, ngDataApi, {
							"method": "send",
                            "forceDBKey": currentScope.forceDBKey,
							"routeName": "/urac/admin/group/edit",
							"params": {"gId": data['_id']},
							"data": postData
						}, function(error) {
							if(error) {
								currentScope.form.displayAlert('danger', error.message);
							}
							else {
								currentScope.$parent.displayAlert('success', 'Group Updated Successfully.');
								currentScope.modalInstance.close();
								currentScope.form.formData = {};
								currentScope.listGroups();
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

	function deleteGroups(currentScope) {
		var config = {
			'routeName': "/urac/admin/group/delete",
			"params": {'gId': '%id%'},
			'msg': {
				'error': 'one or more of the selected Groups(s) status was not deleted.',
				'success': 'Selected Groups(s) has been deleted.'
			}
		};

		multiRecordUpdate(ngDataApi, currentScope, config, function() {
			currentScope.listGroups();
		});
	}

	function delete1Group(currentScope, data, useCookie) {
		var userCookie = currentScope.$parent.userCookie;
		var tenantId = (useCookie) ? userCookie.tenant.id : currentScope.tId;
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
            "forceDBKey": currentScope.forceDBKey,
			"routeName": "/urac/admin/group/delete",
			"params": {"gId": data._id, 'tId': tenantId}
		}, function(error) {
			if(error) {
				currentScope.$parent.displayAlert('danger', error.message);
			}
			else {
				currentScope.$parent.displayAlert('success', "Selected group has been removed.");
				currentScope.listGroups();
			}
		});
	}

	function assignUsers(currentScope, groupsConfig, data, event, useCookie) {
		var userCookie = currentScope.$parent.userCookie;
		var tenantId = (useCookie) ? userCookie.tenant.id: currentScope.tId;

		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
            "forceDBKey": currentScope.forceDBKey,
			"routeName": "/urac/admin/listUsers",
			"params": {'tId': tenantId}
		}, function(error, response) {
			if(error) {
				currentScope.$parent.displayAlert('danger', error.message);
			}
			else {
				var value = [];
				var sel = false;
				for(var x = 0; x < response.length; x++) {
					sel = ((response[x].groups) && response[x].groups.indexOf(data.code) > -1);
					value.push({
						'v': response[x].username,
						'l': response[x].username + '(' + response[x].firstName + ' ' + response[x].lastName + ')',
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
								getSendDataFromServer(currentScope, ngDataApi, {
									"method": "send",
                                    "forceDBKey": currentScope.forceDBKey,
									"routeName": "/urac/admin/group/addUsers",
									"params": {'tId': tenantId},
									"data": postData
								}, function(error) {
									if(error) {
										currentScope.form.displayAlert('danger', error.message);
									}
									else {
										currentScope.$parent.displayAlert('success', 'User(s) Added Successfully.');
										currentScope.modalInstance.close();
										currentScope.form.formData = {};
										currentScope.listGroups();
										currentScope.$parent.$emit(event.name, event.params);
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

	return {
		'listGroups': listGroups,
		'printGroups': printGroups,
		'addGroup': addGroup,
		'editGroup': editGroup,
		'deleteGroups': deleteGroups,
		'delete1Group': delete1Group,
		'assignUsers': assignUsers
	}
}]);