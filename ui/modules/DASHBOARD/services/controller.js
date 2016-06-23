"use strict";

var servicesApp = soajsApp.components;
servicesApp.controller('servicesCtrl', ['$scope', '$timeout', '$modal', '$compile', 'ngDataApi', 'injectFiles', '$cookies', 'Upload', function ($scope, $timeout, $modal, $compile, ngDataApi, injectFiles, $cookies, Upload) {
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
							var v = $scope.sortByDescending(response[x].versions);
							response[x].latest = v[0].toString();
							response[x].fixList = [];
							for (var y = 0; y < v.length; y++) {
								var k = v[y].toString();
								if (response[x].versions[k]) {
									response[x].fixList.push($scope.arrGroupByField(response[x].versions[k].apis, 'group', k));
								}
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

	$scope.sortByDescending = function (versions) {
		function compareNumbers(a, b) {
			return b - a;
		}
		var keys = Object.keys(versions);
		var keysInt = [];
		keys.forEach(function (key) {
			keysInt.push(parseInt(key));
		});
		// sort in descending order
		keysInt = keysInt.sort(compareNumbers);
		return keysInt
	};

	$scope.arrGroupByField = function (arr, f, version) {
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
		result._ver = version;
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
										extKey: oneExtKey.extKey,
										extKeyEnv: oneExtKey.env
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
				oneEntry.value = angular.copy (jobData.serviceConfig[env]);
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
						postData.config = formData.config;
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
						$scope.selectedTenants[oneTenant.extKeyEnv + '.' + oneTenant.extKey] = oneTenant;
					});
				};
				$scope.markSelectedTenants();

				$scope.filterData = function (query) {
					if (query && query !== "") {
						query = query.toLowerCase();
						var filtered = [];
						var tenants = outerScope.tenantsList;
						for (var i = 0; i < tenants.length; i++) {
							if (tenants[i].name.toLowerCase().indexOf(query) !== -1 || tenants[i].package.toLowerCase().indexOf(query) !== -1 || tenants[i].appDescription.toLowerCase().indexOf(query) !== -1 || tenants[i].extKeyEnv.toLowerCase().indexOf(query) !== -1) {
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
				response.forEach(function (entry) {
					if (entry.versions) {
						var v = returnLatestVersion(entry.versions);
						if (v) {
							entry.latest = v;
							entry.jobs = entry.versions[v].jobs;
						}
					}
				});
				$scope.grid = {
					rows: response
				};
				if (cb) {
					cb();
				}
			}
		});
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

	$scope.refreshListing = function (){
		if ($scope.access.daemons.list && $scope.access.daemonGroupConfig.list) {
			$scope.listDaemons(function () {
				$scope.listDaemonGroupConfig();
			});
		}
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
