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
        currentScope.controllers =[];
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
		                    'nginx':{
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
	                        response[j].tasks.forEach(function(oneTask){
		                        if(['running','preparing', 'pending', 'starting'].indexOf(oneTask.status.state.toLowerCase()) === -1){
			                        failures++;
			                        oneTask.hideIt = true;
		                        }
	                        });

	                        if(failures === response[j].tasks.length){
		                        response[j].hideIt = true;
	                        }

	                        response[j].failures = failures;

                        	if(response[j].labels && response[j].labels['soajs.content'] === 'true'){
                        		if(response[j].labels['soajs.service.name'] === 'controller' && !response[j].labels['soajs.service.group']){
			                        response[j].labels['soajs.service.group'] = "SOAJS Core Services";
		                        }
                        		if(['nginx', 'db', 'elk'].indexOf(response[j].labels['soajs.service.group']) !== -1){
			                        currentScope.hosts[response[j].labels['soajs.service.group']].list.push(response[j]);
		                        }
		                        else{
                        			if(!currentScope.hosts.soajs.groups){
				                        currentScope.hosts.soajs.groups = {};
			                        }

			                        response[j]['color'] = 'green';
			                        response[j]['healthy'] = true;
			                        var groupName = response[j].labels['soajs.service.group'];
			                        if(!currentScope.hosts.soajs.groups[groupName]){
				                        currentScope.hosts.soajs.groups[groupName] = {
				                        	expanded : true,
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
		                        break;
	                        }
                        }

	                    step2();
                    }
                    else{
                    	delete currentScope.hosts;
                    }
                }
            });
        }

        function step2(){
	        currentScope.controllers.forEach(function(oneController){
		        var i = 1;
		        var failure = 0;

	        	oneController.tasks.forEach(function(oneCtrlTask){
			        oneCtrlTask.code = "CTRL-" + i;
			        var healthy = (oneCtrlTask.status.state === 'running');
			        oneCtrlTask.healthy = healthy;
			        if(!healthy){
			        	failure++;
			        }

			        var tooltip = "<b>Name:</b> " + oneCtrlTask.name + "<br>";
			        tooltip += "<b>State:</b> " + oneCtrlTask.status.state + "<br>";
			        tooltip += "<b>Started:</b> " + oneCtrlTask.status.ts;

			        oneCtrlTask.tooltip = $sce.trustAsHtml(tooltip);
			        i++;
		        });

	        	if(failure === 0){
	        		oneController.color = 'green';
		        }
	        	else if(failure > 0 && failure < oneController.tasks.length){
			        oneController.color = 'yellow';
		        }
		        else if (failure === oneController.tasks.length){
	        		oneController.color = 'red';
		        }
	        });
	        if(cb && typeof(cb) === 'function'){
	        	return cb();
	        }
        }
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
                            $timeout(function(){
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

	function inspectService(currentScope, service){
		$modal.open({
			templateUrl: "infoService.tmpl",
			size: 'm',
			backdrop: true,
			keyboard: true,
			controller: function ($scope, $modalInstance) {
				fixBackDrop();

				$scope.title = service.name + ' | Service Info';
				$scope.serviceInfo = service;

				$scope.fillAceWithInfo = function(_editor){
					$timeout(function(){
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
								formData.branch = JSON.parse(formData.branch);
								formData.content = JSON.parse(formData.content);

								var params = {
						            env: currentScope.envCode,
						            serviceId: service.id,
									ui : {
						            	id: formData.content._id,
										branch: formData.branch.name,
										commit: formData.branch.commit.sha
									}
						        };
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
    function reloadServiceRegistry (currentScope, service) {
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
				response.forEach(function(oneRegistry){
					service.tasks.forEach(function(oneTask){
						if(oneTask.id === oneRegistry.id && oneTask.status.state === 'running'){
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

    function loadServiceProvision (currentScope, service) {
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
			    response.forEach(function(oneRegistry){
				    service.tasks.forEach(function(oneTask) {
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

    function loadDaemonStats(currentScope, service){
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
			    response.forEach(function(oneRegistry){
				    service.tasks.forEach(function(oneTask) {
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

    function loadDaemonGroupConfig(currentScope, service){
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
			    response.forEach(function(oneRegistry){
				    service.tasks.forEach(function(oneTask) {
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
				heartbeatResponse.forEach(function(oneHeartBeat){
					service.tasks.forEach(function(oneServiceTask){
						if(oneServiceTask.id === oneHeartBeat.id){
							if(!oneHeartBeat.response.result){
								oneServiceTask.status.state = 'Unreachable';

								var tooltip = "<b>Code:</b> " + oneHeartBeat.response.error.code + "<br>";
								tooltip += "<b>Errno:</b> " + oneHeartBeat.response.error.errno + "<br>";
								tooltip += "<b>Syscall:</b> " + oneHeartBeat.response.error.syscall + "<br>";
								tooltip += "<b>Address:</b> " + oneHeartBeat.response.error.address + "<br>";
								tooltip += "<b>Port:</b> " + oneHeartBeat.response.error.port + "<br>";

								oneServiceTask.status.error = tooltip;
								failCount++;

								if(service.labels['soajs.service.name'] === 'controller'){
									currentScope.controllers.forEach(function(oneController){
										if(oneController.id === oneServiceTask.id){
											oneController.healthy = false;
										}
									});
								}
							}
							else{
								oneServiceTask.status.state = 'running';
							}
							oneServiceTask.status.lastTs = oneHeartBeat.response.ts;
						}
					});
				});

				if(failCount === heartbeatResponse.length){
					service.color = 'red';
				}
				else if(failCount > 0 && failCount < heartbeatResponse.length){
					service.color = 'yellow';
				}
				else {
					service.color = 'green';
				}
			}
		});
	}

	function hostLogs (currentScope, task) {
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			method: "get",
			routeName: "/dashboard/cloud/services/instances/logs",
			params: {
				env: currentScope.envCode,
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

						$scope.refreshLogs = function(){
							console.log("again ....")
							getSendDataFromServer(currentScope, ngDataApi, {
								method: "get",
								routeName: "/dashboard/cloud/services/instances/logs",
								params: {
									env: currentScope.envCode,
									taskId: task.id
								}
							}, function (error, response) {
								if (error) {
									currentScope.displayAlert('danger', error.message);
								}
								else {
									$scope.data = remove_special(response.data);
									fixBackDrop();
									$timeout(function () {
										highlightMyCode()
									}, 500);

									autoRefreshPromise = $timeout(function(){
										$scope.refreshLogs();
									}, 3000);
								}
							});
						};

						$scope.ok = function () {
							$modalInstance.dismiss('ok');
						};

						$scope.refreshLogs();
					}
				});

				mInstance.result.then(function(){
					//Get triggers when modal is closed
					$timeout.cancel(autoRefreshPromise);
				}, function(){
					//gets triggers when modal is dismissed.
					$timeout.cancel(autoRefreshPromise);
				});
			}
		});

		function remove_special(str) {
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

    return {
        'listServices': listServices,
        'deleteService': deleteService,
        'scaleService': scaleService,
		'redeployService': redeployService,
		'rebuildService': rebuildService,

        'executeHeartbeatTest': executeHeartbeatTest,
        'hostLogs': hostLogs,
        'reloadServiceRegistry': reloadServiceRegistry,
        'loadServiceProvision': loadServiceProvision,
        'inspectService': inspectService,
        'loadDaemonStats': loadDaemonStats,
	    "loadDaemonGroupConfig": loadDaemonGroupConfig
    };
}]);
