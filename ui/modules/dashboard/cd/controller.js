'use strict';

var cdApp = soajsApp.components;
cdApp.controller('cdAppCtrl', ['$scope', '$timeout', '$modal', '$cookies', 'ngDataApi', 'injectFiles', function ($scope, $timeout, $modal, $cookies, ngDataApi, injectFiles) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, cdAppConfig.permissions);
	
	$scope.cdData = {};
	$scope.myEnv = $cookies.getObject('myEnv').code;
	$scope.upgradeSpaceLink = cdAppConfig.upgradeSpaceLink;
	
	$scope.getRecipe = function () {
		var formConfig = angular.copy(cdAppConfig.form);
		
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/cd'
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				$scope.cdData = response;
				delete $scope.cdData._id;
				delete $scope.cdData.soajsauth;
				
				var options = {
					timeout: $timeout,
					entries: formConfig.entries,
					name: 'continuousDelivery',
					label: 'Continuous Delivery',
					data: {'cd': $scope.cdData[$scope.myEnv]},
					actions: [
						{
							type: 'submit',
							label: "Update Continuous Delivery Settings",
							btn: 'primary',
							action: function (formData) {
								
								$scope.cdData[$scope.myEnv] = formData.cd;
								var data = $scope.cdData;
								delete data.type;
								
								overlayLoading.show();
								getSendDataFromServer($scope, ngDataApi, {
									method: 'post',
									routeName: '/dashboard/cd',
									data: {
										"config": data
									}
								}, function (error, response) {
									overlayLoading.hide();
									if (error) {
										$scope.form.displayAlert('danger', error.message);
									}
									else {
										$scope.form.displayAlert('success', 'Recipe Saved successfully');
										$scope.form.formData = {};
										$scope.getRecipe();
									}
								});
							}
						}
					]
				};
				buildForm($scope, $modal, options);
			}
		});
	};
	
	$scope.getLedger = function () {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
		   method: 'get',
		   routeName: '/dashboard/cd/ledger',
		   params:{
		   	"env": $scope.myEnv
		   }
		}, function (error, response) {
		   overlayLoading.hide();
		   if (error) {
		    $scope.displayAlert('danger', error.message);
		   }
		   else {
		    parseMyResponse(response);
		   }
		});
		
		
		function parseMyResponse(list){
			$scope.imageLedger = [];
			$scope.catalogLedger = [];
			$scope.codeLedger = [];
			
			list.forEach(function(oneEntry){
				switch(oneEntry.mode){
					case 'image':
						$scope.imageLedger.push(oneEntry);
						break;
					case 'rebuild':
						$scope.catalogLedger.push(oneEntry);
						$scope.codeLedger.push(oneEntry);
						break;
					default:
						$scope.codeLedger.push(oneEntry);
						break;
				}
			});
		}
		
		// $scope.imageLedger = [
		// 	{
		// 		'id': "dashboard-controller-v1",
		// 		'name': "dashboard-controller-v1",
		// 		'labels': {
		// 			"soajs.catalog.id": "5922b403f2721f4f4c473bec",
		// 			"soajs.catalog.v": "1",
		// 			"soajs.content": "true",
		// 			"soajs.env.code": "dashboard",
		// 			"soajs.service.group": "soajs-core-services",
		// 			"soajs.service.label": "dashboard-controller-v1",
		// 			"soajs.service.mode": "deployment",
		// 			"soajs.service.name": "controller",
		// 			"soajs.service.repo.name": "soajs_controller",
		// 			"soajs.service.type": "service",
		// 			"soajs.service.version": "1"
		// 		},
		// 		'mode': 'image',
		// 		'image':{
		// 			'prefix': 'soajsorg',
		// 			'name': 'soajs',
		// 			'tag': 'latest',
		// 			'ts': 1495459263661,
		// 			'update': true,
		// 			'upgrade': true
		// 		},
		// 		'catalog': {
		// 			"name": "Dashboard Service Recipe",
		// 			"type": "soajs",
		// 			"subtype": "service",
		// 			"v": 2,
		// 			"ts": 1495459263661,
		// 			"image": {
		// 				"prefix": "soajsorg",
		// 				"name": "soajs",
		// 				"tag": "latest",
		// 				"pullPolicy": "Always",
		// 				"override": true
		// 			},
		// 			"git": true,
		// 			"envs":{
		// 				"NODE_ENV": {
		// 					"type": "static",
		// 					"value": "production"
		// 				},
		// 				"SOAJS_ENV": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_ENV"
		// 				},
		// 				"SOAJS_PROFILE": {
		// 					"type": "static",
		// 					"value": "/opt/soajs/FILES/profiles/profile.js"
		// 				},
		// 				"SOAJS_SRV_AUTOREGISTERHOST": {
		// 					"type": "static",
		// 					"value": "true"
		// 				},
		// 				"SOAJS_SRV_MEMORY": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_SRV_MEMORY"
		// 				},
		// 				"SOAJS_SRV_MAIN": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_SRV_MAIN"
		// 				},
		// 				"SOAJS_GC_NAME": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_GC_NAME"
		// 				},
		// 				"SOAJS_GC_VERSION": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_GC_VERSION"
		// 				},
		// 				"SOAJS_GIT_OWNER": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_GIT_OWNER"
		// 				},
		// 				"SOAJS_GIT_BRANCH": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_GIT_BRANCH"
		// 				},
		// 				"SOAJS_GIT_COMMIT": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_GIT_COMMIT"
		// 				},
		// 				"SOAJS_GIT_REPO": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_GIT_REPO"
		// 				},
		// 				"SOAJS_GIT_TOKEN": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_GIT_TOKEN"
		// 				},
		// 				"SOAJS_DEPLOY_HA": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_DEPLOY_HA"
		// 				},
		// 				"SOAJS_HA_NAME": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_HA_NAME"
		// 				},
		// 				"SOAJS_MONGO_NB": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_MONGO_NB"
		// 				},
		// 				"SOAJS_MONGO_PREFIX": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_MONGO_PREFIX"
		// 				},
		// 				"SOAJS_MONGO_RSNAME": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_MONGO_RSNAME"
		// 				},
		// 				"SOAJS_MONGO_AUTH_DB": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_MONGO_AUTH_DB"
		// 				},
		// 				"SOAJS_MONGO_SSL": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_MONGO_SSL"
		// 				},
		// 				"SOAJS_MONGO_IP": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_MONGO_IP_N"
		// 				},
		// 				"SOAJS_MONGO_PORT": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_MONGO_PORT_N"
		// 				},
		// 				"SOAJS_DEPLOY_ACC": {
		// 					"type": "static",
		// 					"value": "true"
		// 				},
		// 				"MIKE":{
		// 					"type": "userInput",
		// 					"default": "Tansa",
		// 					"label": "Mike Input"
		// 				}
		// 			}
		// 		},
		// 		"service":{
		// 			"env":[
		// 				"NODE_ENV=production",
		// 				"SOAJS_ENV=dashboard",
		// 				"SOAJS_DEPLOY_HA=swarm",
		// 				"SOAJS_HA_NAME={{.Task.Name}}",
		// 				"SOAJS_PROFILE=/opt/soajs/FILES/profiles/profile.js",
		// 				"SOAJS_SRV_AUTOREGISTERHOST=true",
		// 				"SOAJS_MONGO_PREFIX=",
		// 				"SOAJS_GIT_OWNER=soajs",
		// 				"SOAJS_GIT_REPO=soajs.controller",
		// 				"SOAJS_GIT_BRANCH=master",
		// 				"SOAJS_GIT_PROVIDER=github",
		// 				"SOAJS_GIT_DOMAIN=github.com",
		// 				"SOAJS_DEPLOY_ACC=true",
		// 				"SOAJS_MONGO_NB=1",
		// 				"SOAJS_MONGO_IP_1=dashboard-soajsdata",
		// 				"SOAJS_MONGO_PORT_1=27017",
		// 				"MIKE=Hajj"
		// 			]
		// 		},
		// 		'repo':{
		// 			'owner': 'soajs',
		// 			'name': 'soajs.controller',
		// 			'branch': 'develop',
		// 			'ts': 1495459263661
		// 		}
		// 	}
		// ];
		//
		// $scope.catalogLedger = [
		// 	{
		// 		'id': "dashboard-controller-v1",
		// 		'name': "dashboard-controller-v1",
		// 		'labels': {
		// 			"soajs.catalog.id": "5922b403f2721f4f4c473bec",
		// 			"soajs.catalog.v": "1",
		// 			"soajs.content": "true",
		// 			"soajs.env.code": "dashboard",
		// 			"soajs.service.group": "soajs-core-services",
		// 			"soajs.service.label": "dashboard-controller-v1",
		// 			"soajs.service.mode": "deployment",
		// 			"soajs.service.name": "controller",
		// 			"soajs.service.repo.name": "soajs_controller",
		// 			"soajs.service.type": "service",
		// 			"soajs.service.version": "1"
		// 		},
		// 		'mode': 'rebuild',
		// 		'catalog': {
		// 			"name": "Dashboard Service Recipe",
		// 			"type": "soajs",
		// 			"subtype": "service",
		// 			"v": 2,
		// 			"ts": 1495459263661,
		// 			"image": {
		// 				"prefix": "soajsorg",
		// 				"name": "soajs",
		// 				"tag": "latest",
		// 				"pullPolicy": "Always",
		// 				"override": true
		// 			},
		// 			"git": true,
		// 			"envs":{
		// 				"NODE_ENV": {
		// 					"type": "static",
		// 					"value": "production"
		// 				},
		// 				"SOAJS_ENV": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_ENV"
		// 				},
		// 				"SOAJS_PROFILE": {
		// 					"type": "static",
		// 					"value": "/opt/soajs/FILES/profiles/profile.js"
		// 				},
		// 				"SOAJS_SRV_AUTOREGISTERHOST": {
		// 					"type": "static",
		// 					"value": "true"
		// 				},
		// 				"SOAJS_SRV_MEMORY": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_SRV_MEMORY"
		// 				},
		// 				"SOAJS_SRV_MAIN": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_SRV_MAIN"
		// 				},
		// 				"SOAJS_GC_NAME": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_GC_NAME"
		// 				},
		// 				"SOAJS_GC_VERSION": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_GC_VERSION"
		// 				},
		// 				"SOAJS_GIT_OWNER": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_GIT_OWNER"
		// 				},
		// 				"SOAJS_GIT_BRANCH": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_GIT_BRANCH"
		// 				},
		// 				"SOAJS_GIT_COMMIT": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_GIT_COMMIT"
		// 				},
		// 				"SOAJS_GIT_REPO": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_GIT_REPO"
		// 				},
		// 				"SOAJS_GIT_TOKEN": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_GIT_TOKEN"
		// 				},
		// 				"SOAJS_DEPLOY_HA": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_DEPLOY_HA"
		// 				},
		// 				"SOAJS_HA_NAME": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_HA_NAME"
		// 				},
		// 				"SOAJS_MONGO_NB": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_MONGO_NB"
		// 				},
		// 				"SOAJS_MONGO_PREFIX": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_MONGO_PREFIX"
		// 				},
		// 				"SOAJS_MONGO_RSNAME": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_MONGO_RSNAME"
		// 				},
		// 				"SOAJS_MONGO_AUTH_DB": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_MONGO_AUTH_DB"
		// 				},
		// 				"SOAJS_MONGO_SSL": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_MONGO_SSL"
		// 				},
		// 				"SOAJS_MONGO_IP": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_MONGO_IP_N"
		// 				},
		// 				"SOAJS_MONGO_PORT": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_MONGO_PORT_N"
		// 				},
		// 				"SOAJS_DEPLOY_ACC": {
		// 					"type": "static",
		// 					"value": "true"
		// 				},
		// 				"MIKE":{
		// 					"type": "userInput",
		// 					"default": "Tansa",
		// 					"label": "Mike Input"
		// 				}
		// 			}
		// 		},
		// 		"service":{
		// 			"env":[
		// 				"NODE_ENV=production",
		// 				"SOAJS_ENV=dashboard",
		// 				"SOAJS_DEPLOY_HA=swarm",
		// 				"SOAJS_HA_NAME={{.Task.Name}}",
		// 				"SOAJS_PROFILE=/opt/soajs/FILES/profiles/profile.js",
		// 				"SOAJS_SRV_AUTOREGISTERHOST=true",
		// 				"SOAJS_MONGO_PREFIX=",
		// 				"SOAJS_GIT_OWNER=soajs",
		// 				"SOAJS_GIT_REPO=soajs.controller",
		// 				"SOAJS_GIT_BRANCH=master",
		// 				"SOAJS_GIT_PROVIDER=github",
		// 				"SOAJS_GIT_DOMAIN=github.com",
		// 				"SOAJS_DEPLOY_ACC=true",
		// 				"SOAJS_MONGO_NB=1",
		// 				"SOAJS_MONGO_IP_1=dashboard-soajsdata",
		// 				"SOAJS_MONGO_PORT_1=27017",
		// 				"MIKE=Hajj"
		// 			]
		// 		},
		// 		'repo':{
		// 			'owner': 'soajs',
		// 			'name': 'soajs.controller',
		// 			'branch': 'develop',
		// 			'ts': 1495459263661
		// 		}
		// 	},
		// 	{
		// 		"id": "dashboard-dashboard-v1",
		// 		"name": "dashboard-dashboard-v1",
		// 		"labels": {
		// 			"soajs.catalog.id": "5922b403f2721f4f4c473bec",
		// 			"soajs.content": "true",
		// 			"soajs.env.code": "dashboard",
		// 			"soajs.service.group": "soajs-core-services",
		// 			"soajs.service.label": "dashboard-dashboard-v1",
		// 			"soajs.service.mode": "deployment",
		// 			"soajs.service.name": "dashboard",
		// 			"soajs.service.repo.name": "soajs_dashboard",
		// 			"soajs.service.type": "service",
		// 			"soajs.service.version": "1"
		// 		},
		// 		"mode": "rebuild",
		// 		"catalog":{
		// 			"name": "Dashboard Service Recipe",
		// 			"type": "soajs",
		// 			"subtype": "service",
		// 			"v": 2,
		// 			"ts": 1495459263661,
		// 			"image": {
		// 				"prefix": "soajsorg",
		// 				"name": "soajs",
		// 				"tag": "latest",
		// 				"pullPolicy": "Always"
		// 			},
		// 			"git": true,
		// 			"envs":{
		// 				"NODE_ENV": {
		// 					"type": "static",
		// 					"value": "production"
		// 				},
		// 				"SOAJS_ENV": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_ENV"
		// 				},
		// 				"SOAJS_PROFILE": {
		// 					"type": "static",
		// 					"value": "/opt/soajs/FILES/profiles/profile.js"
		// 				},
		// 				"SOAJS_SRV_AUTOREGISTERHOST": {
		// 					"type": "static",
		// 					"value": "true"
		// 				},
		// 				"SOAJS_SRV_MEMORY": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_SRV_MEMORY"
		// 				},
		// 				"SOAJS_SRV_MAIN": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_SRV_MAIN"
		// 				},
		// 				"SOAJS_GC_NAME": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_GC_NAME"
		// 				},
		// 				"SOAJS_GC_VERSION": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_GC_VERSION"
		// 				},
		// 				"SOAJS_GIT_OWNER": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_GIT_OWNER"
		// 				},
		// 				"SOAJS_GIT_BRANCH": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_GIT_BRANCH"
		// 				},
		// 				"SOAJS_GIT_COMMIT": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_GIT_COMMIT"
		// 				},
		// 				"SOAJS_GIT_REPO": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_GIT_REPO"
		// 				},
		// 				"SOAJS_GIT_TOKEN": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_GIT_TOKEN"
		// 				},
		// 				"SOAJS_DEPLOY_HA": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_DEPLOY_HA"
		// 				},
		// 				"SOAJS_HA_NAME": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_HA_NAME"
		// 				},
		// 				"SOAJS_MONGO_NB": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_MONGO_NB"
		// 				},
		// 				"SOAJS_MONGO_PREFIX": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_MONGO_PREFIX"
		// 				},
		// 				"SOAJS_MONGO_RSNAME": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_MONGO_RSNAME"
		// 				},
		// 				"SOAJS_MONGO_AUTH_DB": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_MONGO_AUTH_DB"
		// 				},
		// 				"SOAJS_MONGO_SSL": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_MONGO_SSL"
		// 				},
		// 				"SOAJS_MONGO_IP": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_MONGO_IP_N"
		// 				},
		// 				"SOAJS_MONGO_PORT": {
		// 					"type": "computed",
		// 					"value": "$SOAJS_MONGO_PORT_N"
		// 				},
		// 				"SOAJS_DEPLOY_ACC": {
		// 					"type": "static",
		// 					"value": "true"
		// 				}
		// 			}
		// 		},
		// 		"service":{
		// 			"env":[
		// 				"NODE_ENV=production",
		// 				"SOAJS_ENV=dashboard",
		// 				"SOAJS_DEPLOY_HA=swarm",
		// 				"SOAJS_HA_NAME={{.Task.Name}}",
		// 				"SOAJS_PROFILE=/opt/soajs/FILES/profiles/profile.js",
		// 				"SOAJS_SRV_AUTOREGISTERHOST=true",
		// 				"SOAJS_MONGO_PREFIX=",
		// 				"SOAJS_GIT_OWNER=soajs",
		// 				"SOAJS_GIT_REPO=soajs.controller",
		// 				"SOAJS_GIT_BRANCH=master",
		// 				"SOAJS_GIT_PROVIDER=github",
		// 				"SOAJS_GIT_DOMAIN=github.com",
		// 				"SOAJS_DEPLOY_ACC=true",
		// 				"SOAJS_MONGO_NB=1",
		// 				"SOAJS_MONGO_IP_1=dashboard-soajsdata",
		// 				"SOAJS_MONGO_PORT_1=27017"
		// 			]
		// 		},
		// 		'repo':{
		// 			'owner': 'soajs',
		// 			'name': 'soajs.dashboard',
		// 			'branch': 'feature/DASHBOARD-203',
		// 			'ts': 1495459263661
		// 		}
		// 	}
		// ];
		//
		// $scope.codeLedger = [
		// 	{
		// 		'id': "dashboard-controller-v1",
		// 		'name': "dashboard-controller-v1",
		// 		'labels': {
		// 			"soajs.catalog.id": "5922b403f2721f4f4c473bec",
		// 			"soajs.catalog.v": "1",
		// 			"soajs.content": "true",
		// 			"soajs.env.code": "dashboard",
		// 			"soajs.service.group": "soajs-core-services",
		// 			"soajs.service.label": "dashboard-controller-v1",
		// 			"soajs.service.mode": "deployment",
		// 			"soajs.service.name": "controller",
		// 			"soajs.service.repo.name": "soajs_controller",
		// 			"soajs.service.type": "service",
		// 			"soajs.service.version": "1"
		// 		},
		// 		'mode': 'redeploy',
		// 		"catalog":{
		// 			"name": "Dashboard Service Recipe",
		// 			"type": "soajs",
		// 			"subtype": "service",
		// 			"v": 2
		// 		},
		// 		"service":{
		// 			"env":[
		// 				"NODE_ENV=production",
		// 				"SOAJS_ENV=dashboard",
		// 				"SOAJS_DEPLOY_HA=swarm",
		// 				"SOAJS_HA_NAME={{.Task.Name}}",
		// 				"SOAJS_PROFILE=/opt/soajs/FILES/profiles/profile.js",
		// 				"SOAJS_SRV_AUTOREGISTERHOST=true",
		// 				"SOAJS_MONGO_PREFIX=",
		// 				"SOAJS_GIT_OWNER=soajs",
		// 				"SOAJS_GIT_REPO=soajs.controller",
		// 				"SOAJS_GIT_BRANCH=master",
		// 				"SOAJS_GIT_PROVIDER=github",
		// 				"SOAJS_GIT_DOMAIN=github.com",
		// 				"SOAJS_DEPLOY_ACC=true",
		// 				"SOAJS_MONGO_NB=1",
		// 				"SOAJS_MONGO_IP_1=dashboard-soajsdata",
		// 				"SOAJS_MONGO_PORT_1=27017",
		// 				"MIKE=Hajj"
		// 			]
		// 		},
		// 		'repo':{
		// 			'owner': 'soajs',
		// 			'name': 'soajs.controller',
		// 			'branch': 'develop',
		// 			'ts': 1495459263661
		// 		}
		// 	},
		// 	{
		// 		"id": "dashboard-dashboard-v1",
		// 		"name": "dashboard-dashboard-v1",
		// 		"labels": {
		// 			"soajs.catalog.id": "5922b403f2721f4f4c473bec",
		// 			"soajs.content": "true",
		// 			"soajs.env.code": "dashboard",
		// 			"soajs.service.group": "soajs-core-services",
		// 			"soajs.service.label": "dashboard-dashboard-v1",
		// 			"soajs.service.mode": "deployment",
		// 			"soajs.service.name": "dashboard",
		// 			"soajs.service.repo.name": "soajs_dashboard",
		// 			"soajs.service.type": "service",
		// 			"soajs.service.version": "1"
		// 		},
		// 		"mode": "redeploy",
		// 		"catalog":{
		// 			"name": "Dashboard Service Recipe",
		// 			"type": "soajs",
		// 			"subtype": "service",
		// 			"v": 2
		// 		},
		// 		"service":{
		// 			"env":[
		// 				"NODE_ENV=production",
		// 				"SOAJS_ENV=dashboard",
		// 				"SOAJS_DEPLOY_HA=swarm",
		// 				"SOAJS_HA_NAME={{.Task.Name}}",
		// 				"SOAJS_PROFILE=/opt/soajs/FILES/profiles/profile.js",
		// 				"SOAJS_SRV_AUTOREGISTERHOST=true",
		// 				"SOAJS_MONGO_PREFIX=",
		// 				"SOAJS_GIT_OWNER=soajs",
		// 				"SOAJS_GIT_REPO=soajs.controller",
		// 				"SOAJS_GIT_BRANCH=master",
		// 				"SOAJS_GIT_PROVIDER=github",
		// 				"SOAJS_GIT_DOMAIN=github.com",
		// 				"SOAJS_DEPLOY_ACC=true",
		// 				"SOAJS_MONGO_NB=1",
		// 				"SOAJS_MONGO_IP_1=dashboard-soajsdata",
		// 				"SOAJS_MONGO_PORT_1=27017"
		// 			]
		// 		},
		// 		'repo':{
		// 			'owner': 'soajs',
		// 			'name': 'soajs.dashboard',
		// 			'branch': 'feature/DASHBOARD-203',
		// 			'ts': 1495459263661
		// 		}
		// 	}
		// ];
	};
	
	$scope.updateEntry = function(oneEntry, operation){
		var formConfig = {
			entries: []
		};
		
		if(operation === 'redeploy'){
			doRebuild(null);
		}
		else{
			if(oneEntry.catalog.image && oneEntry.catalog.image.override){
				//append images
				formConfig.entries.push({
					'name': "ImagePrefix",
					'label': "Image Prefix",
					'type': 'text',
					'value': oneEntry.catalog.image.prefix,
					'fieldMsg': "Override the image prefix if you want"
				});
				
				formConfig.entries.push({
					'name': "ImageName",
					'label': "Image Name",
					'type': 'text',
					'value': oneEntry.catalog.image.name,
					'fieldMsg': "Override the image name if you want"
				});
				
				formConfig.entries.push({
					'name': "ImageTag",
					'label': "Image Tag",
					'type': 'text',
					'value': oneEntry.catalog.image.tag,
					'fieldMsg': "Override the image tag if you want"
				});
			}
			
			//append inputs whose type is userInput
			if(oneEntry.catalog.envs){
				for(var envVariable in oneEntry.catalog.envs){
					if(oneEntry.catalog.envs[envVariable].type === 'userInput'){
						
						var defaultValue = oneEntry.catalog.envs[envVariable].default || '';
						//todo: get value from service.env
						oneEntry.service.env.forEach(function(oneEnv){
							if(oneEnv.indexOf(envVariable) !== -1){
								defaultValue = oneEnv.split("=")[1];
							}
						});
						
						//push a new input for this variable
						var newInput = {
							'name': '_ci_' + envVariable,
							'label': oneEntry.catalog.envs[envVariable].label || envVariable,
							'type': 'text',
							'value': defaultValue,
							'fieldMsg': oneEntry.catalog.envs[envVariable].fieldMsg
						};
						
						if(!defaultValue || defaultValue === ''){
							newInput.required = true;
						}
						
						formConfig.entries.push(newInput);
					}
				}
			}
			
			if(formConfig.entries.length === 0){
				doRebuild(null);
			}
			else{
				var options = {
					timeout: $timeout,
					form: formConfig,
					name: 'rebuildService',
					label: 'Rebuild Service',
					actions: [
						{
							'type': 'submit',
							'label': translation.submit[LANG],
							'btn': 'primary',
							'action': function (formData) {
								doRebuild(formData);
							}
						},
						{
							'type': 'reset',
							'label': translation.cancel[LANG],
							'btn': 'danger',
							'action': function () {
								$scope.modalInstance.dismiss('cancel');
								$scope.form.formData = {};
							}
						}
					]
				};
				buildFormWithModal($scope, $modal, options);
			}
		}
		
		function doRebuild(formData){
			var params = {
				env: $scope.myEnv.toLowerCase(),
				serviceId: oneEntry.id,
				mode: ((oneEntry.labels && oneEntry.labels['soajs.service.mode']) ? oneEntry.labels['soajs.service.mode'] : ''),
				action: operation
			};
			
			if(formData && Object.keys(formData).length > 0){
				//inject user input catalog entry and image override
				params.custom = {
					image: {
						name: formData['ImageName'],
						prefix: formData['ImagePrefix'],
						tag: formData['ImageTag']
					}
				};
				
				for( var input in formData){
					if(input.indexOf('_ci_') !== -1){
						if(!params.custom.env){
							params.custom.env = {};
						}
						params.custom.env[input.replace('_ci_', '')] = formData[input];
					}
				}
			}
			
			overlayLoading.show();
			getSendDataFromServer($scope, ngDataApi, {
				method: 'put',
				routeName: '/dashboard/cloud/services/redeploy',
				data: params
			}, function (error, response) {
				overlayLoading.hide();
				if (error) {
					$scope.displayAlert('danger', error.message);
				}
				else {
					$scope.displayAlert('success', 'Service rebuilt successfully');
					$scope.getRecipe();
					overlayLoading.hide();
					$scope.modalInstance.dismiss();
				}
			});
		}
	};
	
	injectFiles.injectCss("modules/dashboard/cd/cd.css");
	
	// Start here
	if ($scope.access.get) {
		$scope.getRecipe();
	}
	
}]);
