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
	 * Hosts Functions
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
	                    updateControllersList();
                    }
                }
            });
        }
        
        function updateControllersList(){
			var j = 0;
			currentScope.controllers.forEach(function(oneController){
				awarenessStat(currentScope, oneController);
				
				j++;
				if(j === currentScope.controllers.length){
					step2();
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
                currentScope.displayAlert('success', 'Service deleted succesfully');
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
	                        env: service.env,
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
                            currentScope.displayAlert('success', 'Service scaled successfully! If scaling up, new instances will appear as soon as they are ready');
                            currentScope.listServices();
                        }
                    });
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
			"routeName": "/dashboard/hosts/maintenanceOperation",
			"data": {
				"serviceId": service.id,
				"operation": "reloadRegistry",
				"env": currentScope.envCode
			}
		}, function (error, response) {
			if (error) {
				currentScope.generateNewMsg(currentScope.envCode, 'danger', translation.errorExecutingReloadRegistryTest[LANG] + " " + service.name + " @ " + new Date().toISOString());
			}
			else {
				//todo: needs revision
				currentScope.registryInfo.push({
					'label': service.name,
					'entries': [
						{
							'label': 'Registry information for: ' + service.name,
							'name': service.name,
							'type': 'jsoneditor',
							'options': {
								'mode': 'view',
								'availableModes': []
							},
							'height': '500px',
							"value": response
						}
					]
				});
				
				var formConfig = angular.copy(environmentsConfig.form.multiServiceInfo);
				formConfig.entries[0].tabs = currentScope.registryInfo;
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
		    "routeName": "/dashboard/hosts/maintenanceOperation",
		    "data": {
			    "serviceId": service.id,
			    "operation": "loadProvision",
			    "env": currentScope.envCode
		    }
	    }, function (error, response) {
		    if (error) {
			    currentScope.generateNewMsg(currentScope.envCode, 'danger', translation.errorExecutingReloadRegistryTest[LANG] + " " + service.name + " @ " + new Date().toISOString());
		    }
		    else {
		    	//todo: needs revision
			    currentScope.provisionInfo.push({
				    'label': service.name,
				    'entries': [
					    {
						    'label': 'Provision information for: ' + service.name,
						    'name': service.name,
						    'type': 'jsoneditor',
						    'options': {
							    'mode': 'view',
							    'availableModes': []
						    },
						    'height': '500px',
						    "value": response
					    }
				    ]
			    });
			
			    var formConfig = angular.copy(environmentsConfig.form.multiServiceInfo);
			    formConfig.entries[0].tabs = currentScope.provisionInfo;
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

    function awarenessStat (currentScope, controller) {
	    // console.log(currentScope.hosts);
	    // console.log(currentScope.controllers);
	    
        //excute awareness test for all service instances in parallel
        // getSendDataFromServer(currentScope, ngDataApi, {
		 //    "method": "put",
		 //    "routeName": "/dashboard/cloud/services/maintenance",
		 //    "data": {
			//     "serviceId": controller.id,
			//     "type": "controller",
			//     "operation": "awarenessStat",
			//     "env": env
		 //    }
        // }, function (error, awarenessResponse) {
		 //    if (error || !awarenessResponse.result || !awarenessResponse.data) {
			//     currentScope.generateNewMsg(env, 'danger', translation.errorExecutingAwarnessTestControllerIP[LANG] + controller.name + " @ " + new Date().toISOString());
		 //    }
		 //    else {
			//     awarenessResponse = awarenessResponse.data.services;
			//     console.log(awarenessResponse);
			//     //todo: need to loop and record all the servicenames found
			//
			//     // for (var oneService in awarenessResponse) {
			// 	 //    if (awarenessResponse.hasOwnProperty(oneService)) {
			// 		//     if (oneService === 'controller') {
			// 		// 	    continue;
			// 		//     }
			// 		//     if (awarenessResponse[oneService].awarenessStats) {
			// 		// 	    var ips = Object.keys(awarenessResponse[oneService].awarenessStats);
			// 		// 	    ips.forEach(function (serviceIp) {
			// 		// 		    updateService(awarenessResponse, oneService, serviceIp);
			// 		// 	    });
			// 		//     }
			// 	 //    }
			//     // }
		 //    }
        // });
        //
        // function updateService(response, oneService, serviceIp) {
		 //    var count = 0, max = 0;
        //
		 //    for(var version in currentScope.hosts[oneService].ips){
			//     for (var i = 0; i < currentScope.hosts[oneService].ips[version].length; i++) {
			// 	    max++;
			// 	    if (currentScope.hosts[oneService].ips[version][i].ip === serviceIp) {
			// 		    if (response[oneService].awarenessStats[serviceIp].healthy) {
			// 			    currentScope.hosts[oneService].ips[version][i].healthy = true;
			// 			    currentScope.hosts[oneService].ips[version][i].color = 'green';
			// 		    }
			// 		    else {
			// 			    currentScope.hosts[oneService].ips[version][i].healthy = false;
			// 			    currentScope.hosts[oneService].ips[version][i].color = 'red';
			// 		    }
			//
			// 		    var lc = response[oneService].awarenessStats[serviceIp].lastCheck;
			// 		    currentScope.hosts[oneService].ips[version][i].lastCheck = getTimeAgo(lc);
			//
			// 		    if (response[oneService].awarenessStats[serviceIp].downSince) {
			// 			    currentScope.hosts[oneService].ips[version][i].downSince = new Date(response[oneService].awarenessStats[serviceIp].downSince).toISOString();
			// 		    }
			// 		    if (response[oneService].awarenessStats[serviceIp].downCount) {
			// 			    currentScope.hosts[oneService].ips[version][i].downCount = response[oneService].awarenessStats[serviceIp].downCount;
			// 		    }
			//
			// 		    currentScope.hosts[oneService].ips[version][i].controllers.forEach(function (oneCtrl) {
			// 			    if (oneCtrl.ip === oneHost.ip) {
			// 				    oneCtrl.color = 'green';
			// 			    }
			// 		    });
			// 	    }
			//     }
			//
			//
			//     currentScope.hosts[oneService].ips[version].forEach(function (oneIP) {
			// 	    if (oneIP.healthy) {
			// 		    count++;
			// 	    }
			//     });
		 //    }
        //
		 //    var healthy, color;
		 //    if (count === max) {
			//     //if (count === currentScope.hosts[oneService].ips.length) {
			//     color = 'green';
			//     healthy = true;
		 //    }
		 //    else if (count === 0) {
			//     color = 'red';
			//     healthy = false;
		 //    }
		 //    else {
			//     color = 'yellow';
			//     healthy = false;
		 //    }
		 //    currentScope.hosts[oneService].healthy = healthy;
		 //    currentScope.hosts[oneService].color = color;
		 //    // currentScope.generateNewMsg(env, 'success', translation.awarenessTestControllerIP[LANG] + " " + oneHost.ip + ":" + oneHost.port + " " + translation.wasSuccesful[LANG] + " @ " + new Date().toISOString());
		 //    currentScope.displayAlert('success', translation.awarenessTestControllerIP[LANG] + " " + oneHost.ip + ":" + oneHost.port + " " + translation.wasSuccesful[LANG] + " @ " + new Date().toISOString());
        // }
	
    }

    function hostLogs (currentScope, task) {
        overlayLoading.show();
        getSendDataFromServer(currentScope, ngDataApi, {
            method: "get",
            routeName: "/dashboard/hacloud/services/instances/logs",
            params: {
                env: currentScope.envCode,
                taskName: task.id
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

    function executeHeartbeatTest(currentScope, service, task) {
        getSendDataFromServer(currentScope, ngDataApi, {
            "method": "post",
            "routeName": "/dashboard/hosts/maintenanceOperation",
            "data": {
                "serviceId": service.id,
	            "taskId": task.id,
                "operation": "heartbeat",
                "env": currentScope.envCode
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

    function inspectService(currentScope, service){
    	
    }
    
    function loadDaemonStat(currentScope, service){
    	
    }
    
    function loadDaemonGroupConfig(currentScope, service){
    	
    }
	
	/**
	 * Deploy New service/daemon
	 * @param currentScope
	 */
	function deployNewService (currentScope) {
		currentScope.deploymentModes = ['replicated', 'global'];
        var env = currentScope.envCode;
        var runningHosts = currentScope.hosts;
        $modal.open({
            templateUrl: "deployNewService.tmpl",
            size: 'lg',
            backdrop: true,
            keyboard: true,
            controller: function ($scope, $modalInstance) {
                fixBackDrop();

                $scope.title = 'Deploy New Service';
                $scope.imagePath = 'themes/' + themeToUse + '/img/loading.gif';
                $scope.currentScope = currentScope;

                currentScope.services = [];
                currentScope.service = "";
                currentScope.versions = [];
                currentScope.version = "";
                currentScope.groupConfigs = "";
                currentScope.groupConfig = "";
                currentScope.branches = [];
                currentScope.branch = "";
                currentScope.serviceOwner = '';
                currentScope.serviceRepo = '';
                currentScope.envVariables = '';
                currentScope.conflict = false;
                currentScope.loadingBranches = false;
                delete currentScope.conflictCommits;
                currentScope.confirmBranch = '';
                delete currentScope.replicaCount;
                delete currentScope.exposedPort;
                currentScope.memoryLimit = 200;
                currentScope.useLocalSOAJS = true;
                currentScope.message = {};
                currentScope.defaultEnvVariables = "<ul><li>SOAJS_DEPLOY_HA=true</li><li>SOAJS_SRV_AUTOREGISTERHOST=true</li><li>NODE_ENV=production</li><li>SOAJS_ENV=" + currentScope.envCode + "</li><li>SOAJS_PROFILE=" + currentScope.profile + "</li></ul></p>";
                currentScope.imagePrefix = 'soajsorg';

                $scope.getServices = function (cb) {
                    getSendDataFromServer(currentScope, ngDataApi, {
                        method: 'post',
                        routeName: '/dashboard/services/list'
                    }, function (error, response) {
                        if (error) {
                            currentScope.generateNewMsg(env, 'danger', translation.unableRetrieveListServices[LANG]);
                        } else {
                            response.forEach(function (oneService) {
                                oneService.type = 'service';
                                if (oneService.name === 'controller') {
                                    oneService.UIGroup = 'Controllers';
                                } else {
                                    oneService.UIGroup = 'Services';
                                }
                                if (allowListing(env, oneService)) {
                                    currentScope.services.push(oneService);
                                }
                            });
                            return cb();
                        }
                    });
                };

                $scope.getDaemons = function () {
                    getSendDataFromServer(currentScope, ngDataApi, {
                        method: 'post',
                        routeName: '/dashboard/daemons/list',
                        params: {
                            'getGroupConfigs': true
                        }
                    }, function (error, response) {
                        if (error) {
                            currentScope.generateNewMsg(env, 'danger', translation.unableRetrieveDaemonsHostsInformation[LANG]);
                        } else {
                            response.forEach(function (oneDaemon) {
                                if (allowListing(env, oneDaemon)) {
                                    oneDaemon.type = 'daemon';
                                    oneDaemon.UIGroup = 'Daemons';
                                    currentScope.services.push(oneDaemon);
                                }
                            });
                        }
                    });
                };

                $scope.selectService = function (service) {
                    currentScope.versions = Object.keys(service.versions);
                    if (currentScope.version) {
                        currentScope.version = "";
                    }
                    if (currentScope.versions.length === 1) {
                        currentScope.version = currentScope.versions[0];
                    }

                    currentScope.branches = [];
                    currentScope.branch = '';
                    currentScope.groupConfigs = '';
                    currentScope.conflict = '';
                    currentScope.conflictCommits = {};

                    if (service.type === 'nginx') return;

                    if (service.type === 'daemon' && service.grpConf) {
                        currentScope.groupConfigs = service.grpConf;
                    }

                    currentScope.loadingBranches = true;
                    getSendDataFromServer(currentScope, ngDataApi, {
                        method: 'get',
                        routeName: '/dashboard/gitAccounts/getBranches',
                        params: {
                            'name': service.name,
                            'type':  service.type
                        }
                    }, function (error, response) {
                        if (error) {
                            currentScope.message.danger = error.message;
                            $timeout(function () {
                                currentScope.message.danger = '';
                            }, 5000);
                        } else {
                            currentScope.branches = response.branches;
                            currentScope.serviceOwner = response.owner;
                            currentScope.serviceRepo = response.repo;
                            currentScope.loadingBranches = false;
                        }
                    });
                };

                $scope.selectBranch = function (branch) {
                    currentScope.conflict = false;
                    currentScope.conflictCommits = {};
                    if (runningHosts && runningHosts[currentScope.service.name]) {
                        var versions = Object.keys(runningHosts[currentScope.service.name].ips);
                        for (var i = 0; i < versions.length; i++) {
                            var instances = runningHosts[currentScope.service.name].ips[versions[i]];
                            for (var j = 0; j < instances.length; j++) {
                                if (instances[j].commit !== branch.commit.sha) {
                                    currentScope.conflict = true;
                                    instances[j].version = versions[i];
                                    if (currentScope.conflictCommits[instances[j].commit]) {
                                        currentScope.conflictCommits[instances[j].commit].instances.push(instances[j]);
                                    } else {
                                        currentScope.conflictCommits[instances[j].commit] = {};
                                        currentScope.conflictCommits[instances[j].commit].branch = instances[j].branch;
                                        currentScope.conflictCommits[instances[j].commit].instances = [];
                                        currentScope.conflictCommits[instances[j].commit].instances.push(instances[j]);
                                    }
                                }
                            }
                        }
                    }
                };

                $scope.confirmBranchSelection = function () {
                    //clear previously selected commit if any
                    currentScope.commit = '';
                };

                $scope.onSubmit = function () {
                    if (!currentScope.service || (currentScope.service.type !== 'nginx' && (!currentScope.branch || !currentScope.replicaCount))) {
                        currentScope.message.danger = "Please select a service, branch, and number of instances";
                        $timeout(function () {
                            currentScope.message.danger = "";
                        }, 5000);
                    }
                    else if (currentScope.conflictCommits && Object.keys(currentScope.conflictCommits).length > 0 && !currentScope.commit && !currentScope.confirmBranch) {
                        currentScope.message.danger = "Please select a commit to deploy from or confirm deployment from new branch";
                        $timeout(function () {
                            currentScope.message.danger = "";
                        }, 5000);
                    } else {
                        if (currentScope.service.type === 'nginx') {
                            newNginx(currentScope);
                        }
                        else {
                            var max = currentScope.number;
                            if (currentScope.service.name === 'controller') {
                                newController(currentScope, max);
                            }
                            else {
                                newService(currentScope);
                            }
                        }
                    }
                };

                $scope.closeModal = function () {
                    $modalInstance.close();
                };

                function allowListing(env, service) {
                    var dashboardServices = ['dashboard', 'proxy', 'urac', 'oauth']; //locked services that the dashboard environment is allowed to have
                    var nonDashboardServices = ['urac', 'oauth']; //locked services that non dashboard environments are allowed to have
                    if (env.toLowerCase() === 'dashboard' && dashboardServices.indexOf(service.name) !== -1) {
                        return true;
                    } else if (env.toLowerCase() !== 'dashboard' &&
                    // service.name !== 'controller' && //controller is added later manually
                    ((dashboardServices.indexOf(service.name) !== -1 && nonDashboardServices.indexOf(service.name) !== -1) || //not a locked service for dashboard and non dashboard environments
                    (dashboardServices.indexOf(service.name) === -1 && nonDashboardServices.indexOf(service.name) === -1))) { //a locked service that is common for dashboard and non dash envs (urac, oauth)
                        return true;
                    }
                    return false;
                }

                function newController(currentScope, max) {
                    var params = {
                        'env': env,
                        'name': 'controller',
                        'type': 'service',
                    };

                    params.gitSource = {
                        "owner": currentScope.serviceOwner,
                        "repo": currentScope.serviceRepo,
                    };

                    if (currentScope.commit && !currentScope.confirmBranch) {
                        params.gitSource.branch = getBranchFromCommit(currentScope.commit);
                        params.gitSource.commit = currentScope.commit;
                    } else {
                        params.gitSource.branch = currentScope.branch.name;
                        params.gitSource.commit = currentScope.branch.commit.sha;
                    }

                    if (currentScope.service.latest) {
                        params.version = currentScope.service.latest;
                    }

                    if (currentScope.envVariables && currentScope.envVariables !== '') {
                        params.variables = currentScope.envVariables.split(",");
                        for (var i = 0; i < params.variables.length; i++) {
                            params.variables[i] = params.variables[i].trim();
                        }
                    }

                    //Fill deployConfig information
                    params.deployConfig = {
                        "useLocalSOAJS": currentScope.useLocalSOAJS,
                        "imagePrefix": currentScope.imagePrefix,
                        "replication": {
                            "mode": currentScope.mode,
                            "number": max,
                        }
                    };

                    getSendDataFromServer(currentScope, ngDataApi, {
                        "method": "post",
                        "routeName": "/cloud/services/soajs/deploy",
                        "data": params
                    }, function (error, response) {
                        if (error) {
                            currentScope.generateNewMsg(env, 'danger', error.message);
                            $modalInstance.close();
                        }
                        else {
                            listHosts(currentScope, env);
                        }
                    });
                }

                function newService(currentScope, max) {
                    var params = {
                        'env': env,
                        'type': 'service',
                        "version": parseInt(currentScope.version)
                    };

                    params.gitSource = {
                        "owner": currentScope.serviceOwner,
                        "repo": currentScope.serviceRepo,
                    };

                    if (currentScope.commit && !currentScope.confirmBranch) {
                        params.gitSource.branch = getBranchFromCommit(currentScope.commit);
                        params.gitSource.commit = currentScope.commit;
                    } else {
                        params.gitSource.branch = currentScope.branch.name;
                        params.gitSource.commit = currentScope.branch.commit.sha;
                    }

                    if (currentScope.service.gcId) {
                        params.contentConfig = {
                            "service" : {
                                "gc" : true,
                                "gcName" : currentScope.service.name,
                                "gcVersion" : currentScope.service.version
                            }
                        }

                    } else {
                        params.name = currentScope.service.name;
                    }

                    if (currentScope.envVariables && currentScope.envVariables !== '') {
                        params.variables = currentScope.envVariables.split(",");
                        for (var i = 0; i < params.variables.length; i++) {
                            params.variables[i] = params.variables[i].trim();
                        }
                    }

                    if (currentScope.groupConfig) {
                        params.type = 'daemon';
                        params.contentConfig = {
                            "grpConfName" : currentScope.groupConfig.daemonConfigGroup
                        }
                    }

                    params.deployConfig = {
                        'useLocalSOAJS': currentScope.useLocalSOAJS,
                        'memoryLimit': (currentScope.memoryLimit * 1048576), //converting to bytes
                        "imagePrefix": currentScope.imagePrefix,
                        "replication": {
                            "mode": currentScope.mode,
                            "number": max,
                        }
                    };

                    var config = {
                        "method": "post",
                        "routeName": "/cloud/services/soajs/deploy",
                        "data": params
                    };

                    overlayLoading.show();
                    getSendDataFromServer(currentScope, ngDataApi, config, function (error, response) {
                        overlayLoading.hide();
                        if (error) {
                            currentScope.displayAlert('danger', error.message);
                            $modalInstance.close();
                        }
                        else {
                            currentScope.displayAlert('success', 'New service deployed successfully and will be available in a few minutes');
                            $modalInstance.close();
                        }
                    });
                }

                function newNginx(currentScope) {
                    var params = {
                        "env": env,
                        'type': 'nginx',
                        "version": parseInt(currentScope.version)
                    };

                    params.deployConfig = {
                        'memoryLimit': (currentScope.memoryLimit * 1048576), //converting to bytes
                        "imagePrefix": currentScope.imagePrefix,
                        "replication": {
                            "mode": currentScope.mode,
                            "number": max,
                        }
                    };

                    if (currentScope.exposedPort) {
                        params.deployConfig.exposedPort = currentScope.exposedPort;
                    }
                    //todo: fill the value with the right ones
                    if (currentScope.service.gcId) {
                        params.contentConfig = {
                            "nginx" : {
                                "ui": {
                                    "id": null,
                                    "branch": null,
                                    "commit": null
                                }
                            }
                        }
                    }

                    getSendDataFromServer(currentScope, ngDataApi, {
                        method: 'post',
                        routeName: '/cloud/services/soajs/deploy',
                        data: params
                    }, function (error, response) {
                        if (error) {
                            $modalInstance.close();
                            currentScope.generateNewMsg(env, 'danger', error.message);
                        }
                        else {
                            $modalInstance.close();
                            currentScope.generateNewMsg(env, 'success', 'Nginx instance deployed successfully');
                        }
                    });
                }

                function getBranchFromCommit (commit) {
                    return currentScope.conflictCommits[commit].branch;
                }

                //Start here
                if (currentScope.hosts && currentScope.hosts.controller) {
                    $scope.getServices(function () {
                        $scope.getDaemons();
                    });
                }
                else {
                    currentScope.services.push({
                        name: 'controller',
                        UIGroup: 'Controllers',
                        type: 'service'
                    });
                }
            }
        });
    }
	
    return {
        'listNodes': listNodes,
        'addNode': addNode,
        'removeNode': removeNode,
        'updateNode': updateNode,
	    
        'listServices': listServices,
        'deleteService': deleteService,
        'scaleService': scaleService,
        
        'awarenessStat': awarenessStat,
        'executeHeartbeatTest': executeHeartbeatTest,
        'hostLogs': hostLogs,
	    'reloadServiceRegistry': reloadServiceRegistry,
        'loadServiceProvision': loadServiceProvision,
        'inspectService': inspectService,
        'loadDaemonStat': loadDaemonStat,
        'loadDaemonGroupConfig': loadDaemonGroupConfig,
        
	    'deployNewService': deployNewService,
        'checkCerts' : checkCerts
    };
}]);
