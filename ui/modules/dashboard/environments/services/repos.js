"use strict";
var deployReposService = soajsApp.components;
deployReposService.service('deployRepos', ['ngDataApi', '$timeout', '$modal', function (ngDataApi, $timeout, $modal) {

	function listGitAccounts(currentScope) {
		getSendDataFromServer(currentScope, ngDataApi, {
            'method': 'get',
            'routeName': '/dashboard/gitAccounts/accounts/list'
        }, function (error, response) {
            if (error) {
                currentScope.displayAlert('danger', error.message);
            } else {
                currentScope.accounts = response;

                currentScope.accounts.forEach(function(oneAccount){
                	oneAccount.hide = true;
                });

                if (currentScope.accounts.length > 0) {
                    var counter = 0;
                    listRepos(currentScope, 'getRepos');
                }
                if(currentScope.accounts.length === 1){
                	currentScope.accounts[0].hide = false;
                	currentScope.accounts[0].icon = 'minus';
                }
            }
        });
	}

	function listRepos(currentScope, action) {
		if (!Array.isArray(currentScope.accounts)) {
			currentScope.accounts = [currentScope.accounts];
		}

		currentScope.accounts.forEach(function (oneAccount) {
			var id = oneAccount._id;
            oneAccount.loading = true;
            if (!oneAccount.nextPageNumber) {
                oneAccount.nextPageNumber = currentScope.defaultPageNumber;
            }

			getSendDataFromServer(currentScope, ngDataApi, {
                "method": "get",
                "routeName": "/dashboard/gitAccounts/getRepos",
                "params": {
                    id: id,
                    provider: oneAccount.provider,
                    per_page: currentScope.defaultPerPage,
                    page: (action === 'loadMore') ? oneAccount.nextPageNumber : currentScope.defaultPageNumber,
					activeOnly: true
                }
            }, function (error, response) {
				oneAccount.loading = false;
                if (error) {
                    currentScope.displayAlert('danger', error.message);
                } else {
                    if (action === 'loadMore') {
                        appendNewRepos(oneAccount, response);
                    }
                    else if (action === 'getRepos') {
                        oneAccount.repos = response;

                        oneAccount.nextPageNumber = 2;
                        oneAccount.allowLoadMore = (response.length === currentScope.defaultPerPage);
                    }
                }
			});
		});
	}

	function appendNewRepos (currentScope, account, repos) {
		account.nextPageNumber++;
        account.allowLoadMore = (repos.length === currentScope.defaultPerPage);

        if (!account.repos) {
            account.repos = [];
        }

        if (account.owner === 'soajs') {
            repos.forEach (function (oneRepo) {
                if (currentScope.excludedSOAJSRepos.indexOf(oneRepo.full_name) === -1) {
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
	}

	return {
		'listGitAccounts': listGitAccounts,
		'listRepos': listRepos
	};

}]);
