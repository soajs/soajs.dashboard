'use strict';

var catalogApp = soajsApp.components;
catalogApp.controller ('catalogAppCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', 'injectFiles', function ($scope, $timeout, $modal, ngDataApi, injectFiles) {
    $scope.$parent.isUserLoggedIn();

    $scope.access = {};
    constructModulePermissions($scope, $scope.access, catalogAppConfig.permissions);

    $scope.catalogImage = './themes/' + themeToUse + '/img/catalog.png';

    $scope.listRecipes = function () {
        overlayLoading.show();
        getSendDataFromServer($scope, ngDataApi, {
            method: 'get',
            routeName: '/dashboard/catalog/recipes/list'
        }, function (error, response) {
            overlayLoading.hide();
            if (error) {
                $scope.displayAlert('danger', error.message);
            }
            else {
	            $scope.originalRecipes = $scope.recipes = response;
	            $scope.listArchives();
            }
        });
    };
	
	$scope.listArchives = function () {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/catalog/recipes/list',
			'params':{
				'version': true
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				$scope.originalArchives = $scope.archives = response;
			}
		});
	};

    $scope.viewRecipe = function (recipe) {
        var formConfig = angular.copy(catalogAppConfig.form.viewRecipe);
        formConfig.entries[0].value = recipe;

        var options = {
            timeout: $timeout,
            form: formConfig,
            name: 'viewRecipe',
            label: 'View Recipe',
            actions: [
                {
                    type: 'reset',
                    label: 'Close',
                    btn: 'primary',
                    action: function () {
                        $scope.modalInstance.dismiss('cancel');
                        $scope.form.formData = {};
                    }
                }
            ]
        };

        buildFormWithModal($scope, $modal, options);
    };

    $scope.addRecipe = function (type) {
        var formConfig = angular.copy(catalogAppConfig.form.addRecipe);

        if (type === 'blank') {
            formConfig.entries[0].required = false;
            formConfig.entries[0].hidden = true;

            var recipeTemplate = angular.copy(catalogAppConfig.templates.recipe);
            formConfig.entries[1].value = recipeTemplate;
        }
        else {
        	var groups = [];
            $scope.recipes.forEach(function (oneRecipe) {
            	var label = oneRecipe.name;
            	if(oneRecipe.subtype){
            		label += " (" + oneRecipe.subtype + ")";
	            }
                formConfig.entries[0].value.push({ l: label, v: oneRecipe, group: oneRecipe.type });
            	
            	if(groups.indexOf(oneRecipe.type) === -1){
            		groups.push(oneRecipe.type);
	            }
            });
	        formConfig.entries[0].groups = groups;
            formConfig.entries[0].onAction = function (id, data, form) {
                var recipeTemplate = JSON.parse(data);
                delete recipeTemplate._id;
                delete recipeTemplate.locked;

                form.entries[1].ngModel = JSON.stringify(recipeTemplate, null, 2);
            };
        }

        var options = {
            timeout: $timeout,
            form: formConfig,
            name: 'addRecipe',
            label: 'Add New Recipe',
            actions: [
                {
                    type: 'submit',
                    label: 'Submit',
                    btn: 'primary',
                    action: function (formData) {
                        if (formData.recipe.locked) {
                            //do not allow user to lock a recipe
                            delete formData.recipe.locked;
                        }
	                    delete formData.recipe.v;
	                    delete formData.recipe.ts;
	                    delete formData.recipe.refId;

                        overlayLoading.show();
                        getSendDataFromServer($scope, ngDataApi, {
                            method: 'post',
                            routeName: '/dashboard/catalog/recipes/add',
                            data: {
                                catalog: formData.recipe
                            }
                        }, function (error, response) {
                            overlayLoading.hide();
                            if (error) {
                                $scope.form.displayAlert('danger', error.message);
                            }
                            else {
                                $scope.form.displayAlert('success', 'Recipe added successfully');
                                $scope.modalInstance.close();
                                $scope.form.formData = {};
                                $scope.listRecipes();
                            }
                        });
                    }
                },
                {
                    type: 'reset',
                    label: 'Cancel',
                    btn: 'danger',
                    action: function () {
                        $scope.modalInstance.dismiss('cancel');
                        $scope.form.formData = {};
                    }
                }
            ]
        };

        buildFormWithModal($scope, $modal, options);
    };

    $scope.updateRecipe = function (recipe) {
        var formConfig = angular.copy(catalogAppConfig.form.viewRecipe);
        formConfig.entries[0].value = angular.copy(recipe);
        delete formConfig.entries[0].value._id;

        var options = {
            timeout: $timeout,
            form: formConfig,
            name: 'viewRecipe',
            label: 'Edit Recipe',
            actions: [
                {
                    type: 'submit',
                    label: 'Submit',
                    btn: 'primary',
                    action: function (formData) {
                        if (formData.recipe.locked) {
                            //do not allow user to lock a recipe
                            delete formData.recipe.locked;
                        }
	
	                    delete formData.recipe.v;
	                    delete formData.recipe.ts;
	                    delete formData.recipe.refId;

                        overlayLoading.show();
                        getSendDataFromServer($scope, ngDataApi, {
                            method: 'put',
                            routeName: '/dashboard/catalog/recipes/update',
                            params: {
                                id: recipe._id
                            },
                            data: {
                                catalog: formData.recipe
                            }
                        }, function (error, response) {
                            overlayLoading.hide();
                            if (error) {
                                $scope.form.displayAlert('danger', error.message);
                            }
                            else {
                                $scope.form.displayAlert('success', 'Recipe updated successfully');
                                $scope.modalInstance.close();
                                $scope.form.formData = {};
                                $scope.listRecipes();
                            }
                        });
                    }
                },
                {
                    type: 'reset',
                    label: 'Cancel',
                    btn: 'danger',
                    action: function () {
                        $scope.modalInstance.dismiss('cancel');
                        $scope.form.formData = {};
                    }
                }
            ]
        };

        buildFormWithModal($scope, $modal, options);
    };

    $scope.deleteRecipe = function (recipe, versioning) {
    	var params = {
		    id: recipe._id
	    };
    	if(versioning){
    		params.id = recipe.refId;
    		params.version = recipe.v;
	    }
    	
        overlayLoading.show();
        getSendDataFromServer($scope, ngDataApi, {
            method: 'delete',
            routeName: '/dashboard/catalog/recipes/delete',
            params: params
        }, function (error, response) {
            overlayLoading.hide();
            if (error) {
                $scope.displayAlert('danger', error.message);
            }
            else {
                $scope.displayAlert('success', 'Recipe deleted successfully');
                $scope.listRecipes();
            }
        });
    };
	
	$scope.filterData = function (query, tabIndex) {
		if (query && query !== "") {
			query = query.toLowerCase();
			var filtered = [];
			var recipes = $scope.recipes;
			for (var i = 0; i < recipes.length; i++) {
				if (recipes[i].name.toLowerCase().indexOf(query) !== -1 || recipes[i].type.toLowerCase().indexOf(query) !== -1 || recipes[i].description.toLowerCase().indexOf(query) !== -1 ||recipes[i].subtype && recipes[i].subtype.toLowerCase().indexOf(query) !== -1) {
					filtered.push(recipes[i]);
				}
			}
			$scope.recipes = filtered;
		} else {
			if ($scope.recipes && $scope.originalRecipes) {
				$scope.recipes = $scope.originalRecipes;
				
			}
		}
	};
	
	$scope.filterDataVersions = function (query, tabIndex) {
		if (query && query !== "") {
			query = query.toLowerCase();
			var filtered = [];
			var recipes = $scope.archives;
			for (var i = 0; i < recipes.length; i++) {
				if (recipes[i].name.toLowerCase().indexOf(query) !== -1 || recipes[i].type.toLowerCase().indexOf(query) !== -1 || recipes[i].description.toLowerCase().indexOf(query) !== -1 ||recipes[i].subtype && recipes[i].subtype.toLowerCase().indexOf(query) !== -1) {
					filtered.push(recipes[i]);
				}
			}
			$scope.archives = filtered;
		} else {
			if ($scope.archives && $scope.originalArchives) {
				$scope.archives = $scope.originalArchives;
				
			}
		}
	};
    
    injectFiles.injectCss("modules/dashboard/catalogs/catalog.css");

    // Start here
    if ($scope.access.list) {
        $scope.listRecipes();
    }

}]);

catalogApp.filter('capitalizeFirst', function () {
    return function (input) {
        if (input && typeof input === 'string' && input.length > 0) {
            return input.charAt(0).toUpperCase() + input.substring(1).toLowerCase();
        }
    }
});
