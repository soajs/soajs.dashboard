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
			params:{
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
						'fieldMsg': "Please add the following environment variables in your account on " + $scope.ciData.settings.driver + " so that when the build passes successfully, " + $scope.ciData.settings.driver + " will use them and trigger the continuous deliver API in the dashboard to redeploy your services with the new code updates."
					};
					for(var oneVar in $scope.ciData.variables){
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
				buildForm($scope, $modal, options, function(){
					if($scope.ciData.list && $scope.ciData.list.length > 0){
						for(var i =0; i < $scope.ciData.list.length -1; i++){
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
	
	$scope.toggleStatus = function(status, oneRepo){
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/ci/status',
			params:{
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
	
	$scope.configureRepo = function(oneRepo){
		/**
		 * call get repo api,
		 *
		 * generate form entries ( env variables )
		 *
		 * print form
		 *
		 */
	};
	
	injectFiles.injectCss("modules/dashboard/ci/ci.css");
	
	// Start here
	if ($scope.access.get) {
		$scope.getRecipe();
	}
	
}]);
