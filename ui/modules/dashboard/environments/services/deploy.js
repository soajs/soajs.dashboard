"use strict";
var deployService = soajsApp.components;
deployService.service('deploySrv', ['ngDataApi', '$timeout', '$modal', function(ngDataApi, $timeout, $modal) {

	function deployEnvironment(currentScope, envCode) {
		var formConfig = angular.copy(environmentsConfig.form.deploy);

		getControllerBranches(currentScope, function (branchInfo) {
			for (var i = 0; i < formConfig.entries.length; i++) {
				if (formConfig.entries[i].name === 'controllers') {
					var ctrlEntries = formConfig.entries[i].entries;
					for (var j = 0; j < ctrlEntries.length; j++) {
						if (ctrlEntries[j].name === 'branch') {
							branchInfo.branches.forEach(function (oneBranch) {
								delete oneBranch.commit.url;
								ctrlEntries[j].value.push({'v': oneBranch, 'l': oneBranch.name});
							});
						}
					}
				}
			}

			var customUIEntry = {
				'name': 'useCustomUI',
				'label': 'Do you want to bundle static content?',
				'type': 'radio',
				'value': [{'v': true, 'l': 'Yes'}, {'v': false, 'l': 'No', 'selected': true}],
				'required': true,
				'onAction': function (label, selected, formConfig) {
					if (selected === 'true' && (!formConfig.entries[0].entries[5] || formConfig.entries[0].entries[5].name !== 'selectCustomUI')) {
						listStaticContent(currentScope, function (staticContentSources) {
							var selectCustomUI = {
								'name': 'selectCustomUI',
								'label': 'Choose Static Content',
								'type': 'select',
								'value': [],
								'required': true,
								'onAction': function (label, selected, formConfig) {
									var selectUIBranch = {
										'name': 'selectUIBranch',
										'label': 'Choose Static Content Branch',
										'type': 'select',
										'value': [],
										'required': true
									};
									selected = JSON.parse(selected);
									overlayLoading.show();
									getSendDataFromServer(currentScope, ngDataApi, {
										method: 'get',
										routeName: '/dashboard/gitAccounts/getBranches',
										params: {
											name: selected.name,
											type: 'static'
										}
									}, function (error, response) {
										overlayLoading.hide();
										if (error) {
											currentScope.generateNewMsg(envCode, 'danger', error.message);
										}
										else {
											response.branches.forEach(function (oneBranch) {
												selectUIBranch.value.push({'v': oneBranch, 'l': oneBranch.name});
											});

											formConfig.entries[0].entries.splice(6, 0, selectUIBranch);
										}
									});
								}
							};
							staticContentSources.forEach (function (oneSource) {
								selectCustomUI.value.push ({'v': oneSource, 'l': oneSource.name});
							});
							formConfig.entries[0].entries.splice(5, 0, selectCustomUI);
						});
					} else if (selected === 'false' && formConfig.entries[0].entries[5].name === 'selectCustomUI') {
						if (formConfig.entries[0].entries[6] && formConfig.entries[0].entries[6].name === 'selectUIBranch') {
							formConfig.entries[0].entries.splice(6, 1);
							delete formConfig.formData.selectUIBranch;
						}
						formConfig.entries[0].entries.splice(5, 1);
						delete formConfig.formData.selectCustomUI;
					}
				}
			};
			formConfig.entries[0].entries.splice(4, 0, customUIEntry);

			for (var i = 0; i < formConfig.entries[1].entries.length; i++) {
				if (formConfig.entries[1].entries[i].name === 'defaultENVVAR') {
					formConfig.entries[1].entries[i].value = formConfig.entries[1].entries[i].value.replace("%envName%", envCode);
					formConfig.entries[1].entries[i].value = formConfig.entries[1].entries[i].value.replace("%profilePathToUse%", currentScope.profile);
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

								formData.owner = branchInfo.owner;
								formData.repo = branchInfo.repo;

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
			var branchObj = JSON.parse(formData.branch);
			var params = {
				'envCode': envCode,
				"number": formData.controllers,
				'owner': formData.owner,
				'repo': formData.repo,
				'branch': branchObj.name,
				'commit': branchObj.commit.sha,
				'useLocalSOAJS': formData.useLocalSOAJS
			};

			if (formData.exposedPort) {
				params.exposedPort = formData.exposedPort;
			}

			if (formData.useCustomUI) {
				formData.selectUIBranch = JSON.parse(formData.selectUIBranch);
				formData.selectCustomUI = JSON.parse(formData.selectCustomUI);
				params.nginxConfig = {
					customUIId: formData.selectCustomUI._id,
					branch: formData.selectUIBranch.name,
					commit: formData.selectUIBranch.commit.sha
				};
			}

			if(formData.variables && formData.variables !== ''){
				params.variables = formData.variables.split(",");
				for(var i =0; i < params.variables.length; i++){
					params.variables[i] = params.variables[i].trim();
				}
			}

			if (haMode) {
				params.name = 'controller';
				params.haService = true;
				params.haCount = formData.controllers;
				params.memoryLimit = (formData.ctrlMemoryLimit * 1048576);
			}

			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "send",
				"routeName": "/dashboard/hosts/deployController",
				"data": params
			}, function(error, response) {
				overlay.hide();
				if(error) {
					currentScope.generateNewMsg(envCode, 'danger', error.message);
				}
				else {
					params.supportSSL = formData.supportSSL;
					params.haCount = formData.nginxCount;
					params.memoryLimit = (formData.nginxMemoryLimit * 1048576);
					getSendDataFromServer(currentScope, ngDataApi, {
						"method": "send",
						"routeName": "/dashboard/hosts/deployNginx",
						"data": params
					}, function(error, response) {
						if(error) {
							currentScope.generateNewMsg(envCode, 'danger', error.message);
							overlay.hide();
						}
						else {
							overlay.hide(function(){
								if (!haMode) {
									currentScope.listNginxHosts(envCode);
									currentScope.listHosts(envCode);
								}
								else {
									currentScope.isDeploying = true;
									$timeout(function () {
										currentScope.listNginxServices();
										currentScope.listServices();
									}, 15000);
								}
							});
						}
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
					currentScope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
				} else {
					cb(response);
				}
			});
		}

		function getControllerBranches (currentScope, cb) {
			overlayLoading.show();
			getSendDataFromServer(currentScope, ngDataApi, {
				method: 'get',
				routeName: '/dashboard/gitAccounts/getBranches',
				params: {
					name: 'controller',
					type: 'service'
				}
			}, function (error, response) {
				overlayLoading.hide();
				if (error) {
					currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
				}
				else {
					return cb (response);
				}
			});
		}
	}

	return {
		'deployEnvironment': deployEnvironment
	}
}]);
