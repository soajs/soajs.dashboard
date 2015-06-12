"use strict";
var contentManagementApp = soajsApp.components;
contentManagementApp.controller("ContentManagementCtrl", ['$scope', 'ngDataApi', '$compile', '$timeout', '$modal', function($scope, ngDataApi, $compile, $timeout, $modal) {
	$scope.$parent.isUserLoggedIn();
	$scope.access = {};

	getSendDataFromServer($scope, ngDataApi, {
		"method": "get",
		"routeName": "/dashboard/cb/list",
		"params": {'port': true}
	}, function(error, cbServices) {
		if(error) {
			$scope.$parent.displayAlert("danger", error.message);
		}
		else {
			$scope.hp = true;//show main listing page

			cbServices.forEach(function(oneService) {
				oneService.healthy = false;
				oneService.port = oneService.genericService.config.servicePort;
				delete oneService.genericService;
			});
			$scope.getEnvironments(cbServices);
		}
	});

	$scope.getEnvironments = function(cbServices) {
		if(!$scope.envList) {
			//get environments and build the tabs
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/environment/list"
			}, function(error, response) {
				if(error) {
					$scope.$parent.displayAlert('danger', error.message);
				}
				else {
					$scope.envList = {};
					response.forEach(function(oneEnv) {
						$scope.envList[oneEnv.code] = {'hosts': [], 'services': angular.copy(cbServices)};
					});
				}
			});
		}
	};

	$scope.listHosts = function(env) {
		if($scope.envList[env].hosts.length === 0) {
			$scope.$parent.displayAlert('info', "Checking if Services are healthy, please wait ...");
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/hosts/list",
				"params": {
					"env": env
				}
			}, function(error, hosts) {
				if(error || !hosts) {
					$scope.$parent.displayAlert('danger', "Unable to retrieve services hosts information.");
				}
				else {
					if(hosts && hosts.length > 0) {

						hosts.forEach(function(oneHost) {
							$scope.envList[env].services.forEach(function(oneService) {

								if(oneService.name === oneHost.name) {
									oneHost.port = oneService.port;
									$scope.envList[env].hosts.push(oneHost);

									$scope.executeHeartbeatTest(env, oneHost, function(healthy) {
										oneService.healthy = healthy;
									});
								}
							});
						});
					}
				}
			});
		}
	};

	$scope.executeHeartbeatTest = function(env, oneHost, cb) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/hosts/maintenanceOperation",
			"data": {
				"serviceName": oneHost.name,
				"operation": "heartbeat",
				"serviceHost": oneHost.ip,
				"servicePort": oneHost.port,
				"env": env
			}
		}, function(error, heartbeatResponse) {
			if(error) {
				$scope.$parent.displayAlert('danger', "Service is " + oneHost.name + " unreachable.");
			}
			else {
				return cb(heartbeatResponse.result);
			}
		});
	};

	$scope.loadUIModule = function(oneService, envCode) {
		if(!oneService.schema) {
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				"routeName": "/" + oneService.name + "/schema"
			}, function(error, cbConfig) {
				if(error || !cbConfig) {
					$scope.$parent.displayAlert("danger", error.message);
				}
				else {
					oneService.schema = cbConfig;
					$scope.populateCMUI(oneService, envCode);
				}
			});
		}
		else {
			$scope.populateCMUI(oneService, envCode);
		}
	};

	$scope.populateCMUI = function(oneService, envCode) {
		$scope.hp = false;
		//get schema from remote service.
		$scope.ui = {
			grid: false,
			add: false,
			left: [],
			top: []
		};

		constructModulePermissions($scope, $scope.access, {
			'listEntries': [oneService.name, '/list'],
			'addEntry': [oneService.name, '/add'],
			'updateEntry': [oneService.name, '/update'],
			'getEntry': [oneService.name, '/get'],
			'deleteEntry': [oneService.name, '/delete']
		});

		for(var apiRoute in oneService.schema.soajsService.apis) {
			if(oneService.schema.soajsService.apis.hasOwnProperty(apiRoute)) {
				switch(oneService.schema.soajsService.apis[apiRoute].type) {
					case 'add':
						if($scope.access.addEntry) {
							$scope.ui.add = true;
						}
						break;
					case 'update':
						if($scope.access.updateEntry) {
							$scope.ui.left.push({
								'label': 'Edit',
								'icon': 'pencil2',
								'handler': 'editEntry'
							});
						}
						break;
					case 'get':
						if($scope.access.getEntry) {
							$scope.ui.left.push({
								'label': 'View',
								'icon': 'search',
								'handler': 'viewEntry'
							});
						}
						break;
					case 'delete':
						if($scope.access.deleteEntry) {
							$scope.ui.left.push({
								'label': 'Delete',
								'icon': 'cross',
								'handler': 'deleteEntry',
								'msg': "Are you sure you want to delete the selected entry?"
							});
							$scope.ui.top.push({
								'label': 'Delete',
								'msg': "Are you sure you want to delete the selected entry(s)?",
								'handler': 'deleteEntries'
							});
						}
						break;
					case 'list':
						if($scope.access.listEntries) {
							$scope.ui.grid = true;
						}
						break;
				}
			}
		}

		$scope.selectedEnv = envCode;
		$scope.selectedService = oneService;
		if($scope.ui.grid) {
			$scope.listEntries();
		}
		else{
			var el = angular.element(document.getElementById("contentGridContainer_" + $scope.selectedEnv));
			el.html("<br/><p>You do not have access to this content module.</p>");
			$compile(el.contents())($scope);
		}
	};

	$scope.goBack = function() {
		var el = angular.element(document.getElementById("contentGridContainer_" + $scope.selectedEnv));
		el.html("");
		$compile(el.contents())($scope);

		$scope.selectedEnv = null;
		$scope.selectedService = null;
		$scope.hp = true;
	};

	$scope.listEntries = function() {
		var grid = angular.copy(cmConfig.grid);
		for(var i = 0; i < $scope.selectedService.schema.soajsUI.list.columns.length; i++) {
			$scope.selectedService.schema.soajsUI.list.columns[i].field = $scope.selectedService.schema.soajsUI.list.columns[i].field.replace("fields.", "");
		}

		grid.columns = $scope.selectedService.schema.soajsUI.list.columns;
		grid.defaultSortField = $scope.selectedService.schema.soajsUI.list.defaultSortField;
		grid.defaultSortASC = $scope.selectedService.schema.soajsUI.list.defaultSortASC;

		var options = {
			grid: grid,
			data: [],
			left: $scope.ui.left,
			top: $scope.ui.top
		};

		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/" + $scope.selectedService.name + "/list"
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				for(var i = 0; i < response.length; i++) {
					var fields = Object.keys(response[i]);
					var data = {};
					fields.forEach(function(oneField) {
						if(oneField === 'fields') {
							for(var content in response[i].fields) {
								data[content] = response[i].fields[content];
							}
						}
						else {
							data[oneField] = response[i][oneField];
						}
					});
					options.data.push(data);
				}
				buildGrid($scope, options);
				var el = angular.element(document.getElementById("contentGridContainer_" + $scope.selectedEnv));
				el.html("<br/><a href=\"\" ng-click=\"goBack()\" class=\"f-right btn btn-primary\">Go Back</a><a href=\"\" ng-click=\"addEntry()\" class=\"btn btn-primary\">Add New Entry</a><br/><br/><nglist></nglist>");
				$compile(el.contents())($scope);
			}
		});
	};

	$scope.addEntry = function() {
		var config = cmConfig.form.add;
		config.entries = $scope.selectedService.schema.soajsUI.form.add;
		var options = {
			timeout: $timeout,
			form: config,
			name: 'addEntry',
			label: 'Add New Entry',
			actions: [
				{
					'type': 'submit',
					'label': 'Save Data',
					'btn': 'primary',
					'action': function(formData) {
						var casting = ['select', 'radio'];
						for(var input in formData) {
							$scope.selectedService.schema.soajsUI.form.update.forEach(function(iSchema) {
								if(iSchema.name === input) {
									if(casting.indexOf(iSchema.type) !== -1 && Array.isArray(formData[input])) {
										formData[input] = formData[input][0];
									}
								}
							});
						}

						getSendDataFromServer($scope, ngDataApi, {
							"method": "send",
							"routeName": "/" + $scope.selectedService.name + "/add",
							"data": formData
						}, function(error) {
							if(error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', 'Data Added Successfully.');
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listEntries();
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

	$scope.editEntry = function(data) {
		var config = cmConfig.form.update;
		config.entries = $scope.selectedService.schema.soajsUI.form.update;
		var options = {
			timeout: $timeout,
			form: config,
			data: data,
			name: 'updateEntry',
			label: 'Update Entry',
			actions: [
				{
					'type': 'submit',
					'label': 'Save Data',
					'btn': 'primary',
					'action': function(formData) {
						var casting = ['select', 'radio'];
						for(var input in formData) {
							$scope.selectedService.schema.soajsUI.form.update.forEach(function(iSchema) {
								if(iSchema.name === input) {
									if(casting.indexOf(iSchema.type) !== -1 && Array.isArray(formData[input])) {
										formData[input] = formData[input][0];
									}
								}
							});
						}

						getSendDataFromServer($scope, ngDataApi, {
							"method": "send",
							"routeName": "/" + $scope.selectedService.name + "/update",
							"params": {"id": data._id},
							"data": formData
						}, function(error) {
							if(error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', 'Data Updated Successfully.');
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listEntries();
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

	$scope.viewEntry = function(data) {
		$modal.open({
			templateUrl: "infoBox.html",
			size: 'lg',
			backdrop: false,
			keyboard: false,
			controller: function($scope, $modalInstance) {
				$scope.title = "View Entry";
				$scope.data = angular.copy(data);
				delete $scope.data['$$hashKey'];
				delete $scope.data['_id'];
				for(var i in $scope.data) {
					if(i === 'created' || i === 'modified') {
						$scope.data[i] = new Date($scope.data[i]).toISOString();
					}
				}
				$scope.ok = function() {
					$modalInstance.dismiss('ok');
				};
			}
		});
	};

	$scope.deleteEntry = function(data) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/" + $scope.selectedService.name + "/delete",
			"params": {"id": data._id}
		}, function(error) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', 'Data Deleted Successfully.');
				$scope.listEntries();
			}
		});
	};

	$scope.deleteEntries = function() {
		var config = {
			'routeName': "/" + $scope.selectedService.name + "/delete",
			"params": {'id': '%id%'},
			'msg': {
				'error': 'one or more of the selected Data was not deleted.',
				'success': 'Data Deleted Successfully.'
			}
		};

		multiRecordUpdate(ngDataApi, $scope, config, function() {
			$scope.listEntries();
		});
	};
}]);