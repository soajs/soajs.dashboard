"use strict";
var groupsApp = soajsApp.components;
groupsApp.controller('groupsCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', function($scope, $timeout, $modal, ngDataApi) {
	$scope.$parent.isUserLoggedIn();

	$scope.listGroups = function() {
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/urac/admin/group/list"
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert("danger", error.message);
			}
			else {
				
				var options = {
					grid: groupsConfig.grid,
					data: response,
					defaultSortField: 'code',
					left: [
					{
						'label': 'Assign Users',
						'icon': 'view',
						'handler': 'assignUsers'
					},
					{
						'label': 'Edit',
						'icon': 'edit',
						'handler': 'editGroup'
					},
					{
						'label': 'Delete',
						'icon': 'remove',
						'msg': "Are you sure you want to delete this group?",
						'handler': 'delete1Group'
					}
					],
					top: [{
						'label': 'Delete',
						'msg': "Are you sure you want to delete the selected group(s)?",
						'handler': 'deleteGroups'
					}]
				};

				buildGrid($scope, options);
			}
		});
	};

	$scope.addGroup = function() {
		var config = angular.copy(groupsConfig.form);
		console.log(' addGroup ');
		
		var options = {
				timeout: $timeout,
				form: config,
				name: 'addGroup',
				label: 'Add New Group',
				actions: {
					submit: function(formData) {
						console.log(formData);
						
						var postData = {
							'name': formData.name,
							'code': formData.code,
							'description': formData.description
						};

						getSendDataFromServer(ngDataApi, {
							"method": "send",
							"routeName": "/urac/admin/group/add",
							"data": postData
						}, function(error, response) {
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
					},
					cancel: function() {
						$scope.modalInstance.dismiss('cancel');
						$scope.form.formData = {};
					}
				}
			};
		buildFormWithModal($scope, $modal, options);
		
	};

	$scope.editGroup = function(data) {
		console.log(data);
		var config = angular.copy(groupsConfig.form);
		config.entries[0].type = 'readonly';
		var options = {
			timeout: $timeout,
			form: config,
			'name': 'editMember',
			'label': 'Edit Member',
			'data': data,
			'actions': {
				submit: function(formData) {
					var postData = {
						'name': formData.name,
						'description': formData.description
					};
					
					console.log(formData);
					
					getSendDataFromServer(ngDataApi, {
						"method": "send",
						"routeName": "/urac/admin/group/edit",
						"params": {"gId": data['_id']},
						"data": postData
					}, function(error, response) {
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
				},
				cancel: function() {
					$scope.modalInstance.dismiss('cancel');
					$scope.form.formData = {};
				}
			}
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

		multiRecordUpdate(ngDataApi, $scope, config, function(valid) {
			$scope.listGroups();
		});
	};
	$scope.delete1Group = function(data) {
		console.log(data);
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/urac/admin/group/delete",
			"params": {"gId": data._id}
		}, function(error, response) {
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
		console.log(data);
		getSendDataFromServer(ngDataApi, {
			"method": "get",
			"routeName": "/urac/admin/listUsers",
			"params": {}
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				var len = response.length;
				var value = [];
				var sel = false;
				console.log( data.code );
				for(var x=0; x<len; x++){					
					console.log(response[x]);
					console.log(response[x].groups);
					sel = false;					
					if( (response[x].groups) && response[x].groups.indexOf( data.code ) > -1  ){
						sel = true;
					}				
					value.push({ 
						'v': response[x].username, 
						'lb': response[x].username +'('+response[x].firstName+' ' +response[x].lastName +')' , 
						'selected':sel });					
				}
			
				var config = angular.copy(groupsConfig.users);
				console.log( 'config' );console.log( config );
				config.entries[0].value = value;
				
				var options = {
						timeout: $timeout,
						form: config,
						name: 'addGroup',
						label: 'Add Users to Group '+data.name,
						'msgs':{
						},
						actions: {
							submit: function(formData) {
								console.log(formData);
								console.log(data);
								
								var postData = {									
									'groupCode': data.code,
									'users': formData.users
								};									
								getSendDataFromServer(ngDataApi, {
									"method": "send",
									"routeName": "/urac/admin/group/addUsers",
									"data": postData
								}, function(error, response) {
									if(error) {
										$scope.form.displayAlert('danger', error.message);
									}
									else {
										$scope.$parent.displayAlert('success', 'User(s) Added Successfully.');
										$scope.modalInstance.close();
										$scope.form.formData = {};
										$scope.listGroups();
									}
								});
								
							},
							cancel: function() {
								$scope.modalInstance.dismiss('cancel');
								$scope.form.formData = {};
							}
						}
					};
				buildFormWithModal($scope, $modal, options);
			
			}
		});
	};
	
	//call default method
	$scope.listGroups();
}]);