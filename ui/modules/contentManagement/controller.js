"use strict";
var contentManagementApp = soajsApp.components;
contentManagementApp.controller("ContentManagementCtrl", ['$scope', 'ngDataApi', '$compile', '$timeout', '$modal', 'cmService', function($scope, ngDataApi, $compile, $timeout, $modal, cmService) {
	$scope.$parent.isUserLoggedIn();
	$scope.access = {};

	$scope.loadUIModule = function(oneService) {
		$scope.hp = false;
		$scope.selectedService = oneService;

		constructModulePermissions($scope, $scope.access, {
			'listEntries': [oneService.name, '/list'],
			'addEntry': [oneService.name, '/add'],
			'updateEntry': [oneService.name, '/update'],
			'getEntry': [oneService.name, '/get'],
			'deleteEntry': [oneService.name, '/delete']
		});

		//get schema from remote service.
		$scope.ui = {
			grid: false,
			add: false,
			left: [],
			top: [],
			links: {}
		};

		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/" + oneService.name + "/schema"
		}, function(error, cbConfig) {
			if(error || !cbConfig) {
				$scope.$parent.displayAlert("danger", error.message);
			}
			else {
				oneService.schema = cbConfig;
				for(var apiRoute in oneService.schema.soajsService.apis) {
					if(oneService.schema.soajsService.apis.hasOwnProperty(apiRoute)) {
						switch(oneService.schema.soajsService.apis[apiRoute].type) {
							case 'add':
								if($scope.access.addEntry) {
									$scope.ui.add = true;
									$scope.ui.links['add'] = apiRoute;
								}
								break;
							case 'update':
								if($scope.access.updateEntry) {
									$scope.ui.left.push({
										'label': 'Edit',
										'icon': 'pencil2',
										'handler': 'editCMDataEntry'
									});
									$scope.ui.links['update'] = apiRoute;
								}
								break;
							case 'get':
								if($scope.access.getEntry) {
									$scope.ui.left.push({
										'label': 'View',
										'icon': 'search',
										'handler': 'viewCMDataEntry'
									});
									$scope.ui.links['get'] = apiRoute;
								}
								break;
							case 'delete':
								if($scope.access.deleteEntry) {
									$scope.ui.left.push({
										'label': 'Delete',
										'icon': 'cross',
										'handler': 'deleteCMDataEntry',
										'msg': "Are you sure you want to delete the selected entry?"
									});
									$scope.ui.top.push({
										'label': 'Delete',
										'msg': "Are you sure you want to delete the selected entry(s)?",
										'handler': 'deleteCMDataEntries'
									});
									$scope.ui.links['delete'] = apiRoute;
								}
								break;
							case 'list':
								if($scope.access.listEntries) {
									$scope.ui.grid = true;
									$scope.ui.links['list'] = apiRoute;
								}
								break;
						}
					}
				}
				$timeout(function() {
					var firstEnv = Object.keys($scope.selectedService.schema.soajsService.db.config)[0];
					$scope.populateCMUI(firstEnv.toUpperCase());
				}, 1000);
			}
		});

	};

	$scope.populateCMUI = function(envCode) {
		$scope.selectedEnv = envCode.toLowerCase();

		if($scope.ui.grid) {
			$scope.listCMDataEntries();
		}
		else {
			var el = angular.element(document.getElementById("contentGridContainer_" + $scope.selectedEnv));
			el.html("<br/><a href=\"\" ng-click=\"goBack()\" class=\"f-right btn btn-primary\">Go Back</a><p>You do not have access to this content module.</p>");
			$compile(el.contents())($scope);
		}
	};

	$scope.goBack = function() {
		var el = angular.element(document.getElementById("contentGridContainer_" + $scope.selectedEnv));
		el.html("");
		$compile(el.contents())($scope);

		$scope.selectedService = null;
		$scope.hp = true;
	};

	$scope.listCMDataEntries = function() {
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
			//"url": $scope.selectedDomainAddress,
			"method": "get",
			"routeName": "/" + $scope.selectedService.name + $scope.ui.links['list'],
			"params": {
				"env": $scope.selectedEnv.toUpperCase()
			}
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
				var el = angular.element(document.getElementById("contentGridContainer_" + $scope.selectedEnv.toUpperCase()));
				el.html("<br/><a href=\"\" ng-click=\"addCMDataEntry()\" class=\"btn btn-primary\">Add New Entry</a><br/><br/><nglist></nglist>");
				$compile(el.contents())($scope);
			}
		});
	};

	$scope.addCMDataEntry = function() {
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

                        var files = cmService.extractFilesFromPostedData($scope, config, formData);
                        if(files === false){
                            $scope.form.displayAlert('danger', "Make sure you have filled all the files inputs.");
                        }
                        else{
                            getSendDataFromServer($scope, ngDataApi, {
                                "method": "send",
                                "routeName": "/" + $scope.selectedService.name + $scope.ui.links['add'],
                                "data": formData,
                                "params": {
                                    "env": $scope.selectedEnv.toUpperCase()
                                }
                            }, function(error, response) {
                                if(error) {
                                    $scope.form.displayAlert('danger', error.message);
                                }
                                else {
                                    if(typeof(files) === 'object'){
                                        cmService.UploadFile($scope, files, response, '/' + $scope.selectedService.name + "/upload", function(error){
                                            if(error){
                                                $scope.form.displayAlert('danger', error);
                                            }
                                            else{
                                                $scope.$parent.displayAlert('success', 'Data Added Successfully.');
                                                $scope.modalInstance.close();
                                                $scope.form.formData = {};
                                                $scope.listCMDataEntries();
                                            }
                                        });
                                    }
                                    else{
                                        $scope.$parent.displayAlert('success', 'Data Added Successfully.');
                                        $scope.modalInstance.close();
                                        $scope.form.formData = {};
                                        $scope.listCMDataEntries();
                                    }
                                }
                            });
                        }
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

	$scope.editCMDataEntry = function(data) {
		var config = cmConfig.form.update;
		config.entries = $scope.selectedService.schema.soajsUI.form.update;

        config.entries.forEach(function(oneFormField){
           if(['audio','video','image','document'].indexOf(oneFormField.type) !== -1){
               oneFormField.value = [];
               oneFormField.removeFileUrl = "/" + $scope.selectedService.name + "/deleteFile?env=" + $scope.selectedEnv.toUpperCase() + "&id=";

               data[oneFormField.name].forEach(function(v){
                   oneFormField.value.push({
                       'f' : "/" + $scope.selectedService.name + "/download/?env=" + $scope.selectedEnv.toUpperCase() + "&id=" + v,
                       'v': v
                   });
               });
           }
        });

		var options = {
			timeout: $timeout,
			form: config,
			data: data,
			name: 'updateEntry',
			label: 'Update Entry',
            ngDataApi: ngDataApi,
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

                        console.log(formData);
                        return false;
                        //todo: compare new files with existing
                        //todo: if new files invoke upload file

						getSendDataFromServer($scope, ngDataApi, {
							//"url": $scope.selectedDomainAddress,
							"method": "send",
							"routeName": "/" + $scope.selectedService.name + $scope.ui.links['update'],
							"params": {
								"id": data._id,
								"env": $scope.selectedEnv.toUpperCase()
							},
							"data": formData
						}, function(error) {
							if(error) {
								$scope.form.displayAlert('danger', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', 'Data Updated Successfully.');
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listCMDataEntries();
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

	$scope.viewCMDataEntry = function(data) {
		getSendDataFromServer($scope, ngDataApi, {
			//"url": $scope.selectedDomainAddress,
			"method": "get",
			"routeName": "/" + $scope.selectedService.name + $scope.ui.links['get'],
			"params": {
				"id": data._id,
				"env": $scope.selectedEnv.toUpperCase()
			}
		}, function(error, repsonse) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
                var config = $scope.selectedService.schema.soajsUI.form.add;
                var scope = $scope;
				$modal.open({
					templateUrl: "infoBox.html",
					size: 'lg',
					backdrop: false,
					keyboard: false,
					controller: function($scope, $modalInstance) {
						$scope.title = "View Entry";
						$scope.data = angular.copy(repsonse);
                        $scope.author = $scope.data.author;
                        $scope.created = $scope.data.created;
                        $scope.modified = $scope.data.modified;

                        //download files
                        var filesNames = {};
                        config.forEach(function (oneEntry) {
                            if (['audio', 'video', 'image', 'document'].indexOf(oneEntry.type) !== -1) {
                                filesNames[oneEntry.name] = {
                                    'type': oneEntry.type,
                                    'ids': $scope.data[oneEntry.name]
                                }
                            }
                        });
                        $scope.files = filesNames;

						delete $scope.data['$$hashKey'];
						delete $scope.data['_id'];
						delete $scope.data['soajsauth'];
						delete $scope.data['author'];
						delete $scope.data['created'];
						delete $scope.data['modified'];
                        for(var f in filesNames){
                            delete $scope.data[f];
                        }

                        $scope.ok = function() {
							$modalInstance.dismiss('ok');
						};
					}
				});
			}
		});
	};

	$scope.deleteCMDataEntry = function(data) {
		getSendDataFromServer($scope, ngDataApi, {
			//"url": $scope.selectedDomainAddress,
			"method": "get",
			"routeName": "/" + $scope.selectedService.name + $scope.ui.links['delete'],
			"params": {
				"id": data._id,
				"env": $scope.selectedEnv.toUpperCase()
			}
		}, function(error) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', 'Data Deleted Successfully.');
				$scope.listCMDataEntries();
			}
		});
	};

	$scope.deleteCMDataEntries = function() {
		var config = {
			//"url": $scope.selectedDomainAddress,
			"routeName": "/" + $scope.selectedService.name + $scope.ui.links['delete'],
			"params": {
				'id': '%id%',
				"env": $scope.selectedEnv.toUpperCase()
			},
			'msg': {
				'error': 'one or more of the selected Data was not deleted.',
				'success': 'Data Deleted Successfully.'
			}
		};

		multiRecordUpdate(ngDataApi, $scope, config, function() {
			$scope.listCMDataEntries();
		});
	};

    cmService.loadServices($scope);

}]);