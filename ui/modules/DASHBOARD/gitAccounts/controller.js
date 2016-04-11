'use strict';

var githubApp = soajsApp.components;
githubApp.controller ('githubAppCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', 'injectFiles', function ($scope, $timeout, $modal, ngDataApi, injectFiles) {
    $scope.$parent.isUserLoggedIn();

    $scope.access = {};
    constructModulePermissions($scope, $scope.access, githubAppConfig.permissions);

    $scope.referToDoc = 'Refer to the online documentation at ' + '<a target="_blank" href="http://soajs.org/#/documentation">SOAJS Website.</a>';
    $scope.excludedSOAJSRepos = ['soajs/connect-mongo-soajs', 'soajs/soajs', 'soajs/soajs.agent', 'soajs/soajs.composer', 'soajs/soajs.dash.example', 'soajs/soajs.gcs', 'soajs/soajs.mongodb.data', 'soajs/soajs.utilities', 'soajs/soajs.website.contactus'];

    $scope.defaultPageNumber = 1;
    $scope.defaultPerPage = 100;

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
                    $scope.listRepos($scope.accounts, counter, 'getRepos', loadingModal);
                }
            }
        });
    };

    $scope.addAccount = function () {
        var formConfig = angular.copy(githubAppConfig.form.login);
        var accountType = {
            'name': 'type',
            'label': 'Account Type',
            'class': 'accountType',
            'type': 'radio',
            'value': [{'v': 'personal_public', 'l': 'Personal Account - Public Repositories', 'selected': true},
                {'v': 'personal_private', 'l': 'Personal Account - Public and Private Repositories'},
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
            label: translation.addNewGitAccount[LANG],
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
                                $scope.$parent.displayAlert('success', translation.loginSuccessful[LANG]);
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
                    $scope.displayAlert('success', translation.logoutSuccessful[LANG]);
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
                                    $scope.$parent.displayAlert('success', translation.logoutSuccessful[LANG]);
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

    $scope.listRepos = function (accounts, counter, action, loadingModal) {
        //in case of one repo only
        if (!Array.isArray(accounts)) {
            accounts = [accounts];
            counter = (counter) ? counter : 0;
        }
        var id = accounts[counter]._id;
        if (!accounts[counter].nextPageNumber) {
            accounts[counter].nextPageNumber = $scope.defaultPageNumber;
        }

        getSendDataFromServer($scope, ngDataApi, {
            "method": "get",
            "routeName": "/dashboard/github/getRepos",
            "params": {
                id: id,
                per_page: $scope.defaultPerPage,
                page: (action === 'loadMore') ? accounts[counter].nextPageNumber : $scope.defaultPageNumber
            }
        }, function (error, response) {
            if (error) {
                $scope.displayAlert('danger', error.message);
                if (loadingModal) {
                    loadingModal.close();
                }
            } else {
                if (action === 'loadMore') {
                    $scope.appendNewRepos(accounts[counter], response);
                }
                else if (action === 'getRepos') {

                    if (accounts[counter].owner === 'soajs') {
                        accounts[counter].repos = [];
                        response.forEach (function (oneRepo) {
                            if ($scope.excludedSOAJSRepos.indexOf(oneRepo.full_name) === -1) {
                                accounts[counter].repos.push(oneRepo);
                            }
                        });
                    }
                    else {
                        accounts[counter].repos = response;
                    }

                    accounts[counter].nextPageNumber = 2;
                    accounts[counter].allowLoadMore = (response.length === $scope.defaultPerPage);

                    counter++;
                    if (counter < accounts.length) {
                        return $scope.listRepos(accounts, counter, 'getRepos', loadingModal);
                    } else {
                        if (loadingModal) {
                            loadingModal.close();
                        }
                        else {
                            $scope.displayAlert('success', translation.listOfReposUpToDate[LANG]);
                        }
                    }
                }
            }
        });
    };

    $scope.appendNewRepos = function (account, repos) {
        account.nextPageNumber++;
        account.allowLoadMore = (repos.length === $scope.defaultPerPage);

        if (!account.repos) {
            account.repos = [];
        }

        if (account.owner === 'soajs') {
            repos.forEach (function (oneRepo) {
                if ($scope.excludedSOAJSRepos.indexOf(oneRepo.full_name) === -1) {
                    account.repos.push(oneRepo);
                }
            });
            setTimeout(function(){
                jQuery('#reposList').animate({scrollTop: jQuery('#reposList').prop("scrollHeight")}, 1500);
            },500);
        }
        else {
            account.repos = account.repos.concat(repos);
            setTimeout(function(){
                jQuery('#reposList').animate({scrollTop: jQuery('#reposList').prop("scrollHeight")}, 1500);
            },500);
        }
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
                    label: translation.chooseConfigBranch[LANG],
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
                                        $scope.modalInstance.dismiss('cancel');
                                        $scope.form.formData = {};
                                        var outerScope = $scope;
                                        var errorDisplay = $modal.open({
                                            templateUrl: 'errorDisplay.tmpl',
                                            backdrop: true,
                                            keyboard: true,
                                            controller: function ($scope) {
                                                fixBackDrop();

                                                $scope.title = translation.repoActivationFailed[LANG];
                                                $scope.error = error.message + "<br>" + outerScope.referToDoc;
                                                $scope.ok = function () {
                                                    errorDisplay.close();
                                                }
                                            }
                                        });
                                    } else {
                                        $scope.modalInstance.dismiss('cancel');
                                        $scope.form.formData = {};

                                        $scope.displayAlert('success', translation.repoHasBeenActivated[LANG]);

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
                $scope.displayAlert('success', translation.repoHasBeenDeactivated[LANG]);
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
                                        repoOutOfSync.close();
                                        outerScope.activateRepo(account, repo);
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
                } else {
                    $scope.displayAlert('success', 'Repository has been synced');
                }
            }
        });
    };

    injectFiles.injectCss("modules/DASHBOARD/gitAccounts/gitAccounts.css");
    if ($scope.access.listAccounts) {
        $scope.listAccounts();
    }
}]);