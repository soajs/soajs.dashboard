"use strict";
var membersService = soajsApp.components;
membersService.service('membersHelper', ['ngDataApi', '$timeout', '$modal', function (ngDataApi, $timeout, $modal) {
	
	function listMembers(currentScope, moduleConfig, callback) {
		var userCookie = currentScope.$parent.userCookie;
		var tenantId = (callback) ? currentScope.tId : userCookie.tenant.id;
		var opts = {
			"method": "get",
			"routeName": "/urac/admin/listUsers",
			"params": {'tId': tenantId}
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
		if (currentScope.access.adminUser.editUserConfig) {
			options.left.push({
				'label': translation.editACL[LANG],
				'icon': 'unlocked',
				'handler': 'editAcl'
			});
		}
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
	
	function addMember(currentScope, moduleConfig, useCookie) {
		var userCookie = currentScope.$parent.userCookie;
		var config = angular.copy(moduleConfig.form);
		var tenantId = (useCookie) ? userCookie.tenant.id : currentScope.tId;
		var tenantCode = (useCookie) ? userCookie.tenant.code : currentScope.tenant.code;
		overlayLoading.show();
		var opts ={
			"method": "get",
			"routeName": "/urac/admin/group/list",
			"params": {'tId': tenantId}
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
									'groups': formData.groups,
									'tId': tenantId,
									'tCode': tenantCode
								};
								overlayLoading.show();
								var opts = {
									"method": "post",
									"routeName": "/urac/admin/addUser",
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
	
	function editMember(currentScope, moduleConfig, data, useCookie) {
		var userCookie = currentScope.$parent.userCookie;
		var config = angular.copy(moduleConfig.form);
		var tenantId = (useCookie) ? userCookie.tenant.id : currentScope.tId;
		var opts = {
			"method": "get",
			"routeName": "/urac/admin/group/list",
			"params": {'tId': tenantId}
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
									'tId': tenantId,
									'status': (Array.isArray(formData.status)) ? formData.status.join(",") : formData.status
								};
								var opts = {
									"method": "post",
									"routeName": "/urac/admin/editUser",
									"params": {"uId": data['_id']},
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
			'method': 'get',
			'routeName': "/urac/admin/changeUserStatus",
			"params": {'uId': '%id%', 'status': 'active'},
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
			'method': 'get',
			'routeName': "/urac/admin/changeUserStatus",
			"params": {'uId': '%id%', 'status': 'inactive'},
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