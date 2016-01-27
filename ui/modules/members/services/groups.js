"use strict";
var groupsService = soajsApp.components;
groupsService.service('groupsHelper', ['ngDataApi', '$timeout', '$modal', function (ngDataApi, $timeout, $modal) {

	function listGroups(currentScope, groupsConfig, callback) {
		var userCookie = currentScope.$parent.userCookie;
		var tenantId = (callback) ? currentScope.tId : userCookie.tenant.id;
		if (currentScope.access.adminGroup.list) {
			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "get",
				"headers": {
					"key": currentScope.key
				},
				"routeName": "/urac/admin/group/list",
				"params": {'tId': tenantId}
			}, function (error, response) {
				if (error) {
					currentScope.$parent.displayAlert("danger", error.code, true, 'urac');
				}
				else {
					if (callback && typeof(callback) === 'function') {
						return callback(response);
					}
					else {
						printGroups(currentScope, groupsConfig, response);
					}
				}
			});
		}
	}

	function printGroups(currentScope, groupsConfig, response) {
		var options = {
			grid: groupsConfig.grid,
			data: response,
			defaultSortField: 'code',
			left: [],
			top: []
		};
		if (currentScope.access.adminGroup.addUsers) {
			options.left.push({
				'label': translation.linkUsersGroup[LANG],
				'icon': 'link',
				'handler': 'assignUsers'
			});
		}

		if (currentScope.access.adminGroup.edit) {
			options.left.push({
				'label': translation.edit[LANG],
				'icon': 'pencil2',
				'handler': 'editGroup'
			});
		}
		if (currentScope.access.adminGroup.delete) {
			options.top.push({
				'label': translation.delete[LANG],
				'msg': translation.areYouSureWantDeleteSelectedGroup[LANG],
				'handler': 'deleteGroups'
			});

			options.left.push({
				'label': translation.delete[LANG],
				'icon': 'cross',
				'msg': translation.areYouSureWantDeleteGroup[LANG],
				'handler': 'delete1Group'
			});
		}

		buildGrid(currentScope, options);
	}

	function addGroup(currentScope, groupsConfig, useCookie) {
		var userCookie = currentScope.$parent.userCookie;
		var config = angular.copy(groupsConfig.form);
		var tenantId = (useCookie) ? userCookie.tenant.id : currentScope.tId;
		var tenantCode = (useCookie) ? userCookie.tenant.code : currentScope.tenant.code;

		var options = {
			timeout: $timeout,
			form: config,
			name: 'addGroup',
			label: translation.addNewGroup[LANG],
			actions: [
				{
					'type': 'submit',
					'label': translation.addGroup[LANG],
					'btn': 'primary',
					'action': function (formData) {
						var postData = {
							'name': formData.name,
							'code': formData.code,
							'description': formData.description,
							'tId': tenantId,
							'tCode': tenantCode
						};

						getSendDataFromServer(currentScope, ngDataApi, {
							"method": "send",
							"headers": {
								"key": currentScope.key
							},
							"routeName": "/urac/admin/group/add",
							"data": postData
						}, function (error) {
							if (error) {
								currentScope.form.displayAlert('danger', error.code, true, 'urac');
							}
							else {
								currentScope.$parent.displayAlert('success', translation.groupAddedSuccessfully[LANG]);
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
					'action': function () {
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
			'label': translation.editGroup[LANG],
			'data': data,
			'actions': [
				{
					'type': 'submit',
					'label': translation.editGroup[LANG],
					'btn': 'primary',
					'action': function (formData) {
						var postData = {
							'name': formData.name,
							'description': formData.description
						};

						getSendDataFromServer(currentScope, ngDataApi, {
							"method": "send",
							"headers": {
								"key": currentScope.key
							},
							"routeName": "/urac/admin/group/edit",
							"params": {"gId": data['_id']},
							"data": postData
						}, function (error) {
							if (error) {
								currentScope.form.displayAlert('danger', error.code, true, 'urac');
							}
							else {
								currentScope.$parent.displayAlert('success', translation.groupUpdatedSuccessfully[LANG]);
								currentScope.modalInstance.close();
								currentScope.form.formData = {};
								currentScope.listGroups();
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
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
				'error': translation.errorMessageDeleteGroup[LANG],
				'success': translation.successMessageDeleteGroup[LANG]
			}
		};

		multiRecordUpdate(ngDataApi, currentScope, config, function () {
			currentScope.listGroups();
		});
	}

	function delete1Group(currentScope, data, useCookie) {
		var userCookie = currentScope.$parent.userCookie;
		var tenantId = (useCookie) ? userCookie.tenant.id : currentScope.tId;
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"headers": {
				"key": currentScope.key
			},
			"routeName": "/urac/admin/group/delete",
			"params": {"gId": data._id, 'tId': tenantId}
		}, function (error) {
			if (error) {
				currentScope.$parent.displayAlert('danger', error.code, true, 'urac');
			}
			else {
				currentScope.$parent.displayAlert('success', translation.selectedGroupRemoved[LANG]);
				currentScope.listGroups();
			}
		});
	}

	function assignUsers(currentScope, groupsConfig, data, event, useCookie) {
		var userCookie = currentScope.$parent.userCookie;
		var tenantId = (useCookie) ? userCookie.tenant.id : currentScope.tId;

		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"headers": {
				"key": currentScope.key
			},
			"routeName": "/urac/admin/listUsers",
			"params": {'tId': tenantId}
		}, function (error, response) {
			if (error) {
				currentScope.$parent.displayAlert('danger', error.code, true, 'urac');
			}
			else {
				var value = [];
				var sel = false;
				for (var x = 0; x < response.length; x++) {
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
					label: translation.addUsersGroup[LANG] + ': ' + data.name,
					'msgs': {},
					actions: [
						{
							'type': 'submit',
							'label': translation.addingUsers[LANG],
							'btn': 'primary',
							'action': function (formData) {
								var postData = {
									'groupCode': data.code,
									'users': formData.users
								};
								getSendDataFromServer(currentScope, ngDataApi, {
									"method": "send",
									"headers": {
										"key": currentScope.key
									},
									"routeName": "/urac/admin/group/addUsers",
									"params": {'tId': tenantId},
									"data": postData
								}, function (error) {
									if (error) {
										currentScope.form.displayAlert('danger', error.code, true, 'urac');
									}
									else {
										currentScope.$parent.displayAlert('success', translation.UserAddedSuccessfully[LANG]);
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
							'label': translation.cancel[LANG],
							'btn': 'danger',
							'action': function () {
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