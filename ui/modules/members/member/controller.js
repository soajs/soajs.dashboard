"use strict";
var membersApp = soajsApp.components;

membersApp.controller('mainMembersCtrl', ['$scope','$timeout','$modal','ngDataApi', '$cookies', '$cookieStore', function($scope, $timeout, $modal, ngDataApi, $cookies, $cookieStore) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, membersConfig.permissions);

	$scope.userCookie = $cookieStore.get('soajs_user');
	console.log( $scope.userCookie );

}]);

membersApp.controller('membersCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', function($scope, $timeout, $modal, ngDataApi) {
	$scope.key = apiConfiguration.key;

	var userCookie = $scope.$parent.userCookie;

	$scope.$parent.$on('reloadMembers', function() {
		$scope.listMembers();
	});

	$scope.access=$scope.$parent.access;

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
			"data": {}
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
	if($scope.access.adminUser.list){
		$scope.listMembers();
	}

}]);

membersApp.controller('memberAclCtrl', ['$scope', '$timeout', '$routeParams', 'ngDataApi', function($scope, $timeout, $routeParams, ngDataApi) {
	$scope.key = apiConfiguration.key;
	$scope.$parent.isUserLoggedIn();
	$scope.aclFill={};
	$scope.aclFill.services={};
	$scope.user={};
	$scope.tenantApp={};
	$scope.allGroups =[];
	$scope.pckName = '';

	$scope.minimize =function(service){
		$scope.aclFill.services[service.name].collapse = true;
	};
	$scope.expand =function(service){
		$scope.aclFill.services[service.name].collapse = false;
	};

	$scope.selectService = function( service) {
		if( $scope.aclFill.services[service.name]['include'])
		{
			$scope.aclFill.services[service.name].collapse = false;
		}
		else{
			$scope.aclFill.services[service.name].collapse = true;
		}
	};

	$scope.getTenantAppInfo = function() {

		getSendDataFromServer(ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/tenant/application/acl/get",
			"data": {"extKey": $scope.key}
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
					parentAcl = $scope.tenantApp.app_acl;
				}
				else if( $scope.tenantApp.application.parentPackageAcl)
				{
					parentAcl = $scope.tenantApp.application.parentPackageAcl;
				}

				var serviceName;
				for (serviceName in parentAcl){
					serviceNames.push(serviceName);
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
									var newList = [];

									if( (parentAcl[name]) &&(parentAcl[name].apisPermission === 'restricted'))
									{
										service.forceRestricted=true;
										service.apisRestrictPermission = true;
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
										var newList = service.apis ;
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
									"routeName": "/urac/admin/group/list"
								}, function(error, response) {
									if(error) {
										$scope.$parent.displayAlert("danger", error.message);
									}
									else {
										response.forEach(function( grpObj ) {
											$scope.allGroups.push(grpObj.code);
										});

										$scope.fillFormServices();

									}
								});


							}
						});

					}
				});

			}
		});
	};

	$scope.fillFormServices = function() {
		prepareViewAclObj($scope, $scope.aclFill);
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
		if( $scope.aclFill.services[service.name].apisRestrictPermission===true ){
			for(var grpLabel in service.fixList )
			{
				var defaultApi = service.fixList[grpLabel]['defaultApi'];
				if(defaultApi){
					if( $scope.aclFill.services[service.name].apis )
					{
						var apisList = service.fixList[grpLabel]['apis'];
						if ((!$scope.aclFill.services[service.name].apis[defaultApi]) || $scope.aclFill.services[service.name].apis[defaultApi].include !== true)
						{
							apisList.forEach(function( oneApi ) {
								if($scope.aclFill.services[service.name].apis[oneApi.v])
								{
									$scope.aclFill.services[service.name].apis[oneApi.v].include=false;
								}
							});
						}
					}
				}
			}
		}
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

		/*
		for(var propt in $scope.aclFill.services)
		{
			var s = angular.copy($scope.aclFill.services[propt]);
			if(s.include===true)
			{
				aclObj[propt]={};
				aclObj[propt].apis={};

				if(s.accessType==='private'){
					aclObj[propt].access=true;
				}
				else if(s.accessType==='public'){
					aclObj[propt].access=false;
				}
				else if(s.accessType==='groups')
				{
					aclObj[propt].access=[];
					var grpCodes = $scope.aclFill.services[propt].grpCodes;
					if( grpCodes )
					{
						var code = null;
						for(code in grpCodes)
						{
							if(grpCodes[code]){
								aclObj[propt].access.push(code);
							}
						}
					}

					if(aclObj[propt].access.length==0)
					{
						$scope.$parent.displayAlert('danger', 'You need to choose at least one group when the service access type is set to Groups');
						console.log('error for service: '+propt);
						valid=false;
					}
				}

				if(s.apisRestrictPermission ===true ){
					aclObj[propt].apisPermission ='restricted';
				}

				if(s.apis)
				{
					for(var ap in s.apis){
						var api = s.apis[ap];

						if( ( s.apisRestrictPermission=== true && api.include===true) || (!s.apisRestrictPermission ) )
						{
							/// need to also check for the default api if restricted
							aclObj[propt].apis[ap]={};
							if(api.accessType==='private'){
								aclObj[propt].apis[ap].access=true;
							}
							else if(api.accessType==='public'){
								aclObj[propt].apis[ap].access=false;
							}
							else if(api.accessType==='groups'){
								aclObj[propt].apis[ap].access=[];
								var grpCodes = $scope.aclFill.services[propt].apis[ap].grpCodes;

								if( grpCodes )
								{
									var code = null;
									for(code in grpCodes)
									{
										if(grpCodes[code]){
											aclObj[propt].apis[ap].access.push(code);
										}
									}
								}
								if(aclObj[propt].apis[ap].access.length==0)
								{
									$scope.$parent.displayAlert('danger', 'You need to choose at least one group when the access type is set to Groups');
									valid=false;
									console.log('error for api: '+ap);
								}
							}
						}
					}
				}
			}
		}
		*/
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
	$scope.users ;
	$scope.groups ;

	$scope.getAllUsersGroups=function()
	{
		function arrGroupByTenant(arr) {
			var result = {} ;
			var l = arr.length;

			for(var i=0; i<l; i++)
			{
				var g;
				if(arr[i].tenant.id)
				{
					g = arr[i].tenant.id;
				}
				if(g)
				{
					if(!result[g])
					{
						result[g]={};
						result[g].list=[];
					}
					result[g].list.push(arr[i]);
				}

			}
			return result;
		};

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
				//console.log(users);
				//console.log(groups);

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
				//console.log(response);

				$scope.getAllUsersGroups ();
			}
		});
	};



	$scope.listTenants();

}]);
