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
		
	}
	
	return {
		"getCIRecipe": getCIRecipe,
		"getCDRecipe": getCDRecipe,
		"configureRepo": configureRepo
	}
}]);