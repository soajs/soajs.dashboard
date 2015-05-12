"use strict";
var membersApp = soajsApp.components;

membersApp.controller('mainMembersCtrl', ['$scope','$timeout','$modal','ngDataApi', '$cookies', '$cookieStore', function($scope, $timeout, $modal, ngDataApi, $cookies, $cookieStore) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, membersConfig.permissions);

	$scope.userCookie = $cookieStore.get('soajs_user');
}]);

membersApp.controller('membersCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', function($scope, $timeout, $modal, ngDataApi) {
	$scope.key = apiConfiguration.key;

	var userCookie = $scope.$parent.userCookie;

	$scope.$parent.$on('reloadMembers', function(event) {
		$scope.listMembers();
	});

	$scope.access=$scope.$parent.access;

	$scope.listMembers = function() {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/urac/admin/listUsers",
			"params":{'tId': userCookie.tenant.id}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert("danger", error.message);
			}
			else {
				var len = response.length;
				//var usersRecords = [];
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
					left: [],
					top: []
				};

				if($scope.access.adminUser.editUser)
				{
					options.left.push( {
						'label': 'Edit',
						'icon': 'pencil2',
						'handler': 'editMember'
					});
					options.left.push( {
						'label': 'Edit ACL',
						'icon': 'unlocked',
						'handler': 'editAcl'
					});
				}
				if($scope.access.adminUser.changeStatusAccess)
				{
					options.top=	[
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
				buildGrid($scope, options);
			}
		});
	};

	$scope.addMember = function() {
		var config = angular.copy(membersConfig.form);
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/urac/admin/group/list",
			"params":{'tId': userCookie.tenant.id}
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
									'groups': formData.groups,
									'tId': userCookie.tenant.id ,
									'tCode': userCookie.tenant.code
								};

								getSendDataFromServer(ngDataApi, {
									"method": "send",
									"routeName": "/urac/admin/addUser",
									"data": postData
								}, function(error) {
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
		$scope.$parent.go('/members/'+data._id+'/editUserAcl');
	};

	$scope.editMember = function(data) {
		var config = angular.copy(membersConfig.form);
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/urac/admin/group/list",
			"params":{'tId': userCookie.tenant.id}
		}, function(error, response) {
			if(error) {
				$scope.form.displayAlert('danger', error.message);
			}
			else {
				var len = response.length;
				var grps = [];
				var datagroups =[];
				if(data.groups) {
					datagroups = data.groups;
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
									'tId': userCookie.tenant.id,
									'status': (Array.isArray(formData.status)) ? formData.status.join(",") : formData.status
								};

								getSendDataFromServer(ngDataApi, {
									"method": "send",
									"routeName": "/urac/admin/editUser",
									"params": {"uId": data['_id']},
									"data": postData
								}, function(error) {
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

		multiRecordUpdate(ngDataApi, $scope, config, function() {
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

		multiRecordUpdate(ngDataApi, $scope, config, function() {
			$scope.listMembers();
		});
	};

	//call default method
	if($scope.access.adminUser.list){
		$scope.listMembers();
	}

}]);

membersApp.controller('memberAclCtrl', ['$scope', '$timeout', '$routeParams', 'ngDataApi','$cookies', '$cookieStore', function($scope, $timeout, $routeParams, ngDataApi, $cookies, $cookieStore) {
	$scope.key = apiConfiguration.key;
	$scope.$parent.isUserLoggedIn();
	$scope.aclFill={};
	$scope.aclFill.services={};
	$scope.user={};
	$scope.tenantApp={};
	$scope.allGroups =[];
	$scope.pckName = '';

	$scope.userCookie = $cookieStore.get('soajs_user');

	$scope.minimize =function(service){
		$scope.aclFill.services[service.name].collapse = true;
	};
	$scope.expand =function(service){
		$scope.aclFill.services[service.name].collapse = false;
	};

	$scope.selectService = function( service) {
		if( $scope.aclPriviledges.services[service.name].include){
			if( service.forceRestricted ){
				$scope.aclPriviledges.services[service.name].apisRestrictPermission = true;
			}
			$scope.aclFill.services[service.name].collapse = false;
		}else{
			$scope.aclFill.services[service.name].collapse = true;
		}
	};

	$scope.getTenantAppInfo = function() {
		getSendDataFromServer(ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/tenant/application/acl/get",
			"data": {}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.tenantApp = response;
				$scope.pckName = response.application.package;

				var serviceNames =[];
				var parentAcl={};
				if( $scope.tenantApp.application.app_acl){
					parentAcl = $scope.tenantApp.application.app_acl;
				}
				else if( $scope.tenantApp.application.parentPackageAcl)
				{
					parentAcl = $scope.tenantApp.application.parentPackageAcl;
				}

				var serviceName;
				for (serviceName in parentAcl){
					if(parentAcl.hasOwnProperty(serviceName)){
						serviceNames.push(serviceName);
					}
				}

				getSendDataFromServer(ngDataApi, {
					"method": "get",
					"routeName": "/urac/admin/getUser",
					"params": {"uId": $routeParams.uId}
				}, function(error, response) {
					if(error) {
						$scope.$parent.displayAlert('danger', error.message);
					}
					else {
						$scope.user = response;

						getSendDataFromServer(ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/services/list",
							"data": { "serviceNames":serviceNames }
						}, function (error, response) {
							if (error) {
								$scope.$parent.displayAlert('danger', error.message);
							}
							else {
								var servicesList = response;

								var l = servicesList.length;
								for(var x=0; x<l; x++)
								{
									var service = servicesList[x];
									var name = service.name;
									var newList;

									if( (parentAcl[name]) &&(parentAcl[name].apisPermission === 'restricted'))
									{
										newList = [];
										service.forceRestricted=true;

										var len = service.apis.length;
										for(var i=0; i<len; i++)
										{
											var v = service.apis[i].v ;
											if( parentAcl[name].apis){
												if( parentAcl[name].apis[v])
												{
													newList.push(service.apis[i]);
												}
											}
										}
										service.fixList = $scope.arrGroupByField( newList , 'group');
									}
									else{
										newList = service.apis ;
										service.fixList = $scope.arrGroupByField( service.apis , 'group');
									}

								}
								$scope.allServiceApis = servicesList;
								$scope.aclFill.services= parentAcl;

								var pckName = $scope.tenantApp.application.package;
								if($scope.user.config && ($scope.user.config.packages))
								{
									if( ($scope.user.config.packages[pckName]) && ($scope.user.config.packages[pckName].acl))
									{
										$scope.aclFill.services= angular.copy( $scope.user.config.packages[pckName].acl );
									}
								}


								getSendDataFromServer(ngDataApi, {
									"method": "get",
									"routeName": "/urac/admin/group/list",
									"params":{'tId': $scope.userCookie.tenant.id}
								}, function(error, response) {
									if(error) {
										$scope.$parent.displayAlert("danger", error.message);
									}
									else {
										response.forEach(function( grpObj ) {
											$scope.allGroups.push(grpObj.code);
										});

										prepareViewAclObj($scope.aclFill);

									}
								});

							}
						});

					}
				});

			}
		});
	};

	$scope.arrGroupByField = function(arr, f) {
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

	$scope.checkForGroupDefault=function(service,grp,val,myApi) {
		var defaultApi = service.fixList[grp]['defaultApi'];
		if(myApi.groupMain===true){
			if( $scope.aclFill.services[service.name].apis ) {
				if (($scope.aclFill.services[service.name].apis[defaultApi]) && $scope.aclFill.services[service.name].apis[defaultApi].include !== true) {
					val.apis.forEach(function( one ) {
						if($scope.aclFill.services[service.name].apis[one.v])
						{
							$scope.aclFill.services[service.name].apis[one.v].include=false;
						}
					});

				}
			}
		}
	};

	$scope.applyRestriction=function(service){
		applyPermissionRestriction($scope, service);
	};

	$scope.clearUserAcl = function() {
		var postData = $scope.user;

		if (typeof(postData.config) !=='object') {
			postData.config = {};
		}

		if( typeof(postData.config.packages) !=='object'){
			postData.config.packages={};
		}
		var pckgName = $scope.tenantApp.application.package;
		postData.config.packages[pckgName]= {};

		getSendDataFromServer(ngDataApi, {
			"method": "send",
			"routeName": "/urac/admin/editUser",
			"params": {"uId": $scope.user['_id']},
			"data": postData
		}, function(error) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', 'User Acl Deleted Successfully');
			}
		});
	};
	$scope.saveUserAcl = function() {
		var postData= $scope.user;
		if( typeof(postData.config) !=='object'){
			postData.config={};
		}
		if( typeof(postData.config.packages) !=='object'){
			postData.config.packages={};
		}
		var pckName = $scope.tenantApp.application.package;
		if( typeof(postData.config.packages[pckName])!=='object' )
		{
			postData.config.packages[pckName]= {};
		}
		if( typeof(postData.config.packages[pckName].acl)!=='object' )
		{
			postData.config.packages[pckName].acl= {};
		}

		var result = prepareAclObjToSave($scope, $scope.aclFill);

		if(result.valid){
			postData.config.packages[pckName].acl = result.data;

			getSendDataFromServer(ngDataApi, {
				"method": "send",
				"routeName": "/urac/admin/editUser",
				"params": {"uId": $scope.user['_id']},
				"data": postData
			}, function(error) {
				if(error) {
					$scope.$parent.displayAlert('danger', error.message);
				}
				else {
					$scope.$parent.displayAlert('success', 'Acl Updated Successfully');
				}
			});
		}
	};
	//call default method
	$scope.getTenantAppInfo();
}]);

membersApp.controller('tenantsUracCtrl', ['$scope', '$timeout', '$routeParams', 'ngDataApi', function($scope, $timeout, $routeParams, ngDataApi) {
	$scope.users={} ;
	$scope.groups={};

	$scope.getAllUsersGroups=function(){
		function arrGroupByTenant(arr) {
			var result = {} ;
			var l = arr.length;
			for(var i=0; i<l; i++)
			{
				var g;
				if(arr[i].tenant.id){
					g = arr[i].tenant.id;
				}
				if(g){
					if(!result[g])
					{
						result[g]={};
						result[g].list=[];
					}
					result[g].list.push(arr[i]);
				}
			}
			return result;
		}

		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/urac/admin/all"
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.users = arrGroupByTenant(response.users);
				$scope.groups = arrGroupByTenant(response.groups);
			}
		});
	};

	$scope.listTenants = function() {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/tenant/list"
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.tenantsList =  response ;
				$scope.getAllUsersGroups ();
			}
		});
	};

	$scope.listTenants();

}]);

membersApp.controller('groupsCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', function($scope, $timeout, $modal, ngDataApi) {
	//$scope.$parent.isUserLoggedIn();

	$scope.access=$scope.$parent.access;

	var userCookie = $scope.$parent.userCookie;

	$scope.listGroups = function() {
		if($scope.access.adminGroup.list){
			getSendDataFromServer(ngDataApi, {
				"method": "get",
				"routeName": "/urac/admin/group/list",
				"params":{'tId': userCookie.tenant.id}
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
		}
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
							'description': formData.description,
							'tId': userCookie.tenant.id ,
							'tCode': userCookie.tenant.code
						};

						getSendDataFromServer(ngDataApi, {
							"method": "send",
							"routeName": "/urac/admin/group/add",
							"data": postData
						}, function(error) {
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
						}, function(error) {
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

		multiRecordUpdate(ngDataApi, $scope, config, function() {
			$scope.listGroups();
		});
	};

	$scope.delete1Group = function(data) {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/urac/admin/group/delete",
			"params": {"gId": data._id, 'tId': userCookie.tenant.id }
		}, function(error) {
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
			"params":{'tId': userCookie.tenant.id}
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
									"params":{'tId': userCookie.tenant.id},
									"data": postData
								}, function(error) {
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

	$scope.listGroups();
}]);
