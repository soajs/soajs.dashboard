"use strict";

var servicesApp = soajsApp.components;
servicesApp.controller('servicesCtrl', ['$scope', '$timeout', '$modal', '$compile', 'ngDataApi', 'injectFiles', '$cookieStore', 'Upload', function ($scope, $timeout, $modal, $compile, ngDataApi, injectFiles, $cookieStore, Upload) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, servicesConfig.permissions);

	$scope.showHide = function (service) {
		if (!service.hide) {
			jQuery('#s_' + service._id + " .body").slideUp();
			service.icon = 'plus';
			service.hide = true;
			jQuery('#s_' + service._id + " .header").addClass("closed");
		}
		else {
			jQuery('#s_' + service._id + " .body").slideDown();
			jQuery('#s_' + service._id + " .header").removeClass("closed");
			service.icon = 'minus';
			service.hide = false;
		}
	};

	$scope.editService = function (service) {
		var count = 0;
		var formConfig = angular.copy(servicesConfig.form.serviceEdit);

		formConfig.entries.forEach(function (oneEntry) {
			if (oneEntry.name === 'apis') {
				if (service.apis && service.apis.length > 0) {
					for (var i = 0; i < service.apis.length; i++) {
						var clone = angular.copy(servicesConfig.form.oneApi);

						clone.forEach(function (oneField) {
							oneField.name = oneField.name.replace("%count%", count);

							if (oneField.name === 'apiV' + count) {
								oneField.value = service.apis[i].v;
							}
							if (oneField.name === 'apiL' + count) {
								oneField.value = service.apis[i].l;
							}
							if (oneField.name === 'apiG' + count) {
								oneField.value = service.apis[i].group;
							}
							if (oneField.name === 'apiMain' + count) {
								oneField.value.forEach(function (oneV) {
									if (oneV.v === service.apis[i].groupMain) {
										oneV.selected = true;
									}
								});
							}
							if (oneField.type === 'html') {
								oneField.value = oneField.value.replace("%count%", count);
							}
							oneEntry.entries.push(oneField);
						});
						count++;
					}
				}
			} else if (oneEntry.name === 'source') {
				oneEntry.entries.forEach(function (oneSubEntry) {
					var property = oneSubEntry.name;
					oneSubEntry.value = service.src[property];
				});
			}
		});
		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'editService',
			label: translation.updateService[LANG],
			'data': service,
			actions: [
				{
					'type': 'button',
					'label': translation.addNewAPI[LANG],
					'btn': 'success',
					'action': function () {
						$scope.form.entries.forEach(function (oneEntry) {
							if (oneEntry.name === 'apis') {
								var clone = angular.copy(servicesConfig.form.oneApi);
								for (var i = 0; i < clone.length; i++) {
									clone[i].name = clone[i].name.replace("%count%", count);
								}
								oneEntry.entries = oneEntry.entries.concat(clone);
								count++;
							}
						});
					}
				},
				{
					'type': 'submit',
					'label': translation.submit[LANG],
					'btn': 'primary',
					'action': function (formData) {
						var postData = {
							'requestTimeout': formData.requestTimeout,
							'requestTimeoutRenewal': formData.requestTimeoutRenewal,
							'extKeyRequired': formData.extKeyRequired,
							"port": formData.port,
							"awareness": formData.awareness,
							'src': {
								type: formData.type,
								owner: formData.owner,
								repo: formData.repo,
								branch: formData.branch,
								main: formData.main
							}
						};
						if (formData.token) {
							postData.src.token = formData.token;
						}
						//var extKeyRequired;
						//if (Array.isArray(formData.extKeyRequired)) {
						//	extKeyRequired = formData.extKeyRequired[0];
						//	postData.extKeyRequired = extKeyRequired;
						//}
						//else {
						//	extKeyRequired = formData.extKeyRequired;
						//}
						//if (extKeyRequired === 'true') {
						//	postData.extKeyRequired = true;
						//} else if (extKeyRequired === 'false') {
						//	postData.extKeyRequired = false;
						//}

						var awareness;
						if (Array.isArray(formData.awareness)) {
							awareness = formData.awareness[0];
							postData.awareness = awareness;
						}
						else {
							awareness = formData.awareness;
						}
						if (awareness === 'true') {
							postData.awareness = true;
						} else if (awareness === 'false') {
							postData.awareness = false;
						}

						postData.apis = [];
						for (var i = 0; i < count; i++) {
							var tmpObj = {
								l: formData['apiL' + i],
								v: formData['apiV' + i],
								group: formData['apiG' + i],
								groupMain: (formData['apiMain' + i] && formData['apiMain' + i] === 'true')
							};
							if (!tmpObj.groupMain) {
								delete tmpObj.groupMain;
							}
							if (tmpObj.l && tmpObj.v && tmpObj.l !== '' && tmpObj.v !== '') {
								postData.apis.push(tmpObj);
							}
						}

						if (postData.apis.length === 0) {
							$timeout(function () {
								alert(translation.youNeedProvideOneAPiForService[LANG]);
							}, 10);
						}
						else {
							getSendDataFromServer($scope, ngDataApi, {
								"method": "send",
								"routeName": "/dashboard/services/update",
								"params": {"name": service.name},
								"data": postData
							}, function (error) {
								if (error) {
									$scope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
								}
								else {
									$scope.$parent.displayAlert('success', translation.serviceDataUpdatedSuccessFully[LANG]);
									$scope.modalInstance.close();
									$scope.form.formData = {};
									$scope.listServices();
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

	$scope.uploadService = function () {
		var formConfig = angular.copy(servicesConfig.form.serviceCustomAdd);
		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'addService',
			label: translation.createCustomService[LANG],
			actions: [
				{
					'type': 'submit',
					'label': translation.submit[LANG],
					'btn': 'primary',
					'action': function (formData) {
						$scope.modalInstance.close();
						var progress = {
							value: 0
						};

						var mdm = $modal.open({
							templateUrl: "serviceInfoBox.html",
							size: 'lg',
							backdrop: true,
							keyboard: true,
							controller: function ($scope, $modalInstance) {
								fixBackDrop();

								$scope.title = translation.creatingService[LANG];
								$scope.text = "<p>" + translate.UploadingServicePleaseWaitTextHtml[LANG] + "</p>";
								$scope.progress = progress;
							}
						});
						var soajsAuthCookie = $cookieStore.get('soajs_auth');
						$scope.form.uploadFileToUrl(Upload, {
							'file': formData.upload_0,
							'uploadUrl': "/dashboard/services/upload",
							'headers': {
								"soajsauth": soajsAuthCookie,
								"key": $cookieStore.get("soajs_dashboard_key")
							},
							'progress': progress
						}, function (error, response) {
							if (error) {
								$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
								mdm.close();
							}
							else {
								$scope.form.formData = {};
								mdm.close();
								$modal.open({
									templateUrl: "serviceInfoBox.html",
									size: 'lg',
									backdrop: true,
									keyboard: true,
									controller: function ($scope, $modalInstance) {
										fixBackDrop();

										$scope.title = translation.customServiceUploaded[LANG];
										$scope.text = "<p>" + translation.newServiceCreatedTextHtml[LANG] + "<br />" +
											translation.proceedEnvironmentsDeployService[LANG] + "<br /></p>";
										$scope.data = true;
										$scope.deploy = function () {
											$modalInstance.dismiss('deploy');
											window.location.href = "#/environments";
										};
										$scope.ok = function () {
											$modalInstance.dismiss('ok');
										};

									}
								});
								$scope.listServices();
							}
						});
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

	$scope.listServices = function () {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/services/list"
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				var l = response.length;
				for (var x = 0; x < l; x++) {
					if (response[x].apis) {
						response[x].fixList = $scope.arrGroupByField(response[x].apis, 'group');
					}
					else {
						if (response[x].versions) {
							var v = returnLatestVersion(response[x].versions);
							response[x].latest = v;
							if (response[x].versions[v]) {
								response[x].fixList = $scope.arrGroupByField(response[x].versions[v].apis, 'group');
							}
						}
					}
				}
				$scope.grid = {
					rows: response
				};
			}
		});
	};

	$scope.arrGroupByField = function (arr, f) {
		var result = {};
		var l = arr.length;
		var g = 'General';
		for (var i = 0; i < l; i++) {
			if (arr[i][f]) {
				g = arr[i][f];
			}
			if (!result[g]) {
				result[g] = {};
				result[g].apis = [];
			}
			if (arr[i].groupMain === true) {
				result[g]['defaultApi'] = arr[i].v;
			}
			result[g].apis.push(arr[i]);
		}

		var label;
		for (label in result) {
			if (result.hasOwnProperty(label)) {
				if (result[label].apis) {
					var v = result[label].apis.length / 2;
					var c = Math.ceil(v);
					result[label].apis1 = result[label].apis.slice(0, c);
					result[label].apis2 = result[label].apis.slice(c, l);
				}
			}
		}
		return result;
	};

	if ($scope.access.listServices) {
		injectFiles.injectCss("modules/DASHBOARD/services/services.css");
		$scope.listServices();
	}

}]);

servicesApp.controller('daemonsCtrl', ['$scope', 'ngDataApi', '$timeout', '$modal', 'injectFiles', function ($scope, ngDataApi, $timeout, $modal, injectFiles) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, servicesConfig.permissions);

	$scope.showHide = function (entry) {
		entry.hide = entry.hide ? false : true;
	};

	$scope.getTenants = function (cb) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/tenant/list"
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.tenantsList = [];
				response.forEach(function (oneTenant) {
					oneTenant.applications.forEach(function (oneApp) {
						oneApp.keys.forEach(function (oneKey) {
							oneKey.extKeys.forEach(function (oneExtKey) {
								if (oneExtKey.extKey && oneExtKey.extKey !== "") {
									$scope.tenantsList.push({
										code: oneTenant.code,
										name: oneTenant.name,
										appDescription: oneApp.description,
										package: oneApp.package,
										extKey: oneExtKey.extKey
									});
								}
							});
						});
					});
				});
				$scope.filteredTenantsList = angular.copy($scope.tenantsList); //used for search
				if (cb) cb();
			}
		});
	};

	$scope.getEnvironments = function (cb) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment/list"
		}, function (error, response) {
			if (error) {
				$scope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.environmentsList = [];
				response.forEach(function (oneEnv) {
					$scope.environmentsList.push(oneEnv.code);
				});

				if (cb) cb();
			}
		});
	};

	$scope.reloadServiceConfig = function (groupId, jobName) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/daemons/groupConfig/serviceConfig/list",
			"params": {id: groupId, jobName: jobName}
		}, function (error, response) {
			if (error) {
				$scope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.groupConfigs.rows.forEach(function (oneGroup) {
					if (oneGroup._id === groupId) {
						for (var job in oneGroup.jobs) {
							if (job === jobName) {
								oneGroup.jobs[job].serviceConfig = response;
							}
						}
					}
				});
			}
		});
	};

	$scope.updateConfiguration = function (env, jobName, jobData, groupId) {
		var formConfig = angular.copy(servicesConfig.form.jobServiceConfig);
		formConfig.entries.forEach(function (oneEntry) {
			if (oneEntry.name === "env") {
				oneEntry.value = env;
			} else if (oneEntry.name === "config") {
				oneEntry.value = JSON.stringify(jobData.serviceConfig[env], null, 2);
			}
		});

		var options = {
			timeout: $timeout,
			form: formConfig,
			name: "updateServiceConfig",
			label: translation.updateServiceConfiguration[LANG],
			actions: [
				{
					'type': 'submit',
					'label': translation.save[LANG],
					'btn': 'primary',
					'action': function (formData) {
						var postData = {};
						postData.env = env;
						postData.config = JSON.parse(formData.config);
						getSendDataFromServer($scope, ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/daemons/groupConfig/serviceConfig/update",
							"params": {"id": groupId, jobName: jobName},
							"data": postData
						}, function (error) {
							if (error) {
								$scope.displayAlert('danger', error.code, true, 'dashboard', error.message);
							} else {
								$scope.$parent.displayAlert("success", translation.serviceConfigurationUpdatedSuccessfully[LANG]);
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.reloadServiceConfig(groupId, jobName);
							}
						});
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

	$scope.clearConfiguration = function (env, jobName, jobData, groupId) {
		var postData = {
			env: env,
			config: {}
		};
		getSendDataFromServer($scope, ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/daemons/groupConfig/serviceConfig/update",
			"params": {"id": groupId, jobName: jobName},
			"data": postData
		}, function (error) {
			if (error) {
				$scope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.displayAlert('success', translation.serviceConfigurationClearedSuccessfully[LANG]);
				$scope.reloadServiceConfig(groupId, jobName);
			}
		});
	};

	$scope.selectTenantExternalKeys = function (grpConf, jobName) { //groupId, jobName
		var outerScope = $scope;
		$modal.open({
			templateUrl: "selectTenantExtKeys.tmpl",
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function ($scope, $modalInstance) {
				fixBackDrop();

				$scope.outerScope = outerScope;
				$scope.title = translation.selectTenantExternalKeys[LANG];
				$scope.message = {}; //used to display errors inside modal
				$scope.tenantSearch = ""; //used to search tenants
				$scope.selectedTenants = {};
				$scope.postData = {
					tenantExtKeys: [],
					tenantsInfo: []
				};

				$scope.markSelectedTenants = function () {
					grpConf.jobs[jobName].tenantsInfo.forEach(function (oneTenant) {
						$scope.selectedTenants[oneTenant.extKey] = oneTenant;
					});
				};
				$scope.markSelectedTenants();

				$scope.filterData = function (query) {
					if (query && query !== "") {
						query = query.toLowerCase();
						var filtered = [];
						var tenants = outerScope.tenantsList;
						for (var i = 0; i < tenants.length; i++) {
							if (tenants[i].name.toLowerCase().indexOf(query) !== -1 || tenants[i].package.toLowerCase().indexOf(query) !== -1 || tenants[i].appDescription.toLowerCase().indexOf(query) !== -1) {
								filtered.push(tenants[i]);
							}
						}
						outerScope.filteredTenantsList = filtered;
					} else {
						if (outerScope.tenantsList && outerScope.filteredTenantsList) {
							outerScope.filteredTenantsList = outerScope.tenantsList;
						}
					}
				};

				$scope.onSubmit = function () {
					for (var i in $scope.selectedTenants) {
						if ($scope.selectedTenants[i]) {
							$scope.postData.tenantsInfo.push($scope.selectedTenants[i]);
							$scope.postData.tenantExtKeys.push($scope.selectedTenants[i].extKey);
						}
					}
					getSendDataFromServer($scope, ngDataApi, {
						"method": "send",
						"routeName": "/dashboard/daemons/groupConfig/tenantExtKeys/update",
						"params": {id: grpConf._id, jobName: jobName},
						"data": $scope.postData
					}, function (error) {
						if (error) {
							$scope.message.danger = getCodeMessage(error.code, 'dashboard', error.message);
							$timeout(function () {
								$scope.message.danger = "";
							}, 5000);
						} else {
							outerScope.displayAlert('success', translation.listTenantExternalKeysUpdatedSuccessfully[LANG]);
							$modalInstance.close();
							outerScope.listTenantExtKeys(grpConf, jobName);
						}
					})
				};

				$scope.closeModal = function () {
					$modalInstance.close();
				};
			}
		});
	};

	$scope.listTenantExtKeys = function (grpConf, jobName) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/daemons/groupConfig/tenantExtKeys/list",
			"params": {id: grpConf._id, jobName: jobName}
		}, function (error, response) {
			if (error) {
				$scope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.groupConfigs.rows.forEach(function (oneGroup) {
					if (oneGroup._id === grpConf._id) {
						oneGroup.jobs[jobName].tenantsInfo = response;
					}
				});
			}
		});
	};

	$scope.listDaemons = function (cb) {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/daemons/list"
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				$scope.grid = {
					rows: response
				};
				if (cb) cb();
			}
		});
	};

	$scope.updateDaemon = function (daemon) {
		var formConfig = angular.copy(servicesConfig.form.daemon);
		formConfig.entries.forEach(function (oneEntry) {
			if (oneEntry.name === "daemonName") {
				oneEntry.value = daemon.name;
			} else if (oneEntry.name === "daemonPort") {
				oneEntry.value = daemon.port;
			}
		});

		var count = 0;
		if (daemon.jobs && Object.keys(daemon.jobs).length > 0) {
			var jobsArr = Object.keys(daemon.jobs);
			for (var i = 0; i < jobsArr.length; i++) {
				var clone = angular.copy(servicesConfig.form.oneJob);

				clone.forEach(function (oneJob) {
					if (oneJob.name === "job%count%") {
						oneJob.name = oneJob.name.replace("%count%", count);
						oneJob.value = jobsArr[i];
					}
					if (oneJob.name === "removeJob%count%") {
						oneJob.name = oneJob.name.replace("%count%", count);
					}

					formConfig.entries[2].entries.push(oneJob);
				});
				count++;
			}
		}
		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'editDaemon',
			label: translation.updateDaemon[LANG],
			'data': daemon,
			actions: [
				{
					'type': 'button',
					'label': translation.addJob[LANG],
					'btn': 'success',
					'action': function () {
						$scope.form.entries.forEach(function (oneEntry) {
							if (oneEntry.name === 'jobs') {
								var clone = angular.copy(servicesConfig.form.oneJob);
								for (var i = 0; i < clone.length; i++) {
									clone[i].name = clone[i].name.replace("%count%", count);
								}
								oneEntry.entries = oneEntry.entries.concat(clone);
								count++;
							}
						});
					}
				},
				{
					'type': 'submit',
					'label': translation.submit[LANG],
					'btn': 'primary',
					'action': function (formData) {
						var postData = {};
						postData.name = formData.name;
						postData.port = formData.port;
						postData.jobs = {};

						for (var i = 0; i < count; i++) {
							var job = formData["job" + i];
							if (job) {
								postData.jobs[job] = {};
							}
						}
						getSendDataFromServer($scope, ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/daemons/update",
							"params": {"id": daemon._id},
							"data": postData
						}, function (error) {
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', translation.daemonDataUpdatedSuccessfully[LANG]);
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listDaemons();
							}
						});
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

	$scope.deleteDaemon = function (daemon) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/daemons/delete",
			"params": {
				"id": daemon._id
			}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', translation.daemonDeletedSuccessfully[LANG]);
				$scope.listDaemons(function () {
					$scope.listDaemonGroupConfig();
				});
			}
		});
	};

	$scope.addDaemon = function () {
		var count = 0;

		//Adding the initial Job Name text field
		var formConfig = angular.copy(servicesConfig.form.daemon);
		formConfig.entries.forEach(function (oneEntry) {
			if (oneEntry.name === "jobs") {
				var clone = angular.copy(servicesConfig.form.oneJob);
				for (var i = 0; i < clone.length; i++) {
					clone[i].name = clone[i].name.replace("%count%", count);
				}
				oneEntry.entries = oneEntry.entries.concat(clone);
				count++;
			}
		});

		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'addDaemon',
			label: translation.addDaemon[LANG],
			actions: [
				{
					'type': 'button',
					'label': translation.addJob[LANG],
					'btn': 'success',
					'action': function () {
						$scope.form.entries.forEach(function (oneEntry) {
							if (oneEntry.name === 'jobs') {
								var clone = angular.copy(servicesConfig.form.oneJob);
								for (var i = 0; i < clone.length; i++) {
									clone[i].name = clone[i].name.replace("%count%", count);
								}
								oneEntry.entries = oneEntry.entries.concat(clone);
								count++;
							}
						});
					}
				},
				{
					'type': 'submit',
					'label': translation.submit[LANG],
					'btn': 'primary',
					'action': function (formData) {
						var postData = {};
						postData.name = formData.name;
						postData.port = formData.port;
						postData.jobs = {};

						for (var i = 0; i < count; i++) {
							var job = formData["job" + i];
							if (job) {
								postData.jobs[job] = {};
							}
						}
						getSendDataFromServer($scope, ngDataApi, {
							"method": "send",
							"routeName": "/dashboard/daemons/add",
							"data": postData
						}, function (error) {
							if (error) {
								$scope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
							}
							else {
								$scope.$parent.displayAlert('success', translation.daemonAddedSuccessfully[LANG]);
								$scope.modalInstance.close();
								$scope.form.formData = {};
								$scope.listDaemons();
							}
						});
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

	$scope.listDaemonGroupConfig = function (cb) {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/daemons/groupConfig/list"
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				$scope.groupConfigs = {
					rows: response
				};
				if (cb) cb();
			}
		});
	};

	$scope.addDaemonGroupConfig = function () {
		var outerScope = $scope;
		$modal.open({
			templateUrl: "addEditGroup.tmpl",
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function ($scope, $modalInstance) {
				fixBackDrop();

				$scope.outerScope = outerScope;
				$scope.postData = {};
				$scope.message = {}; //used to display errors inside modal
				$scope.title = translation.addDaemonGroupConfiguration[LANG];

				//Default values
				$scope.postData.status = "1";
				$scope.postData.solo = "true";

				$scope.checkIfOnlyJob = function (jobName) {
					if ($scope.daemonJobsList && Object.keys($scope.daemonJobsList).length === 1) {
						$scope.selectedJobs[jobName]['order'] = 1;
					}
				};

				$scope.selectDaemon = function (daemon) {
					$scope.postData.daemon = daemon.name;
					$scope.daemonJobsList = daemon.jobs;
					$scope.selectedJobs = {};
				};

				$scope.generateOrderArray = function () {
					if ($scope.postData.processing === "sequential" && Object.keys($scope.selectedJobs).length > 0) {
						var order = [];
						//collecting selected jobs
						for (var oneJob in $scope.selectedJobs) {
							if ($scope.selectedJobs[oneJob]['isSelected']) {
								order.push({name: oneJob, order: $scope.selectedJobs[oneJob].order});
							}
						}
						//sorting jobs based on order
						order = order.sort(function (a, b) {
							if (a.order > b.order) return 1;
							if (a.order < b.order) return -1;
							return 0;
						});
						//removing order and keeping jobs' names only
						for (var i = 0; i < order.length; i++) {
							order[i] = order[i].name;
						}

						$scope.postData.order = order;
					} else if ($scope.postData.processing === "parallel") {
						$scope.postData.order = [];
					}
				};

				$scope.getSelectedJobs = function () {
					$scope.postData.jobs = {};
					for (var oneJob in $scope.selectedJobs) {
						if ($scope.selectedJobs[oneJob]['isSelected']) {
							$scope.postData.jobs[oneJob] = {
								type: $scope.selectedJobs[oneJob]['type'],
								serviceConfig: {},
								tenantExtKeys: [],
								tenantsInfo: []
							};
						}
					}
				};

				$scope.onSubmit = function () {
					$scope.generateOrderArray();
					$scope.getSelectedJobs();
					$scope.postData.status = parseInt($scope.postData.status);

					if ($scope.postData.solo === "true") $scope.postData.solo = true;
					else $scope.postData.solo = false;

					getSendDataFromServer($scope, ngDataApi, {
						"method": "send",
						"routeName": "/dashboard/daemons/groupConfig/add",
						"data": $scope.postData
					}, function (error) {
						if (error) {
							$scope.message.danger = getCodeMessage(error.code, 'dashboard', error.message);
							$timeout(function () {
								$scope.message.danger = "";
							}, 5000);
						} else {
							outerScope.$parent.displayAlert('success', translation.daemonGroupAddedSuccessfully[LANG]);
							$modalInstance.close();
							outerScope.listDaemonGroupConfig();
						}
					});
				};

				$scope.closeModal = function () {
					$modalInstance.close();
				};
			}
		});
	};

	$scope.updateDaemonGroupConfig = function (grpConf) {
		var outerScope = $scope;
		$modal.open({
			templateUrl: "addEditGroup.tmpl",
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function ($scope, $modalInstance) {
				fixBackDrop();

				$scope.outerScope = outerScope;
				$scope.postData = {};
				$scope.message = {}; //used to display errors inside modal
				$scope.originalDaemon = grpConf.daemon; //used to detect if user changed daemon
				$scope.title = translation.editDaemonGroupConfiguration[LANG];

				$scope.postData.groupName = grpConf.daemonConfigGroup;
				$scope.postData.interval = grpConf.interval;
				$scope.postData.status = grpConf.status.toString();
				$scope.postData.processing = grpConf.processing;

				//conversion from boolean to string is done for display purposes only
				if (grpConf.solo) $scope.postData.solo = "true";
				else $scope.postData.solo = "false";

				$scope.checkIfOnlyJob = function (jobName) {
					if ($scope.daemonJobsList && Object.keys($scope.daemonJobsList).length === 1) {
						$scope.selectedJobs[jobName]['order'] = 1;
					}
				};

				$scope.fetchSelectedDaemon = function () {
					for (var i = 0; i < outerScope.grid.rows.length; i++) {
						if (outerScope.grid.rows[i].name === grpConf.daemon) {
							$scope.daemon = outerScope.grid.rows[i];
							$scope.postData.daemon = $scope.daemon.name;
							$scope.daemonJobsList = $scope.daemon.jobs;
							break;
						}
					}
				};
				$scope.fetchSelectedDaemon();

				$scope.markSelectedJobs = function () {
					$scope.selectedJobs = {};
					if ($scope.postData.processing === "sequential") {
						for (var oneJob in $scope.daemonJobsList) {
							if (Object.keys(grpConf.jobs).indexOf(oneJob) > -1) {
								$scope.selectedJobs[oneJob] = {
									'isSelected': true,
									'order': grpConf.order.indexOf(oneJob) + 1,
									'type': grpConf.jobs[oneJob].type
								};
							}
						}
					} else {
						for (var oneJob in $scope.daemonJobsList) {
							if (Object.keys(grpConf.jobs).indexOf(oneJob) > -1) {
								$scope.selectedJobs[oneJob] = {
									'isSelected': true,
									'type': grpConf.jobs[oneJob].type
								};
							}
						}
					}

				};
				$scope.markSelectedJobs();

				$scope.selectDaemon = function (daemon) {
					$scope.postData.daemon = daemon.name;
					$scope.daemonJobsList = daemon.jobs;
					$scope.selectedJobs = {};
				};

				$scope.generateOrderArray = function () {
					if ($scope.postData.processing === "sequential" && Object.keys($scope.selectedJobs).length > 0) {
						var order = [];
						//collecting selected jobs
						for (var oneJob in $scope.selectedJobs) {
							if ($scope.selectedJobs[oneJob]['isSelected']) {
								order.push({name: oneJob, order: $scope.selectedJobs[oneJob].order});
							}
						}
						//sorting jobs based on order
						order = order.sort(function (a, b) {
							if (a.order > b.order) return 1;
							if (a.order < b.order) return -1;
							return 0;
						});
						//removing order and keeping jobs' names only
						for (var i = 0; i < order.length; i++) {
							order[i] = order[i].name;
						}

						$scope.postData.order = order;
					} else if ($scope.postData.processing === "parallel") {
						$scope.postData.order = [];
					}
				};

				$scope.getSelectedJobs = function () {
					$scope.postData.jobs = {};
					for (var oneJob in $scope.selectedJobs) {
						if ($scope.selectedJobs[oneJob]['isSelected']) {
							if ($scope.postData.daemon === $scope.originalDaemon && grpConf.jobs[oneJob] && grpConf.jobs[oneJob].type === $scope.selectedJobs[oneJob].type) {
								//type of this job did not change, clone serviceConfig, tenantExtKeys, and tenantsInfo
								$scope.postData.jobs[oneJob] = {
									type: $scope.selectedJobs[oneJob]['type'],
									serviceConfig: grpConf.jobs[oneJob].serviceConfig,
									tenantExtKeys: grpConf.jobs[oneJob].tenantExtKeys,
									tenantsInfo: grpConf.jobs[oneJob].tenantsInfo
								};
							} else {
								//type of this job changed, reset serviceConfig, tenantExtKeys, and tenantsInfo
								$scope.postData.jobs[oneJob] = {
									type: $scope.selectedJobs[oneJob]['type'],
									serviceConfig: {},
									tenantExtKeys: [],
									tenantsInfo: []
								};
							}
						}
					}
				};

				$scope.onSubmit = function () {
					$scope.generateOrderArray();
					$scope.getSelectedJobs();
					$scope.postData.status = parseInt($scope.postData.status);
					if ($scope.postData.solo === "true") $scope.postData.solo = true;
					else $scope.postData.solo = false;
					getSendDataFromServer($scope, ngDataApi, {
						"method": "send",
						"routeName": "/dashboard/daemons/groupConfig/update",
						"params": {"id": grpConf._id},
						"data": $scope.postData
					}, function (error) {
						if (error) {
							$scope.message.danger = getCodeMessage(error.code, 'dashboard', error.message);
							$timeout(function () {
								$scope.message.danger = "";
							}, 5000);
						} else {
							outerScope.$parent.displayAlert('success', translation.daemonGroupUpdatedSuccessfully[LANG]);
							$modalInstance.close();
							outerScope.listDaemonGroupConfig();
						}
					});
				};

				$scope.closeModal = function () {
					$modalInstance.close();
				};
			}
		});
	};

	$scope.deleteDaemonGroupConfig = function (grpConf) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/daemons/groupConfig/delete",
			"params": {
				"id": grpConf._id
			}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				$scope.$parent.displayAlert('success', translation.daemonGroupConfigurationDeletedSuccessfully[LANG]);
				$scope.listDaemonGroupConfig();
			}
		});
	};

	if ($scope.access.daemons.list && $scope.access.daemonGroupConfig.list) {
		$scope.listDaemons(function () {
			$scope.listDaemonGroupConfig();
			injectFiles.injectCss("modules/DASHBOARD/services/daemons.css");
			if ($scope.access.tenants.list && $scope.access.environments.list) {
				$scope.getTenants(function () {
					$scope.getEnvironments();
				});
			}
		});
	}
}]);

servicesApp.filter('timeInMillisConverter', function () {
	return function (time) {
		var convert = {
			"msecToSec": {"unit": "sec", "divideBy": 1000},
			"secToMin": {"unit": "min", "divideBy": 60},
			"minToH": {"unit": "h", "divideBy": 60},
			"hToDays": {"unit": "days", "divideBy": 24},
			"daysToWeeks": {"unit": "weeks", "divideBy": 7},
			"weeksToMonths": {"unit": "months", "divideBy": 4.34825},
			"monthsToYears": {"unit": "years", "divideBy": 12}
		};
		var unit = "msec";
		for (var i in convert) {
			if (Math.floor(time / convert[i].divideBy) > 1) {
				time = time / convert[i].divideBy;
				unit = convert[i].unit;
			} else {
				return time.toFixed(2) + " " + unit;
			}
		}
		return time.toFixed(2) + " " + unit;
	};
});

servicesApp.filter('statusDisplay', function () {
	return function (status) {
		if (status === 1) {
			return "Active";
		} else if (status === 0) {
			return "Inactive";
		}

		return "Unknown";
	};
});