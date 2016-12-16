"use strict";
var hacloudServices = soajsApp.components;
hacloudServices.service('hacloudSrv', ['ngDataApi', '$timeout', '$modal', function (ngDataApi, $timeout, $modal) {

    function checkCerts(currentScope, env) {
        getSendDataFromServer(currentScope, ngDataApi, {
            "method": "get",
            "routeName": "/dashboard/environment/platforms/list",
            "params": {
                env: env
            }
        }, function (error, response) {
            if (error) {
                currentScope.$parent.displayAlert("danger", error.code, true, 'dashboard', error.message);
            } else if(response.selected.split('.')[1] === "kubernetes" || (response.selected.split('.')[1] === "docker" &&
                response.selected.split('.')[2] === "remote")){
                if(response.certs.length === 3) {
                    currentScope.certsExist = true;
                    var temp = response.selected.split('.')[1] + "." + response.selected.split('.')[2];
                    for(var i = 0; i < response.certs.length ; i++){
                        if(!(response.certs[i].metadata.env[env] && response.certs[i].metadata.env[env].indexOf(temp) !== -1)){
                            currentScope.certsExist = false;
                            break;
                        }
                    }
                }
                else{
                    currentScope.certsExist = false;
                }
            }
        });
    }

    function listNodes(currentScope) {
        getSendDataFromServer(currentScope, ngDataApi, {
            "method": "get",
            "routeName": "/dashboard/hacloud/nodes/list",
        }, function (error, response) {
            if (error) {
                currentScope.displayAlert('danger', 'Unable to list nodes');
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
                            "method": "send",
                            "routeName": "/dashboard/hacloud/nodes/add",
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
            "method": "get",
            "routeName": "/dashboard/hacloud/nodes/remove",
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
            "method": "send",
            "routeName": "/dashboard/hacloud/nodes/update",
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

    function listHosts(currentScope, env, noPopulate) {
        var controllers = [];
        currentScope.showCtrlHosts = true;
        currentScope.hostList = [];
        if (currentScope.access.listHosts) {
            getSendDataFromServer(currentScope, ngDataApi, {
                "method": "get",
                "routeName": "/dashboard/hosts/list",
                "params": {
                    "env": env
                }
            }, function (error, response) {
                if (error || !response) {
                    currentScope.displayAlert('danger', translation.unableRetrieveServicesHostsInformation[LANG]);
                }
                else {
	                currentScope.profile = response.profile;
	                currentScope.deployer = response.deployer;
                    if (currentScope.deployer.selected.split('.')[2] === 'local') {
                        currentScope.localDeployment = true;
                    }

                    currentScope.hostList = response.hosts;
                    if (response.hosts && response.hosts.length > 0) {
                        currentScope.hosts = {
                            'controller': {
                                'color': 'red',
                                'heartbeat': false,
                                'port': '4000',
                                'ips': []
                            }
                        };

                        for (var j = 0, ctrlCounter = 1; j < response.hosts.length; j++) {
                            if (response.hosts[j].name === 'controller') {
	                            var info = {
		                            'name': 'controller',
                                    'code': 'CTRL-' + ctrlCounter++,
		                            'hostname': response.hosts[j].hostname,
		                            'ip': response.hosts[j].ip,
		                            'cid': response.hosts[j].cid,
                                    'serviceName': response.hosts[j].serviceHAName,
                                    'taskName': response.hosts[j].serviceHATask,
		                            'version': response.hosts[j].version,
		                            'color': 'red',
		                            'port': 4000,
                                    'type': 'service'
	                            };
	                            if(response.hosts[j].src && response.hosts[j].src.branch){
		                            info.branch = response.hosts[j].src.branch;
	                            }
                                controllers.push(info);
                            }
                        }
                        if (controllers.length > 0) {
                            controllers.forEach(function (oneController) {
                                invokeHeartbeat(oneController);
                                currentScope.hosts.controller.ips.push(oneController);
                            });
                        }
                        else {
                            delete currentScope.hosts.controller;
                        }
                    }
                }
            });
        }

        function updateParent() {
            var color = 'red';
            var healthy = false;
            var count = 0;
            currentScope.hosts.controller.ips.forEach(function (oneHost) {
                if (oneHost.heartbeat) {
                    count++;
                }
            });

            if (count === currentScope.hosts.controller.ips.length) {
                color = 'green';
                healthy = true;
            }
            else if (count > 0) {
                healthy = true;
                color = 'yellow';
            }
            currentScope.hosts.controller.color = color;
            currentScope.hosts.controller.healthy = healthy;
        }

        function invokeHeartbeat(defaultControllerHost) {
            getSendDataFromServer(currentScope, ngDataApi, {
                "method": "send",
                "routeName": "/dashboard/hosts/maintenanceOperation",
                "data": {
                    "serviceName": "controller",
                    "operation": "heartbeat",
                    "serviceHost": defaultControllerHost.ip,
                    'hostname': defaultControllerHost.hostname,
                    "servicePort": 4000,
                    "env": env
                }
            }, function (error, response) {
                if (error || !response || !response.result) {
                    currentScope.displayAlert('danger', translation.controllers[LANG] + ' ' + defaultControllerHost.hostname + ' ' + translation.notHealthy[LANG] + '.');
                    if (error) {
                        console.log(error.message);
                    }
                    defaultControllerHost.heartbeat = false;
                    defaultControllerHost.color = 'red';
                    updateParent();
                }
                else {
                    defaultControllerHost.heartbeat = true;
                    defaultControllerHost.color = 'green';
                    updateParent();

                    getSendDataFromServer(currentScope, ngDataApi, {
                        "method": "send",
                        "routeName": "/dashboard/hosts/maintenanceOperation",
                        "data": {
                            "serviceName": "controller",
                            "operation": "awarenessStat",
                            "hostname": defaultControllerHost.hostname,
                            "servicePort": 4000,
                            "env": env
                        }
                    }, function (error, response) {
                        if (error || !response || !response.result || !response.data) {
                            currentScope.displayAlert('danger', translation.unableRetrieveServicesHostsInformation[LANG]);
                        }
                        else {
                            var servicesList = Object.keys(response.data.services);
                            var daemonsList = Object.keys(response.data.daemons);
                            var list = {};
                            servicesList.forEach (function (sKey) {
                                list[sKey] = response.data.services[sKey];
                                list[sKey].type = "service";
                            });
                            daemonsList.forEach (function (dKey) {
                                list[dKey] = response.data.daemons[dKey];
                                list[dKey].type = "daemon";
                            });
                            propulateServices(list);
                        }
                    });
                }
            });
        }

        function propulateServices(regServices) {
            var renderedHosts = {};
            var services = Object.keys(regServices);
            services.forEach(function (serviceName) {
                var oneService = regServices[serviceName];

                if (oneService.hosts) {
	                for(var version in oneService.hosts){
		                //oneService.hosts = oneService.hosts[oneService.hosts.latest];
		                if(Array.isArray(oneService.hosts[version]) && oneService.hosts[version].length > 0){
			                if (serviceName !== 'controller') {
				                if(!renderedHosts[serviceName]){
					                renderedHosts[serviceName] = {
						                'name': serviceName,
						                'port': regServices[serviceName].port,
                                        'group': regServices[serviceName].group,
						                'ips': {},
						                'color': 'red',
						                'healthy': false,
						                'type': regServices[serviceName].type
					                };
				                }
				                renderedHosts[serviceName].ips[version] = [];
			                }

			                regServices[serviceName].hosts[version].forEach(function (oneHostIP) {
				                if (serviceName !== 'controller') {
					                var oneHost = {
						                'controllers': controllers,
						                'ip': oneHostIP,
						                'name': serviceName,
						                'healthy': false,
						                'color': 'red',
						                'downCount': 'N/A',
						                'downSince': 'N/A',
						                'port': regServices[serviceName].port,
                                        'type': regServices[serviceName].type
					                };

					                currentScope.hostList.forEach(function (origHostRec) {
						                if (origHostRec.name === oneHost.name && origHostRec.ip === oneHost.ip) {
							                oneHost.hostname = origHostRec.hostname;
							                oneHost.cid = origHostRec.cid;
                                            oneHost.taskName = origHostRec.serviceHATask;
                                            oneHost.serviceName = origHostRec.serviceHAName;

                                            if (origHostRec.src) {
                                                oneHost.commit = origHostRec.src.commit;
                                                oneHost.branch = origHostRec.src.branch;
                                            }
							                if(origHostRec.grpConfName){
								                oneHost.grpConfName = origHostRec.grpConfName;
							                }
						                }
					                });
					                if (oneHost.hostname && oneHost.ip) {
						                renderedHosts[serviceName].ips[version].push(oneHost);
					                }
				                }
			                });
		                }
	                }
                }
            });

            if (Object.keys(renderedHosts).length > 0) {
                for (var sN in renderedHosts) {
                    currentScope.hosts[sN] = renderedHosts[sN];
	                for(var version in renderedHosts[sN].ips){
		                renderedHosts[sN].ips[version].forEach(function (oneHost) {
			                $timeout(function () {
				                executeHeartbeatTest(currentScope, env, oneHost);
			                }, 200);
		                });
	                }
                }
            }

            buildGroupsDisplay(renderedHosts);
        }

        function buildGroupsDisplay (renderedHosts) {
            currentScope.groups = {};
            for (var hostName in renderedHosts) {
                if (!renderedHosts[hostName].group || renderedHosts[hostName].group === "service" || renderedHosts[hostName].group === "daemon" || renderedHosts[hostName].group === "" || renderedHosts[hostName].group === "No Group Service") {
                    renderedHosts[hostName].group = "Misc. Services/Daemons";
                }
                if (currentScope.groups[renderedHosts[hostName].group]) {
                    currentScope.groups[renderedHosts[hostName].group].services.push(hostName);
                } else {
                    currentScope.groups[renderedHosts[hostName].group] = {
                        services: [],
                        showContent: true
                    };
                    currentScope.groups[renderedHosts[hostName].group].services.push(hostName);
                }
            }
        }
    }

    function executeHeartbeatTest(currentScope, env, oneHost) {
        getSendDataFromServer(currentScope, ngDataApi, {
            "method": "send",
            "routeName": "/dashboard/hosts/maintenanceOperation",
            "data": {
                "serviceName": oneHost.name,
                "operation": "heartbeat",
                "serviceHost": oneHost.ip,
                "servicePort": oneHost.port,
                "hostname": oneHost.hostname,
                "env": env
            }
        }, function (error, heartbeatResponse) {
            if (error) {
                updateServiceStatus(false);
                currentScope.generateNewMsg(env, 'danger', translation.errorExecutingHeartbeatTest[LANG] + " " + oneHost.name + " " + translation.onHostName[LANG] +" " + oneHost.hostname + " @ " + new Date().toISOString());
                updateServicesControllers(currentScope, env, oneHost);
            }
            else {
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
                    currentScope.generateNewMsg(env, 'success', translation.service[LANG] + " " +
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
    }

    function listNginxHosts(currentScope, env) {
        getSendDataFromServer(currentScope, ngDataApi, {
            method: 'get',
            routeName: '/dashboard/hosts/nginx/list',
            params: {
                env: env
            }
        }, function (error, response) {
            if (error) {
                currentScope.displayAlert('danger', error.message);
            }
            else {
                //collect network information to be displayed in UI
                currentScope.showNginxHosts = true;
                response.forEach(function (oneHost) {
                    if (oneHost.info && oneHost.info.NetworkSettings && oneHost.info.NetworkSettings.Networks) {
                        var network = Object.keys(oneHost.info.NetworkSettings.Networks)[0]; //only one network is available
                        oneHost.networkInfo = {
                            ip: oneHost.info.NetworkSettings.Networks[network].IPAddress,
                            ports: []
                        };
                    }
                });
                currentScope.nginxHosts = response;
            }
        });
    }

    function listServices(currentScope) {
        listHosts(currentScope, currentScope.envCode);
        listNginxHosts(currentScope, currentScope.envCode);
    }

    function deleteService(currentScope, serviceName, serviceVersion) {
        var params = {
            env: currentScope.envCode,
            name: serviceName,
            version: serviceVersion
        };

        overlayLoading.show();
        getSendDataFromServer(currentScope, ngDataApi, {
            method: 'get',
            routeName: '/dashboard/hacloud/services/delete',
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

    function scaleService(currentScope, serviceInfo, serviceVersion) {
        $modal.open({
            templateUrl: "scaleService.tmpl",
            size: 'm',
            backdrop: true,
            keyboard: true,
            controller: function ($scope, $modalInstance) {
                fixBackDrop();

                $scope.service = {
                    name: serviceInfo[0].serviceName, //all instances must have the same service name
                    version: serviceVersion,
                    env: currentScope.envCode,
                    currentScale: serviceInfo.length
                };
                $scope.title = $scope.service.name + ' | Scale Service';

                $scope.onSubmit = function () {
                    var params = {
                        envCode: $scope.service.env,
                        name: $scope.service.name,
                        version: $scope.service.version
                    };

                    var postData = {
                        scale: $scope.service.newScale
                    };

                    overlayLoading.show();
                    getSendDataFromServer(currentScope, ngDataApi, {
                        method: 'send',
                        routeName: '/dashboard/hacloud/services/scale',
                        params: params,
                        data: postData
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

    function reloadRegistry(currentScope, env, oneHost, cb) {
        getSendDataFromServer(currentScope, ngDataApi, {
            "method": "send",
            "routeName": "/dashboard/hosts/maintenanceOperation",
            "data": {
                "serviceName": oneHost.name,
                "operation": "reloadRegistry",
                "serviceHost": oneHost.ip,
                "servicePort": oneHost.port,
                "hostname": oneHost.hostname,
                "env": env
            }
        }, function (error, response) {
            if (error) {
                currentScope.generateNewMsg(env, 'danger', translation.errorExecutingReloadRegistryTest[LANG] + " " +
                    oneHost.name +
                    " " + translation.onIP[LANG] + " " +
                    oneHost.ip +
                    ":" +
                    oneHost.port +
                    " @ " +
                    new Date().toISOString());
            }
            else {
                if (cb) {
                    return cb();
                }
                else {
                    currentScope.registryInfo.push({
                        'label': oneHost.ip,
                        'entries': [
                            {
                                'label': 'Registry information for: ' + oneHost.taskName,
                                'name': oneHost.name,
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
                }
            }
        });
    }

    function reloadServiceRegistry (currentScope, source, service) {
        //reload registry for all service instances in parallel
        currentScope.registryInfo = [];
        if (source === 'controller') {
            service.forEach(function (oneServiceIp) {
                reloadRegistry(currentScope, currentScope.envCode, oneServiceIp);
            });
        }
        else {
            service.forEach(function (oneInstance) {
                reloadRegistry(currentScope, currentScope.envCode, oneInstance);
            });
        }

        var stopWatching = currentScope.$watchCollection('registryInfo', function () {
            if (currentScope.registryInfo.length === service.length) {
                stopWatching();
                var formConfig = angular.copy(environmentsConfig.form.multiServiceInfo);
                formConfig.entries[0].tabs = currentScope.registryInfo;
                var options = {
                    timeout: $timeout,
                    form: formConfig,
                    name: 'reloadRegistry',
                    label: "Reloaded Registry of " + service[0].serviceName,
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

    function loadProvisioning(currentScope, env, oneHost) {
        getSendDataFromServer(currentScope, ngDataApi, {
            "method": "send",
            "routeName": "/dashboard/hosts/maintenanceOperation",
            "data": {
                "serviceName": oneHost.name,
                "operation": "loadProvision",
                "serviceHost": oneHost.ip,
                "servicePort": oneHost.port,
                "hostname": oneHost.hostname,
                "env": env
            }
        }, function (error, response) {
            if (error) {
                currentScope.generateNewMsg(env, 'danger', translation.errorExecutingReloadRegistryTest[LANG] + " " +
                    oneHost.name +
                    " " + translation.onIP[LANG] + " " +
                    oneHost.ip +
                    ":" +
                    oneHost.port +
                    " @ " +
                    new Date().toISOString());
            }
            else {
                currentScope.provisionInfo.push({
                    'label': oneHost.ip,
                    'entries': [
                        {
                            'label': 'Provision information for: ' + oneHost.taskName,
                            'name': oneHost.name,
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
            }
        });
    }

    function loadServiceProvision (currentScope, source, service) {
        //reload provision for all service instances in parallel
        currentScope.provisionInfo = [];
        service.forEach(function (oneInstance) {
            loadProvisioning(currentScope, currentScope.envCode, oneInstance);
        });

        var stopWatching = currentScope.$watchCollection('provisionInfo', function () {
            if (currentScope.provisionInfo.length === service.length) {
                stopWatching();
                var formConfig = angular.copy(environmentsConfig.form.multiServiceInfo);
                formConfig.entries[0].tabs = currentScope.provisionInfo;
                var options = {
                    timeout: $timeout,
                    form: formConfig,
                    name: 'reloadProvision',
                    label: "Reloaded Provisioned Data of " + service[0].serviceName,
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

    function executeAwarenessTest(currentScope, env, oneHost) {
        getSendDataFromServer(currentScope, ngDataApi, {
            "method": "send",
            "routeName": "/dashboard/hosts/maintenanceOperation",
            "data": {
                "serviceName": oneHost.name,
                "operation": "awarenessStat",
                "serviceHost": oneHost.ip,
                "servicePort": oneHost.port,
                "hostname": oneHost.hostname,
                "env": env
            }
        }, function (error, awarenessResponse) {
            if (error || !awarenessResponse.result || !awarenessResponse.data) {
                currentScope.generateNewMsg(env, 'danger', translation.errorExecutingAwarnessTestControllerIP[LANG] + oneHost.ip + ":" + oneHost.port + " @ " + new Date().toISOString());
            }
            else {
                awarenessResponse = awarenessResponse.data.services;
                for (var oneService in awarenessResponse) {
                    if (awarenessResponse.hasOwnProperty(oneService)) {
                        if (oneService === 'controller') {
                            continue;
                        }

                        if (awarenessResponse[oneService].awarenessStats) {
                            var ips = Object.keys(awarenessResponse[oneService].awarenessStats);
                            ips.forEach(function (serviceIp) {
                                updateService(awarenessResponse, oneService, serviceIp);
                            });
                        }
                    }
                }
            }
        });

        function updateService(response, oneService, serviceIp) {
            var count = 0, max = 0;

            for(var version in currentScope.hosts[oneService].ips){
                for (var i = 0; i < currentScope.hosts[oneService].ips[version].length; i++) {
                    max++;
                    if (currentScope.hosts[oneService].ips[version][i].ip === serviceIp) {
                        if (response[oneService].awarenessStats[serviceIp].healthy) {
                            currentScope.hosts[oneService].ips[version][i].healthy = true;
                            currentScope.hosts[oneService].ips[version][i].color = 'green';
                        }
                        else {
                            currentScope.hosts[oneService].ips[version][i].healthy = false;
                            currentScope.hosts[oneService].ips[version][i].color = 'red';
                        }

                        var lc = response[oneService].awarenessStats[serviceIp].lastCheck;
                        currentScope.hosts[oneService].ips[version][i].lastCheck = getTimeAgo(lc);

                        if (response[oneService].awarenessStats[serviceIp].downSince) {
                            currentScope.hosts[oneService].ips[version][i].downSince = new Date(response[oneService].awarenessStats[serviceIp].downSince).toISOString();
                        }
                        if (response[oneService].awarenessStats[serviceIp].downCount) {
                            currentScope.hosts[oneService].ips[version][i].downCount = response[oneService].awarenessStats[serviceIp].downCount;
                        }

                        currentScope.hosts[oneService].ips[version][i].controllers.forEach(function (oneCtrl) {
                            if (oneCtrl.ip === oneHost.ip) {
                                oneCtrl.color = 'green';
                            }
                        });
                    }
                }


                currentScope.hosts[oneService].ips[version].forEach(function (oneIP) {
                    if (oneIP.healthy) {
                        count++;
                    }
                });
            }

            var healthy, color;
            if (count === max) {
            //if (count === currentScope.hosts[oneService].ips.length) {
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
            currentScope.hosts[oneService].healthy = healthy;
            currentScope.hosts[oneService].color = color;
            // currentScope.generateNewMsg(env, 'success', translation.awarenessTestControllerIP[LANG] + " " + oneHost.ip + ":" + oneHost.port + " " + translation.wasSuccesful[LANG] + " @ " + new Date().toISOString());
            currentScope.displayAlert('success', translation.awarenessTestControllerIP[LANG] + " " + oneHost.ip + ":" + oneHost.port + " " + translation.wasSuccesful[LANG] + " @ " + new Date().toISOString());
        }
    }

    function awarenessStat (currentScope, source, service) {
        //excute awareness test for all service instances in parallel
        service.forEach(function (oneServiceIp) {
            executeAwarenessTest(currentScope, currentScope.envCode, oneServiceIp);
        });
    }

    function hostLogs (currentScope, taskName) {
        overlayLoading.show();
        getSendDataFromServer(currentScope, ngDataApi, {
            method: "get",
            routeName: "/dashboard/hacloud/services/instances/logs",
            params: {
                env: currentScope.envCode,
                taskName: taskName
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
    }

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

    function executeHeartbeatTest(currentScope, env, oneHost) {
        getSendDataFromServer(currentScope, ngDataApi, {
            "method": "send",
            "routeName": "/dashboard/hosts/maintenanceOperation",
            "data": {
                "serviceName": oneHost.name,
                "operation": "heartbeat",
                "serviceHost": oneHost.ip,
                "servicePort": oneHost.port,
                "hostname": oneHost.hostname,
                "env": env
            }
        }, function (error, heartbeatResponse) {
            if (error) {
                updateServiceStatus(false);
                currentScope.displayAlert('danger', translation.errorExecutingHeartbeatTest[LANG] + " " + oneHost.name + " " + translation.onHostName[LANG] +" " + oneHost.hostname + " @ " + new Date().toISOString());
                updateServicesControllers(currentScope, env, oneHost);
            }
            else {
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

    function deployNewService (currentScope) {
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
                        method: 'send',
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
                        method: 'send',
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
                        'envCode': env,
                        "number": max,
                        "owner": currentScope.serviceOwner,
                        "repo": currentScope.serviceRepo,
                        "useLocalSOAJS": currentScope.useLocalSOAJS
                    };

                    if (currentScope.commit && !currentScope.confirmBranch) {
                        params.branch = getBranchFromCommit(currentScope.commit);
                        params.commit = currentScope.commit;
                    } else {
                        params.branch = currentScope.branch.name;
                        params.commit = currentScope.branch.commit.sha;
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

                    getSendDataFromServer(currentScope, ngDataApi, {
                        "method": "send",
                        "routeName": "/dashboard/hosts/deployController",
                        "data": params
                    }, function (error, response) {
                        if (error) {
                            currentScope.generateNewMsg(env, 'danger', error.message);
                            $modalInstance.close();
                        }
                        else {
                            getSendDataFromServer(currentScope, ngDataApi, {
                                "method": "send",
                                "routeName": "/dashboard/hosts/updateNginx",
                                "data": {
                                    'envCode': env
                                }
                            }, function (error, response) {
                                if (error) {
                                    currentScope.generateNewMsg(env, 'danger', error.message);
                                    $modalInstance.close();
                                }
                                else {
                                    $modalInstance.close();

                                    $timeout(function () {
                                        listHosts(currentScope, env);
                                    }, 2000);
                                }
                            });
                        }
                    });
                }

                function newService(currentScope, max) {
                    var params = {
                        'envCode': env,
                        'owner': currentScope.serviceOwner,
                        'repo': currentScope.serviceRepo,
                        'useLocalSOAJS': currentScope.useLocalSOAJS,
                        'haService': true,
                        'haCount': currentScope.replicaCount,
                        'memoryLimit': (currentScope.memoryLimit * 1048576), //converting to bytes
                        "imagePrefix": currentScope.imagePrefix,
                        "version": parseInt(currentScope.version)
                    };

                    if (currentScope.commit && !currentScope.confirmBranch) {
                        params.branch = getBranchFromCommit(currentScope.commit);
                        params.commit = currentScope.commit;
                    } else {
                        params.branch = currentScope.branch.name;
                        params.commit = currentScope.branch.commit.sha;
                    }

                    if (currentScope.service.gcId) {
                        params.gcName = currentScope.service.name;
                        params.gcVersion = currentScope.service.version;
                    } else {
                        params.name = currentScope.service.name;
                    }

                    currentScope.port = currentScope.service.port;

                    if (currentScope.envVariables && currentScope.envVariables !== '') {
                        params.variables = currentScope.envVariables.split(",");
                        for (var i = 0; i < params.variables.length; i++) {
                            params.variables[i] = params.variables[i].trim();
                        }
                    }

                    var config = {
                        "method": "send",
                        "routeName": "/dashboard/hosts/deployService",
                        "data": params
                    };

                    if (currentScope.groupConfig) {
                        config.routeName = "/dashboard/hosts/deployDaemon";
                        params.grpConfName = currentScope.groupConfig.daemonConfigGroup;
                    }

                    overlayLoading.show();
                    getSendDataFromServer(currentScope, ngDataApi, config, function (error, response) {
                        overlayLoading.hide();
                        if (error) {
                            currentScope.displayAlert('danger', error.message);
                            $modalInstance.close();
                        }
                        else {
                            currentScope.displayAlert('success', translation.newServiceHostsAdded[LANG]);
                            if (!runningHosts[currentScope.service.name]) {
                                runningHosts[currentScope.service.name] = {
                                    'name': currentScope.service.name,
                                    'port': currentScope.port,
                                    'ips': {},
                                    'color': 'red',
                                    'heartbeat': false
                                };
                            }

                            var hosttmpl = {
                                'port': currentScope.port,
                                'cid': response.cid,
                                'hostname': response.hostname,
                                'ip': response.ip,
                                'name': currentScope.service.name,
                                'downCount': 'N/A',
                                'downSince': 'N/A',
                                'lastCheck': 'N/A',
                                'healthy': true,
                                'color': 'red',
                                'controllers': []
                            };

                            response.controllers.forEach(function (oneCtrl) {
                                hosttmpl.controllers.push({
                                    'ip': oneCtrl.ip,
                                    'color': 'green',
                                    'lastCheck': 'N/A',
                                    'downSince': 'N/A',
                                    'downCount': 'N/A'
                                });
                            });

                            if (runningHosts[currentScope.service.name].ips[1]) {
                                runningHosts[currentScope.service.name].ips[1].push(hosttmpl);
                            } else {
                                runningHosts[currentScope.service.name].ips = {
                                    1: []
                                };
                                runningHosts[currentScope.service.name].ips[1].push(hosttmpl);
                            }

                            currentScope.displayAlert('success', 'New service deployed successfully and will be available in a few minutes');
                            $modalInstance.close();
                        }
                    });
                }

                function newNginx(currentScope) {
                    var params = {
                        envCode: env,
                        imagePrefix: currentScope.imagePrefix
                    };

                    if (currentScope.exposedPort) {
                        params.exposedPort = currentScope.exposedPort;
                    }

                    getSendDataFromServer(currentScope, ngDataApi, {
                        method: 'send',
                        routeName: '/dashboard/hosts/deployNginx',
                        data: params
                    }, function (error, response) {
                        if (error) {
                            $modalInstance.close();
                            currentScope.generateNewMsg(env, 'danger', error.message);
                        }
                        else {
                            $modalInstance.close();
                            currentScope.generateNewMsg(env, 'success', 'Nginx instance deployed successfully');
                            listNginxHosts(currentScope, env);
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
        'reloadServiceRegistry': reloadServiceRegistry,
        'loadServiceProvision': loadServiceProvision,
        'awarenessStat': awarenessStat,
        'executeHeartbeatTest': executeHeartbeatTest,
        'hostLogs': hostLogs,
        'deployNewService': deployNewService,
        'listNginxHosts': listNginxHosts,
        'checkCerts' : checkCerts
    };

}]);
