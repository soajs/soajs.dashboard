soajsApp.directive('tenantAppAclform', ['ngDataApi', '$routeParams', function(ngDataApi, $routeParams) {
	return {
		restrict: 'E',
		templateUrl: 'lib/helpers/tenAppAcl.tmpl',
		controllerAs : 'myACL',
		controller: function($scope){

			$scope.isInherited=false;
			$scope.allServiceApis=[];
			$scope.currentApplication = {};
			$scope.allGroups=[];
			$scope.aclPriviledges={};
			$scope.aclPriviledges.services={};
			$scope.parentPackage={};

			$scope.minimize =function(service){
				$scope.aclPriviledges.services[service.name].collapse = true;
			};

			$scope.expand =function(service){
				$scope.aclPriviledges.services[service.name].collapse = false;
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

			$scope.getApplicationInfo = function() {
				var tId=  $routeParams.tId;
				var appId=  $routeParams.appId;
				// get tenant application info
				getSendDataFromServer($scope, ngDataApi, {
					"method": "get",
					"routeName": "/dashboard/tenant/application/list",
					"params": { "id": tId }
				}, function (error, response) {
					if (error) {
						$scope.$parent.displayAlert('danger', error.message);
					}
					else {
						var l = response.length;
						for (var x = 0; x<l; x++)
						{
							if(response[x].appId === appId)
							{
								$scope.currentApplication = response[x];
								if( $scope.currentApplication._TTL.toString().length >3){
									$scope.currentApplication._TTL = ($scope.currentApplication._TTL / 3600000).toString();
								}
								break;
							}
						}
						// get product info
						getSendDataFromServer($scope, ngDataApi, {
							"method": "get",
							"routeName": "/dashboard/product/packages/get",
							"params": {"productCode": $scope.currentApplication.product , "packageCode": $scope.currentApplication.package}

						}, function (error, response) {
							if (error) {
								$scope.$parent.displayAlert('danger', error.message);
							}
							else {
								$scope.parentPackage = response;
								$scope.currentApplication.parentPckgAcl = $scope.parentPackage.acl;

								var parentAcl = $scope.currentApplication.parentPckgAcl;
								var serviceNames= [];
								for (var serviceName in parentAcl){
									if(parentAcl.hasOwnProperty(serviceName)){
										serviceNames.push(serviceName);
									}
								}

								getSendDataFromServer($scope, ngDataApi, {
									"method": "send",
									"routeName": "/dashboard/services/list",
									"data": { "serviceNames": serviceNames }
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
											if( (parentAcl[name]) && (parentAcl[name].apisPermission === 'restricted'))
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

										// get groups list
										getSendDataFromServer($scope, ngDataApi, {
											"method": "get",
											"routeName": "/urac/admin/group/list",
											"params":{'tId': tId }
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
				if( $scope.currentApplication.acl)
				{
					$scope.aclPriviledges.services= angular.copy($scope.currentApplication.acl);
				}
				else
				{
					$scope.isInherited = true;
					$scope.aclPriviledges.services= angular.copy($scope.currentApplication.parentPckgAcl);
				}

				prepareViewAclObj($scope.aclPriviledges);

			};

			$scope.checkForGroupDefault=function(service,grp,val,myApi) {
				var defaultApi = service.fixList[grp]['defaultApi'];
				if(myApi.groupMain===true){
					if( $scope.aclPriviledges.services[service.name].apis ) {
						if (($scope.aclPriviledges.services[service.name].apis[defaultApi]) && $scope.aclPriviledges.services[service.name].apis[defaultApi].include !== true) {
							val.apis.forEach(function( one ) {
								if($scope.aclPriviledges.services[service.name].apis[one.v])
								{
									$scope.aclPriviledges.services[service.name].apis[one.v].include=false;
								}
							});

						}
					}
				}
			};

			$scope.applyRestriction=function(service){
				if( $scope.aclPriviledges.services[service.name].apisRestrictPermission===true ){
					var grpLabel;
					for(grpLabel in service.fixList )
					{
						if( service.fixList.hasOwnProperty( grpLabel )) {
							var defaultApi = service.fixList[grpLabel]['defaultApi'];
							if(defaultApi) {
								if($scope.aclPriviledges.services[service.name].apis) {
									var apisList = service.fixList[grpLabel]['apis'];
									if((!$scope.aclPriviledges.services[service.name].apis[defaultApi]) || $scope.aclPriviledges.services[service.name].apis[defaultApi].include !== true) {
										apisList.forEach(function(oneApi) {
											if($scope.aclPriviledges.services[service.name].apis[oneApi.v]) {
												$scope.aclPriviledges.services[service.name].apis[oneApi.v].include = false;
											}
										});
									}
								}
							}
						}
					}
				}
			};

			$scope.clearAcl=function(){
				var tId=  $routeParams.tId;
				var appId=  $routeParams.appId;
				var postData = $scope.currentApplication;

				postData.productCode = $scope.currentApplication.product ;
				postData.packageCode = $scope.currentApplication.package.split("_")[1];
				postData.clearAcl = true;

				getSendDataFromServer( ngDataApi, {
					"method": "send",
					"routeName": "/dashboard/tenant/application/update",
					"data": postData,
					"params": {"id": tId, "appId" : appId}
				}, function(error) {
					if(error) {
						$scope.$parent.displayAlert('danger', error.message);
						alert(error.message);
					}
					else {
						$scope.$parent.displayAlert('success', 'ACL Updated Successfully.');
					}
				});
			};

			$scope.saveACL=function(){
				var tId=  $routeParams.tId;
				var appId=  $routeParams.appId;
				var postData = $scope.currentApplication ;

				postData.productCode = $scope.currentApplication.product ;
				postData.packageCode = $scope.currentApplication.package.split("_")[1];

				var result = prepareAclObjToSave($scope, $scope.aclPriviledges);

				if(result.valid){
					postData.acl = result.data;
					getSendDataFromServer( ngDataApi, {
						"method": "send",
						"routeName": "/dashboard/tenant/application/update",
						"data": postData,
						"params": {"id": tId, "appId" : appId}
					}, function(error) {
						if(error) {
							$scope.$parent.displayAlert('danger', error.message);
							alert(error.message);
						}
						else {
							$scope.$parent.displayAlert('success', 'ACL Updated Successfully.');
						}
					});
				}

			};

			//default operation
			$scope.getApplicationInfo();


		}
	};
}
]);

soajsApp.directive('manageGroups', ['ngDataApi', '$routeParams', '$timeout', '$modal', function(ngDataApi, $routeParams ,$timeout, $modal) {
	return {
		restrict: 'E',
		templateUrl: 'lib/helpers/manageGroups.tmpl',
		controllerAs : 'myGroup',
		scope: true,
		controller: function($scope){
			$scope.tenant = $scope.row;
			$scope.tId = $scope.row['_id'];
			$scope.myGroups =[];

			$timeout(function() {
				if( $scope.groups && $scope.groups[ $scope.tId  ]  ){
					$scope.myGroups = $scope.groups[ $scope.tId  ].list;
					$scope.viewListGrps();
				}
			}, 1000);

			$scope.viewListGrps = function(){
				var options = {
					grid: groupsConfig.grid,
					data: $scope.myGroups,
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

			};

			$scope.reloadGroups = function(){
				getSendDataFromServer($scope, ngDataApi, {
					"method": "get",
					"routeName": "/urac/admin/group/list",
					"params":{'tId': $scope.tId }
				}, function(error, response) {
					if(error) {
						$scope.$parent.displayAlert("danger", error.message);
					}
					else {
						$scope.myGroups = response;
						$scope.viewListGrps();
					}
				});
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

								getSendDataFromServer($scope, ngDataApi, {
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
										$scope.reloadGroups();
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
									'tId': $scope.tId ,
									'tCode': $scope.tenant.code
								};
								
								getSendDataFromServer($scope, ngDataApi, {
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
										$scope.reloadGroups();
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
					$scope.reloadGroups();
				});
			};
			
			$scope.delete1Group = function(data) {
				getSendDataFromServer($scope, ngDataApi, {
					"method": "get",
					"routeName": "/urac/admin/group/delete",
					"params": {"gId": data._id }
				}, function(error) {
					if(error) {
						$scope.$parent.displayAlert('danger', error.message);
					}
					else {
						$scope.$parent.displayAlert('success', "Selected group has been removed.");
						$scope.reloadGroups();
					}
				});
			};
			
			$scope.assignUsers = function(data) {
				getSendDataFromServer($scope, ngDataApi, {
					"method": "get",
					"routeName": "/urac/admin/listUsers",
					"params":{'tId': $scope.tId }
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
										getSendDataFromServer($scope, ngDataApi, {
											"method": "send",
											"routeName": "/urac/admin/group/addUsers",
											"params":{'tId': $scope.tId },
											"data": postData
										}, function(error) {
											if(error) {
												$scope.form.displayAlert('danger', error.message);
											}
											else {
												$scope.$parent.displayAlert('success', 'User(s) Added Successfully.');
												$scope.modalInstance.close();
												$scope.form.formData = {};
												$scope.reloadGroups();
												$scope.$parent.$emit('reloadTenantMembers', {'tIdReload': $scope.tId});
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

		}
	};
}]);


soajsApp.directive('manageMembers', ['ngDataApi', '$routeParams', '$timeout', '$modal', function(ngDataApi, $routeParams ,$timeout, $modal) {
	return {
		restrict: 'E',
		templateUrl: 'lib/helpers/manageMembers.tmpl',
		scope: true,
		controller: function($scope){
			$scope.tenant = $scope.row;
			$scope.tId = $scope.row['_id'];
			$scope.myUsers =[];

			$timeout(function() {
				if( $scope.users && $scope.users[ $scope.tId  ]  ){
					$scope.myUsers = $scope.users[ $scope.tId  ].list;

					$scope.printMembers();

				}
			}, 1000);

			$scope.printMembers = function(){
				var len = $scope.myUsers.length;
				for(var x = 0; x < len; x++) {
					if($scope.myUsers[x].groups) {
						$scope.myUsers[x].grpsArr = $scope.myUsers[x].groups.join(', ');
					}
					else {
						$scope.myUsers[x].grpsArr = '';
					}
				}

				var options = {
					grid: membersConfig.grid,
					data: $scope.myUsers,
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

			};

			$scope.listMembers = function() {
				getSendDataFromServer($scope, ngDataApi, {
					"method": "get",
					"routeName": "/urac/admin/listUsers",
					"params":{'tId': $scope.tId }
				}, function(error, response) {
					if(error) {
						$scope.$parent.displayAlert("danger", error.message);
					}
					else {
						$scope.myUsers = response ;

						$scope.printMembers();

					}
				});
			};

			$scope.addMember = function() {
				var config = angular.copy(membersConfig.form);
				getSendDataFromServer($scope, ngDataApi, {
					"method": "get",
					"routeName": "/urac/admin/group/list",
					"params":{'tId': $scope.tId}
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
											'tId': $scope.tId ,
											'tCode': $scope.tenant.code
										};

										getSendDataFromServer($scope, ngDataApi, {
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
				getSendDataFromServer($scope, ngDataApi, {
					"method": "get",
					"routeName": "/urac/admin/group/list",
					"params":{'tId': $scope.tId }
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
											'tId': $scope.tId ,
											'status': (Array.isArray(formData.status)) ? formData.status.join(",") : formData.status
										};

										getSendDataFromServer($scope, ngDataApi, {
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

			$scope.$parent.$on('reloadTenantMembers', function(event, args) {
				$scope.listMembers();
			});

		}
	};
}]);