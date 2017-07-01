"use strict";
var repoService = soajsApp.components;
repoService.service('repoSrv', ['ngDataApi', '$timeout', '$modal', '$cookies', function (ngDataApi, $timeout, $modal, $cookies) {

	function configureRepo(currentScope, oneRepo, gitAccount, config) {
		// var noCiConfig = false;
		// var noRepoCiConfig = false;
		var envDeployer = $cookies.getObject("myEnv").deployer;
		var envPlatform = envDeployer.selected.split('.')[1];
		// if (!currentScope.ciData || !currentScope.ciData.settings || !currentScope.ciData.settings.settings || Object.keys(currentScope.ciData.settings.settings).length === 0) {
		// 	noCiConfig = true;
		// }
		//
		// let ciRepo;
		// for (let i = 0; i < currentScope.ciData.list.length; i++) {
		// 	if (currentScope.ciData.list[i].name === oneRepo.full_name) {
		// 		ciRepo = currentScope.ciData.list[i];
		// 		break;
		// 	}
		// }
		//
		// if (!ciRepo) {
		// 	noRepoCiConfig = true;
		// }

		var configureRepo = $modal.open({
			templateUrl: 'configureRepo.tmpl',
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function ($scope) {
				fixBackDrop();
				$scope.services = {};
				$scope.tabLabel = 'Version ';
				$scope.default = false;
				$scope.gitAccount = gitAccount;
				$scope.alerts = [];
				$scope.imagePath = 'themes/' + themeToUse + '/img/loading.gif';
				$scope.images = {
					travis: "./themes/" + themeToUse + "/img/travis_logo.png",
					drone: "./themes/" + themeToUse + "/img/drone_logo.png",
					jenkins: "./themes/" + themeToUse + "/img/jenkins_logo.png",
					teamcity: "./themes/" + themeToUse + "/img/teamcity_logo.png"
				};
				
				$scope.goTOCI = function () {
					currentScope.$parent.go('#/continuous-integration');
					configureRepo.close();
				};

				$scope.cancel = function () {
					configureRepo.close();
				};

				$scope.toggleStatus = function (provider, status) {
					toggleStatus($scope, status, oneRepo, provider, function () {
						$scope.activateRepo = !status;
						if (status) {
							$scope.showCIConfigForm(provider);
						}
						else {
							$scope.form = {};
						}
					});
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

				$scope.showCIConfigForm = function (oneProvider) {
					$scope.ciRepoName = oneRepo.full_name;
					$scope.activateRepo = false;
					$scope.noCiConfig = (oneProvider) ? false : true;
					
					if ($scope.noCiConfig) {
						$scope.activateRepo = true;
						return false;
					}
					$timeout(function(){
						overlayLoading.show();
						getSendDataFromServer(currentScope, ngDataApi, {
							method: 'get',
							routeName: '/dashboard/ci/settings',
							params: {
								'id': oneRepo.full_name,
								"provider": oneProvider.provider,
								"owner": oneProvider.owner
							}
						}, function (error, response) {
							overlayLoading.hide();
							if (error) {
								if(error.code === 976){
									$scope.activateRepo = true;
								}
								else{
									$scope.displayAlert('danger', error.message);
								}
							}
							else {
								$scope.activateRepo = !response.settings.active;
								
								var customEnvs = response.envs;
								var formConfig = angular.copy(config.form.settings);
								
								var providerSettings = angular.copy(config.providers[oneProvider.provider]);
								formConfig.entries[0].entries = providerSettings;
								
								for (var oneVar in oneProvider.variables) {
									formConfig.entries[1].entries.push({
										'name': oneVar,
										'label': oneVar,
										'value': oneProvider.variables[oneVar],
										'disabled': true,
										'type': 'text'
									});
								}
								
								formConfig.entries[1].entries.push({
									"type": "html",
									"value": "<br /><p><em>Once you submit this form, the above SOAJS environment variables will be added to your repository configuration.</em></p>"
								});
								
								var count = 0;
								formConfig.entries[2].entries = [];
								customEnvs.forEach(function (enVar) {
									if (!oneProvider.variables[enVar.name]) {
										var oneClone = angular.copy(config.form.envVar);
										for (var i = 0; i < oneClone.length; i++) {
											oneClone[i].name = oneClone[i].name.replace("%count%", count);
											if (oneClone[i].name.indexOf('envName') !== -1) {
												oneClone[i].value = enVar.name;
											}
											if (oneClone[i].name.indexOf('envVal') !== -1) {
												oneClone[i].value = enVar.value;
											}
										}
										formConfig.entries[2].entries = formConfig.entries[2].entries.concat(oneClone);
										count++;
									}
								});
								
								
								var oneClone = angular.copy(config.form.envVar);
								for (var i = 0; i < oneClone.length; i++) {
									oneClone[i].name = oneClone[i].name.replace("%count%", count);
								}
								formConfig.entries[2].entries = formConfig.entries[2].entries.concat(oneClone);
								count++;
								
								formConfig.entries.push({
									"name": "addEnv",
									"type": "html",
									"value": '<span class="f-left"><input type="button" class="btn btn-sm btn-success" value="Add New Variable"></span>',
									"onAction": function (id, data, form) {
										var oneClone = angular.copy(config.form.envVar);
										for (var i = 0; i < oneClone.length; i++) {
											oneClone[i].name = oneClone[i].name.replace("%count%", count);
										}
										form.entries[2].entries = form.entries[2].entries.concat(oneClone);
										count++;
									}
								});
								
								var options = {
									timeout: $timeout,
									entries: formConfig.entries,
									name: 'repoSettings',
									data: response.settings,
									actions: [
										{
											type: 'submit',
											label: "Update Settings",
											btn: 'primary',
											action: function (formData) {
												var data = {
													"port": (mydomainport || 80),
													"settings": {
														"build_pull_requests": formData.build_pull_requests,
														"build_pushes": formData.build_pushes,
														"builds_only_with_travis_yml": formData.builds_only_with_travis_yml,
														"maximum_number_of_builds": formData.maximum_number_of_builds
													}
												};
												
												data.variables = {};
												for (var i = 0; i < count; i++) {
													if (!oneProvider.variables[formData['envName' + i]]) {
														data.variables[formData['envName' + i]] = formData['envVal' + i];
													}
												}
												
												overlayLoading.show();
												getSendDataFromServer(currentScope, ngDataApi, {
													method: 'put',
													routeName: '/dashboard/ci/settings',
													params: {
														'id': response.settings.repoCiId,
														"provider": oneProvider.provider,
														"owner": oneProvider.owner
													},
													data: data
												}, function (error, response) {
													overlayLoading.hide();
													if (error) {
														$scope.form.displayAlert('danger', error.message);
													}
													else {
														currentScope.displayAlert('success', 'Repository Settings Updated.');
														$scope.form.formData = {};
														$scope.showCIConfigForm(oneProvider);
													}
												});
											}
										},
										{
											type: 'reset',
											label: 'Cancel',
											btn: 'danger',
											action: function () {
												$scope.form.formData = {};
												$scope.cancel();
											}
										}
									]
								};
								
								buildForm($scope, null, options, function () {
									
								});
							}
						});
					}, 500);
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

				$scope.setVersion = function (oneEnv, version, oneSrv) {
					var deployedBranch = '';
					if($scope.cdConfiguration[oneSrv][oneEnv].cdData.versions && $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version] && $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].branch){
						deployedBranch = $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].branch;
					}
					if($scope.cdConfiguration[oneSrv][oneEnv].obj.ha[version] && $scope.cdConfiguration[oneSrv][oneEnv].obj.ha[version].labels && $scope.cdConfiguration[oneSrv][oneEnv].obj.ha[version].labels['service.branch']){
						 deployedBranch = $scope.cdConfiguration[oneSrv][oneEnv].obj.ha[version].labels['service.branch'];
					}
					if ($scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version] && $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].active) {
						delete $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].active;
					}
					else if(!$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version]){
						$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version] = {
							branch: deployedBranch,
							active: true
						};
					}
					else{
						$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].active = true;
					}
				};
				
				$scope.updateGitBranch = function(oneSrv, oneEnv, version){
					if($scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options){
						$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.gitSource.branch = $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].branch;
					}
				};
				
				$scope.setDeploy = function (oneEnv, version, oneSrv, first, counter) {
					var isKubernetes = (envPlatform.toLowerCase() === "kubernetes");
					if (!first) {
						$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].deploy = !$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].deploy;
					}
					getCatalogRecipes($scope, function () {
						if (counter === 0) {
							$scope.myRecipes = [];
							for (var type in $scope.recipes) {
								$scope.myRecipes = $scope.myRecipes.concat($scope.recipes[type]);
							}
						}
						if (!$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].deploy) {
							delete $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].deploy;
						}
						else {
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
								
								if($scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.deployConfig.memoryLimit < 1){
									$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.deployConfig.memoryLimit = 500;
								}
							}
							
							if (service.type === 'daemon' && service.grpConf) {
								$scope.groupConfigs = service.grpConf;
							}

							$scope.injectCatalogEntries(oneEnv, version, oneSrv, first);
						}
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

				$scope.getCIRecipe = function(){
					getCIRecipe($scope, function(){
						
					});
				};
				
				$scope.getCDRecipe = function () {
					getCDRecipe($scope, oneRepo, function () {
					});
				};

				$scope.saveRecipe = function () {
					saveRecipe($scope, function () {

					});
				};
				
				getCIRecipe($scope, gitAccount, function(ciProviders){
					$scope.ciProviders = ciProviders;
					if(ciProviders.length> 0){
						$scope.showCIConfigForm(ciProviders[0]);
					}
					else{
						$scope.showCIConfigForm(null);
					}
				});
			}
		});
	}
	
	function getCIRecipe(currentScope, gitAccount, cb) {
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/ci',
			params: {
				'port': (mydomainport || 80),
				"variables": true,
				"owner": gitAccount.owner
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				var output = [];
				response.forEach(function(oneAccount){
					if(oneAccount.provider){
						output.push(oneAccount);
					}
				});
				return cb(output);
			}
		});
	}
	
	function toggleStatus(currentScope, status, oneRepo, provider, cb) {
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/ci/status',
			params: {
				'id': oneRepo.full_name,
				'enable': status,
				'owner': provider.owner,
				'provider': provider.provider
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				var statusL = (status) ? 'Enabled' : 'Disabled';
				currentScope.displayAlert('success', 'Recipe ' + statusL + ' successfully');
				return cb();
			}
		});
	}

	function getEnvironments(currentScope, cb) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment/list"
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				currentScope.cdEnvs = [];
				response.forEach(function (oneEnv) {
					if (oneEnv.code.toLowerCase() !== 'dashboard') {
						currentScope.cdEnvs.push(oneEnv.code);
					}
				});
				return cb();
			}
		});
	}

	function getCDRecipe(currentScope, oneRepo, cb) {
		currentScope.cdConfiguration = null;
		overlayLoading.show();
		getEnvironments(currentScope, function () {

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
					if (oneRepo.type === 'multi' && oneRepo.multi && oneRepo.multi.length > 0) {
						oneRepo.multi.forEach(function (oneSub) {
							currentScope.cdConfiguration[oneSub.name] = {
								type: oneSub.type,
								icon: 'minus'
							};
						});
					}
					else {
						var serviceName = oneRepo.serviceName || oneRepo.full_name.split("/")[1];
						currentScope.cdConfiguration[serviceName] = {
							type: oneRepo.type,
							icon: 'minus'
						};
					}
					var max = Object.keys(currentScope.cdConfiguration).length;
					currentScope.maxEntries = 0;
					var repoCount = 0;
					for (var oneService in currentScope.cdConfiguration) {
						populateServiceInEnvironments(0, oneService, defaultCD, function () {
							repoCount++;
							if (repoCount === max) {
								for (var oneService in currentScope.cdConfiguration) {
									if (currentScope.cdConfiguration[oneService].display) {
										currentScope.maxEntries++;
									}
								}
								getServiceBranches(function () {
									return cb();
								});
							}
						});
					}
				}
			});
		});

		function populateServiceInEnvironments(counter, serviceName, defaultCD, mCb) {
			var oneCDEnv = currentScope.cdEnvs[counter];
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
						counter++;
						if (counter === currentScope.cdEnvs.length) {
							return mCb();
						}
						else {
							populateServiceInEnvironments(counter, serviceName, defaultCD, mCb);
						}
					});
				});
			} else {
				mCb();
			}
		}

		function getEnvServices(envCode, serviceName, mCb) {
			getServiceInEnv(currentScope, envCode, serviceName, mCb);
		}

		function getServiceBranches(cb) {
			currentScope.loadingBranches = true;
			getSendDataFromServer(currentScope, ngDataApi, {
				method: 'get',
				routeName: '/dashboard/gitAccounts/getBranches',
				params: {
					'id': currentScope.gitAccount._id,
					'provider': currentScope.gitAccount.provider,
					'name': oneRepo.full_name,
					'type': 'repo'
				}
			}, function (error, response) {
				if (error) {
					currentScope.displayAlert('danger', error.message);
				} else {
					currentScope.branches = response.branches;
				}
				currentScope.loadingBranches = false;
				cb();
			});
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
		var counter = 0;
		//cdData was saved before, fill entries from arriving db of cdData
		if (currentScope.cdData[env.toUpperCase()][serviceName]) {
			currentScope.cdConfiguration[serviceName][env.toUpperCase()].cdData = angular.copy(currentScope.cdData[env.toUpperCase()][serviceName]);
			var cdData = currentScope.cdConfiguration[serviceName][env.toUpperCase()].cdData;
			if (!cdData.versions) {
				cdData.versions = {};
			}
			if (cdData.branch || cdData.strategy || cdData.options) {
				cdData.versions['Default'] = {'active':true};
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
				currentScope.setDeploy(env.toUpperCase(), 'Default', serviceName, true, counter);
				counter++;
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
						currentScope.setDeploy(env.toUpperCase(), v, serviceName, true, counter);
						counter++;
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
				if(!currentScope.envDeployed){
					currentScope.envDeployed = {};
				}
				currentScope.envDeployed[env] = false;
				response.forEach(function(oneDeployedService){
					if(prefixes.indexOf(oneDeployedService.name) !== -1){
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

	function saveRecipe(currentScope, cb) {
		var configuration = {};
		var environments = currentScope.cdEnvs;
		var modes = ['deployment', 'replicated'];
		environments.forEach(function (oneEnv) {
			configuration[oneEnv] = angular.copy(currentScope.cdData[oneEnv]);
			delete configuration[oneEnv].branch;
			delete configuration[oneEnv].strategy;
			delete configuration[oneEnv].default;
			if (!configuration[oneEnv]) {
				configuration[oneEnv] = {};
			}
			
			for (var oneRepo in currentScope.cdConfiguration) {
				if (!configuration[oneEnv][oneRepo]) {
					configuration[oneEnv][oneRepo] = {};
				}
				for (var version in currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions) {
					if (!currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].active) {
						delete currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version];
						if(version === 'Default'){
							delete configuration[oneEnv][oneRepo];
						}else{
							delete configuration[oneEnv][oneRepo]['v' + version];
						}
					}else{
						if (version === 'Default') {
							configuration[oneEnv][oneRepo] = {
								branch: currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].branch,
								strategy: currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].strategy,
								deploy: currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].deploy
							};
							if (currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].deploy) {
								if (modes.indexOf(currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options.deployConfig.replication.mode) === -1) {
									delete currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options.deployConfig.replication.replicas;
								}
								configuration[oneEnv][oneRepo].options = currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options;
							}
						}
						else {
							configuration[oneEnv][oneRepo]['v' + version] = {
								branch: currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].branch,
								strategy: currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].strategy,
								deploy: currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].deploy
							};
							if (currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].deploy) {
								if (modes.indexOf(currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options.deployConfig.replication.mode) === -1) {
									delete currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options.deployConfig.replication.replicas;
								}
								configuration[oneEnv][oneRepo]['v' + version].options = currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options;
							}
						}
						if (currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options && currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options.deployConfig && currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options.deployConfig.memoryLimit) {
							currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].options.deployConfig.memoryLimit *= 1048576;
						}
					}
				}
				if (!currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions || Object.keys(currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions).length === 0) {
					delete configuration[oneEnv][oneRepo];
				}
				if (configuration[oneEnv] && configuration[oneEnv][oneRepo] && Object.keys(configuration[oneEnv][oneRepo]).length === 0) {
					delete configuration[oneEnv][oneRepo];
				}
			}
		});
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'post',
			routeName: '/dashboard/cd',
			data: {
				"config": configuration
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				currentScope.displayAlert('success', 'Recipe Saved successfully');
				currentScope.getCDRecipe();
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

	return {
		"getCIRecipe": getCIRecipe,
		"getCDRecipe": getCDRecipe,
		"configureRepo": configureRepo
	}
}]);
