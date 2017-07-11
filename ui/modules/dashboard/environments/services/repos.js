"use strict";
var deployReposService = soajsApp.components;
deployReposService.service('deployRepos', ['ngDataApi', '$timeout', '$modal', '$cookies', function (ngDataApi, $timeout, $modal, $cookies) {
	
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
						if (oneAccount.owner === 'soajs') {
							for (var i = response.length - 1; i >= 0; i--) {
								if (['soajs.dashboard', 'soajs.gcs'].indexOf(response[i].name) !== -1) {
									response.splice(i, 1);
								}
							}
						}

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

								getCdData(currentScope, function () {
									getDeployedServices(currentScope);
								});
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

	function getCdData (currentScope, cb) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/cd"
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.message);
			} else {
				if (!response[currentScope.envCode.toUpperCase()] || Object.keys(response[currentScope.envCode.toUpperCase()]).length === 0) {
					currentScope.cdSettings = {};
					return cb();
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

				return cb();
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
														oneVersion.serviceId = oneDeployedEntry.id;
														oneService.deployedVersionsCounter++;
													}
												});
											}
											else {
												oneService.deployed = true;
												oneService.serviceId = oneDeployedEntry.id;
											}
										}
									});
								});
							}
							else {
								response.forEach(function (oneDeployedEntry) {
									if (oneDeployedEntry.labels && oneDeployedEntry.labels['service.repo'] && oneDeployedEntry.labels['service.repo'] === oneRepo.name) {
										oneRepo.deployed = true;
										oneRepo.serviceId = oneDeployedEntry.id;
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
	
	function deployService(currentScope, oneRepo, service, version, gitAccount) {
		var envDeployer = $cookies.getObject("myEnv").deployer;
		var envPlatform = envDeployer.selected.split('.')[1];
		var deployService = $modal.open({
			templateUrl: 'deployService.tmpl',
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function ($scope) {
				fixBackDrop();
				$scope.deployNewService = true;
				$scope.version = version.v || 'Default';
				$scope.oneEnv = $cookies.getObject('myEnv').code.toUpperCase();
				$scope.cdEnvs = [$scope.oneEnv];
				$scope.deployed = false;
				$scope.oneSrv = (service && service.name) ? service.name : oneRepo.name;
				$scope.serviceType = (service && service.type) ? service.type : 'custom';
				if ((service && service.deployed) || (version && version.deployed)) {
					$scope.serviceId = version.id || service.id;
					$scope.deployed = true;
				}
				$scope.services = {};
				$scope.default = false;
				$scope.gitAccount = gitAccount;
				$scope.alerts = [];
				$scope.imagePath = 'themes/' + themeToUse + '/img/loading.gif';
				getCDRecipe($scope, oneRepo, function () {
					$scope.setDeploy($scope.oneEnv, $scope.version, $scope.oneSrv, false)
				});
				
				$scope.cancel = function () {
					deployService.close();
				};
				
				$scope.displayAlert = function (type, msg, isCode, service, orgMesg) {
					$scope.alerts = [];
					if (isCode) {
						var msgT = getCodeMessage(msg, service, orgMesg);
						if (msgT) {
							msg = msgT;
						}
					}
					$scope.alerts.push({'type': type, 'msg': msg});
				};
				
				$scope.closeAlert = function (index) {
					$scope.alerts.splice(index, 1);
				};
				
				
				$scope.showHide = function (oneService, name) {
					if (oneService.icon === 'minus') {
						oneService.icon = 'plus';
						jQuery('#cd_' + name).slideUp();
					}
					else {
						oneService.icon = 'minus';
						jQuery('#cd_' + name).slideDown()
					}
				};
				
				$scope.cdShowHide = function (oneSrv, name) {
					if ($scope.cdConfiguration[oneSrv].icon === 'minus') {
						$scope.cdConfiguration[oneSrv].icon = 'plus';
						jQuery('#cdc_' + name).slideUp();
					}
					else {
						$scope.cdConfiguration[oneSrv].icon = 'minus';
						jQuery('#cdc_' + name).slideDown()
					}
				};
				
				// $scope.setVersion = function (oneEnv, version, oneSrv) {
				// 	var deployedBranch = '';
				// 	if($scope.cdConfiguration[oneSrv][oneEnv].cdData.versions && $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version] && $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].branch){
				// 		deployedBranch = $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].branch;
				// 	}
				// 	if($scope.cdConfiguration[oneSrv][oneEnv].obj.ha[version] && $scope.cdConfiguration[oneSrv][oneEnv].obj.ha[version].labels && $scope.cdConfiguration[oneSrv][oneEnv].obj.ha[version].labels['service.branch']){
				// 		deployedBranch = $scope.cdConfiguration[oneSrv][oneEnv].obj.ha[version].labels['service.branch'];
				// 	}
				// 	if ($scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version] && $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].active) {
				// 		delete $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].active;
				// 	}
				// 	else if(!$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version]){
				// 		$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version] = {
				// 			branch: deployedBranch,
				// 			active: true
				// 		};
				// 	}
				// 	else{
				// 		$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].active = true;
				// 	}
				// };
				
				$scope.updateGitBranch = function (oneSrv, oneEnv, version) {
					$scope.branches.forEach(function (oneBranch) {
						if (oneBranch.name = $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].branch){
							if ($scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options) {
								$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.gitSource.branch = $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].branch;
								$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.gitSource.commit = oneBranch.commit;
							}
						}
					});
				
				};
				
				$scope.setDeploy = function (oneEnv, version, oneSrv, first) {
					var isKubernetes = (envPlatform.toLowerCase() === "kubernetes");
					var deployedBranch = '';
					if ($scope.cdConfiguration[oneSrv][oneEnv].cdData.versions && $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version] && $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].branch) {
						deployedBranch = $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].branch;
					}
					if ($scope.cdConfiguration[oneSrv][oneEnv].obj.ha[version] && $scope.cdConfiguration[oneSrv][oneEnv].obj.ha[version].labels && $scope.cdConfiguration[oneSrv][oneEnv].obj.ha[version].labels['service.branch']) {
						deployedBranch = $scope.cdConfiguration[oneSrv][oneEnv].obj.ha[version].labels['service.branch'];
					}
					if ($scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version] && $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].active) {
						delete $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].active;
					}
					else if (!$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version]) {
						$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version] = {
							branch: deployedBranch,
							active: true
						};
					}
					else {
						$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].active = true;
					}
					getCatalogRecipes($scope, function () {
						$scope.myRecipes = [];
						for (var type in $scope.recipes) {
							$scope.recipes[type].forEach(function (oneRecipe) {
								if (oneRecipe.recipe && oneRecipe.recipe.deployOptions && oneRecipe.recipe.deployOptions.specifyGitConfiguration) {
									$scope.myRecipes.push(oneRecipe);
								}
							});
						}
						if (!$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options) {
							$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options = {'deployConfig': {'replication': {}}};
						}
						$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.gitSource = {};
						$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.gitSource.branch = $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].branch;
						
						$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.gitSource.owner = $scope.gitAccount.owner;
						$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.gitSource.repo = oneRepo.name;
						if (isKubernetes) {
							$scope.deploymentModes = ['deployment', 'daemonset'];
							if (!$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.deployConfig.replication.mode) {
								$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.deployConfig.replication.mode = 'deployment';
							}
						}
						else {
							$scope.deploymentModes = ['replicated', 'global'];
							if (!$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.deployConfig.replication.mode) {
								$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.deployConfig.replication.mode = 'replicated';
							}
						}
						var service = $scope.services[oneSrv];
						$scope.groupConfigs = '';
						if (!$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.deployConfig.memoryLimit) {
							if (service && service.prerequisites && service.prerequisites.memory && service.prerequisites.memory.trim().length > 0) {
								$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.deployConfig.memoryLimit = parseFloat(service.prerequisites.memory);
							} else {
								$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.deployConfig.memoryLimit = 500;
							}
						}
						else {
							$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.deployConfig.memoryLimit /= 1048576;
							
							if ($scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.deployConfig.memoryLimit < 1) {
								$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.deployConfig.memoryLimit = 500;
							}
						}
						
						if (service.type === 'daemon' && service.grpConf) {
							$scope.groupConfigs = service.grpConf;
						}
						
						$scope.injectCatalogEntries(oneEnv, version, oneSrv, first);
					});
				};
				
				$scope.injectCatalogEntries = function (oneEnv, version, oneSrv, first) {
					$scope.allowGitOverride = false;
					if (first) {
						if (!$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom) {
							$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom = {};
						}
						if (!$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.env) {
							$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.env = {};
						}
						if (!$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.image) {
							$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.image = {};
						}
					}
					else {
						$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom = {};
						$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.env = {};
						$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.image = {};
					}
					$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].custom = {};
					for (var type in $scope.recipes) {
						$scope.recipes[type].forEach(function (catalogRecipe) {
							if (catalogRecipe._id === $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.recipe) {
								if (catalogRecipe.recipe.deployOptions.image.override && Object.keys($scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.image).length === 0) {
									$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.image.prefix = catalogRecipe.recipe.deployOptions.image.prefix;
									$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.image.name = catalogRecipe.recipe.deployOptions.image.name;
									$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.image.tag = catalogRecipe.recipe.deployOptions.image.tag;
								}
								else if (!first) {
									delete $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.image;
								}
								//append inputs whose type is userInput
								for (var envVariable in catalogRecipe.recipe.buildOptions.env) {
									if (catalogRecipe.recipe.buildOptions.env[envVariable].type === 'userInput') {
										var newCatalogInput = {
											label: catalogRecipe.recipe.buildOptions.env[envVariable].label || envVariable,
											name: envVariable,
											value: catalogRecipe.recipe.buildOptions.env[envVariable].default || "",
											fieldMsg: catalogRecipe.recipe.buildOptions.env[envVariable].fieldMsg,
											required: (catalogRecipe.recipe.buildOptions.env[envVariable].default && catalogRecipe.recipe.buildOptions.env[envVariable].default !== '') ? false : true
										};
										$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].custom[envVariable] = newCatalogInput;
										if (!$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.env[envVariable]) {
											$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.env[envVariable] = catalogRecipe.recipe.buildOptions.env[envVariable].default || "";
										}
									}
								}
								if (Object.keys($scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.env).length === 0) {
									delete $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.env;
								}
								
								$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.env = oneEnv;
								if (catalogRecipe.recipe.deployOptions.specifyGitConfiguration) {
									$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.name = oneSrv;
									$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.type = $scope.cdConfiguration[oneSrv].type;
									$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.version = version;
									$scope.allowGitOverride = true;
								}
							}
						});
					}
				};
				
				$scope.saveRecipe = function (type) {
					saveRecipe($scope, type, function () {
					
					});
				};
				
			}
		});
	}
	
	function getCatalogRecipes(currentScope, cb) {
		currentScope.loadingRecipes = true;
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/catalog/recipes/list'
		}, function (error, response) {
			currentScope.loadingRecipes = false;
			if (error) {
				currentScope.displayAlert('danger', 'Unable to retrieve catalog recipes');
			}
			else {
				currentScope.recipes = {};
				response.forEach(function (oneRecipe) {
					if (!currentScope.recipes[oneRecipe.type]) {
						currentScope.recipes[oneRecipe.type] = [];
					}
					currentScope.recipes[oneRecipe.type].push(oneRecipe);
				});
				return cb();
			}
		});
	}
	
	function saveRecipe(currentScope, type, cb) {
		var configuration = {};
		var modes = ['deployment', 'replicated'];
		var oneEnv = currentScope.oneEnv;
		var version = currentScope.version;
		var oneRepo = currentScope.oneSrv;
		configuration.serviceName = oneRepo;
		configuration.env = oneEnv;
		// if (currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options && currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options.deployConfig && currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options.deployConfig.memoryLimit) {
		// 	currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options.deployConfig.memoryLimit *= 1048576;
		// }
		if (version === 'Default') {
			configuration.default = {
				branch: currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].branch,
				strategy: currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].strategy,
				deploy: false
			};
			if (currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options) {
				if (modes.indexOf(currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options.deployConfig.replication.mode) === -1) {
					delete currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options.deployConfig.replication.replicas;
				}
				configuration.default.options = angular.copy(currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options);
				if (configuration.default.options && configuration.default.options.deployConfig && configuration.default.options.deployConfig.memoryLimit) {
					configuration.default.options.deployConfig.memoryLimit *= 1048576;
				}
				configuration.version.deploy = true;
			}
		}
		else {
			configuration.version = {};
			configuration.version = {
				v: 'v' + version,
				branch: currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].branch,
				strategy: currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].strategy,
				deploy: false
			};
			if (currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options) {
				if (modes.indexOf(currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options.deployConfig.replication.mode) === -1) {
					delete currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options.deployConfig.replication.replicas;
				}
				configuration.version.options = currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options;
				configuration.version.deploy = true;
			}
		}
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'post',
			routeName: '/dashboard/cd',
			data: {
				"config": configuration
			}
		}, function (error) {
			var returnCb = false;
			if (cb && typeof cb === 'function') {
				returnCb = true;
			}
			if (error) {
				overlayLoading.hide();
				currentScope.displayAlert('danger', error.message);
				if (returnCb) {
					return cb(error)
				}
			}
			else {
				var options = {};
				if (configuration.version && configuration.version.options) {
					options = configuration.version.options;
				}
				else if (configuration.default && configuration.default.options) {
					options = configuration.default.options;
				}
				switch (type) {
					case 'deploy':
						overlayLoading.show();
						doDeploy(currentScope, options);
						break;
					case 'rebuild':
						overlayLoading.show();
						doRebuild(currentScope, options);
						break;
					default :
						overlayLoading.hide();
						currentScope.displayAlert('success', 'Recipe Saved successfully');
						currentScope.cancel();
						if (returnCb) {
							cb(null, true);
						}
				}
			}
		});
	}
	
	function getCDRecipe(currentScope, oneRepo, cb) {
		currentScope.cdConfiguration = null;
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/cd'
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
				return cb();
			}
			else {
				var defaultCD = {
					"branch": "master",
					"strategy": "notify",
					"default": true
				};
				
				if (!response) {
					response = {};
				}
				currentScope.cdData = response;
				currentScope.cdConfiguration = {};
				currentScope.cdConfiguration[currentScope.oneSrv] = {
					type: currentScope.serviceType,
					icon: 'minus'
				};
				
				var max = Object.keys(currentScope.cdConfiguration).length;
				currentScope.maxEntries = 0;
				var repoCount = 0;
				populateServiceInEnvironments(currentScope.oneSrv, defaultCD, function () {
					repoCount++;
					if (repoCount === max) {
						for (var oneService in currentScope.cdConfiguration) {
							if (currentScope.cdConfiguration[oneService].display) {
								currentScope.maxEntries++;
							}
						}
						getServiceBranches(currentScope, {
							gitAccount: currentScope.gitAccount,
							repo: oneRepo,
							cd: true
						}, function () {
							return cb();
						});
					}
				});
			}
		});
		
		function populateServiceInEnvironments(serviceName, defaultCD, mCb) {
			var oneCDEnv = currentScope.oneEnv;
			var types = ['service', 'daemon', 'custom'];
			if (serviceName && currentScope.cdConfiguration[serviceName] && currentScope.cdConfiguration[serviceName].type && types.indexOf(currentScope.cdConfiguration[serviceName].type) !== -1) {
				var serviceType = currentScope.cdConfiguration[serviceName].type;
				getService[serviceType.toLowerCase()](serviceName, function () {
					if (!currentScope.cdData[oneCDEnv.toUpperCase()]) {
						currentScope.cdData[oneCDEnv.toUpperCase()] = defaultCD;
					}
					
					currentScope.cdConfiguration[serviceName].name = serviceName;
					if (!Object.hasOwnProperty.call(currentScope.cdConfiguration[serviceName], 'display')) {
						currentScope.cdConfiguration[serviceName].display = false;
					}
					
					currentScope.cdConfiguration[serviceName][oneCDEnv.toUpperCase()] = {
						"cdData": {},
						"display": false
					};
					currentScope.cdConfiguration[serviceName][oneCDEnv.toUpperCase()].cdData.versions = {};
					getEnvServices(oneCDEnv, serviceName, function () {
						return mCb();
					});
				});
			} else {
				mCb();
			}
		}
		
		function getEnvServices(envCode, serviceName, mCb) {
			getServiceInEnv(currentScope, envCode, serviceName, mCb);
		}
		
		var getService = {
			'service': function (serviceName, cb) {
				getSendDataFromServer(currentScope, ngDataApi, {
					method: 'post',
					routeName: '/dashboard/services/list',
					data: {
						serviceNames: [serviceName]
					}
				}, function (error, response) {
					if (error) {
						currentScope.displayAlert('danger', translation.unableRetrieveListServices[LANG]);
					} else {
						currentScope.services[serviceName] = response.records[0];
						return cb();
					}
				});
			},
			'daemon': function (daemonName, cb) {
				getSendDataFromServer(currentScope, ngDataApi, {
					method: 'post',
					routeName: '/dashboard/daemons/list',
					params: {
						'getGroupConfigs': true
					},
					data: {
						daemonNames: [daemonName]
					}
				}, function (error, response) {
					if (error) {
						currentScope.displayAlert('danger', translation.unableRetrieveDaemonsHostsInformation[LANG]);
					} else {
						currentScope.services[serviceName] = response.records[0];
						return cb();
					}
				});
			},
			'custom': function (repoName, cb) {
				currentScope.services[repoName] = {};
				cb();
			}
		};
	}
	
	function getServiceBranches(currentScope, opts, cb) {
		currentScope.loadingBranches = true;
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/gitAccounts/getBranches',
			params: {
				'id': opts.gitAccount._id,
				'provider': opts.gitAccount.provider,
				'name': opts.repo.full_name,
				'type': 'repo'
			}
		}, function (error, response) {
			console.log(response);
			if (error) {
				currentScope.form.displayAlert('danger', error.message);
			} else {
				if (opts.cd) {
					currentScope.branches = response.branches;
				}
			}
			if (opts.cd) {
				currentScope.loadingBranches = false;
				cb();
			}
			else {
				return cb(response);
			}
		});
	}
	
	function getServiceInEnv(currentScope, env, serviceName, cb) {
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/cloud/services/list',
			params: {
				"env": env.toLowerCase()
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
				return cb();
			}
			else {
				var prefixes = [];
				prefixes.push(env.toLowerCase() + "_controller");
				prefixes.push(env.toLowerCase() + "_nginx");
				if (!currentScope.envDeployed) {
					currentScope.envDeployed = {};
				}
				currentScope.envDeployed[env] = false;
				response.forEach(function (oneDeployedService) {
					if (prefixes.indexOf(oneDeployedService.name) !== -1) {
						currentScope.envDeployed[env] = true;
					}
				});
				var activatedVersions = {};
				for (var srv = 0; srv < response.length; srv++) {
					var service = response[srv];
					if (service.labels) {
						if (serviceName === service.labels['service.repo'] || serviceName === service.labels['soajs.service.name']) {
							if (service.labels['soajs.service.version']) {
								activatedVersions[service.labels['soajs.service.version']] = service;
							}
							else {
								activatedVersions['versionless'] = service;
							}
						}
					}
				}
				buildFormData(currentScope, env, serviceName, activatedVersions, cb)
			}
		});
	}
	
	function buildFormData(currentScope, env, serviceName, activatedVersions, cb) {
		var service = currentScope.services[serviceName];
		var dashboardServices = ['dashboard', 'proxy'];
		if (dashboardServices.indexOf(serviceName) !== -1) {
			return cb();
		}
		if (!currentScope.cdConfiguration[serviceName][env.toUpperCase()].obj) {
			currentScope.cdConfiguration[serviceName][env.toUpperCase()].obj = {
				branches: [],
				ha: {}
			};
		}
		//cdData was saved before, fill entries from arriving db of cdData
		if (currentScope.cdData[env.toUpperCase()][serviceName]) {
			currentScope.cdConfiguration[serviceName][env.toUpperCase()].cdData = angular.copy(currentScope.cdData[env.toUpperCase()][serviceName]);
			var cdData = currentScope.cdConfiguration[serviceName][env.toUpperCase()].cdData;
			if (!cdData.versions) {
				cdData.versions = {};
			}
			if (cdData.branch || cdData.strategy || cdData.options) {
				cdData.versions['Default'] = {'active': true};
			}
			if (cdData.branch) {
				cdData.versions['Default'].branch = cdData.branch;
				delete cdData.branch;
			}
			if (cdData.strategy) {
				cdData.versions['Default'].strategy = cdData.strategy;
				delete cdData.strategy;
			}
			if (cdData.options) {
				cdData.versions['Default'].options = cdData.options;
				delete cdData.options;
			}
			if (cdData.deploy) {
				cdData.versions['Default'].deploy = cdData.deploy;
				currentScope.setDeploy(env.toUpperCase(), 'Default', serviceName, true);
				delete cdData.deploy;
			}
			var cdDataClone = angular.copy(currentScope.cdData[env.toUpperCase()][serviceName]);
			delete cdDataClone.branch;
			delete cdDataClone.strategy;
			delete cdDataClone.options;
			delete cdDataClone.deploy;
			if (Object.keys(cdDataClone).length > 0) {
				for (var version in cdDataClone) {
					var v = version.replace('v', '');
					cdData.versions[v] = cdDataClone[version];
					cdData.versions[v].active = true;
					if (cdDataClone[version].deploy) {
						currentScope.setDeploy(env.toUpperCase(), v, serviceName, true);
					}
				}
			}
			if (cdData.versions && Object.keys(cdData.versions).length === 0) {
				delete cdData.versions;
			}
		}
		if (service.versions) {
			var versions = Object.keys(service.versions);
			var actVerKeys = Object.keys(activatedVersions);
			versions.forEach(function (version) {
				if (actVerKeys.indexOf(version) !== -1) {
					activatedVersions[version].deployed = true;
					currentScope.cdConfiguration[serviceName][env.toUpperCase()].obj.ha[version] = angular.copy(activatedVersions[version]);
				} else {
					service.deployed = false;
					currentScope.cdConfiguration[serviceName][env.toUpperCase()].obj.ha[version] = service;
				}
			});
		}
		else {
			currentScope.tabLabel = '';
			currentScope.default = true;
			if (activatedVersions.versionless) {
				activatedVersions['Default'].deployed = true;
				currentScope.cdConfiguration[serviceName][env.toUpperCase()].obj.ha['Default'] = activatedVersions.versionless;
			}
			else {
				currentScope.cdConfiguration[serviceName][env.toUpperCase()].obj.ha['Default'] = angular.copy(service);
			}
		}
		currentScope.cdConfiguration[serviceName].display = true;
		currentScope.cdConfiguration[serviceName][env.toUpperCase()].display = true;
		return cb();
		
	}
	
	function doDeploy(currentScope, params) {
		
		if (params.custom && params.custom.version) {
			params.custom.version = parseInt(params.custom.version);
		}
		console.log(params);
		// if (currentScope.service.latest) {
		// 	params.version = parseInt(currentScope.service.latest) || 1;
		// }
		//
		// if (currentScope.service.gcId) {
		// 	params.custom.gc = {
		// 		"gcName": currentScope.service.name,
		// 		"gcVersion": currentScope.service.version
		// 	}
		//
		
		var config = {
			"method": "post",
			"routeName": "/dashboard/cloud/services/soajs/deploy",
			"data": params
		};
		
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, config, function (error) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			} else {
				currentScope.displayAlert('success', 'Service deployed successfully');
			}
		});
	}
	
	function doRebuild(currentScope, formData) {
		var params = {
			env: currentScope.oneEnv,
			serviceId: currentScope.serviceId,
			mode: ((formData.deployConfig && formData.deployConfig.replication && formData.deployConfig.replication.mode) ? formData.deployConfig.replication.mode : ''),
			action: 'rebuild'
		};
		
		if (formData.custom) {
			params.custom = formData.custom;
		}
		
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'put',
			routeName: '/dashboard/cloud/services/redeploy',
			data: params
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				currentScope.displayAlert('success', 'Service rebuilt successfully');
				currentScope.cancel();
			}
		});
	}
	
	return {
		'listGitAccounts': listGitAccounts,
		'listRepos': listRepos,
		'getCdData': getCdData,
		'getDeployedServices': getDeployedServices,
		'deployService': deployService
	};
	
}]);
