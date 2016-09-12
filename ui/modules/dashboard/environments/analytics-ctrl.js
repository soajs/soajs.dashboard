"use strict";

var environmentsApp = soajsApp.components;
environmentsApp.controller('analyticsCtrl', ['$scope', '$cookies', '$timeout', 'ngDataApi', 'injectFiles', function ($scope, $cookies, $timeout, ngDataApi, injectFiles) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);

    $scope.analytics = {
        activated: false
    };

    $scope.checkAnalytics = function () {
        getSendDataFromServer($scope, ngDataApi, {
            method: 'get',
            routeName: '/dashboard/analytics/check',
            params: {
                'env': $scope.envCode
            }
        }, function (error, response) {
            if (error) {
                $scope.displayAlert('danger', error.message);
            }
            else {
                $scope.analytics.activated = response.data;
            }
        });
    };

    $scope.activateAnalytics = function () {
        getSendDataFromServer($scope, ngDataApi, {
            method: 'send',
            routeName: '/dashboard/analytics/activate',
            data: {
                'env': $scope.envCode
            }
        }, function (error, response) {
            if (error) {
                $scope.displayAlert('danger', error.message);
            }
            else {
                $scope.analytics.activated = true;
                $scope.displayAlert('success', 'Analytics for ' + $scope.envCode + ' has been activated');
            }
        });
    };

	// if ($scope.access.listNodes) {
		injectFiles.injectCss('modules/dashboard/environments/environments.css');
		$scope.envCode = $cookies.getObject("myEnv").code;

		$scope.checkAnalytics();
	// }
}]);
