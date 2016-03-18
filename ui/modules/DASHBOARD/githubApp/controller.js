'use strict';

var githubApp = soajsApp.components;
githubApp.controller ('githubAppCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', 'injectFiles', function ($scope, $timeout, $modal, ngDataApi, injectFiles) {
    $scope.$parent.isUserLoggedIn();

    $scope.access = {};
    constructModulePermissions($scope, $scope.access, githubAppConfig.permissions);

    $scope.listAccounts = function () {
        getSendDataFromServer($scope, ngDataApi, {
            'method': 'get',
            'routeName': '/dashboard/github/accounts/list'
        }, function (error, response) {
            if (error) {
                $scope.$parent.displayAlert('danger', error.message);
            } else {
                $scope.accounts = response;

                var counter = 0;
                $scope.listRepos($scope.accounts, counter);
            }
        });
    };

    $scope.addAccount = function () {
        var formConfig = angular.copy(githubAppConfig.form.login);
        var options = {
            timeout: $timeout,
            form: formConfig,
            name: 'addGithubAccount',
            label: 'Add New GitHub Account',
            actions: [
                {
                    'type': 'submit',
                    'label': 'Submit',
                    'btn': 'primary',
                    'action': function (formData) {
                        var postData = {
                            username: formData.username,
                            password: formData.password,
                            accountLabel: formData.accountLabel
                        };
                        getSendDataFromServer($scope, ngDataApi, {
                            'method': 'send',
                            'routeName': '/dashboard/github/login',
                            'data': postData
                        }, function (error) {
                            if (error) {
                                $scope.$parent.displayAlert('danger', error.message);
                                $scope.modalInstance.close();
                            } else {
                                $scope.$parent.displayAlert('success', 'Login Successful');
                                $scope.modalInstance.close();
                                $scope.form.formData = {};
                                $scope.listAccounts();
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

    $scope.deleteAccount = function (accountId) {
        getSendDataFromServer($scope, ngDataApi, {
            method: 'get',
            routeName: '/dashboard/github/logout',
            params: {id: accountId.toString()}
        }, function (error, result) {
            if (error) {
                $scope.displayAlert('danger', error.message);
            } else {
                $scope.displayAlert('success', 'Account logout was successful');
                $scope.listAccounts();
            }
        });
    };

    $scope.listRepos = function (accounts, counter) {
        var id = accounts[counter]._id;

        getSendDataFromServer($scope, ngDataApi, {
            "method": "get",
            "routeName": "/dashboard/github/getRepos",
            "params": {id: id}
        }, function (error, response) {
            if (error) {
                $scope.$parent.displayAlert('danger', error.message);
            } else {
                for (var i = 0; i < $scope.accounts.length; i++) {
                    if ($scope.accounts[i]._id === id) {
                        $scope.accounts[i].repos = response;
                    }
                }

                counter++;
                if (counter < accounts.length) {
                    return $scope.listRepos(accounts, counter);
                }
            }
        });
    };

    $scope.activateRepo = function (accountId, repo) {
        getSendDataFromServer($scope, ngDataApi, {
            method: 'send',
            routeName: '/dashboard/github/repo/activate',
            params: {
                id: accountId.toString()
            },
            data: {
                user: repo.owner.login,
                repo: repo.name
            }
        }, function (error, response) {
            if (error) {
                $scope.$parent.displayAlert('danger', error.message);
            } else {
                $scope.$parent.displayAlert('success', 'Repository has been activated');
                repo.status = 'active';
                var repoAddSuccess = $modal.open({
                    templateUrl: 'repoAddSuccess.tmpl',
                    backdrop: true,
                    keyboard: true,
                    controller: function ($scope) {
                        fixBackDrop();
                        if (Array.isArray(response)) {
                            $scope.added = response;
                        } else {
                            $scope.added = [response];
                        }

                        $scope.ok = function () {
                            repoAddSuccess.close();
                        }
                    }
                });
            }
        });
    };

    $scope.deactivateRepo = function (accountId, repo) {
        getSendDataFromServer($scope, ngDataApi, {
            method: 'get',
            routeName: '/dashboard/github/repo/deactivate',
            params: {
                id: accountId.toString(),
                user: repo.owner.login,
                repo: repo.name
            }
        }, function (error, response) {
            if (error) {
                $scope.$parent.displayAlert('danger', error.message);
            } else {
                $scope.$parent.displayAlert('success', 'Repository has been deactivated');
                repo.status = '';
            }
        });
    };

    injectFiles.injectCss("modules/DASHBOARD/githubApp/githubApp.css");
    if ($scope.access.listAccounts) {
        $scope.listAccounts();
    }
}]);