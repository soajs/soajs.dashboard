"use strict";
var serviceUracApp = soajsApp.components;

serviceUracApp.service('tenantGroupsModuleDevHelper', ['ngDataApi', '$timeout', '$cookies', '$modal', function (ngDataApi, $timeout, $cookies, $modal) {
	var tCode = $cookies.getObject('urac_merchant').code;
	
	function listGroups(currentScope, groupsConfig, callback) {
		if (currentScope.access.adminGroup.list) {
			var opts = {
				"method": "get",
				"routeName": "/urac/owner/admin/group/list",
				"params": {
					"tCode": tCode,
					"__env": currentScope.currentSelectedEnvironment.toUpperCase()
				}
			};
			if (currentScope.key) {
				opts.headers = {
					"key": currentScope.key
				};
			}
			getSendDataFromServer(currentScope, ngDataApi, opts, function (error, response) {
				if (error) {
					currentScope.$parent.displayAlert("danger", error.code, true, 'urac', error.message);
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
	
	function addGroup(currentScope, groupsConfig) {
		var config = angular.copy(groupsConfig.form);
		
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
							'description': formData.description
						};
						var opts = {
							"method": "send",
							"routeName": "/urac/owner/admin/group/add",
							"params": {
								"tCode": tCode,
								"__env": currentScope.currentSelectedEnvironment.toUpperCase()
							},
							"data": postData
						};
						if (currentScope.key) {
							opts.headers = {
								"key": currentScope.key
							}
						}
						getSendDataFromServer(currentScope, ngDataApi, opts, function (error) {
							if (error) {
								currentScope.form.displayAlert('danger', error.code, true, 'urac', error.message);
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
	
	function editGroup(currentScope, groupsConfig, data) {
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
						var opts = {
							"method": "send",
							"routeName": "/urac/owner/admin/group/edit",
							"params": {
								"tCode": tCode,
								"__env": currentScope.currentSelectedEnvironment.toUpperCase(),
								"gId": data['_id']
							},
							"data": postData
						};
						if (currentScope.key) {
							opts.headers = {
								"key": currentScope.key
							}
						}
						getSendDataFromServer(currentScope, ngDataApi, opts, function (error) {
							if (error) {
								currentScope.form.displayAlert('danger', error.code, true, 'urac', error.message);
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
			'routeName': "/urac/owner/admin/group/delete",
			"headers": {
				"key": currentScope.key
			},
			"params": {
				"tCode": tCode,
				"__env": currentScope.currentSelectedEnvironment.toUpperCase(),
				'gId': '%id%'
			},
			'msg': {
				'error': translation.errorMessageDeleteGroup[LANG],
				'success': translation.successMessageDeleteGroup[LANG]
			}
		};
		
		multiRecordUpdate(ngDataApi, currentScope, config, function () {
			currentScope.listGroups();
		});
	}
	
	function delete1Group(currentScope, data) {
		var opts = {
			"method": "get",
			"routeName": "/urac/owner/admin/group/delete",
			"params": {
				"tCode": tCode,
				"__env": currentScope.currentSelectedEnvironment.toUpperCase(),
				"gId": data._id
			}
		};
		if (currentScope.key) {
			opts.headers = {
				"key": currentScope.key
			}
		}
		getSendDataFromServer(currentScope, ngDataApi, opts, function (error) {
			if (error) {
				currentScope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
			}
			else {
				currentScope.$parent.displayAlert('success', translation.selectedGroupRemoved[LANG]);
				currentScope.listGroups();
			}
		});
	}
	
	function assignUsers(currentScope, groupsConfig, data, event) {
		var opts = {
			"method": "get",
			"routeName": "/urac/owner/admin/listUsers",
			"params": {
				"tCode": tCode,
				"__env": currentScope.currentSelectedEnvironment.toUpperCase()
			}
		};
		if (currentScope.key) {
			opts.headers = {
				"key": currentScope.key
			}
		}
		getSendDataFromServer(currentScope, ngDataApi, opts, function (error, response) {
			if (error) {
				currentScope.$parent.displayAlert('danger', error.code, true, 'urac', error.message);
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
								var opts = {
									"method": "send",
									"routeName": "/urac/owner/admin/group/addUsers",
									"params": {
										"tCode": tCode,
										"__env": currentScope.currentSelectedEnvironment.toUpperCase()
									},
									"data": postData
								};
								if (currentScope.key) {
									opts.headers = {
										"key": currentScope.key
									}
								}
								getSendDataFromServer(currentScope, ngDataApi, opts, function (error) {
									if (error) {
										currentScope.form.displayAlert('danger', error.code, true, 'urac', error.message);
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