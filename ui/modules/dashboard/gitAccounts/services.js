"use strict";
var repoService = soajsApp.components;
repoService.service('repoSrv', ['ngDataApi', '$timeout', '$modal', '$cookies', '$window', '$compile', 'detectBrowser', function (ngDataApi, $timeout, $modal, $cookies, $window, $compile, detectBrowser) {

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
				$scope.myBrowser = detectBrowser();
				
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
								
								formConfig.entries.push({
									type: "html",
									value: "<hr />"
								});
								getProviderRecipes($scope, {
									'provider': oneProvider.provider,
									'owner': oneProvider.owner
								}, function(providerRecipes){
									var groupInfo = {
										'name': 'recipes',
										'label': "Continuous Integration Recipes",
										"type": "group",
										"entries": [
										
										]
									};
									
									buildRecipeGroup($scope, gitAccount, oneProvider, oneRepo, groupInfo, providerRecipes, function(recipeGroup){
										
										var newButtons = {
											type: 'html',
											value: "<hr /><label>" + oneProvider.provider + " Recipes</label><br /><span class='fieldMsg'>The following Recipes are available at <b>" + oneProvider.provider + "</b>, you can download them and use the in your repository.</span><div id='recipebuttons' class='table w-100 c-both'></div><hr />"
										};
										groupInfo.entries.push(newButtons);
										
										var recipebuttons = '';
										$scope.providerRecipes = providerRecipes[oneProvider.provider];
										providerRecipes[oneProvider.provider].forEach(function(oneRecipe){
											recipebuttons += "<a href='' id='recipe" + oneRecipe._id.toString() + "' class='recipeButtons btn btn-sm btn-default' ng-class=\"{'highlighted': (oneRecipe.highlighted === true)}\"" +
												" ng-click=\"downloadRecipe('" + oneRecipe._id + "')\" tooltip='Click to Download this Recipe'>" +
												"<span class='icon icon-download3'></span>&nbsp;" + oneRecipe.name +
												"</a>";
										});
										
										formConfig.entries.push(recipeGroup);
										
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
										
										if($scope.providerRecipes.length > 0){
											options.actions.unshift({
												"type": "button",
												"label": "Download CD Script",
												"btn": "success",
												"action": function(){
													if($scope.myBrowser === 'safari'){
														$window.alert("The Downloader is not compatible with Safari, please choose another browser.");
														return null;
													}
													
													overlayLoading.show();
													getSendDataFromServer(currentScope, ngDataApi, {
														method: 'get',
														routeName: '/dashboard/ci/script/download',
														headers: {
															"Accept": "application/zip"
														},
														responseType: 'arraybuffer',
														params: {
															'provider': oneProvider.provider
														}
													}, function (error, response) {
														overlayLoading.hide();
														if (error) {
															currentScope.form.displayAlert('danger', error.message);
														}
														else {
															openSaveAsDialog("soajs.cd.zip", response, "application/zip");
														}
													});
												}
											});
										}
										
										buildForm($scope, null, options, function () {
											$timeout(function(){
												var el = angular.element(document.getElementById('recipebuttons'));
												el.html(recipebuttons);
												$compile(el.contents())($scope);
											}, 200);
										});
									});
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
				
				$scope.getCIRecipe = function(){
					getCIRecipe($scope, function(){
						
					});
				};
				
				$scope.saveRecipe = function () {
					saveRecipe($scope, function () {

					});
				};
				
				$scope.downloadRecipe = function(oneRecipeId){
					downloadProviderRecipe($scope, oneRecipeId);
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
	
	function downloadProviderRecipe(currentScope, oneRecipeId){
		if(currentScope.myBrowser === 'safari'){
			$window.alert("The Downloader is not compatible with Safari, please choose another browser.");
			return null;
		}
		
		currentScope.providerRecipes.forEach(function(myRecipe){
			if(myRecipe._id.toString() === oneRecipeId.toString()){
				overlayLoading.show();
				getSendDataFromServer(currentScope, ngDataApi, {
					method: 'get',
					routeName: '/dashboard/ci/recipe/download',
					headers: {
						"Accept": "application/zip"
					},
					responseType: 'arraybuffer',
					params: {
						'id': oneRecipeId.toString()
					}
				}, function (error, response) {
					overlayLoading.hide();
					if (error) {
						currentScope.form.displayAlert('danger', error.message);
					}
					else {
						openSaveAsDialog(myRecipe.name + ".zip", response, "application/zip");
					}
				});
			}
		});
	}
	
	function buildRecipeGroup(currentScope, gitAccount, provider, repo, groupInfo, providerRecipes, cb){
		
		getServiceBranches(currentScope, {
			gitAccount: gitAccount,
			repo: repo,
			cd:false
		}, function(gitBranchResponse){
			var newInput = {
				'name': 'branch',
				'label': 'Branch',
				'type': 'select',
				'value': [],
				'fieldMsg': 'Select a branch to retrieve its Continuous Integration Recipe',
				'required': true,
				'onAction': function(id, data, form){
					
					getRepoCIremoteRecipe(currentScope, {
						provider: provider.provider,
						owner: gitAccount.owner,
						repo: repo.name,
						branch: data
					}, function(response){
						var fileContent = response.file;
						var fileSHA = response.sha;
						
						var firstTime = true;
						form.entries[form.entries.length -1].entries.forEach(function(oneInput){
							if(oneInput.name === 'myRepoRecipe'){
								firstTime = false;
							}
						});
						
						if(firstTime){
							form.entries[form.entries.length -1].entries.push({
								'readonly': true,
								'name': 'myRepoRecipe',
								'label': 'Current Repo Recipe',
								'type': 'textarea',
								'value': fileContent,
								'rows': 20,
								'cols': 100,
								'fieldMsg': 'The following Recipe is available in your repo and is compatible with provider: <b>' + provider.provider + '</b>'
							});
						}
						form.formData.myRepoRecipe = fileContent;
						
						var rButtons = document.getElementsByClassName('recipeButtons');
						for(var i =0; i  < rButtons.length; i++){
							rButtons[i].className = "recipeButtons btn btn-sm btn-default";
						}
						
						providerRecipes[provider.provider].forEach(function(oneRecipe){
							oneRecipe.highlighted = false;
							if(fileSHA === oneRecipe.sha){
								oneRecipe.highlighted = true;
								var foundrButton = document.getElementById("recipe" + oneRecipe._id.toString());
								foundrButton.className = "recipeButtons btn btn-sm btn-primary";
							}
						});
					});
				}
			};
			gitBranchResponse.branches.forEach(function (oneBranch) {
				delete oneBranch.commit.url;
				newInput.value.push({'v': oneBranch.name, 'l': oneBranch.name});
			});
			groupInfo.entries.push(newInput);
			return cb(groupInfo);
		});
	}
	
	function getProviderRecipes(currentScope, opts, cb){
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/ci/providers',
			params: {
				'provider': opts.provider,
				"owner": opts.owner,
			}
		}, function (error, response) {
			if (error) {
				currentScope.form.displayAlert('danger', error.message);
			}
			else {
				return cb(response);
			}
		});
	}
	
	function getRepoCIremoteRecipe(currentScope, opts, cb){
		// overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/ci/repo/remote/config',
			params: {
				'provider': opts.provider,
				"repo": opts.repo,
				"owner": opts.owner,
				"branch": opts.branch
			}
		}, function (error, response) {
			// overlayLoading.hide();
			if (error) {
				currentScope.form.displayAlert('danger', error.message);
			}
			else {
				return cb(response);
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
				if( cb && typeof cb === 'function'){
					return cb(output);
				}
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
				if(opts.cd){
					currentScope.branches = response.branches;
				}
			}
			if(opts.cd){
				currentScope.loadingBranches = false;
				cb();
			}
			else{
				return cb(response);
			}
		});
	}
	
	return {
		"getCIRecipe": getCIRecipe,
		"configureRepo": configureRepo
	}
}]);
