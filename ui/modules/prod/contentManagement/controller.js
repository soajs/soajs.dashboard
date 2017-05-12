"use strict";
var contentManagementApp = soajsApp.components;
contentManagementApp.controller("ContentManagementModuleProdCtrl", ['$scope', 'ngDataApi', '$compile', '$timeout', '$modal', 'injectFiles', 'cmModuleProdService', function ($scope, ngDataApi, $compile, $timeout, $modal, injectFiles, cmModuleProdService) {
	$scope.$parent.isUserLoggedIn();
	$scope.access = {};
	$scope.selectedEnv = $scope.$parent.currentSelectedEnvironment.toUpperCase();
	
	$scope.loadUIModule = function (oneService) {
		$scope.hp = false;
		$scope.selectedService = oneService;
		
		constructModulePermissions($scope, $scope.access, {
			'listEntries': [oneService.name, '/list', 'get'],
			'addEntry': [oneService.name, '/add', 'post'],
			'updateEntry': [oneService.name, '/update', 'post'],
			'getEntry': [oneService.name, '/get', 'get'],
			'deleteEntry': [oneService.name, '/delete', 'get']
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
			"routeName": "/" + oneService.name + "/schema",
			"params": {
				"__env": $scope.selectedEnv.toUpperCase()
			}
		}, function (error, cbConfig) {
			if (error || !cbConfig) {
				$scope.$parent.displayAlert("danger", error.message);
			}
			else {
				oneService.schema = cbConfig;
				for (var apiRoute in oneService.schema.soajsService.apis) {
					if (oneService.schema.soajsService.apis.hasOwnProperty(apiRoute)) {
						var APILabel = oneService.schema.genericService.config.schema[apiRoute]._apiInfo;
						switch (oneService.schema.soajsService.apis[apiRoute].type) {
							case 'add':
								if ($scope.access.addEntry) {
									$scope.ui.add = true;
									$scope.ui.links['add'] = {
										'l': APILabel.l,
										'v': apiRoute
									};
								}
								break;
							case 'update':
								if ($scope.access.updateEntry) {
									$scope.ui.left.push({
										'label': APILabel.l,
										'icon': 'pencil2',
										'handler': 'editCMDataEntry'
									});
									$scope.ui.links['update'] = apiRoute;
								}
								break;
							case 'get':
								if ($scope.access.getEntry) {
									$scope.ui.left.push({
										'label': APILabel.l,
										'icon': 'search',
										'handler': 'viewCMDataEntry'
									});
									$scope.ui.links['get'] = apiRoute;
								}
								break;
							case 'delete':
								if ($scope.access.deleteEntry) {
									$scope.ui.left.push({
										'label': APILabel.l,
										'icon': 'cross',
										'handler': 'deleteCMDataEntry',
										'msg': translation.areYouSureWantDeleteSelectedEntry[LANG]
									});
									$scope.ui.top.push({
										'label': APILabel.l,
										'msg': translation.areYouSureWantDeleteSelectedEntryS[LANG],
										'handler': 'deleteCMDataEntries'
									});
									$scope.ui.links['delete'] = apiRoute;
								}
								break;
							case 'list':
								if ($scope.access.listEntries) {
									$scope.ui.grid = true;
									$scope.ui.links['list'] = apiRoute;
								}
								break;
						}
					}
				}
				$timeout(function () {
					$scope.populateCMUI();
				}, 1000);
			}
		});
		
	};
	
	$scope.populateCMUI = function () {
		if ($scope.ui.grid) {
			$scope.listCMDataEntries();
		}
		else {
			var el = angular.element(document.getElementById("contentGridContainer"));
			el.html("<br/><p>" + translation.youDoNotHaveAccessContentModule[LANG] + "</p>");
			$compile(el.contents())($scope);
		}
	};
	
	$scope.goBack = function () {
		var el = angular.element(document.getElementById("contentGridContainer"));
		el.html("");
		$compile(el.contents())($scope);
		
		$scope.selectedService = null;
		$scope.hp = true;
	};
	
	$scope.listCMDataEntries = function () {
		var grid = angular.copy(cmConfig.grid);
		for (var i = 0; i < $scope.selectedService.schema.soajsUI.list.columns.length; i++) {
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
				"__env": $scope.selectedEnv.toUpperCase()
			}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				for (var i = 0; i < response.length; i++) {
					var fields = Object.keys(response[i]);
					var data = {};
					fields.forEach(function (oneField) {
						if (oneField === 'fields') {
							for (var content in response[i].fields) {
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
				var el = angular.element(document.getElementById("contentGridContainer"));
				el.html("<br/><a href=\"\" ng-click=\"addCMDataEntry()\" class=\"btn btn-primary\">" + $scope.ui.links['add'].l + "</a><br/><br/><nglist></nglist>");
				$compile(el.contents())($scope);
			}
		});
	};
	
	$scope.addCMDataEntry = function () {
		var config = cmConfig.form.add;
		config.entries = $scope.selectedService.schema.soajsUI.form.add;
		
		var options = {
			timeout: $timeout,
			form: config,
			name: 'addEntry',
			label: translation.addNewEntry[LANG],
			actions: [
				{
					'type': 'submit',
					'label': translation.saveData[LANG],
					'btn': 'primary',
					'action': function (formData) {
						var casting = ['select', 'radio'];
						for (var input in formData) {
							$scope.selectedService.schema.soajsUI.form.update.forEach(function (iSchema) {
								if (iSchema.name === input) {
									if (casting.indexOf(iSchema.type) !== -1 && Array.isArray(formData[input])) {
										formData[input] = formData[input][0];
									}
								}
							});
						}
						
						var files = cmModuleProdService.extractFilesFromPostedData($scope, config, formData);
						if (files === false) {
							$scope.form.displayAlert('danger', translation.makeSureYouHaveFilledInputs[LANG]);
						}
						else {
							getSendDataFromServer($scope, ngDataApi, {
								"method": "post",
								"routeName": "/" + $scope.selectedService.name + $scope.ui.links['add'].v,
								"data": formData,
								"params": {
									"__env": $scope.selectedEnv.toUpperCase()
								}
							}, function (error, response) {
								if (error) {
									$scope.form.displayAlert('danger', error.message);
								}
								else {
									if (typeof(files) === 'object' && Object.keys(files).length > 0) {
										cmModuleProdService.UploadFile($scope, config, 'add', files, response, '/' + $scope.selectedService.name + "/upload", function (error) {
											if (error) {
												$scope.form.displayAlert('danger', error);
											}
											else {
												$scope.$parent.displayAlert('success', translation.dataAddedSuccessfully[LANG]);
												$scope.modalInstance.close();
												$scope.form.formData = {};
												$scope.listCMDataEntries();
											}
										});
									}
									else {
										$scope.$parent.displayAlert('success', translation.dataAddedSuccessfully[LANG]);
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
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						$scope.modalInstance.dismiss('cancel');
						$scope.form.formData = {};
					}
				}
			]
		};
		buildFormWithModal($scope, $modal, options);
	};
	
	$scope.editCMDataEntry = function (data) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/" + $scope.selectedService.name + $scope.ui.links['get'],
			"params": {
				"id": data._id,
				"__env": $scope.selectedEnv.toUpperCase()
			}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				var fields = Object.keys(response);
				var data = {};
				fields.forEach(function (oneField) {
					if (oneField === 'fields') {
						for (var content in response.fields) {
							data[content] = response.fields[content];
						}
					}
					else {
						data[oneField] = response[oneField];
					}
				});
				
				editAndSaveEntry(data);
			}
		});
		
		function editAndSaveEntry(data) {
			var config = cmConfig.form.update;
			config.entries = $scope.selectedService.schema.soajsUI.form.update;
			
			//combine config entries of input type files and data from gcs database
			config.entries.forEach(function (oneFormField) {
				if (['audio', 'video', 'image', 'document'].indexOf(oneFormField.type) !== -1) {
					oneFormField.removeFileUrl = "/" + $scope.selectedService.name + "/deleteFile?id=";
					oneFormField.value = [];
					if (data[oneFormField.name] && Array.isArray(data[oneFormField.name]) && data[oneFormField.name].length > 0) {
						data[oneFormField.name].forEach(function (onefileInput) {
							onefileInput.routeName = '/' + $scope.selectedService.name + "/download";
							onefileInput.headers = {
								"Accept": onefileInput.contentType
							};
							onefileInput.params = {
								'__env': $scope.selectedEnv.toUpperCase(),
								'id': onefileInput._id
							};
							oneFormField.value.push(onefileInput);
						});
					}
				}
			});
			
			var options = {
				timeout: $timeout,
				form: config,
				data: data,
				name: 'updateEntry',
				label: translation.updateEntry[LANG],
				ngDataApi: ngDataApi,
				actions: [
					{
						'type': 'submit',
						'label': translation.saveData[LANG],
						'btn': 'primary',
						'action': function (formData) {
							var casting = ['select', 'radio'];
							for (var input in formData) {
								$scope.selectedService.schema.soajsUI.form.update.forEach(function (iSchema) {
									if (iSchema.name === input) {
										if (casting.indexOf(iSchema.type) !== -1 && Array.isArray(formData[input])) {
											formData[input] = formData[input][0];
										}
									}
								});
							}
							
							var files = cmModuleProdService.extractFilesFromPostedData($scope, config, formData);
							if (files === false) {
								$scope.form.displayAlert('danger', translation.makeSureYouHaveFilledInputs[LANG]);
							}
							else {
								getSendDataFromServer($scope, ngDataApi, {
									"method": "post",
									"routeName": "/" + $scope.selectedService.name + $scope.ui.links['update'],
									"params": {
										"id": data._id,
										"__env": $scope.selectedEnv.toUpperCase()
									},
									"data": formData
								}, function (error, response) {
									if (error) {
										$scope.form.displayAlert('danger', error.message);
									}
									else {
										var hasContentToUpload = false;
										if (typeof(files) === 'object' && Object.keys(files).length > 0) {
											for (var type in files) {
												if (files[type].length > 0) {
													hasContentToUpload = true;
													break;
												}
											}
										}
										if (hasContentToUpload) {
											cmModuleProdService.UploadFile($scope, config, 'edit', files, [response], '/' + $scope.selectedService.name + "/upload", function (error) {
												if (error) {
													$scope.form.displayAlert('danger', error);
												}
												else {
													$scope.$parent.displayAlert('success', translation.dataAddedSuccessfully[LANG]);
													$scope.modalInstance.close();
													$scope.form.formData = {};
													$scope.listCMDataEntries();
												}
											});
										}
										else {
											$scope.$parent.displayAlert('success', translation.dataAddedSuccessfully[LANG]);
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
						'label': translation.cancel[LANG],
						'btn': 'danger',
						'action': function () {
							$scope.modalInstance.dismiss('cancel');
							$scope.form.formData = {};
						}
					}
				]
			};
			buildFormWithModal($scope, $modal, options);
		}
	};
	
	$scope.viewCMDataEntry = function (data) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/" + $scope.selectedService.name + $scope.ui.links['get'],
			"params": {
				"id": data._id,
				"__env": $scope.selectedEnv.toUpperCase()
			}
		}, function (error, repsonse) {
			if (error) {
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
					controller: function ($scope, $modalInstance) {
						$scope.title = translation.viewEntry[LANG];//????????????????????????
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
									'label': oneEntry.label,
									'info': $scope.data.fields[oneEntry.name]
								}
							}
						});
						if (Object.keys(filesNames).length > 0) {
							$scope.files = filesNames;
							
							for (var fName in $scope.files) {
								if ($scope.files[fName].info && $scope.files[fName].info.length > 0) {
									$scope.files[fName].info.forEach(function (oneFile) {
										var length = Math.ceil(oneFile.length / 1024);
										if (length > 1000) {
											oneFile.length = length + ' MB';
										}
										else if (length > 1) {
											oneFile.length = length + ' KB';
										}
										else {
											oneFile.length += ' bytes';
										}
									});
								}
							}
						}
						
						delete $scope.data['$$hashKey'];
						delete $scope.data['_id'];
						delete $scope.data['soajsauth'];
						delete $scope.data['author'];
						delete $scope.data['created'];
						delete $scope.data['modified'];
						for (var f in filesNames) {
							delete $scope.data.fields[f];
						}
						
						$scope.ok = function () {
							$modalInstance.dismiss('ok');
						};
						
						$scope.downloadFile = function (oneEntry, mediaType) {
							scope.downloadFile(oneEntry, mediaType);
						};
					}
				});
			}
		});
	};
	
	$scope.deleteCMDataEntry = function (data) {
		getSendDataFromServer($scope, ngDataApi, {
			//"url": $scope.selectedDomainAddress,
			"method": "get",
			"routeName": "/" + $scope.selectedService.name + $scope.ui.links['delete'],
			"params": {
				"id": data._id,
				"__env": $scope.selectedEnv.toUpperCase()
			}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', translation.dataAddedSuccessfully[LANG]);
				$scope.listCMDataEntries();
			}
		});
	};
	
	$scope.deleteCMDataEntries = function () {
		var config = {
            "method": "get",
			//"url": $scope.selectedDomainAddress,
			"routeName": "/" + $scope.selectedService.name + $scope.ui.links['delete'],
			"params": {
				'id': '%id%',
				"__env": $scope.selectedEnv.toUpperCase()
			},
			'msg': {
				'error': translation.oneOrMoreSelectedDataNotDeleted[LANG],
				'success': translation.dataAddedSuccessfully[LANG]
			}
		};
		
		multiRecordUpdate(ngDataApi, $scope, config, function () {
			$scope.listCMDataEntries();
		});
	};
	
	$scope.downloadFile = function (oneEntry, mediaType) {
		cmModuleProdService.downloadFile($scope, oneEntry, mediaType);
	};
	
	cmModuleProdService.loadServices($scope);
	injectFiles.injectCss("modules/prod/contentManagement/contentManagement.css");
}]);