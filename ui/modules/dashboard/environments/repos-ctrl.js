"use strict";

var environmentsApp = soajsApp.components;

environmentsApp.controller('deployReposCtrl', ['$scope', '$cookies', 'injectFiles', 'deployRepos', function ($scope, $cookies, injectFiles, deployRepos) {
	$scope.$parent.isUserLoggedIn();

	$scope.defaultPageNumber = 1;
    $scope.defaultPerPage = 100;
	$scope.imagePath = './themes/' + themeToUse + '/img/loading.gif';

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);
	$scope.$parent.rerenderMenuAfterEnvExclude(environmentsNav);

	$scope.showHide = function (account) {
		if (!account.hide) {
			jQuery('#a_' + account._id + " .body .inner").slideUp();
			account.icon = 'plus';
			account.hide = true;
		}
		else {
			jQuery('#a_' + account._id + " .body .inner").slideDown();
			account.icon = 'minus';
			account.hide = false;
		}
	};

	$scope.listGitAccounts = function (cb) {
		deployRepos.listGitAccounts($scope, cb);
	};

	$scope.listRepos = function (account, action) {
		deployRepos.listRepos($scope, account, action);
	};

	$scope.getCdData = function () {
		deployRepos.getCdData($scope);
	};

	$scope.getDeployedServices = function () {
		deployRepos.getDeployedServices($scope);
	};

	$scope.configureCD = function (repo) {
		deployRepos.configureCD($scope, repo);
	};

	injectFiles.injectCss("modules/dashboard/environments/environments.css");
	//default operation
	if ($scope.access.git.listAccounts) {
		$scope.envCode = $cookies.getObject("myEnv").code;
		$scope.listGitAccounts(function () {
			$scope.getCdData();
			$scope.getDeployedServices();
		});
	}
}]);
