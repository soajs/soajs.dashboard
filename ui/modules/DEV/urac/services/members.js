"use strict";
var serviceUracDEVapp = soajsApp.components;

serviceUracDEVapp.service('tenantMembersHelper', ['ngDataApi', '$timeout', '$cookies', '$modal', function (ngDataApi, $timeout, $cookies, $modal) {
	function listMembers(currentScope, moduleConfig, callback) {
		var opts = {
			"method": "get",
			"routeName": "/urac/owner/admin/listUsers",
			"proxy": true,
			"params": {
				"__env": currentScope.currentSelectedEnvironment.toUpperCase(),
				"tCode": $cookies.get('urac_merchant')
			}
		};
		
		if (currentScope.key) {
			opts.headers = {
				"key": currentScope.key
			}
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
					printMembers(currentScope, moduleConfig, response);
				}
			}
		});
	}
	
	function printMembers(currentScope, moduleConfig, response) {
		for (var x = 0; x < response.length; x++) {
			if (response[x].groups) {
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
		
		if (currentScope.access.adminUser.editUser) {
			options.left.push({
				'label': translation.edit[LANG],
				'icon': 'pencil2',
				'handler': 'editMember'
			});
		}
		// if (currentScope.access.adminUser.editUserConfig) {
		// 	options.left.push({
		// 		'label': translation.editACL[LANG],
		// 		'icon': 'unlocked',
		// 		'handler': 'editAcl'
		// 	});
		// }
		if (currentScope.access.adminUser.changeStatusAccess) {
			options.top = [
				{
					'label': translation.activate[LANG],
					'msg': translation.areYouSureWantActivateSelectedMember[LANG],
					'handler': 'activateMembers'
				},
				{
					'label': translation.deactivate[LANG],
					'msg': translation.areYouSureWantDeactivateSelectedMember[LANG],
					'handler': 'deactivateMembers'
				}
			];
			
		}
		buildGrid(currentScope, options);
	}
	
	function addMember(currentScope, moduleConfig) {
		var config = angular.copy(moduleConfig.form);

		overlayLoading.show();
		var opts = {
			"method": "get",
			"routeName": "/urac/owner/admin/group/list",
			"params": {
				"tCode": $cookies.get('urac_merchant'),
				"__env": currentScope.currentSelectedEnvironment.toUpperCase()
			}
		};
		if (currentScope.key) {
			opts.headers = {
				"key": currentScope.key
			}
		}
		getSendDataFromServer(currentScope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.form.displayAlert('danger', error.code, true, 'urac', error.message);
			}
			else {
				var grps = [];
				for (var x = 0; x < response.length; x++) {
					grps.push({'v': response[x].code, 'l': response[x].name, 'selected': false});
				}
				config.entries.push({
					'name': 'groups',
					'label': translation.groups[LANG],
					'type': 'checkbox',
					'value': grps,
					'tooltip': translation.assignGroups[LANG]
				});
				var options = {
					timeout: $timeout,
					form: config,
					name: 'addMember',
					label: translation.addNewMember[LANG],
					actions: [
						{
							'type': 'submit',
							'label': translation.addMember[LANG],
							'btn': 'primary',
							'action': function (formData) {
								var postData = {
									'username': formData.username,
									'firstName': formData.firstName,
									'lastName': formData.lastName,
									'email': formData.email,
									'groups': formData.groups
								};
								overlayLoading.show();
								var opts = {
									"method": "send",
									"routeName": "/urac/owner/admin/addUser",
									"params": {
										"tCode": $cookies.get('urac_merchant'),
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
									overlayLoading.hide();
									if (error) {
										currentScope.form.displayAlert('danger', error.code, true, 'urac', error.message);
									}
									else {
										currentScope.$parent.displayAlert('success', translation.memberAddedSuccessfully[LANG]);
										currentScope.modalInstance.close();
										currentScope.form.formData = {};
										currentScope.listMembers();
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
	
	function editAcl(currentScope, data) {
		currentScope.$parent.go('/members/' + data._id + '/editUserAcl');
	}
	
	function editMember(currentScope, moduleConfig, data) {
		var config = angular.copy(moduleConfig.form);
		
		var opts = {
			"method": "get",
			"routeName": "/urac/owner/admin/group/list",
			"params": {
				"tCode": $cookies.get('urac_merchant'),
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
				var grps = [];
				var datagroups = [];
				if (data.groups) {
					datagroups = data.groups;
				}
				var sel = false;
				for (var x = 0; x < response.length; x++) {
					sel = datagroups.indexOf(response[x].code) > -1;
					grps.push({'v': response[x].code, 'l': response[x].name, 'selected': sel});
				}
				config.entries.push({
					'name': 'groups',
					'label': translation.groups[LANG],
					'type': 'checkbox',
					'value': grps,
					'tooltip': translation.assignGroups[LANG]
				});
				config.entries.push({
					'name': 'status',
					'label': translation.status[LANG],
					'type': 'radio',
					'value': [{'v': 'pendingNew'}, {'v': 'active'}, {'v': 'inactive'}],
					'tooltip': translation.selectStatusUser[LANG]
				});
				
				var options = {
					timeout: $timeout,
					form: config,
					'name': 'editMember',
					'label': translation.editMember[LANG],
					'data': data,
					'actions': [
						{
							'type': 'submit',
							'label': translation.editMember[LANG],
							'btn': 'primary',
							'action': function (formData) {
								var postData = {
									'username': formData.username,
									'firstName': formData.firstName,
									'lastName': formData.lastName,
									'email': formData.email,
									'groups': formData.groups,
									'status': (Array.isArray(formData.status)) ? formData.status.join(",") : formData.status
								};
								var opts = {
									"method": "send",
									"routeName": "/urac/owner/admin/editUser",
									"params": {
										"tCode": $cookies.get('urac_merchant'),
										"__env": currentScope.currentSelectedEnvironment.toUpperCase(),
										"uId": data['_id']
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
										currentScope.$parent.displayAlert('success', translation.memberUpdatedSuccessfully[LANG]);
										currentScope.modalInstance.close();
										currentScope.form.formData = {};
										currentScope.listMembers();
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
	
	function activateMembers(currentScope) {
		overlayLoading.show();
		var config = {
			"headers": {
				"key": currentScope.key
			},
			'routeName': "/urac/owner/admin/changeUserStatus",
			"params": {
				"tCode": $cookies.get('urac_merchant'),
				"__env": currentScope.currentSelectedEnvironment.toUpperCase(),
				'uId': '%id%',
				'status': 'active'
			},
			'msg': {
				'error': translation.errorMessageActivateMembers[LANG],
				'success': translation.successMessageActivateMembers[LANG]
			}
		};
		
		multiRecordUpdate(ngDataApi, currentScope, config, function () {
			overlayLoading.hide();
			currentScope.listMembers();
		});
	}
	
	function deactivateMembers(currentScope) {
		overlayLoading.show();
		var config = {
			"headers": {
				"key": currentScope.key
			},
			'routeName': "/urac/owner/admin/changeUserStatus",
			"params": {
				"tCode": $cookies.get('urac_merchant'),
				"__env": currentScope.currentSelectedEnvironment.toUpperCase(),
				'uId': '%id%', 'status': 'inactive'
			},
			'msg': {
				'error': translation.errorMessageDeactivateMembers[LANG],
				'success': translation.successMessageDeactivateMembers[LANG]
			}
		};
		
		multiRecordUpdate(ngDataApi, currentScope, config, function () {
			overlayLoading.hide();
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