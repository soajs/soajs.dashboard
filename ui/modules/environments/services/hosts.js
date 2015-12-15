"use strict";
var hostsServices = soajsApp.components;
hostsServices.service('envHosts', ['ngDataApi', '$timeout', '$modal', '$compile', function (ngDataApi, $timeout, $modal, $compile) {

    function listHosts(currentScope, env, noPopulate) {
        var controllers = [];
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
                    currentScope.generateNewMsg(env, 'danger', 'Unable to retrieve services hosts information.');
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

                        for (var j = 0; j < response.hosts.length; j++) {
                            if (response.hosts[j].name === 'controller') {
                                controllers.push({
                                    'name': 'controller',
                                    'hostname': response.hosts[j].hostname,
                                    'ip': response.hosts[j].ip,
                                    'cid': response.hosts[j].cid,
                                    'color': 'red',
                                    'port': 4000
                                });

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
                    currentScope.generateNewMsg(env, 'danger', 'Controllers ' + defaultControllerHost.hostname + ' not healthy.');
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
                            currentScope.generateNewMsg(env, 'danger', 'Unable to retrieve services hosts information.');
                                                    }
                        else {
	                        response.data = response.data.services;
                            propulateServices(response.data);
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
	                oneService.hosts = oneService.hosts[oneService.hosts.latest];
	                if(Array.isArray(oneService.hosts) && oneService.hosts.length > 0){
		                if (serviceName !== 'controller') {
			                renderedHosts[serviceName] = {
				                'name': serviceName,
				                'port': regServices[serviceName].port,
				                'ips': [],
				                'color': 'red',
				                'healthy': false
			                };
		                }

		                regServices[serviceName].hosts.forEach(function (oneHostIP) {
			                if (serviceName !== 'controller') {
				                var oneHost = {
					                'controllers': controllers,
					                'ip': oneHostIP,
					                'name': serviceName,
					                'healthy': false,
					                'color': 'red',
					                'downCount': 'N/A',
					                'downSince': 'N/A',
					                'port': regServices[serviceName].port
				                };

				                currentScope.hostList.forEach(function (origHostRec) {
					                if (origHostRec.name === oneHost.name && origHostRec.ip === oneHost.ip) {
						                oneHost.hostname = origHostRec.hostname;
						                oneHost.cid = origHostRec.cid;
					                }
				                });
				                if (oneHost.hostname && oneHost.ip) {
					                renderedHosts[serviceName].ips.push(oneHost);
				                }
			                }
		                });
	                }
                }
            });

            if (Object.keys(renderedHosts).length > 0) {
                for (var sN in renderedHosts) {
                    currentScope.hosts[sN] = renderedHosts[sN];
                    renderedHosts[sN].ips.forEach(function (oneHost) {
                        $timeout(function () {
                            executeHeartbeatTest(currentScope, env, oneHost);
                        }, 200);
                    });
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
                currentScope.generateNewMsg(env, 'danger', "error executing heartbeat test for " + oneHost.name + " on hostname: " + oneHost.hostname + " @ " + new Date().toISOString());
                updateServicesControllers(currentScope, env, oneHost);
            }
            else {
                if (heartbeatResponse.result) {
                    for (var i = 0; i < currentScope.hosts[oneHost.name].ips.length; i++) {
                        if (currentScope.hosts[oneHost.name].ips[i].ip === oneHost.ip) {
                            currentScope.hosts[oneHost.name].ips[i].heartbeat = true;
                            currentScope.hosts[oneHost.name].ips[i].color = 'green';
                        }
                    }
                }
                updateServiceStatus(true);
                if (oneHost.name === 'controller') {
                    currentScope.generateNewMsg(env, 'success', "Service " +
                        oneHost.name +
                        " on hostname: " +
                        oneHost.hostname +
                        ":" +
                        oneHost.port +
                        " is healthy @ " +
                        new Date().toISOString() +
                        ", checking services please wait...");
                }
            }
        });

        function updateServiceStatus(healthyCheck) {
            var count = 0;
            var healthy = currentScope.hosts[oneHost.name].healthy;
            var color = currentScope.hosts[oneHost.name].color;
            var waitMessage = {};

            for (var i = 0; i < currentScope.hosts[oneHost.name].ips.length; i++) {
                if (oneHost.ip === currentScope.hosts[oneHost.name].ips[i].ip) {
                    if (healthyCheck) {
                        currentScope.hostList.forEach(function (origHostRec) {
                            if (origHostRec.name === oneHost.name && origHostRec.ip === oneHost.ip) {
	                            currentScope.hosts[oneHost.name].ips[i].hostname = origHostRec.hostname;
	                            currentScope.hosts[oneHost.name].ips[i].cid = origHostRec.cid;
                            }
                        });
                        if (oneHost.name === 'controller') {
	                        currentScope.hosts[oneHost.name].ips[i].heartbeat = true;
	                        currentScope.hosts[oneHost.name].ips[i].color = 'green';
                        }
                        else {
	                        currentScope.hosts[oneHost.name].ips[i].healthy = true;
	                        currentScope.hosts[oneHost.name].ips[i].color = 'green';
                            waitMessage = {
                                type: "success",
                                message: "Service " + oneHost.name + " on hostname: " + oneHost.hostname + ":" + oneHost.port + " is healthy @ " + new Date().toISOString(),
                                close: function (entry) {
                                    entry.waitMessage.type = '';
                                    entry.waitMessage.message = '';
                                }
                            };
                        }
                    }
                    else {
	                    currentScope.hosts[oneHost.name].ips[i].healthy = false;
	                    currentScope.hosts[oneHost.name].ips[i].heartbeat = false;
	                    currentScope.hosts[oneHost.name].ips[i].color = 'red';
                    }
                }
            }
            for (var j = 0; j < currentScope.hosts[oneHost.name].ips.length; j++) {
                if (currentScope.hosts[oneHost.name].ips[j].heartbeat || currentScope.hosts[oneHost.name].ips[j].healthy) {
                    count++;
                }
            }

            if (count === currentScope.hosts[oneHost.name].ips.length) {
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
    }

    function updateServicesControllers(currentScope, env, currentCtrl) {
        for (var serviceName in currentScope.hosts) {
            if (serviceName === 'controller') {
                continue;
            }

            if (currentScope.hosts[serviceName].ips && Array.isArray(currentScope.hosts[serviceName].ips) && currentScope.hosts[serviceName].ips.length > 0) {
	            currentScope.hosts[serviceName].ips.forEach(function (OneIp) {

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
                currentScope.generateNewMsg(env, 'danger', "error executing awareness test for controller on ip: " + oneHost.ip + ":" + oneHost.port + " @ " + new Date().toISOString());
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
            for (var i = 0; i < currentScope.hosts[oneService].ips.length; i++) {
                if (currentScope.hosts[oneService].ips[i].ip === serviceIp) {
                    if (response[oneService].awarenessStats[serviceIp].healthy) {
	                    currentScope.hosts[oneService].ips[i].healthy = true;
	                    currentScope.hosts[oneService].ips[i].color = 'green';
                    }
                    else {
	                    currentScope.hosts[oneService].ips[i].healthy = false;
	                    currentScope.hosts[oneService].ips[i].color = 'red';
                    }

                    var lc = response[oneService].awarenessStats[serviceIp].lastCheck;
	                currentScope.hosts[oneService].ips[i].lastCheck = getTimeAgo(lc);

                    if (response[oneService].awarenessStats[serviceIp].downSince) {
	                    currentScope.hosts[oneService].ips[i].downSince = new Date(response[oneService].awarenessStats[serviceIp].downSince).toISOString();
                    }
                    if (response[oneService].awarenessStats[serviceIp].downCount) {
	                    currentScope.hosts[oneService].ips[i].downCount = response[oneService].awarenessStats[serviceIp].downCount;
                    }

	                currentScope.hosts[oneService].ips[i].controllers.forEach(function (oneCtrl) {
                        if (oneCtrl.ip === oneHost.ip) {
                            oneCtrl.color = 'green';
                        }
                    });
                }
            }

            var count = 0;
	        currentScope.hosts[oneService].ips.forEach(function (oneIP) {
                if (oneIP.healthy) {
                    count++;
                }
            });
            var healthy, color;
            if (count === currentScope.hosts[oneService].ips.length) {
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
            currentScope.generateNewMsg(env, 'success', "Awareness test for controller on ip: " + oneHost.ip + ":" + oneHost.port + " was successful @ " + new Date().toISOString());
        }
    }

    //ok from down here
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
                currentScope.generateNewMsg(env, 'danger', "error executing Reload Registry test for " +
                    oneHost.name +
                    " on ip: " +
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
                    $modal.open({
                        templateUrl: "serviceInfoBox.html",
                        size: 'lg',
                        backdrop: true,
                        keyboard: false,
                        controller: function ($scope, $modalInstance) {
                            $scope.title = "Reloaded Registry of " + oneHost.name;
                            $scope.data = JSON.stringify(response, null, 2);
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
                currentScope.generateNewMsg(env, 'danger', "error executing Reload Provision test for " +
                    oneHost.name +
                    " on ip: " +
                    oneHost.ip +
                    ":" +
                    oneHost.port +
                    " @ " +
                    new Date().toISOString());
            }
            else {
                $modal.open({
                    templateUrl: "serviceInfoBox.html",
                    size: 'lg',
	                backdrop: true,
                    keyboard: false,
                    controller: function ($scope, $modalInstance) {
                        $scope.title = "Reloaded Provisioned Information of " + oneHost.name;
                        $scope.data = JSON.stringify(response, null, 2);
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

    function removeHost(currentScope, env, serviceName, oneHost) {
        getSendDataFromServer(currentScope, ngDataApi, {
            "method": "get",
            "routeName": "/dashboard/hosts/delete",
            "params": {'env': env, 'ip': oneHost.ip, 'name': oneHost.name, 'hostname': oneHost.hostname}
        }, function (error) {
            if (error) {
                currentScope.generateNewMsg(env, 'danger', error.message);
            }
            else {
                for (var i = 0; i < currentScope.hosts[serviceName].ips.length; i++) {
                    if (currentScope.hosts[serviceName].ips[i].ip === oneHost.ip) {
                        currentScope.hosts[serviceName].ips.splice(i, 1);
                    }
                }

                if (serviceName === 'controller') {
                    for (var s in currentScope.hosts) {
                        if (currentScope.hosts.hasOwnProperty(s) && s !== 'controller') {
                            for (var j = 0; j < currentScope.hosts[s].ips.length; j++) {
                                for (var k = 0; k < currentScope.hosts[s].ips[j].controllers.length; k++) {
                                    if (currentScope.hosts[s].ips[j].controllers[k].ip === oneHost.ip) {
                                        currentScope.hosts[s].ips[j].controllers.splice(k, 1);
                                    }
                                }
                            }
                        }
                    }

                    if (currentScope.hosts.controller.ips.length === 0) {
                        delete currentScope.hosts;
                    }
                }

                if (currentScope.hosts) {
                    currentScope.hosts.controller.ips.forEach(function (oneCtrl) {
                        reloadRegistry(currentScope, env, oneCtrl, function () {
                        });
                    });
                }
                currentScope.generateNewMsg(env, 'success', 'Selected Environment host has been removed.');
            }
        });
    }

    function infoHost(currentScope, env, serviceName, oneHost, serviceInfo) {

    }

    function hostLogs(currentScope, env, serviceName, oneHost, serviceInfo) {
        getSendDataFromServer(currentScope, ngDataApi, {
            "method": "send",
            "routeName": "/dashboard/hosts/maintenanceOperation",
            "data": {
                "serviceName": oneHost.name,
                "operation": "hostLogs",
                "serviceHost": oneHost.ip,
                "servicePort": oneHost.port,
                "hostname": oneHost.hostname,
                "env": env
            }
        }, function (error, response) {
            if (error) {
                serviceInfo.waitMessage.type = 'danger';
                serviceInfo.waitMessage.message = "error executing get Host Logs Operation for " +
                    oneHost.name +
                    " on ip: " +
                    oneHost.ip +
                    ":" +
                    oneHost.port +
                    " @ " +
                    new Date().toISOString();
                currentScope.closeWaitMessage(serviceInfo);
            }
            else {
                $modal.open({
                    templateUrl: "logBox.html",
                    size: 'lg',
                    backdrop: true,
                    keyboard: false,
                    windowClass: 'large-Modal',
                    controller: function ($scope, $modalInstance) {
                        $scope.title = "Host Logs of " + oneHost.name;
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

    function createHost(currentScope, env, services) {
        var servicesList = [], postServiceList = [];
        getSendDataFromServer(currentScope, ngDataApi, {
            "method": "send",
            "routeName": "/dashboard/services/list"
        }, function (error, services) {
            if (error || !services) {
                currentScope.generateNewMsg(env, 'danger', 'Unable to retrieve the list of services');
            }
            else {
                services.forEach(function (oneService) {
                    servicesList.push({'v': oneService.name, 'l': oneService.name});
                    var servObj = {
                        "name": oneService.name,
                        "image": oneService.image,
                        "port": oneService.port
                    };
                    if(oneService.gcId){
                        servObj = {
                            "name": oneService.name,
                            "gcName": oneService.name,
                            "gcVersion": oneService.gcV,
                            "image": oneService.image,
                            "port": oneService.port
                        };
                    }
                    postServiceList.push(servObj);
                });

	            if(env.toLowerCase() !== 'dashboard'){
                    //push controller
                    servicesList.unshift({"v": "controller", "l": "controller"});
	            }

                var entry = {
                    'name': 'service',
                    'label': 'Service Name',
                    'type': 'select',
                    'value': servicesList,
                    'fieldMsg': 'Select the service from the list above.',
                    'required': true
                };
                var hostForm = angular.copy(environmentsConfig.form.host);
                hostForm.entries.unshift(entry);

                hostForm.entries[3].value = hostForm.entries[3].value.replace("%envName%", env);
                hostForm.entries[3].value = hostForm.entries[3].value.replace("%profilePathToUse%", currentScope.profile);

                var options = {
                    timeout: $timeout,
                    form: hostForm,
                    name: 'createHost',
                    label: 'Create New Service Host',
                    actions: [
                        {
                            'type': 'submit',
                            'label': 'Submit',
                            'btn': 'primary',
                            'action': function (formData) {
                                var text = "<h2>Deploying new Host for " + formData.service + "</h2>";
                                text += "<p>Do not refresh this page, this will take a few minutes...</p>";
                                jQuery('#overlay').html("<div class='bg'></div><div class='content'>" + text + "</div>");
                                jQuery("#overlay .content").css("width", "40%").css("left", "30%");
                                overlay.show();

                                var max = formData.number;
                                if (formData.service === 'controller') {
                                    newController(formData, max);
                                }
                                else {
                                    newService(formData, max);
                                }
                            }
                        },
                        {
                            'type': 'reset',
                            'label': 'Cancel',
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

        function newController(formData, max) {
            var params = {
                'envCode': env,
                "number": max
            };

            if (formData.variables && formData.variables !== '') {
                params.variables = formData.variables.split(",");
                for (var i = 0; i < params.variables.length; i++) {
                    params.variables[i] = params.variables[i].trim();
                }
            }

            getSendDataFromServer(currentScope, ngDataApi, {
                "method": "send",
                "routeName": "/dashboard/hosts/deployController",
                "data": params
            }, function (error, response) {
	            overlay.hide();
                if (error) {
                    currentScope.generateNewMsg(env, 'danger', error.message);
                }
                else {
                    currentScope.modalInstance.close();
                    currentScope.form.formData = {};

                    $timeout(function () {
                        listHosts(currentScope, env);
                    }, 2000);
                }
            });
        }

        function newService(formData, max) {
            doDeploy(0, max, function () {
                overlay.hide();
                currentScope.modalInstance.close();
                currentScope.form.formData = {};

                currentScope.hosts.controller.ips.forEach(function (oneCtrl) {
                    reloadRegistry(currentScope, env, oneCtrl, function () {
                    });
                });
            });

            function doDeploy(counter, max, cb) {
                var params = {
                    'envCode': env
                };
                var port;
                for (var i = 0; i < postServiceList.length; i++) {
                    if (postServiceList[i].name === formData.service) {
                        if (postServiceList[i].gcName) {
                            params.gcName = postServiceList[i].gcName;
                            params.gcVersion = postServiceList[i].gcVersion;
                        }
                        else {
                            params.name = formData.service;
                        }
                        port = postServiceList[i].port;
                    }
                }

                if (formData.variables && formData.variables !== '') {
                    params.variables = formData.variables.split(",");
                    for (var i = 0; i < params.variables.length; i++) {
                        params.variables[i] = params.variables[i].trim();
                    }
                }

                getSendDataFromServer(currentScope, ngDataApi, {
                    "method": "send",
                    "routeName": "/dashboard/hosts/deployService",
                    "data": params
                }, function (error, response) {
                    if (error) {
	                    overlay.hide();
                        currentScope.generateNewMsg(env, 'danger', error.message);
                    }
                    else {
                        currentScope.generateNewMsg(env, 'success', "New Service Host(s) Added.");
                        if (!services[formData.service]) {
                            services[formData.service] = {
                                'name': formData.service,
                                'port': port,
                                'ips': [],
                                'color': 'red',
                                'heartbeat': false
                            };
                        }

                        var hosttmpl = {
                            'port': port,
                            'cid': response.cid,
                            'hostname': response.hostname,
                            'ip': response.ip,
                            'name': formData.service,
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
                        services[formData.service].ips.push(hosttmpl);

                        $timeout(function () {
                            currentScope.executeHeartbeatTest(env, hosttmpl);
                        }, 2000);

                        counter++;
                        if (counter === max) {
                            return cb();
                        }
                        else {
                            doDeploy(counter, max, cb);
                        }
                    }
                });
            }
        }
    }

    return {
        'listHosts': listHosts,
        'executeHeartbeatTest': executeHeartbeatTest,
        'executeAwarenessTest': executeAwarenessTest,
        'reloadRegistry': reloadRegistry,
        'loadProvisioning': loadProvisioning,
        'removeHost': removeHost,
        'hostLogs': hostLogs,
        'infoHost': infoHost,
        'createHost': createHost
    };

}]);