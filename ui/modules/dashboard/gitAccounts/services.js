"use strict";
var repoService = soajsApp.components;
repoService.service('repoSrv', ['ngDataApi', '$timeout', '$modal', '$compile', function (ngDataApi, $timeout, $modal, $compile) {
	
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
			noCiConfig = true;
		}
		
		var configureRepo = $modal.open({
			templateUrl: 'configureRepo.tmpl',
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function ($scope) {
				fixBackDrop();
				$scope.noCiConfig = noCiConfig;
				$scope.activateRepo = false;
				$scope.ciRepoName = ciRepo.name;
				$scope.goTOCI = function(){
					currentScope.$parent.go('#/continuous-integration');
					configureRepo.close();
				};
				
				$scope.cancel = function(){
					configureRepo.close();
				};
				
				$scope.toggleStatus = function(status){
					toggleStatus(currentScope, status, ciRepo, function(){
						$scope.activateRepo = !status;
						if(status){
							$scope.showCIConfigForm();
						}
						else{
							$scope.form = {};
						}
					});
				};
				
				if(!noCiConfig){
					if(!ciRepo.active){
						$scope.activateRepo = true;
					}
					else{
						$scope.showCIConfigForm();
					}
				}
				
				$scope.showCIConfigForm = function(){
					overlayLoading.show();
					getSendDataFromServer(currentScope, ngDataApi, {
						method: 'get',
						routeName: '/dashboard/ci/settings',
						params: {
							'id': ciRepo.id
						}
					}, function (error, response) {
						if (error) {
							currentScope.displayAlert('danger', error.message);
						}
						else {
							overlayLoading.hide();
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
				}
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
				var statusL = (status === 'on') ? 'Enabled' : 'Disabled';
				currentScope.displayAlert('success', 'Recipe ' + statusL + ' successfully');
				return cb();
			}
		});
	}
	
	function getCDRecipe(){
		// $scope.servicesNumber=[];
		//
		// $scope.getRecipe = function () {
		//
		// 	overlayLoading.show();
		// 	getSendDataFromServer($scope, ngDataApi, {
		// 		method: 'get',
		// 		routeName: '/dashboard/cd'
		// 	}, function (error, response) {
		// 		overlayLoading.hide();
		// 		if (error) {
		// 			$scope.displayAlert('danger', error.message);
		// 		}
		//
		// 		if(!response) {
		// 			response = {};
		// 		}
		//
		// 		if(!response['DASHBOARD']) {
		// 			response['DASHBOARD'] = {
		// 				"branch": "master",
		// 				"strategy": "notify"
		// 			};
		// 		}
		//
		// 		if($scope.myEnv.toUpperCase() !== 'DASHBOARD') {
		// 			if(!response[$scope.myEnv.toUpperCase()]) {
		// 				response[$scope.myEnv.toUpperCase()] = {
		// 					"branch": "master",
		// 					"strategy": "notify"
		// 				};
		// 			}
		// 		}
		//
		// 		$scope.cdData = response;
		//
		// 		if(response[$scope.myEnv.toUpperCase()]){
		// 			$scope.configuration = response[$scope.myEnv.toUpperCase()];
		// 			for (var key in $scope.configuration){
		// 				if(key !=='branch' && key !== 'strategy' && key !== 'include'){
		// 					if($scope.configuration[key]){
		// 						$scope.configuration[key].include = true;
		// 						for (var ver in response[key]){
		// 							if(ver !=='branch' && ver !== 'strategy' && ver !== 'include'){
		// 								if($scope.configuration[key][ver]){
		// 									$scope.configuration[key][ver].include = true;
		// 								}
		// 							}
		// 						}
		// 					}
		// 				}
		// 			}
		// 		}
		// 	});
		// };
		//
		// $scope.getServices = function () {
		// 	overlayLoading.show();
		// 	getSendDataFromServer($scope, ngDataApi, {
		// 		method: 'get',
		// 		routeName: '/dashboard/cloud/services/list',
		// 		params: {
		// 			"env": $scope.myEnv.toLowerCase()
		// 		}
		// 	}, function (error, response) {
		// 		overlayLoading.hide();
		// 		if (error) {
		// 			$scope.displayAlert('danger', error.message);
		// 		}
		// 		else {
		// 			var objServices={};
		// 			var branches=[];
		// 			response.forEach(function(service){
		// 				if (service.labels && service.labels['soajs.content']){
		// 					var branch;
		// 					if (service.labels['service.branch']){
		// 						branch = service.labels['service.branch'];
		// 					}
		// 					////
		// 					if (!branch){
		// 						for (var x =0; x < service.env.length; x++) {
		// 							if(service.env[x].indexOf('SOAJS_GIT_BRANCH')!== -1){
		// 								branch = service.env[x].replace("SOAJS_GIT_BRANCH=", "");
		// 								break;
		// 							}
		// 						}
		// 					}
		// 					////
		// 					if (branch) {
		// 						service.branch = branch;
		// 						if(branches.indexOf(branch) === -1){
		// 							branches.push(branch);
		// 						}
		//
		// 						if (service.labels['soajs.service.name']){
		// 							service.serviceName = service.labels['soajs.service.name'];
		// 							if(!objServices[service.serviceName]){
		// 								objServices[service.serviceName]={
		// 									versions:[]
		// 								};
		// 							}
		// 							service.versionLabel = service.labels['soajs.service.version'];
		// 							objServices[service.serviceName].versions.push(service);
		// 						}
		// 					}
		// 				}
		// 			});
		// 			$scope.branches= branches;
		// 			$scope.objServices = objServices;
		// 			$scope.servicesNumber = Object.keys(objServices);
		// 		}
		// 	});
		// };
		//
		// $scope.saveRecipe = function() {
		// 	var configuration={};
		// 	configuration.branch = $scope.configuration.branch;
		// 	configuration.strategy = $scope.configuration.strategy;
		//
		// 	for(var key in $scope.configuration){
		// 		if( key!== 'branch' && key !== 'strategy'){
		// 			if($scope.configuration[key].include){
		// 				configuration[key] = {
		// 					branch: $scope.configuration[key].branch,
		// 					strategy: $scope.configuration[key].strategy
		// 				};
		// 				for(var str in $scope.configuration[key]){
		// 					if( str!== 'branch' && str !== 'strategy' && str !== 'include'){
		// 						if($scope.configuration[key][str].include){
		// 							configuration[key][str] = {
		// 								branch:$scope.configuration[key][str].branch,
		// 								strategy:$scope.configuration[key][str].strategy
		// 							};
		// 						}
		// 					}
		// 				}
		// 			}
		// 		}
		// 	}
		// 	$scope.cdData['DASHBOARD'] = {
		// 		"branch": "master",
		// 		"strategy": "notify"
		// 	};
		// 	$scope.cdData[$scope.myEnv] = configuration;
		// 	var data = $scope.cdData;
		// 	delete data.type;
		// 	delete data.soajsauth;
		// 	overlayLoading.show();
		// 	getSendDataFromServer($scope, ngDataApi, {
		// 		method: 'post',
		// 		routeName: '/dashboard/cd',
		// 		data: {
		// 			"config": data
		// 		}
		// 	}, function (error, response) {
		// 		overlayLoading.hide();
		// 		if (error) {
		// 			$scope.displayAlert('danger', error.message);
		// 		}
		// 		else {
		// 			$scope.displayAlert('success', 'Recipe Saved successfully');
		// 			$scope.getRecipe();
		// 		}
		// 	});
		// };
		//
		// $scope.assignService = function(name) {
		// 	if(!$scope.configuration[name].strategy){
		// 		$scope.configuration[name].strategy= 'notify';
		// 	}
		// 	$scope.objServices[name].icon = 'minus';
		// 	jQuery('#cd_' + name).slideDown()
		// 	$scope.configuration[name].branch = $scope.objServices[name].versions[0].branch;
		//
		// };
		//
		// $scope.showHide = function(oneService, name){
		// 	if(oneService.icon === 'minus'){
		// 		oneService.icon = 'plus';
		// 		jQuery('#cd_' + name).slideUp();
		// 	}
		// 	else{
		// 		oneService.icon = 'minus';
		// 		jQuery('#cd_' + name).slideDown()
		// 	}
		// };
		//
		// $scope.setVersion = function(name,version) {
		// 	$scope.configuration[name][version.versionLabel].branch = version.branch;
		// 	if(!$scope.configuration[name][version.versionLabel].strategy){
		// 		$scope.configuration[name][version.versionLabel].strategy = 'notify';
		// 	}
		// };
	}
	
	return {
		"getCIRecipe": getCIRecipe,
		"getCDRecipe": getCDRecipe,
		"configureRepo": configureRepo
	}
}]);