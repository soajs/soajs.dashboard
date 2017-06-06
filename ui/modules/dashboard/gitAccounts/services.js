"use strict";
var repoService = soajsApp.components;
repoService.service('repoSrv', ['ngDataApi', '$timeout', '$modal', function (ngDataApi, $timeout, $modal) {
	
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
				
				return cb(null, {
					'config': response.settings,
					'list': response.list
				});
			}
		});
	}
	
	function configureRepo (currentScope, oneRepo, config) {
		/**
		 * call get repo api,
		 *
		 * generate form entries ( env variables )
		 *
		 * print form
		 *
		 */
		
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/ci/settings',
			params: {
				'id': oneRepo.id
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
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
					"value": '<span class="f-right"><input type="button" class="btn btn-sm btn-success" value="Add New Variable"></span>',
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
					form: formConfig,
					name: 'repoSettings',
					label: 'Update Repo Settings',
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
										'id': oneRepo.id
									},
									data: data
								}, function (error, response) {
									overlayLoading.hide();
									if (error) {
										currentScope.form.displayAlert('danger', error.message);
									}
									else {
										currentScope.displayAlert('success', 'Repository Settings Updated.');
										currentScope.form.formData = {};
										currentScope.modalInstance.close();
									}
								});
							}
						},
						{
							type: 'reset',
							label: 'Cancel',
							btn: 'danger',
							action: function () {
								currentScope.modalInstance.dismiss('cancel');
								currentScope.form.formData = {};
							}
						}
					]
				};
				
				buildFormWithModal(currentScope, $modal, options);
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
				'enable': (status === 'on')
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
		"configureRepo": configureRepo,
		"toggleStatus": toggleStatus
	}
}]);