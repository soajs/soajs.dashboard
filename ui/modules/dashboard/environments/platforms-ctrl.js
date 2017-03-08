"use strict";
var environmentsApp = soajsApp.components;
environmentsApp.controller('platformsCtrl', ['$scope', '$cookies', 'envPlatforms', 'injectFiles', function ($scope, $cookies, envPlatforms, injectFiles) {
    $scope.$parent.isUserLoggedIn();

    $scope.access = {};
    constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);

    $scope.platforms = [];

    $scope.dockerImagePath = "./themes/" + themeToUse + "/img/docker_logo.png";
    $scope.kubernetesImagePath = "./themes/" + themeToUse + "/img/kubernetes_logo.png";
    $scope.nginxImagePath = "./themes/" + themeToUse + "/img/nginx_logo.png";

    $scope.deployer = {
        type: "",
        platform: "",
        selected: ""
    };

    $scope.allowSelect = $scope.deployer.type === 'container';

    $scope.jsoneditorConfig = environmentsConfig.jsoneditorConfig;
    $scope.jsoneditorConfig.onLoad = function (instance) {
        if (instance.mode === 'code') {
            instance.setMode('code');
        }
        else {
            instance.set();
        }

        instance.editor.getSession().on('change', function () {
            try {
                instance.get();
                $scope.jsoneditorConfig.jsonIsValid = true;
            }
            catch (e) {
                $scope.jsoneditorConfig.jsonIsValid = false;
            }
        });
    };

    $scope.listPlatforms = function (envCode) {
        envPlatforms.listPlatforms($scope, envCode);
    };

    $scope.editDriverConfig = function (driver) {
        envPlatforms.editDriverConfig($scope, driver);
    };

    $scope.uploadCerts = function (platform, driverName) {
        envPlatforms.uploadCerts($scope, platform, driverName);
    };

    $scope.removeCert = function (certId, platform, driverName) {
        envPlatforms.removeCert($scope, certId, platform, driverName);
    };

    $scope.selectDriver = function (platform, driverName) {
        envPlatforms.selectDriver ($scope, platform, driverName, $scope.deployer.type);
    };

    $scope.changeDeployerType = function () {
        envPlatforms.changeDeployerType ($scope);
    };

    $scope.updateNamespaceConfig = function (driver) {
        envPlatforms.updateNamespaceConfig($scope, driver);
    }

    if ($scope.access.platforms.list) {
        $scope.envCode = $cookies.getObject("myEnv").code;
        injectFiles.injectCss("modules/dashboard/environments/environments.css");
        $scope.listPlatforms($scope.envCode);
    }
}]);
