"use strict";
var serviceUracApp = soajsApp.components;

serviceUracApp.service('tenantGroupsModuleStgHelper', ['ngDataApi', '$timeout', '$cookies', '$modal', function (ngDataApi, $timeout, $cookies, $modal) {

	function listGroups(currentScope, groupConfig, callback) {
		var tCode = $cookies.getObject('urac_merchant').code;
		if (currentScope.access.adminGroup.list) {
			var opts = {
				"method": "get",
				"routeName": "/urac/owner/admin/group/list",
				"proxy": true,
				"params": {
					"tCode": tCode,
					"__env": currentScope.currentSelectedEnvironment.toUpperCase()
				}
			};
			
			getSendDataFromServer(currentScope, ngDataApi, opts, function (error, response) {
				if (error) {
					currentScope.$parent.displayAlert("danger", error.code, true, 'urac', error.message);
				}
				else {
					if (callback && typeof(callback) === 'function') {
						return callback(response);
					}
					else {
						printGroups(currentScope, groupConfig, response);
					}
				}
			});
		}
	}
	
	function printGroups(currentScope, groupConfig, response) {
		var tCode = $cookies.getObject('urac_merchant').code;
		var options = {
			grid: groupConfig.grid,
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
	
	function addGroup(currentScope, groupConfig) {
		var tCode = $cookies.getObject('urac_merchant').code;
		var config = angular.copy(groupConfig.form);
		
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
							"proxy": true,
							"params": {
								"tCode": tCode,
								"__env": currentScope.currentSelectedEnvironment.toUpperCase()
							},
							"data": postData
						};
						
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
	
	function editGroup(currentScope, groupConfig, data) {
		var tCode = $cookies.getObject('urac_merchant').code;
		var config = angular.copy(groupConfig.form);
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
							"proxy": true,
							"params": {
								"tCode": tCode,
								"__env": currentScope.currentSelectedEnvironment.toUpperCase(),
								"gId": data['_id']
							},
							"data": postData
						};
						
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
		var tCode = $cookies.getObject('urac_merchant').code;
		var config = {
			"method": "del",
			'routeName': "/urac/owner/admin/group/delete",
			"proxy": true,
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
		var tCode = $cookies.getObject('urac_merchant').code;
		var opts = {
			"method": "del",
			"routeName": "/urac/owner/admin/group/delete",
			"proxy": true,
			"params": {
				"tCode": tCode,
				"__env": currentScope.currentSelectedEnvironment.toUpperCase(),
				"gId": data._id
			}
		};
		
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
	
	function assignUsers(currentScope, groupConfig, data, event) {
		var tCode = $cookies.getObject('urac_merchant').code;
		var opts = {
			"method": "get",
			"routeName": "/urac/owner/admin/listUsers",
			"proxy": true,
			"params": {
				"tCode": tCode,
				"__env": currentScope.currentSelectedEnvironment.toUpperCase()
			}
		};
		
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
				
				var config = angular.copy(groupConfig.users);
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
									"proxy": true,
									"params": {
										"tCode": tCode,
										"__env": currentScope.currentSelectedEnvironment.toUpperCase()
									},
									"data": postData
								};
								
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