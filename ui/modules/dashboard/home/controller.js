"use strict";
var dahsboardApp = soajsApp.components;
dahsboardApp.controller('dahsboardCtrl', ['$scope', '$timeout', 'injectFiles', function ($scope, $timeout, injectFiles) {
	$scope.$parent.isUserLoggedIn();
	injectFiles.injectCss('modules/dashboard/home/home.css');
	
	
	(function(){
		
		var counter = 1;
		var max = 4;
		
		jQuery("ul.slider li.p" + counter).css('display', 'block');
		$timeout(function(){
			showPillar();
		}, 7000);
		
		function showPillar(){
			jQuery("ul.slider li.p" + counter).fadeOut('slow', function(){
				counter ++;
				if(counter > max){
					counter = 1;
				}
				jQuery("ul.slider li.p" + counter).fadeIn('slow', function(){
					$timeout(function(){
						showPillar();
					}, 15000);
				});
			});
		}
	})();
}]);

dahsboardApp.controller('helpPageCtrl', ['$scope', function ($scope) {
	$scope.$parent.isUserLoggedIn(true);
}]);

dahsboardApp.controller('noEnvCtrl', ['$scope', 'injectFiles', function ($scope, injectFiles) {
	$scope.$parent.isUserLoggedIn();
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, configDashbrd.permissions);
	
	$scope.gotoEnv = function () {
		$scope.$parent.go("#/environments");
	};
	$scope.$parent.reRenderMenu('deployment');
	injectFiles.injectCss('modules/dashboard/home/home.css');
}]);