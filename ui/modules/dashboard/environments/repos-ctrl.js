"use strict";

var environmentsApp = soajsApp.components;

environmentsApp.controller('deployReposCtrl', ['$scope', '$cookies', 'injectFiles', 'deployRepos', function ($scope, $cookies, injectFiles, deployRepos) {
	$scope.$parent.isUserLoggedIn();

	$scope.defaultPageNumber = 1;
    $scope.defaultPerPage = 100;
	$scope.imagePath = './themes/' + themeToUse + '/img/loading.gif';

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);

	$scope.listGitAccounts = function () {
		deployRepos.listGitAccounts($scope);
	};

	$scope.listRepos = function (account, action) {
		deployRepos.listRepos($scope, account, action);
	};

	injectFiles.injectCss("modules/dashboard/environments/environments.css");
	//default operation
	if ($scope.access.git.listAccounts) {
		$scope.envCode = $cookies.getObject("myEnv").code;
		$scope.listGitAccounts();
	}
}]);
