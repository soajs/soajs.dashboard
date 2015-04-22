"use strict";
var membersApp = soajsApp.components;
membersApp.controller('membersCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', function($scope, $timeout, $modal, ngDataApi) {
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

	$scope.selectService = function( service, index) {
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
				$scope.getUserInfo();
			}
		});
	};

	$scope.getUserInfo = function() {
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
				$scope.getAllServices();
			}
		});
	};

	$scope.getAllServices = function() {
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

				var pckName = $scope.tenantApp.application.package;
				if($scope.user.config && ($scope.user.config.packages))
				{
					if( ($scope.user.config.packages[pckName]) && ($scope.user.config.packages[pckName].acl))
					{
						$scope.aclFill.services= angular.copy( $scope.user.config.packages[pckName].acl );
					}
				}

				if( JSON.stringify($scope.aclFill.services)== "{}")
				{
					if($scope.tenantApp.app_acl){
						$scope.aclFill.services=$scope.tenantApp.app_acl;
						$scope.fillFormServices();
					}
					else{
						getSendDataFromServer(ngDataApi, {
							"method": "get",
							"routeName": "/dashboard/product/packages/get",
							"params": {"productCode": $scope.tenantApp.application.product , "packageCode": $scope.tenantApp.application.package}

						}, function (error, response) {
							if (error) {
								$scope.$parent.displayAlert('danger', error.message);
							}
							else {
								$scope.aclFill.services=response.acl;
								$scope.fillFormServices();
							}
						});
					}
				}
				else{
					$scope.fillFormServices();
				}

			}
		});
	};

	$scope.fillFormServices = function() {
		var pckName = $scope.tenantApp.application.package;

		for(var propt in $scope.aclFill.services)
		{
			var s = $scope.aclFill.services[propt];
			s.include =true;
			s.collapse = false;

			if(s.access){
				if( s.access===true){
					s.accessType = 'private';
				}
				else if( s.access===false){
					s.accessType = 'public';
				}
				else if(Array.isArray(s.access)){
					s.accessType = 'groups';
					s.grpCodes={};
					s.access.forEach(function( c ) {
						s.grpCodes[c]=true;
					});
				}
			}
			else{
				s.accessType = 'public';
			}

			if(s.apisPermission==='restricted'){
				s.apisRestrictPermission = true;
			}
			if(s.apis){
				for(var ap in s.apis)
				{
					s.apis[ap].include=true;
					s.apis[ap].accessType = 'clear';
					if( s.apis[ap].access==true)
					{
						s.apis[ap].accessType = 'private';
					}
					else if( s.apis[ap].access===false)
					{
						s.apis[ap].accessType = 'public';
					}
					else{
						if(Array.isArray(s.apis[ap].access)){
							s.apis[ap].accessType = 'groups';
							s.apis[ap].grpCodes={};
							s.apis[ap].access.forEach(function( c ) {
								s.apis[ap].grpCodes[c]=true;
							});
						}
					}

				}
			}
		}
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
	};


	$scope.clearUserAcl = function() {
		var postData = $scope.user;
		if (!postData.config) {
			postData.config = {};
		}
		if( typeof(postData.config.packages) !=='object'){
			postData.config.packages={};
		}
		var pckName = $scope.tenantApp.application.package;
		postData.config.packages[pckName]= {};

		getSendDataFromServer(ngDataApi, {
			"method": "send",
			"routeName": "/urac/admin/editUser",
			"params": {"uId": $scope.user['_id']},
			"data": postData
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', 'Success');
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

		var aclObj={};
		var valid = true;

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

		postData.config.packages[pckName].acl = aclObj;
		if(valid){
			getSendDataFromServer(ngDataApi, {
				"method": "send",
				"routeName": "/urac/admin/editUser",
				"params": {"uId": $scope.user['_id']},
				"data": postData
			}, function(error, response) {
				if(error) {
					$scope.$parent.displayAlert('danger', error.message);
				}
				else {
					$scope.$parent.displayAlert('success', 'Success');
				}
			});
		}
	};

	//call default method
	$scope.getTenantAppInfo();
}]);