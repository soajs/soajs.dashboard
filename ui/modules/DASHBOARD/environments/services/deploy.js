"use strict";
var deployService = soajsApp.components;
deployService.service('deploySrv', ['ngDataApi', '$timeout', '$modal', function(ngDataApi, $timeout, $modal) {

	function deployEnvironment(currentScope, envCode) {
		var formConfig = angular.copy(environmentsConfig.form.deploy);

		listStaticContent(currentScope, function (staticContentSources) {
			var customUIEntry = {
				'name': 'useCustomUI',
				'label': 'Use Custom UI?',
				'type': 'radio',
				'value': [{'v': true, 'l': 'Yes'}, {'v': false, 'l': 'No', 'selected': true}],
				'required': true,
				'onAction': function (label, selected, formConfig) {
					if (selected === 'true') {
						var selectCustomUI = {
							'name': 'selectCustomUI',
							'label': 'Choose Static Content',
							'type': 'select',
							'value': [],
							'required': true
						};
						staticContentSources.forEach (function (oneSource) {
							selectCustomUI.value.push ({'v': oneSource._id, 'l': oneSource.name});
						});
						formConfig.entries.splice(3, 0, selectCustomUI);
					} else {
						if (formConfig.entries[3].name === 'selectCustomUI') {
							formConfig.entries.splice(3, 1);
						}
					}
				}
			};
			formConfig.entries.splice(2, 0, customUIEntry);

			for (var i = 0; i < formConfig.entries.length; i++) {
				if (formConfig.entries[i].name === 'defaultENVVAR') {
					formConfig.entries[i].value = formConfig.entries[i].value.replace("%envName%", envCode);
					formConfig.entries[i].value = formConfig.entries[i].value.replace("%profilePathToUse%", currentScope.profile);
				}
			}

			var options = {
				timeout: $timeout,
				form: formConfig,
				name: 'deployEnv',
				label: translation.deployEnvironment[LANG] + ' ' + envCode,
				actions: [
					{
						'type': 'submit',
						'label': translation.submit[LANG],
						'btn': 'primary',
						'action': function(formData) {
							if(!formData.controllers || formData.controllers < 1) {
								$timeout(function() {
									alert(translation.youMustChooseLeastControllerDeployEnvironment[LANG]);
								}, 100);
							}
							else {
								currentScope.modalInstance.dismiss("ok");
								var text = "<h2>" + translation.deployingNew[LANG] + envCode + " Environment</h2>";
								text += "<p>" +  translation.deploying[LANG] + formData.controllers + translation.newControllersEnvironment[LANG] + envCode + ".</p>";
								text += "<p>" + translation.doNotRefreshThisPageThisWillTakeFewMinutes[LANG] + "</p>";
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
						'label': translation.cancel[LANG],
						'btn': 'danger',
						'action': function() {
							currentScope.modalInstance.dismiss('cancel');
							currentScope.form.formData = {};
						}
					}
				]
			};
			buildFormWithModal(currentScope, $modal, options);
		});

		function deployEnvironment(formData) {
			//new param: nginxConfig
			//sitePath: deployDir
			//dashboardBranch: if deploy dashboard is selected, include it
			//git info for custom ui: if custom ui is selected, pass _id then grab info from staticContent collection on api level
			console.log (formData);
			var params = {
				'envCode': envCode,
				"number": formData.controllers,
				'nginxConfig': {
					'sitePath': formData.deployDir,
					'useDashUI': formData.useDashboardUI
				}
			};

			if (formData.useCutomUI) {
				params.nginxConfig.customUIId = formData.selectCustomUI;
			}

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
						currentScope.listHosts(envCode);
					});
				}
			});
		}

		function listStaticContent (currentScope, cb) {
			getSendDataFromServer(currentScope, ngDataApi, {
				'method': 'send',
				'routeName': '/dashboard/staticContent/list'
			}, function (error, response) {
				if (error) {
					currentScope.$parent.displayAlert('danger', "");
				} else {
					cb(response);
				}
			});
		}
	}

	return {
		'deployEnvironment': deployEnvironment
	}
}]);