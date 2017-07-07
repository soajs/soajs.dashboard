"use strict";
var deployReposService = soajsApp.components;
deployReposService.service('deployRepos', ['ngDataApi', '$timeout', '$modal', function (ngDataApi, $timeout, $modal) {

	function listGitAccounts(currentScope, cb) {
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
					listRepos(currentScope, 'getRepos', cb);
				}
				if(currentScope.accounts.length === 1){
					currentScope.accounts[0].hide = false;
					currentScope.accounts[0].icon = 'minus';
				}
			}
		});
	}

	function listRepos(currentScope, action, cb) {
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

						oneAccount.repos.forEach(function (oneRepo) {
							var repoServices = [];
							if (oneRepo.type === 'service' || oneRepo.type === 'daemon') {
								repoServices.push({ name: oneRepo.serviceName, type: oneRepo.type });
							}
							else if (oneRepo.type === 'multi') {
								repoServices = oneRepo.multi;
							}

							oneRepo.servicesList = repoServices;
						});

			            oneAccount.nextPageNumber = 2;
			            oneAccount.allowLoadMore = (response.length === currentScope.defaultPerPage);

						getServices(currentScope, function () {
							getDaemons(currentScope, function () {
								oneAccount.repos.forEach(function (oneRepo) {
									oneRepo.servicesList.forEach(function (oneRepoService) {
										var type = (oneRepoService.type === 'service') ? 'services': 'daemons';
										currentScope[type].forEach(function (oneService) {
											if (oneService.name === oneRepoService.name) {
												oneRepoService.versions = [];
												if (oneService.versions) {
													Object.keys(oneService.versions).forEach(function (oneVersion) {
														oneRepoService.versions.push({ v: oneVersion });
													});
												}
											}
										});
									});
								});

								if (cb) {
									return cb();
								}
							});
						});
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

	function getCdData (currentScope) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/cd"
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.message);
			} else {
				if (!response[currentScope.envCode.toUpperCase()] || Object.keys(response[currentScope.envCode.toUpperCase()]).length === 0) {
					currentScope.cdSettings = {};
					return;
				}

				currentScope.cdSettings = response[currentScope.envCode.toUpperCase()];
				currentScope.accounts.forEach(function(oneAccount) {
					if (oneAccount.repos && oneAccount.repos.length > 0) {
						oneAccount.repos.forEach(function (oneRepo) {
							if (currentScope.cdSettings[oneRepo.name]) {
								oneRepo.deploySettings = currentScope.cdSettings[oneRepo.name];
							}

							oneRepo.servicesList.forEach(function (oneService) {
								if (currentScope.cdSettings[oneService.name]) {
									oneService.deploySettings = currentScope.cdSettings[oneService.name];

									if (oneService.versions && oneService.versions.length > 0) {
										oneService.versions.forEach(function (oneVersion) {
											if (currentScope.cdSettings[oneService.name]['v' + oneVersion.v]) {
												oneVersion.deploySettings = currentScope.cdSettings[oneService.name]['v' + oneVersion.v];
											}
										});
									}
								}
							});
						});
					}
				});
			}
		});
	}

	function getDeployedServices(currentScope) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/cloud/services/list",
			"params": {
				"env": currentScope.envCode
			}
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.message);
			} else {
				currentScope.accounts.forEach(function (oneAccount) {
					if (oneAccount.repos && oneAccount.repos.length > 0) {
						oneAccount.repos.forEach(function (oneRepo) {
							if (oneRepo.servicesList) {
								oneRepo.servicesList.forEach(function (oneService) {
									response.forEach(function (oneDeployedEntry) {
										if (oneDeployedEntry.labels && oneDeployedEntry.labels['soajs.service.name'] && oneDeployedEntry.labels['soajs.service.name'] === oneService.name) {
											oneService.deployed = true;
											oneService.deployedVersionsCounter = 0;
											if (oneService.versions) {
												oneService.versions.forEach(function (oneVersion) {
													if (oneDeployedEntry.labels && oneDeployedEntry.labels['soajs.service.version'] && oneDeployedEntry.labels['soajs.service.version'] === oneVersion.v) {
														oneVersion.deployed = true;
														oneService.deployedVersionsCounter++;
													}
												});
											}
											else {
												oneService.deployed = true;
											}
										}
									});
								});
							}
							else {
								response.forEach(function (oneDeployedEntry) {
									if (oneDeployedEntry.labels && oneDeployedEntry.labels['service.repo'] && oneDeployedEntry.labels['service.repo'] === oneRepo.name) {
										oneRepo.deployed = true;
									}
								});
							}
						});
					}
				});
			}
		});
	}

	function getServices(currentScope, cb) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "post",
			"routeName": "/dashboard/services/list"
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.message);
			} else {
				currentScope.services = response.records;
				return cb();
			}
		});
	}

	function getDaemons(currentScope, cb) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "post",
			"routeName": "/dashboard/daemons/list"
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.message);
			} else {
				currentScope.daemons = response;
				return cb();
			}
		});
	}

	return {
		'listGitAccounts': listGitAccounts,
		'listRepos': listRepos,
		'getCdData': getCdData,
		'getDeployedServices': getDeployedServices
	};

}]);
