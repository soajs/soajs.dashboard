"use strict";
var hacloudServices = soajsApp.components;
hacloudServices.service('hacloudSrv', ['ngDataApi', '$timeout', '$modal', function (ngDataApi, $timeout, $modal) {

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
        var options = {
			timeout: $timeout,
			form: environmentsConfig.form.node,
			name: 'addNode',
			label: 'Add New Node',
			actions: [
				{
					'type': 'submit',
					'label': translation.submit[LANG],
					'btn': 'primary',
					'action': function (formData) {
						var postData = {
                            ip: formData.ip,
                            port: formData.port
                        };

                        getSendDataFromServer(currentScope, ngDataApi, {
                            "method": "send",
                            "routeName": "/dashboard/hacloud/nodes/add",
                            "data": postData
                        }, function (error, response) {
                            if (error) {
                                currentScope.displayAlert('danger', error.message);
                                currentScope.modalInstance.close();
        						currentScope.form.formData = {};
                            }
                            else {
                                currentScope.displayAlert('success', 'Node added successfully');
                                currentScope.modalInstance.close();
                                currentScope.form.formData = {};
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
                nodeId: nodeId
            }
        }, function (error, response) {
            if (error) {
                currentScope.displayAlert('danger', 'Unable to remove node');
            }
            else {
                currentScope.displayAlert('success', 'Node removed successfully');
                currentScope.listNodes();
            }
        });
    }

    function updateNode(currentScope, node, type, newStatus) {
        var params = {
            nodeId: node.id
        };

        var postData = {
            updateType: type,
            newStatus: newStatus
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
                    console.log (error);
                    // currentScope.generateNewMsg(env, 'danger', translation.unableRetrieveServicesHostsInformation[LANG]);
                }
                else {
	                currentScope.profile = response.profile;
	                currentScope.deployer = response.deployer;
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
                    // currentScope.generateNewMsg(env, 'danger', translation.controllers[LANG] + ' ' + defaultControllerHost.hostname + ' ' + translation.notHealthy[LANG] + '.');
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
                            console.log (error);
                            // currentScope.generateNewMsg(env, 'danger', translation.unableRetrieveServicesHostsInformation[LANG]);
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
                                            //TODO: add task name here
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

            console.log (renderedHosts);
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

            console.log (currentScope.groups);
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
                currentScope.generateNewMsg(env, 'danger', error.message);
            }
            else {
                //collect network information to be displayed in UI
                currentScope.showNginxHosts = true;
                response.forEach(function (oneHost) {
                    oneHost.networkInfo = {
                        ips: [],
                        ports: []
                    };
                    for (var network in oneHost.info.NetworkSettings.Networks) {
                        oneHost.networkInfo.ips.push({
                            networkName: network,
                            ipAdd: oneHost.info.NetworkSettings.Networks[network].IPAddress
                        });
                    }
                    for (var mappedPort in oneHost.info.NetworkSettings.Ports) {
                        if (oneHost.info.NetworkSettings.Ports[mappedPort] && mappedPort !== "443/tcp") {
                            oneHost.info.NetworkSettings.Ports[mappedPort].forEach (function (oneMapping) {
                                oneHost.networkInfo.ports.push({
                                    host: oneMapping.HostPort,
                                    container: mappedPort
                                });
                            });
                        }
                    }
                });
                currentScope.nginxHosts = response;
            }
        });
    }

    function listServices(currentScope) {
        listHosts(currentScope, currentScope.envCode);
        // listNginxHosts(currentScope, currentScope.env);
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
                    cb();
                }
                else {
                    var formConfig = angular.copy(environmentsConfig.form.serviceInfo);
                    formConfig.entries[0].value = response;
                    var options = {
            			timeout: $timeout,
            			form: formConfig,
            			name: 'reloadRegistry',
            			label: "Reloaded Registry of " + oneHost.name,
            			actions: [
            				{
            					'type': 'reset',
            					'label': translation.ok[LANG],
            					'btn': 'primary',
            					'action': function (formData) {
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
    }

    function reloadServiceRegistry (currentScope, source, service) {
        //reload registry for all service instances in parallel
        if (source === 'controller') {
            service.forEach(function (oneServiceIp) {
                reloadRegistry(currentScope, currentScope.envCode, oneServiceIp);
            });
        }
        else {
            var srvVersions = Object.keys(service.ips);
            srvVersions.forEach(function (oneSrvVersion) {
                service.ips[oneSrvVersion].forEach(function (oneInstance) {
                    reloadRegistry(currentScope, currentScope.envCode, oneInstance);
                });
            });
        }
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
                var formConfig = angular.copy(environmentsConfig.form.serviceInfo);
                formConfig.entries[0].value = response;
                var options = {
        			timeout: $timeout,
        			form: formConfig,
        			name: 'reloadProvision',
        			label: "Reloaded Provisioned Information of " + oneHost.name,
        			actions: [
        				{
        					'type': 'reset',
        					'label': translation.ok[LANG],
        					'btn': 'primary',
        					'action': function (formData) {
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

    function loadServiceProvision (currentScope, source, service) {
        //reload provision for all service instances in parallel
        var srvVersions = Object.keys(service.ips);
        srvVersions.forEach(function (oneSrvVersion) {
            service.ips[oneSrvVersion].forEach(function (oneInstance) {
                loadProvisioning(currentScope, currentScope.envCode, oneInstance);
            });
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

    return {
        'listNodes': listNodes,
        'addNode': addNode,
        'removeNode': removeNode,
        'updateNode': updateNode,
        'listServices': listServices,
        'reloadServiceRegistry': reloadServiceRegistry,
        'loadServiceProvision': loadServiceProvision,
        'awarenessStat': awarenessStat,
        'executeHeartbeatTest': executeHeartbeatTest
    };

}]);
