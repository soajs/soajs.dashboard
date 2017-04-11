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
                $scope.recipes = response;
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
        }
        else {
            $scope.recipes.forEach(function (oneRecipe) {
                formConfig.entries[0].value.push({ l: oneRecipe.name, v: oneRecipe });
            });

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
            label: 'View Recipe',
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

    $scope.deleteRecipe = function (recipe) {
        overlayLoading.show();
        getSendDataFromServer($scope, ngDataApi, {
            method: 'delete',
            routeName: '/dashboard/catalog/recipes/delete',
            params: {
                id: recipe._id
            }
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
