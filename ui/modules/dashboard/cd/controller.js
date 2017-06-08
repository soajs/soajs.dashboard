'use strict';

var cdApp = soajsApp.components;
cdApp.controller('cdAppCtrl', ['$scope', '$timeout', '$modal', '$cookies', 'ngDataApi', 'injectFiles', function ($scope, $timeout, $modal, $cookies, ngDataApi, injectFiles) {
	$scope.$parent.isUserLoggedIn();
	$scope.configuration={};
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, cdAppConfig.permissions);
	
	$scope.cdData = {};
	$scope.myEnv = $cookies.getObject('myEnv').code;
	$scope.upgradeSpaceLink = cdAppConfig.upgradeSpaceLink;
	$scope.updateCount;
	$scope.upgradeCount;
	
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
			
			if(response[$scope.myEnv.toUpperCase()]){
				$scope.configuration = response[$scope.myEnv.toUpperCase()];
			}
		});
	};
	
	$scope.saveRecipe = function() {
		// var configuration={};
		// configuration.branch = $scope.configuration.branch;
		// configuration.strategy = $scope.configuration.strategy;
		//
		// for(var key in $scope.configuration){
		// 	if( key!== 'branch' && key !== 'strategy'){
		// 		if($scope.configuration[key].include){
		// 			configuration[key] = {
		// 				branch: $scope.configuration[key].branch,
		// 				strategy: $scope.configuration[key].strategy
		// 			};
		// 			for(var str in $scope.configuration[key]){
		// 				if( str!== 'branch' && str !== 'strategy' && str !== 'include'){
		// 					if($scope.configuration[key][str].include){
		// 						configuration[key][str] = {
		// 							branch:$scope.configuration[key][str].branch,
		// 							strategy:$scope.configuration[key][str].strategy
		// 						};
		// 					}
		// 				}
		// 			}
		// 		}
		// 	}
		// }
		// $scope.cdData['DASHBOARD'] = {
		// 	"branch": "master",
		// 	"strategy": "notify"
		// };
		// $scope.cdData[$scope.myEnv] = configuration;
		// var data = $scope.cdData;
		// delete data.type;
		// delete data.soajsauth;
		// overlayLoading.show();
		// getSendDataFromServer($scope, ngDataApi, {
		// 	method: 'post',
		// 	routeName: '/dashboard/cd',
		// 	data: {
		// 		"config": data
		// 	}
		// }, function (error, response) {
		// 	overlayLoading.hide();
		// 	if (error) {
		// 		$scope.displayAlert('danger', error.message);
		// 	}
		// 	else {
		// 		$scope.displayAlert('success', 'Recipe Saved successfully');
		// 		$scope.getRecipe();
		// 	}
		// });
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
					if(SOAJSRMS.indexOf(oneEntry.labels['soajs.service.name'].toLowerCase()) !== -1){
						oneEntry.rms = true;
					}
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
					if(oneLedgerEntry.notify && !oneLedgerEntry.manual){
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
						id: oneEntry._id.toString()
					}
				}
			}
			else{
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
					$scope.displayAlert('success', 'Service rebuilt successfully');
					
					if(operation === 'redeploy'){
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
