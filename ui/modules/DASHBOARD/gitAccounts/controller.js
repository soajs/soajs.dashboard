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

                if ($scope.accounts.length > 0) {
                    var counter = 0;
                    var loadingModal = $modal.open({
                        templateUrl: "loading.tmpl",
                        backdrop: true,
                        keyboard: false,
                        controller: function ($scope, $modalInstance) {
                            fixBackDrop();
                            $scope.imagePath = './themes/' + themeToUse + '/img/loading.gif';
                        }
                    });
                    $scope.listRepos($scope.accounts, counter, loadingModal);
                }
            }
        });
    };

    $scope.addAccount = function () {
        var formConfig = angular.copy(githubAppConfig.form.login);
        var accountType = {
            'name': 'type',
            'label': 'Account Type',
            'type': 'radio',
            'value': [{'v': 'personal_public', 'l': 'Personal Account - Public', 'selected': true},
                {'v': 'personal_private', 'l': 'Personal Account - Private'},
                {'v': 'organization_public', 'l': 'Organization - Public'}],
            'required': true,
            onAction: function (label, selected, formConfig) {
                if (selected.split('_')[1] === 'private' && formConfig.entries[4].name !== 'password') {
                    var password = {
                        'name': 'password',
                        'label': 'Password',
                        'type': 'password',
                        'value': '',
                        'tooltip': 'Account Password',
                        'placeholder': 'Your Password',
                        'required': true
                    };
                    formConfig.entries.splice(4, 0, password);
                } else {
                    if (formConfig.entries[4].name === 'password') {
                        formConfig.entries.splice(4, 1);
                    }
                }
            }
        };

        formConfig.entries.splice(2, 0, accountType);

        var options = {
            timeout: $timeout,
            form: formConfig,
            name: 'addGitAccount',
            label: 'Add New Git Account',
            actions: [
                {
                    'type': 'submit',
                    'label': 'Submit',
                    'btn': 'primary',
                    'action': function (formData) {
                        var postData = {
                            provider: formData.provider,
                            label: formData.label,
                            username: formData.username,
                            type: formData.type.split('_')[0],
                            access: formData.type.split('_')[1]
                        };

                        if (formData.password) {
                            postData.password = formData.password;
                        }

                        getSendDataFromServer($scope, ngDataApi, {
                            'method': 'send',
                            'routeName': '/dashboard/github/login',
                            'data': postData
                        }, function (error) {
                            if (error) {
                                $scope.form.displayAlert('danger', error.message);
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
                    username: account.owner
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
                                username: account.owner,
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

    $scope.listRepos = function (accounts, counter, loadingModal) {
        //in case of one repo only
        if (!Array.isArray(accounts)) {
            accounts = [accounts];
            if (!counter) {
                counter = 0;
            }
        }
        var id = accounts[counter]._id;

        getSendDataFromServer($scope, ngDataApi, {
            "method": "get",
            "routeName": "/dashboard/github/getRepos",
            "params": {id: id}
        }, function (error, response) {
            if (error) {
                $scope.displayAlert('danger', error.message);
                if (loadingModal) {
                    loadingModal.close();
                }
            } else {
                for (var i = 0; i < $scope.accounts.length; i++) {
                    if ($scope.accounts[i]._id === id) {
                        $scope.accounts[i].repos = response;
                    }
                }

                counter++;
                if (counter < accounts.length) {
                    return $scope.listRepos(accounts, counter, loadingModal);
                } else {
                    if (loadingModal) {
                        loadingModal.close();
                    }
                    else {
                        $scope.displayAlert('success', 'List of repositories is up to date');
                    }
                }
            }
        });
    };

    $scope.activateRepo = function (account, repo) {
        var formConfig = angular.copy(githubAppConfig.form.selectConfigBranch);
        getSendDataFromServer($scope, ngDataApi, {
            method: 'get',
            routeName: '/dashboard/github/getBranches',
            params: {
                name: repo.full_name,
                type: 'repo',
                id: account._id.toString()
            }
        }, function (error, result) {
            if (error) {
                $scope.displayAlert('danger', error.message);
            }
            else {
                result.branches.forEach(function (oneBranch) {
                    formConfig.entries[0].value.push({'v': oneBranch.name, 'l': oneBranch.name});
                });

                var options = {
                    timeout: $timeout,
                    form: formConfig,
                    name: 'selectConfigBranch',
                    label: 'Choose Config Branch',
                    actions: [
                        {
                            'type': 'submit',
                            'label': 'Submit',
                            'btn': 'primary',
                            'action': function (formData) {
                                getSendDataFromServer($scope, ngDataApi, {
                                    method: 'send',
                                    routeName: '/dashboard/github/repo/activate',
                                    params: {
                                        id: account._id.toString()
                                    },
                                    data: {
                                        provider: account.provider,
                                        owner: repo.owner.login,
                                        repo: repo.name,
                                        configBranch: formData.branch
                                    }
                                }, function (error, response) {
                                    if (error) {
                                        $scope.displayAlert('danger', error.message);
                                    } else {
                                        $scope.displayAlert('success', 'Repository has been activated');

                                        $scope.modalInstance.dismiss('cancel');
                                        $scope.form.formData = {};

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
        });
    };

    $scope.deactivateRepo = function (accountId, repo) {
        getSendDataFromServer($scope, ngDataApi, {
            method: 'get',
            routeName: '/dashboard/github/repo/deactivate',
            params: {
                id: accountId.toString(),
                owner: repo.owner.login,
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

    $scope.syncRepo = function (account, repo) {
        getSendDataFromServer($scope, ngDataApi, {
            method: 'send',
            routeName: '/dashboard/github/repo/sync',
            params: {
                id: account._id.toString()
            },
            data: {
                owner: repo.owner.login,
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
                    var outerScope = $scope;
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
                                        id: account._id.toString(),
                                        owner: repo.owner.login,
                                        repo: repo.name
                                    }
                                }, function (error) {
                                    if (error) {
                                        outerScope.displayAlert('danger', error.message);
                                        repoOutOfSync.close();
                                    } else {
                                        getSendDataFromServer($scope, ngDataApi, {
                                            'method': 'send',
                                            routeName: '/dashboard/github/repo/activate',
                                            params: {
                                                id: account._id.toString()
                                            },
                                            data: {
                                                provider: account.provider,
                                                owner: repo.owner.login,
                                                repo: repo.name
                                            }
                                        }, function (error, result) {
                                            if (error) {
                                                outerScope.displayAlert('danger', error.message);
                                                repoOutOfSync.close();
                                            } else {
                                                outerScope.displayAlert('success', 'Repository has been reactivated');
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
                else if (response.status === 'multiSyncDone'){
                    if (response.updated.length === 0 && response.removed.length === 0 && response.added.length === 0) {
                        $scope.displayAlert('success', 'Repository is up to date');
                    } else {
                        var syncSuccess = $modal.open({
                            templateUrl: 'syncSuccess.tmpl',
                            backdrop: true,
                            keyboard: true,
                            controller: function ($scope) {
                                fixBackDrop();
                                $scope.results = {
                                    updated: response.updated,
                                    added: response.added,
                                    removed: response.removed
                                };

                                $scope.ok = function () {
                                    syncSuccess.close();
                                }
                            }
                        });
                    }
                }
            }
        });
    };

    injectFiles.injectCss("modules/DASHBOARD/gitAccounts/gitAccounts.css");
    if ($scope.access.listAccounts) {
        $scope.listAccounts();
    }
}]);