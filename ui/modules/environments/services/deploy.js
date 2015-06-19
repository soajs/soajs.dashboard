"use strict";
var deployService = soajsApp.components;
deployService.service('deploySrv', ['ngDataApi', '$timeout', '$modal', '$window', function(ngDataApi, $timeout, $modal, $window) {

	function deployEnvironment(currentScope, envCode) {
		//ui
		//collect the total number of controllers
		//select a profile from the list

		//background
		//send request to /hosts/deployControllers
		//send request to /hosts/deployNginx
		//send request to /hosts/list

		var options = {
			timeout: $timeout,
			form: angular.copy(environmentsConfig.form.deploy),
			name: 'deployEnv',
			label: 'Deploy Environment ' + envCode,
			actions: [
				{
					'type': 'submit',
					'label': 'Submit',
					'btn': 'primary',
					'action': function(formData) {
						//if(!formData.profile || (Array.isArray(formData.profile) && formData.profile.length === 0)) {
						//	$timeout(function() {
						//		alert("Please choose a profile to deploy this environment");
						//	}, 100);
						//}
						if(!formData.controllers || formData.controllers < 1) {
							$timeout(function() {
								alert("You must choose at least 1 controller to deploy this environment");
							}, 100);
						}
						else {
							//todo: add a loading here
							deployEnvironment(formData);
						}
					}
				},
				{
					'type': 'reset',
					'label': 'Cancel',
					'btn': 'danger',
					'action': function() {
						currentScope.modalInstance.dismiss('cancel');
						currentScope.form.formData = {};
					}
				}
			]
		};

		buildFormWithModal(currentScope, $modal, options);

		function deployEnvironment(formData) {
			var params = {
				'envCode': envCode,
				//'profile': environmentsConfig.profiles + formData.profile + ".js"
				'profile': environmentsConfig.profiles + "single.js"
			};

			deployControllers(params, 0, formData.controllers, function() {
				deployNginx(formData);
			});
		}

		function deployControllers(params, counter, max, cb) {
			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "send",
				"routeName": "/dashboard/hosts/deployController",
				"data": params
			}, function(error) {
				if(error) {
					currentScope.generateNewMsg(envCode, 'danger', error.message);
				}
				else {
					counter++;
					if(counter === max) {
						return cb();
					}
					else {
						deployControllers(params, counter, max, cb);
					}
				}
			});
		}

		function deployNginx(formData) {
			var controllersContainers = [];
			for(var i = 0; i < formData.controllers; i++) {
				controllersContainers.push("controller:controllerProxy0" + (i + 1));
			}
			var params = {
				'envCode': envCode,
				'containerNames': controllersContainers
			};

			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "send",
				"routeName": "/dashboard/hosts/deployNginx",
				"data": params
			}, function(error) {
				if(error) {
					currentScope.generateNewMsg(envCode, 'danger', error.message);
				}
				else {
					//reload the environment ui
					currentScope.listHosts(envCode);
				}
			});
		}
	}

	return {
		'deployEnvironment': deployEnvironment
	}
}]);