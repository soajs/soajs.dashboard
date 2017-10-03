"use strict";
var deployService = soajsApp.components;
deployService.service('deploySrv', ['ngDataApi', '$timeout', '$modal', function (ngDataApi, $timeout, $modal) {

	function injectCatalogInputs(formConfig, recipes, opts){
		var mainLevel = opts.mainLevel;
		var subLevel = opts.subLevel;
		var initialCount = opts.initialCount;
		var type = opts.type;
		var subtype;
		if(opts.subtype){
			subtype = opts.subtype;
		}

		formConfig.entries[mainLevel].entries[subLevel].onAction = function(id, data, form){

			//reset form entries
			form.entries[mainLevel].entries.length = initialCount;

			//append the custom catalog inputs
			recipes.forEach(function(oneRecipe){
				if(oneRecipe.type === type &&  oneRecipe._id === data && (!subtype || (subtype && oneRecipe.subtype === subtype)) ){
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
	        formConfig.entries[0].entries.splice(3, 0,
		        {
			        'name': 'nginxCpuLimit',
			        'label': 'CPU Limit Per Instance for Nginx',
			        'type': 'string',
			        'placeholder': '100m or 0.1',
			        'fieldMsg': 'Set a custom CPU limit for Nginx instances',
			        'required': true
		        }
	        );
	        formConfig.entries[1].entries.splice(3, 0,
		        {
			        'name': 'ctrlCpuLimit',
			        'label': 'CPU Limit Per Instance for Controller',
			        'type': 'string',
			        'placeholder': '100m or 0.1',
			        'fieldMsg': 'Set a custom CPU limit for controller instances',
			        'required': true
		        }
	        );
        }
	
        let mySite = currentScope.myEnvironment.sitePrefix + "." + currentScope.myEnvironment.domain;
        let myApi = currentScope.myEnvironment.apiPrefix + "." + currentScope.myEnvironment.domain;
        
	    formConfig.entries[0].description.type = "info";
	    formConfig.entries[0].description.content = `<h4>SOAJS Nginx</h4><hr/>`;
		formConfig.entries[0].description.content += `<p>Allows you to add static content and empower with the ability to access this environment via domain(s):</p>`;
		formConfig.entries[0].description.content += `<ul><li>&bullet;&nbsp;&nbsp;&nbsp;${mySite}&nbsp;( Static Content )</li><li>&bullet;&nbsp;&nbsp;&nbsp;${myApi}&nbsp;( API )</li></ul>`;
	    formConfig.entries[0].description.content += `<p><a href="https://soajsorg.atlassian.net/wiki/spaces/SOAJ/pages/62493834/Catalog+Recipes#CatalogRecipes-nginxRecipe" target="_blank">Click Here</a> to learn how to build a Catalog Recipe for an <b>Nginx Service</b>.</p>`;
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
        
        formConfig.entries[1].description.type = "info";
        formConfig.entries[1].description.content = "<h4>SOAJS Controller</h4><hr />";
        formConfig.entries[1].description.content += "<p>Turns on API management, lifecycle, security, multi tenancy, multi version, awareness, ...</p>";
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
                	if(oneRecipe.type ==='soajs'){
		               currentScope.oldStyle = true;
	                }
	                else{
		                var index = 3;
		                if(currentScope.isKubernetes){
			                index = 4;
		                }
		                if (oneRecipe.type === 'service' && oneRecipe.subtype === 'soajs') {
			                formConfig.entries[1].entries[index].value.push({ l: oneRecipe.name, v: oneRecipe._id });
			                injectCatalogInputs(formConfig, recipes, {
				                mainLevel : 1,
				                subLevel: index,
				                initialCount: index + 1,
				                type: 'service',
				                subtype: 'soajs',
				                deployment: {
					                type: "environment",
					                data: branchInfo
				                }
			                });
		                }
		                else if (oneRecipe.type === 'server' && oneRecipe.subtype === 'nginx') {
			                formConfig.entries[0].entries[index].value.push({ l: oneRecipe.name, v: oneRecipe._id });
			                injectCatalogInputs(formConfig, recipes, {
				                mainLevel : 0,
				                subLevel: index,
				                initialCount: index + 1,
				                type: 'server',
				                subtype: 'nginx'
			                });
		                }
	                }
                });
	            
                if(currentScope.oldStyle) {
	                openUpgradeModal(currentScope);
                }
                else{
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
                }
                
            });
        });

        function deployEnvironment(formData) {
            var branchObj = formData.branch;
            if(typeof branchObj === 'string'){
            	branchObj = JSON.parse(formData.branch);
            }

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
            if(currentScope.isKubernetes && formData.ctrlCpuLimit ){
	            params.deployConfig.cpuLimit = formData.ctrlCpuLimit;
            }

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
	        if(currentScope.isKubernetes && formData.nginxCpuLimit ){
		        params.deployConfig.cpuLimit = formData.nginxCpuLimit;
	        }

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
	        if(formData['_ci_serverImageName'] && formData['_ci_serverImagePrefix'] && formData['_ci_serverImageTag']){
		        params.custom['image'] = {
			        name: formData['_ci_serverImageName'],
			        prefix: formData['_ci_serverImagePrefix'],
			        tag: formData['_ci_serverImageTag']
		        };
	        }

	        var excludes = ['_ci_serverImageName', '_ci_serverImagePrefix', '_ci_serverImageTag'];
	        for( var input in formData){
		        if(input.indexOf('_ci_server_') !== -1 && excludes.indexOf(input) === -1){
			        if(!params.custom.env){
				        params.custom.env = {};
			        }
			        params.custom.env[input.replace('_ci_server_', '')] = formData[input];
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

    function openUpgradeModal(currentScope){
	    $modal.open({
		    templateUrl: "oldCatalogRecipes.tmpl",
		    size: 'lg',
		    backdrop: true,
		    keyboard: true,
		    controller: function ($scope, $modalInstance) {
			    $scope.upgradeRecipes = function(){
				    currentScope.$parent.go("#/catalog-recipes");
				    $modalInstance.close();
			    }
		    }
	    });
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
	
	/**
	 * Deploy Heapster to enable Auto Scaling.
	 * Kubernetes only.
	 * @param currentScope
	 */
	function deployHeapster(currentScope){
    	currentScope.isKubernetes = currentScope.envDeployer.selected.split('.')[1] === "kubernetes";
    	if(currentScope.isKubernetes && !currentScope.isAutoScalable){
		    var config = {
			    "method": "post",
			    "routeName": "/dashboard/cloud/plugins/deploy",
			    "data": {
			    	"env": currentScope.envCode,
				    "plugin": "heapster"
			    }
		    };
		
		    overlayLoading.show();
		    getSendDataFromServer(currentScope, ngDataApi, config, function (error) {
			    overlayLoading.hide();
			    if (error) {
				    currentScope.displayAlert('danger', error.message);
			    }
			    else {
				    currentScope.displayAlert('success', 'Heapster is deployed successfully and will be available in a few minutes');
				    $timeout(function () {
					    currentScope.listServices();
				    }, 2000);
				    currentScope.isAutoScalable = true;
			    }
		    });
	    }
	    else{
    		if(!currentScope.isKubernetes) {
			    currentScope.displayAlert('danger', 'Heapster is only deployed in Kubernetes!!');
		    }else{
			    currentScope.displayAlert('danger', 'Heapster is already deployed!!');
		    }
	    }
    }

    return {
        'deployEnvironment': deployEnvironment,
	    'deployHeapster': deployHeapster
    }
}]);
