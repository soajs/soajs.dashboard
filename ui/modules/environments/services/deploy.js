"use strict";
var deployService = soajsApp.components;
deployService.service('deploySrv', ['ngDataApi', '$timeout', '$modal', function(ngDataApi, $timeout, $modal) {

	function deployEnvironment(currentScope, envCode) {
		var formConfig = angular.copy(environmentsConfig.form.deploy);
		formConfig.entries[2].value = formConfig.entries[2].value.replace("%envName%", envCode);
		formConfig.entries[2].value = formConfig.entries[2].value.replace("%profilePathToUse%", currentScope.profile);

		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'deployEnv',
			label: 'Deploy Environment ' + envCode,
			actions: [
				{
					'type': 'submit',
					'label': 'Submit',
					'btn': 'primary',
					'action': function(formData) {
						if(!formData.controllers || formData.controllers < 1) {
							$timeout(function() {
								alert("You must choose at least 1 controller to deploy this environment");
							}, 100);
						}
						else {
							currentScope.modalInstance.dismiss("ok");
							var text = "<h2>Deploying new " + envCode + " Environment</h2>";
							text += "<p>Deploying " + formData.controllers + " new controllers for environment " + envCode + ".</p>";
							text += "<p>Do not refresh this page, this will take a few minutes...</p>";
							text += "<div id='progress_deploy_" + envCode + "' style='padding:10px;'></div>";
							jQuery('#overlay').html("<div class='bg'></div><div class='content'>" + text + "</div>");
							jQuery("#overlay .content").css("width", "40%").css("left", "30%");
							overlay.show();
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
				"number": formData.controllers
			};

			if(formData.variables && formData.variables !== ''){
				params.variables = formData.variables.split(",");
				for(var i =0; i < params.variables.length; i++){
					params.variables[i] = params.variables[i].trim();
				}
			}

			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "send",
				"routeName": "/dashboard/hosts/deployController",
				"data": params
			}, function(error, response) {
				if(error) {
					currentScope.generateNewMsg(envCode, 'danger', error.message);
					overlay.hide();
				}
				else {
					overlay.hide(function(){
						if(response.result){
							currentScope.listHosts(envCode);
						}
						else{
							currentScope.generateNewMsg(envCode, 'danger', response.errors.details);
						}
					});
				}
			});
		}
	}

	return {
		'deployEnvironment': deployEnvironment
	}
}]);