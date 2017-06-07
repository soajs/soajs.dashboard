"use strict";
var repoService = soajsApp.components;
repoService.service('repoSrv', ['ngDataApi', '$timeout', '$modal', '$cookies', function (ngDataApi, $timeout, $modal, $cookies) {
	
	function getCIRecipe(currentScope, cb){
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/ci',
			params: {
				'port': (mydomainport || 80)
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				for (var i = 0; i < response.list.length - 1; i++) {
					response.list[i].status = (response.list[i].active) ? 'ON' : 'OFF';
				}
				
				return cb(null, response);
			}
		});
	}
	
	function configureRepo (currentScope, oneRepo, config) {
		var noCiConfig = false;
		var noRepoCiConfig = false;

		if(!currentScope.ciData.settings.settings || Object.keys(currentScope.ciData.settings.settings).length ===0){
			noCiConfig = true;
		}

		let ciRepo;
		for(let i=0; i < currentScope.ciData.list.length; i++){
			if(currentScope.ciData.list[i].name === oneRepo.full_name){
				ciRepo = currentScope.ciData.list[i];
				break;
			}
		}
		
		if(!ciRepo){
            noRepoCiConfig = true;
		}

        var configureRepo = $modal.open({
			templateUrl: 'configureRepo.tmpl',
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function ($scope) {
				fixBackDrop();

				$scope.alerts = [];
				$scope.noCiConfig = noCiConfig;
				$scope.noRepoCiConfig = noRepoCiConfig;
				$scope.activateRepo = false;
				if(ciRepo) {
                    $scope.ciRepoName = ciRepo.name;
                }
				$scope.goTOCI = function(){
					currentScope.$parent.go('#/continuous-integration');
					configureRepo.close();
				};

				$scope.cancel = function(){
					configureRepo.close();
				};

				$scope.toggleStatus = function(status){
					toggleStatus($scope, status, ciRepo, function(){
						$scope.activateRepo = !status;
						if(status){
							$scope.showCIConfigForm();
						}
						else{
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

				$scope.showCIConfigForm = function(){
					overlayLoading.show();
					getSendDataFromServer(currentScope, ngDataApi, {
						method: 'get',
						routeName: '/dashboard/ci/settings',
						params: {
							'id': ciRepo.id
						}
					}, function (error, response) {
						overlayLoading.hide();
						if (error) {
							$scope.displayAlert('danger', error.message);
						}
						else {
							var customEnvs = response.envs;
							var formConfig = angular.copy(config.form.settings);

							for (var oneVar in currentScope.ciData.variables) {
								formConfig.entries[1].entries.push({
									'name': oneVar,
									'label': oneVar,
									'value': currentScope.ciData.variables[oneVar],
									'disabled': true,
									'type': 'text'
								});
							}

							formConfig.entries[1].entries.push({
								"type":"html",
								"value": "<br /><p><em>Once you submit this form, the above SOAJS environment variables will be added to your repository configuration.</em></p>"
							});

							var count = 0;
							formConfig.entries[2].entries = [];
							customEnvs.forEach(function (enVar) {
								if(!currentScope.ciData.variables[enVar.name]){
									var oneClone = angular.copy(config.form.envVar);
									for (var i = 0; i < oneClone.length; i++) {
										oneClone[i].name = oneClone[i].name.replace("%count%", count);
										if(oneClone[i].name.indexOf('envName') !== -1){
											oneClone[i].value = enVar.name;
										}
										if(oneClone[i].name.indexOf('envVal') !== -1){
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
												"settings":{
													"build_pull_requests": formData.build_pull_requests,
													"build_pushes": formData.build_pushes,
													"builds_only_with_travis_yml": formData.builds_only_with_travis_yml,
													"maximum_number_of_builds": formData.maximum_number_of_builds
												}
											};

											data.variables = {};
											for (var i = 0; i < count; i++) {
												if(!currentScope.ciData.variables[formData['envName' + i]]){
													data.variables[formData['envName' + i]] = formData['envVal' + i];
												}
											}

											overlayLoading.show();
											getSendDataFromServer(currentScope, ngDataApi, {
												method: 'put',
												routeName: '/dashboard/ci/settings',
												params: {
													'id': ciRepo.id
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
													$scope.cancel();
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

							buildForm($scope, null, options, function(){

							});
						}
					});
				};

				if(!noCiConfig && !noRepoCiConfig){
					if(!ciRepo.active){
						$scope.activateRepo = true;
					}
					else{
						$scope.showCIConfigForm();
					}
				}

				$scope.showHide = function(oneService, name){
					if(oneService.icon === 'minus'){
						oneService.icon = 'plus';
						jQuery('#cd_' + name).slideUp();
					}
					else{
						oneService.icon = 'minus';
						jQuery('#cd_' + name).slideDown()
					}
				};
				
				$scope.cdShowHide = function(oneSrv, name){
					if($scope.cdConfiguration[oneSrv].icon === 'minus'){
						$scope.cdConfiguration[oneSrv].icon = 'plus';
						jQuery('#cdc_' + name).slideUp();
					}
					else{
						$scope.cdConfiguration[oneSrv].icon = 'minus';
						jQuery('#cdc_' + name).slideDown()
					}
				};

				$scope.setVersion = function(oneEnv, version, oneSrv) {
					if($scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version]){
						delete $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version];
					}
					else{
						$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version] = {
							branch: $scope.cdConfiguration[oneSrv][oneEnv].obj.ha[version].branch
						};
					}
				};
				
				$scope.getCDRecipe = function(){
					getCDRecipe($scope, oneRepo, function(){
						//console.log($scope.cdConfiguration);
					});
				};
				
				$scope.saveRecipe = function(){
					saveRecipe($scope, function(){
						
					});
				};
			}
		});
	}
	
	function toggleStatus(currentScope, status, oneRepo, cb) {
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/ci/status',
			params: {
				'id': oneRepo.id,
				'enable': status
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
	
	function getEnvironments(currentScope, cb){
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment/list"
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				currentScope.cdEnvs = [];
				response.forEach(function(oneEnv){
					if(oneEnv.code.toLowerCase() !== 'dashboard'){
						currentScope.cdEnvs.push(oneEnv.code);
					}
				});
				return cb();
			}
		});
	}
	
	function getCDRecipe(currentScope, oneRepo, cb){
		currentScope.cdConfiguration = null;
		overlayLoading.show();
		getEnvironments(currentScope, function(){
			
			getSendDataFromServer(currentScope, ngDataApi, {
				method: 'get',
				routeName: '/dashboard/cd'
			}, function (error, response) {
				overlayLoading.hide();
				if (error) {
					currentScope.displayAlert('danger', error.message);
					return cb();
				}
				else{
					var defaultCD = {
						"branch": "master",
						"strategy": "notify",
						"default": true
					};
					
					if(!response) {
						response = {};
					}
					currentScope.cdData = response;
					currentScope.cdConfiguration = {};
					if(oneRepo.type ==='multi' && oneRepo.multi && oneRepo.multi.length > 0){
						oneRepo.multi.forEach(function(oneSub){
							currentScope.cdConfiguration[oneSub.name] = {
								type: oneSub.type,
								icon: 'minus'
							};
						});
					}
					else{
						var serviceName = oneRepo.full_name.split("/")[1];
						currentScope.cdConfiguration[serviceName] = {
							type: oneRepo.type,
							icon: 'minus'
						};
					}
					var max = Object.keys(currentScope.cdConfiguration).length;
					currentScope.maxEntries = 0;
					var repoCount =0;
					for(var oneService in currentScope.cdConfiguration){
						populateServiceInEnvironments(0, oneService, defaultCD, function(){
							repoCount++;
							if(repoCount === max){
								for(var oneService in currentScope.cdConfiguration) {
									if (currentScope.cdConfiguration[oneService].display) {
										currentScope.maxEntries++;
									}
								}
								return cb();
							}
						});
					}
				}
			});
		});
		
		function populateServiceInEnvironments(counter, serviceName, defaultCD, mCb){
			var oneCDEnv = currentScope.cdEnvs[counter];
			
			if(!currentScope.cdData[oneCDEnv.toUpperCase()]) {
				currentScope.cdData[oneCDEnv.toUpperCase()] = defaultCD;
			}
			
			currentScope.cdConfiguration[serviceName].name = serviceName;
			currentScope.cdConfiguration[serviceName].display = false;
			
			currentScope.cdConfiguration[serviceName][oneCDEnv.toUpperCase()] = {
				"cdData" : angular.copy(currentScope.cdData[oneCDEnv.toUpperCase()][serviceName]) || angular.copy(currentScope.cdData[oneCDEnv.toUpperCase()])
			};
			currentScope.cdConfiguration[serviceName][oneCDEnv.toUpperCase()].cdData.versions = {};
			
			getEnvServices(oneCDEnv, serviceName, function(){
				counter++;
				if(counter === currentScope.cdEnvs.length){
					return mCb();
				}
				else{
					populateServiceInEnvironments(counter, serviceName, defaultCD, mCb);
				}
			});
		}
		
		function getEnvServices(envCode, serviceName, mCb){
			getServiceInEnv(currentScope, envCode, serviceName, mCb);
		}
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
			}
			else {
				if(!currentScope.cdConfiguration[serviceName][env.toUpperCase()].obj){
					currentScope.cdConfiguration[serviceName][env.toUpperCase()].obj = {
						branches: [],
						ha: {}
					};
				}
				
				for(var srv=0; srv < response.length; srv++){
					var service = response[srv];
					
					if (service.labels){
						if(serviceName === service.labels['service.repo'] || serviceName === service.labels['soajs.service.name']){
							currentScope.cdConfiguration[serviceName].label = service.labels['soajs.service.name'];
							var branch;
							if (service.labels['service.branch']){
								branch = service.labels['service.branch'];
							}
							////
							if (!branch){
								for (var x =0; x < service.env.length; x++) {
									if(service.env[x].indexOf('SOAJS_GIT_BRANCH')!== -1){
										branch = service.env[x].replace("SOAJS_GIT_BRANCH=", "");
										break;
									}
								}
							}
							////
							if (branch) {
								if(currentScope.cdConfiguration[serviceName][env.toUpperCase()].obj.branches.indexOf(branch) === -1){
									currentScope.cdConfiguration[serviceName][env.toUpperCase()].obj.branches.push(branch);
								}
								service.branch = branch;
								if (service.labels['soajs.service.version']){
									var version = service.labels['soajs.service.version'];
									currentScope.cdConfiguration[serviceName][env.toUpperCase()].obj.ha[version] = angular.copy(service);
								}
								else{
									currentScope.cdConfiguration[serviceName][env.toUpperCase()].obj.ha = angular.copy(service);
								}
								currentScope.cdConfiguration[serviceName].display = true;
							}
						}
					}
				}
			}
			return cb();
		});
	}
	
	function saveRecipe(currentScope, cb) {
		var configuration = {};
		var environments = currentScope.cdEnvs;
		
		environments.forEach(function(oneEnv){
			configuration[oneEnv] = angular.copy(currentScope.cdData[oneEnv]);
			delete configuration[oneEnv].branch;
			delete configuration[oneEnv].strategy;
			delete configuration[oneEnv].default;
			
			if(!configuration[oneEnv]){
				configuration[oneEnv] = {};
			}
			
			for(var oneRepo in currentScope.cdConfiguration){
				var oneService = currentScope.cdConfiguration[oneRepo].label;
				if(oneService){
					if(!configuration[oneEnv][oneService]){
						configuration[oneEnv][oneService] = {};
					}
					
					configuration[oneEnv][oneService] = {
						branch: currentScope.cdConfiguration[oneRepo][oneEnv].cdData.branch,
						strategy: currentScope.cdConfiguration[oneRepo][oneEnv].cdData.strategy
					};
					
					for(var version in currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions){
						configuration[oneEnv][oneService]['v' + version] = {
							branch: currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].branch,
							strategy: currentScope.cdConfiguration[oneRepo][oneEnv].cdData.versions[version].strategy
						};
					}
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
				getCDRecipe(currentScope, cb);
			}
		});
	}
	
	return {
		"getCIRecipe": getCIRecipe,
		"getCDRecipe": getCDRecipe,
		"configureRepo": configureRepo
	}
}]);