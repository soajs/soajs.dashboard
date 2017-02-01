"use strict";
var hacloudServices = soajsApp.components;
hacloudServices.service('hacloudSrv', ['ngDataApi', '$timeout', '$modal', '$sce', function (ngDataApi, $timeout, $modal, $sce) {

    function checkCerts(currentScope, env) {
        currentScope.certsExist = {
            all: false,
            ca: false,
            cert: false,
            key: false
        };
        getSendDataFromServer(currentScope, ngDataApi, {
            "method": "get",
            "routeName": "/dashboard/environment/platforms/list",
            "params": {
                env: env
            }
        }, function (error, response) {
            if (error) {
                currentScope.$parent.displayAlert("danger", error.code, true, 'dashboard', error.message);
            }
            else if (response.selected.split('.')[1] === "kubernetes" || (response.selected.split('.')[1] === "docker" && response.selected.split('.')[2] === "remote")) {
                var requiredCerts = environmentsConfig.deployer.certificates.required;

                requiredCerts.forEach(function (oneCertType) {
                    for (var i = 0; i < response.certs.length; i++) {
                        if (response.certs[i].metadata.env[currentScope.envCode.toUpperCase()] && response.certs[i].metadata.env[currentScope.envCode.toUpperCase()].length > 0) {
                            var currentSelected = response.selected.split('.')[1] + "." + response.selected.split('.')[2];
                            if (response.certs[i].metadata.env[currentScope.envCode.toUpperCase()].indexOf(currentSelected) !== -1) {
                                if (response.certs[i].metadata.certType === oneCertType) {
                                    currentScope.certsExist[oneCertType] = true;
                                }
                            }
                        }
                    }
                });

                currentScope.certsExist.all = (currentScope.certsExist.ca && currentScope.certsExist.cert && currentScope.certsExist.key);
            }
            else {
                //docker local does not require certificates, it uses unix socket
                currentScope.certsExist.all = true;
            }
        });
    }
	
	/**
	 * Nodes Functions
	 * @param currentScope
	 */
	function listNodes(currentScope) {
        getSendDataFromServer(currentScope, ngDataApi, {
            "method": "get",
            "routeName": "/dashboard/cloud/nodes/list",
        }, function (error, response) {
            if (error) {
                currentScope.displayAlert('danger', error.message);
            }
            else {
                currentScope.nodes.list = response;
            }
        });
    }

    function addNode(currentScope) {
        var formConfig = angular.copy(environmentsConfig.form.node);
        if (currentScope.envPlatform === 'kubernetes') {
            for (var i = formConfig.entries.length - 1; i >= 0; i--) {
                if (formConfig.entries[i].name === 'port' || formConfig.entries[i].name === 'role') {
                    formConfig.entries.splice(i, 1);
                }
            }
        }

        var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'addNode',
			label: 'Add New Node',
			actions: [
				{
					'type': 'submit',
					'label': translation.submit[LANG],
					'btn': 'primary',
					'action': function (formData) {
						var postData = {
                            env: currentScope.envCode,
                            host: formData.ip,
                            port: formData.port,
                            role: formData.role
                        };

                        overlayLoading.show();
                        getSendDataFromServer(currentScope, ngDataApi, {
                            "method": "post",
                            "routeName": "/dashboard/cloud/nodes/add",
                            "data": postData
                        }, function (error, response) {
                            overlayLoading.hide();
                            currentScope.modalInstance.close();
                            currentScope.form.formData = {};
                            if (error) {
                                currentScope.displayAlert('danger', error.message);
                            }
                            else {
                                currentScope.displayAlert('success', 'Node added successfully');
                                currentScope.listNodes();
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

    function removeNode(currentScope, nodeId) {
        getSendDataFromServer(currentScope, ngDataApi, {
            "method": "delete",
            "routeName": "/dashboard/cloud/nodes/remove",
            "params": {
                env: currentScope.envCode,
                nodeId: nodeId
            }
        }, function (error, response) {
            if (error) {
                currentScope.displayAlert('danger', error.message);
            }
            else {
                currentScope.displayAlert('success', 'Node removed successfully');
                currentScope.listNodes();
            }
        });
    }

    function updateNode(currentScope, node, type, newStatus) {
        var params = {
            env: currentScope.envCode,
            nodeId: node.id
        };

        var postData = {
            type: type,
            value: newStatus
        };

        getSendDataFromServer(currentScope, ngDataApi, {
            "method": "put",
            "routeName": "/dashboard/cloud/nodes/update",
            params: params,
            data: postData
        }, function (error, response) {
            if (error) {
                currentScope.displayAlert('danger', error.message);
            }
            else {
                currentScope.displayAlert('success', 'Node updated successfully');
                currentScope.listNodes();
            }
        });
    }
	
	/**
	 * Service Functions
	 * @param currentScope
	 * @param env
	 * @param noPopulate
	 */
	function listServices(currentScope) {
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
                            	"label": "SOAJS",
	                            "groups": {}
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
                        	if(response[j].labels['soajs.content'] === 'true'){
                        		if(['nginx', 'db', 'elk'].indexOf(response[j].labels['soajs.service.group']) !== -1){
			                        response[j].ui = {
				                        'color': 'red',
				                        'heartbeat': false
			                        };
			                        currentScope.hosts[response[j].labels['soajs.service.group']].list.push(response[j]);
		                        }
		                        else{
			                        response[j].ui = {
				                        'color': 'red',
				                        'heartbeat': false
			                        };
			                        var groupName = response[j].labels['soajs.service.group'];
			                        if(!currentScope.hosts.soajs.groups[groupName]){
				                        currentScope.hosts.soajs.groups[groupName] = {
				                        	expanded : true,
					                        list: []
				                        };
			                        }
			                        
			                        currentScope.hosts.soajs.groups[groupName].list.push(response[j])
			                        if(response[j].labels['soajs.service.name'] === 'controller'){
				                        currentScope.controllers.push(response[j]);
			                        }
		                        }
	                        }
                        	else{
                        		//service is not SOAJS
		                        response[j].ui = {
			                        'color': 'red',
			                        'heartbeat': false
		                        };
		                        
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
                }
            });
        }
        
        function step2(){
	        var i = 1;
	        currentScope.controllers.forEach(function(oneController){
		        oneController.code = "CTRL-" + i;
		        var tooltip = "<b>Name:</b> " + oneController.name + "<br>";
		
		        var healthy = false;
		        oneController.tasks.forEach(function(oneTask){
			
			        if(oneTask.status.state === 'running'){
				        healthy = true;
			        }
			        tooltip += "<b>State:</b> " + oneTask.status.state + "<br>";
			        tooltip += "<b>Started:</b> " + oneTask.status.ts;
		        });
		        oneController.healthy = healthy;
		        oneController.tooltip = $sce.trustAsHtml(tooltip);
		        i++;
	        });
        }
    }

    function deleteService(currentScope, service) {
        var params = {
            env: currentScope.envCode,
            serviceId: service.id
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
    
    function loadDaemonStat(currentScope, service){
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
	
	function hostLogs (currentScope, task) {
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			method: "get",
			routeName: "/dashboard/hacloud/services/instances/logs",
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
				$modal.open({
					templateUrl: "logBox.html",
					size: 'lg',
					backdrop: true,
					keyboard: false,
					windowClass: 'large-Modal',
					controller: function ($scope, $modalInstance) {
						$scope.title = "Host Logs of " + taskName;
						$scope.data = remove_special(response.data);
						fixBackDrop();
						setTimeout(function () {
							highlightMyCode()
						}, 500);
						$scope.ok = function () {
							$modalInstance.dismiss('ok');
						};
					}
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
				updateServiceStatus(false);
				currentScope.displayAlert('danger', translation.errorExecutingHeartbeatTest[LANG] + " " + service.name + " " + translation.onHostName[LANG] + " " + task.name + " @ " + new Date().toISOString());
				updateServicesControllers(task);
			}
			else {
				//todo: needs revision
				if (heartbeatResponse.result) {
					for(var version in currentScope.hosts[oneHost.name].ips){
						for (var i = 0; i < currentScope.hosts[oneHost.name].ips[version].length; i++) {
							if (currentScope.hosts[oneHost.name].ips[version][i].ip === oneHost.ip) {
								currentScope.hosts[oneHost.name].ips[version][i].heartbeat = true;
								currentScope.hosts[oneHost.name].ips[version][i].color = 'green';
							}
						}
					}
				}
				updateServiceStatus(true);
				if (oneHost.name === 'controller') {
					currentScope.displayAlert('success', translation.service[LANG] + " " +
						oneHost.name +
						" " + translation.onHostName[LANG] + " " +
						oneHost.hostname +
						":" +
						oneHost.port +
						" " + translation.isHealthy[LANG]+ " @ " +
						new Date().toISOString() +
						", " + translation.checkingServicePleaseWait[LANG]);
				}
			}
		});
		
		function updateServiceStatus(healthyCheck) {
			var count = 0, max=0;
			var healthy = currentScope.hosts[oneHost.name].healthy;
			var color = currentScope.hosts[oneHost.name].color;
			var waitMessage = {};
			
			if(oneHost.name ==='controller'){
				checkMyIps(currentScope.hosts[oneHost.name].ips, max, count, healthyCheck, waitMessage);
			}
			else{
				for(var version in currentScope.hosts[oneHost.name].ips){
					checkMyIps(currentScope.hosts[oneHost.name].ips[version], max, count, healthyCheck, waitMessage);
				}
			}
			
			if (count === max) {
				color = 'green';
				healthy = true;
			}
			else if (count === 0) {
				color = 'red';
				healthy = false;
			}
			else {
				color = 'yellow';
				healthy = false;
			}
			
			currentScope.hosts[oneHost.name].healthy = healthy;
			currentScope.hosts[oneHost.name].color = color;
			if (oneHost.name !== 'controller' && JSON.stringify(waitMessage) !== '{}') {
				currentScope.hosts[oneHost.name].waitMessage = waitMessage;
				currentScope.closeWaitMessage(currentScope.hosts[oneHost.name]);
			}
		}
		
		function checkMyIps(ips, max, count, healthyCheck, waitMessage){
			for (var i = 0; i < ips.length; i++) {
				max++;
				if (oneHost.ip === ips[i].ip) {
					if (healthyCheck) {
						currentScope.hostList.forEach(function (origHostRec) {
							if (origHostRec.name === oneHost.name && origHostRec.ip === oneHost.ip) {
								ips[i].hostname = origHostRec.hostname;
								ips[i].cid = origHostRec.cid;
							}
						});
						if (oneHost.name === 'controller') {
							ips[i].heartbeat = true;
							ips[i].color = 'green';
						}
						else {
							ips[i].healthy = true;
							ips[i].color = 'green';
							waitMessage = {
								type: "success",
								message:  translation.service[LANG] + " " + oneHost.name + " " + translation.onHostName[LANG] + " " + oneHost.hostname + ":" + oneHost.port + " " + translation.isHealthy[LANG] + " @ " + new Date().toISOString(),
								close: function (entry) {
									entry.waitMessage.type = '';
									entry.waitMessage.message = '';
								}
							};
						}
					}
					else {
						ips[i].healthy = false;
						ips[i].heartbeat = false;
						ips[i].color = 'red';
					}
				}
			}
			for (var j = 0; j < ips.length; j++) {
				if (ips[j].heartbeat || ips[j].healthy) {
					count++;
				}
			}
		}
		
		function updateServicesControllers(currentScope, env, currentCtrl) {
			for (var serviceName in currentScope.hosts) {
				if (serviceName === 'controller') {
					continue;
				}
				if (currentScope.hosts[serviceName].ips && currentScope.hosts[serviceName].ips && Object.keys(currentScope.hosts[serviceName].ips).length > 0) {
					for(var version in currentScope.hosts[serviceName].ips){
						currentScope.hosts[serviceName].ips[version].forEach(function (OneIp) {
							
							if (OneIp.controllers && Array.isArray(OneIp.controllers) && OneIp.controllers.length > 0) {
								OneIp.controllers.forEach(function (oneCtrl) {
									
									if (oneCtrl.ip === currentCtrl.ip) {
										oneCtrl.color = 'red';
									}
								});
							}
						});
					}
				}
			}
		}
	}
	

	
    return {
        'listNodes': listNodes,
        'addNode': addNode,
        'removeNode': removeNode,
        'updateNode': updateNode,
	    
        'listServices': listServices,
        'deleteService': deleteService,
        'scaleService': scaleService,
        
        'executeHeartbeatTest': executeHeartbeatTest,
        'hostLogs': hostLogs,
	    'reloadServiceRegistry': reloadServiceRegistry,
        'loadServiceProvision': loadServiceProvision,
        'inspectService': inspectService,
        'loadDaemonStat': loadDaemonStat,
        'loadDaemonGroupConfig': loadDaemonGroupConfig,
        

        'checkCerts' : checkCerts
    };
}]);
