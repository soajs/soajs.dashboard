"use strict";
var hacloudServices = soajsApp.components;
hacloudServices.service('hacloudSrv', ['ngDataApi', '$timeout', '$modal', '$sce', function (ngDataApi, $timeout, $modal, $sce) {
	
	/**
	 * Service Functions
	 * @param currentScope
	 * @param env
	 * @param noPopulate
	 */
	function listServices(currentScope, cb) {
		var env = currentScope.envCode.toLowerCase();
		currentScope.showCtrlHosts = true;
		currentScope.controllers = [];
		if (currentScope.access.listHosts) {
			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/cloud/services/list",
				"params": {
					"env": env
				}
			}, function (error, response) {
				if (error || !response) {
					currentScope.displayAlert('danger', translation.unableRetrieveServicesHostsInformation[LANG]);
				}
				else {
					if (response && response.length > 0) {
						currentScope.hosts = {
							'soajs': {
								"label": "SOAJS"
							},
							'nginx': {
								"label": "Nginx",
								"list": []
							},
							'elk': {
								"label": "ELK",
								"list": []
							},
							'db': {
								"label": "Clusters",
								"list": []
							},
							'miscellaneous': {
								"label": "Miscellaneous",
								"list": []
							}
						};
						
						for (var j = 0; j < response.length; j++) {
							response[j].expanded = true;
							
							var failures = 0;
							response[j].tasks.forEach(function (oneTask) {
								if (['running', 'preparing', 'pending', 'starting'].indexOf(oneTask.status.state.toLowerCase()) === -1) {
									failures++;
									oneTask.hideIt = true;
								}
							});
							
							if (failures === response[j].tasks.length) {
								response[j].hideIt = true;
							}
							
							response[j].failures = failures;
							
							if (response[j].labels && response[j].labels['soajs.content'] === 'true') {
								if (response[j].labels['soajs.service.name'] === 'controller' && !response[j].labels['soajs.service.group']) {
									response[j].labels['soajs.service.group'] = "SOAJS Core Services";
									response[j].labels['soajs.service.group'] = response[j].labels['soajs.service.group'].toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-');
								}
								if (['nginx', 'db', 'elk'].indexOf(response[j].labels['soajs.service.group']) !== -1) {
									currentScope.hosts[response[j].labels['soajs.service.group']].list.push(response[j]);
								}
								else {
									if (!currentScope.hosts.soajs.groups) {
										currentScope.hosts.soajs.groups = {};
									}
									
									response[j]['color'] = 'green';
									response[j]['healthy'] = true;
									var groupName = response[j].labels['soajs.service.group'];
									if (!currentScope.hosts.soajs.groups[groupName]) {
										currentScope.hosts.soajs.groups[groupName] = {
											expanded: true,
											list: []
										};
									}
									
									if (response[j].labels['soajs.service.name'] === 'controller') {
										currentScope.hosts.soajs.groups[groupName].list.unshift(response[j]);
										currentScope.controllers.push(response[j]);
									}
									else {
										currentScope.hosts.soajs.groups[groupName].list.push(response[j]);
									}
								}
							}
							else {
								//service is not SOAJS
								var myGroup = 'miscellaneous';
								if (response[j].labels && response[j].labels['soajs.service.group']) {
									myGroup = response[j].labels['soajs.service.group'];
								}
								currentScope.hosts[myGroup].list.push(response[j]);
							}
						}
						
						step2();
					}
					else {
						delete currentScope.hosts;
					}
				}
			});
		}
		
		function step2() {
			currentScope.controllers.forEach(function (oneController) {
				var i = 1;
				var failure = 0;
				
				oneController.tasks.forEach(function (oneCtrlTask) {
					oneCtrlTask.code = "CTRL-" + i;
					var healthy = (oneCtrlTask.status.state === 'running');
					oneCtrlTask.healthy = healthy;
					if (!healthy) {
						failure++;
					}
					
					var tooltip = "<b>Name:</b> " + oneCtrlTask.name + "<br>";
					tooltip += "<b>State:</b> " + oneCtrlTask.status.state + "<br>";
					tooltip += "<b>Started:</b> " + oneCtrlTask.status.ts;
					
					oneCtrlTask.tooltip = $sce.trustAsHtml(tooltip);
					i++;
				});
				
				if (failure === 0) {
					oneController.color = 'green';
				}
				else if (failure > 0 && failure < oneController.tasks.length) {
					oneController.color = 'yellow';
				}
				else if (failure === oneController.tasks.length) {
					oneController.color = 'red';
				}
			});
			if (cb && typeof(cb) === 'function') {
				return cb();
			}
		}
	}
	
	/**
	 * List all namespaces for kubernetes deployments and add values to scope
	 *
	 * @param {Scope Object} currentScope
	 * @param {Function} cb
	 */
	function listNamespaces(currentScope, cb) {
		if (currentScope.envPlatform !== 'kubernetes') {
			//in case of swarm deployment, set namespace value to All Namespaces and set filter value to null in order to always display all fields
			currentScope.namespaces = [currentScope.namespaceConfig.defaultValue];
			currentScope.namespaceConfig.namespace = currentScope.namespaceConfig.defaultValue.id;
			return cb();
		}
		
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/cloud/namespaces/list'
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				currentScope.namespaces = [currentScope.namespaceConfig.defaultValue];
				currentScope.namespaces = currentScope.namespaces.concat(response);
				
				currentScope.namespaceConfig.namespace = currentScope.namespaceConfig.defaultValue.id; //setting current selected to 'All Namespaces'
				
				if (cb && typeof(cb) === 'function') {
					return cb();
				}
			}
		});
	}
	
	function deleteService(currentScope, service) {
		var params = {
			env: currentScope.envCode,
			serviceId: service.id,
			mode: ((service.labels && service.labels['soajs.service.mode']) ? service.labels['soajs.service.mode'] : '')
		};
		
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'delete',
			routeName: '/dashboard/cloud/services/delete',
			params: params
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				currentScope.displayAlert('success', 'Service deleted successfully');
				currentScope.listServices();
			}
		});
	}
	
	function scaleService(currentScope, service) {
		$modal.open({
			templateUrl: "scaleService.tmpl",
			size: 'm',
			backdrop: true,
			keyboard: true,
			controller: function ($scope, $modalInstance) {
				fixBackDrop();
				
				$scope.currentScale = service.tasks.length;
				$scope.title = service.name + ' | Scale Service';
				
				$scope.onSubmit = function () {
					overlayLoading.show();
					getSendDataFromServer(currentScope, ngDataApi, {
						method: 'put',
						routeName: '/dashboard/cloud/services/scale',
						data: {
							env: currentScope.envCode,
							serviceId: service.id,
							scale: $scope.newScale
						}
					}, function (error, result) {
						overlayLoading.hide();
						$modalInstance.close();
						if (error) {
							currentScope.displayAlert('danger', error.message);
						}
						else {
							currentScope.displayAlert('success', 'Service scaled successfully! If scaling up, new instances will appear as soon as they are ready or on the next refresh');
							$timeout(function () {
								currentScope.listServices();
							}, 1500);
						}
					});
				};
				
				$scope.closeModal = function () {
					$modalInstance.close();
				};
			}
		});
	}
	
	function inspectService(currentScope, service) {
		$modal.open({
			templateUrl: "infoService.tmpl",
			size: 'm',
			backdrop: true,
			keyboard: true,
			controller: function ($scope, $modalInstance) {
				fixBackDrop();
				
				$scope.title = service.name + ' | Service Info';
				$scope.serviceInfo = service;
				
				$scope.fillAceWithInfo = function (_editor) {
					$timeout(function () {
						_editor.setValue(JSON.stringify($scope.serviceInfo, null, 2));
					}, 1000);
				};
				
				$scope.closeModal = function () {
					$modalInstance.close();
				};
			}
		});
	}
	
	function redeployService(currentScope, service) {
		var params = {
			env: currentScope.envCode,
			serviceId: service.id,
			mode: ((service.labels && service.labels['soajs.service.mode']) ? service.labels['soajs.service.mode'] : '')
		};
		
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'put',
			routeName: '/dashboard/cloud/services/redeploy',
			data: params
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				currentScope.displayAlert('success', 'Service redeployed successfully');
				currentScope.listServices();
			}
		});
	}
	
	function rebuildService(currentScope, service) {
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'post',
			routeName: '/dashboard/staticContent/list'
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				var formConfig = angular.copy(environmentsConfig.form.nginxUI);
				
				response.forEach(function (oneUIContent) {
					if (service.labels['soajs.env.code'].toLowerCase() === 'dashboard' && oneUIContent.dashUI) {
						formConfig.entries[0].value.push({
							l: oneUIContent.name,
							v: oneUIContent
						});
					}
					else if (service.labels['soajs.env.code'].toLowerCase() !== 'dashboard' && !oneUIContent.dashUI) {
						formConfig.entries[0].value.push({
							l: oneUIContent.name,
							v: oneUIContent
						});
					}
				});
				
				formConfig.entries[0].onAction = function (id, data, form) {
					overlayLoading.show();
					data = JSON.parse(data);
					getSendDataFromServer(currentScope, ngDataApi, {
						method: 'get',
						routeName: '/dashboard/gitAccounts/getBranches',
						params: {
							type: 'static',
							name: data.name
						}
					}, function (error, response) {
						overlayLoading.hide();
						if (error) {
							currentScope.displayAlert('danger', error.message);
						}
						else {
							response.branches.forEach(function (oneBranch) {
								form.entries[1].value.push({
									l: oneBranch.name,
									v: oneBranch
								});
							});
						}
					});
				};
				
				if (currentScope.envPlatform !== "kubernetes") {
					formConfig.entries.splice(3, 2);
				}
				else {
					//Display the SSL information of the nginx container
					//check if SSL is enabled
					if (service.env.indexOf("SOAJS_NX_API_HTTPS=1") !== -1 && service.env.indexOf("SOAJS_NX_API_HTTP_REDIRECT=1") !== -1
						&& service.env.indexOf("SOAJS_NX_SITE_HTTPS=1") !== -1 && service.env.indexOf("SOAJS_NX_SITE_HTTP_REDIRECT=1") !== -1) {
						formConfig.entries[2].value[0].selected = true;
						delete formConfig.entries[2].value[1].selected;
						
						formConfig.entries[3].hidden = false;
						formConfig.entries[3].value[0].selected = true;
						delete formConfig.entries[3].value[1].selected;
						//Check if the certificates are self signed or custom
						if (service.env.indexOf("SOAJS_NX_CUSTOM_SSL=1" !== -1)) {
							formConfig.entries[3].value[1].selected = true;
							delete formConfig.entries[3].value[0].selected;
							//Display the name of the kubernetes secret containing the certificates
							for (var i = 0; i < service.env.length; i++) {
								if (service.env[i].indexOf("SOAJS_NX_SSL_SECRET") !== -1) {
									formConfig.entries[4].value = service.env[i].split("=")[1];
									formConfig.entries[4].hidden = false;
									break;
								}
							}
						}
					}
					
					formConfig.entries[2].onAction = function (id, data, form) {
						if (data === "true") {
							form.entries[3].required = true;
							form.entries[3].hidden = false;
						}
						else {
							form.entries[3].required = false;
							form.entries[3].hidden = true;
							form.entries[3].value[0].selected = true;
							delete form.entries[3].value[1].selected;
							form.formData.certType = "true";
							
							form.entries[4].required = false;
							form.entries[4].hidden = true;
							form.entries[4].value = null;
							form.formData.kubeSecret = null;
						}
						
					};
					
					//Handling the possibilities of certificate type
					formConfig.entries[3].onAction = function (id, data, form) {
						if (data === "true") {
							form.entries[4].required = false;
							form.entries[4].hidden = true;
							form.formData.kubeSecret = null;
						}
						else {
							form.entries[4].required = true;
							form.entries[4].hidden = false;
						}
					};
				}
				var options = {
					timeout: $timeout,
					form: formConfig,
					name: 'rebuildService',
					label: 'Rebuild Service',
					actions: [
						{
							'type': 'submit',
							'label': translation.submit[LANG],
							'btn': 'primary',
							'action': function (formData) {
								
								var params = {
									env: currentScope.envCode,
									serviceId: service.id,
									mode: ((service.labels && service.labels['soajs.service.mode']) ? service.labels['soajs.service.mode'] : ''),
									
								};
								
								if (formData.supportSSL) {
									params.ssl = {
										"supportSSL": true
									};
									if (currentScope.envPlatform === "kubernetes" && !formData.certType && formData.kubeSecret) {
										params.ssl.kubeSecret = formData.kubeSecret;
									}
								}
								
								if (formData.branch && formData.content) {
									formData.branch = JSON.parse(formData.branch);
									formData.content = JSON.parse(formData.content);
									
									params.ui = {
										id: formData.content._id,
										branch: formData.branch.name,
										commit: formData.branch.commit.sha
									}
								}
								
								overlayLoading.show();
								getSendDataFromServer(currentScope, ngDataApi, {
									method: 'put',
									routeName: '/dashboard/cloud/services/redeploy',
									data: params
								}, function (error, response) {
									overlayLoading.hide();
									currentScope.modalInstance.dismiss();
									currentScope.form.formData = {};
									if (error) {
										currentScope.displayAlert('danger', error.message);
									}
									else {
										currentScope.displayAlert('success', 'Service rebuilt successfully');
										currentScope.listServices();
									}
								});
							}
						},
						{
							'type': 'reset',
							'label': translation.cancel[LANG],
							'btn': 'danger',
							'action': function () {
								currentScope.modalInstance.dismiss('cancel');
								currentScope.form.formData = {};
							}
						}
					]
				};
				
				buildFormWithModal(currentScope, $modal, options);
			}
		});
	}
	
	
	/**
	 * Troubleshooting and Maintenance Operations
	 * @param currentScope
	 * @param env
	 * @param oneHost
	 * @param cb
	 */
	function reloadServiceRegistry(currentScope, service) {
		//reload registry for all service instances in parallel
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "post",
			"routeName": "/dashboard/cloud/services/maintenance",
			"data": {
				"serviceId": service.id,
				"serviceName": service.labels['soajs.service.name'],
				"operation": "reloadRegistry",
				"env": currentScope.envCode,
				"type": service.labels['soajs.service.type']
			}
		}, function (error, response) {
			if (error) {
				currentScope.generateNewMsg(currentScope.envCode, 'danger', translation.errorExecutingReloadRegistryTest[LANG] + " " + service.name + " @ " + new Date().toISOString());
			}
			else {
				var formConfig = angular.copy(environmentsConfig.form.multiServiceInfo);
				response.forEach(function (oneRegistry) {
					service.tasks.forEach(function (oneTask) {
						if (oneTask.id === oneRegistry.id && oneTask.status.state === 'running') {
							formConfig.entries[0].tabs.push({
								'label': oneRegistry.id,
								'entries': [
									{
										'name': service.name,
										'type': 'jsoneditor',
										'height': '500px',
										"value": oneRegistry.response
									}
								]
							});
						}
					});
				});
				
				var options = {
					timeout: $timeout,
					form: formConfig,
					name: 'reloadRegistry',
					label: "Reloaded Registry of " + service.name,
					actions: [
						{
							'type': 'reset',
							'label': translation.ok[LANG],
							'btn': 'primary',
							'action': function (formData) {
								currentScope.modalInstance.dismiss('cancel');
								currentScope.registryInfo = [];
								currentScope.form.formData = {};
							}
						}
					]
				};
				
				buildFormWithModal(currentScope, $modal, options);
			}
		});
	}
	
	function loadServiceProvision(currentScope, service) {
		//reload provision for all service instances in parallel
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "post",
			"routeName": "/dashboard/cloud/services/maintenance",
			"data": {
				"serviceId": service.id,
				"serviceName": service.labels['soajs.service.name'],
				"operation": "loadProvision",
				"env": currentScope.envCode,
				"type": service.labels['soajs.service.type']
			}
		}, function (error, response) {
			if (error) {
				currentScope.generateNewMsg(currentScope.envCode, 'danger', "Error Executing Load Provision for: " + service.name + " @ " + new Date().toISOString());
			}
			else {
				
				var formConfig = angular.copy(environmentsConfig.form.multiServiceInfo);
				response.forEach(function (oneRegistry) {
					service.tasks.forEach(function (oneTask) {
						if (oneTask.id === oneRegistry.id && oneTask.status.state === 'running') {
							formConfig.entries[0].tabs.push({
								'label': oneRegistry.id,
								'entries': [
									{
										'name': service.name,
										'type': 'jsoneditor',
										'height': '500px',
										"value": oneRegistry.response
									}
								]
							});
						}
					});
				});
				
				var options = {
					timeout: $timeout,
					form: formConfig,
					name: 'reloadProvision',
					label: "Reloaded Provisioned Data of " + service.name,
					actions: [
						{
							'type': 'reset',
							'label': translation.ok[LANG],
							'btn': 'primary',
							'action': function (formData) {
								currentScope.modalInstance.dismiss('cancel');
								currentScope.provisionInfo = [];
								currentScope.form.formData = {};
							}
						}
					]
				};
				
				buildFormWithModal(currentScope, $modal, options);
			}
		});
	}
	
	function loadDaemonStats(currentScope, service) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "post",
			"routeName": "/dashboard/cloud/services/maintenance",
			"data": {
				"serviceId": service.id,
				"serviceName": service.labels['soajs.service.name'],
				"operation": "daemonStats",
				"env": currentScope.envCode,
				"type": service.labels['soajs.service.type']
			}
		}, function (error, response) {
			if (error) {
				currentScope.generateNewMsg(currentScope.envCode, 'danger', "Error Executing Reload Daemon Stat for: " + service.name + " @ " + new Date().toISOString());
			}
			else {
				
				var formConfig = angular.copy(environmentsConfig.form.multiServiceInfo);
				response.forEach(function (oneRegistry) {
					service.tasks.forEach(function (oneTask) {
						if (oneTask.id === oneRegistry.id && oneTask.status.state === 'running') {
							formConfig.entries[0].tabs.push({
								'label': oneRegistry.id,
								'entries': [
									{
										'name': service.name,
										'type': 'jsoneditor',
										'height': '500px',
										"value": oneRegistry.response
									}
								]
							});
						}
					});
				});
				
				var options = {
					timeout: $timeout,
					form: formConfig,
					name: 'loadDaemonStat',
					label: "Reloaded Daemon Stat for " + service.name,
					actions: [
						{
							'type': 'reset',
							'label': translation.ok[LANG],
							'btn': 'primary',
							'action': function (formData) {
								currentScope.modalInstance.dismiss('cancel');
								currentScope.provisionInfo = [];
								currentScope.form.formData = {};
							}
						}
					]
				};
				
				buildFormWithModal(currentScope, $modal, options);
			}
		});
	}
	
	function loadDaemonGroupConfig(currentScope, service) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "post",
			"routeName": "/dashboard/cloud/services/maintenance",
			"data": {
				"serviceId": service.id,
				"serviceName": service.labels['soajs.service.name'],
				"operation": "reloadDaemonConf",
				"env": currentScope.envCode,
				"type": service.labels['soajs.service.type']
			}
		}, function (error, response) {
			if (error) {
				currentScope.generateNewMsg(currentScope.envCode, 'danger', "Error Executing Reload Daemon Group Configuration for: " + service.name + " @ " + new Date().toISOString());
			}
			else {
				
				var formConfig = angular.copy(environmentsConfig.form.multiServiceInfo);
				response.forEach(function (oneRegistry) {
					service.tasks.forEach(function (oneTask) {
						if (oneTask.id === oneRegistry.id && oneTask.status.state === 'running') {
							formConfig.entries[0].tabs.push({
								'label': oneRegistry.id,
								'entries': [
									{
										'name': service.name,
										'type': 'jsoneditor',
										'height': '500px',
										"value": oneRegistry.response
									}
								]
							});
						}
					});
				});
				
				var options = {
					timeout: $timeout,
					form: formConfig,
					name: 'reloadDaemonConf',
					label: "Reloaded Daemon Group Configuration for " + service.name,
					actions: [
						{
							'type': 'reset',
							'label': translation.ok[LANG],
							'btn': 'primary',
							'action': function (formData) {
								currentScope.modalInstance.dismiss('cancel');
								currentScope.provisionInfo = [];
								currentScope.form.formData = {};
							}
						}
					]
				};
				
				buildFormWithModal(currentScope, $modal, options);
			}
		});
	}
	
	function executeHeartbeatTest(currentScope, service) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "post",
			"routeName": "/dashboard/cloud/services/maintenance",
			"data": {
				"serviceId": service.id,
				"serviceName": service.labels['soajs.service.name'],
				"operation": "heartbeat",
				"env": currentScope.envCode,
				"type": service.labels['soajs.service.type']
			}
		}, function (error, heartbeatResponse) {
			if (error) {
				service.color = 'red';
				currentScope.displayAlert('danger', translation.errorExecutingHeartbeatTest[LANG] + " " + service.name + " " + translation.onHostName[LANG] + " @ " + new Date().toISOString());
			}
			else {
				var failCount = 0;
				heartbeatResponse.forEach(function (oneHeartBeat) {
					service.tasks.forEach(function (oneServiceTask) {
						if (oneServiceTask.id === oneHeartBeat.id) {
							if (!oneHeartBeat.response.result) {
								oneServiceTask.status.state = 'Unreachable';
								
								var tooltip = "<b>Code:</b> " + oneHeartBeat.response.error.code + "<br>";
								tooltip += "<b>Errno:</b> " + oneHeartBeat.response.error.errno + "<br>";
								tooltip += "<b>Syscall:</b> " + oneHeartBeat.response.error.syscall + "<br>";
								tooltip += "<b>Address:</b> " + oneHeartBeat.response.error.address + "<br>";
								tooltip += "<b>Port:</b> " + oneHeartBeat.response.error.port + "<br>";
								
								oneServiceTask.status.error = tooltip;
								failCount++;
								
								if (service.labels['soajs.service.name'] === 'controller') {
									currentScope.controllers.forEach(function (oneController) {
										if (oneController.id === oneServiceTask.id) {
											oneController.healthy = false;
										}
									});
								}
							}
							else {
								oneServiceTask.status.state = 'running';
							}
							oneServiceTask.status.lastTs = oneHeartBeat.response.ts;
						}
					});
				});
				
				if (failCount === heartbeatResponse.length) {
					service.color = 'red';
				}
				else if (failCount > 0 && failCount < heartbeatResponse.length) {
					service.color = 'yellow';
				}
				else {
					service.color = 'green';
				}
			}
		});
	}
	
	function executeAwarenessTest(currentScope, service) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "post",
			"routeName": "/dashboard/cloud/services/maintenance",
			"data": {
				"serviceId": service.id,
				"serviceName": "controller",
				"operation": "awarenessStat",
				"env": currentScope.envCode,
				"type": "service"
			}
		}, function (error, heartbeatResponse) {
			if (error) {
				currentScope.displayAlert('danger', translation.errorExecutingHeartbeatTest[LANG] + " " + service.name + " " + translation.onHostName[LANG] + " @ " + new Date().toISOString());
			}
			else {
				currentScope.displayAlert('success', "Controller awareness has been reloaded @ " + new Date().toISOString());
			}
		});
	}
	
	function hostLogs(currentScope, task) {
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			method: "get",
			routeName: "/dashboard/cloud/services/instances/logs",
			params: {
				env: currentScope.envCode,
				serviceId: task.ref.service.id,
				taskId: task.id
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				var autoRefreshPromise;
				
				var mInstance = $modal.open({
					templateUrl: "logBox.html",
					size: 'lg',
					backdrop: true,
					keyboard: false,
					windowClass: 'large-Modal',
					controller: function ($scope, $modalInstance) {
						$scope.title = "Host Logs of " + task.name;
						$scope.data = remove_special(response.data);
						fixBackDrop();
						$timeout(function () {
							highlightMyCode()
						}, 500);
						
						$scope.refreshLogs = function () {
							getSendDataFromServer(currentScope, ngDataApi, {
								method: "get",
								routeName: "/dashboard/cloud/services/instances/logs",
								params: {
									env: currentScope.envCode,
									serviceId: task.ref.service.id,
									taskId: task.id
								}
							}, function (error, response) {
								if (error) {
									currentScope.displayAlert('danger', error.message);
								}
								else {
									$scope.data = remove_special(response.data).replace("undefined", "").toString();
									if (!$scope.$$phase) {
										$scope.$apply();
									}
									
									fixBackDrop();
									$timeout(function () {
										highlightMyCode()
									}, 500);
									
									autoRefreshPromise = $timeout(function () {
										$scope.refreshLogs();
									}, 5000);
								}
							});
						};
						
						$scope.ok = function () {
							$modalInstance.dismiss('ok');
						};
						
						$scope.refreshLogs();
					}
				});
				
				mInstance.result.then(function () {
					//Get triggers when modal is closed
					$timeout.cancel(autoRefreshPromise);
				}, function () {
					//gets triggers when modal is dismissed.
					$timeout.cancel(autoRefreshPromise);
				});
			}
		});
		
		function remove_special(str) {
			if (!str) {
				return 'No logs found for this instance'; //in case container has no logs, return message to display
			}
			var rExps = [/[\xC0-\xC2]/g, /[\xE0-\xE2]/g,
				/[\xC8-\xCA]/g, /[\xE8-\xEB]/g,
				/[\xCC-\xCE]/g, /[\xEC-\xEE]/g,
				/[\xD2-\xD4]/g, /[\xF2-\xF4]/g,
				/[\xD9-\xDB]/g, /[\xF9-\xFB]/g,
				/\xD1/, /\xF1/g,
				"/[\u00a0|\u1680|[\u2000-\u2009]|u200a|\u200b|\u2028|\u2029|\u202f|\u205f|\u3000|\xa0]/g",
				/\uFFFD/g,
				/\u000b/g, '/[\u180e|\u000c]/g',
				/\u2013/g, /\u2014/g,
				/\xa9/g, /\xae/g, /\xb7/g, /\u2018/g, /\u2019/g, /\u201c/g, /\u201d/g, /\u2026/g];
			var repChar = ['A', 'a', 'E', 'e', 'I', 'i', 'O', 'o', 'U', 'u', 'N', 'n', ' ', '', '\t', '', '-', '--', '(c)', '(r)', '*', "'", "'", '"', '"', '...'];
			for (var i = 0; i < rExps.length; i++) {
				str = str.replace(rExps[i], repChar[i]);
			}
			for (var x = 0; x < str.length; x++) {
				var charcode = str.charCodeAt(x);
				if ((charcode < 32 || charcode > 126) && charcode != 10 && charcode != 13) {
					str = str.replace(str.charAt(x), "");
				}
			}
			return str;
		}
	}
	
	/**
	 * Analytics
	 * @param currentScope
	 * @param task
	 * @param serviceName
	 * @param type
	 * @param shipper
	 */
	function metrics(currentScope, task, serviceName, type, shipper) {
		var env = currentScope.envCode.toLowerCase();
		var dashboardID = "";
		var name = serviceName;
		var logType = "Analytics";
		var filter = "";
		if (shipper && shipper === "metricbeat") {
			logType = "Metrics";
			filter = "&_a=(query:(query_string:(analyze_wildcard:!t,query:'";
			if (task && type === 'task') {
				name = task.name + "." + task.id;
				dashboardID = "Metricbeat-Docker-container";
				filter +="docker.container.name:"+ name;
			}
			else if (type = 'service') {
				dashboardID = "Metricbeat-Docker-service";
				filter +="docker.container.name:"+ serviceName + ".*";
			}
			else {
				filter += "*";
			}
			filter += "')))"
		}
		else if (task && type === 'task') {
			name = task.name;
			dashboardID = name;
			dashboardID = dashboardID.replace(/[\/*?"<>|,.-]/g, "_");
			dashboardID = shipper + "-" + dashboardID;
		}
		else if (type === 'service') {
			dashboardID = shipper + "-" + serviceName + "-" + env;
		}
		else if (type === 'env') {
			dashboardID = shipper + "-" + env;
		}
		else {
			return currentScope.displayAlert('danger', "Invalid type provided!");
		}
		var url = "http://" + window.location.hostname + ":" + currentScope.kibanaPort + "/app/kibana#/dashboard/" + dashboardID + "?embed=true&_g=(refreshInterval%3A('%24%24hashKey'%3A'object%3A242'%2Cdisplay%3A'5%20seconds'%2Cpause%3A!f%2Csection%3A1%2Cvalue%3A5000)%2Ctime%3A(from%3Anow%2Fd%2Cmode%3Aquick%2Cto%3Anow%2Fd))"+filter;
		$modal.open({
			templateUrl: "metrics.html",
			size: 'lg',
			backdrop: true,
			keyboard: true,
			windowClass: 'large-Modal',
			controller: function ($scope, $modalInstance) {
				$scope.title = logType + " of " + name;
				$scope.url = url;
				fixBackDrop();
				$scope.ok = function () {
					$modalInstance.dismiss('ok');
				};
			}
		});
	}
	
	function getSettings(currentScope) {
		var env = currentScope.envCode.toLowerCase();
		if (currentScope.access.analytics.getSettings) {
			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/analytics/getSettings",
				"params": {
					"env": env
				}
			}, function (error, response) {
				if (error || !response) {
					currentScope.displayAlert('danger', "unable to retrieve settings");
				}
				else {
					currentScope.showAnalytics = (response[env]);
					currentScope.kibanaPort = (response.kibana && response.kibana.port) ? response.kibana.port : "32601";
					currentScope.showActivateAnalytics = !(response.tracker && response.tracker.info);
				}
			});
		}
	}
	
	function activateAnalytics(currentScope) {
		var env = currentScope.envCode.toLowerCase();
		if (currentScope.access.analytics.activate) {
			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/analytics/activateAnalytics",
				"params": {
					"env": env
				}
			}, function (error) {
				if (error) {
					currentScope.displayAlert('danger', error);
				}
				else {
					currentScope.displayAlert('info', "Analytics is being Deployed, it may take some time to be ready.");
					currentScope.showActivateAnalytics = false;
				}
			});
		}
	}
	
	return {
		'listServices': listServices,
		'deleteService': deleteService,
		'listNamespaces': listNamespaces,
		'scaleService': scaleService,
		'redeployService': redeployService,
		'rebuildService': rebuildService,
		
		'executeHeartbeatTest': executeHeartbeatTest,
		'hostLogs': hostLogs,
		'reloadServiceRegistry': reloadServiceRegistry,
		'loadServiceProvision': loadServiceProvision,
		'inspectService': inspectService,
		'loadDaemonStats': loadDaemonStats,
		"loadDaemonGroupConfig": loadDaemonGroupConfig,
		"executeAwarenessTest": executeAwarenessTest,
		'metrics': metrics,
		'getSettings': getSettings,
		'activateAnalytics': activateAnalytics
	};
}]);
var hacloudServices = soajsApp.components;
