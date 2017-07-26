'use strict';

var cdApp = soajsApp.components;
cdApp.controller('cdAppCtrl', ['$scope', '$timeout', '$modal', '$cookies', 'ngDataApi', 'injectFiles', function ($scope, $timeout, $modal, $cookies, ngDataApi, injectFiles) {
	$scope.$parent.isUserLoggedIn();
	$scope.configuration={};
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, cdAppConfig.permissions);
	$scope.$parent.rerenderMenuAfterEnvExclude(cdNav);

	$scope.cdData = {};
	$scope.myEnv = $cookies.getObject('myEnv').code;
	$scope.upgradeSpaceLink = cdAppConfig.upgradeSpaceLink;
	$scope.updateCount;
	$scope.upgradeCount;

	$scope.cdShowHide = function(oneSrv){
		if($scope.configuration[oneSrv].icon === 'minus'){
			$scope.configuration[oneSrv].icon = 'plus';
			jQuery('#cdc_' + oneSrv).slideUp();
		}
		else{
			$scope.configuration[oneSrv].icon = 'minus';
			jQuery('#cdc_' + oneSrv).slideDown()
		}
	};

	$scope.getRecipe = function () {

		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/cd'
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}

			if(!response) {
				response = {};
			}

			$scope.cdData = response;
			$scope.maxEntries = 0;
			if(response[$scope.myEnv.toUpperCase()]){
				$scope.configuration = angular.copy(response[$scope.myEnv.toUpperCase()]);
				if(Object.hasOwnProperty.call($scope.configuration, 'pause')){
					$scope.paused = $scope.configuration.pause;
				}
				delete $scope.configuration.pause;
				for(var service in $scope.configuration){
					if(SOAJSRMS.indexOf("soajs." + service) !== -1) {
						delete $scope.configuration[service];
					}
					else{
						if(['pause', 'deploy', 'options'].indexOf(service) === -1){
							$scope.maxEntries++;
							$scope.configuration[service].icon = 'minus';
							$scope.configuration[service].versions = {};
							
							if($scope.configuration[service].type ==='daemon'){
								for(var i in $scope.configuration[service]){
									if (['type', 'branch', 'strategy', 'versions', 'icon', 'deploy', 'options'].indexOf(i) === -1) {
										
										$scope.configuration[service].versions[i] = {};
										for(var groupName in $scope.configuration[service][i]){
											$scope.configuration[service].versions[i][groupName] = angular.copy($scope.configuration[service][i][groupName]);
										}
										delete $scope.configuration[service][i];
									}
								}
								
							}
							else{
								for(var i in $scope.configuration[service]){
									
									if (['type', 'branch', 'strategy', 'versions', 'icon', 'deploy', 'options'].indexOf(i) === -1) {
										$scope.configuration[service].versions[i] = angular.copy($scope.configuration[service][i]);
										delete $scope.configuration[service][i];
									}
								}
							}
							if (Object.keys($scope.configuration[service].versions).length === 0) {
								delete $scope.configuration[service].versions;
							}
						}
					}
				}
			}
		});
	};

	$scope.pauseRecipe = function(pause){
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'post',
			routeName: '/dashboard/cd/pause',
			data: {
				"config": {
					"env": $scope.myEnv,
					"pause": pause
				}
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				$scope.displayAlert('success', 'Recipe Saved successfully');
				$timeout(function(){
					$scope.getRecipe();
				}, 200)
			}
		});
	};

	$scope.saveRecipe = function(service, version) {
		var data={
			env: $scope.myEnv,
			serviceName: service
		};

		if(SOAJSRMS.indexOf("soajs." + service) !== -1){
			$scope.displayAlert('danger', "You cannot Apply Continuous Delivery on a SOAJS Ready Made Service.");
		}

		if ($scope.configuration[service].versions && Object.keys($scope.configuration[service].versions).length > 0) {
			data.version = {
				v: version
			};

			for (var i in $scope.configuration[service].versions[version]) {
				data.version[i] = $scope.configuration[service].versions[version][i];
			}
		}
		else {
			data.default = {
				branch: $scope.configuration[service].branch,
				strategy: $scope.configuration[service].strategy
			};
			if ($scope.configuration[service].deploy) {
				data.default.deploy = $scope.configuration[service].deploy;
				data.default.options = $scope.configuration[service].options;
			}
		}
		
		overlayLoading.show();
		if($scope.configuration[service].type ==='daemon'){
			var newData = {
				env: data.env,
				serviceName: data.serviceName,
				version:{}
			};
			
			var max = Object.keys(data.version).length;
			updateDaemonsGroupCD(data.version, 0, function(){
				overlayLoading.hide();
				$scope.displayAlert('success', 'Recipe Saved successfully');
				$scope.getRecipe();
			});
		}
		else{
			getSendDataFromServer($scope, ngDataApi, {
				method: 'post',
				routeName: '/dashboard/cd',
				data: {
					"config": data
				}
			}, function (error, response) {
				overlayLoading.hide();
				if (error) {
					$scope.displayAlert('danger', error.message);
				}
				else {
					$scope.displayAlert('success', 'Recipe Saved successfully');
					$scope.getRecipe();
				}
			});
		}
		
		function updateDaemonsGroupCD(version, counter, cb){
			var groupName = Object.keys(version)[counter];
			if(groupName === 'v'){
				counter++;
				updateDaemonsGroupCD(version, counter, cb);
			}
			else{
				var daemonGroupData = angular.copy(newData);
				daemonGroupData.version = data.version[groupName];
				daemonGroupData.version.v = data.version.v;
				
				getSendDataFromServer($scope, ngDataApi, {
					method: 'post',
					routeName: '/dashboard/cd',
					data: {
						"config": daemonGroupData
					}
				}, function (error, response) {
					if (error) {
						overlayLoading.hide();
						$scope.displayAlert('danger', error.message);
					}
					else {
						counter++;
						if (counter === max) {
							return cb();
						}
						else{
							updateDaemonsGroupCD(version, counter, cb);
						}
					}
				});
			}
		}
	};

	$scope.getUpdates = function () {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/cd/updates',
			params: {
				"env": $scope.myEnv
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				parseMyResponse(response);
			}
		});


		function parseMyResponse(list) {
			$scope.imageLedger = [];
			$scope.catalogLedger = [];

			$scope.upgradeCount =0;

			list.forEach(function (oneEntry) {
				$scope.upgradeCount++;
				if($scope.myEnv.toLowerCase() === 'dashboard'){
					oneEntry.rms = true;
				}
				else if(oneEntry.labels && oneEntry.labels['soajs.content'] === 'true' && oneEntry.labels['soajs.service.name']){
					oneEntry.rms = true;
				}
				switch (oneEntry.mode) {
					case 'image':
						$scope.imageLedger.push(oneEntry);
						break;
					case 'rebuild':
						$scope.catalogLedger.push(oneEntry);
						break;
				}
			});
			if($scope.upgradeCount > 0){
				$scope.upgradeCount = "(" + $scope.upgradeCount + ")";
			}
			else{
				$scope.upgradeCount = null;
			}
		}
	};

	$scope.getLedger = function () {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/cd/ledger',
			params: {
				"env": $scope.myEnv
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				$scope.ledger = response;
				$scope.updateCount = 0;
				$scope.ledger.forEach(function(oneLedgerEntry){
					if(oneLedgerEntry.notify && !oneLedgerEntry.manual && !oneLedgerEntry.read){
						$scope.updateCount++;
					}
				});
				if($scope.updateCount > 0){
					$scope.updateCount = "(" + $scope.updateCount + ")";
				}
				else{
					$scope.updateCount = null;
				}
			}
		});
	};

	$scope.updateEntry = function (oneEntry, operation) {
		var formConfig = {
			entries: []
		};

		if (operation === 'redeploy') {
			doRebuild(null);
		}
		else {
			//testing/////////
			oneEntry.catalog = {
				"image": {},
				"envs": {}
			};
			//testing/////////
			if (oneEntry.catalog.image && oneEntry.catalog.image.override) {
				//append images
				formConfig.entries.push({
					'name': "ImagePrefix",
					'label': "Image Prefix",
					'type': 'text',
					'value': oneEntry.catalog.image.prefix,
					'fieldMsg': "Override the image prefix if you want"
				});

				formConfig.entries.push({
					'name': "ImageName",
					'label': "Image Name",
					'type': 'text',
					'value': oneEntry.catalog.image.name,
					'fieldMsg': "Override the image name if you want"
				});

				formConfig.entries.push({
					'name': "ImageTag",
					'label': "Image Tag",
					'type': 'text',
					'value': oneEntry.catalog.image.tag,
					'fieldMsg': "Override the image tag if you want"
				});
			}

			//append inputs whose type is userInput
			if (oneEntry.catalog.envs) {
				for (var envVariable in oneEntry.catalog.envs) {
					if (oneEntry.catalog.envs[envVariable].type === 'userInput') {

						var defaultValue = oneEntry.catalog.envs[envVariable].default || '';
						//todo: get value from service.env
						oneEntry.service.env.forEach(function (oneEnv) {
							if (oneEnv.indexOf(envVariable) !== -1) {
								defaultValue = oneEnv.split("=")[1];
							}
						});

						//push a new input for this variable
						var newInput = {
							'name': '_ci_' + envVariable,
							'label': oneEntry.catalog.envs[envVariable].label || envVariable,
							'type': 'text',
							'value': defaultValue,
							'fieldMsg': oneEntry.catalog.envs[envVariable].fieldMsg
						};

						if (!defaultValue || defaultValue === '') {
							newInput.required = true;
						}

						formConfig.entries.push(newInput);
					}
				}
			}

			if (formConfig.entries.length === 0) {
				doRebuild(null);
			}
			else {
				var options = {
					timeout: $timeout,
					form: formConfig,
					name: 'rebuildService',
					label: 'Rebuild Service',
					actions: [
						{
							'type': 'submit',
							'label': translation.submit[LANG],
							'btn': 'primary',
							'action': function (formData) {
								doRebuild(formData);
							}
						},
						{
							'type': 'reset',
							'label': translation.cancel[LANG],
							'btn': 'danger',
							'action': function () {
								$scope.modalInstance.dismiss('cancel');
								$scope.form.formData = {};
							}
						}
					]
				};
				buildFormWithModal($scope, $modal, options);
			}
		}

		function doRebuild(formData) {
			var params;
			if(operation === 'redeploy'){
				params = {
					data:{
						id: oneEntry._id.toString(),
						action: operation
					}
				}
			}
			else if (operation === 'rebuild') {
				params = {
					data:{
						env: $scope.myEnv.toUpperCase(),
						serviceId: oneEntry.id || oneEntry.serviceId,
						serviceName: oneEntry.labels['soajs.service.name'],
						serviceVersion: oneEntry.labels['soajs.service.version'] || null,
						mode: (oneEntry.labels && oneEntry.labels['soajs.service.mode']) ? oneEntry.labels['soajs.service.mode'] : oneEntry.mode,
						action: operation
					}
				};

				if (formData && Object.keys(formData).length > 0) {
					//inject user input catalog entry and image override
					params.custom = {
						image: {
							name: formData['ImageName'],
							prefix: formData['ImagePrefix'],
							tag: formData['ImageTag']
						}
					};

					for (var input in formData) {
						if (input.indexOf('_ci_') !== -1) {
							if (!params.custom.env) {
								params.custom.env = {};
							}
							params.custom.env[input.replace('_ci_', '')] = formData[input];
						}
					}
				}
			}
			else if (operation === 'deploy') {
				params = {
					data: {
						env: oneEntry.env,
						serviceName: oneEntry.serviceName,
						id: oneEntry._id.toString(),
						action: operation
					},
					deployOptions: oneEntry.deployOptions
				};

				if (oneEntry.serviceVersion) {
					params.data.serviceVersion = oneEntry.serviceVersion;
				}

				if (formData && Object.keys(formData).length > 0) {
					//inject user input catalog entry and image override
					if (!params.deployOptions.custom) {
						params.deployOptions.custom = {};
					}

					params.deployOptions.custom.image = {
						name: formData['ImageName'],
						prefix: formData['ImagePrefix'],
						tag: formData['ImageTag']
					};

					for (var input in formData) {
						if (input.indexOf('_ci_') !== -1) {
							if (!params.deployOptions.custom.env) {
								params.deployOptions.custom.env = {};
							}
							params.deployOptions.custom.env[input.replace('_ci_', '')] = formData[input];
						}
					}
				}
			}

			overlayLoading.show();
			getSendDataFromServer($scope, ngDataApi, {
				method: 'put',
				routeName: '/dashboard/cd/action',
				data: params
			}, function (error, response) {
				overlayLoading.hide();
				if (error) {
					$scope.displayAlert('danger', error.message);
				}
				else {
					$scope.displayAlert('success', 'Service operation [' + operation + '] was successful');

					if(operation === 'redeploy' || operation === 'deploy'){
						$scope.getLedger();
					}
					else{
						$scope.getUpdates();
					}
					overlayLoading.hide();
					if($scope.modalInstance){
						$scope.modalInstance.dismiss();
					}
				}
			});
		}
	};

	$scope.deployEntry = function (oneEntry) {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'post',
			routeName: '/dashboard/cd/action',
			data: oneEntry.deployOptions || {}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				$scope.displayAlert('success', 'Service deployed successfully');

				if(operation === 'redeploy'){
					$scope.getLedger();
				}
				else{
					$scope.getUpdates();
				}
			}
		});
	};

	$scope.readAll = function () {
        overlayLoading.show();
        getSendDataFromServer($scope, ngDataApi, {
            method: 'put',
            routeName: '/dashboard/cd/ledger/read',
            data: {
            	"data": {"all": true}
            }

        }, function (error, response) {
            overlayLoading.hide();
            if (error) {
                $scope.displayAlert('danger', error.message);
            }
            else {
                $scope.displayAlert('success', 'All entries updated');
                $scope.getLedger();
            }
        });
	};

    $scope.readOne = function (oneEntry) {
        overlayLoading.show();
        getSendDataFromServer($scope, ngDataApi, {
            method: 'put',
            routeName: '/dashboard/cd/ledger/read',
            data: {
            	"data": {"id": oneEntry._id}
            }

        }, function (error, response) {
            overlayLoading.hide();
            if (error) {
                $scope.displayAlert('danger', error.message);
            }
            else {
                $scope.displayAlert('success', 'Entry updated');
	            $scope.getLedger();
            }
        });
    };

	injectFiles.injectCss("modules/dashboard/cd/cd.css");

	// Start here
	if ($scope.access.get) {
		$scope.getLedger();
		$scope.getUpdates();
	}
}]);
