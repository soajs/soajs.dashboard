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
                $scope.displayAlert('danger', error.message);
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
                        console.log (formData);
                        //name | type | access | password if access
                        var postData = {
                            label: formData.label,
                            username: formData.username,
                            type: formData.type,
                            access: formData.access
                        };

                        if (formData.access === 'private') {
                            postData.password = formData.password;
                        }

                        getSendDataFromServer($scope, ngDataApi, {
                            'method': 'send',
                            'routeName': '/dashboard/github/login',
                            'data': postData
                        }, function (error) {
                            if (error) {
                                $scope.displayAlert('danger', error.message);
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

    $scope.deleteAccount = function (account) {
        if (account.access === 'public') {
            getSendDataFromServer($scope, ngDataApi, {
                'method': 'get',
                'routeName': '/dashboard/github/logout',
                'params': {
                    id: account._id.toString(),
                    username: account.username
                }
            }, function (error) {
                if (error) {
                    $scope.displayAlert('danger', error.message);
                } else {
                    $scope.displayAlert('success', 'Logout Successfull');
                    $scope.listAccounts();
                }
            });
        } else if (account.access === 'private') {
            var formConfig = angular.copy(githubAppConfig.form.logout);
            var options = {
                timeout: $timeout,
                form: formConfig,
                name: 'removeGithubAccount',
                label: 'Remove GitHub Account',
                actions: [
                    {
                        'type': 'submit',
                        'label': 'Submit',
                        'btn': 'primary',
                        'action': function (formData) {
                            var params = {
                                id: account._id.toString(),
                                username: account.username,
                                password: formData.password
                            };
                            getSendDataFromServer($scope, ngDataApi, {
                                'method': 'get',
                                'routeName': '/dashboard/github/logout',
                                'params': params
                            }, function (error) {
                                if (error) {
                                    $scope.$parent.displayAlert('danger', error.message);
                                    $scope.modalInstance.close();
                                } else {
                                    $scope.$parent.displayAlert('success', 'Logout Successfull');
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
        }
    };

    $scope.listRepos = function (accounts, counter) {
        var id = accounts[counter]._id;

        getSendDataFromServer($scope, ngDataApi, {
            "method": "get",
            "routeName": "/dashboard/github/getRepos",
            "params": {id: id}
        }, function (error, response) {
            if (error) {
                $scope.displayAlert('danger', error.message);
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
                $scope.displayAlert('danger', error.message);
            } else {
                $scope.displayAlert('success', 'Repository has been activated');
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
                $scope.displayAlert('danger', error.message);
            } else {
                $scope.displayAlert('success', 'Repository has been deactivated');
                for (var i = 0; i < $scope.accounts.length; i++) {
                    if ($scope.accounts[i]._id === accountId) {
                        var account = $scope.accounts[i];
                        for (var j = 0; j < account.repos.length; j++) {
                            if (account.repos[j].full_name === repo.full_name) {
                                account.repos[j].status = '';
                            }
                        }
                    }
                }
            }
        });
    };

    $scope.syncRepo = function (accountId, repo) {
        getSendDataFromServer($scope, ngDataApi, {
            method: 'send',
            routeName: '/dashboard/github/repo/sync',
            params: {
                id: accountId.toString()
            },
            data: {
                user: repo.owner.login,
                repo: repo.name
            }
        }, function (error, response) {
            if (error) {
                $scope.displayAlert('danger', error.message);
            } else {
                if (response.status === 'upToDate') {
                    $scope.displayAlert('success', 'Repository is up to date');
                }
                else if (response.status === 'outOfSync') {
                    repo.status = 'outOfSync';
                    var repoOutOfSync = $modal.open({
                        templateUrl: 'repoOutOfSync.tmpl',
                        backdrop: true,
                        keyboard: true,
                        controller: function ($scope) {
                            fixBackDrop();

                            $scope.reactivate = function () {
                                getSendDataFromServer($scope, ngDataApi, {
                                    method: 'get',
                                    routeName: '/dashboard/github/repo/deactivate',
                                    params: {
                                        id: accountId.toString(),
                                        user: repo.owner.login,
                                        repo: repo.name
                                    }
                                }, function (error) {
                                    if (error) {
                                        // $scope.displayAlert('danger', error.message);
                                        repoOutOfSync.close();
                                    } else {
                                        getSendDataFromServer($scope, ngDataApi, {
                                            'method': 'send',
                                            routeName: '/dashboard/github/repo/activate',
                                            params: {
                                                id: accountId.toString()
                                            },
                                            data: {
                                                user: repo.owner.login,
                                                repo: repo.name
                                            }
                                        }, function (error, result) {
                                            if (error) {
                                                // $scope.displayAlert('danger', error.message);
                                                repoOutOfSync.close();
                                            } else {
                                                // $scope.displayAlert('success', 'Repository has been reactivated');
                                                repo.status = 'active';
                                                repoOutOfSync.close();
                                            }
                                        });
                                    }
                                });
                            };

                            $scope.cancel = function () {
                                repoOutOfSync.close();
                            };
                        }
                    });
                }
                else {
                    $scope.displayAlert('success', 'Repository has been synced');
                }
            }
        });
    };

    injectFiles.injectCss("modules/DASHBOARD/githubApp/githubApp.css");
    if ($scope.access.listAccounts) {
        $scope.listAccounts();
    }
}]);