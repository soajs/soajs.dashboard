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
						if(!formData.profile || (Array.isArray(formData.profile) && formData.profile.length === 0)) {
							$timeout(function() {
								alert("Please choose a profile to deploy this environment");
							}, 100);
						}
						else if(!formData.controllers || formData.controllers < 1) {
							$timeout(function() {
								alert("You must choose at least 1 controller to deploy this environment");
							}, 100);
						}
						else {

							//todo: replace the alert with a loading, make calls to the apis after antoine is done.
							$timeout(function() {
								alert("Deploying your environment, please wait ....");
							}, 100);
							var params = {
								'envCode': envCode,
								'profile': environmentsConfig.profiles + formData.profile + ".js",
								'nodesNumber': formData.controllers
							};
							console.log("calling deployController:");
							console.log(params);

							var controllersContainers = [];
							for(var i = 0; i < formData.controllers; i++) {
								controllersContainers.push("controllerProxy0" + (i+1) );
							}
							var params = {
								'envCode': envCode,
								'containerNames': controllersContainers
							};
							console.log("calling deployNginx:");
							console.log(params);
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
	}

	return {
		'deployEnvironment': deployEnvironment
	}
}]);