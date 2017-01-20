"use strict";
var swaggerEditorApp = soajsApp.components;

swaggerEditorApp.controller('swaggerEditorCtrl', ['$scope', '$timeout', 'injectFiles', 'swaggerEditorSrv', 'swaggerParser', function ($scope, $timeout, injectFiles, swaggerEditorSrv, swaggerParser) {
	$scope.$parent.isUserLoggedIn();
	$scope.access = {};
	$scope.schemaCode = '';
	$scope.schemaCodeF = '';
	
	constructModulePermissions($scope, $scope.access, swaggerEditorConfig.permissions);
	
	$scope.buildEditorForm = function(){
		swaggerEditorSrv.buildSwaggerForm($scope);
	};
	
	$scope.moveYamlRight = function(){
		$scope.schemaCodeF = $scope.schemaCode;
		watchSwaggerSimulator();
	};
	
	$scope.aceLoaded = function(_editor){
		$scope.editor = _editor;
		_editor.setShowPrintMargin(false);
	};
	
	$scope.updateScopeValue = function(){
		$scope.schemaCode = $scope.editor.getValue();
	};
	
	/*
	 * This function updates the host value of the swagger simulator
	 */
	function watchSwaggerSimulator() {
		//grab the swagger info
		var x = swaggerParser.fetch();
		if (!x || x.length === 0) {
			$timeout(function () {
				watchSwaggerSimulator();
			}, 100);
		}
		else {
			var dashboardDomain = apiConfiguration.domain.replace(window.location.protocol+"//", "");
			//modify the host value with the domain value of dashboard taken dynamically from the main config.js
			x[3].host = dashboardDomain;
			x[3].info.host = dashboardDomain;
			x[3].basePath = "/dashboard/swagger/simulate";
			x[3].info.basePath = "/dashboard/swagger/simulate";

			console.log("switching to host and basepath to swagger simulate api in dashboard:", x[3].host + x[3].basePath);
			//apply the changes
			swaggerParser.execute.apply(null, x);
		}
	}
	
	$scope.GenerateService = function(){
		if($scope.access.generate){
			
		}
	};
	$scope.TestValidApi = function() {
		
	};
	
	if($scope.access.generate){
		//show the form
		$scope.buildEditorForm();
	}
	
	injectFiles.injectCss("modules/dashboard/swaggerEditor/swaggerEditor.css");
}]);