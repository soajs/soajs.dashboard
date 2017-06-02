"use strict";
var contentBuilderApp = soajsApp.components;
contentBuilderApp.controller("contentBuilderCtrl", ['$scope', '$routeParams', '$location', '$localStorage', 'cbHelper', 'cbAPIHelper', 'cbInputHelper', function($scope, $routeParams, $location, $localStorage, cbHelper, cbAPIHelper, cbInputHelper) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, cbConfig.permissions);

	$scope.listServices = function() {
		cbHelper.listEntries($scope, cbConfig, function(data) {
			var groups = {};
			data.forEach(function(oneRecord) {
				if(!groups[oneRecord.name]) {
					groups[oneRecord.name] = [];
				}

				groups[oneRecord.name].push(oneRecord);
			});

			$scope.revisions = groups;
			$localStorage.cbSchema = null;
		});
	};

	/*
	 Prepare wizard
	 */
	$scope.prepareAddForm = function() {
		$scope.steps = [true, false, false, false];
		$scope.editMode = false;
		cbHelper.getEmptySchema($scope);
		//load the environments and show their databases
		cbHelper.getEnvironments($scope);

		if($localStorage.cbSchema) {
			$scope.config = $localStorage.cbSchema;
		}
	};

	$scope.prepareUpdateForm = function() {
		$scope.steps = [true, false, false, false];
		$scope.editMode = true;
		$localStorage.cbSchema = null;
		//get the content schema from the database
		cbHelper.loadExistingSchema($scope, $routeParams, function() {
			//load the environments and show their databases
			cbHelper.getEnvironments($scope, function() {

				if($localStorage.cbSchema) {
					$scope.config = $localStorage.cbSchema;
				}
			});
		});
	};

	$scope.purgeSchema = function() {
		$localStorage.cbSchema = null;
		$scope.$parent.go("/content-builder");
	};

	/*
	 navigation behavior
	 */
	$scope.goBack = function() {
		var currentStep = $scope.steps.indexOf(true);
		jQuery("#wizardStep" + (currentStep + 1)).hide();
		currentStep--;
		$scope.steps = [false, false, false, false];
		$scope.steps[currentStep] = true;
		jQuery("#wizardStep" + (currentStep + 1)).show();
		$scope['validateStep' + (currentStep + 1)](true);
	};

	$scope.goForward = function() {
		var currentStep = $scope.steps.indexOf(true);
		jQuery("#wizardStep" + (currentStep + 1)).hide();
		currentStep++;
		$scope.steps = [false, false, false, false];
		$scope.steps[currentStep] = true;
		jQuery("#wizardStep" + (currentStep + 1)).show();
		$scope.nextStep = false;
		$scope['validateStep' + (currentStep + 1)]();
	};

	/*
	 Step 1 functions
	 */
	$scope.renderServiceMultiTenant = function(multitenant) {
		if(multitenant) {
			$scope.config.dbtoUse = {};
		}
		else {
			$scope.config.clustertoUse = {};
		}
		$scope.config.genericService.config.extKeyRequired = multitenant;
		$scope.config.soajsService.db.multitenant = multitenant;
	};

	$scope.validateStep1 = function(force) {
		if(!$scope.config.name) {
			//show error, no service name given
			$scope.$parent.displayAlert('danger', translation.enterNameForYourService[LANG]);
		}

		if(Object.keys($scope.config.dbtoUse).length === 0 && Object.keys($scope.config.clustertoUse).length === 0) {
			$scope.$parent.displayAlert('danger', translation.pleaseChooseEitherNewExistingDatabaseEnvironment[LANG])
		}
		else {
			$scope.config.genericService.config.serviceName = $scope.config.name.toLowerCase().replace(/\s/g, "_");

			if(Object.keys($scope.config.dbtoUse).length !== 0) {

				for(var env in $scope.config.dbtoUse) {
					if($scope.config.dbtoUse.hasOwnProperty(env)) {
						var dbName = $scope.config.dbtoUse[env];
						$scope.config.soajsService.db.config[env] = {};

						for(var i = 0; i < $scope.envList.length; i++) {
							if($scope.envList[i].name === env) {
								$scope.config.soajsService.db.config[env][dbName] = $scope.envList[i].databases[dbName];
								break;
							}
						}
					}
				}
			}

			if(Object.keys($scope.config.clustertoUse).length !== 0) {
				var serviceName = $scope.config.genericService.config.serviceName;
				for(var env in $scope.config.clustertoUse) {
					if($scope.config.clustertoUse.hasOwnProperty(env)) {
						$scope.config.soajsService.db.config[env] = {};
						$scope.config.soajsService.db.config[env][serviceName] = $scope.config.clustertoUse[env];
					}
				}
			}

			$localStorage.cbSchema = $scope.config;
			if(!force) {
				$scope.goForward();
			}
		}
	};

	/*
	 Step 2 functions
	 */
	$scope.validateStep2 = function() {
		$scope.nextStep = (Object.keys($scope.config.genericService.config.schema.commonFields).length > 1) ? true : false;
	};

	$scope.addInput = function() {
		cbInputHelper.addInput($scope);
	};

    $scope.getInputType = function(requestedType, info, name){
        if(requestedType === 'fileUI'){
            if(name.limit!== undefined){
                if(info && info.genericService && info.genericService.config && info.genericService.config.schema && !info.genericService.config.schema.commonFields[name.name]){
                    return true;
                }
            }
        }

        else if(requestedType === 'computedUI'){
            if(!info.genericService.config.schema.commonFields[name]){
                var found = false;
                info.soajsUI.form.add.forEach(function(onefield){
                    if(onefield.name === name && !onefield.limit){
                        found = true;
                        return true;
                    }
                });
                if(!found){
                    return true;
                }
            }
        }
        return false;
    };

	$scope.updateInput = function(type, fieldName, fieldInfo) {
		cbInputHelper.editInput($scope, type, fieldName, fieldInfo);
	};

	$scope.removeInput = function(fieldName) {
		cbInputHelper.removeInput($scope, fieldName);
	};

	/*
	 Step 3 functions
	 */
	$scope.validateStep3 = function(force) {
		if(force === false) {
			var formData = $scope.form.formData;
			if(formData.errors && formData.collection && formData.servicePort) {
				try {
					for(var i in formData){
						if(Array.isArray(formData[i])){
							formData[i] = formData[i][0].toString();
						}
					}
					
					if(typeof(formData['errors']) === 'string'){
						formData['errors'] = JSON.parse(formData['errors']);
						if(Object.keys(formData.errors).length === 0){
							$scope.$parent.displayAlert('danger', translation.pleaseinsertErrorCode[LANG]);
							formData.errors = '{ }';
							return false;
						}
					}
					$scope.config.genericService.config.errors = formData['errors'];

					$scope.config.soajsService.db.collection = formData['collection'];

					$scope.config.genericService.config.servicePort = formData['servicePort'];
					$scope.config.genericService.config.requestTimeout = formData['requestTimeout'];
					$scope.config.genericService.config.requestTimeoutRenewal = formData['requestTimeoutRenewal'];

                    if(formData['maxFileUpload']) {
                        $scope.config.genericService.config.maxFileUpload = formData['maxFileUpload'];
                    }
					
					if(formData['extKeyRequired']) {
						$scope.config.genericService.config.extKeyRequired = (formData['extKeyRequired'] && formData['extKeyRequired'] === 'true');
					}
					if(formData['session']) {
						$scope.config.genericService.config.session = (formData['session'] && formData['session'] === 'true');
					}
					if(formData['oauth']) {
						$scope.config.genericService.config.oauth = (formData['oauth'] && formData['oauth'] === 'true');
					}
					if(formData['urac']) {
						$scope.config.genericService.config.urac = (formData['urac'] && formData['urac'] === 'true');
					}
					if(formData['urac_Profile']) {
						$scope.config.genericService.config.urac_Profile = (formData['urac_Profile'] && formData['urac_Profile'] === 'true');
					}
					if(formData['urac_ACL']) {
						$scope.config.genericService.config.urac_ACL = (formData['urac_ACL'] && formData['urac_ACL'] === 'true');
					}
					if(formData['provision_ACL']) {
						$scope.config.genericService.config.provision_ACL = (formData['provision_ACL'] && formData['provision_ACL'] === 'true');
					}

					$scope.goForward();
				}
				catch(e) {
					$scope.$parent.displayAlert('danger', translation.invalidErrorCodeFormatPleaseMakeJSONObject[LANG]);
					return false;
				}
			}
			else {
				$scope.$parent.displayAlert('danger', translation.pleaseFillOutMandatoryFields[LANG]);
				return false;
			}
		}

		$scope.populateSettingsForm();
		$scope.nextStep = (Object.keys($scope.config.genericService.config).length > 3);
	};

	$scope.populateSettingsForm = function() {
		cbHelper.populateSettingsForm($scope);
	};

	/*
	 Step 4 functions
	 */
	$scope.validateStep4 = function() {
		$scope.generateSchema = (Object.keys($scope.config.soajsService.apis).length > 0);
	};

	$scope.addAPI = function() {
		cbAPIHelper.addAPI($scope, cbAPIHelper.colorInputs);
	};

	$scope.editAPI = function(apiName, apiInfo) {
		cbAPIHelper.editAPI($scope, apiName, apiInfo, cbAPIHelper.colorInputs);
	};

	$scope.removeAPI = function(apiName) {
		cbAPIHelper.removeAPI($scope, apiName);
	};

	$scope.saveService = function() {
		cbHelper.saveContentSchema($scope, function() {
			$localStorage.cbSchema = null;
		});
	};

	$scope.updateService = function() {
		cbHelper.updateContentSchema($scope, $routeParams.id, function() {
			$localStorage.cbSchema = null;
		});
	};

	if($location.path() === '/content-builder' && $scope.access.listServices) {
		$scope.listServices();
	}
	else if($location.path() === '/content-builder/add' && $scope.access.addService) {
		$scope.nextStep = false;
		$scope.generateSchema = false;
		$scope.prepareAddForm();
	}
	else if($routeParams.id && ($location.path() === '/content-builder/edit/' + $routeParams.id) && $scope.access.updateService) {
		$scope.nextStep = false;
		$scope.generateSchema = false;
		$scope.prepareUpdateForm();
	}
	else {
		$scope.$parent.displayAlert('danger', translation.youDontHaveAccessRequestedSection[LANG]);
		$scope.$parent.go("/content-builder");
	}

}]);

contentBuilderApp.controller("contentBuilderActiveCtrl", ['$scope', 'cbHelper', function($scope, cbHelper) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, cbConfig.permissions);

	$scope.listServices = function() {
		cbHelper.listEntries($scope, cbConfig);
	};

	$scope.viewService = function(data) {
		cbHelper.viewEntry($scope, {"id": data._id});
	};

	$scope.editService = function(data) {
		$scope.$parent.go("/content-builder/edit/" + data._id);
	};

	if($scope.access.listServices) {
		$scope.listServices();
	}
}]);

contentBuilderApp.controller("contentBuilderRevisionsCtrl", ['$scope', 'cbHelper', function($scope, cbHelper) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, cbConfig.permissions);

	$scope.assingRevisionsToGrid = function(versionsRecords) {
		$scope.rows = versionsRecords;
		cbHelper.printEntries($scope, $scope.rows, cbConfig.grid.revisions, true);
	};

	$scope.viewService = function(data) {
		cbHelper.viewEntry($scope, {"id": data.refId.toString(), "version": data.v});
	};
}]);
