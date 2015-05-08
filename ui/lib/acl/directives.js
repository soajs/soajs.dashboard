soajsApp.directive('tenantAppAclform', ['ngDataApi', '$routeParams', function(ngDataApi, $routeParams) {
	return {
		restrict: 'E',
		templateUrl: 'lib/acl/tenAppAcl.tmpl',
		controllerAs : 'myACL',
		controller: function($scope){

			$scope.isInherited=false;
			$scope.allServiceApis=[];
			$scope.currentApplication = {};
			$scope.allGroups=[];
			$scope.aclPriviledges={};
			$scope.aclPriviledges.services={};
			$scope.parentPackage={};

			$scope.minimize =function(service){
				$scope.aclPriviledges.services[service.name].collapse = true;
			};

			$scope.expand =function(service){
				$scope.aclPriviledges.services[service.name].collapse = false;
			};

			$scope.selectService = function( service) {
				if( $scope.aclPriviledges.services[ service.name].include){
					if( service.forceRestricted ){
						$scope.aclPriviledges.services[ service.name].apisRestrictPermission = true;
					}
				}
				if( $scope.aclPriviledges.services[service.name]['include'])
				{
					$scope.aclPriviledges.services[service.name].collapse = false;
				}
				else{
					$scope.aclPriviledges.services[service.name].collapse = true;
				}
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

			$scope.getApplicationInfo = function() {
				var tId=  $routeParams.tId;
				var appId=  $routeParams.appId;
				// get tenant application info
				getSendDataFromServer(ngDataApi, {
					"method": "get",
					"routeName": "/dashboard/tenant/application/list",
					"params": { "id": tId }
				}, function (error, response) {
					if (error) {
						$scope.$parent.displayAlert('danger', error.message);
					}
					else {
						var l = response.length;
						for (var x = 0; x<l; x++)
						{
							if(response[x].appId === appId)
							{
								$scope.currentApplication = response[x];
								if( $scope.currentApplication._TTL.toString().length >3){
									$scope.currentApplication._TTL = ($scope.currentApplication._TTL / 3600000).toString();
								}
								break;
							}
						}
						// get product info
						getSendDataFromServer(ngDataApi, {
							"method": "get",
							"routeName": "/dashboard/product/packages/get",
							"params": {"productCode": $scope.currentApplication.product , "packageCode": $scope.currentApplication.package}

						}, function (error, response) {
							if (error) {
								$scope.$parent.displayAlert('danger', error.message);
							}
							else {
								$scope.parentPackage = response;
								$scope.currentApplication.parentPckgAcl = $scope.parentPackage.acl;

								var parentAcl = $scope.currentApplication.parentPckgAcl;
								var serviceNames= [];
								for (var serviceName in parentAcl){
									if(parentAcl.hasOwnProperty(serviceName)){
										serviceNames.push(serviceName);
									}
								}

								getSendDataFromServer(ngDataApi, {
									"method": "send",
									"routeName": "/dashboard/services/list",
									"data": { "serviceNames": serviceNames }
								}, function (error, response) {
									if (error) {
										$scope.$parent.displayAlert('danger', error.message);
									}
									else {
										var servicesList = response;

										var l = servicesList.length;
										for(var x=0; x<l; x++)
										{
											var service = servicesList[x];
											var name = service.name;
											var newList;
											if( parentAcl[name].apisPermission === 'restricted')
											{
												console.log(' forceRestricted ');
												newList = [];
												service.forceRestricted=true;

												var len = service.apis.length;
												for(var i=0; i<len; i++)
												{
													var v = service.apis[i].v ;
													if( parentAcl[name].apis){
														if( parentAcl[name].apis[v])
														{
															newList.push(service.apis[i]);
														}
													}
												}
												console.log(service);
												service.fixList = $scope.arrGroupByField( newList , 'group');
											}
											else{
												newList = service.apis ;
												service.fixList = $scope.arrGroupByField( service.apis , 'group');
											}
										}
										$scope.allServiceApis = servicesList;

										// get groups list
										getSendDataFromServer(ngDataApi, {
											"method": "get",
											"routeName": "/urac/admin/group/list"
										}, function(error, response) {
											if(error) {
												$scope.$parent.displayAlert("danger", error.message);
											}
											else {
												response.forEach(function( grpObj ) {
													$scope.allGroups.push(grpObj.code);
												});
												$scope.fillFormServices();
											}
										});

									}
								});


							}
						});
					}
				});
			};

			$scope.fillFormServices = function() {
				if( $scope.currentApplication.acl)
				{
					$scope.aclPriviledges.services= angular.copy($scope.currentApplication.acl);
				}
				else
				{
					$scope.isInherited = true;
					$scope.aclPriviledges.services= angular.copy($scope.currentApplication.parentPckgAcl);
				}

				prepareViewAclObj($scope, $scope.aclPriviledges);

			};

			$scope.checkForGroupDefault=function(service,grp,val,myApi) {
				var defaultApi = service.fixList[grp]['defaultApi'];
				if(myApi.groupMain===true){
					if( $scope.aclPriviledges.services[service.name].apis ) {
						if (($scope.aclPriviledges.services[service.name].apis[defaultApi]) && $scope.aclPriviledges.services[service.name].apis[defaultApi].include !== true) {
							val.apis.forEach(function( one ) {
								if($scope.aclPriviledges.services[service.name].apis[one.v])
								{
									$scope.aclPriviledges.services[service.name].apis[one.v].include=false;
								}
							});

						}
					}
				}
			};

			$scope.applyRestriction=function(service){
				if( $scope.aclPriviledges.services[service.name].apisRestrictPermission===true ){
					var grpLabel;
					for(grpLabel in service.fixList )
					{
						if( service.fixList.hasOwnProperty( grpLabel )) {
							var defaultApi = service.fixList[grpLabel]['defaultApi'];
							if(defaultApi) {
								if($scope.aclPriviledges.services[service.name].apis) {
									var apisList = service.fixList[grpLabel]['apis'];
									if((!$scope.aclPriviledges.services[service.name].apis[defaultApi]) || $scope.aclPriviledges.services[service.name].apis[defaultApi].include !== true) {
										apisList.forEach(function(oneApi) {
											if($scope.aclPriviledges.services[service.name].apis[oneApi.v]) {
												$scope.aclPriviledges.services[service.name].apis[oneApi.v].include = false;
											}
										});
									}
								}
							}
						}
					}
				}
			};

			$scope.clearAcl=function(){
				var tId=  $routeParams.tId;
				var appId=  $routeParams.appId;
				var postData = $scope.currentApplication;

				postData.productCode = $scope.currentApplication.product ;
				postData.packageCode = $scope.currentApplication.package.split("_")[1];
				postData.clearAcl = true;

				getSendDataFromServer( ngDataApi, {
					"method": "send",
					"routeName": "/dashboard/tenant/application/update",
					"data": postData,
					"params": {"id": tId, "appId" : appId}
				}, function(error) {
					if(error) {
						$scope.$parent.displayAlert('danger', error.message);
						alert(error.message);
					}
					else {
						$scope.$parent.displayAlert('success', 'ACL Updated Successfully.');
					}
				});
			};

			$scope.saveACL=function(){
				var tId=  $routeParams.tId;
				var appId=  $routeParams.appId;
				var postData = $scope.currentApplication ;

				postData.productCode = $scope.currentApplication.product ;
				postData.packageCode = $scope.currentApplication.package.split("_")[1];

				console.log($scope.aclPriviledges);

				var result = prepareAclObjToSave($scope, $scope.aclPriviledges);

				if(result.valid){
					postData.acl = result.data;
					console.log(postData);
					getSendDataFromServer( ngDataApi, {
						"method": "send",
						"routeName": "/dashboard/tenant/application/update",
						"data": postData,
						"params": {"id": tId, "appId" : appId}
					}, function(error) {
						if(error) {
							$scope.$parent.displayAlert('danger', error.message);
							alert(error.message);
						}
						else {
							$scope.$parent.displayAlert('success', 'ACL Updated Successfully.');
						}
					});
				}

			};

			//default operation
			$scope.getApplicationInfo();


		}
	};
}
]);