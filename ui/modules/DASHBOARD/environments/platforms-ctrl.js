"use strict";
var environmentsApp = soajsApp.components;
environmentsApp.controller('platformsCtrl', ['$scope', '$cookieStore', 'envPlatforms', 'injectFiles', function ($scope, $cookieStore, envPlatforms, injectFiles) {
    $scope.$parent.isUserLoggedIn();

    $scope.access = {};
    constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);

    $scope.platforms = [];

    $scope.deployer = {
        type: "",
        selected: ""
    };

    $scope.allowAddDriver = {};

    $scope.listPlatforms = function (envCode) {
        envPlatforms.listPlatforms($scope, envCode);
    };

    $scope.editDriverConfig = function (driver) {
        envPlatforms.editDriverConfig($scope, driver);
    };

    $scope.uploadCerts = function (driverName) {
        envPlatforms.uploadCerts($scope, driverName);
    };

    $scope.removeCert = function (certId, driverName) {
        envPlatforms.removeCert($scope, certId, driverName);
    };

    $scope.clearDriverConfig = function (driverName) {
        envPlatforms.clearDriverConfig ($scope, driverName);
    };

    $scope.selectDriver = function (driverName) {
        envPlatforms.selectDriver ($scope, driverName, $scope.deployer.type);
    };

    $scope.addDriver = function () {
        envPlatforms.addDriver($scope);
    };

    $scope.editDriver = function (driver) {
        envPlatforms.editDriver($scope, driver);
    };

    if ($scope.access.platforms.list) {
        $scope.envCode = $cookieStore.get("myEnv").code;
        injectFiles.injectCss("modules/DASHBOARD/environments/environments.css");
        $scope.listPlatforms($scope.envCode);
    }
}]);