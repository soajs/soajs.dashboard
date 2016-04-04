"use strict";

var staticContentApp = soajsApp.components;
staticContentApp.controller ('staticContentCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', 'injectFiles', function ($scope, $timeout, $modal, ngDataApi, injectFiles) {
    $scope.$parent.isUserLoggedIn();

    $scope.access = {};
    constructModulePermissions($scope, $scope.access, staticContentConfig.permissions);

    $scope.listSources = function () {
        getSendDataFromServer($scope, ngDataApi, {
            'method': 'send',
            'routeName': '/dashboard/staticContent/list'
        }, function (error, response) {
            if (error) {
                $scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
            } else {
                $scope.staticContentList = response;
            }
        });
    };

    injectFiles.injectCss("modules/DASHBOARD/staticContent/staticContent.css");
    if ($scope.access.list) {
        $scope.listSources();
    }
}]);