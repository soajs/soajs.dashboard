'use strict';

var resourcesApp = soajsApp.components;
resourcesApp.controller('resourcesAppCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', '$cookies', 'injectFiles', function ($scope, $timeout, $modal, ngDataApi, $cookies, injectFiles) {
    $scope.$parent.isUserLoggedIn();
    $scope.access = {};
    constructModulePermissions($scope, $scope.access, resourcesAppConfig.permissions);

    $scope.listResources = function(cb) {
	    $scope.oldStyle = false;
	    getEnvironment(function(){

	    	overlayLoading.show();
		    getSendDataFromServer($scope, ngDataApi, {
			    method: 'get',
			    routeName: '/dashboard/resources/list',
			    params: {
				    env: $scope.envCode
			    }
		    }, function(error, response) {
			    overlayLoading.hide();
			    if(error) {
				    $scope.displayAlert('danger', error.message);
			    }
			    else {
                    $scope.resources = { list: response };

                    if($scope.deployConfig && $scope.deployedServices) {
                        markDeployed();
                    }

                    groupByType();

                    if(cb) return cb();
			    }
		    });

	    });

        function groupByType() {
            $scope.resources.types = {};
            $scope.resources.list.forEach(function(oneResource) {
                if(!$scope.resources.types[oneResource.type]) {
                    $scope.resources.types[oneResource.type] = {};
                }
                if(!$scope.resources.types[oneResource.type][oneResource.category]) {
                    $scope.resources.types[oneResource.type][oneResource.category] = [];
                }

                $scope.resources.types[oneResource.type][oneResource.category].push(oneResource);
            });
        }

        function getEnvironment(cb){
		    getSendDataFromServer($scope, ngDataApi, {
			    "method": "get",
			    "routeName": "/dashboard/environment",
			    "params":{
				    "code": $scope.envCode
			    }
		    }, function (error, response) {
			    if (error) {
				    $scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			    }
			    else {
				    if(response.dbs.clusters && Object.keys(response.dbs.clusters).length > 0){
				        $scope.oldStyle = true;
				    }
				    return cb();
			    }
		    });
	    }

        function markDeployed() {
            $scope.resources.list.forEach(function(oneResource) {
                if($scope.deployConfig && $scope.deployConfig[$scope.envCode.toUpperCase()]) {
                    if($scope.deployConfig[$scope.envCode.toUpperCase()][oneResource.name]) {
                        var resourceConfig = $scope.deployConfig[$scope.envCode.toUpperCase()][oneResource.name];

                        if (!resourceConfig.deploy) return;
                        if (!resourceConfig.options || !resourceConfig.options.recipe) return;

                        oneResource.canBeDeployed = true;
                        oneResource.deployOptions = $scope.deployConfig[$scope.envCode.toUpperCase()][oneResource.name].options;
                    }
                }

                for(var i = 0; i < $scope.deployedServices.length; i++) {
                    if($scope.deployedServices[i].labels && $scope.deployedServices[i].labels['resource.id'] === oneResource._id.toString()) {
                        oneResource.isDeployed = true;
                        oneResource.instance = $scope.deployedServices[i];
                        break;
                    }
                }
            });
        }
    };

    $scope.addResource = function() {
        var formConfig = angular.copy(resourcesAppConfig.form.addResource);
        formConfig.entries[0].value = formConfig.data.types;
        formConfig.entries[0].onAction = function(id, value, form) {
            form.entries[1].value = [];
            formConfig.data.categories.forEach(function(oneCategory) {
                if(oneCategory.group === value.toLowerCase()) {
                    form.entries[1].value.push(oneCategory);
                }
            });
            form.entries[1].hidden = false;
        };

        var currentScope = $scope;
        var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'addResource',
			label: 'Add New Resource',
			actions: [
				{
					'type': 'submit',
					'label': 'Proceed',
					'btn': 'primary',
					'action': function (formData) {
                        $scope.manageResource({}, 'add', formData);
                        currentScope.modalInstance.dismiss('cancel');
						currentScope.form.formData = {};
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
    };

    $scope.manageResource = function(resource, action, settings) {
        var currentScope = $scope;
        $modal.open({
            templateUrl: "addEditResource.tmpl",
            size: 'lg',
            backdrop: true,
            keyboard: true,
            controller: function ($scope, $modalInstance) {
                fixBackDrop();
                console.log(resource);
                $scope.title = 'Add New Resource';
                if(action === 'update') {
                    $scope.title = 'Update ' + resource.name;
                }

                $scope.formData = {};
                $scope.envs = [];
                $scope.message = {};
                $scope.recipes = [];

                $scope.options = {
                    deploymentModes: [],
                    envCode: currentScope.envCode,
                    envPlatform: currentScope.envPlatform,
                    enableAutoScale: false,
                    formAction: action,
                    aceEditorConfig: {
                        maxLines: Infinity,
                        useWrapMode : true,
                        mode: 'json',
                        firstLineNumber: 1,
                        height: '500px'
                    }
                };

                if(currentScope.envPlatform === 'kubernetes') {
                    $scope.options.deploymentModes = [
                        {
                            label: 'deployment - deploy the specified number of replicas based on the availability of resources',
                            value: 'deployment'
                        },
                        {
                            label: 'daemonset - automatically deploy one replica of the service on each node in the cluster',
                            value: 'daemonset'
                        }
                    ];
                }
                else if(currentScope.envPlatform === 'docker') {
                    $scope.options.deploymentModes = [
                        {
                            label: 'replicated - deploy the specified number of replicas based on the availability of resources',
                            value: 'replicated'
                        },
                        {
                            label: 'global - automatically deploy one replica of the service on each node in the cluster',
                            value: 'global'
                        }
                    ];
                }

                $scope.displayAlert = function(type, message) {
                    $scope.message[type] = message;
                    setTimeout(function() {
                        $scope.message = {};
                    }, 5000);
                };

                $scope.getEnvs = function() {
                    if($scope.envs && $scope.envs.list && $scope.envs.list.length > 0) {
                        return;
                    }

                    overlayLoading.show();
                    getSendDataFromServer(currentScope, ngDataApi, {
                        method: 'get',
                        routeName: '/dashboard/environment/list'
                    }, function (error, envs) {
                        overlayLoading.hide();
                        if(error) {
                            $scope.displayAlert('danger', error.message);
                        }
                        else {
                            $scope.envs.list = [];
                            envs.forEach(function(oneEnv) {
                                //in case of update resource, check resource record to know what env it belongs to
                                if(resource && resource.created) {
                                    if(resource.created.toUpperCase() === oneEnv.code.toUpperCase()) return;
                                }
                                //in case of add resource, check current environment
                                else if(currentScope.envCode.toUpperCase() === oneEnv.code.toUpperCase()) {
                                    return;
                                }

                                var envEntry = {
                                    code: oneEnv.code,
                                    description: oneEnv.description,
                                    selected: (resource && resource.sharedEnv && resource.sharedEnv[oneEnv.code.toUpperCase()])
                                };

                                if(resource && resource.shared && action === 'update') {
                                    if(resource.sharedEnv) {
                                        envEntry.selected = (resource.sharedEnv[oneEnv.code.toUpperCase()]);
                                    }
                                    else {
                                        //shared with all envs
                                        envEntry.selected = true;
                                        $scope.envs.sharedWithAll = true;
                                    }
                                }

                                $scope.envs.list.push(envEntry);
                            });
                        }
                    });
                };

                $scope.fillForm = function() {
                    if(action === 'add') {
                        $scope.formData.type = settings.type;
                        $scope.formData.category = settings.category;
                    }
                    else {
                        $scope.formData = angular.copy(resource);
                        $scope.getEnvs();

                        //ace editor cannot take an object or array as model
                        $scope.formData.config = JSON.stringify($scope.formData.config, null, 2);

                        if($scope.formData && $scope.formData.deployOptions && $scope.formData.deployOptions.autoScale && $scope.formData.deployOptions.autoScale.replicas && $scope.formData.deployOptions.autoScale.metrics) {
                            $scope.options.enableAutoScale = true;
                        }
                    }
                };

                $scope.getCatalogRecipes = function(cb) {
                    $scope.options.loadingRecipes = true;
                    getSendDataFromServer(currentScope, ngDataApi, {
                        method: 'get',
                        routeName: '/dashboard/catalog/recipes/list'
                    }, function (error, recipes) {
                        $scope.options.loadingRecipes = false;
                        if(error) {
                            $scope.displayAlert('danger', error.message);
                        }
                        else {
                            if(recipes && Array.isArray(recipes)) {
                                recipes.forEach(function(oneRecipe) {
                                    if(oneRecipe.type === $scope.formData.type && oneRecipe.subtype === $scope.formData.category) {
                                        $scope.recipes.push(oneRecipe);
                                    }
                                });
                            }

                            if (cb) return cb();
                        }
                    });
                };

                $scope.toggleShareWithAllEnvs = function() {
                    if($scope.envs.sharedWithAll) {
                        $scope.envs.list.forEach(function(oneEnv) {
                            oneEnv.selected = true;
                        });
                    }

                    return;
                };

                $scope.save = function(cb) {
                    saveResource(function() {
                        saveResourceDeployConfig(cb);
                    });

                    function saveResource(cb) {
                        console.log(1);

                        var saveOptions = {
                            name: $scope.formData.name,
                            type: $scope.formData.type,
                            category: $scope.formData.category,
                            locked: $scope.formData.locked || false,
                            plugged: $scope.formData.plugged || false,
                            shared: $scope.formData.shared || false,
                            config: JSON.parse($scope.formData.config)
                        };
                        console.log(saveOptions);

                        var options = {};
                        if($scope.options.formAction === 'add') {
                            options = {
                                method: 'post',
                                routeName: '/dashboard/resources/add',
                                data: {
                                    env: $scope.options.envCode.toUpperCase(),
                                    resource: saveOptions
                                }
                            };
                        }
                        else {
                            options = {
                                method: 'put',
                                routeName: '/dashboard/resources/update',
                                params: {
                                    id: $scope.formData._id
                                },
                                data: {
                                    resource: saveOptions
                                }
                            };
                        }
                        getSendDataFromServer(currentScope, ngDataApi, options, function(error) {
                            if(error) {
                                currentScope.displayAlert('danger', error.message);
                            }
                            else {
                                currentScope.displayAlert('success', 'Resource updated successfully');
                                return cb();
                            }
                        });
                    }

                    function saveResourceDeployConfig(cb) {
                        if(!$scope.formData.canBeDeployed || !$scope.formData.deployOptions || Object.keys($scope.formData.deployOptions).length === 0) {
                            if(cb) return cb();
                            else return;
                        }

                        console.log(2);
                        var deployConfig = angular.copy($scope.formData.deployOptions);

                        var options = {
                            method: 'put',
                            routeName: '/dashboard/resources/config/update',
                            data: {
                                env: (($scope.options.formAction === 'update') ? $scope.formData.created.toUpperCase() : $scope.options.envCode.toUpperCase()),
                                resourceName: $scope.formData.name,
                                config: {
                                    deploy: $scope.formData.canBeDeployed || false,
                                    options: deployConfig
                                }
                            }
                        };

                        console.log(deployConfig);
                        getSendDataFromServer(currentScope, ngDataApi, options, function(error) {
                            if(error) {
                                currentScope.displayAlert('danger', error.message);
                            }
                            else {
                                currentScope.displayAlert('success', 'Resource deployment configuration updated successfully');
                                if (cb) return cb();
                            }
                        });
                    }
                };

                $scope.saveAndDeploy = function() {
                    $scope.save(function() {
                        deployResource();
                    });

                    function deployResource(cb) {
                        if(!$scope.formData.canBeDeployed || !$scope.formData.deployOptions || Object.keys($scope.formData.deployOptions).length === 0) {
                            if(cb) return cb();
                            else return;
                        }

                        console.log(3);
                        var deployOptions = angular.copy($scope.formData.deployOptions);
                        if(deployOptions && deployOptions.custom) {
                            deployOptions.custom.type = 'resource';
                        }

                        if($scope.options.formAction === 'add') {
                            deployOptions.env = $scope.options.envCode;
                        }
                        else {
                            deployOptions.env = $scope.formData.created;
                        }

                        console.log(deployOptions);
                        getSendDataFromServer(currentScope, ngDataApi, {
                            method: 'post',
                            routeName: '/dashboard/cloud/services/soajs/deploy',
                            data: deployOptions
                        }, function(error) {
                            if(error) {
                                currentScope.displayAlert('danger', error.message);
                            }
                            else {
                                currentScope.displayAlert('success', 'Resource deployed successfully. Check the High Availability - Cloud section to see it running');
                                if(cb) return cb();
                            }
                        });
                    }
                };

                $scope.saveAndRebuild = function() {
                    $scope.save(function() {
                        rebuildService();
                    });

                    function rebuildService(cb) {
                        if(!$scope.formData.isDeployed || !$scope.formData.canBeDeployed || (!$scope.formData.instance && !$scope.formData.instance.id)) {
                            if(cb) return cb();
                            else return;
                        }

                        console.log(3);
                        if(!$scope.formData.deployOptions.custom) {
                            $scope.formData.deployOptions.custom = {};
                        }

                        var rebuildOptions = angular.copy($scope.formData.deployOptions.custom);
                        rebuildOptions.memory = $scope.formData.deployOptions.deployConfig.memoryLimit;
                        rebuildOptions.cpuLimit = $scope.formData.deployOptions.deployConfig.cpuLimit;

                        console.log(rebuildOptions);
                        getSendDataFromServer(currentScope, ngDataApi, {
                            method: 'put',
                            routeName: '/dashboard/cloud/services/redeploy',
                            data: {
                                env: $scope.formData.created,
                                serviceId: $scope.formData.instance.id,
                                mode: $scope.formData.instance.labels['soajs.service.mode'],
                                action: 'rebuild',
                                custom: rebuildOptions
                            }
                        }, function(error) {
                            if(error) {
                                currentScope.displayAlert('danger', error.message);
                            }
                            else {
                                currentScope.displayAlert('success', 'Resource deployed successfully. Check the High Availability - Cloud section to see it running');
                                if(cb) return cb();
                            }
                        });
                    }
                };

                $scope.cancel = function() {
                    $scope.formData = {};
                    $modalInstance.close();
                };

                $scope.fillForm();
                $scope.getCatalogRecipes();
            }
        });
    };

    $scope.deleteResource = function(resource) {
        //if resource.instance, delete it
        overlayLoading.show();
        getSendDataFromServer($scope, ngDataApi, {
            method: 'delete',
            routeName: '/dashboard/resources/delete',
            params: { id: resource._id }
        }, function(error) {
            overlayLoading.hide();
            if(error) {
                $scope.displayAlert('danger', error.message);
            }
            else {
                $scope.displayAlert('success', 'Resource deleted successfully');
                $scope.listResources();
            }
        });

        function deleteResource() {

        }
    };

    $scope.togglePlugResource = function(resource, plug) {
        var resourceId = resource._id;

        delete resource._id;
        delete resource.created;
        delete resource.author;

        resource.plugged = plug;

        overlayLoading.show();
        getSendDataFromServer($scope, ngDataApi, {
            method: 'put',
            routeName: '/dashboard/resources/update',
            params: { id: resourceId },
            data: { resource: resource }
        }, function (error) {
            overlayLoading.hide();
            if(error) {
                $scope.displayAlert('danger', error.message);
            }
            else {
                $scope.displayAlert('success', 'Resource updated successfully');
                $scope.listResources();
            }
        });
    };

    $scope.upgradeAll = function(){
	    overlayLoading.show();
	    getSendDataFromServer($scope, ngDataApi, {
		    method: 'get',
		    routeName: '/dashboard/resources/upgrade',
		    params: {
		    	env: $scope.envCode
		    }
	    }, function (error, response) {
		    overlayLoading.hide();
		    if (error) {
			    $scope.displayAlert('danger', error.message);
		    }
		    else {
			    $scope.displayAlert('success', "Resources have been upgraded to the latest version.");
			    $scope.listResources();
		    }
	    });
    };

    $scope.listDeployedServices = function(cb) {
        overlayLoading.show();
        getSendDataFromServer($scope, ngDataApi, {
            method: 'get',
            routeName: '/dashboard/cloud/services/list',
            params: { env: $scope.envCode }
        }, function (error, response) {
            overlayLoading.hide();
            if(error) {
                $scope.displayAlert('danger', error.message);
            }
            else {
                $scope.deployedServices = response;
                if (cb) return cb();
            }
        });
    };

    $scope.getDeployConfig = function(cb) {
        overlayLoading.show();
        getSendDataFromServer($scope, ngDataApi, {
            method: 'get',
            routeName: '/dashboard/resources/config'
        }, function (error, response) {
            overlayLoading.hide();
            if(error) {
                $scope.displayAlert('danger', error.message);
            }
            else {
                $scope.deployConfig = response;

                if (cb) return cb();
            }
        });
    };

    //start here
    if($scope.access.list) {
        injectFiles.injectCss("modules/dashboard/resources/resources.css");
        $scope.envCode = $cookies.getObject("myEnv").code;
        $scope.envDeployer = $cookies.getObject("myEnv").deployer;
    	$scope.envPlatform = $scope.envDeployer.selected.split('.')[1];
        $scope.listDeployedServices(function() {
            $scope.getDeployConfig(function() {
                $scope.listResources();
            });
        });
    }
}]);

resourcesApp.filter('capitalizeFirst', function () {
    return function (input) {
        if (input && typeof input === 'string' && input.length > 0) {
            return input.charAt(0).toUpperCase() + input.substring(1).toLowerCase();
        }
    }
});
