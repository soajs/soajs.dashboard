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
		currentScope.soajsServices = false;
        currentScope.controllers =[];
		if (currentScope.access.hacloud.services.list) {
			getUpdatesNotifications(function(){
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
                            currentScope.rawServicesResponse = angular.copy(response);
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

								for(var u=0; u < currentScope.updatesNotifications.length; u++){
									if(response[j].id === currentScope.updatesNotifications[u].id){
										switch (currentScope.updatesNotifications[u].mode) {
											case 'image':
												response[j].imageUpdate = true;
												break;
											case 'rebuild':
												response[j].catalogUpdate = true;
												if (currentScope.updatesNotifications[u].repo) {
													response[j].codeUpdate = true;
												}
												break;
											default:
												response[j].codeUpdate = true;
												break;
										}
									}
								}

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

								if(response[j].labels && response[j].labels['soajs.content'] === 'true'){
									currentScope.soajsServices = true;
									if(response[j].labels['soajs.service.name'] === 'controller' && !response[j].labels['soajs.service.group']){
										response[j].labels['soajs.service.group'] = "SOAJS Core Services";
										response[j].labels['soajs.service.group'] = response[j].labels['soajs.service.group'].toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-');
									}
									if(['nginx', 'db', 'elk'].indexOf(response[j].labels['soajs.service.group']) !== -1){
										currentScope.hosts[response[j].labels['soajs.service.group']].list.push(response[j]);
									}
									else{
										currentScope.envDeployed = true;
										if(!currentScope.hosts.soajs.groups){
											currentScope.hosts.soajs.groups = {};
										}

										//check if daemon and get group config name from env variables
										if (response[j].labels && response[j].labels['soajs.service.type'] === 'daemon' && response[j].labels['soajs.daemon.group']) {
											response[j].daemonGroup = '';
											for (var k = 0; k < response[j].env.length; k++) {
												if (response[j].env[k].split("=")[0] === 'SOAJS_DAEMON_GRP_CONF') {
													response[j].daemonGroup = response[j].env[k].split("=")[1];
												}
											}
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

										if(response[j].labels['soajs.service.name'] === 'controller'){
											currentScope.hosts.soajs.groups[groupName].list.unshift(response[j]);
											currentScope.controllers.push(response[j]);
										}
										else{
											currentScope.hosts.soajs.groups[groupName].list.push(response[j]);
										}
									}
								}
								else{
									//service is not SOAJS
									var myGroup = 'miscellaneous';
									if(response[j].labels && response[j].labels['soajs.service.group']){
										myGroup = response[j].labels['soajs.service.group'];
									}
									currentScope.hosts[myGroup].list.push(response[j]);
								}
							}

							if (!currentScope.hosts.soajs.groups || Object.keys(currentScope.hosts.soajs.groups).length === 0) {
								currentScope.envDeployed = false;
							}

							step2();
						}
						else{
							delete currentScope.hosts;
						}
					}
				});
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
				else if (failure === oneController.tasks.length) {
					oneController.color = 'red';
				}
			});
			if(cb && typeof cb === 'function'){
				return cb();
			}
		}

		function getUpdatesNotifications(cb){
			//check for code updates
			getSendDataFromServer(currentScope, ngDataApi, {
				method: 'get',
				routeName: '/dashboard/cd/ledger',
				params: {
					"env": env
				}
			}, function (error, response) {
				if (error) {
					currentScope.displayAlert('danger', error.message);
				}
				else {
					currentScope.updatesNotifications = [];
					response.forEach(function(oneCodeUpdateEntry){
						if(oneCodeUpdateEntry.notify && !oneCodeUpdateEntry.manual){
							currentScope.updatesNotifications.push({
								id: oneCodeUpdateEntry.serviceId
							})
						}
					});

					//check for image or catalog recipe updates
					getSendDataFromServer(currentScope, ngDataApi, {
						method: 'get',
						routeName: '/dashboard/cd/updates',
						params: {
							"env": env
						}
					}, function (error, response) {
						if (error) {
							currentScope.displayAlert('danger', error.message);
						}
						else {
							response.forEach(function(oneUpdateEntry){
								currentScope.updatesNotifications.push({
									id: oneUpdateEntry.id,
									mode: oneUpdateEntry.mode
								})
							});
							return cb();
						}
					});
				}
			});
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

	function deleteService(currentScope, service, groupName) {
		if (groupName && (groupName === 'soajs' || groupName === 'nginx') && currentScope.envCode.toLowerCase() === 'dashboard') {
			return;
		}

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

	function scaleService(currentScope, service, groupName) {
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

					if (groupName && (groupName === 'soajs' || groupName === 'nginx') && currentScope.envCode.toLowerCase() === 'dashboard') {
						if ($scope.newScale < 1) {
							overlayLoading.hide();
							$scope.message = {
								danger: 'The minimum allowed scale for SOAJS services deployed in DASHBOARD environment is 1.'
							};
							return;
						}
					}
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
			mode: ((service.labels && service.labels['soajs.service.mode']) ? service.labels['soajs.service.mode'] : ''),
			action: 'redeploy'
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
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/catalog/recipes/get',
			params: {
				'id': service.labels['soajs.catalog.id']
			}
		}, function (error, catalogRecipe) {
			if(error){
				currentScope.displayAlert('danger', error.message);
			}
			else{
				var formConfig = {
					entries: []
				};

				if(catalogRecipe.recipe.deployOptions.image.override){
					//append images
					formConfig.entries.push({
						'name': "ImagePrefix",
						'label': "Image Prefix",
						'type': 'text',
						'value': catalogRecipe.recipe.deployOptions.image.prefix,
						'fieldMsg': "Override the image prefix if you want"
					});

					formConfig.entries.push({
						'name': "ImageName",
						'label': "Image Name",
						'type': 'text',
						'value': catalogRecipe.recipe.deployOptions.image.name,
						'fieldMsg': "Override the image name if you want"
					});

					formConfig.entries.push({
						'name': "ImageTag",
						'label': "Image Tag",
						'type': 'text',
						'value': catalogRecipe.recipe.deployOptions.image.tag,
						'fieldMsg': "Override the image tag if you want"
					});
				}

				//append inputs whose type is userInput
				for(var envVariable in catalogRecipe.recipe.buildOptions.env){
					if(catalogRecipe.recipe.buildOptions.env[envVariable].type === 'userInput'){

						var defaultValue = catalogRecipe.recipe.buildOptions.env[envVariable].default || '';
						//todo: get value from service.env
						service.env.forEach(function(oneEnv){
							if(oneEnv.indexOf(envVariable) !== -1){
								defaultValue = oneEnv.split("=")[1];
							}
						});
						//push a new input for this variable
						var newInput = {
							'name': '_ci_' + envVariable,
							'label': catalogRecipe.recipe.buildOptions.env[envVariable].label || envVariable,
							'type': 'text',
							'value': defaultValue,
							'fieldMsg': catalogRecipe.recipe.buildOptions.env[envVariable].fieldMsg
						};

						//if no default value is set, the user input field is required
						if(!defaultValue || defaultValue === ''){
							newInput.required = true;
						}

						//if the default value is ***, clear the value and set the field as required
						//this is applicable for tokens whose values are masked by *
						if (newInput.value.match(/^\*+$/g)) {
							newInput.value = '';
							newInput.required = true;
						}

						formConfig.entries.push(newInput);
					}
				}

				if(formConfig.entries.length === 0){
					doRebuild(null);
				}
				else{
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
									doRebuild(formData);
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
			}
		});

		function doRebuild(formData){
			var params = {
				env: currentScope.envCode,
				serviceId: service.id,
				mode: ((service.labels && service.labels['soajs.service.mode']) ? service.labels['soajs.service.mode'] : ''),
				action: 'rebuild'
			};

			if(formData && Object.keys(formData).length > 0){
				//inject user input catalog entry and image override
				params.custom = {
					image: {
						name: formData['ImageName'],
						prefix: formData['ImagePrefix'],
						tag: formData['ImageTag']
					}
				};

				for( var input in formData){
					if(input.indexOf('_ci_') !== -1){
						if(!params.custom.env){
							params.custom.env = {};
						}
						params.custom.env[input.replace('_ci_', '')] = formData[input];
					}
				}
			}

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
					currentScope.displayAlert('success', 'Service rebuilt successfully');
					currentScope.listServices();
					overlayLoading.hide();
					if(currentScope.modalInstance){
						currentScope.modalInstance.dismiss();
					}
				}
			});
		}
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
				/\xa9/g, /\xae/g, /\xb7/g, /\u2018/g, /\u2019/g, /\u201c/g, /\u201d/g, /\u2026/g,
				/</g, />/g
			];
			var repChar = ['A', 'a', 'E', 'e', 'I', 'i', 'O', 'o', 'U', 'u', 'N', 'n', ' ', '', '\t', '', '-', '--', '(c)', '(r)', '*', "'", "'", '"', '"', '...', '&lt;', '&gt;'];
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
	function metrics(currentScope, task, serviceName, type, shipper, mode) {
		var env = currentScope.envCode.toLowerCase();
		var dashboardID = "";
		var name = serviceName;
		var logType = "Analytics";
		var filter = "";
		if (shipper && shipper === "metricbeat") {
			logType = "Metrics";
			filter = "&_a=(query:(query_string:(analyze_wildcard:!t,query:'";
			if (task && type === 'task') {
				var id = task.id;
				if(currentScope.envPlatform === 'docker' && mode === 'global'){
					id = task.ref.node.id + "." + task.id;
				}
				name = task.name + "." + id;
				dashboardID = "Metricbeat-Docker-task";
				filter +="docker.container.name:"+ name;
			}
			else if (type) {
				dashboardID = "Metricbeat-Docker-"+type;
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
		var url = "http://" + window.location.hostname + ":" + currentScope.kibanaPort + "/app/kibana#/dashboard/" + dashboardID + "?embed=true&_g=(refreshInterval%3A('%24%24hashKey'%3A'object%3A4602'%2Cdisplay%3A'10%20seconds'%2Cpause%3A!f%2Csection%3A1%2Cvalue%3A5000)%2Ctime%3A(from%3Anow-15m%2Cmode%3Aquick%2Cto%3Anow))"+filter;
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
					currentScope.analyticsIsDeployed = (response.activated);
					currentScope.showAnalytics = (response[env]);
					currentScope.kibanaPort = (response.kibana && response.kibana.port) ? response.kibana.port : "32601";
					currentScope.showActivateAnalytics = !(response.tracker && response.tracker.info && response.tracker.info.status && response.tracker.info.status !== "failed");
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
					currentScope.displayAlert('info', "Analytics is being Deployed, it may take a few minutes.");
					currentScope.showActivateAnalytics = false;
					currentScope.showAnalytics = false;
				}
			});
		}
	}

	function deactivateAnalytics(currentScope) {
		var env = currentScope.envCode.toLowerCase();
		if (currentScope.access.analytics.deactivate) {
			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/analytics/deactivateAnalytics",
				"params": {
					"env": env
				}
			}, function (error) {
				if (error) {
					currentScope.displayAlert('danger', error);
				}
				else {
					currentScope.displayAlert('info', "Analytics is Deactivated");
					currentScope.showActivateAnalytics = true;
					currentScope.showAnalytics = false;
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
		'activateAnalytics': activateAnalytics,
		'deactivateAnalytics': deactivateAnalytics
	};
}]);
