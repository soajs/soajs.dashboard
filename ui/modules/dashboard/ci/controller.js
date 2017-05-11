'use strict';

var ciApp = soajsApp.components;
ciApp.controller ('ciAppCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', 'injectFiles', function ($scope, $timeout, $modal, ngDataApi, injectFiles) {
    $scope.$parent.isUserLoggedIn();

    $scope.access = {};
    constructModulePermissions($scope, $scope.access, ciAppConfig.permissions);
	
	$scope.ciData = {};
	
    $scope.getRecipe = function () {
	    var formConfig = angular.copy(ciAppConfig.form.f1);
    	
	    // overlayLoading.show();
	    // getSendDataFromServer($scope, ngDataApi, {
		 //    method: 'get',
		 //    routeName: '/dashboard/ci/get'
	    // }, function (error, response) {
		 //    overlayLoading.hide();
		 //    if (error) {
			//     $scope.form.displayAlert('danger', error.message);
		 //    }
		 //    else {
		 //    	$scope.ciData = response;
			    if($scope.ciData.settings){
				    formConfig = angular.copy(ciAppConfig.form.f2);
			    }
		
			    console.log(formConfig);
			    
			    var options = {
				    timeout: $timeout,
				    form: formConfig,
				    name: 'continuousIntegration',
				    label: 'Continuous Integration',
				    actions: [
					    {
						    type: 'submit',
						    label: 'Submit',
						    btn: 'primary',
						    action: function (formData) {
							    overlayLoading.show();
							    getSendDataFromServer($scope, ngDataApi, {
								    method: 'post',
								    routeName: '/dashboard/ci',
								    data: formData
							    }, function (error, response) {
								    overlayLoading.hide();
								    if (error) {
									    $scope.form.displayAlert('danger', error.message);
								    }
								    else {
									    $scope.form.displayAlert('success', 'Recipe Saved successfully');
									    $scope.modalInstance.close();
									    $scope.form.formData = {};
									    $scope.getRecipe();
								    }
							    });
						    }
					    }
				    ]
			    };
			
			    buildForm($scope, $modal, options, function(){
			    	
			    });
		 //    }
	    // });
    };

    $scope.deleteRecipe = function (recipe) {
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
    
    injectFiles.injectCss("modules/dashboard/ci/ci.css");

    // Start here
    if ($scope.access.get) {
        $scope.getRecipe();
    }

}]);
