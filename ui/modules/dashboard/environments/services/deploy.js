"use strict";
var deployService = soajsApp.components;
deployService.service('deploySrv', ['ngDataApi', '$timeout', '$modal', function(ngDataApi, $timeout, $modal) {

    function deployEnvironment(currentScope) {
        var formConfig = angular.copy(environmentsConfig.form.deploy);
        var kubeConfig = environmentsConfig.deployer.kubernetes;
	    var envCode = currentScope.envCode;
        
        currentScope.isKubernetes = (currentScope.envDeployer.selected.split('.')[1] === "kubernetes");
        if(currentScope.isKubernetes){
            formConfig.entries[0].entries[1].min = kubeConfig.minPort;
            formConfig.entries[0].entries[1].max = kubeConfig.maxPort;
            formConfig.entries[0].entries[1].fieldMsg += ". Kubernetes port range: " + kubeConfig.minPort + " - " + kubeConfig.maxPort;
        }

        getControllerBranches(currentScope, function (branchInfo) {
            for (var i = 0; i < formConfig.entries.length; i++) {
                if (formConfig.entries[i].name === 'controllers') {
                    var ctrlEntries = formConfig.entries[i].entries;
                    for (var j = 0; j < ctrlEntries.length; j++) {
                        if (ctrlEntries[j].name === 'branch') {
                            branchInfo.branches.forEach(function (oneBranch) {
                                delete oneBranch.commit.url;
                                ctrlEntries[j].value.push({'v': oneBranch, 'l': oneBranch.name});
                            });
                        }
                    }
                }
            }

            var customUIEntry = {
                'name': 'useCustomUI',
                'label': 'Do you want to bundle static content?',
                'type': 'radio',
                'value': [{'v': true, 'l': 'Yes'}, {'v': false, 'l': 'No', 'selected': true}],
                'required': true,
                'onAction': function (label, selected, formConfig) {
                    if (selected === 'true' && (!formConfig.entries[0].entries[5] || formConfig.entries[0].entries[5].name !== 'selectCustomUI')) {
                        listStaticContent(currentScope, function (staticContentSources) {
                            var selectCustomUI = {
                                'name': 'selectCustomUI',
                                'label': 'Choose Static Content',
                                'type': 'select',
                                'value': [],
                                'required': true,
                                'onAction': function (label, selected, formConfig) {
                                    var selectUIBranch = {
                                        'name': 'selectUIBranch',
                                        'label': 'Choose Static Content Branch',
                                        'type': 'select',
                                        'value': [],
                                        'required': true
                                    };
                                    selected = JSON.parse(selected);
                                    overlayLoading.show();
                                    getSendDataFromServer(currentScope, ngDataApi, {
                                        method: 'get',
                                        routeName: '/dashboard/gitAccounts/getBranches',
                                        params: {
                                            name: selected.name,
                                            type: 'static'
                                        }
                                    }, function (error, response) {
                                        overlayLoading.hide();
                                        if (error) {
                                            currentScope.generateNewMsg(envCode, 'danger', error.message);
                                        }
                                        else {
                                            response.branches.forEach(function (oneBranch) {
                                                selectUIBranch.value.push({'v': oneBranch, 'l': oneBranch.name});
                                            });

                                            formConfig.entries[0].entries.splice(6, 0, selectUIBranch);
                                        }
                                    });
                                }
                            };
                            staticContentSources.forEach (function (oneSource) {
                                selectCustomUI.value.push ({'v': oneSource, 'l': oneSource.name});
                            });
                            formConfig.entries[0].entries.splice(5, 0, selectCustomUI);
                        });
                    } else if (selected === 'false' && formConfig.entries[0].entries[5].name === 'selectCustomUI') {
                        if (formConfig.entries[0].entries[6] && formConfig.entries[0].entries[6].name === 'selectUIBranch') {
                            formConfig.entries[0].entries.splice(6, 1);
                            delete formConfig.formData.selectUIBranch;
                        }
                        formConfig.entries[0].entries.splice(5, 1);
                        delete formConfig.formData.selectCustomUI;
                    }
                }
            };
            formConfig.entries[0].entries.splice(4, 0, customUIEntry);

            for (var i = 0; i < formConfig.entries[1].entries.length; i++) {
                if (formConfig.entries[1].entries[i].name === 'defaultENVVAR') {
                    formConfig.entries[1].entries[i].value = formConfig.entries[1].entries[i].value.replace("%envName%", envCode);
                    formConfig.entries[1].entries[i].value = formConfig.entries[1].entries[i].value.replace("%profilePathToUse%", currentScope.profile);
                }
            }

            var options = {
                timeout: $timeout,
                form: formConfig,
                name: 'deployEnv',
                label: translation.deployEnvironment[LANG] + ' ' + envCode,
                actions: [
                    {
                        'type': 'submit',
                        'label': translation.submit[LANG],
                        'btn': 'primary',
                        'action': function(formData) {
                            if(!formData.controllers || formData.controllers < 1) {
                                $timeout(function() {
                                    alert(translation.youMustChooseLeastControllerDeployEnvironment[LANG]);
                                }, 100);
                            }
                            else {
                                var text = "<h2>" + translation.deployingNew[LANG] + envCode + " Environment</h2>";
                                text += "<p>" +  translation.deploying[LANG] + formData.controllers + translation.newControllersEnvironment[LANG] + envCode + ".</p>";
                                text += "<p>" +  translation.deploying[LANG] + formData.nginxCount + translation.newNginxEnvironment[LANG] + envCode + ".</p>";
                                text += "<p>" + translation.doNotRefreshThisPageThisWillTakeFewMinutes[LANG] + "</p>";
                                text += "<div id='progress_deploy_" + envCode + "' style='padding:10px;'></div>";
                                jQuery('#overlay').html("<div class='bg'></div><div class='content'>" + text + "</div>");
                                jQuery("#overlay .content").css("width", "40%").css("left", "30%");
                                overlay.show();

                                formData.owner = branchInfo.owner;
                                formData.repo = branchInfo.repo;

                                deployEnvironment(formData);
                            }

                        }
                    },
                    {
                        'type': 'reset',
                        'label': translation.cancel[LANG],
                        'btn': 'danger',
                        'action': function() {
                            currentScope.modalInstance.dismiss('cancel');
                            currentScope.form.formData = {};
                        }
                    }
                ]
            };
            buildFormWithModal(currentScope, $modal, options);
        });
	    
        function deployEnvironment(formData) {
            //temp values for now///////////////////
            formData.ctrlReplMode = 'replicated';
            formData.nginxReplMode = 'replicated';
            ////////////////////////////////////////

            var branchObj = JSON.parse(formData.branch);
            var params = {
                env: envCode,
                type: 'service',
                name: 'controller',
                gitSource: {
                    owner: formData.owner,
                    repo: formData.repo,
                    branch: branchObj.name,
                    commit: branchObj.commit.sha
                },
                deployConfig: {
                    useLocalSOAJS: formData.useLocalSOAJS,
                    memoryLimit: formData.ctrlMemoryLimit * 1048576,
                    imagePrefix: formData.ctrlImagePrefix,
                    isKubernetes: (currentScope.isKubernetes ? true : false),
                    replication: {
                        mode: formData.ctrlReplMode
                    }
                },
                contentConfig: {}
            };

            if (formData.ctrlReplMode === 'replicated') {
                params.deployConfig.replication.replicas = formData.controllers;
            }

            if(formData.variables && formData.variables !== ''){
                params.variables = formData.variables.split(",");
                for(var i =0; i < params.variables.length; i++){
                    params.variables[i] = params.variables[i].trim();
                }
            }

            getSendDataFromServer(currentScope, ngDataApi, {
                "method": "post",
                "routeName": "/dashboard/cloud/services/soajs/deploy",
                "data": params
            }, function(error, response) {
                if(error) {
                    overlay.hide();
                    currentScope.form.displayAlert('danger', error.message);
                }
                else {
                    waitForControllers(function(){
	                    deployNginx(formData, params);
                    });
                }
            });
        }
        
        function waitForControllers(cb){
	        currentScope.listServices(function(){
		        console.log(currentScope);
		        if(currentScope.controllers.length > 0){
			        return cb();
		        }
		        else{
		        	$timeout(function(){
				        waitForControllers(cb);
			        }, 1500);
			        
		        }
	        });
        }

        function listStaticContent (currentScope, cb) {
            getSendDataFromServer(currentScope, ngDataApi, {
                'method': 'post',
                'routeName': '/dashboard/staticContent/list'
            }, function (error, response) {
                if (error) {
                    currentScope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
                } else {
                    cb(response);
                }
            });
        }

        function getControllerBranches (currentScope, cb) {
            overlayLoading.show();
            getSendDataFromServer(currentScope, ngDataApi, {
                method: 'get',
                routeName: '/dashboard/gitAccounts/getBranches',
                params: {
                    name: 'controller',
                    type: 'service'
                }
            }, function (error, response) {
                overlayLoading.hide();
                if (error) {
                    currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
                }
                else {
                    return cb (response);
                }
            });
        }
        
        function deployNginx(formData, params){
	        params.type = 'nginx';
	        delete params.name;
	        params.contentConfig.nginx = { supportSSL: (formData.supportSSL ? true : false) };
	        params.deployConfig.memoryLimit = (formData.nginxMemoryLimit * 1048576);
	        params.deployConfig.imagePrefix = formData.nginxImagePrefix;
	        params.deployConfig.replication = {
		        mode: formData.nginxReplMode
	        };
	
	        if (formData.nginxReplMode === 'replicated') {
		        params.deployConfig.replication.replicas = formData.nginxCount;
	        }
	
	        params.deployConfig.ports = [
		        {
			        isPublished: true,
			        published: formData.exposedPort
		        }
	        ];
	
	        if (formData.useCustomUI) {
		        formData.selectUIBranch = JSON.parse(formData.selectUIBranch);
		        formData.selectCustomUI = JSON.parse(formData.selectCustomUI);
		
		        params.contentConfig.nginx.ui = {
			        id: formData.selectCustomUI._id,
			        branch: formData.selectUIBranch.name,
			        commit: formData.selectUIBranch.commit.sha
		        };
	        }
	
	        getSendDataFromServer(currentScope, ngDataApi, {
		        "method": "post",
		        "routeName": "/dashboard/cloud/services/soajs/deploy",
		        "data": params
	        }, function(error, response) {
		        if(error) {
			        currentScope.form.displayAlert('danger', error.message);
			        overlay.hide();
		        }
		        else {
			        currentScope.modalInstance.dismiss("ok");
			        overlay.hide(function(){
				
				        currentScope.isDeploying = true;
				        $timeout(function () {
					        currentScope.listServices();
				        }, 15000);
			        });
		        }
	        });
        }
    }

    /**
     * Deploy New service/daemon
     * @param currentScope
     */
    function deployNewService (currentScope) {
        currentScope.deploymentModes = ['replicated', 'global'];
        currentScope.mode='replicated';
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

                $scope.getDaemons = function (cb) {
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
                            return cb();
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

                    if (!currentScope.service || (currentScope.service.type !== 'nginx' && (!currentScope.branch || (currentScope.mode === "replicated" && !currentScope.number)))) {
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
                                newController(currentScope);
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
                        return filterServiceInfo(service);
                    } else if (env.toLowerCase() !== 'dashboard' &&
                        // service.name !== 'controller' && //controller is added later manually
                        ((dashboardServices.indexOf(service.name) !== -1 && nonDashboardServices.indexOf(service.name) !== -1) || //not a locked service for dashboard and non dashboard environments
                        (dashboardServices.indexOf(service.name) === -1 && nonDashboardServices.indexOf(service.name) === -1))) { //a locked service that is common for dashboard and non dash envs (urac, oauth)
                        return filterServiceInfo(service);
                    }
                    return false;
                }

                //filter out service information that already exist
                function filterServiceInfo(service) {
                    if(!service.group)
                        return false;
                    else {
                        var serviceVersions = Object.keys(service.versions);
                        var deployedServices = currentScope.hosts.soajs.groups[service.group].list;
                        //Loop over the deployed services, and remove from the service, the service versions that are already deployed
                        serviceVersions.forEach(function (version) {
                            for(var i = 0; i < deployedServices.length; i++){
                                //if a version of that service is found to be deployed, delete it from the service information
                                if(service.name === deployedServices[i].labels['soajs.service.name'] && version == deployedServices[i].labels['soajs.service.version']) {
                                    delete service.versions[version];
                                }
                            }
                        });
                        //if all the versions of the service are found to be deployed, return false
                        //else, return true, after having removed the deployed versions
                        if(Object.keys(service.versions).length === 0)
                            return false;
                        else
                            return true;
                    }
                }

                function newController(currentScope) {
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
                            "replicas": currentScope.number,
                        }
                    };

                    getSendDataFromServer(currentScope, ngDataApi, {
                        "method": "post",
                        "routeName": "dashboard/cloud/services/soajs/deploy",
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

                function newService(currentScope) {
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
                            "replicas": currentScope.number
                        }
                    };

                    var config = {
                        "method": "post",
                        "routeName": "/dashboard/cloud/services/soajs/deploy",
                        "data": params
                    };
                    overlayLoading.show();
                    getSendDataFromServer(currentScope, ngDataApi, config, function (error, response) {
                        overlayLoading.hide();
                        if (error) {
                            console.log(JSON.stringify(error))
                            currentScope.displayAlert('danger', error.message);
                            $modalInstance.close();
                        }
                        else {
                            currentScope.displayAlert('success', 'New service deployed successfully and will be available in a few minutes');
                            $timeout(function(){
                                currentScope.listServices();
                            }, 1500);

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
                            "replicas": max,
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
                        routeName: 'dashboard/cloud/services/soajs/deploy',
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
                if (currentScope.hosts && currentScope.controllers) {
                    $scope.getServices(function () {
                        $scope.getDaemons(function () {
                            if(currentScope.services.length === 0) {
                                currentScope.generateNewMsg(env, 'danger', "There are no new services to deploy");
                                $modalInstance.close();
                            }
                        });
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
        'deployEnvironment': deployEnvironment,
        'deployNewService': deployNewService
    }
}]);
