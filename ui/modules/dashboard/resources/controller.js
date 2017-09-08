'use strict';

var resourcesApp = soajsApp.components;
resourcesApp.controller('resourcesAppCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', '$cookies', 'injectFiles', function ($scope, $timeout, $modal, ngDataApi, $cookies, injectFiles) {
    $scope.$parent.isUserLoggedIn();
    $scope.access = {};
    constructModulePermissions($scope, $scope.access, resourcesAppConfig.permissions);

    $scope.listResources = function() {
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
				    groupByType();
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
        var formConfig = angular.copy(resourcesAppConfig.form.resource);

        var resourceName = '';
        if(action === 'update') {
            formConfig.entries[0].value = angular.copy(resource);

            var resourceId = formConfig.entries[0].value._id;
            delete formConfig.entries[0].value._id;

            resourceName = formConfig.entries[0].value.name;
            delete formConfig.entries[0].value.name;

            var resourceEnv = formConfig.entries[0].value.created;
            delete formConfig.entries[0].value.created;

            var resourceAuthor = formConfig.entries[0].value.author;
            delete formConfig.entries[0].value.author;
        }

        var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'updateResource',
			label: ((action === 'update') ? 'Update Resource: ' + resourceName : 'Add New Resource'),
			actions: [
				{
					'type': 'submit',
					'label': translation.submit[LANG],
					'btn': 'primary',
					'action': function (formData) {
                        var options = {};
                        if(action === 'update') {
                            formData.resource.name = resourceName;

                            options = {
                                method: 'put',
                                routeName: '/dashboard/resources/update',
                                params: { id: resourceId },
                                data: { resource: formData.resource }
                            };
                        }
                        else if (action === 'add') {
                            if(settings) {
                                formData.resource.type = settings.type;
                                formData.resource.category = settings.category;
                            }

                            options = {
                                method: 'post',
                                routeName: '/dashboard/resources/add',
                                data: {
                                    env: currentScope.envCode,
                                    resource: formData.resource
                                }
                            };
                        }

                        overlayLoading.show();
                        getSendDataFromServer(currentScope, ngDataApi, options, function (error) {
                            overlayLoading.hide();
                            if(error) {
                                currentScope.form.displayAlert('danger', error.message);
                            }
                            else {
                                currentScope.modalInstance.dismiss('cancel');
        						currentScope.form.formData = {};
                                if(action === 'update') {
                                    currentScope.displayAlert('success', 'Resource updated successfully');
                                }
                                else if (action === 'add') {
                                    currentScope.displayAlert('success', 'Resource added successfully');
                                }

                                $scope.listResources();
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
    };

    $scope.deleteResource = function(resource) {
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
    
    //start here
    if($scope.access.list) {
        injectFiles.injectCss("modules/dashboard/resources/resources.css");
        $scope.envCode = $cookies.getObject("myEnv").code;
        $scope.listResources();
    }
}]);

resourcesApp.filter('capitalizeFirst', function () {
    return function (input) {
        if (input && typeof input === 'string' && input.length > 0) {
            return input.charAt(0).toUpperCase() + input.substring(1).toLowerCase();
        }
    }
});
