"use strict";
var repoService = soajsApp.components;
repoService.service('repoSrv', ['ngDataApi', '$timeout', '$modal', '$cookies', '$window', '$compile', 'detectBrowser', function (ngDataApi, $timeout, $modal, $cookies, $window, $compile, detectBrowser) {

	function configureRepo(currentScope, oneRepo, gitAccount, config) {
		var envDeployer = $cookies.getObject("myEnv").deployer;
		var envPlatform = envDeployer.selected.split('.')[1];
		
		var configureRepo = $modal.open({
			templateUrl: 'configureRepo.tmpl',
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function ($scope) {
				var exceptionProviders = ['drone'];
				
				$scope.access = {
					enableDisableCIRepo : currentScope.access.enableDisableCIRepo
				};
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
					if(!currentScope.access.enableDisableCIRepo){
						$scope.form.displayAlert('danger', "You do not have access to Turn ON/Off a repo at CI provider.");
					}
					else{
						toggleStatus($scope, status, oneRepo, provider, function () {
							$scope.activateRepo = !status;
							if (status) {
								$scope.showCIConfigForm(provider);
							}
							else {
								$scope.form = {};
							}
						});
					}
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
											
											if(exceptionProviders.indexOf(oneProvider.provider) !== -1 && !oneClone[i].value || oneClone[i].value === ''){
												oneClone[i].required = false;
												oneClone[i].fieldMsg = "If you don't want to modify this environment variable, Leave its value empty.";
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
								
								if(currentScope.access.getCIProviders) {
									getProviderRecipes($scope, {
										'provider': oneProvider.provider,
										'owner': oneProvider.owner
									}, function (providerRecipes) {
										
										$scope.providerRecipes = providerRecipes[oneProvider.provider];
										var recipesGroup = {
											"type": "group",
											"name": "providerRecipes",
											"label": "Available " + oneProvider.provider + " Recipes",
											"collapsed": true,
											"entries": [
												{
													"type": "html",
													"value": "<div id='recipebuttons' class='table w-100 c-both'></div>"
												}
											],
											"fieldMsg": "The following Recipes are available at <b>" + oneProvider.provider + "</b>, and might be compatible to run the build of your repository code."
										};
										var recipes = [];
										providerRecipes[oneProvider.provider].forEach(function (oneRecipe) {
											recipes.push({
												"type": "html",
												"value": "<a id='recipe" + oneRecipe._id.toString() + "' class='btn btn-default recipeButtons' tooltip='Click to Download Recipe'>" + oneRecipe.name +
												"<span class='f-right' style='top:0;'>&nbsp;Download</span>" +
												"<span class='icon icon-download3 f-right'></span>" +
												"</a>",
												"onAction": function (id, data, form) {
													$scope.downloadRecipe(oneRecipe._id);
													return false;
												}
											});
										});
										
										recipesGroup.entries = recipesGroup.entries.concat(recipes);
										formConfig.entries.push(recipesGroup);
										if(currentScope.access.getCIRepoCustomRecipe){
											getRepoRecipeFromBranch($scope, gitAccount, oneProvider, oneRepo, providerRecipes, function (branchInput) {
												formConfig.entries.push({
													"type": "group",
													"name": "repoRecipe",
													"label": "Repository Recipe",
													"entries": [branchInput]
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
																	"port": (mydomainport || 80)
																};
																data.port = data.port.toString();
																switch(oneProvider.provider){
																	case 'travis':
																		data.settings = {
																			"build_pull_requests": formData.build_pull_requests,
																			"build_pushes": formData.build_pushes,
																			"builds_only_with_travis_yml": formData.builds_only_with_travis_yml,
																			"maximum_number_of_builds": formData.maximum_number_of_builds
																		};
																		break;
																	case 'drone':
																		data.settings = {
																			"allow_push": formData.allow_push,
																			"allow_pr": formData.allow_pr,
																			"allow_tags": formData.allow_tags,
																			"allow_tag": formData.allow_tag,
																			"allow_deploys": formData.allow_deploys,
																			"allow_deploy": formData.allow_deploys,
																			"gated": formData.gated
																		};
																		response.settings.repoCiId = response.settings.full_name;
																		break;
																}
																
																data.variables = {};
																for (var i = 0; i < count; i++) {
																	if (!oneProvider.variables[formData['envName' + i]]) {
																		data.variables[formData['envName' + i]] = formData['envVal' + i];
																	}
																}
																
																if (currentScope.access.updateCIRepoSettings) {
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
																			$scope.displayAlert('success', 'Repository Settings Updated.');
																			$scope.form.formData = {};
																			$scope.showCIConfigForm(oneProvider);
																		}
																	});
																}
																else {
																	$scope.displayAlert('danger', "You Do not have access to update the Repo CI Settings.");
																}
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
												
												if ($scope.providerRecipes.length > 0) {
													if (currentScope.access.downloadCDScript) {
														options.actions.unshift({
															"type": "button",
															"label": "Download CD Script",
															"btn": "success",
															"action": function () {
																if ($scope.myBrowser === 'safari') {
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
													else {
														$scope.form.displayAlert('danger', "You do not have access to download the CD Script.");
													}
												}
												
												buildForm($scope, null, options, function () {
													
												});
											});
										}
										else{
											$scope.form.displayAlert('danger', "You do not have access to retrieve the CI Configuration Recipe of this Repo.");
										}
									});
								}
								else{
									$scope.displayAlert('danger', "You do not have access to retrieve the CI Providers of this Repo.");
								}
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
					if(currentScope.access.downloadCIRecipe){
						downloadProviderRecipe($scope, oneRecipeId);
					}
					else{
						$scope.form.displayAlert('danger', "You Do not have access to download a CI Recipe.");
					}
				};
				
				if(!currentScope.access.getCIAccountInfo){
					$scope.form.displayAlert('danger', "You Do not have access to retrieve CI Account information.");
				}
				else{
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
	
	function getRepoRecipeFromBranch(currentScope, gitAccount, provider, repo, providerRecipes, cb){
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
				'fieldMsg': 'Select a branch from your repository to load the associated Continuous Integration Recipe.',
				'onAction': function(id, data, form){
					getRepoCIremoteRecipe(currentScope, {
						provider: provider.provider,
						owner: gitAccount.owner,
						repo: repo.name,
						branch: data
					}, function(response){
						var fileContent, fileSHA, message;
						var type = "warning";
						
						if(response && response.sha){
							fileContent = response.file;
							fileSHA = response.sha;
							message = "The Recipe in your repository is custom made and does not match any of the provider's recipes.";
							providerRecipes[provider.provider].forEach(function(oneRecipe){
								if(oneRecipe.sha === fileSHA){
									message = "The Recipe in your repository matches the provider's recipe named [ " + oneRecipe.name + " ].";
									type = "info";
								}
							});
						}
						else{
							message = "No Recipe found in your repository, you can download any of the above recipes from the provider's.";
						}
						
						var customRecipe = {
							_id: "custom",
							provider: provider.provider,
							name: "Custom Recipe Detected",
							sha: fileSHA,
							recipe: fileContent
						};
						
						var match = false;
						providerRecipes[provider.provider].forEach(function(recipes){
							if(recipes._id === customRecipe._id){
								recipes = customRecipe;
								match = true;
							}
						});
						
						if(!match){
							providerRecipes[provider.provider].push(customRecipe);
						}
						
						message = "<alert class='w100 c-both' type='" + type + "'><span>" + message + "</span>";
						if(response && response.sha){
							message += "<a class='btn btn-default f-right' onclick='expandCustomRecipeContent(); return false;' id='customRepoRecipeContentBTN' style='position: relative; top: -6px;'>Show Recipe Content</a>";
						}
						message += "</alert><br />";
						
						if(response && response.sha){
							message +=  "<div><pre id='customRepoRecipeContent' style='width:100%; display:none;'><code class='yaml' >" + fileContent + "</code></pre></div>";
						}
						
						form.entries.forEach(function(oneFormEntry){
							if(oneFormEntry.type === 'group' && oneFormEntry.name === 'repoRecipe'){
								var divExists = false;
								oneFormEntry.entries.forEach(function(oneSubEntry){
									if(oneSubEntry.name === 'repoRecipeBranchAnswer'){
										divExists = true;
									}
								});
								if(!divExists){
									oneFormEntry.entries.push({
										"type": "html",
										"name": "repoRecipeBranchAnswer",
										"value": "<br /><div id='repoRecipeBranchAnswer'></div>"
									});
								}
								
								$timeout(function(){
									var ele = angular.element(document.getElementById('repoRecipeBranchAnswer'));
									ele.html(message);
									$compile(ele.contents())(currentScope);
								}, 700);
							}
						});
					});
				}
			};
			gitBranchResponse.branches.forEach(function (oneBranch) {
				delete oneBranch.commit.url;
				newInput.value.push({'v': oneBranch.name, 'l': oneBranch.name});
			});
			
			return cb(newInput);
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
				'port': (mydomainport || '80'),
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

function expandRecipeContent(elId){
	var cssProp = jQuery('#', elId).css('display');
	if(cssProp === 'none'){
		jQuery('#e_' + elId).slideDown();
		// jQuery('#customRepoRecipeContentBTN').html('Hide Recipe Content');
		jQuery('#e_'+ elId + ' code').each(function(i, block) {
			hljs.highlightBlock(block);
		});
	}
	else{
		jQuery('#' + elId).slideUp();
		// jQuery('#customRepoRecipeContentBTN').html('Show Recipe Content');
	}
	
}

function expandCustomRecipeContent(){
	var cssProp = jQuery('#customRepoRecipeContent').css('display');
	if(cssProp === 'none'){
		jQuery('#customRepoRecipeContent').slideDown();
		jQuery('#customRepoRecipeContentBTN').html('Hide Recipe Content');
		jQuery('#customRepoRecipeContent code').each(function(i, block) {
			hljs.highlightBlock(block);
		});
	}
	else{
		jQuery('#customRepoRecipeContent').slideUp();
		jQuery('#customRepoRecipeContentBTN').html('Show Recipe Content');
	}
}