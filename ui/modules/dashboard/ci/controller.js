'use strict';

var ciApp = soajsApp.components;
ciApp.controller('ciAppCtrl', ['$scope', '$timeout', '$modal', '$cookies', 'ngDataApi', 'injectFiles', function ($scope, $timeout, $modal, $cookies, ngDataApi, injectFiles) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, ciAppConfig.permissions);

	$scope.ciData = {};

	$scope.images = {
		travis: "./themes/" + themeToUse + "/img/travis_logo.png",
		drone: "./themes/" + themeToUse + "/img/drone_logo.png",
		jenkins: "./themes/" + themeToUse + "/img/jenkins_logo.png",
		teamcity: "./themes/" + themeToUse + "/img/teamcity_logo.png"
	};
	
	$scope.unsupported = ['jenkins', 'teamcity'];
	
	$scope.listAccounts = function () {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			'method': 'get',
			'routeName': '/dashboard/ci'
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.accounts = [];
				var processed = [];
				response.forEach(function(oneEntry){
					if(processed.indexOf(oneEntry.owner) === -1){
						var oneAccount = {
							owner: oneEntry.owner,
							hide: true,
							icon: 'plus',
							providers: []
						};
						
						response.forEach(function(oneEntryAgain){
							if(oneEntryAgain.owner === oneAccount.owner){
								oneEntryAgain.icon = $scope.images[oneEntryAgain.provider];
								oneEntryAgain.locked = ($scope.unsupported.indexOf(oneEntryAgain.provider) !== -1);
								oneAccount.providers.push(oneEntryAgain);
							}
						});
						
						$scope.accounts.push(oneAccount);
						processed.push(oneEntry.owner);
					}
				});
				
				$scope.accounts.forEach(function(oneAccount){
					var logos = angular.copy($scope.images);
					oneAccount.providers.forEach(function(oneProvider){
						if(logos[oneProvider.provider]){
							delete logos[oneProvider.provider];
						}
					});
					for(var logo in logos){
						var nEntry = {
							provider: logo,
							icon: logos[logo]
						};
						nEntry.locked = ($scope.unsupported.indexOf(logo) !== -1);
						
						oneAccount.providers.push(nEntry);
					}
				});
				
				if($scope.accounts.length === 1){
					$scope.accounts[0].hide = false;
					$scope.accounts[0].icon = 'minus';
				}
			}
		});
	};
	
	$scope.deactivateAccount = function(provider){
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			'method': 'put',
			'routeName': '/dashboard/ci/provider',
			'data':{
				'owner': provider.owner,
				'provider': provider.provider
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.displayAlert('success', "Provider has been deactivated");
			}
		});
	};
	
	$scope.activateAccount = function(provider){
		
	};
	
	$scope.updateAccount = function(provider){
		
	};
	
	$scope.showHide = function (account) {
		if (!account.hide) {
			jQuery('#a_' + account.owner + " .body .inner").slideUp();
			account.icon = 'plus';
			account.hide = true;
		}
		else {
			jQuery('#a_' + account.owner + " .body .inner").slideDown();
			account.icon = 'minus';
			account.hide = false;
		}
	};
	
	injectFiles.injectCss("modules/dashboard/ci/ci.css");

	//start here
	if ($scope.access.get) {
		$scope.listAccounts();
	}

}]);
