"use strict";
var servicesApp = soajsApp.components;
servicesApp.controller('servicesCtrl', ['$scope', '$timeout', '$modal', '$compile', 'ngDataApi', 'injectFiles', '$cookies', 'Upload', '$routeParams', function ($scope, $timeout, $modal, $compile, ngDataApi, injectFiles, $cookies, Upload, $routeParams) {
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
			"method": "post",
			"routeName": "/dashboard/services/list",
			"params": {
				"includeEnvs": true
			}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				var l = response.records.length;
				for (var x = 0; x < l; x++) {
					if (response.records[x].apis) {
						response.records[x].fixList = $scope.arrGroupByField(response.records[x].apis, 'group');
					}
					else {
						if (response.records[x].versions) {
							var v = $scope.sortByDescending(response.records[x].versions);
							response.records[x].latest = v[0].toString();
							response.records[x].fixList = [];
							for (var y = 0; y < v.length; y++) {
								var k = v[y].toString();
								if (response.records[x].versions[k]) {
									var listEntry = $scope.arrGroupByField(response.records[x].versions[k].apis, 'group', k);
									listEntry.settings = $scope.addServiceSettings(response.records[x].versions[k]);
									response.records[x].fixList.push(listEntry);
								}
							}
						}
					}
				}
				$scope.grid = {
					rows: response.records
				};
				$scope.envs = response.envs;
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
		var result = { groups: {} };
		var l = arr.length;
		var g = 'General';
		for (var i = 0; i < l; i++) {
			if (arr[i][f]) {
				g = arr[i][f];
			}
			if (!result.groups[g]) {
				result.groups[g] = {};
				result.groups[g].apis = [];
			}
			if (arr[i].groupMain === true) {
				result.groups[g]['defaultApi'] = arr[i].v;
			}
			result.groups[g].apis.push(arr[i]);
		}

		var label;
		for (label in result.groups) {
			if (result.groups.hasOwnProperty(label)) {
				if (result.groups[label].apis) {
					var v = result.groups[label].apis.length / 2;
					var c = Math.ceil(v);
					result.groups[label].apis1 = result.groups[label].apis.slice(0, c);
					result.groups[label].apis2 = result.groups[label].apis.slice(c, l);
				}
			}
		}
		result._ver = version;
		return result;
	};

	$scope.addServiceSettings = function (serviceVersionRecord) {
		if (serviceVersionRecord.apis) {
			delete serviceVersionRecord.apis;
		}

		return serviceVersionRecord;
	};

	$scope.updateServiceSettings = function (env, version, serviceRecord) {
		var currentScope = $scope;
		$modal.open({
			templateUrl: "updateServiceSettings.tmpl",
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function ($scope, $modalInstance) {
				fixBackDrop();

				$scope.title = 'Update ' + serviceRecord.name + ' service settings in ' + env + ' Environment';
				var versionedRecord = serviceRecord.versions[version];
				$scope.settings = {
					extKeyRequired: versionedRecord.extKeyRequired || false,
					oauth: versionedRecord.oauth ||false,
					urac: versionedRecord.urac || false,
					urac_Profile: versionedRecord.urac_Profile || false,
					urac_ACL: versionedRecord.urac_ACL || false,
					provision_ACL: versionedRecord.provision_ACL || false
				};
				if (serviceRecord.versions[version] && serviceRecord.versions[version][env]) {
					var versionEnvRecord = serviceRecord.versions[version][env];

					$scope.settings.extKeyRequired = versionEnvRecord.extKeyRequired || false;
					$scope.settings.oauth = versionEnvRecord.oauth || false;
					$scope.settings.urac = versionEnvRecord.urac || false;
					$scope.settings.urac_Profile = versionEnvRecord.urac_Profile || false;
					$scope.settings.urac_ACL = versionEnvRecord.urac_ACL || false;
					$scope.settings.provision_ACL = versionEnvRecord.provision_ACL || false;
				}
				
				$scope.onOff = function(oneSetting){
					$scope.settings[oneSetting] = !$scope.settings[oneSetting];
				};
				
				$scope.onSubmit = function () {
					overlayLoading.show();
					getSendDataFromServer($scope, ngDataApi, {
						"method": "put",
						"routeName": "/dashboard/services/settings/update",
						"params": {
							"id": serviceRecord._id.toString()
						},
						"data": {
							"env": env,
							"version": version,
							"settings": $scope.settings
						}
					}, function (error, response) {
						overlayLoading.hide();
						$modalInstance.close();
						if (error) {
							currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
						}
						else {
							currentScope.displayAlert('success', 'Service settings updated successfully');
							currentScope.listServices();
						}
					});
				};

				$scope.closeModal = function () {
					$modalInstance.close();
				};
			}
		});
	};

	//open new tab having the swagger ui to test our APIs
	$scope.swaggerTest = function (serviceName) {
		$scope.$parent.go("#/services/swaggerui/" + serviceName, "_blank");
	};

	if ($scope.access.listServices) {
		injectFiles.injectCss("modules/dashboard/services/services.css");
		$scope.listServices();
	}

}]);

servicesApp.controller('swaggerTestCtrl', ['$scope', '$routeParams', 'ngDataApi', 'injectFiles', 'swaggerParser', '$timeout', 'swaggerClient', function ($scope, $routeParams, ngDataApi, injectFiles, swaggerParser, $timeout, swaggerClient) {
	$scope.$parent.isUserLoggedIn();
	$scope.yamlContent = "";
	$scope.access = {};
	$scope.tempDisable = true;
	$scope.collapsed = false;

	constructModulePermissions($scope, $scope.access, servicesConfig.permissions);

	//read service name from route params
	$scope.serviceName = $routeParams.serviceName;

	//set the default option value of the environments drop-down menu
	$scope.environments = {
		value: "---Please choose---",
		values: ["---Please choose---"]
	};

	$scope.collapseExpand = function(){
		$scope.collapsed = !$scope.collapsed;
	};

	/*
	 * This function will get the owner, repo and the id if the service to use in other functions
	 */
	$scope.getServiceInfo = function (cb) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "post",
			"routeName": "/dashboard/services/list",
			"data": {serviceNames: [$scope.serviceName]}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				$scope.id = response.records[0]._id;
				$scope.owner = response.records[0].src.owner;
				$scope.repo = response.records[0].src.repo;

				var versions = Object.keys(response.records[0].versions);
				versions.sort();
				//loop in versions and get the latest one
				$scope.version = versions[versions.length -1];
				return cb();
			}
		});
	};

	/*
	 * This function will fill the select DDL with the environments where a service is deployed
	 */
	$scope.getEnv = function (cb) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/services/env/list",
			"params": {
				service: $scope.serviceName,
				version: $scope.version
			}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			} else {
				delete response.soajsauth;
				$scope.serviceEnvironments = response;
				Object.keys($scope.serviceEnvironments).forEach(function (oneEnv) {
					$scope.environments.values.push(oneEnv);
				});
				return cb();
			}
		});
	};

	/*
	 * This scope will save the environment selected
	 */
	$scope.selectedEnv = function () {
		if ($scope.environments.value === '---Please choose---') {
			$scope.envDomain = null;
			$scope.yamlContent = "";
			$scope.envSelected = null;
			$scope.envTenants = null;
		}
		else {
			$scope.envSelected = $scope.environments.value;
			$scope.envDomain = $scope.serviceEnvironments[$scope.envSelected].domain;
			$scope.envTenants = $scope.serviceEnvironments[$scope.envSelected].tenants;
		}

		//call fill ace editor
		fillmyEditor($scope.editor);
	};

	$scope.selectNewTenant = function(){
		var selectedTenant = $scope.selectedEnvTenant || null;
		if($scope.selectedEnvTenant){
			if(typeof($scope.selectedEnvTenant) === 'string'){
				selectedTenant = JSON.parse($scope.selectedEnvTenant);
			}
		}

		if(selectedTenant){
			watchSwaggerSimulator();
		}
	};

	//event listener that hooks ace editor to the scope and hide the print margin in the editor
	$scope.aceLoaded = function (_editor) {
		$scope.editor = _editor;
		_editor.setShowPrintMargin(false);
		_editor.$blockScrolling = Infinity;
	};

	/*
	 * This function uses the editor instance to fill the new data values
	 * Then it calls the simulator of swagger
	 */
	function fillmyEditor(_editor) {
		$scope.getYaml(function (done) {
			if (done) {
				_editor.setValue($scope.yamlContent);
			}
			else {
				_editor.setValue("");
			}

			_editor.scrollToLine(0, true, true);
			_editor.scrollPageUp();
			_editor.clearSelection();
			watchSwaggerSimulator();
		});
	}

	/*
	 * This function updates the host value of the swagger simulator
	 */
	function watchSwaggerSimulator() {
		//grab the swagger info
		var x = swaggerParser.fetch();
		if (!x || x.length === 0) {
			$timeout(function () {
				watchSwaggerSimulator();
			}, 100);
		}
		else {
			//modify the host value with the new domain
			x[3].host = $scope.envDomain;
			x[3].info.host = $scope.envDomain;

			if($scope.selectedEnvTenant){
				var selectedTenant = $scope.selectedEnvTenant;
				if(typeof($scope.selectedEnvTenant) === 'string'){
					selectedTenant = JSON.parse($scope.selectedEnvTenant);
				}
				x[3].tenantKey = selectedTenant.extKey;
				x[3].info.tenantKey = selectedTenant.extKey;
			}
			console.log("switching to new domain:", x[3].host);
			//apply the changes
			swaggerParser.execute.apply(null, x);
		}
	}

	/*
	 * This function will call the getYaml API that will return the yaml content and the url
	 * that will be inserted in $scope.url so the swagger UI will render the documentation
	 */
	$scope.getYaml = function (cb) {
		if($scope.envSelected){
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/gitAccounts/getYaml",
				"params": {
					owner: $scope.owner,
					repo: $scope.repo,
					filepath: "/swagger.yml",
					env: $scope.envSelected,
					serviceName: $scope.serviceName,
					version: $scope.version,
					type: 'service'
				}
			}, function (error, response) {
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
					return cb(false);
				} else {
					$scope.yamlContent = response.content;

					$scope.link = response.downloadLink;
					//init form for swagger UI
					$scope.isLoading = false;
					// Todo change this to $scope.downloadLink instead of the given url
					$scope.swaggerUrl = $scope.link;
					return cb(true);
				}
			});
		}
	};

	if ($scope.access.getEnv) {
		$scope.getEnv(function(){
			$scope.getServiceInfo(function(){
				$scope.tempDisable = false;
			});
		});
	}
	injectFiles.injectCss("modules/dashboard/services/services.css");
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
				oneEntry.value = angular.copy(jobData.serviceConfig[env]);
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
							"method": "put",
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
			"method": "put",
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
						"method": "put",
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
					
					if(Object.keys($scope.postData.jobs).length === 0){
						$scope.message.danger = getCodeMessage(172, 'dashboard', "Please select a job to proceed");
						return false;
					}
					
					getSendDataFromServer($scope, ngDataApi, {
						"method": "post",
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
				$scope.postData.type = grpConf.type;

				if (grpConf.cronConfig) {
					if (grpConf.cronConfig.cronTimeDate) {
						$scope.postData.cronTimeDate = grpConf.cronConfig.cronTimeDate;
					}
					else {
						$scope.postData.cronTime = grpConf.cronConfig.cronTime;
					}
					$scope.postData.timeZone = grpConf.cronConfig.timeZone;
				}
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
					
					if(Object.keys($scope.postData.jobs).length === 0){
						$scope.message.danger = getCodeMessage(172, 'dashboard', "Please select a job to proceed");
						return false;
					}
					
					getSendDataFromServer($scope, ngDataApi, {
						"method": "put",
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
			"method": "delete",
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

	$scope.refreshListing = function () {
		if ($scope.access.daemons.list && $scope.access.daemonGroupConfig.list) {
			$scope.listDaemons(function () {
				$scope.listDaemonGroupConfig();
			});
		}
	};

	if ($scope.access.daemons.list && $scope.access.daemonGroupConfig.list) {
		$scope.listDaemons(function () {
			$scope.listDaemonGroupConfig();
			injectFiles.injectCss("modules/dashboard/services/daemons.css");
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
