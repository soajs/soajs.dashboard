"use strict";
var servicesApp = soajsApp.components;
servicesApp.controller('servicesCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', function($scope, $timeout, $modal, ngDataApi) {
	$scope.$parent.isUserLoggedIn();

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
				console.log(response);
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
		return result;
	};

	$scope.listServices();
}]);