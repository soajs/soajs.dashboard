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
								if (['soajs.dashboard'].indexOf(response[i].name) !== -1) {
									response.splice(i, 1);
								}
							}
						}

			            oneAccount.repos = response;
						oneAccount.repos.forEach(function (oneRepo) {
							var repoServices = [];
							if (oneRepo.name !== 'soajs.gcs' && (oneRepo.type === 'service' || oneRepo.type === 'daemon')) {
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
								
								for(var inverse = oneAccount.repos.length -1; inverse >=0; inverse --){
									var oneRepo = oneAccount.repos[inverse];
									if (oneRepo.name === 'soajs.gcs') {
										currentScope.originalServices.forEach(function (oneService) {
											if (oneService.gcId && oneService.src && oneService.src.repo === 'soajs.gcs') {
												oneService.type = 'service';
												oneRepo.servicesList.push(oneService);
											}
										});
										if (oneRepo.servicesList.length === 0) {
											oneAccount.repos.splice(inverse, 1)
										}
									}
								}
								
								oneAccount.repos.forEach(function (oneRepo, index) {
									oneRepo.servicesList.forEach(function (oneRepoService) {
										var type = (oneRepoService.type === 'service') ? 'services': 'daemons';
										currentScope[type].forEach(function (oneService) {
											if (oneService.name === oneRepoService.name) {
												oneRepoService.versions = [];
												if (oneService.versions) {
													Object.keys(oneService.versions).forEach(function (oneVersion) {
														if(type === 'daemons' && oneService.grpConf){
															oneService.versions[oneVersion] = {};
															oneService.versions[oneVersion].grpConf = oneService.grpConf;
															oneService.grpConf.forEach(function(oneGroup){
																if(!oneService.versions[oneVersion][oneGroup.daemonConfigGroup]){
																	oneService.versions[oneVersion][oneGroup.daemonConfigGroup] = {};
																}
															});
														}
														if(oneService.prerequisites){
															oneService.versions[oneVersion].prerequisites = oneService.prerequisites;
														}
														if(oneService.gcId){
															oneService.versions[oneVersion].gcId = oneService.gcId;
														}
														oneService.versions[oneVersion].v = oneVersion;
														oneRepoService.versions.push(oneService.versions[oneVersion]);
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
												if (currentScope.daemonGrpConf) {
													if(currentScope.cdSettings[oneService.name]['v' + oneVersion.v][currentScope.daemonGrpConf]){
														if(!oneVersion.deploySettings){
															oneVersion.deploySettings = {};
														}
														oneVersion.deploySettings[currentScope.daemonGrpConf] = currentScope.cdSettings[oneService.name]['v' + oneVersion.v][currentScope.daemonGrpConf];
													}
												} else {
													oneVersion.deploySettings = currentScope.cdSettings[oneService.name]['v' + oneVersion.v];
												}
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
				"env": currentScope.envCode.toLowerCase()
			}
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.message);
			} else {
				currentScope.accounts.forEach(function (oneAccount) {
					if (oneAccount.repos && oneAccount.repos.length > 0) {
						oneAccount.repos.forEach(function (oneRepo) {
							if (oneRepo.servicesList && oneRepo.servicesList.length > 0) {
								oneRepo.servicesList.forEach(function (oneService) {
									oneService.deployedVersionsCounter = 0;
									oneService.deployedConfigCounter = {};
									response.forEach(function (oneDeployedEntry) {
										if (oneDeployedEntry.labels && oneDeployedEntry.labels['soajs.service.name'] && oneDeployedEntry.labels['soajs.service.name'] === oneService.name) {
											oneService.deployed = true;
											if (oneService.versions && oneService.versions.length > 0) {
												oneService.versions.forEach(function (oneVersion) {
													if (oneDeployedEntry.labels && oneDeployedEntry.labels['soajs.service.version'] && oneDeployedEntry.labels['soajs.service.version'] === oneVersion.v) {
														if(oneDeployedEntry.env && oneDeployedEntry.labels['soajs.service.type'] === 'daemon'){
																oneDeployedEntry.env.forEach(function (oneEnv) {
																	if(oneEnv.indexOf("SOAJS_DAEMON_GRP_CONF") !== -1){
																		oneVersion.deployed = true;
																		if(!oneService.deployedConfigCounter[oneVersion.v]){
																			oneService.deployedConfigCounter[oneVersion.v] = 0;
																		}
																		oneService.deployedConfigCounter[oneVersion.v]++;
																		oneVersion[oneEnv.split("=")[1]].deployed = true;
																		oneVersion[oneEnv.split("=")[1]].serviceId = oneDeployedEntry.id;
																		if(!oneVersion.deploySettings || !oneVersion.deploySettings[oneEnv.split("=")[1]]){
																			getDeploySettings(currentScope, oneDeployedEntry, function (deploySettings) {
																				if(Object.keys(deploySettings).length > 0){
																					if(!oneVersion.deploySettings){
																						oneVersion.deploySettings = {};
																					}
																					oneVersion.deploySettings[oneEnv.split("=")[1]] = deploySettings;
																				}
																			});
																		}
																	}
																});
														}else{
															oneVersion.deployed = true;
															oneVersion.serviceId = oneDeployedEntry.id;
															oneService.deployedVersionsCounter++;
															if(!oneVersion.deploySettings){
																getDeploySettings(currentScope, oneDeployedEntry, function (deploySettings) {
																	if(Object.keys(deploySettings).length > 0){
																		oneVersion.deploySettings = deploySettings;
																	}
																});
															}
														}
													}
												});
											}
											else {
												oneService.deployed = true;
												oneService.serviceId = oneDeployedEntry.id;
												if(!oneService.deploySettings){
													getDeploySettings(currentScope, oneDeployedEntry, function (deploySettings) {
														if(Object.keys(deploySettings).length > 0){
															oneService.deploySettings = deploySettings;
														}
													});
												}
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
										if(!oneRepo.deploySettings){
											getDeploySettings(currentScope, oneDeployedEntry, function (deploySettings) {
												if(Object.keys(deploySettings).length > 0){
													oneRepo.deploySettings = deploySettings;
												}
											});
										}
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
				currentScope.services = angular.copy(response.records);
				currentScope.originalServices = angular.copy(response.records);
				return cb();
			}
		});
	}

	function getDaemons(currentScope, cb) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "post",
			"routeName": "/dashboard/daemons/list",
			"params": {
				"getGroupConfigs" : true
			}
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.message);
			} else {
				currentScope.daemons = response;
				return cb();
			}
		});
	}

	function deployService(currentScope, oneRepo, service, version, gitAccount, daemonGrpConf) {
		var envDeployer = $cookies.getObject("myEnv").deployer;
		var envPlatform = envDeployer.selected.split('.')[1];
		var deployService = $modal.open({
			templateUrl: 'deployService.tmpl',
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function ($scope) {
				fixBackDrop();
				$scope.controllerScope = currentScope;
				$scope.deployNewService = true;
				$scope.version = version.v || 'Default';
				$scope.oneEnv = $cookies.getObject('myEnv').code.toUpperCase();
				$scope.cdEnvs = [$scope.oneEnv];
				$scope.deployed = false;
				$scope.oneSrv = (service && service.name) ? service.name : oneRepo.name;
				$scope.serviceType = (service && service.type) ? service.type : 'custom';
				$scope.showCD = true;
				if(daemonGrpConf){
					$scope.daemonGrpConf = daemonGrpConf;
				}
				if(SOAJSRMS.indexOf(oneRepo.name) !== -1){
					$scope.showCD = false;
				}
				$scope.services = {};
				if($scope.version === 'Default'){
					$scope.services[$scope.oneSrv] = service || oneRepo;
				}else{
					$scope.services[$scope.oneSrv] = version;
				}
				if (($scope.services[$scope.oneSrv].deployed && $scope.serviceType !== 'daemon')|| (daemonGrpConf && $scope.services[$scope.oneSrv][daemonGrpConf] && $scope.services[$scope.oneSrv][daemonGrpConf].deployed)) {
					$scope.serviceId = ($scope.serviceType === 'daemon' && daemonGrpConf && $scope.services[$scope.oneSrv][daemonGrpConf]) ? $scope.services[$scope.oneSrv][daemonGrpConf].serviceId : $scope.services[$scope.oneSrv].serviceId;
					$scope.deployed = true;
				}
				$scope.default = false;
				$scope.gitAccount = gitAccount;
				$scope.alerts = [];
				$scope.imagePath = 'themes/' + themeToUse + '/img/loading.gif';
				getCDRecipe($scope, oneRepo, function () {
					$scope.setDeploy($scope.oneEnv, $scope.version, $scope.oneSrv)
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

				$scope.updateGitBranch = function (oneSrv, oneEnv, version) {
					$scope.branches.forEach(function (oneBranch) {
						if (oneBranch.name === $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.gitSource.branch){
							if ($scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options) {
								$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.gitSource.branch = $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.gitSource.branch;
								$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.gitSource.commit = oneBranch.commit.sha;
							}
						}
					});

				};
				
				$scope.setDeploy = function (oneEnv, version, oneSrv) {
					var isKubernetes = (envPlatform.toLowerCase() === "kubernetes");
					var deployedBranch = '';
					if ($scope.cdConfiguration[oneSrv][oneEnv].cdData.versions && $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version] && $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options && $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.gitSource && $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.gitSource.branch) {
						deployedBranch = $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.gitSource.branch;
					}
					if ($scope.cdConfiguration[oneSrv][oneEnv].obj.ha[version] && $scope.cdConfiguration[oneSrv][oneEnv].obj.ha[version].labels && $scope.cdConfiguration[oneSrv][oneEnv].obj.ha[version].labels['service.branch']) {
						deployedBranch = $scope.cdConfiguration[oneSrv][oneEnv].obj.ha[version].labels['service.branch'];
					}
					if ($scope.cdConfiguration[oneSrv][oneEnv].cdData.versions && $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version] && $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].active) {
						delete $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].active;
					}
					else if (!$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions || !$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version]) {
						$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions = {};
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
						if(!$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.gitSource){
							$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.gitSource = {};
						}
						
						$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.gitSource.owner = oneRepo.owner.login;
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
						if (service && $scope.serviceType === 'daemon' && service.grpConf) {
							$scope.groupConfigs = service.grpConf;
						}
						
						$scope.injectCatalogEntries(oneEnv, version, oneSrv);
					});
				};
				
				$scope.injectCatalogEntries = function (oneEnv, version, oneSrv) {
					$scope.allowGitOverride = false;
					if (!$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom) {
						$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom = {};
					}
					if (!$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.env) {
						$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.env = {};
					}
					$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].custom = {};
					if($scope.serviceType === 'daemon' && $scope.daemonGrpConf){
						$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.daemonGroup = $scope.daemonGrpConf;
					}
					for (var type in $scope.recipes) {
						$scope.recipes[type].forEach(function (catalogRecipe) {
							if (catalogRecipe._id === $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.recipe) {
								if (!$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.image && catalogRecipe.recipe.deployOptions.image.override) {
									$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.image = {};
								}
								if (catalogRecipe.recipe.deployOptions.image.override) {
									if(!$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.image.prefix)
										$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.image.prefix = catalogRecipe.recipe.deployOptions.image.prefix;
									
									if(!$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.image.name)
										$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.image.name = catalogRecipe.recipe.deployOptions.image.name;
									
									if(!$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.image.tag)
										$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.image.tag = catalogRecipe.recipe.deployOptions.image.tag;
								}
								else if(!catalogRecipe.recipe.deployOptions.image.override){
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
									if(version !== 'Default'){
										$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.version = version;
									}
									$scope.allowGitOverride = true;
								}
							}
						});
					}
				};
				
				$scope.saveRecipe = function (type) {
					saveRecipe($scope, type)
				};
				
			}
		});
	}
	
	function getCatalogRecipes(currentScope, cb) {
		currentScope.loadingRecipes = true;
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/catalog/recipes/list',
			params: {
				specifyGit : true
			}
		}, function (error, response) {
			currentScope.loadingRecipes = false;
			if (error) {
				currentScope.displayAlert('danger', 'Unable to retrieve catalog recipes');
				return cb(true);
			}
			else {
				currentScope.recipes = {};
				response.forEach(function (oneRecipe) {
					if (!currentScope.recipes[oneRecipe.type]) {
						currentScope.recipes[oneRecipe.type] = [];
					}
					if (currentScope.serviceType && oneRecipe.subtype) {
						if (oneRecipe.subtype === currentScope.serviceType) {
							currentScope.recipes[oneRecipe.type].push(oneRecipe);
						}
					} else {
						currentScope.recipes[oneRecipe.type].push(oneRecipe);
					}
				});
				return cb(null);
			}
		});
	}
	
	function saveRecipe(currentScope, type) {
		var configuration = {};
		var modes = ['deployment', 'replicated'];
		var oneEnv = currentScope.oneEnv;
		var version = currentScope.version;
		var oneRepo = currentScope.oneSrv;
		configuration.serviceName = oneRepo;
		configuration.env = oneEnv;
		currentScope.updateGitBranch(oneRepo, oneEnv, version);
		if (version === 'Default') {
			configuration.default = {};
			if (currentScope.showCD) {
				configuration.default = {
					branch: currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options.gitSource.branch,
					strategy: currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].strategy,
					deploy: false
				};
			}
			if (currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options) {
				if (currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options.custom && currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options.custom.version) {
					delete currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options.custom.version;
				}
				if (modes.indexOf(currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options.deployConfig.replication.mode) === -1) {
					delete currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options.deployConfig.replication.replicas;
				}
				configuration.default.options = angular.copy(currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options);
				if (configuration.default.options && configuration.default.options.deployConfig && configuration.default.options.deployConfig.memoryLimit) {
					configuration.default.options.deployConfig.memoryLimit *= 1048576;
				}
				configuration.default.deploy = true;
			}
		}
		else {
			configuration.version = {
				v: 'v' + version,
				deploy: false
			};
			if (currentScope.showCD) {
				configuration.version = {
					v: 'v' + version,
					branch: currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options.gitSource.branch,
					strategy: currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].strategy,
					deploy: false
				};
			}
			if (currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options) {
				if (modes.indexOf(currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options.deployConfig.replication.mode) === -1) {
					delete currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options.deployConfig.replication.replicas;
				}
				configuration.version.options = angular.copy(currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options);
				if (configuration.version.options && configuration.version.options.deployConfig && configuration.version.options.deployConfig.memoryLimit) {
					configuration.version.options.deployConfig.memoryLimit *= 1048576;
				}
				if (currentScope.services[currentScope.oneSrv] && currentScope.services[currentScope.oneSrv].gcId) {
					if (!configuration.version.options.custom) {
						configuration.version.options.custom = {};
					}
					configuration.version.options.custom.gc = {
						"gcName": currentScope.oneSrv,
						"gcVersion": parseInt(currentScope.version)
					}
				}
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
			if (error) {
				overlayLoading.hide();
				currentScope.displayAlert('danger', error.message);
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
						doDeploy(currentScope, options, false, currentScope.controllerScope);
						break;
					case 'rebuild':
						doRebuild(currentScope, options);
						break;
					default :
						if(currentScope.daemonGrpConf){
							currentScope.controllerScope.daemonGrpConf = currentScope.daemonGrpConf;
						}
						currentScope.controllerScope.getCdData(function () {
							currentScope.cancel();
							overlayLoading.hide();
							currentScope.controllerScope.displayAlert('success', 'Recipe Saved successfully');
						});
				}
			}
		});
	}
	
	function getCDRecipe(currentScope, oneRepo, cb) {
		currentScope.cdConfiguration = null;
				var defaultCD = {
					"branch": "master",
					"strategy": "notify",
					"default": true
				};
				currentScope.cdData = {};
				currentScope.cdData[currentScope.oneEnv] = {};
				if(currentScope.version === 'Default'){
					currentScope.cdData[currentScope.oneEnv][currentScope.oneSrv] = (currentScope.services[currentScope.oneSrv].deploySettings) ? currentScope.services[currentScope.oneSrv].deploySettings : {};
				}
				else {
					currentScope.cdData[currentScope.oneEnv][currentScope.oneSrv] = {};
					if(currentScope.serviceType === 'daemon'){
						currentScope.cdData[currentScope.oneEnv][currentScope.oneSrv][currentScope.version] = (currentScope.services[currentScope.oneSrv].deploySettings && currentScope.services[currentScope.oneSrv].deploySettings[currentScope.daemonGrpConf] ) ? currentScope.services[currentScope.oneSrv].deploySettings[currentScope.daemonGrpConf] : {};
					}else{
						currentScope.cdData[currentScope.oneEnv][currentScope.oneSrv][currentScope.version] = (currentScope.services[currentScope.oneSrv].deploySettings) ? currentScope.services[currentScope.oneSrv].deploySettings : {};
					}
				}
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
		
		function populateServiceInEnvironments(serviceName, defaultCD, mCb) {
			var oneCDEnv = currentScope.oneEnv;
			var types = ['service', 'daemon', 'custom'];
			if (serviceName && currentScope.cdConfiguration[serviceName] && currentScope.cdConfiguration[serviceName].type && types.indexOf(currentScope.cdConfiguration[serviceName].type) !== -1) {
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
			} else {
				mCb();
			}
		}
		
		function getEnvServices(envCode, serviceName, mCb) {
			getServiceInEnv(currentScope, envCode, serviceName, mCb);
		}
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
		buildFormData(currentScope, env, serviceName, cb)
	}
	
	function buildFormData(currentScope, env, serviceName, cb) {
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
				// currentScope.setDeploy(env.toUpperCase(), 'Default', serviceName);
				delete cdData.deploy;
			}
			var cdDataClone = angular.copy(currentScope.cdData[env.toUpperCase()][serviceName]);
			delete cdDataClone.branch;
			delete cdDataClone.strategy;
			delete cdDataClone.options;
			delete cdDataClone.deploy;
			delete cdDataClone.type;
			if (Object.keys(cdDataClone).length > 0) {
				for (var version in cdDataClone) {
					var v = version.replace('v', '');
					cdData.versions[v] = cdDataClone[version];
					cdData.versions[v].active = true;
				}
			}
			if (cdData.versions && Object.keys(cdData.versions).length === 0) {
				delete cdData.versions;
			}
		}
		currentScope.cdConfiguration[serviceName][env.toUpperCase()].obj.ha[version] = currentScope.services[serviceName];
		currentScope.cdConfiguration[serviceName].display = true;
		currentScope.cdConfiguration[serviceName][env.toUpperCase()].display = true;
		return cb();
		
	}
	
	function doDeploy(currentScope, params, external , controllerScope) {
		overlayLoading.show();
		if(external || !controllerScope) {
			controllerScope = currentScope
		}
		if (params.custom && params.custom.version) {
			params.custom.version = parseInt(params.custom.version);
		}
		var config = {
			"method": "post",
			"routeName": "/dashboard/cloud/services/soajs/deploy",
			"data": params
		};
		getSendDataFromServer(currentScope, ngDataApi, config, function (error) {
			if (error) {
				currentScope.displayAlert('danger', error.message);
				overlayLoading.hide();
			} else {
				if(!external){
					currentScope.cancel();
				}
				if(currentScope.daemonGrpConf){
					controllerScope.daemonGrpConf = currentScope.daemonGrpConf;
				}
				controllerScope.getCdData(function () {
					controllerScope.getDeployedServices();
					controllerScope.displayAlert('success', 'Service deployed successfully');
					overlayLoading.hide();
				});
			}
		});
	}
	
	function doRebuild(currentScope, formData) {
		overlayLoading.show();
		var params = {
			env: currentScope.oneEnv,
			serviceId: currentScope.serviceId,
			mode: ((formData.deployConfig && formData.deployConfig.replication && formData.deployConfig.replication.mode) ? formData.deployConfig.replication.mode : ''),
			action: 'rebuild'
		};
		
		if (formData.custom) {
			params.custom = formData.custom;
			if(formData.gitSource && formData.gitSource.branch){
				params.custom.branch = formData.gitSource.branch;
			}
			if(formData.deployConfig && formData.deployConfig.memoryLimit){
				params.custom.memory = formData.deployConfig.memoryLimit;
			}
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
				if(currentScope.daemonGrpConf){
					currentScope.controllerScope.daemonGrpConf = currentScope.daemonGrpConf;
				}
				currentScope.controllerScope.getCdData(function () {
					currentScope.controllerScope.getDeployedServices();
					currentScope.cancel();
					currentScope.controllerScope.displayAlert('success', 'Service rebuilt successfully');
				});
			}
		});
	}
	
	function getDeploySettings (currentScope, oneDeployedEntry, cb) {
		var deploySettings = {};
		deploySettings.options = {};
		deploySettings.options.gitSource = {};
		deploySettings.options.deployConfig = {};
		deploySettings.options.deployConfig.replication = {};
		deploySettings.options.custom = {};
		deploySettings.options.custom.image = {};
		deploySettings.options.custom.env = {};
		
		if(oneDeployedEntry.labels){
			if(oneDeployedEntry.labels['service.branch']){
				deploySettings.options.gitSource.branch = oneDeployedEntry.labels['service.branch'];
				if(oneDeployedEntry.labels['service.commit']){
					deploySettings.options.gitSource.commit = oneDeployedEntry.labels['service.commit'];
				}
				if(oneDeployedEntry.labels['service.repo']){
					deploySettings.options.gitSource.repo = oneDeployedEntry.labels['service.repo'];
				}
				if(oneDeployedEntry.labels['service.owner']){
					deploySettings.options.gitSource.owner = oneDeployedEntry.labels['service.owner'];
				}
			}
			if(oneDeployedEntry.labels['soajs.catalog.id']){
				deploySettings.options.recipe = oneDeployedEntry.labels['soajs.catalog.id'];
			}
			if(oneDeployedEntry.labels['soajs.env.code']){
				deploySettings.options.env = oneDeployedEntry.labels['soajs.env.code'];
			}
			if(oneDeployedEntry.labels['memoryLimit']){
				deploySettings.options.deployConfig.memoryLimit = oneDeployedEntry.labels['soajs.service.memoryLimit'] * 1048576;
			}
			if (oneDeployedEntry.labels['soajs.service.mode']) {
				deploySettings.options.deployConfig.replication.mode = oneDeployedEntry.labels['soajs.service.mode'];
				if (oneDeployedEntry.labels['soajs.service.replicas']) {
					deploySettings.options.deployConfig.replication.replicas = parseInt(oneDeployedEntry.labels['soajs.service.replicas']);
				}
				else if(oneDeployedEntry.tasks && oneDeployedEntry.tasks.length > 0){
					var replicas = 0;
					oneDeployedEntry.tasks.forEach(function (oneTask) {
						if(oneTask.status && oneTask.status.state === "running"){
							replicas++ ;
						}
					});
					if(replicas){
						deploySettings.options.deployConfig.replication.replicas = replicas;
					}
				}
			}
			if(oneDeployedEntry.labels['soajs.service.name']){
				deploySettings.options.custom.name = oneDeployedEntry.labels['soajs.service.name'];
			}
			if(oneDeployedEntry.labels['soajs.service.type']){
				deploySettings.options.custom.type = oneDeployedEntry.labels['soajs.service.type'];
			}
			if(oneDeployedEntry.labels['soajs.service.version']){
				deploySettings.options.custom.version = oneDeployedEntry.labels['soajs.service.version'];
			}
			if(oneDeployedEntry.labels['service.image.prefix']) {
				deploySettings.options.custom.image.prefix = oneDeployedEntry.labels['service.image.prefix'];
			}
			if(oneDeployedEntry.labels['service.image.name']){
				deploySettings.options.custom.image.name = oneDeployedEntry.labels['service.image.name'];
			}
			if(oneDeployedEntry.labels['service.image.tag']){
				deploySettings.options.custom.image.tag = oneDeployedEntry.labels['service.image.tag'];
			}
		}
		if(oneDeployedEntry.env) {
			oneDeployedEntry.env.forEach(function (oneEnv) {
				if(!deploySettings.options.deployConfig.memoryLimit && oneEnv.indexOf("SOAJS_SRV_MEMORY") !== -1){
					deploySettings.options.deployConfig.memoryLimit = oneEnv.split("=")[1] * 1048576;
				}
				if(oneEnv.indexOf("SOAJS_DAEMON_GRP_CONF") !== -1){
					deploySettings.options.custom.daemonGroup = oneEnv.split("=")[1];
				}
				if(!deploySettings.options.gitSource.branch && oneEnv.indexOf("SOAJS_GIT_BRANCH") !== -1 ){
					deploySettings.options.gitSource.branch = oneEnv.split("=")[1];
					if(!deploySettings.options.gitSource.commit && oneEnv.indexOf("SOAJS_GIT_COMMIT") !== -1){
						deploySettings.options.gitSource.commit = oneEnv.split("=")[1];
					}
					if(!deploySettings.options.gitSource.repo && oneEnv.indexOf("SOAJS_GIT_REPO") !== -1){
						deploySettings.options.gitSource.repo = oneEnv.split("=")[1];
					}
					if(!deploySettings.options.gitSource.owner && oneEnv.indexOf("SOAJS_GIT_OWNER") !== -1){
						deploySettings.options.gitSource.owner = oneEnv.split("=")[1];
					}
				}
				getCatalogRecipes(currentScope, function (error) {
					if(!error && currentScope.recipes && oneDeployedEntry.labels['soajs.catalog.id']){
						for (var type in currentScope.recipes) {
							currentScope.recipes[type].forEach(function (catalogRecipe) {
								if (catalogRecipe._id === oneDeployedEntry.labels['soajs.catalog.id']) {
									if(catalogRecipe.recipe.buildOptions && catalogRecipe.recipe.buildOptions.env){
										for (var envVariable in catalogRecipe.recipe.buildOptions.env) {
											if (catalogRecipe.recipe.buildOptions.env[envVariable].type === 'userInput' && oneEnv.indexOf(envVariable) !== -1) {
												deploySettings.options.custom.env[envVariable] = oneEnv.split("=")[1];
												break;
											}
										}
									}
								}
							});
						}
					}
					return cb(deploySettings)
				});
			
			});
		}
		else {
			return cb(deploySettings)
		}
	
	}
	
	return {
		'listGitAccounts': listGitAccounts,
		'listRepos': listRepos,
		'getCdData': getCdData,
		'getDeployedServices': getDeployedServices,
		'deployService': deployService,
		'doDeploy': doDeploy
	};
	
}]);
