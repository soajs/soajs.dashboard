'use strict';

var cdApp = soajsApp.components;
cdApp.controller ('cdAppCtrl', ['$scope', '$timeout', '$modal', '$cookies', 'ngDataApi', 'injectFiles', function ($scope, $timeout, $modal, $cookies, ngDataApi, injectFiles) {
    $scope.$parent.isUserLoggedIn();

    $scope.access = {};
    constructModulePermissions($scope, $scope.access, cdAppConfig.permissions);
	
	$scope.cdData = {};
	$scope.myEnv = $cookies.getObject('myEnv').code;
	
    $scope.getRecipe = function () {
	    var formConfig = angular.copy(cdAppConfig.form);
    	
	    overlayLoading.show();
	    getSendDataFromServer($scope, ngDataApi, {
		    method: 'get',
		    routeName: '/dashboard/cd'
	    }, function (error, response) {
		    overlayLoading.hide();
		    if (error) {
			    $scope.displayAlert('danger', error.message);
		    }
		    else {
		    	$scope.cdData = response;
				delete $scope.cdData._id;
				delete $scope.cdData.soajsauth;
				
			    var options = {
				    timeout: $timeout,
				    entries: formConfig.entries,
				    name: 'continuousDelivery',
				    label: 'Continuous Delivery',
				    data: {'cd': $scope.cdData[$scope.myEnv]},
				    actions: [
					    {
						    type: 'submit',
						    label: "Update Continuous Delivery Settings",
						    btn: 'primary',
						    action: function (formData) {
							    
								$scope.cdData[$scope.myEnv] = formData.cd;
							    var data = $scope.cdData;
							    
							    overlayLoading.show();
							    getSendDataFromServer($scope, ngDataApi, {
								    method: 'post',
								    routeName: '/dashboard/cd',
								    data: {
								    	"config": data
								    }
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
			    buildForm($scope, $modal, options);
		    }
	    });
    };
	
    injectFiles.injectCss("modules/dashboard/cd/cd.css");

    // Start here
    if ($scope.access.get) {
        $scope.getRecipe();
    }

}]);
