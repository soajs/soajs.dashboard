'use strict';

var ciApp = soajsApp.components;
ciApp.controller('ciAppCtrl', ['$scope', '$timeout', '$modal', '$cookies', 'ngDataApi', 'injectFiles', function ($scope, $timeout, $modal, $cookies, ngDataApi, injectFiles) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, ciAppConfig.permissions);

	$scope.ciData = {};

	$scope.getRecipe = function () {
		var formConfig = angular.copy(ciAppConfig.form.f1);

		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/ci',
			params: {
				'port': (mydomainport || 80)
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				var submitLabel = "Turn On";
				var data = {};
				var turnOff, download;
				$scope.ciData = response;

				/**
				 * Create/update and render continuous integration form
				 */
				if ($scope.ciData.settings && Object.keys($scope.ciData.settings).length > 0) {
					var htmlString = {
						'name': '',
						'label': 'Environment Varlables',
						'type': 'html',
						'value': "<div class='infoTableContainer'><table class='infoTable' width='100%' border='1' cellpadding='3' cellspacing='2'>" +
						"<thead>" +
						"<tr>" +
						"<th width='20%'>Variable Name</th>" +
						"<th width='80%'>Value</th>" +
						"</tr>" +
						"</thead>" +
						"<tbody>",
						'fieldMsg': "The following environment variables are needed by SOAJS to set up your CI/CD integration. These variables are automatically created when you click on Sync All or when you update the settings of a repository in the second tab."
					};
					for (var oneVar in $scope.ciData.variables) {
						htmlString.value += "<tr>" +
							"<td><label>" + oneVar + "</label></td>" +
							"<td class='val'>" + $scope.ciData.variables[oneVar] + "</td>" +
							"</tr>";
					}
					htmlString.value += "</tbody></table></div>";

					formConfig.entries.push(htmlString);

					formConfig.entries = formConfig.entries.concat(angular.copy(ciAppConfig.form.f2.entries));
					//show the list and the yaml file
					formConfig.entries[1].collapsed = true;

					data['driver'] = $scope.ciData.settings.driver;
					data['domain'] = $scope.ciData.settings.settings.domain;
					data['owner'] = $scope.ciData.settings.settings.owner;
					data['gitToken'] = $scope.ciData.settings.settings.gitToken;
					data['recipe'] = $scope.ciData.settings.recipe;
					turnOff = {
						type: 'submit',
						label: 'Turn Off Continuous Integration',
						btn: 'danger',
						action: function () {
							$scope.deleteRecipe();
						}
					};

					if (data['recipe'].trim() !== '') {
						download = {
							type: 'submit',
							label: 'Download Continuous Integration',
							btn: 'success',
							action: function () {
								$scope.downloadRecipe();
							}
						};
					}

					submitLabel = "Update";
				}

				formConfig.entries[0].onAction = function (id, data, form) {
					if ($scope.ciData.settings && Object.keys($scope.ciData.settings).length > 0) {
						if (data !== $scope.ciData.settings.driver) {
							form.formData.domain = '';
							form.formData.owner = '';
							form.formData.gitToken = '';
						}
						else {
							form.formData.domain = $scope.ciData.settings.settings.domain;
							form.formData.owner = $scope.ciData.settings.settings.owner;
							form.formData.gitToken = $scope.ciData.settings.settings.gitToken;
						}
					}
					else {
						form.formData.domain = '';
						form.formData.owner = '';
						form.formData.gitToken = '';

						if (data === 'travis') {
							form.formData.domain = "api.travis-ci.org";
						}
					}
				};

				var options = {
					timeout: $timeout,
					entries: formConfig.entries,
					name: 'continuousIntegration',
					label: 'Continuous Integration',
					data: data,
					actions: [
						{
							type: 'submit',
							label: submitLabel + " Continuous Integration",
							btn: 'primary',
							action: function (formData) {

								var data = {
									config: {
										"driver": formData.driver,
										"settings": {
											"domain": formData.domain,
											"owner": formData.owner,
											"gitToken": formData.gitToken
										},
										"recipe": (formData.recipe) ? formData.recipe : ""
									}
								};

								overlayLoading.show();
								getSendDataFromServer($scope, ngDataApi, {
									method: 'post',
									routeName: '/dashboard/ci',
									data: data
								}, function (error, response) {
									overlayLoading.hide();
									if (error) {
										$scope.form.displayAlert('danger', error.message);
									}
									else {
										$scope.form.displayAlert('success', 'Recipe Saved successfully');
										$scope.form.formData = {};
										$scope.getRecipe();
									}
								});
							}
						}
					]
				};
				if (download && Object.keys(download).length > 0) {
					options.actions.push(download);
				}

				if (turnOff && Object.keys(turnOff).length > 0) {
					options.actions.push(turnOff);
				}
				buildForm($scope, $modal, options, function () {
					if ($scope.ciData.list && $scope.ciData.list.length > 0) {
						for (var i = 0; i < $scope.ciData.list.length - 1; i++) {
							$scope.ciData.list[i].status = ($scope.ciData.list[i].active) ? 'ON' : 'OFF';
						}
					}
				});
			}
		});
	};

	$scope.deleteRecipe = function () {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'delete',
			routeName: '/dashboard/ci'
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				$scope.displayAlert('success', 'Recipe deleted successfully');
				$scope.getRecipe();
			}
		});
	};

	$scope.downloadRecipe = function () {
		var options = {
			routeName: "/dashboard/ci/download",
			method: 'get',
			headers: {
				"Accept": "application/zip"
			},
			responseType: 'arraybuffer'
		};
		getSendDataFromServer($scope, ngDataApi, options, function (error, data) {
			if (error) {
				$scope.$parent.displayAlert("danger", error.message);
			}
			else {
				openSaveAsDialog("ci.zip", data, "application/zip");
			}
		});
	};

	$scope.toggleStatus = function (status, oneRepo) {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/ci/status',
			params: {
				'id': oneRepo.id,
				'enable': (status === 'on')
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				var statusL = (status === 'on') ? 'Enabled' : 'Disabled';

				$scope.displayAlert('success', 'Recipe ' + statusL + ' successfully');
				$scope.getRecipe();
			}
		});
	};

	$scope.configureRepo = function (oneRepo) {
		/**
		 * call get repo api,
		 *
		 * generate form entries ( env variables )
		 *
		 * print form
		 *
		 */

		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/ci/settings',
			params: {
				'id': oneRepo.id
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				var customEnvs = response.envs;
				var formConfig = angular.copy(ciAppConfig.form.settings);

				for (var oneVar in $scope.ciData.variables) {
					formConfig.entries[1].entries.push({
						'name': oneVar,
						'label': oneVar,
						'value': $scope.ciData.variables[oneVar],
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
					if(!$scope.ciData.variables[enVar.name]){
						var oneClone = angular.copy(ciAppConfig.form.envVar);
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


				var oneClone = angular.copy(ciAppConfig.form.envVar);
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
						var oneClone = angular.copy(ciAppConfig.form.envVar);
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
									if(!$scope.ciData.variables[formData['envName' + i]]){
										data.variables[formData['envName' + i]] = formData['envVal' + i];
									}
								}

								overlayLoading.show();
								getSendDataFromServer($scope, ngDataApi, {
									method: 'put',
									routeName: '/dashboard/ci/settings',
									params: {
										'id': oneRepo.id
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
										$scope.modalInstance.close();
										$scope.getRecipe();
									}
								});
							}
						},
						{
							type: 'reset',
							label: 'Cancel',
							btn: 'danger',
							action: function () {
								$scope.modalInstance.dismiss('cancel');
								$scope.form.formData = {};
							}
						}
					]
				};

				buildFormWithModal($scope, $modal, options, function () {

				});
			}
		});
	};

	$scope.syncAll = function () {
		var formConfig = angular.copy(ciAppConfig.form.sync);

		formConfig.entries[0].value = "<div class='infoTableContainer'><table class='infoTable' width='100%' border='1' cellpadding='3' cellspacing='2'>" +
			"<thead>" +
			"<tr>" +
				"<th width='20%'>Variable Name</th>" +
				"<th width='80%'>Value</th>" +
			"</tr>" +
			"</thead>" +
			"<tbody>";

		for (var oneVar in $scope.ciData.variables) {
			formConfig.entries[0].value += "<tr>" +
				"<td><label>" + oneVar + "</label></td>" +
				"<td class='val'>" + $scope.ciData.variables[oneVar] + "</td>" +
				"</tr>";
		}

		formConfig.entries[0].value += "</tbody></table></div>";

		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'syncRepos',
			label: 'Sync all Repos',
			actions: [
				{
					type: 'submit',
					label: "Sync Repos",
					btn: 'primary',
					action: function () {
						overlayLoading.show();
						getSendDataFromServer($scope, ngDataApi, {
							method: 'get',
							routeName: '/dashboard/ci/sync',
							params: {
								port: (mydomainport || 80)
							}
						}, function (error, response) {
							overlayLoading.hide();
							if (error) {
								$scope.displayAlert('danger', error.message);
							}
							else {
								$scope.displayAlert('success', 'Repositories have been synced');
								$scope.modalInstance.close();
								$scope.getRecipe();
							}
						});
					}
				},
				{
					type: 'reset',
					label: 'Cancel',
					btn: 'danger',
					action: function () {
						$scope.modalInstance.dismiss('cancel');
						$scope.form.formData = {};
					}
				}
			]
		};

		buildFormWithModal($scope, $modal, options, function () {

		});
	};

	injectFiles.injectCss("modules/dashboard/ci/ci.css");

	// Start here
	if ($scope.access.get) {
		$scope.getRecipe();
	}

}]);
