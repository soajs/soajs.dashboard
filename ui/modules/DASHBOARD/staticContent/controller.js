"use strict";

var staticContentApp = soajsApp.components;
staticContentApp.controller ('staticContentCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', 'injectFiles', function ($scope, $timeout, $modal, ngDataApi, injectFiles) {
    $scope.$parent.isUserLoggedIn();

    $scope.access = {};
    constructModulePermissions($scope, $scope.access, staticContentConfig.permissions);

    $scope.tokenHide = "**********";
    $scope.tokenShowIcon = "eye";
    $scope.tokenHideIcon = "eye-blocked";
    $scope.showHideToken = function (entry) {
        (entry.tokenDisplay === $scope.tokenHide) ? entry.tokenDisplay = entry.token : entry.tokenDisplay = $scope.tokenHide;
        (entry.tokenDisplayIcon === $scope.tokenHideIcon) ? entry.tokenDisplayIcon = $scope.tokenShowIcon : entry.tokenDisplayIcon = $scope.tokenHideIcon;
    };

    $scope.listSources = function () {
        getSendDataFromServer($scope, ngDataApi, {
            'method': 'send',
            'routeName': '/dashboard/staticContent/list'
        }, function (error, response) {
            if (error) {
                $scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
            } else {
                response.forEach (function (oneValue) {
                    if (oneValue.token) {
                        oneValue.tokenDisplay = $scope.tokenHide;
                        oneValue.tokenDisplayIcon = $scope.tokenShowIcon;
                    }
                });
                $scope.staticContentList = response;
            }
        });
    };

    $scope.addSource = function () {
        var formConfig = angular.copy(staticContentConfig.form.staticContent);
        var options = {
            timeout: $timeout,
            form: formConfig,
            name: 'addStaticContent',
            label: 'Add New Static Content Source',
            actions: [
                {
                    'type': 'submit',
                    'label': 'Submit',
                    'btn': 'primary',
                    'action': function (formData) {
                        var postData = {
                            name: formData.name,
                            type: formData.type,
                            owner: formData.owner,
                            repo: formData.repo,
                            branch: formData.branch,
                            main: formData.main
                        };

                        if (formData.token) {
                            postData.token = formData.token;
                        }

                        getSendDataFromServer($scope, ngDataApi, {
                            'method': 'send',
                            'routeName': '/dashboard/staticContent/add',
                            'data': postData
                        }, function (error) {
                            if (error) {
                                $scope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
                            } else {
                                $scope.$parent.displayAlert('success', 'Static Content source added successfully');
                                $scope.modalInstance.close();
                                $scope.form.formData = {};
                                $scope.listSources();
                            }
                        });
                    }
                },
                {
                    'type': 'reset',
                    'label': 'Cancel',
                    'btn': 'danger',
                    'action': function () {
                        $scope.modalInstance.dismiss('cancel');
                        $scope.form.formData = {};
                    }
                }
            ]
        };
        buildFormWithModal($scope, $modal, options);
    };

    $scope.updateSource = function (source) {
        var formConfig = angular.copy(staticContentConfig.form.staticContent);
        formConfig.entries.forEach(function (oneEntry) {
            oneEntry.value = source[oneEntry.name];
        });
        var options = {
            timeout: $timeout,
            form: formConfig,
            name: 'editStaticContent',
            label: 'Edit Static Content Source',
            actions: [
                {
                    'type': 'submit',
                    'label': 'Submit',
                    'btn': 'primary',
                    'action': function (formData) {
                        var postData = {
                            name: formData.name,
                            type: formData.type,
                            owner: formData.owner,
                            repo: formData.repo,
                            branch: formData.branch,
                            main: formData.main
                        };

                        if (formData.token) {
                            postData.token = formData.token;
                        }

                        getSendDataFromServer($scope, ngDataApi, {
                            'method': 'send',
                            'routeName': '/dashboard/staticContent/update',
                            'params': {id: source._id},
                            'data': postData
                        }, function (error) {
                            if (error) {
                                $scope.form.displayAlert('danger', error.code, true, 'dashboard', error.message);
                            } else {
                                $scope.$parent.displayAlert('success', 'Static content source updated successfully');
                                $scope.modalInstance.close();
                                $scope.form.formData = {};
                                $scope.listSources();
                            }
                        });
                    }
                },
                {
                    'type': 'reset',
                    'label': 'Cancel',
                    'btn': 'danger',
                    'action': function () {
                        $scope.modalInstance.dismiss('cancel');
                        $scope.form.formData = {};
                    }
                }
            ]
        };
        buildFormWithModal($scope, $modal, options);
    };

    $scope.deleteSource = function (source) {
        getSendDataFromServer($scope, ngDataApi, {
            "method": "get",
            "routeName": "/dashboard/staticContent/delete",
            "params": {id: source._id}
        }, function (error) {
            if (error) {
                $scope.displayAlert('danger', error.code, true, 'dashboard', error.message);
            } else {
                $scope.displayAlert('success', 'Static content source deleted successfully');
                $scope.listSources();
            }
        });
    };

    injectFiles.injectCss("modules/DASHBOARD/staticContent/staticContent.css");
    if ($scope.access.list) {
        $scope.listSources();
    }
}]);