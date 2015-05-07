"use strict";
var servicesConfig = {
	permissions:{
		'listServices': ['dashboard', '/services/list']
	}
};

var servicesApp = soajsApp.components;
servicesApp.controller('servicesCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', function($scope, $timeout, $modal, ngDataApi) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, servicesConfig.permissions);

	$scope.listServices = function() {
		getSendDataFromServer(ngDataApi, {
			"method": "send",
			"routeName": "/dashboard/services/list"
		}, function(error, response) {
			if(error) {
				$scope.$parent.displayAlert('danger', error.message);
			}
			else {
				var l = response.length;
				for(var x=0; x<l; x++)
				{
					if(response[x].apis){
						response[x].fixList = $scope.arrGroupByField( response[x].apis , 'group');
					}
				}
				$scope.grid = {
					rows: response
				};
			}
		});
	};

	$scope.arrGroupByField = function(arr, f) {
		var result = {} ;
		var l = arr.length;
		var g = 'General' ;
		for(var i=0; i<l; i++)
		{
			if(arr[i][f])
			{
				g = arr[i][f];
			}
			if(!result[g])
			{
				result[g]={};
				result[g].apis=[];
			}
			if(arr[i].groupMain === true ){
				result[g]['defaultApi'] =arr[i].v;
			}
			result[g].apis.push(arr[i]);
		}

		var label;
		for(label in result ){
			if(result[label].apis)
			{
				var v =	result[label].apis.length/2;
				var c= Math.ceil(v);
				result[label].apis1 = result[label].apis.slice(0,c);
				result[label].apis2 = result[label].apis.slice(c,l);
			}
		}
		return result;
	};
	if($scope.access.listServices){
		$scope.listServices();
	}

}]);