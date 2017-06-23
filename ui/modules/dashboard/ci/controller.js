'use strict';

var ciApp = soajsApp.components;
ciApp.controller('ciAppCtrl', ['$scope', '$timeout', '$modal', '$cookies', 'ngDataApi', 'injectFiles', function ($scope, $timeout, $modal, $cookies, ngDataApi, injectFiles) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, ciAppConfig.permissions);

	$scope.ciData = {};

	$scope.travisImagePath = "./themes/" + themeToUse + "/img/travis_logo.png";
	$scope.droneImagePath = "./themes/" + themeToUse + "/img/drone_logo.png";
	$scope.jenkinsImagePath = "./themes/" + themeToUse + "/img/jenkins_logo.png";
	$scope.teamCityImagePath = "./themes/" + themeToUse + "/img/teamcity_logo.png";

	$scope.checkRecipe = function () {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/ci',
			params: {
				'port': (mydomainport || 80),
				'list': false
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				$scope.ciData = response;

				if ($scope.ciData.settings && Object.keys($scope.ciData.settings).length > 0) {
					$scope.getRecipe('travis');
				}
			}
		});
	};

	$scope.getRecipe = function (provider) {
		var formConfig = angular.copy(ciAppConfig.form.f1);

		var submitLabel = "Turn On";
		var data = {};
		var turnOff, download;

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
				type: 'button',
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

		var options = {
			timeout: $timeout,
			form: formConfig,
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
								"driver": provider,
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
							if (error) {
								$scope.form.displayAlert('danger', error.message);
								overlayLoading.hide();
							}
							else {
								if ($scope.modalInstance) {
									$scope.modalInstance.close();
								}

								$scope.form.displayAlert('success', 'Recipe Saved successfully');
								$scope.form.formData = {};
								$scope.checkRecipe();
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

		if ($scope.ciData.settings && Object.keys($scope.ciData.settings).length > 0) {
			options.entries = formConfig.entries;
			buildForm($scope, $modal, options, function () {
				if ($scope.ciData.list && $scope.ciData.list.length > 0) {
					for (var i = 0; i < $scope.ciData.list.length - 1; i++) {
						$scope.ciData.list[i].status = ($scope.ciData.list[i].active) ? 'ON' : 'OFF';
					}
				}
			});
		}
		else {
			buildFormWithModal($scope, $modal, options, function () {
				if ($scope.ciData.list && $scope.ciData.list.length > 0) {
					for (var i = 0; i < $scope.ciData.list.length - 1; i++) {
						$scope.ciData.list[i].status = ($scope.ciData.list[i].active) ? 'ON' : 'OFF';
					}
				}
			});
		}
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
				// $scope.getRecipe();
				$scope.checkRecipe();
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

	injectFiles.injectCss("modules/dashboard/ci/ci.css");

	//start here
	if ($scope.access.get) {
		$scope.checkRecipe();
	}

}]);
