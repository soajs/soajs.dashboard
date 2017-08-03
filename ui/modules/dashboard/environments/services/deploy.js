"use strict";
var deployService = soajsApp.components;
deployService.service('deploySrv', ['ngDataApi', '$timeout', '$modal', function (ngDataApi, $timeout, $modal) {

	function injectCatalogInputs(formConfig, recipes, opts){
		var mainLevel = opts.mainLevel;
		var subLevel = opts.subLevel;
		var initialCount = opts.initialCount;
		var type = opts.type;

		formConfig.entries[mainLevel].entries[subLevel].onAction = function(id, data, form){

			//reset form entries
			form.entries[mainLevel].entries.length = initialCount;

			//append the custom catalog inputs
			recipes.forEach(function(oneRecipe){
				if(oneRecipe.type === type &&  oneRecipe._id === data){
					if(oneRecipe.recipe.deployOptions.image.override){
						//append images
						form.entries[mainLevel].entries.push({
							'name': '_ci_' + type + "ImagePrefix",
							'label': "Image Prefix",
							'type': 'text',
							'value': oneRecipe.recipe.deployOptions.image.prefix,
							'fieldMsg': "Override the image prefix if you want"
						});
						form.formData['_ci_' + type + "ImagePrefix"] = oneRecipe.recipe.deployOptions.image.prefix;

						form.entries[mainLevel].entries.push({
							'name': '_ci_' + type + "ImageName",
							'label': "Image Name",
							'type': 'text',
							'value': oneRecipe.recipe.deployOptions.image.name,
							'fieldMsg': "Override the image name if you want"
						});
						form.formData['_ci_' + type + "ImageName"] = oneRecipe.recipe.deployOptions.image.name;

						form.entries[mainLevel].entries.push({
							'name': '_ci_' + type + "ImageTag",
							'label': "Image Tag",
							'type': 'text',
							'value': oneRecipe.recipe.deployOptions.image.tag,
							'fieldMsg': "Override the image tag if you want"
						});
						form.formData['_ci_' + type + "ImageTag"] = oneRecipe.recipe.deployOptions.image.tag;
					}

					//append inputs whose type is userInput
					for(var envVariable in oneRecipe.recipe.buildOptions.env){
						if(oneRecipe.recipe.buildOptions.env[envVariable].type === 'userInput'){

							//push a new input for this variable
							var newInput = {
								'name': '_ci_' + type + "_" + envVariable,
								'label': oneRecipe.recipe.buildOptions.env[envVariable].label || envVariable,
								'type': 'text',
								'value': oneRecipe.recipe.buildOptions.env[envVariable].default || '',
								'fieldMsg': oneRecipe.recipe.buildOptions.env[envVariable].fieldMsg
							};

							if(!oneRecipe.recipe.buildOptions.env[envVariable].default || oneRecipe.recipe.buildOptions.env[envVariable].default === ''){
								newInput.required = true;
							}

							form.entries[mainLevel].entries.push(newInput);
							form.formData['_ci_' + type + "_" + envVariable] = oneRecipe.recipe.buildOptions.env[envVariable].default || '';
						}
					}

					if(oneRecipe.recipe.deployOptions.specifyGitConfiguration && opts.deployment && opts.deployment.type === 'environment'){
						var newInput = {
							'name': 'branch',
							'label': 'Branch',
							'type': 'select',
							'value': [],
							'fieldMsg': 'Select a branch to deploy from',
							'required': true
						};

		                opts.deployment.data.branches.forEach(function (oneBranch) {
		                    delete oneBranch.commit.url;
			                newInput.value.push({'v': oneBranch, 'l': oneBranch.name});
		                });
						form.entries[mainLevel].entries.push(newInput);
					}
				}
			});
		};
	}

    /**
     * Deploy New Environment controller + Nginx
     * @param currentScope
     */
    function deployEnvironment(currentScope) {
        var formConfig = angular.copy(environmentsConfig.form.deploy);
        var kubeConfig = environmentsConfig.deployer.kubernetes;
        var envCode = currentScope.envCode;

        currentScope.isKubernetes = (currentScope.envDeployer.selected.split('.')[1] === "kubernetes");
        if (currentScope.isKubernetes) {
            formConfig.entries[0].entries[0].value = [
                {l: 'Deployment', v: 'deployment', 'selected': true},
                {l: 'Daemonset', v: 'daemonset'}
            ];

            formConfig.entries[1].entries[0].value = [
                {l: 'Deployment', v: 'deployment', 'selected': true},
                {l: 'Daemonset', v: 'daemonset'}
            ];
        }

        formConfig.entries[0].entries[0].onAction = function (id, data, form) {
            if (data === 'global' || data === 'daemonset') {
                form.entries[0].entries[1].disabled = true;
                form.entries[0].entries[1].required = false;
            }
            else {
                delete form.entries[0].entries[1].disabled;
                form.entries[0].entries[1].required = true;
            }
        };

        formConfig.entries[1].entries[0].onAction = function (id, data, form) {
            if (data === 'global' || data === 'daemonset') {
                form.entries[1].entries[1].disabled = true;
                form.entries[1].entries[1].required = false;
            }
            else {
                delete form.entries[1].entries[1].disabled;
                form.entries[1].entries[1].required = true;
            }
        };

        getControllerBranches(currentScope, function (branchInfo) {
            getCatalogRecipes(currentScope, function (recipes) {
                // adding available recipes to form
                recipes.forEach(function (oneRecipe) {
                    if (oneRecipe.type === 'soajs' && oneRecipe.subtype === 'service') {
                        formConfig.entries[1].entries[3].value.push({ l: oneRecipe.name, v: oneRecipe._id });
	                    injectCatalogInputs(formConfig, recipes, {
		                    mainLevel : 1,
	                        subLevel: 3,
	                        initialCount: 4,
	                        type: 'soajs',
		                    deployment: {
		                    	type: "environment",
			                    data: branchInfo
		                    }
	                    });
                    }
                    else if (oneRecipe.type === 'nginx') {
                        formConfig.entries[0].entries[3].value.push({ l: oneRecipe.name, v: oneRecipe._id });
	                    injectCatalogInputs(formConfig, recipes, {
		                    mainLevel : 0,
		                    subLevel: 3,
		                    initialCount: 4,
		                    type: 'nginx'
	                    });
                    }
                });

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
                            'action': function (formData) {
                                if ((!formData.controllers || formData.controllers < 1) && (formData.controllerDeploymentMode === 'replicated' || formData.controllerDeploymentMode === 'deployment')) {
                                    $timeout(function () {
                                        alert(translation.youMustChooseLeastControllerDeployEnvironment[LANG]);
                                    }, 100);
                                }
                                else {
                                    var text = "<h2>" + translation.deployingNew[LANG] + envCode + " Environment</h2>";
                                    text += "<p>" + translation.deploying[LANG] + formData.controllers + translation.newControllersEnvironment[LANG] + envCode + ".</p>";
                                    text += "<p>" + translation.deploying[LANG] + formData.nginxCount + translation.newNginxEnvironment[LANG] + envCode + ".</p>";
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
                            'action': function () {
                                currentScope.modalInstance.dismiss('cancel');
                                currentScope.form.formData = {};
                            }
                        }
                    ]
                };
                buildFormWithModal(currentScope, $modal, options);
            });
        });

        function deployEnvironment(formData) {
            var branchObj = JSON.parse(formData.branch);

            var params = {
                proxy: false,
                env: envCode,
	            custom: {
		            type: 'service',
		            name: 'controller',
	            },
                recipe: formData.ctrlRecipe,
                gitSource: {
                    owner: formData.owner,
                    repo: formData.repo,
                    branch: branchObj.name,
                    commit: branchObj.commit.sha
                },
                deployConfig: {
                    memoryLimit: formData.ctrlMemoryLimit * 1048576,
                    isKubernetes: (currentScope.isKubernetes ? true : false),
                    replication: {
                        mode: formData.controllerDeploymentMode
                    },
                }
            };

            if (formData.controllerDeploymentMode === 'replicated' || formData.nginxDeploymentMode === 'deployment') {
                params.deployConfig.replication.replicas = formData.controllers;
            }

            if (params.deployConfig.isKubernetes) {
                if (params.deployConfig.replication.mode === 'replicated') {
                    params.deployConfig.replication.mode = "deployment";
                }
                if (params.deployConfig.replication.mode === 'global') {
                    params.deployConfig.replication.mode = "daemonset";
                    delete params.deployConfig.replication.replicas;
                }
            }

            if(formData['_ci_serviceImageName'] && formData['_ci_serviceImagePrefix'] && formData['_ci_serviceImageTag']){
	            params.custom['image'] = {
		            name: formData['_ci_serviceImageName'],
		            prefix: formData['_ci_serviceImagePrefix'],
		            tag: formData['_ci_serviceImageTag']
	            };
            }

            var excludes = ['_ci_serviceImageName', '_ci_serviceImagePrefix', '_ci_serviceImageTag'];
            for( var input in formData){
            	if(input.indexOf('_ci_service') !== -1 && excludes.indexOf(input) === -1){
		            if(!params.custom.env){
			            params.custom.env = {};
		            }
		            params.custom.env[input.replace('_ci_service_', '')] = formData[input];
	            }
            }

            getSendDataFromServer(currentScope, ngDataApi, {
                "method": "post",
                "routeName": "/dashboard/cloud/services/soajs/deploy",
                "data": params
            }, function (error, response) {
                if (error) {
                    overlay.hide();
                    currentScope.form.displayAlert('danger', error.message);
                }
                else {
                    waitForControllers(function () {
                        deployNginx(formData, params);
                    });
                }
            });
        }

        function waitForControllers(cb) {
            currentScope.listServices(function () {
                if (currentScope.controllers.length > 0) {
                    return cb();
                }
                else {
                    $timeout(function () {
                        waitForControllers(cb);
                    }, 1500);

                }
            });
        }

        function getControllerBranches(currentScope, cb) {
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
                    return cb(response);
                }
            });
        }

        function deployNginx(formData, params) {
            //save controller deployment mode in case needed later for rollback
            currentScope.controller = { mode: params.deployConfig.replication.mode };

            params.custom = {
            	"type": "nginx",
	            "name": "nginx"
            };

            params.recipe = formData.nginxRecipe;
            params.deployConfig.memoryLimit = (formData.nginxMemoryLimit * 1048576);
            params.deployConfig.replication = {
                mode: formData.nginxDeploymentMode
            };

            if (formData.nginxDeploymentMode === 'replicated' || formData.nginxDeploymentMode === 'deployment') {
                params.deployConfig.replication.replicas = formData.nginxCount;
            }

            if (params.deployConfig.isKubernetes) {
                if (params.deployConfig.replication.mode === 'replicated') {
                    params.deployConfig.replication.mode = "deployment";
                }
                if (params.deployConfig.replication.mode === 'global') {
                    params.deployConfig.replication.mode = "daemonset";
                    delete params.deployConfig.replication.replicas;
                }
            }

            //inject user input catalog entry and image override
	        if(formData['_ci_nginxImageName'] && formData['_ci_nginxImagePrefix'] && formData['_ci_nginxImageTag']){
		        params.custom['image'] = {
			        name: formData['_ci_nginxImageName'],
			        prefix: formData['_ci_nginxImagePrefix'],
			        tag: formData['_ci_nginxImageTag']
		        };
	        }

	        var excludes = ['_ci_nginxImageName', '_ci_nginxImagePrefix', '_ci_nginxImageTag'];
	        for( var input in formData){
		        if(input.indexOf('_ci_nginx_') !== -1 && excludes.indexOf(input) === -1){
			        if(!params.custom.env){
				        params.custom.env = {};
			        }
			        params.custom.env[input.replace('_ci_nginx_', '')] = formData[input];
		        }
	        }

            getSendDataFromServer(currentScope, ngDataApi, {
                "method": "post",
                "routeName": "/dashboard/cloud/services/soajs/deploy",
                "data": params
            }, function (error, response) {
                if (error) {
                    currentScope.form.displayAlert('danger', error.message);
                    rollbackController();
                    overlay.hide();
                }
                else {
                    currentScope.modalInstance.dismiss("ok");
                    overlay.hide(function () {

                        currentScope.isDeploying = true;
                        $timeout(function () {
                            currentScope.listServices();
                        }, 1500);
                    });
                }
            });
        }

        function rollbackController() {
            var params = {
                env: currentScope.envCode,
                serviceId: currentScope.envCode.toLowerCase() + "-controller",
                mode: currentScope.controller.mode
            };

            getSendDataFromServer(currentScope, ngDataApi, {
                method: 'delete',
                routeName: '/dashboard/cloud/services/delete',
                params: params
            }, function (error, response) {
                if (error) {
                    currentScope.displayAlert('danger', error.message);
                }
            });
        }
    }

    /**
     * Deploy New controller/service/daemon
     * @param currentScope
     */
    function deployNewService(currentScope) {
        if (currentScope.envPlatform.toLowerCase() === 'kubernetes') {
            currentScope.deploymentModes = ['deployment', 'daemonset'];
            currentScope.mode = 'deployment';
        }
        else {
            currentScope.deploymentModes = ['replicated', 'global'];
            currentScope.mode = 'replicated';
        }

        var env = currentScope.envCode;
        var runningHosts = currentScope.hosts;

        currentScope.isKubernetes = (currentScope.envDeployer.selected.split('.')[1] === "kubernetes");
        currentScope.services = [];
        currentScope.service = "";
        currentScope.versions = [];
        currentScope.version = "";
        currentScope.groupConfigs = "";
        currentScope.groupConfig = "";
        currentScope.branches = [];
        currentScope.branch = "";
        currentScope.recipes = [];
        currentScope.recipe = "";
        currentScope.serviceOwner = '';
        currentScope.serviceRepo = '';
        currentScope.envVariables = '';
        currentScope.conflict = false;
        currentScope.loadingBranches = false;
        delete currentScope.conflictCommits;
        currentScope.confirmBranch = '';
        delete currentScope.replicaCount;
        delete currentScope.exposedPort;
        currentScope.memoryLimit = 500;
		currentScope.name = '';
        currentScope.useLocalSOAJS = true;
        currentScope.message = {};
        currentScope.defaultEnvVariables = "<ul><li>SOAJS_DEPLOY_HA=true</li><li>SOAJS_SRV_AUTOREGISTERHOST=true</li><li>NODE_ENV=production</li><li>SOAJS_ENV=" + currentScope.envCode + "</li><li>SOAJS_PROFILE=" + currentScope.profile + "</li></ul></p>";
        currentScope.imagePrefix = 'soajsorg';

        if (currentScope.isKubernetes) {
            currentScope.readinessProbe = { //NOTE: default values are set here
                initialDelaySeconds: 15,
                timeoutSeconds: 1,
                periodSeconds: 10,
                successThreshold: 1,
                failureThreshold: 3
            };
        }

        function openModalForm() {
            $modal.open({
                templateUrl: "deployNewService.tmpl",
                size: 'lg',
                backdrop: true,
                keyboard: true,
                controller: function ($scope, $modalInstance) {
                    fixBackDrop();
	                currentScope.allowGitOverride = false;
                    $scope.title = 'Deploy New Resource';
                    $scope.imagePath = 'themes/' + themeToUse + '/img/loading.gif';
                    $scope.currentScope = currentScope;

	                $scope.myRecipes = [];
	                for(var type in currentScope.recipes){
		                $scope.myRecipes = $scope.myRecipes.concat(currentScope.recipes[type]);
	                }

	                delete currentScope._ci_serviceImagePrefix;
	                delete currentScope._ci_serviceImageName;
	                delete currentScope._ci_serviceImageTag;
	                currentScope.custom = {};

                    $scope.selectService = function (service) {

                        if (service.name === 'controller') {
                            currentScope.versions = [1];
                        }
                        else {
                            currentScope.versions = Object.keys(service.versions);
                        }

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

                        if (service && service.prerequisites && service.prerequisites.memory) {
                            currentScope.memoryLimit = service.prerequisites.memory;
                        }

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
                                'type': service.type
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

                        // if (!currentScope.service || (currentScope.service.type !== 'nginx' && (!currentScope.branch || ((currentScope.mode === "replicated" || currentScope.mode === "deployment") && !currentScope.number)))) {
                        //     currentScope.message.danger = "Please select a service, branch, and number of instances";
                        //     $timeout(function () {
                        //         currentScope.message.danger = "";
                        //     }, 5000);
                        // }
                        // else if (currentScope.conflictCommits && Object.keys(currentScope.conflictCommits).length > 0 && !currentScope.commit && !currentScope.confirmBranch) {
                        //     currentScope.message.danger = "Please select a commit to deploy from or confirm deployment from new branch";
                        //     $timeout(function () {
                        //         currentScope.message.danger = "";
                        //     }, 5000);
                        // }
                        // else {

                            if (currentScope.service && currentScope.service.prerequisites && currentScope.service.prerequisites.memory) {
                                if (currentScope.memoryLimit < currentScope.service.prerequisites.memory) {
                                    currentScope.message.danger = "Please specify a memory limit that is greater than or equal to the service's memory prerequisite (" + currentScope.service.prerequisites.memory + " MB)";
                                    $timeout(function () {
                                        currentScope.message.danger = "";
                                    }, 5000);

                                    return;
                                }
                            }

                            doDeploy(currentScope);
                        // }
                    };

                    $scope.closeModal = function () {
                        $modalInstance.close();
                    };

                    $scope.injectCatalogEntries = function(){
	                    currentScope.allowGitOverride = false;
                    	for(var type in currentScope.recipes){
                    		currentScope.recipes[type].forEach(function(catalogRecipe){
                    			if(catalogRecipe._id === currentScope.recipe){

                    				if(catalogRecipe.recipe.deployOptions.image.override){
					                    currentScope._ci_serviceImagePrefix = catalogRecipe.recipe.deployOptions.image.prefix;
					                    currentScope._ci_serviceImageName = catalogRecipe.recipe.deployOptions.image.name;
					                    currentScope._ci_serviceImageTag = catalogRecipe.recipe.deployOptions.image.tag;
				                    }

				                    //append inputs whose type is userInput
				                    for(var envVariable in catalogRecipe.recipe.buildOptions.env){
					                    if(catalogRecipe.recipe.buildOptions.env[envVariable].type === 'userInput'){
						                    var newCatalogInput = {
						                    	label : catalogRecipe.recipe.buildOptions.env[envVariable].label || envVariable,
							                    name: "_ci_service_" + envVariable,
							                    value: catalogRecipe.recipe.buildOptions.env[envVariable].default || "",
							                    fieldMsg: catalogRecipe.recipe.buildOptions.env[envVariable].fieldMsg,
							                    required: (catalogRecipe.recipe.buildOptions.env[envVariable].default && catalogRecipe.recipe.buildOptions.env[envVariable].default !== '') ? false : true
						                    };
						                    currentScope.custom["_ci_service_" + envVariable] = newCatalogInput;
						                    currentScope["_ci_service_" + envVariable] = catalogRecipe.recipe.buildOptions.env[envVariable].default || "";
					                    }
				                    }

				                    // if(catalogRecipe.recipe.deployOptions.specifyGitConfiguration){
					                 //    currentScope.service = '';
					                 //    currentScope.version = '';
					                 //    currentScope.groupConfig = '';
					                 //    currentScope.branch = '';
				                    //
					                 //    // currentScope.allowGitOverride = true;
					                 //    getServices(function () {
						             //        getDaemons(function () {
							         //            if (Object.keys(currentScope.services).length === 0) {
								     //                currentScope.generateNewMsg(env, 'danger', "There are no new services to deploy");
							         //            }
							         //            else {
							         //            	currentScope.allowGitOverride = true;
							         //            }
						             //        });
					                 //    });
				                    // }
			                    }
		                    });
	                    }
                    };

	                function doDeploy(currentScope) {

		                var params = {
			                'env': env,
			                'custom':{
				                'name': currentScope.service.name,
				                'type': 'service',
				                "version": parseInt(currentScope.version) || 1
			                },
			                'recipe': currentScope.recipe
		                };

						if(currentScope.name) {
							params.custom.name = currentScope.name;
						}

		                if(currentScope.serviceOwner && currentScope.serviceRepo){
			                params.gitSource = {
				                "owner": currentScope.serviceOwner,
				                "repo": currentScope.serviceRepo,
			                };

			                if(currentScope.branch){
				                if (currentScope.commit && !currentScope.confirmBranch) {
					                params.gitSource.branch = getBranchFromCommit(currentScope.commit);
					                params.gitSource.commit = currentScope.commit;
				                } else {
					                params.gitSource.branch = currentScope.branch.name;
					                if(currentScope.branch.commit.sha){
						                params.gitSource.commit = currentScope.branch.commit.sha;
					                }
				                }
			                }
		                }

		                if (currentScope.service.latest) {
			                params.version = parseInt(currentScope.service.latest) || 1;
		                }

		                if (currentScope.service.gcId) {
			                params.custom.gc = {
				                "gcName": currentScope.service.name,
				                "gcVersion": currentScope.service.version
			                }

		                }

		                if (currentScope.groupConfig) {
			                params.custom.type = 'daemon';
			                params.custom.daemonGroup = currentScope.groupConfig.daemonConfigGroup;
		                }

		                //Fill deployConfig information
		                params.deployConfig = {
			                'isKubernetes': currentScope.isKubernetes,
			                'memoryLimit': (currentScope.memoryLimit * 1048576), //converting to bytes
			                "replication": {
				                "mode": currentScope.mode,
				                "replicas": currentScope.number
			                }
		                };

		                if (params.deployConfig.isKubernetes) {
			                if (params.deployConfig.replication.mode === 'replicated') {
				                params.deployConfig.replication.mode = "deployment";
			                }
			                if (params.deployConfig.replication.mode === 'global') {
				                params.deployConfig.replication.mode = "daemonset";
				                delete params.deployConfig.replication.replicas;
			                }
		                }

		                //inject user input catalog entry and image override
		                if(currentScope['_ci_serviceImageName'] && currentScope['_ci_serviceImagePrefix'] && currentScope['_ci_serviceImageTag']){
			                params.custom['image'] = {
				                name: currentScope['_ci_serviceImageName'],
				                prefix: currentScope['_ci_serviceImagePrefix'],
				                tag: currentScope['_ci_serviceImageTag']
			                };
		                }

		                var excludes = ['_ci_serviceImageName', '_ci_serviceImagePrefix', '_ci_serviceImageTag'];
		                for( var input in currentScope){
			                if(input.indexOf('_ci_service_') !== -1 && excludes.indexOf(input) === -1){
				                if(!params.custom.env){
					                params.custom.env = {};
				                }
				                params.custom.env[input.replace('_ci_service_', '')] = currentScope[input];
			                }
		                }

		                var config = {
			                "method": "post",
			                "routeName": "/dashboard/cloud/services/soajs/deploy",
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
				                $timeout(function () {
					                currentScope.listServices();
				                }, 1500);

				                for( var input in currentScope){
					                if(input.indexOf('_ci_service') !== -1){
						                delete currentScope[input];
					                }
				                }
				                currentScope.custom = {};

				                $modalInstance.close();
			                }
		                });
	                }

                    function getBranchFromCommit(commit) {
                        return currentScope.conflictCommits[commit].branch;
                    }
                }
            });
        }

        // function getServices(cb) {
        //     getSendDataFromServer(currentScope, ngDataApi, {
        //         method: 'post',
        //         routeName: '/dashboard/services/list'
        //     }, function (error, response) {
        //         if (error) {
        //             currentScope.generateNewMsg(env, 'danger', translation.unableRetrieveListServices[LANG]);
        //         } else {
	     //            currentScope.services =[];
        //             response.records.forEach(function (oneService) {
        //                 oneService.type = 'service';
        //                 if (oneService.name === 'controller') {
        //                     oneService.UIGroup = 'Controllers';
        //                 } else {
        //                     oneService.UIGroup = 'Services';
        //                 }
        //                 if (allowListing(env, oneService)) {
        //                     currentScope.services.push(oneService);
        //                 }
        //             });
        //             return cb();
        //         }
        //     });
        // }

        // function getDaemons(cb) {
        //     getSendDataFromServer(currentScope, ngDataApi, {
        //         method: 'post',
        //         routeName: '/dashboard/daemons/list',
        //         params: {
        //             'getGroupConfigs': true
        //         }
        //     }, function (error, response) {
        //         if (error) {
        //             currentScope.generateNewMsg(env, 'danger', translation.unableRetrieveDaemonsHostsInformation[LANG]);
        //         } else {
        //             response.forEach(function (oneDaemon) {
        //                 if (allowListing(env, oneDaemon)) {
        //                     oneDaemon.type = 'daemon';
        //                     oneDaemon.UIGroup = 'Daemons';
        //                     currentScope.services.push(oneDaemon);
        //                 }
        //             });
        //             return cb();
        //         }
        //     });
        // }

        function getCatalogRecipes(cb) {
            currentScope.loadingRecipes = true;
            getSendDataFromServer(currentScope, ngDataApi, {
                method: 'get',
                routeName: '/dashboard/catalog/recipes/list',
	            params: {
		            specifyGit : false
	            }
            }, function (error, response) {
                currentScope.loadingRecipes = false;
                if (error) {
                    currentScope.generateNewMsg(env, 'danger', 'Unable to retrieve catalog recipes');
                }
                else {
                    currentScope.recipes = {};
                    response.forEach(function (oneRecipe) {
                        if (!currentScope.recipes[oneRecipe.type]) {
                            currentScope.recipes[oneRecipe.type] = [];
                        }
                         if(!Object.hasOwnProperty.call(oneRecipe.recipe.deployOptions, 'specifyGitConfiguration') || !oneRecipe.recipe.deployOptions.specifyGitConfiguration ){
	                         currentScope.recipes[oneRecipe.type].push(oneRecipe);
                         }

                    });
                    return cb();
                }
            });
        }

        // function allowListing(env, service) {
        //     var dashboardServices = ['controller', 'dashboard', 'proxy', 'urac', 'oauth']; //locked services that the dashboard environment is allowed to have
        //     var nonDashboardServices = ['controller', 'urac', 'oauth']; //locked services that non dashboard environments are allowed to have
        //     if (env.toLowerCase() === 'dashboard' && dashboardServices.indexOf(service.name) !== -1) {
        //         return filterServiceInfo(service);
        //     } else if (env.toLowerCase() !== 'dashboard' &&
        //         // service.name !== 'controller' && //controller is added later manually
        //         (
        //             //not a locked service for dashboard and non dashboard environments
        //             (dashboardServices.indexOf(service.name) !== -1 && nonDashboardServices.indexOf(service.name) !== -1) ||
        //             //a locked service that is common for dashboard and non dash envs (urac, oauth)
        //             (dashboardServices.indexOf(service.name) === -1 && nonDashboardServices.indexOf(service.name) === -1)
        //         )
        //     ) {
        //         return filterServiceInfo(service);
        //     }
        //     return false;
        // }

        //filter out service information that already exist
        // function filterServiceInfo(service) {
        //     var deployedServices = currentScope.rawServicesResponse;
        //
        //     if (!service.group && service.name === 'controller') {
        //         if (currentScope.hosts.soajs.groups) {
        //             var found = false;
        //             for (var groupName in currentScope.hosts.soajs.groups) {
        //                 currentScope.hosts.soajs.groups[groupName].list.forEach(function (oneService) {
        //                     if (oneService.name === env.toLowerCase() + '-controller') {
        //                         found = true;
        //                     }
        //                 });
        //             }
        //             if (!found) {
        //                 return true;
        //             }
        //             else {
        //                 return false;
        //             }
        //         }
        //         return true;
        //     }
        //     else {
        //         var serviceVersions = Object.keys(service.versions);
        //         serviceVersions.forEach(function (version) {
        //             for (var i = 0; i < deployedServices.length; i++) {
        //                 //if a version of that service is found to be deployed, delete it from the service information
        //                 if (service.name === deployedServices[i].labels['soajs.service.name'] && version == deployedServices[i].labels['soajs.service.version']) {
        //                     delete service.versions[version];
        //                 }
        //             }
        //         });
        //
        //         //if all the versions of the service are found to be deployed, return false
        //         //else, return true, after having removed the deployed versions
        //         if (Object.keys(service.versions).length === 0)
        //             return false;
        //         else
        //             return true;
        //     }
        // }

        //Start here
        if (currentScope.hosts && currentScope.controllers) {
            getCatalogRecipes(function () {
	            openModalForm();
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

    function getCatalogRecipes(currentScope, cb) {
        overlayLoading.show();
        getSendDataFromServer(currentScope, ngDataApi, {
            method: 'get',
            routeName: '/dashboard/catalog/recipes/list'
        }, function (error, response) {
            overlayLoading.hide();
            if (error) {
                currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
            }
            else {
                return cb(response);
            }
        });
    }

    return {
        'deployEnvironment': deployEnvironment,
        'deployNewService': deployNewService
    }
}]);
